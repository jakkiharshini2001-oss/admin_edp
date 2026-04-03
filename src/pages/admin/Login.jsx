import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function Login({ session }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (session) {
      navigate("/dashboard", { replace: true });
    }
  }, [session, navigate]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Login successful.");
      }
    } catch (err) {
      setMessage(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-900 font-sans">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-80"
          style={{ backgroundImage: 'url("/drone_bg.png")' }}
        />
        
        {/* Overlay Darkening */}
        <div className="absolute inset-0 z-0 bg-black/30 backdrop-blur-[2px]" />

        {/* The Container */}
        <div className="relative z-10 w-full max-w-md p-4">
          {/* Glowing Base/Shadow below the card */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-4/5 h-16 bg-green-500/40 blur-[50px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/5 h-6 bg-white/20 blur-[20px] rounded-full pointer-events-none" />
          
          <form
            onSubmit={handleLogin}
            className="w-full relative bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] overflow-hidden"
          >
            {/* Inner Glow/Highlight Lines */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-400/60 to-transparent" />
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-green-400/30 to-transparent" />
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-green-400/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-green-400/60 to-transparent" />

            {/* Corner glowing accents */}
            <div className="absolute top-0 left-0 w-16 h-16 bg-green-400/20 blur-[20px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-16 h-16 bg-green-400/20 blur-[20px] rounded-full pointer-events-none translate-x-1/2 translate-y-1/2" />

            {/* Logo Section */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-8 h-8 relative flex items-center justify-center">
                {/* Green Triangle shape for Aerodronemitra logo */}
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-green-400 fill-current drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]">
                  <path d="M12 2L2 22H22L12 2Z" />
                  <path d="M12 8L6 19H18L12 8Z" fill="#1e293b" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-wide mix-blend-plus-lighter">
                Aerodronemitra
              </h1>
            </div>

            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-white mb-2">Admin Login</h2>
              <p className="text-sm text-slate-300">Sign in with your Aerodronemitra account</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1.5 ml-1 drop-shadow-sm">Email</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter admin email"
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-400/60 focus:border-green-400/30 focus:bg-white/10 transition-all duration-300 backdrop-blur-md shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1.5 ml-1 drop-shadow-sm">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-400/60 focus:border-green-400/30 focus:bg-white/10 transition-all duration-300 backdrop-blur-md shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="submit"
                disabled={loading}
                className="w-full relative group overflow-hidden px-4 py-3 rounded-xl bg-gradient-to-b from-green-400 to-green-600 border border-green-300/30 text-white font-bold text-lg shadow-[0_0_20px_rgba(74,222,128,0.4)] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-[0_0_30px_rgba(74,222,128,0.6)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="relative z-10 drop-shadow-md tracking-wide">{loading ? "Authenticating..." : "Login"}</span>
                {/* Button shine effect */}
                <div className="absolute inset-0 h-full w-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-[width] duration-[600ms] ease-out group-hover:w-full skew-x-12 -ml-6" />
              </button>
            </div>

            {message && (
              <div 
                className={`mt-6 w-full p-3 rounded-xl backdrop-blur-sm border ${message === "Login successful." ? "bg-green-500/20 border-green-500/50 text-green-200" : "bg-red-500/20 border-red-500/50 text-red-200"}`}
              >
                <p className="text-sm font-medium text-center shadow-black drop-shadow-md">
                  {message}
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
}