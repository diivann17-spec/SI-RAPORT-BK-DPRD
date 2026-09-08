/**
 * Device Fingerprinting & Anti-Titip Absen Utility
 * Memastikan 1 Perangkat hanya dapat digunakan 1x Absensi per Agenda
 */

// Generate canvas hardware fingerprint
function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 50;
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('SI-RAPORT-BK-ANTI-TIPSEN', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('SI-RAPORT-BK-ANTI-TIPSEN', 4, 17);
    const dataUrl = canvas.toDataURL();
    let hash = 0;
    for (let i = 0; i < dataUrl.length; i++) {
      hash = ((hash << 5) - hash) + dataUrl.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  } catch (e) {
    return 'NO-CANVAS';
  }
}

export function getDeviceFingerprint() {
  const nav = window.navigator;
  const screen = window.screen;
  const canvasHash = getCanvasFingerprint();
  
  // Ambil atau buat persistent device ID (disimpan di localStorage & sessionStorage)
  let storedDeviceId = localStorage.getItem('siraport_device_id') || sessionStorage.getItem('siraport_device_id');
  if (!storedDeviceId) {
    const hardwareSeed = `${screen.width}x${screen.height}-${screen.colorDepth}-${nav.hardwareConcurrency || 4}-${canvasHash}`;
    storedDeviceId = 'DEV-' + hardwareSeed + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      localStorage.setItem('siraport_device_id', storedDeviceId);
      sessionStorage.setItem('siraport_device_id', storedDeviceId);
    } catch (e) {}
  }

  // Deteksi Tipe Perangkat & OS
  const ua = nav.userAgent || '';
  let os = 'Unknown OS';
  if (/windows nt 10.0/i.test(ua)) os = 'Windows 10/11';
  else if (/windows nt 6.3/i.test(ua)) os = 'Windows 8.1';
  else if (/windows nt 6.1/i.test(ua)) os = 'Windows 7';
  else if (/android/i.test(ua)) os = 'Android Device';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS Device';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  // Deteksi Browser
  let browser = 'Unknown Browser';
  if (/chrome|crios/i.test(ua) && !/edge|edg|opr/i.test(ua)) browser = 'Chrome';
  else if (/edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/opr\//i.test(ua)) browser = 'Opera';

  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(ua);

  return {
    deviceId: storedDeviceId,
    deviceType: isMobile ? 'Smartphone / Tablet' : 'Laptop / Desktop PC',
    os,
    browser,
    screenResolution: `${screen.width}x${screen.height}`,
    userAgent: ua,
    recordedAt: new Date().toISOString()
  };
}


/**
 * Validasi apakah perangkat ini sudah pernah absen pada agenda tertentu
 * @param {string} activityId 
 * @param {string} memberId 
 * @param {Array} attendanceLogs 
 * @returns {{ allowed: boolean, previousMemberName?: string, message?: string }}
 */
export function validateDeviceSingleAttendance(activityId, memberId, attendanceLogs = []) {
  const currentDevice = getDeviceFingerprint();
  const actLogs = attendanceLogs.filter(l => l.activityId === activityId);

  // Cari apakah ada log absensi lain pada agenda ini dengan deviceId yang sama namun memberId berbeda
  const duplicateDeviceLog = actLogs.find(l => 
    l.deviceId === currentDevice.deviceId && 
    (l.memberId || l.guestId) !== memberId
  );

  if (duplicateDeviceLog) {
    return {
      allowed: false,
      previousName: duplicateDeviceLog.memberName || duplicateDeviceLog.guestName || 'Peserta Lain',
      message: `Perangkat ini sudah digunakan untuk absensi atas nama "${duplicateDeviceLog.memberName || duplicateDeviceLog.guestName || 'Peserta Lain'}". Aturan sistem: 1 Perangkat hanya 1x Absensi per Agenda.`
    };
  }

  return { allowed: true };
}
