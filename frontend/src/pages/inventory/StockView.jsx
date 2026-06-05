import React, { useEffect, useState } from "react";
import PageHeader from '../../components/PageHeader';
import TopTabNav from '../../components/TopTabNav';
import { jwtDecode } from "jwt-decode";
import { getAuthHeaders } from "../../utils/authHeaders";
import { format } from "date-fns";

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
        { label: 'Stock View', path: '/inventory/stock-view' },
    ];
  }

  if (role === "SALES MANAGER") {
    return [
        { label: 'Stock View', path: '/inventory/stock-view' },
    ];
  }

  return [];
};

export default function StockView() {
  const tabs = getRoleTabs();

  const [stockBalances, setStockBalances] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch Stock Balances and Products concurrently
  const fetchStockData = async () => {
    try {
      const headers = getAuthHeaders();
      const [balancesRes, productsRes] = await Promise.all([
        fetch("https://expand-best-therapist-surgeon.trycloudflare.com/stock-balances-read", { headers }),
        fetch("https://expand-best-therapist-surgeon.trycloudflare.com/products-read", { headers })
      ]);

      if (balancesRes.status === 401 || productsRes.status === 401) {
        localStorage.clear();
        window.location.href = "/";
        return;
      }

      const balancesData = await balancesRes.json();
      const productsData = await productsRes.json();

      setStockBalances(balancesData);
      setProducts(productsData);
    } catch (error) {
      console.error(error);
      alert("Failed to load stock data");
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), 'dd-MMM-yyyy hh:mm a');
    } catch {
      return new Date(dateStr).toLocaleString();
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), 'dd-MMM-yyyy');
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  // Map products for fast name lookups
  const productMap = products.reduce((acc, curr) => {
    acc[curr.products_id] = curr.name;
    return acc;
  }, {});

  // Group stock balances by product_id
  const groupedStock = stockBalances.reduce((acc, curr) => {
    const key = curr.product_id;
    if (!acc[key]) {
      acc[key] = {
        product_id: key,
        product_name: productMap[key] || "Unknown Product",
        total_on_hand: 0,
        total_reserved: 0,
        items: []
      };
    }

    acc[key].total_on_hand += Number(curr.on_hand_qty || 0);
    acc[key].total_reserved += Number(curr.reserved_qty || 0);
    acc[key].items.push(curr);

    return acc;
  }, {});

  const groupedStockArray = Object.values(groupedStock);

  // Filter grouped data by search term (searches by product_id or product_name)
  const filteredGroups = groupedStockArray.filter(group => {
    const query = searchTerm.toLowerCase();
    return (
      group.product_id.toLowerCase().includes(query) ||
      group.product_name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="fade-in" style={{ padding: "0 24px" }}>
      {/* HEADER */}
      <PageHeader title="Stock View" breadcrumbs={['Inventory', 'Stock View']} />

      {/* NAVBAR */}
      <TopTabNav tabs={tabs} />

      <div style={styles.container}>
        <div style={styles.headerWrapper}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
  <h2 style={styles.title}>Stock Balances</h2>
  <div
    style={{ position: "relative", display: "inline-block" }}
    onMouseEnter={e => e.currentTarget.querySelector(".tooltip").style.display = "block"}
    onMouseLeave={e => e.currentTarget.querySelector(".tooltip").style.display = "none"}
    onClick={() => window.location.href = "/help?section=stock-view"}
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
      Click to view Stock View help
    </div>
  </div>
</div>
          <div style={styles.searchContainer}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search by Product ID or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={{ ...styles.th, textAlign: "left" }}>Location</th>
                <th style={{ ...styles.th, textAlign: "left" }}>Batch No</th>
                <th style={{ ...styles.th, textAlign: "left" }}>Expiry Date</th>
                <th style={styles.th}>On Hand</th>
                <th style={styles.th}>Reserved</th>
                <th style={styles.th}>Available</th>
                <th style={styles.th}>Created at</th>
                <th style={styles.th}>Last Updated</th>
              </tr>
            </thead>

            <tbody>
              {filteredGroups.length > 0 ? (
                filteredGroups.map((group) => {
                  const groupAvailable = group.total_on_hand - group.total_reserved;
                  return (
                    <React.Fragment key={group.product_id}>
                      {/* Product Header Row */}
                      <tr style={styles.productHeaderRow}>
                        <td colSpan="8" style={styles.productHeaderCell}>
                          <div style={styles.productHeaderContent}>
                            <div style={styles.productInfoWrapper}>
                              <span style={styles.productLabel}>Product:</span>
                              <span style={styles.productValue}>{group.product_id} - {group.product_name}</span>
                            </div>
                            <div style={styles.productHeaderMetrics}>
                              <span style={styles.headerMetric}>Total On Hand: <strong>{group.total_on_hand}</strong></span>
                              <span style={styles.headerMetric}>Total Reserved: <strong>{group.total_reserved}</strong></span>
                              <span style={styles.headerMetric}>
                                Total Available: <strong style={{ color: groupAvailable > 0 ? "#10b981" : "#ef4444" }}>{groupAvailable}</strong>
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Detail Rows for this Product */}
                      {group.items.map((item) => {
                        const available = Number(item.on_hand_qty || 0) - Number(item.reserved_qty || 0);
                        const isExpired = item.expiry_date && new Date(item.expiry_date) < new Date();
                        
                        return (
                          <tr key={item.id} style={styles.row}>
                            {/* Location */}
                            <td style={{ ...styles.td, textAlign: "left" }}>
                              <span style={styles.locationBadge}>📍 {item.location_id}</span>
                              <span style={styles.warehouseText}>({item.warehouse_id})</span>
                            </td>

                            {/* Batch No */}
                            <td style={{ ...styles.td, textAlign: "left", fontWeight: "600", color: "#0f172a" }}>
                              {item.batch_no || "-"}
                            </td>

                            {/* Expiry Date */}
                            <td style={{ ...styles.td, textAlign: "left" }}>
                              {item.expiry_date ? (
                                <span style={{
                                  color: isExpired ? "#ef4444" : "#475569",
                                  fontWeight: isExpired ? "600" : "400",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}>
                                  {formatDate(item.expiry_date)} {isExpired && <span title="Expired">⚠️</span>}
                                </span>
                              ) : "-"}
                            </td>

                            {/* On Hand */}
                            <td style={{ ...styles.td, fontWeight: "500", color: "#1e293b" }}>
                              {item.on_hand_qty}
                            </td>

                            {/* Reserved */}
                            <td style={{ ...styles.td, color: "#64748b" }}>
                              {item.reserved_qty}
                            </td>

                            {/* Available */}
                            <td style={styles.td}>
                              <span style={{
                                fontWeight: "600",
                                color: available > 0 ? "#166534" : "#991b1b",
                                background: available > 0 ? "#dcfce7" : "#fee2e2",
                                padding: "6px 12px",
                                borderRadius: "9999px",
                                fontSize: "12px",
                                display: "inline-block",
                                minWidth: "40px"
                              }}>
                                {available}
                              </span>
                            </td>
                            <td style={{...styles.td, fontSize: "12px", color: "#64748b", whiteSpace: "nowrap"}}>{formatDateTime(item.created_at)}</td>

                            {/* Last Updated */}
                            <td style={{ ...styles.td, fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>
                              {formatDateTime(item.updated_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={styles.noDataCell}>
                    No stock balances found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "20px 0",
    width: "100%",
    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif"
  },
  headerWrapper: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "15px"
  },
  title: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "600",
    color: "#0f172a"
  },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "0 12px",
    width: "350px",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    transition: "box-shadow 0.2s, border-color 0.2s"
  },
  searchIcon: {
    fontSize: "14px",
    color: "#94a3b8",
    marginRight: "8px"
  },
  searchInput: {
    border: "none",
    outline: "none",
    width: "100%",
    padding: "10px 0",
    fontSize: "14px",
    color: "#334155",
    backgroundColor: "transparent"
  },
  tableWrapper: {
    background: "#fff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
    overflow: "hidden"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "1100px"
  },
  headerRow: {
    background: "#f8fafc",
    borderBottom: "2px solid #edf2f7"
  },
  th: {
    padding: "14px 16px",
    color: "#475569",
    fontWeight: "600",
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: "0.05em"
  },
  td: {
    padding: "14px 16px",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "14px",
    color: "#334155",
    textAlign: "center"
  },
  row: {
    background: "#fff",
    transition: "background-color 0.15s ease",
    ":hover": {
      backgroundColor: "#f8fafc"
    }
  },
  productHeaderRow: {
    background: "#f1f5f9",
    borderBottom: "1px solid #e2e8f0",
    borderTop: "2px solid #e2e8f0"
  },
  productHeaderCell: {
    padding: "12px 16px"
  },
  productHeaderContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px"
  },
  productInfoWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  productLabel: {
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase",
    color: "#64748b",
    letterSpacing: "0.05em"
  },
  productValue: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a"
  },
  productHeaderMetrics: {
    display: "flex",
    gap: "20px",
    fontSize: "13px",
    color: "#475569"
  },
  headerMetric: {
    background: "#fff",
    padding: "4px 12px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.02)"
  },
  locationBadge: {
    background: "#eff6ff",
    color: "#1e40af",
    padding: "4px 8px",
    borderRadius: "6px",
    fontWeight: "600",
    fontSize: "12px"
  },
  warehouseText: {
    marginLeft: "6px",
    fontSize: "12px",
    color: "#64748b"
  },
  noDataCell: {
    padding: "40px",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "15px"
  }
};