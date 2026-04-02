import React, { useState } from "react";
import AdminSidebar from "../components/admin/AdminSidebar";
import AdminTopbar from "../components/admin/AdminTopbar";

export default function AdminLayout({ children, session }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <AdminSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        session={session}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          session={session}
        />

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}