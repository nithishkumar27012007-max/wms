import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader";
import TopTabNav from "../../components/TopTabNav";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { format } from "date-fns";
import { getAuthHeaders } from "../../utils/authHeaders";

const API = "https://expand-best-therapist-surgeon.trycloudflare.com";

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

  if (
    role === "ADMIN" ||
    role === "INVENTORY MANAGER" ||
    role === "SALES MANAGER"
  ) {
    return [
      { label: "Sales Orders", path: "/orders/sales-orders" },
      { label: "Pick Tasks", path: "/orders/pick-tasks" },
      { label: "Package", path: "/orders/package" },
    ];
  }

  return [];
};

export default function Package() {
  const tabs = getRoleTabs();

  const [packages, setPackages] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [boxes, setBoxes] = useState([]);
  const [locations, setLocations] = useState({});

  const [selectedPackage, setSelectedPackage] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderStatus, setOrderStatus] = useState("");
  const [dispatching, setDispatching] = useState(false);

  const formatDateTime = (dateStr) => {
    if (!dateStr || dateStr === "None") return "-";
    try {
      return format(new Date(dateStr), 'dd-MMM-yyyy hh:mm a');
    } catch {
      return new Date(dateStr).toLocaleString();
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await axios.get(`${API}/api/packages`,
        {
          headers: getAuthHeaders()
        }
      );

      // Auto logout if token expired
      if (res.status === 401) {
        localStorage.clear();
        window.location.href = "/";
        return null;
      }

      setPackages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {

      if (err.response?.status === 401) {
        localStorage.clear();
        window.location.href = "/";
        return;
      }

      alert("Failed to load packages");
    }
  };

    // ===========================
  // VIEW DETAILS
  // ===========================
  // ===========================
// VIEW DETAILS
// ===========================
const handleViewDetails = async (pkg) => {
  try {

    // ✅ Clear reserved data
    await axios.post(
      `${API}/api/clear-dispatch-reserved`,
      {},
      {
        headers: getAuthHeaders()
      }
    );

    // ✅ Fetch box details
    const res = await axios.get(
      `${API}/api/packages/${pkg.package_id}/boxes`,
      {
        headers: getAuthHeaders()
      }
    );

    const data = Array.isArray(res.data) ? res.data : [];

    setBoxes(
      data.map((b) => ({
        ...b,
        dispatch_type: b.dispatch_type || "",
        location_id: b.location_id || "",
        locked: pkg.status === "PACKED",
      }))
    );

    setSelectedPackage(pkg.package_id);
    setSelectedOrderId(pkg.order_id);
    setOrderStatus(pkg.status);
    setShowModal(true);

  } catch (err) {

    // ✅ Handle token expiry
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = "/";
      return;
    }

    alert("Failed to load box details");
  }
};

// ===========================
// DISPATCH CHANGE
// ===========================
const handleDispatchChange = async (index, value) => {

  if (orderStatus === "PACKED") return;

  const updated = [...boxes];

  if (updated[index].locked) return;

  updated[index].dispatch_type = value;
  updated[index].location_id = "";

  setBoxes(updated);

  const zone =
    value === "Direct Dispatch"
      ? "Dock"
      : "Dispatch";

  const volume = updated[index].volume || 0;

  try {

    const res = await axios.get(
      `${API}/api/locations`,
      {
        params: {
          zone_type: zone,
          required_volume: volume
        },
        headers: getAuthHeaders()
      }
    );

    setLocations((prev) => ({
      ...prev,
      [index]: Array.isArray(res.data)
        ? res.data
        : [],
    }));

  } catch (err) {

    // ✅ Token expired handling
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = "/";
      return;
    }

    console.error(err);
  }
};

  // ===========================
  // LOCATION CHANGE
  // ===========================
  // ===========================
