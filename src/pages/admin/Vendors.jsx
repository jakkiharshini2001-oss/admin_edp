import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Vendors() {
  const navigate = useNavigate();

  const [vendors, setVendors] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [mandals, setMandals] = useState([]);

  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedMandal, setSelectedMandal] = useState("");

  useEffect(() => {
    fetchVendors();
  }, []);

  async function fetchVendors() {
    setLoading(true);

    const { data, error } = await supabase
      .from("providers")
      .select("*")
      .eq("verification_status", "approved");

    if (error) {
      console.error("Failed to load vendors:", error);
      setLoading(false);
      return;
    }

    const approved = data || [];

    setVendors(approved);
    setFiltered(approved);

    const uniqueStates = [...new Set(approved.map((v) => v.state).filter(Boolean))];
    setStates(uniqueStates);

    setLoading(false);
  }

  useEffect(() => {
    if (!selectedState) {
      setDistricts([]);
      setSelectedDistrict("");
      return;
    }

    const stateFiltered = vendors.filter((v) => v.state === selectedState);

    const uniqueDistricts = [
      ...new Set(stateFiltered.map((v) => v.district).filter(Boolean)),
    ];

    setDistricts(uniqueDistricts);
    setSelectedDistrict("");
    setMandals([]);
    setSelectedMandal("");
  }, [selectedState, vendors]);

  useEffect(() => {
    if (!selectedDistrict) {
      setMandals([]);
      setSelectedMandal("");
      return;
    }

    const districtFiltered = vendors.filter(
      (v) => v.state === selectedState && v.district === selectedDistrict
    );

    const uniqueMandals = [
      ...new Set(districtFiltered.map((v) => v.mandal_name).filter(Boolean)),
    ];

    setMandals(uniqueMandals);
    setSelectedMandal("");
  }, [selectedDistrict, selectedState, vendors]);

  useEffect(() => {
    let data = [...vendors];

    if (search) {
      data = data.filter(
        (v) =>
          v.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          v.mandal_name?.toLowerCase().includes(search.toLowerCase()) ||
          v.district?.toLowerCase().includes(search.toLowerCase()) ||
          v.state?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (selectedState) {
      data = data.filter((v) => v.state === selectedState);
    }

    if (selectedDistrict) {
      data = data.filter((v) => v.district === selectedDistrict);
    }

    if (selectedMandal) {
      data = data.filter((v) => v.mandal_name === selectedMandal);
    }

    setFiltered(data);
  }, [search, selectedState, selectedDistrict, selectedMandal, vendors]);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Verified Vendors</h1>

      <div className="flex flex-wrap gap-4">
        <div className="relative w-72">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or location..."
            className="w-full border rounded-xl pl-9 pr-4 py-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="border rounded-xl px-4 py-2"
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
        >
          <option value="">All States</option>
          {states.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>

        <select
          className="border rounded-xl px-4 py-2"
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
          disabled={!selectedState}
        >
          <option value="">All Districts</option>
          {districts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>

        <select
          className="border rounded-xl px-4 py-2"
          value={selectedMandal}
          onChange={(e) => setSelectedMandal(e.target.value)}
          disabled={!selectedDistrict}
        >
          <option value="">All Mandals</option>
          {mandals.map((mandal) => (
            <option key={mandal} value={mandal}>
              {mandal}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">Loading vendors...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-gray-400">No vendors found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">State</th>
                <th className="px-6 py-4">District</th>
                <th className="px-6 py-4">Mandal</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((vendor) => (
                <tr key={vendor.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">
                    {vendor.full_name || "-"}
                  </td>
                  <td className="px-6 py-4">{vendor.state || "-"}</td>
                  <td className="px-6 py-4">{vendor.district || "-"}</td>
                  <td className="px-6 py-4">{vendor.mandal_name || "-"}</td>
                  <td className="px-6 py-4">
                    {vendor.contact_phone || vendor.phone_number || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/vendors/${vendor.id}`)}
                      className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold"
                    >
                      View Vendor
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}