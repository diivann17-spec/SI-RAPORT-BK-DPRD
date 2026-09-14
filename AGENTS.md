# AI Agent Guidelines & Rules: SI-RAPORT BK DPRD

Dokumen ini berisi panduan, aturan arsitektur, standar keamanan, dan konvensi kode untuk pengembangan aplikasi **SI-RAPORT BK DPRD** (Sistem Informasi Raport Kehadiran & Kinerja Anggota DPRD oleh Badan Kehormatan).

---

## 1. Profil & Konteks Proyek

- **Nama Aplikasi**: SI-RAPORT BK DPRD
- **Tujuan**: Sistem pencatatan kehadiran, pelaporan kinerja, evaluasi kedisiplinan anggota dewan, serta manajemen agenda kegiatan kedewanan oleh Badan Kehormatan (BK) dan Sekretariat DPRD.
- **Bahasa Utama UI & Istilah**: Bahasa Indonesia (formal kepemerintahan & kedewanan).

---

## 2. Tech Stack & Dependencies

| Layer | Teknologi / Library |
|---|---|
| **Framework** | React 19 + Vite |
| **Styling** | Tailwind CSS v4 + Vanilla CSS Custom Tokens |
| **Icons** | Lucide React |
| **Backend / DB** | Firebase (Cloud Firestore + Firebase Authentication) |
| **Fitur Khusus** | HTML5-QRCode / QR-Code Scanner, Tesseract.js (OCR), PDF.js, SheetJS (XLSX Export/Import), Canvas-Confetti |
| **Linter** | Oxlint |

---

## 3. Struktur Role & Access Control (RBAC)

Aplikasi memiliki 4 role utama dengan dokumen akun tersimpan di collection `/accounts/{uid}`:

1. `SECRETARIAT_ADMIN`
   - Administrator tertinggi dari Sekretariat DPRD.
   - Hak akses penuh (CRUD akun, anggota, agenda kegiatan, pengaturan sistem, kelola master data ruangan/penandatangan, export/import).
2. `PETUGAS_BK`
   - Petugas Badan Kehormatan DPRD.
   - Akses evaluasi kedisiplinan, catatan BK (`bkNotes`), pembuatan agenda, pemantauan raport kehadiran, input catatan pelanggaran/pemberitahuan.
3. `PETUGAS_SCAN`
   - Petugas operator presensi di lapangan / pintu masuk rapat.
   - Akses utama: Scanner QR-Code & input presensi kehadiran real-time (`attendanceLogs`).
4. `ANGGOTA_DPRD`
   - Anggota Dewan Perwakilan Rakyat Daerah.
   - Akses dashboard mandiri (melihat riwayat presensi pribadi, raport kedisiplinan pribadi, pengajuan izin/dispensasi).

---

## 4. Struktur Koleksi Database Firestore

| Koleksi | Deskripsi | Aturan Keamanan Utama |
|---|---|---|
| `/accounts/{uid}` | Data whitelist akun pengguna & role | ID dokumen harus sama dengan Firebase Auth UID. Hanya Admin/BK yang bisa kelola. |
| `/members/{id}` | Data Master Anggota DPRD | Read oleh semua user aktif. Modifikasi oleh Admin/BK. |
| `/personnel/{id}` | Data Personel / Fraksi / Komisi | Read oleh user aktif. Modifikasi oleh Admin/BK. |
| `/activities/{id}` | Agenda & Kegiatan Rapat / Paripurna | Read oleh user aktif. Modifikasi oleh Admin/BK. |
| `/activities/{id}/attendance/{uid}` | Presensi sub-koleksi kegiatan | Dicatat saat verifikasi presensi. |
| `/attendanceLogs/{id}` | Log presensi kedatangan/kehadiran | Create oleh Petugas Scan/BK/Admin. Read mandiri atau Admin/BK. |
| `/deletedAttendanceLogs/{id}` | Soft-delete / riwayat pembatalan log | Hanya Admin/BK. |
| `/bkNotes/{id}` | Catatan & Evaluasi Badan Kehormatan | Read/Write khusus BK & Admin. |
| `/auditTrails/{id}` | Jejak audit aksi sistem | Append-only (tidak dapat diubah/dihapus). |
| `/rooms/{id}` | Master Ruangan Rapat | Admin/BK. |
| `/reportSigners/{id}` | Pejabat Penandatangan Laporan | Admin/BK. |
| `/leaveRequests/{id}` | Pengajuan Izin / Dispensasi | Dibuat oleh pemohon, disetujui oleh BK/Admin. |
| `/settings/{id}` | Konfigurasi Aplikasi & Lembaga | Read oleh user aktif, Write khusus Admin. |

---

## 5. Prinsip Pengkodean & Standar Arsitektur

1. **Keamanan Firebase**:
   - Selalu periksa status autentikasi dan role sebelum merender menu/komponen sensitif.
   - Jangan pernah menyimpan kredensial Service Account atau Secret Key di frontend.
   - Semua operasi CRUD harus memvalidasi status akun `ACTIVE` dan role pengguna.
2. **State Management & Data Layer**:
   - Manfaatkan Service Layer yang sudah ada di `src/firebase/firestoreService.js` dan `src/firebase/accountService.js`.
   - Hindari pemanggilan langsung `db` di dalam komponen jika sudah ada fungsi service pembungkus.
3. **UI/UX & Desain**:
   - Desain profesional, elegan, bernuansa pemerintahan modern (Clean UI, Glassmorphism halus, palet warna elegan seperti Emerald, Indigo, Slate, Amber untuk status).
   - Responsif untuk desktop, tablet, dan smartphone (terutama halaman scanner QR untuk petugas lapangan).
4. **Penanganan Error & Feedback**:
   - Berikan notifikasi/toast yang jelas dalam bahasa Indonesia saat operasi berhasil maupun gagal.
   - Tangani loading state dengan skeleton loader atau spinner yang rapi.
