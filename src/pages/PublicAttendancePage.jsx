import React, { useState, useEffect, useCallback, useRef } from 'react';
import SplashScreen from '../components/SplashScreen';
import { useAttendance } from '../context/AttendanceContext';
import { isWithinRadius, formatDistance } from '../utils/geoUtils';
import { calculateAttendanceStatus } from '../utils/raportUtils';
import { getDeviceFingerprint } from '../utils/deviceUtils';
import { saveAttendancePhoto } from '../utils/attendancePhotoStore';
import {
  QrCode, Clock, MapPin, CheckCircle2,
  AlertTriangle, AlertCircle, Users, Building2, ShieldCheck,
  Send, Loader2, Sparkles, RefreshCw, Wifi, Info,
  UserCheck, ChevronDown, Smartphone, Camera, SwitchCamera,
  RotateCcw, Check, Video, HelpCircle
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

export default function PublicAttendancePage({ initialActivityId, onBackToApp, publicGuest = false, pageType = 'MEMBER', memberOnly = false }) {
  const {
    activities,
    members,
    personnel,
    logs,
    recordAttendance,
    checkoutAttendance,
    recordGuestAttendance,
    scoreSettings,
    currentUser,
    loading: ctxLoading
  } = useAttendance();

  // ────── State ──────
  const [selectedActivityId, setSelectedActivityId] = useState(initialActivityId || '');
  const [participantType, setParticipantType] = useState(() => pageType === 'OPD' ? 'EXTERNAL' : 'INTERNAL');

  // Form Anggota DPRD
  const [selectedMemberId, setSelectedMemberId] = useState(() => currentUser?.memberId || '');
  const [memberSearch, setMemberSearch] = useState('');
  const [invitationToken] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const [invitationGuestId] = useState(() => new URLSearchParams(window.location.search).get('guestId') || null);

  // ────── Kamera Anggota DPRD (Wajib Foto) ──────
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isStartingCameraRef = useRef(false);
  const [facingMode, setFacingMode] = useState('user'); // 'user' (depan/selfie) | 'environment' (belakang)
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLivePreviewReady, setIsLivePreviewReady] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraErrorType, setCameraErrorType] = useState(''); // 'PERMISSION_DENIED' | 'NOT_FOUND' | 'IN_USE' | 'INSECURE_CONTEXT' | 'UNSUPPORTED'
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isPhotoConfirmed, setIsPhotoConfirmed] = useState(false);
  const [showCameraGuide, setShowCameraGuide] = useState(false);

  // Form Tamu OPD
  const [agency, setAgency] = useState(() => new URLSearchParams(window.location.search).get('agency') || '');
  const [invitedName, setInvitedName] = useState(() => new URLSearchParams(window.location.search).get('name') || '');
  const [position, setPosition] = useState(() => new URLSearchParams(window.location.search).get('position') || '');
  const [participantCategory, setParticipantCategory] = useState(() => new URLSearchParams(window.location.search).get('category') || 'OPD/INSTANSI');
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
  const [showAttendanceSplash, setShowAttendanceSplash] = useState(true);

  // ────── Camera Management ──────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            console.warn('Error stopping track:', e);
          }
        });
      } catch (e) {
        console.warn('Error cleaning stream:', e);
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch (e) {}
    }
    setIsCameraActive(false);
    setIsLivePreviewReady(false);
  }, []);

  const startCamera = useCallback(async (desiredFacingMode = facingMode) => {
    // Mencegah multiple request bersamaan (mencegah "page isn't responding")
    if (isStartingCameraRef.current) return;
    isStartingCameraRef.current = true;

    stopCamera();
    setCameraLoading(true);
    setCameraError('');
    setCameraErrorType('');
    setIsLivePreviewReady(false);

    // 1. Cek Secure Context (HTTPS / localhost)
    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setCameraError('Akses kamera browser memerlukan koneksi aman (HTTPS). Pastikan situs dibuka melalui HTTPS.');
      setCameraErrorType('INSECURE_CONTEXT');
      setCameraLoading(false);
      isStartingCameraRef.current = false;
      return;
    }

    // 2. Cek ketersediaan Web MediaDevices API
    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const legacyGetUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

    if (!hasMediaDevices && !legacyGetUserMedia) {
      setCameraError('Kamera tidak dapat diakses. Pastikan izin kamera untuk situs ini telah diberikan dan gunakan browser terbaru.');
      setCameraErrorType('UNSUPPORTED');
      setCameraLoading(false);
      isStartingCameraRef.current = false;
      return;
    }

    // Helper panggil getUserMedia
    const requestMedia = async (constraints) => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        return await navigator.mediaDevices.getUserMedia(constraints);
      }
      return new Promise((resolve, reject) => {
        legacyGetUserMedia.call(navigator, constraints, resolve, reject);
      });
    };

    let stream = null;
    let lastError = null;

    // Strategi Fallback Bertingkat (Multi-Perangkat & Multi-Browser):
    // 1. Coba kamera depan (user) dengan resolusi ideal standard
    // 2. Coba tanpa resolusi (hanya facingMode)
    // 3. Coba fallback kamera apa pun (video: true) - kompatibel laptop webcam & browser lama
    const constraintTiers = [
      {
        video: {
          facingMode: desiredFacingMode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        },
        audio: false
      },
      {
        video: { facingMode: desiredFacingMode },
        audio: false
      },
      {
        video: true,
        audio: false
      }
    ];

    for (const constraints of constraintTiers) {
      try {
        stream = await requestMedia(constraints);
        if (stream) break;
      } catch (err) {
        lastError = err;
        // Jika permission ditolak eksplisit oleh user (NotAllowedError / PermissionDeniedError), jangan loop fallback lagi
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          break;
        }
      }
    }

    if (stream) {
      streamRef.current = stream;
      if (videoRef.current) {
        try {
          videoRef.current.srcObject = stream;
          // Menggunakan loadedmetadata agar live preview benar-benar siap
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current.play().then(() => {
                setIsLivePreviewReady(true);
              }).catch(() => {
                setIsLivePreviewReady(true);
              });
            }
          };
        } catch (e) {
          console.warn('Error setting video srcObject:', e);
        }
      }
      setIsCameraActive(true);
      setCameraLoading(false);
      isStartingCameraRef.current = false;
    } else {
      setCameraLoading(false);
      setIsCameraActive(false);
      isStartingCameraRef.current = false;

      const errorName = lastError?.name || '';
      console.warn('Camera access failed:', lastError);

      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        setCameraErrorType('PERMISSION_DENIED');
        setCameraError('Izin akses kamera belum diberikan atau diblokir oleh browser.');
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        setCameraErrorType('NOT_FOUND');
        setCameraError('Perangkat kamera (webcam/kamera depan) tidak terdeteksi pada perangkat ini.');
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        setCameraErrorType('IN_USE');
        setCameraError('Kamera sedang digunakan oleh aplikasi/tab lain. Tutup aplikasi lain yang memakai kamera lalu coba lagi.');
      } else {
        setCameraErrorType('UNKNOWN');
        setCameraError('Kamera tidak dapat diakses. Pastikan izin kamera untuk situs ini telah diberikan dan gunakan browser terbaru.');
      }
    }
  }, [facingMode, stopCamera]);

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Jika kamera depan, cerminkan horizontal agar senatural cermin
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedPhoto(dataUrl);
      setIsPhotoConfirmed(false);
      stopCamera();
    } catch (err) {
      console.warn('Capture photo failed:', err);
    }
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    setIsPhotoConfirmed(false);
    startCamera(facingMode);
  };

  const handleConfirmPhoto = () => {
    if (!capturedPhoto) return;
    setIsPhotoConfirmed(true);
    setSubmitError('');
  };

  // Aktifkan kamera otomatis saat Anggota DPRD terpilih
  useEffect(() => {
    if (participantType === 'INTERNAL' && selectedMemberId && !submitSuccess && !capturedPhoto) {
      startCamera(facingMode);
    } else if (participantType === 'EXTERNAL' || !selectedMemberId || submitSuccess) {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [participantType, selectedMemberId, submitSuccess, startCamera, stopCamera]);

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowAttendanceSplash(false);
    }, 2200);

    return () => clearTimeout(splashTimer);
  }, []);

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

  // QR undangan individual membawa token ACTIVITY_TOKEN:MEMBER_ID.
  // Anggota langsung dipilih, tetapi tetap harus mengonfirmasi sebelum absen.
  useEffect(() => {
    if (memberOnly) {
      setSelectedMemberId(currentUser?.memberId || '');
      return;
    }
    const token = new URLSearchParams(window.location.search).get('token') || '';
    const memberId = token.includes(':') ? token.slice(token.lastIndexOf(':') + 1) : '';
    if (memberId && members.some(member => member.id === memberId)) {
      setSelectedMemberId(memberId);
    }
  }, [members, memberOnly, currentUser?.memberId]);

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
      setGeoError('GPS tidak didukung browser ini. Absensi hanya dapat dilakukan ketika lokasi perangkat tersedia dan akurat.');
      setIsLocating(false);
      setUserLocation(null);
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
        setGeoError('Akses GPS ditolak atau lokasi tidak bisa dideteksi. Aktifkan izin lokasi agar absensi dapat diverifikasi di sekitar ruang rapat/sekretariat DPRD.');
        setIsLocating(false);
        setUserLocation(null);
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
        Number(selectedActivity.radiusMeters) || 150,
        Number(userLocation.accuracy) || null
      )
    : { isWithin: false, distance: null, radiusMeters: Number(selectedActivity?.radiusMeters) || 150, accuracyMeters: null, accuracyLimit: 25 };

  const timeCalc = selectedActivity
    ? calculateAttendanceStatus(selectedActivity, now, scoreSettings)
    : { status: 'Hadir', message: 'Tepat Waktu', isExpired: false, isLate: false };

  const participantIds = Array.isArray(selectedActivity?.participantMemberIds) ? selectedActivity.participantMemberIds : [];
  const participantMembers = [...members, ...personnel].filter(member =>
    participantIds.includes(member.id) && (!memberOnly || member.id === currentUser?.memberId)
  );
  const filteredMembers = participantMembers.filter(m =>
    !memberSearch ||
    m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.fraksi?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // Cek apakah peserta sudah absen di agenda ini
  const existingAttendance = selectedMemberId && selectedActivity
    ? logs.find(l => l.memberId === selectedMemberId && l.activityId === selectedActivity.id && l.participantType !== 'EXTERNAL')
    : null;
  const existingGuestAttendance = selectedActivity && participantType === 'EXTERNAL' && agency.trim() && invitedName.trim()
    ? logs.find(log =>
        log.activityId === selectedActivity.id &&
        log.participantType === 'EXTERNAL' &&
        ((invitationGuestId && log.guestId === invitationGuestId) ||
          (String(log.agency || '').trim().toLowerCase() === agency.trim().toLowerCase() &&
            String(log.invitedName || '').trim().toLowerCase() === invitedName.trim().toLowerCase()))
      )
    : null;
  const alreadyCheckedIn = participantType === 'EXTERNAL' ? Boolean(existingGuestAttendance) : Boolean(existingAttendance);
  const alreadyCheckedOut = participantType === 'EXTERNAL' ? Boolean(existingGuestAttendance?.checkOutAt) : Boolean(existingAttendance?.checkOutAt);

  // ────── Submit ──────
  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!selectedActivity) return;

    if (participantType === 'INTERNAL' && selectedActivity.gpsRequired) {
      if (!userLocation) {
        setSubmitError(geoError || 'Lokasi belum diizinkan. Izinkan GPS atau tekan Refresh GPS sebelum melakukan absensi.');
        return;
      }
      if (!radiusCheck.isWithin) {
        if (Number.isFinite(Number(radiusCheck.accuracyMeters)) && Number(radiusCheck.accuracyMeters) > Number(radiusCheck.accuracyLimit || 25)) {
          setSubmitError(`Sinyal GPS belum cukup akurat. Akurasi saat ini ${radiusCheck.accuracyMeters} meter, sedangkan batas aman untuk zona ini adalah ${radiusCheck.accuracyLimit} meter. Pastikan Anda berada di sekitar ruang rapat atau sekretariat DPRD Kabupaten Cirebon.`);
          return;
        }
        setSubmitError(`Absensi ditolak. Anda berada ${formatDistance(radiusCheck.distance)} dari lokasi agenda, di luar radius ${radiusCheck.radiusMeters} meter. Pastikan Anda berada di sekitar ruang rapat atau sekretariat DPRD Kabupaten Cirebon.`);
        return;
      }
    }

    if (alreadyCheckedIn) {
      if (alreadyCheckedOut) {
        setSubmitError('Absensi peserta ini sudah selesai. Check-out hanya dapat dilakukan satu kali.');
        return;
      }
      if (participantType === 'INTERNAL' && !isPhotoConfirmed) {
        setSubmitError('Wajib mengambil dan mengonfirmasi foto Anggota DPRD terlebih dahulu sebelum Check-out.');
        return;
      }
      if (!window.confirm('Konfirmasi Check-out sekarang? Waktu meninggalkan kegiatan dan foto dokumentasi akan dicatat otomatis.')) return;
      setIsSubmitting(true);

      let checkoutPhotoRef = null;
      if (participantType === 'INTERNAL' && capturedPhoto) {
        try {
          checkoutPhotoRef = await saveAttendancePhoto({
            dataUrl: capturedPhoto,
            activityId: selectedActivity.id,
            participantId: selectedMemberId,
            eventType: 'CHECK_OUT',
            logId: `ATT-${selectedActivity.id}-${selectedMemberId}`
          });
        } catch (photoErr) {
          console.warn('Gagal menyimpan foto checkout lokal:', photoErr);
        }
      }

      const checkoutResult = participantType === 'EXTERNAL'
        ? await checkoutAttendance({
            activityId: selectedActivity.id,
            participantType: 'EXTERNAL',
            guestId: invitationGuestId || existingGuestAttendance?.guestId || null,
            agency: agency.trim(),
            invitedName: invitedName.trim(),
            method: 'QR_AGENDA',
            operatorName: 'Mandiri via QR Agenda'
          })
        : await checkoutAttendance({
            activityId: selectedActivity.id,
            memberId: selectedMemberId,
            participantType: 'INTERNAL',
            method: 'QR_AGENDA',
            operatorName: 'Mandiri via QR Agenda',
            documentationPhotoRef: checkoutPhotoRef
          });
      setIsSubmitting(false);
      if (checkoutResult.success) setSubmitSuccess({ ...checkoutResult.log, warning: checkoutResult.warning || null });
      else setSubmitError(checkoutResult.message || 'Gagal menyimpan Check-out.');
      return;
    }
    if (timeCalc.isExpired) {
      setSubmitError('Agenda telah selesai. QR Code tidak dapat digunakan lagi.');
      return;
    }
    const invitedMemberId = invitationToken.includes(':') ? invitationToken.slice(invitationToken.lastIndexOf(':') + 1) : '';
    if (invitedMemberId && selectedMemberId !== invitedMemberId) {
      setSubmitError('QR undangan ini terikat pada nama peserta tertentu.');
      return;
    }

    if (participantType === 'INTERNAL') {
      if (!selectedMemberId) {
        setSubmitError('Pilih nama Anggota DPRD terlebih dahulu.');
        return;
      }
      if (!isPhotoConfirmed || !capturedPhoto) {
        setSubmitError('Wajib mengambil dan mengonfirmasi foto wajah/kehadiran Anggota Dewan.');
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError('');

    const currentLat = userLocation ? Number(userLocation.lat) : null;
    const currentLng = userLocation ? Number(userLocation.lng) : null;
    const currentDist = radiusCheck?.distance == null ? null : Math.round(radiusCheck.distance);

    let res;

    if (participantType === 'INTERNAL') {
      let checkInPhotoRef = null;
      if (capturedPhoto) {
        try {
          checkInPhotoRef = await saveAttendancePhoto({
            dataUrl: capturedPhoto,
            activityId: selectedActivity.id,
            participantId: selectedMemberId,
            eventType: 'CHECK_IN',
            logId: `ATT-${selectedActivity.id}-${selectedMemberId}`
          });
        } catch (photoErr) {
          console.warn('Gagal menyimpan foto check-in lokal:', photoErr);
        }
      }

      res = await recordAttendance({
        activityId: selectedActivity.id,
        memberId: selectedMemberId,
        method: 'QR_SCAN',
        operatorName: 'Mandiri via Google Lens / Web Scan',
        lat: currentLat,
        lng: currentLng,
        distanceMeters: currentDist,
        invitationToken: invitationToken || selectedActivity.qrToken,
        documentationPhotoRef: checkInPhotoRef
      });
    } else {
      if (!agency.trim() || !invitedName.trim() || !position.trim()) {
        setSubmitError('Lengkapi data Instansi, Jabatan, dan Nama Pejabat yang diundang.');
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
        position: position.trim(),
        participantCategory,
        guestId: invitationGuestId,
        isRepresented,
        representativeName: representativeName.trim(),
        representativePosition: representativePosition.trim(),
        invitationToken: invitationToken || selectedActivity.qrToken
      });
    }

    setIsSubmitting(false);

    if (res?.success) {
      setSubmitSuccess({ ...res.log, warning: res.warning || null });
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
  if (showAttendanceSplash) {
    return (
      <SplashScreen
        onFinish={() => setShowAttendanceSplash(false)}
        showTitle={false}
        showLoading={false}
        duration={3000}
      />
    );
  }

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
              <h2 className="text-lg font-black text-white">{submitSuccess.checkOutAt ? 'Check-out Berhasil Dicatat!' : 'Check-in Berhasil Dicatat!'} 🎉</h2>
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
              {!submitSuccess.checkOutAt && <div className="flex justify-between">
                <span className="text-slate-400">Status Kehadiran:</span>
                <span className="font-bold text-emerald-400">{submitSuccess.status}</span>
              </div>}
              <div className="flex justify-between">
                <span className="text-slate-400">Check-in:</span>
                <span className="font-mono text-slate-300">{new Date(submitSuccess.checkInAt || submitSuccess.timestamp).toLocaleTimeString('id-ID')} WIB</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Perangkat:</span>
                <span className="text-right text-slate-300">{submitSuccess.deviceType || 'Tidak diketahui'}{submitSuccess.deviceOS ? ` • ${submitSuccess.deviceOS}` : ''}{submitSuccess.deviceBrowser ? ` • ${submitSuccess.deviceBrowser}` : ''}</span>
              </div>
              {submitSuccess.checkOutAt && <>
                <div className="flex justify-between"><span className="text-slate-400">Check-out:</span><span className="font-mono text-slate-300">{new Date(submitSuccess.checkOutAt).toLocaleTimeString('id-ID')} WIB</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Durasi:</span><span className="font-bold text-emerald-400">{Math.floor((submitSuccess.durationMinutes || 0) / 60)} Jam {(submitSuccess.durationMinutes || 0) % 60} Menit</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Status Check-out:</span><span className="font-bold text-amber-300">{submitSuccess.checkoutStatus || 'Mengikuti Kegiatan Sampai Selesai'}</span></div>
              </>}
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
                  setCapturedPhoto(null);
                  setIsPhotoConfirmed(false);
                  setAgency('');
                  setInvitedName('');
                  setPosition('');
                  setIsRepresented(false);
                  setRepresentativeName('');
                  setRepresentativePosition('');
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs transition"
              >
                Isi Presensi Peserta Lainnya
              </button>

            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Validasi Multi-Faktor • SI-RAPORT BK DPRD</span>
            </div>
          </div>
        ) : (
          /* ── FORM PRESENSI ── */
          (!timeCalc.isExpired || (participantType === 'INTERNAL' && alreadyCheckedIn && !alreadyCheckedOut)) && selectedActivity && (
            <form onSubmit={handleCheckIn} className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 text-xs">
              
              {/* Toggle Tipe Peserta */}
              {pageType === 'MEMBER' && <div className="flex rounded-2xl bg-slate-800 p-1 border border-slate-700">
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
              </div>}

              {/* ── Form Internal: Anggota DPRD ── */}
              {participantType === 'INTERNAL' ? (
                <div className="space-y-3">
                  <label className="block font-bold text-slate-300">{memberOnly ? 'Identitas Anggota yang Login:' : 'Pilih Identitas Anggota Dewan:'}</label>
                  
                  {!memberOnly && <div className="relative">
                    <input
                      type="text"
                      placeholder="🔍 Cari nama atau fraksi..."
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      className="w-full p-2.5 pl-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:border-emerald-500 outline-none transition"
                    />
                  </div>}

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

                  {/* ── MODUL KAMERA WAJIB FOTO ANGGOTA DPRD (CHECK-IN & CHECK-OUT) ── */}
                  {selectedMemberId && (
                    <div className="p-4 bg-slate-950/80 border border-emerald-500/40 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-emerald-400" />
                          <span className="font-bold text-white text-xs">
                            {alreadyCheckedIn ? 'Foto Wajib Check-out Anggota' : 'Foto Wajib Kehadiran Anggota Dewan'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setShowCameraGuide(!showCameraGuide)}
                            className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 underline underline-offset-2 transition"
                          >
                            <HelpCircle className="w-3 h-3" />
                            <span>Bantuan Izin</span>
                          </button>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-extrabold">
                            Wajib Foto
                          </span>
                        </div>
                      </div>

                      {/* Panduan Izin Kamera (Jika Diperlukan User) */}
                      {showCameraGuide && (
                        <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-[11px] space-y-2 text-slate-300">
                          <p className="font-bold text-emerald-400 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> Cara Mengizinkan Akses Kamera:
                          </p>
                          <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-400">
                            <li><strong>Chrome / Edge (Android & PC):</strong> Klik ikon gembok/setelan di kiri bilah alamat URL &rarr; pilih <em>Izin Situs (Permissions)</em> &rarr; Aktifkan <strong>Kamera</strong>.</li>
                            <li><strong>Safari (iPhone / iPad):</strong> Buka <em>Pengaturan iPhone</em> &rarr; <em>Safari</em> &rarr; <em>Kamera</em> &rarr; Pilih <strong>Izinkan (Allow)</strong>.</li>
                            <li>Pastikan aplikasi lain (seperti Zoom/Meet/WhatsApp) tidak sedang memakai kamera.</li>
                          </ul>
                        </div>
                      )}

                      {/* Viewfinder Video Kamera / Preview Hasil Foto */}
                      <div className="relative aspect-4/3 w-full bg-black rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center shadow-inner">
                        {capturedPhoto ? (
                          <div className="relative w-full h-full">
                            <img
                              src={capturedPhoto}
                              alt="Hasil Foto Anggota"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 right-2 bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" /> Foto Terambil
                            </div>
                          </div>
                        ) : (
                          <>
                            <video
                              ref={videoRef}
                              playsInline
                              muted
                              autoPlay
                              className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform -scale-x-100' : ''}`}
                            />

                            {/* Loading State */}
                            {cameraLoading && (
                              <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center gap-2 text-emerald-400 z-10">
                                <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
                                <span className="text-xs font-semibold text-slate-200">Meminta Akses Kamera...</span>
                                <span className="text-[10px] text-slate-400 text-center px-4">Pilih "Izinkan / Allow" jika muncul pop-up izin di browser Anda</span>
                              </div>
                            )}

                            {/* Error State & Fallback Prompt */}
                            {cameraError && !cameraLoading && (
                              <div className="absolute inset-0 bg-slate-950/95 p-4 flex flex-col items-center justify-center text-center gap-2.5 text-rose-300 text-xs z-10">
                                <div className="p-2.5 rounded-full bg-rose-900/40 border border-rose-800 text-rose-400">
                                  <AlertCircle className="w-6 h-6" />
                                </div>
                                <p className="font-semibold text-slate-200 px-2 leading-relaxed">{cameraError}</p>
                                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                                  <button
                                    type="button"
                                    onClick={() => startCamera(facingMode)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Coba Izinkan Kamera Lagi</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowCameraGuide(true)}
                                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs border border-slate-700 transition"
                                  >
                                    Lihat Panduan
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Overlay Frame Guide ketika Live Preview Siap */}
                            {!cameraLoading && !cameraError && (
                              <>
                                <div className="absolute inset-4 border-2 border-dashed border-emerald-400/50 rounded-2xl pointer-events-none flex items-center justify-center">
                                  <span className="text-[10px] text-emerald-300 bg-slate-950/80 backdrop-blur-xs px-3 py-1 rounded-full border border-emerald-500/30">
                                    Posisikan wajah di dalam bingkai
                                  </span>
                                </div>
                                {!isLivePreviewReady && isCameraActive && (
                                  <div className="absolute bottom-2 left-2 right-2 text-center text-[10px] text-amber-300 bg-slate-900/80 py-0.5 rounded border border-amber-500/30">
                                    Menyiapkan tampilan langsung kamera...
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>

                      {/* Kontrol Kamera & Konfirmasi */}
                      <div className="space-y-2">
                        {!capturedPhoto ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={toggleFacingMode}
                              disabled={cameraLoading || !isCameraActive}
                              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition shrink-0 disabled:opacity-40"
                              title="Ganti Kamera Depan / Belakang"
                            >
                              <SwitchCamera className="w-4 h-4 text-emerald-400" />
                              <span className="hidden sm:inline">Ganti Kamera</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleCapturePhoto}
                              disabled={cameraLoading || !isCameraActive || !isLivePreviewReady}
                              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition"
                            >
                              <Camera className="w-4 h-4" />
                              <span>{isLivePreviewReady ? 'Ambil Foto Anggota' : 'Menunggu Kamera...'}</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleRetakePhoto}
                                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
                              >
                                <RotateCcw className="w-4 h-4 text-amber-400" />
                                <span>Ambil Ulang</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleConfirmPhoto}
                                disabled={isPhotoConfirmed}
                                className={`flex-1 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow transition ${
                                  isPhotoConfirmed
                                    ? 'bg-emerald-900/60 border border-emerald-500 text-emerald-300'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                }`}
                              >
                                <Check className="w-4 h-4" />
                                <span>{isPhotoConfirmed ? '✓ Foto Dikonfirmasi' : 'Gunakan Foto Ini'}</span>
                              </button>
                            </div>
                            {isPhotoConfirmed && (
                              <p className="text-[11px] text-emerald-400 font-bold text-center flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Foto terverifikasi. Silakan tekan tombol Konfirmasi Presensi di bawah.</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Form Eksternal: Tamu OPD ── */
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5">Jabatan: <span className="text-rose-400">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kepala Dinas / Sekretaris / Kabid"
                      value={position}
                      onChange={e => setPosition(e.target.value)}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:border-teal-500 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5">Kategori Peserta:</label>
                    <select value={participantCategory} onChange={e => setParticipantCategory(e.target.value)} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs">
                      <option value="OPD/INSTANSI">OPD / Instansi</option>
                      <option value="SEKRETARIAT/ASN">Sekretariat / ASN</option>
                      <option value="NARASUMBER">Narasumber</option>
                      <option value="TAMU/UNDANGAN">Tamu / Undangan</option>
                    </select>
                  </div>
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
                  <MapPin className={`w-4 h-4 shrink-0 ${!selectedActivity?.gpsRequired ? 'text-slate-400' : radiusCheck.isWithin ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <div>
                    <span className="text-slate-400 block text-[11px]">Jarak ke Lokasi Sidang</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-xs ${!selectedActivity?.gpsRequired ? 'text-slate-300' : radiusCheck.isWithin ? 'text-white' : 'text-amber-300'}`}>
                        {!selectedActivity?.gpsRequired ? 'GPS tidak diwajibkan' : radiusCheck.distance == null ? 'GPS belum tersedia' : formatDistance(radiusCheck.distance)}
                      </span>
                      {!selectedActivity?.gpsRequired ? (
                        <span className="text-[9px] text-slate-400 font-bold">✓ Opsional</span>
                      ) : radiusCheck.isWithin ? (
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
                disabled={isSubmitting || timeCalc.isNotStarted || alreadyCheckedOut}
                className={`w-full py-4 ${alreadyCheckedIn ? 'bg-amber-600 hover:bg-amber-500' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'} disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-black rounded-2xl text-sm shadow-xl transition flex items-center justify-center gap-2`}
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
                ) : alreadyCheckedOut ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Absensi Sudah Selesai</span>
                  </>
                ) : alreadyCheckedIn ? (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>CHECK-OUT SEKARANG</span>
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
