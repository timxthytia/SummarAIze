import React from 'react';
import { useNavigate } from 'react-router-dom';
import "../styles/Homepage.css";
import { IoDocumentText } from "react-icons/io5";
import { PiBrain } from "react-icons/pi";
import { TbTestPipe } from "react-icons/tb";
import { FaSave } from "react-icons/fa";
import HomeComputer from '../assets/HomeComputer.svg';
import Navbar from '../components/Navbar';

const Homepage = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <Navbar />

      <div className="home-split-section">
        <div className="home-left">
          <section className="home-about">
            <p>Your Personal Smart Study Companion</p>
            <h1>
              Our Intelligent Technology<br />
              Provides Solutions and Services<br />
              Like No Other
            </h1>
          </section>

          <section className="home-features">
            <ul>
              <li><IoDocumentText /> Summarize PDFs, Word docs & images using AI</li>
              <li><PiBrain /> Generate interactive mind maps to visualize concepts</li>
              <li><TbTestPipe /> Simulate past-year exams and track performance</li>
              <li><FaSave /> Customize outputs & export to PDF/DOCX/TXT</li>
            </ul>
          </section>
        </div>

        <div className="home-right">
          <div className="home-image-wrapper">
            <img src={HomeComputer} alt="Computer Illustration" className="home-side-image" />
          </div>
          <div className="home-buttons">
            <button onClick={() => navigate('/login')} className="home-button">Login</button>
            <button onClick={() => navigate('/register')} className="home-button">Register</button>
          </div>
        </div>
      </div>

      <section className="home-techstack">
        <h2>Tech Stack</h2>
        <p>
          SummarAIze is built using <strong>React</strong>, <strong>FastAPI</strong>, <strong>Firebase</strong>,
          <strong> OpenAI</strong>, and <strong>Tesseract OCR</strong> for full AI-powered performance and scalability.
        </p>
      </section>
    </div>
  );
};

export default Homepage;
