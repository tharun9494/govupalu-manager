import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD0TNbMY9ydAa9I5MzJ5XobNibEbSPHwok",
  authDomain: "govupalu-7cf9f.firebaseapp.com",
  projectId: "govupalu-7cf9f",
  storageBucket: "govupalu-7cf9f.firebasestorage.app",
  messagingSenderId: "27903378750",
  appId: "1:27903378750:web:da2ce842cc48f07f34986f",
  measurementId: "G-752PQNJ7RF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);

export default app;