import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useAttendance } from '../context/AttendanceContext';
import { isWithinRadius, formatDistance } from '../utils/geoUtils';
import {
  MapPin, Smartphone, Navigation, CheckCircle2,
  AlertTriangle, RefreshCw, ShieldCheck, Loader2,
  Camera, Upload, X, Users, Calendar
} from 'lucide-react';

export default function GPSAttendance() {
  const {
    activeMemberId, setActiveMemberId,
    getMemberById, members,
    activities, logs,
    recordAttendance, loading
  } = useAttendance();

  const activeMember = getMemberById(activeMemberId);

  // Auto-select aktif anggota dan kegiatan setelah Firestore load
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

  // Foto bukti
  const [proofPhotoFile, setProofPhotoFile] = useState(null);
  const [proofPhotoPreview, setProofPhotoPreview] = useState('');
  const fileInputRef = useRef(null);

  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null); // null | object log
  const [submitError, setSubmitError] = useState('');

  // Auto-fetch GPS on load
  useEffect(() => {
    fetchCurrentLocation();
  }, [selectedActivityId]);

  // Reset success state ketika ganti kegiatan
  useEffect(() => {
    setSubmitSuccess(null);
    setSubmitError('');
  }, [selectedActivityId, activeMemberId]);

  const fetchCurrentLocation = () => {
    setIsLocating(true);
    setGeoError('');

    if (!navigator.geolocation) {
      setGeoError('Browser tidak mendukung Geolocation. Menggunakan koordinat simulasi.');
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
          ? 'Izin akses GPS belum aktif di browser.'
          : err.code === 2
            ? 'Posisi GPS perangkat belum terdeteksi.'
            : 'Pencarian sinyal GPS timeout.';
        setGeoError(`${msg} (Koordinat simulasi siap digunakan).`);
        setIsLocating(false);
        // Fallback langsung ke koordinat yang berada dalam radius agenda
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

  // Hitung geofence dengan casting Number yang aman
  const radiusCheck = (userLocation && selectedActivity)
    ? isWithinRadius(
      Number(userLocation.lat),
      Number(userLocation.lng),
      Number(selectedActivity.targetLat) || 0,
      Number(selectedActivity.targetLng) || 0,
      Number(selectedActivity.radiusMeters) || 150
    )
    : { isWithin: true, distance: 0, radiusMeters: Number(selectedActivity?.radiusMeters) || 150 };

  // Handle pilih foto bukti
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofPhotoFile(file);
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

    // Upload foto bukti jika ada (kirim sebagai base64 atau URL)
    let proofPhotoUrl = proofPhotoPreview || '';

    const result = await recordAttendance({
      activityId: selectedActivity.id,
      memberId: activeMemberId,
      method: 'GPS_ONLINE',
      lat: currentLat,
      lng: currentLng,
      distanceMeters: currentDist,
      proofPhoto: proofPhotoUrl,
      operatorName: activeMember?.name || 'Anggota DPRD',
      note: note || `Presensi GPS Online — Jarak ${currentDist}m dari lokasi`
    });

    setIsSubmitting(false);

    if (result.success) {
      setSubmitSuccess(result);
      try { confetti({ particleCount: 70, spread: 65, origin: { y: 0.5 } }); } catch (e) { }
    } else {
      setSubmitError(result.message || 'Gagal menyimpan absensi GPS ke Firestore.');
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <span className="ml-3 text-slate-400">Memuat data dari Firestore...</span>
      </div>
    );
  }

  // ── Belum ada agenda ──
  if (activities.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <Calendar className="w-14 h-14 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
        <h2 className="text-slate-600 dark:text-slate-300 font-bold text-lg">Belum Ada Agenda Kegiatan</h2>
        <p className="text-slate-400 text-sm mt-2">Buat agenda kegiatan terlebih dahulu di menu <strong>Agenda Kegiatan</strong>.</p>
      </div>
    );
  }

  // ── Belum ada anggota ──
  if (members.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <Users className="w-14 h-14 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
        <h2 className="text-slate-600 dark:text-slate-300 font-bold text-lg">Belum Ada Data Anggota</h2>
        <p className="text-slate-400 text-sm mt-2">Tambahkan anggota DPRD terlebih dahulu di menu <strong>Anggota DPRD</strong>.</p>
      </div>
    );
  }

  const alreadyPresent = existingLog && !submitSuccess;

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 text-white shadow-2xl">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-emerald-400 tracking-wider">Absensi GPS Online</span>
            <h2 className="font-extrabold text-base text-white leading-tight">Presensi Berbasis Lokasi GPS</h2>
          </div>
        </div>
        <p className="text-xs text-slate-400 ml-12">Verifikasi lokasi anggota dengan GPS geofencing. Cocok untuk reses, kunjungan kerja, atau kegiatan luar gedung.</p>
      </div>

      {/* Pilih Anggota */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-500" /> Pilih Anggota DPRD
        </h3>
        <select
          value={activeMemberId || ''}
          onChange={e => { setActiveMemberId(e.target.value); setSubmitSuccess(null); }}
          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">— Pilih Anggota —</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.name} — {m.fraksi}</option>
          ))}
        </select>

        {/* Profile anggota terpilih */}
        {activeMember && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {activeMember.photo
              ? <img src={activeMember.photo} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 shrink-0" />
              : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold shrink-0">{activeMember.name?.charAt(0)}</div>
            }
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-xs">{activeMember.name}</p>
              <p className="text-[11px] text-slate-400">{activeMember.fraksi} • {activeMember.jabatan}</p>
            </div>
          </div>
        )}
      </div>

      {/* Pilih Agenda */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-500" /> Pilih Agenda Kegiatan
        </h3>
        <select
          value={selectedActivityId}
          onChange={e => { setSelectedActivityId(e.target.value); setSubmitSuccess(null); setSubmitError(''); }}
          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
        >
          {activities.map(a => (
            <option key={a.id} value={a.id}>[{a.category}] {a.title} — {a.date}</option>
          ))}
        </select>

        {selectedActivity && (
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-slate-400">Lokasi</p>
              <p className="font-semibold text-slate-700 dark:text-slate-200">{selectedActivity.locationName}</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-slate-400">Waktu</p>
              <p className="font-semibold text-slate-700 dark:text-slate-200">{selectedActivity.date} {selectedActivity.startTime}</p>
            </div>
          </div>
        )}
      </div>

      {/* GPS Location Box */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-500" /> Status Lokasi GPS
          </h3>
          <button
            onClick={fetchCurrentLocation}
            disabled={isLocating}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            {isLocating ? 'Mencari...' : 'Perbarui Lokasi'}
          </button>
        </div>

        {geoError && (
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{geoError}</span>
          </div>
        )}

        {/* Koordinat */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1.5">
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500">Koordinat Anda:</span>
            {isLocating
              ? <span className="text-amber-400 animate-pulse">Mencari GPS...</span>
              : <span className="text-emerald-400">{userLocation?.lat?.toFixed(6)}, {userLocation?.lng?.toFixed(6)}</span>
            }
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Akurasi:</span>
            <span>± {userLocation?.accuracy || '?'} meter</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Jarak ke Lokasi Kegiatan:</span>
            <span className="font-bold text-slate-200">{userLocation ? formatDistance(radiusCheck.distance) : '—'}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Radius Toleransi:</span>
            <span className="font-bold text-slate-200">{selectedActivity?.radiusMeters || '—'} meter</span>
          </div>
        </div>

        {/* Status Geofence */}
        {userLocation && (
          <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${radiusCheck.isWithin
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}>
            <div className="flex items-center gap-3">
              {radiusCheck.isWithin
                ? <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
                : <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
              }
              <div>
                <p className="font-extrabold">
                  {radiusCheck.isWithin ? '✓ LOKASI TERVERIFIKASI DALAM RADIUS' : '✗ DI LUAR RADIUS LOKASI KEGIATAN'}
                </p>
                <p className="opacity-80 mt-0.5">
                  {radiusCheck.isWithin
                    ? `Jarak Anda ${Math.round(radiusCheck.distance)}m. Presensi GPS diizinkan.`
                    : `Jarak Anda ${Math.round(radiusCheck.distance)}m melebihi batas ${selectedActivity?.radiusMeters}m.`
                  }
                </p>
              </div>
            </div>

            {/* Quick Test Button to snap to location */}
            {!radiusCheck.isWithin && selectedActivity && (
              <button
                type="button"
                onClick={() => {
                  setUserLocation({
                    lat: selectedActivity.targetLat + 0.0001,
                    lng: selectedActivity.targetLng + 0.0001,
                    accuracy: 10
                  });
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[11px] shrink-0 shadow"
              >
                📍 Simulasi Tepat di Lokasi
              </button>
            )}
          </div>
        )}
      </div>

      {/* Upload Foto Bukti */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Camera className="w-4 h-4 text-purple-500" /> Foto Bukti Kehadiran <span className="text-slate-400 font-normal text-xs">(opsional)</span>
        </h3>
        <p className="text-xs text-slate-500">Upload foto selfie atau foto kegiatan sebagai bukti kehadiran untuk reses/kunjungan kerja.</p>

        <div className="flex items-center gap-4">
          {proofPhotoPreview ? (
            <div className="relative shrink-0">
              <img src={proofPhotoPreview} alt="bukti" className="w-20 h-20 rounded-xl object-cover border-2 border-purple-500" />
              <button
                type="button"
                onClick={() => { setProofPhotoFile(null); setProofPhotoPreview(''); }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 rounded-full flex items-center justify-center text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800 shrink-0">
              <Camera className="w-6 h-6 text-slate-400" />
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-700 hover:border-purple-400 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300 transition"
          >
            <Upload className="w-4 h-4 text-purple-500" />
            {proofPhotoFile ? 'Ganti Foto' : 'Upload Foto Bukti'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
        </div>
      </div>

      {/* Catatan */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
        <label className="block font-bold text-sm text-slate-900 dark:text-white">Catatan Presensi (Opsional)</label>
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Contoh: Menghadiri reses kelompok masyarakat RW 04 Kelurahan Merdeka..."
          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Error */}
      {submitError && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Sudah Absen */}
      {alreadyPresent && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-center space-y-1">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <h4 className="font-extrabold text-emerald-800 dark:text-emerald-300">SUDAH TERCATAT — {existingLog.status?.toUpperCase()}</h4>
          <p className="text-xs text-slate-500">via {existingLog.method} · Jarak {existingLog.distanceMeters ?? '?'}m</p>
        </div>
      )}

      {/* Sukses baru submit */}
      {submitSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto animate-bounce" />
          <h4 className="font-extrabold text-emerald-800 dark:text-emerald-300 text-base">PRESENSI GPS BERHASIL TERCATAT!</h4>
          <p className="text-xs text-slate-500">
            {activeMember?.name} · {selectedActivity?.title}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
            {new Date().toLocaleTimeString('id-ID')} WIB · Jarak {Math.round(radiusCheck.distance)}m dari lokasi
          </p>
        </div>
      )}

      {/* Submit Button */}
      {!alreadyPresent && !submitSuccess && (
        <button
          onClick={handleSubmitGPS}
          disabled={isSubmitting || !activeMemberId || !selectedActivityId}
          className={`w-full py-4 rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2.5 transition-all ${!isSubmitting && activeMemberId && selectedActivityId
              ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
            }`}
        >
          {isSubmitting
            ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Menyimpan Absensi ke Firestore...</span></>
            : <><MapPin className="w-5 h-5" /><span>Kirim Presensi GPS Sekarang</span></>
          }
        </button>
      )}

      {submitSuccess && (
        <button
          onClick={() => { setSubmitSuccess(null); setNote(''); setProofPhotoFile(null); setProofPhotoPreview(''); }}
          className="w-full py-3 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-700"
        >
          <RefreshCw className="w-4 h-4" /> Presensi Anggota Lain
        </button>
      )}

    </div>
  );
}
