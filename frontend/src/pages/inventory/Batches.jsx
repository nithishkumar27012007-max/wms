import { useEffect, useState } from "react";
import PageHeader from '../../components/PageHeader';
import TopTabNav from '../../components/TopTabNav';
import ExpiryAlertPopup from "../../components/ExpiryAlertPopup";
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

  return [];
};


export default function Batches() {
    
    const tabs = getRoleTabs()

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // =============================
    // Fetch Expiry Dashboard Data
    // =============================
    useEffect(() => {

    const loadExpiryDashboard = async () => {

        try {

            const res = await fetch(
                "https://expand-best-therapist-surgeon.trycloudflare.com/expiry-dashboard",
                {
                    headers: getAuthHeaders()
                }
            );

            // ✅ Auto logout
            if (res.status === 401) {

                localStorage.clear();

                window.location.href = "/";

                return;
            }

            const data = await res.json();

            setData(data);

        } 
        catch (err) {

            console.error("Error:", err);

        } 
        finally {

            setLoading(false);
        }
    };

    loadExpiryDashboard();

}, []);

    // =============================
    // Status Badge UI
    // =============================
    const getStatusUI = (status) => {

        const baseStyle = {
            padding: "4px 10px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600",
            display: "inline-block"
        };

        if (status === "EXPIRED")
            return <span style={{ ...baseStyle, background: "#ffe5e5", color: "#d52121" }}>❌ EXPIRED</span>;

        if (status === "EXPIRING_SOON")
            return <span style={{ ...baseStyle, background: "#fff3cd", color: "#b58105" }}>⚠️ EXPIRING</span>;

        return <span style={{ ...baseStyle, background: "#eaffea", color: "#1a7f37" }}>✅ SAFE</span>;
    };

    return (
        <>
            {/* ✅ POPUP OUTSIDE (NO ANIMATION ISSUE) */}
            <ExpiryAlertPopup />

            {/* ✅ PAGE CONTENT WITH ANIMATION */}
            <div className="fade-in">

                <PageHeader title="Batches" breadcrumbs={['Inventory', 'Batches']} />
                <TopTabNav tabs={tabs} />

                <div className="page-content">

                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
  <h3 style={{ margin: 0 }}>Expiry Dashboard</h3>
  <div
    style={{ position: "relative", display: "inline-block" }}
    onMouseEnter={e => e.currentTarget.querySelector(".tooltip").style.display = "block"}
    onMouseLeave={e => e.currentTarget.querySelector(".tooltip").style.display = "none"}
    onClick={() => window.location.href = "/help?section=batches"}
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
      Click to view Batches & Expiry help
    </div>
  </div>
</div>

                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        <div style={{
                            display: "flex",
                            justifyContent: "center"
                        }}>
                            <div style={{
                                width: "100%",
                                maxWidth: "1200px",
                                background: "#fff",
                                borderRadius: "12px",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                overflow: "hidden"
                            }}>

                                <table style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    fontSize: "14px"
                                }}>

                                    {/* HEADER */}
                                    <thead style={{ background: "#f7f9fc" }}>
                                        <tr>
                                            <th style={thStyle}>Product</th>
                                            <th style={thStyle}>Batch</th>
                                            <th style={thStyle}>Expiry</th>
                                            <th style={thStyle}>Days Left</th>
                                            <th style={thStyle}>Qty</th>
                                            <th style={thStyle}>Location</th>
                                            <th style={thStyle}>Indicator</th>
                                            <th style={thStyle}>Value</th>
                                            <th style={thStyle}>Status</th>
                                        </tr>
                                    </thead>

                                    {/* BODY */}
                                    <tbody>
                                        {data.map((item, index) => (
                                            <tr key={index}
                                                style={{
                                                    borderBottom: "1px solid #eee",
                                                    transition: "background 0.2s"
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = "#f9fbff"}
                                                onMouseLeave={e => e.currentTarget.style.background = "white"}
                                            >

                                                <td style={tdStyle}>{item.product}</td>
                                                <td style={tdStyle}>{item.batch}</td>
                                                <td style={tdStyle}>{item.expiry}</td>

                                                <td style={{
                                                    ...tdStyle,
                                                    color: item.days_left < 0 ? "#d52121"
                                                        : item.days_left < 30 ? "#b58105"
                                                        : "#333",
                                                    fontWeight: "600"
                                                }}>
                                                    {item.days_left}
                                                </td>

                                                <td style={tdStyle}>{item.qty}</td>
                                                <td style={tdStyle}>{item.location}</td>

                                                {/* COLOR INDICATOR */}
                                                <td style={{ ...tdStyle, textAlign: "center" }}>
                                                    <div style={{
                                                        width: "18px",
                                                        height: "18px",
                                                        borderRadius: "4px",
                                                        margin: "auto",
                                                        background:
                                                            item.status === "EXPIRED" ? "#d52121" :
                                                                item.status === "EXPIRING_SOON" ? "#ffc107" :
                                                                    "#28a745"
                                                    }}></div>
                                                </td>

                                                <td style={tdStyle}>₹ {item.expiry_stock_value}</td>

                                                <td style={tdStyle}>{getStatusUI(item.status)}</td>
                                            </tr>
                                        ))}
                                    </tbody>

                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// =============================
// Common Styles
// =============================
const thStyle = {
    padding: "12px",
    textAlign: "left",
    fontWeight: "600",
    color: "#555",
    fontSize: "13px"
};

const tdStyle = {
    padding: "12px",
    color: "#333"
};