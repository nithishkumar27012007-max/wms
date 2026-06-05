import { NavLink } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";

export default function TopTabNav({ tabs }) {

    const token = localStorage.getItem("token");
    let role = null;

    if (token) {
        try {
            const decoded = jwtDecode(token);
            role = decoded.role;
        } catch {
            role = null;
        }
    }

    // 🔹 Filter Tabs Based on Role
    const filteredTabs = tabs.filter(tab => {
        if (!tab.allowedRoles) return true;
        return tab.allowedRoles.includes(role);
    });

    return (
        <nav style={{
            display: 'flex',
            gap: '1rem',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '2rem',
            paddingBottom: '1px'
        }}>
            {filteredTabs.map((tab, idx) => (
                <NavLink
                    key={idx}
                    to={tab.path}
                    style={({ isActive }) => ({
                        padding: '0.75rem 1rem',
                        textDecoration: 'none',
                        color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
                        fontWeight: isActive ? '600' : '500',
                        borderBottom: isActive ? '2px solid var(--primary-color)' : '2px solid transparent',
                        marginBottom: '-1px',
                        fontSize: '0.875rem',
                        transition: 'color 0.2s, border-color 0.2s'
                    })}
                >
                    {tab.label}
                </NavLink>
            ))}
        </nav>
    );
}