// LOCATION CHANGE
// ===========================
const handleLocationChange = async (index, value) => {

  if (orderStatus === "PACKED") return;

  const updated = [...boxes];
  const box = updated[index];

  if (box.locked) return;

  const isStorage =
    box.dispatch_type === "Store Location";

  try {

    // ===========================
    // RELEASE OLD LOCATION
    // ===========================
    if (
      box.dispatch_type === "Store Location" &&
      box.location_id &&
      box.volume > 0
    ) {

      await axios.post(
        `${API}/api/release-location`,
        {
          location_id: box.location_id,
          volume: box.volume,
        },
        {
          headers: getAuthHeaders()
        }
      );
    }

    // ===========================
    // RESERVE NEW LOCATION
    // ===========================
    if (isStorage) {

      await axios.post(
        `${API}/api/reserve-location`,
        {
          location_id: value,
          volume: box.volume,
        },
        {
          headers: getAuthHeaders()
        }
      );
    }

    updated[index].location_id = value;
    updated[index].locked = true;

    setBoxes(updated);

  } catch (err) {

    // ✅ Token expired
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = "/";
      return;
    }

    alert(
      err.response?.data?.detail ||
      "Operation failed"
    );
  }
};

  // ===========================
// CLOSE
// ===========================
const handleClose = async () => {

  try {

    if (orderStatus !== "PACKED") {

      for (let b of boxes) {

        if (
          b.dispatch_type === "Store Location" &&
          b.location_id &&
          b.volume > 0
        ) {

          await axios.post(
            `${API}/api/release-location`,
            {
              location_id: b.location_id,
              volume: b.volume,
            },
            {
              headers: getAuthHeaders()
            }
          );
        }
      }
    }

  } catch (err) {

    // ✅ Token expired
    if (err.response?.status === 401) {

      localStorage.clear();
      window.location.href = "/";
      return;
    }

    console.error(err);
  }

  setBoxes([]);
  setLocations({});
  setShowModal(false);
};

  // ===========================
  // COMPLETE
  // ===========================
  // ===========================
