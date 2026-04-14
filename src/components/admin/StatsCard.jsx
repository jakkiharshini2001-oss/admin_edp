import React from "react";

export default function StatsCard({
  title,
  value,
  icon,
  iconBg = "bg-teal-50",
  iconColor = "text-teal-700",
}) {
  return (
    <div className="rounded-xl p-6 bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-shadow duration-200">
      <div className="flex justify-between items-start">
        <h3 className="text-xs font-medium text-gray-700 uppercase tracking-wide">{title}</h3>
        <div className={`${iconBg} p-2.5 rounded-lg`}>
          <div className={`${iconColor}`}>{icon}</div>
        </div>
      </div>

      <p className="text-4xl font-bold text-gray-900 mt-4">{value}</p>
    </div>
  );
}