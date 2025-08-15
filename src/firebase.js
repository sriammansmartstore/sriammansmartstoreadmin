// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// TODO: Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyDTzovF1RChmczvRXTNtY9-i-cOTI2JAuQ",
  authDomain: "sri-amman-smart-store.firebaseapp.com",
  projectId: "sri-amman-smart-store",
  storageBucket: "sri-amman-smart-store.firebasestorage.app",
  messagingSenderId: "1018585256480",
  appId: "1:1018585256480:web:1312d2d636b0672098a245",
  measurementId: "G-7D1TG59XVM"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
