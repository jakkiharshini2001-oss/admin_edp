import React, { useEffect, useState } from "react";
import StatsCard from "../../components/admin/StatsCard";
import {
  Users,
  UserCheck,
  ClipboardList,
  IndianRupee,
  TrendingUp,
  BadgeDollarSign,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function Dashboard() {
  const [stats, setStats] = useState({
    farmers: 0,
    providers: 0,
    activeBookings: 0,
    todayRevenue: 0,
    platformCommission: 0,
    monthlyGrowth: 0,
  });

  const [topProviders, setTopProviders] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [bookingStatusData, setBookingStatusData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const { count: farmerCount } = await supabase
        .from("farmers")
        .select("*", { count: "exact", head: true });

      const { count: providerCount } = await supabase
        .from("providers")
        .select("*", { count: "exact", head: true })
        .eq("verification_status", "approved");

      const { count: activeCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .in("status", ["confirmed", "ongoing"]);

      const todayISO = new Date().toISOString().split("T")[0];

      const { data: todayBookings } = await supabase
        .from("bookings")
        .select("total_price, platform_fee")
        .gte("scheduled_at", `${todayISO}T00:00:00`)
        .lte("scheduled_at", `${todayISO}T23:59:59`);

      let todayRevenue = 0;
      let platformCommission = 0;

      (todayBookings || []).forEach((b) => {
        todayRevenue += Number(b.total_price || 0);
        platformCommission += Number(b.platform_fee || 0);
      });

      const { data: allBookings } = await supabase
        .from("bookings")
        .select("created_at, scheduled_at, total_price, status");

      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const monthlyMap = {};
      monthNames.forEach((m) => {
        monthlyMap[m] = 0;
      });

      (allBookings || []).forEach((b) => {
        const bookingDate = b.scheduled_at || b.created_at;
        if (!bookingDate) return;

        const monthIndex = new Date(bookingDate).getMonth();
        const monthName = monthNames[monthIndex];
        monthlyMap[monthName] += Number(b.total_price || 0);
      });

      const formattedRevenue = monthNames.map((m) => ({
        month: m,
        revenue: monthlyMap[m],
      }));

      setRevenueData(formattedRevenue);

      const now = new Date();
      const currentMonth = now.getMonth();
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;

      const currentMonthRevenue = monthlyMap[monthNames[currentMonth]] || 0;
      const previousMonthRevenue = monthlyMap[monthNames[previousMonth]] || 0;

      let monthlyGrowth = 0;
      if (previousMonthRevenue > 0) {
        monthlyGrowth =
          ((currentMonthRevenue - previousMonthRevenue) /
            previousMonthRevenue) *
          100;
      }

      const statusList = [
        "requested",
        "confirmed",
        "ongoing",
        "completed",
        "cancelled",
      ];

      const statusMap = {};
      statusList.forEach((s) => {
        statusMap[s] = 0;
      });

      (allBookings || []).forEach((b) => {
        if (statusMap[b.status] !== undefined) {
          statusMap[b.status] += 1;
        }
      });

      const formattedStatus = statusList.map((s) => ({
        name: s,
        value: statusMap[s],
      }));

      setBookingStatusData(formattedStatus);

      const { data: completedJobs } = await supabase
        .from("bookings")
        .select(`
          provider_id,
          total_price,
          providers!inner (
            full_name,
            district,
            verification_status
          )
        `)
        .eq("status", "completed")
        .eq("providers.verification_status", "approved");

      const providerMap = {};

      (completedJobs || []).forEach((job) => {
        if (!providerMap[job.provider_id]) {
          providerMap[job.provider_id] = {
            name: job.providers?.full_name || "-",
            district: job.providers?.district || "-",
            jobs: 0,
            earnings: 0,
          };
        }

        providerMap[job.provider_id].jobs += 1;
        providerMap[job.provider_id].earnings += Number(job.total_price || 0);
      });

      const sortedProviders = Object.values(providerMap)
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, 5);

      setTopProviders(sortedProviders);

      setStats({
        farmers: farmerCount || 0,
        providers: providerCount || 0,
        activeBookings: activeCount || 0,
        todayRevenue,
        platformCommission,
        monthlyGrowth: Number(monthlyGrowth).toFixed(1),
      });
    } catch (error) {
      console.error("Dashboard error:", error);
    }
  }

  const COLORS = ["#047857", "#0891b2", "#6366f1", "#ea580c", "#ca8a04", "#059669"];

  return (
    <div className="space-y-8 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <StatsCard
          title="Total Farmers"
          value={stats.farmers}
          icon={<Users size={24} />}
          iconColor="text-teal-700"
          iconBg="bg-teal-50"
        />
        <StatsCard
          title="Verified Providers"
          value={stats.providers}
          icon={<UserCheck size={24} />}
          iconColor="text-cyan-700"
          iconBg="bg-cyan-50"
        />
        <StatsCard
          title="Active Bookings"
          value={stats.activeBookings}
          icon={<ClipboardList size={24} />}
          iconColor="text-indigo-700"
          iconBg="bg-indigo-50"
        />
        <StatsCard
          title="Today's Revenue"
          value={`₹ ${Number(stats.todayRevenue || 0).toLocaleString()}`}
          icon={<IndianRupee size={24} />}
          iconColor="text-orange-700"
          iconBg="bg-orange-50"
        />
        <StatsCard
          title="Platform Commission"
          value={`₹ ${Number(stats.platformCommission || 0).toLocaleString()}`}
          icon={<BadgeDollarSign size={24} />}
          iconColor="text-amber-700"
          iconBg="bg-amber-50"
        />
        <StatsCard
          title="Monthly Growth"
          value={`${stats.monthlyGrowth}%`}
          icon={<TrendingUp size={24} />}
          iconColor="text-emerald-700"
          iconBg="bg-emerald-50"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#047857" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Booking Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={bookingStatusData}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                label
              >
                {bookingStatusData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top Performing Providers
        </h3>

        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b border-gray-200">
              <th className="py-3 font-semibold">Provider</th>
              <th className="py-3 font-semibold">District</th>
              <th className="py-3 font-semibold">Completed Jobs</th>
              <th className="py-3 font-semibold">Total Earnings</th>
            </tr>
          </thead>
          <tbody>
            {topProviders.length > 0 ? (
              topProviders.map((p, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="text-gray-700">{p.district}</td>
                  <td className="text-gray-700">{p.jobs}</td>
                  <td className="font-semibold text-gray-900">
                    ₹ {Number(p.earnings || 0).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="py-6 text-center text-slate-500">
                  No provider performance data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}