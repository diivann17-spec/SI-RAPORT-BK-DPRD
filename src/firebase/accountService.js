/**
 * Account Management Service - SI-RAPORT BK DPRD
 * 
 * Mengelola whitelist akun terdaftar dengan kontrol ketat:
 * - Hanya Admin/BK yang dapat membuat dan mengelola akun
 * - Username dan password divalidasi terhadap whitelist
 * - Status akun (Aktif/Nonaktif) harus divalidasi sebelum login
 * - Role ditentukan dari data akun yang dibuat Admin/BK
 * - Tidak ada self-registration atau user-defined roles
 * 
 * Collections:
 * - /accounts      → Whitelist akun terdaftar (hanya Admin yang dapat membuat)
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, deleteUser, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db, firebaseConfig } from './config';

export const ACCOUNT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED'
};

export const ACCOUNT_ROLES = {
  ADMIN: 'SECRETARIAT_ADMIN',              // Admin Sekretariat DPRD - Full Access
  BK_STAFF: 'PETUGAS_BK',                  // Petugas Badan Kehormatan
  SCAN_OPERATOR: 'PETUGAS_SCAN',           // Operator Laptop Presensi
  MEMBER: 'ANGGOTA_DPRD'                   // Anggota Dewan
};

// ─── COLLECTION REFERENCE ─────────────────────────────────────────────────────
const ACCOUNTS_COLLECTION = 'accounts';

// Development-only whitelist. Production builds always use Firestore.
const LOCAL_TEST_ACCOUNTS = [
  {
    id: 'local-admin-001',
    username: 'admin',
    passwordHash: import.meta.env.VITE_LOCAL_ADMIN_PASSWORD || '',
    fullName: 'Administrator Sekretariat DPRD',
    email: 'admin@dprd.local',
    role: ACCOUNT_ROLES.ADMIN,
    status: ACCOUNT_STATUS.ACTIVE,
    memberId: null,
    department: 'Sekretariat',
    memberId: null,
    loginAttempts: 0,
  },
  {
    id: 'local-bk-001',
    username: 'bk',
    passwordHash: import.meta.env.VITE_LOCAL_BK_PASSWORD || '',
    fullName: 'Petugas Badan Kehormatan',
    email: 'bk@dprd.local',
    role: ACCOUNT_ROLES.BK_STAFF,
    status: ACCOUNT_STATUS.ACTIVE,
    memberId: null,
    department: 'Badan Kehormatan',
    memberId: null,
    loginAttempts: 0,
  },
  {
    id: 'local-scan-001',
    username: 'scan',
    passwordHash: import.meta.env.VITE_LOCAL_SCAN_PASSWORD || '',
    fullName: 'Operator Presensi',
    email: 'scan@dprd.local',
    role: ACCOUNT_ROLES.SCAN_OPERATOR,
    status: ACCOUNT_STATUS.ACTIVE,
    memberId: null,
    department: 'Sekretariat',
    memberId: null,
    loginAttempts: 0,
  },
  {
    id: 'local-member-001',
    username: 'DPRD001',
    passwordHash: import.meta.env.VITE_LOCAL_MEMBER_PASSWORD || '',
    fullName: 'AAN SETYAWAN, S.Si.',
    email: 'anggota001@dprd.local',
    role: ACCOUNT_ROLES.MEMBER,
    status: ACCOUNT_STATUS.ACTIVE,
    memberId: 'DPRD001',
    department: 'Fraksi Contoh',
    loginAttempts: 0,
  },
];

const isLocalDevelopmentAuth = import.meta.env.VITE_AUTH_MODE === 'local';

const normalizeLoginId = (value) => String(value || '').trim().toUpperCase();

// Firebase Auth account emails are internal identifiers, never shown to users.
const getAuthEmailForLoginId = (loginId) => {
  const clean = String(loginId || '').trim();
  if (!clean) return 'user@auth.si-raport.local';
  if (clean.includes('@') && !clean.includes(' ')) {
    return clean.toLowerCase();
  }
  const safeUsername = clean.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return `${safeUsername || 'user'}@auth.si-raport.local`;
};

const provisioningApp = initializeApp(firebaseConfig, 'account-provisioning');
const provisioningAuth = getAuth(provisioningApp);

/**
 * Validasi Login dengan Whitelist Ketat
 * 
 * @param {string} username - Username yang diinput user
 * @param {string} password - Password yang diinput user
 * @returns {Promise<{success: boolean, account: Object|null, error: string|null}>}
 * 
 * Validasi dilakukan dengan urutan:
 * 1. Username harus terdaftar di whitelist (case-insensitive)
 * 2. Password harus cocok persis dengan yang disimpan
 * 3. Status akun harus ACTIVE
 * 4. Timestamp login dicatat untuk audit
 */
