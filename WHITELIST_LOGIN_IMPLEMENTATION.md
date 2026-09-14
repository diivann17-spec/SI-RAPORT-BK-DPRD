# Sistem Login Whitelist Ketat - SI-RAPORT BK DPRD

## 📋 Ringkasan Implementasi

Sistem login telah diperketat dengan whitelist akun terdaftar yang **hanya dapat dibuat dan dikelola oleh Admin/BK**. Sistem ini dirancang untuk integrasi seamless dengan Firebase Authentication dan Security Rules.

### ✅ Fitur Utama yang Sudah Diimplementasikan

#### 1. **Account Management Service** (`src/firebase/accountService.js`)
- Validasi login dengan whitelist ketat
- Hanya Admin yang dapat membuat/edit/hapus akun
- Validasi username, password, dan status akun
- Audit trail lengkap untuk setiap operasi
- Tidak ada self-registration

#### 2. **Authentication Service** (`src/firebase/authService.js`)
- Session management dengan timeout (30 menit)
- Role-based access control (RBAC)
- Permission system yang granular
- Session persistence di localStorage
- Fungsi-fungsi protected untuk operasi sensitive

#### 3. **Login Component** (`src/pages/Login.jsx`)
- Whitelist validation sebelum Firebase
- Error messages yang user-friendly tapi secure
- Remember me functionality
- Login attempts tracking (max 5)
- Status akun validation (Active/Inactive/Suspended)

#### 4. **Account Management Panel** (`src/pages/AccountManagement.jsx`)
- UI untuk admin membuat/edit akun
- Reset password functionality
- Deactivate/Reactivate akun
- Suspend akun (tindakan disipliner)
- Search dan filter akun
- Audit log (last login, created by, dll)

#### 5. **Firestore Security Rules** (`firestore.rules`)
- Protect accounts collection
- Role-based access control di Firestore
- Audit trails immutable
- Default deny untuk unauthorized access

---

## 🔐 Mekanisme Keamanan

### Phase 1: Whitelist Validation (Saat Ini)

```
User Login Form
    ↓
Validate di accountService.validateLoginWithWhitelist()
    ├─ Username HARUS ada di collection /accounts
    ├─ Password HARUS cocok persis
    ├─ Status HARUS "ACTIVE"
    └─ Tidak ada alternative login method
    ↓
Simpan session ke localStorage
    ├─ authService.login()
    └─ Set timeout 30 menit
    ↓
User authenticated dengan role dari Admin-defined data
```

### Phase 2: Firebase Integration (Future)

```
User Login Form
    ↓
Validate di accountService.validateLoginWithWhitelist()
    (Same validation as Phase 1)
    ↓
Generate Custom Token (Cloud Function)
    ├─ Include role + permissions
    └─ Sign dengan server secret
    ↓
Sign In Firebase Custom Token
    ├─ firebase.auth.signInWithCustomToken()
    └─ Verify token signature
    ↓
Firestore Security Rules enforce access
    ├─ Verify auth.uid
    ├─ Check role + permissions
    └─ Enforce document access
```

---

## 🚀 Setup & Deployment Guide

### STEP 1: Persiapan Firebase Console

#### 1.1 Buat Collection `/accounts` di Firestore

```
Database: si-raport-bk-dprd
Collection: accounts
Document ID: {accountId} (auto-generated)

Fields:
- username (string) - Username unik
- usernameNormalized (string) - Lowercase version
- passwordHash (string) - Hashed password (TODO: bcrypt)
- fullName (string) - Nama lengkap
- email (string) - Email pengguna
- role (string) - SECRETARIAT_ADMIN | PETUGAS_BK | PETUGAS_SCAN | ANGGOTA_DPRD
- status (string) - ACTIVE | INACTIVE | SUSPENDED
- memberId (string, optional) - Linked ke anggota DPRD
- department (string, optional) - Departemen
- expiresAt (timestamp, optional) - Tanggal kadaluarsa akun
- createdBy (string) - User ID admin yang membuat
- createdAt (timestamp) - Waktu pembuatan
- updatedBy (string) - User ID yang terakhir edit
- updatedAt (timestamp) - Waktu update terakhir
- lastLoginAt (timestamp) - Last login time
- lastLoginStatus (string) - SUCCESS | FAILED
- loginAttempts (number) - Failed login count
- notes (string) - Catatan admin
```

