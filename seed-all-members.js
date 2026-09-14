/**
 * Script Seeder Anggota DPRD & Akun Login Otomatis
 * Login sebagai Admin lalu membuat Anggota DPRD dan Akun ke Firebase Auth + Firestore
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
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

// Secondary app untuk provisioning auth user tanpa logout admin
const provApp = initializeApp(firebaseConfig, 'prov-app-members');
const provAuth = getAuth(provApp);

const MEMBERS_DATA = [
  {
    id: 'DPRD-001',
    name: 'H. AHMAD FAUZI, S.E.',
    nip: '197505122000031001',
    fraksi: 'Fraksi Partai Golkar',
    komisi: 'Komisi A (Pemerintahan)',
    jabatan: 'Ketua Komisi A',
    phone: '081234567891',
    email: 'ahmad.fauzi@dprd.go.id',
    username: 'ahmad.fauzi',
    password: 'anggota123'
  },
  {
    id: 'DPRD-002',
    name: 'Hj. SITI RAHMAWATI, S.Pd.',
    nip: '198008172005012003',
    fraksi: 'Fraksi PDI Perjuangan',
    komisi: 'Komisi B (Perekonomian & Keuangan)',
    jabatan: 'Wakil Ketua Komisi B',
    phone: '081234567892',
    email: 'siti.rahmawati@dprd.go.id',
    username: 'siti.rahmawati',
    password: 'anggota123'
  },
  {
    id: 'DPRD-003',
    name: 'Dr. H. BUDI SANTOSO, M.Si.',
    nip: '197203151998031005',
    fraksi: 'Fraksi Partai Gerindra',
    komisi: 'Komisi C (Pembangunan & Infrastruktur)',
    jabatan: 'Sekretaris Komisi C',
    phone: '081234567893',
    email: 'budi.santoso@dprd.go.id',
    username: 'budi.santoso',
    password: 'anggota123'
  },
  {
    id: 'DPRD-004',
    name: 'IRWAN SETIAWAN, S.T.',
    nip: '198511202010011004',
    fraksi: 'Fraksi PKB',
    komisi: 'Komisi D (Kesejahteraan Rakyat)',
    jabatan: 'Anggota Komisi D',
    phone: '081234567894',
    email: 'irwan.setiawan@dprd.go.id',
    username: 'irwan.setiawan',
    password: 'anggota123'
  },
  {
    id: 'DPRD-005',
    name: 'Hj. NURUL HIDAYAH, S.Ag.',
    nip: '198207042008012006',
    fraksi: 'Fraksi PKS',
    komisi: 'Komisi A (Pemerintahan)',
    jabatan: 'Anggota Komisi A',
    phone: '081234567895',
    email: 'nurul.hidayah@dprd.go.id',
    username: 'nurul.hidayah',
    password: 'anggota123'
  },
  {
    id: 'DPRD-006',
    name: 'VANDI KURNIAWAN, S.H.',
    nip: '198809142012011002',
    fraksi: 'Fraksi Partai Demokrat',
    komisi: 'Komisi C (Pembangunan & Infrastruktur)',
    jabatan: 'Anggota Komisi C',
    phone: '081234567896',
    email: 'vandi@dprd.go.id',
    username: 'vandi',
    password: 'anggota123'
  }
];

async function seed() {
  console.log('🚀 Memulai Seeding Anggota DPRD & Akun Login...');

  // 1. Login sebagai admin
  let adminUid = 'b6JAMYpGKJQumrrlqxEfff6xBiG2';
  try {
    const adminCred = await signInWithEmailAndPassword(auth, 'admin@auth.si-raport.local', 'admin123');
    adminUid = adminCred.user.uid;
    console.log(`[AUTH] Admin login berhasil (UID: ${adminUid})`);
  } catch (err) {
    console.warn('[AUTH] Login admin client:', err.message);
  }

  for (const m of MEMBERS_DATA) {
    console.log(`\n📌 Memproses Anggota: ${m.name} (${m.id})`);

    // A. Simpan Master Anggota ke /members/{id}
    const memberDoc = {
      id: m.id,
      name: m.name,
      nip: m.nip,
      fraksi: m.fraksi,
      komisi: m.komisi,
      jabatan: m.jabatan,
      phone: m.phone,
      email: m.email,
      photo: '',
      qrToken: `QR-${m.id}-${m.name.replace(/[^A-Z0-9]/gi, '-').toUpperCase()}`,
      statusActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'members', m.id), memberDoc, { merge: true });
      console.log(`  ✅ Data Master Anggota tersimpan di /members/${m.id}`);
    } catch (err) {
      console.error(`  ❌ Gagal simpan /members/${m.id}:`, err.message);
    }

    // B. Buat / Ambil User di Firebase Auth
    const authEmail = `${m.username.toLowerCase().replace(/[^a-z0-9._-]/g, '')}@auth.si-raport.local`;
    let userUid = null;

    try {
      const userCred = await createUserWithEmailAndPassword(provAuth, authEmail, m.password);
      userUid = userCred.user.uid;
      console.log(`  ✅ Firebase Auth user dibuat: ${authEmail} (UID: ${userUid})`);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        try {
          const loginCred = await signInWithEmailAndPassword(provAuth, authEmail, m.password);
          userUid = loginCred.user.uid;
          console.log(`  ℹ️ Firebase Auth user sudah ada: ${authEmail} (UID: ${userUid})`);
        } catch (loginErr) {
          console.error(`  ❌ Gagal verifikasi Auth user ${authEmail}:`, loginErr.message);
        }
      } else {
        console.error(`  ❌ Gagal buat Auth user ${authEmail}:`, err.message);
      }
    }

    // C. Simpan Dokumen Akun Whitelist ke /accounts/{userUid}
    if (userUid) {
      const accountDoc = {
        uid: userUid,
        username: m.username,
        usernameNormalized: m.username.toLowerCase(),
        memberIdNormalized: m.id.toLowerCase(),
        fullName: m.name,
        email: m.email,
        role: 'ANGGOTA_DPRD',
        status: 'ACTIVE',
        department: m.fraksi,
        memberId: m.id,
        createdBy: adminUid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'accounts', userUid), accountDoc, { merge: true });
        console.log(`  ✅ Dokumen Whitelist tersimpan di /accounts/${userUid}`);
      } catch (err) {
        console.error(`  ❌ Gagal simpan /accounts/${userUid}:`, err.message);
      }
    }
  }

  console.log('\n=============================================');
  console.log('🎉 SEEDING SELESAI! Semua Anggota Siap Login:');
  console.log('=============================================');
  MEMBERS_DATA.forEach(m => {
    console.log(`• ${m.name}`);
    console.log(`  Username : ${m.username}`);
    console.log(`  Password : ${m.password}`);
    console.log(`  ID Dewan : ${m.id}\n`);
  });

  process.exit(0);
}

seed().catch(console.error);
