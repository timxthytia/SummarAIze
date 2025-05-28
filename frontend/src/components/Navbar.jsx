import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-title" onClick={() => navigate('/')}>SummarAIze</div>
      <button className="navbar-home" onClick={() => navigate('/')}>Home</button>
    </nav>
  );
};

export default Navbar;
