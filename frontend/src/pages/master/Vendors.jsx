import { useState, useEffect } from "react";
import PageHeader from "../../components/PageHeader";
import TopTabNav from "../../components/TopTabNav";
import { getAuthHeaders } from "../../utils/authHeaders";

const tabs = [
    { label: "Company Details", path: "/master/company-details" },
    { label: "Vendors", path: "/master/vendors" },
    { label: "Customers", path: "/master/customers" },
    { label: "Warehouses", path: "/master/warehouses" },
    { label: 'Carton Box', path: '/master/carton-box' },
    { label: "Products", path: "/master/products" },
    { label: "Courier", path: "/master/courier" },
];

export default function Vendors() {
    const [vendors, setVendors] = useState([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateId, setUpdateId] = useState(null);
    const [showTooltip, setShowTooltip] = useState(false);

    const [form, setForm] = useState({
        id: "",
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        lead_time_days: "",
        rating: "",
        is_active: true
    });

    const validateForm = () => {
        if (
            !form.id.trim() ||
            !form.name.trim() ||
            !form.contact_person.trim() ||
            !form.phone.trim() ||
            !form.email.trim() ||
            !form.address.trim() ||
            form.lead_time_days === "" ||
            form.rating === ""
        ) {
            alert("All fields must be filled");
            return false;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(form.email)) {
            alert("Please enter a valid email address");
            return false;
        }

        const phonePattern = /^[0-9]{10}$/;
        if (!phonePattern.test(form.phone)) {
            alert("Phone number must be 10 digits");
            return false;
        }

        if (form.lead_time_days < 0) {
            alert("Lead time cannot be negative");
            return false;
        }

        if (form.rating < 0) {
            alert("Rating cannot be negative");
            return false;
        }

        if (form.rating > 5) {
            alert("Rating must be between 0 and 5");
            return false;
        }

        return true;
    };

    const loadVendors = async () => {
        try {
            const res = await fetch(
                "http://127.0.0.1:8000/vendors-read",
                {
                    headers: getAuthHeaders()
                }
            );

            if (res.status === 401) {
                localStorage.clear();
                window.location.href = "/";
                return;
            }

            const data = await res.json();
            setVendors(data);

        } catch (error) {
            console.error(error);
            alert("Failed to load vendors");
        }
    };

    useEffect(() => {
        loadVendors();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (type === "number") {
            const numValue = parseFloat(value);
            if (value !== "" && numValue < 0) {
                setForm({
                    ...form,
                    [name]: 0
                });
                return;
            }
        }
        
        setForm({
            ...form,
            [name]: type === "checkbox" ? checked : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        const payload = {
            ...form,
            lead_time_days: form.lead_time_days && form.lead_time_days >= 0 ? parseInt(form.lead_time_days) : 0,
            rating: form.rating && form.rating >= 0 ? parseFloat(form.rating) : 0
        };

        try {
            let res, data;

            if (isUpdating) {
                res = await fetch(`http://127.0.0.1:8000/vendors-update/${updateId}`, {
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
                res = await fetch("http://127.0.0.1:8000/vendors-create", {
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
                if (data.detail && data.detail.toLowerCase().includes("exists")) {
                    alert("Vendor ID already exists. Please create a new ID.");
                } else {
                    alert(data.detail || "Server error. Please try again.");
                }
                return;
            }

            alert(data.message || (isUpdating ? "Vendor updated successfully" : "Vendor created successfully"));

            loadVendors();
            handleCancelUpdate();

        } catch (error) {
            alert("Server error. Please try again.");
        }
    };

    const handleEdit = (vendor) => {
        setForm({
            id: vendor.id,
            name: vendor.name,
            contact_person: vendor.contact_person,
            phone: vendor.phone,
            email: vendor.email,
            address: vendor.address,
            lead_time_days: vendor.lead_time_days >= 0 ? vendor.lead_time_days : 0,
            rating: vendor.rating >= 0 ? vendor.rating : 0,
            is_active: vendor.is_active
        });
        setIsUpdating(true);
        setUpdateId(vendor.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelUpdate = () => {
        setForm({
            id: "",
            name: "",
            contact_person: "",
            phone: "",
            email: "",
            address: "",
            lead_time_days: "",
            rating: "",
            is_active: true
        });
        setIsUpdating(false);
        setUpdateId(null);
    };

    // Helper function to safely display values
    const formatValue = (value) => {
        if (value === null || value === undefined) return "-";
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        if (num < 0) return "-";
        return value;
    };

    // Helper function to format timestamp
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return "-";
        try {
            const date = new Date(timestamp);
            return date.toLocaleString(); // Formats as MM/DD/YYYY, HH:MM:SS AM/PM
        } catch (error) {
            return timestamp;
        }
    };

    const styles = {
        form: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", marginTop: "20px" },
        formGroup: { display: "flex", flexDirection: "column" },
        label: { fontSize: "14px", fontWeight: "600", marginBottom: "6px" },
        input: { padding: "10px", border: "1px solid #ddd", borderRadius: "6px", width: "100%" },
        checkboxRow: { gridColumn: "span 2", display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" },
        button: { padding: "12px", backgroundColor: "#4f46e5", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" },
        updateBtn: { padding: "12px 8px", background: "#22c55e", border: "none", color: "#fff", borderRadius: "5px", cursor: "pointer" },
        cancelButton: { padding: "12px", backgroundColor: "#f87171", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" },
        tableContainer: { overflowX: "auto", marginTop: "20px", width: "100%" },
        table: { width: "100%", minWidth: "1000px", borderCollapse: "collapse", tableLayout: "fixed" },
        th: { background: "#4f46e5", color: "white", padding: "10px", textAlign: "left" },
        td: { border: "1px solid #ddd", padding: "10px", wordBreak: "break-word" },
    };

    return (
        <div className="fade-in">
            <PageHeader title="Vendors" breadcrumbs={["Master", "Vendors"]} />
            <TopTabNav tabs={tabs} />

            <div className="page-content">
                {/* Heading with Help Tooltip */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                    <h3 style={{ margin: 0 }}>{isUpdating ? "Update Vendor" : "Add Vendor"}</h3>
                    <div
  style={{ position: "relative", display: "inline-flex" }}
  onMouseEnter={() => setShowTooltip(true)}
  onMouseLeave={() => setShowTooltip(false)}
  onClick={() => window.location.href = "/help?section=vendor"}
>
  <span style={{
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    border: "2px solid #6b7280",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "700",
    color: "#6b7280",
    cursor: "pointer",
    userSelect: "none",
    flexShrink: 0,
  }}>?</span>

  {showTooltip && (
    <div style={{
      position: "absolute",
      left: "26px",
      top: "50%",
      transform: "translateY(-50%)",
      background: "#1e293b",
      color: "#fff",
      padding: "6px 10px",
      borderRadius: "6px",
      fontSize: "12px",
      whiteSpace: "nowrap",
      zIndex: 100,
      pointerEvents: "none",
    }}>
      Click to view Vendor Management help
    </div>
  )}
</div>
                </div>
                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Vendor ID</label>
                        <input
                            style={styles.input}
                            name="id"
                            placeholder="eg: ven001"
                            value={form.id}
                            onChange={handleChange}
                            disabled={isUpdating} // Disable ID editing during update
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Company Name</label>
                        <input style={styles.input} name="name" value={form.name} onChange={handleChange} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Contact Person</label>
                        <input style={styles.input} name="contact_person" value={form.contact_person} onChange={handleChange} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Phone</label>
                        <input style={styles.input} name="phone" value={form.phone} onChange={handleChange} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Email</label>
                        <input style={styles.input} name="email" value={form.email} onChange={handleChange} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Address</label>
                        <input style={styles.input} name="address" value={form.address} onChange={handleChange} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Lead Time (Days)</label>
                        <input 
                            style={styles.input} 
                            name="lead_time_days" 
                            type="number" 
                            min="0"
                            step="1"
                            value={form.lead_time_days} 
                            onChange={handleChange}
                            onKeyDown={(e) => {
                                if (e.key === '-' || e.key === 'Minus') {
                                    e.preventDefault();
                                }
                            }}
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Rating</label>
                        <input 
                            style={styles.input} 
                            name="rating" 
                            type="number" 
                            min="0"
                            max="5"
                            step="0.1"
                            value={form.rating} 
                            onChange={handleChange}
                            onKeyDown={(e) => {
                                if (e.key === '-' || e.key === 'Minus') {
                                    e.preventDefault();
                                }
                            }}
                        />
                    </div>
                    <div style={styles.checkboxRow}>
                        <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                        <label>Active Vendor</label>
                    </div>

                    <div style={{ gridColumn: "span 2", display: "flex", gap: "10px", marginTop: "10px" }}>
                        <button style={styles.button} type="submit">
                            {isUpdating ? "Update Vendor" : "Create Vendor"}
                        </button>
                        {isUpdating && (
                            <button type="button" style={styles.cancelButton} onClick={handleCancelUpdate}>
                                Cancel Update
                            </button>
                        )}
                    </div>
                </form>

                <h3 style={{ marginTop: "40px" }}>Vendor List</h3>
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>ID</th>
                                <th style={styles.th}>Company Name</th>
                                <th style={styles.th}>Contact</th>
                                <th style={styles.th}>Phone</th>
                                <th style={styles.th}>Email</th>
                                <th style={styles.th}>Address</th>
                                <th style={styles.th}>Lead Time</th>
                                <th style={styles.th}>Rating</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Created At</th>
                                <th style={styles.th}>Updated At</th>
                                <th style={styles.th}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vendors.map(v => (
                                <tr key={v.id}>
                                    <td style={styles.td}>{v.id}</td>
                                    <td style={styles.td}>{v.name}</td>
                                    <td style={styles.td}>{v.contact_person}</td>
                                    <td style={styles.td}>{v.phone}</td>
                                    <td style={styles.td}>{v.email}</td>
                                    <td style={styles.td}>{v.address}</td>
                                    <td style={styles.td}>{formatValue(v.lead_time_days)}</td>
                                    <td style={styles.td}>{formatValue(v.rating)}</td>
                                    <td style={styles.td}>{v.is_active ? "Active" : "Inactive"}</td>
                                    <td style={styles.td}>{formatTimestamp(v.created_at)}</td>
                                    <td style={styles.td}>{formatTimestamp(v.updated_at)}</td>
                                    <td style={styles.td}>
                                        <button style={styles.updateBtn} onClick={() => handleEdit(v)}>Update</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}