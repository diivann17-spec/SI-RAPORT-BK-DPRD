/**
 * Firestore Service Layer - SI-RAPORT BK DPRD
 * CRUD operations untuk Cloud Firestore Collections
 * 
 * Collections:
 * - /members           → Data Anggota DPRD
 * - /activities        → Agenda & Kegiatan DPRD
 * - /attendanceLogs    → Catatan Absensi
 * - /auditTrails       → Log Jejak Audit
 * - /bkNotes           → Catatan Evaluasi Badan Kehormatan
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  runTransaction,
  getDoc
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from './config';

// ─── Collection References ────────────────────────────────────────────────────
export const COLLECTIONS = {
  MEMBERS: 'members',
  ACTIVITIES: 'activities',
  ATTENDANCE_LOGS: 'attendanceLogs',
  AUDIT_TRAILS: 'auditTrails',
  BK_NOTES: 'bkNotes',
  SETTINGS: 'settings'
};

// ─── MEMBERS ──────────────────────────────────────────────────────────────────

/** Ambil semua data Anggota DPRD */
export async function fetchMembers() {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.MEMBERS), orderBy('name', 'asc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Tambah / Update Anggota DPRD */
export async function saveMember(member) {
  const { id, ...data } = member;
  if (id) {
    await setDoc(doc(db, COLLECTIONS.MEMBERS, id), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return id;
  } else {
    const ref = await addDoc(collection(db, COLLECTIONS.MEMBERS), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return ref.id;
  }
}

/** Hapus Anggota DPRD */
export async function deleteMember(memberId) {
  await deleteDoc(doc(db, COLLECTIONS.MEMBERS, memberId));
}

// ─── ACTIVITIES ───────────────────────────────────────────────────────────────

/** Ambil semua Agenda Kegiatan */
export async function fetchActivities() {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.ACTIVITIES), orderBy('date', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Tambah / Update Kegiatan */
export async function saveActivity(activity) {
  const { id, ...data } = activity;
  if (id) {
    await setDoc(doc(db, COLLECTIONS.ACTIVITIES, id), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return id;
  } else {
    const ref = await addDoc(collection(db, COLLECTIONS.ACTIVITIES), {
      ...data,
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return ref.id;
  }
}

// ─── ATTENDANCE LOGS ──────────────────────────────────────────────────────────

/** Ambil semua Log Absensi (opsional filter per kegiatan) */
export async function fetchAttendanceLogs(activityId = null) {
  let q;
  if (activityId) {
    q = query(
      collection(db, COLLECTIONS.ATTENDANCE_LOGS),
      where('activityId', '==', activityId),
      orderBy('timestamp', 'desc')
    );
  } else {
    q = query(
      collection(db, COLLECTIONS.ATTENDANCE_LOGS),
      orderBy('timestamp', 'desc'),
      limit(500)
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Catat absensi baru atau update check-out pada dokumen yang sama. */
export async function saveAttendanceLog(logData) {
  const { id, ...data } = logData;

  if (id) {
    await setDoc(doc(db, COLLECTIONS.ATTENDANCE_LOGS, id), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return id;
  } else {
    if (!data.activityId || !data.participantId) {
      throw new Error('Absensi membutuhkan activityId dan participantId.');
    }
    const prefix = data.participantType === 'EXTERNAL' ? 'ATT-GST' : 'ATT';
    const stableId = `${prefix}-${data.activityId}-${data.participantId}`;
    await runTransaction(db, async (transaction) => {
      const attendanceRef = doc(db, COLLECTIONS.ATTENDANCE_LOGS, stableId);
      const existingSnapshot = await transaction.get(attendanceRef);
      if (existingSnapshot.exists()) throw new Error('DUPLICATE_ATTENDANCE');
      transaction.set(attendanceRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
    return stableId;
  }
}

// ─── AUDIT TRAILS ─────────────────────────────────────────────────────────────

/** Tambah entry Audit Trail */
export async function addAuditTrail(auditData) {
  const ref = await addDoc(collection(db, COLLECTIONS.AUDIT_TRAILS), {
    ...auditData,
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp()
  });
  return ref.id;
}

/** Ambil Audit Trail (terbaru dulu) */
export async function fetchAuditTrails(limitCount = 100) {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.AUDIT_TRAILS),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── BK NOTES ─────────────────────────────────────────────────────────────────

/** Simpan Catatan Evaluasi BK untuk anggota tertentu */
export async function saveBKNote(memberId, noteData) {
  await setDoc(doc(db, COLLECTIONS.BK_NOTES, memberId), {
    ...noteData,
    memberId,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

/** Ambil semua Catatan BK */
export async function fetchBKNotes() {
  const snap = await getDocs(collection(db, COLLECTIONS.BK_NOTES));
  const result = {};
  snap.docs.forEach(d => {
    result[d.id] = d.data();
  });
  return result;
}

// ─── BATCH SEED (untuk inisialisasi data awal ke Firestore) ──────────────────

/**
 * Seed data demo awal ke Firestore.
 * Panggil sekali dari halaman Settings → "Sinkronisasi Demo Data ke Firestore".
 */
export async function seedFirestoreFromMockData(members, activities, logs, auditTrails, bkNotes) {
  const firebaseUser = auth.currentUser;
  console.info('[FIRESTORE SEED] Start', {
    projectId: firebaseConfig.projectId,
    authenticated: Boolean(firebaseUser),
    uid: firebaseUser?.uid || null,
    email: firebaseUser?.email || null
  });

  if (!firebaseUser || firebaseUser.isAnonymous) {
    throw new Error('Sesi Firebase Auth tidak aktif. Silakan logout, login ulang, lalu coba seed kembali.');
  }

  const accountSnapshot = await getDoc(doc(db, 'accounts', firebaseUser.uid));
  const account = accountSnapshot.exists() ? accountSnapshot.data() : null;
  const role = account?.role || null;
  console.info('[FIRESTORE SEED] Authorization', {
    projectId: firebaseConfig.projectId,
    uid: firebaseUser.uid,
    role,
    status: account?.status || null,
    accountExists: accountSnapshot.exists()
  });

  if (!accountSnapshot.exists() || account?.status !== 'ACTIVE' || !['SECRETARIAT_ADMIN', 'PETUGAS_BK'].includes(role)) {
    throw new Error('Akun Firebase harus berstatus ACTIVE dengan role SECRETARIAT_ADMIN atau PETUGAS_BK untuk melakukan seed.');
  }

  let writeCount = 0;
  const logWrite = (collectionName, documentId) => {
    console.info('[FIRESTORE SEED] Queue write', {
      projectId: firebaseConfig.projectId,
      uid: firebaseUser.uid,
      role,
      collection: collectionName,
      documentId,
      merge: true
    });
  };

  // Seed master data first. Attendance rules validate the persisted activity,
  // so activities must exist before attendance logs are written.
  const masterBatch = writeBatch(db);
  members.forEach(m => {
    const { id, ...data } = m;
    const ref = doc(db, COLLECTIONS.MEMBERS, id);
    logWrite(COLLECTIONS.MEMBERS, id);
    masterBatch.set(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
    writeCount++;
  });

  activities.forEach(a => {
    const { id, ...data } = a;
    const ref = doc(db, COLLECTIONS.ACTIVITIES, id);
    logWrite(COLLECTIONS.ACTIVITIES, id);
    masterBatch.set(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
    writeCount++;
  });
  try {
    await masterBatch.commit();
  } catch (error) {
    console.error('[FIRESTORE SEED] Master batch rejected', {
      projectId: firebaseConfig.projectId,
      uid: firebaseUser.uid,
      role,
      collections: [COLLECTIONS.MEMBERS, COLLECTIONS.ACTIVITIES],
      code: error.code,
      message: error.message
    });
    throw new Error(`Seed master data ditolak Firestore (${error.code || 'unknown'}). Pastikan rules production sudah ter-deploy untuk project ${firebaseConfig.projectId}.`);
  }

  // Old cached logs may not contain the fields required by the production
  // attendance rules. Skip those records instead of failing the whole seed.
  const logBatch = writeBatch(db);
  let validLogCount = 0;
  logs.forEach(l => {
    const { id, ...data } = l;
    const isExternal = data.participantType === 'EXTERNAL';
    const requiredFields = [
      'activityId', 'agendaId', 'participantId', 'participantType',
      'participantStatus', 'method', 'deviceId', 'deviceType',
      'deviceOS', 'deviceBrowser'
    ];
    const isValid = requiredFields.every(field => data[field] !== undefined && data[field] !== null) &&
      data.agendaId === data.activityId &&
      (isExternal || ['WAJIB_HADIR', 'UNDANGAN', 'OPSIONAL'].includes(data.participantStatus));
    if (!isValid) return;

    const stableId = `ATT${isExternal ? '-GST' : ''}-${data.activityId}-${data.participantId}`;
    const ref = doc(db, COLLECTIONS.ATTENDANCE_LOGS, stableId);
    logWrite(COLLECTIONS.ATTENDANCE_LOGS, stableId);
    logBatch.set(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
    validLogCount++;
  });
  if (validLogCount > 0) {
    try {
      await logBatch.commit();
    } catch (error) {
      console.error('[FIRESTORE SEED] Attendance batch rejected', {
        projectId: firebaseConfig.projectId,
        uid: firebaseUser.uid,
        role,
        collection: COLLECTIONS.ATTENDANCE_LOGS,
        code: error.code,
        message: error.message
      });
      throw new Error(`Seed log absensi ditolak Firestore (${error.code || 'unknown'}). Periksa status kegiatan dan rules attendanceLogs.`);
    }
    writeCount += validLogCount;
  }

  const noteBatch = writeBatch(db);
  let noteCount = 0;
  Object.entries(bkNotes).forEach(([memberId, note]) => {
    const ref = doc(db, COLLECTIONS.BK_NOTES, memberId);
    logWrite(COLLECTIONS.BK_NOTES, memberId);
    noteBatch.set(ref, { ...note, memberId, updatedAt: serverTimestamp() }, { merge: true });
    noteCount++;
  });
  if (noteCount > 0) {
    try {
      await noteBatch.commit();
    } catch (error) {
      console.error('[FIRESTORE SEED] BK notes batch rejected', {
        projectId: firebaseConfig.projectId,
        uid: firebaseUser.uid,
        role,
        collection: COLLECTIONS.BK_NOTES,
        code: error.code,
        message: error.message
      });
      throw new Error(`Seed catatan BK ditolak Firestore (${error.code || 'unknown'}). Periksa rules bkNotes.`);
    }
    writeCount += noteCount;
  }

  console.log(`✅ Seeded ${writeCount} documents to Firestore`);
  return writeCount;
}

// ─── REALTIME LISTENER ────────────────────────────────────────────────────────

/**
 * Subscribe ke update absensi realtime untuk satu kegiatan.
 * Gunakan di AttendanceScan.jsx untuk monitoring live.
 */
export function subscribeToActivityAttendance(activityId, callback) {
  const q = query(
    collection(db, COLLECTIONS.ATTENDANCE_LOGS),
    where('activityId', '==', activityId),
    orderBy('timestamp', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(logs);
  });
}

/**
 * Subscribe ke update kegiatan aktif secara realtime.
 */
export function subscribeToActiveActivities(callback) {
  const q = query(
    collection(db, COLLECTIONS.ACTIVITIES),
    where('status', '==', 'ACTIVE'),
    orderBy('date', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const activities = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(activities);
  });
}
