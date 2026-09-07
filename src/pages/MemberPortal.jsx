import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAttendance } from '../context/AttendanceContext';
import { getRaportCategory } from '../utils/raportUtils';
import ERaportModal from '../components/ERaportModal';
import dprdLogo from '../logo.png';
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
              <span className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-1 block">Dengan Keterangan</span>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/40 p-5 rounded-2xl border border-rose-200 dark:border-rose-800/60 shadow-sm">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300">Tanpa Keterangan</span>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{raport?.breakdown.alpa || 0} Kali</p>
              <span className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-1 block">Evaluasi Khusus BK</span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: JADWAL KEGIATAN ── */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3">Agenda Kegiatan & Rapat DPRD</h3>
            <div className="space-y-3">
              {activities.map(act => (
                <div key={act.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-bold">
                        {act.category}
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">{act.title}</h4>
                    </div>
                    <p className="text-[11px] text-slate-500">{act.date} • {act.startTime} - {act.endTime} WIB</p>
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
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3">Riwayat Absensi Pribadi</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase font-bold">
                <tr>
                  <th className="p-3">Agenda</th>
                  <th className="p-3">Waktu Presensi</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Metode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activities.map(act => {
                  const log = memberLogs.find(l => l.activityId === act.id);
                  return (
                    <tr key={act.id}>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{act.title}</td>
                      <td className="p-3 font-mono">{log ? new Date(log.timestamp).toLocaleTimeString('id-ID') : '-'}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log?.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {log?.status || 'Tanpa Keterangan'}
                        </span>
                      </td>
                      <td className="p-3">{log?.method || 'SYSTEM'}</td>
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
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Raport Kehadiran Anggota Dewan (F4)</h3>
                <p className="text-xs text-slate-400">Dokumen evaluasi resmi Badan Kehormatan (BK) DPRD Kabupaten Cirebon.</p>
              </div>
              <button
                onClick={() => setIsRaportModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow"
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
                className="w-32 h-40 rounded-2xl object-cover border-4 border-blue-500 shadow-xl mx-auto"
              />
            ) : (
              <div className="w-32 h-40 rounded-2xl bg-slate-800 border-4 border-blue-500 flex items-center justify-center text-4xl font-bold text-blue-400 mx-auto">
                {member.name?.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">{member.name}</h3>
              <p className="text-xs text-blue-500 font-bold">{member.jabatan}</p>
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
                <span className="font-bold text-blue-500">2024 – 2029</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-500" />
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
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
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
