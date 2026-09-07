import React, { useState, useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import QRScannerModal from '../components/QRScannerModal';
import ManualAttendanceModal from '../components/ManualAttendanceModal';
import { getStatusBadge, getMethodBadge } from '../utils/raportUtils';
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
  MapPin
} from 'lucide-react';

export default function AttendanceScan() {
  const {
    activities,
    members,
    logs,
    loading
  } = useAttendance();

  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('scan'); // 'scan' | 'history'

  // Auto-pilih kegiatan aktif ketika data Firestore selesai dimuat
  useEffect(() => {
    if (!selectedActivityId && activities.length > 0) {
      const active = activities.find(a => a.status === 'ACTIVE') || activities[0];
      setSelectedActivityId(active.id);
    }
  }, [activities]);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [manualModalState, setManualModalState] = useState({ isOpen: false, memberId: null });
  const [searchQuery, setSearchQuery] = useState('');

  const selectedActivity = activities.find(a => a.id === selectedActivityId) || activities[0];
  const activityLogs = logs.filter(l => l.activityId === selectedActivityId);

  // Members attendance list
  const memberAttendanceList = members.map(m => {
    const log = activityLogs.find(l => l.memberId === m.id);
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

  const checkedInCount = activityLogs.filter(l => l.status === 'Hadir' || l.status === 'Terlambat').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="ml-3 text-slate-400">Memuat data dari Firestore...</span>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <Calendar className="w-14 h-14 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
        <h2 className="text-slate-600 dark:text-slate-300 font-bold text-lg">Belum Ada Agenda Kegiatan</h2>
        <p className="text-slate-400 text-sm mt-2">Buat agenda kegiatan terlebih dahulu di menu <strong>Agenda Kegiatan</strong>.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-900 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-cyan-500/20 text-cyan-300 text-[10px] sm:text-xs font-extrabold px-2.5 py-0.5 rounded border border-cyan-500/30 uppercase tracking-wide">
              Operator Console Laptop Webcam
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-white">Absensi QR Code Camera Laptop</h1>
          <p className="text-xs text-slate-300">
            Pemindaian identitas digital QR Code anggota DPRD melalui webcam laptop petugas.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setManualModalState({ isOpen: true, memberId: null })}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-amber-500/40 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition"
          >
            <Edit3 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>+ Input Manual</span>
          </button>
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition"
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span>Mulai Scan QR</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Tabs (Sesuai Mockup Screen 4) */}
      <div className="flex items-center gap-2 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <button
          onClick={() => setActiveSubTab('scan')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'scan'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>QR Webcam</span>
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
          <span>Riwayat Presensi ({activityLogs.length})</span>
        </button>
      </div>

      {/* ── MODE 1: QR WEBCAM SCAN VIEW (Sesuai Mockup Mobile Screen 4) ── */}
      {activeSubTab === 'scan' && (
        <div className="space-y-4">
          {/* Main Mobile Scanner Viewfinder Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-2xl text-center space-y-5">
            {/* Viewfinder Frame */}
            <div
              onClick={() => setIsScannerOpen(true)}
              className="w-44 h-44 sm:w-56 sm:h-56 mx-auto rounded-3xl border-2 border-dashed border-emerald-500/60 bg-slate-950 flex flex-col items-center justify-center p-4 cursor-pointer hover:border-emerald-400 transition group shadow-inner"
            >
              <div className="p-4 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:scale-110 transition duration-300">
                <Camera className="w-10 h-10" />
              </div>
              <span className="text-xs font-extrabold text-white mt-3">Scan QR Code</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Arahkan kamera ke QR Code</span>
            </div>

            {/* Info Badges (Sesuai Mockup Screen 4) */}
            <div className="space-y-2.5 text-left max-w-sm mx-auto">
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/80 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-medium">Lokasi Absensi</span>
                  <span className="font-bold text-xs text-white truncate block">
                    {selectedActivity?.locationName || 'Ruang Rapat DPRD'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-amber-950 text-amber-400 border border-amber-800/80 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-medium">Waktu Sekarang</span>
                  <span className="font-mono font-bold text-xs text-emerald-400 block">
                    {new Date().toLocaleTimeString('id-ID')} WIB
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/80 shrink-0">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-medium">Status</span>
                  <span className="font-bold text-xs text-emerald-300 block">
                    Siap melakukan absensi ({checkedInCount} / {members.length} Hadir)
                  </span>
                </div>
              </div>
            </div>

            {/* Big Action Button */}
            <button
              onClick={() => setIsScannerOpen(true)}
              className="w-full max-w-sm mx-auto py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-950 transition active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Buka Kamera Laptop Scan QR</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MODE 2: RIWAYAT & DAFTAR ANGGOTA ── */}
      {(activeSubTab === 'history' || true) && (
        <div className={`space-y-4 ${activeSubTab === 'scan' ? 'hidden md:block' : 'block'}`}>
          {/* Select Active Agenda Box */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0" />
                <span>Pilih Agenda Rapat / Kegiatan Aktif:</span>
              </div>
              <select
                value={selectedActivityId}
                onChange={(e) => setSelectedActivityId(e.target.value)}
                className="w-full sm:w-auto bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-bold text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 max-w-md"
              >
                {activities.map(a => (
                  <option key={a.id} value={a.id}>
                    [{a.category}] {a.title} ({a.date})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Activity Detail Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs bg-slate-50 dark:bg-slate-800/50 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-400 font-medium">Judul Kegiatan:</span>
                <p className="font-extrabold text-slate-900 dark:text-white mt-0.5 truncate">{selectedActivity?.title}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Waktu & Lokasi:</span>
                <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                  {selectedActivity?.date} • {selectedActivity?.startTime} WIB ({selectedActivity?.locationName})
                </p>
              </div>
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 text-[10px] sm:text-[11px]">Hadir / Ter-Presensi:</span>
                  <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">{checkedInCount} / {members.length} Anggota</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold text-[11px]">
                  {Math.round((checkedInCount / (members.length || 1)) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
              Daftar Kehadiran Rapat ({memberAttendanceList.length} Anggota)
            </h3>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama, fraksi, komisi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-xs rounded-xl border border-slate-300 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Mobile Card List for Attendance */}
          <div className="md:hidden space-y-2.5">
            {memberAttendanceList.map(({ member, log }) => {
              const statusBadge = getStatusBadge(log ? log.status : 'Tanpa Keterangan');
              const methodBadge = getMethodBadge(log ? log.method : null);
              return (
                <div
                  key={member.id}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {member.photo ? (
                        <img src={member.photo} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {member.name?.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-white truncate">{member.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{member.fraksi} • {member.komisi}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${statusBadge.bg}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {log ? (
                          new Date(log.timestampISO || log.timestamp || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
                        ) : 'Belum presensi'}
                      </span>
                    </div>

                    <button
                      onClick={() => setManualModalState({ isOpen: true, memberId: member.id })}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold rounded-lg text-[10px] inline-flex items-center gap-1 border border-slate-700"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit Manual</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (Hidden on Mobile) */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
                  <tr>
                    <th className="p-3">Anggota DPRD</th>
                    <th className="p-3">Fraksi & Komisi</th>
                    <th className="p-3 text-center">Waktu Presensi</th>
                    <th className="p-3 text-center">Status Presensi</th>
                    <th className="p-3 text-center">Metode Absensi</th>
                    <th className="p-3 text-center">Verifikasi Visual</th>
                    <th className="p-3 text-right">Aksi Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {memberAttendanceList.map(({ member, log }) => {
                    const statusBadge = getStatusBadge(log ? log.status : 'Tanpa Keterangan');
                    const methodBadge = getMethodBadge(log ? log.method : null);
                    return (
                      <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3">
                          <div className="flex items-center space-x-3">
                            {member.photo
                              ? <img src={member.photo} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
                              : <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-sm shrink-0">{member.name?.charAt(0)}</div>
                            }
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white">{member.name}</h4>
                              <p className="text-[11px] text-slate-400 font-mono">NIP: {member.nip}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{member.fraksi}</p>
                          <p className="text-[11px] text-slate-400">{member.komisi}</p>
                        </td>

                        <td className="p-3 text-center font-mono text-[11px]">
                          {log
                            ? (() => {
                                const ts = log.timestampISO || (log.timestamp?.toDate ? log.timestamp.toDate().toISOString() : log.timestamp);
                                return ts ? new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
                              })()
                            : '—'
                          }
                        </td>

                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${statusBadge.bg}`}>
                            {statusBadge.label}
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          {log ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${methodBadge.bg}`}>
                              {methodBadge.icon} {methodBadge.label}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Belum Presensi</span>
                          )}
                        </td>

                        <td className="p-3 text-center">
                          {log?.method === 'QR_WEBCAM' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Photo Match</span>
                            </span>
                          ) : log?.method === 'GPS_ONLINE' ? (
                            <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold text-[11px]">
                              📍 GPS Verified ({log.distanceMeters}m)
                            </span>
                          ) : log?.method === 'MANUAL_OVERRIDE' ? (
                            <span className="text-slate-500 font-medium text-[11px]">Audit Override</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        <td className="p-3 text-right">
                          <button
                            onClick={() => setManualModalState({ isOpen: true, memberId: member.id })}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-[11px] inline-flex items-center gap-1 border border-slate-300 dark:border-slate-700"
                            title="Input / Edit Absensi Manual"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                            <span>Edit Manual</span>
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Webcam Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        selectedActivityId={selectedActivityId}
      />

      {/* Manual Override Modal */}
      <ManualAttendanceModal
        isOpen={manualModalState.isOpen}
        onClose={() => setManualModalState({ isOpen: false, memberId: null })}
        activityId={selectedActivityId}
        memberId={manualModalState.memberId}
      />

    </div>
  );
}
