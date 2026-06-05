import { useState, useEffect, useRef } from 'react';
import PageHeader from '../../components/PageHeader';

/* ─────────────────────── DATA ─────────────────────── */
    const NAV = [
  {
    id: 'getting-started', label: 'Getting Started', icon: '🚀',
    children: [
      { id: 'intro', label: 'Introduction' },
      { id: 'app-flow', label: 'Application Flow' },
    ]
  },
  {
    id: 'dashboard-group', label: 'Dashboard', icon: '📊',
    children: [
      { id: 'dashboard', label: 'Dashboard Overview' },
    ]
  },
  {
    id: 'master-group', label: 'Master Setup', icon: '🗂️',
    children: [
      { id: 'company', label: 'Company Details' },
      { id: 'vendor', label: 'Vendor Management' },
      { id: 'customer', label: 'Customer Management' },
      { id: 'warehouse', label: 'Warehouse Management' },
      { id: 'carton', label: 'Carton Box Management' },
      { id: 'products', label: 'Product Management' },
      { id: 'courier', label: 'Courier Management' },
    ]
  },
  {
    id: 'purchase-group', label: 'Purchase', icon: '🛒',
    children: [
      { id: 'purchase-order', label: 'Purchase Order' },
      { id: 'grn', label: 'GRN (Goods Receipt)' },
      { id: 'putaway', label: 'Put-Away Tasks' },
    ]
  },
  {
    id: 'inventory-group', label: 'Inventory', icon: '📦',
    children: [
      { id: 'stock-overview', label: 'Stock Overview' },
      { id: 'batches', label: 'Batches & Expiry' },
      { id: 'movements', label: 'Stock Movements' },
      { id: 'stock-view', label: 'Stock View' },
    ]
  },
  {
    id: 'orders-group', label: 'Orders', icon: '📋',
    children: [
      { id: 'sales-order', label: 'Sales Order' },
      { id: 'picking', label: 'Picking Tasks' },
      { id: 'packing', label: 'Packing (Packages)' },
    ]
  },
  {
    id: 'dispatch-group', label: 'Dispatch', icon: '🚚',
    children: [
      { id: 'ready-dispatch-list', label: 'Ready Dispatch List' },
      { id: 'dispatch', label: 'Dispatch Management' },
    ]
  },
  {
    id: 'reports-group', label: 'Reports', icon: '📑',
    children: [
      { id: 'purchase-report', label: 'Purchase Order Report' },
      { id: 'sales-report', label: 'Sales Order Report' },
    ]
  },
];

const ALL_SECTIONS = NAV.flatMap(g => g.children);





/* ─────────────── Small sub-components ─────────────── */

