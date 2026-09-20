import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCxsifO-JQl7bVj1cBle-WEh789FmY6UHs",
  authDomain: "si-raport-bk-dprd.firebaseapp.com",
  projectId: "si-raport-bk-dprd",
  storageBucket: "si-raport-bk-dprd.firebasestorage.app",
  messagingSenderId: "91180757282",
  appId: "1:91180757282:web:b285a04922f0f92e2af57b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  console.log('🔑 Authenticating as admin...');
  try {
    const auth = getAuth(app);
    await signInWithEmailAndPassword(auth, 'admin@auth.si-raport.local', 'admin123');
    console.log('✅ Admin authenticated!');
  } catch (authErr) {
    console.warn('⚠️ Admin auth failed:', authErr.message);
  }

  console.log('🔍 Memeriksa daftar akun di Firestore...');
  try {
    const snap = await getDocs(collection(db, 'accounts'));
    if (snap.empty) {
      console.log('Koleksi accounts kosong!');
    } else {
      console.log(`Ditemukan ${snap.docs.length} dokumen akun di Firestore:`);
      snap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`- ID: ${doc.id}`);
        console.log(`  Username: ${data.username}`);
        console.log(`  Role: ${data.role}`);
        console.log(`  Status: ${data.status}`);
        console.log(`  Email: ${data.email}`);
        console.log(`  MemberId: ${data.memberId || '-'}`);
        console.log('-----------------------------------');
      });
    }
  } catch (err) {
    console.error('Error membaca Firestore accounts:', err.message);
  }
  process.exit(0);
}

check();
