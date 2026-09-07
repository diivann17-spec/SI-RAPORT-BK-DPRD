import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection, doc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp, where, limit
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getRaportCategory } from '../utils/raportUtils';

const AttendanceContext = createContext();

const COL = {
  MEMBERS:    'members',
  ACTIVITIES: 'activities',
  LOGS:       'attendanceLogs',
  AUDIT:      'auditTrails',
  BK_NOTES:   'bkNotes',
};

// Konversi file gambar → base64 string (untuk simpan ke Firestore tanpa Storage)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AttendanceProvider({ children }) {
  const [members,    setMembers]    = useState([]);
  const [activities, setActivities] = useState([]);
  const [logs,       setLogs]       = useState([]);
  const [auditLogs,  setAuditLogs]  = useState([]);
  const [bkNotes,    setBkNotes]    = useState({});
  const [loading,    setLoading]    = useState(true);

  // Role: 'SECRETARIAT_ADMIN' | 'PETUGAS_BK' | 'PETUGAS_SCAN' | 'ANGGOTA_DPRD'
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('siraport_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const [currentRole, setCurrentRole] = useState(
    () => currentUser?.role || localStorage.getItem('siraport_role') || 'PETUGAS_BK'
  );
  const [activeMemberId, setActiveMemberId] = useState(
    () => currentUser?.memberId || localStorage.getItem('siraport_active_member_id') || ''
  );

  useEffect(() => { localStorage.setItem('siraport_role', currentRole); }, [currentRole]);
  useEffect(() => { localStorage.setItem('siraport_active_member_id', activeMemberId); }, [activeMemberId]);
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('siraport_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('siraport_user');
    }
  }, [currentUser]);

  // Login handler
  const login = ({ role, username, name, memberId }) => {
    const userObj = {
      role: role || 'PETUGAS_BK',
      username: username || 'user',
      name: name || username || 'Pengguna',
      memberId: memberId || activeMemberId || '',
      loginAt: new Date().toISOString()
    };
    setCurrentUser(userObj);
    setCurrentRole(userObj.role);
    if (memberId) setActiveMemberId(memberId);
    logAudit({
      action: 'USER_LOGIN',
      details: `Login berhasil: ${userObj.name} (${userObj.role})`,
      method: 'LOCAL_SIMULATION'
    });
  };

  // Logout handler
  const logout = () => {
    if (currentUser) {
      logAudit({
        action: 'USER_LOGOUT',
        details: `Logout: ${currentUser.name} (${currentUser.role})`,
        method: 'LOCAL_SIMULATION'
      });
    }
    setCurrentUser(null);
  };

  // ─── Realtime Firestore listeners ────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);

    const unsubs = [];

    unsubs.push(onSnapshot(
      collection(db, COL.MEMBERS),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setMembers(data);
        if (!localStorage.getItem('siraport_active_member_id') && data.length > 0) {
          setActiveMemberId(data[0].id);
        }
      },
      err => console.error('Firestore members onSnapshot error:', err)
    ));

    unsubs.push(onSnapshot(
      collection(db, COL.ACTIVITIES),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setActivities(data);
      },
      err => console.error('Firestore activities onSnapshot error:', err)
    ));

    unsubs.push(onSnapshot(
      collection(db, COL.LOGS),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => {
          const tA = a.timestampISO || (a.timestamp?.toDate ? a.timestamp.toDate().toISOString() : '');
          const tB = b.timestampISO || (b.timestamp?.toDate ? b.timestamp.toDate().toISOString() : '');
          return tB.localeCompare(tA);
        });
        setLogs(data);
        setLoading(false);
      },
      err => { console.error('Firestore logs onSnapshot error:', err); setLoading(false); }
    ));

    unsubs.push(onSnapshot(
      collection(db, COL.AUDIT),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => {
          const tA = a.timestampISO || (a.timestamp?.toDate ? a.timestamp.toDate().toISOString() : '');
          const tB = b.timestampISO || (b.timestamp?.toDate ? b.timestamp.toDate().toISOString() : '');
          return tB.localeCompare(tA);
        });
        setAuditLogs(data);
      },
      err => console.error('Firestore audit onSnapshot error:', err)
    ));

    unsubs.push(onSnapshot(
      collection(db, COL.BK_NOTES),
      (snap) => {
        const result = {};
        snap.docs.forEach(d => { result[d.id] = d.data(); });
        setBkNotes(result);
      },
      err => console.error('bkNotes:', err)
    ));

    return () => unsubs.forEach(u => u());
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const getMemberById  = useCallback((id)      => members.find(m => m.id === id),      [members]);
  const getMemberByQR  = useCallback((token)   => members.find(m => m.qrToken === token || m.id === token), [members]);

  // ─── Role helpers ─────────────────────────────────────────────────────────────
  const isAdmin    = currentRole === 'SECRETARIAT_ADMIN';
  const isBK       = currentRole === 'PETUGAS_BK';
  const canManageMembers = isAdmin || isBK;   // hanya Admin & BK bisa tambah/edit anggota

  // ─── Audit Trail ─────────────────────────────────────────────────────────────
  const logAudit = useCallback(async ({ action, details, method }) => {
    try {
      await addDoc(collection(db, COL.AUDIT), {
        timestamp: serverTimestamp(),
        userRole:  currentRole,
        userName:  'Petugas Sistem',
        action,
        details,
        method: method || 'SYSTEM',
      });
    } catch (e) { console.error('audit:', e); }
  }, [currentRole]);

  // ─── Raport Score ─────────────────────────────────────────────────────────────
  const getMemberRaport = useCallback((memberId, categoryFilter = 'ALL', maxMonth = null) => {
    const memberLogs = logs.filter(l => l.memberId === memberId);
    let relevantActivities = categoryFilter === 'ALL'
      ? activities
      : activities.filter(a => a.category === categoryFilter);

    // Filter sampai bulan tertentu (default atau spesifik misal s.d November)
    if (maxMonth !== null && maxMonth !== undefined && maxMonth !== 'ALL') {
      const monthNum = parseInt(maxMonth, 10);
      relevantActivities = relevantActivities.filter(a => {
        if (!a.date) return true;
        const actMonth = new Date(a.date).getMonth() + 1; // 1 - 12
        return actMonth <= monthNum;
      });
    }

    const total = relevantActivities.length || 1;
    let score = 0, hadir = 0, terlambat = 0, izin = 0, sakit = 0, dinas = 0, alpa = 0;
    relevantActivities.forEach(act => {
      const log = memberLogs.find(l => l.activityId === act.id);
      const st = log?.status?.toLowerCase();
      if (!log || st === 'tanpa keterangan') { alpa++; }
      else if (st === 'hadir')      { score += 1;    hadir++; }
      else if (st === 'terlambat')  { score += 0.8;  terlambat++; }
      else if (st === 'dinas')      { score += 1;    dinas++; }
      else if (st === 'izin')       { score += 0.75; izin++; }
      else if (st === 'sakit')      { score += 0.75; sakit++; }
      else { alpa++; }
    });
    const percentage = Math.min(100, Math.round((score / total) * 100));
    return {
      percentage,
      categoryInfo: getRaportCategory(percentage),
      totalMandatory: relevantActivities.length,
      attendedCount: Math.round(score * 10) / 10,
      breakdown: { hadir, terlambat, dinas, izin, sakit, alpa }
    };
  }, [logs, activities]);

  // ─── Add Member (foto di-convert ke base64, simpan di Firestore) ──────────────
  const addMember = async (memberData, photoFile = null) => {
    if (!canManageMembers) return { success: false, message: 'Hanya BK dan Admin yang bisa menambahkan anggota.' };
    try {
      let photoUrl = memberData.photo || '';

      // Konversi foto ke base64 jika ada file dipilih
      if (photoFile) {
        // Resize/compress — batasi max 800px agar tidak melebihi limit Firestore (1MB per doc)
        photoUrl = await compressImageToBase64(photoFile, 400);
      }

      const newMember = {
        ...memberData,
        photo: photoUrl,
        qrToken: '',        // akan diupdate setelah dapat ID
        statusActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, COL.MEMBERS), newMember);
      const finalId = docRef.id;

      // Update qrToken dengan ID final
      await updateDoc(doc(db, COL.MEMBERS, finalId), {
        qrToken: `QR-${finalId}-${(memberData.name || '').replace(/\s+/g, '').toUpperCase().substring(0, 6)}`,
      });

      await logAudit({ action: 'CREATE_MEMBER', details: `Tambah Anggota: ${memberData.name}` });
      return { success: true, id: finalId };
    } catch (err) {
      console.error('addMember:', err);
      return { success: false, message: `Gagal menyimpan: ${err.message}. Pastikan Firestore Rules mengizinkan write.` };
    }
  };

  // ─── Update Member ────────────────────────────────────────────────────────────
  const updateMember = async (memberId, memberData, photoFile = null) => {
    if (!canManageMembers) return { success: false, message: 'Hanya BK dan Admin yang bisa mengedit anggota.' };
    try {
      let photoUrl = memberData.photo || '';
      if (photoFile) {
        photoUrl = await compressImageToBase64(photoFile, 400);
      }
      await setDoc(doc(db, COL.MEMBERS, memberId), {
        ...memberData,
        photo: photoUrl,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await logAudit({ action: 'UPDATE_MEMBER', details: `Update: ${memberData.name}` });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── Delete Member ────────────────────────────────────────────────────────────
  const deleteMember = async (memberId) => {
    if (!canManageMembers) return { success: false, message: 'Hanya BK dan Admin yang bisa menghapus anggota.' };
    try {
      const m = getMemberById(memberId);
      await deleteDoc(doc(db, COL.MEMBERS, memberId));
      await logAudit({ action: 'DELETE_MEMBER', details: `Hapus: ${m?.name}` });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── Activity CRUD ────────────────────────────────────────────────────────────
  const addActivity = async (data) => {
    try {
      const ref = await addDoc(collection(db, COL.ACTIVITIES), {
        ...data,
        status: data.status || 'ACTIVE',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await logAudit({ action: 'CREATE_ACTIVITY', details: `Agenda: ${data.title}` });
      return { success: true, id: ref.id };
    } catch (err) { return { success: false, message: err.message }; }
  };

  const updateActivity = async (id, data) => {
    try {
      await setDoc(doc(db, COL.ACTIVITIES, id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
      return { success: true };
    } catch (err) { return { success: false, message: err.message }; }
  };

  const deleteActivity = async (id) => {
    try {
      await deleteDoc(doc(db, COL.ACTIVITIES, id));
      return { success: true };
    } catch (err) { return { success: false, message: err.message }; }
  };

  // ─── Record Attendance (QR / GPS) ─────────────────────────────────────────────
  const recordAttendance = async ({ activityId, memberId, method, lat, lng, distanceMeters, proofPhoto, operatorName, note }) => {
    const member   = getMemberById(memberId);
    const activity = activities.find(a => a.id === activityId);
    if (!member || !activity) return { success: false, message: 'Data anggota atau kegiatan tidak ditemukan.' };

    try {
      const existQ = query(
        collection(db, COL.LOGS),
        where('activityId', '==', activityId),
        where('memberId',   '==', memberId),
        limit(1)
      );
      const existSnap = await getDocs(existQ);

      const now   = new Date();
      const start = new Date(`${activity.date}T${activity.startTime || '00:00'}:00`);
      const status = now > start ? 'Terlambat' : 'Hadir';

      const logData = {
        activityId,
        memberId,
        timestamp:    serverTimestamp(),
        timestampISO: now.toISOString(),
        status,
        method,
        operatorName: operatorName || 'Sistem',
        lat:   lat    ?? null,
        lng:   lng    ?? null,
        distanceMeters: distanceMeters ?? null,
        proofPhoto: proofPhoto || null,
        note:  note   || `${method} — ${status}`,
        updatedAt: serverTimestamp(),
      };

      let logId;
      if (!existSnap.empty) {
        logId = existSnap.docs[0].id;
        await updateDoc(doc(db, COL.LOGS, logId), logData);
      } else {
        const r = await addDoc(collection(db, COL.LOGS), { ...logData, createdAt: serverTimestamp() });
        logId = r.id;
      }

      await logAudit({
        action:  existSnap.empty ? 'NEW_ATTENDANCE' : 'UPDATE_ATTENDANCE',
        details: `[${method}] ${status} — ${member.name} @ ${activity.title}`,
        method,
      });

      return { success: true, log: { id: logId, ...logData, timestamp: now.toISOString() }, member, activity };
    } catch (err) {
      console.error('recordAttendance:', err);
      return { success: false, message: err.message };
    }
  };

  // ─── Manual Attendance ────────────────────────────────────────────────────────
  const recordManualAttendance = async ({ activityId, memberId, status, note, operatorName }) => {
    const member   = getMemberById(memberId);
    const activity = activities.find(a => a.id === activityId);
    if (!member || !activity) return { success: false, message: 'Data tidak valid.' };

    try {
      const existQ = query(
        collection(db, COL.LOGS),
        where('activityId', '==', activityId),
        where('memberId',   '==', memberId),
        limit(1)
      );
      const existSnap = await getDocs(existQ);
      const logData = {
        activityId, memberId,
        timestamp:    serverTimestamp(),
        timestampISO: new Date().toISOString(),
        status,
        method: 'MANUAL_OVERRIDE',
        operatorName: operatorName || 'Admin Sekretariat',
        lat: null, lng: null, distanceMeters: null, proofPhoto: null,
        note: note || 'Input Manual Petugas',
        updatedAt: serverTimestamp(),
      };

      if (!existSnap.empty) {
        await updateDoc(doc(db, COL.LOGS, existSnap.docs[0].id), logData);
      } else {
        await addDoc(collection(db, COL.LOGS), { ...logData, createdAt: serverTimestamp() });
      }

      await logAudit({
        action:  'MANUAL_ATTENDANCE_OVERRIDE',
        details: `Manual [${status}] ${member.name} oleh ${operatorName} — ${note}`,
        method:  'MANUAL_OVERRIDE',
      });

      return { success: true };
    } catch (err) {
      console.error('recordManualAttendance:', err);
      return { success: false, message: err.message };
    }
  };

  // ─── BK Note ─────────────────────────────────────────────────────────────────
  const saveBKNote = async (memberId, note, statusWarning) => {
    try {
      const m = getMemberById(memberId);
      await setDoc(doc(db, COL.BK_NOTES, memberId), {
        memberId, note, statusWarning,
        author: 'Badan Kehormatan (BK)',
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await logAudit({ action: 'BK_NOTE', details: `Catatan BK [${statusWarning}] untuk ${m?.name}` });
    } catch (e) { console.error('saveBKNote:', e); }
  };

  return (
    <AttendanceContext.Provider value={{
      members, activities, logs, auditLogs, bkNotes,
      loading, currentUser, login, logout,
      currentRole, setCurrentRole,
      activeMemberId, setActiveMemberId,
      canManageMembers, isAdmin, isBK,
      getMemberById, getMemberByQR, getMemberRaport,
      recordAttendance, recordManualAttendance,
      saveBKNote,
      addMember, updateMember, deleteMember,
      addActivity, updateActivity, deleteActivity,
      logAudit,
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

// ─── Helper: compress image ke base64 (max width px) ─────────────────────────
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
        // JPEG quality 0.75 agar ukuran kecil
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => resolve(e.target.result); // fallback tanpa kompresi
      img.src = e.target.result;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}
