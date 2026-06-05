import { useState, useEffect } from "react";
import PageHeader from "../../components/PageHeader";
import TopTabNav from "../../components/TopTabNav";
import { getAuthHeaders } from "../../utils/authHeaders";

const tabs = [
    { label: "Company Details", path: "/master/company-details" },
    { label: "Vendors", path: "/master/vendors" },
    { label: "Customers", path: "/master/customers" },
    { label: "Warehouses", path: "/master/warehouses" },
    { label: 'Carton Box', path: '/master/carton-box' },
    { label: "Products", path: "/master/products" },
    { label: "Courier", path: "/master/courier" },

];

export default function Customers() {

    const emptyForm = {
        customers_id: "",
        name: "",
        phone: "",
        email: "",
        address: "",
        is_active: true,
    };

    const [form, setForm] = useState(emptyForm);
    const [customers, setCustomers] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        try {
            const res = await fetch(
                "https://expand-best-therapist-surgeon.trycloudflare.com/customers-read",
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
            setCustomers(data);
        } catch (error) {

            console.error(error);

            alert("Failed to load Customers");
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setForm({
            ...form,
            [name]: type === "checkbox" ? checked : value
        });
    };

    // CREATE CUSTOMER
    const createCustomer = async () => {

    console.log(form);

    const res = await fetch(
        "https://expand-best-therapist-surgeon.trycloudflare.com/customers-create",
        {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(form)
        });

        // Auto logout if session expired
        if (res.status === 401) {

            localStorage.clear();

            window.location.href = "/";

            return;
        }

    const data = await res.json();


    if (!res.ok) {
        alert(data.detail || "Error creating customer");
        return;
    }

    alert("Customer created successfully");

    setForm(emptyForm);

    loadCustomers();
};

    // UPDATE CUSTOMER
    const updateCustomer = async () => {

        const res = await fetch(`https://expand-best-therapist-surgeon.trycloudflare.com/customers-update/${selectedId}`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(form)
        });

        // Auto logout if session expired
        if (res.status === 401) {

            localStorage.clear();

            window.location.href = "/";

            return;
        }

        const data = await res.json();

        if (!res.ok) {
            alert(data.detail || "Update failed");
            return;
        }

        alert("Customer updated successfully");

        setForm(emptyForm);
        setIsEditing(false);
        setSelectedId(null);

        loadCustomers();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.customers_id || !form.name || !form.phone || !form.email || !form.address) {
            alert("Please fill all required fields");
            return;
        }

        const phonePattern = /^[0-9]{10}$/;
        if (!phonePattern.test(form.phone)) {
            alert("Phone must be 10 digits");
            return;
        }

        // Email validation
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(form.email)) {
            alert("Enter valid email");
            return;
        }

        if (isEditing) {
            updateCustomer();
        } else {
            createCustomer();
        }
    };

    // CLICK UPDATE BUTTON
    const handleEdit = (customer) => {

        setForm({
            customers_id: customer.customers_id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            address: customer.address,
            is_active: customer.is_active,
        });

        setSelectedId(customer.customers_id);
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // CANCEL UPDATE
    const cancelUpdate = () => {
        setForm(emptyForm);
        setIsEditing(false);
        setSelectedId(null);
    };

    const styles = {
        form: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "20px" },
        input: { padding: "10px", border: "1px solid #ddd", borderRadius: "6px", width: "100%" },
        label: { fontWeight: "600", marginBottom: "6px" },
        checkboxRow: { gridColumn: "span 2", display: "flex", alignItems: "center", gap: "10px" },
        button: { padding: "12px", backgroundColor: "#4f46e5", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" },
        cancelBtn: { padding: "12px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", marginLeft: "10px" },
        tableContainer: { overflowX: "auto", marginTop: "40px" },
        table: { width: "100%", borderCollapse: "collapse" },
        th: { background: "#4f46e5", color: "white", padding: "10px" },
        td: { border: "1px solid #ddd", padding: "10px" },
        editBtn: { background: "#22c55e", color: "white", border: "none", padding: "6px 10px", borderRadius: "4px", cursor: "pointer" }
    };

    return (
        <div className="fade-in">

            <PageHeader title="Customers" breadcrumbs={["Master", "Customers"]} />
            <TopTabNav tabs={tabs} />

            <div className="page-content">

                {/* Heading with Help Tooltip */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                    <h3 style={{ margin: 0 }}>{isEditing ? "Update Customer" : "Add Customer"}</h3>
                    <div
    style={{ position: "relative", display: "inline-flex" }}
    onMouseEnter={() => setShowTooltip(true)}
    onMouseLeave={() => setShowTooltip(false)}
    onClick={() => window.location.href = "/help?section=customer"}
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

                        {showTooltip && (
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
                               Click to view Customer Management help
                            </div>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>

                    <div>
                        <label style={styles.label}>Customer ID</label>
                        <input style={styles.input} name="customers_id" value={form.customers_id} onChange={handleChange} />
                    </div>

                    <div>
                        <label style={styles.label}>Name</label>
                        <input style={styles.input} name="name" value={form.name} onChange={handleChange} />
                    </div>

                    <div>
                        <label style={styles.label}>Phone</label>
                        <input style={styles.input} name="phone" value={form.phone} onChange={handleChange} />
                    </div>

                    <div>
                        <label style={styles.label}>Email</label>
                        <input style={styles.input} name="email" value={form.email} onChange={handleChange} />
                    </div>

                    <div>
                        <label style={styles.label}>Address</label>
                        <input style={styles.input} name="address" value={form.address} onChange={handleChange} />
                    </div>

                    {isEditing && (
                        <div>
                            <label style={styles.label}>Updated At</label>
                            <input
                                type="date"
                                style={styles.input}
                                name="updated_at"
                                value={new Date().toISOString().split("T")[0]}
                                readOnly
                            />
                        </div>
                    )}

                    <div style={styles.checkboxRow}>
                        <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                        <label>Active Customer</label>
                    </div>

                    <div style={{ gridColumn: "span 2" }}>
                        <button type="submit" style={styles.button}>
                            {isEditing ? "Update Customer" : "Create Customer"}
                        </button>

                        {isEditing && (
                            <button type="button" style={styles.cancelBtn} onClick={cancelUpdate}>
                                Cancel Update
                            </button>
                        )}
                    </div>

                </form>


                <h3 style={{ marginTop: "40px" }}>Customer List</h3>

                <div style={styles.tableContainer}>
                    <table style={styles.table}>

                        <thead>
                            <tr>
                                <th style={styles.th}>ID</th>
                                <th style={styles.th}>Name</th>
                                <th style={styles.th}>Phone</th>
                                <th style={styles.th}>Email</th>
                                <th style={styles.th}>Address</th>
                                <th style={styles.th}>Created</th>
                                <th style={styles.th}>Updated</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {customers.map((c) => (
                                <tr key={c.customers_id}>
                                    <td style={styles.td}>{c.customers_id}</td>
                                    <td style={styles.td}>{c.name}</td>
                                    <td style={styles.td}>{c.phone}</td>
                                    <td style={styles.td}>{c.email}</td>
                                    <td style={styles.td}>{c.address}</td>
                                    <td style={styles.td}>{c.created_at}</td>
                                    <td style={styles.td}>{c.updated_at}</td>
                                    <td style={styles.td}>{c.is_active ? "Active" : "Inactive"}</td>
                                    <td style={styles.td}>
                                        <button style={styles.editBtn} onClick={() => handleEdit(c)}>
                                            Update
                                        </button>
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