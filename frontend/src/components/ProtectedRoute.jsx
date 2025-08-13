import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../services/firebase';
import Loading from './Loading';

const ProtectedRoute = ({ children }) => {
  const [user, loading] = useAuthState(auth);

  if (loading) return <Loading message="Loading..." />;
  if (user) return children;
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;