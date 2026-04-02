import React from "react";

export default function RevenueChart() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        Revenue Overview
      </h3>

      {/* Chart Placeholder */}
      <div className="h-72 flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl text-slate-500 text-sm">
        Revenue Line Chart (Coming Soon)
      </div>
    </div>
  );
}