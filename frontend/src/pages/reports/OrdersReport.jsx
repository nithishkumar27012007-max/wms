import { useState, useEffect } from "react";
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





export default function OrdersReport() {
    
    const tabs = getRoleTabs();
    
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [filterType, setFilterType] = useState("order_date");
    const [statusFilter, setStatusFilter] = useState("");

    const [data, setData] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const limit = 10;
    const totalPages = Math.ceil(total / limit);

    // Format Date
    const formatDate = (date) => {
        if (!date || date === "Not Delivered") return date;

        return new Date(date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    const fetchReport = async () => {
        if (!fromDate || !toDate) return;

        try {
            const url = `http://127.0.0.1:8000/reports/sales?from_date=${fromDate}&to_date=${toDate}&filter_type=${filterType}&status_filter=${statusFilter}&page=${page}&limit=${limit}`;
            
            const res = await fetch(url,{
                headers: getAuthHeaders()
            });

            // ===========================
            // TOKEN EXPIRED
            // ===========================
            if (res.status === 401) {

                localStorage.clear();

                window.location.href = "/";

                return;
            }
            
            const result = await res.json();

            setData(result.data || []);
            setTotal(result.total || 0);

        } catch (err) {
            console.error(err);
        }
    };

    // 🔹 PDF Download
    // 🔹 PDF Download (ADVANCED ERP STYLE)
    const downloadPDF = async () => {

    if (!fromDate || !toDate) {
        alert("Select filters first");
        return;
    }

    try {
        // 🔥 Fetch ALL data (no pagination)
        const url = `http://127.0.0.1:8000/reports/sales?from_date=${fromDate}&to_date=${toDate}&filter_type=${filterType}&status_filter=${statusFilter}&page=1&limit=10000`;

        const res = await fetch(url);
        const result = await res.json();

        const fullData = result.data || [];

        if (fullData.length === 0) {
            alert("No data to export");
            return;
        }

        const doc = new jsPDF();

        // 🔹 Columns
        const columns = [
            "SO Number",
            "Customer",
            "Product",
            "Order Date",
            "Ordered Qty",
            "Delivered Qty",
            "Amount",
            "Delivery Date",
            "Status"
        ];

        // 🔹 Rows
        const rows = fullData.map(row => [
            row.so_number,
            row.customer_id,
            row.product_id,
            formatDate(row.order_date),
            row.ordered_qty,
            row.delivered_qty,
            `₹ ${row.total_amount}`,
            formatDate(row.delivery_date),
            row.status
        ]);

        autoTable(doc, {
            head: [columns],
            body: rows,

            startY: 45,

            // 🔥 FIXED SPACING (2cm top & bottom)
            margin: {
                top: 40,
                bottom: 20
            },

            // 🔥 IMPORTANT FIX
            pageBreak: "auto",
            rowPageBreak: "avoid", // ❗ no half rows

            styles: {
                fontSize: 8,
                cellPadding: 3,
                valign: "middle"
            },

            // 🔥 Column alignment (ERP style)
            columnStyles: {
                0: { halign: "left" },
                1: { halign: "left" },
                2: { halign: "left" },
                3: { halign: "center" },
                4: { halign: "right" },
                5: { halign: "right" },
                6: { halign: "right" }, // amount
                7: { halign: "center" },
                8: { halign: "center" }
            },

            headStyles: {
                fillColor: [33, 150, 243],
                textColor: 255,
                fontStyle: "bold"
            },

            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },

            didDrawPage: function (data) {

                const pageNumber = doc.internal.getNumberOfPages();
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height;

                // 🔥 HEADER ONLY FIRST PAGE
                if (pageNumber === 1) {

                    doc.setFillColor(33, 150, 243);
                    doc.rect(0, 0, 210, 20, "F");

                    doc.setFontSize(16);
                    doc.setTextColor(255, 255, 255);
                    doc.text("SALES ORDER REPORT", 105, 12, { align: "center" });

                    doc.setFontSize(10);
                    doc.setTextColor(0, 0, 0);

                    doc.text(`From: ${fromDate}`, 14, 28);
                    doc.text(`To: ${toDate}`, 70, 28);
                    doc.text(`Filter: ${filterType}`, 130, 28);
                    doc.text(`Status: ${statusFilter || "All"}`, 14, 34);
                }

                // 🔹 Footer (ALL PAGES)
                doc.setFontSize(9);
                doc.setTextColor(150);

                doc.text(
                    `Page ${pageNumber}`,
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

        doc.save("Sales_Report.pdf");

    } catch (err) {
        console.error(err);
        alert("PDF generation failed");
    }
};

    // 🔹 Fetch on page change
    useEffect(() => {
        if (fromDate && toDate) {
            fetchReport();
        }
    }, [page]);

    // 🔹 Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [fromDate, toDate, filterType, statusFilter]);

    return (
        <div className="fade-in">
            <PageHeader title="Sales Order Reports" breadcrumbs={['Reports', 'Orders']} />
            <TopTabNav tabs={tabs} />

            <div className="page-content">

                {/* 🔹 Heading */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <h3 style={{ margin: 0 }}>Orders Report</h3>
                  <div style={{ display: "inline-block" }}>
  <svg
    width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="#6b7280" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round"
    style={{ cursor: "pointer", marginTop: "2px" }}
    onClick={() => window.location.href = "/help?section=sales-report"}
    title="View help for Orders Report"
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
                      Filter by date range and status to generate and download sales order reports.
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
                        <option value="delivery_date">Delivery Date</option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={styles.input}
                    >
                        <option value="">All Status</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Not Delivered">Not Delivered</option>
                    </select>

                    <button onClick={fetchReport} style={styles.button}>
                        Generate Report
                    </button>

                    {/* 🔥 NEW BUTTON */}
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
                                    "SO Number", "Customer", "Product", "Order Date",
                                    "Ordered Qty", "Delivered Qty", "Total Amount",
                                    "Delivery Date", "Status"
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
                                        <td style={styles.td}>{row.so_number}</td>
                                        <td style={styles.td}>{row.customer_id}</td>
                                        <td style={styles.td}>{row.product_id}</td>
                                        <td style={styles.td}>{formatDate(row.order_date)}</td>
                                        <td style={styles.td}>{row.ordered_qty}</td>
                                        <td style={styles.td}>{row.delivered_qty}</td>
                                        <td style={styles.td}>{row.total_amount}</td>
                                        <td style={styles.td}>{formatDate(row.delivery_date)}</td>
                                        <td style={{
                                            ...styles.td,
                                            color:
                                                row.status === "Delivered" ? "green" :
                                                row.status === "Cancelled" ? "red" :
                                                "orange",
                                            fontWeight: "bold"
                                        }}>
                                            {row.status}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 🔹 Pagination */}
                {total > 0 && (
                    <div style={styles.pagination}>
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            style={styles.pageBtn}
                        >
                            Prev
                        </button>

                        <span>
                            Page {page} of {totalPages}
                        </span>

                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(page + 1)}
                            style={styles.pageBtn}
                        >
                            Next
                        </button>
                    </div>
                )}

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
        background: "#fff",
        padding: "15px",
        borderRadius: "8px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
    },

    input: {
        padding: "8px",
        borderRadius: "6px",
        border: "1px solid #ccc"
    },

    button: {
        background: "#2196F3",
        color: "#fff",
        border: "none",
        padding: "8px 16px",
        borderRadius: "6px",
        cursor: "pointer"
    },

    pdfBtn: {
        background: "#4CAF50",
        color: "#fff",
        border: "none",
        padding: "8px 16px",
        borderRadius: "6px",
        cursor: "pointer"
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
        borderBottom: "2px solid #ddd"
    },

    td: {
        padding: "10px",
        borderBottom: "1px solid #eee"
    },

    noData: {
        textAlign: "center",
        padding: "20px",
        color: "#888"
    },

    pagination: {
        marginTop: "15px",
        display: "flex",
        justifyContent: "center",
        gap: "15px",
        alignItems: "center"
    },

    pageBtn: {
        padding: "6px 12px",
        borderRadius: "5px",
        border: "1px solid #ccc",
        cursor: "pointer",
        background: "#fff"
    }
};