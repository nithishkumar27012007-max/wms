import { useNavigate } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { jwtDecode } from "jwt-decode";

export default function Header({ toggleSidebar }) {

    const navigate = useNavigate();

    // 🔹 Get role from token
    const token = localStorage.getItem("token");
    let role = null;

    if (token) {
        try {
            const decoded = jwtDecode(token);
            role = decoded.role; // ✅ important
        } catch {
            role = null;
        }
    }

    const handleLogout = async () => {

    try {

        await fetch(
            "https://underwear-locks-latinas-anonymous.trycloudflare.com/logout",
            {
                method: "POST",

                headers: {
                    "Authorization":
                        `Bearer ${localStorage.getItem("token")}`,

                    "session-uuid":
                        localStorage.getItem("session_uuid")
                }
            }
        );

    } catch (error) {

        console.error(error);

    } finally {

        // Clear frontend storage always
        localStorage.clear();

        navigate('/auth/login');
    }
};

    const handleSettings = () => {
        navigate('/settings/signup');
    };

    return (
        <header className="header" style={{
            height: 'var(--header-height)',
            background: 'white',
            borderBottom: '1px solid var(--border-color)',
            padding: '0 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            {/* LEFT SIDE */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                    onClick={toggleSidebar}
                    className="mobile-toggle"
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        display: 'none'
                    }}
                >
                    ☰
                </button>

                <span style={{
                    fontWeight: '700',
                    fontSize: '1.25rem',
                    color: 'var(--primary-color)'
                }}>
                    WMS SYSTEM
                </span>
            </div>

            {/* RIGHT SIDE ICONS */}
            <div style={{ display: "flex", gap: "10px" }}>

                {/* ✅ SHOW ONLY FOR ADMIN */}
                {role === "ADMIN" && (
                    <button onClick={handleSettings} className="icon-btn" title="Settings">
                        <Settings size={20} />
                    </button>
                )}

                {/* LOGOUT ALWAYS */}
                <button onClick={handleLogout} className="icon-btn" title="Logout">
                    <LogOut size={20} />
                </button>

            </div>

            {/* STYLES */}
            <style>{`
                .icon-btn {
                    background: transparent;
                    border: 1px solid var(--border-color);
                    padding: 6px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: 0.2s;
                }

                .icon-btn:hover {
                    background: #f5f5f5;
                    transform: scale(1.05);
                }

                @media (max-width: 768px) {
                    .mobile-toggle { display: block !important; }
                }
            `}</style>
        </header>
    );
}