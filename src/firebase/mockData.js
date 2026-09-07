/**
 * Mock Data Engine for SI-RAPORT BK DPRD
 * Fully realistic initial dataset with LocalStorage persistence & Firebase sync capability
 */

export const INITIAL_MEMBERS = [
  {
    id: 'DPRD-001',
    name: 'H. Bambang Soesatyo, S.E., M.B.A.',
    nip: '19720415 200412 1 001',
    fraksi: 'Fraksi Golkar',
    komisi: 'Komisi I (Hukum & Pemerintahan)',
    jabatan: 'Ketua DPRD / Anggota',
    photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80',
    phone: '0812-9876-5432',
    email: 'bambang.soesatyo@dprd.go.id',
    qrToken: 'QR-DPRD-001-BAMBANG-GS2026',
    statusActive: true
  },
  {
    id: 'DPRD-002',
    name: 'Dra. Hj. Sri Mulyani, M.Si.',
    nip: '19750821 200501 2 004',
    fraksi: 'Fraksi PDI Perjuangan',
    komisi: 'Komisi III (Keuangan & Asset)',
    jabatan: 'Wakil Ketua I DPRD',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    phone: '0813-1122-3344',
    email: 'sri.mulyani@dprd.go.id',
    qrToken: 'QR-DPRD-002-SRI-PDIP2026',
    statusActive: true
  },
  {
    id: 'DPRD-003',
    name: 'Dr. H. Ahmad Muzani, S.H., M.H.',
    nip: '19691105 199803 1 002',
    fraksi: 'Fraksi Gerindra',
    komisi: 'Komisi I (Hukum & Pemerintahan)',
    jabatan: 'Ketua Badan Kehormatan (BK)',
    photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
    phone: '0811-3344-5566',
    email: 'ahmad.muzani@dprd.go.id',
    qrToken: 'QR-DPRD-003-MUZANI-GERINDRA',
    statusActive: true
  },
  {
    id: 'DPRD-004',
    name: 'Ir. H. Agus Harimurti, M.Sc.',
    nip: '19800312 200804 1 009',
    fraksi: 'Fraksi Demokrat',
    komisi: 'Komisi II (Pembangunan & Infrastruktur)',
    jabatan: 'Anggota Komisi II',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    phone: '0815-9988-7766',
    email: 'agus.harimurti@dprd.go.id',
    qrToken: 'QR-DPRD-004-AHY-DEMOKRAT',
    statusActive: true
  },
  {
    id: 'DPRD-005',
    name: 'Hj. Anis Byarwati, S.Ag., M.Si.',
    nip: '19780214 200602 2 008',
    fraksi: 'Fraksi PKS',
    komisi: 'Komisi IV (Kesejahteraan Rakyat & Pendidikan)',
    jabatan: 'Anggota Badan Kehormatan (BK)',
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
    phone: '0817-4433-2211',
    email: 'anis.byarwati@dprd.go.id',
    qrToken: 'QR-DPRD-005-ANIS-PKS2026',
    statusActive: true
  },
  {
    id: 'DPRD-006',
    name: 'H. Cucun Ahmad Syamsurijal, M.A.P.',
    nip: '19741009 200211 1 005',
    fraksi: 'Fraksi PKB',
    komisi: 'Komisi III (Keuangan & Asset)',
    jabatan: 'Ketua Fraksi PKB',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    phone: '0818-7766-5544',
    email: 'cucun.syamsurijal@dprd.go.id',
    qrToken: 'QR-DPRD-006-CUCUN-PKB2026',
    statusActive: true
  },
  {
    id: 'DPRD-007',
    name: 'H. Ahmad Sahroni, S.E., M.I.Kom.',
    nip: '19760808 200305 1 007',
    fraksi: 'Fraksi NasDem',
    komisi: 'Komisi I (Hukum & Pemerintahan)',
    jabatan: 'Anggota Komisi I',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
    phone: '0819-2233-4455',
    email: 'ahmad.sahroni@dprd.go.id',
    qrToken: 'QR-DPRD-007-SAHRONI-NASDEM',
    statusActive: true
  },
  {
    id: 'DPRD-008',
    name: 'Drs. H. Dedi Mulyadi, S.H.',
    nip: '19710317 200112 1 003',
    fraksi: 'Fraksi Gerindra',
    komisi: 'Komisi II (Pembangunan & Infrastruktur)',
    jabatan: 'Anggota Badan Anggaran',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    phone: '0812-3456-7890',
    email: 'dedi.mulyadi@dprd.go.id',
    qrToken: 'QR-DPRD-008-DEDI-GERINDRA',
    statusActive: true
  },
  {
    id: 'DPRD-009',
    name: 'Dr. Hj. Rieke Diah Pitaloka, M.Hum.',
    nip: '19740108 200701 2 003',
    fraksi: 'Fraksi PDI Perjuangan',
    komisi: 'Komisi IV (Kesejahteraan Rakyat & Pendidikan)',
    jabatan: 'Anggota Komisi IV',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    phone: '0813-5566-7788',
    email: 'rieke.pitaloka@dprd.go.id',
    qrToken: 'QR-DPRD-009-RIEKE-PDIP2026',
    statusActive: true
  },
  {
    id: 'DPRD-010',
    name: 'H. Desmond Junaidi Mahesa, S.H., M.H.',
    nip: '19651212 199402 1 001',
    fraksi: 'Fraksi Gerindra',
    komisi: 'Komisi III (Keuangan & Asset)',
    jabatan: 'Anggota Komisi III',
    photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
    phone: '0811-6677-8899',
    email: 'desmond.mahesa@dprd.go.id',
    qrToken: 'QR-DPRD-010-DESMOND-GERINDRA',
    statusActive: true
  }
];

