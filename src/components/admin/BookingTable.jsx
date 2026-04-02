import React from "react";
import { MoreVertical } from "lucide-react";

export default function BookingTable({ bookings = [] }) {

  const getStatusStyle = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-700";
      case "Ongoing":
        return "bg-blue-100 text-blue-700";
      case "Requested":
        return "bg-yellow-100 text-yellow-700";
      case "Cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">

      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-slate-600 text-left">
          <tr>
            <th className="py-4 px-6">Booking ID</th>
            <th className="py-4 px-6">Farmer</th>
            <th className="py-4 px-6">Provider</th>
            <th className="py-4 px-6">Crop</th>
            <th className="py-4 px-6">Total</th>
            <th className="py-4 px-6">Status</th>
            <th className="py-4 px-6">Action</th>
          </tr>
        </thead>

        <tbody className="text-slate-700">
          {bookings.map((booking, index) => (
            <tr
              key={index}
              className="border-b hover:bg-gray-50 transition"
            >
              <td className="py-4 px-6 font-medium">{booking.id}</td>
              <td className="py-4 px-6">{booking.farmer}</td>
              <td className="py-4 px-6">{booking.provider}</td>
              <td className="py-4 px-6">{booking.crop}</td>
              <td className="py-4 px-6">{booking.amount}</td>

              <td className="py-4 px-6">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(
                    booking.status
                  )}`}
                >
                  {booking.status}
                </span>
              </td>

              <td className="py-4 px-6">
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <MoreVertical size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}