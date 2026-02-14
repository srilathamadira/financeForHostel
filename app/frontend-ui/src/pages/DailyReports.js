import { useState, useEffect } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DailyReports() {

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ convert selectedDate → YYYY-MM
  const selectedMonth =
    selectedDate.getFullYear() +
    "-" +
    String(selectedDate.getMonth() + 1).padStart(2, "0");

  useEffect(() => {
    fetchReports();
  }, [selectedMonth]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/reports/daily`, {
        params: { month: selectedMonth },
      });
      setReports(res.data);
    } catch (err) {
      toast.error("Failed to fetch daily reports");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6">

      {/* ✅ Header + Better Filter UI */}
      <div className="grid md:grid-cols-2 gap-6 items-end">

        <div>
          <h1 className="text-4xl font-bold text-[#0F172A]">
            Daily Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Profit / Loss by day
          </p>
        </div>

        {/* Filter Card */}
        <div className="flex items-center gap-4">

  <label className="text-sm font-medium text-gray-600">
    Filter Month
  </label>

  <DatePicker
    selected={selectedDate}
    onChange={(date) => setSelectedDate(date)}
    dateFormat="MMMM yyyy"
    showMonthYearPicker
    className="
      w-40
      bg-white
      border border-gray-300
      rounded-lg
      px-4
      py-2.5
      text-sm
      font-medium
      shadow-sm
      hover:border-slate-400
      focus:outline-none
      focus:ring-2
      focus:ring-slate-900
      transition
      cursor-pointer
    "
  />

</div>



      </div>

      {/* ✅ Table Card */}
      <Card className="overflow-hidden border shadow-sm">

        {loading ? (
          <div className="p-12 text-center text-gray-500">
            Loading...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No data for this month
          </div>
        ) : (

          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              <thead className="bg-gray-100">
                <tr>
                  <th className="p-4 text-left font-semibold">Date</th>
                  <th className="text-left font-semibold">Revenue</th>
                  <th className="text-left font-semibold">Expenses</th>
                  <th className="text-left font-semibold">Net</th>
                  <th className="text-left font-semibold">Status</th>
                </tr>
              </thead>

              <tbody>
                {reports.map(r => {
                  const profit = r.net_profit >= 0;

                  return (
                    <tr
                      key={r.date}
                      className="border-t hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-4 font-medium">
                        {r.date}
                      </td>

                      <td className="text-green-600 font-semibold">
                        ₹{r.total_revenue.toFixed(2)}
                      </td>

                      <td className="text-red-600 font-semibold">
                        ₹{r.total_expenses.toFixed(2)}
                      </td>

                      <td className={profit ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                        ₹{r.net_profit.toFixed(2)}
                      </td>

                      <td>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold
                          ${profit
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"}`}
                        >
                          {profit ? "Profit" : "Loss"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>

        )}
      </Card>

    </div>
  );
}
