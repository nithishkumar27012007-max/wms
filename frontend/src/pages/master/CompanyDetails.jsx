import React, { useState, useEffect } from "react";
import PageHeader from "../../components/PageHeader";
import TopTabNav from "../../components/TopTabNav";
import { getAuthHeaders } from "../../utils/authHeaders";

const API_URL = "https://expand-best-therapist-surgeon.trycloudflare.com";

const tabs = [
  { label: "Company Details", path: "/master/company-details" },
  { label: "Vendors", path: "/master/vendors" },
  { label: "Customers", path: "/master/customers" },
  { label: "Warehouses", path: "/master/warehouses" },
  { label: "Carton Box", path: "/master/carton-box" },
  { label: "Products", path: "/master/products" },
  { label: "Courier", path: "/master/courier" },
];

const EMPTY = {
  companyName: "",
  gstin: "",
  pan: "",
  phone: "",
  email: "",
  streetAddress: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
};

export default function CompanyDetails() {
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [showTooltip, setShowTooltip] = useState(false);

  // Fetch company data
  useEffect(() => {
    const controller = new AbortController();

    const fetchExisting = async () => {
      try {
        const res = await fetch(`${API_URL}/company/read`, {
          signal: controller.signal,
          headers: getAuthHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.length > 0) {
          const first = data[0];
          setForm({
            companyName: first.companyName || "",
            gstin: first.gstin || "",
            pan: first.pan || "",
            phone: first.phone || "",
            email: first.email || "",
            streetAddress: first.streetAddress || "",
            city: first.city || "",
            state: first.state || "",
            pincode: first.pincode || "",
            country: first.country || "India",
          });
          setEditId(first.id);
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Failed to fetch company data", err);
      } finally {
        if (!controller.signal.aborted) {
          setInitialLoad(false);
        }
      }
    };

    fetchExisting();
    return () => controller.abort();
  }, []);

  // Auto-clear messages
  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(""); setError(""); }, 3000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // Submit (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      setError("Company name is required");
      return;
    }

    setLoading(true);
    const url = editId ? `${API_URL}/company/update/${editId}` : `${API_URL}/company/create`;
    const method = editId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.detail || "Error occurred");
        setLoading(false);
        return;
      }

      const saved = await res.json();
      if (!editId && saved?.id) setEditId(saved.id);
      setSuccess(editId ? "✅ Updated Successfully!" : "✅ Saved Successfully!");
      setShowModal(false);

      const refreshRes = await fetch(`${API_URL}/company/read`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        if (data && data.length > 0) {
          const first = data[0];
          setForm({
            companyName: first.companyName || "",
            gstin: first.gstin || "",
            pan: first.pan || "",
            phone: first.phone || "",
            email: first.email || "",
            streetAddress: first.streetAddress || "",
            city: first.city || "",
            state: first.state || "",
            pincode: first.pincode || "",
            country: first.country || "India",
          });
        }
      }
    } catch (_) {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setForm(EMPTY);
    setEditId(null);
    setModalMode("add");
    setError("");
    setShowModal(true);
  };

  const handleOpenEditModal = () => {
    setModalMode("edit");
    setError("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError("");
  };

  // Format full address
  const getFullAddress = () => {
    const parts = [];
    if (form.streetAddress) parts.push(form.streetAddress);
    if (form.city) parts.push(form.city);
    if (form.state) parts.push(form.state);
    if (form.pincode) parts.push(`${form.pincode}`);
    if (form.country) parts.push(form.country);
    return parts.join(", ");
  };

  const styles = {
    container: {
      padding: "24px",
      backgroundColor: "#f9fafb",
      minHeight: "100vh",
    },
    card: {
      backgroundColor: "#ffffff",
      borderRadius: "12px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      marginBottom: "24px",
      overflow: "hidden",
    },
    cardHeader: {
      padding: "20px 24px",
      borderBottom: "1px solid #e5e7eb",
      backgroundColor: "#f8fafc",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    cardTitle: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#1f2937",
      margin: 0,
    },
    cardSubtitle: {
      fontSize: "12px",
      color: "#6b7280",
      margin: "4px 0 0 0",
    },
    companyInfo: {
      padding: "24px",
    },
    companyHeader: {
      marginBottom: "24px",
      paddingBottom: "16px",
      borderBottom: "2px solid #e5e7eb",
    },
    companyName: {
      fontSize: "24px",
      fontWeight: "700",
      color: "#1f2937",
      marginBottom: "8px",
    },
    // Two Column Layout
    twoColumnLayout: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "32px",
    },
    leftColumn: {
      padding: "16px",
      backgroundColor: "#f9fafb",
      borderRadius: "12px",
    },
    rightColumn: {
      padding: "16px",
      backgroundColor: "#f9fafb",
      borderRadius: "12px",
    },
    sectionTitle: {
      fontSize: "14px",
      fontWeight: "700",
      color: "#4f46e5",
      textTransform: "uppercase",
      letterSpacing: "1px",
      marginBottom: "16px",
      paddingBottom: "8px",
      borderBottom: "2px solid #e0e7ff",
    },
    addressBlock: {
      marginBottom: "20px",
    },
    addressLine: {
      fontSize: "14px",
      color: "#374151",
      lineHeight: "1.6",
      marginBottom: "4px",
    },
    contactItem: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "12px",
      fontSize: "14px",
      color: "#374151",
    },
    contactIcon: {
      fontSize: "16px",
      minWidth: "20px",
    },
    taxItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 0",
      borderBottom: "1px solid #e5e7eb",
    },
    taxLabel: {
      fontSize: "13px",
      fontWeight: "600",
      color: "#6b7280",
      textTransform: "uppercase",
    },
    taxValue: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#1f2937",
      fontFamily: "monospace",
    },
    divider: {
      height: "1px",
      backgroundColor: "#e5e7eb",
      margin: "16px 0",
    },
    editBtn: {
      marginTop: "24px",
      padding: "10px 24px",
      backgroundColor: "#f59e0b",
      color: "white",
      border: "none",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s",
    },
    addBtn: {
      padding: "10px 24px",
      backgroundColor: "#4f46e5",
      color: "white",
      border: "none",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s",
    },
    emptyState: {
      textAlign: "center",
      padding: "60px",
      color: "#9ca3af",
    },
    emptyIcon: {
      fontSize: "48px",
      marginBottom: "16px",
    },
    // Modal Styles
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      animation: "fadeIn 0.2s ease-out",
    },
    modalContent: {
      backgroundColor: "#ffffff",
      borderRadius: "16px",
      width: "90%",
      maxWidth: "800px",
      maxHeight: "90vh",
      overflow: "auto",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
      animation: "slideUp 0.3s ease-out",
    },
    modalHeader: {
      padding: "20px 24px",
      borderBottom: "1px solid #e5e7eb",
      backgroundColor: modalMode === "add" ? "#4f46e5" : "#f59e0b",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    modalTitle: {
      fontSize: "18px",
      fontWeight: "600",
      margin: 0,
      color: "white",
    },
    closeBtn: {
      background: "rgba(255, 255, 255, 0.2)",
      border: "none",
      fontSize: "20px",
      cursor: "pointer",
      color: "white",
      padding: "4px 8px",
      borderRadius: "6px",
      transition: "all 0.2s",
    },
    modalBody: {
      padding: "24px",
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "20px",
      marginBottom: "20px",
    },
    fullWidth: { gridColumn: "1 / -1" },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
    label: {
      fontSize: "13px",
      fontWeight: "600",
      color: "#374151",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    required: { color: "#ef4444", marginLeft: "4px" },
    input: {
      padding: "10px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "8px",
      fontSize: "14px",
      transition: "all 0.2s",
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
    },
    textarea: {
      padding: "10px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "8px",
      fontSize: "14px",
      transition: "all 0.2s",
      outline: "none",
      resize: "vertical",
      fontFamily: "inherit",
      width: "100%",
      boxSizing: "border-box",
    },
    modalFooter: {
      padding: "20px 24px",
      borderTop: "1px solid #e5e7eb",
      display: "flex",
      justifyContent: "flex-end",
      gap: "12px",
    },
    cancelBtn: {
      padding: "8px 20px",
      backgroundColor: "white",
      color: "#6b7280",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "13px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    saveBtn: {
      padding: "8px 20px",
      backgroundColor: modalMode === "add" ? "#4f46e5" : "#f59e0b",
      color: "white",
      border: "none",
      borderRadius: "6px",
      fontSize: "13px",
      fontWeight: "500",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      transition: "all 0.2s",
    },
    successBanner: {
      backgroundColor: "#dcfce7",
      border: "1px solid #86efac",
      borderRadius: "8px",
      padding: "12px 16px",
      marginBottom: "20px",
      color: "#16a34a",
      fontWeight: "500",
      fontSize: "14px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    errorBanner: {
      backgroundColor: "#fee2e2",
      border: "1px solid #fca5a5",
      borderRadius: "8px",
      padding: "12px 16px",
      marginBottom: "20px",
      color: "#dc2626",
      fontWeight: "500",
      fontSize: "14px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
  };

  if (initialLoad) {
    return (
      <div>
        <PageHeader title="Company Details" breadcrumbs={["Master", "Company Details"]} />
        <TopTabNav tabs={tabs} />
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.companyInfo}>
              <div style={{ textAlign: "center", padding: "40px" }}>
                <div style={{ width: "40px", height: "40px", border: "3px solid #f3f4f6", borderTop: "3px solid #4f46e5", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }}></div>
                <p>Loading company data...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Company Details" breadcrumbs={["Master", "Company Details"]} />
      <TopTabNav tabs={tabs} />

      <div style={styles.container}>
        {success && <div style={styles.successBanner}>✅ {success}</div>}
        {error && <div style={styles.errorBanner}>⚠️ {error}</div>}

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            {/* Title + Help Icon */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={styles.cardTitle}>Company Information</h3>

              {/* Help Icon with tooltip */}
              <div
  style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
  onMouseEnter={() => setShowTooltip(true)}
  onMouseLeave={() => setShowTooltip(false)}
  onClick={() => window.location.href = "/help?section=company"}
>
  <svg
    width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round"
    style={{ cursor: "pointer", flexShrink: 0 }}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
  {showTooltip && (
    <div style={{
      position: "absolute", top: "28px", left: "50%",
      transform: "translateX(-50%)", backgroundColor: "#1f2937",
      color: "#fff", fontSize: "12px", padding: "8px 12px",
      borderRadius: "6px", whiteSpace: "nowrap", zIndex: 50,
      boxShadow: "0 4px 12px rgba(0,0,0,0.2)", pointerEvents: "none",
    }}>
      Click to view Company Details help
      <div style={{
        position: "absolute", top: "-5px", left: "50%",
        transform: "translateX(-50%)", width: 0, height: 0,
        borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
        borderBottom: "5px solid #1f2937",
      }} />
    </div>
  )}
</div>
</div>
            <div>
              <h3 style={styles.cardTitle}>Company Information</h3>
            </div>
            {!editId ? (
              <button 
                style={styles.addBtn} 
                onClick={handleOpenAddModal}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#4338ca"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "#4f46e5"}
              >
                ➕ Add Company
              </button>
            ) : null}
          </div>

          <div style={styles.companyInfo}>
            {editId ? (
              <>
                <div style={styles.companyHeader}>
                  <div style={styles.companyName}>
                    {form.companyName || "No Company Name"}
                  </div>
                </div>

                {/* Two Column Layout - Left: Address & Contact, Right: Tax Info */}
                <div style={styles.twoColumnLayout}>
                  {/* Left Column - Address & Contact */}
                  <div style={styles.leftColumn}>
                    <div style={styles.sectionTitle}>📍 Address & Contact</div>
                    
                    <div style={styles.addressBlock}>
                      <div style={styles.addressLine}>{form.streetAddress || ""}</div>
                      <div style={styles.addressLine}>
                        {[form.city, form.state].filter(Boolean).join(", ")}
                        {form.city && form.state && form.pincode ? ", " : ""}
                        {form.pincode ? `${form.pincode}` : ""}
                      </div>
                      <div style={styles.addressLine}>{form.country || "India"}</div>
                    </div>

                    <div style={styles.divider} />

                    <div style={styles.contactItem}>
                      <span style={styles.contactIcon}>📞</span>
                      <span>Phone: {form.phone || "-"}</span>
                    </div>
                    <div style={styles.contactItem}>
                      <span style={styles.contactIcon}>✉️</span>
                      <span>Email: {form.email || "-"}</span>
                    </div>
                  </div>

                  {/* Right Column - Tax Information */}
                  <div style={styles.rightColumn}>
                    <div style={styles.sectionTitle}>🏢 Tax Information</div>
                    
                    <div style={styles.taxItem}>
                      <span style={styles.taxLabel}>GSTIN</span>
                      <span style={styles.taxValue}>{form.gstin || "-"}</span>
                    </div>
                    <div style={styles.taxItem}>
                      <span style={styles.taxLabel}>PAN Number</span>
                      <span style={styles.taxValue}>{form.pan || "-"}</span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "center", marginTop: "24px" }}>
                  <button 
                    style={styles.editBtn} 
                    onClick={handleOpenEditModal}
                    onMouseEnter={(e) => e.target.style.backgroundColor = "#d97706"}
                    onMouseLeave={(e) => e.target.style.backgroundColor = "#f59e0b"}
                  >
                    ✏️ Edit Company
                  </button>
                </div>
              </>
            ) : (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>🏢</div>
                <p>No company details available</p>
                <p style={{ fontSize: "12px", marginTop: "8px", color: "#9ca3af" }}>
                  Click "Add Company" to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={handleCloseModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {modalMode === "add" ? "➕ Add New Company" : "✏️ Edit Company"}
              </h3>
              <button 
                style={styles.closeBtn} 
                onClick={handleCloseModal}
                onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(255, 255, 255, 0.3)"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)"}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={styles.modalBody}>
                <div style={styles.formGrid}>
                  <div style={styles.fullWidth}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        Company Name <span style={styles.required}>*</span>
                      </label>
                      <input
                        style={styles.input}
                        type="text"
                        name="companyName"
                        value={form.companyName}
                        onChange={handleChange}
                        placeholder="Enter company name"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>GSTIN</label>
                      <input
                        style={styles.input}
                        type="text"
                        name="gstin"
                        value={form.gstin}
                        onChange={handleChange}
                        placeholder="Enter GSTIN"
                      />
                    </div>
                  </div>

                  <div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>PAN Number</label>
                      <input
                        style={styles.input}
                        type="text"
                        name="pan"
                        value={form.pan}
                        onChange={handleChange}
                        placeholder="Enter PAN number"
                      />
                    </div>
                  </div>

                  <div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Phone</label>
                      <input
                        style={styles.input}
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  <div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Email</label>
                      <input
                        style={styles.input}
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>

                  <div style={styles.fullWidth}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Street Address</label>
                      <textarea
                        style={styles.textarea}
                        name="streetAddress"
                        value={form.streetAddress}
                        onChange={handleChange}
                        placeholder="Enter street address"
                        rows="2"
                      />
                    </div>
                  </div>

                  <div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>City</label>
                      <input
                        style={styles.input}
                        type="text"
                        name="city"
                        value={form.city}
                        onChange={handleChange}
                        placeholder="Enter city"
                      />
                    </div>
                  </div>

                  <div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>State</label>
                      <input
                        style={styles.input}
                        type="text"
                        name="state"
                        value={form.state}
                        onChange={handleChange}
                        placeholder="Enter state"
                      />
                    </div>
                  </div>

                  <div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Pincode</label>
                      <input
                        style={styles.input}
                        type="text"
                        name="pincode"
                        value={form.pincode}
                        onChange={handleChange}
                        placeholder="Enter pincode"
                        maxLength="6"
                      />
                    </div>
                  </div>

                  <div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Country</label>
                      <input
                        style={styles.input}
                        type="text"
                        name="country"
                        value={form.country}
                        onChange={handleChange}
                        placeholder="Enter country"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.saveBtn}
                  disabled={loading}
                >
                  {loading ? "⏳ Saving..." : modalMode === "add" ? "💾 Save Company" : "💾 Update Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        input:focus, textarea:focus {
          outline: none;
          border-color: #4f46e5 !important;
          box-shadow: 0 0 0 3px rgba(79,70,229,0.1) !important;
        }
        button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
        button:active:not(:disabled) { transform: translateY(0); }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}