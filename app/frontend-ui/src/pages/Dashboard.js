import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, [selectedMonth]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/reports/monthly-summary`, {
        params: { month: selectedMonth },
      });
      setSummary(response.data);
    } catch (error) {
      toast.error('Failed to fetch summary');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportRevenue = async () => {
    try {
      const response = await axios.get(`${API}/revenue/export`, {
        params: { month: selectedMonth },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `revenue_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Revenue data exported!');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const handleExportExpenses = async () => {
    try {
      const response = await axios.get(`${API}/expenses/export`, {
        params: { month: selectedMonth },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expenses_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Expenses data exported!');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  // ✅ ===== ADDED: FULL CATEGORY REPORT EXPORT =====
  const handleExportCategoryReport = () => {
    if (!summary) {
      toast.error("No data to export");
      return;
    }

    const rows = [];

    rows.push(["MONTH", selectedMonth]);
    rows.push([]);

    rows.push(["SUMMARY"]);
    rows.push(["Total Revenue", summary.total_revenue]);
    rows.push(["Total Expenses", summary.total_expenses]);
    rows.push(["Net Profit", summary.net_profit]);
    rows.push([]);

    rows.push(["EXPENSES BY CATEGORY"]);
    rows.push(["Category", "Amount"]);

    (summary.category_data || []).forEach(c => {
      rows.push([c.name, c.value]);
    });

    const csv = rows.map(r => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `full_report_${selectedMonth}.csv`;
    a.click();

    toast.success("Full report downloaded");
  };

  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-[#71717A]">Loading dashboard...</p>
      </div>
    );
  }

  const netProfit = summary?.net_profit || 0;
  const isProfitable = netProfit >= 0;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#0F172A] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Dashboard
          </h1>
          <p className="text-sm text-[#71717A] mt-1">Monthly financial overview</p>
        </div>

        <div className="flex flex-wrap gap-3">

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger data-testid="month-select" className="w-48 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {generateMonthOptions().map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleExportRevenue} variant="outline" className="rounded-lg">
            <Download className="w-4 h-4 mr-2" />
            Export Revenue
          </Button>

          <Button onClick={handleExportExpenses} variant="outline" className="rounded-lg">
            <Download className="w-4 h-4 mr-2" />
            Export Expenses
          </Button>

          {/* ✅ ADDED BUTTON */}
          <Button onClick={handleExportCategoryReport} variant="outline" className="rounded-lg">
            <Download className="w-4 h-4 mr-2" />
            Full Report
          </Button>

        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <Card className="p-6 bg-white rounded-xl border border-[#E4E4E7]/50 shadow-sm">
          <p className="text-sm text-[#71717A]">Total Revenue</p>
          <p className="text-3xl font-bold">₹{summary?.total_revenue?.toFixed(2) || '0.00'}</p>
        </Card>

        <Card className="p-6 bg-white rounded-xl border border-[#E4E4E7]/50 shadow-sm">
          <p className="text-sm text-[#71717A]">Total Expenses</p>
          <p className="text-3xl font-bold">₹{summary?.total_expenses?.toFixed(2) || '0.00'}</p>
        </Card>

        <Card className="p-6 bg-white rounded-xl border border-[#E4E4E7]/50 shadow-sm">
          <p className="text-sm text-[#71717A]">Net Profit</p>
          <p className={`text-3xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
            ₹{netProfit.toFixed(2)}
          </p>
        </Card>

      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={summary?.revenue_data || []}>
              <XAxis dataKey="date"/>
              <YAxis/>
              <Tooltip/>
              <Legend/>
              <Bar dataKey="revenue" fill="#10B981"/>
              <Bar dataKey="expenses" fill="#EF4444"/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={summary?.category_data || []} dataKey="value">
                {summary?.category_data?.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip/>
            </PieChart>
          </ResponsiveContainer>
        </Card>

      </div>

    </div>
  );
}
