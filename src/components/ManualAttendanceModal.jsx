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
 *   activityId?: string
 *   memberId?: string
 */
export default function ManualAttendanceModal({ isOpen, onClose, activityId: propActivityId, memberId: propMemberId }) {
  const { members, personnel, activities, logs, recordManualAttendance, getParticipantById } = useAttendance();

  const [selectedMemberId, setSelectedMemberId] = useState(propMemberId || '');
  const [selectedActivityId, setSelectedActivityId] = useState(propActivityId || '');
  const [memberSearch, setMemberSearch] = useState('');
  const [status, setStatus] = useState('Hadir');
  const [sptNumber, setSptNumber] = useState('');
  const [sptDate, setSptDate] = useState('');
  const [note, setNote] = useState('');
  const [operatorName, setOperatorName] = useState('Petugas Sekretariat DPRD');
  const [error, setError] = useState('');
  const [syncWarning, setSyncWarning] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Sync state whenever modal is opened
  React.useEffect(() => {
    if (isOpen) {
      const activeAct = activities.find(a => a.id === propActivityId) || activities.find(a => a.status === 'ACTIVE') || activities[0];
      setSelectedActivityId(propActivityId || (activeAct?.id || ''));
      const activeParticipantIds = Array.isArray(activeAct?.participantMemberIds) ? activeAct.participantMemberIds : [];
      const firstParticipantId = [...members, ...personnel].find(member => activeParticipantIds.includes(member.id))?.id || '';
      setSelectedMemberId(propMemberId && activeParticipantIds.includes(propMemberId) ? propMemberId : firstParticipantId);
      setError('');
      setSyncWarning('');
      setIsSuccess(false);
      setIsLoading(false);
      setNote('');
      setSptNumber('');
      setSptDate('');
      setStatus('Hadir');
    }
  }, [isOpen, propActivityId, propMemberId, activities, members, personnel]);

  const selectedMember = getParticipantById(selectedMemberId);
  const selectedActivity = activities.find(a => a.id === selectedActivityId);
  const participantIds = Array.isArray(selectedActivity?.participantMemberIds) ? selectedActivity.participantMemberIds : [];
  const participantMembers = [...members, ...personnel].filter(member => participantIds.includes(member.id));

  // Cek apakah anggota ini sudah absen di kegiatan ini
  const existingLog = useMemo(() =>
    logs.find(l => l.activityId === selectedActivityId && l.memberId === selectedMemberId),
    [logs, selectedActivityId, selectedMemberId]
  );

  // Filter anggota berdasarkan pencarian
  const filteredMembers = useMemo(() =>
    participantMembers.filter(m =>
      m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.fraksi?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.nip?.includes(memberSearch)
    ),
    [participantMembers, memberSearch]
  );

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedMemberId) { setError('Pilih anggota DPRD terlebih dahulu.'); return; }
    if (!selectedActivityId) { setError('Pilih agenda kegiatan terlebih dahulu.'); return; }
    if (!note.trim() && status !== 'Hadir') { setError('Alasan/Keterangan wajib diisi untuk keperluan Audit Trail.'); return; }
    if (status === 'Dinas Luar' && (!sptNumber.trim() || !sptDate)) { setError('Nomor dan tanggal SPT wajib diisi untuk status Dinas Luar.'); return; }

    setIsLoading(true);
    const result = await recordManualAttendance({
      activityId: selectedActivityId,
      memberId: selectedMemberId,
      status,
      note: note.trim() || `Presensi manual [${status}]`,
      operatorName,
      sptNumber: status === 'Dinas Luar' ? sptNumber : null
      , sptDate: status === 'Dinas Luar' ? sptDate : null
    });
    setIsLoading(false);

    if (result.success) {
      setSyncWarning(result.warning || '');
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1500);
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
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl text-slate-100 relative max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-950/60 border border-amber-800 text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Input Presensi Manual & SPT</h3>
              <p className="text-xs text-slate-400">Tercatat ke Cloud Database & Jejak Audit</p>
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
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 font-semibold text-xs"
            >
              <option value="">— Pilih Agenda Kegiatan —</option>
              {activities.map(a => (
                <option key={a.id} value={a.id}>
                  [{a.category}] {a.title} ({a.date} • {a.startTime} WIB)
                </option>
              ))}
            </select>
          </div>

          {/* ── Pilih Anggota DPRD ── */}
          <div>
              <label className="block font-bold text-slate-300 mb-1.5">Pilih Anggota DPRD Peserta Agenda:</label>
            <select
              value={selectedMemberId}
              onChange={e => setSelectedMemberId(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 font-semibold text-xs"
            >
              {participantMembers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.fraksi})
                </option>
              ))}
            </select>
          </div>

          {/* ── Status Kehadiran ── */}
          <div>
            <label className="block font-bold text-slate-300 mb-1.5">Status Kehadiran:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {['Hadir', 'Terlambat', 'Dinas Luar', 'Izin', 'Sakit', 'Alpha'].map(st => (
                <button
                  type="button"
                  key={st}
                  onClick={() => setStatus(st)}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition border text-center ${
                    status === st
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Input SPT jika status Dinas Luar */}
          {status === 'Dinas Luar' && (
            <div className="p-3.5 bg-indigo-950/40 border border-indigo-800/50 rounded-2xl space-y-2">
              <label className="block font-bold text-indigo-300">Nomor Surat Perintah Tugas (SPT):</label>
              <input
                type="text"
                placeholder="Contoh: SPT.090/451/BK-DPRD/IX/2026"
                value={sptNumber}
                onChange={e => setSptNumber(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-indigo-500/50 rounded-xl text-white text-xs font-mono"
              />
              <label className="block font-bold text-indigo-300">Tanggal SPT:</label>
              <input type="date" value={sptDate} onChange={e => setSptDate(e.target.value)} className="w-full p-2.5 bg-slate-900 border border-indigo-500/50 rounded-xl text-white text-xs" />
            </div>
          )}

          {/* ── Nama Petugas ── */}
          <div>
            <label className="block font-bold text-slate-300 mb-1.5">Nama Petugas Penginput:</label>
            <input
              type="text"
              value={operatorName}
              onChange={e => setOperatorName(e.target.value)}
              required
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs"
            />
          </div>

          {/* Keterangan / Alasan */}
          <div>
            <label className="block font-bold text-slate-300 mb-1.5">Alasan / Keterangan Resmi:</label>
            <textarea
              rows={2}
              placeholder="Tuliskan keterangan detail..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs"
            />
          </div>

          {/* Peringatan audit */}
          <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-300 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>Perubahan ini dicatat ke <strong>Audit Trail</strong> lengkap dengan timestamp, nama petugas, dan alasan perubahan.</span>
          </div>

          {/* Error */}
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {isSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                Presensi manual berhasil dicatat & masuk Audit Trail.
                {syncWarning ? <span className="block text-amber-300 mt-1">Sinkronisasi: {syncWarning}</span> : <span className="block text-emerald-200 mt-1">Tersimpan & tersinkronisasi.</span>}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-2">
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
                <><Edit3 className="w-4 h-4" /><span>Simpan Presensi Manual</span></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
