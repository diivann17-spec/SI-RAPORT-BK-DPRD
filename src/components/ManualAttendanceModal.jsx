import React, { useState, useMemo } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import {
  Edit3, CheckCircle, AlertCircle, X, ShieldAlert,
  Loader2, Search, ChevronDown
} from 'lucide-react';

/**
 * ManualAttendanceModal
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   activityId?: string  — jika sudah ditentukan (dari AttendanceScan)
 *   memberId?: string    — jika sudah ditentukan (edit spesifik)
 */
export default function ManualAttendanceModal({ isOpen, onClose, activityId: propActivityId, memberId: propMemberId }) {
  const { members, activities, logs, recordManualAttendance, getMemberById } = useAttendance();

  const [selectedMemberId, setSelectedMemberId] = useState(propMemberId || '');
  const [selectedActivityId, setSelectedActivityId] = useState(propActivityId || '');
  const [memberSearch, setMemberSearch] = useState('');
  const [status, setStatus] = useState('Hadir');
  const [note, setNote] = useState('');
  const [operatorName, setOperatorName] = useState('Petugas Sekretariat DPRD');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Sync state whenever modal is opened
  React.useEffect(() => {
    if (isOpen) {
      setSelectedMemberId(propMemberId || (members[0]?.id || ''));
      const activeAct = activities.find(a => a.id === propActivityId) || activities.find(a => a.status === 'ACTIVE') || activities[0];
      setSelectedActivityId(propActivityId || (activeAct?.id || ''));
      setError('');
      setIsSuccess(false);
      setIsLoading(false);
      setNote('');
      setStatus('Hadir');
    }
  }, [isOpen, propActivityId, propMemberId, activities, members]);

  const selectedMember = getMemberById(selectedMemberId);
  const selectedActivity = activities.find(a => a.id === selectedActivityId);

  // Cek apakah anggota ini sudah absen di kegiatan ini
  const existingLog = useMemo(() =>
    logs.find(l => l.activityId === selectedActivityId && l.memberId === selectedMemberId),
    [logs, selectedActivityId, selectedMemberId]
  );

  // Filter anggota berdasarkan pencarian
  const filteredMembers = useMemo(() =>
    members.filter(m =>
      m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.fraksi?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.nip?.includes(memberSearch)
    ),
    [members, memberSearch]
  );

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedMemberId) { setError('Pilih anggota DPRD terlebih dahulu.'); return; }
    if (!selectedActivityId) { setError('Pilih agenda kegiatan terlebih dahulu.'); return; }
    if (!note.trim()) { setError('Alasan/Keterangan wajib diisi untuk keperluan Audit Trail.'); return; }

    setIsLoading(true);
    const result = await recordManualAttendance({
      activityId: selectedActivityId,
      memberId: selectedMemberId,
      status,
      note,
      operatorName,
    });
    setIsLoading(false);

    if (result.success) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1800);
    } else {
      setError(result.message || 'Gagal menyimpan absensi manual ke database.');
    }
  };

  const handleClose = () => {
    setError('');
    setIsSuccess(false);
    setIsLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl text-slate-100 relative max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Input Absensi Manual</h3>
              <p className="text-xs text-slate-400">Disimpan ke Cloud Firestore + Audit Trail</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">

          {/* ── Pilih Kegiatan ── */}
          <div>
            <label className="block font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              Pilih Agenda Kegiatan:
            </label>
            <select
              value={selectedActivityId}
              onChange={e => setSelectedActivityId(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 font-semibold focus:ring-2 focus:ring-amber-500 focus:border-transparent text-xs"
            >
              <option value="">— Pilih Agenda Kegiatan —</option>
              {activities.map(a => (
                <option key={a.id} value={a.id}>
                  [{a.category}] {a.title} ({a.date} • {a.startTime} WIB)
                </option>
              ))}
            </select>
            {activities.length === 0 && (
              <p className="text-amber-400 mt-1 text-[11px]">Belum ada agenda rapat di database. Buat terlebih dahulu di menu Agenda Kegiatan.</p>
            )}
          </div>

          {/* Info kegiatan terpilih */}
          {selectedActivity && (
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-white">{selectedActivity.title}</span>
                  <span className="text-slate-400 ml-2">— {selectedActivity.locationName}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-800">
                {selectedActivity.category}
              </span>
            </div>
          )}

          {/* ── Pilih Anggota ── */}
          {!propMemberId ? (
            <div>
              <label className="block font-bold text-slate-300 mb-1.5">Pilih Anggota DPRD:</label>

              {/* Search anggota */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                <input
                  type="text"
                  placeholder="Cari nama, fraksi, NIP..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              {/* Daftar anggota */}
              <div className="max-h-44 overflow-y-auto space-y-1 rounded-xl border border-slate-700 bg-slate-800/50">
                {filteredMembers.length === 0 && (
                  <p className="p-3 text-slate-400 text-center">Tidak ada anggota ditemukan</p>
                )}
                {filteredMembers.map(m => {
                  const alreadyPresent = logs.some(l => l.activityId === selectedActivityId && l.memberId === m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMemberId(m.id)}
                      className={`w-full p-2.5 flex items-center gap-3 text-left rounded-lg transition-colors ${
                        selectedMemberId === m.id
                          ? 'bg-amber-900/60 border border-amber-700'
                          : 'hover:bg-slate-700/60 border border-transparent'
                      }`}
                    >
                      {m.photo ? (
                        <img src={m.photo} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-600" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-700 shrink-0 flex items-center justify-center text-slate-300 text-sm font-bold">
                          {m.name?.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-100 truncate">{m.name}</p>
                        <p className="text-slate-400 truncate">{m.fraksi}</p>
                      </div>
                      {alreadyPresent && (
                        <span className="text-emerald-400 text-[10px] font-bold shrink-0">✓ Sudah Absen</span>
                      )}
                      {selectedMemberId === m.id && (
                        <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Anggota sudah ditentukan dari props */
            selectedMember && (
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
                {selectedMember.photo ? (
                  <img src={selectedMember.photo} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-700 shrink-0 flex items-center justify-center text-slate-300 font-bold">
                    {selectedMember.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-white">{selectedMember.name}</h4>
                  <p className="text-slate-400">{selectedMember.fraksi} • {selectedMember.komisi}</p>
                </div>
              </div>
            )
          )}

          {/* Info absensi existing */}
          {existingLog && (
            <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800 text-blue-300 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Anggota ini sudah tercatat <strong>{existingLog.status}</strong> via {existingLog.method}. Input ini akan mengoverride absensi sebelumnya.</span>
            </div>
          )}

          {/* ── Status ── */}
          <div>
            <label className="block font-bold text-slate-300 mb-1.5">Status Kehadiran:</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent font-semibold"
            >
              <option value="Hadir">🟢 Hadir</option>
              <option value="Terlambat">🟡 Terlambat</option>
              <option value="Izin">🔵 Izin Resmi (Surat Tugas)</option>
              <option value="Sakit">🟣 Sakit (Surat Dokter)</option>
              <option value="Dinas">🌐 Dinas Luar / Konsultasi</option>
              <option value="Tanpa Keterangan">🔴 Tanpa Keterangan (Alpa)</option>
            </select>
          </div>

          {/* ── Nama Petugas ── */}
          <div>
            <label className="block font-bold text-slate-300 mb-1.5">Nama Petugas Penginput:</label>
            <input
              type="text"
              value={operatorName}
              onChange={e => setOperatorName(e.target.value)}
              required
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {/* ── Alasan / Catatan ── */}
          <div>
            <label className="block font-bold text-slate-300 mb-1.5">
              Alasan & Catatan <span className="text-rose-400">*Wajib</span>:
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Contoh: QR card anggota rusak/hilang. Anggota hadir langsung ke meja petugas dan menunjukkan KTP/NIP..."
              rows={3}
              required
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Peringatan audit */}
          <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-300 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>Perubahan ini dicatat ke <strong>Audit Trail</strong> lengkap dengan timestamp, nama petugas, dan alasan perubahan.</span>
          </div>

          {/* Error */}
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {isSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>✅ Absensi manual berhasil disimpan ke Firestore & dicatat di Audit Trail!</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg transition"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Menyimpan...</span></>
              ) : (
                <><Edit3 className="w-4 h-4" /><span>Simpan Absensi Manual</span></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
