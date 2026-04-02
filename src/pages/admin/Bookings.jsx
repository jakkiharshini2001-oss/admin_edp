import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import {
  Users,
  MapPin,
  Calendar,
  Clock,
  Phone,
  Navigation,
  Radio,
  Building2,
  UserCheck,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

/* ================================================================
   HELPERS
================================================================ */

const formatDateTime = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getWaitingTime = (createdAt) => {
  if (!createdAt) return "—";
  const diff = Date.now() - new Date(createdAt).getTime();
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const getWaitingColor = (createdAt) => {
  if (!createdAt) return "text-gray-500";
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  if (hours >= 2) return "text-red-600";
  if (hours >= 1) return "text-orange-500";
  return "text-green-600";
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const hasAll =
    lat1 !== null &&
    lat1 !== undefined &&
    lon1 !== null &&
    lon1 !== undefined &&
    lat2 !== null &&
    lat2 !== undefined &&
    lon2 !== null &&
    lon2 !== undefined;

  if (!hasAll) return null;

  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
};

const getDisplayCustomerName = (booking) => {
  if (booking.booking_source === "admin") {
    return (
      booking.contact_person_name ||
      booking.farmer_name ||
      booking.beneficiary_name ||
      "—"
    );
  }

  if (booking.beneficiary_name) return booking.beneficiary_name;
  return booking.farmer_name || "—";
};

const getDisplayCustomerPhone = (booking) => {
  if (booking.booking_source === "admin") {
    return booking.contact_phone || booking.beneficiary_phone || "—";
  }

  if (booking.beneficiary_name) return booking.beneficiary_phone || "—";
  return booking.contact_phone || "—";
};

const getSecondaryCustomerText = (booking) => {
  if (booking.booking_source === "admin") {
    if (booking.farmer_name && booking.contact_person_name) {
      return `Booked by admin${
        booking.farmer_name ? ` · Farmer: ${booking.farmer_name}` : ""
      }`;
    }
    return "Booked by admin";
  }

  if (booking.beneficiary_name) {
    return booking.farmer_name ? `(via ${booking.farmer_name})` : "";
  }

  return "";
};

const isCancelledCase = (booking) => {
  return Boolean(
    booking.decline_reason ||
      booking.cancelled_provider_id ||
      booking.status === "cancelled"
  );
};

const matchesTab = (booking, tab) => {
  if (tab === "cancelled") {
    return isCancelledCase(booking);
  }

  if (tab === "reassigning") {
    return booking.status === "reassigning";
  }

  return booking.status === tab;
};

/* ================================================================
   ASSIGN PROVIDER MODAL
================================================================ */

const AssignProviderModal = ({ booking, onClose, onAssigned }) => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("providers")
        .select("*")
        .eq("is_active", true)
        .eq("verification_status", "approved");

      if (error) {
        toast.error("Failed to load providers");
        setLoading(false);
        return;
      }

      const bookingDate = booking.scheduled_at
        ? new Date(booking.scheduled_at).toLocaleDateString("en-CA")
        : null;

      const notifiedIds = new Set(
        (booking.notified_providers || []).map(String)
      );
      const currentRadius = booking.current_radius || 0;

      const enriched = await Promise.all(
        (data || []).map(async (p) => {
          let isBusy = false;

          if (bookingDate) {
            const { data: busy } = await supabase
              .from("bookings")
              .select("id")
              .eq("provider_id", p.id)
              .in("status", ["accepted", "ongoing"])
              .gte("scheduled_at", `${bookingDate}T00:00:00`)
              .lte("scheduled_at", `${bookingDate}T23:59:59`);

            isBusy = (busy?.length || 0) > 0;
          }

          const distance = calculateDistance(
            p.lat,
            p.lng,
            booking.latitude,
            booking.longitude
          );

          const isNotified = notifiedIds.has(String(p.id));
          const withinRadius =
            distance !== null && parseFloat(distance) <= currentRadius;

          return {
            ...p,
            distance_km: distance,
            is_busy: isBusy,
            is_notified: isNotified,
            within_radius: withinRadius,
          };
        })
      );

      enriched.sort((a, b) => {
        if (a.is_notified !== b.is_notified) return a.is_notified ? -1 : 1;
        return (
          (parseFloat(a.distance_km) || 999) -
          (parseFloat(b.distance_km) || 999)
        );
      });

      setProviders(enriched);
      setLoading(false);
    };

    fetchProviders();
  }, [booking]);

  const handleAssign = async (provider) => {
    setAssigning(provider.id);

    const nextStatus =
      booking.status === "reassigning" ? "requested" : "requested";

    const { error } = await supabase
      .from("bookings")
      .update({
        provider_id: provider.id,
        provider_name: provider.full_name,
        status: nextStatus,
        request_status: "assigned",
        accepted_at: null,
        start_otp: null,
        complete_otp: null,
        cancelled_provider_id: null,
        reassignment_started_at: null,
      })
      .eq("id", booking.id);

    setAssigning(null);

    if (error) {
      toast.error("Assignment failed: " + error.message);
      return;
    }

    toast.success(`Assigned to ${provider.full_name} and moved to Requested`);
    onAssigned();
    onClose();
  };

  const notifiedProviders = providers.filter((p) => p.is_notified);
  const otherProviders = providers.filter((p) => !p.is_notified);

  const ProviderCard = ({ p }) => (
    <div
      className="border-2 rounded-2xl p-4 flex items-center justify-between gap-3"
      style={{
        borderColor: p.is_notified
          ? "#86efac"
          : p.is_busy
          ? "#fca5a5"
          : "#e5e7eb",
        backgroundColor: p.is_notified
          ? "#f0fdf4"
          : p.is_busy
          ? "#fff1f2"
          : "#ffffff",
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <span className="font-bold text-gray-900 truncate">{p.full_name}</span>

          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">
            📡 Dispatch Eligible
          </span>

          {p.is_notified && (
            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
              <Radio size={9} /> Notified
            </span>
          )}

          {p.is_busy && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
              Busy this day
            </span>
          )}
        </div>

        <p className="text-xs text-gray-500 truncate">
          {[p.mandal_name, p.district, p.state].filter(Boolean).join(", ")}
        </p>

        {p.distance_km !== null ? (
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p
              className={`text-xs font-semibold ${
                p.within_radius ? "text-green-600" : "text-orange-500"
              }`}
            >
              📍 {p.distance_km} km away
            </p>
            {!p.within_radius && (
              <span className="text-xs text-orange-500">
                (outside {booking.current_radius || 0}km radius)
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 mt-0.5">📍 Distance unavailable</p>
        )}
      </div>

      <button
        onClick={() => handleAssign(p)}
        disabled={!!assigning}
        className={`px-4 py-2 rounded-xl text-white font-bold text-sm shrink-0 transition-colors ${
          assigning === p.id
            ? "bg-gray-300 cursor-not-allowed"
            : p.is_busy
            ? "bg-orange-500 hover:bg-orange-600"
            : p.is_notified
            ? "bg-green-600 hover:bg-green-700"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {assigning === p.id
          ? "Assigning..."
          : p.is_busy
          ? "Assign Anyway"
          : "Assign"}
      </button>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        backgroundColor: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden">
        <div
          style={{
            background: "linear-gradient(135deg,#1e40af,#1d4ed8)",
            padding: "18px 24px",
            flexShrink: 0,
          }}
          className="flex items-center justify-between"
        >
          <div>
            <h2 className="text-white font-black text-lg">Assign Provider</h2>
            <p className="text-blue-200 text-xs mt-0.5">
              {booking.service_type} · {booking.area_size} Acres ·{" "}
              {formatDateTime(booking.scheduled_at)}
            </p>
            {booking.current_radius > 0 && (
              <p className="text-blue-300 text-xs mt-0.5">
                Current dispatch radius: {booking.current_radius} km
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white font-black text-xl w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {loading && (
            <p className="text-center text-gray-400 py-10">
              Loading providers...
            </p>
          )}

          {!loading && providers.length === 0 && (
            <div className="text-center py-10">
              <p className="text-4xl mb-2">😔</p>
              <p className="text-gray-600 font-semibold">
                No verified providers found
              </p>
            </div>
          )}

          {!loading && notifiedProviders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px bg-green-200" />
                <span className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200 flex items-center gap-1">
                  <Radio size={10} /> Already Notified ({notifiedProviders.length})
                </span>
                <div className="flex-1 h-px bg-green-200" />
              </div>
              <div className="space-y-3">
                {notifiedProviders.map((p) => (
                  <ProviderCard key={p.id} p={p} />
                ))}
              </div>
            </div>
          )}

          {!loading && otherProviders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                  Other Verified Providers ({otherProviders.length})
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="space-y-3">
                {otherProviders.map((p) => (
                  <ProviderCard key={p.id} p={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ================================================================
   BOOKING DETAIL MODAL
================================================================ */

const BookingDetailModal = ({ booking, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center px-4"
    style={{
      backgroundColor: "rgba(0,0,0,0.55)",
      backdropFilter: "blur(4px)",
    }}
    onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden">
      <div
        style={{
          background: "linear-gradient(135deg,#15803d,#16a34a)",
          padding: "18px 24px",
          flexShrink: 0,
        }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-white font-black text-lg">Booking Details</h2>
          <p className="text-green-200 text-xs mt-0.5">
            #{booking.id?.slice(0, 8)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-white font-black text-xl w-8 h-8 flex items-center justify-center rounded-lg"
          style={{ background: "rgba(255,255,255,0.2)" }}
        >
          ×
        </button>
      </div>

      <div className="overflow-y-auto flex-1 p-6 space-y-3 text-sm">
        {booking.booking_source === "admin" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
              Admin Booking
            </p>
            <p>
              <b>Contact Person:</b> {booking.contact_person_name || "—"}
            </p>
            <p>
              <b>Phone:</b> {booking.contact_phone || "—"}
            </p>
            {booking.farmer_name && (
              <p>
                <b>Farmer Name:</b> {booking.farmer_name}
              </p>
            )}
          </div>
        )}

        {booking.beneficiary_name && booking.booking_source !== "admin" && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <p className="text-xs text-purple-600 font-bold uppercase tracking-wide mb-1">
              Booked for Someone Else
            </p>
            <p>
              <b>Beneficiary Name:</b> {booking.beneficiary_name}
            </p>
            <p>
              <b>Beneficiary Phone:</b> {booking.beneficiary_phone || "—"}
            </p>
          </div>
        )}

        <div className="bg-gray-50 rounded-xl p-3 space-y-1">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-1">
            Customer
          </p>
          <p>
            <b>Name:</b> {booking.display_customer_name || "—"}
          </p>
          <p className="flex items-center gap-1">
            <Phone size={12} className="text-gray-400" />
            <b>Phone:</b>&nbsp;{booking.display_customer_phone || "—"}
          </p>
          {booking.secondary_customer_text && (
            <p className="text-xs text-gray-500">
              {booking.secondary_customer_text}
            </p>
          )}
        </div>

        <div className="bg-gray-50 rounded-xl p-3 space-y-1">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-1">
            Service
          </p>
          <p>
            <b>Type:</b> {booking.service_type}
          </p>
          <p>
            <b>Crop:</b> {booking.crop_name || "—"}
          </p>
          <p>
            <b>Area:</b> {booking.area_size} Acres
          </p>
          <p>
            <b>Total:</b> ₹{(booking.total_price || 0).toFixed(2)}
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 space-y-1">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-1">
            Location
          </p>
          {booking.address_line && (
            <p>
              <b>Address:</b> {booking.address_line}
            </p>
          )}
          {booking.landmark && (
            <p>
              <b>Landmark:</b> {booking.landmark}
            </p>
          )}
          <p>
            <b>District:</b> {booking.district || "—"}
          </p>
          {booking.latitude && booking.longitude && (
            <p className="text-xs text-gray-400 font-mono">
              {booking.latitude?.toFixed(6)}, {booking.longitude?.toFixed(6)}
            </p>
          )}
        </div>

        <div className="bg-gray-50 rounded-xl p-3 space-y-1">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-1">
            Schedule
          </p>
          <p>
            <b>Date & Time:</b> {formatDateTime(booking.scheduled_at)}
          </p>
          <p>
            <b>Requested At:</b> {formatDateTime(booking.created_at)}
          </p>
          {booking.status === "requested" && (
            <p className={`font-semibold ${getWaitingColor(booking.created_at)}`}>
              ⏳ Waiting: {getWaitingTime(booking.created_at)}
            </p>
          )}
        </div>

        {booking.current_radius > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1">
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
              Dispatch Info
            </p>
            <p>
              <b>Current Radius:</b> {booking.current_radius} km
            </p>
            <p>
              <b>Providers Notified:</b>{" "}
              {(booking.notified_providers || []).length}
            </p>
            {booking.dispatch_started_at && (
              <p>
                <b>Dispatch Started:</b>{" "}
                {formatDateTime(booking.dispatch_started_at)}
              </p>
            )}
          </div>
        )}

        {(booking.display_provider_name || booking.provider_name) && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1">
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
              Assigned Provider
            </p>
            <p>
              <b>Name:</b> {booking.display_provider_name || booking.provider_name}
            </p>
            {booking.accepted_at && (
              <p>
                <b>Accepted At:</b> {formatDateTime(booking.accepted_at)}
              </p>
            )}
          </div>
        )}

        {booking.reassignment_count > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
            <p className="text-xs text-orange-600 font-bold uppercase tracking-wide mb-1">
              Reassignment Info
            </p>
            <p className="text-orange-700 text-sm">
              Reassigned <b>{booking.reassignment_count}</b> time(s)
            </p>
            {booking.reassignment_started_at && (
              <p className="text-orange-700 text-sm mt-1">
                <b>Started:</b> {formatDateTime(booking.reassignment_started_at)}
              </p>
            )}
          </div>
        )}

        {isCancelledCase(booking) && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
            <p className="text-xs text-red-600 font-bold uppercase tracking-wide mb-1">
              Provider Cancellation
            </p>
            <p>
              <b>Decline Reason:</b> {booking.decline_reason || "—"}
            </p>
            {booking.cancelled_provider_id && (
              <p className="text-xs text-red-500">
                Previous provider cancelled this booking.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="p-5 border-t">
        <button
          onClick={onClose}
          className="w-full bg-slate-900 text-white py-3 rounded-2xl font-bold"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

/* ================================================================
   MAIN — ADMIN BOOKINGS PAGE
================================================================ */

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("requested");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [assignBooking, setAssignBooking] = useState(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load bookings");
      setLoading(false);
      return;
    }

    const enriched = await Promise.all(
      (data || []).map(async (booking) => {
        let crop_name = "—";

        if (booking.crop_type) {
          const isUUID =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              booking.crop_type
            );

          if (isUUID) {
            try {
              const { data: crop } = await supabase
                .from("crop_types")
                .select("name")
                .eq("id", booking.crop_type)
                .single();

              if (crop?.name) crop_name = crop.name;
            } catch {
              //
            }
          } else {
            crop_name = booking.crop_type;
          }
        }

        let provider_name = booking.provider_name || "";
        if (!provider_name && booking.provider_id) {
          try {
            const { data: provider } = await supabase
              .from("providers")
              .select("full_name")
              .eq("id", booking.provider_id)
              .maybeSingle();

            if (provider?.full_name) {
              provider_name = provider.full_name;
            }
          } catch {
            //
          }
        }

        return {
          ...booking,
          crop_name,
          display_customer_name: getDisplayCustomerName(booking),
          display_customer_phone: getDisplayCustomerPhone(booking),
          secondary_customer_text: getSecondaryCustomerText(booking),
          display_provider_name: provider_name || "—",
        };
      })
    );

    setBookings(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          loadBookings();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [loadBookings]);

  useEffect(() => {
    const ticker = setInterval(() => setBookings((prev) => [...prev]), 60000);
    return () => clearInterval(ticker);
  }, []);

  const TABS = [
    "requested",
    "accepted",
    "ongoing",
    "completed",
    "reassigning",
    "cancelled",
  ];

  const counts = TABS.reduce((acc, tab) => {
    acc[tab] = bookings.filter((b) => matchesTab(b, tab)).length;
    return acc;
  }, {});

  const filtered = bookings.filter((b) => matchesTab(b, activeTab));

  const statusBadge = (status) => {
    const map = {
      requested: "bg-yellow-100 text-yellow-700",
      accepted: "bg-blue-100 text-blue-700",
      ongoing: "bg-indigo-100 text-indigo-700",
      completed: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      reassigning: "bg-orange-100 text-orange-700",
      cancelled: "bg-red-100 text-red-700",
    };

    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
          map[status] || "bg-gray-100 text-gray-600"
        }`}
      >
        {status}
      </span>
    );
  };

  const tabLabel = (tab) => {
    if (tab === "cancelled") return "Cancelled";
    if (tab === "reassigning") return "Reassigning";
    return tab;
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Bookings</h1>
      <p className="text-gray-500 text-sm mb-6">
        Manage all service requests, assign providers, track job progress, and
        view provider cancellation reasons.
      </p>

      <div className="flex gap-3 flex-wrap mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm border transition-colors capitalize ${
              activeTab === tab
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {tabLabel(tab)}
            <span
              className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-black ${
                activeTab === tab
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-20 text-gray-400">Loading bookings...</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500 font-semibold">
            No {tabLabel(activeTab).toLowerCase()} bookings
          </p>
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          {filtered.map((booking) => (
            <div
              key={booking.id}
              className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-gray-900 text-base">
                      {booking.service_type}
                    </h3>

                    {activeTab === "cancelled"
                      ? statusBadge("cancelled")
                      : statusBadge(booking.status)}

                    {booking.booking_source === "admin" && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        <Building2 size={11} />
                        Admin Booking
                      </span>
                    )}

                    {booking.reassignment_count > 0 && (
                      <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold">
                        Reassigned ×{booking.reassignment_count}
                      </span>
                    )}

                    {isCancelledCase(booking) && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        <AlertTriangle size={11} />
                        Provider Cancelled
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-1.5 text-sm text-gray-700">
                    <Users size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span
                        className={`font-semibold ${
                          booking.booking_source === "admin"
                            ? "text-blue-700"
                            : booking.beneficiary_name
                            ? "text-purple-700"
                            : "text-gray-900"
                        }`}
                      >
                        {booking.display_customer_name}
                      </span>

                      {booking.secondary_customer_text && (
                        <span className="text-xs text-gray-400 ml-1">
                          {booking.secondary_customer_text}
                        </span>
                      )}

                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Phone size={11} /> {booking.display_customer_phone}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600">
                    🌾 {booking.crop_name} · {booking.area_size} Acres ·{" "}
                    <span className="font-semibold text-green-700">
                      ₹{(booking.total_price || 0).toFixed(2)}
                    </span>
                  </p>

                  <div className="flex items-start gap-1.5 text-sm text-gray-600">
                    <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    <span className="truncate">
                      {[booking.address_line, booking.landmark, booking.district]
                        .filter(Boolean)
                        .join(" · ") || "Location unavailable"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Calendar size={14} className="text-gray-400 shrink-0" />
                    {formatDateTime(booking.scheduled_at)}
                  </div>

                  {booking.current_radius > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <Radio size={12} className="text-blue-500" />
                      <span className="text-blue-600 font-semibold">
                        Radius: {booking.current_radius} km
                      </span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-500">
                        {(booking.notified_providers || []).length} providers
                        notified
                      </span>
                    </div>
                  )}

                  {booking.status === "requested" && (
                    <div
                      className={`flex items-center gap-1.5 text-sm font-semibold ${getWaitingColor(
                        booking.created_at
                      )}`}
                    >
                      <Clock size={14} className="shrink-0" />
                      Waiting: {getWaitingTime(booking.created_at)}
                    </div>
                  )}

                  {booking.provider_id && (
                    <div className="flex items-center gap-1.5 text-sm text-blue-700 font-semibold">
                      <UserCheck size={14} className="shrink-0" />
                      <span>{booking.display_provider_name || "—"}</span>
                      {booking.accepted_at && (
                        <span className="text-xs text-gray-400 font-normal ml-1">
                          · Accepted {formatDateTime(booking.accepted_at)}
                        </span>
                      )}
                    </div>
                  )}

                  {isCancelledCase(booking) && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle
                          size={16}
                          className="text-red-600 mt-0.5 shrink-0"
                        />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-red-600 mb-1">
                            Provider Cancellation Reason
                          </p>
                          <p className="text-sm text-red-700 font-medium">
                            {booking.decline_reason || "No reason provided"}
                          </p>

                          {booking.status === "reassigning" && (
                            <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                              <RefreshCw size={11} />
                              Reassigning provider is in progress
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 min-w-[160px]">
                  <button
                    onClick={() => setSelectedBooking(booking)}
                    className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors"
                  >
                    View Details
                  </button>

                  {booking.latitude && booking.longitude && (
                    <button
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps?q=${booking.latitude},${booking.longitude}`,
                          "_blank"
                        )
                      }
                      className="w-full py-2 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Navigation size={13} /> Navigate
                    </button>
                  )}

                  {(booking.status === "requested" ||
                    booking.status === "reassigning") &&
                    !booking.provider_id && (
                      <button
                        onClick={() => setAssignBooking(booking)}
                        className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-colors"
                      >
                        Assign Provider
                      </button>
                    )}

                  {booking.status === "accepted" && (
                    <button
                      onClick={() => setAssignBooking(booking)}
                      className="w-full py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-colors"
                    >
                      Re-assign
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}

      {assignBooking && (
        <AssignProviderModal
          booking={assignBooking}
          onClose={() => setAssignBooking(null)}
          onAssigned={loadBookings}
        />
      )}
    </div>
  );
} 