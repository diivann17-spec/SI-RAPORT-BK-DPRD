/**
 * SETUP TEST ACCOUNTS - SI-RAPORT BK DPRD
 * 
 * Script guide untuk membuat test accounts di Firestore
 * Jalankan ini dari Firebase Console atau local script
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TEST ACCOUNTS DATA
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_ACCOUNTS = [
  // 1. ADMIN ACCOUNT - Full access, manage semua fitur
  {
    accountId: 'admin-001',
    username: 'admin',
    usernameNormalized: 'admin',
    fullName: 'Administrator Sekretariat DPRD',
    email: 'admin@dprd.local',
    role: 'SECRETARIAT_ADMIN',
    status: 'ACTIVE',
    memberId: null,
    department: 'Sekretariat',
    expiresAt: null,
    loginAttempts: 0,
    notes: 'Initial admin account untuk testing'
  },

  // 2. BK STAFF ACCOUNT - Manage members, attendance
  {
    accountId: 'bk-001',
    username: 'bk',
    usernameNormalized: 'bk',
    fullName: 'Petugas Badan Kehormatan',
    email: 'bk@dprd.local',
    role: 'PETUGAS_BK',
    status: 'ACTIVE',
    memberId: null,
    department: 'Badan Kehormatan',
    expiresAt: null,
    loginAttempts: 0,
    notes: 'BK staff account untuk testing'
  },

  // 3. SCAN OPERATOR ACCOUNT - Only can scan attendance
  {
    accountId: 'scan-001',
    username: 'scan',
    usernameNormalized: 'scan',
    fullName: 'Operator Presensi',
    email: 'scan@dprd.local',
    role: 'PETUGAS_SCAN',
    status: 'ACTIVE',
    memberId: null,
    department: 'Sekretariat',
    expiresAt: null,
    loginAttempts: 0,
    notes: 'Scan operator account untuk testing'
  },

  // 4. MEMBER ACCOUNTS - Regular members (bisa banyak untuk testing)
  {
    accountId: 'member-001',
    username: 'budi',
    usernameNormalized: 'budi',
    fullName: 'Budi Santoso',
    email: 'budi@dprd.local',
    role: 'ANGGOTA_DPRD',
    status: 'ACTIVE',
    memberId: 'member-budi-001',
    department: 'Komisi A',
    expiresAt: null,
    loginAttempts: 0,
    notes: 'Test member account'
  },

  {
    accountId: 'member-002',
    username: 'siti',
    usernameNormalized: 'siti',
    fullName: 'Siti Nurhaliza',
    email: 'siti@dprd.local',
    role: 'ANGGOTA_DPRD',
    status: 'ACTIVE',
    memberId: 'member-siti-001',
    department: 'Komisi B',
    expiresAt: null,
    loginAttempts: 0,
    notes: 'Test member account'
  },

  {
    accountId: 'member-003',
    username: 'ahmad',
    usernameNormalized: 'ahmad',
    fullName: 'Ahmad Wijaya',
    email: 'ahmad@dprd.local',
    role: 'ANGGOTA_DPRD',
    status: 'ACTIVE',
    memberId: 'member-ahmad-001',
    department: 'Komisi C',
    expiresAt: null,
    loginAttempts: 0,
    notes: 'Test member account'
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// CARA 1: Buat Accounts via Firebase Console (PALING GAMPANG)
// ═══════════════════════════════════════════════════════════════════════════════

/*
LANGKAH-LANGKAH:
1. Buka Firebase Console: https://console.firebase.google.com/
2. Pilih project: si-raport-bk-dprd
3. Navigate ke: Firestore Database > Collections > accounts
4. Klik "Add Document"
5. Isi form dengan data dari TEST_ACCOUNTS di atas. Jangan menambahkan password atau passwordHash ke Firestore; buat kredensial melalui Firebase Authentication.

CONTOH untuk akun ADMIN:
─────────────────────────
Document ID: admin-001

Fields:
├─ username (string): "admin"
├─ usernameNormalized (string): "admin"
├─ fullName (string): "Administrator Sekretariat DPRD"
├─ email (string): "admin@dprd.local"
├─ role (string): "SECRETARIAT_ADMIN"
├─ status (string): "ACTIVE"
├─ memberId (string): ""
├─ department (string): "Sekretariat"
├─ expiresAt (null): null
├─ createdBy (string): "system"
├─ createdAt (timestamp): [pilih tgl hari ini]
├─ updatedBy (string): "system"
├─ updatedAt (timestamp): [pilih tgl hari ini]
├─ lastLoginAt (null): null
├─ lastLoginStatus (string): "PENDING"
├─ loginAttempts (number): 0
└─ notes (string): "Initial admin account untuk testing"

CONTOH untuk akun MEMBER:
─────────────────────────
Document ID: member-001

Fields:
├─ username (string): "budi"
├─ usernameNormalized (string): "budi"
├─ fullName (string): "Budi Santoso"
├─ email (string): "budi@dprd.local"
├─ role (string): "ANGGOTA_DPRD"
├─ status (string): "ACTIVE"
├─ memberId (string): "member-budi-001"
├─ department (string): "Komisi A"
├─ expiresAt (null): null
├─ createdBy (string): "system"
├─ createdAt (timestamp): [pilih tgl hari ini]
├─ updatedBy (string): "system"
├─ updatedAt (timestamp): [pilih tgl hari ini]
├─ lastLoginAt (null): null
├─ lastLoginStatus (string): "PENDING"
├─ loginAttempts (number): 0
└─ notes (string): "Test member account"

Ulangi untuk setiap account di TEST_ACCOUNTS.
*/

