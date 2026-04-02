import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function AdminAssignProvider({ booking, onClose, onAssigned }) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState(null);

  useEffect(() => {
    if (booking) {
      loadProviders();
    }
  }, [booking]);

  async function loadProviders() {
    try {
      setLoading(true);

      if (!booking?.scheduled_at) {
        setProviders([]);
        return;
      }

      const fiveMinutesAgo = new Date(
        Date.now() - 5 * 60 * 1000
      ).toISOString();

      const { data: provData, error: provError } = await supabase
        .from("providers")
        .select("*")
        .eq("is_active", true)
        .eq("is_online", true)
        .eq("verification_status", "approved")
        .gte("last_seen_at", fiveMinutesAgo)
        .not("lat", "is", null)
        .not("lng", "is", null);

      if (provError) throw provError;

      if (!provData?.length) {
        setProviders([]);
        return;
      }

      const { data: busyBookings, error: busyError } = await supabase
        .from("bookings")
        .select("provider_id, scheduled_at")
        .in("status", ["accepted", "ongoing"]);

      if (busyError) throw busyError;

      const reqDate = new Date(booking.scheduled_at).toDateString();

      const enriched = provData.map((p) => {
        const isBusy = busyBookings?.some(
          (b) =>
            b.provider_id === p.id &&
            new Date(b.scheduled_at).toDateString() === reqDate
        );

        let distance = null;

        if (p.lat && p.lng && booking.latitude && booking.longitude) {
          const R = 6371;

          const dLat = ((booking.latitude - p.lat) * Math.PI) / 180;
          const dLon = ((booking.longitude - p.lng) * Math.PI) / 180;

          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((p.lat * Math.PI) / 180) *
              Math.cos((booking.latitude * Math.PI) / 180) *
              Math.sin(dLon / 2) ** 2;

          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distance = R * c;
        }

        return {
          ...p,
          isBusy,
          distance,
        };
      });

      enriched.sort((a, b) => {
        if (a.isBusy !== b.isBusy) return a.isBusy - b.isBusy;
        return (a.distance ?? 999) - (b.distance ?? 999);
      });

      setProviders(enriched);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load providers");
    } finally {
      setLoading(false);
    }
  }

  async function assignProvider(provider) {
    try {
      setAssigningId(provider.id);

      const { error } = await supabase
        .from("bookings")
        .update({
          provider_id: provider.id,
          provider_name: provider.full_name,
          status: "accepted",
          request_status: "assigned",
          assigned_by_admin: true,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      if (error) throw error;

      toast.success("Provider assigned successfully");

      if (onAssigned) {
        onAssigned();
      }

      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Assignment failed");
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl w-full max-w-[720px] max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Assign Provider</h2>

        {loading && <p className="text-gray-500">Loading providers...</p>}

        {!loading && providers.length === 0 && (
          <p className="text-gray-500">No available providers found.</p>
        )}

        {!loading &&
          providers.map((p) => (
            <div
              key={p.id}
              className="border rounded-xl p-4 mb-3 flex justify-between items-center gap-4"
            >
              <div className="min-w-0">
                <p className="font-bold">{p.full_name || "-"}</p>

                <p className="text-sm text-green-600 font-semibold">
                  🟢 Online now
                </p>

                <p>
                  📍 {[p.mandal_name, p.district, p.state]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>

                <p>📞 {p.contact_phone || p.phone_number || "—"}</p>

                <p>
                  📏{" "}
                  {p.distance !== null
                    ? `${p.distance.toFixed(1)} km`
                    : "Distance unknown"}
                </p>

                <p>
                  🚜 Services: {(p.services_offered || []).join(", ") || "—"}
                </p>

                <p>{p.isBusy ? "❌ Busy on requested date" : "✅ Available"}</p>
              </div>

              <button
                disabled={p.isBusy || assigningId === p.id}
                onClick={() => assignProvider(p)}
                className={`px-4 py-2 rounded-lg text-white shrink-0 ${
                  p.isBusy || assigningId === p.id
                    ? "bg-gray-400"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {assigningId === p.id ? "Assigning..." : "Assign"}
              </button>
            </div>
          ))}

        <button
          onClick={onClose}
          className="mt-4 bg-slate-800 text-white px-4 py-2 rounded-lg"
        >
          Close
        </button>
      </div>
    </div>
  );
}