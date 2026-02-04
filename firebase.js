import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDu7La9wCafURGxc_OaTII6UpZ_Ibht7iM",
  authDomain: "our-little-universe-6eeef.firebaseapp.com",
  projectId: "our-little-universe-6eeef",
  storageBucket: "our-little-universe-6eeef.firebasestorage.app",
  messagingSenderId: "1038589404930",
  appId: "1:1038589404930:web:be694f21fb1eaf951f441b"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
