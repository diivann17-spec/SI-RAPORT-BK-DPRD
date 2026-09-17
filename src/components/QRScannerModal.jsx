import React, { useEffect, useState, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import { useAttendance } from '../context/AttendanceContext';
import { formatDistance, isWithinRadius } from '../utils/geoUtils';
import { saveAttendancePhoto } from '../utils/attendancePhotoStore';
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  X,
  Camera,
  ShieldCheck,
  RefreshCw,
  Building,
  Loader2,
  UserX,
  Video,
  Sparkles
} from 'lucide-react';

// Ambil foto dokumentasi langsung dari video element tanpa perlu start camera baru
function captureFrameFromVideo(video) {
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    return null;
  }
  try {
    const maxWidth = 800;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (e) {
    console.warn('captureFrame error:', e);
    return null;
  }
}

export default function QRScannerModal({ isOpen, onClose, selectedActivityId, activityId }) {
  const {
    members,
    personnel,
    activities,
    logs,
    getMemberByQR,
    getParticipantById,
    recordAttendance,
    checkoutAttendance,
    recordGuestAttendance
  } = useAttendance();

  const [cameraState, setCameraState] = useState('idle'); // 'idle' | 'requesting' | 'active' | 'error' | 'denied'
  const [cameraError, setCameraError] = useState('');
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [simQuery, setSimQuery] = useState('');
  const [pendingMemberScan, setPendingMemberScan] = useState(null); // { member, activityForScan, invitationToken, scannerLocation, capturedPhoto }
  const [isSubmittingPhoto, setIsSubmittingPhoto] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const isScanningRef = useRef(false);
  const hasDetectedRef = useRef(false);
  const isInitializingRef = useRef(false);
  const barcodeDetectorRef = useRef(null);
  const currentSessionIdRef = useRef(0);

  // Simpan data context ke ref agar callback scanner tidak perlu re-instantiate effect
  const contextDataRef = useRef({});
  contextDataRef.current = {
    members,
    personnel,
    activities,
    logs,
    getMemberByQR,
    getParticipantById,
    recordAttendance,
    checkoutAttendance,
    recordGuestAttendance,
    selectedActivity: activities.find(a => a.id === (selectedActivityId || activityId)) || activities[0]
  };

  const targetActivityId = selectedActivityId || activityId;
  const selectedActivity = activities.find(a => a.id === targetActivityId) || activities[0];

  // Inisialisasi BarcodeDetector jika browser mendukung
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        barcodeDetectorRef.current = null;
      }
    }
  }, []);

  // Hentikan camera stream, video source, dan animasi frame secara tuntas
  const stopCamera = useCallback(() => {
    isScanningRef.current = false;
    isInitializingRef.current = false;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (streamRef.current) {
      try {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => {
          try { track.stop(); } catch (e) { }
        });
      } catch (e) { }
      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (e) { }
    }

    setCameraState('idle');
  }, []);

  // Logika Pemrosesan QR yang Ditemukan
  const handleQRScanned = useCallback(async (decodedText, overridePhoto = null) => {
    if (hasDetectedRef.current && !overridePhoto) return;
    hasDetectedRef.current = true;
    isScanningRef.current = false;
    setIsProcessing(true);
    setScanError('');

    const {
      members: ctxMembers,
      personnel: ctxPersonnel,
      activities: ctxActivities,
      logs: ctxLogs,
      getMemberByQR: ctxGetMemberByQR,
      getParticipantById: ctxGetParticipantById,
      recordAttendance: ctxRecordAttendance,
      checkoutAttendance: ctxCheckoutAttendance,
      recordGuestAttendance: ctxRecordGuestAttendance,
      selectedActivity: ctxSelectedActivity
    } = contextDataRef.current;

    let documentationPhoto = overridePhoto;
    if (!documentationPhoto && videoRef.current) {
      documentationPhoto = captureFrameFromVideo(videoRef.current);
    }

    const cleanText = (decodedText || '').trim();
    if (!cleanText) {
      setScanError('Data QR Code tidak valid.');
      setIsProcessing(false);
      hasDetectedRef.current = false;
      isScanningRef.current = true;
      return;
    }

    let payload = null;
    try {
      const parsed = JSON.parse(cleanText);
      if (parsed && typeof parsed === 'object') payload = parsed;
    } catch (e) { }

    const recoverScan = () => {
      setIsProcessing(false);
      hasDetectedRef.current = false;
      isScanningRef.current = true;
    };

    let scannedUrl = null;
    let invitationToken = null;
    try { scannedUrl = new URL(cleanText); } catch (e) { }
    const invitationType = scannedUrl?.searchParams.get('type') || payload?.type || null;
    const scannedActivityId = scannedUrl?.searchParams.get('absen') || payload?.activityId || payload?.absen || null;
    const activityForScan = scannedActivityId
      ? ctxActivities.find(activity => activity.id === scannedActivityId)
      : ctxSelectedActivity;

    if (scannedActivityId && !activityForScan) {
      setScanError('QR undangan tidak terkait dengan agenda yang tersedia di sistem.');
      recoverScan();
      return;
    }
    if (!activityForScan) {
      setScanError('Tidak ada agenda kegiatan yang dipilih.');
      recoverScan();
      return;
    }

    // Geolocation check jika agenda mewajibkan GPS
    let scannerLocation = { lat: null, lng: null, distanceMeters: 0 };
    if (activityForScan.gpsRequired) {
      if (!navigator.geolocation) {
        setScanError('Agenda ini mewajibkan GPS, tetapi browser tidak mendukung lokasi.');
        recoverScan();
        return;
      }
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0
          });
        });
        const location = position.coords;
        const radiusCheck = isWithinRadius(
          Number(location.latitude),
          Number(location.longitude),
          Number(activityForScan.targetLat) || 0,
          Number(activityForScan.targetLng) || 0,
          Number(activityForScan.radiusMeters) || 150,
          Number(location.accuracy) || null
        );
        if (!radiusCheck.isWithin) {
          setScanError(
            Number.isFinite(radiusCheck.accuracyMeters) && radiusCheck.accuracyMeters > radiusCheck.accuracyLimit
              ? `GPS belum cukup akurat (${Math.round(radiusCheck.accuracyMeters)} m).`
              : `Absensi ditolak. Perangkat berada di luar radius agenda (${formatDistance(radiusCheck.distance)}).`
          );
          recoverScan();
          return;
        }
        scannerLocation = {
          lat: Number(location.latitude),
          lng: Number(location.longitude),
          distanceMeters: Math.round(radiusCheck.distance)
        };
      } catch (error) {
        setScanError(
          error?.code === 1
            ? 'Izin GPS ditolak. Agenda mewajibkan validasi lokasi.'
            : 'Lokasi GPS belum dapat diperoleh.'
        );
        recoverScan();
        return;
      }
    }

    // ── KELOMPOK 1: TAMU EKSTERNAL / OPD ──
    const normalizedInvitationType = String(invitationType || '').toLowerCase();
    const isExternalInvitation = ['opd', 'guest', 'tamu', 'representative', 'perwakilan'].includes(normalizedInvitationType)
      || String(payload?.participantType || '').toUpperCase() === 'EXTERNAL';

    if (isExternalInvitation) {
      const guestId = scannedUrl?.searchParams.get('guestId') || payload?.guestId || payload?.id || null;
      const agency = scannedUrl?.searchParams.get('agency') || payload?.agency || payload?.guestAgency || 'Instansi/Tamu';
      const invitedName = scannedUrl?.searchParams.get('name') || payload?.name || payload?.invitedName || payload?.guestName || 'Peserta Tamu';
      const position = scannedUrl?.searchParams.get('position') || payload?.position || '';
      const participantCategory = scannedUrl?.searchParams.get('category') || payload?.category || payload?.participantCategory || 'TAMU/UNDANGAN';
      const isRepresented = (scannedUrl?.searchParams.get('isRepresented') || payload?.isRepresented) === true
        || String(scannedUrl?.searchParams.get('isRepresented') || payload?.isRepresented || '').toLowerCase() === 'true';
      const representativeName = scannedUrl?.searchParams.get('representativeName') || payload?.representativeName || '';
      const representativePosition = scannedUrl?.searchParams.get('representativePosition') || payload?.representativePosition || '';
      const token = scannedUrl?.searchParams.get('token') || payload?.token || null;

      const existingGuestAttendance = ctxLogs.find(log =>
        log.activityId === activityForScan.id &&
        log.participantType === 'EXTERNAL' &&
        ((guestId && log.guestId === guestId) ||
          (String(log.agency || '').trim().toLowerCase() === String(agency || '').trim().toLowerCase() &&
            String(log.invitedName || '').trim().toLowerCase() === String(invitedName || '').trim().toLowerCase()))
      );

      // Check-out OPD
      if (existingGuestAttendance) {
        if (existingGuestAttendance.checkOutAt) {
          setScanError(`${invitedName} dari ${agency} sudah melakukan Check-out.`);
          recoverScan();
          return;
        }

        if (!window.confirm(`Konfirmasi Check-out ${invitedName} dari ${agency}?`)) {
          recoverScan();
          return;
        }

        let checkoutPhoto = null;
        try {
          checkoutPhoto = documentationPhoto
            ? await saveAttendancePhoto({
              dataUrl: documentationPhoto,
              activityId: activityForScan.id,
              participantId: existingGuestAttendance.guestId || guestId || 'GUEST',
              eventType: 'CHECK_OUT',
              logId: existingGuestAttendance.id
            })
            : null;
        } catch (error) { }

        const checkoutResult = await ctxCheckoutAttendance({
          activityId: activityForScan.id,
          participantType: 'EXTERNAL',
          guestId,
          agency,
          invitedName,
          method: activityForScan.gpsRequired ? 'GPS_ONLINE' : 'QR_WEBCAM',
          operatorName: 'Petugas Laptop Webcam Scanner',
          documentationPhotoRef: checkoutPhoto,
          ...scannerLocation
        });

        if (checkoutResult.success) {
          setScanResult({ ...checkoutResult, guest: true, member: { name: invitedName, agency } });
          try { confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } }); } catch (e) { }
        } else {
          setScanError(checkoutResult.message || 'Gagal menyimpan Check-out OPD.');
          recoverScan();
        }
        setIsProcessing(false);
        return;
      }

      // Check-in OPD
      let checkinPhoto = null;
      try {
        checkinPhoto = documentationPhoto
          ? await saveAttendancePhoto({
            dataUrl: documentationPhoto,
            activityId: activityForScan.id,
            participantId: guestId || `${agency}-${invitedName}`,
            eventType: 'CHECK_IN',
            logId: `ATT-GST-${activityForScan.id}-${guestId || `${agency}-${invitedName}`}`
          })
          : null;
      } catch (error) { }

      const result = await ctxRecordGuestAttendance({
        activityId: activityForScan.id,
        guestId,
        agency,
        invitedName,
        position,
        participantCategory,
        isRepresented,
        representativeName,
        representativePosition,
        invitationToken: token,
        method: activityForScan.gpsRequired ? 'GPS_ONLINE' : 'QR_WEBCAM',
        ...scannerLocation,
        ignoreDeviceLock: true,
        documentationPhotoRef: checkinPhoto,
        operatorName: 'Petugas Laptop Webcam Scanner'
      });

      if (result.success) {
        setScanResult({ ...result, guest: true, member: { name: invitedName, agency } });
        try { confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } }); } catch (e) { }
      } else {
        setScanError(result.message || 'Gagal menyimpan absensi OPD.');
        recoverScan();
      }
      setIsProcessing(false);
      return;
    }

    // ── KELOMPOK 2: ANGGOTA DPRD & PERSONEL INTERNAL ──
    let extractedToken = cleanText;
    try {
      if (cleanText.includes('http://') || cleanText.includes('https://') || cleanText.includes('?')) {
        const urlObj = new URL(cleanText.startsWith('http') ? cleanText : window.location.origin + cleanText);
        invitationToken = urlObj.searchParams.get('token') || null;
        const urlToken = invitationToken || urlObj.searchParams.get('memberId') || urlObj.searchParams.get('member') || urlObj.searchParams.get('id');
        if (urlToken) extractedToken = urlToken;
      }
    } catch (e) { }
    invitationToken = invitationToken || payload?.token || null;

    let member = ctxGetMemberByQR(extractedToken) || ctxGetMemberByQR(cleanText);

    const invitationMemberId = invitationType === 'member'
      ? (scannedUrl?.searchParams.get('memberId') || payload?.memberId || (invitationToken?.includes(':') ? invitationToken.slice(invitationToken.lastIndexOf(':') + 1) : ''))
      : '';
    if (!member && invitationMemberId) {
      member = ctxGetParticipantById(invitationMemberId);
    }

    // JSON parsing
    if (!member) {
      try {
        const parsed = JSON.parse(cleanText);
        if (parsed.id) member = ctxGetParticipantById(parsed.id);
        if (!member && parsed.qrToken) member = ctxGetMemberByQR(parsed.qrToken);
        if (!member && parsed.nip) member = ctxMembers.find(m => m.nip === parsed.nip);
        if (!member && parsed.memberId) member = ctxGetParticipantById(parsed.memberId);
      } catch (e) { }
    }

    // ID atau NIP langsung
    if (!member) {
      member = [...ctxMembers, ...ctxPersonnel].find(m =>
        m.id === cleanText ||
        m.id === extractedToken ||
        m.nip === cleanText ||
        m.nip === extractedToken ||
        (m.qrToken && (cleanText.includes(m.qrToken) || extractedToken.includes(m.qrToken))) ||
        (m.qrToken && (m.qrToken.includes(cleanText) || m.qrToken.includes(extractedToken)))
      );
    }

    // Fuzzy match
    if (!member) {
      member = [...ctxMembers, ...ctxPersonnel].find(m =>
        cleanText.includes(m.id) ||
        (m.nip && cleanText.includes(m.nip)) ||
        (m.name && cleanText.toLowerCase().includes(m.name.toLowerCase()))
      );
    }

    if (!member) {
      setScanError(`QR Code "${cleanText}" tidak terdaftar di sistem.`);
      recoverScan();
      return;
    }

    if (member.statusActive === false) {
      setScanError(`${member.name || 'Anggota'} berstatus tidak aktif.`);
      recoverScan();
      return;
    }

    if (invitationMemberId && member.id !== invitationMemberId) {
      setScanError('QR undangan tidak sesuai identitas peserta.');
      recoverScan();
      return;
    }

    if (invitationMemberId && Array.isArray(activityForScan.participantMemberIds) && !activityForScan.participantMemberIds.includes(member.id)) {
      setScanError('Anggota tidak terdaftar sebagai peserta agenda ini.');
      recoverScan();
      return;
    }

    // Alur Absensi oleh Petugas dengan Sesi Foto Fisik Anggota Dewan
    // Jangan snapshot instan agar foto tidak berisi gambar kartu QR yang di-scan!
    setPendingMemberScan({
      member,
      activityForScan,
      invitationToken,
      scannerLocation,
      capturedPhoto: null // Kamera akan menampilkan live video webcam agar petugas mengambil foto anggota fisik
    });
    setIsProcessing(false);
  }, []);

  // Scan frame loop - Sangat ringan (max 4-5 fps decode, canvas 320x240, no heavy pixel loops)
  const startScanLoop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    isScanningRef.current = true;

    let lastScanTime = 0;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvasRef.current = canvas;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    const scanFrame = async (timestamp) => {
      if (!isScanningRef.current || hasDetectedRef.current) return;

      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        // Batasi frekuensi decode: 1 kali setiap 220ms agar browser tetap 100% responsif
        if (timestamp - lastScanTime >= 220) {
          lastScanTime = timestamp;

          // Resolusi decode optimal (320px) sehingga jsQR selesai dalam < 3 milidetik
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const targetW = 320;
          const targetH = Math.max(1, Math.round((vh / vw) * targetW));

          canvas.width = targetW;
          canvas.height = targetH;

          if (context) {
            context.drawImage(video, 0, 0, targetW, targetH);

            let detectedText = null;

            // 1. Coba BarcodeDetector native (Chrome/Edge hardware accelerated)
            if (barcodeDetectorRef.current) {
              try {
                const barcodes = await barcodeDetectorRef.current.detect(canvas);
                if (barcodes && barcodes.length > 0 && barcodes[0]?.rawValue) {
                  detectedText = barcodes[0].rawValue;
                }
              } catch (e) { }
            }

            // 2. jsQR (Super cepat pada 320x240)
            if (!detectedText) {
              try {
                const imgData = context.getImageData(0, 0, targetW, targetH);
                const code = jsQR(imgData.data, targetW, targetH, { inversionAttempts: 'dontInvert' });
                if (code?.data) {
                  detectedText = code.data;
                } else {
                  // Coba invert jika kartu berlatar belakang gelap
                  const invertedCode = jsQR(imgData.data, targetW, targetH, { inversionAttempts: 'onlyInvert' });
                  if (invertedCode?.data) {
                    detectedText = invertedCode.data;
                  }
                }
              } catch (e) { }
            }

            if (detectedText && !hasDetectedRef.current) {
              void handleQRScanned(detectedText);
              return;
            }
          }
        }
      }

      if (isScanningRef.current && !hasDetectedRef.current) {
        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [handleQRScanned]);

  // Inisialisasi Kamera
  const startCamera = useCallback(async (deviceIdToUse = null) => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    const sessionId = Date.now();
    currentSessionIdRef.current = sessionId;

    setCameraState('requesting');
    setCameraError('');

    // Hentikan stream yang ada
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(t => t.stop());
      } catch (e) { }
      streamRef.current = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      isInitializingRef.current = false;
      setCameraState('error');
      setCameraError('Browser ini tidak mendukung akses kamera webcam (getUserMedia). Gunakan Chrome atau Edge versi terbaru.');
      return;
    }

    try {
      let stream = null;
      const constraintsList = [];

      if (deviceIdToUse) {
        constraintsList.push({
          video: { deviceId: { exact: deviceIdToUse }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      }

      // Default laptop webcam
      constraintsList.push({
        video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      // Fallback environment
      constraintsList.push({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      // Fallback universal
      constraintsList.push({
        video: true,
        audio: false
      });

      let lastError = null;
      for (const constraints of constraintsList) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (stream) break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!stream) {
        throw lastError || new Error('Tidak dapat terhubung ke kamera.');
      }

      // Jika user menutup modal saat getUserMedia masih loading
      if (currentSessionIdRef.current !== sessionId) {
        stream.getTracks().forEach(t => t.stop());
        isInitializingRef.current = false;
        return;
      }

      streamRef.current = stream;

      // Cari daftar perangkat kamera
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
        if (videoInputs.length > 0 && !deviceIdToUse) {
          const currentTrack = stream.getVideoTracks()[0];
          const activeDeviceId = currentTrack?.getSettings()?.deviceId || videoInputs[0].deviceId;
          setSelectedDeviceId(activeDeviceId);
        }
      } catch (e) { }

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.muted = true;

        await new Promise((resolve) => {
          if (video.readyState >= 2) {
            resolve();
          } else {
            video.onloadedmetadata = () => resolve();
          }
        });

        await video.play().catch(() => { });
        setCameraState('active');
        isInitializingRef.current = false;
        startScanLoop();
      }
    } catch (err) {
      isInitializingRef.current = false;
      if (currentSessionIdRef.current !== sessionId) return;

      console.error('Camera init error:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setCameraState('denied');
        setCameraError('Izin akses webcam ditolak oleh browser. Silakan klik ikon gembok atau kamera di address bar browser untuk mengizinkan kamera.');
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        setCameraState('error');
        setCameraError('Kamera sedang digunakan oleh aplikasi lain (seperti Zoom, Meet, Teams). Silakan tutup aplikasi tersebut lalu coba lagi.');
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setCameraState('error');
        setCameraError('Perangkat webcam tidak ditemukan.');
      } else {
        setCameraState('error');
        setCameraError(`Gagal mengakses kamera: ${err?.message || 'Izin kamera diperlukan.'}`);
      }
    }
  }, [startScanLoop]);

  // Efek Buka / Tutup Modal
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScanResult(null);
      setScanError('');
      setCameraError('');
      hasDetectedRef.current = false;
      setIsProcessing(false);
      return;
    }

    const timer = setTimeout(() => {
      void startCamera();
    }, 50);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen, targetActivityId, startCamera, stopCamera]);

  // Handler untuk menyimpan absensi anggota setelah foto diambil oleh webcam laptop
  const handleConfirmMemberAttendance = async (photoOverride = null) => {
    if (!pendingMemberScan) return;
    const { member, activityForScan, invitationToken, scannerLocation, capturedPhoto } = pendingMemberScan;
    const finalPhoto = photoOverride || capturedPhoto || (videoRef.current ? captureFrameFromVideo(videoRef.current) : null);

    setIsSubmittingPhoto(true);

    const { logs: ctxLogs, recordAttendance: ctxRecordAttendance, checkoutAttendance: ctxCheckoutAttendance } = contextDataRef.current;

    // Cek apakah sudah ada log kehadiran
    const existingAttendance = ctxLogs.find(log =>
      log.activityId === activityForScan.id &&
      log.memberId === member.id &&
      log.participantType !== 'EXTERNAL'
    );

    // Proses Check-Out Anggota
    if (existingAttendance) {
      if (existingAttendance.checkOutAt) {
        setScanError(`${member.name} sudah melakukan Check-out pada agenda ini.`);
        setPendingMemberScan(null);
        setIsSubmittingPhoto(false);
        hasDetectedRef.current = false;
        isScanningRef.current = true;
        return;
      }
      
      let checkoutPhoto = null;
      try {
        checkoutPhoto = finalPhoto
          ? await saveAttendancePhoto({
            dataUrl: finalPhoto,
            activityId: activityForScan.id,
            participantId: member.id,
            eventType: 'CHECK_OUT',
            logId: existingAttendance.id
          })
          : null;
      } catch (error) { }

      const checkoutResult = await ctxCheckoutAttendance({
        activityId: activityForScan.id,
        memberId: member.id,
        method: activityForScan.gpsRequired ? 'GPS_ONLINE' : 'QR_WEBCAM',
        operatorName: 'Petugas Laptop Webcam Scanner',
        documentationPhotoRef: checkoutPhoto,
        ...scannerLocation
      });

      setIsSubmittingPhoto(false);
      setPendingMemberScan(null);

      if (checkoutResult.success) {
        setScanResult({ ...checkoutResult, member, participantType: 'INTERNAL', isCheckout: true, photoUrl: finalPhoto });
        try { confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } }); } catch (e) { }
      } else {
        setScanError(checkoutResult.message || 'Gagal menyimpan Check-out.');
        hasDetectedRef.current = false;
        isScanningRef.current = true;
      }
      return;
    }

    // Proses Check-In Anggota
    let checkinPhoto = null;
    try {
      checkinPhoto = finalPhoto
        ? await saveAttendancePhoto({
          dataUrl: finalPhoto,
          activityId: activityForScan.id,
          participantId: member.id,
          eventType: 'CHECK_IN',
          logId: `ATT-${activityForScan.id}-${member.id}`
        })
        : null;
    } catch (error) { }

    const result = await ctxRecordAttendance({
      activityId: activityForScan.id,
      memberId: member.id,
      method: activityForScan.gpsRequired ? 'GPS_ONLINE' : 'QR_WEBCAM',
      operatorName: 'Petugas Laptop Webcam Scanner',
      ignoreDeviceLock: true,
      invitationToken,
      documentationPhotoRef: checkinPhoto,
      ...scannerLocation
    });

    setIsSubmittingPhoto(false);
    setPendingMemberScan(null);

    if (result.success) {
      setScanResult({ ...result, member, participantType: 'INTERNAL', photoUrl: finalPhoto });
      setScanError('');
      try { confetti({ particleCount: 85, spread: 75, origin: { y: 0.6 } }); } catch (e) { }
    } else {
      setScanError(result.message || 'Gagal menyimpan absensi ke database.');
      hasDetectedRef.current = false;
      isScanningRef.current = true;
    }
  };

  const handleRetakeMemberPhoto = () => {
    if (!pendingMemberScan) return;
    const newPhoto = videoRef.current ? captureFrameFromVideo(videoRef.current) : null;
    setPendingMemberScan(prev => prev ? { ...prev, capturedPhoto: newPhoto } : null);
  };

  const handleCancelPendingMember = () => {
    setPendingMemberScan(null);
    hasDetectedRef.current = false;
    isScanningRef.current = true;
  };

  const handleDeviceChange = async (e) => {
    const newDeviceId = e.target.value;
    setSelectedDeviceId(newDeviceId);
    await startCamera(newDeviceId);
  };

  const handleScanNext = async () => {
    setScanResult(null);
    setPendingMemberScan(null);
    setScanError('');
    hasDetectedRef.current = false;
    setIsProcessing(false);

    if (!streamRef.current || cameraState !== 'active') {
      await startCamera(selectedDeviceId);
    } else {
      startScanLoop();
    }
  };

  if (!isOpen) return null;

  const filteredMembers = members.filter(m => {
    if (!simQuery) return true;
    const q = simQuery.toLowerCase();
    return (
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.nip && m.nip.toLowerCase().includes(q)) ||
      (m.fraksi && m.fraksi.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl text-slate-100 relative max-h-[94vh] overflow-y-auto flex flex-col">

        {/* ── HEADER MODAL ── */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-cyan-950 border border-cyan-800/80 text-cyan-400 shadow-sm">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">Absensi QR Webcam Laptop</h3>
                <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-cyan-500/30">
                  Meja Registrasi
                </span>
              </div>
              <p className="text-xs text-slate-400">Arahkan QR Card Anggota ke kamera untuk presensi real-time</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            title="Tutup Scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── BANNER AGENDA TERPILIH ── */}
        {selectedActivity ? (
          <div className="my-3.5 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5 min-w-0">
              <Building className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400">Agenda: </span>
                <strong className="text-emerald-300 truncate">{selectedActivity.title}</strong>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-extrabold shrink-0">
              {selectedActivity.category}
            </span>
          </div>
        ) : (
          <div className="my-3.5 p-3 rounded-2xl bg-amber-950/60 border border-amber-800 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Belum ada agenda yang aktif. Pastikan agenda telah dibuat di menu Agenda Kegiatan.</span>
          </div>
        )}

        {/* ── KONTEN UTAMA: SCANNER vs PENDING PHOTO CONFIRMATION vs HASIL ── */}
        {pendingMemberScan ? (
          /* ── SESI KONFIRMASI FOTO ANGGOTA OLEH PETUGAS ── */
          <div className="space-y-4 my-2 p-4 rounded-3xl bg-slate-950/90 border border-emerald-500/50 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                {pendingMemberScan.member.photo ? (
                  <img src={pendingMemberScan.member.photo} alt="" className="w-10 h-10 rounded-full object-cover border border-emerald-500 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-emerald-500 flex items-center justify-center font-bold text-emerald-400 shrink-0">
                    {pendingMemberScan.member.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-white">{pendingMemberScan.member.name}</h4>
                  <p className="text-[11px] text-emerald-400 font-medium">{pendingMemberScan.member.fraksi} • {pendingMemberScan.member.komisi || pendingMemberScan.member.jabatan || 'Internal'}</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-bold uppercase">
                QR Terbaca
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>Foto Bukti Kehadiran Anggota Dewan</span>
                </span>
                <span className="text-[10px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800">
                  Ambil Foto Anggota
                </span>
              </div>

              {/* Box Preview Hasil Foto / Live Webcam Frame */}
              <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden border-2 border-emerald-500/60 flex items-center justify-center shadow-inner">
                {pendingMemberScan.capturedPhoto ? (
                  <img src={pendingMemberScan.capturedPhoto} alt="Foto Anggota Dewan" className="w-full h-full object-cover" />
                ) : (
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && streamRef.current && el.srcObject !== streamRef.current) {
                        el.srcObject = streamRef.current;
                        el.play().catch(() => {});
                      }
                    }}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>

            {/* Tombol Aksi Foto */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              {!pendingMemberScan.capturedPhoto ? (
                <button
                  type="button"
                  onClick={handleRetakeMemberPhoto}
                  disabled={isSubmittingPhoto}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>Jepret Foto Anggota</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setPendingMemberScan(prev => prev ? { ...prev, capturedPhoto: null } : null)}
                    disabled={isSubmittingPhoto}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4 text-amber-400" />
                    <span>Foto Ulang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmMemberAttendance()}
                    disabled={isSubmittingPhoto}
                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50"
                  >
                    {isSubmittingPhoto ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Menyimpan Absensi...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Simpan Absensi & Foto</span>
                      </>
                    )}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleCancelPendingMember}
                disabled={isSubmittingPhoto}
                className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl font-bold text-xs border border-slate-800 transition"
              >
                Batal
              </button>
            </div>
          </div>
        ) : !scanResult ? (
          <div className="space-y-3.5 flex-1 flex flex-col">

            {/* Error / Permission Denied Box */}
            {cameraState === 'denied' || cameraState === 'error' ? (
              <div className="p-5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-900/60 text-rose-300 flex items-center justify-center mx-auto border border-rose-700">
                  <UserX className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-rose-200 text-sm">Akses Kamera Terkendala</h4>
                  <p className="text-rose-300 text-xs mt-1 leading-relaxed">{cameraError}</p>
                </div>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => startCamera(selectedDeviceId)}
                    className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition"
                  >
                    <RefreshCw className="w-4 h-4" /> Coba Hubungkan Kamera Lagi
                  </button>
                </div>
              </div>
            ) : (
              /* ── VIDEO PREVIEW CONTAINER ── */
              <div className="relative rounded-2xl border-2 border-cyan-500/40 bg-slate-950 overflow-hidden shadow-inner aspect-video flex items-center justify-center">
                {/* Elemen Video Native React */}
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    if (el && streamRef.current && el.srcObject !== streamRef.current) {
                      el.srcObject = streamRef.current;
                      el.play().catch(() => {});
                    }
                  }}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover"
                />

                {/* Loading State Overlay */}
                {cameraState === 'requesting' && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-3 z-20">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    <div className="text-center">
                      <p className="text-xs font-bold text-white">Menghubungkan Webcam Laptop...</p>
                      <p className="text-[11px] text-slate-400">Mohon izinkan akses kamera jika muncul popup browser</p>
                    </div>
                  </div>
                )}

                {/* Laser Scanning Animation Overlay */}
                {cameraState === 'active' && !isProcessing && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                    {/* Frame Target Kotak */}
                    <div className="w-56 h-56 sm:w-64 sm:h-64 border-2 border-cyan-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                      {/* Corner Accents */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-cyan-300 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-cyan-300 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-cyan-300 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-cyan-300 rounded-br-lg" />

                      {/* Moving Scanning Line */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee] animate-pulse" />
                    </div>

                    <div className="absolute bottom-3 inset-x-0 text-center">
                      <span className="px-3 py-1 bg-slate-950/80 text-cyan-300 text-[11px] font-semibold rounded-full border border-cyan-800/80 backdrop-blur-xs">
                        📷 Arahkan QR Card tepat ke kotak scanner
                      </span>
                    </div>
                  </div>
                )}

                {/* Processing Overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-3 z-30">
                    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                    <div className="text-center">
                      <p className="text-xs font-bold text-white">QR Terbaca! Memvalidasi Identitas & Foto...</p>
                      <p className="text-[11px] text-slate-400">Menyimpan data presensi ke Cloud Firestore</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Selector Device Kamera */}
            {availableDevices.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <Video className="w-4 h-4 text-slate-400 shrink-0" />
                <label className="text-slate-400 text-[11px]">Pilih Kamera:</label>
                <select
                  value={selectedDeviceId}
                  onChange={handleDeviceChange}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200"
                >
                  {availableDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Kamera ${d.deviceId.slice(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Pesan Error Scan */}
            {scanError && (
              <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block">Pemberitahuan Scan:</span>
                  <span>{scanError}</span>
                </div>
              </div>
            )}

            {/* ── SIMULASI SCAN CEPAT ── */}
            {selectedActivity && members.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pencarian Cepat Anggota (Simulasi Langsung):</span>
                  </span>
                  <span className="text-[10px] text-amber-400">Klik nama untuk absenkan</span>
                </div>

                <input
                  type="text"
                  placeholder="Ketik nama atau fraksi anggota..."
                  value={simQuery}
                  onChange={e => setSimQuery(e.target.value)}
                  className="w-full mb-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500"
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
                  {filteredMembers.slice(0, 9).map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => !isProcessing && handleQRScanned(m.qrToken || m.id)}
                      disabled={isProcessing}
                      className="p-2 text-left bg-slate-800/80 hover:bg-cyan-900/60 rounded-xl border border-slate-700/60 hover:border-cyan-600 text-[11px] truncate flex items-center gap-2 disabled:opacity-50 transition"
                    >
                      {m.photo ? (
                        <img src={m.photo} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-600" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-700 shrink-0 flex items-center justify-center text-slate-300 text-[9px] font-bold">
                          {m.name?.charAt(0)}
                        </div>
                      )}
                      <span className="truncate font-semibold text-slate-200">
                        {m.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          /* ── LAYAR HASIL SUKSES ── */
          <div className="my-2 p-5 rounded-3xl bg-gradient-to-b from-slate-800 via-slate-900 to-slate-900 border border-emerald-500/50 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className={`inline-block px-3.5 py-1 rounded-full text-xs font-black ${scanResult.log?.checkOutAt
                  ? 'bg-blue-950 text-blue-300 border border-blue-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                ✓ {scanResult.log?.checkOutAt ? 'CHECK-OUT BERHASIL' : 'ABSENSI BERHASIL DICATAT'}
              </span>
              <h4 className="text-xs text-slate-400">Verifikasi Visual & Presensi Terverifikasi Badan Kehormatan</h4>
            </div>

            {/* Kartu Profil Anggota / Peserta */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left flex items-start space-x-4">
              {scanResult.photoUrl ? (
                <img
                  src={scanResult.photoUrl}
                  alt={scanResult.member?.name || 'Foto Absen'}
                  className="w-20 h-24 rounded-2xl object-cover border-2 border-emerald-500 shadow-md shrink-0"
                />
              ) : scanResult.member?.photo ? (
                <img
                  src={scanResult.member.photo}
                  alt={scanResult.member.name}
                  className="w-20 h-24 rounded-2xl object-cover border-2 border-emerald-500 shadow-md shrink-0"
                />
              ) : (
                <div className="w-20 h-24 rounded-2xl bg-slate-800 border-2 border-emerald-500 flex items-center justify-center text-2xl font-bold text-emerald-400 shrink-0">
                  {(scanResult.member?.name || scanResult.log?.guestName || 'A').charAt(0)}
                </div>
              )}
              <div className="space-y-1 text-xs min-w-0 flex-1">
                <h4 className="font-extrabold text-sm sm:text-base text-white truncate">
                  {scanResult.member?.name || scanResult.log?.guestName || scanResult.log?.invitedName}
                </h4>
                <p className="text-slate-400">
                  {scanResult.guest ? 'Instansi' : 'NIP / ID'}: <span className="font-mono text-slate-200">{scanResult.member?.nip || scanResult.member?.id || scanResult.log?.agency || '-'}</span>
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded-lg bg-blue-950 text-blue-300 border border-blue-800 font-bold text-[10px]">
                    {scanResult.member?.fraksi || scanResult.log?.participantCategory || 'DPRD'}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-purple-950 text-purple-300 border border-purple-800 font-bold text-[10px]">
                    {scanResult.member?.komisi || scanResult.member?.jabatan || 'Internal'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  Waktu: <span className="text-emerald-400 font-mono font-bold">
                    {new Date(scanResult.log?.timestampISO || scanResult.log?.timestamp || Date.now()).toLocaleTimeString('id-ID')} WIB
                  </span>
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Presensi dan foto dokumentasi tersimpan di Cloud Firestore & Audit Trail.</span>
            </div>

            {/* Tombol Aksi Lanjutan */}
            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5">
              <button
                type="button"
                onClick={handleScanNext}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Pindai Anggota Selanjutnya</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs transition"
              >
                Selesai / Tutup
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
