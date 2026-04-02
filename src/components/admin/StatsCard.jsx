import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function StatsCard({
  title,
  value,
  icon,
  trend = "up",
  trendValue = "0%",
  gradient = "from-green-500 to-emerald-600",
}) {
  return (
    <div
      className={`rounded-2xl p-5 text-white shadow-lg bg-gradient-to-r ${gradient} transition-transform duration-300 hover:scale-105`}
    >
      <div className="flex justify-between items-center">
        <div className="text-sm opacity-90">{title}</div>
        <div className="bg-white/20 p-2 rounded-xl">{icon}</div>
      </div>

      <div className="mt-4 text-2xl font-bold">{value}</div>

      <div className="mt-2 flex items-center text-sm">
        {trend === "up" ? (
          <ArrowUpRight size={16} className="mr-1" />
        ) : (
          <ArrowDownRight size={16} className="mr-1" />
        )}
        <span>{trendValue} from last week</span>
      </div>
    </div>
  );
}