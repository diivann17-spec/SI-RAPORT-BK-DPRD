# ⚡ QUICK START - Buat Test Accounts & Login Langsung

> Ikuti langkah-langkah ini untuk langsung membuat akun dan login testing

## 🎯 OPSI TERCEPAT: Firebase Console (2 Menit)

### Step 1: Buka Firebase Console
1. Kunjungi: https://console.firebase.google.com/
2. Pilih project: **si-raport-bk-dprd**
3. Di sidebar kiri, klik **Firestore Database**

### Step 2: Buka Collections > accounts
1. Klik **Collections** tab
2. Cari collection bernama **accounts** (jika belum ada, create dulu)
3. Di dalam collection, klik **"Add Document"** button

### Step 3: Buat Akun ADMIN
Isi data seperti ini:

**Document ID:** `admin-001`

**Field-field:**
```
username                string      admin
usernameNormalized      string      admin
passwordHash            string      admin123
fullName                string      Administrator Sekretariat DPRD
email                   string      admin@dprd.local
role                    string      SECRETARIAT_ADMIN
status                  string      ACTIVE
memberId                string      (biarkan kosong atau null)
department              string      Sekretariat
loginAttempts           number      0
notes                   string      Initial admin account
createdBy               string      system
createdAt               timestamp   (pilih waktu hari ini)
updatedBy               string      system
updatedAt               timestamp   (pilih waktu hari ini)
lastLoginAt             null        (biarkan kosong)
```

Klik **Save**

### Step 4: Buat Akun MEMBER (untuk testing sebagai anggota)
Klik **"Add Document"** lagi. Isi data:

**Document ID:** `member-001`

**Field-field:**
```
username                string      budi
usernameNormalized      string      budi
passwordHash            string      budi123
fullName                string      Budi Santoso
email                   string      budi@dprd.local
role                    string      ANGGOTA_DPRD
status                  string      ACTIVE
memberId                string      member-budi-001
department              string      Komisi A
loginAttempts           number      0
notes                   string      Test member account
createdBy               string      system
createdAt               timestamp   (pilih waktu hari ini)
updatedBy               string      system
updatedAt               timestamp   (pilih waktu hari ini)
lastLoginAt             null        (biarkan kosong)
```

Klik **Save**

---

## 🚀 Step 5: Login Testing

### Buka aplikasi:
```
http://localhost:5173/login
```

### Test Login sebagai ADMIN:
```
Username: admin
Password: admin123
```
✅ Klik Login → Berhasil masuk ke Dashboard

### Test Login sebagai MEMBER:
```
Logout terlebih dahulu

Username: budi
Password: budi123
```
✅ Klik Login → Berhasil masuk sebagai anggota

---

## 📋 Test Account List (Lengkap)

Jika ingin test semua role, buat account-account ini:

### 1️⃣ ADMIN (Full Access)
```
Document ID: admin-001
username: admin
password: admin123
role: SECRETARIAT_ADMIN
```

### 2️⃣ BK STAFF (Manage Members)
```
Document ID: bk-001
username: bk
password: bk123
role: PETUGAS_BK
```

### 3️⃣ SCAN OPERATOR (Attendance Only)
```
Document ID: scan-001
username: scan
password: scan123
role: PETUGAS_SCAN
```

### 4️⃣ MEMBERS (Multiple untuk testing)
```
Document ID: member-001
username: budi
password: budi123
role: ANGGOTA_DPRD
memberId: member-budi-001

Document ID: member-002
username: siti
password: siti123
role: ANGGOTA_DPRD
memberId: member-siti-001

Document ID: member-003
username: ahmad
password: ahmad123
role: ANGGOTA_DPRD
memberId: member-ahmad-001
```

---

## ✅ Verify Berhasil

Setelah login, check:

✅ Untuk ADMIN:
- [ ] Bisa akses Dashboard
- [ ] Bisa akses Account Management menu
- [ ] Bisa create/edit account

✅ Untuk MEMBER:
- [ ] Bisa akses Dashboard
- [ ] Hanya read-only (tidak bisa edit)
- [ ] Tidak ada Account Management menu

---

## 🔧 Troubleshooting

### "Username atau kata sandi tidak sesuai"
**Solusi:**
1. Verify field `usernameNormalized` = lowercase username
2. Check field `status` = "ACTIVE"
3. Verify password field = `passwordHash`
4. Exact match username (case-sensitive di query)

### "Akun tidak ditemukan di collection"
**Solusi:**
1. Verify collection name = "accounts"
2. Check document di Firebase Console
3. Refresh page aplikasi
4. Clear browser cache

### Login tapi langsung ke login page lagi
**Solusi:**
1. Check localStorage clear (browser console): `localStorage.clear()`
2. Verify user role ada di database
3. Check browser console untuk error messages

---

## 🎓 Next Steps

Setelah berhasil login:

1. **Test Fitur**
   - Explore Dashboard
   - Check Profile
   - View Attendance

2. **Test Admin Panel** (jika login sebagai admin)
   - Buka Account Management
   - Try create account baru
   - Try edit account
   - Try reset password
   - Check audit logs

3. **Test Role-Based Access**
   - Login dengan different roles
   - Verify fitur yang available sesuai role
   - Check permission denied messages

---

## ⚠️ PENTING: Sebelum Production

Sebelum push ke production:

- [ ] **HASH PASSWORDS** dengan bcrypt (jangan plaintext!)
- [ ] **Deploy firestore.rules** (security rules)
- [ ] **Remove/Deactivate test accounts**
- [ ] **Setup monitoring** untuk failed login attempts
- [ ] **Setup backup** untuk Firestore data

Lihat `WHITELIST_LOGIN_IMPLEMENTATION.md` untuk detail lengkap.

---

**Sudah siap? Mulai dengan Step 1 di atas! 🚀**
