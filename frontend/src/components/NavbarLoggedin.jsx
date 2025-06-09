import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import '../styles/Navbar.css';

const NavbarLoggedin = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);

  const handleLogout = () => {
    signOut(auth).then(() => navigate('/login'));
  };

  return (
    <nav className="navbar">
      <div className="navbar-title" onClick={() => navigate('/dashboard')}>
        SummarAIze
      </div>
      <div className="navbar-right">
        <div className="navbar-links">
          <button className="navbar-home" onClick={() => navigate('/testmodeupload')}>Test Mode</button>
          <button className="navbar-home" onClick={() => navigate('/mindmapgenerator')}>Mindmap</button>
          <button className="navbar-home" onClick={() => navigate('/summarizer')}>Summarizer</button>
          <button className="navbar-home" onClick={handleLogout}>Logout</button>
        </div>
        {user && (
          <div className="navbar-user">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt="Profile"
                className="navbar-avatar"
              />
            )}
            <div className="navbar-user-info">
              <p>{user.displayName || 'User'}</p>
              <span>{user.email}</span>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavbarLoggedin;
