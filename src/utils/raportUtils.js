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

export function getStatusBadge(status) {
  switch (status?.toLowerCase()) {
    case 'hadir':
      return { label: 'Hadir', bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800' };
    case 'terlambat':
      return { label: 'Terlambat', bg: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800' };
    case 'izin':
      return { label: 'Izin', bg: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800' };
    case 'sakit':
      return { label: 'Sakit', bg: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:text-purple-400 dark:border-purple-800' };
    case 'dinas':
      return { label: 'Dinas Luar', bg: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:text-indigo-400 dark:border-indigo-800' };
    case 'tanpa keterangan':
    case 'alpa':
    default:
      return { label: 'Tanpa Keterangan', bg: 'bg-rose-500/10 text-rose-600 border-rose-200 dark:text-rose-400 dark:border-rose-800' };
  }
}

export function getMethodBadge(method) {
  switch (method?.toUpperCase()) {
    case 'QR_WEBCAM':
      return { label: 'QR Code (Webcam)', icon: '📷', bg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' };
    case 'GPS_ONLINE':
      return { label: 'GPS Online Mobile', icon: '📍', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' };
    case 'MANUAL_OVERRIDE':
    case 'MANUAL':
      return { label: 'Manual Petugas', icon: '✍️', bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' };
    default:
      return { label: method || 'Sistem', icon: '💻', bg: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' };
  }
}
