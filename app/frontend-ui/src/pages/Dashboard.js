import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";
const API = `${BACKEND_URL}/api`;

// keep in sync with Revenue.js
const REVENUE_SOURCES = [
  { name: 'CASH', color: '#0f172a' },
  { name: 'NAYEEM PRIMARY', color: '#2563eb' },
  { name: 'NAYEEM CURRENT', color: '#16a34a' },
  { name: 'SUBHAN KHAN', color: '#f59e0b' },
  { name: 'MAHABOOB BI', color: '#db2777' },
  { name: 'MUBEENA', color: '#7c3aed' },
];

// keep in sync with Expenses.js
const CATEGORY_COLORS = {
  Salary: '#2563eb', Mess: '#16a34a', Vegetables: '#f59e0b', Curd: '#db2777',
  WiFi: '#7c3aed', Electricity: '#0ea5e9', Gas: '#84cc16', Chicken: '#f97316',
  Egg: '#14b8a6', Phenol: '#e11d48', Rice: '#a855f7', 'PSK & PNK': '#22c55e',
  Other: '#64748b',
};

const fmt = (n) =>
  (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pct = (part, total) => (total > 0 ? ((part / total) * 100).toFixed(1) : '0.0');

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [summary, setSummary] = useState(null);
  const [revenues, setRevenues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, revRes] = await Promise.all([
        axios.get(`${API}/reports/monthly-summary`, { params: { month: selectedMonth } }),
        axios.get(`${API}/revenue`),
      ]);
      setSummary(sumRes.data);
      setRevenues(revRes.data.filter((r) => r.date.startsWith(selectedMonth)));
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /* ================= EXPORTS ================= */

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // backend returns .xlsx files
  const handleExport = async (kind) => {
    try {
      const response = await axios.get(`${API}/${kind}/export`, {
        params: { month: selectedMonth },
        responseType: 'blob',
      });
      downloadBlob(new Blob([response.data]), `${kind}_${selectedMonth}.xlsx`);
      toast.success(`${kind === 'revenue' ? 'Revenue' : 'Expenses'} data exported!`);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  // formatted Excel report built by the backend
  const handleExportCategoryReport = async () => {
    try {
      const response = await axios.get(`${API}/reports/full-export`, {
        params: { month: selectedMonth },
        responseType: 'blob',
      });
      downloadBlob(new Blob([response.data]), `full_report_${selectedMonth}.xlsx`);
      toast.success('Full report downloaded');
    } catch (error) {
      toast.error('Full report download failed');
    }
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

  /* ================= DERIVED DATA ================= */

  // revenue per source (cash + each account) for the selected month
  const accountTotals = REVENUE_SOURCES.map((src) => ({
    ...src,
    amount: revenues.reduce((sum, r) => {
      if (src.name === 'CASH') return sum + (r.cash_amount || 0);
      const c = (r.contributions || []).find((x) => x.name === src.name);
      return sum + (c ? c.amount : 0);
    }, 0),
  }));

  // expenses per category, highest first
  const categoryList = [...(summary?.category_data || [])]
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalRevenue = summary?.total_revenue || 0;
  const totalExpenses = summary?.total_expenses || 0;
  const netProfit = summary?.net_profit || 0;
  const isProfitable = netProfit >= 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-[#71717A]">Loading dashboard...</p>
      </div>
    );
  }

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

          <Button onClick={() => handleExport('revenue')} variant="outline" className="rounded-lg">
            <Download className="w-4 h-4 mr-2" />
            Export Revenue
          </Button>

          <Button onClick={() => handleExport('expenses')} variant="outline" className="rounded-lg">
            <Download className="w-4 h-4 mr-2" />
            Export Expenses
          </Button>

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
          <p className="text-3xl font-bold">₹{fmt(totalRevenue)}</p>
        </Card>

        <Card className="p-6 bg-white rounded-xl border border-[#E4E4E7]/50 shadow-sm">
          <p className="text-sm text-[#71717A]">Total Expenses</p>
          <p className="text-3xl font-bold">₹{fmt(totalExpenses)}</p>
        </Card>

        <Card className="p-6 bg-white rounded-xl border border-[#E4E4E7]/50 shadow-sm">
          <p className="text-sm text-[#71717A]">Net Profit</p>
          <p className={`text-3xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
            ₹{fmt(netProfit)}
          </p>
        </Card>
      </div>

      {/* Revenue by account */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0F172A]">Revenue by Account</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {accountTotals.map((a) => (
            <Card
              key={a.name}
              className="p-5 bg-white rounded-xl border border-[#E4E4E7] shadow-sm overflow-hidden relative"
            >
              <span
                className="absolute left-0 top-0 h-full w-1.5"
                style={{ background: a.color }}
              />
              <div className="pl-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: a.color }} />
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A]">
                    {a.name}
                  </p>
                </div>
                <p className="text-2xl font-bold text-[#0F172A] mt-2 tabular-nums">
                  ₹{fmt(a.amount)}
                </p>
                <p className="text-xs text-[#71717A] mt-1">
                  {pct(a.amount, totalRevenue)}% of total revenue
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Expenses by category */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0F172A]">Expenses by Category</h2>

        <Card className="bg-white rounded-xl border border-[#E4E4E7] shadow-sm overflow-hidden">
          {categoryList.length === 0 ? (
            <div className="p-10 text-center text-[#71717A]">No expenses for this month</div>
          ) : (
            <>
              <ul className="divide-y divide-[#E4E4E7]">
                {categoryList.map((c, i) => {
                  const color = CATEGORY_COLORS[c.name] || '#64748b';
                  const share = pct(c.value, totalExpenses);
                  return (
                    <li key={c.name} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 text-sm font-semibold text-[#A1A1AA] tabular-nums">
                            {i + 1}
                          </span>
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                          <span className="font-medium text-[#0F172A] truncate">{c.name}</span>
                        </div>
                        <div className="flex items-baseline gap-3 shrink-0">
                          <span className="text-xs text-[#71717A] tabular-nums">{share}%</span>
                          <span className="font-bold text-red-600 tabular-nums">₹{fmt(c.value)}</span>
                        </div>
                      </div>
                      <div className="mt-2 ml-9 h-1.5 rounded-full bg-slate-100">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${share}%`, background: color }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between font-bold">
                <span>Total Expenses</span>
                <span className="tabular-nums">₹{fmt(totalExpenses)}</span>
              </div>
            </>
          )}
        </Card>
      </section>

    </div>
  );
}