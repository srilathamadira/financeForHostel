import { useState, useEffect } from "react";
import axios from "axios";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";

import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger
} from "@/components/ui/dialog";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis
} from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";
const API = `${BACKEND_URL}/api`;

const CATEGORIES = [
  "Salary","Mess","Vegetables","Curd","WiFi","Electricity",
  "Gas","Chicken","Egg","Phenol","Rice","PSK & PNK","Other"
];

const CATEGORY_COLORS = {
  Salary:"#2563eb",
  Mess:"#16a34a",
  Vegetables:"#f59e0b",
  Curd:"#db2777",
  WiFi:"#7c3aed",
  Electricity:"#0ea5e9",
  Gas:"#84cc16",
  Chicken:"#f97316",
  Egg:"#14b8a6",
  Phenol:"#e11d48",
  Rice:"#a855f7",
  "PSK & PNK":"#22c55e",
  Other:"#64748b"
};

export default function Expenses() {

  // ✅ default filter = TODAY
  const today = new Date().toISOString().split("T")[0];

  const [expenses,setExpenses]=useState([]);
  const [loading,setLoading]=useState(true);
  const [dialogOpen,setDialogOpen]=useState(false);
  const [editingId,setEditingId]=useState(null);
  const [deleteId,setDeleteId]=useState(null);

  const [filterDate,setFilterDate]=useState(today);
  const [filterCategory,setFilterCategory]=useState("all");

  const [formData,setFormData]=useState({
    date: today,
    category:"",
    description:"",
    amount:"",
    remarks:""
  });

  useEffect(()=>{ fetchExpenses(); },[]);

  const fetchExpenses = async ()=>{
    try{
      const res = await axios.get(`${API}/expenses`);
      setExpenses(res.data);
    } catch {
      toast.error("Failed to fetch expenses");
    } finally {
      setLoading(false);
    }
  };

  /* ================= FILTER ================= */

  const filtered = expenses.filter(e=>{
    const dateMatch = filterDate ? e.date === filterDate : true;
    const catMatch = filterCategory==="all" ? true : e.category===filterCategory;
    return dateMatch && catMatch;
  });

  const totalFiltered = filtered.reduce((s,e)=>s+e.amount,0);

  /* ================= CHART DATA ================= */

  const pieData = Object.values(
    filtered.reduce((acc,e)=>{
      acc[e.category] ??= {name:e.category,value:0};
      acc[e.category].value += e.amount;
      return acc;
    },{})
  );

  const monthlyData = Object.values(
    filtered.reduce((acc,e)=>{
      const m = e.date.slice(0,7);
      acc[m] ??= {month:m,total:0};
      acc[m].total += e.amount;
      return acc;
    },{})
  );

  /* ================= CRUD ================= */

  const handleSubmit = async e=>{
    e.preventDefault();

    const payload={
      ...formData,
      amount:parseFloat(formData.amount)||0
    };

    try{
      editingId
        ? await axios.put(`${API}/expenses/${editingId}`,payload)
        : await axios.post(`${API}/expenses`,payload);

      toast.success("Saved");
      fetchExpenses();
      closeDialog();
    } catch(err){
      toast.error(err.response?.data?.detail || "Save failed");
    }
  };

  const closeDialog = ()=>{
    setDialogOpen(false);
    setEditingId(null);
    setFormData({
      date: today,
      category:"",
      description:"",
      amount:"",
      remarks:""
    });
  };

  const editRow = e=>{
    setEditingId(e.id);
    setFormData(e);
    setDialogOpen(true);
  };

  const deleteRow = async ()=>{
    try {
      await axios.delete(`${API}/expenses/${deleteId}`);
      toast.success("Deleted");
      fetchExpenses();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleteId(null);
    }
  };

  /* ================= UI ================= */

  return (
<div className="max-w-6xl mx-auto p-8 space-y-8">

{/* ===== FILTER BAR ===== */}

<Card className="p-6 rounded-xl shadow-sm">
<div className="flex flex-wrap gap-6 items-end">

<div>
<Label className="text-xs text-gray-500 mb-1">Filter Date</Label>
<Input type="date"
value={filterDate}
onChange={e=>setFilterDate(e.target.value)}
className="w-56 h-11"/>
</div>

<div>
<Label className="text-xs text-gray-500 mb-1">Category</Label>
<Select value={filterCategory} onValueChange={setFilterCategory}>
<SelectTrigger className="w-60 h-11">
<SelectValue placeholder="All Categories"/>
</SelectTrigger>
<SelectContent>
<SelectItem value="all">All</SelectItem>
{CATEGORIES.map(c=>(
<SelectItem key={c} value={c}>
<div className="flex gap-2 items-center">
<span className="w-3 h-3 rounded-full"
style={{background:CATEGORY_COLORS[c]}}/>
{c}
</div>
</SelectItem>
))}
</SelectContent>
</Select>
</div>

<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
<DialogTrigger asChild>
<Button className="h-11 bg-slate-900 ml-auto px-6">
<Plus className="w-4 h-4 mr-2"/> Add Expense
</Button>
</DialogTrigger>

<DialogContent>
<DialogHeader>
<DialogTitle>{editingId?"Edit":"Add"} Expense</DialogTitle>
</DialogHeader>

<form onSubmit={handleSubmit} className="space-y-4">

<Input type="date"
value={formData.date}
onChange={e=>setFormData({...formData,date:e.target.value})}/>

<Select value={formData.category}
onValueChange={v=>setFormData({...formData,category:v})}>
<SelectTrigger><SelectValue placeholder="Category"/></SelectTrigger>
<SelectContent>
{CATEGORIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}
</SelectContent>
</Select>

<Input placeholder="Description"
value={formData.description}
onChange={e=>setFormData({...formData,description:e.target.value})}/>

<Input type="number" placeholder="Amount"
value={formData.amount}
onChange={e=>setFormData({...formData,amount:e.target.value})}/>

<Textarea placeholder="Remarks"
value={formData.remarks}
onChange={e=>setFormData({...formData,remarks:e.target.value})}/>

<Button type="submit">Save</Button>

</form>
</DialogContent>
</Dialog>

</div>
</Card>

{/* ===== SUMMARY ===== */}

<Card className="p-5 text-lg font-semibold">
Total for {filterDate}: ₹ {totalFiltered.toFixed(2)}
</Card>
{/* ===== TABLE — UI IMPROVED ===== */}

<Card className="p-0 overflow-hidden rounded-2xl border shadow-sm">

<div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b">
  <h2 className="text-lg font-semibold text-slate-800">
    Expense Entries
  </h2>
</div>

<div className="overflow-x-auto">

<table className="w-full text-sm">

<thead>
<tr className="text-left text-slate-600 text-xs uppercase tracking-wider bg-slate-50">
<th className="px-6 py-4">Date</th>
<th className="px-6 py-4">Category</th>
<th className="px-6 py-4">Description</th>
<th className="px-6 py-4 text-right">Amount</th>
<th className="px-6 py-4 text-center">Actions</th>
</tr>
</thead>

<tbody>

{filtered.map((e,i)=>(
<tr
key={e.id}
className={`
border-t hover:bg-slate-50 transition
${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}
`}
>

<td className="px-6 py-4 font-medium text-slate-700">
{e.date}
</td>

<td className="px-6 py-4">
<div className="flex items-center gap-2">
<span
className="w-2.5 h-2.5 rounded-full"
style={{background:CATEGORY_COLORS[e.category]}}
/>
<span className="font-medium">
{e.category}
</span>
</div>
</td>

<td className="px-6 py-4 text-slate-600">
{e.description || "-"}
</td>

<td className="px-6 py-4 text-right font-semibold text-red-600">
₹ {e.amount}
</td>

<td className="px-6 py-4">
<div className="flex justify-center gap-2">

<Button
size="icon"
variant="ghost"
className="hover:bg-blue-50"
onClick={()=>editRow(e)}
>
<Edit className="w-4 h-4 text-blue-600"/>
</Button>

<Button
size="icon"
variant="ghost"
className="hover:bg-red-50"
onClick={()=>setDeleteId(e.id)}
>
<Trash2 className="w-4 h-4 text-red-600"/>
</Button>

</div>
</td>

</tr>
))}

{filtered.length === 0 && (
<tr>
<td colSpan={5} className="text-center py-12 text-slate-500">
No expenses found for selected filters
</td>
</tr>
)}

</tbody>
</table>

</div>
</Card>

{/* ===== CHARTS ===== */}

<div className="grid md:grid-cols-2 gap-6">

<Card className="p-6">
<h3 className="font-semibold mb-4">Category Distribution</h3>
<ResponsiveContainer width="100%" height={280}>
<PieChart>
<Pie data={pieData} dataKey="value">
{pieData.map(d=>(
<Cell key={d.name} fill={CATEGORY_COLORS[d.name]}/>
))}
</Pie>
<Tooltip/>
</PieChart>
</ResponsiveContainer>
</Card>

<Card className="p-6">
<h3 className="font-semibold mb-4">Monthly Trend</h3>
<ResponsiveContainer width="80%" height={280}>
<BarChart data={monthlyData}>
<XAxis dataKey="month"/>
<YAxis/>
<Tooltip/>
<Bar dataKey="total" fill="#2563eb" radius={[1,1,0,0]}/>
</BarChart>
</ResponsiveContainer>
</Card>

</div>



{/* DELETE CONFIRM */}

<AlertDialog open={!!deleteId} onOpenChange={()=>setDeleteId(null)}>
<AlertDialogContent>
<AlertDialogHeader>
<AlertDialogTitle>Delete Expense?</AlertDialogTitle>
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
