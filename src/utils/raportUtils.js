/**
 * Raport & Attendance Category Utilities for SI-RAPORT BK DPRD
 * Kategori Raport Kehadiran:
 * - 81% - 100%: Hijau (Baik)
 * - 51% - 80% : Kuning (Cukup / Perlu Perhatian)
 * - 0%  - 50% : Merah (Perlu Evaluasi Khusus BK / Teguran)
 */

export function getRaportCategory(percentage) {
  const score = Number(percentage) || 0;
  if (score >= 81) {
    return {
      key: 'GREEN',
      label: 'Hijau (Baik)',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
      pillBg: 'bg-emerald-500',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      statusText: 'Kedisiplinan Memuaskan',
      recommendation: 'Memenuhi standar kehadiran kedinasan DPRD.'
    };
  } else if (score >= 51) {
    return {
      key: 'YELLOW',
      label: 'Kuning (Cukup)',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
      pillBg: 'bg-amber-500',
      textColor: 'text-amber-600 dark:text-amber-400',
      statusText: 'Perlu Peningkatan',
      recommendation: 'Menerima Notifikasi Peringatan Dini (EWS) dari Badan Kehormatan.'
    };
  } else {
    return {
      key: 'RED',
      label: 'Merah (Perlu Evaluasi BK)',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
      pillBg: 'bg-rose-500',
      textColor: 'text-rose-600 dark:text-rose-400',
      statusText: 'Evaluasi Khusus BK',
      recommendation: 'Memerlukan Pemanggilan & Klarifikasi Resmi oleh Badan Kehormatan.'
    };
  }
}

export function getDisciplineGrade(percentage, thresholds = {}) {
  const score = Number(percentage) || 0;
  const excellent = Number(thresholds.excellent ?? 90);
  const good = Number(thresholds.good ?? 80);
  const fair = Number(thresholds.fair ?? 70);
  const poor = Number(thresholds.poor ?? 60);
  if (score >= excellent) return { grade: 'A', label: 'Sangat Baik' };
  if (score >= good) return { grade: 'B', label: 'Baik' };
  if (score >= fair) return { grade: 'C', label: 'Cukup' };
  if (score >= poor) return { grade: 'D', label: 'Kurang' };
  return { grade: 'E', label: 'Sangat Kurang' };
}

