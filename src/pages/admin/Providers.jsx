import React, { useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  ShieldOff,
  RotateCcw,
  Eye,
  Download,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

/* ================= DOCUMENT CARD ================= */

function DocumentCard({ title, url }) {
  if (!url) return null;

  const lowerUrl = String(url).toLowerCase();
  const isImage =
    lowerUrl.includes(".png") ||
    lowerUrl.includes(".jpg") ||
    lowerUrl.includes(".jpeg") ||
    lowerUrl.includes(".webp");

  return (
    <div className="border rounded-xl p-3 bg-gray-50">
      <p className="text-xs font-semibold mb-2">{title}</p>

      {isImage ? (
        <img
          src={url}
          alt={title}
          className="rounded-lg border mb-2 h-32 object-cover w-full"
        />
      ) : (
        <div className="rounded-lg border mb-2 h-32 flex items-center justify-center text-sm text-gray-500 bg-white">
          Preview not available
        </div>
      )}

      <a
        href={url}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1 text-xs bg-green-600 text-white py-1 rounded"
      >
        <Download size={14} /> Download
      </a>
    </div>
  );
}

/* ================= MAIN PAGE ================= */

export default function Providers() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("pending");
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [selectedProvider, setSelectedProvider] = useState(null);

  const [servicesModal, setServicesModal] = useState(false);
  const [serviceProviderDetails, setServiceProviderDetails] = useState(null);
  const [providerDrones, setProviderDrones] = useState([]);

  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingProviderId, setRejectingProviderId] = useState(null);

  const [stateFilter, setStateFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [mandalFilter, setMandalFilter] = useState("");

  useEffect(() => {
    fetchProviders();
  }, []);

  async function fetchProviders() {
    setLoading(true);

    const { data, error } = await supabase
      .from("providers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      setProviders([]);
    } else {
      setProviders(data || []);
    }

    setLoading(false);
  }

  async function fetchProviderServices(providerId, providerRow = null) {
    try {
      if (!providerId) {
        toast.error("Provider id missing");
        return;
      }

      setDetailsLoading(true);

      const [providerRes, dronesRes] = await Promise.all([
        supabase
          .from("providers")
          .select(`
            id,
            full_name,
            contact_phone,
            phone_number,
            aadhaar_name,
            permanent_address,
            landmark,
            state,
            district,
            mandal,
            aadhar_number,
            pan_number,
            rpc_number,
            rpc_institute,
            rpc_category,
            rpc_issue_date,
            rpc_expiry_date,
            rpc_url,
            pilot_photo_url,
            bank_name,
            account_holder_name,
            account_number,
            ifsc_code,
            aadhar_url,
            pan_url,
            bank_url,
            profile_photo_url,
            verification_status,
            rejection_reason
          `)
          .eq("id", providerId)
          .maybeSingle(),

        supabase
          .from("provider_drones")
          .select("*")
          .eq("provider_id", providerId)
          .order("created_at", { ascending: true }),
      ]);

      if (providerRes.error) {
        console.error("providers details error:", providerRes.error);
      }

      if (dronesRes.error) {
        console.error("provider_drones error:", dronesRes.error);
        toast.error(dronesRes.error.message || "Failed to load drones");
      }

      setServiceProviderDetails(providerRes.data || providerRow || null);
      setProviderDrones(dronesRes.data || []);
      setServicesModal(true);

      if (!providerRes.data && !providerRow && !dronesRes.data?.length) {
        toast("No additional details found for this provider");
      }
    } catch (err) {
      console.error("fetchProviderServices error:", err);
      toast.error(err?.message || "Failed to load provider details");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function updateStatus(id, status, reason = null) {
    if (status === "rejected" && !reason) {
      toast.error("Rejection reason required");
      return;
    }

    const { error } = await supabase
      .from("providers")
      .update({
        verification_status: status,
        rejection_reason: reason,
      })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Provider ${status}`);
    fetchProviders();

    if (selectedProvider?.id === id) {
      setSelectedProvider((prev) =>
        prev
          ? {
              ...prev,
              verification_status: status,
              rejection_reason: reason,
            }
          : null
      );
    }

    if (serviceProviderDetails?.id === id) {
      setServiceProviderDetails((prev) =>
        prev
          ? {
              ...prev,
              verification_status: status,
              rejection_reason: reason,
            }
          : null
      );
    }

    setRejectModal(false);
    setRejectReason("");
    setRejectingProviderId(null);
  }

  let filteredProviders =
    activeTab === "all"
      ? providers
      : providers.filter((p) => p.verification_status === activeTab);

  if (stateFilter) {
    filteredProviders = filteredProviders.filter((p) => p.state === stateFilter);
  }

  if (districtFilter) {
    filteredProviders = filteredProviders.filter(
      (p) => p.district === districtFilter
    );
  }

  if (mandalFilter) {
    filteredProviders = filteredProviders.filter((p) => p.mandal === mandalFilter);
  }

  const getStatusStyle = (status) => {
    if (status === "approved") return "bg-green-100 text-green-700";
    if (status === "pending") return "bg-yellow-100 text-yellow-700";
    if (status === "rejected") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-600";
  };

  const states = [...new Set(providers.map((p) => p.state).filter(Boolean))];
  const districts = [...new Set(providers.map((p) => p.district).filter(Boolean))];
  const mandals = [...new Set(providers.map((p) => p.mandal).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 border rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4">
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All States</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={mandalFilter}
          onChange={(e) => setMandalFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Mandals</option>
          {mandals.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => {
            setStateFilter("");
            setDistrictFilter("");
            setMandalFilter("");
          }}
          className="bg-gray-900 text-white rounded-lg px-4"
        >
          Reset Filters
        </button>
      </div>

      <div className="flex gap-4 border-b pb-2 flex-wrap">
        {[
          { label: "Pending", value: "pending" },
          { label: "Verified", value: "approved" },
          { label: "Suspended", value: "rejected" },
          { label: "All", value: "all" },
        ].map((tab) => (
          <button
            type="button"
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${
              activeTab === tab.value ? "bg-green-600 text-white" : "bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="py-4 px-6">Photo</th>
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6">State</th>
                <th className="py-4 px-6">District</th>
                <th className="py-4 px-6">Phone</th>
                <th className="py-4 px-6">Services</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">View</th>
                <th className="py-4 px-6">Vendor Profile</th>
                <th className="py-4 px-6">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredProviders.length > 0 ? (
                filteredProviders.map((provider) => (
                  <tr key={provider.id} className="border-b">
                    <td className="py-4 px-6">
                      {provider.profile_photo_url ? (
                        <img
                          src={provider.profile_photo_url}
                          alt="profile"
                          className="w-12 h-12 rounded-full object-cover border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                          N/A
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-6">{provider.full_name || "-"}</td>
                    <td className="py-4 px-6">{provider.state || "-"}</td>
                    <td className="py-4 px-6">{provider.district || "-"}</td>

                    <td className="py-4 px-6">
                      {provider.contact_phone || provider.phone_number || "-"}
                    </td>

                    <td className="py-4 px-6">
                      <button
                        type="button"
                        onClick={() => fetchProviderServices(provider.id, provider)}
                        disabled={detailsLoading}
                        className="text-blue-600 underline text-xs disabled:opacity-50"
                      >
                        {detailsLoading ? "Loading..." : "View Services"}
                      </button>
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${getStatusStyle(
                          provider.verification_status
                        )}`}
                      >
                        {provider.verification_status || "pending"}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <button
                        type="button"
                        onClick={() => setSelectedProvider(provider)}
                        className="flex items-center gap-1 text-blue-600 text-xs"
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>

                    <td className="px-6 py-4">
                      {provider.verification_status === "approved" && (
                        <button
                          type="button"
                          onClick={() => navigate(`/vendors/${provider.id}`)}
                          className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold"
                        >
                          View Vendor
                        </button>
                      )}
                    </td>

                    <td className="py-4 px-6 flex gap-2 flex-wrap">
                      {provider.verification_status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => updateStatus(provider.id, "approved")}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                          >
                            <CheckCircle size={14} /> Approve
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRejectModal(true);
                              setRejectingProviderId(provider.id);
                            }}
                            className="bg-red-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </>
                      )}

                      {provider.verification_status === "approved" && (
                        <button
                          type="button"
                          onClick={() => {
                            setRejectModal(true);
                            setRejectingProviderId(provider.id);
                          }}
                          className="bg-red-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                        >
                          <ShieldOff size={14} /> Suspend
                        </button>
                      )}

                      {provider.verification_status === "rejected" && (
                        <button
                          type="button"
                          onClick={() => updateStatus(provider.id, "approved")}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                        >
                          <RotateCcw size={14} /> Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="py-10 text-center text-gray-500">
                    No providers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedProvider && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-6xl w-full rounded-2xl p-8 space-y-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-green-600">
              Provider Verification Details
            </h3>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <p>
                <strong>Name As Per Aadhaar:</strong>{" "}
                {selectedProvider.aadhaar_name || "-"}
              </p>
              <p>
                <strong>Phone:</strong>{" "}
                {selectedProvider.contact_phone ||
                  selectedProvider.phone_number ||
                  "-"}
              </p>
              <p>
                <strong>Address:</strong>{" "}
                {selectedProvider.permanent_address || "-"}
              </p>
              <p>
                <strong>Landmark:</strong> {selectedProvider.landmark || "-"}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <p>
                <strong>Aadhaar Number:</strong>{" "}
                {selectedProvider.aadhar_number || "-"}
              </p>
              <p>
                <strong>PAN Number:</strong> {selectedProvider.pan_number || "-"}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <p>
                <strong>RPC Number:</strong> {selectedProvider.rpc_number || "-"}
              </p>
              <p>
                <strong>RPC Institute:</strong>{" "}
                {selectedProvider.rpc_institute || "-"}
              </p>
              <p>
                <strong>RPC Category:</strong>{" "}
                {selectedProvider.rpc_category || "-"}
              </p>
              <p>
                <strong>RPC Issue Date:</strong>{" "}
                {selectedProvider.rpc_issue_date || "-"}
              </p>
              <p>
                <strong>RPC Expiry Date:</strong>{" "}
                {selectedProvider.rpc_expiry_date || "-"}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <p>
                <strong>Bank Name:</strong> {selectedProvider.bank_name || "-"}
              </p>
              <p>
                <strong>Account Holder:</strong>{" "}
                {selectedProvider.account_holder_name || "-"}
              </p>
              <p>
                <strong>Account Number:</strong>{" "}
                {selectedProvider.account_number || "-"}
              </p>
              <p>
                <strong>IFSC:</strong> {selectedProvider.ifsc_code || "-"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
              <DocumentCard title="Aadhaar" url={selectedProvider.aadhar_url} />
              <DocumentCard title="PAN" url={selectedProvider.pan_url} />
              <DocumentCard title="RPC" url={selectedProvider.rpc_url} />
              <DocumentCard
                title="Pilot Photo"
                url={selectedProvider.pilot_photo_url}
              />
              <DocumentCard title="Bank Proof" url={selectedProvider.bank_url} />
              <DocumentCard
                title="Profile Photo"
                url={selectedProvider.profile_photo_url}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                className="px-4 py-2 border rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {servicesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-7xl rounded-xl p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-green-600 mb-6">
              Provider Details + Step 2 Verification
            </h3>

            {serviceProviderDetails && (
              <div className="mb-8 border rounded-2xl p-6 bg-green-50">
                <h4 className="text-lg font-bold text-gray-800 mb-4">
                  RPC Certification Details
                </h4>

                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <p>
                    <strong>Provider Name:</strong>{" "}
                    {serviceProviderDetails.full_name || "-"}
                  </p>
                  <p>
                    <strong>Phone:</strong>{" "}
                    {serviceProviderDetails.contact_phone ||
                      serviceProviderDetails.phone_number ||
                      "-"}
                  </p>
                  <p>
                    <strong>RPC Number:</strong>{" "}
                    {serviceProviderDetails.rpc_number || "-"}
                  </p>
                  <p>
                    <strong>Institute:</strong>{" "}
                    {serviceProviderDetails.rpc_institute || "-"}
                  </p>
                  <p>
                    <strong>RPC Category:</strong>{" "}
                    {serviceProviderDetails.rpc_category || "-"}
                  </p>
                  <p>
                    <strong>Issue Date:</strong>{" "}
                    {serviceProviderDetails.rpc_issue_date || "-"}
                  </p>
                  <p>
                    <strong>Expiry Date:</strong>{" "}
                    {serviceProviderDetails.rpc_expiry_date || "-"}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    {serviceProviderDetails.verification_status || "-"}
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <DocumentCard
                    title="RPC Certificate"
                    url={serviceProviderDetails.rpc_url}
                  />
                  <DocumentCard
                    title="Pilot Photo"
                    url={serviceProviderDetails.pilot_photo_url}
                  />
                </div>
              </div>
            )}

            <div className="mb-8">
              <h4 className="text-lg font-bold text-gray-800 mb-4">
                Registered Drones
              </h4>

              {providerDrones.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No drones found for this provider.
                </p>
              ) : (
                <div className="space-y-6">
                  {providerDrones.map((drone, index) => (
                    <div
                      key={drone.id}
                      className="border rounded-2xl p-6 bg-gray-50"
                    >
                      <h5 className="font-bold text-gray-800 mb-4">
                        Drone #{index + 1}
                      </h5>

                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <p>
                          <strong>Brand:</strong> {drone.drone_brand || "-"}
                        </p>
                        <p>
                          <strong>Model:</strong> {drone.drone_model || "-"}
                        </p>
                        <p>
                          <strong>Category:</strong> {drone.drone_category || "-"}
                        </p>
                        <p>
                          <strong>UIN:</strong> {drone.drone_uin || "-"}
                        </p>
                        <p>
                          <strong>Tank Capacity:</strong> {drone.tank_capacity || "-"}
                        </p>
                        <p>
                          <strong>Battery Sets:</strong> {drone.battery_sets || "-"}
                        </p>
                        <p>
                          <strong>Battery Capacity:</strong>{" "}
                          {drone.battery_capacity || "-"}
                        </p>
                        <p>
                          <strong>Primary Usage:</strong> {drone.primary_usage || "-"}
                        </p>
                        <p>
                          <strong>Experience:</strong>{" "}
                          {drone.drone_experience || "-"}
                        </p>
                        <p>
                          <strong>Acres Sprayed:</strong> {drone.acres_sprayed || "-"}
                        </p>
                        <p>
                          <strong>Insurance Company:</strong>{" "}
                          {drone.insurance_company || "-"}
                        </p>
                        <p>
                          <strong>Insurance Policy Number:</strong>{" "}
                          {drone.insurance_policy_number || "-"}
                        </p>
                        <p>
                          <strong>Insurance Expiry:</strong>{" "}
                          {drone.insurance_expiry || "-"}
                        </p>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 mt-4">
                        <DocumentCard
                          title={`Drone ${index + 1} Registration`}
                          url={drone.drone_reg_url}
                        />
                        <DocumentCard
                          title={`Drone ${index + 1} Insurance`}
                          url={drone.insurance_url}
                        />
                        <DocumentCard
                          title={`Drone ${index + 1} Photo`}
                          url={drone.drone_photo_url}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  setServicesModal(false);
                  setServiceProviderDetails(null);
                  setProviderDrones([]);
                }}
                className="px-4 py-2 border rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h3 className="font-semibold mb-3">Provide rejection reason</h3>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border p-3 rounded"
              rows={4}
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setRejectModal(false);
                  setRejectReason("");
                  setRejectingProviderId(null);
                }}
                className="border px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  updateStatus(rejectingProviderId, "rejected", rejectReason)
                }
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}