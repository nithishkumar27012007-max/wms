import React, { useEffect, useState } from "react";
import axios from "axios";
import PageHeader from '../../components/PageHeader';
import TopTabNav from '../../components/TopTabNav';
import { jwtDecode } from "jwt-decode";
import { getAuthHeaders } from "../../utils/authHeaders";

const getRoleTabs = () => {
  const token = localStorage.getItem("token");
  let role = null;
  if (token) {
    try {
      const decoded = jwtDecode(token);
      role = decoded.role?.toUpperCase();
    } catch { role = null; }
  }
  if (role === "ADMIN" || role === "INVENTORY MANAGER") {
    return [
      { label: 'Stock Overview', path: '/inventory/stock-overview' },
      { label: 'Batches',        path: '/inventory/batches' },
      { label: 'Movements',      path: '/inventory/movements' },
      { label: 'Stock View',     path: '/inventory/stock-view' },
    ];
  }
  return [];
};

const MOVEMENT_COLORS = {
  "PUT AWAY":              { bg: "#dcfce7", color: "#166534" },
  "RESERVE":               { bg: "#dbeafe", color: "#1e40af" },
  "PARTIALLY RESERVED":    { bg: "#fef3c7", color: "#92400e" },
  "OUT":                   { bg: "#fee2e2", color: "#991b1b" },
  "DISPATCH":              { bg: "#fce7f3", color: "#9d174d" },
  "PACKAGED":              { bg: "#ede9fe", color: "#5b21b6" },
  "RESERVATION CANCELLED": { bg: "#f1f5f9", color: "#475569" },
};

// ── Reference Type badge colors ───────────────────────────────────────────────
const REF_TYPE_COLORS = {
  "SALES_ORDER":    { bg: "#dbeafe", color: "#1e40af" },
  "PURCHASE_ORDER": { bg: "#dcfce7", color: "#166534" },
  "TRANSFER":       { bg: "#fef3c7", color: "#92400e" },
  "ADJUSTMENT":     { bg: "#ede9fe", color: "#5b21b6" },
  "RETURN":         { bg: "#fee2e2", color: "#991b1b" },
};

// ── Moved qty: sign + color per movement type ─────────────────────────────────
const getMovedQty = (type, qty) => {
  const n = parseFloat(qty || 0).toFixed(2);
  switch (type) {
    case "PUT AWAY":
      return { display: `+${n}`, color: "#059669" };
    case "RESERVE":
      return { display: `-${n}`, color: "#2563eb" };
    case "PARTIALLY RESERVED":
      return { display: `-${n}`, color: "#92400e" };
    case "RESERVATION CANCELLED":
      return { display: `+${n}`, color: "#64748b" };
    case "OUT":
    case "DISPATCH":
    case "PACKAGED":
      return { display: `-${n}`, color: "#dc2626" };
    default:
      return { display: `${n}`, color: "#1e293b" };
  }
};