function CoverSection() {
  return (
    <section id="cover">
      <div style={{
        background: 'linear-gradient(135deg, #6d28d9 0%, #4f46e5 50%, #3b82f6 100%)',
        borderRadius: 14,
        padding: '48px 40px',
        textAlign: 'center',
        marginBottom: 32,
        boxShadow: '0 8px 32px rgba(99,102,241,0.25)',
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 28,
          fontWeight: 900,
          color: '#ffffff',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          lineHeight: 1.4,
        }}>
          SCM + WHM SYSTEM
        </h1>
        <p style={{
          margin: '12px 0 0',
          fontSize: 15,
          color: 'rgba(255,255,255,0.82)',
          fontWeight: 500,
          letterSpacing: '0.02em',
        }}>
          Supply Chain Management &amp; Warehouse Management System
        </p>
      </div>

      <div style={s.sectionCard}>
        <SectionTitle>About This Documentation</SectionTitle>
        <p style={s.p}>
          This documentation covers the complete SCM + WHM System — from master setup
          and purchase operations to inventory management, order processing, dispatch,
          and reporting.
        </p>

        <SectionTitle>Quick Navigation</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, margin: '14px 0' }}>
          {[
            ['🚀', 'Getting Started', 'intro'],
            ['📊', 'Dashboard', 'dashboard'],
            ['🗂️', 'Master Setup', 'company'],
            ['🛒', 'Purchase', 'purchase-order'],
            ['📦', 'Inventory', 'stock-overview'],
            ['📋', 'Orders', 'sales-order'],
            ['🚚', 'Dispatch', 'dispatch'],
            ['📑', 'Reports', 'purchase-report'],
          ].map(([icon, label]) => (
            <div key={label} style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Badge({ color, children }) {
  const colors = {
    blue:   { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    green:  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    yellow: { bg: '#fefce8', text: '#854d0e', border: '#fef08a' },
    red:    { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    purple: { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
    gray:   { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{ display:'inline-block', padding:'2px 10px', borderRadius:20,
      fontSize:12, fontWeight:600, background:c.bg, color:c.text,
      border:`1px solid ${c.border}`, letterSpacing:'0.02em' }}>
      {children}
    </span>
  );
}


function InfoBox({ icon, title, children, color = 'blue' }) {
  const colors = {
    blue:   { bg: '#eff6ff', border: '#3b82f6', icon: '#1d4ed8' },
    yellow: { bg: '#fefce8', border: '#f59e0b', icon: '#d97706' },
    green:  { bg: '#f0fdf4', border: '#22c55e', icon: '#15803d' },
    red:    { bg: '#fef2f2', border: '#ef4444', icon: '#b91c1c' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div style={{ background: c.bg, borderLeft: `4px solid ${c.border}`,
      borderRadius: '0 10px 10px 0', padding: '14px 18px', margin: '14px 0',
      display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 20, flexShrink: 0, color: c.icon }}>{icon}</span>
      <div>
        {title && <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>{title}</div>}
        <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.7 }}>{children}</div>
      </div>
    </div>
  );
}

function CodeBlock({ children }) {
  return (
    <div style={{ background: '#0f172a', borderRadius: 10, padding: '16px 20px',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 13,
      color: '#94a3b8', margin: '10px 0', lineHeight: 1.8, overflowX: 'auto' }}>
      {children}
    </div>
  );
}

function Table({ headers, rows }) {
  return (
    <div style={{ overflowX: 'auto', margin: '14px 0', borderRadius: 10, border: '1px solid #e2e8f0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700,
                color: '#374151', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '10px 14px', color: '#475569', verticalAlign: 'top' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StepCard({ number, title, navigate, children }) {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#3b82f6)',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 15, flexShrink: 0, boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
        {number}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>{title}</div>
        {navigate && (
          <div style={{ fontSize: 12, background: '#f1f5f9', borderRadius: 6, padding: '3px 10px',
            display: 'inline-block', color: '#2563eb', fontFamily: 'monospace', marginBottom: 8, fontWeight: 600 }}>
            📍 {navigate}
          </div>
        )}
        <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>{children}</div>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 14px' }}>
      <div style={{ width: 4, height: 22, background: 'linear-gradient(180deg,#2563eb,#60a5fa)', borderRadius: 4 }} />
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>{children}</h3>
    </div>
  );
}

function StatusFlow({ steps }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0', alignItems: 'center' }}>
      {steps.map((step, i) => (
        <>
          <div key={step.label} style={{ padding: '6px 14px', borderRadius: 20,
            background: step.color || '#eff6ff', color: step.textColor || '#1d4ed8',
            fontWeight: 700, fontSize: 13, border: `2px solid ${step.border || '#bfdbfe'}` }}>
            {step.label}
          </div>
          {i < steps.length - 1 && <span style={{ fontSize: 18, color: '#94a3b8', fontWeight: 700 }}>→</span>}
        </>
      ))}
    </div>
  );
}

/* ──────────────── CONTENT SECTIONS ──────────────── */
function IntroSection() {
  return (
    <section id="intro">
      <div style={s.sectionCard}>
        <p style={s.p}>The <strong>SCM + WHM System</strong> is a complete Supply Chain Management and Warehouse Management System designed to manage inventory, warehouse operations, stock movement, and order processing in one centralized platform.</p>
        <p style={s.p}>The system helps businesses track materials from inward receipt to final dispatch while providing real-time visibility of stock across warehouses, racks, shelves, and storage locations.</p>
        
        <SectionTitle>System Capabilities</SectionTitle>
        <div style={s.featureGrid}>
          {[
            ['📥', 'Inward & Outward Processing', 'Full material receiving and dispatch management'],
            ['📦', 'Batch-wise Inventory', 'Manage stock with expiry and batch tracking'],
            ['🏭', 'Multi-location Warehouse', 'Track stock across zones, racks and shelves'],
            ['📊', 'Dashboard & Reports', 'Real-time analytics and downloadable reports'],
            ['🔄', 'Put-away & Picking', 'Guided warehouse operations'],
            ['👥', 'Role-based Access', 'User-specific permissions and controls'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={s.featureCard}>
              <span style={{ fontSize: 26, display: 'block', marginBottom: 8 }}>{icon}</span>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>

        <SectionTitle>Who Uses This System</SectionTitle>
        <Table
          headers={['Role', 'Responsibilities']}
          rows={[
            ['🏭 Warehouse Manager', 'Monitor warehouse operations, manage storage locations, track stock movement'],
            ['📦 Inventory Manager', 'Maintain stock accuracy, monitor inward and outward transactions'],
            ['🚚 Dispatch Team', 'Manage package creation, carton handling, shipment preparation'],
            ['🛒 Purchase Team', 'Track material availability and inventory movement'],
            ['💼 Business Owner', 'View dashboards and analyze warehouse performance'],
            ['⚙️ System Admin', 'Manage users, permissions, and master setup'],
          ]}
        />
      </div>
    </section>
  );
}

function AppFlowSection() {
  return (
    <section id="app-flow">
      <div style={s.sectionCard}>
        <p style={s.p}>The SCM system follows a structured warehouse and inventory workflow from material receipt to final dispatch and stock monitoring.</p>

        <SectionTitle>Complete Workflow</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, margin: '16px 0' }}>
          {[
            ['1','Supplier / Customer Setup','Configure vendors and customers in Master'],
            ['2','Warehouse Setup','Create warehouses, zones, racks & shelves'],
            ['3','Product Setup','Define products with stock levels and attributes'],
            ['4','Purchase Order','Create PO to procure inventory from vendors'],
            ['5','GRN (Goods Receipt)','Record incoming materials and quality inspect'],
            ['6','Put-away','Move stock to actual warehouse storage locations'],
            ['7','Stock Balance','Real-time inventory becomes available'],
            ['8','Sales Order','Customer order triggers stock reservation'],
            ['9','Order Picking','Pick reserved stock from warehouse locations'],
            ['10','Order Packing','Pack picked items into boxes for shipment'],
            ['11','Dispatch','Ship packed orders to customers with invoice'],
          ].map(([num, title, desc]) => (
            <div key={num} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#2563eb',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{num}</div>
                {parseInt(num) < 11 && <div style={{ width: 2, height: 20, background: '#dbeafe', margin: '2px 0' }} />}
              </div>
              <div style={{ paddingBottom: 4 }}>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{title}</span>
                <span style={{ color: '#64748b', fontSize: 13, marginLeft: 8 }}>— {desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardSection() {
  return (
    <section id="dashboard">
      <div style={s.sectionCard}>
        <p style={s.p}>The Dashboard is the central monitoring screen of the SCM System. It provides a real-time overview of warehouse status, sales activity, purchase transactions, and stock availability in a single screen.</p>

        <SectionTitle>KPI Cards</SectionTitle>
        <Table
          headers={['KPI Card', 'What It Shows', 'Tooltip Details']}
          rows={[
            ['👥 Active Customers', 'Number of active customers in the system', 'Total / Active / Inactive customers'],
            ['🏭 Active Suppliers', 'Number of active suppliers available for purchase', 'Total / Active / Inactive suppliers'],
            ['📦 Active Products', 'Number of active products in inventory', 'Total / Active / Inactive products'],
            ['⏳ Material Awaiting', 'Purchase orders created but materials not yet received', 'Helps manage incoming stock planning'],
            ['📊 Total Stock Available', 'Current available inventory (On Hand − Reserved)', 'Formula: Available = On Hand Qty − Reserved Qty'],
            ['⚠️ Total Expired Qty', 'Total quantity of expired inventory in stock', 'Helps improve stock rotation practices'],
          ]}
        />

        <SectionTitle>Sales & Purchase Summary</SectionTitle>
        <Table
          headers={['Metric', 'Description']}
          rows={[
            ['Total Sold QTY', 'Total quantity dispatched through customer orders'],
            ['Total Sold Amount', 'Total sales invoice value'],
            ['Total Purchased QTY', 'Total quantity received from purchase orders'],
            ['Purchased Amount', 'Total purchase value received into inventory'],
          ]}
        />

        <SectionTitle>Warehouse Status Chart</SectionTitle>
        <p style={s.p}>A pie chart showing storage utilization across warehouses.</p>
        <Table
          headers={['Status', 'Meaning']}
          rows={[
            ['🟢 Available', 'Storage locations ready for use'],
            ['🔵 Occupied', 'Locations currently storing inventory'],
            ['🔴 Restricted', 'Locations blocked or unavailable for operations'],
          ]}
        />

        <SectionTitle>Sales vs Purchase Analytics</SectionTitle>
        <p style={s.p}>A bar chart comparing warehouse inward and outward inventory movement over time.</p>
        <Table
          headers={['View Mode', 'Description']}
          rows={[
            ['Live', 'Displays only the current day\'s sales and purchase activity (default view)'],
            ['Monthly', 'Displays weekly sales and purchase analysis for selected month and year'],
            ['Day Drilldown', 'Click any weekly bar in Monthly view to see detailed day-wise activity'],
          ]}
        />
        <InfoBox icon="💡" color="blue" title="How to use Monthly View">
          Change mode from Live → Monthly, select Year and Month. Click any weekly bar to see day-wise drill-down.
        </InfoBox>

        <SectionTitle>Low Stock Monitoring</SectionTitle>
        <p style={s.p}>Automatically detects products below minimum stock level, pending shortages from sales orders, and replenishment requirements.</p>
        <Table
          headers={['Column', 'Description']}
          rows={[
            ['Product', 'Product name'],
            ['Available Stock', 'Current usable stock quantity'],
            ['Auto PO Qty', 'Automatically suggested purchase quantity'],
            ['Approved Qty', 'Purchase quantity already approved'],
            ['Shortage', 'Quantity shortage based on demand'],
          ]}
        />
      </div>
    </section>
  );
}

function CompanySection() {
  return (
    <section id="company">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Master → Company Details</div>
        <p style={s.p}>The Company Details page maintains your organization's master company information. This information is used in invoice PDF generation and other company-related documents.</p>

        <SectionTitle>Purpose</SectionTitle>
        <p style={s.p}>Stores official company information such as Company Name, GSTIN, PAN Number, Phone, Email, and complete Address. These details are automatically used when generating invoice PDFs.</p>

        <SectionTitle>How to Add a Company</SectionTitle>
        <StepCard number={1} title="Open Company Details Page">Navigate to Master → Company Details</StepCard>
        <StepCard number={2} title="Fill Company Information">Enter Company Name (mandatory), GSTIN, PAN Number, Phone, Email, City, State, Country, and Pincode</StepCard>
        <StepCard number={3} title="Save Company">Click <strong>Save Company</strong>. The company is added and becomes available for invoice PDF generation</StepCard>

        <InfoBox icon="⚠️" color="yellow" title="GSTIN Validation">
          The system checks for duplicate GSTIN numbers. If the same GSTIN already exists, it prevents duplicate creation to maintain unique company records.
        </InfoBox>

        <SectionTitle>Search & Filter</SectionTitle>
        <p style={s.p}>Use the search box to find company records by Company Name, GSTIN, City, or Phone Number.</p>

        <SectionTitle>Important Notes</SectionTitle>
        <InfoBox icon="📌" color="blue">
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 2 }}>
            <li>Company Name is mandatory</li>
            <li>GSTIN must be unique if entered</li>
            <li>Deleted companies cannot be recovered automatically</li>
            <li>Keeping details updated ensures correct billing and documentation</li>
          </ul>
        </InfoBox>
      </div>
    </section>
  );
}

function VendorSection() {
  return (
    <section id="vendor">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Master → Vendors</div>
        <p style={s.p}>A vendor is a supplier who provides raw materials, finished goods, or trading items to the company. Vendors are used during purchase order creation and goods receiving processes.</p>

        <SectionTitle>Why Use the Vendor Page</SectionTitle>
        <ul style={s.ul}>
          <li>Store vendor contact and address details</li>
          <li>Manage supplier lead time and performance rating</li>
          <li>Enable vendor selection during Purchase Order creation</li>
          <li>Maintain accurate procurement and purchasing records</li>
        </ul>

        <InfoBox icon="🔴" color="yellow" title="Inactive Vendors">
          When a vendor is marked Inactive, the system blocks them from future purchase orders without deleting existing records. Previous transaction history remains available for reference and audit.
        </InfoBox>

        <SectionTitle>How to Add a Vendor</SectionTitle>
        <StepCard number={1} title="Navigate to Vendors">Go to Master → Vendors</StepCard>
        <StepCard number={2} title="Fill Vendor Details">Enter vendor name, contact information, address, lead time, and service details</StepCard>
        <StepCard number={3} title="Save Vendor">Click Create Vendor. The vendor is now available for Purchase Order selection</StepCard>
      </div>
    </section>
  );
}

function CustomerSection() {
  return (
    <section id="customer">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Master → Customers</div>
        <p style={s.p}>A customer is a person, company, or business that purchases products or services from the organization. Customers are used during sales order creation, dispatch, and delivery processes.</p>

        <SectionTitle>Why Use the Customer Page</SectionTitle>
        <ul style={s.ul}>
          <li>Store customer contact and address details</li>
          <li>Manage customer communication information</li>
          <li>Enable customer selection during Sales Order creation</li>
          <li>Track active and inactive customers</li>
          <li>Maintain accurate sales and delivery records</li>
        </ul>

        <InfoBox icon="🔴" color="yellow" title="Inactive Customers">
          When a customer is marked Inactive, the system blocks them from future transactions. However, previous transaction history, invoices, dispatch records, and reports remain available for reference and audit.
        </InfoBox>
      </div>
    </section>
  );
}

function WarehouseSection() {
  return (
    <section id="warehouse">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Master → Warehouses</div>
        <p style={s.p}>The Warehouse Master is the foundation of the warehouse management process. Register warehouse facilities where inventory will be received, stored, packed, and dispatched.</p>

        <SectionTitle>Warehouse Master Setup</SectionTitle>
        <p style={s.p}>Each warehouse represents a physical storage location such as a factory warehouse, distribution center, retail stock point, or fulfillment hub. Once created, you can configure:</p>
        <ul style={s.ul}>
          <li>Storage zones, racks & shelves</li>
          <li>Dock areas and packing stations</li>
          <li>Temporary holding and dispatch locations</li>
        </ul>
        <InfoBox icon="✅" color="green">Only <strong>active</strong> warehouses are available for operational transactions and storage mapping.</InfoBox>

        <SectionTitle>Warehouse Storage & Location Configuration</SectionTitle>
        <p style={s.p}>Defines the internal structure of a warehouse. The system auto-generates a unique Warehouse Location ID based on Warehouse, Zone Type, and Rack/Shelf structure.</p>
        <Table
          headers={['Zone Type', 'Purpose']}
          rows={[
            ['Storage', 'Main inventory storage locations (racks and bins)'],
            ['Dispatch', 'Outbound shipment staging areas'],
            ['Dock', 'Loading / unloading bays for inward and outward'],
            ['Pack', 'Packing and labeling stations'],
            ['Temp', 'Temporary inbound/outbound holding areas'],
          ]}
        />

        <SectionTitle>Storage Configuration Fields</SectionTitle>
        <ul style={s.ul}>
          <li><strong>Zone Category</strong> — Category of the storage zone</li>
          <li><strong>Rack & Shelf Mapping</strong> — Physical rack and shelf identifiers</li>
          <li><strong>Floor Level</strong> — L0, L1, L2, L3, L4</li>
          <li><strong>Storage Environment</strong> — Ambient / Cold / Frozen</li>
          <li><strong>Maximum Weight Capacity</strong> — Weight limit per location</li>
          <li><strong>Volume Capacity (CBM)</strong> — Volume limit in cubic meters</li>
          <li><strong>Active / Restricted Status</strong> — Controls availability for operations</li>
        </ul>
      </div>
    </section>
  );
}

function CartonSection() {
  return (
    <section id="carton">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Master → Carton Box</div>
        <p style={s.p}>A carton box is a packaging box used to store, pack, and ship products safely. Each box has defined dimensions and weight capacity used during packing and dispatch operations.</p>

        <SectionTitle>Why Use the Carton Box Page</SectionTitle>
        <ul style={s.ul}>
          <li>Store carton box dimensions and weight details</li>
          <li>Standardize packaging operations across the warehouse</li>
          <li>Select suitable boxes during packing and dispatch</li>
          <li>Manage different box sizes for different products</li>
          <li>Maintain accurate packing and dispatch records</li>
        </ul>

        <InfoBox icon="📦" color="blue" title="How Boxes Are Used">
          During packing, the system automatically calculates how many boxes are needed based on the product's <strong>units_per_box</strong> value. For example: 100 units ÷ 40 per box = 3 boxes (40 + 40 + 20).
        </InfoBox>
      </div>
    </section>
  );
}

function ProductsSection() {
  return (
    <section id="products">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Master → Products</div>
        <p style={s.p}>A product is an item, raw material, finished goods, or trading item stored and managed in the warehouse. Products are used in inventory tracking, stock movement, purchase, sales, packing, and dispatch operations.</p>

        <SectionTitle>Product Configuration</SectionTitle>
        <Table
          headers={['Field', 'Description']}
          rows={[
            ['Product ID', 'Auto-generated unique identifier'],
            ['Name & Barcode', 'Product name and auto-generated barcode for scanning'],
            ['Product Type', 'RM (Raw Material), FG (Finished Goods), TI (Trading Items)'],
            ['Unit & Unit Cost', 'Unit of measure and pricing per unit'],
            ['Minimum Stock Level', 'Triggers auto purchase order when stock falls below this'],
            ['Units Per Box', 'How many units fit in one carton box — used for packaging'],
            ['Storage Type', 'Ambient / Cold / Frozen / Dry / Hazmat'],
            ['ABC Class', 'A = Fast moving, B = Medium, C = Slow moving'],
            ['Expiry Tracking', 'Enable for products with shelf life'],
          ]}
        />

        <SectionTitle>ABC Classification</SectionTitle>
        <Table
          headers={['Class', 'Type', 'Put-Away Priority']}
          rows={[
            ['A', 'High value / Fast moving', 'L0 → L1 → L2 → L3 → L4 (lowest levels first for quick access)'],
            ['B', 'Medium value', 'L2 → L3 → L4 → L0 → L1 (middle levels first)'],
            ['C', 'Low value / Slow moving', 'L4 → L3 → L2 → L1 → L0 (upper levels first)'],
          ]}
        />
      </div>
    </section>
  );
}

function CourierSection() {
  return (
    <section id="courier">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Master → Courier</div>
        <p style={s.p}>The Courier Master helps maintain all courier partner details in one place for shipment processing and tracking. The system automatically generates a unique Courier ID for every record (e.g., CRR-260518-001).</p>

        <SectionTitle>Service Types</SectionTitle>
        <Table
          headers={['Service Type', 'Meaning']}
          rows={[
            ['Air', 'Fast air shipment delivery'],
            ['Express', 'Priority express delivery'],
            ['Surface', 'Ground or road transport delivery'],
          ]}
        />

        <SectionTitle>Coverage Area</SectionTitle>
        <Table
          headers={['Coverage Area', 'Meaning']}
          rows={[
            ['Local', 'Same city delivery'],
            ['Domestic', 'Delivery within country'],
            ['International', 'Overseas shipment delivery'],
          ]}
        />

        <InfoBox icon="🚚" color="blue" title="Dispatch Integration">
          During shipment dispatch, users select the courier from Courier Master. The courier name is stored in the dispatch transaction and shipment history for tracking purposes.
        </InfoBox>
      </div>
    </section>
  );
}

function PurchaseOrderSection() {
  return (
    <section id="purchase-order">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Purchase → PO List</div>
        <p style={s.p}>The Purchase Order module is used to create, manage, approve, receive, hold, and cancel purchase orders for products. It helps the purchasing team track incoming materials from vendors.</p>

        <SectionTitle>Create Purchase Order</SectionTitle>
        <p style={s.p}>Users manually create a PO by entering:</p>
        <ul style={s.ul}>
          <li><strong>Product</strong> — Select the item to purchase</li>
          <li><strong>Ordered Quantity</strong> — How much to order</li>
          <li><strong>Vendor</strong> — Select the supplier</li>
        </ul>
        <p style={s.p}>After creation: PO ID is auto-generated, status is set to <Badge color="green">Approved</Badge>, Expected Date is calculated from vendor lead time.</p>

        <SectionTitle>Purchase Order Status Flow</SectionTitle>
        <StatusFlow steps={[
          { label: 'Approved', color: '#eff6ff', textColor: '#1d4ed8', border: '#bfdbfe' },
          { label: 'Received', color: '#f0fdf4', textColor: '#15803d', border: '#bbf7d0' },
          { label: 'Cancelled', color: '#fef2f2', textColor: '#b91c1c', border: '#fecaca' },
        ]} />
        <Table
          headers={['Status', 'Meaning']}
          rows={[
            [<Badge color="blue">Approved</Badge>, 'PO confirmed and waiting for material receipt'],
            [<Badge color="green">Received</Badge>, 'Materials received and quality check completed'],
            [<Badge color="gray">Auto-Created</Badge>, 'System automatically generated the PO'],
            [<Badge color="red">Cancelled</Badge>, 'Purchase Order is cancelled'],
          ]}
        />

        <SectionTitle>Auto Purchase Orders</SectionTitle>
        <p style={s.p}>The system automatically creates Purchase Orders when stock conditions require replenishment (e.g., when a Sales Order is OPEN or PARTIALLY RESERVED).</p>
        <CodeBlock>
          Auto PO = Minimum Stock + Demand{'\n'}
          {'\n'}If Order Status = OPEN:{'\n'}
          {'  '}Demand = Ordered Quantity{'\n'}
          {'\n'}If Order Status = PARTIALLY_RESERVED:{'\n'}
          {'  '}Demand = Ordered Quantity − Reserved Quantity
        </CodeBlock>

        <SectionTitle>Update Auto Purchase Order</SectionTitle>
        <p style={s.p}>When you click Update on an Auto PO, four actions are available:</p>
        <Table
          headers={['Action', 'Description']}
          rows={[
            ['Recheck', 'Recalculates latest stock requirement. Must be done before approving. May increase, decrease, or eliminate the need for PO'],
            ['Approve', 'Enabled only after Recheck. Converts Auto PO to normal PO with vendor and delivery date'],
            ['Hold Order', 'Temporarily keeps PO pending — useful when purchasing decisions are delayed'],
            ['Cancel Order', 'Cancels the PO permanently'],
          ]}
        />
        <InfoBox icon="⚠️" color="yellow" title="Important">
          You cannot directly approve an Auto Purchase Order. The <strong>Approve</strong> button is disabled until you click <strong>Recheck</strong> first.
        </InfoBox>
      </div>
    </section>
  );
}

function GRNSection() {
  return (
    <section id="grn">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Purchase → GRN</div>
        <p style={s.p}>A GRN (Goods Receipt Note) is created when goods are received from a vendor against an Approved Purchase Order. It confirms that ordered materials have physically arrived at the warehouse.</p>

        <SectionTitle>GRN Form Fields</SectionTitle>
        <Table
          headers={['Field', 'Description']}
          rows={[
            ['Purchase Order', 'Select an Approved PO (cancelled/completed POs not shown)'],
            ['Warehouse', 'Warehouse where material is received'],
            ['Dock Location', 'Receiving dock — loaded automatically after warehouse selection'],
            ['Vendor Invoice No', 'Unique vendor invoice reference (must not be duplicate)'],
            ['Vendor Invoice Date', 'Date on the vendor invoice'],
            ['Invoice Amount', 'Total invoice value — updates PO total cost'],
            ['E-Way Bill', 'Transport e-way bill number'],
            ['Vehicle Number', 'Vehicle used for delivery'],
          ]}
        />

        <SectionTitle>After GRN Creation</SectionTitle>
        <ul style={s.ul}>
          <li>Purchase Order status changes: <Badge color="blue">Approved</Badge> → <Badge color="green">Received</Badge></li>
          <li>PO Total Cost is updated from the Invoice Amount</li>
        </ul>

        <SectionTitle>Material Inspection (Quality Check)</SectionTitle>
        <p style={s.p}>After GRN, perform quality inspection to verify received materials before accepting into inventory.</p>
        <Table
          headers={['Field', 'Description']}
          rows={[
            ['Expiry Date', 'Mandatory if product has expiry tracking enabled'],
            ['Received Quantity', 'Auto-loaded from PO quantity — cannot be modified'],
            ['Accepted Quantity', 'Quantity that passed quality check'],
            ['Rejected Quantity', 'Auto-calculated: Received Qty − Accepted Qty'],
            ['Rejection Reason', 'Why items were rejected (damaged, incorrect, etc.)'],
          ]}
        />

        <InfoBox icon="📋" color="blue" title="Batch Auto-Generation">
          After Material Inspection, the system automatically creates Batch Numbers (B-001, B-002, etc.). Each product maintains its own separate batch sequence. Batches are linked with Product, GRN, Expiry Date, and Accepted Quantity.
        </InfoBox>

        <SectionTitle>After Material Inspection</SectionTitle>
        <ul style={s.ul}>
          <li>GRN status changes: <Badge color="blue">Received</Badge> → <Badge color="green">QC Completed</Badge></li>
          <li>PutAway Tasks are automatically created for accepted quantities</li>
          <li>Auto Stock Reserve function is triggered after PutAway process</li>
        </ul>
      </div>
    </section>
  );
}

function PutawaySection() {
  return (
    <section id="putaway">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Purchase → Putaway</div>
        <p style={s.p}>PutAway Tasks are warehouse activities created automatically after GRN quality checking. They guide warehouse users to move inventory from the receiving dock to actual storage locations.</p>

        <SectionTitle>Task Status</SectionTitle>
        <Table
          headers={['Status', 'Meaning']}
          rows={[
            [<Badge color="yellow">PENDING</Badge>, 'Waiting for warehouse user confirmation'],
            [<Badge color="green">COMPLETED</Badge>, 'Putaway confirmed and stock added to inventory'],
            [<Badge color="red">CANCELLED</Badge>, 'Remaining tasks auto-cancelled after full quantity placed'],
            [<Badge color="gray">UNASSIGNED</Badge>, 'No suitable storage location available — uses TEMP-IN'],
          ]}
        />

        <SectionTitle>Suggested Location Logic</SectionTitle>
        <p style={s.p}>The system automatically suggests storage locations based on:</p>
        <Table
          headers={['ABC Class', 'Product Type', 'Floor Priority']}
          rows={[
            ['A Class', 'Fast moving', 'L0 → L1 → L2 → L3 → L4'],
            ['B Class', 'Medium moving', 'L2 → L3 → L4 → L0 → L1'],
            ['C Class', 'Slow moving', 'L4 → L3 → L2 → L1 → L0'],
          ]}
        />

        <SectionTitle>Capacity Validation</SectionTitle>
        <p style={s.p}>Before confirming putaway, the system validates weight and volume limits. If the quantity exceeds location capacity, the system blocks confirmation with a popup alert.</p>
        <CodeBlock>
          Available Space = Total Volume − Occupied Volume − Reserved Volume
        </CodeBlock>

        <SectionTitle>After Putaway Confirmation</SectionTitle>
        <ul style={s.ul}>
          <li>Stock is inserted into <strong>Stock Balance</strong> table (available for orders)</li>
          <li>Stock Ledger entry created with movement type: <Badge color="blue">PUT AWAY</Badge></li>
          <li>Warehouse occupied weight and volume are updated</li>
          <li>If full GRN quantity placed in one task, remaining tasks are auto-cancelled</li>
        </ul>
      </div>
    </section>
  );
}

function StockOverviewSection() {
  return (
    <section id="stock-overview">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Inventory → Stock Overview</div>
        <p style={s.p}>The Stock Overview page provides a centralized dashboard for monitoring inventory performance, warehouse stock value, order activity, vendor performance, and customer purchase trends.</p>

        <SectionTitle>KPI Summary Cards</SectionTitle>
        <Table
          headers={['KPI Card', 'Description']}
          rows={[
            ['📦 Waiting Orders', 'Orders still pending or waiting for completion'],
            ['✅ Completed Orders', 'Successfully completed and fulfilled orders'],
            ['❌ Cancelled Orders', 'Cancelled orders — identifies cancellation trends'],
            ['⏳ Expiring Today', 'Inventory batches expiring today — requires immediate action'],
            ['📊 Demand', 'Current unfulfilled product demand quantity'],
            ['🧾 Total Order', 'Total order value — quick financial overview'],
          ]}
        />

        <SectionTitle>Warehouse Inventory Value Chart</SectionTitle>
        <p style={s.p}>A donut-style pie chart showing inventory value distribution across warehouses. Displays Warehouse ID, inventory value, and percentage contribution. Helps compare which warehouse holds the most inventory value.</p>

        <SectionTitle>Stock by Type Chart</SectionTitle>
        <p style={s.p}>Horizontal animated bar chart showing stock quantity by product type:</p>
        <Table
          headers={['Code', 'Product Type']}
          rows={[
            ['RM', 'Raw Materials'],
            ['FG', 'Finished Goods'],
            ['TI', 'Trading Items'],
          ]}
        />

        <SectionTitle>Vendor Performance Table</SectionTitle>
        <Table
          headers={['Metric', 'Description']}
          rows={[
            ['Total Purchase', 'Total cost of all purchase orders for the vendor'],
            ['Completed Orders', 'Orders successfully completed by vendor'],
            ['On-Time', 'Percentage of orders delivered on or before promised date'],
            ['Lead Time', 'Average time from placing an order to receiving it'],
            ['Reject Rate', 'Percentage of defective or rejected items'],
          ]}
        />

        <SectionTitle>Customer Performance Table</SectionTitle>
        <p style={s.p}>Customers are automatically sorted by highest spending. Top customers are highlighted:</p>
        <Table
          headers={['Indicator', 'Meaning']}
          rows={[
            ['🥇 Gold', 'Highest spending customer'],
            ['🥈 Silver', 'Second highest spending customer'],
            ['🥉 Bronze', 'Third highest spending customer'],
          ]}
        />
      </div>
    </section>
  );
}

function BatchesSection() {
  return (
    <section id="batches">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Inventory → Batches</div>
        <p style={s.p}>The Batches page monitors product batches based on expiry dates. It helps identify expired stock, products close to expiry, and safe stock in the warehouse. On page load, a popup alert appears for expired products and those expiring within 30 days.</p>

        <SectionTitle>Expiry Indicators</SectionTitle>
        <Table
          headers={['Color', 'Alert Level', 'Condition']}
          rows={[
            ['🟢 Green', 'SAFE', 'Expiry more than 30 days away'],
            ['🟡 Yellow', 'WARNING', 'Expiry within 30 days'],
            ['🔴 Red', 'CRITICAL / EXPIRED', 'Expiry within 7 days or already expired'],
          ]}
        />

        <SectionTitle>Days Left Field</SectionTitle>
        <Table
          headers={['Value', 'Meaning']}
          rows={[
            ['Positive number (e.g. 120)', 'Product is still valid and safe'],
            ['Less than 30 (e.g. 12)', 'Product is expiring soon — plan to use or dispatch'],
            ['Negative number (e.g. -5)', 'Product already expired 5 days ago'],
          ]}
        />

        <SectionTitle>Inventory Value Calculation</SectionTitle>
        <CodeBlock>
          Batch Value = Stock Quantity × Product Unit Cost{'\n'}
          Example: Qty = 100 × Unit Cost ₹50 = ₹5,000
        </CodeBlock>
        <InfoBox icon="💡" color="blue" title="Why Batch Value Matters">
          Helps management understand the financial impact of expiring stock and prioritize actions to prevent losses.
        </InfoBox>
      </div>
    </section>
  );
}

function MovementsSection() {
  return (
    <section id="movements">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Inventory → Movements (Stock Ledger)</div>
        <p style={s.p}>The Stock Ledger tracks every inventory movement in the system from receiving stock until dispatch. Each transaction automatically creates a new ledger entry with Before Qty, Moved Qty, and After Qty.</p>

        <SectionTitle>Movement Types</SectionTitle>
        <Table
          headers={['Movement Type', 'Description', 'Sign']}
          rows={[
            [<Badge color="green">PUT AWAY</Badge>, 'Stock moved from Dock Location to storage location after GRN', '+'],
            [<Badge color="blue">RESERVE</Badge>, 'Full stock quantity reserved for a Sales Order', '−'],
            [<Badge color="yellow">PARTIALLY RESERVED</Badge>, 'Partial stock reserved due to insufficient availability', '−'],
            [<Badge color="gray">RESERVATION CANCELLED</Badge>, 'Reserved stock released back to available inventory', '+'],
            [<Badge color="red">OUT</Badge>, 'Stock physically picked from storage for packing', '−'],
            [<Badge color="purple">PACKAGED</Badge>, 'Picked stock moved into package / dispatch area', '−'],
            [<Badge color="red">DISPATCH</Badge>, 'Final shipment dispatched to customer', '−'],
          ]}
        />

        <SectionTitle>Reading the Ledger</SectionTitle>
        <Table
          headers={['Field', 'Description']}
          rows={[
            ['From Location', 'Where stock was moved from (e.g., DOCK-01, RACK-A-01)'],
            ['To Location', 'Where stock was moved to (e.g., RACK-A-01, PACKING-ZONE)'],
            ['Batch', 'Batch number for full traceability and FEFO management'],
            ['Before Qty', 'Available quantity before this transaction'],
            ['Moved Qty', '+ for additions, − for deductions/reservations'],
            ['After Qty', 'Final available quantity after transaction (Before + Moved)'],
          ]}
        />
        <CodeBlock>
          After Qty = Before Qty + Moved Qty{'\n'}
          Example (Putaway): 20 + 30 = 50{'\n'}
          Example (Reserve): 50 + (-10) = 40
        </CodeBlock>
      </div>
    </section>
  );
}

function StockViewSection() {
  return (
    <section id="stock-view">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Inventory → Stock View</div>
        <p style={s.p}>The Stock View page monitors current inventory available inside the warehouse. When a Putaway Task is completed, the system automatically inserts the material into Stock Balance, making it available for reservations, picking, sales order processing, and dispatch.</p>

        <SectionTitle>Stock Balance Fields</SectionTitle>
        <Table
          headers={['Field', 'Description']}
          rows={[
            ['Product', 'Material or item available in stock'],
            ['Warehouse', 'Warehouse where stock is stored'],
            ['Location', 'Exact storage location inside warehouse'],
            ['Batch', 'Batch number assigned during GRN and putaway'],
            ['Expiry', 'Product expiry date (if applicable)'],
            ['On Hand', 'Total physically available stock'],
            ['Reserved', 'Quantity reserved for sales orders'],
            ['Updated', 'Last stock update date and time'],
          ]}
        />

        <SectionTitle>Stock Balance Workflow</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '12px 0' }}>
          {['GRN Completed', 'Putaway Task Created', 'Putaway Confirmed', 'Stock Added to Stock Balance', 'Sales Order Checks Available Stock', 'Inventory Reservation Created', 'Pick Task Generated'].map((step, i, arr) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: '#374151' }}>{step}</span>
              {i < arr.length - 1 && <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 12 }}>↓</span>}
            </div>
          ))}
        </div>
        <InfoBox icon="💡" color="blue" title="Tip">
          Use Stock View during Sales Order processing to verify stock availability before creating reservations. This prevents over-allocation and stock shortages.
        </InfoBox>
      </div>
    </section>
  );
}

function SalesOrderSection() {
  return (
    <section id="sales-order">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Orders → Sales Orders</div>
        <p style={s.p}>A Sales Order is a customer order created to reserve, pick, pack, and dispatch products from warehouse inventory. The system automatically checks stock availability during creation and updates inventory reservations accordingly.</p>

        <SectionTitle>Create Sales Order</SectionTitle>
        <Table
          headers={['Field', 'Description']}
          rows={[
            ['Product', 'Product requested by customer'],
            ['Customer', 'Customer placing the order'],
            ['Ordered Quantity', 'Quantity required by customer'],
          ]}
        />
        <p style={s.p}>After saving, the system automatically: verifies inventory, checks expiry dates, reserves available stock, updates stock balances, creates stock ledger entries, generates Sales Order Number, and creates Pick Tasks (for fully reserved orders).</p>

        <SectionTitle>Sales Order Status Flow</SectionTitle>
        <StatusFlow steps={[
          { label: 'OPEN', color: '#fef9c3', textColor: '#854d0e', border: '#fde047' },
          { label: 'PARTIALLY RESERVED', color: '#fff7ed', textColor: '#c2410c', border: '#fdba74' },
          { label: 'RESERVED', color: '#eff6ff', textColor: '#1d4ed8', border: '#bfdbfe' },
          { label: 'ISSUED', color: '#f0fdf4', textColor: '#15803d', border: '#bbf7d0' },
          { label: 'DISPATCHED', color: '#faf5ff', textColor: '#7e22ce', border: '#e9d5ff' },
        ]} />

        <div style={s.statusBlock}>
          <div style={s.statusHeader}><Badge color="yellow">OPEN</Badge></div>
          <p style={s.p}>No stock available. System waits for stock and auto-creates a Purchase Order based on demand. Once stock arrives via PutAway, system automatically reserves and updates status.</p>
          <CodeBlock>Demand = Ordered Quantity{'\n'}Auto PO = Minimum Stock + Demand</CodeBlock>
        </div>

        <div style={s.statusBlock}>
          <div style={s.statusHeader}><Badge color="yellow">PARTIALLY RESERVED</Badge></div>
          <p style={s.p}>Only partial stock is available (e.g., ordered 100, available 40). Available stock is reserved. Remaining quantity waits for new stock. System auto-creates a PO for the shortfall.</p>
          <CodeBlock>Demand = Ordered Qty − Reserved Qty{'\n'}Auto PO = Minimum Stock + Demand</CodeBlock>
        </div>

        <div style={s.statusBlock}>
          <div style={s.statusHeader}><Badge color="blue">RESERVED</Badge></div>
          <p style={s.p}>Full ordered quantity is available and reserved. Batch numbers and warehouse locations are assigned. Pick Tasks are automatically generated for warehouse operations.</p>
        </div>

        <div style={s.statusBlock}>
          <div style={s.statusHeader}><Badge color="green">ISSUED → DISPATCHED</Badge></div>
          <p style={s.p}>After picking is completed, order status becomes <strong>ISSUED</strong>. After packing and dispatch are completed, status becomes <strong>DISPATCHED</strong>. Invoice is auto-generated.</p>
        </div>

        <SectionTitle>Cancellation Behavior</SectionTitle>
        <Table
          headers={['From Status', 'What Happens on Cancel']}
          rows={[
            ['OPEN', 'Only order status changes — no stock movement occurs'],
            ['PARTIALLY RESERVED', 'Reserved stock is released back to available inventory'],
            ['RESERVED', 'Reserved stock is released, Pick Tasks are also cancelled'],
          ]}
        />
      </div>
    </section>
  );
}

function PickingSection() {
  return (
    <section id="picking">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Orders → Picking</div>
        <p style={s.p}>The Picking page is used to pick reserved inventory from warehouse storage locations for sales orders. Picking tasks are created automatically when a Sales Order becomes fully RESERVED.</p>

        <SectionTitle>Picking Task Status</SectionTitle>
        <Table
          headers={['Status', 'Meaning']}
          rows={[
            [<Badge color="yellow">PENDING</Badge>, 'Waiting for warehouse user to pick'],
            [<Badge color="green">Completed</Badge>, 'All picking tasks for this order completed'],
            [<Badge color="red">Short_Picked</Badge>, 'Picked less quantity than required'],
          ]}
        />

        <SectionTitle>Why Picking Splits into Multiple Rows</SectionTitle>
        <p style={s.p}>One sales order may reserve stock from multiple batches and warehouse locations. The system creates one row per batch/location combination for accurate tracking.</p>
        <CodeBlock>
          Example: Order Qty = 100{'\n'}
          {'  '}Batch B-001, Location L1-A-01: Pick 40 units{'\n'}
          {'  '}Batch B-002, Location L1-A-02: Pick 35 units{'\n'}
          {'  '}Batch B-003, Location L2-B-01: Pick 25 units{'\n'}
          Result: 3 picking task rows for one order
        </CodeBlock>

        <SectionTitle>Packing Zone Selection</SectionTitle>
        <p style={s.p}>When completing a picking task, select the Packing Zone where picked stock will be moved. Only locations with <strong>zone_type = 'Pack'</strong> from the same warehouse are shown.</p>

        <SectionTitle>After All Picking Tasks Completed</SectionTitle>
        <ul style={s.ul}>
          <li>Stock Balances: on-hand qty and reserved qty are reduced by picked qty</li>
          <li>Orders table: Issued quantity updated, status changes to <Badge color="green">ISSUED</Badge></li>
          <li>Stock Ledger entry created with movement type <Badge color="red">OUT</Badge>, reference <strong>PICKING</strong></li>
          <li>Package details are automatically created for packing and dispatch</li>
          <li>Warehouse location capacity (weight/volume) is freed up</li>
        </ul>
      </div>
    </section>
  );
}

function PackingSection() {
  return (
    <section id="packing">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Orders → Packaging</div>
        <p style={s.p}>The Package page manages packed boxes after picking completion. Packages are created automatically after all picking tasks for a sales order are completed.</p>

        <SectionTitle>Package Status</SectionTitle>
        <Table
          headers={['Status', 'Meaning']}
          rows={[
            [<Badge color="yellow">Open</Badge>, 'Package created, dispatch location not yet assigned'],
            [<Badge color="green">PACKED</Badge>, 'Dispatch location assigned — ready for dispatch'],
          ]}
        />

        <SectionTitle>Box Split Logic</SectionTitle>
        <p style={s.p}>The system automatically calculates the number of boxes using the product's <strong>units_per_box</strong> setting.</p>
        <CodeBlock>
          Total Qty = 100, Units Per Box = 40{'\n'}
          → Box 1: 40 units{'\n'}
          → Box 2: 40 units{'\n'}
          → Box 3: 20 units{'\n'}
          Total: 3 boxes
        </CodeBlock>
        <p style={s.p}>Each box also calculates total weight and volume for dispatch planning and storage validation.</p>

        <SectionTitle>Dispatch Type Selection</SectionTitle>
        <Table
          headers={['Dispatch Type', 'Location Filter', 'Volume Check']}
          rows={[
            ['Direct Dispatch', 'zone_type = Dock only', 'No volume validation'],
            ['Store Location', 'zone_type = Dispatch only', 'Volume validated against available space'],
          ]}
        />

        <InfoBox icon="📦" color="blue" title="Available Space Calculation">
          Available Space = Total Volume − Occupied Volume − Reserved Volume
        </InfoBox>
      </div>
    </section>
  );
}
function ReadyDispatchSection() {
  return (
    <section id="ready-dispatch-list">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Dispatch → Ready Dispatch List</div>

        <p style={s.p}>
          The Ready Dispatch List page is used by the Dispatch Team to view all
          packed orders that are waiting for shipment dispatch. This screen
          helps users quickly identify customer orders that are ready to ship,
          package details, dispatch location information, and pending dispatch
          workload.
        </p>

        <SectionTitle>Purpose of Ready Dispatch List</SectionTitle>

        <p style={s.p}>
          After Packaging is completed, the order status becomes{" "}
          <strong>PACKED</strong>. All packed orders are automatically displayed
          in the Ready Dispatch List.
        </p>

        <Table
          headers={["Function", "Description"]}
          rows={[
            ["View Pending Orders", "Display all orders waiting for dispatch"],
            ["Track Shipment Details", "Review packed package information before shipping"],
            ["Verify Batch Information", "Validate batch and product details"],
            ["Check Dispatch Location", "Identify warehouse dispatch location"],
            ["Monitor Workload", "Track pending dispatch quantity and orders"],
            ["Courier Preparation", "Prepare courier allocation and invoice processing"],
          ]}
        />

        <SectionTitle>Search Function</SectionTitle>

        <p style={s.p}>
          The Ready Dispatch List includes a search box that allows dispatch
          users to quickly locate shipment-ready orders.
        </p>

        <Table
          headers={["Search By", "Purpose"]}
          rows={[
            ["Order Number", "Find a specific customer order"],
            ["Product Name", "Search using product description"],
            ["Product ID", "Search using product code"],
            ["Batch Number", "Locate a specific inventory batch"],
            ["Package ID", "Find a packed shipment package"],
            ["Dispatch Location", "Search by warehouse dispatch location"],
          ]}
        />

        <SectionTitle>Dispatch Workflow</SectionTitle>

        <StatusFlow
          steps={[
            {
              label: "PACKED",
              color: "#eff6ff",
              textColor: "#1d4ed8",
              border: "#bfdbfe",
            },
            {
              label: "READY FOR DISPATCH",
              color: "#fef9c3",
              textColor: "#854d0e",
              border: "#fde047",
            },
            {
              label: "DISPATCHED",
              color: "#f0fdf4",
              textColor: "#15803d",
              border: "#bbf7d0",
            },
          ]}
        />

        <div style={s.statusBlock}>
          <div style={s.statusHeader}>
            <Badge color="blue">PACKED</Badge>
          </div>
          <p style={s.p}>
            Packaging is completed and all package information has been
            confirmed. The order automatically appears in the Ready Dispatch
            List and waits for dispatch processing.
          </p>
        </div>

        <div style={s.statusBlock}>
          <div style={s.statusHeader}>
            <Badge color="yellow">READY FOR DISPATCH</Badge>
          </div>
          <p style={s.p}>
            Dispatch users verify package information, shipment quantity, batch
            details, and dispatch location. Courier allocation and shipment
            preparation activities are performed during this stage.
          </p>
        </div>

        <div style={s.statusBlock}>
          <div style={s.statusHeader}>
            <Badge color="green">DISPATCHED</Badge>
          </div>
          <p style={s.p}>
            Shipment has been handed over to the courier and dispatch is
            completed. The order is removed from the Ready Dispatch List and
            moved to shipment tracking and delivery processes.
          </p>
        </div>

        <SectionTitle>Dispatch Team Benefits</SectionTitle>

        <Table
          headers={["Benefit", "Description"]}
          rows={[
            ["Pending Dispatch Visibility", "Know how many orders are waiting for shipment"],
            ["Package Verification", "Confirm package readiness before dispatch"],
            ["Quantity Validation", "Verify shipment quantities"],
            ["Batch Verification", "Validate product batch information"],
            ["Courier Planning", "Prepare courier allocation efficiently"],
            ["Error Prevention", "Reduce shipping and dispatch mistakes"],
          ]}
        />

        <SectionTitle>System Conditions</SectionTitle>

        <Table
          headers={["Condition", "Behavior"]}
          rows={[
            ["PACKED Orders", "Only orders with PACKED status appear in this page"],
            ["Dispatch Completed", "Order is automatically removed from the list"],
            ["Shipment Confirmed", "Order disappears after shipment confirmation"],
          ]}
        />
      </div>
    </section>
  );
}


function DispatchSection() {
  return (
    <section id="dispatch">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Dispatch → Dispatch List</div>
        <p style={s.p}>The Dispatch module dispatches packed customer orders from the warehouse. Only orders that are already packed and marked as <strong>Ready for Dispatch</strong> (PACKED status) appear in the dispatch creation page.</p>

        <SectionTitle>Create Dispatch</SectionTitle>
        <Table
          headers={['Field', 'Description']}
          rows={[
            ['Order ID', 'Shows only packed orders ready for dispatch'],
            ['Courier Service', 'Select from couriers created in Courier Master'],
            ['Dispatch Location', 'Active Dock locations from Warehouse Storage'],
          ]}
        />

        <SectionTitle>System Validations</SectionTitle>
        <ul style={s.ul}>
          <li>Only packed orders can be dispatched</li>
          <li>Issued quantity must be greater than zero</li>
          <li>Product and order must exist in the system</li>
          <li>Dispatch location must be an active dock location</li>
        </ul>

        <SectionTitle>After Dispatch Completion</SectionTitle>
        <ul style={s.ul}>
          <li>Stock Ledger entries created with movement type: <Badge color="red">DISPATCH</Badge></li>
          <li>Packed stock quantity deducted batch-wise</li>
          <li>Order status updated to <Badge color="purple">DISPATCHED</Badge></li>
          <li>Customer invoice is automatically generated</li>
        </ul>

        <SectionTitle>Auto-Generated Invoice</SectionTitle>
        <Table
          headers={['Invoice Field', 'Description']}
          rows={[
            ['Invoice Number', 'Auto-generated unique invoice number'],
            ['Invoice Date', 'Current system date'],
            ['Base Amount', 'Quantity × Unit Cost'],
            ['GST Amount', 'Calculated GST value'],
            ['Total Amount', 'Base Amount + GST'],
            ['Status', 'Generated'],
          ]}
        />
        <InfoBox icon="⚠️" color="yellow" title="Invoice Rules">
          One invoice is generated per sales order. Duplicate invoice creation is not allowed — the system automatically detects existing invoices.
        </InfoBox>

        <SectionTitle>E-Way Bill</SectionTitle>
        <p style={s.p}>Once an invoice is generated, it automatically becomes available in the E-Way Bill creation form. E-Way Bills can only be created for invoices without existing E-Way Bills. Duplicate creation is restricted.</p>
      </div>
    </section>
  );
}

function PurchaseReportSection() {
  return (
    <section id="purchase-report">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Reports → Inventory</div>
        <p style={s.p}>The Purchase Order Report provides a detailed summary of purchase order activity within a selected date range. Supports both on-screen viewing and PDF export.</p>

        <SectionTitle>Report Filters</SectionTitle>
        <Table
          headers={['Filter', 'Description']}
          rows={[
            ['From Date', 'Start date for the report range'],
            ['To Date', 'End date for the report range'],
            ['Order Date (default)', 'Shows POs created between the selected dates'],
            ['Received Date', 'Shows POs where inventory was received in the selected period'],
          ]}
        />

        <SectionTitle>How to Generate a Report</SectionTitle>
        <StepCard number={1} title="Select Date Range">Choose From Date and To Date</StepCard>
        <StepCard number={2} title="Choose Filter Type">Select Order Date or Received Date (defaults to Order Date)</StepCard>
        <StepCard number={3} title="Generate Report">Click Generate Report to display matching records. "No Data" appears if no records found</StepCard>
        <StepCard number={4} title="Download PDF (Optional)">Click Download PDF to export a professional formatted report as Purchase_Report.pdf</StepCard>
      </div>
    </section>
  );
}

function SalesReportSection() {
  return (
    <section id="sales-report">
      <div style={s.sectionCard}>
        <div style={s.navPath}>Reports → Orders</div>
        <p style={s.p}>The Sales Order Report provides a summary of sales order activity within a selected date range with status filtering. Supports pagination and PDF download.</p>

        <SectionTitle>Report Filters</SectionTitle>
        <Table
          headers={['Filter', 'Description']}
          rows={[
            ['From Date', 'Start date for the report range'],
            ['To Date', 'End date for the report range'],
            ['Order Date (default)', 'Shows orders created during the selected period'],
            ['Delivery Date', 'Shows orders delivered during the selected period'],
          ]}
        />

        <SectionTitle>Status Filter</SectionTitle>
        <Table
          headers={['Status Filter', 'Description']}
          rows={[
            ['All Status (default)', 'Displays all sales orders'],
            ['Delivered', 'Orders with Completed status'],
            ['Cancelled', 'Cancelled sales orders'],
            ['Not Delivered', 'Pending or incomplete orders'],
          ]}
        />

        <SectionTitle>Report Workflow</SectionTitle>
        <StepCard number={1} title="Select Dates">Choose From Date and To Date</StepCard>
        <StepCard number={2} title="Choose Filter Type">Order Date or Delivery Date</StepCard>
        <StepCard number={3} title="Select Status Filter">All Status / Delivered / Cancelled / Not Delivered</StepCard>
        <StepCard number={4} title="Generate & Review">Click Generate Report, navigate pages using Previous/Next buttons</StepCard>
        <StepCard number={5} title="Download PDF">Click Download PDF to export as Sales_Report.pdf with full details</StepCard>
      </div>
    </section>
  );
}

/* ─────────────────── SECTION MAP ─────────────────── */
const SECTION_COMPONENTS = {
  cover: CoverSection, 
  intro: IntroSection,
  'app-flow': AppFlowSection,
  dashboard: DashboardSection,
  company: CompanySection,
  vendor: VendorSection,
  customer: CustomerSection,
  warehouse: WarehouseSection,
  carton: CartonSection,
  products: ProductsSection,
  courier: CourierSection,
  'purchase-order': PurchaseOrderSection,
  grn: GRNSection,
  putaway: PutawaySection,
  'stock-overview': StockOverviewSection,
  batches: BatchesSection,
  movements: MovementsSection,
  'stock-view': StockViewSection,
  'sales-order': SalesOrderSection,
  picking: PickingSection,
  packing: PackingSection,
  'ready-dispatch-list':ReadyDispatchSection,
  dispatch: DispatchSection,
  'purchase-report': PurchaseReportSection,
  'sales-report': SalesReportSection,
};

/* ─────────────────── MAIN COMPONENT ─────────────────── */
export default function Help() {
  const [activeSection, setActiveSection] = useState('cover');
  const [openGroups, setOpenGroups] = useState(() => {
    const obj = {};
    NAV.forEach(g => { obj[g.id] = true; });
    return obj;
  });
  const [search, setSearch] = useState('');
  const mainRef = useRef(null);

  useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const section = params.get('section');
  if (section && SECTION_COMPONENTS[section]) {
    setActiveSection(section);
  }
}, []);

  const filteredSections = search.trim()
    ? ALL_SECTIONS.filter(s => s.label.toLowerCase().includes(search.toLowerCase()))
    : null;

  const navigateTo = (id) => {
    setActiveSection(id);
    setSearch('');
    if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleGroup = (id) => setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));

  const ActiveComp = SECTION_COMPONENTS[activeSection] || IntroSection;
  const activeLabel = ALL_SECTIONS.find(s => s.id === activeSection)?.label || '';
  const activeGroup = NAV.find(g => g.children.some(c => c.id === activeSection));

  return (
    <div className="fade-in">
      {/* ── Back to Dashboard ── */}
      <div style={{ padding: '12px 0 0' }}>
        <button
          onClick={() => window.location.href = "/dashboard"}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '7px 16px',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            cursor: 'pointer',
          }}
        >
          ← Back to Dashboard
        </button>
      </div>

      <PageHeader title="" breadcrumbs={['Home', 'Help']} />

      <div style={s.layout}>
        {/* ── Sidebar ── */}
        <aside style={s.sidebar}>
          {/* Search */}
          <div style={s.searchWrap}>
            <span style={s.searchIcon}>🔍</span>
            <input
              style={s.searchInput}
              placeholder="Search topics..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {filteredSections && (
            <div style={s.searchResults}>
              {filteredSections.length === 0
                ? <div style={{ padding: '10px 14px', fontSize: 13, color: '#94a3b8' }}>No results found</div>
                : filteredSections.map(sec => (
                  <button key={sec.id} style={s.searchItem} onClick={() => navigateTo(sec.id)}>
                    {sec.label}
                  </button>
                ))
              }
            </div>
          )}

          {!filteredSections && NAV.map(group => (
            <div key={group.id} style={s.navGroup}>
              <button style={s.groupHeader} onClick={() => toggleGroup(group.id)}>
                <span style={{ marginRight: 8 }}>{group.icon}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{group.label}</span>
                <span style={{ fontSize: 11, color: '#94a3b8', transition: 'transform 0.2s',
                  transform: openGroups[group.id] ? 'rotate(90deg)' : 'none' }}>▶</span>
              </button>
              {openGroups[group.id] && group.children.map(child => (
                <button
                  key={child.id}
                  style={{
                    ...s.navItem,
                    background: activeSection === child.id ? '#eff6ff' : 'transparent',
                    color: activeSection === child.id ? '#2563eb' : '#374151',
                    borderLeft: activeSection === child.id ? '3px solid #2563eb' : '3px solid transparent',
                    fontWeight: activeSection === child.id ? 700 : 400,
                  }}
                  onClick={() => navigateTo(child.id)}
                >
                  {child.label}
                </button>
              ))}
            </div>
          ))}

          <div style={s.supportBox}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 6 }}>📞 Support</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.8 }}>
              <div>SWAY AUTOMATION &amp; TECHNOLOGIES</div>
              <div>✉️ swayautomationind@gmail.com</div>
              <div>📱 +91 63838 02438</div>
              <div style={{ marginTop: 4, color: '#94a3b8', fontSize: 11 }}>Mon–Sat · 10 am – 7 pm</div>
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main ref={mainRef} style={s.main}>
          <div style={s.breadcrumb}>
            <span style={{ color: '#94a3b8' }}>Documentation</span>
            {activeGroup && <>
              <span style={{ color: '#cbd5e1', margin: '0 6px' }}>›</span>
              <span style={{ color: '#64748b' }}>{activeGroup.label}</span>
            </>}
            <span style={{ color: '#cbd5e1', margin: '0 6px' }}>›</span>
            <span style={{ color: '#1e293b', fontWeight: 600 }}>{activeLabel}</span>
          </div>

          <ActiveComp />

          <div style={s.pageNav}>
            {(() => {
              const idx = ALL_SECTIONS.findIndex(s => s.id === activeSection);
              const prev = ALL_SECTIONS[idx - 1];
              const next = ALL_SECTIONS[idx + 1];
              return (
                <>
                  <div>
                    {prev && (
                      <button style={s.pageNavBtn} onClick={() => navigateTo(prev.id)}>
                        ← {prev.label}
                      </button>
                    )}
                  </div>
                  <div>
                    {next && (
                      <button style={{ ...s.pageNavBtn, ...s.pageNavBtnNext }} onClick={() => navigateTo(next.id)}>
                        {next.label} →
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ── Styles ── */
const s = {
  layout: {
    display: 'flex',
    gap: 0,
    minHeight: 'calc(100vh - 120px)',
    maxWidth: '100%',
  },
  sidebar: {
    width: 260,
    flexShrink: 0,
    borderRight: '1px solid #f1f5f9',
    padding: '20px 0',
    position: 'sticky',
    top: 0,
    height: 'calc(100vh - 120px)',
    overflowY: 'auto',
    background: '#fafbfc',
    display: 'flex',
    flexDirection: 'column',
  },
  searchWrap: {
    position: 'relative',
    margin: '0 14px 12px',
  },
  searchIcon: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 14,
  },
  searchInput: {
    width: '100%',
    padding: '8px 10px 8px 32px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
    background: '#fff',
    color: '#374151',
    boxSizing: 'border-box',
  },
  searchResults: {
    margin: '0 0 8px',
    borderBottom: '1px solid #f1f5f9',
  },
  searchItem: {
    width: '100%',
    textAlign: 'left',
    padding: '8px 18px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    color: '#2563eb',
    borderBottom: '1px solid #f8fafc',
  },
  navGroup: {
    marginBottom: 4,
  },
  groupHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    padding: '8px 14px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  navItem: {
    width: '100%',
    textAlign: 'left',
    padding: '7px 14px 7px 28px',
    background: 'transparent',
    border: 'none',
    borderLeft: '3px solid transparent',
    cursor: 'pointer',
    fontSize: 13.5,
    transition: 'all 0.15s',
    color: '#374151',
    display: 'block',
  },
  supportBox: {
    margin: '16px 14px 0',
    padding: '14px',
    background: '#fff',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    marginTop: 'auto',
  },
  main: {
    flex: 1,
    padding: '28px 40px 40px',
    overflowY: 'auto',
    maxWidth: 'calc(100% - 260px)',
  },
  breadcrumb: {
    fontSize: 13,
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
  },
  pageTitle: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottom: '2px solid #f1f5f9',
  },
  sectionCard: {
    fontSize: 14,
    lineHeight: 1.7,
    color: '#374151',
  },
  navPath: {
    display: 'inline-block',
    background: '#f1f5f9',
    borderRadius: 6,
    padding: '4px 12px',
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#2563eb',
    fontWeight: 700,
    marginBottom: 16,
  },
  p: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 1.75,
    margin: '0 0 12px',
  },
  ul: {
    paddingLeft: 22,
    margin: '8px 0 14px',
    fontSize: 14,
    color: '#475569',
    lineHeight: 2,
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 14,
    margin: '14px 0',
  },
  featureCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '16px',
  },
  statusBlock: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '16px 20px',
    marginBottom: 14,
  },
  statusHeader: {
    marginBottom: 10,
  },
  pageNav: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 40,
    paddingTop: 24,
    borderTop: '1px solid #f1f5f9',
  },
  pageNavBtn: {
    padding: '10px 18px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#374151',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  pageNavBtnNext: {
    background: '#2563eb',
    color: '#fff',
    border: '1px solid #2563eb',
  },
};