export const INITIAL_ACTIVITIES = [
  {
    id: 'ACT-2026-001',
    title: 'Rapat Paripurna Ke-12: Penyampaian LKPJ Kepala Daerah Tahun 2025',
    category: 'Paripurna',
    date: '2026-09-07',
    startTime: '09:00',
    endTime: '12:30',
    locationName: 'Ruang Rapat Paripurna Utama Gedung DPRD',
    targetLat: -6.200000,
    targetLng: 106.816666,
    radiusMeters: 150,
    status: 'ACTIVE',
    mandatoryTotal: 10,
    description: 'Rapat Paripurna wajib diikuti oleh seluruh anggota DPRD sesuai amanat Tatib DPRD.'
  },
  {
    id: 'ACT-2026-002',
    title: 'Rapat Dengar Pendapat (RDP) Komisi I Mengenai Evaluasi Perda Pelayanan Publik',
    category: 'Komisi',
    date: '2026-09-07',
    startTime: '13:30',
    endTime: '16:00',
    locationName: 'Ruang Rapat Komisi I DPRD',
    targetLat: -6.200150,
    targetLng: 106.816800,
    radiusMeters: 100,
    status: 'SCHEDULED',
    mandatoryTotal: 3,
    description: 'Rapat pembahasan koordinasi bersama Dinas Kependudukan dan Pencatatan Sipil.'
  },
  {
    id: 'ACT-2026-003',
    title: 'Rapat Badan Musyawarah (Banmus): Penetapan Agenda Rapat Paripurna Bulan September',
    category: 'Banmus',
    date: '2026-09-06',
    startTime: '10:00',
    endTime: '12:00',
    locationName: 'Ruang Rapat Banmus DPRD',
    targetLat: -6.200000,
    targetLng: 106.816666,
    radiusMeters: 100,
    status: 'COMPLETED',
    mandatoryTotal: 10,
    description: 'Penetapan jadwal kegiatan DPRD bulan berjalan.'
  },
  {
    id: 'ACT-2026-004',
    title: 'Kegiatan Reses Masa Persidangan III Tahun 2026 (Dapil I)',
    category: 'Reses',
    date: '2026-09-04',
    startTime: '08:00',
    endTime: '17:00',
    locationName: 'Kecamatan Coblong & Sumur Bandung',
    targetLat: -6.890000,
    targetLng: 107.610000,
    radiusMeters: 500,
    status: 'COMPLETED',
    mandatoryTotal: 10,
    description: 'Penyerapan aspirasi masyarakat daerah pemilihan 1.'
  },
  {
    id: 'ACT-2026-005',
    title: 'Kunjungan Kerja Komisi II Dalam Rangka Pengawasan Proyek Infrastruktur',
    category: 'Kunjungan Kerja',
    date: '2026-09-02',
    startTime: '09:00',
    endTime: '16:00',
    locationName: 'Lokasi Proyek Waduk & Drainase Utama',
    targetLat: -6.250000,
    targetLng: 106.850000,
    radiusMeters: 300,
    status: 'COMPLETED',
    mandatoryTotal: 10,
    description: 'Studi lapangan penanganan banjir wilayah perkotaan.'
  }
];

