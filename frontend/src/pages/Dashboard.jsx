import React, { useEffect, useState } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css'; // Optional if using custom CSS

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const auth = getAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
      } else {
        navigate('/login'); // Redirect to /login if not logged in
      }
    });

    return () => unsubscribe();
  }, [auth, navigate]);

  const handleLogout = () => {
    signOut(auth).then(() => {
      navigate('/login');
    }).catch((error) => {
      console.error("Error signing out:", error);
    });
  };

  if (!user) return null; // Optional loading state

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <img className="profile-pic" src={user.photoURL} alt="Profile" />
        <h2>Welcome, {user.displayName}!</h2>
        <p>Email: {user.email}</p>
        <button onClick={handleLogout} className="logout-button">Sign Out</button>
      </div>
    </div>
  );
};

export default Dashboard;