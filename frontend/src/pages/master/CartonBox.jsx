import { useState, useEffect, useRef } from "react";
import PageHeader from "../../components/PageHeader";
import TopTabNav from "../../components/TopTabNav";
import { getAuthHeaders } from "../../utils/authHeaders";

const tabs = [
    { label: "Company Details", path: "/master/company-details" },
    { label: "Vendors", path: "/master/vendors" },
    { label: "Customers", path: "/master/customers" },
    { label: "Warehouses", path: "/master/warehouses" },
    { label: "Carton Box", path: "/master/carton-box" },
    { label: "Products", path: "/master/products" },
    { label: "Courier", path: "/master/courier" },
];

const BASE_URL = "http://127.0.0.1:8000";

export default function CartonBox() {
    const [boxes, setBoxes] = useState([]);
    const [filterStatus, setFilterStatus] = useState("all");
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateId, setUpdateId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const requestIdRef = useRef(crypto.randomUUID());

    const [form, setForm] = useState({
        box_name: "",
        length: "",
        breadth: "",
        height: "",
        weight: "",
        is_active: true,
    });

    const validateForm = () => {
        if (!form.box_name.trim()) {
            alert("Box name is required");
            return false;
        }
        if (form.length === "" || form.breadth === "" || form.height === "" || form.weight === "") {
            alert("All dimension fields must be filled");
            return false;
        }
        if (parseFloat(form.length) <= 0 || parseFloat(form.breadth) <= 0 ||
            parseFloat(form.height) <= 0 || parseFloat(form.weight) <= 0) {
            alert("Length, Breadth, Height, and Weight must be greater than zero");
            return false;
        }
        return true;
    };

    const normalizeBoxData = (box) => {
        let isActive = false;
        if (typeof box.is_active === 'boolean') {
            isActive = box.is_active;
        } else if (typeof box.is_active === 'number') {
            isActive = box.is_active === 1;
        } else if (typeof box.is_active === 'string') {
            isActive = box.is_active.toLowerCase() === 'true' || box.is_active === '1';
        }
        
        return {
            ...box,
            is_active: isActive,
            length: parseFloat(box.length),
            breadth: parseFloat(box.breadth),
            height: parseFloat(box.height),
            weight: parseFloat(box.weight)
        };
    };

    const loadBoxes = async () => {
        setLoading(true);
        try {
            const res = await fetch(
                "http://127.0.0.1:8000/carton-box-read",
                {
                    headers: getAuthHeaders()
                }
            );

            // Auto logout if session expired
            if (res.status === 401) {
                localStorage.clear();
                window.location.href = "/";
                return;
            }

            const data = await res.json();
            const normalized = data.map(box => normalizeBoxData(box));
            setBoxes(normalized);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
            alert("Failed to load Carton Box");
        }
    };

    useEffect(() => { loadBoxes(); }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        const payload = {
            request_id: requestIdRef.current,
            box_name: form.box_name.trim(),
            length: parseFloat(form.length),
            breadth: parseFloat(form.breadth),
            height: parseFloat(form.height),
            weight: parseFloat(form.weight),
            is_active: Boolean(form.is_active),
        };

        try {
            let res, data;
            if (isUpdating) {
                res = await fetch(`http://127.0.0.1:8000/carton-box-update/${updateId}`, {
                    method: "PUT",
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                });

                // Auto logout if session expired
                if (res.status === 401) {

                    localStorage.clear();

                    window.location.href = "/";

                    return;
                }

            } else {
                res = await fetch("http://127.0.0.1:8000/carton-box-create", {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                });

                // Auto logout if session expired
                if (res.status === 401) {

                    localStorage.clear();

                    window.location.href = "/";

                    return;
                }
            }

            data = await res.json();
            if (!res.ok) {
                alert(data.detail || "Server error.");
                return;
            }

            alert(data.message || (isUpdating ? "Updated successfully" : "Created successfully"));
            await loadBoxes();
            handleCancelUpdate();

            // NEW UUID for next fresh request
            requestIdRef.current = crypto.randomUUID();
        } catch (error) {
            console.error("Server error:", error);
            alert("Server error. Please try again.");
        }
    };

    const handleEdit = (box) => {
        setForm({
            box_name: box.box_name,
            length: box.length,
            breadth: box.breadth,
            height: box.height,
            weight: box.weight,
            is_active: box.is_active,
        });
        setIsUpdating(true);
        setUpdateId(box.box_id);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleCancelUpdate = () => {
        setForm({ box_name: "", length: "", breadth: "", height: "", weight: "", is_active: true });
        setIsUpdating(false);
        setUpdateId(null);
    };

    const filteredBoxes = boxes.filter((box) => {
        let matchesStatus = true;
        if (filterStatus === "active") matchesStatus = box.is_active === true;
        if (filterStatus === "inactive") matchesStatus = box.is_active === false;
        
        let matchesSearch = true;
        if (searchTerm) {
            matchesSearch = box.box_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           box.box_id.toLowerCase().includes(searchTerm.toLowerCase());
        }
        
        return matchesStatus && matchesSearch;
    });

    const activeCount = boxes.filter(b => b.is_active === true).length;
    const inactiveCount = boxes.filter(b => b.is_active === false).length;

    const calculateVolume = (length, breadth, height) => {
    return ((length * breadth * height) / 1000000).toFixed(4);
    };

    const styles = {
        container: {
            padding: "24px",
            backgroundColor: "#f9fafb",
            minHeight: "100vh"
        },
        card: {
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            marginBottom: "24px",
            overflow: "hidden"
        },
        cardHeader: {
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
            backgroundColor: "#f8fafc"
        },
        cardTitle: {
            fontSize: "18px",
            fontWeight: "600",
            color: "#1f2937",
            margin: 0
        },
        cardBody: {
            padding: "24px"
        },
        formGrid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
            marginBottom: "20px"
        },
        formGroup: {
            display: "flex",
            flexDirection: "column",
            gap: "8px"
        },
        label: {
            fontSize: "13px",
            fontWeight: "600",
            color: "#374151",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
        },
        input: {
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            fontSize: "14px",
            transition: "all 0.2s",
            outline: "none"
        },
        checkboxGroup: {
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px",
            backgroundColor: "#f9fafb",
            borderRadius: "8px",
            marginBottom: "20px"
        },
        checkbox: {
            width: "18px",
            height: "18px",
            cursor: "pointer"
        },
        buttonGroup: {
            display: "flex",
            gap: "12px",
            marginTop: "20px"
        },
        btnPrimary: {
            padding: "10px 24px",
            backgroundColor: "#4f46e5",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s"
        },
        btnSecondary: {
            padding: "10px 20px",
            backgroundColor: "white",
            color: "#dc2626",
            border: "1.5px solid #fca5a5",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "all 0.2s"
        },
        tableHeader: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "16px"
        },
        filterSection: {
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap"
        },
        searchBox: {
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            fontSize: "14px",
            width: "250px",
            outline: "none",
            transition: "all 0.2s"
        },
        filterPills: {
            display: "flex",
            gap: "8px",
            backgroundColor: "#f3f4f6",
            padding: "4px",
            borderRadius: "10px"
        },
        pill: (isActive) => ({
            padding: "6px 16px",
            backgroundColor: isActive ? "white" : "transparent",
            color: isActive ? "#4f46e5" : "#6b7280",
            border: "none",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: isActive ? "600" : "500",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            display: "flex",
            alignItems: "center",
            gap: "6px"
        }),
        badgeCount: {
            backgroundColor: "#e5e7eb",
            padding: "2px 6px",
            borderRadius: "10px",
            fontSize: "11px",
            fontWeight: "600"
        },
        tableWrapper: {
            overflowX: "auto"
        },
        table: {
            width: "100%",
            borderCollapse: "collapse"
        },
        th: {
            backgroundColor: "#4f46e5",
            color: "white",
            padding: "12px 16px",
            textAlign: "left",
            fontSize: "12px",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            whiteSpace: "nowrap"
        },
        td: {
            padding: "12px 16px",
            borderBottom: "1px solid #f3f4f6",
            fontSize: "14px",
            color: "#374151",
            whiteSpace: "nowrap"
        },
        statusBadge: (isActive) => ({
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600",
            backgroundColor: isActive ? "#dcfce7" : "#fee2e2",
            color: isActive ? "#16a34a" : "#dc2626",
            width: "fit-content"
        }),
        statusDot: (isActive) => ({
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: isActive ? "#16a34a" : "#dc2626"
        }),
        actionButtons: {
            display: "flex",
            gap: "8px"
        },
        btnEdit: {
            padding: "6px 12px",
            backgroundColor: "white",
            color: "#4f46e5",
            border: "1px solid #4f46e5",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "all 0.2s"
        },
        loadingState: {
            textAlign: "center",
            padding: "40px",
            color: "#6b7280"
        },
        emptyState: {
            textAlign: "center",
            padding: "60px",
            color: "#9ca3af"
        },
        spinner: {
            border: "3px solid #f3f4f6",
            borderTop: "3px solid #4f46e5",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px"
        }
    };

    return (
        <div>
            <PageHeader title="Carton Box Master" breadcrumbs={["Master", "Carton Box"]} />
            <TopTabNav tabs={tabs} />

            <div style={styles.container}>
                {/* Form Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <h3 style={styles.cardTitle}>
                                {isUpdating ? "Update Carton Box" : "Add New Carton Box"}
                                {isUpdating && <span style={{ marginLeft: "10px", fontSize: "12px", color: "#6b7280" }}>ID: {updateId}</span>}
                            </h3>
                            <div
    style={{ position: "relative", display: "inline-block" }}
    onMouseEnter={e => e.currentTarget.querySelector(".tooltip").style.display = "block"}
    onMouseLeave={e => e.currentTarget.querySelector(".tooltip").style.display = "none"}
    onClick={() => window.location.href = "/help?section=carton"}
>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                    stroke="#6b7280" strokeWidth="2" strokeLinecap="round"
                                    strokeLinejoin="round" style={{ cursor: "pointer", marginTop: "2px" }}>
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                </svg>
                                <div className="tooltip" style={{
                                    display: "none",
                                    position: "absolute",
                                    top: "26px",
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    background: "#1f2937",
                                    color: "#fff",
                                    padding: "8px 12px",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    whiteSpace: "nowrap",
                                    zIndex: 100,
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                                }}>
                                    {isUpdating
    ? "Click to view Carton Box help"
    : "Click to view Carton Box help"}
                                </div>
                            </div>
                        </div>
                    </div>
                        
                    
                    <div style={styles.cardBody}>
                        <form onSubmit={handleSubmit}>
                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Box Name *</label>
                                    <input
                                        style={styles.input}
                                        type="text"
                                        name="box_name"
                                        value={form.box_name}
                                        onChange={handleChange}
                                        placeholder="e.g., Small Box, Large Carton"
                                        required
                                        onFocus={e => e.target.style.borderColor = "#4f46e5"}
                                        onBlur={e => e.target.style.borderColor = "#d1d5db"}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Length (cm) *</label>
                                    <input
                                        style={styles.input}
                                        type="number"
                                        step="0.01"
                                        name="length"
                                        value={form.length}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Breadth (cm) *</label>
                                    <input
                                        style={styles.input}
                                        type="number"
                                        step="0.01"
                                        name="breadth"
                                        value={form.breadth}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Height (cm) *</label>
                                    <input
                                        style={styles.input}
                                        type="number"
                                        step="0.01"
                                        name="height"
                                        value={form.height}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Weight (kg) *</label>
                                    <input
                                        style={styles.input}
                                        type="number"
                                        step="0.01"
                                        name="weight"
                                        value={form.weight}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div style={styles.checkboxGroup}>
                                <input
                                    style={styles.checkbox}
                                    type="checkbox"
                                    id="is_active"
                                    name="is_active"
                                    checked={form.is_active}
                                    onChange={handleChange}
                                />
                                <label htmlFor="is_active" style={{ fontSize: "14px", fontWeight: "500", cursor: "pointer" }}>
                                    Active Carton Box
                                </label>
                            </div>

                            <div style={styles.buttonGroup}>
                                <button 
                                    type="submit" 
                                    style={styles.btnPrimary}
                                    onMouseEnter={e => e.target.style.backgroundColor = "#4338ca"}
                                    onMouseLeave={e => e.target.style.backgroundColor = "#4f46e5"}
                                >
                                    {isUpdating ? "Update Box" : "Create Box"}
                                </button>
                                {isUpdating && (
                                    <button 
                                        type="button" 
                                        style={styles.btnSecondary}
                                        onClick={handleCancelUpdate}
                                        onMouseEnter={e => {
                                            e.target.style.backgroundColor = "#fee2e2";
                                        }}
                                        onMouseLeave={e => {
                                            e.target.style.backgroundColor = "white";
                                            e.target.style.borderColor = "#fca5a5";
                                        }}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* List Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <div style={styles.tableHeader}>
                            <h3 style={styles.cardTitle}>Carton Box List</h3>
                            <div style={styles.filterSection}>
                                <input
                                    type="text"
                                    style={styles.searchBox}
                                    placeholder="🔍 Search by name or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onFocus={e => e.target.style.borderColor = "#4f46e5"}
                                    onBlur={e => e.target.style.borderColor = "#d1d5db"}
                                />
                                <div style={styles.filterPills}>
                                    <button
                                        style={styles.pill(filterStatus === "all")}
                                        onClick={() => setFilterStatus("all")}
                                    >
                                        All
                                        <span style={styles.badgeCount}>{boxes.length}</span>
                                    </button>
                                    <button
                                        style={styles.pill(filterStatus === "active")}
                                        onClick={() => setFilterStatus("active")}
                                    >
                                        Active
                                        <span style={styles.badgeCount}>{activeCount}</span>
                                    </button>
                                    <button
                                        style={styles.pill(filterStatus === "inactive")}
                                        onClick={() => setFilterStatus("inactive")}
                                    >
                                        Inactive
                                        <span style={styles.badgeCount}>{inactiveCount}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ padding: "0 24px 24px 24px" }}>
                        {loading ? (
                            <div style={styles.loadingState}>
                                <div style={styles.spinner}></div>
                                <div>Loading carton boxes...</div>
                            </div>
                        ) : filteredBoxes.length === 0 ? (
                            <div style={styles.emptyState}>
                                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📦</div>
                                <p>No carton boxes found</p>
                                <p style={{ fontSize: "12px", marginTop: "8px", color: "#9ca3af" }}>
                                    {searchTerm ? "Try adjusting your search" : "Click 'Create Box' to add one"}
                                </p>
                            </div>
                        ) : (
                            <div style={styles.tableWrapper}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>#</th>
                                            <th style={styles.th}>Box ID</th>
                                            <th style={styles.th}>Box Name</th>
                                            <th style={styles.th}>Length (CM)</th>
                                            <th style={styles.th}>Breadth (CM)</th>
                                            <th style={styles.th}>Height (CM)</th>
                                            <th style={styles.th}>Weight (KG)</th>
                                            <th style={styles.th}>Volume (CBM)</th>
                                            <th style={styles.th}>Status</th>
                                            <th style={styles.th}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredBoxes.map((box, index) => (
                                            <tr key={box.box_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                                <td style={styles.td}>{index + 1}</td>
                                                <td style={{ ...styles.td, fontFamily: "monospace", fontSize: "12px", color: "#6b7280" }}>
                                                    {box.box_id}
                                                </td>
                                                <td style={{ ...styles.td, fontWeight: "500" }}>{box.box_name}</td>
                                                <td style={styles.td}>{box.length.toFixed(2)}</td>
                                                <td style={styles.td}>{box.breadth.toFixed(2)}</td>
                                                <td style={styles.td}>{box.height.toFixed(2)}</td>
                                                <td style={styles.td}>{box.weight.toFixed(2)}</td>
                                                <td style={styles.td}>{calculateVolume(box.length, box.breadth, box.height)} CBM</td> 
                                                <td style={styles.td}>
                                                    <div style={styles.statusBadge(box.is_active)}>
                                                        <span style={styles.statusDot(box.is_active)}></span>
                                                        {box.is_active ? "Active" : "Inactive"}
                                                    </div>
                                                </td>
                                                <td style={styles.td}>
                                                    <div style={styles.actionButtons}>
                                                        <button
                                                            style={styles.btnEdit}
                                                            onClick={() => handleEdit(box)}
                                                            onMouseEnter={e => {
                                                                e.target.style.backgroundColor = "#4f46e5";
                                                                e.target.style.color = "white";
                                                            }}
                                                            onMouseLeave={e => {
                                                                e.target.style.backgroundColor = "white";
                                                                e.target.style.color = "#4f46e5";
                                                            }}
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}