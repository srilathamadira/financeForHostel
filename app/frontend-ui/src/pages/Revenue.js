import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from "../components/ui/alert-dialog";

import {
  Dialog, DialogContent, DialogTrigger
} from "../components/ui/dialog";

import { Plus, Edit, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";
const API = `${BACKEND_URL}/api`;

const ACCOUNT_NAMES = [
  "NAYEEM PRIMARY",
  "NAYEEM CURRENT",
  "SUBHAN KHAN",
  "MAHABOOB BI",
  "MUBEENA"
];

const ACCOUNT_COLORS = {
  "CASH": "#0f172a",
  "NAYEEM PRIMARY": "#2563eb",
  "NAYEEM CURRENT": "#16a34a",
  "SUBHAN KHAN": "#f59e0b",
  "MAHABOOB BI": "#db2777",
  "MUBEENA": "#7c3aed"
};

export default function Revenue() {

  const { token, user, loading: authLoading } = useAuth();

  const emptyContribs = ACCOUNT_NAMES.map(n => ({ name: n, amount: 0 }));

  const [revenues, setRevenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [dateFilter, setDateFilter] = useState("");

  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [rangeSummary, setRangeSummary] = useState([]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    cash_amount: "",
    contributions: emptyContribs
  });

  /* ================= FETCH ================= */

  useEffect(() => {
    if (token && !authLoading) fetchData();
  }, [token, authLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/revenue`);
      setRevenues(res.data);
    } catch {
      toast.error("Failed to fetch revenue");
    } finally {
      setLoading(false);
    }
  };

  /* ================= RANGE REPORT ================= */

  useEffect(() => {
    fetchRangeSummary();
  }, [fromMonth, toMonth]);

  const fetchRangeSummary = async () => {
    if (!fromMonth || !toMonth) return;

    const months = [];
    let cur = fromMonth;

    while (cur <= toMonth) {
      months.push(cur);
      const d = new Date(cur + "-01");
      d.setMonth(d.getMonth() + 1);
      cur = d.toISOString().slice(0,7);
    }

    const results = await Promise.all(
      months.map(m => axios.get(`${API}/reports/monthly-summary?month=${m}`))
    );

    const data = results.map((res,i) => ({
      month: months[i],
      revenue: res.data.total_revenue || 0,
      expenses: res.data.total_expenses || 0,
      profit: (res.data.total_revenue || 0) - (res.data.total_expenses || 0)
    }));

    setRangeSummary(data);
  };

  /* ================= FILTER ================= */

  const filtered = dateFilter
    ? revenues.filter(r => r.date.startsWith(dateFilter))
    : revenues;

  const totalSum = filtered.reduce((s, r) => s + r.total_revenue, 0);
  const entryCount = filtered.length;
  const activeMonth = dateFilter || "All Months";

  /* ================= FORM ================= */

  const updateContribution = (i, val) => {
    const copy = [...formData.contributions];
    copy[i].amount = parseFloat(val) || 0;
    setFormData({ ...formData, contributions: copy });
  };

  const calcTotal = () =>
    (parseFloat(formData.cash_amount) || 0) +
    formData.contributions.reduce((s,c)=>s+c.amount,0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      date: formData.date,
      cash_amount: parseFloat(formData.cash_amount) || 0,
      contributions: formData.contributions.filter(c=>c.amount>0)
    };

    try {
      editingId
        ? await axios.put(`${API}/revenue/${editingId}`, payload)
        : await axios.post(`${API}/revenue`, payload);

      toast.success("Saved");
      fetchData();
      closeDialog();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Save failed");
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormData({
      date:new Date().toISOString().split("T")[0],
      cash_amount:"",
      contributions: emptyContribs
    });
  };

  const editRow = (r) => {
    const mapped = ACCOUNT_NAMES.map(n =>
      r.contributions.find(c=>c.name===n) || {name:n,amount:0}
    );
    setEditingId(r.id);
    setFormData({ date:r.date, cash_amount:r.cash_amount, contributions:mapped });
    setDialogOpen(true);
  };

  const deleteRow = async () => {
    await axios.delete(`${API}/revenue/${deleteId}`);
    setDeleteId(null);
    fetchData();
    toast.success("Deleted");
  };

  /* ================= EXPORT ================= */

  const getAmt = (r, name) => {
    const f = r.contributions.find(c => c.name === name);
    return f ? f.amount : 0;
  };

  const fmt = (n) =>
    (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const exportCSV = () => {
    const header = ["Date", "Cash", ...ACCOUNT_NAMES, "Total"];
    const rows = filtered.map(r => [
      r.date,
      r.cash_amount,
      ...ACCOUNT_NAMES.map(n => getAmt(r, n)),
      r.total_revenue
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue_${dateFilter || "all"}.csv`;
    a.click();
  };

  /* ================= GRAPH ================= */

  const totalCash = filtered.reduce((s, r) => s + (r.cash_amount || 0), 0);

  const accountTotals = ACCOUNT_NAMES.map(n => ({
    name: n,
    amount: filtered.reduce((s, r) => s + getAmt(r, n), 0)
  }));

  const graphData = [{ name: "CASH", amount: totalCash }, ...accountTotals];

  if (authLoading) return <div className="p-10 text-center">Loading...</div>;

  const rangeRevenue = rangeSummary.reduce((s,m)=>s+m.revenue,0);
  const rangeExpenses = rangeSummary.reduce((s,m)=>s+m.expenses,0);
  const rangeProfit = rangeRevenue - rangeExpenses;

  /* ================= UI ================= */

  return (
<div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

{/* PROFILE CARDS */}
<div className="grid md:grid-cols-4 gap-5">
<Card className="p-5"><div className="text-xs">Profile</div><div className="font-semibold">{user?.name}</div></Card>
<Card className="p-5"><div className="text-xs">Revenue</div><div className="font-bold text-green-600">₹{totalSum.toLocaleString('en-IN',{minimumFractionDigits:2,minimumFractionDigits:2})}</div></Card>
<Card className="p-5"><div className="text-xs">Entries</div><div className="font-bold">{entryCount}</div></Card>
<Card className="p-5"><div className="text-xs">Viewing</div><div className="font-semibold">{activeMonth}</div></Card>
</div>

{/* HEADER */}
<div className="bg-white border rounded-xl shadow-sm px-6 py-5 flex justify-between">
<h1 className="text-2xl font-semibold">Revenue</h1>

<div className="flex gap-3">
<Input type="month" value={dateFilter} onChange={e=>setDateFilter(e.target.value)} className="w-50"/>

<Button variant="outline" onClick={exportCSV}>
<Download className="w-4 h-4 mr-2"/>Export
</Button>

<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
<DialogTrigger asChild>
<Button className="bg-slate-900 text-white"><Plus className="w-4 h-4 mr-2"/>Add</Button>
</DialogTrigger>

<DialogContent>
<form onSubmit={handleSubmit} className="space-y-4">
<Label>Date</Label>
<Input type="date" value={formData.date}
onChange={e=>setFormData({...formData,date:e.target.value})}/>

<div className="flex gap-3 items-center">
<div className="w-48 font-medium">CASH</div>
<Input type="number"
value={formData.cash_amount || ""}
onChange={e=>setFormData({...formData,cash_amount:e.target.value})}/>
</div>

{formData.contributions.map((c,i)=>(
<div key={i} className="flex gap-3 items-center">
<div className="w-48">{c.name}</div>
<Input type="number"
value={c.amount||""}
onChange={e=>updateContribution(i,e.target.value)}/>
</div>
))}

<div className="bg-gray-100 p-3 rounded-lg font-semibold">
Total ₹ {calcTotal().toFixed(2)}
</div>

<Button type="submit">Save</Button>
</form>
</DialogContent>
</Dialog>
</div>
</div>

{/* ===== ENTRIES TABLE ===== */}
<Card className="p-0 overflow-hidden border border-slate-200 shadow-sm rounded-2xl">

<div className="px-6 py-4 border-b bg-slate-900 flex items-center justify-between">
  <h2 className="text-base font-semibold text-white">All Revenue Entries</h2>
  <span className="text-xs font-medium text-slate-300 bg-white/10 px-3 py-1 rounded-full">
    {entryCount} {entryCount === 1 ? "entry" : "entries"} · {activeMonth}
  </span>
</div>

<div className="overflow-auto max-h-[70vh] border-t border-slate-200">

<table className="w-full min-w-[1150px] text-sm border-separate border-spacing-0">

<thead>
<tr className="text-[11px] uppercase tracking-wider text-slate-500">
<th className="sticky top-0 left-0 z-30 bg-slate-100 border-b border-r border-slate-300 px-4 py-3 text-left font-semibold whitespace-nowrap">Date</th>
<th className="sticky top-0 z-20 bg-slate-100 border-b border-r border-slate-300 px-4 py-3 text-right font-semibold whitespace-nowrap">
<span className="inline-flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full" style={{background:ACCOUNT_COLORS["CASH"]}}/>Cash
</span>
</th>
{ACCOUNT_NAMES.map(n=>(
<th key={n} className="sticky top-0 z-20 bg-slate-100 border-b border-r border-slate-300 px-4 py-3 text-right font-semibold whitespace-nowrap">
<span className="inline-flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full" style={{background:ACCOUNT_COLORS[n]}}/>{n}
</span>
</th>
))}
<th className="sticky top-0 z-20 bg-slate-100 border-b border-r border-slate-300 px-4 py-3 text-right font-semibold whitespace-nowrap">Total</th>
<th className="sticky top-0 right-0 z-30 bg-slate-100 border-b border-r border-slate-300 px-4 py-3 text-center font-semibold whitespace-nowrap">Actions</th>
</tr>
</thead>

<tbody>

{filtered.map((r)=>{
  const d = new Date(r.date + "T00:00:00");
  const dateLabel = isNaN(d) ? r.date : d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
  const dayLabel = isNaN(d) ? "" : d.toLocaleDateString("en-IN",{weekday:"short"});

  return (
<tr key={r.id} className="bg-white even:bg-slate-50 hover:bg-blue-50 transition-colors">

<td className="sticky left-0 z-10 bg-inherit border-b border-r border-slate-200 px-4 py-3 whitespace-nowrap">
  <div className="font-semibold text-slate-800">{dateLabel}</div>
  <div className="text-xs text-slate-400">{dayLabel}</div>
</td>

<td className="border-b border-r border-slate-200 px-4 py-3 text-right tabular-nums whitespace-nowrap">
  {r.cash_amount
    ? <span className="font-medium text-slate-800">₹{fmt(r.cash_amount)}</span>
    : <span className="text-slate-300">–</span>}
</td>

{ACCOUNT_NAMES.map(n=>{
  const v = getAmt(r, n);
  return (
    <td key={n} className="border-b border-r border-slate-200 px-4 py-3 text-right tabular-nums whitespace-nowrap">
      {v
        ? <span className="font-medium text-slate-800">₹{fmt(v)}</span>
        : <span className="text-slate-300">–</span>}
    </td>
  );
})}

<td className="border-b border-r border-slate-200 px-4 py-3 text-right whitespace-nowrap">
  <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 font-bold tabular-nums">
    ₹{fmt(r.total_revenue)}
  </span>
</td>

<td className="sticky right-0 z-10 bg-inherit border-b border-r border-slate-200 px-3 py-3">
  <div className="flex justify-center gap-1">
    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-blue-100" onClick={() => editRow(r)}>
      <Edit className="w-4 h-4 text-blue-600" />
    </Button>
    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-100" onClick={() => setDeleteId(r.id)}>
      <Trash2 className="w-4 h-4 text-red-600" />
    </Button>
  </div>
</td>

</tr>
  );
})}

{filtered.length === 0 && (
<tr>
<td colSpan={ACCOUNT_NAMES.length + 4} className="text-center py-12 text-slate-500">
No revenue entries found
</td>
</tr>
)}

</tbody>

<tfoot>
<tr className="bg-slate-900 text-white font-bold">
<td className="sticky bottom-0 left-0 z-20 bg-slate-900 border-r border-slate-700 px-4 py-3.5 whitespace-nowrap">TOTAL</td>
<td className="sticky bottom-0 z-10 bg-slate-900 border-r border-slate-700 px-4 py-3.5 text-right tabular-nums whitespace-nowrap">₹{fmt(totalCash)}</td>
{accountTotals.map(a=>(
<td key={a.name} className="sticky bottom-0 z-10 bg-slate-900 border-r border-slate-700 px-4 py-3.5 text-right tabular-nums whitespace-nowrap">₹{fmt(a.amount)}</td>
))}
<td className="sticky bottom-0 z-10 bg-slate-900 border-r border-slate-700 px-4 py-3.5 text-right tabular-nums whitespace-nowrap text-green-400">₹{fmt(totalSum)}</td>
<td className="sticky bottom-0 right-0 z-20 bg-slate-900 border-r border-slate-700 px-4 py-3.5"></td>
</tr>
</tfoot>

</table>

</div>
</Card>


{/* ACCOUNT GRAPH */}
<Card className="p-6">
<h2 className="font-semibold mb-3">Cash &amp; Account-wise Revenue ({activeMonth})</h2>
<ResponsiveContainer width="100%" height={280}>
<BarChart data={graphData}>
<XAxis dataKey="name"/>
<YAxis/>
<Tooltip/>
<Bar dataKey="amount">
{graphData.map(d=>(
<Cell key={d.name} fill={ACCOUNT_COLORS[d.name]}/>
))}
</Bar>
</BarChart>
</ResponsiveContainer>
</Card>

{/* MASTER RANGE REPORT — KEPT SAME */}
<Card className="p-6 space-y-4">
<h2 className="font-semibold">Master Range Report</h2>

<div className="flex gap-4">
<Input type="month" value={fromMonth} onChange={e=>setFromMonth(e.target.value)} />
<Input type="month" value={toMonth} onChange={e=>setToMonth(e.target.value)} />
</div>

<div className="grid md:grid-cols-3 gap-4">
<div className="p-3 bg-green-50 rounded">Revenue ₹{rangeRevenue}</div>
<div className="p-3 bg-red-50 rounded">Expenses ₹{rangeExpenses}</div>
<div className="p-3 bg-blue-50 rounded">Profit ₹{rangeProfit}</div>
</div>

<ResponsiveContainer width="100%" height={260}>
<BarChart data={rangeSummary}>
<XAxis dataKey="month"/>
<YAxis/>
<Tooltip/>
<Bar dataKey="revenue" fill="#22c55e"/>
<Bar dataKey="expenses" fill="#ef4444"/>
<Bar dataKey="profit" fill="#3b82f6"/>
</BarChart>
</ResponsiveContainer>
</Card>
{/* DELETE CONFIRM DIALOG — ADDED ONLY */}
<AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete this revenue entry?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>

    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={deleteRow}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>

  </AlertDialogContent>
</AlertDialog>

</div>
);
}