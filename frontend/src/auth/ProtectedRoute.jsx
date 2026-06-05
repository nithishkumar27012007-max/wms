import { Navigate, useLocation } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";

export default function ProtectedRoute({ children, allowedRoles }) {
    const token = localStorage.getItem("token");
    const location = useLocation();

    if (!token) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    try {
        const decoded = jwtDecode(token);

        // Expiration check
        if (decoded.exp * 1000 < Date.now()) {
            localStorage.removeItem("token");
            return <Navigate to="/auth/login" replace />;
        }

        // Role check
        if (allowedRoles && !allowedRoles.includes(decoded.role)) {
            if (decoded.role?.toUpperCase() === "VENDOR") {
                return <Navigate to="/purchase/vendor-pos" replace />;
            }
            return <Navigate to="/inventory/stock-overview" replace />;
        }

        return children;

    } catch (err) {
        localStorage.removeItem("token");
        return <Navigate to="/auth/login" replace />;
    }
}