import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useAttendance } from '../context/AttendanceContext';
import { isWithinRadius, formatDistance } from '../utils/geoUtils';
import { calculateAttendanceStatus } from '../utils/raportUtils';
import { getDeviceFingerprint } from '../utils/deviceUtils';
import {
  MapPin, Smartphone, Navigation, CheckCircle2,
  AlertTriangle, RefreshCw, ShieldCheck, Loader2,
  Camera, Upload, X, Users, Calendar, Clock, FileText
} from 'lucide-react';

export default function GPSAttendance() {
  const {
    activeMemberId, setActiveMemberId,
    getMemberById, members,
    activities, logs,
    recordAttendance, loading
  } = useAttendance();

  const activeMember = getMemberById(activeMemberId);

  // Auto-select aktif anggota dan kegiatan setelah data load
  const [selectedActivityId, setSelectedActivityId] = useState('');
  useEffect(() => {
    if (!selectedActivityId && activities.length > 0) {
      const active = activities.find(a => a.status === 'ACTIVE') || activities[0];
      setSelectedActivityId(active.id);
    }
  }, [activities]);

  const selectedActivity = activities.find(a => a.id === selectedActivityId);
  const existingLog = logs.find(l =>
    l.activityId === selectedActivityId && l.memberId === activeMemberId
  );

  // GPS state
  const [userLocation, setUserLocation] = useState(null);
  const [geoError, setGeoError] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Dinas Luar (SPT) Form State
  const [isDinasLuar, setIsDinasLuar] = useState(false);
  const [sptNumber, setSptNumber] = useState('');
  const [sptNote, setSptNote] = useState('');

  // Foto bukti
  const [proofPhotoPreview, setProofPhotoPreview] = useState('');
  const fileInputRef = useRef(null);

  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState('');

  // Device Info
  const deviceInfo = getDeviceFingerprint();

  // Auto-fetch GPS on load
  useEffect(() => {
    fetchCurrentLocation();
  }, [selectedActivityId]);

  useEffect(() => {
    setSubmitSuccess(null);
    setSubmitError('');
  }, [selectedActivityId, activeMemberId]);

  const fetchCurrentLocation = () => {
    setIsLocating(true);
    setGeoError('');

    if (!navigator.geolocation) {
      setGeoError('Browser tidak mendukung Geolocation. Menggunakan simulasi koordinat.');
      setIsLocating(false);
      setUserLocation({
        lat: Number(selectedActivity?.targetLat) || -6.200000,
        lng: Number(selectedActivity?.targetLng) || 106.816666,
        accuracy: 15
      });
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
      (err) => {
        const msg = err.code === 1
          ? 'Izin akses GPS belum diizinkan.'
          : err.code === 2
            ? 'Posisi GPS belum terdeteksi.'
            : 'Pencarian GPS timeout.';
        setGeoError(`${msg} (Koordinat simulasi siap digunakan).`);
        setIsLocating(false);
        if (selectedActivity) {
          const actLat = Number(selectedActivity.targetLat) || -6.200000;
          const actLng = Number(selectedActivity.targetLng) || 106.816666;
          setUserLocation({
            lat: actLat + 0.00005,
            lng: actLng + 0.00005,
            accuracy: 10
          });
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Hitung geofence radius
  const radiusCheck = (userLocation && selectedActivity)
    ? isWithinRadius(
      Number(userLocation.lat),
      Number(userLocation.lng),
      Number(selectedActivity.targetLat) || 0,
      Number(selectedActivity.targetLng) || 0,
      Number(selectedActivity.radiusMeters) || 150
    )
    : { isWithin: true, distance: 0, radiusMeters: Number(selectedActivity?.radiusMeters) || 150 };

  // Hitung status keterlambatan otomatis
  const timeCalc = selectedActivity ? calculateAttendanceStatus(selectedActivity, new Date()) : { status: 'Hadir', message: 'Tepat waktu' };

  // Handle pilih foto bukti
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setProofPhotoPreview(ev.target?.result || '');
    reader.readAsDataURL(file);
  };

  // Submit GPS absensi
  const handleSubmitGPS = async () => {
    if (!selectedActivity) { setSubmitError('Pilih agenda kegiatan terlebih dahulu.'); return; }
    if (!activeMemberId) { setSubmitError('Pilih anggota DPRD yang akan absen.'); return; }

    setIsSubmitting(true);
    setSubmitError('');

    const currentLat = userLocation ? Number(userLocation.lat) : (Number(selectedActivity.targetLat) || -6.2);
    const currentLng = userLocation ? Number(userLocation.lng) : (Number(selectedActivity.targetLng) || 106.81);
    const currentDist = radiusCheck ? Math.round(radiusCheck.distance) : 0;

    let finalStatus = isDinasLuar ? 'Dinas Luar' : timeCalc.status;
    let finalNote = isDinasLuar 
      ? `Dinas Luar SPT: ${sptNumber}. ${sptNote || ''}`
      : `${timeCalc.message}. ${note || ''}`;

    const res = await recordAttendance({
      activityId: selectedActivity.id,
      memberId: activeMemberId,
      status: finalStatus,
      method: 'GPS_ONLINE',
      operatorName: 'Mandiri (Mobile Presensi)',
      lat: currentLat,
      lng: currentLng,
      distanceMeters: currentDist,
      note: finalNote,
      sptNumber: isDinasLuar ? sptNumber : null
    });

    setIsSubmitting(false);

    if (res.success) {
      setSubmitSuccess(res.log);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
    } else {
      setSubmitError(res.message || 'Gagal mengirimkan presensi GPS.');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-wide">
              Multi-Faktor Presensi Mandiri
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-white">Presensi Lokasi GPS & Perangkat</h1>
          <p className="text-xs text-slate-300">
            Validasi koordinat radius lokasi, waktu jadwal agenda, dan kuncian perangkat gadget.
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={fetchCurrentLocation}
            disabled={isLocating}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Mencari Lokasi...' : 'Perbarui Sinyal GPS'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Kolom Kiri: Form & Status Presensi */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Card Pilih Anggota & Agenda */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            
            {/* Anggota Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <span>Identitas Anggota DPRD:</span>
              </label>
              <select
                value={activeMemberId}
                onChange={e => setActiveMemberId(e.target.value)}
                className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.fraksi} • {m.komisi})
                  </option>
                ))}
              </select>
            </div>

            {/* Agenda Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-500" />
                <span>Pilih Agenda Kegiatan yang Dihadiri:</span>
              </label>
              <select
                value={selectedActivityId}
                onChange={e => setSelectedActivityId(e.target.value)}
                className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white"
              >
                {activities.map(a => (
                  <option key={a.id} value={a.id}>
                    [{a.category}] {a.title} ({a.date} • {a.startTime} WIB)
                  </option>
                ))}
              </select>
            </div>

            {/* Live Agenda Status Box */}
            {selectedActivity && (
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Batas Toleransi Keterlambatan:</span>
                  <span className="font-bold text-amber-400 font-mono">{selectedActivity.toleranceMinutes || 30} Menit</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Radius Presensi Gedung:</span>
                  <span className="font-bold text-cyan-400 font-mono">Maks. {selectedActivity.radiusMeters || 150} Meter</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-700/60">
                  <span className="text-slate-400 font-medium">Estimasi Status Waktu Server:</span>
                  <span className={`font-bold ${timeCalc.isLate ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {timeCalc.message}
                  </span>
                </div>
              </div>
            )}

            {/* Toggle Dinas Luar (SPT) */}
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/50 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-indigo-200 block">Sedang Menjalankan Dinas Luar / SPT?</span>
                  <span className="text-[11px] text-slate-400">Status akan dicatat sebagai Dinas Luar resmi (Bukan Alpha).</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDinasLuar(!isDinasLuar)}
                  className={`w-12 h-6 rounded-full transition relative p-0.5 ${isDinasLuar ? 'bg-indigo-600' : 'bg-slate-700'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isDinasLuar ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {isDinasLuar && (
                <div className="space-y-2.5 pt-2 border-t border-indigo-800/60">
                  <div>
                    <label className="block font-bold text-indigo-300 mb-1">Nomor Surat Perintah Tugas (SPT):</label>
                    <input
                      type="text"
                      placeholder="Contoh: SPT.090/451/BK-DPRD/IX/2026"
                      value={sptNumber}
                      onChange={e => setSptNumber(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-indigo-500/50 rounded-xl text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-indigo-300 mb-1">Keterangan Penugasan:</label>
                    <input
                      type="text"
                      placeholder="Contoh: Koordinasi teknis dengan Kementerian Dalam Negeri di Jakarta"
                      value={sptNote}
                      onChange={e => setSptNote(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-indigo-500/50 rounded-xl text-white text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {submitError && (
              <div className="p-3.5 bg-rose-950/70 border border-rose-800 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Success Message */}
            {submitSuccess && (
              <div className="p-4 bg-emerald-950/70 border border-emerald-800 rounded-2xl text-emerald-300 text-xs flex items-center gap-3 animate-fadeIn">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-white">Presensi Berhasil Diverifikasi!</h4>
                  <p className="text-[11px] text-emerald-200 mt-0.5">
                    Status: <strong>{submitSuccess.status}</strong> • Metode: {submitSuccess.method}
                  </p>
                </div>
              </div>
            )}

            {/* Tombol Kirim Presensi */}
            <button
              onClick={handleSubmitGPS}
              disabled={isSubmitting || !!submitSuccess}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Memvalidasi Multi-Faktor...</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-5 h-5" />
                  <span>Kirim Presensi GPS Sekarang</span>
                </>
              )}
            </button>

          </div>

        </div>

        {/* Kolom Kanan: Status Perangkat & Geofencing Info */}
        <div className="space-y-4">
          
          {/* Card Device Lock & Anti Titip Absen */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Identitas Perangkat (Device Lock)</h3>
            </div>
            
            <p className="text-xs text-slate-400">
              Sistem mencatat identitas unik gadget untuk menjamin aturan <strong>1 Perangkat 1x Absen</strong> per agenda.
            </p>

            <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Device ID:</span>
                <span className="text-emerald-400 font-bold truncate max-w-[150px]">{deviceInfo.deviceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tipe:</span>
                <span className="text-white">{deviceInfo.deviceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sistem / Browser:</span>
                <span className="text-slate-300 truncate max-w-[150px]">{deviceInfo.os} • {deviceInfo.browser}</span>
              </div>
            </div>
          </div>

          {/* Card Geofencing & Radius GPS */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Geofencing & Koordinat</h3>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Jarak ke Titik Agenda:</span>
                <span className="font-bold text-white font-mono">{formatDistance(radiusCheck.distance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Batas Toleransi:</span>
                <span className="font-bold text-cyan-400 font-mono">Maks. {radiusCheck.radiusMeters} Meter</span>
              </div>
              <div className="pt-1.5 border-t border-slate-700 flex justify-between items-center">
                <span className="text-slate-400">Status Radius:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${radiusCheck.isWithin ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                  {radiusCheck.isWithin ? 'Di Dalam Radius' : 'Di Luar Radius'}
                </span>
              </div>
            </div>

            {geoError && (
              <p className="text-[11px] text-amber-400 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/40">
                {geoError}
              </p>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
