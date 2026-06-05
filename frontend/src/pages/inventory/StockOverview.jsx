import { useEffect, useState } from "react";
import PageHeader from '../../components/PageHeader';
import TopTabNav from '../../components/TopTabNav';
import { motion } from "framer-motion";
import WarehouseValuePieChart from "../../charts/WarehouseValuePieChart";
import ProductTypeBarChart from "../../charts/ProductTypeBarChart";
import ProductStockPieChart from "../../charts/ProductStockPieChart";
import "./stockOverview.css";
import { jwtDecode } from "jwt-decode";
import { getAuthHeaders } from "../../utils/authHeaders";


const getRoleTabs = () => {
  const token = localStorage.getItem("token");
  let role = null;

  if (token) {
    try {
      const decoded = jwtDecode(token);
      role = decoded.role?.toUpperCase();
    } catch {
      role = null;
    }
  }

  if (role === "ADMIN" || role === "INVENTORY MANAGER") {
    return [
        { label: 'Stock Overview', path: '/inventory/stock-overview' },
        { label: 'Batches', path: '/inventory/batches' },
        { label: 'Movements', path: '/inventory/movements' },
        { label: 'Stock View', path: '/inventory/stock-view' },
    ];
  }

  if (role === "PURCHASE MANAGER") {
    return [
        { label: 'Stock Overview', path: '/inventory/stock-overview' },
        { label: 'Low Stock', path: '/inventory/low-stock' },
    ];
  }


  return [];
};







