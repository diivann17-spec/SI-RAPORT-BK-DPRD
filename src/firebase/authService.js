/**
 * Authentication Service - SI-RAPORT BK DPRD
 * 
 * Layer abstraksi untuk mengelola state autentikasi global
 * Menyediakan fungsi login, logout, session management, dan role-based access control
 * 
 * Fitur:
 * - Validasi login dengan whitelist ketat
 * - Session management & token storage
 * - Role-based access control (RBAC)
 * - Automatic session expiry
 * - Protected access untuk sensitive operations
 */

import { onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { validateLoginWithWhitelist } from './accountService';

// ─── SESSION CONSTANTS ─────────────────────────────────────────────────────────
const SESSION_STORAGE_KEY = 'si_raport_session';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 menit
const REMEMBER_ME_KEY = 'si_raport_remember_username';
const isLocalAuthMode = import.meta.env.VITE_AUTH_MODE === 'local';

// ─── SESSION STATUS ───────────────────────────────────────────────────────────
export const SESSION_STATUS = {
  AUTHENTICATED: 'AUTHENTICATED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  EXPIRED: 'EXPIRED',
  LOCKED: 'LOCKED'
};

// ─── ROLE HIERARCHY ───────────────────────────────────────────────────────────
// Untuk RBAC: Admin > BK > ScanOp > Member
export const ROLE_HIERARCHY = {
  'SECRETARIAT_ADMIN': 10,      // Admin - Highest privilege
  'PETUGAS_BK': 7,              // BK Staff - Medium privilege
  'PETUGAS_SCAN': 5,            // Scan Operator - Low privilege
  'ANGGOTA_DPRD': 3              // Member - Lowest privilege
};

// ─── PERMISSION RULES ─────────────────────────────────────────────────────────
export const PERMISSIONS = {
  // Account Management
  MANAGE_ACCOUNTS: 'MANAGE_ACCOUNTS',
  VIEW_ACCOUNTS: 'VIEW_ACCOUNTS',
  RESET_PASSWORD: 'RESET_PASSWORD',
  SUSPEND_ACCOUNT: 'SUSPEND_ACCOUNT',

  // Activity Management
  CREATE_ACTIVITY: 'CREATE_ACTIVITY',
  EDIT_ACTIVITY: 'EDIT_ACTIVITY',
  DELETE_ACTIVITY: 'DELETE_ACTIVITY',
  VIEW_ACTIVITIES: 'VIEW_ACTIVITIES',

  // Attendance
  RECORD_ATTENDANCE: 'RECORD_ATTENDANCE',
  VIEW_ATTENDANCE: 'VIEW_ATTENDANCE',
  EXPORT_ATTENDANCE: 'EXPORT_ATTENDANCE',
  MANUAL_ATTENDANCE: 'MANUAL_ATTENDANCE',

  // Audit & Reports
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
  VIEW_REPORTS: 'VIEW_REPORTS',
  GENERATE_REPORT: 'GENERATE_REPORT',

  // BK Operations
  CREATE_BK_NOTES: 'CREATE_BK_NOTES',
  EDIT_BK_NOTES: 'EDIT_BK_NOTES',
  VIEW_BK_NOTES: 'VIEW_BK_NOTES'
};

// ─── ROLE-PERMISSION MAPPING ──────────────────────────────────────────────────
export const ROLE_PERMISSIONS = {
  'SECRETARIAT_ADMIN': [
    PERMISSIONS.MANAGE_ACCOUNTS,
    PERMISSIONS.VIEW_ACCOUNTS,
    PERMISSIONS.RESET_PASSWORD,
    PERMISSIONS.SUSPEND_ACCOUNT,
    PERMISSIONS.CREATE_ACTIVITY,
    PERMISSIONS.EDIT_ACTIVITY,
    PERMISSIONS.DELETE_ACTIVITY,
    PERMISSIONS.VIEW_ACTIVITIES,
    PERMISSIONS.RECORD_ATTENDANCE,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.EXPORT_ATTENDANCE,
    PERMISSIONS.MANUAL_ATTENDANCE,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.GENERATE_REPORT,
    PERMISSIONS.CREATE_BK_NOTES,
    PERMISSIONS.EDIT_BK_NOTES,
    PERMISSIONS.VIEW_BK_NOTES
  ],

  'PETUGAS_BK': [
    PERMISSIONS.VIEW_ACCOUNTS,
    PERMISSIONS.CREATE_ACTIVITY,
    PERMISSIONS.EDIT_ACTIVITY,
    PERMISSIONS.VIEW_ACTIVITIES,
    PERMISSIONS.RECORD_ATTENDANCE,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.EXPORT_ATTENDANCE,
    PERMISSIONS.MANUAL_ATTENDANCE,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.GENERATE_REPORT,
    PERMISSIONS.CREATE_BK_NOTES,
    PERMISSIONS.EDIT_BK_NOTES,
    PERMISSIONS.VIEW_BK_NOTES
  ],

  'PETUGAS_SCAN': [
    PERMISSIONS.VIEW_ACTIVITIES,
    PERMISSIONS.RECORD_ATTENDANCE,
    PERMISSIONS.VIEW_ATTENDANCE
  ],

  'ANGGOTA_DPRD': [
    PERMISSIONS.VIEW_ACTIVITIES,
    PERMISSIONS.VIEW_ATTENDANCE
  ]
};

// ─── SESSION MANAGEMENT CLASS ─────────────────────────────────────────────────
class AuthenticationService {
  constructor() {
    this.currentSession = null;
    this.sessionTimeout = null;
    this.listeners = new Set();
    this.initializeSession();
  }

  /**
   * Initialize session dari localStorage
   */
  initializeSession() {
    if (!isLocalAuthMode) {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          this.clearSession();
          this.notifyListeners();
          return;
        }

        try {
          if (firebaseUser.isAnonymous) {
            this.currentSession = this.createSession({
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              fullName: 'Tamu OPD',
              role: 'PUBLIC_GUEST',
              status: 'ACTIVE'
            });
            this.notifyListeners();
            return;
          }
          const accountSnapshot = await getDoc(doc(db, 'accounts', firebaseUser.uid));
          if (!accountSnapshot.exists() || accountSnapshot.data().status !== 'ACTIVE') {
            await signOut(auth);
            this.clearSession();
            this.notifyListeners();
            return;
          }

          this.currentSession = this.createSession({
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            ...accountSnapshot.data()
          });
          this.notifyListeners();
        } catch (error) {
          console.error('[AUTH] Failed to restore Firebase session:', error);
          await signOut(auth);
          this.clearSession();
          this.notifyListeners();
        }
      });
      return;
    }

    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        // Cek apakah session masih valid
        if (this.isSessionValid(session)) {
          this.currentSession = session;
          this.resetSessionTimeout();
          this.notifyListeners();
        } else {
          // Session expired
          this.clearSession();
        }
      }
    } catch (error) {
      console.error('Error initializing session:', error);
      this.clearSession();
    }
  }

  /**
   * Validasi session masih aktif
   */
  isSessionValid(session) {
    if (!session || !session.timestamp) return false;
    const elapsed = Date.now() - session.timestamp;
    return elapsed < SESSION_TIMEOUT;
  }

  /**
   * Login dengan validasi whitelist
   * @param {string} username
   * @param {string} password
   * @param {boolean} rememberMe
   * @returns {Promise<{success: boolean, error: string|null, session: Object|null}>}
   */
  async login(username, password, rememberMe = false) {
    try {
      // Validasi dengan whitelist
      const result = await validateLoginWithWhitelist(username, password);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          session: null
        };
      }

      // Buat session
      const session = this.createSession(result.account);

      // Firebase Auth is the production source of truth. localStorage is only
      // used by the explicit local test mode.
      if (isLocalAuthMode) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      }
      this.currentSession = session;

      // Remember username (jika diminta)
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, username);
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
      }

      // Set session timeout
      this.resetSessionTimeout();

      // Notify listeners
      this.notifyListeners();

      return {
        success: true,
        error: null,
        session: session
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'Firebase gagal memvalidasi login.',
        session: null
      };
    }
  }

  async enterPublicGuest() {
    if (isLocalAuthMode) return false;
    await signInAnonymously(auth);
    return true;
  }

  /**
   * Logout
   */
  logout() {
    if (!isLocalAuthMode) {
      signOut(auth).catch((error) => console.error('[AUTH] Logout failed:', error));
    }
    this.clearSession();
    this.notifyListeners();
  }

  createSession(account) {
    return {
      accountId: account.uid || account.id,
      uid: account.uid || account.id,
      id: account.id || account.uid,
      username: account.username || account.memberId,
      loginId: account.loginId || account.username || account.memberId,
      fullName: account.fullName,
      role: account.role,
      email: account.email || null,
      memberId: account.memberId || null,
      department: account.department || null,
      status: account.status,
      timestamp: Date.now(),
      permissions: ROLE_PERMISSIONS[account.role] || []
    };
  }

  /**
   * Clear session
   */
  clearSession() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    this.currentSession = null;
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
  }

  /**
   * Reset session timeout (extend session)
   */
  resetSessionTimeout() {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }

    if (this.currentSession) {
      this.sessionTimeout = setTimeout(() => {
        this.clearSession();
        this.notifyListeners('SESSION_EXPIRED');
      }, SESSION_TIMEOUT);
    }
  }

  /**
   * Get current session
   */
  getSession() {
    return this.currentSession;
  }

  /**
   * Check apakah user sedang authenticated
   */
  isAuthenticated() {
    return this.currentSession !== null && this.isSessionValid(this.currentSession);
  }

  /**
   * Get current user role
   */
  getCurrentRole() {
    return this.currentSession?.role || null;
  }

  /**
   * Check apakah user memiliki permission tertentu
   */
  hasPermission(permission) {
    if (!this.isAuthenticated()) return false;
    return (this.currentSession?.permissions || []).includes(permission);
  }

  /**
   * Check apakah user memiliki salah satu dari beberapa permissions
   */
  hasAnyPermission(permissions) {
    if (!this.isAuthenticated()) return false;
    return permissions.some(p => this.hasPermission(p));
  }

  /**
   * Check apakah user memiliki semua dari beberapa permissions
   */
  hasAllPermissions(permissions) {
    if (!this.isAuthenticated()) return false;
    return permissions.every(p => this.hasPermission(p));
  }

  /**
   * Check apakah user memiliki role tertentu
   */
  hasRole(role) {
    return this.getCurrentRole() === role;
  }

  /**
   * Check apakah user memiliki role hierarchy >= level
   */
  hasRoleLevel(requiredLevel) {
    const currentRole = this.getCurrentRole();
    const currentLevel = ROLE_HIERARCHY[currentRole] || 0;
    return currentLevel >= requiredLevel;
  }

  /**
   * Get display name untuk user
   */
  getUserDisplayName() {
    return this.currentSession?.fullName || this.currentSession?.username || 'Pengguna';
  }

  /**
   * Get user info
   */
  getUserInfo() {
    if (!this.isAuthenticated()) return null;
    return {
      accountId: this.currentSession.accountId,
      username: this.currentSession.username,
      fullName: this.currentSession.fullName,
      role: this.currentSession.role,
      email: this.currentSession.email,
      memberId: this.currentSession.memberId,
      department: this.currentSession.department
    };
  }

  /**
   * Get remembered username
   */
  getRememberedUsername() {
    return localStorage.getItem(REMEMBER_ME_KEY) || '';
  }

  /**
   * Subscribe ke session changes
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify semua listeners tentang session changes
   */
  notifyListeners(reason = 'SESSION_CHANGED') {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentSession, reason);
      } catch (error) {
        console.error('Error in session listener:', error);
      }
    });
  }

  /**
   * Extend session (reset timeout)
   */
  extendSession() {
    if (this.isAuthenticated()) {
      this.resetSessionTimeout();
    }
  }

  /**
   * Get session status
   */
  getStatus() {
    if (!this.currentSession) return SESSION_STATUS.UNAUTHENTICATED;
    if (!this.isSessionValid(this.currentSession)) return SESSION_STATUS.EXPIRED;
    return SESSION_STATUS.AUTHENTICATED;
  }
}

// ─── SINGLETON INSTANCE ────────────────────────────────────────────────────────
export const authService = new AuthenticationService();

// ─── UTILITY FUNCTIONS ─────────────────────────────────────────────────────────

/**
 * Protected function wrapper - hanya bisa dijalankan jika authenticated
 * @param {Function} fn
 * @param {string} requiredPermission - Optional: permission yang diperlukan
 */
export function withAuthProtection(fn, requiredPermission = null) {
  return (...args) => {
    if (!authService.isAuthenticated()) {
      throw new Error('User tidak terautentikasi. Silakan login terlebih dahulu.');
    }

    if (requiredPermission && !authService.hasPermission(requiredPermission)) {
      throw new Error('User tidak memiliki izin untuk melakukan operasi ini.');
    }

    return fn(...args);
  };
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role) {
  const roleNames = {
    'SECRETARIAT_ADMIN': 'Admin Sekretariat DPRD',
    'PETUGAS_BK': 'Petugas Badan Kehormatan (BK)',
    'PETUGAS_SCAN': 'Operator Laptop Presensi',
    'ANGGOTA_DPRD': 'Anggota Dewan (DPRD)'
  };
  return roleNames[role] || role;
}

export default authService;
