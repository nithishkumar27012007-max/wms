import { useEffect, useState } from "react";
import PageHeader from '../../components/PageHeader';
import TopTabNav from '../../components/TopTabNav';
import { format } from "date-fns";
import { jwtDecode } from "jwt-decode";
import { getAuthHeaders } from "../../utils/authHeaders";

const API = "https://underwear-locks-latinas-anonymous.trycloudflare.com";

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
      { label: 'Sales Orders', path: '/orders/sales-orders' },
      { label: 'Pick Tasks', path: '/orders/pick-tasks' },
      { label: 'Package', path: '/orders/package' },
    ];
  }

  return [];
};

export default function PickTasks() {

  const tabs = getRoleTabs();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // MODAL STATES
  const [showModal, setShowModal] = useState(false);
  const [lines, setLines] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedPicking, setSelectedPicking] = useState(null);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), 'dd-MMM-yyyy hh:mm a');
    } catch {
      return new Date(dateStr).toLocaleString();
    }
  };

  // ===========================
  // Fetch Header Tasks
  // ===========================
  const fetchTasks = () => {
  setLoading(true);

  fetch(`${API}/pick-task-header-read`, {
    headers: getAuthHeaders()
  })
    .then(res => {

      // Auto logout if token expired
      if (res.status === 401) {
        localStorage.clear();
        window.location.href = "/";
        return null;
      }

      return res.json();
    })
    .then(data => {

      // stop if redirected
      if (!data) return;

      setTasks(data);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
};

  useEffect(() => {
    fetchTasks();
  }, []);

  // =========================================================
  // OPEN MODAL
  // =========================================================
  const handleView = async (picking_id) => {

    setSelectedPicking(picking_id);
    setLines([]);

    try {
      const res1 = await fetch(
        `${API}/pick-task-lines-read?picking_id=${picking_id}`,
        {
          headers: getAuthHeaders()
        }
      );

      // Auto logout if token expired
      if (res1.status === 401) {
        localStorage.clear();
        window.location.href = "/";
        return null;
      }

      const data1 = await res1.json();

      const res2 = await fetch(`${API}/pack-location-dropdown`, {
        headers: getAuthHeaders()
      });
      const data2 = await res2.json();

      if (!res1.ok) {
        alert(data1.detail || "Failed to load pick lines");
        return;
      }

      const linesData = Array.isArray(data1) ? data1 : [];
      const zonesData = Array.isArray(data2) ? data2 : [];

      if (zonesData.length === 1) {
        linesData.forEach(line => {
          if (!line.packing_zone) {
            line.packing_zone = zonesData[0];
          }
        });
      }

      setLines(linesData);
      setZones(zonesData);
      setShowModal(true);

    } catch (err) {
      console.error(err);
      alert("Error loading data");
    }
  };

  // =========================================================
  // UPDATE LINE VALUES
  // =========================================================
  const updateLine = (index, field, value) => {

    const updated = [...lines];

    updated[index][field] = value;

    setLines(updated);
  };

  return (
    <div className="fade-in">

      <PageHeader
        title="Pick Task Summary"
        breadcrumbs={['Orders', 'PickTasks']}
      />

      <TopTabNav tabs={tabs} />

      {/* ADDED: Main Page Heading */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: 0, marginBottom: "20px" }}>
  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 500 }}>Pick Task</h3>
  <div
    style={{ position: "relative", display: "inline-block" }}
    onMouseEnter={e => e.currentTarget.querySelector(".tooltip").style.display = "block"}
    onMouseLeave={e => e.currentTarget.querySelector(".tooltip").style.display = "none"}
    onClick={() => window.location.href = "/help?section=picking"}
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
      fontWeight: "400",
    }}>
      View and complete pick task lines — assign packing zones and confirm picked quantities.
    </div>
  </div>
