import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAttendance } from '../context/AttendanceContext';
import { getRaportCategory, getStatusBadge } from '../utils/raportUtils';
import ERaportModal from '../components/ERaportModal';
import dprdLogo from '../logo.png';
import {
  User,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  FileSpreadsheet,
  Building2,
  CreditCard,
  Printer,
  ChevronRight,
  ShieldCheck,
  Award,
  Smartphone,
  Navigation
} from 'lucide-react';

export default function MemberPortal({ onNavigate }) {
  const {
    activeMemberId,
    setActiveMemberId,
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
  const memberLogs = logs.filter(l => l.memberId === member?.id && l.participantType !== 'EXTERNAL');

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

  const handleOpenFullCard = () => {
    setActiveMemberId(member.id);
    if (onNavigate) {
      onNavigate('member_qr');
    }
  };

  return (
    <div className="space-y-6">

      {/* Header Banner Profil Anggota */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            {member.photo ? (
              <img
                src={member.photo}
                alt={member.name}
                className="w-16 h-20 rounded-2xl object-cover border-2 border-emerald-400 shadow-md shrink-0"
              />
            ) : (
              <div className="w-16 h-20 rounded-2xl bg-slate-800 border-2 border-emerald-400 flex items-center justify-center text-2xl font-bold text-emerald-400">
                {member.name?.charAt(0)}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" />
          </div>
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
          <div className={`p-4 rounded-2xl border flex items-center gap-4 ${raport.categoryInfo.badgeClass}`}>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tingkat Kehadiran</span>
              <span className={`text-2xl font-black ${raport.categoryInfo.textColor}`}>{raport.percentage}%</span>
            </div>
            <div className={`w-10 h-10 rounded-xl ${raport.categoryInfo.pillBg} flex items-center justify-center text-white shadow`}>
              <Award className="w-5 h-5" />
            </div>
          </div>
        )}
      </div>

      {/* Sub Navigation Tabs for Anggota */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'overview', label: '1. Dashboard Pribadi', icon: TrendingUp },
          { id: 'schedule', label: '2. Jadwal Sidang', icon: Calendar, badge: upcomingActivities.length || null },
          { id: 'history', label: '3. Riwayat Kehadiran', icon: CheckCircle2 },
          { id: 'raport', label: '4. E-Raport Kedisiplinan', icon: FileSpreadsheet },
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
          
          {/* Quick Action Presensi Mandiri */}
          {upcomingActivities.length > 0 && (
            <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-900/80 via-teal-900/70 to-slate-900 border border-emerald-500/40 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 uppercase">
                  Agenda Sedang Berlangsung Hari Ini
                </span>
                <h3 className="font-extrabold text-base text-white">{upcomingActivities[0].title}</h3>
                <p className="text-xs text-emerald-200/90">
                  {upcomingActivities[0].startTime} - {upcomingActivities[0].endTime} WIB • {upcomingActivities[0].locationName}
                </p>
              </div>

              <button
                onClick={() => onNavigate && onNavigate('gps_mobile')}
                className="w-full sm:w-auto px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 shrink-0"
              >
                <Smartphone className="w-4 h-4" />
                <span>Lakukan Presensi Lokasi GPS</span>
              </button>
            </div>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Agenda Wajib</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{activities.length}</p>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Sidang Paripurna & Komisi</span>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-5 rounded-3xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">Hadir Tepat Waktu</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{raport?.breakdown.hadir || 0}</p>
              <span className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5 block">Presensi Terverifikasi</span>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-950/40 p-5 rounded-3xl border border-indigo-200 dark:border-indigo-800/60 shadow-sm">
              <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase">Dinas Luar (SPT)</span>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{raport?.breakdown.dinas || 0}</p>
              <span className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5 block">Surat Tugas Resmi</span>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 p-5 rounded-3xl border border-amber-200 dark:border-amber-800/60 shadow-sm">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">Izin / Sakit / Telat</span>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {(raport?.breakdown.terlambat || 0) + (raport?.breakdown.izin || 0) + (raport?.breakdown.sakit || 0)}
              </p>
              <span className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5 block">Dengan Keterangan</span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: JADWAL KEGIATAN ── */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3">Agenda Kegiatan & Rapat DPRD</h3>
            <div className="space-y-3">
              {activities.map(act => (
                <div key={act.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase">
                        {act.category}
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">{act.title}</h4>
                    </div>
                    <p className="text-[11px] text-slate-500">{act.date} • {act.startTime} - {act.endTime} WIB (Toleransi: {act.toleranceMinutes || 30}m)</p>
                    <p className="text-[11px] text-slate-400">{act.locationName}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold text-center ${
                    act.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {act.status === 'ACTIVE' ? 'Sedang Dibuka' : 'Selesai'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: RIWAYAT KEHADIRAN ── */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3">Riwayat Presensi Pribadi</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase font-bold">
                <tr>
                  <th className="p-3">Agenda Sidang</th>
                  <th className="p-3">Waktu Presensi</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Metode / Perangkat</th>
                  <th className="p-3">Keterangan / SPT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activities.map(act => {
                  const log = memberLogs.find(l => l.activityId === act.id);
                  const badge = log ? getStatusBadge(log.status) : getStatusBadge('alpha');
                  return (
                    <tr key={act.id}>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{act.title}</td>
                      <td className="p-3 font-mono">{log ? new Date(log.timestamp).toLocaleTimeString('id-ID') : '-'} WIB</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3 text-[11px]">{log?.method || 'SYSTEM'} ({log?.deviceType || 'Smartphone'})</td>
                      <td className="p-3 text-[11px] text-slate-400">
                        {log?.sptNumber && <span className="block font-bold text-indigo-400">{log.sptNumber}</span>}
                        {log?.note || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: E-RAPORT ── */}
      {activeTab === 'raport' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Raport Kehadiran Anggota Dewan</h3>
                <p className="text-xs text-slate-400">Dokumen evaluasi resmi Badan Kehormatan (BK) DPRD Kabupaten Cirebon.</p>
              </div>
              <button
                onClick={() => setIsRaportModalOpen(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Buka Lembar Raport Lengkap (F4)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: PROFIL ANGGOTA & KARTU DIGITAL RESMI ── */}
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
                <span className="font-mono font-bold text-slate-900 dark:text-white">{member.nip || '—'}</span>
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
              Kartu QR Identitas Digital Resmi (Standar CR-80)
            </h3>
            <p className="text-xs text-slate-400">
              Desain resmi Navy & Gold depan & belakang DPRD Kabupaten Cirebon.
            </p>

            {/* Preview Mini Card */}
            <div
              className="w-full max-w-[360px] aspect-[1.586/1] text-white rounded-2xl p-3.5 shadow-xl border border-amber-500/50 relative overflow-hidden flex flex-col justify-between mx-auto"
              style={{
                backgroundColor: '#0a192f',
                backgroundImage: 'linear-gradient(135deg, #0c2340 0%, #102a4e 50%, #081526 100%)'
              }}
            >
              <div className="flex items-center justify-between border-b border-amber-500/40 pb-1">
                <div className="flex items-center space-x-2">
                  <img src={dprdLogo} alt="Logo DPRD" className="w-7 h-7 object-contain" />
                  <div>
                    <h3 className="font-black text-[10px] text-white uppercase leading-none">DPRD</h3>
                    <p className="text-[7.5px] font-bold text-amber-400 uppercase">KABUPATEN CIREBON</p>
                  </div>
                </div>
                <span className="text-[7.5px] text-amber-300 font-bold uppercase">KARTU ANGGOTA</span>
              </div>

              <div className="flex items-center space-x-3 my-1">
                <img src={member.photo} alt={member.name} className="w-14 h-18 rounded-lg object-cover border border-amber-400 shrink-0" />
                <div className="space-y-0.5 min-w-0 flex-1">
                  <h4 className="font-black text-xs text-white truncate">{member.name}</h4>
                  <p className="text-[9px] text-slate-200">{member.fraksi}</p>
                  <p className="text-[8.5px] text-slate-300">{member.komisi}</p>
                  <p className="text-[8px] font-mono text-amber-300">No: {member.nip ? member.nip.slice(-4) : '3201'}</p>
                </div>
              </div>

              <div className="pt-1 border-t border-slate-700 flex items-center justify-between">
                <div className="p-0.5 rounded bg-white">
                  <QRCodeSVG value={member.qrToken || `QR-${member.id}`} size={28} />
                </div>
                <span className="italic font-serif text-[7.5px] text-amber-300">Bersama Rakyat Membangun Daerah</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 justify-center">
              <button
                onClick={handleOpenFullCard}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Buka & Cetak Kartu Fisik Lengkap (Depan-Belakang)</span>
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