export function getStatusBadge(status) {
  switch (status?.toLowerCase()) {
    case 'hadir tepat waktu':
    case 'hadir':
      return { label: 'Hadir Tepat Waktu', bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-800' };
    case 'terlambat':
    case 'hadir terlambat':
      return { label: 'Terlambat', bg: 'bg-amber-500/10 text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-800' };
    case 'dinas':
    case 'dinas luar':
    case 'tugas kedinasan':
      return { label: 'Dinas Luar', bg: 'bg-indigo-500/10 text-indigo-600 border-indigo-300 dark:text-indigo-400 dark:border-indigo-800' };
    case 'diwakili':
      return { label: 'Diwakili (Delegasi)', bg: 'bg-cyan-500/10 text-cyan-600 border-cyan-300 dark:text-cyan-400 dark:border-cyan-800' };
    case 'izin':
      return { label: 'Izin', bg: 'bg-blue-500/10 text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-800' };
    case 'sakit':
      return { label: 'Sakit', bg: 'bg-purple-500/10 text-purple-600 border-purple-300 dark:text-purple-400 dark:border-purple-800' };
    case 'belum diverifikasi':
      return { label: 'Menunggu Verifikasi', bg: 'bg-orange-500/10 text-orange-600 border-orange-300 dark:text-orange-400 dark:border-orange-800' };
    case 'tanpa keterangan':
    case 'tidak hadir':
    case 'alpha':
    case 'alpa':
    default:
      return { label: 'Alpha', bg: 'bg-rose-500/10 text-rose-600 border-rose-300 dark:text-rose-400 dark:border-rose-800' };
  }
}

export function getMethodBadge(method) {
  switch (method?.toUpperCase()) {
    case 'QR_AGENDA':
    case 'QR_SCAN':
      return { label: 'QR Code Agenda', icon: '📱', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
    case 'QR_WEBCAM':
      return { label: 'QR Webcam Laptop', icon: '📷', bg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' };
    case 'GPS_ONLINE':
      return { label: 'GPS Online Mobile', icon: '📍', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' };
    case 'GUEST_CHECKIN':
      return { label: 'Portal Tamu OPD', icon: '🏢', bg: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' };
    case 'MANUAL_OVERRIDE':
    case 'MANUAL':
      return { label: 'Manual Petugas', icon: '✍️', bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' };
    default:
      return { label: method || 'Sistem', icon: '💻', bg: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' };
  }
}

/**
 * Menghitung status kehadiran otomatis berdasarkan waktu scan terhadap jadwal kegiatan dan batas toleransi
 * @param {Object} activity - Objek kegiatan (date, startTime, endTime, toleranceMinutes)
 * @param {Date} [scanDate=new Date()] - Waktu saat scan dilakukan
 * @returns {{ status: string, isExpired: boolean, isLate: boolean, minutesDiff: number, message: string }}
 */
export function calculateAttendanceStatus(activity, scanDate = new Date()) {
  if (!activity) return { status: 'Hadir', isExpired: false, isLate: false, minutesDiff: 0, message: 'Kegiatan valid' };

  try {
    const actDateStr = activity.date; // YYYY-MM-DD
    const [startH, startM] = (activity.startTime || '08:00').split(':').map(Number);
    const [endH, endM] = (activity.endTime || '16:00').split(':').map(Number);
    const tolerance = Number(activity.toleranceMinutes ?? 30);

    // Dapatkan tanggal dan jam di zona waktu Indonesia Barat (WIB / UTC+7)
    const now = new Date(scanDate);
    const nowWibStr = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const nowWib = new Date(nowWibStr);

    const [year, month, day] = actDateStr.split('-').map(Number);
    const startDateTime = new Date(year, month - 1, day, startH, startM, 0);
    const toleranceDateTime = new Date(startDateTime.getTime() + tolerance * 60 * 1000);
    const endDateTime = new Date(year, month - 1, day, endH, endM, 0);

    // Cek apakah agenda belum dimulai (QR Belum Aktif)
    if (nowWib < startDateTime) {
      const waitMins = Math.round((startDateTime - nowWib) / 60000);
      return {
        status: 'Belum Dibuka',
        isNotStarted: true,
        isExpired: false,
        isLate: false,
        minutesDiff: waitMins,
        message: `Absensi belum dibuka. Agenda dimulai pukul ${activity.startTime || '08:00'} WIB (${waitMins} menit lagi).`
      };
    }

    // Cek apakah agenda sudah berakhir (QR Expired)
    if (nowWib > endDateTime) {
      return {
        status: 'Alpha',
        isNotStarted: false,
        isExpired: true,
        isLate: true,
        minutesDiff: Math.round((nowWib - endDateTime) / 60000),
        message: `QR Code kegiatan sudah kedaluwarsa (Agenda telah berakhir pukul ${activity.endTime || '16:00'} WIB).`
      };
    }

    // Cek apakah scan dilakukan melewati batas toleransi
    if (nowWib > toleranceDateTime) {
      const lateMins = Math.round((nowWib - startDateTime) / 60000);
      return {
        status: 'Terlambat',
        isNotStarted: false,
        isExpired: false,
        isLate: true,
        minutesDiff: lateMins,
        message: `Absensi tercatat Terlambat (${lateMins} menit setelah jadwal dimulai).`
      };
    }

    return {
      status: 'Hadir',
      isNotStarted: false,
      isExpired: false,
      isLate: false,
      minutesDiff: 0,
      message: 'Hadir tepat waktu.'
    };
  } catch (err) {
    return { status: 'Hadir', isNotStarted: false, isExpired: false, isLate: false, minutesDiff: 0, message: 'Status default' };
  }
}

/**
 * Format timestamp ISO / Firestore / Date string ke format jam WIB lokal yang akurat (HH:mm WIB)
 * @param {string|Date} timestamp
 * @param {boolean} [includeSeconds=false]
 * @returns {string}
 */
export function formatLiveTimestamp(timestamp, includeSeconds = false) {
  if (!timestamp) return '-';
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return String(timestamp);
    return d.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {})
    }).replace('.', ':') + ' WIB';
  } catch (e) {
    return String(timestamp);
  }
}


