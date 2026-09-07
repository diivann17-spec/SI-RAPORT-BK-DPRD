import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection, doc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp, where, limit
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getRaportCategory } from '../utils/raportUtils';
import {
  INITIAL_MEMBERS,
  INITIAL_ACTIVITIES,
  INITIAL_ATTENDANCE_LOGS,
  INITIAL_AUDIT_TRAILS,
  INITIAL_BK_NOTES
} from '../firebase/mockData';

const AttendanceContext = createContext();

const COL = {
  MEMBERS:    'members',
  ACTIVITIES: 'activities',
  LOGS:       'attendanceLogs',
  AUDIT:      'auditTrails',
  BK_NOTES:   'bkNotes',
};

// Konversi file gambar → base64 string
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AttendanceProvider({ children }) {
  // Inisialisasi awal dengan data mock default agar aplikasi langsung render tanpa menunggu Firestore
  const [members,    setMembers]    = useState(INITIAL_MEMBERS);
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);
  const [logs,       setLogs]       = useState(INITIAL_ATTENDANCE_LOGS);
  const [auditLogs,  setAuditLogs]  = useState(INITIAL_AUDIT_TRAILS);
  const [bkNotes,    setBkNotes]    = useState(INITIAL_BK_NOTES);
  const [loading,    setLoading]    = useState(false);

  // Role: 'SECRETARIAT_ADMIN' | 'PETUGAS_BK' | 'PETUGAS_SCAN' | 'ANGGOTA_DPRD'
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('siraport_user');
      return stored ? JSON.parse(stored) : {
        role: 'PETUGAS_BK',
        username: 'bk_dprd',
        name: 'Badan Kehormatan (BK)',
        memberId: 'DPRD-003',
        roleLabel: 'Badan Kehormatan (BK)'
      };
    } catch (e) {
      return {
        role: 'PETUGAS_BK',
        username: 'bk_dprd',
        name: 'Badan Kehormatan (BK)',
        memberId: 'DPRD-003',
        roleLabel: 'Badan Kehormatan (BK)'
      };
    }
  });

  const [currentRole, setCurrentRole] = useState(
    () => currentUser?.role || localStorage.getItem('siraport_role') || 'PETUGAS_BK'
  );
  const [activeMemberId, setActiveMemberId] = useState(
    () => currentUser?.memberId || localStorage.getItem('siraport_active_member_id') || 'DPRD-001'
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
      memberId: memberId || activeMemberId || 'DPRD-001',
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

  // ─── Realtime Firestore listeners with safe fallback ──────────────────────────
  useEffect(() => {
    const unsubs = [];

    try {
      unsubs.push(onSnapshot(
        collection(db, COL.MEMBERS),
        (snap) => {
          if (!snap.empty) {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setMembers(data);
            if (!localStorage.getItem('siraport_active_member_id') && data.length > 0) {
              setActiveMemberId(data[0].id);
            }
          }
        },
        err => {
          console.warn('Firestore members onSnapshot (using fallback):', err.message);
        }
      ));

      unsubs.push(onSnapshot(
        collection(db, COL.ACTIVITIES),
        (snap) => {
          if (!snap.empty) {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            setActivities(data);
          }
        },
        err => console.warn('Firestore activities onSnapshot (using fallback):', err.message)
      ));

      unsubs.push(onSnapshot(
        collection(db, COL.LOGS),
        (snap) => {
          if (!snap.empty) {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => {
              const tA = a.timestampISO || (a.timestamp?.toDate ? a.timestamp.toDate().toISOString() : '');
              const tB = b.timestampISO || (b.timestamp?.toDate ? b.timestamp.toDate().toISOString() : '');
              return tB.localeCompare(tA);
            });
            setLogs(data);
          }
        },
        err => console.warn('Firestore logs onSnapshot (using fallback):', err.message)
      ));

      unsubs.push(onSnapshot(
        collection(db, COL.AUDIT),
        (snap) => {
          if (!snap.empty) {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => {
              const tA = a.timestampISO || (a.timestamp?.toDate ? a.timestamp.toDate().toISOString() : '');
              const tB = b.timestampISO || (b.timestamp?.toDate ? b.timestamp.toDate().toISOString() : '');
              return tB.localeCompare(tA);
            });
            setAuditLogs(data);
          }
        },
        err => console.warn('Firestore audit onSnapshot (using fallback):', err.message)
      ));

      unsubs.push(onSnapshot(
        collection(db, COL.BK_NOTES),
        (snap) => {
          if (!snap.empty) {
            const result = {};
            snap.docs.forEach(d => { result[d.id] = d.data(); });
            setBkNotes(result);
          }
        },
        err => console.warn('bkNotes onSnapshot (using fallback):', err.message)
      ));
    } catch (e) {
      console.warn('Firestore setup error (running in local mock mode):', e);
    }

    return () => unsubs.forEach(u => u && u());
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const getMemberById  = useCallback((id)      => members.find(m => m.id === id),      [members]);
  const getMemberByQR  = useCallback((token)   => members.find(m => m.qrToken === token || m.id === token), [members]);

  // ─── Role helpers ─────────────────────────────────────────────────────────────
  const isAdmin    = currentRole === 'SECRETARIAT_ADMIN';
  const isBK       = currentRole === 'PETUGAS_BK';
  const canManageMembers = isAdmin || isBK;

  // ─── Audit Trail ─────────────────────────────────────────────────────────────
  const logAudit = useCallback(async ({ action, details, method }) => {
    try {
      const newAudit = {
        id: `AUD-${Date.now()}`,
        timestamp: new Date().toISOString(),
        timestampISO: new Date().toISOString(),
        userRole:  currentRole,
        userName:  currentUser?.name || 'Petugas Sistem',
        action,
        details,
        method: method || 'SYSTEM',
      };
      setAuditLogs(prev => [newAudit, ...prev]);

      await addDoc(collection(db, COL.AUDIT), {
        ...newAudit,
        timestamp: serverTimestamp(),
      });
    } catch (e) { /* ignore offline */ }
  }, [currentRole, currentUser]);

  // ─── Raport Score ─────────────────────────────────────────────────────────────
  const getMemberRaport = useCallback((memberId, categoryFilter = 'ALL', maxMonth = null) => {
    const memberLogs = logs.filter(l => l.memberId === memberId);
    let relevantActivities = categoryFilter === 'ALL'
      ? activities
      : activities.filter(a => a.category === categoryFilter);

    if (maxMonth !== null && maxMonth !== undefined && maxMonth !== 'ALL') {
      const monthNum = parseInt(maxMonth, 10);
      relevantActivities = relevantActivities.filter(a => {
        if (!a.date) return true;
        const actMonth = new Date(a.date).getMonth() + 1;
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

  // ─── Add Member ──────────────────────────────────────────────────────────────
  const addMember = async (memberData, photoFile = null) => {
    if (!canManageMembers) return { success: false, message: 'Hanya BK dan Admin yang bisa menambahkan anggota.' };
    try {
      let photoUrl = memberData.photo || '';
      if (photoFile) {
        photoUrl = await compressImageToBase64(photoFile, 400);
      }

      const generatedId = `DPRD-${String(members.length + 1).padStart(3, '0')}`;
      const newMember = {
        id: generatedId,
        ...memberData,
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

      await logAudit({
        action:  'ADD_MEMBER',
        details: `Menambah anggota baru: ${newMember.name} (${newMember.fraksi})`,
      });

      return { success: true, id: generatedId };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── Update Member ───────────────────────────────────────────────────────────
  const updateMember = async (memberId, updateData, photoFile = null) => {
    if (!canManageMembers) return { success: false, message: 'Hanya BK dan Admin yang bisa mengubah data anggota.' };
    try {
      let photoUrl = updateData.photo;
      if (photoFile) {
        photoUrl = await compressImageToBase64(photoFile, 400);
      }

      const cleanData = { ...updateData };
      if (photoUrl !== undefined) cleanData.photo = photoUrl;

      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, ...cleanData } : m));

      try {
        await updateDoc(doc(db, COL.MEMBERS, memberId), {
          ...cleanData,
          updatedAt: serverTimestamp(),
        });
      } catch (e) { /* fallback */ }

      await logAudit({
        action:  'UPDATE_MEMBER',
        details: `Update data anggota: ${cleanData.name || memberId}`,
      });

      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── Delete Member ───────────────────────────────────────────────────────────
  const deleteMember = async (memberId) => {
    if (!canManageMembers) return { success: false, message: 'Hanya BK dan Admin yang bisa menghapus anggota.' };
    try {
      const member = getMemberById(memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));

      try {
        await deleteDoc(doc(db, COL.MEMBERS, memberId));
      } catch (e) { /* fallback */ }

      await logAudit({
        action:  'DELETE_MEMBER',
        details: `Menghapus anggota: ${member?.name || memberId}`,
      });

      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── Activities CRUD ─────────────────────────────────────────────────────────
  const addActivity = async (actData) => {
    try {
      const generatedId = `ACT-2026-${String(activities.length + 1).padStart(3, '0')}`;
      const newAct = {
        id: generatedId,
        ...actData,
        status: actData.status || 'ACTIVE',
      };
      setActivities(prev => [newAct, ...prev]);

      try {
        await setDoc(doc(db, COL.ACTIVITIES, generatedId), {
          ...newAct,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (e) { /* fallback */ }

      await logAudit({ action: 'ADD_ACTIVITY', details: `Membuat kegiatan: ${newAct.title}` });
      return { success: true, id: generatedId };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const updateActivity = async (activityId, actData) => {
    try {
      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, ...actData } : a));
      try {
        await updateDoc(doc(db, COL.ACTIVITIES, activityId), {
          ...actData,
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
      try {
        await deleteDoc(doc(db, COL.ACTIVITIES, activityId));
      } catch (e) { /* fallback */ }
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── Record Attendance ───────────────────────────────────────────────────────
  const recordAttendance = async ({ activityId, memberId, status = 'Hadir', method = 'QR_WEBCAM', operatorName, lat, lng, distanceMeters, note, photoFile = null }) => {
    try {
      const member = getMemberById(memberId);
      const activity = activities.find(a => a.id === activityId);
      if (!member || !activity) return { success: false, message: 'Data tidak ditemukan' };

      const newLog = {
        id: `ATT-${Date.now()}`,
        activityId,
        memberId,
        timestamp: new Date().toISOString(),
        timestampISO: new Date().toISOString(),
        status,
        method,
        operatorName: operatorName || currentUser?.name || 'Petugas Absensi',
        lat: lat || null,
        lng: lng || null,
        distanceMeters: distanceMeters !== undefined ? distanceMeters : 12,
        note: note || `Absensi ${status}`,
      };

      setLogs(prev => [newLog, ...prev.filter(l => !(l.activityId === activityId && l.memberId === memberId))]);

      try {
        await addDoc(collection(db, COL.LOGS), {
          ...newLog,
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      } catch (e) { /* fallback */ }

      await logAudit({
        action: 'ATTENDANCE_RECORDED',
        details: `Presensi [${status}] ${member.name} pada ${activity.title} (${method})`,
        method,
      });

      return { success: true, log: newLog };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const recordManualAttendance = async ({ activityId, memberId, status, note, operatorName }) => {
    return recordAttendance({
      activityId,
      memberId,
      status,
      method: 'MANUAL_OVERRIDE',
      operatorName,
      note,
    });
  };

  // ─── BK Note ─────────────────────────────────────────────────────────────────
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