export const INITIAL_ATTENDANCE_LOGS = [
  // Activity 1 (Paripurna hari ini)
  {
    id: 'ATT-101',
    activityId: 'ACT-2026-001',
    memberId: 'DPRD-001',
    timestamp: '2026-09-07T08:45:12+07:00',
    status: 'Hadir',
    method: 'QR_WEBCAM',
    operatorName: 'Petugas Absensi - Rian (Laptop 01)',
    lat: -6.200005,
    lng: 106.816660,
    distanceMeters: 8,
    proofPhoto: null,
    note: 'Hadir tepat waktu melalui Webcam Scan'
  },
  {
    id: 'ATT-102',
    activityId: 'ACT-2026-001',
    memberId: 'DPRD-002',
    timestamp: '2026-09-07T08:52:30+07:00',
    status: 'Hadir',
    method: 'QR_WEBCAM',
    operatorName: 'Petugas Absensi - Rian (Laptop 01)',
    lat: -6.200010,
    lng: 106.816670,
    distanceMeters: 12,
    proofPhoto: null,
    note: 'Verifikasi visual QR match'
  },
  {
    id: 'ATT-103',
    activityId: 'ACT-2026-001',
    memberId: 'DPRD-003',
    timestamp: '2026-09-07T08:58:04+07:00',
    status: 'Hadir',
    method: 'GPS_ONLINE',
    operatorName: 'Self Mobile App (Anggota)',
    lat: -6.200020,
    lng: 106.816650,
    distanceMeters: 22,
    proofPhoto: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300',
    note: 'Absensi GPS Mobile terverifikasi radius 22m'
  },
  {
    id: 'ATT-104',
    activityId: 'ACT-2026-001',
    memberId: 'DPRD-004',
    timestamp: '2026-09-07T09:15:22+07:00',
    status: 'Terlambat',
    method: 'QR_WEBCAM',
    operatorName: 'Petugas Absensi - Rian (Laptop 01)',
    lat: -6.200000,
    lng: 106.816666,
    distanceMeters: 0,
    proofPhoto: null,
    note: 'Hadir terlambat 15 menit karena pengawalan lalu lintas'
  },
  {
    id: 'ATT-105',
    activityId: 'ACT-2026-001',
    memberId: 'DPRD-005',
    timestamp: '2026-09-07T08:30:00+07:00',
    status: 'Izin',
    method: 'MANUAL_OVERRIDE',
    operatorName: 'Admin Sekretariat - Budi H.',
    lat: null,
    lng: null,
    distanceMeters: null,
    proofPhoto: null,
    note: 'Surat Izin Resmi Nomor 045/BK-DPRD/IX/2026 (Tugas Pendampingan Kementerian)'
  },
  {
    id: 'ATT-106',
    activityId: 'ACT-2026-001',
    memberId: 'DPRD-006',
    timestamp: '2026-09-07T08:10:00+07:00',
    status: 'Sakit',
    method: 'MANUAL_OVERRIDE',
    operatorName: 'Admin Sekretariat - Budi H.',
    lat: null,
    lng: null,
    distanceMeters: null,
    proofPhoto: null,
    note: 'Surat Dokter Rawat Inap RSUD Kebayoran'
  },
  // Data histori kegiatan terdahulu (Banmus, Reses, Kunker)
  {
    id: 'ATT-201',
    activityId: 'ACT-2026-003',
    memberId: 'DPRD-001',
    timestamp: '2026-09-06T09:50:00+07:00',
    status: 'Hadir',
    method: 'QR_WEBCAM',
    operatorName: 'Petugas Laptop 02',
    distanceMeters: 10,
    note: 'Hadir Banmus'
  },
  {
    id: 'ATT-202',
    activityId: 'ACT-2026-003',
    memberId: 'DPRD-002',
    timestamp: '2026-09-06T09:55:00+07:00',
    status: 'Hadir',
    method: 'QR_WEBCAM',
    operatorName: 'Petugas Laptop 02',
    distanceMeters: 5,
    note: 'Hadir Banmus'
  },
  {
    id: 'ATT-203',
    activityId: 'ACT-2026-003',
    memberId: 'DPRD-007',
    timestamp: '2026-09-06T10:30:00+07:00',
    status: 'Terlambat',
    method: 'QR_WEBCAM',
    operatorName: 'Petugas Laptop 02',
    distanceMeters: 15,
    note: 'Hadir Banmus'
  },
  {
    id: 'ATT-204',
    activityId: 'ACT-2026-003',
    memberId: 'DPRD-008',
    timestamp: '2026-09-06T00:00:00+07:00',
    status: 'Tanpa Keterangan',
    method: 'MANUAL_OVERRIDE',
    operatorName: 'System Auto-Closed',
    note: 'Tidak melakukan absensi hingga rapat selesai'
  },
  {
    id: 'ATT-205',
    activityId: 'ACT-2026-003',
    memberId: 'DPRD-010',
    timestamp: '2026-09-06T00:00:00+07:00',
    status: 'Tanpa Keterangan',
    method: 'MANUAL_OVERRIDE',
    operatorName: 'System Auto-Closed',
    note: 'Tidak hadir tanpa konfirmasi'
  },
  {
    id: 'ATT-301',
    activityId: 'ACT-2026-004',
    memberId: 'DPRD-001',
    timestamp: '2026-09-04T08:15:00+07:00',
    status: 'Hadir',
    method: 'GPS_ONLINE',
    operatorName: 'Self Mobile App',
    distanceMeters: 45,
    note: 'Absensi Reses Dapil 1'
  },
  {
    id: 'ATT-302',
    activityId: 'ACT-2026-004',
    memberId: 'DPRD-002',
    timestamp: '2026-09-04T08:20:00+07:00',
    status: 'Hadir',
    method: 'GPS_ONLINE',
    operatorName: 'Self Mobile App',
    distanceMeters: 30,
    note: 'Absensi Reses Dapil 1'
  },
  {
    id: 'ATT-303',
    activityId: 'ACT-2026-004',
    memberId: 'DPRD-008',
    timestamp: '2026-09-04T00:00:00+07:00',
    status: 'Tanpa Keterangan',
    method: 'MANUAL_OVERRIDE',
    operatorName: 'System Auto-Closed',
    note: 'Tidak menginput absensi reses'
  },
  {
    id: 'ATT-304',
    activityId: 'ACT-2026-004',
    memberId: 'DPRD-010',
    timestamp: '2026-09-04T00:00:00+07:00',
    status: 'Tanpa Keterangan',
    method: 'MANUAL_OVERRIDE',
    operatorName: 'System Auto-Closed',
    note: 'Tidak menginput absensi reses'
  }
];

