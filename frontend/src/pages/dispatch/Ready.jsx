import React, { useEffect, useState, useCallback } from "react";
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
    } catch {
      role = null;
    }
  }
  if (role === "ADMIN" || role === "DISPATCH MANAGER") {
    return [
      { label: 'Ready', path: '/dispatch/ready' },
      { label: 'Dispatch List', path: '/dispatch/dispatch-list' },
    ];
  }
  return [];
};

const API_BASE_URL = "https://expand-best-therapist-surgeon.trycloudflare.com";

export default function ReadyDispatchList() {
  const tabs = getRoleTabs();

  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [search,      setSearch]      = useState("");
  const [dispatching, setDispatching] = useState(false);

  // ── toast state (dispatch only) ─────────────────────────────────────────────
  const [toast, setToast] = useState(null); // { user, role, time }

  const showDispatchToast = (user, role) => {
    const time = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    setToast({ user, role, time });
    setTimeout(() => setToast(null), 3500);
  };

  // ── fetch ready orders (GET only — no toast) ────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/ready-read`,
        {
          headers: getAuthHeaders()
        }
      );
      setOrders(res.data);
      console.log("✅ Orders loaded");
    } catch (err) {

        if (err.response?.status === 401) {
          localStorage.clear();
          window.location.href = "/";
          return;
        }

        alert("Failed to load packages");

        setError("Failed to load Ready Dispatch List. Please try again.");
      }
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── dispatch handler — POST /post-create → show toast ───────────────────────
  const handleDispatch = async () => {
    setDispatching(true);
    try {
      const token = localStorage.getItem("token");
      const postRes = await axios.post(
        `${API_BASE_URL}/post-create`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showDispatchToast(postRes.data.current_user, postRes.data.role);
      console.log("🚚 Dispatched by:", postRes.data.current_user, "| Role:", postRes.data.role);
    } catch (err) {
      console.error("Dispatch error:", err);
      alert("Dispatch failed. Please try again.");
    } finally {
      setDispatching(false);
    }
  };

  // ── filter ──────────────────────────────────────────────────────────────────
  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (o.order_no      || "").toLowerCase().includes(q) ||
      (o.product_name  || "").toLowerCase().includes(q) ||
      (o.product_id    || "").toLowerCase().includes(q) ||
      (o.batch_no      || "").toLowerCase().includes(q) ||
      (o.package_id    || "").toLowerCase().includes(q) ||
      (o.location      || "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <PageHeader title="Ready Dispatch List" breadcrumbs={["Dispatch", "Ready"]} />
      <TopTabNav tabs={tabs} />

      {/* ── Dispatch Toast ── */}
      <div style={{
        position: "fixed", top: "24px", right: "24px", zIndex: 9999,
        transition: "opacity 0.35s ease, transform 0.35s cubic-bezier(0.4,0,0.2,1)",
        opacity: toast ? 1 : 0,
        transform: toast ? "translateY(0)" : "translateY(-16px)",
        pointerEvents: toast ? "auto" : "none",
      }}>
        <div style={{
          background: "#1e293b", color: "white", borderRadius: "12px",
          padding: "14px 18px", boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          display: "flex", alignItems: "flex-start", gap: "12px",
          minWidth: "280px", maxWidth: "360px",
          borderLeft: "4px solid #3b82f6",
        }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "rgba(59,130,246,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px", flexShrink: 0,
          }}>
            🚚
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "13px", color: "#3b82f6", marginBottom: "4px", letterSpacing: "0.5px" }}>
              DISPATCH REFRESHED
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: "1.7" }}>
              <span>👤 </span><span style={{ color: "#e2e8f0" }}>{toast?.user}</span>
              {"   ·   "}
              <span>🔑 </span><span style={{ color: "#e2e8f0" }}>{toast?.role}</span>
              <br />
              <span>🕐 {toast?.time}</span>
            </div>
          </div>
          <button
            onClick={() => setToast(null)}
            style={{
              background: "none", border: "none", color: "#64748b",
              cursor: "pointer", fontSize: "18px", lineHeight: 1,
              padding: "0", flexShrink: 0, marginTop: "-2px",
            }}
          >×</button>
        </div>
      </div>

      <div style={{ padding: "24px" }}>

        {/* ── Search + Refresh + Dispatch ── */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "24px",
          flexWrap: "wrap", gap: "12px"
        }}>
          <input
            type="text"
            placeholder="Search by order, product, batch, package…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "9px 14px", borderRadius: "8px",
              border: "1px solid #e2e8f0", fontSize: "14px",
              width: "320px", outline: "none",
            }}
          />

          <div style={{ display: "flex", gap: "10px" }}>
            {/* Refresh — no toast */}
            <button
              onClick={fetchOrders}
              style={{
                padding: "9px 20px", background: "#3b82f6", color: "white",
                border: "none", borderRadius: "8px", fontSize: "14px",
                cursor: "pointer", fontWeight: 600,
              }}
            >
              ⟳ Refresh
            </button>

            {/* Dispatch — shows toast */}
            <button
              onClick={handleDispatch}
              disabled={dispatching}
              style={{
                padding: "9px 20px",
                background: dispatching ? "#6b7280" : "#16a34a",
                color: "white",
                border: "none", borderRadius: "8px", fontSize: "14px",
                cursor: dispatching ? "not-allowed" : "pointer",
                fontWeight: 600,
                display: "flex", alignItems: "center", gap: "7px",
                transition: "background 0.2s",
              }}
            >
              {dispatching ? (
                <>
                  <span style={{
                    width: "13px", height: "13px",
                    border: "2px solid rgba(255,255,255,0.4)",
                    borderTopColor: "white", borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                  }} />
                  Dispatching…
                </>
              ) : (
                <>🚚 Dispatch</>
              )}
            </button>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>
            <div style={{
              width: "40px", height: "40px", border: "3px solid #e2e8f0",
              borderTopColor: "#3b82f6", borderRadius: "50%",
              animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
            }} />
            Loading…
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <p style={{ color: "#dc2626", marginBottom: "12px" }}>{error}</p>
            <button onClick={fetchOrders} style={{
              padding: "8px 20px", background: "#3b82f6", color: "white",
              border: "none", borderRadius: "6px", cursor: "pointer",
            }}>Retry</button>
          </div>
        )}

        {/* ── Table ── */}
        {!loading && !error && (
          <div style={{
            background: "white", borderRadius: "12px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden"
          }}>
            <div style={{
              padding: "16px 20px", borderBottom: "1px solid #e2e8f0",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: 600, fontSize: "15px", color: "#1e293b" }}>
                Ready for Dispatch
              </span>

              <div
    style={{ position: "relative", display: "inline-block" }}
    onMouseEnter={e => e.currentTarget.querySelector(".tooltip").style.display = "block"}
    onMouseLeave={e => e.currentTarget.querySelector(".tooltip").style.display = "none"}
    onClick={() => window.location.href = "/help?section=ready-dispatch-list"}
  >
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
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
      Packed orders ready to be dispatched - click Dispatch to process.
    </div>
    </div>
</div>
              <span style={{
                background: "#dcfce7", color: "#16a34a",
                padding: "4px 12px", borderRadius: "20px",
                fontSize: "13px", fontWeight: 600,
              }}>
                {filtered.length} records
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["#", "Order No", "Product", "Batch No", "Quantity", "Package ID", "Total Boxes", "Location"].map((h) => (
                      <th key={h} style={{
                        padding: "12px 14px", textAlign: "center",
                        fontWeight: 600, color: "#475569", fontSize: "13px",
                        borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{
                        textAlign: "center", padding: "60px",
                        color: "#94a3b8", fontSize: "15px"
                      }}>
                        No packed orders found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((o, i) => (
                      <tr
                        key={o.order_no}
                        style={{ borderBottom: "1px solid #f1f5f9" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                      >
                        <td style={td}>{i + 1}</td>
                        <td style={{ ...td, fontWeight: 600, color: "#1e293b" }}>{o.order_no || "-"}</td>
                        <td style={td}>
                          <div style={{ fontWeight: 500, color: "#1e293b" }}>
                            {o.product_name || o.product_id || "-"}
                          </div>
                          {o.product_name && (
                            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                              {o.product_id}
                            </div>
                          )}
                        </td>
                        <td style={td}>
                          <span style={{
                            background: "#fef9c3", color: "#854d0e",
                            padding: "3px 10px", borderRadius: "20px",
                            fontSize: "12px", fontWeight: 500,
                          }}>
                            {o.batch_no || "-"}
                          </span>
                        </td>
                        <td style={{ ...td, fontWeight: 600, color: "#0f766e" }}>{o.quantity ?? "-"}</td>
                        <td style={td}>
                          <span style={{
                            background: "#eff6ff", color: "#2563eb",
                            padding: "3px 10px", borderRadius: "20px",
                            fontSize: "12px", fontWeight: 500,
                          }}>
                            {o.package_id || "-"}
                          </span>
                        </td>
                        <td style={td}>
                          <span style={{
                            background: "#f3e8ff", color: "#7c3aed",
                            padding: "3px 10px", borderRadius: "20px",
                            fontSize: "12px", fontWeight: 600,
                          }}>
                            {o.total_boxes ?? "-"}
                          </span>
                        </td>
                        <td style={{ ...td, color: "#64748b", fontSize: "12px" }}>{o.location || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const td = {
  padding: "12px 14px",
  textAlign: "center",
  verticalAlign: "middle",
  color: "#334155",
};