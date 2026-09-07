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
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';

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

/** Catat Absensi baru atau update yang sudah ada */
export async function saveAttendanceLog(logData) {
  const { id, ...data } = logData;
  
  // Cek apakah sudah ada absensi untuk member + kegiatan ini
  if (!id) {
    const existingQ = query(
      collection(db, COLLECTIONS.ATTENDANCE_LOGS),
      where('activityId', '==', data.activityId),
      where('memberId', '==', data.memberId),
      limit(1)
    );
    const existingSnap = await getDocs(existingQ);
    
    if (!existingSnap.empty) {
      // Update yang sudah ada
      const existingId = existingSnap.docs[0].id;
      await updateDoc(doc(db, COLLECTIONS.ATTENDANCE_LOGS, existingId), {
        ...data,
        updatedAt: serverTimestamp()
      });
      return existingId;
    }
  }

  if (id) {
    await setDoc(doc(db, COLLECTIONS.ATTENDANCE_LOGS, id), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return id;
  } else {
    const ref = await addDoc(collection(db, COLLECTIONS.ATTENDANCE_LOGS), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return ref.id;
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
  const batch = writeBatch(db);
  let writeCount = 0;

  // Seed Members
  members.forEach(m => {
    const { id, ...data } = m;
    const ref = doc(db, COLLECTIONS.MEMBERS, id);
    batch.set(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
    writeCount++;
  });

  // Seed Activities
  activities.forEach(a => {
    const { id, ...data } = a;
    const ref = doc(db, COLLECTIONS.ACTIVITIES, id);
    batch.set(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
    writeCount++;
  });

  // Seed Attendance Logs
  logs.forEach(l => {
    const { id, ...data } = l;
    const ref = doc(db, COLLECTIONS.ATTENDANCE_LOGS, id);
    batch.set(ref, { ...data, createdAt: serverTimestamp() }, { merge: true });
    writeCount++;
  });

  // Seed BK Notes
  Object.entries(bkNotes).forEach(([memberId, note]) => {
    const ref = doc(db, COLLECTIONS.BK_NOTES, memberId);
    batch.set(ref, { ...note, memberId, updatedAt: serverTimestamp() }, { merge: true });
    writeCount++;
  });

  await batch.commit();
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
