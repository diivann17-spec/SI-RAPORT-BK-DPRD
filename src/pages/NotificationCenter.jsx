import React, { useMemo } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import {
  Bell,
  CalendarClock,
  AlertTriangle,
  FileCheck2,
  Inbox,
  Sparkles,
  ArrowRight
} from 'lucide-react';

const normalizeDateValue = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'object' && typeof value.seconds === 'number') {
    const date = new Date(value.seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

const formatDate = (value) => {
  const date = normalizeDateValue(value);
  if (!date) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

const formatDateTime = (dateString, timeString) => {
  const date = normalizeDateValue(dateString);
  if (!date) return '-';

  if (timeString) {
    const timeDate = new Date(`${dateString}T${timeString || '00:00'}:00`);
    if (Number.isNaN(timeDate.getTime())) return formatDate(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(timeDate);
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export default function NotificationCenter() {
  const { activities, logs, members } = useAttendance();

  const notifications = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const items = [];

    activities.forEach((activity) => {
      if (!activity.date) return;

      const activityDate = normalizeDateValue(activity.date);
      if (!activityDate) return;

      const activityDateOnly = new Date(activityDate);
      activityDateOnly.setHours(0, 0, 0, 0);
      const diffDays = Math.round((activityDateOnly - today) / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 7) {
        items.push({
          id: `agenda-${activity.id}`,
          type: 'agenda',
          typeLabel: 'Agenda Mendatang',
          badgeColor: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
          title: activity.title,
          message: `${activity.category || 'Agenda'} akan dilaksanakan pada ${formatDate(activity.date)}${activity.startTime ? ` pukul ${activity.startTime}` : ''}.`,
          date: activity.date,
          priority: diffDays <= 1 ? 'high' : 'normal'
        });
      }

      if (activity.date && activityDateOnly < today && !logs.some(log => log.activityId === activity.id)) {
        items.push({
          id: `attendance-${activity.id}`,
          type: 'attendance',
          typeLabel: 'Absensi Belum Lengkap',
          badgeColor: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
          title: activity.title,
          message: 'Agenda sudah berakhir, namun belum ada data absensi yang dicatat untuk kegiatan ini.',
          date: activity.date,
          priority: 'medium'
        });
      }

      const lpjSummary = activity.lpjSummary || {};
      const hasAttachments = Array.isArray(lpjSummary.attachments) && lpjSummary.attachments.length > 0;
      const hasPhotos = Array.isArray(lpjSummary.documentationPhotos) && lpjSummary.documentationPhotos.length > 0;

      if (activity.date && activityDateOnly < today && !hasAttachments && !hasPhotos) {
        items.push({
          id: `lpj-${activity.id}`,
          type: 'lpj',
          typeLabel: 'LPJ Belum Lengkap',
          badgeColor: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
          title: activity.title,
          message: 'Dokumen LPJ dan dokumentasi foto belum dilengkapi untuk agenda ini.',
          date: activity.date,
          priority: 'high'
        });
      }
    });

    const redCount = members.filter((member) => {
      const totalAct = activities.length || 1;
      const mLogs = logs.filter(log => log.memberId === member.id);
      let score = 0;

      activities.forEach((activity) => {
        const lg = mLogs.find(log => log.activityId === activity.id);
        if (lg?.status === 'Hadir' || lg?.status === 'Dinas') score += 1;
        else if (lg?.status === 'Terlambat' || lg?.status === 'Izin' || lg?.status === 'Sakit') score += 0.75;
      });

      return Math.round((score / totalAct) * 100) <= 50;
    }).length;

    if (redCount > 0) {
      items.push({
        id: 'ews-summary',
        type: 'ews',
        typeLabel: 'Early Warning System',
        badgeColor: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
        title: `${redCount} anggota masuk kategori merah`,
        message: 'Kehadiran anggota berada di bawah 50% dan perlu evaluasi lebih lanjut.',
        date: new Date().toISOString(),
        priority: 'high'
      });
    }

    return items.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateA - dateB;
    });
  }, [activities, logs, members]);

  const stats = {
    total: notifications.length,
    agenda: notifications.filter(item => item.type === 'agenda').length,
    attendance: notifications.filter(item => item.type === 'attendance').length,
    lpj: notifications.filter(item => item.type === 'lpj').length,
    ews: notifications.filter(item => item.type === 'ews').length
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-100 p-4 shadow-sm ring-1 ring-slate-200/80 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:ring-slate-700/60">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-cyan-500 dark:text-cyan-400">Pusat Notifikasi</p>
            <h1 className="mt-1 text-lg font-black text-slate-900 dark:text-white">Ringkasan Agenda & Peringatan</h1>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 shadow-inner shadow-cyan-500/10">
            <Bell className="w-4 h-4 text-cyan-300" />
            <span className="text-xs font-bold text-cyan-700 dark:text-cyan-200">{stats.total} notifikasi aktif</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<CalendarClock className="w-4 h-4" />} label="Agenda" value={stats.agenda} accent="text-cyan-300" bgClass="from-cyan-50 to-cyan-100/70" />
        <StatCard icon={<Inbox className="w-4 h-4" />} label="Absensi" value={stats.attendance} accent="text-amber-300" bgClass="from-amber-50 to-amber-100/70" />
        <StatCard icon={<FileCheck2 className="w-4 h-4" />} label="LPJ" value={stats.lpj} accent="text-rose-300" bgClass="from-rose-50 to-rose-100/70" />
        <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="EWS" value={stats.ews} accent="text-orange-300" bgClass="from-orange-50 to-orange-100/70" />
        <StatCard icon={<Sparkles className="w-4 h-4" />} label="Total" value={stats.total} accent="text-emerald-300" bgClass="from-emerald-50 to-emerald-100/70" />
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
            Tidak ada notifikasi saat ini. Semua agenda dan dokumen terlihat dalam kondisi baik.
          </div>
        ) : (
          notifications.map((item) => (
            <div key={item.id} className="rounded-3xl border border-slate-200 bg-gradient-to-r from-white via-white to-slate-50 p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
              <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_180px] lg:items-start lg:gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.badgeColor}`}>
                      {item.typeLabel}
                    </span>
                    {item.priority === 'high' && (
                      <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold text-rose-400">
                        Prioritas Tinggi
                      </span>
                    )}
                  </div>

                  <h2 className="mt-2 text-base font-black text-slate-900 dark:text-white">{item.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.message}</p>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 lg:flex-col lg:items-end lg:justify-start lg:py-3">
                  <span className="font-semibold">{item.date ? formatDate(item.date) : 'Tanggal tidak tersedia'}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent, bgClass }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${bgClass} p-3.5 shadow-sm ring-1 ring-slate-200/60 dark:border-slate-800 dark:ring-slate-700/60 dark:from-slate-900 dark:to-slate-950`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-xl border border-slate-300 bg-white/80 p-2 shadow-sm ${accent} dark:border-slate-700 dark:bg-slate-800`}>
          {icon}
        </span>
        <span className="text-2xl font-black text-slate-900 dark:text-white">{value}</span>
      </div>
      <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