export default function StockOverview() {
    
    const tabs = getRoleTabs()
    
    const [kpi, setKpi] = useState({
        waiting_orders: 0,
        completed_orders: 0,
        cancelled_orders: 0,
        expiring_today: 0,
        demand: 0,
        total_order: 0,
        warehouse_inventory_value: [],
        product_type_summary: [],
        product_wie_stock: [],
        vendor_kpi: [],
        customer_kpi: []
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {

    const loadDashboard = async () => {

        try {

            const res = await fetch(
                "http://localhost:8000/inventory-dashboard",
                {
                    headers: getAuthHeaders()
                }
            );

            // ✅ Session expired
            if (res.status === 401) {

                localStorage.clear();

                window.location.href = "/";

                return;
            }

            const data = await res.json();

            setKpi(data);

        } 
        catch (err) {

            console.error("KPI API Error:", err);

        } 
        finally {

            setLoading(false);
        }
    };

    loadDashboard();

}, []);

    // ✅ SORT CUSTOMERS (Top Spend First)
    const sortedCustomers = [...(kpi.customer_kpi || [])]
        .sort((a, b) => Number(b.total_spend) - Number(a.total_spend));

    const cards = [
        { title: "Waiting Orders", value: kpi.waiting_orders, icon: "⏳", color: "#f59e0b" },
        { title: "Completed Orders", value: kpi.completed_orders, icon: "✅", color: "#10b981" },
        { title: "Cancelled Orders", value: kpi.cancelled_orders, icon: "❌", color: "#ef4444" },
        { title: "Expiring Today", value: kpi.expiring_today, icon: "⚠️", color: "#6366f1" },
        { title: "Demand", value: kpi.demand, icon: "📊", color: "#3b82f6" },
        {
            title: "Total Order",
            value: ` ${Number(kpi.total_order || 0).toLocaleString()}`,
            icon: "💰",
            color: "#8b5cf6"
        }
    ];

    if (loading) {
        return <div className="skeleton">Loading...</div>;
    }

    return (
        <div className="fade-in">

            <PageHeader 
                title="Stock Overview"
                breadcrumbs={['Inventory', 'Stock Overview']}
            />

            <TopTabNav tabs={tabs} />

            {/* KPI CARDS */}
            <div className="kpi-grid">
                {cards.map((card, index) => (
                    <motion.div 
                        key={index}
                        className="kpi-card"
                        style={{ borderTop: `4px solid ${card.color}` }}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <div className="kpi-header">
                            <span className="kpi-icon">{card.icon}</span>
                            <span className="kpi-title">{card.title}</span>
                        </div>

                        <div className="kpi-value">
                            {card.value ?? 0}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
  <h2 className="section-title" style={{ margin: 0 }}>Inventory Analytics</h2>
  <div style={{ position: "relative", display: "inline-block" }}
    onMouseEnter={e => e.currentTarget.querySelector(".tooltip").style.display = "block"}
    onMouseLeave={e => e.currentTarget.querySelector(".tooltip").style.display = "none"}
    onClick={() => window.location.href = "/help?section=stock-overview"}>
    <svg width="18"height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: "pointer" }}>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
    <div className="tooltip" style={{ display:"none", position:"absolute", top:"24px", left:"50%", transform:"translateX(-50%)", background:"#1f2937", color:"#fff", padding:"8px 12px", borderRadius:"6px", fontSize:"12px", whiteSpace:"nowrap", zIndex:100, boxShadow:"0 4px 12px rgba(0,0,0,0.2)" }}>
      Visual breakdown of inventory value, type, and product-level stock.
    </div>
  </div>
</div>

            {/* CHARTS */}
            <div className="dashboard-row-3">

                <motion.div className="card one-third">
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
  <h3 style={{ margin:0 }}>Warehouse Inventory Value</h3>
  <div style={{ position:"relative", display:"inline-block" }}
    onMouseEnter={e => e.currentTarget.querySelector(".tooltip").style.display = "block"}
    onMouseLeave={e => e.currentTarget.querySelector(".tooltip").style.display = "none"}
    onClick={() => window.location.href = "/help?section=stock-overview"}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor:"pointer" }}>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
    <div className="tooltip" style={{ display:"none", position:"absolute", top:"22px", left:"50%", transform:"translateX(-50%)", background:"#1f2937", color:"#fff", padding:"8px 12px", borderRadius:"6px", fontSize:"12px", whiteSpace:"nowrap", zIndex:100, boxShadow:"0 4px 12px rgba(0,0,0,0.2)" }}>
      Click to view Stock Overview help
    </div>
  </div>
</div>
                    <WarehouseValuePieChart data={kpi.warehouse_inventory_value} />
                </motion.div>

                <motion.div className="card one-third">
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
  <h3 style={{ margin:0 }}>Stock by Type</h3>
 <div
  onClick={() => window.location.href = "/help?section=stock-overview"}
  style={{ cursor:"pointer", display:"inline-flex", alignItems:"center" }}
  title="View Stock by Type help"
>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
    <div className="tooltip" style={{ display:"none", position:"absolute", top:"22px", left:"50%", transform:"translateX(-50%)", background:"#1f2937", color:"#fff", padding:"8px 12px", borderRadius:"6px", fontSize:"12px", whiteSpace:"nowrap", zIndex:100, boxShadow:"0 4px 12px rgba(0,0,0,0.2)" }}>
      Click to view Stock Overview help
    </div>
  </div>
</div>
                    <ProductTypeBarChart data={kpi.product_type_summary} />
                </motion.div>

                <motion.div className="card one-third">
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
  <h3 style={{ margin:0 }}>Product-wise Stock</h3>
  <div
  onClick={() => window.location.href = "/help?section=stock-overview"}
  style={{ cursor:"pointer", display:"inline-flex", alignItems:"center" }}
  title="View Product-wise Stock help"
>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
    <div className="tooltip" style={{ display:"none", position:"absolute", top:"22px", left:"50%", transform:"translateX(-50%)", background:"#1f2937", color:"#fff", padding:"8px 12px", borderRadius:"6px", fontSize:"12px", whiteSpace:"nowrap", zIndex:100, boxShadow:"0 4px 12px rgba(0,0,0,0.2)" }}>
      Click to view Stock Overview help
    </div>
  </div>
</div>
                    <ProductStockPieChart data={kpi.product_wie_stock} />
                </motion.div>

            </div>

            {/* TABLES */}
            <div className="dashboard-split">

                {/* VENDOR */}
                <div className="card half">
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
  <h3 style={{ margin:0 }}>Vendor Performance</h3>
 <div
  onClick={() => window.location.href = "/help?section=stock-overview"}
  style={{ cursor:"pointer", display:"inline-flex", alignItems:"center" }}
  title="View Vendor Performance help"
>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
    <div className="tooltip" style={{ display:"none", position:"absolute", top:"22px", left:"50%", transform:"translateX(-50%)", background:"#1f2937", color:"#fff", padding:"8px 12px", borderRadius:"6px", fontSize:"12px", whiteSpace:"nowrap", zIndex:100, boxShadow:"0 4px 12px rgba(0,0,0,0.2)" }}>
      Click to view Stock Overview help
    </div>
  </div>
</div>

                    <div className="table-container">
                        <table className="vendor-table">
                            <thead>
                                <tr>
                                    <th>Vendor</th>
                                    <th>Total Purchase</th>
                                    <th>Completed</th>
                                    <th>On-Time %</th>
                                    <th>Lead Time</th>
                                    <th>Reject %</th>
                                </tr>
                            </thead>

                            <tbody>
                                {kpi.vendor_kpi?.map((v, i) => (
                                    <tr key={i}>
                                        <td>{v.vendor_id}</td>
                                        <td>₹ {Number(v.total_purchase_value).toLocaleString()}</td>
                                        <td>{v.completed_orders}</td>
                                        <td>{v.on_time_delivery_pct}%</td>
                                        <td>{v.avg_delivery_days} d</td>
                                        <td>{v.rejection_rate}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* CUSTOMER */}
                <div className="card half">
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
  <h3 style={{ margin:0 }}>Customer Performance</h3>
  <div
  onClick={() => window.location.href = "/help?section=stock-overview"}
  style={{ cursor:"pointer", display:"inline-flex", alignItems:"center" }}
  title="View Customer Performance help"
>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
    <div className="tooltip" style={{ display:"none", position:"absolute", top:"22px", left:"50%", transform:"translateX(-50%)", background:"#1f2937", color:"#fff", padding:"8px 12px", borderRadius:"6px", fontSize:"12px", whiteSpace:"nowrap", zIndex:100, boxShadow:"0 4px 12px rgba(0,0,0,0.2)" }}>
      Click to view Stock Overview help
    </div>
  </div>
</div>

                    <div className="table-container">
                        <table className="vendor-table">
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Orders</th>
                                    <th>Spend</th>
                                    <th>Avg Value</th>
                                    <th>Last Order</th>
                                </tr>
                            </thead>

                            <tbody>
                                {sortedCustomers.length > 0 ? (
                                    sortedCustomers.map((c, i) => {
                                        const isTop = i === 0;
                                        const isSecond = i === 1;
                                        const isThird = i === 2;

                                        return (
                                            <tr
                                                key={i}
                                                className={
                                                    isTop ? "top-gold" :
                                                    isSecond ? "top-silver" :
                                                    isThird ? "top-bronze" : ""
                                                }
                                            >
                                                <td>
                                                    {isTop && "🥇 "}
                                                    {isSecond && "🥈 "}
                                                    {isThird && "🥉 "}
                                                    {c.customer_id}
                                                </td>

                                                <td>
                                                    <span className="good">{c.completed_orders}</span>
                                                    {" / "}
                                                    <span className="bad">{c.cancelled_orders}</span>
                                                </td>

                                                <td>₹ {Number(c.total_spend).toLocaleString()}</td>
                                                <td>₹ {Number(c.avg_order_value).toLocaleString()}</td>
                                                <td>
                                                    {c.last_order_date
                                                        ? new Date(c.last_order_date).toLocaleDateString()
                                                        : "-"}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5">No Data</td>
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