// COMPLETE
// ===========================
const handleComplete = async () => {

  if (orderStatus === "PACKED") return;

  try {

    // ===========================
    // VALIDATION
    // ===========================
    for (let b of boxes) {

      if (!b.dispatch_type || !b.location_id) {

        alert(`Fill all fields (Box ${b.box_no})`);
        return;
      }
    }

    setDispatching(true);

    // ===========================
    // UPDATE BOX LOCATIONS
    // ===========================
    for (let box of boxes) {

      await axios.put(
        `${API}/api/package-box/${box.id}/location`,
        {
          dispatch_type: box.dispatch_type,
          location_id: box.location_id,
        },
        {
          headers: getAuthHeaders()
        }
      );
    }

    // ===========================
    // COMPLETE DISPATCH
    // ===========================
    await axios.post(
      `${API}/dispatch/${selectedOrderId}`,
      {},
      {
        headers: getAuthHeaders()
      }
    );

    alert("Package Completed");

    setShowModal(false);

    fetchPackages();

  } catch (err) {

    // ✅ Token expired
    if (err.response?.status === 401) {

      localStorage.clear();

      window.location.href = "/";

      return;
    }

    alert(
      err.response?.data?.detail ||
      "Complete failed"
    );

  } finally {

    setDispatching(false);
  }
};

  return (
    <div className="package-container">

      {/* ================= STYLES ================= */}
      <style>{`
        .package-container { padding: 20px; }

        .card {
          background: #fff;
          padding: 16px;
          border-radius: 10px;
          margin-top: 15px;
          box-shadow: 0 3px 10px rgba(0,0,0,0.08);
        }

        .title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .styled-table {
          width: 100%;
          border-collapse: collapse;
        }

        .styled-table thead {
          background: linear-gradient(90deg, #2563eb, #1e40af);
          color: white;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .styled-table th, .styled-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          text-align: left;
        }

        .styled-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }

        .styled-table tbody tr:hover {
          background: #e6f0ff;
        }

        select {
          padding: 6px;
          border-radius: 6px;
          border: 1px solid #ccc;
          width: 100%;
        }

        select:disabled {
          background: #e5e7eb;
          cursor: not-allowed;
        }

        .details-btn {
          background: #1598d4;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
        }

        .details-btn:hover {
          background: #0f7fb5;
        }

        .dispatch-btn {
          margin-top: 12px;
          background: #16a34a;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
        }

        .dispatch-btn:disabled {
          background: gray;
          cursor: not-allowed;
        }

        .close-btn {
          margin-top: 12px;
          background: #ef4444;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          padding: 20px;
          border-radius: 12px;
          width: 95%;
          max-width: 1100px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .modal h3 {
          margin-top: 0;
          margin-bottom: 14px;
          flex-shrink: 0;
        }

        .modal-footer {
          flex-shrink: 0;
          padding-top: 4px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .table-scroll-wrapper {
          overflow-y: auto;
          flex: 1;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .table-scroll-wrapper::-webkit-scrollbar {
          width: 7px;
        }

        .table-scroll-wrapper::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }

        .table-scroll-wrapper::-webkit-scrollbar-thumb {
          background: #2563eb;
          border-radius: 10px;
        }

        .table-scroll-wrapper::-webkit-scrollbar-thumb:hover {
          background: #1e40af;
        }
      `}</style>

      <PageHeader title="Packages" breadcrumbs={["Orders", "Package"]} />
      <TopTabNav tabs={tabs} />

      {/* TABLE */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
  <div className="title" style={{ margin: 0 }}>📦 Package List</div>
  <div
    style={{ position: "relative", display: "inline-block" }}
    onMouseEnter={e => e.currentTarget.querySelector(".tooltip").style.display = "block"}
    onMouseLeave={e => e.currentTarget.querySelector(".tooltip").style.display = "none"}
    onClick={() => window.location.href = "/help?section=packing"}
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
      View packed orders — assign dispatch type and location per box.
    </div>
  </div>
</div>

        <table className="styled-table">
          <thead>
            <tr>
              <th>Package ID</th>
              <th>Order ID</th>
              <th>Total Boxes</th>
              <th>Total Qty</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {packages.map((pkg, i) => (
              <tr key={i}>
                <td>{pkg.package_id}</td>
                <td>{pkg.order_id}</td>
                <td>{pkg.total_boxes}</td>
                <td>{pkg.total_qty}</td>
                <td>{pkg.status}</td>
                <td>{formatDateTime(pkg.created_at)}</td>
                <td>
                  <button
                    className="details-btn"
                    onClick={() => handleViewDetails(pkg)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>📦 Package: {selectedPackage}</h3>
            <div className="table-scroll-wrapper">
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>Box</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Volume</th>
                    <th>Dispatch</th>
                    <th>Location</th>
                  </tr>
                </thead>

                <tbody>
                  {boxes.map((b, i) => (
                    <tr key={i}>
                      <td>{b.box_no}</td>
                      <td>{b.product_name || b.product_id}</td>
                      <td>{b.qty}</td>
                      <td>{b.volume}</td>

                      <td>
                        {orderStatus === "PACKED" ? (
                          b.dispatch_type
                        ) : (
                          <select
                            disabled={b.locked}
                            value={b.dispatch_type}
                            onChange={(e) =>
                              handleDispatchChange(i, e.target.value)
                            }
                          >
                            <option value="">Select</option>
                            <option value="Direct Dispatch">Direct</option>
                            <option value="Store Location">Storage</option>
                          </select>
                        )}
                      </td>

                      <td>
                        {orderStatus === "PACKED" ? (
                          b.location_id
                        ) : (
                          <select
                            disabled={b.locked}
                            value={b.location_id}
                            onChange={(e) =>
                              handleLocationChange(i, e.target.value)
                            }
                          >
                            <option value="">Select</option>
                            {(locations[i] || []).map((loc, idx) => (
                              <option key={idx} value={loc.location_id}>
                                {loc.location_id}
                                {loc.available_volume !== undefined
                                  ? ` (Free: ${loc.available_volume})`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              {orderStatus !== "PACKED" && (
                <button
                  className="dispatch-btn"
                  onClick={handleComplete}
                  disabled={dispatching}
                >
                  {dispatching ? "Completing..." : "Complete"}
                </button>
              )}
              <button
              className="close-btn"
              onClick={handleClose}> 
                Close
              </button>
           </div>
        </div>
    </div>
   )}
    </div>
  );
}