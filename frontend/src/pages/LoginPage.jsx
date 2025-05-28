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
import { PiBrain } from "react-icons/pi";
import { IoDocumentText } from "react-icons/io5";
import { TbTestPipe } from "react-icons/tb";
import { FaSave } from "react-icons/fa";
import Navbar from '../components/Navbar';


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
    <div className="home-container">
  <Navbar />
    <div className="login-container">
      <h1 className="slogan">Summarize<br />Smarter.<br />Learn Faster.</h1>
      <div className="login-card">
        <h1 className="login-title">Welcome Back!</h1>
        <p className="login-subtitle">Sign in to continue.</p>
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
        <p className="register-prompt">
          Don’t have an account?{" "}
          <button className="register-button" onClick={() => navigate("/register")}>
            Register Here!
          </button>
        </p>
      </div>
      <div className="feature-grid">
        <div className="feature-item">
          <IoDocumentText size={80} />
          <p>Smart<br />Summaries</p>
        </div>
        <div className="feature-item">
          <PiBrain size={80} />
          <p>Visual<br />Mind Maps</p>
        </div>
        <div className="feature-item">
          <TbTestPipe size={80} />
          <p>Mock Test<br />Mode</p>
        </div>
        <div className="feature-item">
          <FaSave size={80} />
          <p>Save &<br />Export</p>
        </div>
      </div>
    </div>
    </div>
  );
};

export default LoginPage;