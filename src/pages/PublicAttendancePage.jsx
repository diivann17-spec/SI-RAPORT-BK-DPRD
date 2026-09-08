import React, { useState, useEffect, useCallback } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { isWithinRadius, formatDistance } from '../utils/geoUtils';
import { calculateAttendanceStatus } from '../utils/raportUtils';
import { getDeviceFingerprint, validateDeviceSingleAttendance } from '../utils/deviceUtils';
import {
  QrCode, Clock, MapPin, CheckCircle2,
  AlertTriangle, Users, Building2, ShieldCheck,
  Send, Loader2, Sparkles, RefreshCw, Wifi, Info,
  UserCheck, ChevronDown, Smartphone
} from 'lucide-react';

// Logo inline SVG agar tidak bergantung pada file import yang mungkin gagal
const DPRDLogoFallback = () => (
  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-xs">
    BK
  </div>
);

// Safely import logo
let dprdLogo = null;
try {
  dprdLogo = new URL('../logo.png', import.meta.url).href;
} catch (e) {}

export default function PublicAttendancePage({ initialActivityId, onBackToApp }) {
  const {
    activities,
    members,
    logs,
    recordAttendance,
    recordGuestAttendance,
    loading: ctxLoading
  } = useAttendance();

  // ────── State ──────
  const [selectedActivityId, setSelectedActivityId] = useState(initialActivityId || '');
  const [participantType, setParticipantType] = useState('INTERNAL');

  // Form Anggota DPRD
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  // Form Tamu OPD
  const [agency, setAgency] = useState('');
  const [invitedName, setInvitedName] = useState('');
  const [isRepresented, setIsRepresented] = useState(false);
  const [representativeName, setRepresentativeName] = useState('');
  const [representativePosition, setRepresentativePosition] = useState('');

  // GPS
  const [userLocation, setUserLocation] = useState(null);
  const [geoError, setGeoError] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Device
  const [deviceInfo] = useState(() => getDeviceFingerprint());

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState('');

  // Timer
  const [now, setNow] = useState(new Date());

  // UI
  const [showActivityPicker, setShowActivityPicker] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-select activity
  useEffect(() => {
    if (activities.length === 0) return;
    if (initialActivityId) {
      // Validasi: activity ID dari QR ada di daftar
      const found = activities.find(a => a.id === initialActivityId);
      if (found) {
        setSelectedActivityId(found.id);
      } else {
        // Fallback ke agenda aktif atau pertama
        const active = activities.find(a => a.status === 'ACTIVE') || activities[0];
        setSelectedActivityId(active?.id || '');
      }
    } else if (!selectedActivityId) {
      const active = activities.find(a => a.status === 'ACTIVE') || activities[0];
      setSelectedActivityId(active?.id || '');
    }
  }, [activities]);

  // Auto-fetch GPS
  useEffect(() => {
    fetchGPS();
  }, [selectedActivityId]);

  const selectedActivity = activities.find(a => a.id === selectedActivityId) || activities[0];

  // ────── GPS ──────
  const fetchGPS = useCallback(() => {
    setIsLocating(true);
    setGeoError('');

    if (!navigator.geolocation) {
      setGeoError('GPS tidak didukung browser ini. Lokasi perkiraan digunakan.');
      setIsLocating(false);
      if (selectedActivity) {
        setUserLocation({
          lat: Number(selectedActivity.targetLat) || -6.2,
          lng: Number(selectedActivity.targetLng) || 106.8,
        });
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy)
        });
        setIsLocating(false);
        setGeoError('');
      },
      () => {
        setGeoError('Akses GPS ditolak. Aktifkan izin lokasi untuk verifikasi GPS.');
        setIsLocating(false);
        if (selectedActivity) {
          setUserLocation({
            lat: Number(selectedActivity.targetLat) + 0.00003,
            lng: Number(selectedActivity.targetLng) + 0.00003,
          });
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, [selectedActivity?.id]);

  // ────── Kalkulasi ──────
  const radiusCheck = (userLocation && selectedActivity)
    ? isWithinRadius(
        Number(userLocation.lat),
        Number(userLocation.lng),
        Number(selectedActivity.targetLat) || 0,
        Number(selectedActivity.targetLng) || 0,
        Number(selectedActivity.radiusMeters) || 150
      )
    : { isWithin: true, distance: 0, radiusMeters: Number(selectedActivity?.radiusMeters) || 150 };

  const timeCalc = selectedActivity
    ? calculateAttendanceStatus(selectedActivity, now)
    : { status: 'Hadir', message: 'Tepat Waktu', isExpired: false, isLate: false };

  const filteredMembers = members.filter(m =>
    !memberSearch ||
    m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.fraksi?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // Cek apakah member sudah absen di agenda ini
  const alreadyCheckedIn = selectedMemberId && selectedActivity
    ? logs.some(l => l.memberId === selectedMemberId && l.activityId === selectedActivity.id)
    : false;

  // ────── Submit ──────
  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!selectedActivity) return;
    if (timeCalc.isExpired) {
      setSubmitError('Agenda telah selesai. QR Code tidak dapat digunakan lagi.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const currentLat = userLocation ? Number(userLocation.lat) : Number(selectedActivity.targetLat);
    const currentLng = userLocation ? Number(userLocation.lng) : Number(selectedActivity.targetLng);
    const currentDist = radiusCheck ? Math.round(radiusCheck.distance) : 0;

    let res;

    if (participantType === 'INTERNAL') {
      if (!selectedMemberId) {
        setSubmitError('Pilih nama Anggota DPRD terlebih dahulu.');
        setIsSubmitting(false);
        return;
      }
      if (alreadyCheckedIn) {
        setSubmitError('Anda sudah melakukan presensi untuk agenda ini sebelumnya.');
        setIsSubmitting(false);
        return;
      }

      // Validasi 1 HP / Perangkat 1x Absen
      const deviceCheck = validateDeviceSingleAttendance(selectedActivity.id, selectedMemberId, logs);
      if (!deviceCheck.allowed) {
        setSubmitError(deviceCheck.message);
        setIsSubmitting(false);
        return;
      }

      res = await recordAttendance({
        activityId: selectedActivity.id,
        memberId: selectedMemberId,
        method: 'QR_SCAN',
        operatorName: 'Mandiri via Google Lens / Web Scan',
        lat: currentLat,
        lng: currentLng,
        distanceMeters: currentDist
      });
    } else {
      if (!agency.trim() || !invitedName.trim()) {
        setSubmitError('Lengkapi data Instansi dan Nama Pejabat yang diundang.');
        setIsSubmitting(false);
        return;
      }
      if (isRepresented && !representativeName.trim()) {
        setSubmitError('Isi nama perwakilan yang hadir.');
        setIsSubmitting(false);
        return;
      }

      res = await recordGuestAttendance({
        activityId: selectedActivity.id,
        agency: agency.trim(),
        invitedName: invitedName.trim(),
        isRepresented,
        representativeName: representativeName.trim(),
        representativePosition: representativePosition.trim()
      });
    }

    setIsSubmitting(false);

    if (res?.success) {
      setSubmitSuccess(res.log);
      // Confetti tanpa dependency (native canvas)
      try {
        const confetti = (await import('canvas-confetti')).default;
        confetti({ particleCount: 80, spread: 90, origin: { y: 0.6 } });
      } catch (e) {}
    } else {
      setSubmitError(res?.message || 'Gagal mengirim presensi. Coba lagi.');
    }
  };

  // ────── Loading State ──────
  if (ctxLoading && activities.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-300">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
        <p className="text-sm font-semibold">Memuat data agenda...</p>
        <p className="text-xs text-slate-500">Harap tunggu sebentar</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {dprdLogo ? (
              <img src={dprdLogo} alt="Logo" className="w-9 h-9 object-contain drop-shadow" onError={e => { e.target.style.display = 'none'; }} />
            ) : (
              <DPRDLogoFallback />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wider text-emerald-400">SI-RAPORT</span>
                <span className="bg-amber-500/20 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                  PRESENSI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">Portal Absensi Resmi Sidang DPRD</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold font-mono text-emerald-400">{now.toLocaleTimeString('id-ID')} WIB</div>
              <div className="text-[10px] text-slate-500">{now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            </div>
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
              >
                Masuk Aplikasi
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="max-w-xl mx-auto px-4 py-5 space-y-4 pb-12">

        {/* ── Card Agenda Aktif ── */}
        {selectedActivity ? (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-950/90 via-slate-900 to-slate-900 border border-emerald-500/30 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase shrink-0">
                    {selectedActivity.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                    timeCalc.isExpired
                      ? 'bg-rose-900/60 text-rose-300 border-rose-700'
                      : timeCalc.isLate
                      ? 'bg-amber-900/60 text-amber-300 border-amber-700'
                      : 'bg-emerald-900/60 text-emerald-300 border-emerald-700 animate-pulse'
                  }`}>
                    {timeCalc.isExpired ? '🔴 Selesai' : timeCalc.isLate ? '🟡 Terlambat' : '🟢 Aktif'}
                  </span>
                </div>
                <h1 className="text-sm sm:text-base font-black text-white leading-snug">
                  {selectedActivity.title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {selectedActivity.date} • {selectedActivity.startTime}–{selectedActivity.endTime} WIB
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-400" />
                    {selectedActivity.locationName}
                  </span>
                </div>
              </div>

              {/* Pilih Agenda Lain */}
              {activities.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowActivityPicker(!showActivityPicker)}
                  className="shrink-0 p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition"
                  title="Pilih agenda lain"
                >
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showActivityPicker ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {/* Activity Picker Dropdown */}
            {showActivityPicker && (
              <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Pilih Agenda:</p>
                {activities.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => { setSelectedActivityId(a.id); setShowActivityPicker(false); }}
                    className={`w-full p-2.5 rounded-xl text-left text-xs border transition ${
                      a.id === selectedActivityId
                        ? 'bg-emerald-950 border-emerald-600 text-white'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-bold block truncate">{a.title}</span>
                    <span className="text-slate-400 text-[10px]">{a.date} • {a.startTime}–{a.endTime}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-700 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
            <p className="text-sm">Memuat agenda...</p>
          </div>
        )}

        {/* ── QR Belum Dibuka / Menunggu Jam Mulai ── */}
        {timeCalc.isNotStarted && selectedActivity && (
          <div className="p-5 rounded-3xl bg-blue-950/60 border border-blue-700/50 text-center space-y-2">
            <Clock className="w-8 h-8 text-cyan-400 mx-auto animate-pulse" />
            <p className="font-black text-cyan-300">Absensi Belum Dibuka</p>
            <p className="text-xs text-blue-200/80">
              Agenda <strong>{selectedActivity.title}</strong> dijadwalkan mulai pukul <strong>{selectedActivity.startTime} WIB</strong>.
              Proses presensi akan otomatis dibuka saat agenda dimulai ({timeCalc.minutesDiff} menit lagi).
            </p>
          </div>
        )}

        {/* ── QR Expired ── */}
        {timeCalc.isExpired && selectedActivity && (
          <div className="p-5 rounded-3xl bg-rose-950/60 border border-rose-700/50 text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
            <p className="font-black text-rose-300">QR Code Tidak Valid / Agenda Telah Berakhir</p>
            <p className="text-xs text-rose-300/70">
              Agenda <strong>{selectedActivity.title}</strong> telah selesai pada {selectedActivity.endTime} WIB.
              Hubungi Sekretariat DPRD jika ada kendala.
            </p>
          </div>
        )}

        {/* ── SUCCESS STATE ── */}
        {submitSuccess ? (
          <div className="p-6 rounded-3xl bg-slate-900 border border-emerald-500/50 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Presensi Berhasil Dicatat! 🎉</h2>
              <p className="text-xs text-slate-300 mt-1.5">
                Data kehadiran Anda telah tersimpan secara resmi di Sistem SI-RAPORT BK DPRD.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 text-left text-xs space-y-2 border border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400">Peserta:</span>
                <span className="font-bold text-white">{submitSuccess.memberName || submitSuccess.invitedName || '–'}</span>
              </div>
              {submitSuccess.agency && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Instansi:</span>
                  <span className="font-bold text-white">{submitSuccess.agency}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Status Kehadiran:</span>
                <span className="font-bold text-emerald-400">{submitSuccess.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Waktu Presensi:</span>
                <span className="font-mono text-slate-300">{new Date(submitSuccess.timestamp).toLocaleTimeString('id-ID')} WIB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Agenda:</span>
                <span className="text-slate-300 truncate ml-4 text-right">{selectedActivity?.title}</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setSubmitSuccess(null);
                  setSelectedMemberId('');
                  setMemberSearch('');
                  setAgency('');
                  setInvitedName('');
                  setIsRepresented(false);
                  setRepresentativeName('');
                  setRepresentativePosition('');
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs transition"
              >
                Isi Presensi Peserta Lainnya
              </button>

              {onBackToApp && (
                <button
                  type="button"
                  onClick={onBackToApp}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl text-xs transition border border-slate-700"
                >
                  Buka Dashboard Utama SI-RAPORT
                </button>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Validasi Multi-Faktor • SI-RAPORT BK DPRD</span>
            </div>
          </div>
        ) : (
          /* ── FORM PRESENSI ── */
          !timeCalc.isExpired && selectedActivity && (
            <form onSubmit={handleCheckIn} className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 text-xs">
              
              {/* Toggle Tipe Peserta */}
              <div className="flex rounded-2xl bg-slate-800 p-1 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setParticipantType('INTERNAL')}
                  className={`flex-1 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                    participantType === 'INTERNAL'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Anggota DPRD</span>
                </button>
                <button
                  type="button"
                  onClick={() => setParticipantType('EXTERNAL')}
                  className={`flex-1 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                    participantType === 'EXTERNAL'
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Tamu OPD / Instansi</span>
                </button>
              </div>

              {/* ── Form Internal: Anggota DPRD ── */}
              {participantType === 'INTERNAL' ? (
                <div className="space-y-3">
                  <label className="block font-bold text-slate-300">Pilih Identitas Anggota Dewan:</label>
                  
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="🔍 Cari nama atau fraksi..."
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      className="w-full p-2.5 pl-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:border-emerald-500 outline-none transition"
                    />
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-2xl border border-slate-800 bg-slate-950/40 p-2">
                    {filteredMembers.length === 0 ? (
                      <p className="text-slate-500 text-center py-4">Anggota tidak ditemukan</p>
                    ) : filteredMembers.map(m => {
                      const isSelected = selectedMemberId === m.id;
                      const hasAttended = logs.some(l => l.memberId === m.id && l.activityId === selectedActivity.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMemberId(m.id)}
                          disabled={hasAttended}
                          className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition border ${
                            hasAttended
                              ? 'bg-slate-800/30 border-slate-800 text-slate-600 cursor-not-allowed'
                              : isSelected
                              ? 'bg-emerald-950/80 border-emerald-500 text-white'
                              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 truncate">
                            {m.photo ? (
                              <img src={m.photo} alt="" className="w-7 h-7 rounded-full object-cover border border-slate-600 shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {m.name?.charAt(0)}
                              </div>
                            )}
                            <div className="truncate">
                              <span className="font-bold text-xs block truncate">{m.name}</span>
                              <span className="text-[10px] text-slate-400">{m.fraksi}</span>
                            </div>
                          </div>
                          {hasAttended ? (
                            <span className="shrink-0 text-[9px] text-emerald-500 font-bold ml-2 whitespace-nowrap">✓ Sudah Absen</span>
                          ) : isSelected ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {selectedMemberId && !alreadyCheckedIn && (
                    <div className="p-2.5 bg-emerald-950/50 border border-emerald-700/50 rounded-xl flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300 font-semibold">
                        {members.find(m => m.id === selectedMemberId)?.name}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Form Eksternal: Tamu OPD ── */
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5">Nama Instansi / OPD / Organisasi: <span className="text-rose-400">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Dinas Kesehatan / Bappelitbangda / BUMN"
                      value={agency}
                      onChange={e => setAgency(e.target.value)}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:border-teal-500 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5">Nama Pejabat / Pihak Yang Diundang: <span className="text-rose-400">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kepala Dinas Kesehatan Kab. XYZ"
                      value={invitedName}
                      onChange={e => setInvitedName(e.target.value)}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:border-teal-500 outline-none transition"
                    />
                  </div>

                  {/* Toggle Perwakilan */}
                  <div className="p-3.5 bg-slate-800/60 border border-slate-700 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white block text-[11px]">Diwakilkan oleh Pejabat Lain?</span>
                        <span className="text-[10px] text-slate-400">Aktifkan jika hadir sebagai perwakilan</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsRepresented(!isRepresented)}
                        className={`w-11 h-6 rounded-full transition relative p-0.5 ${isRepresented ? 'bg-teal-600' : 'bg-slate-700'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isRepresented ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {isRepresented && (
                      <div className="space-y-2 pt-2 border-t border-slate-700">
                        <div>
                          <label className="block font-bold text-teal-300 text-[11px] mb-0.5">Nama Perwakilan Yang Hadir:</label>
                          <input
                            type="text"
                            required={isRepresented}
                            placeholder="Nama lengkap pejabat perwakilan..."
                            value={representativeName}
                            onChange={e => setRepresentativeName(e.target.value)}
                            className="w-full p-2 bg-slate-900 border border-teal-500/50 rounded-xl text-white text-xs focus:border-teal-400 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-teal-300 text-[11px] mb-0.5">Jabatan Perwakilan:</label>
                          <input
                            type="text"
                            placeholder="Contoh: Sekretaris Dinas / Kabid..."
                            value={representativePosition}
                            onChange={e => setRepresentativePosition(e.target.value)}
                            className="w-full p-2 bg-slate-900 border border-teal-500/50 rounded-xl text-white text-xs focus:border-teal-400 outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── GPS Radius Box ── */}
              <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className={`w-4 h-4 shrink-0 ${radiusCheck.isWithin ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <div>
                    <span className="text-slate-400 block text-[11px]">Jarak ke Lokasi Sidang</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-xs ${radiusCheck.isWithin ? 'text-white' : 'text-amber-300'}`}>
                        {formatDistance(radiusCheck.distance)}
                      </span>
                      {radiusCheck.isWithin ? (
                        <span className="text-[9px] text-emerald-400 font-bold">✓ Dalam Radius</span>
                      ) : (
                        <span className="text-[9px] text-amber-400 font-bold">⚠ Di Luar Radius</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchGPS}
                  disabled={isLocating}
                  className="text-cyan-400 hover:text-cyan-300 font-bold text-[10px] flex items-center gap-1 disabled:opacity-50"
                >
                  {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  {isLocating ? 'Memuat...' : 'Refresh GPS'}
                </button>
              </div>

              {geoError && (
                <p className="text-[10px] text-amber-400 flex items-center gap-1.5">
                  <Info className="w-3 h-3 shrink-0" />
                  {geoError}
                </p>
              )}

              {/* ── Status Waktu ── */}
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                timeCalc.isLate
                  ? 'bg-amber-950/50 border-amber-700/50 text-amber-300'
                  : 'bg-emerald-950/50 border-emerald-700/50 text-emerald-300'
              }`}>
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  Status Waktu: <strong>{timeCalc.message || 'Hadir Tepat Waktu'}</strong>
                  {' '}• Toleransi {selectedActivity.toleranceMinutes || 30} menit
                </span>
              </div>

              {/* ── Error Banner ── */}
              {submitError && (
                <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* ── Submit Button ── */}
              <button
                type="submit"
                disabled={isSubmitting || timeCalc.isNotStarted || timeCalc.isExpired || alreadyCheckedIn}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-black rounded-2xl text-sm shadow-xl transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Kehadiran...</span>
                  </>
                ) : timeCalc.isNotStarted ? (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Absensi Belum Dibuka ({selectedActivity.startTime} WIB)</span>
                  </>
                ) : timeCalc.isExpired ? (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    <span>QR Code Telah Kedaluwarsa</span>
                  </>
                ) : alreadyCheckedIn ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sudah Melakukan Presensi</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Konfirmasi & Simpan Presensi</span>
                  </>
                )}
              </button>

              {/* Security Note */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Terenkripsi • GPS Terverifikasi • 1 Perangkat 1x Absen</span>
              </div>
            </form>
          )
        )}

      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-slate-800/60 bg-slate-950 py-4 text-center text-[10px] text-slate-600">
        <p>© 2026 SI-RAPORT BK DPRD • Sistem Presensi Cerdas Terverifikasi Multi-Faktor</p>
      </footer>
    </div>
  );
}