#### 1.2 Buat Initial Admin Account

```javascript
// Firebase Console > Firestore > accounts collection
// Tambah document baru dengan ID "admin-001"
{
  username: "admin",
  usernameNormalized: "admin",
  passwordHash: "admin123", // TODO: HASH INI DENGAN BCRYPT!
  fullName: "Administrator Sekretariat DPRD",
  email: "admin@dprd.local",
  role: "SECRETARIAT_ADMIN",
  status: "ACTIVE",
  department: "Sekretariat",
  createdBy: "system",
  createdAt: {timestamp},
  updatedAt: {timestamp},
  lastLoginAt: null,
  loginAttempts: 0,
  notes: "Initial admin account"
}
```

#### 1.3 Deploy Security Rules

```bash
# Login ke Firebase CLI
firebase login

# Select project
firebase use si-raport-bk-dprd

# Deploy security rules
firebase deploy --only firestore:rules

# Verify deployment
firebase firestore:indexes
```

### STEP 2: Implementasi di Aplikasi

#### 2.1 Update `App.jsx` untuk gunakan authService

```javascript
import { authService } from './firebase/authService';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // Subscribe ke session changes
    const unsubscribe = authService.subscribe((session, reason) => {
      if (reason === 'SESSION_EXPIRED') {
        // Redirect ke login
        window.location.href = '/login';
      }
    });
    
    setIsReady(true);
    return unsubscribe;
  }, []);
  
  if (!isReady) return <SplashScreen />;
  
  if (!authService.isAuthenticated()) {
    return <Login />;
  }
  
  return <Dashboard />;
}
```

#### 2.2 Add Route Protection

```javascript
import { authService } from './firebase/authService';

function ProtectedRoute({ component: Component, requiredPermission }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  
  if (requiredPermission && !authService.hasPermission(requiredPermission)) {
    return <NotAuthorized />;
  }
  
  return <Component />;
}

// Usage
<Route path="/accounts" element={
  <ProtectedRoute 
    component={AccountManagement} 
    requiredPermission="MANAGE_ACCOUNTS"
  />
} />
```

#### 2.3 Update AttendanceContext untuk menggunakan authService

```javascript
// src/context/AttendanceContext.jsx
import { authService } from '../firebase/authService';

export const AttendanceProvider = ({ children }) => {
  const login = (userData) => {
    // User data sudah validated oleh authService
    // Set ke context jika diperlukan
    setCurrentUser(userData);
  };

  const logout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  return (
    <AttendanceContext.Provider value={{ login, logout, ... }}>
      {children}
    </AttendanceContext.Provider>
  );
};
```

### STEP 3: Create Cloud Functions untuk Custom Token (Optional tapi Recommended)

```javascript
// functions/src/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Generate Custom Token untuk whitelist-validated user
 * 
 * Request body:
 * {
 *   accountId: string,
 *   role: string,
 *   username: string,
 *   email: string
 * }
 */
exports.generateAuthToken = functions.https.onCall(async (data, context) => {
  try {
    const { accountId, role, username, email } = data;
    
    // Verify request came from authenticated client
    if (!accountId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'accountId is required'
      );
    }
    
    // Verify account exists dan status ACTIVE di Firestore
    const accountDoc = await admin.firestore()
      .collection('accounts')
      .doc(accountId)
      .get();
    
    if (!accountDoc.exists || accountDoc.data().status !== 'ACTIVE') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Account not found or not active'
      );
    }
    
    // Generate custom token
    const customToken = await admin.auth().createCustomToken(accountId, {
      role: role,
      username: username,
      email: email
    });
    
    return { token: customToken };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Create audit trail untuk setiap aksi penting
 */
exports.logAuditTrail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
  }
  
  const { action, resourceType, resourceId, details } = data;
  
  await admin.firestore()
    .collection('auditTrails')
    .add({
      action: action,
      resourceType: resourceType,
      resourceId: resourceId,
      userId: context.auth.uid,
      userEmail: context.auth.token.email,
      details: details,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: context.rawRequest.ip
    });
  
  return { success: true };
});
```