export async function validateLoginWithWhitelist(loginId, password) {
  try {
    const cleanLoginId = normalizeLoginId(loginId);
    const cleanPassword = (password || '').trim();

    if (!cleanLoginId || !cleanPassword) {
      return {
        success: false,
        account: null,
        error: 'Username dan kata sandi wajib diisi.'
      };
    }

    // ⚠️ KEAMANAN: Cek panjang username (prevent injection)
    if (cleanLoginId.length > 50) {
      console.warn(`[SECURITY] Suspicious login attempt: ID terlalu panjang (${cleanLoginId.length} chars)`);
      return {
        success: false,
        account: null,
        error: 'Username atau kata sandi tidak sesuai.'
      };
    }

    if (isLocalDevelopmentAuth) {
      const localAccount = LOCAL_TEST_ACCOUNTS.find(
        (account) => normalizeLoginId(account.username) === cleanLoginId && account.passwordHash === cleanPassword
      );

      if (!localAccount) {
        console.warn(`[SECURITY] Local test login rejected: '${cleanLoginId}'`);
        return {
          success: false,
          account: null,
          error: 'Username atau kata sandi tidak sesuai.'
        };
      }

      console.log(`[LOCAL AUTH] Login accepted: ${cleanLoginId} (role: ${localAccount.role})`);
      return {
        success: true,
        account: { ...localAccount },
        error: null
      };
    }

    // Password verification belongs to Firebase Authentication.
    // Strategi login multi-format:
    // 1. Cari akun di Firestore berdasarkan usernameNormalized / memberIdNormalized
    // 2. Gunakan email yang tersimpan di Firestore (bisa email nyata atau format internal)
    // 3. Fallback ke format email internal jika tidak ditemukan atau tidak ada email tersimpan
    
    let credentialEmail = getAuthEmailForLoginId(cleanLoginId);
    let preloadedAccount = null;

    // Coba cari akun di Firestore berdasarkan username/memberId terlebih dahulu
    try {
      const usernameQuery = query(
        collection(db, ACCOUNTS_COLLECTION),
        where('usernameNormalized', '==', cleanLoginId.toLowerCase())
      );
      const snap = await getDocs(usernameQuery);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        preloadedAccount = { id: snap.docs[0].id, ...data };
        // Gunakan email yang tersimpan di Firestore untuk auth
        if (data.email && data.email.includes('@')) {
          credentialEmail = data.email;
        }
      }
    } catch (queryErr) {
      // Jika query gagal (misal rules masih strict), lanjut dengan format internal
      console.warn('[AUTH] Firestore pre-query failed, using internal email format:', queryErr.message);
    }

    // Jika tidak ditemukan via username, coba via memberId
    if (!preloadedAccount) {
      try {
        const memberIdQuery = query(
          collection(db, ACCOUNTS_COLLECTION),
          where('memberIdNormalized', '==', cleanLoginId)
        );
        const snap2 = await getDocs(memberIdQuery);
        if (!snap2.empty) {
          const data = snap2.docs[0].data();
          preloadedAccount = { id: snap2.docs[0].id, ...data };
          if (data.email && data.email.includes('@')) {
            credentialEmail = data.email;
          }
        }
      } catch (queryErr2) {
        console.warn('[AUTH] MemberId pre-query failed:', queryErr2.message);
      }
    }

    // Coba sign in dengan email yang sudah ditentukan
    let credential;
    try {
      credential = await signInWithEmailAndPassword(auth, credentialEmail, cleanPassword);
    } catch (primaryAuthErr) {
      // Jika gagal dan email bukan format internal, coba dengan format internal sebagai fallback
      if (credentialEmail !== getAuthEmailForLoginId(cleanLoginId)) {
        try {
          credential = await signInWithEmailAndPassword(
            auth,
            getAuthEmailForLoginId(cleanLoginId),
            cleanPassword
          );
        } catch (fallbackAuthErr) {
          throw primaryAuthErr; // Lempar error asli
        }
      } else {
        throw primaryAuthErr;
      }
    }

    // Ambil data akun dari Firestore (gunakan preloaded jika UID-nya cocok)
    let account;
    if (preloadedAccount && preloadedAccount.id === credential.user.uid) {
      account = preloadedAccount;
    } else {
      const accountDoc = await getDoc(doc(db, ACCOUNTS_COLLECTION, credential.user.uid));
      if (!accountDoc.exists()) {
        await signOut(auth);
        return { success: false, account: null, error: 'Akun belum terdaftar di sistem. Hubungi Admin.' };
      }
      account = { id: accountDoc.id, ...accountDoc.data() };
    }

    const accountLoginIds = [
      account.usernameNormalized,
      account.memberIdNormalized,
      account.username ? account.username.toUpperCase() : null,
      account.username ? account.username.toLowerCase() : null,
      account.email,
      account.email ? account.email.toUpperCase() : null,
      account.username ? getAuthEmailForLoginId(account.username) : null
    ]
      .filter(Boolean)
      .map(v => String(v).trim().toUpperCase());

    if (!accountLoginIds.includes(cleanLoginId.toUpperCase())) {
      await signOut(auth);
      return { success: false, account: null, error: 'ID login tidak terdaftar.' };
    }

    // ⚠️ KEAMANAN: Cek status ACTIVE - STRICT!
    if (!account.status || account.status !== ACCOUNT_STATUS.ACTIVE) {
      const statusInfo = account.status === ACCOUNT_STATUS.SUSPENDED
        ? 'Akun Anda telah disuspend.'
        : 'Akun Anda tidak aktif.';

      await signOut(auth);
      console.warn(`[SECURITY] Login blocked: Account '${cleanLoginId}' status=${account.status} (not ACTIVE)`);
      return {
        success: false,
        account: null,
        error: `${statusInfo} Hubungi Admin atau Badan Kehormatan (BK).`
      };
    }

    // ⚠️ KEAMANAN: Validasi tanggal berlaku (jika ada)
    if (account.expiresAt) {
      const expiryDate = account.expiresAt.toDate?.() || new Date(account.expiresAt);
      if (new Date() > expiryDate) {
        await signOut(auth);
        console.warn(`[SECURITY] Login blocked: Account '${cleanLoginId}' telah expired`);
        return {
          success: false,
          account: null,
          error: 'Akun Anda telah kadaluarsa. Hubungi Admin.'
        };
      }
    }

    // ⚠️ KEAMANAN: Validasi role harus valid
    const validRoles = Object.values(ACCOUNT_ROLES);
    if (!account.role || !validRoles.includes(account.role)) {
      await signOut(auth);
      console.error(`[SECURITY] Invalid role for account '${cleanLoginId}': ${account.role}`);
      return {
        success: false,
        account: null,
        error: 'Konfigurasi akun tidak valid. Hubungi Admin.'
      };
    }

    console.log(`[SUCCESS] Login accepted: ${cleanLoginId} (role: ${account.role})`);

    return {
      success: true,
      account: {
        id: account.id,
        username: account.username || account.memberId,
        loginId: cleanLoginId,
        uid: credential.user.uid,
        role: account.role, // Role dari Admin, BUKAN dari user input
        fullName: account.fullName,
        email: account.email || null,
        status: account.status,
        memberId: account.memberId || null,
        memberIdNormalized: account.memberIdNormalized || null,
        department: account.department || null,
        createdBy: account.createdBy, // Admin yang membuat akun ini
        createdAt: account.createdAt
      },
      error: null
    };
  } catch (error) {
    console.error('[ERROR] Login validation error:', error);
    if (auth.currentUser) await signOut(auth);
    const errorMessages = {
      'auth/invalid-credential': 'ID Anggota/username atau password salah.',
      'auth/invalid-email': 'Format username atau ID tidak valid. Pastikan tidak ada karakter khusus.',
      'auth/email-already-in-use': 'Username atau ID ini sudah terdaftar di Firebase Auth.',
      'auth/user-not-found': 'Akun Firebase untuk ID tersebut belum dibuat. Hubungi Admin/BK.',
      'auth/wrong-password': 'Password salah.',
      'auth/operation-not-allowed': 'Provider Email/Password belum diaktifkan di Firebase Authentication.',
      'auth/invalid-api-key': 'Firebase API key tidak valid.',
      'permission-denied': 'Firestore Rules menolak akses. Pastikan dokumen accounts memakai UID Firebase Auth.',
      'unavailable': 'Firebase tidak dapat dihubungi. Periksa koneksi internet.'
    };
    return {
      success: false,
      account: null,
      error: errorMessages[error.code] || `Firebase: ${error.message || 'Gagal memvalidasi akun.'}`
    };
  }
}


