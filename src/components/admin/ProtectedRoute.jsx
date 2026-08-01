import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="admin-loading-page">
        <div className="admin-spinner admin-spinner-lg"></div>
        <p style={{ marginTop: '16px', color: 'var(--ink-muted)', fontFamily: 'var(--font-label)', fontSize: '0.9rem' }}>
          Verifying session...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
