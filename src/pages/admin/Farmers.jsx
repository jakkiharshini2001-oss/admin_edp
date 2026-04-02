import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  Search,
  Eye,
  RefreshCw,
  MapPin,
  Phone,
  User,
  X,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";

function DocumentPreviewCard({ title, url }) {
  if (!url) return null;

  const lowerUrl = String(url).toLowerCase();
  const isImage =
    lowerUrl.includes(".png") ||
    lowerUrl.includes(".jpg") ||
    lowerUrl.includes(".jpeg") ||
    lowerUrl.includes(".webp");

  const isPdf = lowerUrl.includes(".pdf");

  return (
    <div className="border rounded-2xl p-4 bg-slate-50">
      <h4 className="text-sm font-semibold text-slate-700 mb-3">{title}</h4>

      {isImage ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt={title}
            className="w-full h-64 object-contain rounded-xl border bg-white hover:opacity-95 transition"
          />
        </a>
      ) : isPdf ? (
        <div className="w-full h-64 rounded-xl border bg-white flex flex-col items-center justify-center text-slate-500">
          <FileText size={40} />
          <p className="mt-2 text-sm">PDF preview not embedded</p>
        </div>
      ) : (
        <div className="w-full h-64 rounded-xl border bg-white flex items-center justify-center text-slate-500">
          File preview not available
        </div>
      )}

      <div className="mt-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
        >
          View Full
        </a>
      </div>
    </div>
  );
}

export default function Farmers() {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFarmer, setSelectedFarmer] = useState(null);

  useEffect(() => {
    fetchFarmers();
  }, []);

  async function fetchFarmers() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("farmers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setFarmers(data || []);
    } catch (err) {
      console.error("fetchFarmers error:", err);
      toast.error(err?.message || "Failed to load farmers");
    } finally {
      setLoading(false);
    }
  }

  const filteredFarmers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return farmers;

    return farmers.filter((farmer) => {
      return (
        String(farmer.full_name || "").toLowerCase().includes(q) ||
        String(farmer.phone_number || "").toLowerCase().includes(q) ||
        String(farmer.state || "").toLowerCase().includes(q) ||
        String(farmer.district || "").toLowerCase().includes(q) ||
        String(farmer.mandal_name || "").toLowerCase().includes(q) ||
        String(farmer.aadhaar_number || "").toLowerCase().includes(q)
      );
    });
  }, [farmers, search]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Farmers</h1>
            <p className="text-sm text-slate-500 mt-1">
              View all registered farmer details
            </p>
          </div>

          <button
            onClick={fetchFarmers}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="mt-5 relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search by name, phone, state, district, mandal, Aadhaar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-slate-500">Loading farmers...</div>
        ) : filteredFarmers.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No farmers found.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-6 py-4">Photo</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">State</th>
                <th className="px-6 py-4">District</th>
                <th className="px-6 py-4">Mandal</th>
                <th className="px-6 py-4">Land Acres</th>
                <th className="px-6 py-4">View</th>
              </tr>
            </thead>

            <tbody>
              {filteredFarmers.map((farmer) => (
                <tr key={farmer.id} className="border-b hover:bg-slate-50">
                  <td className="px-6 py-4">
                    {farmer.profile_photo_url ? (
                      <img
                        src={farmer.profile_photo_url}
                        alt="farmer"
                        className="w-12 h-12 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500">
                        N/A
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4 font-medium text-slate-800">
                    {farmer.full_name || "-"}
                  </td>

                  <td className="px-6 py-4">{farmer.phone_number || "-"}</td>
                  <td className="px-6 py-4">{farmer.state || "-"}</td>
                  <td className="px-6 py-4">{farmer.district || "-"}</td>
                  <td className="px-6 py-4">{farmer.mandal_name || "-"}</td>
                  <td className="px-6 py-4">{farmer.land_acres ?? "-"}</td>

                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedFarmer(farmer)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                    >
                      <Eye size={16} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedFarmer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-900">Farmer Details</h2>
              <button
                onClick={() => setSelectedFarmer(null)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                {selectedFarmer.profile_photo_url ? (
                  <img
                    src={selectedFarmer.profile_photo_url}
                    alt="farmer"
                    className="w-24 h-24 rounded-full object-cover border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center">
                    <User className="text-slate-500" />
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {selectedFarmer.full_name || "-"}
                  </h3>
                  <p className="text-slate-500 flex items-center gap-2 mt-1">
                    <Phone size={16} />
                    {selectedFarmer.phone_number || "-"}
                  </p>
                  <p className="text-slate-500 flex items-center gap-2 mt-1">
                    <MapPin size={16} />
                    {[selectedFarmer.district, selectedFarmer.state]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
                  <p>
                    <strong>Name:</strong> {selectedFarmer.full_name || "-"}
                  </p>
                  <p>
                    <strong>Phone:</strong> {selectedFarmer.phone_number || "-"}
                  </p>
                  <p>
                    <strong>State:</strong> {selectedFarmer.state || "-"}
                  </p>
                  <p>
                    <strong>District:</strong> {selectedFarmer.district || "-"}
                  </p>
                  <p>
                    <strong>Mandal:</strong> {selectedFarmer.mandal_name || "-"}
                  </p>
                  <p>
                    <strong>Verification Status:</strong>{" "}
                    {selectedFarmer.verification_status || "-"}
                  </p>
                </div>

                <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
                  <p>
                    <strong>Age:</strong> {selectedFarmer.age ?? "-"}
                  </p>
                  <p>
                    <strong>Land Acres:</strong> {selectedFarmer.land_acres ?? "-"}
                  </p>
                  <p>
                    <strong>Land Type:</strong> {selectedFarmer.land_type || "-"}
                  </p>
                  <p>
                    <strong>Aadhaar Number:</strong>{" "}
                    {selectedFarmer.aadhaar_number || "-"}
                  </p>
                  <p>
                    <strong>Created At:</strong>{" "}
                    {selectedFarmer.created_at
                      ? new Date(selectedFarmer.created_at).toLocaleString()
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-1 gap-6">
                <DocumentPreviewCard
                  title="Aadhaar Card"
                  url={selectedFarmer.aadhaar_image}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}