export const INITIAL_AUDIT_TRAILS = [
  {
    id: 'AUD-901',
    timestamp: '2026-09-07T08:45:12+07:00',
    userRole: 'Petugas Operator Laptop',
    userName: 'Rian Hidayat (Operator Scan 01)',
    action: 'SCAN_QR_SUCCESS',
    details: 'Absensi Webcam QR Berhasil untuk DPRD-001 (H. Bambang Soesatyo, S.E., M.B.A.) pada Paripurna Ke-12',
    ipAddress: '192.168.1.45',
    method: 'QR_WEBCAM'
  },
  {
    id: 'AUD-902',
    timestamp: '2026-09-07T08:30:00+07:00',
    userRole: 'Admin Sekretariat',
    userName: 'Budi Hartono, S.STP.',
    action: 'MANUAL_ATTENDANCE_INPUT',
    details: 'Input Absensi Manual [Izin] untuk DPRD-005 (Hj. Anis Byarwati) - Alasan: Tugas Pendampingan Kementerian',
    ipAddress: '192.168.1.10',
    method: 'MANUAL_OVERRIDE'
  },
  {
    id: 'AUD-903',
    timestamp: '2026-09-07T08:10:00+07:00',
    userRole: 'Admin Sekretariat',
    userName: 'Budi Hartono, S.STP.',
    action: 'MANUAL_ATTENDANCE_INPUT',
    details: 'Input Absensi Manual [Sakit] untuk DPRD-006 (H. Cucun Ahmad Syamsurijal) - Surat Dokter Lampiran Rawat Inap RSUD',
    ipAddress: '192.168.1.10',
    method: 'MANUAL_OVERRIDE'
  },
  {
    id: 'AUD-904',
    timestamp: '2026-09-06T17:00:00+07:00',
    userRole: 'Ketua Badan Kehormatan',
    userName: 'Dr. H. Ahmad Muzani, S.H., M.H.',
    action: 'EWS_WARNING_SENT',
    details: 'Mengirimkan Peringatan Dini Kedisiplinan BK ke Anggota DPRD-008 (Drs. H. Dedi Mulyadi) karena persentase kehadiran 45%',
    ipAddress: '192.168.1.20',
    method: 'SYSTEM_EWS'
  }
];

export const INITIAL_BK_NOTES = {
  'DPRD-008': {
    updatedAt: '2026-09-06T17:00:00+07:00',
    author: 'Badan Kehormatan (BK)',
    note: 'Tingkat kehadiran berada di bawah 50% (Kategori Merah). Memerlukan pemanggilan klarifikasi sidang BK mengenai keaktifan kegiatan rapat Komisi & Banmus.',
    statusWarning: 'SURAT_TEGURAN_1'
  },
  'DPRD-010': {
    updatedAt: '2026-09-05T14:20:00+07:00',
    author: 'Badan Kehormatan (BK)',
    note: 'Kehadiran 50% (Kategori Merah). Peringatan lisan telah disampaikan melalui Fraksi Gerindra.',
    statusWarning: 'PERINGATAN_LISAN'
  }
};
