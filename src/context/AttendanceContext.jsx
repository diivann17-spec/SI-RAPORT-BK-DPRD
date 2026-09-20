import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection, doc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp, where, limit, waitForPendingWrites,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getRaportCategory, getDisciplineGrade, calculateAttendanceStatus, normalizeAttendanceStatus } from '../utils/raportUtils';
import { getDeviceFingerprint, validateDeviceSingleAttendance } from '../utils/deviceUtils';
import { DEFAULT_ROOMS, findRoomConflict } from '../utils/roomUtils';
import { matchAKDCategory, memberHasAKD, matchActivityToAKD, getCanonicalAKDKey, getActivityAKDKey } from '../utils/akdUtils';
import { authService } from '../firebase/authService';
import { createAccount, updateAccount, ACCOUNT_ROLES, ACCOUNT_STATUS } from '../firebase/accountService';
import { removeAttendancePhoto as removeLocalAttendancePhoto } from '../utils/attendancePhotoStore';
// Mock data dihapus — app mulai kosong, data dari Firestore / input manual

const AttendanceContext = createContext();

const COL = {
  MEMBERS:       'members',
  PERSONNEL:     'personnel',
  ACTIVITIES:    'activities',
  LOGS:          'attendanceLogs',
  AUDIT:         'auditTrails',
  BK_NOTES:      'bkNotes',
  ROOMS:         'rooms',
  DELETED_LOGS:  'deletedAttendanceLogs',
  SIGNERS:       'reportSigners',
  LEAVE_REQUESTS:'leaveRequests',
};

const DEFAULT_SIGNERS = [
  { id: 'SIGNER-1', label: 'Mengetahui', name: 'Agung Gumilang, SS., M.Si', position: 'Kepala Fasilitas Penganggaran dan Pengawasan', rank: 'Pembina, IV/a', nip: '19711223 199803 1 001', active: true },
  { id: 'SIGNER-2', label: 'Petugas/Pengelola', name: 'Oisroil, ST., M.AP', position: 'Analis Kebijakan Ahli Muda', rank: 'Penata, III/d', nip: '19750311 200701 1 007', active: true },
];

const getComparableTimestamp = (value) => {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString();
  }
  return String(value);
};

const getActivityStatusKey = (activity) => String(activity?.status || 'ACTIVE').trim().toUpperCase();

const getAttendanceDocumentId = (activityId, participantId, participantType = 'INTERNAL') =>
  `${participantType === 'EXTERNAL' ? 'ATT-GST' : 'ATT'}-${activityId}-${participantId}`;

const normalizeLoadedLog = (log) => {
  const source = String(log?.source || log?.method || '').toUpperCase();
  const isLegacyManual = log?.isLegacy === true || source.includes('LEGACY') || source.includes('MANUAL_LAMA');
  if (!isLegacyManual) return log;
  return {
    ...log,
    memberId: log.memberId || (log.participantType !== 'EXTERNAL' ? log.participantId : log.memberId),
    activityId: log.activityId || log.agendaId,
    status: normalizeAttendanceStatus(log.status, log),
  };
};

