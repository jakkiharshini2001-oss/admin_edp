import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  IndianRupee,
  Settings,
  BadgeDollarSign,
  Menu,
  Truck,
  Sprout,
} from "lucide-react";

export default function AdminSidebar({ sidebarOpen, setSidebarOpen }) {
  const menuItems = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      path: "/dashboard",
    },
    {
      name: "Bookings",
      icon: <ClipboardList size={20} />,
      path: "/bookings",
    },
    {
      name: "Vendors",
      icon: <Truck size={20} />,
      path: "/vendors",
    },
    {
      name: "Providers",
      icon: <Users size={20} />,
      path: "/providers",
    },
    {
      name: "Farmers",
      icon: <Sprout size={20} />,
      path: "/farmers",
    },
    {
      name: "Pricing",
      icon: <IndianRupee size={20} />,
      path: "/pricing",
    },
    {
      name: "Settlements",
      icon: <BadgeDollarSign size={20} />,
      path: "/settlements",
    },
    {
      name: "Settings",
      icon: <Settings size={20} />,
      path: "/settings",
    },
  ];

  return (
    <div
      className={`${
        sidebarOpen ? "w-64" : "w-20"
      } bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 flex flex-col`}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {sidebarOpen && (
          <h1 className="text-xl font-bold tracking-wide">Agridhara Admin</h1>
        )}

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 rounded hover:bg-slate-700 transition"
        >
          <Menu size={20} />
        </button>
      </div>

      <nav className="flex-1 mt-4 space-y-2 px-3">
        {menuItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-green-500 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`
            }
          >
            {item.icon}
            {sidebarOpen && <span className="text-sm">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700 text-xs text-slate-400">
        {sidebarOpen && <p>Admin Panel © 2026</p>}
      </div>
    </div>
  );
}