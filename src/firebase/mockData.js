/**
 * Mock Data Engine for SI-RAPORT BK DPRD
 * Dilengkapi data Agenda QR Code, Peserta Internal & Eksternal (OPD/Tamu),
 * Perwakilan Instansi, Dokumen SPT Dinas Luar, Notulen LPJ Digital, dan Device Log.
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
    attendancePin: '112001',   // PIN 6 digit untuk absensi mandiri
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
    attendancePin: '210502',
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
    attendancePin: '031198',
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
    attendancePin: '120804',
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
    attendancePin: '140206',
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
    attendancePin: '091002',
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
    attendancePin: '080803',
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
    attendancePin: '170301',
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
    attendancePin: '080107',
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
    attendancePin: '121294',
    statusActive: true
  }
];

export const INITIAL_ACTIVITIES = [
  {
    id: 'ACT-2026-001',
    activityNumber: '005/PARIPURNA/DPRD/IX/2026',
    title: 'Rapat Paripurna Ke-12: Penyampaian LKPJ Kepala Daerah Tahun 2025',
    category: 'Paripurna',
    date: '2026-09-08',
    startTime: '09:00',
    endTime: '13:00',
    toleranceMinutes: 30,
    qrToken: 'QR-ACT-2026-001-PARIPURNA-LKPJ',
    locationName: 'Ruang Rapat Paripurna Utama Gedung DPRD',
    targetLat: -6.200000,
    targetLng: 106.816666,
    radiusMeters: 150,
    status: 'ACTIVE',
    mandatoryTotal: 10,
    description: 'Rapat Paripurna wajib diikuti oleh seluruh anggota DPRD dan dihadiri oleh jajaran Forkopimda serta OPD Pemerintah Daerah.',
    invitedGuests: [
      { id: 'GST-001', agency: 'Bupati / Sekretariat Daerah', invitedName: 'Sekretaris Daerah Kab. Cirebon', position: 'Sekretaris Daerah', email: 'setda@cirebonkab.go.id' },
      { id: 'GST-002', agency: 'Bappelitbangda', invitedName: 'Kepala Bappelitbangda', position: 'Kepala Badan', email: 'bappeda@cirebonkab.go.id' },
      { id: 'GST-003', agency: 'BKAD / Keuangan Daerah', invitedName: 'Kepala BKAD', position: 'Kepala Badan', email: 'bkad@cirebonkab.go.id' },
      { id: 'GST-004', agency: 'Dinas Komunikasi & Informatika', invitedName: 'Kepala Diskominfo', position: 'Kepala Dinas', email: 'diskominfo@cirebonkab.go.id' }
    ],
    lpjSummary: {
      notes: 'Rapat Paripurna berjalan lancar. Laporan Pertanggungjawaban Kepala Daerah Tahun 2025 diserahkan secara simbolis kepada Pimpinan DPRD untuk ditindaklanjuti pansus.',
      documentationPhotos: [
        'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=600&auto=format&fit=crop&q=80'
      ],
      attachments: ['Surat Undangan No 005/120/DPRD/2026', 'Naskah Pidato Pengantar LKPJ 2025']
    }
  },
  {
    id: 'ACT-2026-002',
    activityNumber: '008/KOM-I/RDP/IX/2026',
    title: 'Rapat Dengar Pendapat (RDP) Komisi I Mengenai Evaluasi Perda Pelayanan Publik',
    category: 'Komisi',
    date: '2026-09-08',
    startTime: '13:30',
    endTime: '16:30',
    toleranceMinutes: 20,
    qrToken: 'QR-ACT-2026-002-KOMISI-I-RDP',
    locationName: 'Ruang Rapat Komisi I Gedung DPRD',
    targetLat: -6.200150,
    targetLng: 106.816800,
    radiusMeters: 100,
    status: 'SCHEDULED',
    mandatoryTotal: 3,
    description: 'Rapat pembahasan koordinasi bersama Dinas Kependudukan dan Pencatatan Sipil serta Bagian Hukum Setda.',
    invitedGuests: [
      { id: 'GST-005', agency: 'Dinas Kependudukan & Pencatatan Sipil', invitedName: 'Drs. H. Mohamad Syafrudin', position: 'Kepala Disdukcapil' },
      { id: 'GST-006', agency: 'Bagian Hukum Setda', invitedName: 'Kabag Hukum Setda', position: 'Kepala Bagian' }
    ],
    lpjSummary: {
      notes: '',
      documentationPhotos: [],
      attachments: []
    }
  },
  {
    id: 'ACT-2026-003',
    activityNumber: '002/BANMUS/DPRD/IX/2026',
    title: 'Rapat Badan Musyawarah (Banmus): Penetapan Agenda Rapat Paripurna Bulan September',
    category: 'Banmus',
    date: '2026-09-06',
    startTime: '10:00',
    endTime: '12:00',
    toleranceMinutes: 30,
    qrToken: 'QR-ACT-2026-003-BANMUS-JADWAL',
    locationName: 'Ruang Rapat Banmus DPRD',
    targetLat: -6.200000,
    targetLng: 106.816666,
    radiusMeters: 100,
    status: 'COMPLETED',
    mandatoryTotal: 10,
    description: 'Penetapan jadwal sidang dan rapat komisi selama masa persidangan bulan September.',
    invitedGuests: [
      { id: 'GST-007', agency: 'Bagian Persidangan Setwan', invitedName: 'Kabag Persidangan & Perundang-undangan', position: 'Kepala Bagian' }
    ],
    lpjSummary: {
      notes: 'Jadwal Masa Persidangan III Bulan September telah disahkan secara aklamasi oleh seluruh anggota Banmus yang hadir.',
      documentationPhotos: [
        'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=600&auto=format&fit=crop&q=80'
      ],
      attachments: ['Risalah Rapat Banmus 06 September 2026']
    }
  },
  {
    id: 'ACT-2026-004',
    activityNumber: '001/RESES-III/DPRD/IX/2026',
    title: 'Kegiatan Reses Masa Persidangan III Tahun 2026 (Dapil I)',
    category: 'Reses',
    date: '2026-09-04',
    startTime: '08:00',
    endTime: '17:00',
    toleranceMinutes: 60,
    qrToken: 'QR-ACT-2026-004-RESES-DAPIL1',
    locationName: 'Kecamatan Sumber & Weru',
    targetLat: -6.890000,
    targetLng: 107.610000,
    radiusMeters: 500,
    status: 'COMPLETED',
    mandatoryTotal: 10,
    description: 'Penyerapan aspirasi masyarakat daerah pemilihan 1.',
    invitedGuests: [],
    lpjSummary: {
      notes: 'Tercatat 14 aspirasi prioritas warga terkait perbaikan drainase, jalan desa, dan beasiswa pendidikan.',
      documentationPhotos: [
        'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=600&auto=format&fit=crop&q=80'
      ],
      attachments: ['Rekapitulasi Pokok Pikiran (Pokpir) Dapil 1']
    }
  },
  {
    id: 'ACT-2026-005',
    activityNumber: '003/KUNKER/KOM-II/IX/2026',
    title: 'Kunjungan Kerja Komisi II Dalam Rangka Pengawasan Proyek Infrastruktur',
    category: 'Kunjungan Kerja',
    date: '2026-09-02',
    startTime: '09:00',
    endTime: '16:00',
    toleranceMinutes: 45,
    qrToken: 'QR-ACT-2026-005-KUNKER-INFRA',
    locationName: 'Lokasi Proyek Normalisasi Sungai & Irigasi',
    targetLat: -6.250000,
    targetLng: 106.850000,
    radiusMeters: 300,
    status: 'COMPLETED',
    mandatoryTotal: 10,
    description: 'Studi lapangan penanganan banjir wilayah pertanian dan saluran irigasi primer.',
    invitedGuests: [
      { id: 'GST-008', agency: 'Dinas Pekerjaan Umum & Tata Ruang', invitedName: 'Kepala Dinas PUTR', position: 'Kepala Dinas' }
    ],
    lpjSummary: {
      notes: 'Komisi II memberikan rekomendasi percepatan pengerjaan tanggul penahan tanah sebelum musim hujan tiba.',
      documentationPhotos: [
        'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80'
      ],
      attachments: ['Laporan Hasil Peninjauan Lapangan Kunker PUTR']
    }
  }
];

export const INITIAL_ATTENDANCE_LOGS = [
  // ── ACT-2026-001 (Paripurna Hari Ini) ──
  {
    id: 'ATT-101',
    activityId: 'ACT-2026-001',
    participantType: 'INTERNAL', // 'INTERNAL' | 'EXTERNAL'
    memberId: 'DPRD-001',
    memberName: 'H. Bambang Soesatyo, S.E., M.B.A.',
    timestamp: '2026-09-08T08:45:12+07:00',
    status: 'Hadir',
    method: 'QR_AGENDA',
    deviceId: 'DEV-BB01-A128',
    deviceType: 'Smartphone / Tablet',
    operatorName: 'Mandiri (Mobile Scan)',
    lat: -6.200005,
    lng: 106.816660,
    distanceMeters: 8,
    proofPhoto: null,
    note: 'Hadir tepat waktu melalui Scan QR Agenda'
  },
  {
    id: 'ATT-102',
    activityId: 'ACT-2026-001',
    participantType: 'INTERNAL',
    memberId: 'DPRD-002',
    memberName: 'Dra. Hj. Sri Mulyani, M.Si.',
    timestamp: '2026-09-08T08:52:30+07:00',
    status: 'Hadir',
    method: 'QR_WEBCAM',
    deviceId: 'DEV-LAPTOP-OP01',
    deviceType: 'Laptop / Desktop PC',
    operatorName: 'Petugas Absensi - Rian (Laptop 01)',
    lat: -6.200010,
    lng: 106.816670,
    distanceMeters: 12,
    proofPhoto: null,
    note: 'Verifikasi visual QR match di meja registrasi'
  },
  {
    id: 'ATT-103',
    activityId: 'ACT-2026-001',
    participantType: 'INTERNAL',
    memberId: 'DPRD-003',
    memberName: 'Dr. H. Ahmad Muzani, S.H., M.H.',
    timestamp: '2026-09-08T08:58:04+07:00',
    status: 'Hadir',
    method: 'GPS_ONLINE',
    deviceId: 'DEV-MZ03-S22',
    deviceType: 'Smartphone / Tablet',
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
    participantType: 'INTERNAL',
    memberId: 'DPRD-004',
    memberName: 'Ir. H. Agus Harimurti, M.Sc.',
    timestamp: '2026-09-08T09:35:22+07:00',
    status: 'Terlambat',
    method: 'QR_AGENDA',
    deviceId: 'DEV-AHY-IP15',
    deviceType: 'Smartphone / Tablet',
    operatorName: 'Mandiri (Mobile Scan)',
    lat: -6.200000,
    lng: 106.816666,
    distanceMeters: 5,
    proofPhoto: null,
    note: 'Terlambat 35 menit (melewati batas toleransi 30 menit)'
  },
  {
    id: 'ATT-105',
    activityId: 'ACT-2026-001',
    participantType: 'INTERNAL',
    memberId: 'DPRD-005',
    memberName: 'Hj. Anis Byarwati, S.Ag., M.Si.',
    timestamp: '2026-09-08T08:30:00+07:00',
    status: 'Dinas Luar',
    method: 'MANUAL_OVERRIDE',
    operatorName: 'Admin Sekretariat - Budi H.',
    sptNumber: 'SPT.090/451/BK-DPRD/IX/2026',
    sptFile: 'https://images.unsplash.com/photo-1618042164219-62c820f10723?w=500',
    note: 'Tugas Konsultasi Ranperda ke Ditjen Otda Kemendagri Jakarta'
  },
  {
    id: 'ATT-106',
    activityId: 'ACT-2026-001',
    participantType: 'INTERNAL',
    memberId: 'DPRD-006',
    memberName: 'H. Cucun Ahmad Syamsurijal, M.A.P.',
    timestamp: '2026-09-08T08:10:00+07:00',
    status: 'Sakit',
    method: 'MANUAL_OVERRIDE',
    operatorName: 'Admin Sekretariat - Budi H.',
    note: 'Surat Keterangan Rawat Inap RSUD'
  },
  // ── Peserta Eksternal / OPD / Tamu Undangan (Hanya masuk absensi & LPJ) ──
  {
    id: 'ATT-GST-01',
    activityId: 'ACT-2026-001',
    participantType: 'EXTERNAL',
    guestId: 'GST-001',
    agency: 'Sekretariat Daerah',
    invitedName: 'Sekretaris Daerah Kab. Cirebon',
    isRepresented: true,
    representativeName: 'Drs. Hendra Permana, M.Si.',
    representativePosition: 'Asisten Pemerintahan dan Kesra (Asda I)',
    status: 'Diwakili',
    method: 'GUEST_CHECKIN',
    timestamp: '2026-09-08T08:40:15+07:00',
    operatorName: 'Meja Tamu OPD',
    note: 'Sekda berhalangan hadir memimpin rapat koordinasi darurat'
  },
  {
    id: 'ATT-GST-02',
    activityId: 'ACT-2026-001',
    participantType: 'EXTERNAL',
    guestId: 'GST-002',
    agency: 'Bappelitbangda',
    invitedName: 'Kepala Bappelitbangda',
    isRepresented: false,
    representativeName: null,
    representativePosition: null,
    status: 'Hadir',
    method: 'GUEST_CHECKIN',
    timestamp: '2026-09-08T08:50:00+07:00',
    operatorName: 'Meja Tamu OPD',
    note: 'Hadir langsung membawa naskah data pembangunan'
  },
  {
    id: 'ATT-GST-03',
    activityId: 'ACT-2026-001',
    participantType: 'EXTERNAL',
    guestId: 'GST-004',
    agency: 'Dinas Komunikasi & Informatika',
    invitedName: 'Kepala Diskominfo',
    isRepresented: false,
    representativeName: null,
    representativePosition: null,
    status: 'Hadir',
    method: 'GUEST_CHECKIN',
    timestamp: '2026-09-08T08:48:30+07:00',
    operatorName: 'Meja Tamu OPD',
    note: 'Hadir memfasilitasi live streaming persidangan'
  },

  // ── Data Histori Kegiatan Terdahulu (Banmus, Reses, Kunker) ──
  {
    id: 'ATT-201',
    activityId: 'ACT-2026-003',
    participantType: 'INTERNAL',
    memberId: 'DPRD-001',
    memberName: 'H. Bambang Soesatyo, S.E., M.B.A.',
    timestamp: '2026-09-06T09:50:00+07:00',
    status: 'Hadir',
    method: 'QR_AGENDA',
    distanceMeters: 10,
    note: 'Hadir Banmus Tepat Waktu'
  },
  {
    id: 'ATT-202',
    activityId: 'ACT-2026-003',
    participantType: 'INTERNAL',
    memberId: 'DPRD-002',
    memberName: 'Dra. Hj. Sri Mulyani, M.Si.',
    timestamp: '2026-09-06T09:55:00+07:00',
    status: 'Hadir',
    method: 'QR_AGENDA',
    distanceMeters: 5,
    note: 'Hadir Banmus Tepat Waktu'
  },
  {
    id: 'ATT-203',
    activityId: 'ACT-2026-003',
    participantType: 'INTERNAL',
    memberId: 'DPRD-007',
    memberName: 'H. Ahmad Sahroni, S.E., M.I.Kom.',
    timestamp: '2026-09-06T10:35:00+07:00',
    status: 'Terlambat',
    method: 'QR_AGENDA',
    distanceMeters: 15,
    note: 'Terlambat 35 menit'
  },
  {
    id: 'ATT-204',
    activityId: 'ACT-2026-003',
    participantType: 'INTERNAL',
    memberId: 'DPRD-008',
    memberName: 'Drs. H. Dedi Mulyadi, S.H.',
    timestamp: '2026-09-06T12:00:00+07:00',
    status: 'Alpha',
    method: 'MANUAL_OVERRIDE',
    operatorName: 'System Auto-Closed',
    note: 'Tidak melakukan absensi hingga rapat selesai'
  },
  {
    id: 'ATT-205',
    activityId: 'ACT-2026-003',
    participantType: 'INTERNAL',
    memberId: 'DPRD-010',
    memberName: 'H. Desmond Junaidi Mahesa, S.H., M.H.',
    timestamp: '2026-09-06T12:00:00+07:00',
    status: 'Alpha',
    method: 'MANUAL_OVERRIDE',
    operatorName: 'System Auto-Closed',
    note: 'Tidak hadir tanpa konfirmasi'
  },
  {
    id: 'ATT-301',
    activityId: 'ACT-2026-004',
    participantType: 'INTERNAL',
    memberId: 'DPRD-001',
    memberName: 'H. Bambang Soesatyo, S.E., M.B.A.',
    timestamp: '2026-09-04T08:15:00+07:00',
    status: 'Hadir',
    method: 'GPS_ONLINE',
    distanceMeters: 45,
    note: 'Absensi Reses Dapil 1'
  },
  {
    id: 'ATT-302',
    activityId: 'ACT-2026-004',
    participantType: 'INTERNAL',
    memberId: 'DPRD-002',
    memberName: 'Dra. Hj. Sri Mulyani, M.Si.',
    timestamp: '2026-09-04T08:20:00+07:00',
    status: 'Hadir',
    method: 'GPS_ONLINE',
    distanceMeters: 30,
    note: 'Absensi Reses Dapil 1'
  },
  {
    id: 'ATT-303',
    activityId: 'ACT-2026-004',
    participantType: 'INTERNAL',
    memberId: 'DPRD-008',
    memberName: 'Drs. H. Dedi Mulyadi, S.H.',
    timestamp: '2026-09-04T17:00:00+07:00',
    status: 'Alpha',
    method: 'MANUAL_OVERRIDE',
    operatorName: 'System Auto-Closed',
    note: 'Tidak menginput absensi reses'
  },
  {
    id: 'ATT-304',
    activityId: 'ACT-2026-004',
    participantType: 'INTERNAL',
    memberId: 'DPRD-010',
    memberName: 'H. Desmond Junaidi Mahesa, S.H., M.H.',
    timestamp: '2026-09-04T17:00:00+07:00',
    status: 'Alpha',
    method: 'MANUAL_OVERRIDE',
    operatorName: 'System Auto-Closed',
    note: 'Tidak menginput absensi reses'
  }
];

export const INITIAL_AUDIT_TRAILS = [
  {
    id: 'AUD-901',
    timestamp: '2026-09-08T08:45:12+07:00',
    userRole: 'Anggota DPRD',
    userName: 'H. Bambang Soesatyo, S.E., M.B.A.',
    action: 'SCAN_QR_AGENDA_SUCCESS',
    details: 'Scan QR Agenda Paripurna Ke-12 Berhasil (Device ID: DEV-BB01-A128, Tepat Waktu)',
    ipAddress: '192.168.1.45',
    method: 'QR_AGENDA'
  },
  {
    id: 'AUD-902',
    timestamp: '2026-09-08T08:40:15+07:00',
    userRole: 'Tamu Eksternal / OPD',
    userName: 'Drs. Hendra Permana, M.Si. (Mewakili Sekda)',
    action: 'GUEST_CHECKIN_REPRESENTATIVE',
    details: 'Check-in Delegasi Instansi Sekretariat Daerah untuk Paripurna Ke-12',
    ipAddress: '192.168.1.50',
    method: 'GUEST_CHECKIN'
  },
  {
    id: 'AUD-903',
    timestamp: '2026-09-08T08:30:00+07:00',
    userRole: 'Admin Sekretariat',
    userName: 'Budi Hartono, S.STP.',
    action: 'DINAS_LUAR_RECORDED',
    details: 'Pencatatan Dinas Luar DPRD-005 (Hj. Anis Byarwati) dengan SPT No SPT.090/451/BK-DPRD/IX/2026',
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
