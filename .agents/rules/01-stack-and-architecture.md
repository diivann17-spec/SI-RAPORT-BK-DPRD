# Tech Stack & Arsitektur SI-RAPORT BK DPRD

## 1. Komponen Utama
- **Frontend Core**: React 19 dengan Vite sebagai bundler super cepat.
- **Styling**: Tailwind CSS v4 terintegrasi melalui `@tailwindcss/vite`.
- **Database & Auth**: Google Firebase v12 (Modular SDK: `firebase/firestore`, `firebase/auth`).
- **Icons**: `lucide-react`.

## 2. Struktur Direktori `src/`
- `src/components/`: Komponen UI modular (Navbar, Sidebar, Modals, Card, Table, dsb.)
- `src/context/`: React Context (misal: `AuthContext.jsx`, `AttendanceContext.jsx`)
- `src/firebase/`:
  - `config.js`: Inisialisasi Firebase App, Auth, dan Firestore
  - `authService.js`: Operasi login, logout, dan manajemen sesi
  - `accountService.js`: Whitelist login dan manajemen akun pengguna
  - `firestoreService.js`: CRUD untuk seluruh koleksi Firestore
- `src/utils/`: Fungsi utilitas (format tanggal, ekspor PDF/Excel, validasi form, kalkulasi persentase kehadiran)

## 3. Aturan State Management
- Gunakan React Context untuk global state (Auth, Notification/Toast, Global Settings).
- Komponen harus memisahkan presentasi (UI) dari logika pengambilan data dengan memanggil fungsi service yang terdefinisi di `src/firebase/`.
