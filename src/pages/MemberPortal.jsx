import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { getRaportCategory } from '../utils/raportUtils';
import ERaportModal from '../components/ERaportModal';
import {
  User,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  FileSpreadsheet,
  Building2,
  Bell,
  CreditCard,
  Printer,
  ChevronRight,
  ShieldCheck,
  Award,
  Info
} from 'lucide-react';

export default function MemberPortal() {
  const {
    activeMemberId,
    getMemberById,
    members,
    activities,
    logs,
    getMemberRaport,
    currentUser
  } = useAttendance();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'schedule' | 'history' | 'raport' | 'profile'
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isRaportModalOpen, setIsRaportModalOpen] = useState(false);

  // Ambil data anggota saat ini
  const member = getMemberById(activeMemberId) || members.find(m => m.id === currentUser?.memberId) || members[0];
  const raport = member ? getMemberRaport(member.id, selectedCategory) : null;
  const memberLogs = logs.filter(l => l.memberId === member?.id);

  if (!member) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-600 dark:text-slate-300 font-bold">Data profil anggota tidak ditemukan.</p>
      </div>
    );
  }

  // Notifikasi / Pengingat Kegiatan Mendatang
  const upcomingActivities = activities.filter(a => {
    const actDate = new Date(a.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return actDate >= today && a.status === 'ACTIVE';
  });

  return (
    <div className="space-y-6">

      {/* Hero Profil Header Personal */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/30 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          {member.photo ? (
            <img
              src={member.photo}
              alt={member.name}
              className="w-16 h-20 rounded-2xl object-cover border-2 border-emerald-400 shadow-md shrink-0"
            />
          ) : (
            <div className="w-16 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-2xl font-bold border-2 border-emerald-400 shadow-md shrink-0">
              {member.name?.charAt(0)}
            </div>
          )}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-wide">
                Portal Anggota Dewan
              </span>
              <span className="text-slate-400 text-xs font-mono">NIP: {member.nip}</span>
            </div>
            <h1 className="text-xl font-black text-white">{member.name}</h1>
            <p className="text-xs text-emerald-300 font-medium">
              {member.jabatan} • {member.fraksi} • {member.komisi}
            </p>
          </div>
        </div>

        {/* Quick Raport Badge */}
        {raport && (
          <div className={`p-4 rounded-2xl border flex items-center gap-4 ${raport.categoryInfo.badgeBg} ${raport.categoryInfo.badgeBorder}`}>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tingkat Kehadiran</span>
              <span className={`text-2xl font-black ${raport.categoryInfo.textColor}`}>{raport.percentage}%</span>
            </div>
            <div className={`w-10 h-10 rounded-xl ${raport.categoryInfo.bgColor} flex items-center justify-center text-white shadow`}>
              <Award className="w-5 h-5" />
            </div>
          </div>
        )}
      </div>

      {/* Sub Navigation Tabs for Anggota */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'overview', label: '1. Dashboard Pribadi', icon: TrendingUp },
          { id: 'schedule', label: '2. Jadwal Kegiatan', icon: Calendar, badge: upcomingActivities.length || null },
          { id: 'history', label: '3. Riwayat Kehadiran', icon: CheckCircle2 },
          { id: 'raport', label: '4. E-Raport & Grafik', icon: FileSpreadsheet },
          { id: 'profile', label: '5. Profil & ID Card', icon: CreditCard },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: DASHBOARD PRIBADI ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Status Kehadiran Indikator Warna */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-400">Total Agenda Rapat</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{activities.length} Kegiatan</p>
              <span className="text-[11px] text-slate-500 mt-1 block">Tercatat di Sekretariat</span>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Total Kehadiran</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{raport?.breakdown.hadir || 0} Rapat</p>
              <span className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-1 block">Presensi Terverifikasi</span>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 p-5 rounded-2xl border border-amber-200 dark:border-amber-800/60 shadow-sm">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Izin / Sakit / Dinas</span>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {(raport?.breakdown.izin || 0) + (raport?.breakdown.sakit || 0) + (raport?.breakdown.dinas || 0)} Agenda
              </p>
              <span className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-1 block">Disertai Keterangan</span>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/40 p-5 rounded-2xl border border-rose-200 dark:border-rose-800/60 shadow-sm">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300">Tanpa Keterangan (Alpa)</span>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{raport?.breakdown.alpa || 0} Rapat</p>
              <span className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-1 block">Evaluasi Disiplin BK</span>
            </div>
          </div>

          {/* Indikator Status & Notifikasi Info */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" />
                Status Kedisiplinan Kehadiran Anda
              </h3>

              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${raport?.categoryInfo.badgeBg} ${raport?.categoryInfo.badgeBorder}`}>
                <div className="space-y-1">
                  <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${raport?.categoryInfo.bgColor} text-white`}>
                    Kategori: {raport?.categoryInfo.name}
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 font-medium">
                    {raport?.categoryInfo.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-4xl font-black ${raport?.categoryInfo.textColor}`}>{raport?.percentage}%</span>
                </div>
              </div>

              {/* Batasan Akses Info Note */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Sistem Pencatatan Terkendali Sekretariat DPRD</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Seluruh proses absensi kehadiran dipindai dan dikendalikan langsung oleh Petugas Sekretariat DPRD melalui Laptop Scanner QR resmi pada saat rapat berlangsung.
                </p>
              </div>
            </div>

            {/* Notifikasi & Agenda Mendatang */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-500" />
                  Agenda Terdekat
                </h3>
                <span className="text-[10px] font-bold text-slate-400">{upcomingActivities.length} Agenda</span>
              </div>

              {upcomingActivities.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Tidak ada jadwal rapat terdekat.</p>
              ) : (
                <div className="space-y-2.5">
                  {upcomingActivities.slice(0, 3).map(act => (
                    <div key={act.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[9px] font-extrabold">
                          {act.category}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">{act.date}</span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{act.title}</h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{act.startTime} - {act.endTime} WIB • {act.locationName}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: JADWAL KEGIATAN ── */}
      {activeTab === 'schedule' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Jadwal Agenda & Rapat DPRD</h3>
              <p className="text-xs text-slate-400">Rapat Paripurna, Komisi, Reses, Kunjungan Kerja, & Kegiatan Kedinasan.</p>
            </div>
            <span className="px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full font-bold text-xs">
              {activities.length} Agenda Terdaftar
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activities.map(act => {
              const myLog = logs.find(l => l.activityId === act.id && l.memberId === member.id);
              return (
                <div key={act.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-200 border border-slate-700 text-[10px] font-extrabold">
                      {act.category}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{act.date}</span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{act.title}</h4>
                    {act.description && <p className="text-xs text-slate-400 mt-0.5 italic">{act.description}</p>}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{act.startTime} – {act.endTime} WIB</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="truncate max-w-[140px]">{act.locationName}</span>
                    </div>
                  </div>

                  {/* Status Kehadiran Anda pada Agenda ini */}
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">Kehadiran Anda:</span>
                    <span className={`font-bold text-[11px] ${
                      myLog?.status === 'Hadir' ? 'text-emerald-500' :
                      myLog?.status === 'Terlambat' ? 'text-amber-500' :
                      myLog?.status === 'Izin' || myLog?.status === 'Sakit' || myLog?.status === 'Dinas' ? 'text-blue-400' :
                      'text-rose-500'
                    }`}>
                      {myLog?.status ? `● ${myLog.status}` : '○ Belum Hadir / Tanpa Keterangan'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 3: RIWAYAT KEHADIRAN ── */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Riwayat Kehadiran Personal</h3>
              <p className="text-xs text-slate-400">Daftar kehadiran resmi yang telah tercatat dan diverifikasi sistem.</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
                <tr>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Agenda Kegiatan</th>
                  <th className="p-3">Jenis Rapat</th>
                  <th className="p-3 text-center">Waktu Presensi</th>
                  <th className="p-3 text-center">Status Kehadiran</th>
                  <th className="p-3 text-center">Metode Absensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activities.map(act => {
                  const log = memberLogs.find(l => l.activityId === act.id);
                  const st = log?.status || 'Tanpa Keterangan';
                  return (
                    <tr key={act.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-[11px] text-slate-400">{act.date}</td>
                      <td className="p-3">
                        <p className="font-bold text-slate-900 dark:text-white">{act.title}</p>
                        <p className="text-[11px] text-slate-400">{act.locationName}</p>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[10px]">
                          {act.category}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-[11px]">
                        {log ? (
                          new Date(log.timestampISO || (log.timestamp?.toDate ? log.timestamp.toDate() : Date.now())).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
                        ) : '—'}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          st === 'Hadir' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-500/40' :
                          st === 'Terlambat' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-500/40' :
                          st === 'Izin' || st === 'Sakit' || st === 'Dinas' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-500/40' :
                          'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-500/40'
                        }`}>
                          {st}
                        </span>
                      </td>
                      <td className="p-3 text-center text-[11px] text-slate-400 font-medium">
                        {log?.method === 'QR_WEBCAM' && '📷 Laptop QR Scanner'}
                        {log?.method === 'GPS_ONLINE' && '📍 GPS Mobile Online'}
                        {log?.method === 'MANUAL_OVERRIDE' && '✍️ Input Manual Petugas'}
                        {!log && '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: E-RAPORT & GRAFIK ── */}
      {activeTab === 'raport' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">E-Raport Digital Kehadiran</h3>
                <p className="text-xs text-slate-400">Evaluasi kehadiran otomatis per kategori kegiatan dewan.</p>
              </div>
              <button
                onClick={() => setIsRaportModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Buka Lembar Raport Lengkap</span>
              </button>
            </div>

            {/* Kategori Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {['Paripurna', 'Komisi', 'Banmus', 'Banggar', 'Reses', 'Kunjungan Kerja'].map(cat => {
                const catRaport = getMemberRaport(member.id, cat);
                return (
                  <div key={cat} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">{cat}</span>
                      <span className={`text-sm font-black ${catRaport.categoryInfo.textColor}`}>
                        {catRaport.percentage}%
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${catRaport.categoryInfo.bgColor}`}
                        style={{ width: `${catRaport.percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>{catRaport.breakdown.hadir} Hadir dari {catRaport.totalMandatory} Agenda</span>
                      <span className={`font-bold ${catRaport.categoryInfo.textColor}`}>{catRaport.categoryInfo.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: PROFIL ANGGOTA & KARTU DIGITAL ── */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-center">
            {member.photo ? (
              <img
                src={member.photo}
                alt={member.name}
                className="w-32 h-40 rounded-2xl object-cover border-4 border-emerald-500 shadow-xl mx-auto"
              />
            ) : (
              <div className="w-32 h-40 rounded-2xl bg-slate-800 border-4 border-emerald-500 flex items-center justify-center text-4xl font-bold text-emerald-400 mx-auto">
                {member.name?.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">{member.name}</h3>
              <p className="text-xs text-emerald-500 font-bold">{member.jabatan}</p>
            </div>

            <div className="text-left text-xs space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">NIP / No. Induk:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{member.nip}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Fraksi:</span>
                <span className="font-bold text-slate-900 dark:text-white">{member.fraksi}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Komisi:</span>
                <span className="font-bold text-slate-900 dark:text-white">{member.komisi}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Periode Jabatan:</span>
                <span className="font-bold text-emerald-500">2024 – 2029</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              Kartu QR Identitas Digital Resmi
            </h3>
            <p className="text-xs text-slate-400">
              Tunjukkan QR Code berikut ke Kamera / Webcam Petugas Sekretariat saat memasuki ruang rapat.
            </p>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-white">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Token QR Presensi</span>
                <p className="font-mono text-xs text-slate-300 font-bold">{member.qrToken || `QR-${member.id}`}</p>
                <span className="text-[10px] text-slate-500 block">Valid Periode Masa Persidangan</span>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Kartu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ERaport Modal Component */}
      <ERaportModal
        isOpen={isRaportModalOpen}
        onClose={() => setIsRaportModalOpen(false)}
        memberId={member.id}
      />

    </div>
  );
}
