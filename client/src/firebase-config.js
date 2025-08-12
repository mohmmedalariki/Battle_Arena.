
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCn1PWUTyQxTGS5ZkFS6I1Ax2Xtju6xTkQ",
  authDomain: "arena-b3a54.firebaseapp.com",
  projectId: "arena-b3a54",
  storageBucket: "arena-b3a54.firebasestorage.app",
  messagingSenderId: "193182609178",
  appId: "1:193182609178:web:c32558444fd3981d63c6a3",
  measurementId: "G-Z442C9XF1P"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app); 

export { auth, provider, signInWithPopup, db };
