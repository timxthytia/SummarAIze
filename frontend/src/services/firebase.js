import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyANY0rLtbMBGT9xgOgU0kl9n5dsXtwRXSA",
  authDomain: "summaraize-c3fb6.firebaseapp.com",
  projectId: "summaraize-c3fb6",
  storageBucket: "summaraize-c3fb6.firebasestorage.app",
  messagingSenderId: "742870183372",
  appId: "1:742870183372:web:b204ff0afceb0d21f00169",
  measurementId: "G-8Q5DTETBWH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, provider, db, signInWithPopup, signOut, doc, getDoc, setDoc };