export default function Movements() {
  const tabs = getRoleTabs();
  const [movements, setMovements]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [searchTerm, setSearchTerm]   = useState("");
  const [typeFilter, setTypeFilter]   = useState("All");
  const [dateRange, setDateRange]     = useState({ start: "", end: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState(null);

  const openDetailsModal = (m) => {
    setSelectedMovement(m);
    setDetailsModalOpen(true);
  };

  const [productMap, setProductMap] = useState({});

  useEffect(() => { 
    fetchMovements(); 
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(
        "https://underwear-locks-latinas-anonymous.trycloudflare.com/products-dropdown",
        {
          headers: getAuthHeaders()
        }
      );
      const map = {};
      res.data.forEach(p => {
        map[p.products_id] = p.name;
      });
      setProductMap(map);
    } catch (err) {
      console.error("Failed to load products for mapping:", err);
    }
  };

  const fetchMovements = async () => {

  try {

    setLoading(true);

    const res = await axios.get(
      "https://underwear-locks-latinas-anonymous.trycloudflare.com/stock-ledger-read",
      {
        headers: getAuthHeaders()
      }
    );

    setMovements(res.data);

  } catch (err) {

    if (err.response?.status === 401) {

      localStorage.clear();

      window.location.href = "/";

      return;
    }

    console.error(err);

  } finally {

    setLoading(false);
  }
};

  // ── Filters ──────────────────────────────────────────────────────────────────
  const filtered = movements.filter(m => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      m.product_id?.toLowerCase().includes(q)      ||
      m.warehouse?.toLowerCase().includes(q)        ||
      m.from_location?.toLowerCase().includes(q)    ||
      m.to_location?.toLowerCase().includes(q)      ||
      m.batch_no?.toLowerCase().includes(q)         ||
      m.reference_id?.toLowerCase().includes(q)     ||
      m.reference_type?.toLowerCase().includes(q)   || // ✅ NEW
      m.created_by?.toLowerCase().includes(q);

    const matchType =
      typeFilter === "All" || m.movement_type === typeFilter;

    const dt = m.created_datetime ? new Date(m.created_datetime) : null;
    const matchDate =
      (!dateRange.start || (dt && dt >= new Date(dateRange.start))) &&
      (!dateRange.end   || (dt && dt <= new Date(dateRange.end + "T23:59:59")));

    return matchSearch && matchType && matchDate;
  });

  const movementTypes = [
    "All",
    ...new Set(movements.map(m => m.movement_type).filter(Boolean)),
  ];

  // ── Summary cards ─────────────────────────────────────────────────────────────
  const summary = movements.reduce(
    (acc, m) => {
      const qty  = parseFloat(m.movement_qty || 0);
      const type = m.movement_type;
      if (type === "PUT AWAY")                        acc.totalIn        += qty;
      else if (["OUT", "DISPATCH"].includes(type))    acc.totalOut       += qty;
      else if (type === "RESERVE")                    acc.totalReserve   += qty;
      else if (type === "PARTIALLY RESERVED")         acc.totalReserve   += qty;
      else if (type === "RESERVATION CANCELLED")      acc.totalCancelled += qty;
      else if (type === "PACKAGED")                   acc.totalPackaged  += qty;
      return acc;
    },
    { totalIn: 0, totalOut: 0, totalReserve: 0, totalCancelled: 0, totalPackaged: 0 }
  );

  const badgeStyle = (type) => {
    const c = MOVEMENT_COLORS[type] || { bg: "#f1f5f9", color: "#334155" };
    return { background: c.bg, color: c.color };
  };

  const refTypeBadgeStyle = (type) => {
    const c = REF_TYPE_COLORS[type] || { bg: "#f1f5f9", color: "#334155" };
    return { background: c.bg, color: c.color };
  };

  const clearFilters = () => {
    setSearchTerm(""); setTypeFilter("All"); setDateRange({ start: "", end: "" });
  };
  const hasFilters =
    searchTerm || typeFilter !== "All" || dateRange.start || dateRange.end;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      <PageHeader title="Stock Movements" breadcrumbs={["Inventory", "Movements"]} />
      <TopTabNav tabs={tabs} />

      <div style={{ padding: "24px" }}>

        {/* ── Summary Cards ── */}
        <div style={styles.cardGrid}>
          {[
            { icon: "⬇️", label: "Total IN",               value: summary.totalIn,        color: "#059669" },
            { icon: "⬆️", label: "Total OUT",              value: summary.totalOut,       color: "#dc2626" },
            { icon: "🔒", label: "Total Reserved",         value: summary.totalReserve,   color: "#2563eb" },
            { icon: "📦", label: "Total Packaged",         value: summary.totalPackaged,  color: "#7c3aed" },
            { icon: "🔓", label: "Reservations Cancelled", value: summary.totalCancelled, color: "#64748b" },
          ].map(c => (
            <div key={c.label} style={styles.card}>
              <div style={{ ...styles.cardIcon, background: c.color }}>{c.icon}</div>
              <div>
                <div style={styles.cardLabel}>{c.label}</div>
                <div style={{ ...styles.cardValue, color: c.color }}>
                  {c.value.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter Bar ── */}
        <div style={styles.filterBox}>
          <div style={styles.filterRow}>
            <div style={styles.searchWrap}>
              <span style={styles.searchIcon}>🔍</span>
              <input
                style={styles.searchInput}
                placeholder="Search product, warehouse, location, batch, reference, ref type, user..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              style={styles.select}
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              {movementTypes.map(t => (
                <option key={t} value={t}>{t === "All" ? "All Types" : t}</option>
              ))}
            </select>

            <button
              style={styles.btnOutline}
              onClick={() => setShowFilters(!showFilters)}
            >
              📅 Date Range
            </button>

            {hasFilters && (
              <button style={styles.btnOutline} onClick={clearFilters}>
                ✕ Clear
              </button>
            )}

            <button
              style={{ ...styles.btnOutline, marginLeft: "auto" }}
              onClick={fetchMovements}
            >
              🔄 Refresh
            </button>
          </div>

          {showFilters && (
            <div style={styles.dateRow}>
              {["start", "end"].map(k => (
                <label key={k} style={styles.dateLabel}>
                  {k === "start" ? "From" : "To"}
                  <input
                    type="date"
                    style={styles.dateInput}
                    value={dateRange[k]}
                    onChange={e => setDateRange({ ...dateRange, [k]: e.target.value })}
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* ── Movements Table ── */}
        <div style={styles.tableBox}>
          <div style={styles.tableHead}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
  <h3 style={styles.sectionTitle}>Movement History</h3>
  <div
    style={{ position: "relative", display: "inline-block" }}
    onMouseEnter={e => e.currentTarget.querySelector(".tooltip").style.display = "block"}
    onMouseLeave={e => e.currentTarget.querySelector(".tooltip").style.display = "none"}
    onClick={() => window.location.href = "/help?section=movements"}
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
    }}>
      Click to view Movement History help

    </div>
  </div>
</div>
            <span style={{ fontSize: 13, color: "#64748b" }}>
              {filtered.length} records
            </span>
          </div>

          {loading ? (
            <div style={styles.center}>
              <div style={styles.spinner} />
              <p>Loading movements…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={styles.center}>
              <span style={{ fontSize: 48 }}>📊</span>
              <p style={{ color: "#64748b" }}>No records match your filters.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {[
                      "#", "Movement ID", "Product", "Movement Type",
                      "Moved Qty", "Created By", "Date & Time", "Action"
                    ].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => {
                    const { display: movedDisplay, color: movedColor } =
                      getMovedQty(m.movement_type, m.movement_qty);

                    return (
                      <tr
                        key={m.movement_id}
                        style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}
                      >
                        <td style={styles.td}>{i + 1}</td>
                        <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 11 }}>
                          {m.movement_id}
                        </td>
                        <td style={{ ...styles.td, fontWeight: 600, color: "#2563eb" }}>
                          {m.product_id}
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, ...badgeStyle(m.movement_type) }}>
                            {m.movement_type}
                          </span>
                        </td>
                        <td style={{
                          ...styles.td,
                          textAlign: "right",
                          fontWeight: 600,
                          color: movedColor,
                        }}>
                          {movedDisplay}
                        </td>
                        <td style={{ ...styles.td, fontSize: 12 }}>
                          {m.created_by || "-"}
                        </td>
                        <td style={{ ...styles.td, fontSize: 12, whiteSpace: "nowrap" }}>
                          {m.created_datetime
                            ? new Date(m.created_datetime).toLocaleString()
                            : "-"}
                        </td>
                        <td style={styles.td}>
                          <button
                            style={styles.btnSecondary}
                            onClick={() => openDetailsModal(m)}
                          >
                            👁️ View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Details Modal ── */}
        {detailsModalOpen && selectedMovement && (
          <div style={styles.modalOverlay}>
            <div style={{ ...styles.modalContent, width: "650px", maxWidth: "95%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", color: "#1e293b", fontWeight: "700" }}>
                  Movement Details: {selectedMovement.movement_id}
                </h3>
                <button
                  style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#94a3b8" }}
                  onClick={() => setDetailsModalOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div style={styles.modalGrid}>
                <div style={styles.modalItem}>
                  <span style={styles.modalLabel}>Product Name</span>
                  <span style={{ ...styles.modalValue, fontWeight: "600", color: "#2563eb" }}>
                    {productMap[selectedMovement.product_id] || selectedMovement.product_id}
                  </span>
                </div>

                <div style={styles.modalItem}>
                  <span style={styles.modalLabel}>Movement Type</span>
                  <div>
                    <span style={{ ...styles.badge, ...badgeStyle(selectedMovement.movement_type) }}>
                      {selectedMovement.movement_type}
                    </span>
                  </div>
                </div>

                <div style={styles.modalItem}>
                  <span style={styles.modalLabel}>Warehouse</span>
                  <span style={styles.modalValue}>{selectedMovement.warehouse || "-"}</span>
                </div>

                <div style={styles.modalItem}>
                  <span style={styles.modalLabel}>Batch Number</span>
                  <span style={styles.modalValue}>{selectedMovement.batch_no || "-"}</span>
                </div>

                <div style={styles.modalItem}>
                  <span style={styles.modalLabel}>From Location</span>
                  <span style={{ ...styles.modalValue, fontFamily: "monospace" }}>
                    {selectedMovement.from_location || "-"}
                  </span>
                </div>

                <div style={styles.modalItem}>
                  <span style={styles.modalLabel}>To Location</span>
                  <span style={{ ...styles.modalValue, fontFamily: "monospace" }}>
                    {selectedMovement.to_location || "-"}
                  </span>
                </div>

                <div style={styles.modalItem}>
                  <span style={styles.modalLabel}>Reference ID</span>
                  <span style={{ ...styles.modalValue, fontFamily: "monospace" }}>
                    {selectedMovement.reference_id || "-"}
                  </span>
                </div>

                <div style={styles.modalItem}>
                  <span style={styles.modalLabel}>Reference Type</span>
                  <div>
                    {selectedMovement.reference_type ? (
                      <span style={{ ...styles.badge, ...refTypeBadgeStyle(selectedMovement.reference_type) }}>
                        {selectedMovement.reference_type}
                      </span>
                    ) : (
                      "-"
                    )}
                  </div>
                </div>

                <div style={styles.modalItem}>
                  <span style={styles.modalLabel}>Created By</span>
                  <span style={styles.modalValue}>{selectedMovement.created_by || "-"}</span>
                </div>

                <div style={styles.modalItem}>
                  <span style={styles.modalLabel}>Date & Time</span>
                  <span style={styles.modalValue}>
                    {selectedMovement.created_datetime
                      ? new Date(selectedMovement.created_datetime).toLocaleString()
                      : "-"}
                  </span>
                </div>
              </div>

              {/* ── Quantity Impact Section ── */}
              <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #e2e8f0" }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "600", color: "#475569" }}>
                  Quantity Impact
                </h4>
                <div style={{ display: "flex", justifyContent: "space-between", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Before Qty</div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#475569" }}>
                      {parseFloat(selectedMovement.before_qty || 0).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ textAlign: "center", flex: 1, borderLeft: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Moved Qty</div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: getMovedQty(selectedMovement.movement_type, selectedMovement.movement_qty).color }}>
                      {getMovedQty(selectedMovement.movement_type, selectedMovement.movement_qty).display}
                    </div>
                  </div>
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>After Qty</div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>
                      {parseFloat(selectedMovement.after_qty || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "right", marginTop: "24px" }}>
                <button
                  style={styles.btnPrimary}
                  onClick={() => setDetailsModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: "18px 20px",
    display: "flex",
    alignItems: "center",
    gap: 14,
    boxShadow: "0 2px 8px rgba(0,0,0,.05)",
    border: "1px solid #e2e8f0",
  },
  cardIcon: {
    width: 44, height: 44, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 22, color: "#fff", flexShrink: 0,
  },
  cardLabel: { fontSize: 12, color: "#64748b" },
  cardValue: { fontSize: 22, fontWeight: 700 },

  filterBox: {
    background: "#fff", borderRadius: 12, padding: 16,
    border: "1px solid #e2e8f0", marginBottom: 20,
  },
  filterRow: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" },
  searchWrap: { position: "relative", flex: 1, minWidth: 260 },
  searchIcon: {
    position: "absolute", left: 12, top: "50%",
    transform: "translateY(-50%)", color: "#94a3b8",
  },
  searchInput: {
    width: "100%", padding: "9px 12px 9px 34px",
    border: "2px solid #e2e8f0", borderRadius: 8,
    fontSize: 14, background: "#fff",
  },
  select: {
    padding: "9px 12px", border: "2px solid #e2e8f0",
    borderRadius: 8, fontSize: 14, background: "#fff", minWidth: 160,
  },
  btnOutline: {
    padding: "8px 14px", background: "#fff",
    border: "1px solid #e2e8f0", borderRadius: 8,
    fontSize: 13, cursor: "pointer", color: "#475569",
    display: "flex", alignItems: "center", gap: 6,
  },
  dateRow:   { display: "flex", gap: 16, marginTop: 12 },
  dateLabel: { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#64748b" },
  dateInput: { padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 6 },

  tableBox: {
    background: "#fff", borderRadius: 12, padding: 24,
    boxShadow: "0 2px 8px rgba(0,0,0,.05)",
    border: "1px solid #e2e8f0", marginBottom: 24,
  },
  tableHead: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  },
  sectionTitle: { margin: 0, fontSize: 17, fontWeight: 600, color: "#1e293b" },
  table:  { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    background: "#f8fafc", padding: "11px 12px", textAlign: "left",
    fontWeight: 600, color: "#475569",
    border: "1px solid #e2e8f0", whiteSpace: "nowrap",
  },
  td: { padding: "10px 12px", border: "1px solid #e2e8f0", color: "#1e293b" },

  badge: {
    display: "inline-block", padding: "3px 8px",
    borderRadius: 4, fontSize: 11, fontWeight: 500,
  },
  mono: {
    fontFamily: "monospace", background: "#f1f5f9",
    padding: "3px 7px", borderRadius: 4, fontSize: 12,
  },

  center:  { textAlign: "center", padding: "60px 20px" },
  spinner: {
    width: 36, height: 36,
    border: "3px solid #e2e8f0", borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 12px",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    background: "#fff",
    padding: 30,
    borderRadius: 12,
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    border: "1px solid #e2e8f0",
  },
  modalGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
    marginTop: "20px",
  },
  modalItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  modalLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
  },
  modalValue: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#1e293b",
  },
  btnPrimary: {
    padding: "8px 20px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  },
  btnSecondary: {
    padding: "6px 12px",
    background: "#f8fafc",
    color: "#475569",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    transition: "all 0.2s",
  },
};