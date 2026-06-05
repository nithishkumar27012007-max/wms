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

const emptyForm = {
  products_id: "",
  name: "",
  barcode: "",
  unit: "",
  product_type: "",
  minimum_stock: "",
  Unit_cost: "",
  is_expiry_tracked: true,
  is_active: true,
  box_id: "",
  units_per_box: "",
  storage_type: "",
  abc_class: "",
  unit_weight_kg: "",
  material_volume_cbm: "",
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [cartonBoxes, setCartonBoxes] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchProducts = async () => {
    try {
      const res = await fetch("https://expand-best-therapist-surgeon.trycloudflare.com/products-read", {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        localStorage.clear();
        window.location.href = "/";
        return;
      }
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error(error);
      alert("Failed to load Products");
    }
  };

  const fetchCartonBoxes = async () => {
    try {
      const res = await fetch("https://expand-best-therapist-surgeon.trycloudflare.com/carton-box-dropdown", {
        headers: getAuthHeaders(),
      });

      // Auto logout if session expired
        if (res.status === 401) {

            localStorage.clear();

            window.location.href = "/";

            return;
        }

      if (!res.ok) {
        setCartonBoxes([]);
        return;
      }
      const data = await res.json();
      setCartonBoxes(data);
    } catch {
      setCartonBoxes([]);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCartonBoxes();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEdit = (product) => {
    setForm({
      products_id: product.products_id,
      name: product.name,
      barcode: product.barcode,
      unit: product.unit,
      product_type: product.product_type,
      minimum_stock: product.minimum_stock,
      Unit_cost: product.Unit_cost,
      is_expiry_tracked: product.is_expiry_tracked,
      is_active: product.is_active,
      box_id: product.box_id || "",
      units_per_box: product.units_per_box ?? "",
      storage_type: product.storage_type || "",
      abc_class: product.abc_class || "",
      unit_weight_kg: product.unit_weight_kg ?? "",
      material_volume_cbm: product.material_volume_cbm ?? "",
    });
    setEditingId(product.products_id);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanedForm = {
      ...form,
      products_id: form.products_id.trim(),
      name: form.name.trim(),
      barcode: form.barcode.trim(),
      unit: form.unit.trim(),
      product_type: form.product_type.trim(),
      minimum_stock: String(form.minimum_stock).trim(),
      Unit_cost: String(form.Unit_cost).trim(),
    };

    if (
      !cleanedForm.products_id ||
      !cleanedForm.name ||
      !cleanedForm.unit ||
      !cleanedForm.product_type ||
      cleanedForm.minimum_stock === "" ||
      cleanedForm.Unit_cost === "" ||
      !cleanedForm.box_id ||
      cleanedForm.units_per_box === "" ||
      !cleanedForm.storage_type ||
      !cleanedForm.abc_class ||
      cleanedForm.unit_weight_kg === "" ||
      cleanedForm.material_volume_cbm === ""
    ) {
      alert("All fields are required");
      return;
    }

    if (
      parseInt(cleanedForm.minimum_stock) < 0 ||
      parseFloat(cleanedForm.Unit_cost) <= 0 ||
      parseInt(cleanedForm.units_per_box) <= 0 ||
      parseFloat(cleanedForm.unit_weight_kg) <= 0 ||
      parseFloat(cleanedForm.material_volume_cbm) <= 0
    ) {
      alert("Please ensure numeric values are valid (Minimum stock >= 0, others > 0)");
      return;
    }

    const url = isEditing
      ? `https://expand-best-therapist-surgeon.trycloudflare.com/products-update/${editingId}`
      : "https://expand-best-therapist-surgeon.trycloudflare.com/products-create";
    const method = isEditing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...cleanedForm,
          minimum_stock: parseInt(cleanedForm.minimum_stock),
          Unit_cost: parseFloat(cleanedForm.Unit_cost),
          is_expiry_tracked: Boolean(cleanedForm.is_expiry_tracked),
          is_active: Boolean(cleanedForm.is_active),
          box_id: cleanedForm.box_id,
          units_per_box: parseInt(cleanedForm.units_per_box),
          storage_type: cleanedForm.storage_type,
          abc_class: cleanedForm.abc_class,
          unit_weight_kg: parseFloat(cleanedForm.unit_weight_kg),
          material_volume_cbm: parseFloat(cleanedForm.material_volume_cbm),
        }),
      });

      // Auto logout if session expired
        if (res.status === 401) {

            localStorage.clear();

            window.location.href = "/";

            return;
        }

      if (!res.ok) {
        const errorData = await res.json();
        alert(JSON.stringify(errorData.detail, null, 2));
        return;
      }

      alert(isEditing ? "Product Updated Successfully" : "Product Created Successfully");
      fetchProducts();
      setIsEditing(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch {
      alert("Server error");
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <div className="fade-in">
      <PageHeader title="Products" breadcrumbs={["Master", "Products"]} />
      <TopTabNav tabs={tabs} />

      <div className="page-content">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
  <h3 style={{ margin: 0 }}>{isEditing ? "Update Product" : "Add Product"}</h3>
  <div style={{ position: "relative", display: "inline-block" }}
    onMouseEnter={e => e.currentTarget.querySelector(".tooltip").style.display = "block"}
    onMouseLeave={e => e.currentTarget.querySelector(".tooltip").style.display = "none"}
    onClick={() => window.location.href = "/help?section=products"}
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
    ? "Click to view Product Management help"
    : "Click to view Product Management help"}
    </div>
  </div>
</div>

        <form onSubmit={handleSubmit} style={styles.form}>

          {/* Basic Information */}
          <div style={styles.sectionTitle}>Basic Information</div>
          <div style={styles.grid}>

            <div>
              <label style={styles.label}>Product ID <span style={styles.required}>*</span></label>
              <input name="products_id" value={form.products_id} style={styles.input} onChange={handleChange} />
            </div>

            <div>
              <label style={styles.label}>Product Name <span style={styles.required}>*</span></label>
              <input name="name" value={form.name} style={styles.input} onChange={handleChange} />
            </div>

            <div>
              <label style={styles.label}>Unit <span style={styles.required}>*</span></label>
              <select name="unit" value={form.unit} style={styles.input} onChange={handleChange}>
                <option value="">Select Unit</option>
                <option value="PCS">Pieces</option>
                <option value="BOX">Box</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Product Type <span style={styles.required}>*</span></label>
              <select name="product_type" value={form.product_type} style={styles.input} onChange={handleChange}>
                <option value="">Select Type</option>
                <option value="Raw Materials">Raw Materials</option>
                <option value="Finished Goods">Finished Goods</option>
                <option value="Trading Items">Trading Items</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Minimum Stock <span style={styles.required}>*</span></label>
              <input type="number" name="minimum_stock" min="0" value={form.minimum_stock} style={styles.input} onChange={handleChange} />
            </div>

            <div>
              <label style={styles.label}>Unit Cost (₹) <span style={styles.required}>*</span></label>
              <input type="number" name="Unit_cost" min="0.01" step="0.01" value={form.Unit_cost} style={styles.input} onChange={handleChange} />
            </div>

          </div>

          {/* Storage & Packaging */}
          <div style={{ ...styles.sectionTitle, marginTop: "24px" }}>Storage &amp; Packaging</div>
          <div style={styles.grid}>

            <div>
              <label style={styles.label}>Carton Box <span style={styles.required}>*</span></label>
              <select name="box_id" value={form.box_id} style={styles.input} onChange={handleChange}>
                <option value="">Select Box</option>
                {cartonBoxes.map((b) => (
                  <option key={b.box_id} value={b.box_id}>{b.box_id} — {b.box_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>Units per Box <span style={styles.required}>*</span></label>
              <input type="number" name="units_per_box" min="1" value={form.units_per_box} style={styles.input} onChange={handleChange} placeholder="e.g. 12" />
            </div>

            <div>
              <label style={styles.label}>Storage Type <span style={styles.required}>*</span></label>
              <select name="storage_type" value={form.storage_type} style={styles.input} onChange={handleChange}>
                <option value="">Select Storage Type</option>
                <option value="Ambient">Ambient</option>
                <option value="Cold">Cold</option>
                <option value="Frozen">Frozen</option>
                <option value="Dry">Dry</option>
                <option value="Hazmat">Hazmat</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>ABC Class <span style={styles.required}>*</span></label>
              <select name="abc_class" value={form.abc_class} style={styles.input} onChange={handleChange}>
                <option value="">Select Class</option>
                <option value="A">A — High Value / Fast Moving</option>
                <option value="B">B — Medium Value</option>
                <option value="C">C — Low Value / Slow Moving</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Unit Weight (kg) <span style={styles.required}>*</span></label>
              <input type="number" step="0.001" min="0.001" name="unit_weight_kg" value={form.unit_weight_kg} style={styles.input} onChange={handleChange} placeholder="e.g. 0.5" />
            </div>

            <div>
              <label style={styles.label}>Material Volume (CBM) <span style={styles.required}>*</span></label>
              <input type="number" step="0.00001" min="0.00001" name="material_volume_cbm"value={form.material_volume_cbm} style={styles.input} onChange={handleChange} placeholder="e.g. 0.002" />
            </div>

            {isEditing && (
              <div>
                <label style={styles.label}>Updated Date</label>
                <input type="date" style={{ ...styles.input, background: "#f3f4f6" }} value={new Date().toISOString().split("T")[0]} readOnly />
              </div>
            )}

          </div>

          {/* Checkboxes */}
          <div style={styles.checkboxGroup}>
            <label>
              <input type="checkbox" name="is_expiry_tracked" checked={form.is_expiry_tracked} onChange={handleChange} />
              {" "}Expiry Tracked
            </label>
            <label>
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
              {" "}Active
            </label>
          </div>

          {/* Actions */}
          <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
            <button type="submit" style={styles.button}>
              {isEditing ? "Update Product" : "Create Product"}
            </button>
            {isEditing && (
              <button type="button" style={styles.cancelBtn} onClick={cancelEdit}>
                Cancel Update
              </button>
            )}
          </div>

        </form>

        {/* Table */}
        <h3 style={{ marginTop: "40px" }}>Products List</h3>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead style={styles.tableHead}>
              <tr>
                <th style={styles.th}>Product ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Barcode</th>
                <th style={styles.th}>Unit</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>ABC</th>
                <th style={styles.th}>Storage Type</th>
                <th style={styles.th}>Box ID</th>
                <th style={styles.th}>Units/Box</th>
                <th style={styles.th}>Wt(kg)</th>
                <th style={styles.th}>Vol(CBM)</th>
                <th style={styles.th}>Min Stock</th>
                <th style={styles.th}>Unit Cost</th>
                <th style={styles.th}>Expiry</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.products_id} style={styles.row}>
                  <td style={styles.td}>{p.products_id}</td>
                  <td style={styles.td}>{p.name}</td>
                  <td style={styles.td}>{p.barcode}</td>
                  <td style={styles.td}>{p.unit}</td>
                  <td style={styles.td}>{p.product_type}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, background: p.abc_class === "A" ? "#16a34a" : p.abc_class === "B" ? "#d97706" : p.abc_class === "C" ? "#dc2626" : "#9ca3af" }}>
                      {p.abc_class || "—"}
                    </span>
                  </td>
                  <td style={styles.td}>{p.storage_type || "—"}</td>
                  <td style={styles.td}>{p.box_id || "—"}</td>
                  <td style={styles.td}>{p.units_per_box ?? "—"}</td>
                  <td style={styles.td}>{p.unit_weight_kg ?? "—"}</td>
                  <td style={styles.td}>{p.material_volume_cbm ?? "—"}</td>
                  <td style={styles.td}>{p.minimum_stock}</td>
                  <td style={styles.td}>₹ {p.Unit_cost}</td>
                  <td style={styles.td}>{p.is_expiry_tracked ? "Yes" : "No"}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, background: p.is_active ? "#16a34a" : "#dc2626" }}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={styles.td}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}</td>
                  <td style={styles.td}>
                    <button style={styles.updateBtn} onClick={() => handleEdit(p)}>Update</button>
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

