import { useEffect, useState } from "react";
import axios from "axios";
import PageHeader from "../../components/PageHeader";
import { getAuthHeaders } from "../../utils/authHeaders";

export default function SignUp() {
    const [form, setForm] = useState({
        username: "",
        password: "",
        role: "",
        vendor_id: ""
    });

    const [users, setUsers] = useState([]);
    const [vendorsList, setVendorsList] = useState([]);
    const [error, setError] = useState("");

    // 🔥 Reset Password State
    const [resetUserId, setResetUserId] = useState(null);
    const [newPassword, setNewPassword] = useState("");

    const roles = [
        "ADMIN",
        "PURCHASE MANAGER",
        "INVENTORY MANAGER",
        "SALES MANAGER",
        "DISPATCH MANAGER",
        "VENDOR"
    ];

    // 🔹 Load Users and Vendors
    const fetchData = async () => {

    try {

        const [usersRes, vendorsRes] = await Promise.all([

            axios.get(
                "https://underwear-locks-latinas-anonymous.trycloudflare.com/users",
                {
                    headers: getAuthHeaders()
                }
            ),

            axios.get(
                "https://underwear-locks-latinas-anonymous.trycloudflare.com/vendors-dropdown",
                {
                    headers: getAuthHeaders()
                }
            )

        ]);

        setUsers(usersRes.data);
        setVendorsList(vendorsRes.data);

    } catch (err) {

        console.error(err);

        if (err.response?.status === 401) {

            localStorage.clear();
            window.location.href = "/";
        }
    }
};

    const fetchUsers = async () => {
        try {
            const res = await axios.get("https://underwear-locks-latinas-anonymous.trycloudflare.com/users",
                {
                    headers: getAuthHeaders()
                }
            );

            if (res.status === 401) {
                localStorage.clear();
                window.location.href = "/";
                return;
            }

            setUsers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 🔹 Handle Form Change
    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
        setError("");
    };

    // 🔹 Create User
    const handleSubmit = async () => {

    if (!form.username.trim() || !form.password.trim() || !form.role) {
        setError("All fields are required");
        return;
    }

    if (form.role === "VENDOR" && !form.vendor_id) {
        setError("Vendor selection is required for Vendor role");
        return;
    }

    try {

        await axios.post(
            "https://underwear-locks-latinas-anonymous.trycloudflare.com/signup",
            form,
            {
                headers: getAuthHeaders()
            }
        );

        alert("User Created!");

        setForm({
            username: "",
            password: "",
            role: "",
            vendor_id: ""
        });

        fetchUsers();

    } catch (err) {

        console.error(err);

        if (err.response?.status === 401) {

            localStorage.clear();
            window.location.href = "/";
            return;
        }

        setError(err.response?.data?.detail || "Error");
    }
};

    // 🔹 Change Role
    const handleRoleChange = (id, value) => {
        setUsers(users.map(u =>
            u.id === id ? { ...u, role: value } : u
        ));
    };

    // 🔹 Toggle Active
    const handleActiveToggle = (id) => {
        setUsers(users.map(u =>
            u.id === id ? { ...u, is_active: !u.is_active } : u
        ));
    };

    // 🔹 Save Update (ROLE + ACTIVE)
    const handleSave = async (u) => {
        try {
            await axios.put(`https://underwear-locks-latinas-anonymous.trycloudflare.com/users/${u.id}`, {
                role: u.role,
                is_active: u.is_active
            });
            alert("User updated!");
        } catch (err) {
            alert("Update failed");
        }
    };

    // 🔹 Reset Password Submit
    const handleResetPassword = async () => {
        if (!newPassword.trim()) {
            alert("Enter password");
            return;
        }

        try {
            await axios.put(`https://underwear-locks-latinas-anonymous.trycloudflare.com/users/${resetUserId}`, {
                new_password: newPassword
            });

            alert("Password Updated!");
            setResetUserId(null);
            setNewPassword("");
        } catch {
            alert("Failed");
        }
    };

    return (
        <div className="fade-in">
            <PageHeader title="Settings" />

            <div className="card">

                <h3>Users</h3>

                {error && (
                    <div className="error">{error}</div>
                )}

                {/* 🔹 FORM */}
                <div className="form-row">

                    <input
                        type="text"
                        name="username"
                        placeholder={form.role === "VENDOR" ? "Enter Email Address :" : "Enter Username :"}
                        value={form.username}
                        onChange={handleChange}
                        className="input"
                    />

                    <select
                        name="role"
                        value={form.role}
                        onChange={handleChange}
                        className="input"
                    >
                        <option value="">Select Role</option>
                        {roles.map((r, i) => (
                            <option key={i}>{r}</option>
                        ))}
                    </select>

                    {form.role === "VENDOR" && (
                        <select
                            name="vendor_id"
                            value={form.vendor_id}
                            onChange={handleChange}
                            className="input"
                        >
                            <option value="">Select Vendor</option>
                            {vendorsList.map((v) => (
                                <option key={v.vendor_id} value={v.vendor_id}>
                                    {v.name} ({v.vendor_id})
                                </option>
                            ))}
                        </select>
                    )}

                    <input
                        type="password"
                        name="password"
                        placeholder="Set initial password"
                        value={form.password}
                        onChange={handleChange}
                        className="input"
                    />

                    <button className="btn primary" onClick={handleSubmit}>
                        Create User
                    </button>

                    <button
                        className="btn"
                        onClick={() => setForm({ username: "", password: "", role: "", vendor_id: "" })}
                    >
                        Clear
                    </button>
                </div>

                {/* 🔹 TABLE */}
                <table className="table">
                    <thead>
                        <tr>
                            <th>USERNAME</th>
                            <th>ROLE</th>
                            <th>ACTIVE</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>

                    <tbody>
                        {users.map((u) => (
                            <tr key={u.id}>
                                <td>{u.username}</td>

                                <td>
                                    <select
                                        value={u.role}
                                        onChange={(e) =>
                                            handleRoleChange(u.id, e.target.value)
                                        }
                                    >
                                        {roles.map((r, i) => (
                                            <option key={i}>{r}</option>
                                        ))}
                                    </select>
                                </td>

                                <td>
                                    <input
                                        type="checkbox"
                                        checked={u.is_active}
                                        onChange={() => handleActiveToggle(u.id)}
                                    />
                                </td>

                                <td>
                                    <button
                                        className="btn small"
                                        onClick={() => handleSave(u)}
                                    >
                                        Save
                                    </button>

                                    <button
                                        className="btn small"
                                        onClick={() => setResetUserId(u.id)}
                                    >
                                        Reset Password
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

            </div>

            {/* 🔥 RESET PASSWORD MODAL */}
            {resetUserId && (
                <div className="modal">
                    <div className="modal-box">
                        <h3>Reset Password</h3>

                        <input
                            type="password"
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="input"
                        />

                        <div className="modal-actions">
                            <button className="btn primary" onClick={handleResetPassword}>
                                Submit
                            </button>

                            <button onClick={() => setResetUserId(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🎨 STYLES */}
            <style>{`
                .card {
                    background: white;
                    border-radius: 10px;
                    padding: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                }

                .form-row {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }

                .input {
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    min-width: 150px;
                }

                .btn {
                    background: #e3e1f2;
                    padding: 8px 12px;
                    border: 1px solid #ccc;
                    border-radius: 6px;
                    cursor: pointer;
                }

                .primary {
                    background: #523aed;
                    color: white;
                    border: none;
                }

                .small {
                    margin-right: 5px;
                    padding: 5px 10px;
                }

                .table {
                    width: 100%;
                    border-collapse: collapse;
                }

                th, td {
                    padding: 10px;
                    border-bottom: 1px solid #eee;
                    text-align: left;
                }

                .error {
                    color: red;
                    margin-bottom: 10px;
                }

                .modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.4);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }

                .modal-box {             
                    background: white;
                    padding: 20px;
                    border-radius: 10px;
                    min-width: 300px;
                }

                .modal-actions {
                    margin-top: 10px;
                    display: flex;
                    gap: 10px;
                }
            `}</style>
        </div>
    );
}