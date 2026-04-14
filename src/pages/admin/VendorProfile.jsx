import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  ShieldCheck,
  CalendarDays,
  FileText,
  Camera,
} from "lucide-react";

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900 break-words">{value}</p>
    </div>
  );
}

function DocumentLinkCard({ title, url, isImage = false }) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition block"
    >
      <div className="flex items-center gap-2 mb-3">
        {isImage ? <Camera size={16} className="text-gray-600" /> : <FileText size={16} className="text-gray-600" />}
        <p className="font-semibold text-sm text-gray-900">{title}</p>
      </div>

      {isImage ? (
        <img
          src={url}
          alt={title}
          className="w-full h-36 object-cover rounded-lg border border-gray-200"
        />
      ) : (
        <div className="h-36 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-500">
          View Document
        </div>
      )}
    </a>
  );
}

export default function VendorProfile() {
  const { providerId } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [providerDrones, setProviderDrones] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [completedJobsCount, setCompletedJobsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minBookingDate = new Date(today);
  minBookingDate.setDate(today.getDate() + 1);

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  useEffect(() => {
    loadVendor();
  }, [providerId]);

  async function loadVendor() {
    try {
      setLoading(true);

      const [providerRes, dronesRes, bookingsRes, completedRes] = await Promise.all([
        supabase.from("providers").select("*").eq("id", providerId).single(),

        supabase
          .from("provider_drones")
          .select("*")
          .eq("provider_id", providerId)
          .order("created_at", { ascending: true }),

        supabase
          .from("bookings")
          .select("scheduled_at, status")
          .eq("provider_id", providerId)
          .in("status", ["confirmed", "ongoing"]),

        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", providerId)
          .eq("status", "completed"),
      ]);

      if (providerRes.error) throw providerRes.error;
      if (dronesRes.error) throw dronesRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      if (completedRes.error) throw completedRes.error;

      setProvider(providerRes.data || null);
      setProviderDrones(dronesRes.data || []);
      setCompletedJobsCount(completedRes.count || 0);

      const blocked =
        bookingsRes.data
          ?.map((b) => {
            const raw = b?.scheduled_at;
            if (!raw) return null;
            return raw.split("T")[0];
          })
          .filter(Boolean) || [];

      setBlockedDates(blocked);
    } catch (error) {
      console.error("Error loading vendor:", error);
      setProvider(null);
      setProviderDrones([]);
      setBlockedDates([]);
      setCompletedJobsCount(0);
    } finally {
      setLoading(false);
    }
  }

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(currentYear, currentMonth, d));
    }
    return days;
  }, [firstDay, daysInMonth, currentMonth, currentYear]);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const changeMonth = (direction) => {
    if (direction === "prev") {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear((y) => y - 1);
      } else {
        setCurrentMonth((m) => m - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear((y) => y + 1);
      } else {
        setCurrentMonth((m) => m + 1);
      }
    }
  };

  if (loading) {
    return <div className="p-8">Loading vendor...</div>;
  }

  if (!provider) {
    return <div className="p-8">Vendor not found</div>;
  }

  const providerPhone = provider.contact_phone || provider.phone_number;
  const providerLocation = [
    provider.mandal_name || provider.mandal,
    provider.district,
    provider.state,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="p-6 md:p-8 space-y-8 bg-white min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="w-fit border border-gray-300 bg-white px-4 py-2 rounded-lg font-medium text-gray-900 hover:bg-gray-50 transition"
        >
          Back
        </button>

        <button
          onClick={() =>
            navigate(`/vendors/${providerId}/book`, {
              state: { provider },
            })
          }
          className="bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-teal-800 transition"
        >
          Book Now
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="shrink-0">
            {provider.profile_photo_url ? (
              <img
                src={provider.profile_photo_url}
                alt={provider.full_name}
                className="w-28 h-28 rounded-2xl object-cover border"
              />
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-gray-200 flex items-center justify-center text-sm text-gray-500 border">
                No Photo
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">
                {provider.full_name || "Verified Vendor"}
              </h1>

              <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm font-semibold w-fit">
                <ShieldCheck size={16} />
                {provider.verification_status === "approved"
                  ? "Verified Vendor"
                  : provider.verification_status || "Status Unknown"}
              </div>
            </div>

            {providerLocation && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <MapPin size={14} />
                {providerLocation}
              </div>
            )}

            {providerPhone && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <Phone size={14} />
                {providerPhone}
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <InfoRow
                label="Permanent Address"
                value={provider.permanent_address}
              />
              <InfoRow label="Landmark" value={provider.landmark} />
              <InfoRow label="Provider ID" value={provider.id} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Statistics</h2>
        <div className="grid md:grid-cols-1 gap-4">
          <div className="rounded-lg p-6 border border-teal-200 bg-teal-50">
            <p className="text-sm font-medium text-teal-700 mb-2">Completed Jobs</p>
            <p className="text-4xl font-bold text-teal-900">{completedJobsCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-teal-700" size={20} />
          <h2 className="text-lg font-semibold text-gray-900">
            Verified RPC Certification Details
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoRow label="RPC Number" value={provider.rpc_number} />
          <InfoRow label="Training Institute" value={provider.rpc_institute} />
          <InfoRow label="RPC Category" value={provider.rpc_category} />
          <InfoRow label="Issue Date" value={provider.rpc_issue_date} />
          <InfoRow label="Expiry Date" value={provider.rpc_expiry_date} />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <DocumentLinkCard title="RPC Certificate" url={provider.rpc_url} />
          <DocumentLinkCard
            title="Pilot Photo"
            url={provider.pilot_photo_url}
            isImage
          />
          <DocumentLinkCard
            title="Profile Photo"
            url={provider.profile_photo_url}
            isImage
          />
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Registered Drones</h2>

        {providerDrones.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No registered drones found for this vendor.
          </p>
        ) : (
          <div className="space-y-6">
            {providerDrones.map((drone, index) => (
              <div
                key={drone.id || index}
                className="border border-gray-200 rounded-lg p-5 bg-gray-50 space-y-5"
              >
                <h3 className="text-sm font-semibold text-gray-900">
                  Drone #{index + 1}
                </h3>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoRow label="Drone Brand" value={drone.drone_brand} />
                  <InfoRow label="Drone Model" value={drone.drone_model} />
                  <InfoRow
                    label="Serial Number"
                    value={drone.drone_serial_number}
                  />
                  <InfoRow
                    label="Drone Category"
                    value={drone.drone_category}
                  />
                  <InfoRow label="Drone UIN" value={drone.drone_uin} />
                  <InfoRow label="Primary Usage" value={drone.primary_usage} />
                  <InfoRow label="Tank Capacity" value={drone.tank_capacity} />
                  <InfoRow label="Battery Sets" value={drone.battery_sets} />
                  <InfoRow
                    label="Battery Capacity"
                    value={drone.battery_capacity}
                  />
                  <InfoRow
                    label="Drone Experience"
                    value={drone.drone_experience}
                  />
                  <InfoRow label="Acres Sprayed" value={drone.acres_sprayed} />
                  <InfoRow
                    label="Insurance Company"
                    value={drone.insurance_company}
                  />
                  <InfoRow
                    label="Insurance Policy Number"
                    value={drone.insurance_policy_number}
                  />
                  <InfoRow
                    label="Insurance Expiry"
                    value={drone.insurance_expiry}
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <DocumentLinkCard
                    title="Drone Registration Certificate"
                    url={drone.drone_reg_url}
                  />
                  <DocumentLinkCard
                    title="Insurance Certificate"
                    url={drone.insurance_url}
                  />
                  <DocumentLinkCard
                    title="Drone Photo"
                    url={drone.drone_photo_url}
                    isImage
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <CalendarDays className="text-teal-700" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">
              Vendor Availability
            </h2>
          </div>

          <button
            onClick={() =>
              navigate(`/vendors/${providerId}/book`, {
                state: { provider },
              })
            }
            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold w-fit"
          >
            Book Now
          </button>
        </div>

        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => changeMonth("prev")}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
          >
            <ChevronLeft />
          </button>

          <h4 className="font-semibold text-gray-900">
            {monthNames[currentMonth]} {currentYear}
          </h4>

          <button
            onClick={() => changeMonth("next")}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
          >
            <ChevronRight />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-sm">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="font-semibold text-gray-700 py-2">
              {day}
            </div>
          ))}

          {calendarDays.map((date, i) => {
            if (!date) return <div key={i}></div>;

            const iso = date.toLocaleDateString("en-CA");
            const normalized = new Date(date);
            normalized.setHours(0, 0, 0, 0);

            const isPastOrToday = normalized < minBookingDate;
            const isBlocked = blockedDates.includes(iso);

            let cellClass =
              "p-3 rounded-lg border text-sm font-medium transition";

            if (isPastOrToday) {
              cellClass += " bg-gray-100 text-gray-500 border-gray-200";
            } else if (isBlocked) {
              cellClass += " bg-orange-500 text-white border-orange-500";
            } else {
              cellClass += " bg-teal-50 text-teal-700 border-teal-200";
            }

            return (
              <div key={i} className={cellClass}>
                {date.getDate()}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4 mt-5 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-gray-100 border border-gray-200 inline-block"></span>
            Past / Today
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-orange-500 inline-block"></span>
            Already Booked
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-teal-50 border border-teal-200 inline-block"></span>
            Available
          </div>
        </div>
      </div>
    </div>
  );
}