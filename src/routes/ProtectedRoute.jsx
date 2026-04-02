import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ProtectedRoute({ session, children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    async function checkAdmin() {
      if (!session?.user?.email) {
        setStatus("not_logged_in");
        return;
      }

      const { data, error } = await supabase
        .from("admins")
        .select("id")
        .eq("email", session.user.email)
        .maybeSingle();

      if (error || !data) {
        await supabase.auth.signOut();
        setStatus("not_admin");
        return;
      }

      setStatus("admin");
    }

    checkAdmin();
  }, [session]);

  if (status === "checking") {
    return <h2 style={{ padding: "40px" }}>Checking admin access...</h2>;
  }

  if (!session || status === "not_logged_in" || status === "not_admin") {
    return <Navigate to="/login" replace />;
  }

  return children;
}