/**
 * Catat Login Attempt untuk Audit Trail
 * 
 * ⚠️ KEAMANAN: Mencatat setiap percobaan login (success/failed)
 * Max 3 failed attempts → Account di-lock sementara
 * 
 * @param {string} accountId - Account ID
 * @param {boolean} successful - Success atau failed login
 */
async function recordLoginAttempt(accountId, successful) {
  try {
    const accountRef = doc(db, ACCOUNTS_COLLECTION, accountId);
    const accountData = (await getDoc(accountRef)).data();
    
    // Reset attempts jika login berhasil
    const newAttempts = successful ? 0 : ((accountData?.loginAttempts || 0) + 1);
    
    // ⚠️ SECURITY: Jika sudah >3 attempts, auto-suspend account
    const shouldSuspend = newAttempts >= 3 && !successful;
    
    const updateData = {
      lastLoginAt: serverTimestamp(),
      lastLoginStatus: successful ? 'SUCCESS' : 'FAILED',
      loginAttempts: newAttempts,
      lastLoginAttemptAt: serverTimestamp()
    };
    
    // Jika exceed attempts, auto-suspend untuk keamanan
    if (shouldSuspend) {
      updateData.status = ACCOUNT_STATUS.SUSPENDED;
      updateData.suspendedAt = serverTimestamp();
      updateData.suspensionReason = 'AUTO: Too many failed login attempts (brute force protection)';
      updateData.suspendedBy = 'SYSTEM';
      console.warn(`[SECURITY] Account ${accountId} auto-suspended: Too many failed login attempts`);
    }
    
    await updateDoc(accountRef, updateData);
    
    if (successful) {
      console.log(`[AUDIT] Login SUCCESS: Account ${accountId}, attempts reset to 0`);
    } else {
      console.warn(`[AUDIT] Login FAILED: Account ${accountId}, attempts=${newAttempts}`);
      if (shouldSuspend) {
        console.error(`[SECURITY] Account ${accountId} SUSPENDED due to brute force attempts`);
      }
    }
  } catch (error) {
    console.error('[ERROR] Failed to record login attempt:', error);
    // Jangan block login jika recording gagal, tapi log error
  }
}

