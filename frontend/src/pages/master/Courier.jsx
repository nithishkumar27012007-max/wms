import { useState, useEffect, useRef } from "react";
import PageHeader from "../../components/PageHeader";
import TopTabNav from "../../components/TopTabNav";
import { getAuthHeaders } from "../../utils/authHeaders";

const tabs = [
  { label: "Company Details", path: "/master/company-details" },
  { label: "Vendors",         path: "/master/vendors" },
  { label: "Customers",       path: "/master/customers" },
  { label: "Warehouses",      path: "/master/warehouses" },
  { label: "Carton Box",      path: "/master/carton-box" },
  { label: "Products",        path: "/master/products" },
  { label: "Courier",         path: "/master/courier" },
];

const emptyForm = {
  name:          "",
  contact_person:"",
  phone_number:  "",
  email:         "",
  address:       "",
  city:          "",
  state:         "",
  country:       "India",
  pin_code:      "",
  service_type:  "",
  coverage_area: "",
  is_active:     true,
};

const requiredFields = [
  { key: "name",          label: "Courier Name" },
  { key: "contact_person",label: "Contact_person" },
  { key: "phone_number",  label: "Phone" },
  { key: "email",         label: "Email" },
  { key: "address",       label:"Address" },
  { key: "city",          label: "City" },
  { key: "state",         label: "State" },
  { key: "country",       label: "Country" },
  { key: "pin_code",      label: "Pin Code" },
  { key: "service_type",  label: "Service Type" },
  { key: "coverage_area", label: "Coverage Area" },
];

