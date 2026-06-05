import { useState, useEffect, useRef } from "react";
import PageHeader from "../../components/PageHeader";
import TopTabNav from "../../components/TopTabNav";
import { jwtDecode } from "jwt-decode";
import { getAuthHeaders } from "../../utils/authHeaders";
import { format } from "date-fns";

const API = "https://expand-best-therapist-surgeon.trycloudflare.com";

const getRoleTabs = () => {
  const token = localStorage.getItem("token");
  let role = null;
  if (token) {
    try { role = jwtDecode(token).role?.toUpperCase(); } catch { role = null; }
  }
  if (role === "ADMIN" || role === "INVENTORY MANAGER" || role === "SALES MANAGER") {
    return [
      { label: 'Sales Orders', path: '/orders/sales-orders' },
      { label: 'Pick Tasks', path: '/orders/pick-tasks' },
      { label: 'Package', path: '/orders/package' },
    ];
  }
  return [];
};

const STATUS_CONFIG = {
  OPEN:               { color: "#856404", background: "#fff3cd", border: "#ffeeba", icon: "○", label: "OPEN" },
  RESERVED:           { color: "#155724", background: "#d4edda", border: "#c3e6cb", icon: "◈", label: "Reserved" },
  PARTIALLY_RESERVED: { color: "#004085", background: "#cce5ff", border: "#b8daff", icon: "◑", label: "Partially Reserved" },
  COMPLETED:          { color: "#155724", background: "#d4edda", border: "#c3e6cb", icon: "✓", label: "Completed" },
  Completed:          { color: "#155724", background: "#d4edda", border: "#c3e6cb", icon: "✓", label: "Completed" },
  CANCELLED:          { color: "#721c24", background: "#f8d7da", border: "#f5c6cb", icon: "✕", label: "Cancelled" },
  OUT:                { color: "#0c5460", background: "#d1ecf1", border: "#bee5eb", icon: "→", label: "OUT" },
};

const fmt = (n) => {
  const num = Number(n || 0);
  if (num < 0) return "—";
  return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

function Badge({ status }) {
  const cfg = STATUS_CONFIG[status] || { color: "#333", background: "#eee", border: "#ddd", icon: "·", label: status };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 8px", borderRadius: "4px",
      background: cfg.background, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontSize: "0.85em", fontWeight: 500,
    }}>
      <span>{cfg.icon}</span> {cfg.label}
    </span>
  );
}