// ─── ACCOUNT MANAGEMENT (Admin Only) ───────────────────────────────────────────

/**
 * Buat Akun Baru (HANYA Admin/BK yang dapat membuat)
 * 
 * @param {Object} accountData
 * @param {string} accountData.username - Username unik (akan dinormalisasi ke lowercase)
 * @param {string} accountData.uid - Firebase Authentication UID created by Admin/BK provisioning
 * @param {string} accountData.fullName - Nama lengkap pengguna
 * @param {string} accountData.role - Role dari ACCOUNT_ROLES (ditentukan Admin, bukan user)
 * @param {string} accountData.email - Email (opsional)
 * @param {string} accountData.status - Status (ACTIVE/INACTIVE/SUSPENDED)
 * @param {string} accountData.memberId - ID Anggota DPRD (jika user adalah anggota)
 * @param {string} createdByAdminId - User ID Admin yang membuat akun ini
 * @returns {Promise<string>} - Document ID dari akun baru
 */
export async function createAccount(accountData, createdByAdminId) {
  let createdAuthUser = null;
  try {
    // Validasi role
    if (!Object.values(ACCOUNT_ROLES).includes(accountData.role)) {
      throw new Error(`Role tidak valid: ${accountData.role}`);
    }

    if (!accountData.password || accountData.password.trim().length < 6) {
      throw new Error('Password akun minimal 6 karakter.');
    }

    // Normalisasi identifier
    const loginIdentifier = accountData.memberId || accountData.username;
    if (!loginIdentifier) throw new Error('Username atau ID Anggota wajib diisi.');
    const usernameNormalized = normalizeLoginId(loginIdentifier).toLowerCase();
    const memberIdNormalized = accountData.memberId
      ? normalizeLoginId(accountData.memberId)
      : null;

    // Cek username sudah ada
    const existingQuery = query(
      collection(db, ACCOUNTS_COLLECTION),
      where('usernameNormalized', '==', usernameNormalized)
    );
    const existingSnap = await getDocs(existingQuery);
    if (!existingSnap.empty) {
      throw new Error('Username sudah terdaftar.');
    }

    if (memberIdNormalized) {
      const memberQuery = query(
        collection(db, ACCOUNTS_COLLECTION),
        where('memberIdNormalized', '==', memberIdNormalized)
      );
      if (!(await getDocs(memberQuery)).empty) {
        throw new Error('ID Anggota sudah terhubung ke akun lain.');
      }

      const memberSnapshot = await getDoc(doc(db, 'members', accountData.memberId));
      if (!memberSnapshot.exists()) {
        throw new Error('ID Anggota belum memiliki data Anggota DPRD.');
      }
    }

    const authEmail = getAuthEmailForLoginId(loginIdentifier);
    try {
      const credential = await createUserWithEmailAndPassword(
        provisioningAuth,
        authEmail,
        accountData.password.trim()
      );
      createdAuthUser = credential.user;
    } catch (authErr) {
      if (authErr.code === 'auth/email-already-in-use') {
        try {
          const signInCred = await signInWithEmailAndPassword(
            provisioningAuth,
            authEmail,
            accountData.password.trim()
          );
          createdAuthUser = signInCred.user;
        } catch (loginErr) {
          throw new Error(`Username '${loginIdentifier}' sudah terdaftar di Firebase Auth. Silakan gunakan username lain yang unik (misal: bk_petugas, bk01, dll).`);
        }
      } else {
        throw authErr;
      }
    }

    // Buat akun baru
    const newAccount = {
      uid: createdAuthUser.uid,
      username: String(loginIdentifier).trim(),
      usernameNormalized: usernameNormalized,
      memberIdNormalized,
      fullName: accountData.fullName.trim(),
      email: authEmail,
      role: accountData.role, // Role ditentukan oleh Admin
      status: accountData.status || ACCOUNT_STATUS.ACTIVE,
      memberId: accountData.memberId || null,
      memberIdNormalized,
      department: accountData.department || null,
      expiresAt: accountData.expiresAt || null,
      createdBy: auth.currentUser?.uid || createdByAdminId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: null,
      lastLoginStatus: null,
      loginAttempts: 0,
      notes: accountData.notes || null
    };

    await setDoc(doc(db, ACCOUNTS_COLLECTION, createdAuthUser.uid), newAccount);

    return createdAuthUser.uid;
  } catch (error) {
    if (createdAuthUser) {
      try { await deleteUser(createdAuthUser); } catch (cleanupError) {
        console.error('[AUTH] Failed to clean up orphaned Firebase user:', cleanupError);
      }
    }
    console.error('Error creating account:', error);
    throw error;
  }
}

