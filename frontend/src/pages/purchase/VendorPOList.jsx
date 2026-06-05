import { useState, useEffect } from 'react';
import axios from 'axios';
import PageHeader from '../../components/PageHeader';
import { format } from 'date-fns';
import { getAuthHeaders } from '../../utils/authHeaders';

export default function VendorPOList() {
    const [pos, setPos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [selectedPO, setSelectedPO] = useState(null);
    const [form, setForm] = useState({
        expected_delivery_date: '',
        dispatched_at: '',
        dispatch_note: '',
        vehicle_number: ''
    });
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [modalPO, setModalPO] = useState(null);

    const fetchPOs = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:8000/vendor/pos', {
                headers: getAuthHeaders()
            });
            setPos(Array.isArray(res.data) ? res.data : []);
            setError('');
        } catch (err) {
            if (err.response?.status === 401) {
                localStorage.clear();
                window.location.href = "/";
                return;
            }
            setError(err.response?.data?.detail || 'Error fetching POs');
            setPos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPOs();
    }, []);

    const handleOpenModal = (po) => {
        setSelectedPO(po);
        setForm({
            expected_delivery_date: po.expected_delivery_date || '',
            dispatched_at: po.dispatched_at ? po.dispatched_at.slice(0, 16) : '',
            dispatch_note: po.dispatch_note || '',
            vehicle_number: po.vehicle_number || ''
        });
    };

    const openDetailsModal = (po) => {
        setModalPO(po);
        setDetailsModalOpen(true);
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        try {
            const payload = {
                expected_delivery_date: form.expected_delivery_date || null,
                dispatched_at: form.dispatched_at ? new Date(form.dispatched_at).toISOString() : null,
                dispatch_note: form.dispatch_note || null,
                vehicle_number: form.vehicle_number || null
            };
            await axios.put(`http://localhost:8000/vendor/po-activity/${selectedPO.purchase_order_id}`, payload, {
                headers: getAuthHeaders()
            });
            alert('Activity updated successfully');
            setSelectedPO(null);
            fetchPOs();
        } catch (err) {
            if (err.response?.status === 401) {
                localStorage.clear();
                window.location.href = "/";
                return;
            }
            alert(err.response?.data?.detail || 'Error updating activity');
        }
    };

    const formatValue = (value) => {
        if (value === null || value === undefined || value === "") return "—";
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        if (num < 0) return "—";
        return value;
    };

    const getPOTotalCost = (po) => {
        if (!po) return "—";
        if (po.total_cost && parseFloat(po.total_cost) > 0) {
            return po.total_cost;
        }
        if (po.lines && po.lines.length > 0) {
            const sum = po.lines.reduce((acc, line) => {
                const lineCost = parseFloat(line.total_cost) || ((parseFloat(line.ordered_qty) || 0) * (parseFloat(line.unit_cost) || 0));
                return acc + lineCost;
            }, 0);
            return sum > 0 ? sum.toFixed(2) : "—";
        }
        return "—";
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), 'dd-MMM-yyyy hh:mm a');
        } catch {
            return new Date(dateStr).toLocaleString();
        }
    };

    return (
        <div className="fade-in">
            <PageHeader title="Assigned Purchase Orders" />

            <div className="card">
                {error && <div className="error">{error}</div>}
                {loading ? <p>Loading...</p> : (
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>PO ID</th>
                                    <th>Status</th>
                                    <th>Order Date</th>
                                    <th>Expected Delivery</th>
                                    <th>Dispatch Info</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pos.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center' }}>No Purchase Orders Found</td>
                                    </tr>
                                ) : (
                                    pos.map((po) => (
                                        <tr key={po.purchase_order_id}>
                                            <td><b>{po.purchase_order_id}</b></td>
                                            <td>
                                                <span className={`badge ${po.status?.toLowerCase() || ''}`}>
                                                    {po.status}
                                                </span>
                                            </td>
                                            <td>{po.order_date || formatDateTime(po.created_at)}</td>
                                            <td>{po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'dd-MMM-yyyy') : '-'}</td>
                                            <td>
                                                {po.dispatched_at ? (
                                                    <div>
                                                        <div>{formatDateTime(po.dispatched_at)}</div>
                                                        <div style={{ fontSize: '0.85em', color: '#666' }}>Vehicle: {po.vehicle_number || '-'}</div>
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                                                <button className="btn small" onClick={() => openDetailsModal(po)}>
                                                    👁️ View Details
                                                </button>
                                                {po.status === 'Cancelled' ? (
                                                    <span className="badge" style={{background: "#fee2e2", color: "#b91c1c"}}>🚫 Cancelled</span>
                                                ) : po.vendor_status === 'COMPLETED' ? (
                                                    <span className="badge approved">✔️ Dispatched</span>
                                                ) : (
                                                    <button className="btn small primary" onClick={() => handleOpenModal(po)}>
                                                        Update Status
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {detailsModalOpen && modalPO && (
                <div className="modal">
                    <div className="modal-box" style={{ width: "650px", maxWidth: "95%" }}>
                        <h3 style={{ marginTop: 0, borderBottom: "1px solid #ddd", paddingBottom: "10px" }}>
                            PO Details: {modalPO.purchase_order_id}
                        </h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "15px" }}>
                            <p><strong>Status:</strong> <span className={`badge ${modalPO.status?.toLowerCase() || ''}`}>{modalPO.status}</span></p>
                            <p><strong>Order Date:</strong> {modalPO.order_date}</p>
                            <p><strong>Created At:</strong> {formatDateTime(modalPO.created_at)}</p>
                        </div>
                        <div style={{ marginTop: "15px", borderTop: "1px solid #eee", paddingTop: "15px" }}>
                            <h4 style={{ margin: "0 0 10px 0" }}>Order Lines</h4>
                            <div className="table-responsive">
                                <table className="table" style={{ fontSize: "13px" }}>
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Ordered</th>
                                            <th>Received</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(modalPO.lines || []).map((l, i) => (
                                            <tr key={i}>
                                                <td>{l.product_name || l.product_id}</td>
                                                <td>{formatValue(l.ordered_qty)}</td>
                                                <td>{formatValue(l.received_qty)}</td>
                                                <td>{l.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div style={{ textAlign: "right", marginTop: "20px" }}>
                            <button className="btn primary" onClick={() => setDetailsModalOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Update Status Modal */}
            {selectedPO && (
                <div className="modal">
                    <div className="modal-box">
                        <h3>Update PO: {selectedPO.purchase_order_id}</h3>
                        <p style={{marginBottom: '15px', color: '#666', fontSize: '0.9em'}}>
                            Update delivery estimates and dispatch information.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {!selectedPO.expected_delivery_date ? (
                                <div>
                                    <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Expected Delivery Date</label>
                                    <input type="date" name="expected_delivery_date" value={form.expected_delivery_date} onChange={handleChange} className="input full-width" />
                                </div>
                            ) : (
                                <div style={{ padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '5px' }}>
                                    <span style={{color: '#64748b', fontSize: '0.9em', display: 'block'}}>Expected Delivery Date</span>
                                    <strong style={{color: '#334155'}}>{format(new Date(selectedPO.expected_delivery_date), 'dd-MMM-yyyy')}</strong>
                                </div>
                            )}
                            {selectedPO.expected_delivery_date && (
                                <>
                                    <div>
                                        <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Dispatch Date & Time</label>
                                        <input type="datetime-local" name="dispatched_at" value={form.dispatched_at} onChange={handleChange} className="input full-width" />
                                    </div>
                                    <div>
                                        <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Vehicle Number</label>
                                        <input type="text" name="vehicle_number" value={form.vehicle_number} onChange={handleChange} className="input full-width" placeholder="e.g. TN-01-AB-1234" />
                                    </div>
                                    <div>
                                        <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Dispatch Note</label>
                                        <textarea name="dispatch_note" value={form.dispatch_note} onChange={handleChange} className="input full-width" rows="3" placeholder="Add any relevant notes..." />
                                    </div>
                                </>
                            )}
                        </div>
                        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                            <button className="btn primary" onClick={handleSubmit}>Save Changes</button>
                            <button className="btn" onClick={() => setSelectedPO(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .card { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
                .table-responsive { overflow-x: auto; }
                .table { width: 100%; border-collapse: collapse; }
                .table th, .table td { padding: 12px 15px; border-bottom: 1px solid #eee; text-align: left; }
                .table th { background: #f8fafc; font-weight: 600; color: #334155; }
                .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 600; background: #e2e8f0; color: #475569; }
                .badge.approved { background: #dcfce7; color: #166534; }
                .badge.pending { background: #fef08a; color: #854d0e; }
                .btn { padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 6px; background: white; cursor: pointer; font-weight: 500; }
                .btn.primary { background: #523aed; color: white; border: none; }
                .btn.small { padding: 6px 12px; font-size: 0.85em; }
                .input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; }
                .input.full-width { width: 100%; box-sizing: border-box; }
                .error { color: #ef4444; background: #fee2e2; padding: 10px; border-radius: 6px; margin-bottom: 15px; }
                .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
                .modal-box { background: white; padding: 24px; border-radius: 10px; width: 90%; max-width: 400px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
                .modal-box h3 { margin-top: 0; }
            `}</style>
        </div>
    );
}