// ═══════════════════════════════════════════════════════════════════════════════
// CARA 2: Buat Accounts via JavaScript (Node.js atau Browser Console)
// ═══════════════════════════════════════════════════════════════════════════════

/*
PERSIAPAN:
1. Install Firebase Admin SDK (jika local):
   npm install firebase-admin

2. Setup credentials file (jika local)

SCRIPT untuk Node.js:
──────────────────────
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./path/to/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createTestAccounts() {
  const batch = db.batch();
  
  for (const account of TEST_ACCOUNTS) {
    const docRef = db.collection('accounts').doc(account.accountId);
    batch.set(docRef, {
      ...account,
      createdBy: 'system',
      createdAt: admin.firestore.Timestamp.now(),
      updatedBy: 'system',
      updatedAt: admin.firestore.Timestamp.now(),
      lastLoginAt: null,
      lastLoginStatus: 'PENDING'
    });
  }
  
  await batch.commit();
  console.log('✅ Test accounts created successfully!');
}

createTestAccounts().catch(console.error);
*/

// ═══════════════════════════════════════════════════════════════════════════════
// CARA 3: Browser Console (dari aplikasi yang sudah running)
// ═══════════════════════════════════════════════════════════════════════════════

/*
1. Buka aplikasi di http://localhost:5173
2. Buka DevTools: F12 > Console
3. Paste code ini:

────────────────────────────────────────────────────────────────

import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase/config';

const TEST_ACCOUNTS = [
  {
    accountId: 'admin-001',
    username: 'admin',
    usernameNormalized: 'admin',
    fullName: 'Administrator Sekretariat DPRD',
    email: 'admin@dprd.local',
    role: 'SECRETARIAT_ADMIN',
    status: 'ACTIVE',
    memberId: null,
    department: 'Sekretariat',
    loginAttempts: 0,
    notes: 'Initial admin account'
  },
  {
    accountId: 'member-001',
    username: 'budi',
    usernameNormalized: 'budi',
    fullName: 'Budi Santoso',
    email: 'budi@dprd.local',
    role: 'ANGGOTA_DPRD',
    status: 'ACTIVE',
    memberId: 'member-budi-001',
    department: 'Komisi A',
    loginAttempts: 0,
    notes: 'Test member account'
  }
];

async function createTestAccounts() {
  try {
    for (const account of TEST_ACCOUNTS) {
      await setDoc(doc(db, 'accounts', account.accountId), {
        ...account,
        createdBy: 'system',
        createdAt: new Date(),
        updatedBy: 'system',
        updatedAt: new Date(),
        lastLoginAt: null
      });
    }
    console.log('✅ Test accounts created!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestAccounts();

────────────────────────────────────────────────────────────────
*/