/**
 * Update Akun (HANYA Admin yang dapat mengubah)
 * 
 * @param {string} accountId
 * @param {Object} updateData - Field yang akan diupdate
 * @param {string} updatedByAdminId - User ID Admin yang melakukan update
 * @returns {Promise<void>}
 */
export async function updateAccount(accountId, updateData, updatedByAdminId) {
  try {
    // Field yang tidak boleh diubah user
    const protectedFields = ['createdBy', 'createdAt', 'usernameNormalized'];
    
    // Validasi role jika ada update role
    if (updateData.role && !Object.values(ACCOUNT_ROLES).includes(updateData.role)) {
      throw new Error(`Role tidak valid: ${updateData.role}`);
    }

    // Password is managed by Firebase Authentication, never Firestore.
    const cleanedData = { ...updateData };
    if (cleanedData.password || cleanedData.passwordHash) {
      throw new Error('Password harus diubah melalui Firebase Authentication atau Cloud Function.');
    }

    // Jika username diupdate, normalisasi dan cek keunikan
    if (cleanedData.username) {
      const newUsernameNormalized = cleanedData.username.trim().toLowerCase();
      
      // Cek keunikan username (exclude akun ini sendiri)
      const existingQuery = query(
        collection(db, ACCOUNTS_COLLECTION),
        where('usernameNormalized', '==', newUsernameNormalized)
      );
      const existingSnap = await getDocs(existingQuery);
      
      if (existingSnap.docs.some(doc => doc.id !== accountId)) {
        throw new Error('Username sudah digunakan oleh akun lain.');
      }

      cleanedData.usernameNormalized = newUsernameNormalized;
      cleanedData.username = cleanedData.username.trim();
    }

    if (cleanedData.memberId) {
      cleanedData.memberIdNormalized = normalizeLoginId(cleanedData.memberId);
    }

    // Remove protected fields
    protectedFields.forEach(field => delete cleanedData[field]);

    // Update dengan audit trail
    const accountRef = doc(db, ACCOUNTS_COLLECTION, accountId);
    await updateDoc(accountRef, {
      ...cleanedData,
      updatedAt: serverTimestamp(),
      updatedBy: updatedByAdminId
    });
  } catch (error) {
    console.error('Error updating account:', error);
    throw error;
  }
}

