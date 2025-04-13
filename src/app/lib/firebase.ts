import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// isi konfigurasi sesuai dengan konfigurasi firebase kalian
const firebaseConfig = {
    apiKey: "AIzaSyC63-Va6p9KKCKuD1NMZ4cg10PkgdnbvLo",
    authDomain: "todooliste.firebaseapp.com",
    projectId: "todooliste",
    storageBucket: "todooliste.firebasestorage.app",
    messagingSenderId: "670104897780",
    appId: "1:670104897780:web:f720fa6b9b6329aac136a1",
    measurementId: "G-2YPGETL7L3"
  };

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