const getStableGuestId = (activityId, agency, invitedName) => {
  const identity = `${activityId}-${agency}-${invitedName}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `GST-${identity || activityId}`;
};

const validateAttendanceActivity = (activity) => {
  const status = getActivityStatusKey(activity);
  if (['CANCELLED', 'DIBATALKAN', 'CANCELED'].includes(status)) {
    return { allowed: false, message: 'Agenda dibatalkan. QR Agenda dan absensi tidak berlaku.' };
  }
  if (['COMPLETED', 'SELESAI', 'FINISHED'].includes(status)) {
    return { allowed: false, message: 'Agenda telah selesai. Absensi otomatis ditutup.' };
  }
  if (['SCHEDULED', 'TERJADWAL', 'PLANNED'].includes(status)) {
    return { allowed: false, message: 'Agenda masih Terjadwal. Absensi hanya dapat dilakukan saat agenda Berlangsung.' };
  }
  if (!['ACTIVE', 'BERLANGSUNG', 'ONGOING', 'IN_PROGRESS'].includes(status)) {
    return { allowed: false, message: 'Agenda belum berstatus Berlangsung. Absensi belum dapat dilakukan.' };
  }
  return { allowed: true };
};

const getAttendanceAnomalies = ({ existingLog, checkInAt, checkOutAt, distanceMeters, radiusMeters }) => {
  const anomalies = [];
  if (existingLog?.checkInAt && existingLog?.checkOutAt) anomalies.push('Perubahan data absensi berulang');
  if (checkInAt && checkOutAt && (checkOutAt - checkInAt) < 2 * 60 * 1000) anomalies.push('Check-in dan check-out terlalu berdekatan');
  if (Number.isFinite(Number(distanceMeters)) && Number(distanceMeters) > Number(radiusMeters || 150)) anomalies.push('Perubahan lokasi tidak wajar');
  return anomalies;
};

const normalizeRole = (role) => {
  const normalized = String(role || '').trim().toLowerCase();

  if (['secretariat_admin', 'admin', 'sekretariat', 'sekretariat_admin', 'admin_sekretariat'].includes(normalized)) {
    return 'SECRETARIAT_ADMIN';
  }

  if (['petugas_bk', 'bk', 'bk_dprd', 'badan_kehormatan', 'kehormatan'].includes(normalized)) {
    return 'PETUGAS_BK';
  }

  if (['petugas_scan', 'operator_scan', 'scan', 'operator', 'operator_laptop_presensi'].includes(normalized)) {
    return 'PETUGAS_SCAN';
  }

  if (['anggota_dprd', 'anggota', 'member', 'dewan'].includes(normalized)) {
    return 'ANGGOTA_DPRD';
  }

  return 'PETUGAS_BK';
};

const ATTENDANCE_QUEUE_KEY = 'siraport_attendance_queue';

const readAttendanceQueue = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(ATTENDANCE_QUEUE_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    return [];
  }
};

const writeAttendanceQueue = (queue) => {
  try {
    localStorage.setItem(ATTENDANCE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn('Attendance queue tidak dapat disimpan:', error);
  }
};

const enqueueAttendanceWrite = (operation, logId, data) => {
  const queue = readAttendanceQueue();
  const existingIndex = queue.findIndex(item => item.logId === logId);
  const existing = existingIndex >= 0 ? queue[existingIndex] : null;
  const nextItem = {
    id: `${operation}-${logId}`,
    operation: existing?.operation === 'create' ? 'create' : operation,
    logId,
    data: existing?.operation === 'create' ? { ...existing.data, ...data } : data,
    queuedAt: existing?.queuedAt || new Date().toISOString(),
  };
  if (existingIndex >= 0) queue[existingIndex] = nextItem;
  else queue.push(nextItem);
  writeAttendanceQueue(queue);
  return queue;
};

const flushAttendanceQueue = async () => {
  const queue = readAttendanceQueue();
  if (!queue.length || !navigator.onLine) return { synced: 0, remaining: queue.length };

  const remaining = [];
  let synced = 0;
  for (const item of queue) {
    try {
      const logRef = doc(db, COL.LOGS, item.logId);
      if (item.operation === 'create') {
        await runTransaction(db, async (transaction) => {
          const existingSnapshot = await transaction.get(logRef);
          if (existingSnapshot.exists()) return;
          transaction.set(logRef, { ...item.data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        });
      } else {
        const { id, ...updateData } = item.data;
        await updateDoc(logRef, { ...updateData, updatedAt: serverTimestamp() });
      }
      synced++;
    } catch (error) {
      if (error?.message === 'DUPLICATE_ATTENDANCE') {
        synced++;
      } else {
        remaining.push(item);
      }
    }
  }
  writeAttendanceQueue(remaining);
  return { synced, remaining: remaining.length };
};

const safeDbWrite = async (operation, timeoutMs = 4000, timeoutMessage = 'Koneksi ke server gagal. Data tersimpan secara lokal dan akan disinkronisasi saat koneksi kembali.') => {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    await Promise.race([operation(), timeoutPromise]);
    return { ok: true, timedOut: false };
  } catch (error) {
    console.warn(timeoutMessage, error);
    return {
      ok: false,
      timedOut: error?.message === timeoutMessage,
      duplicate: error?.message === 'DUPLICATE_ATTENDANCE',
      message: error?.message === timeoutMessage ? timeoutMessage : `${timeoutMessage} (${error?.message || 'Firestore menolak operasi.'})`,
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export function AttendanceProvider({ children }) {
  // Load initial states with localStorage cache fallback
  const [members, setMembers] = useState(() => {
    try {
      const stored = localStorage.getItem('siraport_members');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const [personnel, setPersonnel] = useState(() => {
    try {
      const stored = localStorage.getItem('siraport_personnel');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const [activities, setActivities] = useState(() => {
    try {
      const stored = localStorage.getItem('siraport_activities');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const [logs, setLogs] = useState(() => {
    try {
      const stored = localStorage.getItem('siraport_logs');
      return stored ? JSON.parse(stored).map(normalizeLoadedLog) : [];
    } catch (e) {
      return [];
    }
  });

  const [deletedLogIds, setDeletedLogIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('siraport_deleted_log_ids')) || []; } catch (e) { return []; }
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const stored = localStorage.getItem('siraport_audit');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const [bkNotes, setBkNotes] = useState({});
  const [rooms, setRooms] = useState(() => {
    try {
      const stored = localStorage.getItem('siraport_rooms');
      return stored ? JSON.parse(stored) : DEFAULT_ROOMS;
    } catch (e) { return DEFAULT_ROOMS; }
  });
  const [scoreSettings, setScoreSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('siraport_score_settings')) || { excellent: 90, good: 80, fair: 70, poor: 60, heavyLateMinutes: 60 }; } catch (e) { return { excellent: 90, good: 80, fair: 70, poor: 60, heavyLateMinutes: 60 }; }
  });
  const [reportSigners, setReportSigners] = useState(() => {
    try { return JSON.parse(localStorage.getItem('siraport_report_signers')) || DEFAULT_SIGNERS; } catch (e) { return DEFAULT_SIGNERS; }
  });
  const [leaveRequests, setLeaveRequests] = useState(() => {
    try { return JSON.parse(localStorage.getItem('siraport_leave_requests')) || []; } catch (e) { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('saved');

  // Sync to localStorage
  useEffect(() => {
    try { localStorage.setItem('siraport_logs', JSON.stringify(logs)); } catch (e) {}
  }, [logs]);

  useEffect(() => {
    try { localStorage.setItem('siraport_leave_requests', JSON.stringify(leaveRequests)); } catch (e) {}
  }, [leaveRequests]);

  useEffect(() => {
    try { localStorage.setItem('siraport_deleted_log_ids', JSON.stringify(deletedLogIds)); } catch (e) {}
  }, [deletedLogIds]);

  useEffect(() => {
    try { localStorage.setItem('siraport_activities', JSON.stringify(activities)); } catch (e) {}
  }, [activities]);
  useEffect(() => {
    try { localStorage.setItem('siraport_report_signers', JSON.stringify(reportSigners)); } catch (e) {}
  }, [reportSigners]);

  useEffect(() => {
    try { localStorage.setItem('siraport_members', JSON.stringify(members)); } catch (e) {}
  }, [members]);

  useEffect(() => {
    try { localStorage.setItem('siraport_personnel', JSON.stringify(personnel)); } catch (e) {}
  }, [personnel]);

  useEffect(() => {
    try { localStorage.setItem('siraport_audit', JSON.stringify(auditLogs)); } catch (e) {}
  }, [auditLogs]);

  useEffect(() => {
    try { localStorage.setItem('siraport_score_settings', JSON.stringify(scoreSettings)); } catch (e) {}
  }, [scoreSettings]);

  useEffect(() => {
    try { localStorage.setItem('siraport_rooms', JSON.stringify(rooms)); } catch (e) {}
  }, [rooms]);

  // BroadcastChannel & window storage listener for instant cross-tab / cross-window sync
  useEffect(() => {
    let bc;
    try {
      bc = new BroadcastChannel('siraport_sync_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'LOGS_UPDATED' && Array.isArray(event.data.logs)) {
          setLogs(event.data.logs.map(normalizeLoadedLog).filter(log => !deletedLogIds.includes(log.id)));
        }
        if (event.data?.type === 'LOG_DELETED' && event.data.logId) {
          setDeletedLogIds(previous => Array.from(new Set([...previous, event.data.logId])));
          setLogs(previous => previous.filter(log => log.id !== event.data.logId));
        }
        if (event.data?.type === 'ACTIVITIES_UPDATED' && Array.isArray(event.data.activities)) {
          setActivities(event.data.activities);
        }
        if (event.data?.type === 'MEMBERS_UPDATED' && Array.isArray(event.data.members)) {
          setMembers(event.data.members);
        }
        if (event.data?.type === 'PERSONNEL_UPDATED' && Array.isArray(event.data.personnel)) {
          setPersonnel(event.data.personnel);
        }
      };
    } catch (e) {}

    const handleStorage = (e) => {
      if (e.key === 'siraport_logs' && e.newValue) {
        try { setLogs(JSON.parse(e.newValue).map(normalizeLoadedLog).filter(log => !deletedLogIds.includes(log.id))); } catch (err) {}
      }
      if (e.key === 'siraport_deleted_log_ids' && e.newValue) {
        try {
          const ids = JSON.parse(e.newValue);
          setDeletedLogIds(ids);
          setLogs(previous => previous.filter(log => !ids.includes(log.id)));
        } catch (err) {}
      }
      if (e.key === 'siraport_activities' && e.newValue) {
        try { setActivities(JSON.parse(e.newValue)); } catch (err) {}
      }
      if (e.key === 'siraport_personnel' && e.newValue) {
        try { setPersonnel(JSON.parse(e.newValue)); } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [deletedLogIds]);

  // 🔐 SECURITY FIX: Do NOT auto-load currentUser from localStorage on app start!
  // Reason: User bisa manipulate localStorage untuk bypass authentication
  // Instead: Load only AFTER session verification di authService
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [currentRole, setCurrentRole] = useState(
    () => normalizeRole('PETUGAS_BK')
  );
  const [activeMemberId, setActiveMemberId] = useState(
    () => 'DPRD-001'
  );

  useEffect(() => {
    return authService.subscribe((session) => {
      setAuthReady(true);
      if (!session) {
        setCurrentUser(null);
        setCurrentRole('PETUGAS_BK');
        setActiveMemberId('DPRD-001');
        return;
      }

      setCurrentUser({
        accountId: session.accountId,
        uid: session.uid,
        role: session.role,
        username: session.username,
        name: session.fullName,
        memberId: session.memberId,
        status: session.status,
        roleLabel: session.role === 'SECRETARIAT_ADMIN' ? 'Admin Sekretariat DPRD' :
          session.role === 'PETUGAS_BK' ? 'Badan Kehormatan (BK)' :
            session.role === 'PETUGAS_SCAN' ? 'Operator Laptop Presensi' : 'Anggota Dewan (DPRD)'
      });
      setCurrentRole(session.role);
      if (session.memberId) setActiveMemberId(session.memberId);
    });
  }, []);

  useEffect(() => {
    if (!authReady) return undefined;

    const retryQueuedAttendance = async () => {
      const result = await flushAttendanceQueue();
      if (result.remaining > 0) setSyncStatus('pending');
      else if (result.synced > 0) setSyncStatus('saved');
    };

    void retryQueuedAttendance();
    const intervalId = window.setInterval(retryQueuedAttendance, 15000);
    window.addEventListener('online', retryQueuedAttendance);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('online', retryQueuedAttendance);
    };
  }, [authReady, currentRole]);

  // 🔐 SECURITY FIX: login() dengan STRICT VALIDATION
  // Requirement: Data harus dari verified account (Firestore), bukan user input
  const login = ({ role, username, name, memberId, accountId, status }) => {
    // ⚠️ VALIDATION #1: Role harus valid (dari enum)
    const validRoles = ['SECRETARIAT_ADMIN', 'PETUGAS_BK', 'PETUGAS_SCAN', 'ANGGOTA_DPRD'];
    if (!validRoles.includes(role)) {
      console.error('[SECURITY] Invalid role attempt:', role);
      throw new Error('Invalid role: ' + role);
    }

    // ⚠️ VALIDATION #2: Status HARUS "ACTIVE" (dari Firestore)
    if (status !== 'ACTIVE') {
      console.error('[SECURITY] Account not active:', { username, status });
      throw new Error('Account is not active: ' + status);
    }

    // ⚠️ VALIDATION #3: accountId WAJIB ada (untuk verification nantinya)
    if (!accountId) {
      console.error('[SECURITY] Account ID missing');
      throw new Error('Account ID is required');
    }

    // ⚠️ VALIDATION #4: username & name tidak boleh kosong
    if (!username || !name) {
      console.error('[SECURITY] Username or name missing');
      throw new Error('Username and name are required');
    }

    const normalizedRole = normalizeRole(role);
    const userObj = {
      accountId: accountId,  // ← Added untuk verification
      role: normalizedRole,
      username: username || 'user',
      name: name || username || 'Pengguna',
      memberId: memberId || 'DPRD-001',
      status: status,        // ← Added untuk verification
      roleLabel: normalizedRole === 'SECRETARIAT_ADMIN' ? 'Admin Sekretariat DPRD' :
                 normalizedRole === 'PETUGAS_BK' ? 'Badan Kehormatan (BK)' :
                 normalizedRole === 'PETUGAS_SCAN' ? 'Operator Laptop Presensi' : 'Anggota Dewan (DPRD)',
      loginAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString()  // ← Track when verified
    };
    
    setCurrentUser(userObj);
    setCurrentRole(userObj.role);
    if (memberId) setActiveMemberId(memberId);
    
    console.log('[AUTH] User logged in:', { username, role: normalizedRole, accountId });
    logAudit({
      action: 'USER_LOGIN',
      details: `Login verified: ${userObj.name} (${userObj.role}) - AccountID: ${accountId}`,
      method: 'WHITELIST_AUTHENTICATION'
    });
  };

  // Logout handler — Pembersihan Menyeluruh Sesi Login
  const logout = () => {
    if (currentUser) {
      logAudit({
        action: 'USER_LOGOUT',
        details: `Logout: ${currentUser.name} (${currentUser.role})`,
        method: 'LOCAL_SIMULATION'
      });
    }

    // 1. Reset state
    setCurrentUser(null);
    setCurrentRole('PETUGAS_BK');
    setActiveMemberId('DPRD-001');
  };


  // ─── Realtime Firestore listeners with auto-seed and robust multi-device sync ───
  useEffect(() => {
    const unsubs = [];
    if (!currentUser) return () => {};
    try {
      // 1. Listen Members
      unsubs.push(onSnapshot(collection(db, COL.MEMBERS), (snap) => {
        if (!snap.empty) {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          setMembers(data);
          if (!localStorage.getItem('siraport_active_member_id') && data.length > 0) {
            setActiveMemberId(data[0].id);
          }
        }
        // Firestore kosong = belum ada data, user perlu input manual
      }, err => console.warn('Firestore members fallback:', err.message)));

      // 2. Listen Personnel
      unsubs.push(onSnapshot(collection(db, COL.PERSONNEL), (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setPersonnel(data);
      }, err => console.warn('Firestore personnel fallback:', err.message)));

      // 3. Listen Activities
      unsubs.push(onSnapshot(collection(db, COL.ACTIVITIES), (snap) => {
        if (!snap.empty) {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          data.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          setActivities(data);
        }
        // Firestore kosong = belum ada kegiatan, user perlu buat baru
      }, err => console.warn('Firestore activities fallback:', err.message)));

      // 3. Listen Attendance Logs (Cross-Device Realtime Sync)
      const logsQuery = currentRole === 'PUBLIC_GUEST'
        ? query(collection(db, COL.LOGS), where('participantType', '==', 'EXTERNAL'))
        : currentRole === 'ANGGOTA_DPRD' && currentUser.memberId
        ? query(collection(db, COL.LOGS), where('memberId', '==', currentUser.memberId))
        : collection(db, COL.LOGS);
      unsubs.push(onSnapshot(logsQuery, (snap) => {
        const firestoreLogs = snap.docs.filter(d => !deletedLogIds.includes(d.id)).map(d => {
            const raw = d.data();
            const isLegacyManual = raw.isLegacy === true || String(raw.source || raw.method || '').toUpperCase().includes('LEGACY');
            const normalizedStatus = isLegacyManual
              ? normalizeAttendanceStatus(raw.status, raw)
              : raw.status;
            if (isLegacyManual && raw.status !== normalizedStatus && ['SECRETARIAT_ADMIN', 'PETUGAS_BK'].includes(currentRole)) {
              void setDoc(doc(db, COL.LOGS, d.id), {
                status: normalizedStatus,
                updatedAt: serverTimestamp(),
              }, { merge: true }).catch(error => {
                console.warn('Firestore legacy status normalization warning:', error.message);
              });
            }
            // Normalisasi timestamp dari Firestore Timestamp objek ke string ISO
            let tsStr = raw.timestamp;
            if (raw.timestamp?.toDate) {
              tsStr = raw.timestamp.toDate().toISOString();
            } else if (raw.createdAt?.toDate) {
              tsStr = raw.createdAt.toDate().toISOString();
            } else if (typeof raw.timestamp !== 'string') {
              tsStr = new Date().toISOString();
            }
            return {
              id: d.id,
              ...raw,
              ...(isLegacyManual ? { status: normalizedStatus } : {}),
              timestamp: tsStr
            };
        });

        // Firestore adalah sumber kebenaran; cache lokal tidak boleh menciptakan
        // absensi atau angka raport yang tidak ada di database.
        const nextLogs = firestoreLogs.sort((a, b) => {
          const aTs = getComparableTimestamp(a.timestamp);
          const bTs = getComparableTimestamp(b.timestamp);
          return bTs.localeCompare(aTs);
        });
        const queuedIds = new Set(readAttendanceQueue().map(item => item.logId));
        setLogs(previous => {
          const pendingLocalLogs = previous.filter(log => log.syncPending && queuedIds.has(log.id));
          const remoteIds = new Set(nextLogs.map(log => log.id));
          return [...nextLogs, ...pendingLocalLogs.filter(log => !remoteIds.has(log.id))];
        });
        setSyncStatus('saved');
        try { localStorage.setItem('siraport_logs', JSON.stringify(nextLogs)); } catch (e) {}
      }, err => {
        setSyncStatus('failed');
        console.warn('Firestore logs fallback:', err.message);
      }));

      unsubs.push(onSnapshot(collection(db, COL.DELETED_LOGS), (snap) => {
        const remoteDeletedIds = snap.docs.map(d => d.id);
        if (remoteDeletedIds.length > 0) {
          setDeletedLogIds(previous => Array.from(new Set([...previous, ...remoteDeletedIds])));
          setLogs(previous => previous.filter(log => !remoteDeletedIds.includes(log.id)));
        }
      }, err => console.warn('Firestore deleted logs fallback:', err.message)));

      // 4. Listen Audit Logs
      unsubs.push(onSnapshot(collection(db, COL.AUDIT), (snap) => {
        if (!snap.empty) {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          data.sort((a, b) => {
            const aTs = getComparableTimestamp(a.timestamp);
            const bTs = getComparableTimestamp(b.timestamp);
            return bTs.localeCompare(aTs);
          });
          setAuditLogs(data);
        }
      }, err => console.warn('Firestore audit fallback:', err.message)));

      // 5. Listen BK Notes
      unsubs.push(onSnapshot(collection(db, COL.BK_NOTES), (snap) => {
        if (!snap.empty) {
          const result = {};
          snap.docs.forEach(d => { result[d.id] = d.data(); });
          setBkNotes(result);
        }
      }, err => console.warn('bkNotes fallback:', err.message)));

      unsubs.push(onSnapshot(collection(db, COL.ROOMS), (snap) => {
        if (!snap.empty) setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name)));
      }, err => console.warn('Firestore rooms fallback:', err.message)));

      unsubs.push(onSnapshot(collection(db, COL.LEAVE_REQUESTS), (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => {
          const aTs = a.submittedAt || a.updatedAt || a.createdAt || '';
          const bTs = b.submittedAt || b.updatedAt || b.createdAt || '';
          return String(bTs).localeCompare(String(aTs));
        });
        setLeaveRequests(data);
      }, err => console.warn('Firestore leave requests fallback:', err.message)));
    } catch (e) {
      console.warn('Firestore setup error (running with rich local state):', e);
    }

    return () => unsubs.forEach(u => u && u());
  }, [currentRole, currentUser]);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const getMemberById = useCallback((id) => members.find(m => m.id === id), [members]);
  const getPersonnelById = useCallback((id) => personnel.find(item => item.id === id), [personnel]);
  const getParticipantById = useCallback((id) => getMemberById(id) || getPersonnelById(id), [getMemberById, getPersonnelById]);
  const getMemberByQR = useCallback((token) => {
    const cleanToken = String(token || '').trim();
    const memberId = cleanToken.startsWith('MEMBER:') ? cleanToken.slice('MEMBER:'.length) : cleanToken;
    return [...members, ...personnel].find(item => item.qrToken === cleanToken || item.id === memberId);
  }, [members, personnel]);
  const getActivityById = useCallback((id) => activities.find(a => a.id === id), [activities]);
  const getActivityByQR = useCallback((token) => activities.find(a => a.qrToken === token || a.id === token), [activities]);

  const isAdmin = currentRole === 'SECRETARIAT_ADMIN';
  const isBK = currentRole === 'PETUGAS_BK';
  const canManageMembers = isAdmin || isBK;

  const addRoom = async ({ name, description = '' }) => {
    if (!isAdmin) return { success: false, message: 'Hanya Admin Sekretariat yang dapat mengelola ruangan.' };
    if (!name?.trim()) return { success: false, message: 'Nama ruangan wajib diisi.' };
    const room = { id: `ROOM-${Date.now()}`, name: name.trim(), description: description.trim(), active: true };
    setRooms(previous => [...previous, room]);
    try { await setDoc(doc(db, COL.ROOMS, room.id), { ...room, createdAt: serverTimestamp() }); } catch (e) {}
    await logAudit({ action: 'ADD_ROOM', details: `Menambah master ruangan: ${room.name}` });
    return { success: true, room };
  };

  const updateRoom = async (roomId, data) => {
    if (!isAdmin) return { success: false, message: 'Hanya Admin Sekretariat yang dapat mengelola ruangan.' };
    setRooms(previous => previous.map(room => room.id === roomId ? { ...room, ...data } : room));
    try { await updateDoc(doc(db, COL.ROOMS, roomId), { ...data, updatedAt: serverTimestamp() }); } catch (e) {}
    return { success: true };
  };

  const deleteRoom = async (roomId) => {
    if (!isAdmin) return { success: false, message: 'Hanya Admin Sekretariat yang dapat mengelola ruangan.' };
    if (activities.some(activity => activity.roomId === roomId)) return { success: false, message: 'Ruangan masih digunakan oleh agenda dan tidak dapat dihapus.' };
    setRooms(previous => previous.filter(room => room.id !== roomId));
    try { await deleteDoc(doc(db, COL.ROOMS, roomId)); } catch (e) {}
    return { success: true };
  };

  const updateScoreSettings = async (nextSettings) => {
    if (!isAdmin) return { success: false, message: 'Hanya Admin Utama yang dapat mengatur nilai.' };
    const normalized = Object.fromEntries(Object.entries(nextSettings).map(([key, value]) => [key, Math.max(0, Math.min(key === 'heavyLateMinutes' ? 480 : 100, Number(value) || 0))]));
    setScoreSettings(normalized);
    await logAudit({ action: 'UPDATE_SCORE_SETTINGS', details: `Mengubah ambang nilai disiplin: ${JSON.stringify(normalized)}` });
    return { success: true };
  };

  const saveReportSigner = async (signer) => {
    if (!isAdmin) return { success: false, message: 'Hanya Admin Sekretariat yang dapat mengelola penandatangan.' };
    if (!signer.name?.trim() || !signer.position?.trim()) return { success: false, message: 'Nama dan jabatan penandatangan wajib diisi.' };
    const normalized = { ...signer, id: signer.id || `SIGNER-${Date.now()}`, name: signer.name.trim(), position: signer.position.trim(), active: signer.active !== false };
    setReportSigners(previous => previous.some(item => item.id === normalized.id) ? previous.map(item => item.id === normalized.id ? normalized : item) : [...previous, normalized]);
    try { await setDoc(doc(db, COL.SIGNERS, normalized.id), { ...normalized, updatedAt: serverTimestamp() }, { merge: true }); } catch (e) { console.warn('Signer sync warning:', e); }
    await logAudit({ action: 'UPDATE_REPORT_SIGNER', details: `Menyimpan penandatangan ${normalized.name} (${normalized.position})` });
    return { success: true, signer: normalized };
  };

  const deleteReportSigner = async (signerId) => {
    if (!isAdmin) return { success: false, message: 'Hanya Admin Sekretariat yang dapat mengelola penandatangan.' };
    setReportSigners(previous => previous.filter(item => item.id !== signerId));
    try { await deleteDoc(doc(db, COL.SIGNERS, signerId)); } catch (e) { console.warn('Signer delete warning:', e); }
    await logAudit({ action: 'DELETE_REPORT_SIGNER', details: `Menonaktifkan penandatangan ${signerId}` });
    return { success: true };
  };

  // ─── Audit Trail ─────────────────────────────────────────────────────────
  const logAudit = useCallback(async ({ action, details, method, deviceInfo = null }) => {
    try {
      const newAudit = {
        id: `AUD-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userRole: currentRole,
        userName: currentUser?.name || 'Petugas Sistem',
        action,
        details,
        method: method || 'SYSTEM',
        deviceId: deviceInfo?.deviceId || null,
        deviceType: deviceInfo?.deviceType || null,
        deviceOS: deviceInfo?.os || null,
        deviceBrowser: deviceInfo?.browser || null,
        accessAt: deviceInfo?.recordedAt || new Date().toISOString(),
      };
      setAuditLogs(prev => [newAudit, ...prev]);

      await safeDbWrite(
        () => addDoc(collection(db, COL.AUDIT), {
          ...newAudit,
          timestamp: serverTimestamp(),
        }),
        5000,
        'Koneksi ke server gagal saat menulis log audit.'
      );
    } catch (e) { /* fallback offline */ }
  }, [currentRole, currentUser]);

  // ─── Raport Score Khusus Anggota DPRD ──────────────────────────────────────
  const getMemberRaport = useCallback((memberId, categoryFilter = 'ALL', maxMonth = null, activityFilter = 'ALL', yearFilter = 'ALL') => {
    const member = getMemberById(memberId);
    const isParipurna = category => /paripurna/i.test(String(category || ''));
    const matchesMemberAKD = category => memberHasAKD(member, category);
    const belongsToSelectedAKD = categoryFilter === 'ALL' || isParipurna(categoryFilter) || matchesMemberAKD(categoryFilter);
    const noData = () => ({
      percentage: null,
      categoryInfo: {
        key: 'NO_DATA',
        label: 'Belum Ada Data',
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
        pillBg: 'bg-slate-400',
        textColor: 'text-slate-500',
        statusText: 'Belum terdapat agenda wajib yang dapat dihitung.',
        recommendation: 'Belum ada agenda wajib hadir yang relevan untuk periode ini.'
      },
      discipline: { grade: '-', label: 'Belum Ada Data' },
      totalMandatory: 0,
      attendedCount: 0,
      breakdown: { hadir: 0, tepatWaktu: 0, terlambat: 0, terlambatBerat: 0, dinas: 0, izin: 0, sakit: 0, alpa: 0 }
    });
    if (!belongsToSelectedAKD) {
      return noData();
    }
    // Pastikan hanya menghitung log dengan participantType !== 'EXTERNAL' dan memberId match
    const memberLogs = logs.filter(l => (l.memberId || l.participantId) === memberId && l.participantType !== 'EXTERNAL' && l.participantCategory !== 'PERSONEL SEKRETARIAT');
    
    // Kumpulkan ID aktivitas dari log absensi yang sudah ada untuk member ini
    // (backward compatible: agar absensi yang sudah dilakukan tetap terhitung meski anggota
    //  belum terdaftar di participantMemberIds saat itu)
    const loggedActivityIds = new Set(memberLogs.map(l => l.activityId || l.agendaId).filter(Boolean));

    let relevantActivities = activities.filter(activity => {
      const isInParticipantList = Array.isArray(activity.participantMemberIds) && activity.participantMemberIds.includes(memberId);
      const hasAttendanceLog = loggedActivityIds.has(activity.id);
      const activityLog = memberLogs.find(log => (log.activityId || log.agendaId) === activity.id);
      const isMandatoryParticipant = isInParticipantList &&
        (activity.participantStatuses?.[memberId] || 'WAJIB_HADIR') === 'WAJIB_HADIR';
      const isCountableLog = hasAttendanceLog &&
        activityLog?.includedInRaport !== false &&
        (!activityLog?.participantStatus || activityLog.participantStatus === 'WAJIB_HADIR');
      
      // Raport keseluruhan mengikuti daftar wajib agenda atau log absensi valid.
      // Filter AKD di bawah tetap membatasi hasil sesuai kategori AKD.
      if (!isMandatoryParticipant && !isCountableLog) return false;
      
      // Jika terdaftar di peserta, cek status WAJIB_HADIR
      if (isInParticipantList && activity.participantStatuses?.[memberId] && activity.participantStatuses[memberId] !== 'WAJIB_HADIR') return false;
      
      // Jika hanya via log absensi (tidak di daftar peserta), tetap masukkan ke penilaian
      // kecuali log-nya berstatus 'UNDANGAN' atau 'OPSIONAL'
      if (!isInParticipantList && hasAttendanceLog) {
        const log = activityLog;
        if (log?.participantStatus && log.participantStatus !== 'WAJIB_HADIR') return false;
        // Jika log.includedInRaport === false secara eksplisit, skip
        if (log?.includedInRaport === false) return false;
      }
      
      // Filter kategori AKD / Paripurna / ALL
      if (categoryFilter === 'ALL') return true;

      // Cek apakah agenda cocok dengan kategori AKD yang dipilih (via category, akdOrganizer, akd, organizer, title)
      if (matchActivityToAKD(activity, categoryFilter)) return true;

      // Jika kategori filter adalah Paripurna, cek juga jika judul mengandung kata paripurna
      if (isParipurna(categoryFilter) && (isParipurna(activity.category) || isParipurna(activity.title))) return true;

      // Jika agenda tidak memiliki penanda AKD eksplisit (misal agenda rapat komisi biasa tanpa teks spesifik),
      // dan anggota memiliki AKD yang sedang difilter, cocokkan bila anggota menjadi peserta wajib di agenda tersebut
      const actAKDKey = getActivityAKDKey(activity);
      if (!actAKDKey && member && (categoryFilter === member.komisi || matchAKDCategory(member.komisi, categoryFilter))) {
        return true;
      }

      return false;
    });

    if (activityFilter !== 'ALL') relevantActivities = relevantActivities.filter(activity => activity.id === activityFilter);
    if (yearFilter !== 'ALL') relevantActivities = relevantActivities.filter(activity => String(activity.date || '').slice(0, 4) === String(yearFilter));

    if (maxMonth !== null && maxMonth !== undefined && maxMonth !== 'ALL') {
      const monthNum = parseInt(maxMonth, 10);
      relevantActivities = relevantActivities.filter(a => {
        if (!a.date) return true;
        const actMonth = new Date(a.date).getMonth() + 1;
        return actMonth <= monthNum;
      });
    }

    if (relevantActivities.length === 0) return noData();

    const total = relevantActivities.length;
    let score = 0, hadir = 0, tepatWaktu = 0, terlambat = 0, terlambatBerat = 0, izin = 0, sakit = 0, dinas = 0, alpa = 0;
    
    relevantActivities.forEach(act => {
      const log = memberLogs.find(l => (l.activityId || l.agendaId) === act.id);
      const st = normalizeAttendanceStatus(log?.status, log);
      if (!log || st === 'Alpha') {
        alpa++;
      } else if (st === 'Hadir') {
        score += 1;
        hadir++;
        tepatWaktu++;
      } else if (st === 'Terlambat') {
        const rawStatus = String(log?.status || '').toLowerCase();
        const isHeavyLate = rawStatus.includes('terlambat berat') || /terlambat\s+(lebih dari|di atas|>=?)\s*\d+/.test(rawStatus);
        score += isHeavyLate ? 0.5 : 0.8;
        hadir++;
        if (isHeavyLate) terlambatBerat++;
        else terlambat++;
      } else if (st === 'Dinas Luar') {
        score += 1;
        dinas++;
      } else if (st === 'Izin') {
        score += 0.75;
        izin++;
      } else if (st === 'Sakit') {
        score += 0.75;
        sakit++;
      } else {
        alpa++;
      }
    });

    const percentage = Math.min(100, Math.round((score / total) * 100));
    return {
      percentage,
      categoryInfo: getRaportCategory(percentage),
      discipline: getDisciplineGrade(percentage, scoreSettings),
      totalMandatory: relevantActivities.length,
      attendedCount: Math.round(score * 10) / 10,
      breakdown: { hadir, tepatWaktu, terlambat, terlambatBerat, dinas, izin, sakit, alpa }
    };
  }, [logs, activities, scoreSettings, getMemberById]);

  const getMemberAKDRaports = useCallback((memberId, maxMonth = null, activityFilter = 'ALL', yearFilter = 'ALL') => {
    const member = getMemberById(memberId);
    if (!member) return [];
    const akdCategories = [...getMemberAKDs(member), 'Rapat Paripurna']
      .filter((cat, idx, self) => self.findIndex(v => matchAKDCategory(v, cat)) === idx);
    return akdCategories.map(akd => ({
      akd,
      raport: getMemberRaport(memberId, akd, maxMonth, activityFilter, yearFilter)
    }));
  }, [getMemberById, getMemberRaport]);

  // ─── Record Attendance Internal (Anggota DPRD) dengan Validasi Multi-Faktor ──
  const recordAttendance = async ({
    activityId,
    memberId,
    status = null, // jika null, auto-calculate dari waktu agenda
    method = 'QR_AGENDA',
    operatorName = null,
    lat = null,
    lng = null,
    distanceMeters = 0,
    note = '',
    sptNumber = null,
    sptDate = null,
    sptFile = null,
    ignoreDeviceLock = false,
    ignoreDuplicateCheck = false,
    invitationToken = null,
    documentationPhotoRef = null
  }) => {
    try {
      if (method === 'MANUAL_OVERRIDE' && !['SECRETARIAT_ADMIN', 'PETUGAS_BK', 'PETUGAS_SCAN'].includes(currentRole)) {
        return { success: false, message: 'Input Manual hanya dapat dilakukan Admin Sekretariat atau Petugas.' };
      }
      const member = getParticipantById(memberId);
      const activity = activities.find(a => a.id === activityId);
      const previousLog = logs.find(l => l.activityId === activityId && l.memberId === memberId);
      if (!member) return { success: false, message: 'Data peserta internal tidak ditemukan.' };
      if (!activity) return { success: false, message: 'Agenda Kegiatan tidak ditemukan.' };
      if (member.statusActive === false) return { success: false, message: 'Anggota berstatus tidak aktif dan tidak dapat melakukan absensi.' };
      const activityValidation = validateAttendanceActivity(activity);
      if (!activityValidation.allowed) return { success: false, message: activityValidation.message };
      if (activity.reportLocked && method !== 'MANUAL_OVERRIDE') {
        return { success: false, message: 'Periode laporan sudah dikunci. Koreksi hanya dapat dilakukan melalui Absensi Manual dengan alasan resmi.' };
      }
      if (activity.reportLocked && method === 'MANUAL_OVERRIDE' && !String(note || '').trim()) {
        return { success: false, message: 'Alasan koreksi wajib diisi karena periode laporan sudah dikunci.' };
      }
      const participantStatus = activity.participantStatuses?.[memberId] || 'WAJIB_HADIR';
      if (!['WAJIB_HADIR', 'UNDANGAN', 'OPSIONAL'].includes(participantStatus)) {
        return { success: false, message: 'Status peserta pada agenda tidak valid. Perbarui data peserta terlebih dahulu.' };
      }
      if (method === 'GPS_ONLINE') {
        if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
          return { success: false, message: 'Absensi GPS ditolak karena data lokasi perangkat tidak valid.' };
        }
        if (!Number.isFinite(Number(distanceMeters)) || Number(distanceMeters) > Number(activity.radiusMeters || 150)) {
          return { success: false, message: 'Di luar area absensi.' };
        }
      }
      if (Array.isArray(activity.attendanceMethods) && activity.attendanceMethods.length > 0) {
        const methodKey = method === 'QR_SCAN' ? 'QR_AGENDA' : method;
        if (!activity.attendanceMethods.includes(methodKey) && method !== 'MANUAL_OVERRIDE') return { success: false, message: 'Metode absensi ini tidak diaktifkan untuk agenda.' };
      }

      if (invitationToken) {
        const [activityToken, invitedMemberId] = String(invitationToken).split(':');
        if (activityToken !== activity.qrToken) {
          return { success: false, message: 'QR undangan tidak valid untuk kegiatan ini.' };
        }
        if (invitedMemberId && invitedMemberId !== memberId) {
          return { success: false, message: 'QR undangan hanya dapat digunakan oleh peserta yang terdaftar.' };
        }
      }
      if (Array.isArray(activity.participantMemberIds) && !activity.participantMemberIds.includes(memberId)) {
        return { success: false, message: 'Anggota tidak terdaftar sebagai peserta kegiatan ini.' };
      }

      // Validasi 1 Member Hanya Bisa 1x Absen per Agenda (Cegah Duplikat Absen Mandiri/Scan)
      if (!ignoreDuplicateCheck) {
        const existingLog = logs.find(l => l.activityId === activityId && l.memberId === memberId);
        if (existingLog) {
          return {
            success: false,
            message: existingLog.checkOutAt
              ? `${member.name} sudah menyelesaikan check-in dan check-out pada agenda ini.`
              : `${member.name} sudah check-in pada agenda ini. Lakukan check-out untuk mengakhiri kehadiran.`
          };
        }
      }

      // Validasi 1 Perangkat 1x Absensi (Anti-Titip Absen)
      const deviceInfo = getDeviceFingerprint();
      const deviceCheck = !ignoreDeviceLock && method !== 'MANUAL_OVERRIDE'
        ? validateDeviceSingleAttendance(activityId, memberId, logs)
        : { allowed: true, anomaly: false };
      if (!deviceCheck.allowed) {
        return { success: false, message: deviceCheck.message };
      }
      const deviceWarning = deviceCheck.anomaly ? deviceCheck.message : null;

      // Validasi Waktu Otomatis (Belum Dimulai / Dalam Toleransi / Terlambat)
      let calculatedStatus = status;
      let diffNote = '';
      if (!calculatedStatus || method === 'QR_AGENDA' || method === 'QR_WEBCAM' || method === 'GPS_ONLINE' || method === 'MANUAL_OVERRIDE') {
        const timeCalc = calculateAttendanceStatus(activity, new Date(), scoreSettings);
        if (timeCalc.isNotStarted && method !== 'MANUAL_OVERRIDE') {
          return {
            success: false,
            message: `Absensi Gagal: ${timeCalc.message}`
          };
        }
        if (timeCalc.isExpired && method !== 'MANUAL_OVERRIDE') {
          return {
            success: false,
            message: `Absensi Gagal: Agenda sudah berakhir pada pukul ${activity.endTime || '16:00'} WIB.`
          };
        }
        calculatedStatus = calculatedStatus || timeCalc.status;
        diffNote = timeCalc.message;
      }

      const isPersonnel = member.type === 'PERSONNEL' || String(memberId).startsWith('PERSONNEL-') || activity.participantTypes?.[memberId] === 'PERSONNEL';
      const checkInAt = new Date().toISOString();
      const newLog = {
        id: getAttendanceDocumentId(activityId, memberId),
        attendanceId: getAttendanceDocumentId(activityId, memberId),
        activityId,
        agendaId: activityId,
        roomId: activity.roomId || null,
        roomName: activity.roomName || activity.locationName || '',
        participantType: 'INTERNAL',
        attendanceType: 'ANGGOTA',
        participantCategory: isPersonnel ? 'PERSONEL SEKRETARIAT' : 'ANGGOTA DPRD',
        participantStatus,
        includedInRaport: !isPersonnel && participantStatus === 'WAJIB_HADIR',
        memberId,
        participantId: memberId,
        memberName: member.name,
        memberFraksi: member.fraksi || '',
        memberKomisi: member.komisi || '',
        memberAKD: member.akdMemberships || [member.komisi || ''],
        timestamp: checkInAt,
        checkInAt,
        checkOutAt: null,
        durationMinutes: 0,
        checkoutStatus: 'Masih Mengikuti Kegiatan',
        status: normalizeAttendanceStatus(calculatedStatus, { method }),
        method,
        operatorName: operatorName || currentUser?.name || 'Mandiri (Mobile Scan)',
        lat,
        lng,
        distanceMeters,
        deviceId: deviceInfo.deviceId,
        deviceType: deviceInfo.deviceType,
        deviceOS: deviceInfo.os,
        deviceBrowser: deviceInfo.browser,
        documentationPhotoRef: documentationPhotoRef || null,
        checkInPhotoId: documentationPhotoRef || null,
        documentationPhotoAt: documentationPhotoRef ? checkInAt : null,
        documentationPhotoType: documentationPhotoRef ? 'CHECK_IN' : null,
        sptNumber,
        sptDate,
        sptFile,
        note: note || diffNote || `Absensi ${calculatedStatus}`
      };
      if (deviceWarning) {
        newLog.deviceAnomaly = true;
        newLog.deviceAnomalyMessage = deviceWarning;
      }

      const remoteWriteResult = await safeDbWrite(
        async () => {
          setSyncStatus('syncing');
          await runTransaction(db, async (transaction) => {
            const logRef = doc(db, COL.LOGS, newLog.id);
            const existingSnapshot = await transaction.get(logRef);
            if (existingSnapshot.exists()) throw new Error('DUPLICATE_ATTENDANCE');
            transaction.set(logRef, { ...newLog, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          });
          await waitForPendingWrites(db);
        },
        5000,
        'Absensi gagal disimpan ke Firestore. Periksa koneksi dan hak akses akun.'
      );
      if (!remoteWriteResult.ok) {
        if (remoteWriteResult.duplicate) {
          return { success: false, message: 'Peserta ini sudah memiliki presensi pada agenda tersebut.' };
        }
        enqueueAttendanceWrite('create', newLog.id, newLog);
        setSyncStatus('pending');
        const localLog = { ...newLog, syncPending: true };
        setLogs(prev => [localLog, ...prev.filter(l => !(l.activityId === activityId && l.memberId === memberId))]);
        void logAudit({
          action: 'ATTENDANCE_RECORDED_OFFLINE',
          details: `Presensi ${member.name} pada agenda "${activity.title}" tersimpan lokal dan menunggu sinkronisasi.`,
          method,
          deviceInfo,
        });
        return { success: true, log: localLog, warning: `Absensi tersimpan lokal dan menunggu sinkronisasi. ${remoteWriteResult.message}` };
      }
      setSyncStatus('saved');

      setLogs(prev => {
        const nextLogs = [newLog, ...prev.filter(l => !(l.activityId === activityId && l.memberId === memberId))];
        try {
          localStorage.setItem('siraport_logs', JSON.stringify(nextLogs));
          const bc = new BroadcastChannel('siraport_sync_channel');
          bc.postMessage({ type: 'LOGS_UPDATED', logs: nextLogs });
          bc.close();
        } catch (e) {}
        return nextLogs;
      });

      void logAudit({
        action: 'ATTENDANCE_RECORDED',
        details: `${previousLog ? `Perubahan status ${previousLog.status || 'Belum Hadir'} menjadi ${calculatedStatus}` : `Presensi baru [${calculatedStatus}]`} untuk ${member.name} pada agenda "${activity.title}" via ${method}${note ? ` — Alasan: ${note}` : ''}. Sebelum: ${previousLog?.status || 'Belum ada'}; Sesudah: ${calculatedStatus}${deviceWarning ? `; PERINGATAN PERANGKAT: ${deviceWarning}` : ''}`,
        method,
        deviceInfo,
      });

      return {
        success: true,
        log: newLog,
        warning: deviceWarning,
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const checkoutAttendance = async ({
    activityId,
    memberId = null,
    guestId = null,
    participantType = 'INTERNAL',
    agency = '',
    invitedName = '',
    method = 'QR_AGENDA',
    operatorName = null,
    note = '',
    lat = null,
    lng = null,
    distanceMeters = null,
    documentationPhotoRef = null
  }) => {
    try {
      const activity = activities.find(item => item.id === activityId);
      if (!activity) return { success: false, message: 'Agenda tidak ditemukan.' };
      const activityValidation = validateAttendanceActivity(activity);
      if (!activityValidation.allowed) return { success: false, message: activityValidation.message };
      if (activity.reportLocked && method !== 'MANUAL_OVERRIDE') {
        return { success: false, message: 'Periode laporan sudah dikunci. Check-out koreksi harus dilakukan secara manual dengan alasan resmi.' };
      }

      let existingLog = null;
      if (participantType === 'EXTERNAL') {
        existingLog = logs.find(log =>
          log.activityId === activityId &&
          log.participantType === 'EXTERNAL' &&
          (
            (guestId && log.guestId === guestId) ||
            (
              !guestId &&
              String(log.agency || '').trim().toLowerCase() === String(agency || '').trim().toLowerCase() &&
              String(log.invitedName || '').trim().toLowerCase() === String(invitedName || '').trim().toLowerCase()
            )
          )
        );
      } else {
        existingLog = logs.find(log => log.activityId === activityId && log.memberId === memberId && log.participantType !== 'EXTERNAL');
      }

      if (!existingLog) return { success: false, message: 'Check-out tidak dapat dilakukan sebelum Check-in.' };
      if (existingLog.checkOutAt) return { success: false, message: 'Peserta ini sudah melakukan Check-out pada agenda tersebut.' };

      if (method === 'GPS_ONLINE') {
        if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
          return { success: false, message: 'Check-out GPS ditolak karena data lokasi perangkat tidak valid.' };
        }
        if (!Number.isFinite(Number(distanceMeters)) || Number(distanceMeters) > Number(activity.radiusMeters || 150)) {
          return { success: false, message: 'Di luar area absensi.' };
        }
      }

      const attendeeName = existingLog.memberName || existingLog.guestName || existingLog.invitedName || 'Peserta';
      const deviceInfo = getDeviceFingerprint();
      const checkInAt = new Date(existingLog.checkInAt || existingLog.timestamp);
      const checkOutAt = new Date();
      const durationMinutes = Math.max(0, Math.round((checkOutAt - checkInAt) / 60000));
      const [year, month, day] = String(activity.date || '').split('-').map(Number);
      const [endHour, endMinute] = String(activity.endTime || '16:00').split(':').map(Number);
      const endDate = year && month && day ? new Date(year, month - 1, day, endHour, endMinute, 0) : null;
      const checkoutStatus = endDate && checkOutAt < endDate
        ? `Pulang Lebih Awal – ${Math.max(1, Math.round((endDate - checkOutAt) / 60000))} Menit`
        : 'Mengikuti Kegiatan Sampai Selesai';
      const anomalies = getAttendanceAnomalies({
        existingLog,
        checkInAt,
        checkOutAt,
        distanceMeters,
        radiusMeters: activity.radiusMeters
      });
      const updatedLog = {
        ...existingLog,
        attendanceId: existingLog.attendanceId || existingLog.id,
        agendaId: existingLog.agendaId || activityId,
        participantId: existingLog.participantId || existingLog.memberId || existingLog.guestId,
        checkOutAt: checkOutAt.toISOString(),
        durationMinutes,
        checkoutStatus,
        methodCheckout: method,
        checkoutOperatorName: operatorName || currentUser?.name || 'Mandiri',
        checkoutNote: note,
        checkoutPhotoRef: documentationPhotoRef || existingLog.checkoutPhotoRef || existingLog.checkoutPhoto || null,
        checkOutPhotoId: documentationPhotoRef || existingLog.checkOutPhotoId || existingLog.checkoutPhotoRef || existingLog.checkoutPhoto || null,
        checkoutPhotoAt: documentationPhotoRef ? checkOutAt.toISOString() : existingLog.checkoutPhotoAt || null,
        checkoutPhotoType: documentationPhotoRef ? 'CHECK_OUT' : existingLog.checkoutPhotoType || null,
        anomalyFlags: anomalies,
        anomalyDetected: anomalies.length > 0,
        status: existingLog.status || 'On Time',
      };

      const remoteWriteResult = await safeDbWrite(
        async () => {
          setSyncStatus('syncing');
          await updateDoc(doc(db, COL.LOGS, existingLog.id), { ...updatedLog, updatedAt: serverTimestamp() });
          await waitForPendingWrites(db);
        },
        5000,
        'Check-out gagal disimpan ke Firestore. Periksa koneksi dan hak akses akun.'
      );
      if (!remoteWriteResult.ok) {
        enqueueAttendanceWrite('update', existingLog.id, updatedLog);
        setSyncStatus('pending');
        const localLog = { ...updatedLog, syncPending: true };
        setLogs(previous => previous.map(log => log.id === existingLog.id ? localLog : log));
        void logAudit({
          action: 'ATTENDANCE_CHECKOUT_OFFLINE',
          details: `Check-out ${attendeeName} pada agenda "${activity.title}" tersimpan lokal dan menunggu sinkronisasi.`,
          method,
          deviceInfo,
        });
        return { success: true, log: localLog, warning: `Check-out tersimpan lokal dan menunggu sinkronisasi. ${remoteWriteResult.message}` };
      }
      setSyncStatus('saved');
      setLogs(previous => previous.map(log => log.id === existingLog.id ? updatedLog : log));
      void logAudit({ action: 'ATTENDANCE_CHECKOUT', details: `Check-out ${attendeeName} pada agenda ${activity.title}: ${checkoutStatus}, durasi ${durationMinutes} menit. Sebelum: check-in ${existingLog.checkInAt || existingLog.timestamp}, status ${existingLog.status || '-'}; Sesudah: check-out ${updatedLog.checkOutAt}, status ${checkoutStatus}${anomalies.length ? `; ANOMALI: ${anomalies.join(', ')}` : ''}`, method, deviceInfo });
      return { success: true, log: updatedLog };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── Record Attendance Eksternal / OPD / Tamu / Delegasi ───────────────────
  const recordGuestAttendance = async ({
    activityId,
    agency,
    invitedName,
    position = '',
    phone = '',
    participantCategory = 'OPD/INSTANSI',
    guestId = null,
    isRepresented = false,
    representativeName = '',
    representativePosition = '',
    status = 'Hadir',
    note = '',
    operatorName = null,
    invitationToken = null,
    method = 'GUEST_CHECKIN',
    lat = null,
    lng = null,
    distanceMeters = 0,
    ignoreDeviceLock = false,
    documentationPhotoRef = null
  }) => {
    try {
      const activity = activities.find(a => a.id === activityId);
      if (!activity) return { success: false, message: 'Agenda kegiatan tidak ditemukan.' };
      const activityValidation = validateAttendanceActivity(activity);
      if (!activityValidation.allowed) return { success: false, message: activityValidation.message };
      if (!agency) return { success: false, message: 'Nama Instansi / OPD wajib diisi.' };
      if (activity.gpsRequired && method === 'GPS_ONLINE') {
        if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
          return { success: false, message: 'Absensi tamu ditolak karena data lokasi perangkat tidak valid.' };
        }
        if (!Number.isFinite(Number(distanceMeters)) || Number(distanceMeters) > Number(activity.radiusMeters || 150)) {
          return { success: false, message: 'Absensi tamu ditolak karena perangkat berada di luar area agenda.' };
        }
      }

      if (invitationToken) {
        const [activityToken, invitedGuestId] = String(invitationToken).split(':');
        if (activityToken !== activity.qrToken && activityToken !== activity.id) return { success: false, message: 'QR undangan OPD tidak valid untuk kegiatan ini.' };
        if (invitedGuestId && guestId && invitedGuestId !== guestId) return { success: false, message: 'QR undangan tidak sesuai dengan penerima.' };
      }

      const deviceInfo = getDeviceFingerprint();
      const currentGuestId = guestId || getStableGuestId(activityId, agency, invitedName || 'Pejabat Terkait');
      const deviceCheck = ignoreDeviceLock
        ? { allowed: true, anomaly: false }
        : validateDeviceSingleAttendance(activityId, currentGuestId, logs);
      if (!deviceCheck.allowed) {
        return { success: false, message: deviceCheck.message };
      }

      // Validasi 1 Tamu / Instansi Hanya Bisa 1x Check-in dan 1x Check-out per Agenda
      const existingGuestLog = logs.find(l => 
        l.activityId === activityId && 
        l.participantType === 'EXTERNAL' && 
        ((l.guestId && l.guestId === currentGuestId) || (l.agency && l.agency.toLowerCase() === agency.toLowerCase() && l.invitedName?.toLowerCase() === (invitedName || '').toLowerCase()))
      );
      if (existingGuestLog) {
        if (existingGuestLog.checkOutAt) {
          return {
            success: false,
            message: `Absensi Gagal: Tamu/Instansi "${agency}" (${invitedName}) sudah menyelesaikan check-in dan check-out pada agenda ini.`
          };
        }

        return {
          success: false,
          message: `Absensi Gagal: Tamu/Instansi "${agency}" (${invitedName}) sudah check-in pada agenda ini. Lakukan check-out untuk mengakhiri kehadiran.`
        };
      }

      // Validasi Waktu Otomatis untuk Tamu OPD
      const timeCalc = calculateAttendanceStatus(activity, new Date(), scoreSettings);
      if (timeCalc.isNotStarted) {
        return {
          success: false,
          message: `Absensi Tamu Gagal: ${timeCalc.message}`
        };
      }
      if (timeCalc.isExpired) {
        return {
          success: false,
          message: `Absensi Tamu Gagal: Agenda sudah berakhir pada pukul ${activity.endTime || '16:00'} WIB.`
        };
      }

      // Validasi 1 Perangkat 1x Absensi per Agenda

      // Validasi status perwakilan
      const finalStatus = isRepresented
        ? 'Diwakili'
        : status && status !== 'Hadir'
          ? status
          : timeCalc.status;

      const checkInAt = new Date().toISOString();
      const newLog = {
        id: getAttendanceDocumentId(activityId, currentGuestId, 'EXTERNAL'),
        attendanceId: getAttendanceDocumentId(activityId, currentGuestId, 'EXTERNAL'),
        activityId,
        agendaId: activityId,
        roomId: activity.roomId || null,
        roomName: activity.roomName || activity.locationName || '',
        participantType: 'EXTERNAL',
        attendanceType: String(participantCategory).toUpperCase().includes('OPD') ? 'OPD' : 'TAMU',
        participantCategory,
        participantStatus: 'EXTERNAL',
        includedInRaport: false,
        guestId: currentGuestId,
        participantId: currentGuestId,
        invitationToken,
        agency,
        guestAgency: agency,
        invitedName: invitedName || 'Pejabat Terkait',
        position,
        phone,
        guestName: isRepresented && representativeName ? `${representativeName} (Perwakilan ${invitedName})` : (invitedName || agency),
        isRepresented,
        representativeName: isRepresented ? representativeName : null,
        representativePosition: isRepresented ? representativePosition : null,
        timestamp: checkInAt,
        checkInAt,
        checkOutAt: null,
        durationMinutes: 0,
        checkoutStatus: 'Masih Mengikuti Kegiatan',
        status: finalStatus,
        method,
        operatorName: operatorName || currentUser?.name || 'Meja Tamu OPD',
        documentationPhotoRef: documentationPhotoRef || null,
        checkInPhotoId: documentationPhotoRef || null,
        documentationPhotoAt: documentationPhotoRef ? checkInAt : null,
        documentationPhotoType: documentationPhotoRef ? 'CHECK_IN' : null,
        lat,
        lng,
        distanceMeters,
        deviceId: deviceInfo.deviceId,
        deviceType: deviceInfo.deviceType,
        deviceOS: deviceInfo.os,
        deviceBrowser: deviceInfo.browser,
        ...(deviceCheck.anomaly ? { deviceAnomaly: true, deviceAnomalyMessage: deviceCheck.message } : {}),
        note: note || (isRepresented ? `Dihadiri oleh perwakilan: ${representativeName} (${representativePosition})` : 'Hadir langsung')
      };

      const remoteWriteResult = await safeDbWrite(
        async () => {
          setSyncStatus('syncing');
          await runTransaction(db, async (transaction) => {
            const logRef = doc(db, COL.LOGS, newLog.id);
            const existingSnapshot = await transaction.get(logRef);
            if (existingSnapshot.exists()) throw new Error('DUPLICATE_ATTENDANCE');
            transaction.set(logRef, { ...newLog, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          });
          await waitForPendingWrites(db);
        },
        5000,
        'Absensi tamu gagal disimpan ke Firestore. Periksa koneksi dan hak akses akun.'
      );
      if (!remoteWriteResult.ok) {
        if (remoteWriteResult.duplicate) {
          return { success: false, message: 'Tamu/OPD ini sudah memiliki presensi pada agenda tersebut.' };
        }
        enqueueAttendanceWrite('create', newLog.id, newLog);
        setSyncStatus('pending');
        const localLog = { ...newLog, syncPending: true };
        setLogs(prev => [localLog, ...prev.filter(l => !(l.activityId === activityId && l.guestId === currentGuestId))]);
        void logAudit({
          action: 'GUEST_CHECKIN_OFFLINE',
          details: `Check-in tamu ${agency} pada agenda "${activity.title}" tersimpan lokal dan menunggu sinkronisasi.`,
          method: 'GUEST_CHECKIN',
          deviceInfo,
        });
        return { success: true, log: localLog, warning: `Absensi tamu tersimpan lokal dan menunggu sinkronisasi. ${remoteWriteResult.message}` };
      }
      setSyncStatus('saved');

      setLogs(prev => {
        const nextLogs = [newLog, ...prev.filter(l => !(l.activityId === activityId && l.guestId === currentGuestId))];
        try {
          localStorage.setItem('siraport_logs', JSON.stringify(nextLogs));
          const bc = new BroadcastChannel('siraport_sync_channel');
          bc.postMessage({ type: 'LOGS_UPDATED', logs: nextLogs });
          bc.close();
        } catch (e) {}
        return nextLogs;
      });

      void logAudit({
        action: 'GUEST_CHECKIN',
        details: `Check-in Tamu Eksternal [${agency}] - ${isRepresented ? `Diwakili: ${representativeName}` : invitedName} pada "${activity.title}"${deviceCheck.anomaly ? `; PERINGATAN PERANGKAT: ${deviceCheck.message}` : ''}`,
        method: 'GUEST_CHECKIN',
        deviceInfo,
      });

      return {
        success: true,
        log: newLog,
        warning: deviceCheck.anomaly ? deviceCheck.message : null,
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const recordManualAttendance = async ({ activityId, memberId, status, note, operatorName, sptNumber, sptDate, sptFile }) => {
    if (!String(note || '').trim()) return { success: false, message: 'Alasan Absensi Manual wajib diisi dan dicatat di Audit Trail.' };
    return recordAttendance({
      activityId,
      memberId,
      status,
      method: 'MANUAL_OVERRIDE',
      operatorName,
      note,
      sptNumber,
      sptDate,
      sptFile,
      ignoreDeviceLock: true,
      ignoreDuplicateCheck: false
    });
  };

  const requestLeave = async ({ activityId, memberId, type = 'IZIN', reason = '', note = '' }) => {
    try {
      const activity = activities.find(a => a.id === activityId);
      const member = getMemberById(memberId);
      if (!activity) return { success: false, message: 'Agenda kegiatan tidak ditemukan.' };
      if (!member) return { success: false, message: 'Data anggota tidak ditemukan.' };
      if (!reason?.trim()) return { success: false, message: 'Alasan izin wajib diisi.' };

      const existingPending = leaveRequests.find(req =>
        req.activityId === activityId &&
        req.memberId === memberId &&
        req.status === 'PENDING'
      );
      if (existingPending) {
        return { success: false, message: 'Pengajuan izin untuk agenda ini masih menunggu verifikasi.' };
      }

      const leaveRequest = {
        id: `LEAVE-${Date.now()}`,
        activityId,
        memberId,
        memberName: member.name,
        memberFraksi: member.fraksi || '',
        memberKomisi: member.komisi || '',
        type: type === 'SAKIT' ? 'SAKIT' : 'IZIN',
        reason: reason.trim(),
        note: note?.trim() || '',
        status: 'PENDING',
        submittedAt: new Date().toISOString(),
        reviewedBy: null,
        reviewedAt: null,
        adminNote: '',
      };

      setLeaveRequests(prev => [leaveRequest, ...prev]);
      try {
        await setDoc(doc(db, COL.LEAVE_REQUESTS, leaveRequest.id), {
          ...leaveRequest,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) { console.warn('Firestore leave request write warning:', e); }

      await logAudit({
        action: 'LEAVE_REQUESTED',
        details: `${member.name} mengajukan izin ${leaveRequest.type === 'SAKIT' ? 'sakit' : 'digital'} untuk agenda "${activity.title}"`,
        method: 'PORTAL_MEMBER'
      });

      return { success: true, request: leaveRequest };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const reviewLeaveRequest = async (leaveRequestId, decision, adminNote = '') => {
    try {
      if (!['APPROVED', 'REJECTED'].includes(decision)) {
        return { success: false, message: 'Keputusan review tidak valid.' };
      }

      const target = leaveRequests.find(req => req.id === leaveRequestId);
      if (!target) return { success: false, message: 'Pengajuan izin tidak ditemukan.' };

      const activity = activities.find(a => a.id === target.activityId);
      const member = getMemberById(target.memberId);
      const approvedStatus = target.type === 'SAKIT' ? 'Sakit' : 'Izin';

      const updatedRequest = {
        ...target,
        status: decision,
        reviewedBy: currentUser?.name || 'Admin',
        reviewedAt: new Date().toISOString(),
        adminNote: adminNote?.trim() || '',
      };

      setLeaveRequests(prev => prev.map(req => req.id === leaveRequestId ? updatedRequest : req));
      try {
        await updateDoc(doc(db, COL.LEAVE_REQUESTS, leaveRequestId), {
          ...updatedRequest,
          updatedAt: serverTimestamp(),
        });
      } catch (e) { console.warn('Firestore leave review warning:', e); }

      if (decision === 'APPROVED') {
        const existingLog = logs.find(log => log.activityId === target.activityId && log.memberId === target.memberId && log.participantType !== 'EXTERNAL');
        if (!existingLog) {
          const attendanceResult = await recordAttendance({
            activityId: target.activityId,
            memberId: target.memberId,
            status: approvedStatus,
            method: 'MANUAL_OVERRIDE',
            operatorName: currentUser?.name || 'Admin BK',
            note: `Pengajuan izin digital ${target.type === 'SAKIT' ? 'sakit' : 'izin'} disetujui${target.reason ? `: ${target.reason}` : ''}`,
            ignoreDeviceLock: true,
            ignoreDuplicateCheck: false,
          });

          if (!attendanceResult.success) {
            return { success: false, message: attendanceResult.message };
          }
        } else {
          const updatedLog = {
            ...existingLog,
            status: approvedStatus,
            note: `${existingLog.note || ''}${existingLog.note ? ' | ' : ''}Pengajuan izin digital disetujui${target.reason ? `: ${target.reason}` : ''}`,
            updatedAt: new Date().toISOString(),
          };
          setLogs(prev => prev.map(log => log.id === existingLog.id ? updatedLog : log));
        }
      }

      await logAudit({
        action: decision === 'APPROVED' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
        details: `${member?.name || target.memberName} ${decision === 'APPROVED' ? 'disetujui' : 'ditolak'} untuk agenda "${activity?.title || target.activityId}"${adminNote ? ` — ${adminNote}` : ''}`,
        method: decision === 'APPROVED' ? 'ADMIN_APPROVAL' : 'ADMIN_REJECTION'
      });

      return { success: true, request: updatedRequest };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── LPJ Generator Helper ─────────────────────────────────────────────────
  const getLPJData = useCallback((activityId) => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return null;

    const actLogs = logs.filter(l => l.activityId === activityId);
    const internalLogs = actLogs.filter(l => l.participantType !== 'EXTERNAL');
    const externalLogs = actLogs.filter(l => l.participantType === 'EXTERNAL');

    // Rekap Anggota Dewan
    const participantIds = Array.isArray(activity.participantMemberIds) ? activity.participantMemberIds : [];
    const participantMembers = members.filter(member => participantIds.includes(member.id) && (!activity.participantStatuses || activity.participantStatuses[member.id] === 'WAJIB_HADIR'));
    const participantLogs = internalLogs.filter(log => participantMembers.some(member => member.id === log.memberId));
    const internalStats = {
      totalMandatory: participantMembers.length,
      hadir: participantLogs.filter(l => {
        const st = String(l.status || '').toLowerCase();
        return st === 'hadir' || st === 'hadir tepat waktu' || st.includes('on time');
      }).length,
      terlambat: participantLogs.filter(l => {
        const st = String(l.status || '').toLowerCase();
        return st.includes('terlambat');
      }).length,
      dinasLuar: participantLogs.filter(l => l.status === 'Dinas Luar' || l.status === 'Dinas').length,
      izin: participantLogs.filter(l => l.status === 'Izin').length,
      sakit: participantLogs.filter(l => l.status === 'Sakit').length,
      alpha: Math.max(0, participantMembers.length - participantLogs.length)
    };

    // Rekap Tamu Eksternal / OPD
    const invitedTotal = activity.invitedGuests?.length || externalLogs.length;
    const externalStats = {
      totalInvited: invitedTotal,
      hadirLangsung: externalLogs.filter(l => {
        const st = String(l.status || '').toLowerCase();
        return !l.isRepresented && (st === 'hadir' || st.includes('on time'));
      }).length,
      diwakili: externalLogs.filter(l => l.isRepresented || l.status === 'Diwakili').length,
      belumHadir: Math.max(0, invitedTotal - externalLogs.length)
    };

    return {
      activity,
      internalLogs,
      externalLogs,
      internalStats,
      externalStats,
      lpjSummary: activity.lpjSummary || { notes: '', documentationPhotos: [], attachments: [] }
    };
  }, [activities, logs, members]);

  // ─── Update LPJ Summary pada Kegiatan ────────────────────────────────────
  const updateLPJSummary = async (activityId, lpjSummary) => {
    try {
      const existingSummary = activities.find(a => a.id === activityId)?.lpjSummary || {};
      const nextSummary = {
        ...existingSummary,
        ...lpjSummary,
      };

      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, lpjSummary: nextSummary } : a));
      try {
        await updateDoc(doc(db, COL.ACTIVITIES, activityId), {
          lpjSummary: nextSummary,
          updatedAt: serverTimestamp()
        });
      } catch (e) { /* fallback */ }
      await logAudit({ action: 'UPDATE_LPJ', details: `Memperbarui notulen dan dokumentasi LPJ kegiatan: ${activityId}` });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── Personnel CRUD ──────────────────────────────────────────────────────
  const addPersonnel = async (personnelData, photoFile = null) => {
    if (!canManageMembers) return { success: false, message: 'Hanya BK dan Admin yang bisa menambahkan personel sekretariat.' };
    try {
      const normalizedName = String(personnelData.name || '').trim().toLowerCase();
      const normalizedNip = String(personnelData.nip || '').trim().toLowerCase();
      const duplicatePersonnel = personnel.some(item => {
        const sameName = normalizedName && String(item.name || '').trim().toLowerCase() === normalizedName;
        const sameNip = normalizedNip && String(item.nip || '').trim().toLowerCase() === normalizedNip;
        return sameName || sameNip;
      });

      if (duplicatePersonnel) {
        return { success: false, message: 'Data personel sudah ada, tidak bisa ditambahkan lagi.' };
      }

      let photoUrl = personnelData.photo || '';
      if (photoFile) {
        photoUrl = await compressImageToBase64(photoFile, 400);
      }

      const generatedId = `PERSONNEL-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const newPersonnel = {
        id: generatedId,
        ...personnelData,
        photo: photoUrl,
        statusActive: personnelData.statusActive !== false,
        type: 'PERSONNEL'
      };

      setPersonnel(prev => [newPersonnel, ...prev]);

      try {
        await setDoc(doc(db, COL.PERSONNEL, generatedId), {
          ...newPersonnel,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (e) { /* fallback offline */ }

      await logAudit({
        action: 'ADD_PERSONNEL',
        details: `Menambah personel sekretariat: ${newPersonnel.name} (${newPersonnel.unit || newPersonnel.jabatan || 'Personel'})`,
      });

      return { success: true, id: generatedId };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const updatePersonnel = async (personnelId, updateData, photoFile = null) => {
    if (!canManageMembers) return { success: false, message: 'Hanya BK dan Admin yang bisa mengubah data personel.' };
    try {
      let photoUrl = updateData.photo;
      if (photoFile) {
        photoUrl = await compressImageToBase64(photoFile, 400);
      }

      const cleanData = { ...updateData, type: 'PERSONNEL' };
      if (photoUrl !== undefined) cleanData.photo = photoUrl;

      setPersonnel(prev => prev.map(item => item.id === personnelId ? { ...item, ...cleanData } : item));

      try {
        await updateDoc(doc(db, COL.PERSONNEL, personnelId), {
          ...cleanData,
          updatedAt: serverTimestamp(),
        });
      } catch (e) { /* fallback */ }

      await logAudit({
        action: 'UPDATE_PERSONNEL',
        details: `Update data personel: ${cleanData.name || personnelId}`,
      });

      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const deletePersonnel = async (personnelId) => {
    if (!canManageMembers) return { success: false, message: 'Hanya BK dan Admin yang bisa menghapus personel.' };
    try {
      const item = getPersonnelById(personnelId);
      setPersonnel(prev => prev.filter(item => item.id !== personnelId));

      try {
        await deleteDoc(doc(db, COL.PERSONNEL, personnelId));
      } catch (e) { /* fallback */ }

      await logAudit({
        action: 'DELETE_PERSONNEL',
        details: `Menghapus personel: ${item?.name || personnelId}`,
      });

      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── Member CRUD ─────────────────────────────────────────────────────────
  const addMember = async (memberData, photoFile = null) => {
    if (!canManageMembers) return { success: false, message: 'Hanya BK dan Admin yang bisa menambahkan anggota.' };
    try {
      const normalizedName = String(memberData.name || '').trim().toLowerCase();
      const normalizedNip = String(memberData.nip || '').trim().toLowerCase();
      const duplicateMember = members.some(item => {
        const sameName = normalizedName && String(item.name || '').trim().toLowerCase() === normalizedName;
        const sameNip = normalizedNip && String(item.nip || '').trim().toLowerCase() === normalizedNip;
        return sameName || sameNip;
      });

      if (duplicateMember) {
        return { success: false, message: 'Data anggota sudah ada, tidak bisa ditambahkan lagi.' };
      }

      let photoUrl = memberData.photo || '';
      if (photoFile) {
        photoUrl = await compressImageToBase64(photoFile, 400);
      }

      const generatedId = `DPRD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const { username, password, ...memberProfileData } = memberData;
      const newMember = {
        id: generatedId,
        ...memberProfileData,
        photo: photoUrl,
        qrToken: `QR-${generatedId}-${(memberData.name || '').replace(/\s+/g, '-').toUpperCase()}`,
        statusActive: true,
      };

      setMembers(prev => [newMember, ...prev]);

      try {
        await setDoc(doc(db, COL.MEMBERS, generatedId), {
          ...newMember,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (e) { /* fallback offline */ }

      let accountId = null;
      if (memberData.username || memberData.password) {
        if (!memberData.username || !memberData.password) {
          return { success: false, message: 'Username dan password login harus diisi bersama.' };
        }
        if (import.meta.env.DEV && import.meta.env.VITE_AUTH_MODE === 'local') {
          return { success: false, message: 'Pembuatan akun anggota memerlukan mode Firestore, bukan mode local testing.' };
        }

        accountId = await createAccount({
          username: memberData.username,
          password: memberData.password,
          fullName: newMember.name,
          role: ACCOUNT_ROLES.MEMBER,
          status: memberData.statusActive === false ? ACCOUNT_STATUS.INACTIVE : ACCOUNT_STATUS.ACTIVE,
          memberId: generatedId,
          department: newMember.fraksi,
          notes: 'Akun dibuat dari Data Anggota DPRD'
        }, currentUser?.accountId);
        setMembers(prev => prev.map(item => item.id === generatedId ? { ...item, accountId } : item));
        await updateDoc(doc(db, COL.MEMBERS, generatedId), { accountId, updatedAt: serverTimestamp() });
      }

      await logAudit({
        action: 'ADD_MEMBER',
        details: `Menambah anggota baru: ${newMember.name} (${newMember.fraksi})`,
      });

      return { success: true, id: generatedId };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const updateMember = async (memberId, updateData, photoFile = null) => {
    if (!canManageMembers) return { success: false, message: 'Hanya BK dan Admin yang bisa mengubah data anggota.' };
    try {
      let photoUrl = updateData.photo;
      if (photoFile) {
        photoUrl = await compressImageToBase64(photoFile, 400);
      }

      const cleanData = { ...updateData };
      const requestedPassword = cleanData.password;
      delete cleanData.password;
      delete cleanData.username;
      if (photoUrl !== undefined) cleanData.photo = photoUrl;

      if (requestedPassword) {
        return { success: false, message: 'Password akun yang sudah ada harus direset melalui Firebase Authentication.' };
      }

      const existingMember = getMemberById(memberId);
      if (existingMember?.accountId) {
        await updateAccount(existingMember.accountId, {
          status: cleanData.statusActive === false ? ACCOUNT_STATUS.INACTIVE : ACCOUNT_STATUS.ACTIVE,
          fullName: cleanData.name,
          memberId,
          department: cleanData.fraksi,
          notes: 'Sinkronisasi dari Data Anggota DPRD'
        }, currentUser?.accountId);
      }

      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, ...cleanData } : m));

      try {
        await updateDoc(doc(db, COL.MEMBERS, memberId), {
          ...cleanData,
          updatedAt: serverTimestamp(),
        });
      } catch (e) { /* fallback */ }

      await logAudit({
        action: 'UPDATE_MEMBER',
        details: `Update data anggota: ${cleanData.name || memberId}`,
      });

      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const deleteMember = async (memberId) => {
    if (!canManageMembers) return { success: false, message: 'Hanya BK dan Admin yang bisa menghapus anggota.' };
    try {
      const member = getMemberById(memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));

      try {
        await deleteDoc(doc(db, COL.MEMBERS, memberId));
      } catch (e) { /* fallback */ }

      await logAudit({
        action: 'DELETE_MEMBER',
        details: `Menghapus anggota: ${member?.name || memberId}`,
      });

      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── Activity CRUD ───────────────────────────────────────────────────────
  const addActivity = async (actData) => {
    try {
      if (actData.roomId || actData.locationName || actData.roomName) {
        const conflict = findRoomConflict(activities, actData);
        if (conflict) {
          return {
            success: false,
            message: `Agenda tidak dapat disimpan. Ruangan sudah digunakan agenda "${conflict.title || conflict.id}" pada ${conflict.date}, pukul ${conflict.startTime || '00:00'}–${conflict.endTime || '23:59'} WIB. Pilih ruangan atau waktu lain.`
          };
        }
      }
      // Gunakan timestamp unik agar ID tidak bentrok dengan ID agenda lama yang memiliki riwayat log
      const uniqueSuffix = Date.now().toString().slice(-4);
      const generatedId = `ACT-2026-${uniqueSuffix}`;
      const token = `QR-${generatedId}-${(actData.category || 'AGENDA').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const newAct = {
        id: generatedId,
        activityNumber: actData.activityNumber || `${String(activities.length + 1).padStart(3, '0')}/${(actData.category || 'DPRD').toUpperCase()}/DPRD/IX/2026`,
        qrToken: token,
        toleranceMinutes: Number(actData.toleranceMinutes ?? 30),
        invitedGuests: actData.invitedGuests || [],
        roomName: rooms.find(room => room.id === actData.roomId)?.name || actData.locationName || '',
        lpjSummary: { notes: '', documentationPhotos: [], attachments: [] },
        ...actData,
        status: actData.status || 'ACTIVE',
      };

      // Pastikan tidak ada sisa log pada ID agenda yang baru ini
      setLogs(prev => prev.filter(l => l.activityId !== generatedId));
      setActivities(prev => [newAct, ...prev]);

      try {
        await setDoc(doc(db, COL.ACTIVITIES, generatedId), {
          ...newAct,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (e) { /* fallback */ }

      await logAudit({ action: 'ADD_ACTIVITY', details: `Membuat kegiatan baru: ${newAct.title} (QR Token: ${token})` });
      return { success: true, id: generatedId, qrToken: token };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const updateActivity = async (activityId, actData) => {
    try {
      if (actData.roomId || actData.locationName || actData.roomName) {
        const conflict = findRoomConflict(activities, actData, activityId);
        if (conflict) {
          return {
            success: false,
            message: `Agenda tidak dapat diperbarui. Ruangan sudah digunakan agenda "${conflict.title || conflict.id}" pada ${conflict.date}, pukul ${conflict.startTime || '00:00'}–${conflict.endTime || '23:59'} WIB. Pilih ruangan atau waktu lain.`
          };
        }
      }
      const normalizedData = {
        ...actData,
        ...(actData.roomId ? { roomName: rooms.find(room => room.id === actData.roomId)?.name || actData.locationName || '' } : {})
      };
      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, ...normalizedData } : a));
      try {
        await updateDoc(doc(db, COL.ACTIVITIES, activityId), {
          ...normalizedData,
          updatedAt: serverTimestamp(),
        });
      } catch (e) { /* fallback */ }
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const deleteActivity = async (activityId) => {
    try {
      setActivities(prev => prev.filter(a => a.id !== activityId));
      // Hapus seluruh log presensi yang berelasi dengan agenda yang dihapus
      setLogs(prev => {
        const nextLogs = prev.filter(l => l.activityId !== activityId);
        try { localStorage.setItem('siraport_logs', JSON.stringify(nextLogs)); } catch (e) {}
        return nextLogs;
      });
      try {
        await deleteDoc(doc(db, COL.ACTIVITIES, activityId));
      } catch (e) { /* fallback */ }
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const deleteAttendanceLog = async (logId) => {
    if (!canManageMembers) return { success: false, message: 'Hanya Admin atau BK yang dapat menghapus data absensi.' };
    const target = logs.find(log => log.id === logId);
    if (!target) return { success: false, message: 'Data absensi tidak ditemukan.' };
    try {
      const nextDeletedIds = Array.from(new Set([...deletedLogIds, logId]));
      setDeletedLogIds(nextDeletedIds);
      try { localStorage.setItem('siraport_deleted_log_ids', JSON.stringify(nextDeletedIds)); } catch (e) {}
      setLogs(previous => {
        const next = previous.filter(log => log.id !== logId);
        try {
          localStorage.setItem('siraport_logs', JSON.stringify(next));
          const channel = new BroadcastChannel('siraport_sync_channel');
          channel.postMessage({ type: 'LOGS_UPDATED', logs: next });
          channel.postMessage({ type: 'LOG_DELETED', logId });
          channel.close();
        } catch (e) {}
        return next;
      });
      try { await deleteDoc(doc(db, COL.LOGS, logId)); } catch (e) { console.warn('Firestore delete log fallback:', e); }
      try { await setDoc(doc(db, COL.DELETED_LOGS, logId), { logId, deletedAt: serverTimestamp(), deletedBy: currentUser?.name || 'Admin' }); } catch (e) { console.warn('Firestore tombstone fallback:', e); }
      await logAudit({ action: 'DELETE_ATTENDANCE_LOG', details: `Menghapus data absensi eksternal ${target.guestName || target.invitedName || logId} dari agenda ${target.activityId}`, method: 'ADMIN_CORRECTION' });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Reset / Bersihkan seluruh data absensi pada agenda tertentu (Reset jadi 0)
  const clearActivityAttendance = async (activityId) => {
    try {
      setLogs(prev => {
        const nextLogs = prev.filter(l => l.activityId !== activityId);
        try {
          localStorage.setItem('siraport_logs', JSON.stringify(nextLogs));
          const bc = new BroadcastChannel('siraport_sync_channel');
          bc.postMessage({ type: 'LOGS_UPDATED', logs: nextLogs });
          bc.close();
        } catch (e) {}
        return nextLogs;
      });

      const act = activities.find(a => a.id === activityId);
      await logAudit({
        action: 'RESET_ATTENDANCE',
        details: `Mereset/Mengosongkan presensi menjadi 0 pada agenda: ${act?.title || activityId}`,
      });

      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── Input Absensi Manual Lama (Single Record Migration) ───────────────────
  const recordLegacyAttendance = async ({
    date,
    title,
    akd = '',
    category = '',
    activityId = null,
    memberId,
    status = 'Hadir',
    checkInTime = '09:00',
    checkOutTime = null,
    note = '',
    operatorName = null
  }) => {
    try {
      if (!['SECRETARIAT_ADMIN', 'PETUGAS_BK'].includes(currentRole)) {
        return { success: false, message: 'Hanya Admin Sekretariat atau Petugas BK yang dapat melakukan input absensi manual lama.' };
      }
      const member = getParticipantById(memberId);
      if (!member) return { success: false, message: 'Data anggota DPRD tidak ditemukan.' };
      if (!date) return { success: false, message: 'Tanggal kegiatan wajib diisi.' };
      if (!title && !activityId) return { success: false, message: 'Nama agenda kegiatan wajib diisi.' };

      let targetActivity = activities.find(a => a.id === activityId);

      // Jika targetActivity belum ada, cari berdasarkan tanggal & judul
      if (!targetActivity) {
        targetActivity = activities.find(a =>
          a.date === date &&
          a.title?.trim().toLowerCase() === title?.trim().toLowerCase()
        );
      }

      // Jika belum ditemukan di database, buat agenda kegiatan lama baru secara otomatis
      if (!targetActivity) {
        const generatedActId = `ACT-LEGACY-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const resolvedAKD = akd || category || member.komisi || 'Komisi I';
        const isParipurna = /paripurna/i.test(resolvedAKD) || /paripurna/i.test(title || '');

        targetActivity = {
          id: generatedActId,
          title: (title || 'Rapat Kegiatan DPRD').trim(),
          date,
          startTime: checkInTime || '08:00',
          endTime: checkOutTime || '12:00',
          toleranceMinutes: 30,
          category: isParipurna ? 'Rapat Paripurna' : (category || resolvedAKD || 'Rapat Kerja'),
          akd: resolvedAKD,
          akdOrganizer: resolvedAKD,
          organizer: resolvedAKD,
          roomId: null,
          roomName: 'Ruang Rapat DPRD (Arsip Manual)',
          locationName: 'Ruang Rapat DPRD (Arsip Manual)',
          qrToken: `LEGACY-${generatedActId}`,
          attendanceMethods: ['MANUAL_LEGACY'],
          participantMemberIds: [memberId],
          participantTypes: { [memberId]: 'MEMBER' },
          participantStatuses: { [memberId]: 'WAJIB_HADIR' },
          status: 'COMPLETED',
          isLegacy: true,
          notes: 'Agenda historis migrasi absensi manual lama',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setActivities(prev => [targetActivity, ...prev]);
        try {
          await setDoc(doc(db, COL.ACTIVITIES, generatedActId), {
            ...targetActivity,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn('Firestore write legacy activity warning:', e);
        }
      } else {
        // Jika agenda sudah ada, pastikan member terdaftar sebagai peserta WAJIB_HADIR
        const currentParticipants = Array.isArray(targetActivity.participantMemberIds) ? targetActivity.participantMemberIds : [];
        if (!currentParticipants.includes(memberId)) {
          const updatedParticipantIds = [...currentParticipants, memberId];
          const updatedStatuses = { ...(targetActivity.participantStatuses || {}), [memberId]: 'WAJIB_HADIR' };
          const updatedTypes = { ...(targetActivity.participantTypes || {}), [memberId]: 'MEMBER' };

          targetActivity = {
            ...targetActivity,
            participantMemberIds: updatedParticipantIds,
            participantStatuses: updatedStatuses,
            participantTypes: updatedTypes,
          };

          setActivities(prev => prev.map(a => a.id === targetActivity.id ? targetActivity : a));
          try {
            await updateDoc(doc(db, COL.ACTIVITIES, targetActivity.id), {
              participantMemberIds: updatedParticipantIds,
              participantStatuses: updatedStatuses,
              participantTypes: updatedTypes,
              updatedAt: serverTimestamp(),
            });
          } catch (e) {
            console.warn('Firestore update legacy participants warning:', e);
          }
        }
      }

      // Format timestamp ISO
      let checkInAt = `${date}T${checkInTime || '09:00'}:00`;
      try {
        const d = new Date(checkInAt);
        if (isNaN(d.getTime())) checkInAt = new Date().toISOString();
        else checkInAt = d.toISOString();
      } catch (e) {
        checkInAt = new Date().toISOString();
      }

      let checkOutAt = null;
      if (checkOutTime) {
        try {
          const dOut = new Date(`${date}T${checkOutTime}:00`);
          if (!isNaN(dOut.getTime())) checkOutAt = dOut.toISOString();
        } catch (e) {}
      }

      const logDocId = getAttendanceDocumentId(targetActivity.id, memberId);
      const newLog = {
        id: logDocId,
        attendanceId: logDocId,
        activityId: targetActivity.id,
        agendaId: targetActivity.id,
        roomId: targetActivity.roomId || null,
        roomName: targetActivity.roomName || 'Ruang Rapat DPRD',
        participantType: 'INTERNAL',
        attendanceType: 'ANGGOTA',
        participantCategory: 'ANGGOTA DPRD',
        participantStatus: 'WAJIB_HADIR',
        includedInRaport: true,
        memberId,
        participantId: memberId,
        memberName: member.name,
        memberFraksi: member.fraksi || '',
        memberKomisi: member.komisi || '',
        memberAKD: member.akdMemberships || [member.komisi || ''],
        timestamp: checkInAt,
        checkInAt,
        checkOutAt,
        durationMinutes: checkOutAt ? Math.round((new Date(checkOutAt) - new Date(checkInAt)) / 60000) : 0,
        checkoutStatus: checkOutAt ? 'Selesai/Normal' : 'Selesai Sesuai Jadwal',
        status: normalizeAttendanceStatus(status, { source: 'MANUAL_LEGACY', isLegacy: true }),
        method: 'MANUAL_LEGACY',
        source: 'MANUAL_LEGACY',
        isLegacy: true,
        operatorName: operatorName || currentUser?.name || 'Petugas Sekretariat DPRD',
        note: note || 'Migrasi Data Absensi Manual Lama',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setLogs(prev => {
        const filtered = prev.filter(l => !(l.activityId === targetActivity.id && l.memberId === memberId));
        const nextLogs = [newLog, ...filtered];
        try {
          localStorage.setItem('siraport_logs', JSON.stringify(nextLogs));
          const bc = new BroadcastChannel('siraport_sync_channel');
          bc.postMessage({ type: 'LOGS_UPDATED', logs: nextLogs });
          bc.close();
        } catch (e) {}
        return nextLogs;
      });

      try {
        await setDoc(doc(db, COL.LOGS, logDocId), {
          ...newLog,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.warn('Firestore write legacy log warning:', e);
        return { success: false, message: `Absensi manual gagal disimpan ke database: ${e.message}` };
      }

      await logAudit({
        action: 'LEGACY_ATTENDANCE_RECORDED',
        details: `Input Absensi Manual Lama [${status}] untuk ${member.name} pada agenda "${targetActivity.title}" (${date}) via Manual Lama.`,
        method: 'MANUAL_LEGACY'
      });

      return { success: true, log: newLog, activity: targetActivity };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── Import Batch Absensi Manual Lama dari Excel / CSV ───────────────────────
  const batchImportLegacyAttendance = async (parsedRows = [], operatorName = null) => {
    try {
      if (!['SECRETARIAT_ADMIN', 'PETUGAS_BK'].includes(currentRole)) {
        return { success: false, message: 'Hanya Admin Sekretariat atau Petugas BK yang dapat melakukan import migrasi absensi.' };
      }
      if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
        return { success: false, message: 'Tidak ada data yang diimport.' };
      }

      const createdActivitiesMap = new Map();
      const newActivitiesList = [];
      const newLogsList = [];
      const currentActivities = [...activities];

      for (const row of parsedRows) {
        const { date, title, akd, category, memberId, status, checkInTime, checkOutTime, note } = row;
        const cleanTitle = (title || 'Rapat Kegiatan DPRD').trim();
        const actKey = `${date}___${cleanTitle.toLowerCase()}`;

        let act = currentActivities.find(a =>
          a.date === date && a.title?.trim().toLowerCase() === cleanTitle.toLowerCase()
        ) || createdActivitiesMap.get(actKey);

        if (!act) {
          const generatedActId = `ACT-LEGACY-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const resolvedAKD = akd || category || 'Komisi I';
          const isParipurna = /paripurna/i.test(resolvedAKD) || /paripurna/i.test(cleanTitle);

          act = {
            id: generatedActId,
            title: cleanTitle,
            date,
            startTime: checkInTime || '08:00',
            endTime: checkOutTime || '12:00',
            toleranceMinutes: 30,
            category: isParipurna ? 'Rapat Paripurna' : (category || resolvedAKD || 'Rapat Kerja'),
            akd: resolvedAKD,
            akdOrganizer: resolvedAKD,
            organizer: resolvedAKD,
            roomId: null,
            roomName: 'Ruang Rapat DPRD (Arsip Manual)',
            locationName: 'Ruang Rapat DPRD (Arsip Manual)',
            qrToken: `LEGACY-${generatedActId}`,
            attendanceMethods: ['MANUAL_LEGACY'],
            participantMemberIds: [memberId],
            participantTypes: { [memberId]: 'MEMBER' },
            participantStatuses: { [memberId]: 'WAJIB_HADIR' },
            status: 'COMPLETED',
            isLegacy: true,
            notes: 'Agenda historis migrasi absensi manual lama',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          createdActivitiesMap.set(actKey, act);
          newActivitiesList.push(act);
          currentActivities.unshift(act);
        } else {
          if (!act.participantMemberIds.includes(memberId)) {
            act.participantMemberIds = [...act.participantMemberIds, memberId];
            act.participantStatuses = { ...(act.participantStatuses || {}), [memberId]: 'WAJIB_HADIR' };
            act.participantTypes = { ...(act.participantTypes || {}), [memberId]: 'MEMBER' };
          }
        }

        const member = getParticipantById(memberId);
        if (!member) continue;

        let checkInAt = `${date}T${checkInTime || '09:00'}:00`;
        try {
          const d = new Date(checkInAt);
          if (isNaN(d.getTime())) checkInAt = new Date().toISOString();
          else checkInAt = d.toISOString();
        } catch (e) {
          checkInAt = new Date().toISOString();
        }

        let checkOutAt = null;
        if (checkOutTime) {
          try {
            const dOut = new Date(`${date}T${checkOutTime}:00`);
            if (!isNaN(dOut.getTime())) checkOutAt = dOut.toISOString();
          } catch (e) {}
        }

        const logDocId = getAttendanceDocumentId(act.id, memberId);
        const logItem = {
          id: logDocId,
          attendanceId: logDocId,
          activityId: act.id,
          agendaId: act.id,
          roomId: act.roomId || null,
          roomName: act.roomName || 'Ruang Rapat DPRD',
          participantType: 'INTERNAL',
          attendanceType: 'ANGGOTA',
          participantCategory: 'ANGGOTA DPRD',
          participantStatus: 'WAJIB_HADIR',
          includedInRaport: true,
          memberId,
          participantId: memberId,
          memberName: member.name,
          memberFraksi: member.fraksi || '',
          memberKomisi: member.komisi || '',
          memberAKD: member.akdMemberships || [member.komisi || ''],
          timestamp: checkInAt,
          checkInAt,
          checkOutAt,
          durationMinutes: checkOutAt ? Math.max(0, Math.round((new Date(checkOutAt) - new Date(checkInAt)) / 60000)) : 0,
          checkoutStatus: checkOutAt ? 'Selesai/Normal' : 'Selesai Sesuai Jadwal',
          status: normalizeAttendanceStatus(status, { source: 'MANUAL_LEGACY', isLegacy: true }),
          method: 'MANUAL_LEGACY',
          source: 'MANUAL_LEGACY',
          isLegacy: true,
          operatorName: operatorName || currentUser?.name || 'Petugas Sekretariat DPRD',
          note: note || 'Migrasi Data Absensi Manual Lama (Batch)',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        newLogsList.push(logItem);
      }

      setActivities(prev => {
        const merged = [...newActivitiesList, ...prev.filter(p => !newActivitiesList.some(n => n.id === p.id))];
        try { localStorage.setItem('siraport_activities', JSON.stringify(merged)); } catch (e) {}
        return merged;
      });

      setLogs(prev => {
        const newIds = new Set(newLogsList.map(l => l.id));
        const nextLogs = [...newLogsList, ...prev.filter(l => !newIds.has(l.id))];
        try {
          localStorage.setItem('siraport_logs', JSON.stringify(nextLogs));
          const bc = new BroadcastChannel('siraport_sync_channel');
          bc.postMessage({ type: 'LOGS_UPDATED', logs: nextLogs });
          bc.close();
        } catch (e) {}
        return nextLogs;
      });

      for (const act of newActivitiesList) {
        try {
          await setDoc(doc(db, COL.ACTIVITIES, act.id), {
            ...act,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        } catch (e) {
          return { success: false, message: `Agenda manual gagal disimpan ke database: ${e.message}` };
        }
      }

      for (const lg of newLogsList) {
        try {
          await setDoc(doc(db, COL.LOGS, lg.id), {
            ...lg,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        } catch (e) {
          return { success: false, message: `Absensi manual batch gagal disimpan ke database: ${e.message}` };
        }
      }

      await logAudit({
        action: 'LEGACY_ATTENDANCE_BATCH_IMPORTED',
        details: `Berhasil migrasi dan mengimpor ${newLogsList.length} data absensi manual lama ke dalam SI-RAPORT.`,
        method: 'IMPORT_EXCEL'
      });

      return {
        success: true,
        importedCount: newLogsList.length,
        activitiesCount: newActivitiesList.length
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── Edit & Koreksi Data Absensi Manual Lama dengan Jejak Audit ───────────────
  const updateLegacyAttendance = async (logId, { status, checkInTime, checkOutTime, note, changeReason }) => {
    try {
      if (!['SECRETARIAT_ADMIN', 'PETUGAS_BK'].includes(currentRole)) {
        return { success: false, message: 'Hanya Admin Sekretariat atau Petugas BK yang dapat mengoreksi data absensi.' };
      }
      if (!changeReason?.trim()) {
        return { success: false, message: 'Alasan perubahan/koreksi wajib diisi untuk pencatatan Audit Trail.' };
      }
      const existingLog = logs.find(l => l.id === logId);
      if (!existingLog) return { success: false, message: 'Data absensi tidak ditemukan.' };

      const dateStr = existingLog.checkInAt ? existingLog.checkInAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
      let nextCheckInAt = existingLog.checkInAt;
      if (checkInTime) {
        try {
          const d = new Date(`${dateStr}T${checkInTime}:00`);
          if (!isNaN(d.getTime())) nextCheckInAt = d.toISOString();
        } catch (e) {}
      }

      let nextCheckOutAt = existingLog.checkOutAt;
      if (checkOutTime !== undefined) {
        if (!checkOutTime) {
          nextCheckOutAt = null;
        } else {
          try {
            const d = new Date(`${dateStr}T${checkOutTime}:00`);
            if (!isNaN(d.getTime())) nextCheckOutAt = d.toISOString();
          } catch (e) {}
        }
      }

      const updatedLog = {
        ...existingLog,
        status: normalizeAttendanceStatus(status ?? existingLog.status, existingLog),
        checkInAt: nextCheckInAt,
        timestamp: nextCheckInAt,
        checkOutAt: nextCheckOutAt,
        note: note !== undefined ? note : existingLog.note,
        updatedAt: new Date().toISOString(),
        lastCorrectedBy: currentUser?.name || 'Petugas BK',
        lastCorrectionReason: changeReason.trim(),
      };

      setLogs(prev => {
        const nextLogs = prev.map(l => l.id === logId ? updatedLog : l);
        try {
          localStorage.setItem('siraport_logs', JSON.stringify(nextLogs));
          const bc = new BroadcastChannel('siraport_sync_channel');
          bc.postMessage({ type: 'LOGS_UPDATED', logs: nextLogs });
          bc.close();
        } catch (e) {}
        return nextLogs;
      });

      try {
        await updateDoc(doc(db, COL.LOGS, logId), {
          status: updatedLog.status,
          checkInAt: updatedLog.checkInAt,
          timestamp: updatedLog.timestamp,
          checkOutAt: updatedLog.checkOutAt,
          note: updatedLog.note,
          lastCorrectedBy: updatedLog.lastCorrectedBy,
          lastCorrectionReason: updatedLog.lastCorrectionReason,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Firestore update log error:', e);
      }

      await logAudit({
        action: 'LEGACY_ATTENDANCE_CORRECTED',
        details: `Koreksi data absensi ${existingLog.memberName} pada agenda "${existingLog.activityId}". Sebelum: [Status: ${existingLog.status}, Ket: ${existingLog.note || '-'}]; Sesudah: [Status: ${updatedLog.status}, Ket: ${updatedLog.note || '-'}]. Alasan koreksi: ${changeReason.trim()}`,
        method: 'ADMIN_CORRECTION'
      });

      return { success: true, log: updatedLog };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── Hapus Data Absensi Manual Lama dengan Jejak Audit ────────────────────────
  const deleteLegacyAttendance = async (logId, reason = '') => {
    if (!['SECRETARIAT_ADMIN', 'PETUGAS_BK'].includes(currentRole)) {
      return { success: false, message: 'Hanya Admin atau Petugas BK yang dapat menghapus data absensi manual lama.' };
    }
    const target = logs.find(log => log.id === logId);
    if (!target) return { success: false, message: 'Data absensi tidak ditemukan.' };

    try {
      const nextDeletedIds = Array.from(new Set([...deletedLogIds, logId]));
      setDeletedLogIds(nextDeletedIds);
      try { localStorage.setItem('siraport_deleted_log_ids', JSON.stringify(nextDeletedIds)); } catch (e) {}

      setLogs(previous => {
        const next = previous.filter(log => log.id !== logId);
        try {
          localStorage.setItem('siraport_logs', JSON.stringify(next));
          const channel = new BroadcastChannel('siraport_sync_channel');
          channel.postMessage({ type: 'LOGS_UPDATED', logs: next });
          channel.postMessage({ type: 'LOG_DELETED', logId });
          channel.close();
        } catch (e) {}
        return next;
      });

      try { await deleteDoc(doc(db, COL.LOGS, logId)); } catch (e) { console.warn('Firestore delete log fallback:', e); }
      try {
        await setDoc(doc(db, COL.DELETED_LOGS, logId), {
          ...target,
          deletedAt: serverTimestamp(),
          deletedBy: currentUser?.name || 'Admin',
          deleteReason: reason || 'Koreksi penghapusan data manual lama'
        });
      } catch (e) {
        console.warn('Firestore tombstone fallback:', e);
      }

      await logAudit({
        action: 'LEGACY_ATTENDANCE_DELETED',
        details: `Menghapus data absensi manual lama ${target.memberName} (${target.status}) dari agenda ${target.activityId}. Alasan: ${reason || 'Penghapusan manual'}`,
        method: 'ADMIN_CORRECTION'
      });

      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };



  // ─── Verifikasi PIN Anggota DPRD (Anti-Titip Absen via Identitas) ────────
  /**
   * Verifikasi PIN absensi mandiri peserta internal.
   * Dilengkapi rate-limiting: 3x salah → cooldown 30 detik.
   * @returns {{ success: boolean, message: string, remainingAttempts?: number, cooldownUntil?: number }}
   */
  const verifyMemberPin = useCallback((memberId, inputPin) => {
    if (!memberId || !inputPin) return { success: false, message: 'ID anggota dan PIN wajib diisi.' };

    // Rate limiting via sessionStorage (per device, per session)
    const rlKey = `pin_rl_${memberId}`;
    let rl = {};
    try { rl = JSON.parse(sessionStorage.getItem(rlKey) || '{}'); } catch(_) {}

    const now = Date.now();
    const COOLDOWN_MS = 30_000; // 30 detik
    const MAX_ATTEMPTS = 3;

    // Jika sedang cooldown
    if (rl.cooldownUntil && now < rl.cooldownUntil) {
      const secsLeft = Math.ceil((rl.cooldownUntil - now) / 1000);
      return { success: false, message: `Terlalu banyak percobaan salah. Coba lagi dalam ${secsLeft} detik.`, cooldownUntil: rl.cooldownUntil };
    }

    // Jika cooldown sudah lewat, reset attempts
    if (rl.cooldownUntil && now >= rl.cooldownUntil) {
      rl = { attempts: 0, cooldownUntil: null };
    }

    const member = getMemberById(memberId);
    if (!member) return { success: false, message: 'Data anggota tidak ditemukan.' };
    if (!member.attendancePin) return { success: false, message: 'PIN anggota belum disetel. Hubungi Sekretariat BK.' };

    const isCorrect = String(member.attendancePin).trim() === String(inputPin).trim();

    if (isCorrect) {
      // Reset rate limit on success
      sessionStorage.removeItem(rlKey);
      return { success: true, message: 'PIN benar.' };
    }

    // PIN salah — tambah attempt
    const attempts = (rl.attempts || 0) + 1;
    const remaining = MAX_ATTEMPTS - attempts;

    if (attempts >= MAX_ATTEMPTS) {
      const cooldownUntil = now + COOLDOWN_MS;
      sessionStorage.setItem(rlKey, JSON.stringify({ attempts, cooldownUntil }));
      logAudit({ action: 'PIN_BLOCKED', details: `PIN salah ${MAX_ATTEMPTS}x untuk ${member.name} — cooldown 30 detik`, method: 'QR_SCAN' });
      return { success: false, message: `PIN salah. Akun dikunci selama 30 detik.`, cooldownUntil, remainingAttempts: 0 };
    }

    sessionStorage.setItem(rlKey, JSON.stringify({ attempts, cooldownUntil: null }));
    return { success: false, message: `PIN salah. Sisa ${remaining} percobaan.`, remainingAttempts: remaining };
  }, [getMemberById, logAudit]);

  /**
   * Ganti PIN anggota (bisa dari Portal Anggota atau Reset oleh Admin/BK).
   * Jika isAdminReset = true, tidak perlu validasi PIN lama.
   */
  const updateMemberPin = async (memberId, oldPin, newPin, isAdminReset = false) => {
    try {
      const member = getMemberById(memberId);
      if (!member) return { success: false, message: 'Data anggota tidak ditemukan.' };

      if (!isAdminReset) {
        if (!member.attendancePin) return { success: false, message: 'PIN lama belum disetel. Gunakan fitur Reset PIN oleh Admin BK.' };
        if (String(member.attendancePin).trim() !== String(oldPin).trim()) {
          return { success: false, message: 'PIN lama tidak sesuai.' };
        }
      }

      if (!newPin || String(newPin).trim().length !== 6 || !/^\d{6}$/.test(String(newPin).trim())) {
        return { success: false, message: 'PIN baru harus 6 digit angka.' };
      }

      const updatedMember = { ...member, attendancePin: String(newPin).trim() };
      setMembers(prev => prev.map(m => m.id === memberId ? updatedMember : m));

      try {
        await updateDoc(doc(db, COL.MEMBERS, memberId), { attendancePin: String(newPin).trim() });
      } catch(e) { /* fallback offline */ }

      await logAudit({
        action: isAdminReset ? 'PIN_RESET_ADMIN' : 'PIN_CHANGED',
        details: `${isAdminReset ? 'Reset PIN oleh Admin' : 'Ganti PIN mandiri'} untuk ${member.name}`,
        method: 'SYSTEM'
      });

      return { success: true, message: 'PIN berhasil diperbarui.' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── BK Notes ─────────────────────────────────────────────────────────────
  const saveBKNote = async (memberId, note, statusWarning) => {
    try {
      const m = getMemberById(memberId);
      const updated = {
        updatedAt: new Date().toISOString(),
        author: 'Badan Kehormatan (BK)',
        note,
        statusWarning: statusWarning || 'BAIK',
      };
      setBkNotes(prev => ({ ...prev, [memberId]: updated }));

      try {
        await setDoc(doc(db, COL.BK_NOTES, memberId), {
          memberId, note, statusWarning,
          author: 'Badan Kehormatan (BK)',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) { /* fallback */ }

      await logAudit({ action: 'BK_NOTE', details: `Catatan BK [${statusWarning}] untuk ${m?.name}` });
    } catch (e) { console.error('saveBKNote:', e); }
  };

  // ─── Reset / Clear Seluruh Data (Hapus Mock dari LocalStorage & Firestore) ────
  const clearAllData = async () => {
    try {
      // 1. Bersihkan state lokal
      setMembers([]);
      setActivities([]);
      setLogs([]);
      setDeletedLogIds([]);
      setAuditLogs([]);
      setBkNotes({});
      setRooms(DEFAULT_ROOMS);

      // 2. Bersihkan localStorage
      localStorage.removeItem('siraport_members');
      localStorage.removeItem('siraport_activities');
      localStorage.removeItem('siraport_logs');
      localStorage.removeItem('siraport_deleted_log_ids');
      localStorage.removeItem('siraport_audit');
      localStorage.removeItem('siraport_active_member_id');
      localStorage.setItem('siraport_rooms', JSON.stringify(DEFAULT_ROOMS));

      // 3. Bersihkan dokumen di Firestore jika terhubung
      try {
        const collectionsToClear = [COL.MEMBERS, COL.ACTIVITIES, COL.LOGS, COL.AUDIT, COL.BK_NOTES, COL.ROOMS, COL.DELETED_LOGS];
        for (const colName of collectionsToClear) {
          const snap = await getDocs(collection(db, colName));
          const deletePromises = snap.docs.map(d => deleteDoc(doc(db, colName, d.id)));
          await Promise.all(deletePromises);
        }
      } catch (e) {
        console.warn('Gagal membersihkan dokumen Firestore:', e);
      }

      return { success: true };
    } catch (err) {
      console.error('Error clearAllData:', err);
      return { success: false, message: err.message };
    }
  };

  const removeAttendancePhoto = async ({ attendanceId, photoType }) => {
    if (!(isAdmin || isBK || currentRole === 'PETUGAS_SCAN')) {
      return { success: false, message: 'Hanya Petugas, BK, atau Admin yang dapat menghapus foto dokumentasi.' };
    }
    if (!attendanceId || !['CHECK_IN', 'CHECK_OUT'].includes(photoType)) {
      return { success: false, message: 'Referensi absensi atau jenis foto tidak valid.' };
    }

    const existingLog = logs.find(log => (log.attendanceId || log.id) === attendanceId);
    if (!existingLog) return { success: false, message: 'Data absensi tidak ditemukan.' };

    const isCheckIn = photoType === 'CHECK_IN';
    const photoRef = isCheckIn
      ? (existingLog.documentationPhotoRef || existingLog.checkInPhotoId || existingLog.documentationPhoto)
      : (existingLog.checkoutPhotoRef || existingLog.checkOutPhotoId || existingLog.checkoutPhoto);
    if (!photoRef) return { success: false, message: 'Foto dokumentasi tidak tersedia.' };

    try {
      await removeLocalAttendancePhoto(photoRef);
      const updateData = isCheckIn
        ? { documentationPhotoRef: null, checkInPhotoId: null, documentationPhoto: null, documentationPhotoAt: null, documentationPhotoType: null }
        : { checkoutPhotoRef: null, checkOutPhotoId: null, checkoutPhoto: null, checkoutPhotoAt: null, checkoutPhotoType: null };
      const updatedLog = { ...existingLog, ...updateData };
      const logRef = doc(db, COL.LOGS, existingLog.id);
      const remoteWriteResult = await safeDbWrite(
        async () => {
          setSyncStatus('syncing');
          await updateDoc(logRef, { ...updateData, updatedAt: serverTimestamp() });
          await waitForPendingWrites(db);
        },
        5000,
        'Referensi foto gagal diperbarui di Firestore. Data absensi tetap aman.'
      );

      if (!remoteWriteResult.ok) {
        enqueueAttendanceWrite('update', existingLog.id, updatedLog);
        setSyncStatus('pending');
      } else {
        setSyncStatus('saved');
      }

      setLogs(previous => previous.map(log => log.id === existingLog.id ? updatedLog : log));
      void logAudit({
        action: 'ATTENDANCE_PHOTO_DELETED',
        details: `${photoType === 'CHECK_IN' ? 'Foto Check-in' : 'Foto Check-out'} dihapus untuk absensi ${existingLog.id}. Data absensi tidak dihapus.`,
        method: 'PHOTO_MANAGEMENT'
      });
      return { success: true, pending: !remoteWriteResult.ok, log: updatedLog };
    } catch (error) {
      return { success: false, message: error?.message || 'Foto gagal dihapus.' };
    }
  };

  return (
    <AttendanceContext.Provider value={{
      members, personnel, activities, logs, auditLogs, bkNotes,
      rooms,
      scoreSettings, updateScoreSettings, reportSigners, saveReportSigner, deleteReportSigner,
      loading, syncStatus, authReady, currentUser, login, logout,
      currentRole,
      activeMemberId, setActiveMemberId,
      canManageMembers, isAdmin, isBK,
      getMemberById, getPersonnelById, getParticipantById, getMemberByQR, getActivityById, getActivityByQR, getMemberRaport, getMemberAKDRaports,
      recordAttendance, checkoutAttendance, recordGuestAttendance, recordManualAttendance,
      recordLegacyAttendance, batchImportLegacyAttendance, updateLegacyAttendance, deleteLegacyAttendance,
      removeAttendancePhoto,
      requestLeave, reviewLeaveRequest,
      getLPJData, updateLPJSummary,
      saveBKNote,
      addMember, updateMember, deleteMember,
      addPersonnel, updatePersonnel, deletePersonnel,
      addActivity, updateActivity, deleteActivity, clearActivityAttendance,
      addRoom, updateRoom, deleteRoom,
      deleteAttendanceLog,
      leaveRequests,
      verifyMemberPin, updateMemberPin,
      logAudit,
      clearAllData,
      resetSystemData: clearAllData,
    }}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error('useAttendance must be inside AttendanceProvider');
  return ctx;
}

// Helper compress
async function compressImageToBase64(file, maxWidth = 400) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio  = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
        canvas.width  = img.width  * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}
