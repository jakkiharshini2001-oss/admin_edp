import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X, Pencil } from "lucide-react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function Pricing() {
  const [pricingRows, setPricingRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchPricing();
  }, []);

  const normalizeCropName = (name) =>
    String(name || "")
      .trim()
      .replace(/\s+/g, " ");

  const fetchPricing = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("service_pricing")
        .select("id, crop_name, base_rate, platform_fee, final_rate, is_active, created_at")
        .order("crop_name", { ascending: true });

      if (error) {
        console.error("fetchPricing error:", error);
        toast.error(error.message || "Failed to load crop pricing");
        setPricingRows([]);
        return;
      }

      setPricingRows(data || []);
    } catch (err) {
      console.error("fetchPricing exception:", err);
      toast.error("Failed to load crop pricing");
      setPricingRows([]);
    } finally {
      setLoading(false);
    }
  };

  const addPricingRow = () => {
    setPricingRows((prev) => [
      ...prev,
      {
        id: null,
        crop_name: "",
        base_rate: "",
        platform_fee: "",
        final_rate: 0,
        is_active: true,
      },
    ]);
  };

  const updatePricingRow = (index, field, value) => {
    setPricingRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: value };

      const base = Number(row.base_rate || 0);
      const fee = Number(row.platform_fee || 0);
      row.final_rate = base + fee;

      updated[index] = row;
      return updated;
    });
  };

  const removeUnsavedRow = (index) => {
    setPricingRows((prev) => prev.filter((_, i) => i !== index));
  };

  const deletePricingRow = async (row, index) => {
    if (!row.id) {
      removeUnsavedRow(index);
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${row.crop_name}"?`
    );
    if (!confirmed) return;

    try {
      setDeletingId(row.id);

      const { error } = await supabase
        .from("service_pricing")
        .delete()
        .eq("id", row.id);

      if (error) {
        console.error("deletePricingRow error:", error);
        toast.error(error.message || "Delete failed");
        return;
      }

      toast.success("Crop pricing deleted successfully");
      await fetchPricing();
    } catch (err) {
      console.error("deletePricingRow exception:", err);
      toast.error("Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const validateRows = (rows) => {
    if (rows.length === 0) {
      toast.error("Please add at least one crop");
      return false;
    }

    const normalizedNames = rows.map((row) => row.crop_name.toLowerCase());
    if (new Set(normalizedNames).size !== normalizedNames.length) {
      toast.error("Duplicate crop names are not allowed");
      return false;
    }

    for (const row of rows) {
      if (!row.crop_name) {
        toast.error("Crop name is required");
        return false;
      }

      if (row.base_rate === "" || Number.isNaN(Number(row.base_rate))) {
        toast.error(`Enter valid base rate for ${row.crop_name}`);
        return false;
      }

      if (Number(row.base_rate) < 0) {
        toast.error(`Base rate cannot be negative for ${row.crop_name}`);
        return false;
      }

      if (row.platform_fee === "" || Number.isNaN(Number(row.platform_fee))) {
        toast.error(`Enter valid platform fee for ${row.crop_name}`);
        return false;
      }

      if (Number(row.platform_fee) < 0) {
        toast.error(`Platform fee cannot be negative for ${row.crop_name}`);
        return false;
      }
    }

    return true;
  };

  const handleUpdate = async () => {
    try {
      setSaving(true);

      const cleanedRows = pricingRows
        .map((row) => ({
          ...row,
          crop_name: normalizeCropName(row.crop_name),
          base_rate:
            row.base_rate === "" || row.base_rate === null
              ? ""
              : Number(row.base_rate),
          platform_fee:
            row.platform_fee === "" || row.platform_fee === null
              ? 0
              : Number(row.platform_fee),
        }))
        .filter((row) => row.crop_name !== "");

      if (!validateRows(cleanedRows)) return;

      const rowsToInsert = cleanedRows
        .filter((row) => !row.id)
        .map((row) => ({
          crop_name: row.crop_name,
          base_rate: Number(row.base_rate || 0),
          platform_fee: Number(row.platform_fee || 0),
          final_rate:
            Number(row.base_rate || 0) + Number(row.platform_fee || 0),
          is_active: true,
        }));

      const rowsToUpdate = cleanedRows
        .filter((row) => row.id)
        .map((row) => ({
          id: row.id,
          crop_name: row.crop_name,
          base_rate: Number(row.base_rate || 0),
          platform_fee: Number(row.platform_fee || 0),
          final_rate:
            Number(row.base_rate || 0) + Number(row.platform_fee || 0),
          is_active: true,
        }));

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("service_pricing")
          .insert(rowsToInsert);

        if (insertError) {
          console.error("insert error:", insertError, rowsToInsert);

          if (insertError.code === "23505") {
            toast.error("One or more crop names already exist");
          } else {
            toast.error(insertError.message || "Insert failed");
          }
          return;
        }
      }

      for (const row of rowsToUpdate) {
        const { id, ...payload } = row;

        const { error: updateError } = await supabase
          .from("service_pricing")
          .update(payload)
          .eq("id", id);

        if (updateError) {
          console.error("update error:", updateError, row);

          if (updateError.code === "23505") {
            toast.error(`Crop "${row.crop_name}" already exists`);
          } else {
            toast.error(updateError.message || "Update failed");
          }
          return;
        }
      }

      toast.success("Pricing updated successfully");
      setEditModal(false);
      await fetchPricing();
    } catch (err) {
      console.error("handleUpdate exception:", err);
      toast.error(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const activeCount = useMemo(
    () => pricingRows.filter((row) => row.is_active !== false).length,
    [pricingRows]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Crop Pricing</h2>
          <p className="text-sm text-gray-500">
            Manage crop names and pricing directly from service_pricing.
          </p>
        </div>

        <button
          onClick={() => setEditModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          <Pencil size={16} />
          Manage Pricing
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Crops</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {pricingRows.length}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Active Crops</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {activeCount}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Status</p>
          <p className="mt-1 text-sm font-medium text-gray-700">
            {loading ? "Loading..." : "Ready"}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : pricingRows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No crop pricing found
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-700">
              <tr>
                <th className="px-6 py-4">Crop</th>
                <th className="px-6 py-4">Base Rate</th>
                <th className="px-6 py-4">Platform Fee</th>
                <th className="px-6 py-4">Final Rate</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {pricingRows.map((row, index) => (
                <tr key={row.id || index} className="border-t">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {row.crop_name || "-"}
                  </td>
                  <td className="px-6 py-4 font-semibold text-green-600">
                    ₹ {Number(row.base_rate || 0)}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    ₹ {Number(row.platform_fee || 0)}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    ₹ {Number(row.final_rate || 0)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => deletePricingRow(row, index)}
                      disabled={deletingId === row.id}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                      title="Delete Crop"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Crop Based Pricing
              </h3>
              <button
                onClick={() => setEditModal(false)}
                className="rounded-md p-1 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {pricingRows.map((row, index) => (
                <div
                  key={row.id || index}
                  className="grid grid-cols-1 gap-3 rounded-xl border p-3 md:grid-cols-4 md:items-center"
                >
                  <input
                    type="text"
                    placeholder="Crop Name"
                    value={row.crop_name || ""}
                    onChange={(e) =>
                      updatePricingRow(index, "crop_name", e.target.value)
                    }
                    className="rounded-lg border px-3 py-2 outline-none focus:border-green-500"
                  />

                  <input
                    type="number"
                    placeholder="Base Rate"
                    value={row.base_rate}
                    onChange={(e) =>
                      updatePricingRow(index, "base_rate", e.target.value)
                    }
                    className="rounded-lg border px-3 py-2 outline-none focus:border-green-500"
                    min="0"
                  />

                  <input
                    type="number"
                    placeholder="Platform Fee"
                    value={row.platform_fee}
                    onChange={(e) =>
                      updatePricingRow(index, "platform_fee", e.target.value)
                    }
                    className="rounded-lg border px-3 py-2 outline-none focus:border-green-500"
                    min="0"
                  />

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-700">
                      Final: ₹ {Number(row.final_rate || 0)}
                    </div>

                    <button
                      onClick={() => deletePricingRow(row, index)}
                      disabled={deletingId === row.id}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                      title="Delete Crop"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addPricingRow}
              className="mt-4 inline-flex items-center gap-2 text-green-600 hover:text-green-700"
              type="button"
            >
              <Plus size={16} />
              Add Crop Pricing
            </button>

            <button
              onClick={handleUpdate}
              disabled={saving}
              className="mt-6 w-full rounded-xl bg-green-600 py-3 text-white hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Update Pricing"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}