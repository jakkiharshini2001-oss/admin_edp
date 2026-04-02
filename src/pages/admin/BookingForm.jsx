import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  MapPin,
  User,
  Tractor,
} from "lucide-react";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

const markerIcon = new L.Icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapClickHandler({ selectedPosition, setSelectedPosition }) {
  useMapEvents({
    click(e) {
      setSelectedPosition({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    },
  });

  return selectedPosition ? (
    <Marker
      position={[selectedPosition.lat, selectedPosition.lng]}
      icon={markerIcon}
    />
  ) : null;
}

function MapPickerModal({
  isOpen,
  onClose,
  onConfirm,
  initialLocation,
}) {
  const [selectedPosition, setSelectedPosition] = useState(
    initialLocation?.latitude && initialLocation?.longitude
      ? {
          lat: initialLocation.latitude,
          lng: initialLocation.longitude,
        }
      : null
  );

  const [resolving, setResolving] = useState(false);
  const [previewAddress, setPreviewAddress] = useState(
    initialLocation?.address_name || ""
  );

  useEffect(() => {
    if (!isOpen) return;

    if (initialLocation?.latitude && initialLocation?.longitude) {
      setSelectedPosition({
        lat: initialLocation.latitude,
        lng: initialLocation.longitude,
      });
      setPreviewAddress(initialLocation.address_name || "");
    } else {
      setSelectedPosition(null);
      setPreviewAddress("");
    }
  }, [isOpen, initialLocation]);

  const reverseGeocode = async (lat, lng) => {
    setResolving(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { Accept: "application/json" } }
      );

      if (!response.ok) throw new Error("Failed to fetch address");

      const data = await response.json();
      const address = data?.address || {};

      const addressName =
        data?.display_name ||
        address?.road ||
        address?.hamlet ||
        address?.village ||
        address?.town ||
        address?.city ||
        "Selected Location";

      setPreviewAddress(addressName);

      return {
        address_name: addressName,
        latitude: lat,
        longitude: lng,
        district:
          address?.state_district || address?.county || address?.district || "",
        state: address?.state || "",
        pincode: address?.postcode || "",
      };
    } catch (error) {
      console.error("Map reverse geocode error:", error);

      const fallback = {
        address_name: `Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)}`,
        latitude: lat,
        longitude: lng,
        district: "",
        state: "",
        pincode: "",
      };

      setPreviewAddress(fallback.address_name);
      return fallback;
    } finally {
      setResolving(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedPosition) {
      alert("Please select a location on the map");
      return;
    }

    const result = await reverseGeocode(
      selectedPosition.lat,
      selectedPosition.lng
    );
    onConfirm(result);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Select Location on Map</h2>
            <p className="text-sm text-gray-500">
              Click anywhere on the map to place the marker
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-2xl font-bold text-gray-500 hover:text-gray-800"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="h-[420px] rounded-2xl overflow-hidden border">
            <MapContainer
              center={
                selectedPosition
                  ? [selectedPosition.lat, selectedPosition.lng]
                  : [17.385, 78.4867]
              }
              zoom={selectedPosition ? 15 : 10}
              scrollWheelZoom={true}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler
                selectedPosition={selectedPosition}
                setSelectedPosition={setSelectedPosition}
              />
            </MapContainer>
          </div>

          <div className="bg-gray-50 border rounded-2xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Selected Coordinates
            </p>
            {selectedPosition ? (
              <>
                <p className="text-sm text-gray-700">
                  Lat: {selectedPosition.lat.toFixed(6)} | Lng:{" "}
                  {selectedPosition.lng.toFixed(6)}
                </p>
                {previewAddress && (
                  <p className="text-sm text-gray-600 mt-2 break-words">
                    {previewAddress}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">
                No location selected yet
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={resolving}
              className="flex-1 py-3 rounded-2xl bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-60"
            >
              {resolving ? "Resolving Address..." : "Use This Location"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const LocationSelectionSection = ({
  openMapPicker,
  captureLocation,
  capturingLocation,
  resolvingAddress,
  selectedLocation,
  gpsAccuracy,
}) => {
  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-gray-700">
        Select Location on Map
      </label>

      <button
        type="button"
        onClick={openMapPicker}
        className="w-full bg-purple-500 text-white py-3 rounded-xl font-bold hover:bg-purple-600 transition-colors"
      >
        📍 Select on Map
      </button>

      <button
        type="button"
        onClick={captureLocation}
        disabled={capturingLocation || resolvingAddress}
        className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
      >
        {capturingLocation
          ? "Capturing Location..."
          : resolvingAddress
          ? "Resolving Address..."
          : "📡 Capture GPS Location"}
      </button>

      {selectedLocation && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-1">
          <p className="text-sm font-semibold text-green-700">
            ✅ Location Selected
          </p>
          <p className="text-sm text-gray-700 break-words">
            {selectedLocation.address_name}
          </p>
          <p className="text-xs text-gray-400">
            Lat: {selectedLocation.latitude?.toFixed(6)} | Lng:{" "}
            {selectedLocation.longitude?.toFixed(6)}
          </p>
          {gpsAccuracy && (
            <p className="text-xs text-gray-400">
              GPS Accuracy: ±{Math.round(gpsAccuracy)} meters
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default function BookingForm() {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const provider = location.state?.provider;

  const [blockedDates, setBlockedDates] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const [pricingOptions, setPricingOptions] = useState([]);
  const [pricingMap, setPricingMap] = useState({});
  const [pricingLoading, setPricingLoading] = useState(false);

  const [capturingLocation, setCapturingLocation] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const [details, setDetails] = useState({
    selectedDate: "",
    selectedTime: "",
    pricingId: "",
    cropTypeName: "",
    areaSize: "",
    agencyName: "",
    location: "",
    contactPerson: "",
    contactPhone: "",
    notes: "",
  });

  if (!provider) {
    return <div className="p-8">Invalid Booking Session</div>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minBookingDate = new Date(today);
  minBookingDate.setDate(today.getDate() + 1);

  useEffect(() => {
    fetchBlockedDates();
    fetchPricing();
  }, [providerId]);

  async function fetchBlockedDates() {
    const { data, error } = await supabase
      .from("bookings")
      .select("scheduled_at, status")
      .eq("provider_id", providerId)
      .in("status", ["confirmed", "ongoing"]);

    if (error) {
      console.error("Blocked dates error:", error);
      return;
    }

    const blocked = data?.map((b) => b.scheduled_at.split("T")[0]) || [];
    setBlockedDates(blocked);
  }

  async function fetchPricing() {
    try {
      setPricingLoading(true);

      const { data, error } = await supabase
        .from("service_pricing")
        .select(`
          id,
          crop_name,
          base_rate,
          platform_fee,
          final_rate,
          is_active
        `)
        .eq("is_active", true)
        .order("crop_name", { ascending: true });

      if (error) throw error;

      const rows = data || [];
      setPricingOptions(rows);

      const map = {};
      rows.forEach((row) => {
        map[String(row.id)] = row;
      });
      setPricingMap(map);

      setDetails((prev) => {
        if (!prev.pricingId) return prev;

        const stillExists = rows.find(
          (row) => String(row.id) === String(prev.pricingId)
        );

        if (stillExists) {
          return {
            ...prev,
            cropTypeName: stillExists.crop_name || "",
          };
        }

        return {
          ...prev,
          pricingId: "",
          cropTypeName: "",
        };
      });
    } catch (err) {
      console.error("Pricing load error:", err);
      alert("Failed to load crop pricing");
    } finally {
      setPricingLoading(false);
    }
  }

  const reverseGeocode = async (lat, lng) => {
    setResolvingAddress(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { Accept: "application/json" } }
      );

      if (!response.ok) throw new Error("Failed to fetch address");

      const data = await response.json();
      const address = data?.address || {};

      const addressName =
        data?.display_name ||
        address?.road ||
        address?.hamlet ||
        address?.village ||
        address?.town ||
        address?.city ||
        "Current Location";

      const district =
        address?.state_district || address?.county || address?.district || "";
      const state = address?.state || "";
      const pincode = address?.postcode || "";

      const nextLocation = {
        address_name: addressName,
        latitude: lat,
        longitude: lng,
        district,
        state,
        pincode,
      };

      setSelectedLocation(nextLocation);

      setDetails((prev) => ({
        ...prev,
        location: addressName || prev.location,
      }));
    } catch (error) {
      console.error("Reverse geocode error:", error);

      const fallbackLocation = {
        address_name: `Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)}`,
        latitude: lat,
        longitude: lng,
        district: "",
        state: "",
        pincode: "",
      };

      setSelectedLocation(fallbackLocation);

      setDetails((prev) => ({
        ...prev,
        location: fallbackLocation.address_name,
      }));
    } finally {
      setResolvingAddress(false);
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    setCapturingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGpsAccuracy(pos.coords.accuracy);
        await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setCapturingLocation(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          alert("Please allow location permission");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          alert("Location information is unavailable");
        } else if (error.code === error.TIMEOUT) {
          alert("Location request timed out. Please try again.");
        } else {
          alert("Unable to capture location");
        }
        setCapturingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const handleMapLocationConfirm = (loc) => {
    setSelectedLocation(loc);
    setDetails((prev) => ({
      ...prev,
      location: loc.address_name || prev.location,
    }));
    setShowMapPicker(false);
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [firstDay, daysInMonth, year, month]);

  const formatDate = (date) => date.toLocaleDateString("en-CA");

  const handleDateSelect = (date) => {
    if (!date) return;

    const iso = formatDate(date);
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);

    if (normalized < minBookingDate) return;
    if (blockedDates.includes(iso)) return;

    setDetails((prev) => ({
      ...prev,
      selectedDate: iso,
      selectedTime: "",
    }));
  };

  const generateSlots = () => {
    const slots = [];
    let hour = 6;
    let minute = 0;

    while (hour < 18) {
      const h = hour.toString().padStart(2, "0");
      const m = minute.toString().padStart(2, "0");
      slots.push(`${h}:${m}`);

      minute += 30;
      if (minute === 60) {
        minute = 0;
        hour++;
      }
    }

    return slots;
  };

  const timeSlots = generateSlots();

  const selectedPricing = details.pricingId
    ? pricingMap[String(details.pricingId)]
    : null;

  const selectedRate = Number(selectedPricing?.final_rate || 0);
  const selectedBaseRate = Number(selectedPricing?.base_rate || 0);
  const selectedPlatformFee = Number(selectedPricing?.platform_fee || 0);
  const areaValue = parseFloat(details.areaSize || 0);

  const totalPrice =
    details.pricingId && details.areaSize ? areaValue * selectedRate : 0;

  const handleAreaSizeChange = (e) => {
    const value = e.target.value;

    if (/^\d*\.?\d*$/.test(value)) {
      setDetails((prev) => ({
        ...prev,
        areaSize: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!details.selectedDate || !details.selectedTime) {
      alert("Please select date and time");
      return;
    }

    if (!details.pricingId) {
      alert("Please select crop type");
      return;
    }

    if (!selectedPricing) {
      alert("Pricing not configured for selected crop");
      return;
    }

    if (!details.areaSize || Number(details.areaSize) <= 0) {
      alert("Please enter valid acres");
      return;
    }

    if (!details.location.trim()) {
      alert("Please enter or select service location");
      return;
    }

    const selectedDateObj = new Date(details.selectedDate);
    selectedDateObj.setHours(0, 0, 0, 0);

    if (selectedDateObj < minBookingDate) {
      alert("Minimum 1-day advance required");
      return;
    }

    if (blockedDates.includes(details.selectedDate)) {
      alert("Provider not available on this date");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const scheduledISO = new Date(
      `${details.selectedDate}T${details.selectedTime}:00`
    ).toISOString();

    try {
      setLoading(true);

      const bookingPayload = {
        provider_id: providerId,
        service_type: "Agency Request From Admin",
        equipment_option: details.cropTypeName || "Crop Based Booking",
        area_size: parseFloat(details.areaSize),
        scheduled_at: scheduledISO,
        status: "requested",
        total_price: totalPrice,
        booking_source: "admin",
        agency_name: details.agencyName,
        created_by_admin: user?.id,
        address_line: details.location,
        contact_phone: details.contactPhone,
        crop_type: details.cropTypeName,
        liquid_type: null,
        payment_status: "pending",
        notes: details.notes || null,
        contact_person_name: details.contactPerson || null,
        latitude:
          typeof selectedLocation?.latitude === "number"
            ? selectedLocation.latitude
            : null,
        longitude:
          typeof selectedLocation?.longitude === "number"
            ? selectedLocation.longitude
            : null,
      };

      const { error } = await supabase.from("bookings").insert(bookingPayload);

      if (error) {
        alert(error.message);
        return;
      }

      alert("Admin agency booking request created successfully");
      navigate("/bookings");
    } catch (err) {
      console.error(err);
      alert("Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <MapPickerModal
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={handleMapLocationConfirm}
        initialLocation={selectedLocation}
      />

      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 bg-gray-50 min-h-screen">
        <button
          onClick={() => navigate(-1)}
          className="text-sm font-bold text-green-600"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold text-gray-900">
          Create Admin Agency Booking
        </h1>

        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex flex-col md:flex-row gap-5">
            <div className="shrink-0">
              {provider.profile_photo_url ? (
                <img
                  src={provider.profile_photo_url}
                  alt={provider.full_name}
                  className="w-24 h-24 rounded-2xl object-cover border"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gray-200 border flex items-center justify-center text-sm text-gray-500">
                  No Photo
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <User size={16} className="text-gray-500" />
                <p className="font-bold text-xl">{provider.full_name}</p>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin size={14} />
                {[
                  provider.mandal_name || provider.mandal,
                  provider.district,
                  provider.state,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </div>

              <p className="text-sm text-gray-600">
                <strong>Phone:</strong>{" "}
                {provider.contact_phone || provider.phone_number || "N/A"}
              </p>

              <p className="text-sm text-gray-600">
                <strong>RPC Category:</strong> {provider.rpc_category || "N/A"}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays size={20} className="text-slate-700" />
              <h2 className="text-xl font-bold">Select Date</h2>
            </div>

            <div className="flex justify-between items-center mb-4">
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(year, month - 1))}
                className="p-2 rounded-lg border hover:bg-gray-50"
              >
                <ChevronLeft size={18} />
              </button>

              <h3 className="font-bold text-lg">
                {currentMonth.toLocaleString("default", { month: "long" })} {year}
              </h3>

              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(year, month + 1))}
                className="p-2 rounded-lg border hover:bg-gray-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-sm">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="font-bold text-gray-500 py-2">
                  {day}
                </div>
              ))}

              {calendarDays.map((date, i) => {
                if (!date) return <div key={i}></div>;

                const iso = formatDate(date);
                const normalized = new Date(date);
                normalized.setHours(0, 0, 0, 0);

                const isBlocked =
                  normalized < minBookingDate || blockedDates.includes(iso);

                const isSelected = details.selectedDate === iso;

                return (
                  <div
                    key={i}
                    onClick={() => handleDateSelect(date)}
                    className={`p-3 rounded-xl text-sm font-medium ${
                      isBlocked
                        ? "bg-red-400 text-white cursor-not-allowed"
                        : "cursor-pointer"
                    } ${isSelected ? "bg-green-600 text-white" : ""} ${
                      !isBlocked && !isSelected
                        ? "bg-gray-100 hover:bg-green-100"
                        : ""
                    }`}
                  >
                    {date.getDate()}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-red-400 inline-block"></span>
                Unavailable
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-green-600 inline-block"></span>
                Selected
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-gray-100 border inline-block"></span>
                Available
              </div>
            </div>
          </div>

          {details.selectedDate && (
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">Select Time</h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {timeSlots.map((slot, index) => {
                  const isSelected = details.selectedTime === slot;

                  return (
                    <div
                      key={index}
                      onClick={() =>
                        setDetails((prev) => ({ ...prev, selectedTime: slot }))
                      }
                      className={`p-3 rounded-xl text-center cursor-pointer text-sm font-medium ${
                        isSelected
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 hover:bg-green-100"
                      }`}
                    >
                      {slot}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-5">
            <h2 className="text-xl font-bold">Booking Details</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Crop Type
                </label>
                <select
                  required
                  disabled={pricingLoading || pricingOptions.length === 0}
                  className="w-full border p-3 rounded-xl disabled:bg-gray-100 disabled:text-gray-500"
                  value={details.pricingId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const pricing = pricingOptions.find(
                      (item) => String(item.id) === String(selectedId)
                    );

                    setDetails((prev) => ({
                      ...prev,
                      pricingId: selectedId,
                      cropTypeName: pricing?.crop_name || "",
                    }));
                  }}
                >
                  <option value="">
                    {pricingLoading
                      ? "Loading crop types..."
                      : pricingOptions.length === 0
                      ? "No crop pricing available"
                      : "Select Crop Type"}
                  </option>
                  {pricingOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.crop_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Area Size (Acres)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="Enter acres"
                  className="w-full border p-3 rounded-xl"
                  value={details.areaSize}
                  onChange={handleAreaSizeChange}
                  onWheel={(e) => e.target.blur()}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Agency Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Agency Name"
                  className="w-full border p-3 rounded-xl"
                  value={details.agencyName}
                  onChange={(e) =>
                    setDetails({ ...details, agencyName: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Contact Person
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contact Person"
                  className="w-full border p-3 rounded-xl"
                  value={details.contactPerson}
                  onChange={(e) =>
                    setDetails({ ...details, contactPerson: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  required
                  pattern="[0-9]{10}"
                  placeholder="Contact Phone"
                  className="w-full border p-3 rounded-xl"
                  value={details.contactPhone}
                  onChange={(e) =>
                    setDetails({ ...details, contactPhone: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <LocationSelectionSection
                  openMapPicker={() => setShowMapPicker(true)}
                  captureLocation={captureLocation}
                  capturingLocation={capturingLocation}
                  resolvingAddress={resolvingAddress}
                  selectedLocation={selectedLocation}
                  gpsAccuracy={gpsAccuracy}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">
                  Service Location
                </label>
                <input
                  type="text"
                  required
                  placeholder="Service Location"
                  className="w-full border p-3 rounded-xl"
                  value={details.location}
                  onChange={(e) =>
                    setDetails({ ...details, location: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Special Instructions
              </label>
              <textarea
                placeholder="Special Instructions"
                className="w-full border p-3 rounded-xl min-h-[120px]"
                value={details.notes}
                onChange={(e) =>
                  setDetails({ ...details, notes: e.target.value })
                }
              />
            </div>
          </div>

          <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
            <div className="flex items-center gap-2 mb-4">
              <Tractor size={18} className="text-green-700" />
              <h3 className="font-bold text-lg text-green-800">
                Crop Based Pricing
              </h3>
            </div>

            {!details.pricingId ? (
              <p className="text-sm text-gray-600">
                Select a crop type to view pricing.
              </p>
            ) : !selectedPricing ? (
              <p className="text-sm text-red-600">
                Pricing is not configured for the selected crop.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white rounded-xl p-4 border">
                    <p className="text-gray-500">Base Rate / Acre</p>
                    <p className="font-bold text-lg">₹ {selectedBaseRate}</p>
                  </div>

                  <div className="bg-white rounded-xl p-4 border">
                    <p className="text-gray-500">Platform Fee / Acre</p>
                    <p className="font-bold text-lg">₹ {selectedPlatformFee}</p>
                  </div>

                  <div className="bg-white rounded-xl p-4 border">
                    <p className="text-gray-500">Final Rate / Acre</p>
                    <p className="font-bold text-lg text-green-700">
                      ₹ {selectedRate}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 border flex justify-between items-center">
                  <div>
                    <p className="text-gray-500 text-sm">
                      Total Cost ({details.areaSize || 0} acres)
                    </p>
                    <p className="text-xs text-gray-500">Final Rate × Acres</p>
                  </div>

                  <div className="text-2xl font-bold text-green-700">
                    ₹ {totalPrice ? totalPrice.toFixed(2) : "0.00"}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            disabled={loading || pricingLoading || pricingOptions.length === 0}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold disabled:opacity-60"
          >
            {loading ? "Creating Booking..." : "Confirm & Create Booking"}
          </button>
        </form>
      </div>
    </>
  );
}