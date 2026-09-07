import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { getRaportCategory } from '../utils/raportUtils';
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
  FileText
} from 'lucide-react';

export default function Dashboard({ onNavigate }) {
  const {
    members,
    activities,
    logs,
    getMemberRaport,
    currentRole
  } = useAttendance();

  const [categoryFilter, setCategoryFilter] = useState('ALL');

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

  // Active activity today
  const activeActivity = activities.find(a => a.status === 'ACTIVE') || activities[0];
  const activeLogs = logs.filter(l => l.activityId === activeActivity?.id);

  return (
    <div className="space-y-6">
      
      {/* Hero Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
        <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 font-semibold">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span>Filter Evaluasi Rapat:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'Paripurna', 'Komisi', 'Banmus', 'Reses', 'Kunjungan Kerja'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
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

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Members */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Total Anggota</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{members.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Anggota DPRD Terdaftar</p>
        </div>

        {/* Green Category (81-100%) */}
        <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-2">
            <span className="text-xs font-bold uppercase">Kategori Hijau (81-100%)</span>
            <CheckCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300">{greenMembers.length}</div>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">Kedisiplinan Baik</p>
        </div>

        {/* Yellow Category (51-80%) */}
        <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-2">
            <span className="text-xs font-bold uppercase">Kategori Kuning (51-80%)</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-800 dark:text-amber-300">{yellowMembers.length}</div>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1">Cukup / Perlu Perhatian</p>
        </div>

        {/* Red Category (0-50%) */}
        <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 shadow-sm">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 mb-2">
            <span className="text-xs font-bold uppercase">Kategori Merah (0-50%)</span>
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-800 dark:text-rose-300">{redMembers.length}</div>
          <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-1">Evaluasi Khusus BK</p>
        </div>

        {/* Average Rate */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Rata-Rata Kehadiran</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{avgPercentage}%</div>
          <p className="text-[11px] text-slate-500 mt-1">Seluruh Rapat & Reses</p>
        </div>

      </div>

      {/* Main Grid: Active Activity Monitor & BK Early Warning System */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Active Activity Attendance Monitor */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 live-indicator"></div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Kegiatan Sedang Berlangsung / Aktif</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold text-[11px]">
                {activeActivity?.category}
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">{activeActivity?.title}</h4>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>{activeActivity?.date} • Pukul {activeActivity?.startTime} - {activeActivity?.endTime} WIB</span>
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" />
                <span>{activeActivity?.locationName} (Radius Toleransi GPS: {activeActivity?.radiusMeters}m)</span>
              </p>
            </div>

            {/* Attendance Progress Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-400">Progres Presensi Ter-Presensi:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                  {activeLogs.length} dari {members.length} Anggota ({Math.round((activeLogs.length / (members.length || 1)) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${(activeLogs.length / (members.length || 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Quick Action Button for Laptop Scan Operator */}
            <div className="pt-3 flex justify-end">
              <button
                onClick={() => onNavigate('webcam_scan')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow"
              >
                <Camera className="w-4 h-4" />
                <span>Buka Kamera Laptop Scan QR</span>
              </button>
            </div>

          </div>

          {/* Members Raport Quick Breakdown List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Daftar Peringkat Kehadiran Anggota DPRD</h3>
              <button
                onClick={() => onNavigate('raport')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Lihat Raport Lengkap</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {memberStats.slice(0, 5).map(({ member, raport }) => (
                <div key={member.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <img src={member.photo} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{member.name}</h4>
                      <p className="text-[11px] text-slate-500">{member.fraksi} • {member.komisi}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white font-mono">{raport.percentage}%</span>
                      <p className="text-[10px] text-slate-400">{raport.categoryInfo.statusText}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${raport.categoryInfo.badgeClass}`}>
                      {raport.categoryInfo.key}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (1 Col): BK Early Warning System (EWS) */}
        <div className="space-y-6">
          
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
