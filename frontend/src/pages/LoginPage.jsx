import React from "react";
import { useNavigate } from 'react-router-dom';
import {
  auth,
  provider,
  signInWithPopup,
  db,
  doc,
  getDoc
} from '../services/firebase';
import "../styles/LoginPage.css"; 
import GoogleLogo from "../assets/GoogleLogo.png"

const LoginPage = () => {
    const navigate = useNavigate();
    const signInWithGoogle = async () => {
        try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if user exists in Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists()) {
            navigate("/dashboard");
        } else {
            alert("Account does not exist. Please register first.");
            await auth.signOut(); // optional: sign out if user not in Firestore
        }
        } catch (error) {
        console.error("Login error", error);
        alert("Authentication failed. Please try again.");
        }
    };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">SummarAIze</h1>
        <p className="login-subtitle">Welcome back! Sign in to continue.</p>
        {/* 
        <button onClick={signInWithGoogle} className="google-login-btn">
          <img
            src={GoogleLogo}
            alt="Google logo"
            className="google-logo"
          />
        </button>
        */}
        <button className="google-signin-btn" onClick={signInWithGoogle}>
            <img src={GoogleLogo} alt="Sign in with Google" />
        </button>
      </div>
    </div>
  );
};

export default LoginPage;