import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  Menu,
  X,
  Eye,
  Tractor,
  MapPin,
  CalendarDays,
  Sprout,
  ShieldCheck,
  UserCheck,
  CheckCheck,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const BOOKINGS_TABLE = "bookings";
const PROVIDERS_TABLE = "providers";
const PROVIDER_DRONES_TABLE = "provider_drones";

const LS_SHOWN_BOOKINGS = "admin_shown_booking_popup_ids_v3";
const LS_SHOWN_PROVIDER_EVENTS = "admin_shown_provider_popup_event_keys_v4";
// Tracks popup keys that admin has SEEN and dismissed — persists across sessions
const LS_DISMISSED_POPUPS = "admin_dismissed_popup_keys_v1";

export default function AdminTopbar({ sidebarOpen, setSidebarOpen, session }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState([]);
  const [modalQueue, setModalQueue] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [loading, setLoading] = useState(false);

  const [debugInfo, setDebugInfo] = useState({
    lastCheckAt: null,
    providerRows: 0,
    droneRows: 0,
    bookingRows: 0,
    providerError: "",
    droneError: "",
    bookingError: "",
    lastTriggered: "",
  });

  const pollingRef = useRef(null);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const activeModalRef = useRef(null);
  // In-memory set to avoid duplicates within a single render cycle
  const activeKeysRef = useRef(new Set());
  // Track when this admin session started so we don't popup for pre-existing bookings
  const sessionStartRef = useRef(new Date().toISOString());

  useEffect(() => {
    activeModalRef.current = activeModal;
  }, [activeModal]);

  const getPageTitle = () => {
    if (location.pathname.includes("dashboard")) return "Admin Dashboard";
    if (location.pathname.includes("dispatch")) return "Dispatch Management";
    if (location.pathname.includes("bookings")) return "Booking Management";
    if (location.pathname.includes("vendors")) return "Vendor Management";
    if (location.pathname.includes("providers")) return "Provider Management";
    if (location.pathname.includes("pricing")) return "Pricing Control";
    if (location.pathname.includes("settlements")) return "Settlements";
    if (location.pathname.includes("settings")) return "Platform Settings";
    return "Admin Panel";
  };

  const unreadCount = useMemo(
    () => liveNotifications.filter((item) => !item.is_read).length,
    [liveNotifications]
  );

  const formatDateTime = (value) => {
    if (!value) return "Not available";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  const readJsonArray = (key) => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeJsonArray = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`Failed writing ${key}`, err);
    }
  };

  const getShownBookingIds = () => new Set(readJsonArray(LS_SHOWN_BOOKINGS));
  const getShownProviderEvents = () =>
    new Set(readJsonArray(LS_SHOWN_PROVIDER_EVENTS));

  // Returns the set of popup keys that admin has already seen & dismissed
  const getDismissedPopups = () => new Set(readJsonArray(LS_DISMISSED_POPUPS));

  // Call this when admin dismisses a popup modal so it never shows again
  const markPopupDismissed = (popupKey) => {
    if (!popupKey) return;
    const current = readJsonArray(LS_DISMISSED_POPUPS);
    if (!current.includes(popupKey)) {
      writeJsonArray(LS_DISMISSED_POPUPS, [...current, popupKey].slice(-5000));
    }
  };

  const markBookingShown = (id) => {
    if (!id) return;
    const current = readJsonArray(LS_SHOWN_BOOKINGS);
    if (!current.includes(id)) {
      writeJsonArray(LS_SHOWN_BOOKINGS, [...current, id].slice(-2000));
    }
  };

  const markProviderEventShown = (eventKey) => {
    if (!eventKey) return;
    const current = readJsonArray(LS_SHOWN_PROVIDER_EVENTS);
    if (!current.includes(eventKey)) {
      writeJsonArray(LS_SHOWN_PROVIDER_EVENTS, [...current, eventKey].slice(-3000));
    }
  };

  const addLiveNotification = (notificationData) => {
    setLiveNotifications((prev) => {
      const exists = prev.some((item) => item.unique_key === notificationData.unique_key);
      if (exists) return prev;

      const next = [notificationData, ...prev];
      next.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return next.slice(0, 100);
    });
  };

  const addToModalQueue = (notificationData) => {
    if (!notificationData?.unique_key) return;

    setModalQueue((prev) => {
      const alreadyQueued = prev.some((item) => item.unique_key === notificationData.unique_key);
      const alreadyActive =
        activeModalRef.current?.unique_key === notificationData.unique_key;

      if (alreadyQueued || alreadyActive) return prev;
      return [...prev, notificationData];
    });
  };

  // Only fire when the provider has actually submitted verification data (not just registered)
  const providerHasVerificationData = (row) => {
    if (!row) return false;
    return Boolean(
      row.aadhaar_name ||
      row.aadhar_number ||
      row.pan_number ||
      row.rpc_number ||
      row.rpc_url ||
      row.pilot_photo_url ||
      row.aadhar_url ||
      row.pan_url ||
      row.bank_url ||
      row.bank_name ||
      row.account_number ||
      row.ifsc_code ||
      row.account_holder_name ||
      row.permanent_address
    );
  };

  // Build a fingerprint from actual verification fields so the event key changes
  // whenever ANY field is filled in — even if updated_at doesn't change in the DB.
  const getProviderFingerprint = (row) => {
    return [
      row.verification_status || "",
      row.aadhaar_name     ? "1" : "0",
      row.aadhar_number    ? "1" : "0",
      row.pan_number       ? "1" : "0",
      row.rpc_number       ? "1" : "0",
      row.rpc_url          ? "1" : "0",
      row.pilot_photo_url  ? "1" : "0",
      row.aadhar_url       ? "1" : "0",
      row.pan_url          ? "1" : "0",
      row.bank_url         ? "1" : "0",
      row.account_number   ? "1" : "0",
      row.updated_at || row.created_at || "",
    ].join(":");
  };

  const createBookingNotification = (row) => ({
    unique_key: `booking-${row.id}`,
    event_key: `booking-${row.id}`,
    id: row.id,
    notification_type: "booking",
    title: "New Booking Request",
    subtitle: "Village Drone Alert",
    service_name: row.service_type || "Drone Service",
    crop_type: row.crop_type || "Not specified",
    area_size: row.area_size || "Not specified",
    district: row.district || "Not specified",
    scheduled_at: row.scheduled_at || null,
    total_price: row.total_price || null,
    provider_id: row.provider_id || null,
    booking_id: row.id,
    created_at: row.created_at || new Date().toISOString(),
    is_read: false,
    message: "A farmer has submitted a new booking request.",
    icon_type: "booking",
  });

  const createProviderNotification = (row, fingerprintKey) => {
    const versionTime = row.updated_at || row.created_at || new Date().toISOString();
    // Use fingerprintKey as unique_key so a new verification submission always
    // gets a distinct key that hasn't been dismissed before
    const uniqueKey = fingerprintKey || `provider-${row.id}-${versionTime}`;

    return {
      unique_key: uniqueKey,
      event_key: uniqueKey,
      id: row.id,
      notification_type: "provider_verification",
      title: "New Provider Verification",
      subtitle: "Village Drone Alert",
      service_name: "Provider Verification",
      crop_type: "",
      area_size: "",
      district: row.district || "Not specified",
      scheduled_at: versionTime,
      total_price: null,
      provider_id: row.id,
      booking_id: null,
      created_at: versionTime,
      is_read: false,
      message: `${row.full_name || "A provider"} submitted verification form.`,
      provider_name: row.full_name || "Not specified",
      icon_type: "provider",
    };
  };

  const fetchProviderDetails = async (providerId) => {
    const { data, error } = await supabase
      .from(PROVIDERS_TABLE)
      .select(`
        id,
        full_name,
        district,
        verification_status,
        aadhaar_name,
        permanent_address,
        aadhar_number,
        pan_number,
        rpc_number,
        rpc_url,
        pilot_photo_url,
        aadhar_url,
        pan_url,
        bank_url,
        bank_name,
        account_number,
        ifsc_code,
        account_holder_name,
        created_at,
        updated_at
      `)
      .eq("id", providerId)
      .single();

    if (error) {
      console.error("fetchProviderDetails error:", error);
      return null;
    }

    return data;
  };

  // showPopup=true  → add to bell AND show modal (unless already dismissed by admin)
  // showPopup=false → add to bell as already-read (no modal)
  const pushNotification = (notification, showPopup = true) => {
    if (!notification?.unique_key) return;
    // Guard against duplicates within a single polling cycle
    if (activeKeysRef.current.has(notification.unique_key)) return;
    activeKeysRef.current.add(notification.unique_key);

    // Check persistent dismissed set — if admin already saw this exact popup, don't re-show modal
    const dismissed = getDismissedPopups();
    const alreadyDismissed = dismissed.has(notification.unique_key);

    // Show popup only if showPopup requested AND admin hasn't dismissed it before
    const shouldPopup = showPopup && !alreadyDismissed;

    const notif = shouldPopup ? notification : { ...notification, is_read: true };
    addLiveNotification(notif);
    if (shouldPopup) addToModalQueue(notification);

    setDebugInfo((prev) => ({
      ...prev,
      lastTriggered: `${notification.notification_type} - ${notification.unique_key}`,
    }));
  };

  const syncNotifications = async () => {
    try {
      setLoading(true);

      const shownBookingIds = getShownBookingIds();
      const shownProviderEvents = getShownProviderEvents();

      const [bookingsRes, providersRes, dronesRes] = await Promise.all([
        supabase
          .from(BOOKINGS_TABLE)
          .select(`
            id,
            provider_id,
            service_type,
            crop_type,
            area_size,
            district,
            scheduled_at,
            total_price,
            created_at
          `)
          .order("created_at", { ascending: false })
          .limit(50),

        supabase
          .from(PROVIDERS_TABLE)
          .select(`
            id,
            full_name,
            district,
            verification_status,
            aadhaar_name,
            permanent_address,
            aadhar_number,
            pan_number,
            rpc_number,
            rpc_url,
            pilot_photo_url,
            aadhar_url,
            pan_url,
            bank_url,
            bank_name,
            account_number,
            ifsc_code,
            account_holder_name,
            created_at,
            updated_at
          `)
          .order("updated_at", { ascending: false })
          .limit(50),

        supabase
          .from(PROVIDER_DRONES_TABLE)
          .select(`
            id,
            provider_id,
            created_at,
            updated_at
          `)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      setDebugInfo((prev) => ({
        ...prev,
        lastCheckAt: new Date().toISOString(),
        providerRows: providersRes.data?.length || 0,
        droneRows: dronesRes.data?.length || 0,
        bookingRows: bookingsRes.data?.length || 0,
        providerError: providersRes.error?.message || "",
        droneError: dronesRes.error?.message || "",
        bookingError: bookingsRes.error?.message || "",
      }));

      const sessionStart = new Date(sessionStartRef.current).getTime();

      // ── Booking notifications ────────────────────────────────────────
      if (!bookingsRes.error) {
        for (const row of bookingsRes.data || []) {
          if (!shownBookingIds.has(row.id)) {
            const notification = createBookingNotification(row);
            // Only show popup for bookings created AFTER this admin session started
            const isNew = new Date(row.created_at).getTime() >= sessionStart;
            pushNotification(notification, isNew);
            markBookingShown(row.id);
          }
        }
      }

      // ── Provider verification notifications ──────────────────────────
      // Provider popups are shown whenever a NEW fingerprint is detected,
      // meaning provider submitted or updated verification data.
      // "Shown" (LS_SHOWN_PROVIDER_EVENTS) means we detected this version.
      // "Dismissed" (LS_DISMISSED_POPUPS) means admin already saw the modal.
      if (!providersRes.error) {
        for (const row of providersRes.data || []) {
          // Skip providers who haven't submitted ANY verification data yet
          if (!providerHasVerificationData(row)) continue;

          // Fingerprint changes whenever any verification field is filled/changed
          const fingerprint = getProviderFingerprint(row);
          const eventKey = `provider-${row.id}-${fingerprint}`;

          if (!shownProviderEvents.has(eventKey)) {
            // Pass eventKey as the unique key so it matches exactly
            const notification = createProviderNotification(row, eventKey);
            // Always show popup — provider verification needs admin action
            // pushNotification will skip modal if admin already dismissed this key
            pushNotification(notification, true);
            // Mark as detected so subsequent polls don't re-queue it
            markProviderEventShown(eventKey);
          }
        }
      }

      // ── Drone-insert provider notifications ──────────────────────────
      if (!dronesRes.error) {
        for (const drone of dronesRes.data || []) {
          const insertKey = `provider-${drone.provider_id}-drone-insert-${drone.id}`;
          if (!shownProviderEvents.has(insertKey)) {
            const provider = await fetchProviderDetails(drone.provider_id);
            if (provider && providerHasVerificationData(provider)) {
              const notification = createProviderNotification(
                provider,
                insertKey
              );
              // Always show popup for drone registrations too
              pushNotification(notification, true);
              markProviderEventShown(insertKey);
            }
          }
        }
      }
    } catch (err) {
      console.error("syncNotifications fatal error:", err);
      setDebugInfo((prev) => ({
        ...prev,
        providerError: prev.providerError || err.message || "Unknown error",
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncNotifications();

    pollingRef.current = window.setInterval(() => {
      syncNotifications();
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    if (!activeModal && modalQueue.length > 0) {
      setActiveModal(modalQueue[0]);
      setModalQueue((prev) => prev.slice(1));
    }
  }, [modalQueue, activeModal]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsReadLocally = (uniqueKey) => {
    setLiveNotifications((prev) =>
      prev.map((item) =>
        item.unique_key === uniqueKey ? { ...item, is_read: true } : item
      )
    );
  };

  const markAllAsRead = () => {
    setLiveNotifications((prev) =>
      prev.map((item) => ({ ...item, is_read: true }))
    );
  };

  const closeModal = () => {
    if (!activeModal) return;
    markAsReadLocally(activeModal.unique_key);
    // Persist that admin has seen & dismissed this popup so it never re-appears
    markPopupDismissed(activeModal.unique_key);
    setActiveModal(null);
  };

  const handleView = (notificationArg) => {
    const current = notificationArg || activeModal;
    if (!current) return;

    markAsReadLocally(current.unique_key);
    // Persist dismissal so popup never re-appears even after page reload
    markPopupDismissed(current.unique_key);

    if (activeModal?.unique_key === current.unique_key) {
      setActiveModal(null);
    }

    setNotificationOpen(false);

    if (current.notification_type === "booking" && current.booking_id) {
      navigate(`/bookings?booking=${current.booking_id}`);
      return;
    }

    if (
      current.notification_type === "provider_verification" &&
      current.provider_id
    ) {
      navigate(`/providers?provider=${current.provider_id}`);
      return;
    }

    navigate("/dashboard");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const adminEmail = session?.user?.email || "";
  const adminInitial = adminEmail ? adminEmail[0].toUpperCase() : "A";

  return (
    <>
      <div className="h-16 bg-white shadow-sm flex items-center justify-between px-6 border-b sticky top-0 z-40">
        <div className="flex items-center gap-4 min-w-0">
          <button
            className="text-slate-700"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            type="button"
          >
            <Menu size={22} />
          </button>

          <h2 className="text-lg font-semibold text-slate-800 truncate">
            {getPageTitle()}
          </h2>
        </div>

        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={syncNotifications}
            className="hidden sm:inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-full text-sm font-medium shadow-sm"
          >
            <RefreshCw size={14} />
            Refresh
          </button>

          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => setNotificationOpen((prev) => !prev)}
              className="relative"
            >
              <Bell size={22} className="text-slate-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full animate-pulse">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="absolute right-0 mt-3 w-[420px] max-w-[95vw] bg-white shadow-xl rounded-2xl border z-50 overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Notifications
                    </p>
                    <p className="text-xs text-slate-500">
                      Bookings and provider verification alerts
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-xs px-3 py-1.5 rounded-lg border text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1"
                  >
                    <CheckCheck size={14} />
                    Read all
                  </button>
                </div>

                <div className="border-b bg-amber-50 px-4 py-3 text-xs text-slate-700">
                  <div className="flex items-center gap-2 font-semibold mb-2">
                    <AlertCircle size={14} />
                    Debug Status
                  </div>
                  <div>Last check: {formatDateTime(debugInfo.lastCheckAt)}</div>
                  <div>Providers fetched: {debugInfo.providerRows}</div>
                  <div>Provider drones fetched: {debugInfo.droneRows}</div>
                  <div>Bookings fetched: {debugInfo.bookingRows}</div>
                  <div>Last triggered: {debugInfo.lastTriggered || "-"}</div>
                  {debugInfo.providerError && (
                    <div className="text-red-600 mt-1">Providers error: {debugInfo.providerError}</div>
                  )}
                  {debugInfo.droneError && (
                    <div className="text-red-600 mt-1">Drones error: {debugInfo.droneError}</div>
                  )}
                  {debugInfo.bookingError && (
                    <div className="text-red-600 mt-1">Bookings error: {debugInfo.bookingError}</div>
                  )}
                </div>

                <div className="max-h-[420px] overflow-y-auto">
                  {loading && liveNotifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                      Loading notifications...
                    </div>
                  ) : liveNotifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                      No notifications yet.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {liveNotifications.map((item) => (
                        <button
                          key={item.unique_key}
                          type="button"
                          onClick={() => handleView(item)}
                          className={`w-full text-left px-4 py-4 hover:bg-slate-50 transition ${
                            !item.is_read ? "bg-blue-50/40" : "bg-white"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 w-10 h-10 rounded-full flex items-center justify-center ${
                                item.notification_type === "provider_verification"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {item.notification_type === "provider_verification" ? (
                                <ShieldCheck size={18} />
                              ) : (
                                <Tractor size={18} />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {item.title}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {formatDateTime(item.created_at)}
                                  </p>
                                </div>

                                {!item.is_read && (
                                  <span className="mt-1 w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                                )}
                              </div>

                              <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                                {item.message}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <div
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {adminInitial}
              </div>
              <ChevronDown size={18} className="text-slate-600" />
            </div>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white shadow-lg rounded-xl py-2 border z-50">
                <div className="px-4 py-2 border-b">
                  <p className="text-xs text-gray-400">Signed in as</p>
                  <p className="text-sm font-medium text-slate-700 break-all">
                    {adminEmail || "Unknown"}
                  </p>
                </div>

                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  onClick={() => setProfileOpen(false)}
                >
                  Profile
                </button>

                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-xl rounded-[30px] overflow-hidden shadow-[0_20px_70px_rgba(0,0,0,0.35)] border border-white/20 bg-white animate-[popupZoom_0.25s_ease-out]">
            <div className="relative bg-gradient-to-r from-[#0b1f4d] via-[#12326b] to-[#1f8f4d] px-6 py-5">
              <button
                type="button"
                onClick={closeModal}
                className="absolute top-4 right-4 w-10 h-10 rounded-full border border-white/25 bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 pr-12">
                <div className="w-12 h-12 rounded-full bg-white/15 border border-white/20 flex items-center justify-center">
                  {activeModal.icon_type === "provider" ? (
                    <ShieldCheck className="text-white" size={24} />
                  ) : (
                    <Tractor className="text-white" size={24} />
                  )}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/70 font-semibold">
                    {activeModal.subtitle}
                  </p>
                  <h3 className="text-2xl font-bold text-white mt-1">
                    {activeModal.title}
                  </h3>
                </div>
              </div>
            </div>

            <div className="bg-white px-6 py-6">
              {activeModal.notification_type === "booking" ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <Tractor size={16} />
                        <p className="text-xs font-semibold uppercase tracking-wide">
                          Service
                        </p>
                      </div>
                      <p className="text-base font-semibold text-slate-800 mt-2">
                        {activeModal.service_name || "Drone Service"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-lime-100 bg-lime-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-lime-700">
                        <Sprout size={16} />
                        <p className="text-xs font-semibold uppercase tracking-wide">
                          Crop
                        </p>
                      </div>
                      <p className="text-base font-semibold text-slate-800 mt-2">
                        {activeModal.crop_type || "Not specified"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-sky-700">
                        <MapPin size={16} />
                        <p className="text-xs font-semibold uppercase tracking-wide">
                          Location
                        </p>
                      </div>
                      <p className="text-base font-semibold text-slate-800 mt-2">
                        {activeModal.district || "Not specified"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-amber-700">
                        <CalendarDays size={16} />
                        <p className="text-xs font-semibold uppercase tracking-wide">
                          Schedule
                        </p>
                      </div>
                      <p className="text-base font-semibold text-slate-800 mt-2">
                        {formatDateTime(activeModal.scheduled_at)}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <UserCheck size={16} />
                        <p className="text-xs font-semibold uppercase tracking-wide">
                          Provider Name
                        </p>
                      </div>
                      <p className="text-base font-semibold text-slate-800 mt-2">
                        {activeModal.provider_name || "Not specified"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-indigo-700">
                        <ShieldCheck size={16} />
                        <p className="text-xs font-semibold uppercase tracking-wide">
                          Request Type
                        </p>
                      </div>
                      <p className="text-base font-semibold text-slate-800 mt-2">
                        Provider Verification
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-sm text-slate-700 mt-2 leading-6">
                      {activeModal.message}
                    </p>
                  </div>
                </>
              )}

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => handleView()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-semibold hover:opacity-95 transition inline-flex items-center gap-2 shadow-md"
                >
                  <Eye size={16} />
                  {activeModal.notification_type === "booking"
                    ? "View Booking"
                    : "View Provider"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes popupZoom {
          0% {
            opacity: 0;
            transform: scale(0.92) translateY(18px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </>
  );
}