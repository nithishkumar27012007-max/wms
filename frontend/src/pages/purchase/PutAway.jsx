import { useState, useEffect, useRef } from "react";
import PageHeader from "../../components/PageHeader";
import TopTabNav from "../../components/TopTabNav";
import { jwtDecode } from "jwt-decode";
import { getAuthHeaders } from "../../utils/authHeaders";

import { format } from "date-fns";

const getRoleTabs = () => {
    const token = localStorage.getItem("token");
    let role = null;

    if (token) {
        try {
            const decoded = jwtDecode(token);
            role = decoded.role?.toUpperCase();
        } catch { }
    }

    if (role === "ADMIN" || role === "PURCHASE MANAGER") {
        return [
            { label: "PO List", path: "/purchase/po-list" },
            { label: "GRN", path: "/purchase/grn" },
            { label: "Putaway", path: "/purchase/put-away" },
        ];
    }

    return [];
};

export default function PutAway() {
    const tabs = getRoleTabs();

    const [tasks, setTasks] = useState([]);
    const [activeTask, setActiveTask] = useState(null);
    const [qtyMap, setQtyMap] = useState({});
    const [locMap, setLocMap] = useState({});
    const [locations, setLocations] = useState({});
    const [loading, setLoading] = useState(false);
    const requestIdRef = useRef(crypto.randomUUID());

    useEffect(() => {
        fetchTasks();
    }, []);

    const formatDateTime = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), 'dd-MMM-yyyy hh:mm a');
        } catch {
            return new Date(dateStr).toLocaleString();
        }
    };

    const fetchTasks = async () => {
        try {

            const res = await fetch(
                "https://underwear-locks-latinas-anonymous.trycloudflare.com/putaway-read",
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
            setTasks(data);
        }
        catch (error) {

            console.error(error);

            alert("Failed to load Put Away");
        }
    };

    const loadLocations = async (task_id) => {
        const res = await fetch(`https://underwear-locks-latinas-anonymous.trycloudflare.com/putaway-locations/${task_id}`);
        const data = await res.json();

        if (!res.ok) {
            console.error("API ERROR:", data.detail);
            setLocations(prev => ({
                ...prev,
                [task_id]: []
            }));
            return;
        }

        setLocations(prev => ({
            ...prev,
            [task_id]: data
        }));
    };

    const getSelectedFitQty = (task_id) => {
        const selectedLoc = locMap[task_id];
        const locList = locations[task_id] || [];
        const found = locList.find(l => l.location_id === selectedLoc);
        return found ? found.fit_qty : 0;
    };

    // ✅ NEW: get remaining qty for specific product in GRN
    const getRemainingQty = (grn, task) => {
        const p = grn.products[task.product_id];
        return p ? p.total_qty - p.placed_qty : 0;
    };

    // ✅ NEW: check last pending task for that product
    const isLastTask = (grn, task) => {
        const pendingTasks = grn.tasks.filter(t => t.product_id === task.product_id && t.status !== "COMPLETED");
        return pendingTasks.length === 1 && pendingTasks[0].task_id === task.task_id;
    };

    const handleUseMax = async (task, grn) => {
        const selectedLoc = locMap[task.task_id];

        if (!selectedLoc) {
            alert("Please select location first");
            return;
        }

        try {
            const res = await fetch(`https://underwear-locks-latinas-anonymous.trycloudflare.com/putaway-max-qty/${task.task_id}`);
            const data = await res.json();

            const locationMax = getSelectedFitQty(task.task_id);
            const remaining = getRemainingQty(grn, task);

            const finalQty = Math.min(data.pending_qty, locationMax, remaining);

            setQtyMap(prev => ({
                ...prev,
                [task.task_id]: finalQty
            }));

        } catch (err) {
            console.error(err);
        }
    };

    const handleConfirm = async (task) => {
        const location = locMap[task.task_id];
        const qty = qtyMap[task.task_id];

        if (!location || !qty) {
            alert("Please fill all fields");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(
                `https://underwear-locks-latinas-anonymous.trycloudflare.com/putaway-confirm/${task.task_id}`,
                {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        location_id: location,
                        quantity: qty,
                        request_id: requestIdRef.current
                    })
                }
            );

            // Auto logout if session expired
            if (res.status === 401) {

                localStorage.clear();

                window.location.href = "/";

                return;
            }

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail);

            alert("✅ Putaway Completed");

            fetchTasks();
            setActiveTask(null);
            requestIdRef.current = crypto.randomUUID();

            setQtyMap(prev => ({ ...prev, [task.task_id]: "" }));
            setLocMap(prev => ({ ...prev, [task.task_id]: "" }));

        } catch (err) {
            alert(err.message);
        }

        setLoading(false);
    };

    const groupByGRN = (tasks) => {
        const grouped = {};

        tasks.forEach(task => {
            if (!grouped[task.grn_id]) {
                grouped[task.grn_id] = {
                    grn_id: task.grn_id,
                    tasks: [],
                    products: {}
                };
            }

            const grn = grouped[task.grn_id];

            if (!grn.products[task.product_id]) {
                grn.products[task.product_id] = {
                    product_id: task.product_id,
                    total_qty: 0,
                    placed_qty: 0
                };
            }

            grn.tasks.push(task);
            grn.products[task.product_id].total_qty += task.suggested_quantity;
            grn.products[task.product_id].placed_qty += (task.actual_quantity || 0);
        });

        return Object.values(grouped);
    };

    const groupedData = groupByGRN(tasks);

    return (
        <div className="fade-in">
            <PageHeader title="PutAway" breadcrumbs={["Purchase", "PutAway"]} />
            <TopTabNav tabs={tabs} />

            {/* ADDED: Main Page Heading */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: 0, marginBottom: "20px", paddingLeft: "20px" }}>
  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 500 }}>PutAway</h3>
  <div
    style={{ position: "relative", display: "inline-block" }}
    onMouseEnter={e => e.currentTarget.querySelector(".tooltip").style.display = "block"}
    onMouseLeave={e => e.currentTarget.querySelector(".tooltip").style.display = "none"}
    onClick={() => window.location.href = "/help?section=putaway"}
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
      Click to view PutAway help
    </div>
  </div>