/**
 * Nonaktifkan Akun (Soft Delete)
 * @param {string} accountId
 * @param {string} deactivatedByAdminId
 * @param {string} reason - Alasan deaktivasi
 */
export async function deactivateAccount(accountId, deactivatedByAdminId, reason = '') {
  try {
    const accountRef = doc(db, ACCOUNTS_COLLECTION, accountId);
    await updateDoc(accountRef, {
      status: ACCOUNT_STATUS.INACTIVE,
      deactivatedAt: serverTimestamp(),
      deactivatedBy: deactivatedByAdminId,
      deactivationReason: reason,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error deactivating account:', error);
    throw error;
  }
}

/**
 * Aktivasi Ulang Akun
 */
export async function reactivateAccount(accountId, reactivatedByAdminId) {
  try {
    const accountRef = doc(db, ACCOUNTS_COLLECTION, accountId);
    await updateDoc(accountRef, {
      status: ACCOUNT_STATUS.ACTIVE,
      reactivatedAt: serverTimestamp(),
      reactivatedBy: reactivatedByAdminId,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error reactivating account:', error);
    throw error;
  }
}

/**
 * Suspend Akun (Tindakan Disipliner)
 */
export async function suspendAccount(accountId, suspendedByAdminId, reason = '') {
  try {
    const accountRef = doc(db, ACCOUNTS_COLLECTION, accountId);
    await updateDoc(accountRef, {
      status: ACCOUNT_STATUS.SUSPENDED,
      suspendedAt: serverTimestamp(),
      suspendedBy: suspendedByAdminId,
      suspensionReason: reason,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error suspending account:', error);
    throw error;
  }
}

/**
 * Hapus Akun (Hard Delete - hanya untuk data testing)
 */
export async function deleteAccount(accountId) {
  try {
    const accountRef = doc(db, ACCOUNTS_COLLECTION, accountId);
    await deleteDoc(accountRef);
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
}

/**
 * Ambil Semua Akun Terdaftar
 */
export async function fetchAllAccounts() {
  try {
    if (isLocalDevelopmentAuth) {
      return [...LOCAL_TEST_ACCOUNTS];
    }
    const snapshot = await getDocs(collection(db, ACCOUNTS_COLLECTION));
    const list = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return list.sort((a, b) => (a.username || a.fullName || '').localeCompare(b.username || b.fullName || ''));
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }
}

/**
 * Ambil Data Akun Berdasarkan ID
 */
export async function getAccountById(accountId) {
  try {
    const accountRef = doc(db, ACCOUNTS_COLLECTION, accountId);
    const snapshot = await getDoc(accountRef);
    
    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data()
    };
  } catch (error) {
    console.error('Error fetching account:', error);
    return null;
  }
}

/**
 * Filter Akun Berdasarkan Role
 */
export async function fetchAccountsByRole(role) {
  try {
    const q = query(
      collection(db, ACCOUNTS_COLLECTION),
      where('role', '==', role),
      orderBy('username', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching accounts by role:', error);
    return [];
  }
}

/**
 * Filter Akun Berdasarkan Status
 */
export async function fetchAccountsByStatus(status) {
  try {
    const q = query(
      collection(db, ACCOUNTS_COLLECTION),
      where('status', '==', status),
      orderBy('username', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching accounts by status:', error);
    return [];
  }
}

/**
 * Reset Password Akun (hanya Admin yang dapat melakukan)
 */
export async function resetAccountPassword(accountId, newPassword, resetByAdminId) {
  throw new Error(
    'Reset password harus dilakukan melalui Firebase Authentication Admin SDK/Cloud Function; password tidak boleh disimpan di Firestore.'
  );
}