function Modal({ open, onClose, title, children, width="500px" }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: "4px",
        padding: "20px", minWidth: 400, maxWidth: "95%", width: width,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={{
            border: "none", background: "#f8f9fa", color: "#6c757d",
            borderRadius: "4px", width: 30, height: 30, cursor: "pointer",
            fontSize: 16,
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function SalesOrders() {
  const tabs = getRoleTabs();

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [showCancel, setShowCancel] = useState(null);
  const [showDetails, setShowDetails] = useState(null);
  const [toast, setToast] = useState(null);
  
  const [form, setForm] = useState({ customer_id: "" });
  const [lines, setLines] = useState([{ product_id: "", ordered_qty: "" }]);
  
  const [submitting, setSubmitting] = useState(false);
  const toastRef = useRef();
  const requestIdRef = useRef(crypto.randomUUID());

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
  setLoading(true);

  try {

    const ordersRes = await fetch(`${API}/sales-orders-read`, {
      headers: getAuthHeaders()
    });

    // Auto logout if token expired
    if (ordersRes.status === 401) {
      localStorage.clear();
      window.location.href = "/";
      return;
    }

    const productsRes = await fetch(`${API}/products-dropdown`, {
      headers: getAuthHeaders()
    });

    const customersRes = await fetch(`${API}/customers-read`, {
      headers: getAuthHeaders()
    });

    const o = await ordersRes.json();
    const p = await productsRes.json();
    const c = await customersRes.json();

    setOrders(Array.isArray(o) ? o : []);
    setProducts(Array.isArray(p) ? p : []);
    setCustomers(Array.isArray(c) ? c : []);

  } catch (err) {
    console.error(err);
    showToast("Failed to load data", "error");
  }

  setLoading(false);
};

  useEffect(() => { load(); }, []);

  const handleLineChange = (index, field, value) => {
    const newLines = [...lines];
    if (field === "ordered_qty" && value !== "") {
      const numValue = parseInt(value);
      if (numValue < 1) value = 1;
    }
    newLines[index][field] = value;
    setLines(newLines);
  };

  const handleAddLine = () => setLines([...lines, { product_id: "", ordered_qty: "" }]);
  const handleRemoveLine = (idx) => setLines(lines.filter((_, i) => i !== idx));

  const handleCreate = async () => {
    if (!form.customer_id) {
      showToast("Please select Customer", "error");
      return;
    }
    if (lines.length === 0) {
      showToast("Please add at least one line item", "error");
      return;
    }
    for (let l of lines) {
      if (!l.product_id || !l.ordered_qty || parseInt(l.ordered_qty) < 1) {
        showToast("All lines must have a product and quantity >= 1", "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_id: form.customer_id,
        request_id: requestIdRef.current,
        lines: lines.map(l => ({ product_id: l.product_id, ordered_qty: parseInt(l.ordered_qty) }))
      };
      
      const res = await fetch(`${API}/sales-orders-create`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      // Auto logout if token expired
      if (res.status === 401) {
        localStorage.clear();
        window.location.href = "/";
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      showToast(`Order ${data.order_number || data.so_number || 'created'} successfully!`);
      setShowCreate(false);
      setForm({ customer_id: "" });
      setLines([{ product_id: "", ordered_qty: "" }]);
      load();
      requestIdRef.current = crypto.randomUUID();
    } catch (e) {
      showToast(e.message, "error");
    }
    setSubmitting(false);
  };

  const cancelOrder = async (id) => {
  try {

    const requestId = crypto.randomUUID();

    const res = await fetch(
      `${API}/sales-orders-cancel/${id}`,
      {
        method: "POST",
        headers: {
        ...getAuthHeaders(),
        "request_id": requestId
      }
      }
    );

    // Auto logout if token expired
    if (res.status === 401) {
      localStorage.clear();
      window.location.href = "/";
      return;
    }

    const data = await res.json();

    if (!res.ok)
      throw new Error(data.detail || "Failed");

    showToast("Order cancelled successfully");

    setShowCancel(null);

    load();

  } catch (e) {
    showToast(e.message, "error");
  }
};

  const isCompletedOrFinal = (status) => {
    return ["COMPLETED", "Completed", "OUT", "Issued", "PACKED", "DISPATCHED", "CANCELLED", "Cancelled"].includes(status);
  };

  const filteredOrders = orders.filter(order => {
    const sl = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      (order.so_number || order.order_no || "").toLowerCase().includes(sl) ||
      (order.customer_id || "").toLowerCase().includes(sl);

    const matchesStatus = statusFilter === "ALL" ||
      order.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const statuses = ["ALL", "OPEN", "PARTIALLY_RESERVED", "RESERVED", "OUT", "Completed", "CANCELLED"];

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), 'dd-MMM-yyyy hh:mm a');
    } catch {
      return new Date(dateStr).toLocaleString();
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <PageHeader title="Sales Orders" breadcrumbs={["Orders", "Sales Orders"]} />
      <TopTabNav tabs={tabs} />

      {/* ADDED: Main Page Heading */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: 0, marginBottom: "20px" }}>
  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 500 }}>Sales Orders</h3>
<div
    style={{ position: "relative", display: "inline-block" }}
    onMouseEnter={e => e.currentTarget.querySelector(".tooltip").style.display = "block"}
    onMouseLeave={e => e.currentTarget.querySelector(".tooltip").style.display = "none"}
    onClick={() => window.location.href = "/help?section=sales-order"}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="#6b7280" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" style={{ cursor: "pointer", marginTop: "2px" }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
    <div className="tooltip" style={{
      display: "none", position: "absolute", top: "24px", left: "50%",
      transform: "translateX(-50%)", background: "#1f2937", color: "#fff",
      padding: "8px 12px", borderRadius: "6px", fontSize: "12px",
      whiteSpace: "nowrap", zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      fontWeight: "400",
    }}>
      Click to view Sales Order help
    </div>
  </div>
</div>

      <div style={{ marginBottom: "20px", textAlign: "right" }}>
        <button onClick={() => setShowCreate(true)}
          style={{ padding: "10px 20px", background: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          + New Order
        </button>
      </div>

      <div style={{ background: "white", padding: "20px", margin: "20px 0", border: "1px solid #ddd", borderRadius: "4px", display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "300px" }}>
          <input type="text" placeholder="Search by order #, customer..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", height: "38px", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {statuses.map(s => {
            const style = s === "ALL" ? { icon: "📋", label: "All" } : STATUS_CONFIG[s] || { icon: "📦", label: s };
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ padding: "5px 10px", background: statusFilter === s ? "#007bff" : "white", color: statusFilter === s ? "white" : "#333", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer", height: "38px", whiteSpace: "nowrap" }}>
                {style.icon} {style.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ background: "white", padding: "20px", margin: "20px 0", border: "1px solid #ddd", borderRadius: "4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h4>Orders List ({filteredOrders.length})</h4>
          <button onClick={load}
            style={{ padding: "5px 10px", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", height: "38px" }}>
            Refresh
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#f8f9fa" }}>
                <th style={{ padding: "12px", border: "1px solid #ddd", textAlign: "left" }}>#</th>
                <th style={{ padding: "12px", border: "1px solid #ddd", textAlign: "left" }}>Order No</th>
                <th style={{ padding: "12px", border: "1px solid #ddd", textAlign: "left" }}>Customer</th>
                <th style={{ padding: "12px", border: "1px solid #ddd", textAlign: "left" }}>Total Amount</th>
                <th style={{ padding: "12px", border: "1px solid #ddd", textAlign: "left" }}>Status</th>
                <th style={{ padding: "12px", border: "1px solid #ddd", textAlign: "left" }}>Created By</th>
                <th style={{ padding: "12px", border: "1px solid #ddd", textAlign: "left" }}>Date</th>
                <th style={{ padding: "12px", border: "1px solid #ddd", textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ padding: "50px", textAlign: "center", border: "1px solid #ddd" }}>Loading orders...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: "50px", textAlign: "center", border: "1px solid #ddd" }}>No orders found</td></tr>
              ) : (
                filteredOrders.map((o, i) => {
                  const id = o.so_number || o.order_no;
                  const isCancellable = !isCompletedOrFinal(o.status);
                  const actionLabel =
                    o.status === "OUT" ? "Dispatched" :
                    ["COMPLETED", "Completed"].includes(o.status) ? "Completed" :
                    "Cancelled";

                  return (
                    <tr key={id}>
                      <td style={{ padding: "12px", border: "1px solid #ddd" }}>{i + 1}</td>
                      <td style={{ padding: "12px", border: "1px solid #ddd" }}><strong>{id}</strong></td>
                      <td style={{ padding: "12px", border: "1px solid #ddd" }}>{o.customer_name || o.customer_id || "-"}</td>
                      <td style={{ padding: "12px", border: "1px solid #ddd" }}>{fmt(o.total_amount)}</td>
                      <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                        <Badge status={o.status} />
                      </td>
                      <td style={{ padding: "12px", border: "1px solid #ddd" }}>{o.created_by || "-"}</td>
                      <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                        {formatDateTime(o.created_at || o.order_date)}
                      </td>
                      <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                        <button onClick={() => setShowDetails(o)}
                          style={{ padding: "5px 10px", background: "#17a2b8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "8px", fontSize: "12px" }}>
                          👁️ View
                        </button>
                        {isCancellable ? (
                          <button onClick={() => setShowCancel(o)}
                            style={{ padding: "5px 10px", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
                            Cancel
                          </button>
                        ) : (
                          <span style={{ padding: "5px 10px", background: "#e0e0e0", color: "#999", borderRadius: "4px", display: "inline-block", fontSize: "12px" }}>
                            {actionLabel}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && (
        <Modal open={true} onClose={() => setShowDetails(null)} title={`Order Details: ${showDetails.so_number || showDetails.order_no}`} width="700px">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
            <div><strong>Customer:</strong> {showDetails.customer_name || showDetails.customer_id}</div>
            <div><strong>Status:</strong> <Badge status={showDetails.status} /></div>
            <div><strong>Total Amount:</strong> {fmt(showDetails.total_amount)}</div>
            <div><strong>Date:</strong> {formatDateTime(showDetails.created_at || showDetails.order_date)}</div>
          </div>
          
          <h4 style={{ margin: "0 0 10px 0", borderBottom: "1px solid #ddd", paddingBottom: "5px" }}>Order Lines</h4>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Product</th>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Ordered</th>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Reserved</th>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Issued</th>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(showDetails.lines || []).map((l, i) => (
                <tr key={i}>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>{l.product_name || l.product_id}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>{fmt(l.ordered_qty)}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>{fmt(l.reserved_qty)}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>{fmt(l.issued_qty)}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>{l.status}</td>
                </tr>
              ))}
              {!(showDetails.lines && showDetails.lines.length > 0) && (
                <tr><td colSpan="5" style={{ padding: "8px", textAlign: "center" }}>No line items found.</td></tr>
              )}
            </tbody>
          </table>
          <div style={{ textAlign: "right", marginTop: "20px" }}>
            <button onClick={() => setShowDetails(null)}
              style={{ padding: "8px 16px", background: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Sales Order" width="600px">
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Customer <span style={{ color: "red" }}>*</span></label>
          <select value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
            style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", height: "38px" }}>
            <option value="">-- Select Customer --</option>
            {customers.filter(c => c.is_active).map(c => (
              <option key={c.customers_id} value={c.customers_id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Order Lines <span style={{ color: "red" }}>*</span></label>
          {lines.map((line, idx) => (
            <div key={idx} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <select 
                value={line.product_id} 
                onChange={(e) => handleLineChange(idx, "product_id", e.target.value)}
                style={{ flex: 2, padding: "8px", border: "1px solid #ddd", borderRadius: "4px", height: "38px" }}
              >
                <option value="">-- Select Product --</option>
                {products.map(p => <option key={p.products_id} value={p.products_id}>{p.name}</option>)}
              </select>
              <input 
                type="number" 
                min="1" 
                step="1" 
                placeholder="Qty"
                value={line.ordered_qty} 
                onChange={(e) => handleLineChange(idx, "ordered_qty", e.target.value)}
                style={{ flex: 1, padding: "8px", border: "1px solid #ddd", borderRadius: "4px", height: "38px" }} 
              />
              {lines.length > 1 && (
                <button type="button" onClick={() => handleRemoveLine(idx)}
                  style={{ background: "#dc3545", color: "white", border: "none", borderRadius: "4px", padding: "0 15px", cursor: "pointer" }}>
                  X
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={handleAddLine}
            style={{ padding: "6px 12px", background: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
            + Add Line
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={() => setShowCreate(false)}
            style={{ padding: "10px 20px", background: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", flex: 1 }}>
            Cancel
          </button>
          <button onClick={handleCreate}
            style={{ padding: "10px 20px", background: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", flex: 2, opacity: submitting ? 0.7 : 1 }}>
            Create Order
          </button>
        </div>
      </Modal>

      {/* Cancel Confirm Modal */}
      <Modal open={!!showCancel} onClose={() => setShowCancel(null)} title="Cancel Order?">
        <p style={{ margin: "0 0 10px" }}>
          Are you sure you want to cancel order <strong>{showCancel?.so_number || showCancel?.order_no}</strong>?
        </p>
        <p style={{ color: "#666", margin: "0 0 20px", fontSize: "13px" }}>
          Any reserved stock will be released back to inventory.
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setShowCancel(null)}
            style={{ padding: "8px 16px", background: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", flex: 1 }}>
            Keep Order
          </button>
          <button onClick={() => cancelOrder(showCancel.so_number || showCancel.order_no)}
            style={{ padding: "8px 16px", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", flex: 1 }}>
            Yes, Cancel
          </button>
        </div>
      </Modal>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "20px", right: "20px", zIndex: 2000,
          background: toast.type === "error" ? "#dc3545" : "#28a745",
          color: "white", padding: "12px 20px", borderRadius: "4px",
          fontSize: "14px", fontWeight: "bold", boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
