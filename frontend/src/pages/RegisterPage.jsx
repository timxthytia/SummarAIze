import React from "react";
import { useNavigate } from 'react-router-dom';
import { auth, provider, signInWithPopup, db, doc, getDoc, setDoc } from '../services/firebase';
import "../styles/RegisterPage.css";
import GoogleLogo from "../assets/GoogleLogo.png";
import { PiBrain } from "react-icons/pi";
import { IoDocumentText } from "react-icons/io5";
import { TbTestPipe } from "react-icons/tb";
import { FaSave } from "react-icons/fa";
import Navbar from '../components/Navbar';

const RegisterPage = () => {
  const navigate = useNavigate();

  const registerWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        alert("Account already exists. Redirecting to dashboard...");
        navigate("/dashboard");
      } else {
        await setDoc(doc(db, "users", user.uid), {
          name: user.displayName,
          email: user.email,
          createdAt: new Date()
        });
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Registration error", error);
      alert("Registration failed. Please try again.");
    }
  };

  return (
    <div className="home-container">
      <Navbar />

      <div className="register-container">
        <h1 className="slogan">Summarize<br />Smarter.<br />Learn Faster.</h1>

        <div className="register-card">
          <h1 className="register-title">Create Your Account</h1>
          <p className="register-subtitle">Start simplifying your studies.</p>

          <button className="google-signin-btn" onClick={registerWithGoogle}>
            <img src={GoogleLogo} alt="Sign in with Google" />
          </button>

          <p className="login-prompt">
            Already have an account?{" "}
            <button className="login-button" onClick={() => navigate("/login")}>
              Log In
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

export default RegisterPage;
