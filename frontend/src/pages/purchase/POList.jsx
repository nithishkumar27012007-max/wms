import { useState, useEffect, useRef } from "react";
import PageHeader from "../../components/PageHeader";
import TopTabNav from "../../components/TopTabNav";
import { format } from "date-fns";
import { getAuthHeaders } from "../../utils/authHeaders";

const tabs = [
  { label: "PO List", path: "/purchase/po-list" },
  { label: "GRN", path: "/purchase/grn" },
  { label: "PutAway", path: "/purchase/put-away" },
];

export default function POList() {
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [poList, setPoList] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [modalPO, setModalPO] = useState(null);
  const [isRechecked, setIsRechecked] = useState(false);
  const requestIdRef = useRef(crypto.randomUUID());

  const [form, setForm] = useState({ vendor_id: "" });
  const [lines, setLines] = useState([{ product_id: "", ordered_qty: "" }]);

  const openDetailsModal = (po) => {
    setModalPO(po);
    setDetailsModalOpen(true);
  };

  const fetchProductsDropdown = async () => {
    try {
      const res = await fetch("http://localhost:8000/products-dropdown");
      if (res.ok) setProducts(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVendorsDropdown = async () => {
    try {
      const res = await fetch("http://localhost:8000/vendors-dropdown");
      if (res.ok) setVendors(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const loadPurchaseOrders = async () => {
    try {
      const res = await fetch("http://localhost:8000/purchase-order-read", {
        headers: getAuthHeaders()
      });
      if (res.status === 401) {
        localStorage.clear();
        window.location.href = "/";
        return;
      }
      const data = await res.json();
      setPoList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setPoList([]);
    }
  };

  useEffect(() => {
    fetchProductsDropdown();
    fetchVendorsDropdown();
    loadPurchaseOrders();
  }, []);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setIsRechecked(false);
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...lines];
    if (field === "ordered_qty" && value !== "") {
      const numValue = parseFloat(value);
      if (numValue < 0) value = 0;
    }
    newLines[index][field] = value;
    setLines(newLines);
    setIsRechecked(false);
  };

  const handleAddLine = () => {
    setLines([...lines, { product_id: "", ordered_qty: "" }]);
    setIsRechecked(false);
  };
  const handleRemoveLine = (idx) => {
    setLines(lines.filter((_, i) => i !== idx));
    setIsRechecked(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (lines.length === 0) {
      alert("Please add at least one line item");
      return;
    }
    for (let l of lines) {
      if (!l.product_id || !l.ordered_qty || parseFloat(l.ordered_qty) <= 0) {
        alert("All lines must have a product and quantity > 0");
        return;
      }
    }

    const payload = {
      vendor_id: form.vendor_id,
      request_id: requestIdRef.current,
      lines: lines.map(l => ({ product_id: l.product_id, ordered_qty: parseFloat(l.ordered_qty) }))
    };

    try {
      const res = await fetch("http://localhost:8000/purchase-order-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload),
      });

      // Auto logout if session expired
      if (res.status === 401) {

        localStorage.clear();

        window.location.href = "/";

        return;
      }

      const data = await res.json();
      if (res.ok) {
        alert("Purchase Order Created");
        resetForm();
        loadPurchaseOrders();
        requestIdRef.current = crypto.randomUUID();
      } else {
        alert(data.detail || "Error creating PO");
      }
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const cancelPO = async (po_id = null) => {
    const id = po_id || selectedPO?.purchase_order_id;
    if (!id) return alert("No PO selected");

    if (!window.confirm("Are you sure cancel this order?")) return;

    try {
      const payload = {
        request_id : crypto.randomUUID()
      }
      const res = await fetch(`http://localhost:8000/purchase-order-cancel/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type":"application/json",
          ...getAuthHeaders()
        },
        body:JSON.stringify(payload)
      });

      // Auto logout if session expired
      if (res.status === 401) {

        localStorage.clear();

        window.location.href = "/";

        return;
      }

      if (res.ok) {
        alert("Purchase Order Cancelled");
        resetForm();
        loadPurchaseOrders();
      } else {
        const data = await res.json();
        alert(data.detail || "Error cancelling PO");
      }
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const handleRecheck = async (po_id) => {
    try {
      const res = await fetch(`http://localhost:8000/purchase-order-recheck/${po_id}`, {
        headers: getAuthHeaders()
      });

      // Auto logout if session expired
      if (res.status === 401) {

        localStorage.clear();

        window.location.href = "/";

        return;
      }

      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data)) {
          const linesSummary = data.map(item => 
            `Product: ${item.product_id}\n- Current Qty: ${item.old_qty}\n- Recalculated Qty: ${item.updated_qty}\n- Difference: ${item.difference} (${item.status})`
          ).join('\n\n');
          alert(`Recheck Results for PO ${po_id}:\n\n${linesSummary}`);
        } else {
          alert(`Recheck Results:\nProduct ID: ${data.product_id}\nOld Qty: ${data.old_qty}\nNew Qty: ${data.updated_qty}\nDifference: ${data.difference}\nStatus: ${data.status}`);
        }
        setIsRechecked(true);
      } else {
        alert(data.detail || "Error rechecking PO");
      }
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const cancelAutoPO = async (po_id) => {
    if (!window.confirm("Are you sure you want to cancel this auto-created PO?")) return;

    try {
      const res = await fetch(`http://localhost:8000/purchase-order-auto-cancel/${po_id}`, {
        method: "PUT",
        headers: getAuthHeaders()
      });

      // Auto logout if session expired
      if (res.status === 401) {

        localStorage.clear();

        window.location.href = "/";

        return;
      }

      const data = await res.json();
      if (res.ok) {
        alert("Auto PO Cancelled Successfully");
        loadPurchaseOrders();
      } else {
        alert(data.detail || "Error cancelling Auto PO");
      }
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const loadPOForEditing = (po) => {
    setSelectedPO(po);
    setEditMode(true);
    setForm({ vendor_id: po.vendor_id || "" });
    setLines(po.lines ? po.lines.map(l => ({ product_id: l.product_id, ordered_qty: l.ordered_qty })) : [{ product_id: "", ordered_qty: "" }]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFormAction = async (actionType) => {
    const po_id = selectedPO?.purchase_order_id;
    if (!po_id) return;

    if (actionType === "recheck") {
      await handleRecheck(po_id);
      return;
    }

    if (actionType === "auto-cancel") {
      await cancelAutoPO(po_id);
      resetForm();
      return;
    }

    if (!form.vendor_id) {
      alert("Please select a vendor");
      return;
    }
    if (lines.length === 0) {
      alert("Please add at least one line item");
      return;
    }
    for (let l of lines) {
      if (!l.product_id || !l.ordered_qty || parseFloat(l.ordered_qty) <= 0) {
        alert("All lines must have a product and quantity > 0");
        return;
      }
    }

    // ADD THIS BLOCK HERE
    const productIds = lines.map(l => l.product_id);

    const hasDuplicates = productIds.some(
      (id, index) => productIds.indexOf(id) !== index
    );

    const actionText = actionType === "approve" ? "Approve" : "Hold";
    if (!window.confirm(`Are you sure you want to update and ${actionText} this PO?`)) return;

    try {
      // 1. Save vendor/line changes
      const updatePayload = {
        vendor_id: form.vendor_id,
        lines: lines.map(l => ({ product_id: l.product_id, ordered_qty: parseFloat(l.ordered_qty) }))
      };
      
      const updateRes = await fetch(`http://localhost:8000/purchase-order-update/${po_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify(updatePayload)
      });

      // Auto logout if session expired
      if (res.status === 401) {

        localStorage.clear();

        window.location.href = "/";

        return;
      }
      
      const updateData = await updateRes.json();
      if (!updateRes.ok) {
        alert(updateData.detail || "Error saving PO updates");
        return;
      }

      // 2. Trigger Action
      const actionRes = await fetch(`http://localhost:8000/purchase-order-${actionType}/${po_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ vendor_id: form.vendor_id })
      });

      // Auto logout if session expired
      if (res.status === 401) {

        localStorage.clear();

        window.location.href = "/";

        return;
      }
      
      const actionData = await actionRes.json();
      if (actionRes.ok) {
        alert(`Purchase Order ${actionText === "Approve" ? "Approved Successfully" : "Moved to HOLD"}`);
        resetForm();
        loadPurchaseOrders();
      } else {
        alert(actionData.detail || `Error performing ${actionText}`);
      }

    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const resetForm = () => {
    setEditMode(false);
    setSelectedPO(null);
    setIsRechecked(false);
    setForm({ vendor_id: "" });
    setLines([{ product_id: "", ordered_qty: "" }]);
  };

  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") return "—";
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    if (num < 0) return "—";
    return value;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "";
    try {
      return format(new Date(dateStr), 'dd-MMM-yyyy hh:mm a');
    } catch {
      return new Date(dateStr).toLocaleString();
    }
  };

  return (
    <div className="fade-in">
      <PageHeader title="Purchase Order List" breadcrumbs={["Purchase", "PO List"]} />
      <TopTabNav tabs={tabs} />

      <div className="page-content">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
  <h3 className="form-title" style={{ margin: 0 }}>Create Purchase Order</h3>
 <div
    style={{ position: "relative", display: "inline-block" }}
    onMouseEnter={e => e.currentTarget.querySelector(".tooltip").style.display = "block"}
    onMouseLeave={e => e.currentTarget.querySelector(".tooltip").style.display = "none"}
    onClick={() => window.location.href = "/help?section=purchase-order"}
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
      Click to view Purchase Order help
    </div>
  </div>
</div>
        <form onSubmit={!editMode ? handleSubmit : (e) => e.preventDefault()} className="form-grid">
          <div className="form-group">
            <label>Vendor</label>
            <select name="vendor_id" value={form.vendor_id} onChange={handleFormChange} required disabled={editMode && selectedPO?.status !== "Auto-Created"}>
              <option value="">Select Vendor</option>
              {vendors.map((v) => (
                <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name || v.vendor_id}</option>
              ))}
            </select>
          </div>
          
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ fontWeight: 600, fontSize: "14px", marginBottom: "8px", display: "block" }}>Order Lines</label>
            {lines.map((line, idx) => (
              <div key={idx} style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
                <select 
                  value={line.product_id} 
                  onChange={(e) => handleLineChange(idx, "product_id", e.target.value)} 
                  required
                  style={{ flex: 2, padding: "8px", borderRadius: "6px", border: "1px solid #ddd" }}
                >
                  <option value="">Select Product</option>
                  {products.map(p => {const alreadySelected = lines.some((line, i) =>line.product_id === p.products_id && i !== idx);
                  return (<option key={p.products_id}value={p.products_id}disabled={alreadySelected} >{p.name || p.products_id}</option>);})}
                </select>
                <input 
                  type="number" 
                  value={line.ordered_qty} 
                  onChange={(e) => handleLineChange(idx, "ordered_qty", e.target.value)} 
                  required min="0" step="1" 
                  placeholder="Qty"
                  style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #ddd" }}
                />
                {lines.length > 1 && (
                  <button type="button" className="btn-danger" onClick={() => handleRemoveLine(idx)}>X</button>
                )}
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={handleAddLine} style={{ marginTop: "5px" }}>+ Add Line</button>
          </div>

          <div className="form-button">
            {!editMode ? (
              <button type="submit" className="btn-primary">Create Purchase Order</button>
            ) : (
              <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "10px" }}>
                {selectedPO?.status === "Auto-Created" ? (
                  <>
                    <button 
                      type="button" 
                      style={{ 
                        flex: 1,
                        background: "#10b981", 
                        color: "white", 
                        padding: "8px 16px", 
                        height: "38px", 
                        borderRadius: "6px", 
                        border: "none", 
                        fontWeight: "600", 
                        fontSize: "14px", 
                        cursor: "pointer" 
                      }} 
                      onClick={() => handleFormAction("recheck")}
                    >
                      🔄 Recheck
                    </button>
                    <button 
                      type="button" 
                      disabled={!isRechecked}
                      style={{ 
                        flex: 1,
                        background: isRechecked ? "#4f46e5" : "#a5b4fc", 
                        color: "white", 
                        padding: "8px 16px", 
                        height: "38px", 
                        borderRadius: "6px", 
                        border: "none", 
                        fontWeight: "600", 
                        fontSize: "14px", 
                        cursor: isRechecked ? "pointer" : "not-allowed" 
                      }}
                      onClick={() => handleFormAction("approve")}
                    >
                      ✔️ Approve PO {!isRechecked && "(Recheck)"}
                    </button>
                    <button 
                      type="button" 
                      style={{ 
                        flex: 1,
                        background: "#f59e0b", 
                        color: "white", 
                        padding: "8px 16px", 
                        height: "38px", 
                        borderRadius: "6px", 
                        border: "none", 
                        fontWeight: "600", 
                        fontSize: "14px", 
                        cursor: "pointer" 
                      }} 
                      onClick={() => handleFormAction("hold")}
                    >
                      ⏸️ Put on Hold
                    </button>
                    <button 
                      type="button" 
                      style={{ 
                        flex: 1,
                        background: "#ef4444", 
                        color: "white", 
                        padding: "8px 16px", 
                        height: "38px", 
                        borderRadius: "6px", 
                        border: "none", 
                        fontWeight: "600", 
                        fontSize: "14px", 
                        cursor: "pointer" 
                      }} 
                      onClick={() => handleFormAction("auto-cancel")}
                    >
                      🚫 Cancel PO
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn-primary" onClick={resetForm} style={{ flex: 1 }}>Save PO</button>
                )}
              </div>
            )}
          </div>
        </form>

        <h3 className="table-title">Purchase Orders</h3>
        <div className="table-container">
          <table className="po-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>PO ID</th>
                <th>Vendor Name</th>
                <th>Status</th>
                <th>Expected date</th>
                <th>Created At</th>
                <th>Vendor Acknowledged</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {poList.map((po, index) => (
                <tr key={po.purchase_order_id}>
                  <td>{index + 1}</td>
                  <td>{po.purchase_order_id}</td>
                  <td>{po.vendor_name || po.vendor_id}</td>
                  <td><span className={`badge ${po.status?.toLowerCase() || ''}`}>{po.status}</span></td>
                  <td>{po.expected_date}</td>
                  <td>{formatDateTime(po.created_at)}</td>
                  <td>{po.viewed_at ? formatDateTime(po.viewed_at) : <span style={{ color: "#888", fontStyle: "italic" }}>Not Viewed</span>}</td>
                  <td style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: "12px", flex: "none" }} onClick={() => openDetailsModal(po)}>
                      👁️ View Details
                    </button>
                    {po.status === "Approved" && po.vendor_status !== 'COMPLETED' && (
                      <button className="btn-cancel" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={() => cancelPO(po.purchase_order_id)}>
                        Cancel
                      </button>
                    )}
                    {po.status === "Auto-Created" && (
                      <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: "12px", background: "#4f46e5", color: "white" }} onClick={() => loadPOForEditing(po)}>
                        ✏️ Update
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {detailsModalOpen && modalPO && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ width: "600px", maxWidth: "95%" }}>
              <h3 style={{ marginTop: 0, borderBottom: "1px solid #ddd", paddingBottom: "10px" }}>
                PO Details: {modalPO.purchase_order_id}
              </h3>
              <div className="modal-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <p><strong>Vendor Name:</strong> {modalPO.vendor_name || modalPO.vendor_id}</p>
                <p><strong>Status:</strong> {modalPO.status}</p>
                <p><strong>Total Cost:</strong> {formatValue(modalPO.total_cost)}</p>
                <p><strong>Order Date:</strong> {modalPO.order_date}</p>
                <p><strong>Created By:</strong> {modalPO.created_by}</p>
                <p><strong>Created At:</strong> {formatDateTime(modalPO.created_at)}</p>
              </div>
              <div style={{ marginTop: "15px", borderTop: "1px solid #eee", paddingTop: "15px" }}>
                <h4 style={{ margin: "0 0 10px 0" }}>Order Lines</h4>
                <table className="po-table" style={{ width: "100%", fontSize: "13px" }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Ordered</th>
                      <th>Received</th>
                      <th>Unit Cost</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(modalPO.lines || []).map((l, i) => (
                      <tr key={i}>
                        <td>{l.product_name || l.product_id}</td>
                        <td>{formatValue(l.ordered_qty)}</td>
                        <td>{formatValue(l.received_qty)}</td>
                        <td>{formatValue(l.unit_cost)}</td>
                        <td>{l.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ textAlign: "right", marginTop: "20px" }}>
                <button className="btn-primary" onClick={() => setDetailsModalOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
        
      </div>

      <style>{`
        .page-content{ background:#ffffff; padding:25px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.05); margin-top:20px; }
        .form-title{ margin-bottom:20px; font-size:18px; font-weight:600; }
        .form-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:20px; }
        .form-group{ display:flex; flex-direction:column; }
        .form-group label{ font-size:14px; font-weight:600; margin-bottom:6px; }
        .form-group input, .form-group select{ padding:10px; border:1px solid #ddd; border-radius:6px; font-size:14px; }
        .form-button{ grid-column:span 2; }
        .btn-primary{ padding:6px 12px; background:#4f46e5; color:white; border:none; border-radius:6px; font-weight:600; cursor:pointer; }
        .btn-primary:hover { background: #4338ca; }
        .btn-secondary { padding: 8px 16px; background: #555a63; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
        .btn-secondary:hover { background: #4b5563; }
        .btn-danger { padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
        .btn-danger:hover { background: #dc2626; }
        .btn-cancel{ background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; }
        .table-title{ margin-top:40px; margin-bottom:15px; font-size:18px; font-weight:600; }
        .table-container{ overflow-x:auto; }
        .po-table{ width:100%; border-collapse:collapse; font-size:14px; }
        .po-table th{ background:#f3f4f6; padding:10px; text-align:left; border-bottom:1px solid #ddd; }
        .po-table td{ padding:10px; border-bottom:1px solid #eee; }
        .cancelled-badge{ background:#fee2e2; color:#b91c1c; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600; }
        .received-badge{ background:#28a745; color:white; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:600; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
        .modal-grid { display: grid; gap: 12px; margin-top: 15px; }
        .modal-grid p { margin: 0; font-size: 14px; color: #333; }
        .modal-grid strong { color: #555; display: inline-block; width: 120px; }
        @media (max-width:768px){ .form-grid{grid-template-columns:1fr;} .form-button{grid-column:span 1;} }
      `}</style>
    </div>
  );
}