// ═══════════════════════════════════════════════════════════════════════════════
// TEST CREDENTIALS SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

/*
CREDENTIALS UNTUK TESTING:
(Ganti password dengan yang sudah di-hash sebelum production!)

1. ADMIN
   Username: admin
   Password: admin123
   Role: SECRETARIAT_ADMIN
   Access: Full system access

2. BK STAFF
   Username: bk
   Password: bk123
   Role: PETUGAS_BK
   Access: Member management, attendance

3. SCAN OPERATOR
   Username: scan
   Password: scan123
   Role: PETUGAS_SCAN
   Access: Only attendance scanning

4. MEMBERS (bisa banyak)
   Username: budi     | siti     | ahmad
   Password: budi123  | siti123  | ahmad123
   Role: ANGGOTA_DPRD (semua)
   Access: View own attendance, profile

TESTING SCENARIOS:
──────────────────
✅ Test login dengan admin
   → Bisa akses Account Management, Dashboard, semua fitur

✅ Test login dengan bk
   → Bisa manage members, tapi tidak bisa manage accounts

✅ Test login dengan scan operator
   → Hanya bisa scan attendance

✅ Test login dengan member
   → Hanya bisa lihat own data dan attendance

✅ Test member creation
   → Login sebagai admin
   → Buat akun member baru di Account Management panel
   → Verify akun baru bisa login
*/

// ═══════════════════════════════════════════════════════════════════════════════
// NEXT STEPS
// ═══════════════════════════════════════════════════════════════════════════════

/*
1. BUAT ACCOUNTS
   ├─ Gunakan Firebase Console (paling gampang untuk testing)
   ├─ Copy data dari TEST_ACCOUNTS di atas
   └─ Create documents di /accounts collection

2. LOGIN & TEST
   ├─ Buka aplikasi: http://localhost:5173
   ├─ Login sebagai admin/admin123
   └─ Verify berhasil login

3. TEST MEMBER LOGIN
   ├─ Logout
   ├─ Login sebagai budi/budi123
   └─ Verify member access (read-only)

4. TEST ACCOUNT MANAGEMENT
   ├─ Logout & login sebagai admin
   ├─ Buka Admin Dashboard > Account Management
   ├─ Test create new account
   ├─ Test edit account
   ├─ Test reset password
   ├─ Test deactivate account
   └─ Verify audit trails

5. TEST ROLE-BASED ACCESS
   ├─ Login sebagai different roles
   ├─ Verify hanya akses fitur sesuai role
   ├─ Check error messages jika access denied
   └─ Verify Session timeout (30 menit)

6. SECURITY TESTING
   ├─ Test wrong password → Generic error message
   ├─ Test non-existent username → Generic error message
   ├─ Test INACTIVE account → Cannot login
   ├─ Test SUSPENDED account → Cannot login
   ├─ Test exceeded login attempts → Account locked
   └─ Verify localStorage cleared on logout

7. PRODUCTION PREP
   ├─ ⚠️ HASH passwords dengan bcrypt SEBELUM go live!
   ├─ Setup Cloud Functions untuk custom tokens
   ├─ Deploy Firestore Security Rules
   ├─ Create production admin account
   ├─ Remove test accounts atau change status ke INACTIVE
   └─ Setup monitoring & alerts
*/

export { TEST_ACCOUNTS };
