import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import {
  Building2, Users, CheckCircle, AlertCircle, X,
  UserCheck, Send, Loader2, Clock, ShieldCheck
} from 'lucide-react';

export default function GuestAttendanceModal({ isOpen, onClose, activityId: propActivityId }) {
  const { activities, recordGuestAttendance } = useAttendance();

  const [activityId, setActivityId] = useState(propActivityId || '');
  const [agency, setAgency] = useState('');
  const [invitedName, setInvitedName] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [participantCategory, setParticipantCategory] = useState('OPD/INSTANSI');
  const [isRepresented, setIsRepresented] = useState(false);
  const [representativeName, setRepresentativeName] = useState('');
  const [representativePosition, setRepresentativePosition] = useState('');
  const [note, setNote] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [syncWarning, setSyncWarning] = useState('');
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      const active = activities.find(a => a.id === propActivityId) || activities.find(a => a.status === 'ACTIVE') || activities[0];
      setActivityId(propActivityId || (active?.id || ''));
      setError('');
      setSyncWarning('');
      setSuccess(false);
      setIsLoading(false);
      setAgency('');
      setInvitedName('');
      setPosition('');
      setPhone('');
      setParticipantCategory('OPD/INSTANSI');
      setIsRepresented(false);
      setRepresentativeName('');
      setRepresentativePosition('');
      setNote('');
    }
  }, [isOpen, propActivityId, activities]);

  if (!isOpen) return null;

  const currentActivity = activities.find(a => a.id === activityId);

  // Template instansi cepat / pre-invited guests jika ada
  const predefinedGuests = currentActivity?.invitedGuests || [];

  const handleSelectPredefined = (gst) => {
    setAgency(gst.agency);
    setInvitedName(gst.invitedName);
    setPosition(gst.position || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!activityId) { setError('Pilih agenda kegiatan.'); return; }
    if (!agency.trim()) { setError('Nama Instansi / OPD wajib diisi.'); return; }
    if (!invitedName.trim()) { setError('Nama pejabat yang diundang wajib diisi.'); return; }
    if (isRepresented && !representativeName.trim()) {
      setError('Nama perwakilan yang hadir wajib diisi jika berstatus diwakili.');
      return;
    }

    setIsLoading(true);
    const res = await recordGuestAttendance({
      activityId,
      agency: agency.trim(),
      invitedName: invitedName.trim(),
      position: position.trim(),
      phone: phone.trim(),
      participantCategory,
      isRepresented,
      representativeName: representativeName.trim(),
      representativePosition: representativePosition.trim(),
      note: note.trim()
    });
    setIsLoading(false);

    if (res.success) {
      setSyncWarning(res.warning || '');
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } else {
      setError(res.message || 'Gagal menyimpan absensi tamu.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl text-slate-100 relative max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-teal-950/80 border border-teal-800 text-teal-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Presensi Tamu Eksternal & OPD</h3>
              <p className="text-xs text-slate-400">Masuk ke daftar hadir & LPJ Kegiatan (Bukan Raport Anggota)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Agenda Selector */}
          <div>
            <label className="block font-bold text-slate-300 mb-1.5">Pilih Agenda Kegiatan:</label>
            <select
              value={activityId}
              onChange={e => setActivityId(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 font-semibold text-xs"
            >
              {activities.map(a => (
                <option key={a.id} value={a.id}>
                  [{a.category}] {a.title} ({a.date})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Select Invited Guest (jika ada daftar undangan di agenda) */}
          {predefinedGuests.length > 0 && (
            <div className="space-y-1.5 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Pilih dari Daftar Undangan Agenda:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {predefinedGuests.map(gst => (
                  <button
                    key={gst.id}
                    type="button"
                    onClick={() => handleSelectPredefined(gst)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-[11px] transition"
                  >
                    + {gst.agency}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Instansi / Dinas */}
          <div>
            <label className="block font-bold text-slate-300 mb-1">Kategori Peserta:</label>
            <select value={participantCategory} onChange={e => setParticipantCategory(e.target.value)} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs">
              <option value="OPD/INSTANSI">OPD / Instansi</option>
              <option value="SEKRETARIAT/ASN">Sekretariat / ASN</option>
              <option value="NARASUMBER">Narasumber</option>
              <option value="TAMU/UNDANGAN">Tamu / Undangan</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Nama Instansi / OPD / Organisasi:</label>
            <input
              type="text"
              placeholder="Contoh: Dinas Kesehatan Kab. Cirebon / Bappelitbangda"
              value={agency}
              onChange={e => setAgency(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs"
            />
          </div>

          {/* Pejabat Yang Diundang */}
          <div>
            <label className="block font-bold text-slate-300 mb-1">Nama Pejabat / Pihak Yang Diundang:</label>
            <input
              type="text"
              placeholder="Contoh: Kepala Dinas Kesehatan / Dr. Hj. Neneng, M.Kes."
              value={invitedName}
              onChange={e => setInvitedName(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Jabatan:</label>
              <input type="text" placeholder="Contoh: Kepala Dinas / Sekretaris" value={position} onChange={e => setPosition(e.target.value)} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs" />
            </div>
            <div>
              <label className="block font-bold text-slate-300 mb-1">Nomor HP (Opsional):</label>
              <input type="tel" placeholder="08xxxxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs" />
            </div>
          </div>

          {/* Toggle Delegasi / Perwakilan */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Status Kehadiran Delegasi</span>
                <span className="text-[11px] text-slate-400">Apakah pejabat yang bersangkutan diwakilkan?</span>
              </div>
              <button
                type="button"
                onClick={() => setIsRepresented(!isRepresented)}
                className={`w-12 h-6 rounded-full transition relative p-0.5 ${isRepresented ? 'bg-cyan-600' : 'bg-slate-700'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isRepresented ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Input Perwakilan jika diwakilkan */}
            {isRepresented && (
              <div className="space-y-2.5 pt-2 border-t border-slate-700/60 animate-fadeIn">
                <div>
                  <label className="block font-bold text-cyan-300 mb-1">Nama Perwakilan Yang Hadir:</label>
                  <input
                    type="text"
                    placeholder="Nama lengkap perwakilan delegasi..."
                    value={representativeName}
                    onChange={e => setRepresentativeName(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-cyan-500/50 rounded-xl text-slate-200 text-xs focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-cyan-300 mb-1">Jabatan Perwakilan:</label>
                  <input
                    type="text"
                    placeholder="Contoh: Sekretaris Dinas / Kabid Pelayanan"
                    value={representativePosition}
                    onChange={e => setRepresentativePosition(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-cyan-500/50 rounded-xl text-slate-200 text-xs focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Keterangan Tambahan */}
          <div>
            <label className="block font-bold text-slate-300 mb-1">Catatan / Keterangan (Opsional):</label>
            <input
              type="text"
              placeholder="Contoh: Membawa naskah materi paparan RDP"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs"
            />
          </div>

          {/* Error / Success message */}
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                Presensi Tamu Berhasil Dicatat ke Laporan Peserta Eksternal.
                {syncWarning ? <span className="block text-amber-300 mt-1">Sinkronisasi: {syncWarning}</span> : <span className="block text-emerald-200 mt-1">Tersimpan & tersinkronisasi.</span>}
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || success}
            className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Simpan Presensi Tamu OPD</span>
          </button>

        </form>

      </div>
    </div>
  );
}