const styles = {
  form: {
    background: "white",
    padding: "25px",
    borderRadius: "8px",
    marginTop: "20px",
  },
  sectionTitle: {
    fontWeight: "600",
    fontSize: "14px",
    color: "#5b5bd6",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "2px solid #e0e7ff",
    paddingBottom: "6px",
    marginBottom: "14px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: "18px",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    fontWeight: "500",
    fontSize: "13px",
  },
  required: { color: "#dc2626" },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  checkboxGroup: {
    marginTop: "20px",
    display: "flex",
    gap: "30px",
  },
  button: {
    padding: "10px 22px",
    background: "#0e0bd3",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },
  cancelBtn: {
    padding: "10px 22px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },
  updateBtn: {
    padding: "6px 12px",
    background: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  badge: {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "12px",
    fontWeight: "600",
  },
  tableWrapper: {
    overflowX: "auto",
    marginTop: "15px",
    background: "#fff",
    borderRadius: "8px",
    border: "1px solid #ddd",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "1600px",
  },
  tableHead: {
    background: "linear-gradient(90deg,#5b5bd6,#4a44d4)",
    color: "#fff",
  },
  th: {
    padding: "12px",
    textAlign: "left",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #eee",
    whiteSpace: "nowrap",
  },
  row: { transition: "0.2s" },
};