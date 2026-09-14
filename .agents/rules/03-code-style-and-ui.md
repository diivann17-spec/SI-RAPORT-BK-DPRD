# Code Style & UI/UX Guidelines

## 1. Konvensi Kode JavaScript & React
- Gunakan ES Modules (`import`/`export`).
- Gunakan functional components dengan React Hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useContext`).
- Hindari inline styling statis jika sudah bisa diakomodasi oleh utility Tailwind CSS.
- Tangani error asynchronous dengan blok `try ... catch` dan berikan pesan error yang ramah pengguna.

## 2. Standar UI / Desain
- Tema: Pemerintahan modern, berwibawa, bersih, dan profesional.
- Aksesibilitas: Kontras warna jelas (misal teks gelap pada latar terang atau teks putih tebal pada kartu/badge gelap).
- Interaktivitas: Tambahkan hover state, transisi halus, dan animasi mikro secukupnya.
- Scanner QR: Pastikan tata letak kamera di perangkat mobile ramah sentuhan, jelas indikator bidiknya, dan memiliki tombol switch kamera depan/belakang jika tersedia.