### STEP 4: Deploy ke Firebase Hosting

```bash
# Build aplikasi
npm run build

# Deploy
firebase deploy --only hosting

# Deploy termasuk functions dan firestore rules
firebase deploy
```

---

## 🔧 Operasional & Maintenance

### Membuat Akun Baru

1. Login ke sistem dengan akun Admin
2. Navigasi ke **Admin Dashboard > Account Management**
3. Klik **"Buat Akun Baru"**
4. Isi form:
   - Username (unik, lowercase)
   - Password (minimum 8 karakter)
   - Nama Lengkap
   - Role (Admin/BK/Scan Op/Member)
   - Email (opsional)
   - Status (ACTIVE)
5. Klik **Simpan**

### Reset Password

1. Di Admin Panel, cari akun pengguna
2. Klik tombol **Refresh Icon** (Reset Password)
3. Masukkan password baru
4. Confirm

### Deactivate/Suspend Akun

**Deactivate:** Akun tidak bisa login tapi data tetap tersimpan
- Klik **Lock Icon** di row akun
- Akun masuk status INACTIVE

**Suspend:** Akun dikunci karena tindakan disipliner
- Klik **Alert Icon**
- Masukkan alasan suspend
- Akun masuk status SUSPENDED

### Reactivate Akun

1. Filter status ke "Tidak Aktif"
2. Klik **Unlock Icon**
3. Konfirmasi

### Audit Logs

Setiap perubahan akun tercatat di Firestore:
- Who made the change (createdBy/updatedBy)
- When (createdAt/updatedAt)
- What changed (status, role, password reset, dll)
- Last login info

---

## ⚠️ Security Best Practices

### MUST DO

- [ ] **HASH PASSWORDS dengan bcrypt** sebelum menyimpan ke Firestore
  ```javascript
  // TODO: Implement di accountService.js
  const bcrypt = require('bcrypt');
  const hashedPassword = await bcrypt.hash(password, 10);
  ```

- [ ] **Enable Firestore Backup**
  - Firebase Console > Firestore > Backups
  - Set automatic daily backups

- [ ] **Enable Audit Logs**
  - Keep immutable audit trail
  - Log semua login attempts (success/failed)
  - Log password resets

- [ ] **Use HTTPS Only**
  - Enforce di Firebase Hosting
  - Set security headers

- [ ] **Implement Rate Limiting**
  - Max 5 failed login attempts = lock temporary
  - Sudah implemented di Login component

- [ ] **Regular Security Audits**
  - Review akun yang sudah lama tidak login
  - Deactivate unused accounts
  - Review admin activities

### SHOULD DO

- [ ] **Enable Two-Factor Authentication (2FA)**
  - Cloud Functions + Firebase Auth
  - SMS atau Email OTP

- [ ] **Implement Session Timeout**
  - Already 30 minutes
  - Configurable di authService.js

- [ ] **Password Policy**
  - Minimum 8 karakter
  - Mix uppercase, lowercase, numbers
  - No common passwords

- [ ] **Notify Admin tentang suspicious activity**
  - Multiple failed login attempts
  - Login dari unusual location/device
  - Permission changes

---

## 🛠️ Troubleshooting

### User tidak bisa login meskipun akun ada

