import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import Providers from "./pages/admin/Providers";
import Farmers from "./pages/admin/Farmers";
import Bookings from "./pages/admin/Bookings";
import Vendors from "./pages/admin/Vendors";
import VendorProfile from "./pages/admin/VendorProfile";
import BookingForm from "./pages/admin/BookingForm";
import Pricing from "./pages/admin/Pricing";

function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setSession(session);
      }
    }

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (session === undefined) {
    return (
      <div style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={session ? "/dashboard" : "/login"} replace />}
      />

      <Route path="/login" element={<Login session={session} />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute session={session}>
            <AdminLayout session={session}>
              <Dashboard />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/providers"
        element={
          <ProtectedRoute session={session}>
            <AdminLayout session={session}>
              <Providers />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/farmers"
        element={
          <ProtectedRoute session={session}>
            <AdminLayout session={session}>
              <Farmers />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/bookings"
        element={
          <ProtectedRoute session={session}>
            <AdminLayout session={session}>
              <Bookings />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendors"
        element={
          <ProtectedRoute session={session}>
            <AdminLayout session={session}>
              <Vendors />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendors/:providerId"
        element={
          <ProtectedRoute session={session}>
            <AdminLayout session={session}>
              <VendorProfile />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendors/:providerId/book"
        element={
          <ProtectedRoute session={session}>
            <AdminLayout session={session}>
              <BookingForm />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/pricing"
        element={
          <ProtectedRoute session={session}>
            <AdminLayout session={session}>
              <Pricing />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<h2>Page Not Found</h2>} />
    </Routes>
  );
}

export default App;