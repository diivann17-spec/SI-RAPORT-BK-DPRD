/**
 * Script Otomatis Setup Akun Firebase SI-RAPORT BK DPRD
 * Menghubungkan Firebase Authentication dengan Firestore Database (/accounts/{uid})
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCxsifO-JQl7bVj1cBle-WEh789FmY6UHs",
  authDomain: "si-raport-bk-dprd.firebaseapp.com",
  projectId: "si-raport-bk-dprd",
  storageBucket: "si-raport-bk-dprd.firebasestorage.app",
  messagingSenderId: "91180757282",
  appId: "1:91180757282:web:b285a04922f0f92e2af57b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ACCOUNTS_TO_SETUP = [
  {
    username: 'admin',
    password: 'admin123',
    emailAuth: 'admin@auth.si-raport.local',
    fullName: 'Administrator Sekretariat DPRD',
    email: 'admin@dprd.go.id',
    role: 'SECRETARIAT_ADMIN',
    department: 'Sekretariat',
    memberId: null
  },
  {
    username: 'bk',
    password: 'bk123',
    emailAuth: 'bk@auth.si-raport.local',
    fullName: 'Petugas Badan Kehormatan',
    email: 'bk@dprd.go.id',
    role: 'PETUGAS_BK',
    department: 'Badan Kehormatan',
    memberId: null
  },
  {
    username: 'scan',
    password: 'scan123',
    emailAuth: 'scan@auth.si-raport.local',
    fullName: 'Petugas Operator Scan Presensi',
    email: 'scan@dprd.go.id',
    role: 'PETUGAS_SCAN',
    department: 'Sekretariat',
    memberId: null
  },
  {
    username: 'DPRD001',
    password: 'anggota123',
    emailAuth: 'dprd001@auth.si-raport.local',
    fullName: 'AAN SETYAWAN, S.Si.',
    email: 'aan@dprd.go.id',
    role: 'ANGGOTA_DPRD',
    department: 'Fraksi',
    memberId: 'DPRD001'
  }
];

async function setup() {
  console.log('🚀 Memulai inisialisasi akun ke Firebase...\n');

  for (const acc of ACCOUNTS_TO_SETUP) {
    let userCredential = null;
    let uid = null;

    try {
      // 1. Coba daftarkan user baru di Firebase Auth
      userCredential = await createUserWithEmailAndPassword(auth, acc.emailAuth, acc.password);
      uid = userCredential.user.uid;
      console.log(`[AUTH] Berhasil membuat user Auth baru: ${acc.username} (UID: ${uid})`);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        // Jika sudah ada di Auth, login untuk mengambil UID-nya
        try {
          userCredential = await signInWithEmailAndPassword(auth, acc.emailAuth, acc.password);
          uid = userCredential.user.uid;
          console.log(`[AUTH] User Auth sudah ada, UID ditemukan: ${acc.username} (UID: ${uid})`);
        } catch (loginErr) {
          console.error(`[ERROR] Gagal login untuk ${acc.username}:`, loginErr.message);
          continue;
        }
      } else {
        console.error(`[ERROR] Gagal mendaftarkan Auth untuk ${acc.username}:`, err.message);
        continue;
      }
    }

    // 2. Simpan dokumen akun ke Firestore (/accounts/{uid})
    try {
      const accountDocRef = doc(db, 'accounts', uid);
      await setDoc(accountDocRef, {
        uid: uid,
        username: acc.username,
        usernameNormalized: acc.username.toLowerCase(),
        memberIdNormalized: acc.memberId ? acc.memberId.toLowerCase() : null,
        fullName: acc.fullName,
        email: acc.email,
        role: acc.role,
        status: 'ACTIVE',
        department: acc.department,
        memberId: acc.memberId,
        createdBy: 'SYSTEM_INIT',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log(`[FIRESTORE] Berhasil sync dokumen whitelist: /accounts/${uid}\n`);
    } catch (firestoreErr) {
      console.error(`[ERROR] Gagal simpan ke Firestore untuk ${acc.username}:`, firestoreErr.message);
    }
  }

  console.log('✅ SELESAI! Semua akun siap digunakan untuk login.');
  process.exit(0);
}

setup().catch(console.error);
