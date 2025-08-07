import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import '../styles/Navbar.css';

const NavbarLoggedin = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [dropdownVisible, setDropdownVisible] = React.useState(false);
  const toggleDropdown = () => setDropdownVisible(!dropdownVisible);

  const handleLogout = () => {
    signOut(auth).then(() => navigate('/'));
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
        </div>
        {user && (
          <div className="navbar-user" onClick={toggleDropdown}>
            <img
              src={user.photoURL || '/default-avatar.png'}
              alt="Profile"
              className="navbar-avatar"
            />
            {dropdownVisible && (
              <div className="navbar-dropdown">
                <p>{user.displayName || 'User'}</p>
                <span>{user.email}</span>
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};



export default NavbarLoggedin;
