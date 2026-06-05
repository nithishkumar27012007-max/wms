import { NavLink } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";

const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    {
        label: 'Master', path: '/master', subItems: [
            { label: 'Company Details', path: '/master/company-details' },
            { label: 'Customers', path: '/master/customers' },
            { label: 'Products', path: '/master/products' },
            { label: 'Warehouses', path: '/master/warehouses' },
            { label: 'Carton Box', path: '/master/carton-box' },
            { label: 'Vendors', path: '/master/vendors' },
            { label: 'Courier', path: '/master/courier' },
            

        ]
    },
    {
        label: 'Purchase', path: '/purchase', subItems: [
            { label: 'PO List', path: '/purchase/po-list' },
            { label: 'GRN', path: '/purchase/grn' },
            { label: 'PutAway', path: '/purchase/put-away' },
        ]
    },
    {
        label: 'Inventory', path: '/inventory', subItems: [
            { label: 'Stock Overview', path: '/inventory/stock-overview' },
            { label: 'Batches', path: '/inventory/batches' },
            { label: 'Movements', path: '/inventory/movements' },
            { label: 'Stock View', path: '/inventory/stock-view' },
        ]
    },
    {
        label: 'Orders', path: '/orders', subItems: [
            { label: 'Sales Orders', path: '/orders/sales-orders' },
            { label: 'Pick Tasks', path: '/orders/pick-tasks' },
            { label: 'Package', path: '/orders/package' },
        ]
    },
    {
        label: 'Dispatch', path: '/dispatch', subItems: [
            { label: 'Ready', path: '/dispatch/ready' },
            { label: 'Dispatch List', path: '/dispatch/dispatch-list' },
        ]
    },
    {
        label: 'Reports', path: '/reports', subItems: [
            { label: 'Inventory', path: '/reports/inventory' },
            { label: 'Orders', path: '/reports/orders' },
        ]
    },
    { label: 'Help', path: '/help' },
];

export default function Sidebar({ isOpen, closeSidebar }) {

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

    // 🔹 Filter Navigation Based on Role
    let filteredNavItems = [];

    if (
        role === "ADMIN"
    ) {
        filteredNavItems = navItems;
    }

    else if (role === "PURCHASE MANAGER") {
        filteredNavItems = [
            { label: 'Dashboard', path: '/dashboard' },

            {
                label: 'Purchase',
                path: '/purchase',
                subItems: [
                    { label: 'PO List', path: '/purchase/po-list' },
                    { label: 'GRN', path: '/purchase/grn' },
                ]
            },

            {
                label: 'Inventory',
                path: '/inventory',
                subItems: [
                    { label: 'Stock Overview', path: '/inventory/stock-overview' },
                    { label: 'Low Stock', path: '/inventory/low-stock' },
                ]
            },

            {
                label: 'Reports',
                path: '/reports',
                subItems: [
                    { label: 'Inventory', path: '/reports/inventory' },
                ]
            },

            { label: 'Help', path: '/help' }
        ];
    }

    else if (role === "INVENTORY MANAGER") {
        filteredNavItems = [
            { label: 'Dashboard', path: '/dashboard' },

            
            {
                label: 'Inventory',
                path: '/inventory',
                subItems: [
                    { label: 'Stock Overview', path: '/inventory/stock-overview' },
                    { label: 'Batches', path: '/inventory/batches' },
                    { label: 'Movements', path: '/inventory/movements' },
                    { label: 'Transfers', path: '/inventory/transfers' },
                    { label: 'Low Stock', path: '/inventory/low-stock' },
                ]
            },

            {
                label: 'Orders',
                path: '/orders',
                subItems: [
                    { label: 'Sales Orders', path: '/orders/sales-orders' },
                    { label: 'Pick Tasks', path: '/orders/pick-tasks' },
                ]
            },
            
            {
                label: 'Reports',
                path: '/reports',
                subItems: [
                    { label: 'Inventory', path: '/reports/inventory' },
                ]
            },

            { label: 'Help', path: '/help' }
        ];
    }


    else if (role === "SALES MANAGER") {
        filteredNavItems = [
            { label: 'Dashboard', path: '/dashboard' },

            
            {
                label: 'Inventory',
                path: '/inventory',
                subItems: [
                    { label: 'Low Stock', path: '/inventory/low-stock' }
                ]
            },

            {
                label: 'Orders',
                path: '/orders',
                subItems: [
                    { label: 'Sales Orders', path: '/orders/sales-orders' },
                    { label: 'Pick Tasks', path: '/orders/pick-tasks' },
                ]
            },
            
            {
                label: 'Reports',
                path: '/reports',
                subItems: [
                    { label: 'Orders', path: '/reports/orders' },
                ]
            },

            { label: 'Help', path: '/help' }
        ];
    }

    else if (role === "DISPATCH MANAGER") {
        filteredNavItems = [
            { label: 'Dashboard', path: '/dashboard' },

            {
                label: 'Purchase',
                path: '/purchase',
                subItems: [
                    { label: 'GRN', path: '/purchase/grn' },
                ]
            },



            {
                label: 'Dispatch',
                path: '/dispatch',
                subItems: [
                    { label: 'Ready', path: '/dispatch/ready' },
                    { label: 'Dispatch List', path: '/dispatch/dispatch-list' },
                    { label: 'Tracking', path: '/dispatch/tracking' }
                ]
            },
            
            {
                label: 'Reports',
                path: '/reports',
                subItems: [
                    { label: 'Orders', path: '/reports/orders' },
                ]
            },

            { label: 'Help', path: '/help' }
        ];
    }

    else if (role === "VENDOR") {
        filteredNavItems = [
            {
                label: 'Purchase',
                path: '/purchase',
                subItems: [
                    { label: 'Vendor POs', path: '/purchase/vendor-pos' }
                ]
            }
        ];
    }


    return (
        <>
            {isOpen && (
                <div
                    onClick={closeSidebar}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.3)',
                        zIndex: 998
                    }}
                />
            )}

            <aside style={{
                width: 'var(--sidebar-width)',
                height: '100vh',
                background: 'white',
                borderRight: '1px solid var(--border-color)',
                position: 'fixed',
                left: 0,
                top: 0,
                zIndex: 999,
                transition: 'transform var(--transition-speed)',
                transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
                overflowY: 'auto',
                visibility: isOpen ? 'visible' : 'hidden'
            }}>
                <div style={{
                    padding: '1.5rem',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '1rem'
                }}>
                    NAVIGATION
                </div>

                <nav style={{ padding: '0 0.75rem' }}>
                    {filteredNavItems.map((item, idx) => (
                        <div key={idx} style={{ marginBottom: '0.25rem' }}>
                            <NavLink
                                to={item.subItems ? item.subItems[0].path : item.path}
                                onClick={() => { if (window.innerWidth < 768) closeSidebar(); }}
                                style={({ isActive }) => ({
                                    display: 'block',
                                    padding: '0.75rem 1rem',
                                    textDecoration: 'none',
                                    color: isActive ? 'var(--primary-color)' : 'var(--text-main)',
                                    fontWeight: isActive ? '600' : '500',
                                    borderRadius: '6px',
                                    background: isActive ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                                    fontSize: '0.925rem'
                                })}
                            >
                                {item.label}
                            </NavLink>
                        </div>
                    ))}
                </nav>
            </aside>

            <style>{`
                @media (min-width: 769px) {
                    aside { 
                        position: sticky !important; 
                        transform: none !important; 
                        visibility: visible !important;
                    }
                }
            `}</style>
        </>
    );
}