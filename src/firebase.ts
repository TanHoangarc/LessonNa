import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBP7y-tjIoBMObschJsx0mNPzZOEHaP03o",
  authDomain: "lesson-na.firebaseapp.com",
  projectId: "lesson-na",
  storageBucket: "lesson-na.firebasestorage.app",
  messagingSenderId: "792372293350",
  appId: "1:792372293350:web:5ba81bdabe7ae6f140d527",
  measurementId: "G-WHD610BGR9"
};

// Khởi tạo Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
