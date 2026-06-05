import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import PageHeader from "../../components/PageHeader";
import WarehousePieChart from "../../charts/WarehousePieChart";
import SalesPurchaseBarChart from "../../charts/SalesPurchaseBarChart";

import "./dashboard.css";

export default function Dashboard() {

    const today = new Date();

    const [data, setData] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [loadingChart, setLoadingChart] = useState(false);

    const [view, setView] = useState("live");
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [week, setWeek] = useState(null);

    // 🔥 Animation direction
    const [direction, setDirection] = useState(1);

    // ================= FETCH SUMMARY =================
    useEffect(() => {
        fetch("https://underwear-locks-latinas-anonymous.trycloudflare.com/dashboard-summary")
            .then(res => res.json())
            .then(setData);
    }, []);

    // ================= FETCH CHART =================
    useEffect(() => {
        setLoadingChart(true);

        let url = `https://underwear-locks-latinas-anonymous.trycloudflare.com/chart-data?view=${view}`;

        if (view !== "live") {
            if (year) url += `&year=${year}`;
            if (month) url += `&month=${month}`;
        }

        if (view === "day" && week) {
            url += `&week_start=${week}`;
        }

        fetch(url)
            .then(res => res.json())
            .then((res) => {
                setChartData(res);
                setLoadingChart(false);
            });

    }, [view, year, month, week]);

    if (!data) return <div className="skeleton"></div>;

    return (
        <div className="dashboard-container">

            <PageHeader title="Dashboard" breadcrumbs={['Home', 'Dashboard']} />

            {/* ================= KPI CARDS ================= */}
            <div className="dashboard-grid">

                {[
                    {
                        icon: "👥", 
                        label: "Active Customers", 
                        value: data.customers.active,
                        total: data.customers.total,
                        active: data.customers.active, 
                        inactive: data.customers.inactive
                    },
                    {
                        icon: "🏭", 
                        label: "Active Suppliers", 
                        value: data.vendors.active, 
                        total: data.vendors.total, 
                        active: data.vendors.active, 
                        inactive: data.vendors.inactive
                    },
                    {
                        icon: "📦", 
                        label: "Active Products", 
                        value: data.products.active, 
                        total: data.products.total, 
                        active: data.products.active, 
                        inactive: data.products.inactive
                    },
                    { icon: "📈", label: "Material Awaiting", value: data.waiting_Approve },
                    { icon: "🔄", label: "Total Stock Available", value: data.available_stock },
                    { icon: "⚠️", label: "Total Expired QTY", value: data.expired_products },
                ].map((item, i) => (
                    <motion.div
                        key={i}
                        className="card kpi tooltip-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <span>{item.icon}</span>

                        <div className="tooltip-wrapper">
                            <p>{item.label}</p>
                            <h2>{item.value}</h2>

                            {/* ✅ Show tooltip ONLY for customers */}
                            {item.active !== undefined && (
                                <div className="tooltip-box">
                                    <h3>Total : {item.total}</h3>
                                    <p>Active: {item.active}</p>
                                    <p>Inactive: {item.inactive}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}

            </div>

            {/* ================= SALES + PIE ================= */}
            <div className="dashboard-row">

                <div className="card">
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px" }}>
  <h3 style={{ margin:0 }}>Sales & Purchase</h3>
  <div
    onClick={() => window.location.href = '/help?section=dashboard'}
    style={{ cursor:"pointer", display:"inline-flex", alignItems:"center" }}
    title="View Sales & Purchase help"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
    <div className="tooltip" style={{ display:"none", position:"absolute", top:"22px", left:"50%", transform:"translateX(-50%)", background:"#1f2937", color:"#fff", padding:"8px 12px", borderRadius:"6px", fontSize:"12px", whiteSpace:"nowrap", zIndex:100, boxShadow:"0 4px 12px rgba(0,0,0,0.2)", fontWeight:"400" }}>
      Total sold and purchased quantities and amounts.
    </div>
  </div>
</div>

                    <div className="sales-grid">
                        <div className="box"><p>Total Sold QTY</p><h2>{data.sold_qty}</h2></div>
                        <div className="box"><p>Total Purchased QTY</p><h2>{data.purchase_qty}</h2></div>
                        <div className="box"><p>Sold Amount</p><h2>{data.sold_amount}</h2></div>
                        <div className="box"><p>Purchased Amount</p><h2>{data.purchase_amount}</h2></div>
                    </div>
                </div>

                <div className="card pie-card">
                <div className="pie-container">

            {/* LEFT → Pie Chart */}
            <div className="pie-chart-wrapper">
                <WarehousePieChart data={data.warehouse_status} />
            </div>

            {/* RIGHT → Text */}
            <div className="pie-content">
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"8px" }}>
  <h3 className="pie-title" style={{ margin:0 }}>Warehouse Status</h3>
  <div
  onClick={() => window.location.href = '/help?section=dashboard'}
  style={{ cursor:"pointer", display:"inline-flex", alignItems:"center" }}
  title="View Warehouse Status help"
>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>

    <div className="tooltip" style={{ display:"none", position:"absolute", top:"22px", left:"50%", transform:"translateX(-50%)", background:"#1f2937", color:"#fff", padding:"8px 12px", borderRadius:"6px", fontSize:"12px", whiteSpace:"nowrap", zIndex:100, boxShadow:"0 4px 12px rgba(0,0,0,0.2)", fontWeight:"400" }}>
      Available, occupied, and restricted locations across all warehouses.
    </div>
  </div>
</div>
            </div>

        </div>
    </div>

            </div>

            {/* ================= TABLE + CHART ================= */}
            <div className="dashboard-row">


                {/* ================= CHART ================= */}
                <div className="card">
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px" }}>
  <h3 style={{ margin:0 }}>Sales vs Purchase</h3>
 <div
  onClick={() => window.location.href = '/help?section=dashboard'}
  style={{ cursor:"pointer", display:"inline-flex", alignItems:"center" }}
  title="View Sales vs Purchase help"
>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
    <div className="tooltip" style={{ display:"none", position:"absolute", top:"22px", left:"50%", transform:"translateX(-50%)", background:"#1f2937", color:"#fff", padding:"8px 12px", borderRadius:"6px", fontSize:"12px", whiteSpace:"nowrap", zIndex:100, boxShadow:"0 4px 12px rgba(0,0,0,0.2)", fontWeight:"400" }}>
      Bar chart comparing sales and purchase trends — filter by month or live view.
    </div>
  </div>
</div>

                    {/* FILTER UI */}
                    <div className="filters">

                        <div className="tabs">
                            <button 
                                className={view==="live" ? "active" : ""}
                                onClick={()=>{
                                    const now = new Date();

                                    setDirection(-1);
                                    setView("live");

                                    setYear(now.getFullYear());   // ✅ reset year
                                    setMonth(now.getMonth() + 1); // ✅ reset month
                                    setWeek(null);
                                }}
                            >
                                Live
                            </button>

                            <button 
                                className={view==="week" ? "active" : ""}
                                onClick={()=>{
                                    setDirection(1);
                                    setView("week");
                                }}
                            >
                                Monthly
                            </button>
                        </div>

                        <select value={year} onChange={(e)=>setYear(Number(e.target.value))}>
                            {[2023,2024,2025,2026].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>

                        <select value={month} onChange={(e)=>setMonth(Number(e.target.value))}>
                            {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
                            .map((m,i)=>(
                                <option key={i} value={i+1}>{m}</option>
                            ))}
                        </select>

                    </div>

                    {/* 🔥 ANIMATED CHART */}
                    <AnimatePresence mode="wait">

                        {loadingChart ? (
                            <motion.div
                                key="loader"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="skeleton-chart"
                            />
                        ) : (
                            <motion.div
                                key={view + year + month + (week || "")}
                                initial={{ opacity: 0, x: direction * 80 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: direction * -80 }}
                                transition={{ duration: 0.4 }}
                            >
                                <SalesPurchaseBarChart 
                                    data={chartData}
                                    onBarClick={(weekStart)=>{
                                        setDirection(1);
                                        setWeek(weekStart);
                                        setView("day");
                                    }}
                                />
                            </motion.div>
                        )}

                    </AnimatePresence>

                </div>

                {/* TABLE */}
                <div className="card">
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px" }}>
  <h3 style={{ margin:0 }}>Low Stock</h3>
 <div
  onClick={() => window.location.href = '/help?section=dashboard'}
  style={{ cursor:"pointer", display:"inline-flex", alignItems:"center" }}
  title="View Low Stock help"
>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
    <div className="tooltip" style={{ display:"none", position:"absolute", top:"22px", left:"50%", transform:"translateX(-50%)", background:"#1f2937", color:"#fff", padding:"8px 12px", borderRadius:"6px", fontSize:"12px", whiteSpace:"nowrap", zIndex:100, boxShadow:"0 4px 12px rgba(0,0,0,0.2)", fontWeight:"400" }}>
      Products below minimum stock — shows shortage and auto PO quantities.
    </div>
  </div>
</div>

                    <div className="table-container">
                        <table className="stock-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Available Stock</th>
                                    <th>Auto Po Qty</th>
                                    <th>Approved Qty</th>
                                    <th>Shortage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.low_stock?.length > 0 ? (
                                    data.low_stock.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.name}</td>
                                            <td>{item.available_qty}</td>
                                            <td>{item.auto_created_qty}</td>
                                            <td>{item.approved_qty}</td>
                                            <td>{item.shortage}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: "center" }}>
                                            No low stock items
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    );
}