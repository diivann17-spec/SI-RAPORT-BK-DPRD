import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
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

// Data UID yang sudah berhasil dibuat di Firebase Auth
const ACCOUNTS_TO_WRITE = [
  {
    uid: 'gDMumsGWTGUCbehlq6gu24dCfuz1',
    username: 'ahmad.fauzi',
    fullName: 'H. AHMAD FAUZI, S.E.',
    email: 'ahmad.fauzi@dprd.go.id',
    memberId: 'DPRD-001',
    department: 'Fraksi Partai Golkar'
  },
  {
    uid: 'k4C5FoLZ8gg2ZZs0Bd7GGRMHdgm1',
    username: 'siti.rahmawati',
    fullName: 'Hj. SITI RAHMAWATI, S.Pd.',
    email: 'siti.rahmawati@dprd.go.id',
    memberId: 'DPRD-002',
    department: 'Fraksi PDI Perjuangan'
  },
  {
    uid: 'QKFL70NzsHSifUucN2qmhDmkQGl1',
    username: 'budi.santoso',
    fullName: 'Dr. H. BUDI SANTOSO, M.Si.',
    email: 'budi.santoso@dprd.go.id',
    memberId: 'DPRD-003',
    department: 'Fraksi Partai Gerindra'
  },
  {
    uid: '7S3ESbWOBhaPUAP56jb1c6BtdTs2',
    username: 'irwan.setiawan',
    fullName: 'IRWAN SETIAWAN, S.T.',
    email: 'irwan.setiawan@dprd.go.id',
    memberId: 'DPRD-004',
    department: 'Fraksi PKB'
  },
  {
    uid: '1iICWrnE6wbsktGOZB7BBk2c6Di1',
    username: 'nurul.hidayah',
    fullName: 'Hj. NURUL HIDAYAH, S.Ag.',
    email: 'nurul.hidayah@dprd.go.id',
    memberId: 'DPRD-005',
    department: 'Fraksi PKS'
  },
  {
    uid: '1vZogrzQyiPL0bmpdrm0cT6j5Vx1',
    username: 'vandi',
    fullName: 'VANDI KURNIAWAN, S.H.',
    email: 'vandi@dprd.go.id',
    memberId: 'DPRD-006',
    department: 'Fraksi Partai Demokrat'
  }
];

async function run() {
  console.log('🔑 Login sebagai admin...');
  const cred = await signInWithEmailAndPassword(auth, 'admin@auth.si-raport.local', 'admin123');
  const adminUid = cred.user.uid;
  console.log('✅ Admin login sukses, UID:', adminUid);

  for (const acc of ACCOUNTS_TO_WRITE) {
    try {
      const docData = {
        uid: acc.uid,
        username: acc.username,
        usernameNormalized: acc.username.toLowerCase(),
        memberIdNormalized: acc.memberId.toLowerCase(),
        fullName: acc.fullName,
        email: acc.email,
        role: 'ANGGOTA_DPRD',
        status: 'ACTIVE',
        department: acc.department,
        memberId: acc.memberId,
        createdBy: adminUid,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'accounts', acc.uid), docData);
      console.log(`✅ Berhasil menulis /accounts/${acc.uid} (${acc.username})`);
    } catch (err) {
      console.error(`❌ Gagal ${acc.username}:`, err.message);
    }
  }

  console.log('\n🎉 Selesai menulis semua akun anggota ke Firestore!');
  process.exit(0);
}

run().catch(console.error);
