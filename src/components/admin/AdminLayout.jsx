import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminNavbar from '../AdminNavbar';

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <AdminNavbar />

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