export default function Courier() {
  const [couriers, setCouriers]   = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [loading, setLoading]     = useState(false);
  const requestIdRef = useRef(crypto.randomUUID());
  const [activeFilter, setActiveFilter] = useState("Active");

  const fetchCouriers = async () => {
    try {
      const res  = await fetch(
        "https://expand-best-therapist-surgeon.trycloudflare.com/courier-read",
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
      setCouriers(Array.isArray(data) ? data : []);

    } 
    catch {
      alert("Failed to load couriers.");
    }
  };

  useEffect(() => { fetchCouriers(); }, []);

  const filteredCouriers = couriers.filter((c) => {
    if (activeFilter === "Active")   return c.is_active !== false;
    if (activeFilter === "Inactive") return c.is_active === false;
    return true;
  });

  const activeCnt   = couriers.filter((c) => c.is_active !== false).length;
  const inactiveCnt = couriers.filter((c) => c.is_active === false).length;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleEdit = (courier) => {
    const clean = (v) => (!v || v === "-" ? "" : v);
    setForm({
      name:           clean(courier.name),
      contact_person: clean(courier.contact_person),
      phone_number:   clean(courier.phone_number),
      email:          clean(courier.email),
      address:        clean(courier.address),
      city:           clean(courier.city),
      state:          clean(courier.state),
      country:        clean(courier.country) || "India",
      pin_code:       clean(courier.pin_code),
      service_type:   clean(courier.service_type),
      coverage_area:  clean(courier.coverage_area),
      is_active:      courier.is_active !== false,
    });
    setEditingId(courier.id);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check all required fields
    const missing = requiredFields.filter(
      (f) => !form[f.key]?.toString().trim()
    );

    if (missing.length > 0) {
      alert("Please fill all required fields");
      return;
    }

    // Phone validation (must be exactly 10 digits)
    if (!/^\d{10}$/.test(form.phone_number.trim())) {
      if (!isEditing) {
        alert("Phone must be 10 digits");
        return;
      } else {
        const proceed = window.confirm(
          "Phone number is not 10 digits. Do you still want to update?"
        );
        if (!proceed) return;
      }
    }

    setLoading(true);
    const url    = isEditing
      ? `https://expand-best-therapist-surgeon.trycloudflare.com/courier-update/${editingId}`
      : "https://expand-best-therapist-surgeon.trycloudflare.com/courier-create";
    const method = isEditing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...form,
          request_id: requestIdRef.current
        }),
      });

      // Auto logout if session expired
      if (res.status === 401) {

        localStorage.clear();

        window.location.href = "/";

        return;
      }
      
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "Server error");
        return;
      }
      const data = await res.json();
      alert(
        isEditing
          ? "Courier Updated Successfully"
          : `Courier Created Successfully!  ID: ${data.courier_id}`
      );
      fetchCouriers();
      cancelEdit();
      requestIdRef.current = crypto.randomUUID();
    } catch {
      alert("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const styles = {
    form: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: "20px",
      marginTop: "20px",
    },
    formGroup:  { display: "flex", flexDirection: "column" },
    label:      { fontSize: "14px", fontWeight: "600", marginBottom: "6px" },
    input: {
      padding: "10px",
      border: "1px solid #ddd",
      borderRadius: "6px",
      width: "100%",
      boxSizing: "border-box",
      fontFamily: "inherit",
      fontSize: "14px",
    },
    checkboxRow: {
      gridColumn: "span 2",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginTop: "10px",
    },
    button: {
      padding: "12px 20px",
      backgroundColor: "#4f46e5",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "14px",
    },
    cancelButton: {
      padding: "12px 20px",
      backgroundColor: "#f87171",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "14px",
    },
    updateBtn: {
      padding: "8px 14px",
      background: "#22c55e",
      border: "none",
      color: "#fff",
      borderRadius: "5px",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "13px",
    },
    tableContainer: { overflowX: "auto", marginTop: "20px", width: "100%" },
    table: {
      width: "100%",
      minWidth: "1200px",
      borderCollapse: "collapse",
      tableLayout: "fixed",
    },
    th: {
      background: "#4f46e5",
      color: "white",
      padding: "10px",
      textAlign: "left",
      fontSize: "13px",
      fontWeight: "600",
    },
    td: {
      border: "1px solid #ddd",
      padding: "10px",
      wordBreak: "break-word",
      fontSize: "13px",
    },
    required : { color: "#ef4444", marginLeft: "2px"},
  };

  return (
    <div className="fade-in">
      <PageHeader title="Courier" breadcrumbs={["Master", "Courier"]} />
      <TopTabNav tabs={tabs} />

      <div className="page-content">

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
  <h3 style={{ margin: 0 }}>{isEditing ? "Update Courier" : "Add Courier"}</h3>
  <div
    style={{ position: "relative", display: "inline-block" }}
    onMouseEnter={e => e.currentTarget.querySelector(".tooltip").style.display = "block"}
    onMouseLeave={e => e.currentTarget.querySelector(".tooltip").style.display = "none"}
    onClick={() => window.location.href = "/help?section=courier"}
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
      {isEditing
    ? "Click to view Courier Management help"
    : "Click to view Courier Management help"}
    </div>
  </div>
</div>
        <form onSubmit={handleSubmit} style={styles.form}>

          <div style={styles.formGroup}>
            <label style={styles.label}>Courier Name *</label>
            <input style={styles.input} name="name" value={form.name} onChange={handleChange} placeholder="Courier name" />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Contact Person</label>
            <input style={styles.input} name="contact_person" value={form.contact_person} onChange={handleChange} placeholder="Contact person" />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Phone</label>
            <input style={styles.input} name="phone_number" value={form.phone_number} onChange={handleChange} placeholder="+91 XXXXX XXXXX" type="tel" inputMode="numeric" maxLength={10} />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input type="email" style={styles.input} name="email" value={form.email} onChange={handleChange} placeholder="email@courier.com" />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Address</label>
            <input style={styles.input} name="address" value={form.address} onChange={handleChange} placeholder="Address" />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>City</label>
            <input style={styles.input} name="city" value={form.city} onChange={handleChange} placeholder="City" />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>State</label>
            <input style={styles.input} name="state" value={form.state} onChange={handleChange} placeholder="State" />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Country</label>
            <input style={styles.input} name="country" value={form.country} onChange={handleChange} placeholder="Country" />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Pin Code</label>
            <input style={styles.input} name="pin_code" value={form.pin_code} onChange={handleChange} placeholder="6-digit PIN" maxLength={6} />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Service Type</label>
            <select style={styles.input} name="service_type" value={form.service_type} onChange={handleChange}>
              <option value="">— Select —</option>
              <option value="Air">Air</option>
              <option value="Express">Express</option>
              <option value="Surface">Surface</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Coverage Area</label>
            <select style={styles.input} name="coverage_area" value={form.coverage_area} onChange={handleChange}>
              <option value="">— Select —</option>
              <option value="Local">Local</option>
              <option value="Domestic">Domestic</option>
              <option value="International">International</option>
            </select>
          </div>

          {/* Active Courier checkbox — same style as Vendors */}
          <div style={styles.checkboxRow}>
            <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
            <label>Active Courier</label>
          </div>

          {/* Buttons */}
          <div style={{ gridColumn: "span 2", display: "flex", gap: "10px", marginTop: "10px" }}>
            <button type="submit" style={{ ...styles.button, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading
                ? isEditing ? "Updating…" : "Creating…"
                : isEditing ? "Update Courier" : "Create Courier"}
            </button>
            {isEditing && (
              <button type="button" style={styles.cancelButton} onClick={cancelEdit}>
                Cancel Update
              </button>
            )}
          </div>

        </form>

        {/* ── TABLE SECTION ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "40px" }}>
          <h3 style={{ margin: 0 }}>Courier List</h3>

          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "Active",   count: activeCnt },
              { label: "Inactive", count: inactiveCnt },
              { label: "All",      count: couriers.length },
            ].map(({ label, count }) => (
              <button
                key={label}
                onClick={() => setActiveFilter(label)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: activeFilter === label ? "1.5px solid #4f46e5" : "1px solid #e5e7eb",
                  background: activeFilter === label ? "#eef2ff" : "#f9fafb",
                  color: activeFilter === label ? "#4f46e5" : "#374151",
                  fontWeight: activeFilter === label ? 700 : 500,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {label}
                <span style={{
                  background: activeFilter === label
                    ? (label === "Active" ? "#22c55e" : label === "Inactive" ? "#ef4444" : "#4f46e5")
                    : "#e5e7eb",
                  color: activeFilter === label ? "#fff" : "#6b7280",
                  padding: "1px 7px",
                  borderRadius: "10px",
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 40  }}>#</th>
                <th style={{ ...styles.th, width: 110 }}>Courier ID</th>
                <th style={{ ...styles.th, width: 140 }}>Name</th>
                <th style={{ ...styles.th, width: 180 }}>Address</th>
                <th style={{ ...styles.th, width: 120 }}>Contact Person</th>
                <th style={{ ...styles.th, width: 120 }}>Phone</th>
                <th style={{ ...styles.th, width: 160 }}>Email</th>
                <th style={{ ...styles.th, width: 80  }}>City</th>
                <th style={{ ...styles.th, width: 80  }}>State</th>
                <th style={{ ...styles.th, width: 80  }}>Country</th>
                <th style={{ ...styles.th, width: 80  }}>Pin Code</th>
                <th style={{ ...styles.th, width: 90  }}>Service</th>
                <th style={{ ...styles.th, width: 110 }}>Coverage</th>
                <th style={{ ...styles.th, width: 80  }}>Status</th>
                <th style={{ ...styles.th, width: 100 }}>Created At</th>
                <th style={{ ...styles.th, width: 80  }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCouriers.length === 0 ? (
                <tr>
                  <td colSpan={16} style={{ ...styles.td, textAlign: "center", color: "#9ca3af", padding: "32px" }}>
                    No {activeFilter !== "All" ? activeFilter.toLowerCase() : ""} couriers found.
                  </td>
                </tr>
              ) : (
                filteredCouriers.map((c, i) => (
                  <tr key={c.id} style={{ opacity: c.is_active === false ? 0.6 : 1 }}>
                    <td style={{ ...styles.td, color: "#9ca3af" }}>{i + 1}</td>
                    <td style={styles.td}>{c.courier_id || "—"}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{c.name || "—"}</td>
                    <td style={styles.td}>{c.address || "—"}</td>
                    <td style={styles.td}>{c.contact_person || "—"}</td>
                    <td style={styles.td}>{c.phone_number || "—"}</td>
                    <td style={styles.td}>{c.email || "—"}</td>
                    <td style={styles.td}>{c.city || "—"}</td>
                    <td style={styles.td}>{c.state || "—"}</td>
                    <td style={styles.td}>{c.country || "—"}</td>
                    <td style={styles.td}>{c.pin_code || "—"}</td>
                    <td style={styles.td}>{c.service_type || "—"}</td>
                    <td style={styles.td}>{c.coverage_area || "—"}</td>
                    <td style={styles.td}>{c.is_active !== false ? "Active" : "Inactive"}</td>
                    <td style={{ ...styles.td, fontSize: 11, color: "#6b7280" }}>
                      {c.created_at ? c.created_at.split(" ")[0] : "—"}
                    </td>
                    <td style={styles.td}>
                      <button style={styles.updateBtn} onClick={() => handleEdit(c)}>Update</button>
                    </td>
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