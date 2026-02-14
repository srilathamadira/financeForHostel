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

  const exportCSV = () => {
    const rows = filtered.map(r =>
      `${r.date},${r.cash_amount},${r.total_revenue}`
    );
    const blob = new Blob([["Date,Cash,Total", ...rows].join("\n")]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "revenue.csv";
    a.click();
  };

  /* ================= GRAPH ================= */

  const graphData = ACCOUNT_NAMES.map(n => ({
    name:n,
    amount: filtered.reduce((s,r)=>{
      const f=r.contributions.find(c=>c.name===n);
      return s+(f?f.amount:0);
    },0)
  }));

  if (authLoading) return <div className="p-10 text-center">Loading...</div>;

  const rangeRevenue = rangeSummary.reduce((s,m)=>s+m.revenue,0);
  const rangeExpenses = rangeSummary.reduce((s,m)=>s+m.expenses,0);
  const rangeProfit = rangeRevenue - rangeExpenses;

  /* ================= UI ================= */

  return (
<div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

{/* PROFILE CARDS */}
<div className="grid md:grid-cols-4 gap-5">
<Card className="p-5"><div className="text-xs">Profile</div><div className="font-semibold">{user?.name}</div></Card>
<Card className="p-5"><div className="text-xs">Revenue</div><div className="font-bold text-green-600">₹{totalSum.toFixed(2)}</div></Card>
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

{/* ===== ENTRIES TABLE — PREMIUM UI ===== */}
<Card className="p-0 overflow-hidden border shadow-md rounded-2xl">

<div className="px-6 py-5 border-b bg-gradient-to-r from-slate-900 to-slate-800">
  <h2 className="text-lg font-semibold text-white">
    All Revenue Entries
  </h2>
</div>

<div className="overflow-x-auto">

<table className="w-full text-sm">

<thead className="bg-slate-50 text-slate-600">
<tr>
<th className="p-4 text-left font-semibold">Date</th>
<th className="p-4 text-left font-semibold">Cash</th>
<th className="p-4 text-left font-semibold">Total</th>
<th className="p-4 text-left font-semibold">Actions</th>
</tr>
</thead>

<tbody>

{filtered.map((r, i) => (
<tr
  key={r.id}
  className="border-t hover:bg-slate-50 transition-colors"
>

<td className="p-4 font-medium text-slate-700">
  {r.date}
</td>

<td className="p-4 text-slate-600">
  ₹{r.cash_amount}
</td>

<td className="p-4">
  <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
    ₹{r.total_revenue}
  </span>
</td>

<td className="p-4">
  <div className="flex gap-2">

    <Button
      size="sm"
      className="bg-slate-900 hover:bg-slate-700 text-white rounded-lg"
      onClick={() => editRow(r)}
    >
      <Edit className="w-4 h-4" />
    </Button>

    <Button
      size="sm"
      className="bg-red-500 hover:bg-red-600 text-white rounded-lg"
      onClick={() => setDeleteId(r.id)}
    >
      <Trash2 className="w-4 h-4" />
    </Button>

  </div>
</td>

</tr>
))}

</tbody>
</table>

</div>
</Card>


{/* ACCOUNT GRAPH */}
<Card className="p-6">
<h2 className="font-semibold mb-3">Account Contributions</h2>
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