</div>

      <div className="page-content">

        <div
          style={{
            marginBottom: "12px",
            fontSize: "14px",
            color: "#64748b"
          }}
        >
          Total Tasks: {tasks.length}
        </div>

        {/* ================================================= */}
        {/* HEADER TABLE */}
        {/* ================================================= */}

        <div className="table-wrapper">

          <table className="table">

            <thead>
              <tr>
                <th>Picking ID</th>
                <th>Order</th>
                <th>Required Qty</th>
                <th>Picked Qty</th>
                <th>Status</th>
                <th>Completed</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (

                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "20px" }}>
                    Loading...
                  </td>
                </tr>

              ) : tasks.length === 0 ? (

                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "20px" }}>
                    No Pick Tasks Found
                  </td>
                </tr>

              ) : (

                tasks.map((t) => (

                  <tr key={t.picking_id}>

                    <td>{t.picking_id}</td>
                    <td>{t.order_id}</td>
                    <td>{t.total_required_qty}</td>
                    <td>{t.total_picked_qty}</td>

                    <td>
                      <span className={`status ${t.status}`}>
                        {t.status}
                      </span>
                    </td>

                    <td>{formatDateTime(t.completed_at)}</td>
                    <td>{formatDateTime(t.created_at)}</td>

                    <td>
                      <button
                        className="btn"
                        onClick={() => handleView(t.picking_id)}
                      >
                        View
                      </button>
                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* ================================================= */}
      {/* MODAL */}
      {/* ================================================= */}

      {showModal && (

        <div className="modal-overlay">

          <div className="modal large">

            <div className="modal-header">
              <h3>Pick Task Lines (ID: {selectedPicking})</h3>
            </div>

            {/* SCROLLABLE TABLE AREA */}
            <div className="modal-table-scroll">

              <table className="table">

                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Batch</th>
                    <th>Location</th>
                    <th>Required</th>
                    <th>Picked</th>
                    <th>Packing Zone</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {lines.map((l, i) => (

                    <tr key={l.line_id}>

                      <td>{l.product_id}</td>

                      <td>{l.batch_id}</td>

                      <td>{l.location_id}</td>

                      <td>{l.required_qty}</td>

                      {/* PICKED QTY */}
                      <td>

                        {l.status === "Completed" ? (

                          <span>{l.picked_qty}</span>

                        ) : (

                          <input
                            type="number"
                            value={l.picked_qty}
                            min="0"
                            max={l.required_qty}
                            onChange={(e) =>
                              updateLine(
                                i,
                                "picked_qty",
                                Number(e.target.value)
                              )
                            }
                          />

                        )}

                      </td>

                      {/* PACKING ZONE */}
                      <td>

                        {l.status === "Completed" ? (

                          <span>{l.packing_zone}</span>

                        ) : (

                          <select
                            value={l.packing_zone || ""}
                            onChange={(e) =>
                              updateLine(
                                i,
                                "packing_zone",
                                e.target.value
                              )
                            }
                          >
                            <option value="">Select Zone</option>
                            {zones.map(z => (
                              <option
                                key={z}
                                value={z}
                              >
                                {z}
                              </option>
                            ))}
                          </select>

                        )}

                      </td>

                      {/* STATUS */}
                      <td>

                        <span className={`status ${l.status}`}>
                          {l.status}
                        </span>

                      </td>

                      {/* ACTION */}
                      <td>

                        {l.status === "Completed" ? (

                          <span
                            style={{
                              color: "#10b981",
                              fontWeight: "bold"
                            }}
                          >
                            Done
                          </span>

                        ) : (

                          <button
                            className="btn-success"
                            onClick={async () => {

                              const line = l;

                              if (!line.packing_zone) {
                                alert("Select packing zone");
                                return;
                              }

                              if (
                                !line.picked_qty ||
                                line.picked_qty < 0
                              ) {
                                alert("Enter valid picked qty");
                                return;
                              }

                              try {

                                const res = await fetch(
                                  `${API}/pick-task-line-complete/${line.line_id}`,
                                  {
                                    method: "PUT",
                                    headers: {
                                      "Content-Type": "application/json",
                                      ...getAuthHeaders() 
                                    },
                                    body: JSON.stringify({
                                      picked_qty: line.picked_qty,
                                      packing_zone: line.packing_zone
                                    })
                                  }
                                );

                                // Auto logout if token expired
                                if (res.status === 401) {
                                  localStorage.clear();
                                  window.location.href = "/";
                                  return null;
                                }

                                const data = await res.json();

                                if (!res.ok) {
                                  alert(data.detail);
                                  return;
                                }

                                alert("Updated successfully");

                                handleView(selectedPicking);

                              } catch (err) {

                                console.error(err);

                                alert("Server error");

                              }

                            }}
                          >
                            Complete
                          </button>

                        )}

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

            {/* FOOTER */}
            <div className="modal-actions">

              <button
                className="btn-warning"
                onClick={() => {
                  setShowModal(false);
                  fetchTasks();
                }}
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

      {/* ================================================= */}
      {/* CSS */}
      {/* ================================================= */}

      <style>{`

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .table {
          min-width: 1000px;
          width: 100%;
          border-collapse: collapse;
          background: #fff;
        }

        .table th,
        .table td {
          padding: 12px;
          border-bottom: 1px solid #eee;
          white-space: nowrap;
          text-align: left;
        }

        .table th {
          background: #f8fafc;
          font-weight: 600;
        }

        .status {
          padding: 6px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .status.Pending {
          background: #fef3c7;
          color: #92400e;
        }

        .status.Completed {
          background: #dcfce7;
          color: #166534;
        }

        .status.Short_Picked {
          background: #fee2e2;
          color: #991b1b;
        }

        .btn {
          background: #3b82f6;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
        }

        .btn-success {
          background: #10b981;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
        }

        .btn-warning {
          background: #f59e0b;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
        }

        /* ================================================= */
        /* MODAL */
        /* ================================================= */

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal.large {

          width: 90%;
          max-width: 1100px;

          max-height: 85vh;

          background: white;

          border-radius: 10px;

          padding: 20px;

          display: flex;
          flex-direction: column;

          overflow: hidden;
        }

        .modal-header {
          margin-bottom: 12px;
        }

        /* ================================================= */
        /* SCROLLABLE AREA */
        /* ================================================= */

        .modal-table-scroll {

          overflow-y: auto;
          overflow-x: auto;

          max-height: 60vh;

          border: 1px solid #e5e7eb;

          border-radius: 8px;

        }

        /* SCROLLBAR */

        .modal-table-scroll::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        .modal-table-scroll::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }

        .modal-table-scroll::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border-radius: 10px;
        }

        .modal-table-scroll::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }

        .modal input,
        .modal select {
          width: 100%;
          min-width: 90px;
          padding: 6px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
        }

        .modal-actions {
          margin-top: 15px;
          display: flex;
          justify-content: flex-end;
        }

      `}</style>

    </div>
  );
}