import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../services/firebase';

const ProtectedRoute = ({ children }) => {
  const [user, loading] = useAuthState(auth);
  const [alertShown, setAlertShown] = useState(false);

  useEffect(() => {
    if (!loading && !user && !alertShown) {
      alert("Login first!");
      setAlertShown(true);
    }
  }, [loading, user, alertShown]);

  if (loading) return <div>Loading...</div>;
  if (user) return children;
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;