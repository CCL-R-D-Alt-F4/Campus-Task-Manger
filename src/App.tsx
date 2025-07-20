import React from 'react';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import MemberDashboard from './components/MemberDashboard'; // Used for staff and student
import StudentDashboard from './components/StudentDashboard';

const queryClient = new QueryClient();

const AppContent = () => {
  const { currentUser, userData, loading } = useAuth();

if (loading || (currentUser && !userData)) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
    </div>
  );
}


  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          currentUser ? (
            <Navigate to={`/${userData?.role}`} replace />
          ) : (
            <Login />
          )
        } 
      />

      <Route 
        path="/admin/*" 
        element={
          currentUser && userData?.role === 'admin' ? (
            <AdminDashboard />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />

      <Route 
        path="/staff/*" 
        element={
          currentUser && userData?.role === 'staff' ? (
            <MemberDashboard />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />

      <Route 
        path="/student/*" 
        element={
          currentUser && userData?.role === 'student' ? (
            <StudentDashboard />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />

      <Route 
        path="/" 
        element={
          currentUser ? (
            <Navigate to={`/${userData?.role}`} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />

      <Route 
        path="*"
        element={
          <Navigate to={currentUser ? `/${userData?.role}` : "/login"} replace />
        } 
      />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-center" richColors={true} />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
