import { useState } from "react";
import PageHeader from '../../components/PageHeader';
import TopTabNav from '../../components/TopTabNav';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

    // 🎯 Role-based filtering
    if (role === "ADMIN") {
        return [
            { label: 'Inventory', path: '/reports/inventory' },
            { label: 'Orders', path: '/reports/orders' },
        ];
    }

    if (role === "PURCHASE MANAGER" || role === "INVENTORY MANAGER") {
        return [
            { label: 'Inventory', path: '/reports/inventory' }
        ];
    }


    if (role === "SALES MANAGER" || role === "DISPATCH MANAGER") {
        return [
            { label: 'Orders', path: '/reports/orders' }
        ];
    }

    return []; // fallback
};


export default function InventoryReport() {
    
    const tabs = getRoleTabs();
    
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [filterType, setFilterType] = useState("order_date");
    const [data, setData] = useState([]);

    // 🔹 Format Date
    const formatDate = (date) => {
        if (!date || date === "Not Received") return date;

        return new Date(date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    const fetchReport = async () => {

    if (!fromDate || !toDate) {

        alert("Please select dates");

        return;
    }

    try {

        const res = await fetch(
            `https://underwear-locks-latinas-anonymous.trycloudflare.com/reports/purchase?from_date=${fromDate}&to_date=${toDate}&filter_type=${filterType}`,
            {
                headers: getAuthHeaders()
            }
        );

        // ===========================
        // TOKEN EXPIRED
        // ===========================
        if (res.status === 401) {

            localStorage.clear();

            window.location.href = "/";

            return;
        }

        // ===========================
        // OTHER API ERRORS
        // ===========================
        if (!res.ok) {

            throw new Error(
                `HTTP Error ${res.status}`
            );
        }

        const result = await res.json();

        setData(result.data || []);

    } catch (err) {

        console.error(err);

        alert("Failed to fetch report");
    }
};

    // 🔥 PDF DOWNLOAD (ERP STYLE)
    const downloadPDF = () => {

        if (data.length === 0) {
            alert("No data to export");
            return;
        }

        const doc = new jsPDF();

        // 🔹 HEADER
        doc.setFillColor(76, 175, 80);
        doc.rect(0, 0, 210, 20, "F");

        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text("INVENTORY REPORT", 105, 12, { align: "center" });

        // 🔹 Sub Header
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        doc.text(`From: ${fromDate}`, 14, 30);
        doc.text(`To: ${toDate}`, 70, 30);
        doc.text(`Filter: ${filterType}`, 130, 30);

        // 🔹 Columns
        const columns = [
            "PO Number",
            "Product",
            "Supplier",
            "Order Date",
            "Ordered Qty",
            "Received Qty",
            "Rejected Qty",
            "Last Received",
            "Warehouse"
        ];

        // 🔹 Rows
        const rows = data.map(row => [
            row.po_number,
            row.product_id,
            row.vendor_id,
            formatDate(row.order_date),
            row.ordered_qty,
            row.received_qty,
            row.rejected_qty,
            formatDate(row.last_receipt_date),
            row.warehouse || "Not Assigned"
        ]);

        // 🔹 Table
        autoTable(doc, {
            startY: 40,
            head: [columns],
            body: rows,

            styles: {
                fontSize: 8,
                cellPadding: 3,
                halign: "center"
            },

            headStyles: {
                fillColor: [76, 175, 80],
                textColor: 255,
                fontStyle: "bold"
            },

            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },

            didDrawPage: function (data) {
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height || pageSize.getHeight();

                doc.setFontSize(9);
                doc.setTextColor(150);

                doc.text(
                    `Page ${doc.internal.getNumberOfPages()}`,
                    data.settings.margin.left,
                    pageHeight - 10
                );

                doc.text(
                    "Generated by ERP System",
                    pageSize.width - 60,
                    pageHeight - 10
                );
            }
        });

        doc.save("Inventory_Report.pdf");
    };

    return (
        <div className="fade-in">
            <PageHeader title="Inventory Reports" breadcrumbs={['Reports', 'Inventory']} />
            <TopTabNav tabs={tabs} />

            <div className="page-content">
                {/* 🔹 Heading */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <h3 style={{ margin: 0 }}>Inventory Reports</h3>
                  <div style={{ display: "inline-block" }}>
  <svg
    width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="#6b7280" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round"
    style={{ cursor: "pointer", marginTop: "2px" }}
    onClick={() => window.location.href = "/help?section=purchase-report"}
    title="View help for Inventory Reports"
  >
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
                      Filter by date range to generate and download inventory purchase reports.
                    </div>
                  </div>
                </div>

                {/* 🔹 Filters */}
                <div style={styles.filterContainer}>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        style={styles.input}
                    />

                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        style={styles.input}
                    />

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        style={styles.input}
                    >
                        <option value="order_date">Order Date</option>
                        <option value="received_date">Received Date</option>
                    </select>

                    <button onClick={fetchReport} style={styles.button}>
                        Generate Report
                    </button>

                    {/* 🔥 NEW PDF BUTTON */}
                    <button onClick={downloadPDF} style={styles.pdfBtn}>
                        Download PDF
                    </button>
                </div>

                {/* 🔹 Table */}
                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                {[
                                    "PO Number", "Product", "Supplier", "Order Date",
                                    "Ordered Qty", "Received Qty", "Rejected Qty",
                                    "Last Received Date", "Warehouse"
                                ].map((head, i) => (
                                    <th key={i} style={styles.th}>{head}</th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={styles.noData}>
                                        No Data
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, index) => (
                                    <tr key={index}>
                                        <td style={styles.td}>{row.po_number}</td>
                                        <td style={styles.td}>{row.product_id}</td>
                                        <td style={styles.td}>{row.vendor_id}</td>
                                        <td style={styles.td}>{formatDate(row.order_date)}</td>
                                        <td style={styles.td}>{row.ordered_qty}</td>
                                        <td style={styles.td}>{row.received_qty}</td>
                                        <td style={styles.td}>{row.rejected_qty}</td>
                                        <td style={styles.td}>
                                            {row.last_receipt_date === "Cancelled" ? (
                                                <span style={{ color: "red", fontWeight: "bold" }}>Cancelled</span>
                                            ) : formatDate(row.last_receipt_date)}
                                        </td>
                                        <td style={styles.td}>{row.warehouse || "Not Assigned"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
}

const styles = {

    filterContainer: {
        display: "flex",
        gap: "12px",
        marginBottom: "20px",
        flexWrap: "wrap",
        background: "#ffffff",
        padding: "15px",
        borderRadius: "8px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
    },

    input: {
        padding: "8px 10px",
        borderRadius: "6px",
        border: "1px solid #ccc",
        fontSize: "14px"
    },

    button: {
        background: "#4CAF50",
        color: "#fff",
        border: "none",
        padding: "8px 16px",
        borderRadius: "6px",
        cursor: "pointer",
        fontWeight: "bold"
    },

    pdfBtn: {
        background: "#2196F3",
        color: "#fff",
        border: "none",
        padding: "8px 16px",
        borderRadius: "6px",
        cursor: "pointer",
        fontWeight: "bold"
    },

    tableWrapper: {
        overflowX: "auto",
        background: "#fff",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
    },

    table: {
        width: "100%",
        borderCollapse: "collapse",
        minWidth: "900px"
    },

    th: {
        background: "#f4f6f8",
        padding: "10px",
        textAlign: "left",
        borderBottom: "2px solid #ddd",
        fontSize: "14px"
    },

    td: {
        padding: "10px",
        borderBottom: "1px solid #eee",
        fontSize: "14px"
    },

    noData: {
        textAlign: "center",
        padding: "20px",
        color: "#888"
    }
};