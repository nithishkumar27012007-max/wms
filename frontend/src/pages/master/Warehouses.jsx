import { useState, useEffect } from "react";
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

const emptyStorageForm = {
  warehouse_id: "",
  Zone: "",
  rack: "",
  shelf: "",
  is_active: true,
  zone_type: "",
  level: "",
  storage_type: "",
  max_weight_kg: "",
  volume_cbm: "",
};

// Reusable HelpTooltip component
function HelpTooltip({ text, href }) {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => href && (window.location.href = href)}
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
      {show && (
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
          {text}
        </div>
      )}
    </div>
  );
}

export default function Warehouses() {
  const [form, setForm] = useState({
    warehouses_id: "",
    name: "",
    location: "",
    is_active: true,
  });

  const [warehouses, setWarehouses] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [originalID, setOriginalID] = useState(null);
  const [updatedDate, setUpdatedDate] = useState("");

  const [storageForm, setStorageForm] = useState(emptyStorageForm);
  const [storages, setStorages] = useState([]);
  const [warehouseIDs, setWarehouseIDs] = useState([]);
  const [isStorageEditing, setIsStorageEditing] = useState(false);
  const [originalStorageID, setOriginalStorageID] = useState(null);
  const [storageUpdatedDate, setStorageUpdatedDate] = useState("");

  const isDock = storageForm.zone_type === "Dock";
  const isTemp = storageForm.zone_type === "Temp";
  const isPack = storageForm.zone_type === "Pack";
  const isStorageOrDispatch = !isDock && !isPack && !isTemp;

  // Lock zone_type if editing OR once a value has been selected in create mode
  const isZoneTypeLocked = isStorageEditing || storageForm.zone_type !== "";

  useEffect(() => {
    fetchWarehouses();
    fetchWarehouseIDs();
    fetchStorages();
  }, []);

  const fetchWarehouses = async () => {
    try {

      const res = await fetch(
        "http://localhost:8000/warehouse-read",
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
      setWarehouses(data);

    }catch (error) {

        console.error(error);

        alert("Failed to load warehouse");

    }
  };

  const fetchWarehouseIDs = async () => {
    try {

      const res = await fetch(
        "http://localhost:8000/warehouse_ID-read",
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
      setWarehouseIDs(data);
    }
    catch (error) {

      console.error(error);

      alert("Failed to load warehouse ID");

    }

  }

  const fetchStorages = async () => {

    try {

      const res = await fetch(
        "http://localhost:8000/warehouse-storage-read",
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
      setStorages(data);
    }
    catch (error) {

      console.error(error);

      alert("Failed to load warehouse ID");

    }

  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleStorageChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "number" && value !== "") {
      const numValue = parseFloat(value);
      if (numValue < 0) {
        setStorageForm({ ...storageForm, [name]: 0 });
        return;
      }
    }

    setStorageForm({ ...storageForm, [name]: type === "checkbox" ? checked : value });
  };

  const handleEdit = (w) => {
    setForm({ warehouses_id: w.warehouses_id, name: w.name, location: w.location, is_active: w.is_active });
    setOriginalID(w.warehouses_id);
    setIsEditing(true);
    setUpdatedDate(new Date().toISOString().split("T")[0]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelUpdate = () => {
    setForm({ warehouses_id: "", name: "", location: "", is_active: true });
    setIsEditing(false);
    setUpdatedDate("");
  };

  const handleStorageEdit = (s) => {
    setStorageForm({
      warehouse_location_id: s.warehouse_location_id,
      warehouse_id: s.warehouse_id,
      Zone: s.Zone,
      rack:
        s.zone_type === "Temp"
          ? s.warehouse_location_id.split("-").pop()
          : s.zone_type === "Dock"
            ? s.warehouse_location_id.split("-").slice(2).join("-")
            : s.rack,
      shelf: s.shelf,
      is_active: s.is_active,
      zone_type: s.zone_type || "",
      level: s.level || "",
      storage_type: s.storage_type || "",
      max_weight_kg: s.max_weight_kg != null ? s.max_weight_kg : "",
      volume_cbm: s.volume_cbm != null ? s.volume_cbm : "",
    });
    setOriginalStorageID(s.warehouse_location_id);
    setIsStorageEditing(true);
    setStorageUpdatedDate(new Date().toISOString().split("T")[0]);
    const formElement = document.getElementById("storage-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const cancelStorageUpdate = () => {
    setStorageForm(emptyStorageForm);
    setIsStorageEditing(false);
    setStorageUpdatedDate("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.warehouses_id || !form.name || !form.location) {
      alert("All fields are required");
      return;
    }
    try {
      const url = isEditing
        ? `http://localhost:8000/warehouse-update/${originalID}`
        : "http://localhost:8000/warehouse-create";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });

      // Auto logout if session expired
      if (res.status === 401) {
  
        localStorage.clear();
  
        window.location.href = "/";
  
        return;
      }

      const data = await res.json();
      if (!res.ok) { alert(data.detail); return; }
      alert(isEditing ? "Warehouse updated successfully" : "Warehouse created successfully");
      setForm({ warehouses_id: "", name: "", location: "", is_active: true });
      setIsEditing(false);
      setUpdatedDate("");
      fetchWarehouses();
      fetchWarehouseIDs();
    } catch { alert("Server error"); }
  };

  const handleStorageSubmit = async (e) => {
    e.preventDefault();

    // Base required fields
    if (!storageForm.warehouse_id || !storageForm.zone_type) {
      alert("Warehouse and Zone Type are mandatory.");
      return;
    }

    // Volume & Weight only required for Storage / Dispatch
    if (isStorageOrDispatch) {
      if (!storageForm.volume_cbm) {
        alert("Volume is mandatory for Storage/Dispatch zones.");
        return;
      }
      const volume = parseFloat(storageForm.volume_cbm);
      if (isNaN(volume) || volume < 0) {
        alert("Volume cannot be negative");
        return;
      }

      if (!storageForm.max_weight_kg) {
        alert("Max Weight is mandatory for Storage/Dispatch zones.");
        return;
      }
      const weight = parseFloat(storageForm.max_weight_kg);
      if (isNaN(weight) || weight < 0) {
        alert("Max Weight cannot be negative");
        return;
      }
    }

    if (isDock) {
      if (!storageForm.rack) {
        alert("Dock Name/No. is required for Docks.");
        return;
      }
    }

    if (isStorageOrDispatch) {
      if (!storageForm.Zone || !storageForm.rack || !storageForm.shelf || !storageForm.level || !storageForm.storage_type) {
        alert("All fields are mandatory for Storage/Dispatch zones.");
        return;
      }
    }

    try {
      const url = isStorageEditing
        ? `http://localhost:8000/warehouse-storage-update/${originalStorageID}`
        : "http://localhost:8000/warehouse-storage-create";

      const payload = {
        ...storageForm,
        max_weight_kg: isStorageOrDispatch ? parseFloat(storageForm.max_weight_kg) : null,
        volume_cbm: isStorageOrDispatch ? parseFloat(storageForm.volume_cbm) : null,
        zone_type: storageForm.zone_type,
        level: storageForm.level,
        storage_type: storageForm.storage_type,
      };

      const res = await fetch(url, {
        method: isStorageEditing ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      // Auto logout if session expired
      if (res.status === 401) {
  
        localStorage.clear();
  
        window.location.href = "/";
  
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        alert(data.detail);
        return;
      }

      alert(isStorageEditing ? "Storage Updated" : "Warehouse Storage Created");
      setStorageForm(emptyStorageForm);
      setIsStorageEditing(false);
      setStorageUpdatedDate("");
      fetchStorages();
    } catch { alert("Server error"); }
  };

  const fillColor = (pct) => {
    if (pct == null) return "#9ca3af";
    if (pct >= 90) return "#dc2626";
    if (pct >= 60) return "#d97706";
    return "#16a34a";
  };

  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") return "—";
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    if (num < 0) return "—";
    return value;
  };

  const lockedSelectStyle = {
    ...styles.input,
    background: "#f3f4f6",
    cursor: "not-allowed",
    color: "#94a3b8",
  };

  return (
    <div className="fade-in">
      <PageHeader title="Warehouses" breadcrumbs={["Master", "Warehouses"]} />
      <TopTabNav tabs={tabs} />

      <div className="page-content">

        {/* WAREHOUSE FORM */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Heading with tooltip */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h3 style={{ ...styles.formTitle, margin: 0 }}>
              {isEditing ? "Update Warehouse" : "Create Warehouse"}
            </h3>
            <HelpTooltip
  href="/help?section=warehouse"
  text={isEditing ? "Click to view Warehouse help" : "Click to view Warehouse help"}/>
          </div>
          <div style={styles.row}>
            <div style={styles.group}>
              <label style={styles.label}>Warehouse ID</label>
              <input style={styles.input} name="warehouses_id" value={form.warehouses_id} onChange={handleChange} />
            </div>
            <div style={styles.group}>
              <label style={styles.label}>Warehouse Name</label>
              <input style={styles.input} name="name" value={form.name} onChange={handleChange} />
            </div>
            <div style={styles.group}>
              <label style={styles.label}>Location</label>
              <input style={styles.input} name="location" value={form.location} onChange={handleChange} />
            </div>
            {isEditing && (
              <div style={styles.group}>
                <label style={styles.label}>Updated Date</label>
                <input type="date" value={updatedDate} readOnly style={{ ...styles.input, background: "#f3f4f6" }} />
              </div>
            )}
          </div>
          <div style={styles.checkboxRow}>
            <label style={styles.checkboxItem}>
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} /> Active
            </label>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button type="submit" style={styles.button}>{isEditing ? "Update Warehouse" : "Create Warehouse"}</button>
            {isEditing && <button type="button" onClick={cancelUpdate} style={styles.cancelButton}>Cancel Update</button>}
          </div>
        </form>

        <div style={styles.card}>
          <h3 style={styles.tableTitle}>Warehouse List</h3>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["ID", "Name", "Location", "Status", "Created at", "Updated at", "Action"].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {warehouses.map((w) => (
                  <tr key={w.warehouses_id}>
                    <td style={styles.td}>{w.warehouses_id}</td>
                    <td style={styles.td}>{w.name}</td>
                    <td style={styles.td}>{w.location}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: w.is_active ? "#16a34a" : "#dc2626" }}>
                        {w.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={styles.td}>{w.created_at}</td>
                    <td style={styles.td}>{w.updated_at}</td>
                    <td style={styles.td}>
                      <button style={styles.updateBtn} onClick={() => handleEdit(w)}>Update</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* STORAGE FORM */}
        {/* STORAGE FORM */}
        <form id="storage-form" onSubmit={handleStorageSubmit} style={{ ...styles.form, maxWidth: "100%" }}>

          {/* Heading with tooltip */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h3 style={{ ...styles.formTitle, margin: 0 }}>
              {isStorageEditing ? "Update Storage Location" : "Create Storage Location"}
            </h3>
            <HelpTooltip
  href="/help?section=warehouse"
  text={isStorageEditing ? "Click to view Storage Location help" : "Click to view Storage Location help"}
/>
          </div>

          <div style={styles.sectionLabel}>📦 Core Details</div>
          <div style={styles.grid4}>
            <div style={styles.group}>
              <label style={styles.label}>Warehouse <span style={styles.req}>*</span></label>
              <select style={styles.input} name="warehouse_id" value={storageForm.warehouse_id} onChange={handleStorageChange}>
                <option value="">Select Warehouse</option>
                {warehouseIDs.map((w) => (
                  <option key={w.warehouses_id} value={w.warehouses_id}>{w.warehouses_id}</option>
                ))}
              </select>
            </div>

            <div style={styles.group}>
              <label style={styles.label}>Zone Type <span style={styles.req}>*</span></label>
              <select style={styles.input} name="zone_type" value={storageForm.zone_type} onChange={handleStorageChange} disabled={isZoneTypeLocked}>
                <option value="">Select Zone Type</option>
                <option value="Dock">Dock</option>
                <option value="Temp">Temp</option>
                <option value="Storage">Storage</option>
                <option value="Pack">Pack</option>
                <option value="Dispatch">Dispatch</option>
              </select>
            </div>

            {/* Zone Category — only for Storage / Dispatch */}
            {isStorageOrDispatch && storageForm.zone_type !== "" && (
              <div style={styles.group}>
                <label style={styles.label}>Zone Category <span style={styles.req}>*</span></label>
                <select style={styles.input} name="Zone" value={storageForm.Zone} onChange={handleStorageChange}>
                  <option value="">Select Category</option>
                  <option value="Raw Materials">Raw Materials</option>
                  <option value="Finished Goods">Finished Goods</option>
                  <option value="Trading Items">Trading Items</option>
                </select>
              </div>
            )}
          </div>

          {/* Structural Details — Dock, Temp, Storage, Dispatch (not Pack) */}
          {(isDock || isTemp || isStorageOrDispatch) && storageForm.zone_type !== "" && (
            <>
              <div style={{ ...styles.sectionLabel, marginTop: "20px" }}>🏗️ Structural Details</div>
              <div style={styles.grid4}>
                <div style={styles.group}>
                  <label style={styles.label}>
                    {isDock ? "Dock Name / Number" : isTemp ? "Temp Name / Number" : "Rack"}{" "}
                    <span style={styles.req}>*</span>
                  </label>
                  {isTemp ? (
                    <select style={styles.input} name="rack" value={storageForm.rack} onChange={handleStorageChange}>
                      <option value="">Select Temp Type</option>
                      <option value="IN">IN</option>
                      <option value="OUT">OUT</option>
                    </select>
                  ) : (
                    <input
                      style={styles.input}
                      name="rack"
                      value={storageForm.rack}
                      onChange={handleStorageChange}
                      placeholder={isDock ? "e.g. Dock-01" : "e.g. R1"}
                    />
                  )}
                </div>

                {/* Shelf, Level, Storage Type — only for Storage / Dispatch */}
                {isStorageOrDispatch && (
                  <>
                    <div style={styles.group}>
                      <label style={styles.label}>Shelf <span style={styles.req}>*</span></label>
                      <input style={styles.input} name="shelf" value={storageForm.shelf} onChange={handleStorageChange} placeholder="e.g. S1" />
                    </div>
                    <div style={styles.group}>
                      <label style={styles.label}>Floor Level <span style={styles.req}>*</span></label>
                      <select style={styles.input} name="level" value={storageForm.level} onChange={handleStorageChange}>
                        <option value="">Select Levels</option>
                        <option value="L0">Ground</option>
                        <option value="L1">Level 1</option>
                        <option value="L2">Level 2</option>
                        <option value="L3">Level 3</option>
                        <option value="L4">Level 4</option>
                      </select>
                    </div>
                    <div style={styles.group}>
                      <label style={styles.label}>Storage Type <span style={styles.req}>*</span></label>
                      <select style={styles.input} name="storage_type" value={storageForm.storage_type} onChange={handleStorageChange}>
                        <option value="">Select Type</option>
                        <option value="Ambient">Ambient</option>
                        <option value="Cold">Cold</option>
                        <option value="Frozen">Frozen</option>
                        <option value="Dry">Dry</option>
                        <option value="Hazmat">Hazmat</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Capacity & Status */}
          <div style={{ ...styles.sectionLabel, marginTop: "20px" }}>⚖️ Capacity & Status</div>
          <div style={styles.grid4}>

            {/* Max Weight — Storage & Dispatch only */}
            {isStorageOrDispatch && storageForm.zone_type !== "" && (
              <div style={styles.group}>
                <label style={styles.label}>Max Weight (kg) <span style={styles.req}>*</span></label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  style={styles.input}
                  name="max_weight_kg"
                  value={storageForm.max_weight_kg}
                  onChange={handleStorageChange}
                  placeholder="e.g. 2000"
                  onKeyDown={(e) => { if (e.key === "-" || e.key === "Minus") e.preventDefault(); }}
                />
              </div>
            )}

            {/* Volume — Storage & Dispatch only */}
            {isStorageOrDispatch && storageForm.zone_type !== "" && (
              <div style={styles.group}>
                <label style={styles.label}>Zone Volume (CBM) <span style={styles.req}>*</span></label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  style={styles.input}
                  name="volume_cbm"
                  value={storageForm.volume_cbm}
                  onChange={handleStorageChange}
                  placeholder="e.g. 150"
                  onKeyDown={(e) => { if (e.key === "-" || e.key === "Minus") e.preventDefault(); }}
                />
              </div>
            )}

            <div style={styles.group}>
              <label style={styles.label}>Active Status</label>
              <div style={styles.checkboxItem}>
                <input type="checkbox" name="is_active" checked={storageForm.is_active} onChange={handleStorageChange} />
                <span style={{ fontSize: "13px", fontWeight: "600", color: storageForm.is_active ? "#16a34a" : "#dc2626" }}>
                  {storageForm.is_active ? "ENABLED" : "DISABLED"}
                </span>
              </div>
            </div>

            {isStorageEditing && (
              <div style={styles.group}>
                <label style={styles.label}>Last Updated</label>
                <input type="date" value={storageUpdatedDate} readOnly style={{ ...styles.input, background: "#f3f4f6" }} />
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
            <button type="submit" style={styles.button}>
              {isStorageEditing ? "Update Storage" : "Create Storage"}
            </button>
            {isStorageEditing && (
              <button type="button" onClick={cancelStorageUpdate} style={styles.cancelButton}>Cancel Update</button>
            )}
    
            {/* Show Cancel in create mode too, so user can reset the locked zone_type */}
            {!isStorageEditing && storageForm.zone_type !== "" && (
              <button
                type="button"
                onClick={cancelStorageUpdate}
                style={styles.cancelButton}
              >
                Reset Form
              </button>
            )}
          </div>
        </form>

        {/* STORAGE LIST TABLE */}
        <div style={styles.card}>
          <h3 style={{ ...styles.tableTitle, color: "#1e293b" }}>📋 Storage & Dispatch Areas</h3>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["Location ID", "Warehouse", "Type", "Rack", "Shelf", "Lvl", "FILL %", "MAX WT", "VOL", "Status", "Action"].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {storages.filter(s => s.zone_type === "Storage" || s.zone_type === "Dispatch").length === 0 ? (
                  <tr><td colSpan="11" style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>No storage/dispatch areas found</td></tr>
                ) : (
                  storages.filter(s => s.zone_type === "Storage" || s.zone_type === "Dispatch").map((s) => (
                    <tr key={s.warehouse_location_id}>
                      <td style={styles.td}>{s.warehouse_location_id}</td>
                      <td style={styles.td}>{s.warehouse_id}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, background: s.zone_type === "Storage" ? "#6366f1" : "#8b5cf6" }}>{s.zone_type}</span>
                      </td>
                      <td style={styles.td}>{formatValue(s.rack)}</td>
                      <td style={styles.td}>{formatValue(s.shelf)}</td>
                      <td style={styles.td}>{formatValue(s.level)}</td>
                      <td style={styles.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={{ width: "40px", height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(Math.max(s.utilization_pct, 0), 100)}%`, height: "100%", background: fillColor(s.utilization_pct), borderRadius: "3px" }} />
                          </div>
                          <span style={{ fontSize: "11px", color: fillColor(s.utilization_pct), fontWeight: "700" }}>
                            {Number(Math.max(s.utilization_pct || 0, 0)).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td style={styles.td}>{formatValue(s.max_weight_kg)}</td>
                      <td style={styles.td}>{formatValue(s.volume_cbm)}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, background: s.is_active ? "#16a34a" : "#dc2626" }}>
                          {s.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button
                          style={s.location_status === "Occupied" ? styles.occupiedBtn : styles.updateBtn}
                          disabled={s.location_status === "Occupied"}
                          onClick={() => handleStorageEdit(s)}
                        >
                          {s.location_status === "Occupied" ? "Occupied" : "Update"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DOCKS & PACKING TABLE - MODIFIED */}
        <div style={{ ...styles.card, marginTop: "20px", borderTop: "4px solid #10b981" }}>
          <h3 style={{ ...styles.tableTitle, color: "#059669" }}>⚓ Docks & Packing Areas</h3>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["Location ID", "Warehouse", "Type", "Status", "Action"].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {storages.filter(s => s.zone_type === "Dock" || s.zone_type === "Pack" || s.zone_type === "Temp").length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>No docks or packing areas found</td></tr>
                ) : (
                  storages.filter(s => s.zone_type === "Dock" || s.zone_type === "Pack" || s.zone_type === "Temp").map((s) => (
                    <tr key={s.warehouse_location_id}>
                      <td style={styles.td}>{s.warehouse_location_id}</td>
                      <td style={styles.td}>{s.warehouse_id}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, background: s.zone_type === "Dock" ? "#10b981" : s.zone_type === "Temp" ? "#eab308" : "#f59e0b" }}>
                          {s.zone_type}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, background: s.is_active ? "#16a34a" : "#dc2626" }}>
                          {s.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button
                          style={s.location_status === "Occupied" ? styles.occupiedBtn : styles.updateBtn}
                          disabled={s.location_status === "Occupied"}
                          onClick={() => handleStorageEdit(s)}
                        >
                          {s.location_status === "Occupied" ? "Occupied" : "Update"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

const styles = {
  form: { marginTop: "30px", display: "flex", flexDirection: "column", gap: "16px", background: "#fff", padding: "24px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" },
  formTitle: { margin: "0 0 4px 0", fontSize: "18px", fontWeight: "700", color: "#1e293b" },
  sectionLabel: { fontWeight: "600", fontSize: "12px", color: "#6366f1", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid #e2e8f0", paddingBottom: "4px" },
  row: { display: "flex", gap: "20px", flexWrap: "wrap" },
  grid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" },
  group: { display: "flex", flexDirection: "column" },
  label: { marginBottom: "6px", fontWeight: "600", fontSize: "13px", color: "#475569" },
  req: { color: "#dc2626" },
  input: { padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none" },
  checkboxRow: { display: "flex", alignItems: "center", gap: "24px", marginTop: "5px" },
  checkboxItem: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" },
  button: { padding: "10px 24px", border: "none", background: "#4f46e5", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  cancelButton: { padding: "10px 24px", border: "none", background: "#ef4444", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  updateBtn: { padding: "4px 12px", background: "#10b981", border: "none", color: "#fff", borderRadius: "4px", cursor: "pointer", fontWeight: "600", fontSize: "12px" },
  occupiedBtn: { padding: "4px 12px", background: "#f97316", border: "none", color: "#fff", borderRadius: "4px", cursor: "not-allowed", fontWeight: "600", fontSize: "12px" },
  badge: { display: "inline-block", padding: "2px 8px", borderRadius: "6px", color: "#fff", fontSize: "11px", fontWeight: "700" },
  card: { background: "#fff", borderRadius: "10px", padding: "20px", marginTop: "30px", boxShadow: "0 2px 10px rgba(0,0,0,0.08)" },
  tableTitle: { fontSize: "18px", fontWeight: "700", marginBottom: "15px", color: "#1e293b" },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { background: "#f8fafc", color: "#475569", padding: "12px", textAlign: "left", fontSize: "12px", borderBottom: "2px solid #e2e8f0" },
  td: { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", fontSize: "13px", color: "#334155" },
};