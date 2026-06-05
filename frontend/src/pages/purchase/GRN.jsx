import { useState, useEffect, useRef } from "react";
import PageHeader from "../../components/PageHeader";
import TopTabNav from "../../components/TopTabNav";
import { format } from "date-fns";
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

  if (role === "DISPATCH MANAGER") {
    return [{ label: "GRN", path: "/purchase/grn" }];
  }

  if (role === "ADMIN" || role === "PURCHASE MANAGER") {
    return [
      { label: "PO List", path: "/purchase/po-list" },
      { label: "GRN", path: "/purchase/grn" },
      { label: "PutAway", path: "/purchase/put-away" },
    ];
  }

  return [];
};



export default function GRN() {

  const tabs = getRoleTabs();

  const [form, setForm] = useState({
    po_id: "",
    gate_entry_no: "",
    warehouses_id: "",
    dock_location_id: "",
    vendor_invoice_no: "",
    vendor_invoice_date: "",
    invoice_amount: "",
    eway_bill_number: "",
    vehicle_number: "",
  });

  const [itemForm, setItemForm] = useState({
    grn_id: ""
  });
  const [inspectionProducts, setInspectionProducts] = useState([]);
  const [poLines, setPoLines] = useState([]); // product lines for selected GRN

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minExpiryDate = tomorrow.toISOString().split("T")[0];

  const [poList, setPoList] = useState([]);
  const [warehouseList, setWarehouseList] = useState([]);
  const [dockLocations, setDockLocations] = useState([]);
  const [grnList, setGrnList] = useState([]);
  const [grnItemList, setGrnItemList] = useState([]);

  const [grnDropdown, setGrnDropdown] = useState([]);
  const [showExpiry, setShowExpiry] = useState(true);
  const [showEwayError, setShowEwayError] = useState(false);
  const [showInvoiceError, setShowInvoiceError] = useState("");
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const invoicePreviewRef = useRef(null);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), 'dd-MMM-yyyy hh:mm a');
    } catch {
      return new Date(dateStr).toLocaleString();
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), 'dd-MMM-yyyy');
    } catch {
      return new Date(dateStr).toLocaleDateString();
    }
  };

  const [showVehicleError, setShowVehicleError] = useState(false);
  const requestIdRef = useRef(crypto.randomUUID());


  useEffect(() => {
    fetchDropdownData();
    fetchGRN();
    fetchGRNItems();
    fetchItemDropdowns();
    fetchNextGateEntry();
  }, []);

  const fetchNextGateEntry = async () => {
    try {
      const res = await fetch("https://underwear-locks-latinas-anonymous.trycloudflare.com/next-gate-entry", {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.next_gate_entry) {
        setForm(prev => ({ ...prev, gate_entry_no: data.next_gate_entry }));
      }
    } catch (error) {
      console.error("Error fetching next gate entry:", error);
    }
  };

  const fetchWarehouses = async (poId) => {
    if (!poId) return;
    const res = await fetch(`https://underwear-locks-latinas-anonymous.trycloudflare.com/warehouse-dropdown/${poId}`, {
      headers: getAuthHeaders()
    });
    // Auto logout if session expired
      if (res.status === 401) {

        localStorage.clear();

        window.location.href = "/";

        return;
      }
    const data = await res.json();
    const list = data || [];
    setWarehouseList(list);
    if (list.length === 1) {
      setForm(prev => ({ ...prev, warehouses_id: list[0], dock_location_id: "" }));
      fetchDocks(list[0]);
    }
  };

  const fetchDocks = async (warehouseId) => {
    if (!warehouseId) return;
    const res = await fetch(`https://underwear-locks-latinas-anonymous.trycloudflare.com/dock-location-dropdown/${warehouseId}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    const list = data || [];
    setDockLocations(list);
    if (list.length === 1) {
      setForm(prev => ({ ...prev, dock_location_id: list[0] }));
    }
  };

  const fetchDropdownData = async () => {
    const res = await fetch("https://underwear-locks-latinas-anonymous.trycloudflare.com/goods-receipts-dropdown", {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    const pos = data.po_ids || [];
    setPoList(pos);
    if (pos.length === 1) {
      setForm(prev => ({ ...prev, po_id: pos[0], warehouses_id: "" }));
      fetchWarehouses(pos[0]);
    }
  };

  const fetchGRN = async () => {
    try {

      const res = await fetch(
        "https://underwear-locks-latinas-anonymous.trycloudflare.com/goods-receipts-read",
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
      setGrnList(data || []);

    }
    catch (error) {

      console.error(error);

      alert("Failed to load goods receipts");
    }
  };

  const fetchGRNItems = async () => {
    try {

      const res = await fetch(
        "https://underwear-locks-latinas-anonymous.trycloudflare.com/grn-items-read",
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
      setGrnItemList(data || []);
    }
    catch (error) {

      console.error(error);

      alert("Failed to load Material Insepction");
    }
  };

  const fetchItemDropdowns = async () => {
    const res = await fetch("https://underwear-locks-latinas-anonymous.trycloudflare.com/grn-dropdown", {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    setGrnDropdown(data || []);
  };

  const handleChange = async (e) => {

    const { name, value } = e.target;

    if (name === "po_id") {
      setForm(prev => ({
        ...prev,
        po_id: value,
        warehouses_id: "",
        dock_location_id: ""
      }));
      setWarehouseList([]);
      setDockLocations([]);

      if (value) {
        fetchWarehouses(value);
      }
      return;
    }

    if (name === "warehouses_id") {
      setForm(prev => ({
        ...prev,
        warehouses_id: value,
        dock_location_id: ""
      }));
      setDockLocations([]);

      if (value) {
        fetchDocks(value);
      }
      return;
    }

    if (name === "eway_bill_number") {
      const digitsOnly = value.replace(/\D/g, "");
      if (digitsOnly.length <= 16) {
        setForm(prev => ({ ...prev, [name]: digitsOnly }));
        setShowEwayError(false);
      }
      return;
    }

    if (name === "vendor_invoice_no") {
      const sanitized = value.replace(/[^a-zA-Z0-9\-\/]/g, "").toUpperCase();
      if (sanitized.length <= 16) {
        setForm(prev => ({ ...prev, [name]: sanitized }));
        setShowInvoiceError("");
      }
      return;
    }

    if (name === "vehicle_number") {
      const sanitized = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (sanitized.length <= 10) {
        setForm(prev => ({ ...prev, [name]: sanitized }));
        setShowVehicleError(false);
      }
      return;
    }

    if (name === "invoice_amount") {
      // Prevent negative values
      if (parseFloat(value) < 0) return;
      setForm(prev => ({ ...prev, [name]: value }));
      return;
    }

    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = async (e) => {
    const { name, value } = e.target;

    if (name === "grn_id") {
      setItemForm({ grn_id: value });
      setInspectionProducts([]);
      setPoLines([]);

      if (value) {
        try {
          const res = await fetch(`https://underwear-locks-latinas-anonymous.trycloudflare.com/check-expiry/${value}`, {
            headers: getAuthHeaders()
          });
          const data = await res.json();
          if (data.lines && data.lines.length > 0) {
            setPoLines(data.lines);
            
            // Map lines to inspection forms
            setInspectionProducts(data.lines.map(l => ({
              product_id: l.product_id,
              product_name: l.product_name,
              is_expiry_tracked: l.is_expiry_tracked,
              expiry_date: "",
              received_qty: l.ordered_qty || "",
              accepted_qty: "",
              rejected_qty: "",
              rejection_reason: "null"
            })));
          }
        } catch (err) {
          console.error("Error fetching GRN lines:", err);
        }
      }
      return;
    }
  };

  const handleProductChange = (index, field, value) => {
    const updated = [...inspectionProducts];
    const product = updated[index];
    
    product[field] = value;

    if (field === "accepted_qty") {
      const received = Number(product.received_qty);
      const accepted = Number(value);

      if (!isNaN(received) && !isNaN(accepted)) {
        if (accepted > received) {
          alert("Accepted quantity cannot be greater than Received quantity");
          return;
        }
        if (accepted < 0) {
          alert("Quantity cannot be negative");
          return;
        }
        product.rejected_qty = received - accepted;

        if (product.rejected_qty === 0) {
          product.rejection_reason = "null";
        } else if (product.rejection_reason === "null") {
          product.rejection_reason = "";
        }
      }
    }

    if (field === "received_qty" && Number(value) < 0) {
      alert("Quantity cannot be negative");
      return;
    }

    setInspectionProducts(updated);
  };

  const handleSubmit = async () => {

    const {
      po_id, gate_entry_no, warehouses_id, dock_location_id,
      vendor_invoice_no, vendor_invoice_date, invoice_amount,
      eway_bill_number, vehicle_number
    } = form;

    if (!po_id || !gate_entry_no || !warehouses_id || !dock_location_id ||
      !vendor_invoice_no || !vendor_invoice_date || !invoice_amount ||
      !eway_bill_number || !vehicle_number) {
      alert("All fields are required");
      return;
    }

    if (eway_bill_number.length !== 16) {
      setShowEwayError(true);
      alert("check eway bill number: Strictly 16 digits required");
      return;
    }

    const duplicate = grnList.find(g => g.vendor_invoice_no === vendor_invoice_no);
    if (duplicate) {
      setShowInvoiceError("This Vendor Invoice No already exists in another GRN");
      alert("Vendor Invoice No must be unique. This number already exists.");
      return;
    }

    const vehicleRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/;
    if (!vehicleRegex.test(vehicle_number)) {
      setShowVehicleError(true);
      alert("check the vehicle number: Format must be AA99AA9999 (e.g., MH12AB1234)");
      return;
    }

    const response = await fetch("https://underwear-locks-latinas-anonymous.trycloudflare.com/goods-receipts-create", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...form,
        gate_entry: gate_entry_no,
        dock_location: dock_location_id,
        request_id: requestIdRef.current,
        invoice_amount: Math.abs(parseFloat(invoice_amount))
      })
    });

    // Auto logout if session expired
      if (response.status === 401) {

        localStorage.clear();

        window.location.href = "/";

        return;
      }

    const data = await response.json();

    if (response.ok) {
      alert(data.message);
      fetchGRN();
      fetchItemDropdowns();
      setForm({
        po_id: "",
        gate_entry_no: "",
        warehouses_id: "",
        dock_location_id: "",
        vendor_invoice_no: "",
        vendor_invoice_date: "",
        invoice_amount: "",
        eway_bill_number: "",
        vehicle_number: ""
      });
      setShowEwayError(false);
      setShowInvoiceError("");
      setShowVehicleError(false);
      fetchNextGateEntry();
      requestIdRef.current = crypto.randomUUID();

    } else {
      alert(data.detail);
    }
  };

  const handleItemSubmit = async () => {
    if (!itemForm.grn_id) {
      alert("Please select a GRN first");
      return;
    }

    if (inspectionProducts.length === 0) {
      alert("No products found for this GRN");
      return;
    }

    for (const p of inspectionProducts) {
      if (!p.received_qty || p.accepted_qty === "" || p.rejection_reason === "") {
        alert(`All fields required for product ${p.product_name}`);
        return;
      }
      if (p.is_expiry_tracked && !p.expiry_date) {
        alert(`Expiry date required for product ${p.product_name}`);
        return;
      }
      if (p.is_expiry_tracked) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(p.expiry_date);
        if (selectedDate <= today) {
          alert(`Expiry date must be in the future for product ${p.product_name}`);
          return;
        }
      }

      const received = Number(p.received_qty);
      const accepted = Number(p.accepted_qty);
      const rejected = Number(p.rejected_qty);

      if (received <= 0) {
        alert(`Received qty must be > 0 for ${p.product_name}`);
        return;
      }
      if (accepted < 0 || rejected < 0) {
        alert(`Quantities cannot be negative for ${p.product_name}`);
        return;
      }
      if (accepted > received) {
        alert(`Accepted qty cannot exceed Received qty for ${p.product_name}`);
        return;
      }
      if (received !== accepted + rejected) {
        alert(`Received must equal Accepted + Rejected for ${p.product_name}`);
        return;
      }
    }

    const payload = {
      request_id: requestIdRef.current,
      grn_id: itemForm.grn_id,
      products: inspectionProducts.map(p => ({
        product_id: p.product_id,
        expiry_date: p.is_expiry_tracked ? p.expiry_date : null,
        received_qty: Number(p.received_qty),
        accepted_qty: Number(p.accepted_qty),
        rejected_qty: Number(p.rejected_qty),
        rejection_reason: p.rejection_reason
      }))
    };

    const response = await fetch("https://underwear-locks-latinas-anonymous.trycloudflare.com/grn-items-create-bulk", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    // Auto logout if session expired
      if (response.status === 401) {

        localStorage.clear();

        window.location.href = "/";

        return;
      }

    const data = await response.json();

    if (response.ok) {
      alert(data.message);
      fetchGRNItems();
      fetchGRN();
      setGrnDropdown(prev => prev.filter(g => g !== itemForm.grn_id));     // refresh GRN table (status update)
      requestIdRef.current = crypto.randomUUID();

      setItemForm({ grn_id: "" });
      setInspectionProducts([]);
      setPoLines([]);
    } else {
      alert(data.detail);
    }
  };

  return (

    <div className="fade-in">

      <PageHeader title="Goods Receipt Note (GRN)" breadcrumbs={["Purchase", "GRN"]} />
      <TopTabNav tabs={tabs} />

      <div className="page-content">

        {/* ── CREATE GRN ── */}
        <div className="form-card">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
  <h2 style={{ margin: 0, fontSize: "16px", color: "#333" }}>Create GRN</h2>
  <div
    style={{ position: "relative", display: "inline-block" }}
    onMouseEnter={e => e.currentTarget.querySelector(".tooltip").style.display = "block"}
    onMouseLeave={e => e.currentTarget.querySelector(".tooltip").style.display = "none"}
    onClick={() => window.location.href = "/help?section=grn"}
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
      Click to view GRN help
    </div>
  </div>
</div>

          <div className="form-grid">

            {/* Row 1 */}
            <div className="form-group">
              <label>Purchase Order</label>
              <select name="po_id" value={form.po_id} onChange={handleChange}>
                <option value="">Select PO</option>
                {poList?.map((po, i) => (<option key={i} value={po}>{po}</option>))}
              </select>
            </div>

            <div className="form-group">
              <label>Warehouse</label>
              <select name="warehouses_id" value={form.warehouses_id} onChange={handleChange}>
                <option value="">Select Warehouse</option>
                {warehouseList?.map((wh, i) => (<option key={i} value={wh}>{wh}</option>))}
              </select>
            </div>

            {/* Row 2 */}
            <div className="form-group">
              <label>Dock Location</label>
              <select name="dock_location_id" value={form.dock_location_id} onChange={handleChange}>
                <option value="">Select Dock</option>
                {dockLocations?.map((loc, i) => (
                  <option key={i} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Vendor Invoice No<span style={{ color: "red" }}>*</span></label>
              <input
                name="vendor_invoice_no"
                value={form.vendor_invoice_no}
                onChange={handleChange}
                style={{ borderColor: showInvoiceError ? "red" : "#ddd" }}
              />
              {showInvoiceError && (
                <small style={{ color: "red", marginTop: "4px" }}>{showInvoiceError}</small>
              )}
            </div>

            {/* Row 3 */}
            <div className="form-group">
              <label>Vendor Invoice Date</label>
              <input
                type="date"
                name="vendor_invoice_date"
                value={form.vendor_invoice_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Invoice Amount</label>
              <input
                type="number"
                name="invoice_amount"
                value={form.invoice_amount}
                onChange={handleChange}
                min="0"
                placeholder="Enter invoice amount"
                onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
              />
            </div>

            {/* Row 4 */}
            <div className="form-group">
              <label>Eway Bill<span style={{ color: "red" }}>*</span></label>
              <input
                name="eway_bill_number"
                value={form.eway_bill_number}
                onChange={handleChange}
                placeholder="Enter 16 digit e-way bill"
                style={{
                  borderColor: showEwayError && form.eway_bill_number.length !== 16 ? "red" : "#ddd"
                }}
              />
              {showEwayError && form.eway_bill_number.length !== 16 && (
                <small style={{ color: "red", marginTop: "4px" }}>
                  check eway bill number (Must be 16 digits)
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Vehicle Number <span style={{ color: "red" }}>*</span></label>
              <input
                name="vehicle_number"
                value={form.vehicle_number}
                onChange={handleChange}
                placeholder="e.g. MH12AB1234"
                style={{ borderColor: showVehicleError ? "red" : "#ddd" }}
              />
              {showVehicleError && (
                <small style={{ color: "red", marginTop: "4px" }}>
                  check the vehicle number (Format: MH12AB1234)
                </small>
              )}
            </div>

          </div>

          <button className="primary-btn" onClick={handleSubmit}>Create GRN</button>
        </div>

        {/* ── GRN TABLE ── */}
        <div className="table-card">
          <h2>GRN List</h2>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>GRN ID</th>
                  <th>PO</th>
                  <th>Gate Entry No</th>
                  <th>Warehouse</th>
                  <th>Dock Location</th>
                  <th>Receipt Date</th>
                  <th>Status</th>
                  <th>Invoice No</th>
                  <th>Invoice Date</th>
                  <th>Amount</th>
                  <th>Eway Bill</th>
                  <th>Vehicle No</th>
                </tr>
              </thead>

              <tbody>
                {grnList?.map((g, i) => (
                  <tr key={i}>
                    <td>{g.grn_id}</td>
                    <td>{g.po_id}</td>
                    <td>{g.gate_entry}</td>
                    <td>{g.warehouses_id}</td>
                    <td>{g.dock_location_id}</td>
                    <td>{formatDate(g.receipt_date)}</td>
                    <td>{g.status}</td>
                    <td>{g.vendor_invoice_no}</td>
                    <td>{formatDate(g.vendor_invoice_date)}</td>
                    <td>₹{Math.abs(parseFloat(g.invoice_amount || 0)).toLocaleString('en-IN')}</td>
                    <td>{g.eway_bill_number}</td>
                    <td>
                      {g.vehicle_number
                        ? g.vehicle_number.toUpperCase().slice(0, 4) + ' ' + g.vehicle_number.toUpperCase().slice(4)
                        : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── CREATE GRN ITEM ── */}
        <div className="form-card">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
  <h2 style={{ margin: 0, fontSize: "16px", color: "#333" }}>Material Inspection</h2>
  <div
    style={{ position: "relative", display: "inline-block" }}
    onMouseEnter={e => e.currentTarget.querySelector(".tooltip").style.display = "block"}
    onMouseLeave={e => e.currentTarget.querySelector(".tooltip").style.display = "none"}
    onClick={() => window.location.href = "/help?section=grn"}
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
      Click to view Material Inspection help
    </div>
  </div>
</div>

          <div className="form-grid">

            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>GRN</label>
              <select name="grn_id" value={itemForm.grn_id} onChange={handleItemChange}>
                <option value="">Select GRN</option>
                {grnDropdown?.map((g, i) => (<option key={i} value={g}>{g}</option>))}
              </select>
            </div>

            {/* Bulk Products Table */}
            {inspectionProducts.length > 0 && (
              <div className="table-wrapper" style={{ gridColumn: "1 / -1", marginTop: "20px" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Expiry</th>
                      <th>Received (From PO)</th>
                      <th>Accepted</th>
                      <th>Rejected</th>
                      <th>Rejection Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectionProducts.map((p, i) => (
                      <tr key={p.product_id}>
                        <td style={{ fontWeight: 500, color: "#334155" }}>{p.product_name}</td>
                        <td>
                          {p.is_expiry_tracked ? (
                            <input
                              type="date"
                              value={p.expiry_date}
                              min={minExpiryDate}
                              onChange={(e) => handleProductChange(i, "expiry_date", e.target.value)}
                              className="insp-input"
                            />
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "13px", fontStyle: "italic" }}>No Expiry</span>
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            value={p.received_qty}
                            onChange={(e) => handleProductChange(i, "received_qty", e.target.value)}
                            readOnly
                            className="insp-input insp-input--readonly"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={p.accepted_qty}
                            onChange={(e) => handleProductChange(i, "accepted_qty", e.target.value)}
                            className="insp-input"
                            placeholder="0"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={p.rejected_qty}
                            readOnly
                            className="insp-input insp-input--readonly insp-input--rejected"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={p.rejection_reason === "null" ? "" : p.rejection_reason}
                            onChange={(e) => handleProductChange(i, "rejection_reason", e.target.value)}
                            placeholder="Reason if rejected"
                            className="insp-input insp-input--reason"
                            disabled={Number(p.rejected_qty) === 0}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <button className="primary-btn" onClick={handleItemSubmit} disabled={inspectionProducts.length === 0}>
            Submit Inspection
          </button>
        </div>

        {/* ── GRN ITEM TABLE ── */}
        <div className="table-card">
          <h2>Material Inspection List</h2>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>GRN</th>
                  <th>Product</th>
                  <th>Batch</th>
                  <th>Expiry</th>
                  <th>Received</th>
                  <th>Accepted</th>
                  <th>Rejected</th>
                  <th>Location</th>
                </tr>
              </thead>

              <tbody>
                {grnItemList?.map((item, i) => (
                  <tr key={i}>
                    <td>{item.grn_item_id}</td>
                    <td>{item.grn_id}</td>
                    <td>{item.product_id}</td>
                    <td>{item.batch_no}</td>
                    <td>{formatDate(item.expiry_date)}</td>
                    <td>{item.received_qty}</td>
                    <td>{item.accepted_qty}</td>
                    <td>{item.rejected_qty}</td>
                    <td>{item.location_id || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <style>{`

        .page-content {
          padding: 20px;
        }

        .form-card {
          background: white;
          padding: 25px;
          border-radius: 10px;
          margin-bottom: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        }

        .form-card h2 {
          margin-top: 0;
          margin-bottom: 20px;
          font-size: 16px;
          color: #333;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: #555;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 10px;
          border-radius: 6px;
          border: 1px solid #ddd;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #6c5ce7;
        }

        .form-group input[readOnly] {
          background: #f3f4f6;
          cursor: not-allowed;
          color: #888;
        }

        /* Remove number input arrows */
        .form-group input[type="number"]::-webkit-inner-spin-button,
        .form-group input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .form-group input[type="number"] {
          -moz-appearance: textfield;
        }

        /* ── Material Inspection Table Inputs ── */
        .insp-input {
          display: block;
          width: 90px;
          padding: 7px 10px;
          border: 1.5px solid #e2e8f0;
          border-radius: 7px;
          font-size: 13px;
          color: #1e293b;
          background: #ffffff;
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s;
          box-sizing: border-box;
          -moz-appearance: textfield;
        }
        .insp-input::-webkit-inner-spin-button,
        .insp-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .insp-input:focus {
          border-color: #6c5ce7;
          box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.12);
        }
        .insp-input--readonly {
          background: #f8fafc;
          cursor: not-allowed;
          color: #64748b;
          border-color: #e2e8f0;
        }
        .insp-input--readonly:focus {
          border-color: #e2e8f0;
          box-shadow: none;
        }
        .insp-input--rejected {
          color: #dc2626;
          font-weight: 600;
        }
        .insp-input--reason {
          width: 180px;
        }
        .insp-input--reason:disabled {
          background: #f1f5f9;
          cursor: not-allowed;
          color: #94a3b8;
          border-color: #e2e8f0;
        }
        input[type="date"].insp-input {
          width: 140px;
        }


        .primary-btn {
          margin-top: 20px;
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 6px;
          background: linear-gradient(90deg, #5a4bff, #6c5ce7);
          color: white;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .primary-btn:hover {
          opacity: 0.9;
        }

        .table-card {
          background: white;
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        }

        .table-card h2 {
          margin-top: 0;
          margin-bottom: 16px;
          font-size: 16px;
          color: #333;
        }

        .table-container {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }

        th, td {
          padding: 12px;
          border-bottom: 1px solid #eee;
          text-align: left;
          font-size: 13px;
          white-space: nowrap;
        }

        th {
          background: #f3f4f6;
          font-weight: 600;
          color: #444;
        }

        tbody tr:hover {
          background: #fafafa;
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          table {
            min-width: 600px;
          }
        }

      `}</style>

    </div>
  );
}