
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Index = () => {
  const { currentUser, userData } = useAuth();

  if (!currentUser || !userData) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};



export default Index;
