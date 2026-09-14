# Firebase Security & RBAC Guidelines

## 1. Role-Based Access Control (RBAC)
Empat role dalam aplikasi:
- `SECRETARIAT_ADMIN`: Akses penuh ke seluruh fitur dan koleksi.
- `PETUGAS_BK`: Akses agenda, evaluasi raport, input catatan BK, dan monitoring presensi.
- `PETUGAS_SCAN`: Akses pemindaian QR Code dan input log presensi.
- `ANGGOTA_DPRD`: Akses baca profil, riwayat kehadiran pribadi, dan pengajuan izin.

## 2. Sinkronisasi Antara `firestore.rules` & Client
- Setiap dokumen di `/accounts/{uid}` menyimpan data `{ uid, role, status, username, ... }`.
- `firestore.rules` mewajibkan setiap request diverifikasi melalui `accountPath()` dan `activeAccount()`.
- Data sensitif seperti akun tidak boleh dihapus secara hard-delete (`allow delete: if false;`), melainkan melalui status `INACTIVE` atau `SUSPENDED`.
- Catatan audit (`/auditTrails`) bersifat immutable (append-only).

## 3. Aturan Tambah Koleksi Baru
Jika menambahkan koleksi Firestore baru ke dalam aplikasi:
1. Daftarkan nama koleksi di `COLLECTIONS` pada `src/firebase/firestoreService.js`.
2. Buat fungsi CRUD terisolasi di service layer.
3. Tambahkan blok `match /namaKoleksi/{id}` di `firestore.rules` dengan aturan read/write sesuai peran yang diizinkan.
4. Jangan pernah meninggalkan koleksi dengan `allow read, write: if true;` di lingkungan produksi.
