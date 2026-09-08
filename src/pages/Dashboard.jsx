import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { getRaportCategory, formatLiveTimestamp } from '../utils/raportUtils';
import {
  Users,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  Building2,
  Calendar,
  Filter,
  ArrowRight,
  ShieldAlert,
  Camera,
  FileText,
  CreditCard,
  MapPin,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  QrCode
} from 'lucide-react';

export default function Dashboard({ onNavigate }) {
  const {
    members,
    activities,
    logs,
    getMemberRaport,
    currentRole,
    currentUser
  } = useAttendance();

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedDashboardActivityId, setSelectedDashboardActivityId] = useState('');

  // Calculate metrics for all members
  const memberStats = members.map(m => ({
    member: m,
    raport: getMemberRaport(m.id, categoryFilter)
  }));

  const greenMembers = memberStats.filter(s => s.raport.categoryInfo.key === 'GREEN');
  const yellowMembers = memberStats.filter(s => s.raport.categoryInfo.key === 'YELLOW');
  const redMembers = memberStats.filter(s => s.raport.categoryInfo.key === 'RED');

  const avgPercentage = memberStats.length
    ? Math.round(memberStats.reduce((acc, curr) => acc + curr.raport.percentage, 0) / memberStats.length)
    : 0;

  // Active activity today - bisa dipilih dari dropdown atau default ke agenda aktif terbaru
  const activeActivities = activities.filter(a => a.status === 'ACTIVE');
  const activeActivity = activities.find(a => a.id === selectedDashboardActivityId) || (activeActivities.length > 0 ? activeActivities[0] : activities[0]);
  const activeLogs = logs.filter(l => l.activityId === activeActivity?.id);



  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* ── MOBILE IDENTITY BANNER (Sesuai Mockup Mobile Screen 2) ── */}
      <div className="md:hidden space-y-3">
        {/* User Role Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/30 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-300 font-black text-sm shrink-0">
              BK
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-white leading-tight">
                {currentUser?.name || 'Badan Kehormatan'}
              </h2>
              <p className="text-[11px] text-emerald-400 font-medium">
                Mode Pengguna • BK DPRD
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </div>

        {/* Dashboard Monitoring Banner Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Dashboard Monitoring</h3>
              <p className="text-[11px] text-emerald-100/90 leading-tight">
                Lihat ringkasan kehadiran dan aktivitas anggota DPRD
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-emerald-200 shrink-0" />
        </div>

        {/* ── MENU UTAMA (Grid 2 Kolom - Mobile Only) ── */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase">
              Menu Utama
            </h3>
            <span className="text-[10px] text-slate-500">Akses Cepat</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. Absensi QR Webcam */}
            <button
              onClick={() => onNavigate('webcam_scan')}
              className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-left flex items-center space-x-3 transition active:scale-95 shadow-md group"
            >
              <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-800/80 text-cyan-400 group-hover:scale-105 transition shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs text-white block leading-tight">Absensi QR</span>
                <span className="text-[10px] text-slate-400">Webcam</span>
              </div>
            </button>

            {/* 2. Kartu QR Digital */}
            <button
              onClick={() => onNavigate('member_qr')}
              className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-left flex items-center space-x-3 transition active:scale-95 shadow-md group"
            >
              <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-800/80 text-emerald-400 group-hover:scale-105 transition shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs text-white block leading-tight">Kartu QR</span>
                <span className="text-[10px] text-slate-400">Digital</span>
              </div>
            </button>

            {/* 3. Raport Kedisiplinan */}
            <button
              onClick={() => onNavigate('raport')}
              className="relative p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-left flex items-center space-x-3 transition active:scale-95 shadow-md group"
            >
              <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-800/80 text-emerald-400 group-hover:scale-105 transition shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs text-white block leading-tight">Raport</span>
                <span className="text-[10px] text-slate-400">Kedisiplinan</span>
              </div>
              {redMembers.length > 0 && (
                <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center ring-2 ring-slate-900">
                  {redMembers.length}
                </span>
              )}
            </button>

            {/* 4. Data Anggota DPRD */}
            <button
              onClick={() => onNavigate('members')}
              className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 text-left flex items-center space-x-3 transition active:scale-95 shadow-md group"
            >
              <div className="p-2.5 rounded-xl bg-blue-950 border border-blue-800/80 text-blue-400 group-hover:scale-105 transition shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs text-white block leading-tight">Data Anggota</span>
                <span className="text-[10px] text-slate-400">DPRD</span>
              </div>
            </button>

            {/* 5. Agenda & Jadwal */}
            <button
              onClick={() => onNavigate('activities')}
              className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-left flex items-center space-x-3 transition active:scale-95 shadow-md group"
            >
              <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-800/80 text-emerald-400 group-hover:scale-105 transition shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs text-white block leading-tight">Agenda &</span>
                <span className="text-[10px] text-slate-400">Jadwal</span>
              </div>
            </button>

            {/* 6. Log Jejak Audit */}
            <button
              onClick={() => onNavigate('audit')}
              className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 text-left flex items-center space-x-3 transition active:scale-95 shadow-md group"
            >
              <div className="p-2.5 rounded-xl bg-purple-950 border border-purple-800/80 text-purple-400 group-hover:scale-105 transition shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs text-white block leading-tight">Log Jejak</span>
                <span className="text-[10px] text-slate-400">Audit</span>
              </div>
            </button>
          </div>
        </div>

        {/* ── EARLY WARNING SYSTEM (COMPACT MOBILE CARD) ── */}
        <div
          onClick={() => onNavigate('raport')}
          className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/60 border border-rose-800/70 shadow-lg cursor-pointer active:scale-[0.99] transition space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-rose-400 font-extrabold text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Early Warning System</span>
            </div>
            {redMembers.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px]">
                {redMembers.length}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-rose-200/90 leading-relaxed pr-2">
              {redMembers.length > 0
                ? `${redMembers.length} anggota memiliki tingkat kehadiran di bawah 50%.`
                : 'Seluruh anggota memenuhi standar kedisiplinan baik.'}
            </p>
            <ChevronRight className="w-5 h-5 text-rose-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* ── DESKTOP HERO WELCOME BANNER (Hidden on Mobile) ── */}
      <div className="hidden md:flex p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-slate-800 text-white shadow-xl flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-500/20 text-emerald-300 text-xs font-extrabold px-2.5 py-0.5 rounded border border-emerald-500/30 uppercase tracking-wide">
              Monitoring Dashboard Real-Time
            </span>
            <span className="text-slate-400 text-xs">• Periode Masa Persidangan 2026</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            SI-RAPORT <span className="text-emerald-400">BK DPRD</span>
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Sistem Evaluasi Kedisiplinan Kehadiran Anggota DPRD berbasis QR Code Laptop Scanner, Geofencing GPS Mobile, Audit Trail, & Raport Digital Badan Kehormatan.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => onNavigate('webcam_scan')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition"
          >
            <Camera className="w-4 h-4" />
            <span>Buka Laptop QR Scanner</span>
          </button>
          <button
            onClick={() => onNavigate('raport')}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-2 border border-slate-700 transition"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Raport Kedisiplinan BK</span>
          </button>
        </div>
      </div>

      {/* Filter Bar per Activity Category */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 font-semibold shrink-0">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">Filter Evaluasi Rapat:</span>
          <span className="sm:hidden">Filter:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pl-2">
          {['ALL', 'Paripurna', 'Komisi', 'Banmus', 'Reses', 'Kunjungan Kerja'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition text-[11px] sm:text-xs whitespace-nowrap shrink-0 ${
                categoryFilter === cat
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'Semua Kegiatan' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Metric Summary Cards (2 Cols on mobile, 5 cols on desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Total Members */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] sm:text-xs font-semibold uppercase">Total Anggota</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{members.length}</div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Anggota Terdaftar</p>
        </div>

        {/* Green Category (81-100%) */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase">Hijau (81-100%)</span>
            <CheckCircle className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-800 dark:text-emerald-300">{greenMembers.length}</div>
          <p className="text-[10px] sm:text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">Kedisiplinan Baik</p>
        </div>

        {/* Yellow Category (51-80%) */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase">Kuning (51-80%)</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-800 dark:text-amber-300">{yellowMembers.length}</div>
          <p className="text-[10px] sm:text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">Perlu Perhatian</p>
        </div>

        {/* Red Category (0-50%) */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 shadow-sm">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 mb-1.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase">Merah (0-50%)</span>
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-800 dark:text-rose-300">{redMembers.length}</div>
          <p className="text-[10px] sm:text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-0.5">Evaluasi BK</p>
        </div>

        {/* Average Rate */}
        <div className="col-span-2 sm:col-span-2 lg:col-span-1 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] sm:text-xs font-semibold uppercase">Rata-Rata Kehadiran</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{avgPercentage}%</div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Seluruh Rapat & Reses</p>
        </div>

      </div>

      {/* Main Grid: Active Activity Monitor & BK Early Warning System */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Left Column (2 Cols): Active Activity Attendance Monitor */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 live-indicator"></div>
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Kegiatan Sedang Dipantau (Live)</h3>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={activeActivity?.id || ''}
                  onChange={(e) => setSelectedDashboardActivityId(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[200px] truncate"
                >
                  {activities.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.status === 'ACTIVE' ? '🟢 ' : ''}{a.title}
                    </option>
                  ))}
                </select>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold text-[10px] shrink-0">
                  {activeActivity?.category}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">{activeActivity?.title}</h4>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>{activeActivity?.date} • Pukul {activeActivity?.startTime} - {activeActivity?.endTime} WIB</span>
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>{activeActivity?.locationName} (Radius: {activeActivity?.radiusMeters}m)</span>
              </p>
            </div>

            {/* Attendance Progress Bar */}
            <div className="space-y-1.5 pt-1 sm:pt-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-400">Progres Presensi Terkini:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                  {activeLogs.length} Peserta Hadir ({activeLogs.filter(l => l.participantType !== 'EXTERNAL').length} Dewan, {activeLogs.filter(l => l.participantType === 'EXTERNAL').length} Tamu OPD)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 sm:h-3 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (activeLogs.length / (members.length || 1)) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Daftar Yang Sudah Hadir (Real-Time Live Feed) */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-500" />
                  Daftar yang Sudah Mengisi Absen ({activeLogs.length}):
                </span>
                <button
                  onClick={() => onNavigate('activities')}
                  className="text-[11px] text-emerald-500 hover:underline"
                >
                  Kelola di Agenda →
                </button>
              </div>

              {activeLogs.length === 0 ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-xs text-slate-400">
                  Belum ada peserta yang melakukan absensi pada sesi ini.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                  {activeLogs.map((log) => {
                    const isExternal = log.participantType === 'EXTERNAL';
                    return (
                      <div key={log.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 ${isExternal ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                            {isExternal ? (log.guestAgency || 'OPD') : (log.memberFraksi || 'Dewan')}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white truncate">
                            {log.memberName || log.guestName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono text-slate-400">
                            {formatLiveTimestamp(log.timestamp)}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.status === 'Terlambat' || log.status === 'LATE' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {log.status || 'Hadir'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Action Button */}
            <div className="pt-2 flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => onNavigate('activities')}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
              >
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Tampilkan QR Agenda</span>
              </button>
              <button
                onClick={() => onNavigate('webcam_scan')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow transition"
              >
                <Camera className="w-4 h-4" />
                <span>Buka Laptop Scanner</span>
              </button>
            </div>

          </div>

          {/* Members Raport Quick Breakdown List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3 sm:mb-4">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Peringkat Kehadiran Anggota</h3>
              <button
                onClick={() => onNavigate('raport')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {memberStats.slice(0, 5).map(({ member, raport }) => (
                <div key={member.id} className="py-2.5 sm:py-3 flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                    <img src={member.photo} alt="" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-slate-200 shrink-0" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white truncate">{member.name}</h4>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">{member.fraksi} • {member.komisi}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                    <div className="text-right">
                      <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white font-mono">{raport.percentage}%</span>
                      <p className="text-[9px] sm:text-[10px] text-slate-400">{raport.categoryInfo.statusText}</p>
                    </div>
                    <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold border ${raport.categoryInfo.badgeClass}`}>
                      {raport.categoryInfo.key}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (1 Col): BK Early Warning System (EWS) Desktop Detail */}
        <div className="hidden lg:block space-y-6">
          
          <div className="bg-gradient-to-b from-rose-950/30 via-slate-900 to-slate-900 rounded-2xl border border-rose-900/50 p-5 shadow-sm text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-rose-900/60">
              <div className="flex items-center space-x-2 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-white">Badan Kehormatan (EWS)</h3>
              </div>
              <span className="bg-rose-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
                {redMembers.length + yellowMembers.length} Anggota Perhatian
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Sistem Peringatan Dini (EWS) mendeteksi anggota dengan kehadiran di bawah ambang batas kedisiplinan yang memerlukan tindakan evaluasi BK.
            </p>

            <div className="space-y-3">
              {redMembers.length === 0 && yellowMembers.length === 0 ? (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs text-center">
                  Seluruh Anggota DPRD memenuhi kualifikasi kehadiran baik (Kategori Hijau).
                </div>
              ) : (
                [...redMembers, ...yellowMembers].map(({ member, raport }) => (
                  <div
                    key={member.id}
                    className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <img src={member.photo} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                      <div className="truncate">
                        <h5 className="font-bold text-slate-100 truncate">{member.name.split(',')[0]}</h5>
                        <p className="text-[10px] text-slate-400">{member.fraksi}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${raport.categoryInfo.badgeClass}`}>
                        {raport.percentage}%
                      </span>
                      <button
                        onClick={() => onNavigate('raport')}
                        className="p-1 text-slate-400 hover:text-amber-400 transition"
                        title="Buka e-Raport BK"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => onNavigate('raport')}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs text-center shadow transition"
            >
              Kelola Tindakan Kedisiplinan BK &rarr;
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
