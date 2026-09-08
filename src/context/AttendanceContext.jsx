import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection, doc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp, where, limit
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getRaportCategory, calculateAttendanceStatus } from '../utils/raportUtils';
import { getDeviceFingerprint, validateDeviceSingleAttendance } from '../utils/deviceUtils';
// Mock data dihapus — app mulai kosong, data dari Firestore / input manual

const AttendanceContext = createContext();

const COL = {
  MEMBERS:    'members',
  ACTIVITIES: 'activities',
  LOGS:       'attendanceLogs',
  AUDIT:      'auditTrails',
  BK_NOTES:   'bkNotes',
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
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
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
  const [loading, setLoading] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try { localStorage.setItem('siraport_logs', JSON.stringify(logs)); } catch (e) {}
  }, [logs]);

  useEffect(() => {
    try { localStorage.setItem('siraport_activities', JSON.stringify(activities)); } catch (e) {}
  }, [activities]);

  useEffect(() => {
    try { localStorage.setItem('siraport_members', JSON.stringify(members)); } catch (e) {}
  }, [members]);

  useEffect(() => {
    try { localStorage.setItem('siraport_audit', JSON.stringify(auditLogs)); } catch (e) {}
  }, [auditLogs]);

  // BroadcastChannel & window storage listener for instant cross-tab / cross-window sync
  useEffect(() => {
    let bc;
    try {
      bc = new BroadcastChannel('siraport_sync_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'LOGS_UPDATED' && Array.isArray(event.data.logs)) {
          setLogs(event.data.logs);
        }
        if (event.data?.type === 'ACTIVITIES_UPDATED' && Array.isArray(event.data.activities)) {
          setActivities(event.data.activities);
        }
        if (event.data?.type === 'MEMBERS_UPDATED' && Array.isArray(event.data.members)) {
          setMembers(event.data.members);
        }
      };
    } catch (e) {}

    const handleStorage = (e) => {
      if (e.key === 'siraport_logs' && e.newValue) {
        try { setLogs(JSON.parse(e.newValue)); } catch (err) {}
      }
      if (e.key === 'siraport_activities' && e.newValue) {
        try { setActivities(JSON.parse(e.newValue)); } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

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

  // ─── Realtime Firestore listeners with auto-seed and robust multi-device sync ───
  useEffect(() => {
    const unsubs = [];
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

      // 2. Listen Activities
      unsubs.push(onSnapshot(collection(db, COL.ACTIVITIES), (snap) => {
        if (!snap.empty) {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          data.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          setActivities(data);
        }
        // Firestore kosong = belum ada kegiatan, user perlu buat baru
      }, err => console.warn('Firestore activities fallback:', err.message)));

      // 3. Listen Attendance Logs (Cross-Device Realtime Sync)
      unsubs.push(onSnapshot(collection(db, COL.LOGS), (snap) => {
        if (!snap.empty) {
          const firestoreLogs = snap.docs.map(d => {
            const raw = d.data();
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
              timestamp: tsStr
            };
          });

          setLogs(prev => {
            const map = new Map();
            // Masukkan data default/local dulu
            prev.forEach(l => map.set(l.id, l));
            // Timpa dengan data live Firestore dari HP/perangkat lain
            firestoreLogs.forEach(l => map.set(l.id, l));
            const merged = Array.from(map.values()).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
            try { localStorage.setItem('siraport_logs', JSON.stringify(merged)); } catch (e) {}
            return merged;
          });
        }
        // Firestore kosong = belum ada log absensi
      }, err => console.warn('Firestore logs fallback:', err.message)));

      // 4. Listen Audit Logs
      unsubs.push(onSnapshot(collection(db, COL.AUDIT), (snap) => {
        if (!snap.empty) {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          data.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
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
    } catch (e) {
      console.warn('Firestore setup error (running with rich local state):', e);
    }

    return () => unsubs.forEach(u => u && u());
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const getMemberById = useCallback((id) => members.find(m => m.id === id), [members]);
  const getMemberByQR = useCallback((token) => members.find(m => m.qrToken === token || m.id === token), [members]);
  const getActivityById = useCallback((id) => activities.find(a => a.id === id), [activities]);
  const getActivityByQR = useCallback((token) => activities.find(a => a.qrToken === token || a.id === token), [activities]);

  const isAdmin = currentRole === 'SECRETARIAT_ADMIN';
  const isBK = currentRole === 'PETUGAS_BK';
  const canManageMembers = isAdmin || isBK;

  // ─── Audit Trail ─────────────────────────────────────────────────────────
  const logAudit = useCallback(async ({ action, details, method }) => {
    try {
      const newAudit = {
        id: `AUD-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userRole: currentRole,
        userName: currentUser?.name || 'Petugas Sistem',
        action,
        details,
        method: method || 'SYSTEM',
      };
      setAuditLogs(prev => [newAudit, ...prev]);

      await addDoc(collection(db, COL.AUDIT), {
        ...newAudit,
        timestamp: serverTimestamp(),
      });
    } catch (e) { /* fallback offline */ }
  }, [currentRole, currentUser]);

  // ─── Raport Score Khusus Anggota DPRD ──────────────────────────────────────
  const getMemberRaport = useCallback((memberId, categoryFilter = 'ALL', maxMonth = null) => {
    // Pastikan hanya menghitung log dengan participantType !== 'EXTERNAL' dan memberId match
    const memberLogs = logs.filter(l => l.memberId === memberId && l.participantType !== 'EXTERNAL');
    let relevantActivities = categoryFilter === 'ALL'
      ? activities
      : activities.filter(a => {
          if (!a.category) return false;
          const aCat = a.category.toLowerCase();
          const fCat = categoryFilter.toLowerCase();
          return aCat === fCat || aCat.includes(fCat) || fCat.includes(aCat);
        });

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
      const st = (log?.status || '').toLowerCase();
      if (!log || st === 'tanpa keterangan' || st === 'alpha' || st === 'alpa') {
        alpa++;
      } else if (st === 'hadir' || st === 'hadir tepat waktu') {
        score += 1;
        hadir++;
      } else if (st === 'terlambat' || st === 'hadir terlambat') {
        score += 0.8;
        terlambat++;
      } else if (st === 'dinas' || st === 'dinas luar' || st === 'tugas kedinasan') {
        score += 1;
        dinas++;
      } else if (st === 'izin') {
        score += 0.75;
        izin++;
      } else if (st === 'sakit') {
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
      totalMandatory: relevantActivities.length,
      attendedCount: Math.round(score * 10) / 10,
      breakdown: { hadir, terlambat, dinas, izin, sakit, alpa }
    };
  }, [logs, activities]);

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
    sptFile = null,
    ignoreDeviceLock = false,
    ignoreDuplicateCheck = false
  }) => {
    try {
      const member = getMemberById(memberId);
      const activity = activities.find(a => a.id === activityId);
      if (!member) return { success: false, message: 'Data Anggota DPRD tidak ditemukan.' };
      if (!activity) return { success: false, message: 'Agenda Kegiatan tidak ditemukan.' };

      // Validasi 1 Member Hanya Bisa 1x Absen per Agenda (Cegah Duplikat Absen Mandiri/Scan)
      if (!ignoreDuplicateCheck) {
        const existingLog = logs.find(l => l.activityId === activityId && l.memberId === memberId);
        if (existingLog) {
          return {
            success: false,
            message: `Absensi Gagal: ${member.name} sudah melakukan presensi pada agenda ini sebelumnya pada pukul ${new Date(existingLog.timestamp).toLocaleTimeString('id-ID')} WIB. (Tidak bisa absen 2x).`
          };
        }
      }

      // Validasi 1 Perangkat 1x Absensi (Anti-Titip Absen)
      const deviceInfo = getDeviceFingerprint();
      if (!ignoreDeviceLock && method !== 'MANUAL_OVERRIDE') {
        const deviceCheck = validateDeviceSingleAttendance(activityId, memberId, logs);
        if (!deviceCheck.allowed) {
          return { success: false, message: deviceCheck.message, isDeviceBlocked: true };
        }
      }

      // Validasi Waktu Otomatis (Belum Dimulai / Kedaluwarsa / Terlambat)
      let calculatedStatus = status;
      let diffNote = '';
      if (!calculatedStatus || method === 'QR_AGENDA' || method === 'QR_WEBCAM' || method === 'GPS_ONLINE') {
        const timeCalc = calculateAttendanceStatus(activity, new Date());
        if (timeCalc.isNotStarted && method !== 'MANUAL_OVERRIDE') {
          return {
            success: false,
            message: `Absensi Gagal: ${timeCalc.message}`
          };
        }
        if (timeCalc.isExpired && method !== 'MANUAL_OVERRIDE') {
          return {
            success: false,
            message: `Absensi Gagal: QR Code kegiatan sudah kedaluwarsa. Agenda telah selesai pada pukul ${activity.endTime || '16:00'} WIB.`
          };
        }
        calculatedStatus = calculatedStatus || timeCalc.status;
        diffNote = timeCalc.message;
      }

      const newLog = {
        id: `ATT-${Date.now()}`,
        activityId,
        participantType: 'INTERNAL',
        memberId,
        memberName: member.name,
        timestamp: new Date().toISOString(),
        status: calculatedStatus,
        method,
        operatorName: operatorName || currentUser?.name || 'Mandiri (Mobile Scan)',
        lat,
        lng,
        distanceMeters,
        deviceId: deviceInfo.deviceId,
        deviceType: deviceInfo.deviceType,
        deviceOS: deviceInfo.os,
        deviceBrowser: deviceInfo.browser,
        sptNumber,
        sptFile,
        note: note || diffNote || `Absensi ${calculatedStatus}`
      };

      // Simpan log ke state lokal & broadcast ke tab lain
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

      try {
        await setDoc(doc(db, COL.LOGS, newLog.id), {
          ...newLog,
          createdAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.warn('Firestore write warning (offline fallback active):', e);
      }

      await logAudit({
        action: 'ATTENDANCE_RECORDED',
        details: `Presensi [${calculatedStatus}] ${member.name} pada agenda "${activity.title}" via ${method} (Perangkat: ${deviceInfo.deviceType})`,
        method,
      });

      return { success: true, log: newLog };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── Record Attendance Eksternal / OPD / Tamu / Delegasi ───────────────────
  const recordGuestAttendance = async ({
    activityId,
    agency,
    invitedName,
    guestId = null,
    isRepresented = false,
    representativeName = '',
    representativePosition = '',
    status = 'Hadir',
    note = '',
    operatorName = null
  }) => {
    try {
      const activity = activities.find(a => a.id === activityId);
      if (!activity) return { success: false, message: 'Agenda kegiatan tidak ditemukan.' };
      if (!agency) return { success: false, message: 'Nama Instansi / OPD wajib diisi.' };

      const deviceInfo = getDeviceFingerprint();
      const currentGuestId = guestId || `GST-${Date.now()}`;

      // Validasi 1 Tamu / Instansi Hanya Bisa 1x Absen per Agenda (Cegah Duplikat Absen)
      const existingGuestLog = logs.find(l => 
        l.activityId === activityId && 
        l.participantType === 'EXTERNAL' && 
        ((l.guestId && l.guestId === currentGuestId) || (l.agency && l.agency.toLowerCase() === agency.toLowerCase() && l.invitedName?.toLowerCase() === (invitedName || '').toLowerCase()))
      );
      if (existingGuestLog) {
        return {
          success: false,
          message: `Absensi Gagal: Tamu/Instansi "${agency}" (${invitedName}) sudah terdaftar hadir pada agenda ini sebelumnya.`
        };
      }

      // Validasi Waktu Otomatis untuk Tamu OPD
      const timeCalc = calculateAttendanceStatus(activity, new Date());
      if (timeCalc.isNotStarted) {
        return {
          success: false,
          message: `Absensi Tamu Gagal: ${timeCalc.message}`
        };
      }
      if (timeCalc.isExpired) {
        return {
          success: false,
          message: `Absensi Tamu Gagal: Agenda telah selesai pada pukul ${activity.endTime || '16:00'} WIB.`
        };
      }

      // Validasi 1 Perangkat 1x Absensi per Agenda

      // Validasi status perwakilan
      const finalStatus = isRepresented ? 'Diwakili' : status;

      const newLog = {
        id: `ATT-GST-${Date.now()}`,
        activityId,
        participantType: 'EXTERNAL',
        guestId: currentGuestId,
        agency,
        guestAgency: agency,
        invitedName: invitedName || 'Pejabat Terkait',
        guestName: isRepresented && representativeName ? `${representativeName} (Perwakilan ${invitedName})` : (invitedName || agency),
        isRepresented,
        representativeName: isRepresented ? representativeName : null,
        representativePosition: isRepresented ? representativePosition : null,
        timestamp: new Date().toISOString(),
        status: finalStatus,
        method: 'GUEST_CHECKIN',
        operatorName: operatorName || currentUser?.name || 'Meja Tamu OPD',
        deviceId: deviceInfo.deviceId,
        deviceType: deviceInfo.deviceType,
        note: note || (isRepresented ? `Dihadiri oleh perwakilan: ${representativeName} (${representativePosition})` : 'Hadir langsung')
      };

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

      try {
        await setDoc(doc(db, COL.LOGS, newLog.id), {
          ...newLog,
          createdAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.warn('Firestore guest write warning (offline fallback active):', e);
      }

      await logAudit({
        action: 'GUEST_CHECKIN',
        details: `Check-in Tamu Eksternal [${agency}] - ${isRepresented ? `Diwakili: ${representativeName}` : invitedName} pada "${activity.title}"`,
        method: 'GUEST_CHECKIN'
      });

      return { success: true, log: newLog };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const recordManualAttendance = async ({ activityId, memberId, status, note, operatorName, sptNumber, sptFile }) => {
    return recordAttendance({
      activityId,
      memberId,
      status,
      method: 'MANUAL_OVERRIDE',
      operatorName,
      note,
      sptNumber,
      sptFile,
      ignoreDeviceLock: true,
      ignoreDuplicateCheck: true
    });
  };

  // ─── LPJ Generator Helper ─────────────────────────────────────────────────
  const getLPJData = useCallback((activityId) => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return null;

    const actLogs = logs.filter(l => l.activityId === activityId);
    const internalLogs = actLogs.filter(l => l.participantType !== 'EXTERNAL');
    const externalLogs = actLogs.filter(l => l.participantType === 'EXTERNAL');

    // Rekap Anggota Dewan
    const internalStats = {
      totalMandatory: members.length,
      hadir: internalLogs.filter(l => l.status === 'Hadir' || l.status === 'Hadir Tepat Waktu').length,
      terlambat: internalLogs.filter(l => l.status === 'Terlambat' || l.status === 'Hadir Terlambat').length,
      dinasLuar: internalLogs.filter(l => l.status === 'Dinas Luar' || l.status === 'Dinas').length,
      izin: internalLogs.filter(l => l.status === 'Izin').length,
      sakit: internalLogs.filter(l => l.status === 'Sakit').length,
      alpha: members.length - internalLogs.length
    };

    // Rekap Tamu Eksternal / OPD
    const invitedTotal = activity.invitedGuests?.length || externalLogs.length;
    const externalStats = {
      totalInvited: invitedTotal,
      hadirLangsung: externalLogs.filter(l => l.status === 'Hadir' && !l.isRepresented).length,
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
      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, lpjSummary: { ...a.lpjSummary, ...lpjSummary } } : a));
      try {
        await updateDoc(doc(db, COL.ACTIVITIES, activityId), {
          lpjSummary,
          updatedAt: serverTimestamp()
        });
      } catch (e) { /* fallback */ }
      await logAudit({ action: 'UPDATE_LPJ', details: `Memperbarui notulen dan dokumentasi LPJ kegiatan: ${activityId}` });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── Member CRUD ─────────────────────────────────────────────────────────
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
      if (photoUrl !== undefined) cleanData.photo = photoUrl;

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
      setAuditLogs([]);
      setBkNotes({});

      // 2. Bersihkan localStorage
      localStorage.removeItem('siraport_members');
      localStorage.removeItem('siraport_activities');
      localStorage.removeItem('siraport_logs');
      localStorage.removeItem('siraport_audit');
      localStorage.removeItem('siraport_active_member_id');

      // 3. Bersihkan dokumen di Firestore jika terhubung
      try {
        const collectionsToClear = [COL.MEMBERS, COL.ACTIVITIES, COL.LOGS, COL.AUDIT, COL.BK_NOTES];
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

  return (
    <AttendanceContext.Provider value={{
      members, activities, logs, auditLogs, bkNotes,
      loading, currentUser, login, logout,
      currentRole, setCurrentRole,
      activeMemberId, setActiveMemberId,
      canManageMembers, isAdmin, isBK,
      getMemberById, getMemberByQR, getActivityById, getActivityByQR, getMemberRaport,
      recordAttendance, recordGuestAttendance, recordManualAttendance,
      getLPJData, updateLPJSummary,
      saveBKNote,
      addMember, updateMember, deleteMember,
      addActivity, updateActivity, deleteActivity, clearActivityAttendance,
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
