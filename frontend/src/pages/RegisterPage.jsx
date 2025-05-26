import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  auth,
  provider,
  signInWithPopup,
  db,
  doc,
  setDoc, 
  getDoc
} from '../services/firebase';

import GoogleLogo from "../assets/GoogleLogo.png"
import "../styles/RegisterPage.css";

const RegisterPage = () => {
  const navigate = useNavigate();

  const registerWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const existingDoc = await getDoc(userRef);

      // if account already exists
      if (existingDoc.exists()) {
        alert("Account already exists. Please log in instead.");
        await auth.signOut();
        return;
      }

      // if account NOT exist: add user-info to firestore db
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        createdAt: new Date().toISOString(),
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Registration error", error);
      alert("Failed to register. Please try again.");
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h1 className="register-title">SummarAIze</h1>
        <p className="register-subtitle">Welcome! Register here.</p>
        <button className="google-signin-btn" onClick={registerWithGoogle}>
            <img src={GoogleLogo} alt="Register with Google" />
        </button>
      </div>
    </div>
  );
};

export default RegisterPage;