</div>

            <div style={{ padding: 20 }}>
                {groupedData.map(grn => {

                    return (
                        <div key={grn.grn_id} style={styles.grnContainer}>

                            {/* 🔹 HEADER */}
                            <div style={styles.grnHeader}>
                                <div>
                                    <b style={{ fontSize: "16px" }}>{grn.grn_id}</b>
                                    <div style={{ ...styles.subText, display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "4px" }}>
                                        {Object.values(grn.products).map(p => {
                                            const pct = p.total_qty > 0 ? Math.round((p.placed_qty / p.total_qty) * 100) : 0;
                                            return (
                                                <span key={p.product_id} style={{ background: "#f8fafc", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                                                    <b>{p.product_id}</b>: {p.placed_qty} / {p.total_qty} ({pct}%)
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* 🔹 BODY (TASKS INSIDE) */}
                            <div style={styles.grnBody}>
                                {grn.tasks.map(task => {

                                    const lastTask = isLastTask(grn, task);
                                    const remainingQty = getRemainingQty(grn, task);

                                    return (
                                        <div key={task.task_id} style={styles.taskCard}>

                                            <div style={styles.rowTop}>
                                                <div>
                                                    <b>{task.task_id}</b>
                                                    <div style={{ fontSize: 12, color: "#1e40af", fontWeight: "600", marginTop: "2px" }}>
                                                        {task.product_id}
                                                    </div>
                                                </div>

                                                <div>
                                                    <div style={styles.label}>
                                                        {task.status === "COMPLETED" ? "Actual Qty" : "Suggested Qty"}
                                                    </div>

                                                    {task.status === "COMPLETED"
                                                        ? task.actual_quantity
                                                        : task.suggested_quantity}
                                                </div>

                                                <div>
                                                    <div style={styles.label}>
                                                        {task.status === "COMPLETED" ? "Actual Location" : "Suggested Location"}
                                                    </div>

                                                    {task.status === "COMPLETED"
                                                        ? task.actual_location
                                                        : task.suggested_location}
                                                </div>

                                                <div>
                                                    <div style={styles.label}>Batch</div>
                                                    {task.batch_no}
                                                </div>

                                                <div>
                                                    <div style={styles.label}>Status</div>
                                                    <span style={{
                                                        color: task.status === "COMPLETED"
                                                            ? "#10b981"
                                                            : task.status === "CANCELLED"
                                                                ? "#ef4444"
                                                                : "#f59e0b"
                                                    }}>
                                                        {task.status}
                                                    </span>
                                                </div>

                                                {task.status === "COMPLETED" || task.status === "CANCELLED" ? (
                                                    <div style={{ textAlign: "right" }}>
                                                        <div style={styles.label}>
                                                            {task.status === "COMPLETED" ? "Completed At" : "Cancelled At"}
                                                        </div>

                                                        <div style={{ fontSize: 12, color: "#64748b" }}>
                                                            {formatDateTime(task.completed_at)}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        style={styles.openBtn}
                                                        onClick={() => {
                                                            const isOpen = activeTask === task.task_id;
                                                            setActiveTask(isOpen ? null : task.task_id);

                                                            if (!isOpen) {
                                                                loadLocations(task.task_id);
                                                            }
                                                        }}
                                                    >
                                                        Open Task
                                                    </button>
                                                )}
                                            </div>

                                            {/* 🔹 EXPAND BOX */}
                                            {activeTask === task.task_id && (
                                                <div style={styles.expandBox}>

                                                    <div style={styles.expandTitle}>
                                                        Confirm actual location — {task.task_id}
                                                    </div>

                                                    <label>Actual Location</label>
                                                    <select
                                                        style={styles.input}
                                                        value={locMap[task.task_id] || ""}
                                                        onChange={(e) => {
                                                            const value = e.target.value;

                                                            setLocMap({
                                                                ...locMap,
                                                                [task.task_id]: value
                                                            });

                                                            setQtyMap({
                                                                ...qtyMap,
                                                                [task.task_id]: lastTask ? remainingQty : ""
                                                            });
                                                        }}
                                                    >
                                                        <option value="">Select Location</option>

                                                        {/* 🔥 Suggested Location FIRST */}
                                                        {(() => {
                                                            const locList = locations[task.task_id] || [];

                                                            const suggested = locList.find(
                                                                l => l.location_id === task.suggested_location
                                                            );

                                                            if (!suggested) return null; // ❌ don't show if not available

                                                            return (
                                                                <option
                                                                    key={`suggested-${suggested.location_id}`}
                                                                    value={suggested.location_id}
                                                                    style={{ backgroundColor: "#e5e7eb", fontWeight: "bold" }}
                                                                >
                                                                    ⭐ {suggested.location_id} | {suggested.level} | fits {suggested.fit_qty}
                                                                </option>
                                                            );
                                                        })()}

                                                        {/* 🔥 Other Locations */}
                                                        {(locations[task.task_id] || [])
                                                            .filter(loc => loc.location_id !== task.suggested_location)
                                                            .map(loc => (
                                                                <option key={loc.location_id} value={loc.location_id}>
                                                                    {loc.location_id}
                                                                    {loc.zone_type !== "Temp" && ` | ${loc.level}`}
                                                                    {loc.zone_type !== "Temp" && ` | fits ${loc.fit_qty}`}
                                                                </option>
                                                            ))}
                                                    </select>

                                                    {locMap[task.task_id] && (
                                                        <div style={styles.helperText}>
                                                            Max allowed: {getSelectedFitQty(task.task_id)}
                                                        </div>
                                                    )}

                                                    <label>Qty to place</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        style={styles.input}
                                                        value={
                                                            lastTask
                                                                ? remainingQty
                                                                : qtyMap[task.task_id] || ""
                                                        }
                                                        disabled={lastTask}
                                                        max={getSelectedFitQty(task.task_id)}
                                                        onChange={(e) => {
                                                            const value = Number(e.target.value);
                                                            const max = getSelectedFitQty(task.task_id);

                                                            // ✅ Prevent negative and zero
                                                            if (value > 0 && value <= max) {
                                                                setQtyMap({
                                                                    ...qtyMap,
                                                                    [task.task_id]: value
                                                                });
                                                            }

                                                            // Optional: clear invalid input
                                                            if (e.target.value === "") {
                                                                setQtyMap({
                                                                    ...qtyMap,
                                                                    [task.task_id]: ""
                                                                });
                                                            }
                                                        }}
                                                    />

                                                    {lastTask && (
                                                        <div style={styles.errorText}>
                                                            Last task: must use remaining qty ({remainingQty})
                                                        </div>
                                                    )}

                                                    <div style={styles.actions}>
                                                        {lastTask ? (
                                                            <span style={{ fontSize: 12, color: "#64748b" }}>
                                                                Auto using remaining qty
                                                            </span>
                                                        ) : (
                                                            <button onClick={() => handleUseMax(task, grn)}>
                                                                Use Max
                                                            </button>
                                                        )}

                                                        <button
                                                            style={styles.confirmBtn}
                                                            onClick={() => handleConfirm(task)}
                                                        >
                                                            Confirm
                                                        </button>

                                                        <button onClick={() => setActiveTask(null)}>
                                                            Cancel
                                                        </button>
                                                    </div>

                                                </div>
                                            )}

                                        </div>
                                    );
                                })}
                            </div>

                        </div>
                    );
                })}
            </div>
        </div>
    );
}
const styles = {
    grnContainer: {
        border: "2px solid #eaddb4",
        borderRadius: 12,
        marginBottom: 25,
        background: "#ffffff",
        overflow: "hidden"
    },

    grnHeader: {
        padding: 15,
        background: "#eaddb4",
        borderBottom: "1px solid #eaddb4",
        display: "flex",
        justifyContent: "space-between"
    },

    grnBody: {
        padding: 15,
        display: "flex",
        flexDirection: "column",
        gap: 12
    },

    subText: {
        fontSize: 13,
        color: "#64748b"
    },

    placedBadge: {
        background: "#e2e8f0",
        padding: "6px 12px",
        borderRadius: 20,
        fontSize: 12
    },

    taskCard: {
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 12,
        background: "#ffffff"
    },

    rowTop: {
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10
    },

    label: {
        fontSize: 11,
        color: "#94a3b8"
    },

    openBtn: {
        padding: "6px 12px",
        borderRadius: 6,
        border: "1px solid #d1d5db",
        cursor: "pointer",
        background: "#fff"
    },

    expandBox: {
        marginTop: 12,
        padding: 12,
        border: "1px solid #10b981",
        borderRadius: 10,
        background: "#ecfdf5"
    },

    expandTitle: {
        fontWeight: 600,
        marginBottom: 10
    },

    input: {
        width: "100%",
        padding: 8,
        marginTop: 5,
        marginBottom: 10
    },

    helperText: {
        fontSize: 12,
        color: "#64748b"
    },

    errorText: {
        fontSize: 12,
        color: "#ef4444"
    },

    actions: {
        display: "flex",
        gap: 10,
        marginTop: 10
    },

    confirmBtn: {
        background: "#10b981",
        color: "#fff",
        padding: "6px 12px",
        borderRadius: 6
    }
};