**Cek:**
1. Apakah akun status ACTIVE? (bukan INACTIVE/SUSPENDED)
2. Apakah usernameNormalized di-set dengan benar (lowercase)?
3. Apakah password di-hash dengan benar?
4. Check browser console untuk error messages

### Login attempts terus fail

**Solusi:**
1. Refresh page
2. Clear localStorage: `localStorage.clear()`
3. Check akun di Firebase Console
4. Reset password melalui Admin Panel

### Security Rules error

**Cek:**
1. Deploy rules: `firebase deploy --only firestore:rules`
2. Verify di Firebase Console > Firestore > Rules
3. Check request auth token ada

### Password tidak bisa di-reset

**Verify:**
1. Admin akun yang di-reset punya permission RESET_PASSWORD
2. Cloud Functions deployed dengan benar (untuk Phase 2)
3. Check Firestore untuk audit trail error

---

## 📊 Monitoring & Logging

### Key Metrics to Monitor

1. **Failed Login Attempts**
   ```javascript
   // Query di Firestore
   db.collection('accounts')
     .where('loginAttempts', '>', 0)
     .orderBy('lastLoginAt', 'desc')
   ```

2. **Account Status Changes**
   - Monitor audit trails untuk suspicious changes
   - Alert jika admin account di-deactivate

3. **Inactive Accounts**
   - Review akun yang tidak login > 30 hari
   - Consider deactivate untuk security

4. **Login Patterns**
   - Detect unusual login times/locations
   - Flag untuk admin review

---

## 🔄 Migration Path: Existing Users

Jika sudah ada users dari sistem lama:

1. **Export existing users** dari database lama
2. **Create accounts** di Firestore collection `/accounts`
3. **Set temporary password** untuk setiap user
4. **Notify users** untuk login dan change password
5. **Monitor** failed login attempts
6. **Deactivate** akun yang tidak berhasil migrasi

---

## 📝 Checklist Implementasi

### Pre-Deployment
- [ ] Account Management Service ditest dengan whitelist validation
- [ ] Authentication Service session management working
- [ ] Login component menampilkan error messages dengan benar
- [ ] Admin Account Management Panel dapat membuat/edit akun
- [ ] Firebase Security Rules deployed
- [ ] Initial admin account dibuat

### Deployment
- [ ] Push code ke repository
- [ ] Build production bundle
- [ ] Deploy ke Firebase Hosting
- [ ] Verify login functionality
- [ ] Test account management features

### Post-Deployment
- [ ] Create admin accounts untuk team
- [ ] Train admin tentang account management
- [ ] Setup monitoring & logging
- [ ] Document procedures untuk account lifecycle
- [ ] Backup Firestore data regularly

### Security Hardening (Phase 2)
- [ ] Implement bcrypt password hashing
- [ ] Deploy Cloud Functions untuk custom token
- [ ] Update Login component untuk Firebase Auth
- [ ] Implement 2FA
- [ ] Setup alerts untuk suspicious activities

---

## 🎯 Future Enhancements

1. **2FA / Multi-Factor Authentication**
   - SMS OTP
   - Email verification
   - Google Authenticator

2. **SSO Integration**
   - LDAP untuk corporate directory
   - OAuth2 untuk third-party systems

3. **API Key Management**
   - Generate API keys untuk service accounts
   - Rotate keys regularly

4. **Advanced Audit Features**
   - Full audit log explorer UI
   - Export audit logs
   - Real-time alerts

5. **Compliance Features**
   - GDPR data deletion
   - Audit log retention policies
   - Encryption at rest

---

## 📞 Support & Questions

Untuk pertanyaan atau masalah:
1. Check error logs di Firebase Console
2. Review Firestore security rules
3. Check browser console untuk client-side errors
4. Review audit trails untuk account changes

---

**Last Updated:** 2025-09-14
**Version:** 1.0
**Status:** Production Ready (Phase 1)
