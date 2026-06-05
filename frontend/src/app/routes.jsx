import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import ProtectedRoute from '../auth/ProtectedRoute';
import Login from '../auth/Login';
import { jwtDecode } from 'jwt-decode';

function RoleBasedRedirect({ defaultPath = "/dashboard" }) {
    const token = localStorage.getItem("token");
    if (!token) {
        return <Navigate to="/auth/login" replace />;
    }
    try {
        const decoded = jwtDecode(token);
        if (decoded.role?.toUpperCase() === "VENDOR") {
            return <Navigate to="/purchase/vendor-pos" replace />;
        }
    } catch (e) {
        return <Navigate to="/auth/login" replace />;
    }
    return <Navigate to={defaultPath} replace />;
}

// Pages
import Dashboard from '../pages/dashboard/Dashboard';
import Vendors from '../pages/master/Vendors';
import Customers from '../pages/master/Customers';
import Products from '../pages/master/Products';
import Warehouses from '../pages/master/Warehouses';
import CartonBox from '../pages/master/CartonBox';
import CompanyDetails from '../pages/master/CompanyDetails';
import Courier from '../pages/master/Courier';
import POList from '../pages/purchase/POList';
import VendorPOList from '../pages/purchase/VendorPOList';
import GRN from '../pages/purchase/GRN';
import PutAway from '../pages/purchase/PutAway';
import StockOverview from '../pages/inventory/StockOverview';
import Batches from '../pages/inventory/Batches';
import Movements from '../pages/inventory/Movements';
import StockView from '../pages/inventory/StockView';
import SalesOrders from '../pages/orders/SalesOrders';
import PickTasks from '../pages/orders/PickTasks';
import Package from '../pages/orders/Package';
import Ready from '../pages/dispatch/Ready';
import DispatchList from '../pages/dispatch/DispatchList';
import InventoryReport from '../pages/reports/InventoryReport';
import OrdersReport from '../pages/reports/OrdersReport';
import Help from '../pages/help/Help';
import SignUp from '../pages/settings/SignUp';

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/auth/login" element={<Login />} />

            {/* ── Help: full-screen, no MainLayout sidebar ── */}
            <Route path="/help" element={
                <ProtectedRoute allowedRoles={["ADMIN", "PURCHASE MANAGER", "INVENTORY MANAGER", "SALES MANAGER", "DISPATCH MANAGER"]}>
                    <Help />
                </ProtectedRoute>
            } />


            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>

                <Route index element={<RoleBasedRedirect defaultPath="/dashboard" />} />

                <Route path="/settings/signup" element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <SignUp />
                    </ProtectedRoute>
                } />

                {/* ADMIN ONLY */}
                <Route path="dashboard" element={
                    <ProtectedRoute allowedRoles={["ADMIN", "PURCHASE MANAGER", "INVENTORY MANAGER", "SALES MANAGER", "DISPATCH MANAGER"]}>
                        <Dashboard />
                    </ProtectedRoute>
                } />

                {/* MASTER - ADMIN ONLY */}
                <Route path="master/vendors" element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <Vendors />
                    </ProtectedRoute>
                } />

                <Route path="master/customers" element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <Customers />
                    </ProtectedRoute>
                } />

                <Route path="master/products" element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <Products />
                    </ProtectedRoute>
                } />

                <Route path="master/warehouses" element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <Warehouses />
                    </ProtectedRoute>
                } />              


                <Route path="master/carton-box" element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <CartonBox />
                    </ProtectedRoute>
                } />

                <Route path="master/company-details" element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <CompanyDetails />
                    </ProtectedRoute>
                } />

                <Route path="master/courier" element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <Courier />
                    </ProtectedRoute>
                } />


                {/* PURCHASE - ADMIN ONLY */}
                <Route path="purchase/po-list" element={
                    <ProtectedRoute allowedRoles={["ADMIN", "PURCHASE MANAGER"]}>
                        <POList />
                    </ProtectedRoute>
                } />

                <Route path="purchase/vendor-pos" element={
                    <ProtectedRoute allowedRoles={["VENDOR"]}>
                        <VendorPOList />
                    </ProtectedRoute>
                } />

                <Route path="purchase/grn" element={
                    <ProtectedRoute allowedRoles={["ADMIN", "PURCHASE MANAGER", "DISPATCH MANAGER"]}>
                        <GRN />
                    </ProtectedRoute>
                } />

                <Route path="purchase/put-away" element={
                    <ProtectedRoute allowedRoles={["ADMIN", "PURCHASE MANAGER", "DISPATCH MANAGER"]}>
                        <PutAway />
                    </ProtectedRoute>
                } />

                {/* INVENTORY */}
                <Route path="inventory/stock-overview" element={
                    <ProtectedRoute allowedRoles={["ADMIN", "PURCHASE MANAGER", "INVENTORY MANAGER"]}>
                        <StockOverview />
                    </ProtectedRoute>
                } />

                <Route path="inventory/batches" element={
                    <ProtectedRoute allowedRoles={["ADMIN", "INVENTORY MANAGER"]}>
                        <Batches />
                    </ProtectedRoute>
                } />

                <Route path="inventory/movements" element={
                    <ProtectedRoute allowedRoles={["ADMIN", "INVENTORY MANAGER"]}>
                        <Movements />
                    </ProtectedRoute>
                } />


                <Route path="inventory/stock-view" element={
                    <ProtectedRoute allowedRoles={["ADMIN", "PURCHASE MANAGER", "INVENTORY MANAGER", "SALES MANAGER"]}>
                        <StockView />
                    </ProtectedRoute>
                } />

                {/* ORDERS - ADMIN ONLY */}
                <Route path="orders/sales-orders" element={
                    <ProtectedRoute allowedRoles={["ADMIN", "INVENTORY MANAGER", "SALES MANAGER"]}>
                        <SalesOrders />
                    </ProtectedRoute>
                } />


                {/* PickTasks - ADMIN ONLY */}
                <Route path="orders/pick-tasks" element={
                    <ProtectedRoute allowedRoles={["ADMIN", "INVENTORY MANAGER", "SALES MANAGER"]}>
                        <PickTasks />
                    </ProtectedRoute>
                } />


                {/* PickTasks - ADMIN ONLY */}
                <Route path="orders/package" element={
                    <ProtectedRoute allowedRoles={["ADMIN", "INVENTORY MANAGER", "SALES MANAGER"]}>
                        <Package />
                    </ProtectedRoute>
                } />


                {/* DISPATCH - ADMIN ONLY */}
                <Route path="dispatch/ready" element={
                    <ProtectedRoute allowedRoles={["ADMIN", "DISPATCH MANAGER"]}>
                        <Ready />
                    </ProtectedRoute>
                } />

                <Route path="dispatch/dispatch-list" element={
                    <ProtectedRoute allowedRoles={["ADMIN", "DISPATCH MANAGER"]}>
                        <DispatchList />
                    </ProtectedRoute>
                } />


                {/* REPORTS - ADMIN ONLY */}
                <Route path="reports/inventory" element={
                    <ProtectedRoute allowedRoles={["ADMIN", "PURCHASE MANAGER", "INVENTORY MANAGER"]}>
                        <InventoryReport />
                    </ProtectedRoute>
                } />

                <Route path="reports/orders" element={
                    <ProtectedRoute allowedRoles={["ADMIN", "SALES MANAGER", "DISPATCH MANAGER"]}>
                        <OrdersReport />
                    </ProtectedRoute>
                } />


               

            </Route>

            <Route path="*" element={<RoleBasedRedirect defaultPath="/dashboard" />} />
        </Routes>
    );
}