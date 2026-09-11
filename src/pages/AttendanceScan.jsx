import React, { useState, useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import QRScannerModal from '../components/QRScannerModal';
import ManualAttendanceModal from '../components/ManualAttendanceModal';
import ActivityQRModal from '../components/ActivityQRModal';
import GuestAttendanceModal from '../components/GuestAttendanceModal';
import LPJViewerModal from '../components/LPJViewerModal';
import { getStatusBadge, getMethodBadge, formatCheckInWithStatus } from '../utils/raportUtils';
import {
  Camera,
  Edit3,
  Calendar,
  Building2,
  CheckCircle,
  Clock,
  UserCheck,
  Search,
  Loader2,
  Plus,
  History,
  QrCode,
  MapPin,
  Users,
  FileSpreadsheet,
  Smartphone,
  ShieldCheck,
  UserPlus
} from 'lucide-react';

export default function AttendanceScan() {
  const {
    activities,
    members,
    logs,
    loading,
    leaveRequests,
    reviewLeaveRequest,
  } = useAttendance();

  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('internal'); // 'internal' | 'external' | 'history'

  // Auto-pilih kegiatan aktif ketika data Firestore selesai dimuat
  useEffect(() => {
    if (!selectedActivityId && activities.length > 0) {
      const active = activities.find(a => a.status === 'ACTIVE') || activities[0];
      setSelectedActivityId(active.id);
    }
  }, [activities]);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [manualModalState, setManualModalState] = useState({ isOpen: false, memberId: null });
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [isLPJModalOpen, setIsLPJModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedActivity = activities.find(a => a.id === selectedActivityId) || activities[0];
  const activityLogs = logs.filter(l => l.activityId === selectedActivityId);
  const internalLogs = activityLogs.filter(l => l.participantType !== 'EXTERNAL');
  const externalLogs = activityLogs.filter(l => l.participantType === 'EXTERNAL');
  const pendingLeaveRequests = leaveRequests.filter(req => req.activityId === selectedActivityId && req.status === 'PENDING');
  const participantIds = Array.isArray(selectedActivity?.participantMemberIds) ? selectedActivity.participantMemberIds : [];
  const participantMembers = members.filter(member => participantIds.includes(member.id));

  // Members attendance list
  const memberAttendanceList = participantMembers.map(m => {
    const log = internalLogs.find(l => l.memberId === m.id);
    return {
      member: m,
      log
    };
  }).filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.member.name.toLowerCase().includes(q) ||
      item.member.fraksi.toLowerCase().includes(q) ||
      item.member.komisi.toLowerCase().includes(q)
    );
  });

  const participantLogs = internalLogs.filter(log => participantIds.includes(log.memberId));
  const checkedInCount = participantLogs.length;
  const dinasCount = participantLogs.filter(l => l.status === 'Dinas Luar' || l.status === 'Dinas').length;
  const izinCount = participantLogs.filter(l => l.status === 'Izin').length;
  const sakitCount = participantLogs.filter(l => l.status === 'Sakit').length;
  const belumAbsenCount = Math.max(0, participantMembers.length - participantLogs.length);
  const checkedOutCount = participantLogs.filter(log => log.checkOutAt).length;
  const stillAttendingCount = Math.max(0, checkedInCount - checkedOutCount);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="ml-3 text-slate-400">Memuat data dari database...</span>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <Calendar className="w-14 h-14 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
        <h2 className="text-slate-600 dark:text-slate-300 font-bold text-lg">Belum Ada Agenda Kegiatan</h2>
        <p className="text-slate-400 text-sm mt-2">Buat agenda kegiatan terlebih dahulu di menu <strong>Agenda Kegiatan</strong>.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-900 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-cyan-500/20 text-cyan-300 text-[10px] sm:text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-cyan-500/30 uppercase tracking-wide">
              Operator Console Registrasi
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-white">Presensi & Monitoring Agenda Sidang</h1>
          <p className="text-xs text-slate-300">
            Validasi multi-faktor identitas QR Code Anggota DPRD & Tamu Eksternal OPD secara real-time.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 w-full sm:w-auto">
          {/* Tombol Tampilkan QR Agenda */}
          <button
            onClick={() => setIsQRModalOpen(true)}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md transition"
            title="Buka QR Code untuk dipindai peserta di layar proyektor"
          >
            <QrCode className="w-4 h-4" />
            <span>QR Proyektor</span>
          </button>

          {/* Tombol Input Tamu OPD */}
          <button
            onClick={() => setIsGuestModalOpen(true)}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 bg-teal-800 hover:bg-teal-700 text-teal-200 border border-teal-500/40 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md transition"
          >
            <UserPlus className="w-4 h-4 text-teal-300 shrink-0" />
            <span>+ Tamu OPD</span>
          </button>

          {/* Tombol Input Manual */}
          <button
            onClick={() => setManualModalState({ isOpen: true, memberId: null })}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-amber-500/40 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md transition"
          >
            <Edit3 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>+ Input Manual / SPT</span>
          </button>

          {/* Tombol Scan Kamera Laptop */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition"
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span>Scan Webcam</span>
          </button>
        </div>
      </div>

      {/* Selector Agenda Aktif & Quick Stat */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Pilih Agenda yang Sedang Dipantau:
            </label>
            <select
              value={selectedActivityId}
              onChange={e => setSelectedActivityId(e.target.value)}
              className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold text-xs"
            >
              {activities.map(a => (
                <option key={a.id} value={a.id}>
                  [{a.category}] {a.title} ({a.date} • {a.startTime} WIB)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsLPJModalOpen(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Lihat LPJ Digital Agenda Ini</span>
          </button>
        </div>

        {/* 4 Quick Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-center">
            <span className="text-[10px] text-slate-500 block uppercase">Total Peserta Agenda</span>
            <span className="text-lg font-black text-emerald-500">{participantMembers.length}</span>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-center">
            <span className="text-[10px] text-slate-500 block uppercase">Dinas Luar (SPT)</span>
            <span className="text-lg font-black text-indigo-400">{dinasCount}</span>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-center">
            <span className="text-[10px] text-slate-500 block uppercase">Tamu Eksternal / OPD</span>
            <span className="text-lg font-black text-cyan-400">{externalLogs.length}</span>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-center">
            <span className="text-[10px] text-slate-500 block uppercase">Belum Absen / Alpha</span>
            <span className="text-lg font-black text-rose-400">{belumAbsenCount}</span>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-center">
            <span className="text-[10px] text-slate-500 block uppercase">Sudah Check-in</span>
            <span className="text-lg font-black text-cyan-500">{checkedInCount}</span>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-center">
            <span className="text-[10px] text-slate-500 block uppercase">Sudah Check-out</span>
            <span className="text-lg font-black text-blue-500">{checkedOutCount}</span>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-center">
            <span className="text-[10px] text-slate-500 block uppercase">Masih Mengikuti</span>
            <span className="text-lg font-black text-amber-500">{stillAttendingCount}</span>
          </div>
        </div>
      </div>

      {/* Sub Navigation Tabs: Internal vs Tamu OPD vs Log Device */}
      <div className="flex items-center gap-2 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <button
          onClick={() => setActiveSubTab('internal')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'internal'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Anggota DPRD Peserta Agenda ({participantMembers.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('external')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'external'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Tamu Eksternal & OPD ({externalLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'history'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Riwayat Scan & Perangkat</span>
        </button>
      </div>

      {/* ── TAB 1: PESERTA INTERNAL (ANGGOTA DPRD) ── */}
      {activeSubTab === 'internal' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Verifikasi Izin Digital</span>
              </h3>
              <span className="text-[11px] text-slate-400">{pendingLeaveRequests.length} menunggu</span>
            </div>

            {pendingLeaveRequests.length === 0 ? (
              <div className="text-xs text-slate-400">Belum ada pengajuan izin digital untuk agenda ini.</div>
            ) : (
              <div className="space-y-3">
                {pendingLeaveRequests.map(req => (
                  <div key={req.id} className="p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="font-bold text-xs text-slate-900 dark:text-white">{req.memberName || 'Anggota'}</p>
                        <p className="text-[11px] text-slate-400">{req.type === 'SAKIT' ? 'Sakit' : 'Izin'} • {activities.find(a => a.id === req.activityId)?.title || req.activityId}</p>
                        <p className="text-[11px] text-slate-500 mt-1">Alasan: {req.reason}</p>
                        {req.note && <p className="text-[11px] text-slate-400 mt-1">Catatan: {req.note}</p>}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => reviewLeaveRequest(req.id, 'APPROVED')}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[11px]"
                        >
                          Setujui
                        </button>
                        <button
                          onClick={() => reviewLeaveRequest(req.id, 'REJECTED', 'Tidak memenuhi syarat')}
                          className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-[11px]"
                        >
                          Tolak
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari nama anggota, fraksi, komisi..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {memberAttendanceList.map(({ member, log }) => {
              const statusInfo = log ? getStatusBadge(log.status) : getStatusBadge('alpha');
              return (
                <div
                  key={member.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-3 shadow-xs hover:border-emerald-500/30 transition"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <img
                      src={member.photo}
                      alt={member.name}
                      className="w-12 h-14 rounded-xl object-cover border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {member.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        {member.fraksi} • {member.komisi}
                      </p>
                      {log && (
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                          IN {formatCheckInWithStatus(log)} • {log.method}
                          {log.checkOutAt && ` • OUT ${new Date(log.checkOutAt).toLocaleTimeString('id-ID')} WIB`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${statusInfo.bg}`}>
                      {statusInfo.label}
                    </span>
                    <button
                      onClick={() => setManualModalState({ isOpen: true, memberId: member.id })}
                      className="text-[11px] text-slate-400 hover:text-amber-400 font-semibold"
                    >
                      Koreksi
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: TAMU EKSTERNAL & OPD ── */}
      {activeSubTab === 'external' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Daftar Kehadiran Tamu Undangan / OPD</h3>
              <p className="text-xs text-slate-400">Data kehadiran tamu otomatis terhubung ke LPJ Kegiatan.</p>
            </div>
            <button
              onClick={() => setIsGuestModalOpen(true)}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Presensi Tamu</span>
            </button>
          </div>

          {externalLogs.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <span>Belum ada presensi tamu eksternal / OPD yang dicatat untuk agenda ini.</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full min-w-[820px] text-xs text-left">
                  <thead><tr className="bg-slate-100 dark:bg-slate-800 text-slate-500"><th className="p-3">No</th><th className="p-3">Nama</th><th className="p-3">Jabatan</th><th className="p-3">Instansi</th><th className="p-3">Jenis</th><th className="p-3">Check-in</th><th className="p-3">Check-out</th><th className="p-3">Keterangan</th></tr></thead>
                  <tbody>{externalLogs.map((gst, index) => <tr key={`report-${gst.id}`} className="border-t border-slate-200 dark:border-slate-800"><td className="p-3">{index + 1}</td><td className="p-3 font-bold text-slate-900 dark:text-white">{gst.isRepresented ? gst.representativeName : gst.guestName || gst.invitedName}</td><td className="p-3">{gst.isRepresented ? gst.representativePosition : gst.position || '-'}</td><td className="p-3">{gst.agency || gst.guestAgency || '-'}</td><td className="p-3">{gst.participantCategory || 'OPD/INSTANSI'}</td><td className="p-3 font-mono">{formatCheckInWithStatus(gst)}</td><td className="p-3 font-mono">{gst.checkOutAt ? `${new Date(gst.checkOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB` : '-'}</td><td className="p-3">{gst.note || (gst.isRepresented ? 'Hadir sebagai perwakilan' : gst.status || 'Hadir')}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {externalLogs.map((gst) => (
                <div
                  key={gst.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">
                        {gst.agency}
                      </span>
                      <h4 className="font-bold text-sm text-white">{gst.invitedName}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${gst.isRepresented ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                      {gst.isRepresented ? 'Diwakili' : 'Hadir Langsung'}
                    </span>
                  </div>

                  {gst.isRepresented && (
                    <div className="p-2.5 bg-slate-800/60 rounded-xl text-xs border border-slate-700/60">
                      <span className="text-slate-400 block text-[10px]">Perwakilan Delegasi:</span>
                      <span className="font-bold text-cyan-300">{gst.representativeName}</span>
                      <span className="text-slate-400 text-[11px] block">({gst.representativePosition})</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800">
                    <span>Waktu: {new Date(gst.timestamp).toLocaleTimeString('id-ID')} WIB</span>
                    <span className="italic">{gst.note || '-'}</span>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: RIWAYAT & VALIDASI PERANGKAT ── */}
      {activeSubTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Log Perangkat & Validasi Waktu</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Total {activityLogs.length} Records</span>
          </div>

          <div className="divide-y divide-slate-800 text-xs">
            {activityLogs.map(log => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-white block">{log.memberName || log.invitedName} ({log.participantType})</span>
                  <span className="text-[11px] text-slate-400">
                    {log.method} • Device: {log.deviceType || 'PC / Mobile'} ({log.deviceId || 'DEV-AUTO'})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono text-emerald-400 block">
                    {new Date(log.timestamp).toLocaleTimeString('id-ID')} WIB
                  </span>
                  <span className="text-[10px] text-slate-500">{log.note || 'Tervalidasi'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {isScannerOpen && (
        <QRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          activityId={selectedActivityId}
        />
      )}

      {manualModalState.isOpen && (
        <ManualAttendanceModal
          isOpen={manualModalState.isOpen}
          onClose={() => setManualModalState({ isOpen: false, memberId: null })}
          activityId={selectedActivityId}
          memberId={manualModalState.memberId}
        />
      )}

      {isQRModalOpen && selectedActivity && (
        <ActivityQRModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          activity={selectedActivity}
        />
      )}

      {isGuestModalOpen && (
        <GuestAttendanceModal
          isOpen={isGuestModalOpen}
          onClose={() => setIsGuestModalOpen(false)}
          activityId={selectedActivityId}
        />
      )}

      {isLPJModalOpen && (
        <LPJViewerModal
          isOpen={isLPJModalOpen}
          onClose={() => setIsLPJModalOpen(false)}
          activityId={selectedActivityId}
        />
      )}

    </div>
  );
}
