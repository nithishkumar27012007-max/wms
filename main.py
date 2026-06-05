from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from auth import router as auth_router
from auth import get_connection
from pydantic import BaseModel, EmailStr
from fastapi import FastAPI, UploadFile, File, Form
from typing import Optional, List
from datetime import date,timedelta, datetime
from collections import defaultdict
from auth import get_current_user, seed_data
import uuid as _uuid
import shutil
import os
import uuid
import math
from pathlib import Path
from email_utils import get_vendor_email, send_po_email
from fastapi import BackgroundTasks

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

# =============================
# All Table Creation
# =============================
conn = get_connection()
cursor = conn.cursor()



#-------------------------
#     roles assign  Table
#---------------------------------
cursor.execute("""
    CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);
""")

#-------------------------
#     user Table
#---------------------------------
cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role_id INT REFERENCES roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
""")

#  Auto Login User data insert  Function
conn.commit()
seed_data()

#---------------------------------
#     user_sessions Table
#---------------------------------
cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    session_uuid UUID UNIQUE NOT NULL,
    login_time TIMESTAMP DEFAULT NOW(),
    last_activity TIMESTAMP DEFAULT NOW(),
    expiry_time TIMESTAMP,
    logout_time TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    logout_reason VARCHAR(50)
);
""")


# =============================
# Vendors Table Creation
# =============================
cursor.execute("""
    CREATE TABLE IF NOT EXISTS vendors (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        contact_person VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        lead_time_days INTEGER CHECK (lead_time_days >= 0),
        rating NUMERIC(2,1) CHECK (rating >= 0 AND rating <= 5),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
""")

# =============================
# Customers Table Creation
# =============================
cursor.execute("""
    CREATE TABLE IF NOT EXISTS customers (
    customers_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    created_at DATE DEFAULT CURRENT_DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
""")


# =============================
# Products Table Creation  -- COMMENTED OUT (see new version at bottom)
# =============================
cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        products_id        VARCHAR(100) PRIMARY KEY,
        name               VARCHAR(150) NOT NULL,
        barcode            VARCHAR(50),
        unit               VARCHAR(20),
        product_type       VARCHAR(50),
        is_batch_tracked   BOOLEAN DEFAULT TRUE,
        is_expiry_tracked  BOOLEAN DEFAULT TRUE,
        minimum_stock      INT DEFAULT 0,
        Unit_cost          DECIMAL(10,2) NOT NULL,
        is_active          BOOLEAN DEFAULT TRUE,
        created_at         DATE DEFAULT CURRENT_DATE,
        updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        box_id             VARCHAR(100) NOT NULL,
        units_per_box      INT          NOT NULL,
        storage_type       VARCHAR(50)  NOT NULL DEFAULT 'Ambient' CHECK (storage_type IN ('Ambient','Cold','Frozen','Dry','Hazmat')),
        abc_class          VARCHAR(1)   NOT NULL DEFAULT 'C' CHECK (abc_class IN ('A','B','C')),
        unit_weight_kg     DECIMAL(11,3) NOT NULL,
        material_volume_cbm DECIMAL(14,5) NOT NULL
    );
""")


#===============================
#   ware House table
#===============================
cursor.execute("""
    CREATE TABLE IF NOT EXISTS warehouses (
        warehouses_id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        location VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATE DEFAULT CURRENT_DATE,
        updated_at DATE DEFAULT CURRENT_TIMESTAMP
    );
""")


#===============================
#   wareHouse Storages table  -- (new version )
#===============================
cursor.execute("""
    CREATE TABLE IF NOT EXISTS warehouse_storages (
        warehouse_location_id       VARCHAR(100) PRIMARY KEY,
        warehouse_id                VARCHAR(100) NOT NULL,
        zone                        VARCHAR(150),
        rack                        VARCHAR(50),
        shelf                       VARCHAR(50),
        location_status             VARCHAR(50),
        is_active                   BOOLEAN DEFAULT TRUE,
        created_at                  DATE DEFAULT CURRENT_DATE,
        updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        zone_type                   VARCHAR(50) NOT NULL DEFAULT 'Storage' CHECK (zone_type IN ('Dock', 'Temp', 'Storage','Pack','Dispatch')),
        level                       VARCHAR(20),
        storage_type                VARCHAR(50) DEFAULT 'Ambient' CHECK (storage_type IN ('Ambient','Cold','Frozen','Dry','Hazmat')),
        occupaid_volume_cbm         DECIMAL(14,5), 
        max_weight_kg               DECIMAL(11,3),
        volume_cbm                  DECIMAL(14,5), 
        reserved_cbm                DECIMAL(14,5), 
        occupaid_weight             DECIMAL(11,3)  
    );
""")

#===================================
#    carton_box table
#===================================
cursor.execute("""
        CREATE TABLE IF NOT EXISTS carton_box (
            box_id VARCHAR(100) PRIMARY KEY,
            box_name VARCHAR(150) NOT NULL,
            length DECIMAL(10,2),
            breadth DECIMAL(10,2),
            height DECIMAL(10,2),
            weight DECIMAL(10,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE,
            request_id VARCHAR(150)  UNIQUE
        );
    """)

#===================================
#   Purchase order Table
#===================================
cursor.execute("""
    CREATE TABLE IF NOT EXISTS purchase_order (
    purchase_order_id VARCHAR(100) PRIMARY KEY,
    vendor_id VARCHAR(100),
    order_date DATE,
    expected_date DATE,
    status VARCHAR(50) NOT NULL,
    total_cost DECIMAL(10,2),
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    request_id VARCHAR(150)  UNIQUE
);

    CREATE TABLE IF NOT EXISTS purchase_order_lines (
    po_line_id SERIAL PRIMARY KEY,
    purchase_order_id VARCHAR(100) REFERENCES purchase_order(purchase_order_id),
    product_id VARCHAR(100) NOT NULL,
    ordered_qty DECIMAL(10,2) NOT NULL,
    received_qty DECIMAL(10,2) DEFAULT 0,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'Pending'
);

""")

#===================================
#   goods receipts Table
#===================================
cursor.execute("""
    CREATE TABLE IF NOT EXISTS goods_receipts (
    grn_id VARCHAR(100) PRIMARY KEY,
    po_id VARCHAR(100),
    gate_entry_no VARCHAR(100),
    warehouses_id VARCHAR(100),
    dock_location_id VARCHAR(100),
    receipt_date DATE,
    status VARCHAR(50) NOT NULL,
    vendor_invoice_no VARCHAR(100),
    vendor_invoice_date DATE,
    invoice_amount NUMERIC(20,3),
    eway_bill_number VARCHAR(100),
    vehicle_number VARCHAR(50),
    request_id VARCHAR(150)  UNIQUE
);

""")

#===================================
#   grn items Table
#===================================
cursor.execute("""
    CREATE TABLE IF NOT EXISTS grn_items (
    grn_item_id VARCHAR(100) PRIMARY KEY,
    grn_id VARCHAR(100) NOT NULL,
    product_id VARCHAR(100) NOT NULL,
    batch_no VARCHAR(100),
    expiry_date DATE,
    received_qty DECIMAL(10,2),
    accepted_qty DECIMAL(10,2),
    rejected_qty DECIMAL(10,2),
    rejection_reason VARCHAR(1000),
    location_id VARCHAR(100),
    request_id VARCHAR(150)  UNIQUE
);

""")

# =============================
#    putaway_tasks table
# =============================
cursor.execute("""
        CREATE TABLE IF NOT EXISTS putaway_tasks (
            task_id VARCHAR(100) PRIMARY KEY,
            grn_id VARCHAR(100),
            grn_item_id VARCHAR(100),
            product_id VARCHAR(100),
            batch_no VARCHAR(100),
            suggested_quantity INT,
            actual_quantity INT,
            suggested_location VARCHAR(100),
            actual_location VARCHAR(100),
            status VARCHAR(20) DEFAULT 'PENDING',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            request_id VARCHAR(150)  UNIQUE
        );
    """)

#===================================
#   stock_balances Table
#===================================
# ===================================
# stock_balances Table
# ===================================

cursor.execute("""
    CREATE TABLE IF NOT EXISTS stock_balances (
        id SERIAL PRIMARY KEY,

        product_id VARCHAR(100) NOT NULL,
        warehouse_id VARCHAR NOT NULL,
        location_id VARCHAR NOT NULL,

        batch_no VARCHAR(100),
        expiry_date DATE,

        on_hand_qty DECIMAL(12,3),
        reserved_qty DECIMAL(12,3),

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
    );
""")

# ===================================
# UNIQUE INDEX
# ===================================

cursor.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_stock_balances
    ON stock_balances (
        product_id,
        warehouse_id,
        location_id,
        batch_no
    )
    NULLS NOT DISTINCT;
""")


#===================================
#   stock_ledger Table
#===================================
cursor.execute("""
    CREATE TABLE IF NOT EXISTS stock_ledger (
    movement_id        VARCHAR(50) PRIMARY KEY,
    product_id         VARCHAR(50) NOT NULL,
    warehouse          VARCHAR(100),
    from_location      VARCHAR(100),
    to_location        VARCHAR(100),
    batch_no           VARCHAR(50),
    movement_type      VARCHAR(50),
    reference_id       VARCHAR(50),
    reference_type     VARCHAR(50),
    before_qty         DECIMAL(10,2) DEFAULT 0,
    movement_qty       DECIMAL(10,2) DEFAULT 0,
    after_qty          DECIMAL(10,2) DEFAULT 0,
    created_by         VARCHAR(100),
    created_datetime   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

""")



#===================================
#   Sales Orders Table
#===================================
cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        so_number VARCHAR(100) UNIQUE,
        customer_id VARCHAR(100),
        status VARCHAR(30),
        order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_amount NUMERIC(10,2),
        target_id VARCHAR(100),
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        request_id VARCHAR(150) UNIQUE
    );

    CREATE TABLE IF NOT EXISTS sales_order_lines (
        so_line_id SERIAL PRIMARY KEY,
        so_number VARCHAR(100) REFERENCES orders(so_number),
        product_id VARCHAR(100),
        ordered_qty NUMERIC(10,2) NOT NULL,
        reserved_qty NUMERIC(10,2) DEFAULT 0,
        issued_qty NUMERIC(10,2) DEFAULT 0,
        unit_price NUMERIC(10,2),
        total_price NUMERIC(10,2),
        stock_check_done BOOLEAN DEFAULT FALSE,
        suggestion_raised BOOLEAN DEFAULT FALSE,
        status VARCHAR(30) DEFAULT 'Pending'
    );
""")

#===================================
#    pick_tasks Table
#===================================
cursor.execute('''
    CREATE TABLE IF NOT EXISTS pick_tasks (
        picking_id VARCHAR(100) PRIMARY KEY,
        order_id  VARCHAR(20),
        product_id  VARCHAR(20),
        batch_id  VARCHAR(20),
        location_id  VARCHAR(20),
        required_qty INT,
        picked_qty INT,
        status  VARCHAR(30),
        packing_zone VARCHAR(20),
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
''')



#===================================
#    pick_tasks Table Header
#===================================
cursor.execute('''
    CREATE TABLE IF NOT EXISTS pick_task_header (
        picking_id VARCHAR(100) PRIMARY KEY,
        order_id  VARCHAR(20),
        total_required_qty INT,
        total_picked_qty INT,
        status  VARCHAR(30),
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        stock_updated BOOLEAN DEFAULT FALSE
    );
''')



#===================================
#    pick_tasks Table Child
#===================================
cursor.execute('''
    CREATE TABLE IF NOT EXISTS pick_task_lines (
        line_id SERIAL PRIMARY KEY,
        picking_id VARCHAR(100),
        product_id VARCHAR(20),
        batch_id  VARCHAR(20),
        location_id  VARCHAR(20),
        required_qty INT,
        picked_qty INT,
        status  VARCHAR(30),
        packing_zone VARCHAR(20),
        completed_at TIMESTAMP
    );
''')





#===================================
#    Package Table Header
#===================================
cursor.execute('''
CREATE TABLE IF NOT EXISTS packages (
    package_id VARCHAR(30) PRIMARY KEY,
    order_id VARCHAR(30) NOT NULL,
    total_boxes INT,
    total_qty INT,
    status VARCHAR(30) DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
''')

#===================================
#    Package Table Boxes
#===================================
cursor.execute('''
CREATE TABLE IF NOT EXISTS package_boxes (
    id SERIAL PRIMARY KEY,
    package_id VARCHAR(30),
    box_id VARCHAR(30),
    box_no INT,       
    product_id VARCHAR(100),
    qty INT,
    dispatch_type VARCHAR(30),
    location_id VARCHAR(100),
    weight DECIMAL(10,2),
    volume DECIMAL(10,4),
    barcode VARCHAR(100)
);
''')

#===================================
#    Dispat Table
#===================================
cursor.execute("""
    CREATE TABLE IF NOT EXISTS dispat (
        id SERIAL PRIMARY KEY, 
        dispatches_id VARCHAR(20) UNIQUE,
        o_id VARCHAR(100) NOT NULL, 
        courier_name VARCHAR(100),
        tracking_number VARCHAR(150), 
        dispatch_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50), 
        delivered_at TIMESTAMP, 
        proof_url TEXT,
        shipped_qty NUMERIC(10,2),
        dispatch_location VARCHAR(100)
    );
""")


#===================================
#    invoices Table
#===================================
cursor.execute("""
    CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        so_number VARCHAR(100) UNIQUE,
        product_id VARCHAR(50),
        product_name VARCHAR(255),
        quantity DECIMAL(10,2),
        invoice_number VARCHAR(100) UNIQUE,
        invoice_date DATE,
        total_amount DECIMAL(10,2),
        gst_amount DECIMAL(10,2),
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
""")


#===================================
#     eway table
#===================================
cursor.execute("""
    CREATE TABLE IF NOT EXISTS eway (
        id SERIAL PRIMARY KEY, 
        invoice_id VARCHAR(50), 
        invoice_number VARCHAR(100),
        product_id VARCHAR(50), 
        product_name VARCHAR(255), 
        quantity DECIMAL(10,2),
        eway_bill_number VARCHAR(100) UNIQUE, 
        vehicle_number VARCHAR(50),
        validity_date DATE, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        gstin_recipient VARCHAR(50), 
        place_of_delivery VARCHAR(255),
        value_of_goods DECIMAL(10,2), 
        transporter VARCHAR(100),
        from_place VARCHAR(100), 
        document_no VARCHAR(100)
    );
""")
#===================================
#    Courier table
#===================================
cursor.execute("""
CREATE TABLE IF NOT EXISTS courier (
    id SERIAL PRIMARY KEY,
    courier_id VARCHAR(30) UNIQUE,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    country VARCHAR(50),
    pin_code VARCHAR(10),
    contact_person VARCHAR(100),
    phone_number VARCHAR(15),
    email VARCHAR(100),
    service_type VARCHAR(20),
    coverage_area VARCHAR(20),
    tracking_available BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    request_id VARCHAR(150) UNIQUE
);
""")

#===================================
#    Companies table
#===================================
cursor.execute("""
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(150),
    gstin VARCHAR(20),
    pan_number VARCHAR(20),
    phone VARCHAR(15),
    email VARCHAR(100),
    street_address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    pincode VARCHAR(10),
    country VARCHAR(50) DEFAULT 'India',
    request_id VARCHAR(150)  UNIQUE
);
""")            


cursor.execute("""
CREATE TABLE IF NOT EXISTS vendor_portal_users (
    portal_user_id INT GENERATED BY DEFAULT AS IDENTITY (START WITH 10001) PRIMARY KEY,
    vendor_id VARCHAR(100),
    email VARCHAR(150) UNIQUE,
    password_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS po_vendor_activity (
    activity_id SERIAL PRIMARY KEY,
    purchase_order_id VARCHAR(100),
    vendor_id VARCHAR(100),
    viewed_at TIMESTAMP,
    expected_delivery_date DATE,
    dispatched_at TIMESTAMP,
    dispatch_note TEXT,
    vehicle_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PENDING'
);
""")

conn.commit()
cursor.close()
conn.close()

print("Database connected successfully")

# =============================
# All MODELS
# =============================

# -----------------------------
# Vendors Table MODELS
# -----------------------------

class VendorModel(BaseModel):
    id: str
    name: str
    contact_person: str
    phone: str
    email: EmailStr
    address: str
    lead_time_days: int
    rating: float
    is_active: Optional[bool] = True

# -----------------------------
# Customers Table MODELS
# -----------------------------
class CustomerModel(BaseModel):
    customers_id: str
    name: str
    phone: str
    email: EmailStr
    address: str
    is_active: Optional[bool] = True


# -----------------------------
# Products Table MODELS
# -----------------------------
class ProductsModel(BaseModel):
    products_id: str
    name: str
    barcode: str
    unit: str
    product_type: str
    is_batch_tracked: Optional[bool] = True
    is_expiry_tracked: Optional[bool] = True
    minimum_stock: int
    Unit_cost: float
    is_active: bool
    # New fields
    box_id:str
    units_per_box: int
    storage_type:str
    abc_class:str
    unit_weight_kg: float
    material_volume_cbm: float

# -----------------------------
# warehouses Table MODELS
# -----------------------------
class WarehouseModel(BaseModel):
    warehouses_id: str
    name: str
    location: str
    is_active: Optional[bool] = True

#---------------------------------
# warehouse storage Table Model
#---------------------------------
class WarehouseStorageModel(BaseModel):
    warehouse_id: str
    Zone: Optional[str] = None
    rack: Optional[str] = None
    shelf: Optional[str] = None
    is_active: Optional[bool] = True
    # New fields
    zone_type: Optional[str] = None
    level: Optional[str] = None
    storage_type: Optional[str] = None
    max_weight_kg: Optional[float] = None
    volume_cbm: Optional[float] = None

    
#=================================
# carton box table models
#=================================
class CartonBoxModel(BaseModel):
    request_id: str
    box_id: Optional[str] = None
    box_name: str
    length: float
    breadth: float
    height: float
    weight: float
    is_active: Optional[bool] = True  # Default to True if not provided

#---------------------------------
# purchase Order Table Model
#---------------------------------
class PurchaseOrderLineCreate(BaseModel):
    product_id: str
    ordered_qty: float

class PurchaseOrderCreate(BaseModel):
    request_id: str
    vendor_id: str
    lines: List[PurchaseOrderLineCreate]

PurchaseOrderLineCreate.model_rebuild()
PurchaseOrderCreate.model_rebuild()

class PurchaseOrderVendorUpdate(BaseModel):
    vendor_id: str

class PurchaseOrderUpdatePayload(BaseModel):
    vendor_id: str
    lines: List[PurchaseOrderLineCreate]

PurchaseOrderUpdatePayload.model_rebuild()

#-------------------------------------
#  gooods receipts table model
#-------------------------------------
class GoodsReceiptCreate(BaseModel):
    request_id: str
    po_id: str
    gate_entry: str
    warehouses_id: str
    dock_location: str
    vendor_invoice_no: str
    vendor_invoice_date: date
    invoice_amount: float
    eway_bill_number: str
    vehicle_number: str

#-------------------------------------
#  grn_items table model
#-------------------------------------
class GRNItemCreate(BaseModel):
    request_id: str
    grn_id: str
    product_id: str
    expiry_date: Optional[date] = None
    received_qty: float
    accepted_qty: float
    rejected_qty: float
    rejection_reason: str

class GRNItemProductCreate(BaseModel):
    product_id: str
    expiry_date: Optional[date] = None
    received_qty: float
    accepted_qty: float
    rejected_qty: float
    rejection_reason: str

class GRNItemBulkCreate(BaseModel):
    request_id: str
    grn_id: str
    products: List[GRNItemProductCreate]




#---------------------------------------
#  Sales OrderCreate table model 
#----------------------------------------
class SalesOrderLineCreate(BaseModel):
    product_id: str
    ordered_qty: float

class OrderCreate(BaseModel):
    request_id: str
    customer_id: str
    lines: List[SalesOrderLineCreate]

SalesOrderLineCreate.model_rebuild()
OrderCreate.model_rebuild()

#---------------------------------------
#  Sales OrderCreate table model 
#----------------------------------------

class PickTaskUpdate(BaseModel):
    picked_qty: int 
    packing_zone: str

#---------------------------------------
#  EwayCreate table model 
#----------------------------------------
class EwayCreate(BaseModel):
    invoice_id:        int
    product_id:        Optional[str]   = None  
    product_name:      Optional[str]   = None
    qty:               Optional[float] = None
    eway_bill_number:  Optional[str]   = None
    vehicle_number:    str
    validity_date:     date
    gstin_recipient:   Optional[str]   = None
    place_of_delivery: Optional[str]   = None
    value_of_goods:    Optional[float] = None
    transporter:       Optional[str]   = None
    from_place:        Optional[str]   = None 

#---------------------------------------
#  CompanyModel 
#----------------------------------------
class CompanyModel(BaseModel):
    companyName: str
    gstin: Optional[str] = ""
    pan: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    streetAddress: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    pincode: Optional[str] = ""
    country: Optional[str] = "India"  



class VendorActivityUpdate(BaseModel):
    expected_delivery_date: Optional[date] = None
    dispatched_at: Optional[datetime] = None
    dispatch_note: Optional[str] = None
    vehicle_number: Optional[str] = None

# =============================
# functions
# =============================

def to_float(val, default=0.0):
    return float(val) if val is not None else default

# =============================
# APIs
# =============================

# =============================
# VENDORS Create APIs
# =============================
@app.post("/vendors-create")
def create_vendor(v: VendorModel, _ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
        INSERT INTO vendors(
            id, name, contact_person, phone, email,
            address, lead_time_days, rating,
            is_active, created_at, updated_at
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
        """, (
            v.id, v.name, v.contact_person, v.phone,
            v.email, v.address, v.lead_time_days,
            v.rating, v.is_active
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return {"message": "Vendor created successfully"}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# =============================
# VENDORS Read APIs
# =============================
@app.get("/vendors-read")
def read_vendors(_ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM vendors")
        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        return [
            {
                "id": r[0],
                "name": r[1],
                "contact_person": r[2],
                "phone": r[3],
                "email": r[4],
                "address": r[5],
                "lead_time_days": r[6],
                "rating": r[7],
                "is_active": r[8],
                "created_at": r[9],
                "updated_at": r[10]
            }
            for r in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# =============================
# VENDORS Update APIs
# =============================
@app.put("/vendors-update/{vendor_id}")
def update_vendor(vendor_id: str, v: VendorModel, _ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
        UPDATE vendors
        SET id=%s,
            name=%s,
            contact_person=%s,
            phone=%s,
            email=%s,
            address=%s,
            lead_time_days=%s,
            rating=%s,
            is_active=%s,
            updated_at=CURRENT_TIMESTAMP
        WHERE id=%s
        """, (
            v.id,
            v.name,
            v.contact_person,
            v.phone,
            v.email,
            v.address,
            v.lead_time_days,
            v.rating,
            v.is_active,
            vendor_id
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return {"message": "Vendor updated successfully"}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================
# CUSTOMERS CREATE APIs
# =============================

@app.post("/customers-create")
def create_customer(c: CustomerModel, _ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Check existing customer
        cursor.execute("""
            SELECT customers_id
            FROM customers
            WHERE customers_id = %s
        """, (c.customers_id,))

        existing = cursor.fetchone()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Customer ID already exists"
            )

        # Insert customer
        cursor.execute("""
        INSERT INTO customers(
            customers_id, name, phone, email, address, is_active
        )
        VALUES (%s,%s,%s,%s,%s,%s)
        """, (
            c.customers_id, c.name, c.phone,
            c.email, c.address, c.is_active
        ))

        conn.commit()

        cursor.close()
        conn.close()

        return {"message": "Customer created successfully"}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# =============================
# CUSTOMERS Read APIs
# =============================
@app.get("/customers-read")
def read_customers(_ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM customers")
        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        return [
            {
                "customers_id": r[0],
                "name": r[1],
                "phone": r[2],
                "email": r[3],
                "address": r[4],
                "created_at": r[5],
                "updated_at": r[6],
                "is_active": r[7]
            }
            for r in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# =============================
# CUSTOMERS Update APIs
# =============================
@app.put("/customers-update/{customer_id}")
def update_customer(customer_id: str, c: CustomerModel, _ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
         # Check duplicate ID only for OTHER customers
        cursor.execute("""
            SELECT customers_id
            FROM customers
            WHERE customers_id = %s
            AND customers_id != %s
        """, (c.customers_id, customer_id))

        existing = cursor.fetchone()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Customer ID already exists"
            )
         # update the costomers
        cursor.execute("""
        UPDATE customers
        SET customers_id=%s,
            name=%s,
            phone=%s,
            email=%s,
            address=%s,
            updated_at=CURRENT_TIMESTAMP,
            is_active=%s
        WHERE customers_id=%s
        """, (
            c.customers_id,c.name, c.phone, c.email,
            c.address, c.is_active, customer_id
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return {"message": "Customer updated successfully"}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================
# Products Create APIs
# =============================
@app.post("/products-create")
def create_product(product: ProductsModel,  _ = Depends(get_current_user)):
    # Validation
    if product.minimum_stock < 0:
        raise HTTPException(status_code=400, detail="Minimum stock cannot be negative")
    if product.Unit_cost <= 0:
        raise HTTPException(status_code=400, detail="Unit cost must be greater than zero")
    if product.units_per_box and product.units_per_box <= 0:
        raise HTTPException(status_code=400, detail="Units per box must be greater than zero")
    if product.unit_weight_kg and product.unit_weight_kg <= 0:
        raise HTTPException(status_code=400, detail="Unit weight must be greater than zero")
    if product.material_volume_cbm and product.material_volume_cbm <= 0:
        raise HTTPException(status_code=400, detail="Material volume must be greater than zero")

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM products WHERE products_id = %s",
            (product.products_id,)
        )

        existing = cursor.fetchone()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Product ID already exists"
            )

        # Auto-generate barcode: ProductId + DDMMYYYY
        date_str = datetime.now().strftime("%d%m%Y")
        generated_barcode = f"{product.products_id}{date_str}"

        cursor.execute("""
            INSERT INTO products
            (products_id,name,barcode,unit,product_type,minimum_stock,Unit_cost,
            is_batch_tracked,is_expiry_tracked,is_active,created_at,
            box_id,units_per_box,storage_type,abc_class,unit_weight_kg,material_volume_cbm)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),%s,%s,%s,%s,%s,%s)
        """,(
            product.products_id,
            product.name,
            generated_barcode,
            product.unit,
            product.product_type,
            product.minimum_stock,
            product.Unit_cost,
            product.is_batch_tracked,
            product.is_expiry_tracked,
            product.is_active,
            product.box_id,
            product.units_per_box,
            product.storage_type,
            product.abc_class,
            product.unit_weight_kg,
            product.material_volume_cbm
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return {"message": "Product created successfully"}

    except HTTPException as e:
        raise e

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# ===================================
# Carton Box Dropdown API
# ===================================
@app.get("/carton-box-dropdown")
def carton_box_dropdown(_ = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                box_id,
                box_name
            FROM carton_box
            WHERE is_active = TRUE
            ORDER BY box_name
        """)

        data = cursor.fetchall()

        return [
            {
                "box_id":r[0],
                "box_name":r[1]
            }
            for r in data
        ]

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        cursor.close()
        conn.close()


# =============================
# PRODUCTS Read APIs
# =============================
@app.get("/products-read")
def read_products(_ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM products")
        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        return [
            {
                "products_id": r[0],
                "name": r[1],
                "barcode": r[2],
                "unit": r[3],
                "product_type": r[4],
                "is_batch_tracked": r[5],
                "is_expiry_tracked": r[6],
                "minimum_stock": r[7],
                "Unit_cost": r[8],
                "is_active": r[9],
                "created_at": r[10],
                "updated_at": r[11],
                "box_id": r[12],
                "units_per_box": r[13],
                "storage_type": r[14],
                "abc_class": r[15],
                "unit_weight_kg": float(r[16]) if r[16] is not None else None,
                "material_volume_cbm": float(r[17]) if r[17] is not None else None
            }
            for r in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================
# PRODUCTS Update APIs
# =============================
@app.put("/products-update/{product_id}")
def update_products(product_id: str, p: ProductsModel, _ = Depends(get_current_user)):
    # Validation
    if p.minimum_stock < 0:
        raise HTTPException(status_code=400, detail="Minimum stock cannot be negative")
    if p.Unit_cost <= 0:
        raise HTTPException(status_code=400, detail="Unit cost must be greater than zero")
    if p.units_per_box and p.units_per_box <= 0:
        raise HTTPException(status_code=400, detail="Units per box must be greater than zero")
    if p.unit_weight_kg and p.unit_weight_kg <= 0:
        raise HTTPException(status_code=400, detail="Unit weight must be greater than zero")
    if p.material_volume_cbm and p.material_volume_cbm <= 0:
        raise HTTPException(status_code=400, detail="Material volume must be greater than zero")

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
        UPDATE products
        SET 
            name=%s,
            barcode=%s,
            unit=%s,
            product_type=%s,
            is_batch_tracked=%s,
            is_expiry_tracked=%s,
            minimum_stock=%s,
            Unit_cost=%s,
            is_active=%s,
            box_id=%s,
            units_per_box=%s,
            storage_type=%s,
            abc_class=%s,
            unit_weight_kg=%s,
            material_volume_cbm=%s,
            updated_at=CURRENT_TIMESTAMP
        WHERE products_id=%s
        """, (
            p.name,
            p.barcode,
            p.unit,
            p.product_type,
            p.is_batch_tracked,
            p.is_expiry_tracked,
            p.minimum_stock,
            p.Unit_cost,
            p.is_active,
            p.box_id,
            p.units_per_box,
            p.storage_type,
            p.abc_class,
            p.unit_weight_kg,
            p.material_volume_cbm,
            product_id
        ))

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Product not found")

        conn.commit()
        cursor.close()
        conn.close()

        return {"message": "Product updated successfully"}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================
# warehouses Create APIs
# =============================
@app.post("/warehouse-create")
def create_warehouse(w: WarehouseModel, _ = Depends(get_current_user)):

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM warehouses WHERE warehouses_id = %s",
            (w.warehouses_id,)
        )
        existing = cursor.fetchone()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="warehouse ID already exists"
            )
        cursor.execute("""
            INSERT INTO warehouses
            (warehouses_id,name,location,is_active)
            VALUES (%s,%s,%s,%s)
        """,(w.warehouses_id,w.name,w.location,w.is_active))
        conn.commit()
        cursor.close()
        conn.close()

        return {"message":"warehouse created successfully"}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================
# Warehouses Read APIs
# =============================
@app.get("/warehouse-read")
def read_warehouse(_ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM warehouses")
        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        return [
            {
                "warehouses_id": r[0],
                "name": r[1],
                "location": r[2],
                "is_active": r[3],
                "created_at": r[4],
                "updated_at": r[5]
            }
            for r in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
# =============================
# Warehouse Update APIs
# =============================
@app.put("/warehouse-update/{warehouse_id}")
def update_warehouse(warehouse_id: str, w: WarehouseModel, _ = Depends(get_current_user)):

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Check if new product_id already exists (except current record)
        cursor.execute(
            "SELECT * FROM warehouses WHERE warehouses_id = %s AND warehouses_id != %s",
            (w.warehouses_id, warehouse_id)
        )
        existing = cursor.fetchone()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Warehouse ID already exists"
            )

        cursor.execute("""
        UPDATE warehouses
        SET 
            warehouses_id=%s,
            name=%s,
            location=%s,
            is_active=%s,
            updated_at=CURRENT_TIMESTAMP
        WHERE warehouses_id=%s
        """, (
            w.warehouses_id,
            w.name,
            w.location,
            w.is_active,
            warehouse_id
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return {"message": "Warehouse updated successfully"}

    except HTTPException as e:
        raise e

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Something went wrong"
        )
    

# =============================
# warehouse Storage Create APIs
# =============================
@app.post("/warehouse-storage-create")
def create_warehouse_storage(w: WarehouseStorageModel, _ = Depends(get_current_user)):

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # =============================
        # Zone Mapping
        # =============================
        zone_map = {
            "Raw Materials": "RM",
            "Finished Goods": "FG",
            "Trading Items": "TI"
        }

        # For Dock and Pack, we use a fixed zone name
        if w.zone_type in ["Dock", "Pack", "Temp"]:
            final_zone = None
        else:
            final_zone = w.Zone if w.Zone else "STORAGE"
            
        zone_code = zone_map.get(final_zone, final_zone) if final_zone else "NA"

        # =============================
        # Generate Location ID
        # =============================
        if w.zone_type in ["Dock", "Pack", "Temp"]:
            # For Docks/Packs, we just use a suffix (provided in rack field or default)
            suffix = w.rack if w.rack else ("D1" if w.zone_type == "Dock" else "P1")
            warehouse_location_id = f"{w.warehouse_id}-{w.zone_type.upper()}-{suffix}"
            
            # For Dock/Pack, we don't save rack, shelf, level, storage_type
            rack = None
            shelf = None
            level = None
            storage_type = None
        else:
            warehouse_location_id = f"{w.warehouse_id}-{zone_code}-{w.rack}-{w.shelf}"
            rack = w.rack
            shelf = w.shelf
            level = w.level
            storage_type = w.storage_type

        # =============================
        # Check Duplicate
        # =============================
        cursor.execute(
            "SELECT * FROM warehouse_storages WHERE warehouse_location_id = %s",
            (warehouse_location_id,)
        )

        existing = cursor.fetchone()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Warehouse Storage ID already exists"
            )

        location_status = "Available" if w.is_active else "Restricted"

        # =============================
        # Insert
        # =============================
        is_dock_pack_temp = w.zone_type in ["Dock", "Pack", "Temp"]
        is_storage_dispatch = w.zone_type in ["Storage", "Dispatch"]

        cursor.execute("""
    INSERT INTO warehouse_storages (
        warehouse_location_id, warehouse_id, zone, rack, shelf,
        location_status, is_active, zone_type, level, storage_type,
        max_weight_kg, volume_cbm, occupaid_volume_cbm, reserved_cbm, occupaid_weight
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
""", (
    warehouse_location_id,
    w.warehouse_id,
    final_zone,
    rack,
    shelf,
    location_status,
    w.is_active,
    w.zone_type,
    level,
    storage_type,
    0.0 if is_dock_pack_temp else w.max_weight_kg,   # max_weight_kg
    0.0 if is_dock_pack_temp else w.volume_cbm,      # volume_cbm
    0.00,                                             # occupaid_volume_cbm
    0.00,                                             # reserved_cbm
    0.00,                                             # occupaid_weight
))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": "Warehouse storage created successfully",
            "warehouse_location_id": warehouse_location_id
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    

# =====================================================================
# Warehouses ID Read APIs  --  Drop Down for warehouse Storage table
# =====================================================================
@app.get("/warehouse_ID-read")
def read_ID_warehouse(_ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT warehouses_id FROM warehouses where is_active = True ")
        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        return [
            {
                "warehouses_id": r[0]
            }
            for r in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================
# warehouse storage read APIs
# =============================
@app.get("/warehouse-storage-read")
def read_storage(_ = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM warehouse_storages")
    rows = cursor.fetchall()

    result = []

    for r in rows:
        # In read_storage(), change these lines:
        occupaid_volume = float(r[12]) if r[12] is not None else 0.0
        max_weight      = float(r[13]) if r[13] is not None else 0.0   # ← was None
        total_volume    = float(r[14]) if r[14] is not None else 0.0   # ← was None
        reserved_cbm    = float(r[15]) if r[15] is not None else 0.0
        occupaid_weight = float(r[16]) if r[16] is not None else 0.0
        # Calculate utilisation %
        vol_pct = (occupaid_volume / total_volume * 100) if (total_volume and total_volume > 0 and occupaid_volume is not None) else 0
        wt_pct  = (occupaid_weight / max_weight  * 100) if (max_weight  and max_weight  > 0 and occupaid_weight is not None) else 0
        utilization = max(vol_pct, wt_pct)

        result.append({
            "warehouse_location_id": r[0],
            "warehouse_id":          r[1],
            "Zone":                  r[2],
            "rack":                  r[3],
            "shelf":                 r[4],
            "location_status":       r[5],
            "is_active":             r[6],
            "created_at":            r[7],
            "updated_at":            r[8],
            "zone_type":             r[9],
            "level":                 r[10],
            "storage_type":          r[11],
            "occupaid_volume_cbm":   occupaid_volume,
            "max_weight_kg":         max_weight,
            "volume_cbm":            total_volume,
            "reserved_cbm":          reserved_cbm,
            "occupaid_weight":       occupaid_weight,
            "vol_utilization_pct":   round(vol_pct, 2),
            "wt_utilization_pct":    round(wt_pct, 2),
            "utilization_pct":       round(utilization, 2),
        })

    cursor.close()
    conn.close()

    return result

# =============================
# Warehouse Storage Update APIs
# =============================
@app.put("/warehouse-storage-update/{warehouse_location_id}")
def update_warehouse_storage(warehouse_location_id: str, w: WarehouseStorageModel, _ = Depends(get_current_user)):

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # =============================
        # Zone Mapping
        # =============================
        zone_map = {
            "Raw Materials": "RM",
            "Finished Goods": "FG",
            "Trading Items": "TI"
        }

        # For Dock and Pack, we use a fixed zone name
        if w.zone_type in ["Dock", "Pack", "Temp"]:   
            final_zone = None
        else:
            final_zone = w.Zone if w.Zone else "STORAGE"
            
        zone_code = zone_map.get(final_zone, final_zone) if final_zone else "NA"

        # =============================
        # Generate Location ID
        # =============================
        if w.zone_type in ["Dock", "Pack", "Temp"]: 
            # For Docks/Packs, we just use a suffix (provided in rack field or default)
            suffix = w.rack if w.rack else ("D1" if w.zone_type == "Dock" else "P1")
            new_location_id = f"{w.warehouse_id}-{w.zone_type.upper()}-{suffix}"
            
            # For Dock/Pack, we don't save rack, shelf, level, storage_type
            rack = None
            shelf = None
            level = None
            storage_type = None
        else:
            new_location_id = f"{w.warehouse_id}-{zone_code}-{w.rack}-{w.shelf}"
            rack = w.rack
            shelf = w.shelf
            level = w.level
            storage_type = w.storage_type

        # =============================
        # Check Duplicate
        # =============================
        cursor.execute("""
            SELECT 1 FROM warehouse_storages
            WHERE warehouse_location_id = %s
            AND warehouse_location_id != %s
        """, (new_location_id, warehouse_location_id))

        existing = cursor.fetchone()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Warehouse Storage location already exists"
            )

        # =============================
        # Get Current Status + Occupied Values
        # =============================
        cursor.execute("""
            SELECT location_status, occupaid_volume_cbm, occupaid_weight
            FROM warehouse_storages
            WHERE warehouse_location_id = %s
        """, (warehouse_location_id,))

        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Storage not found")

        current_status  = row[0]
        current_occ_vol = float(row[1] or 0)
        current_occ_wt  = float(row[2] or 0) 

        # =============================
        # Auto Location Status Logic
        # =============================
        if current_status == "Occupied":
            location_status = "Occupied"
        else:
            location_status = "Available" if w.is_active else "Restricted"

        # =============================
        # Update Storage
        # =============================
        is_dock_pack_temp = w.zone_type in ["Dock", "Pack", "Temp"]

        cursor.execute("""
        UPDATE warehouse_storages
        SET
            warehouse_location_id = %s,
            warehouse_id = %s,
            zone = %s,
            rack = %s,
            shelf = %s,
            location_status = %s,
            is_active = %s,
            zone_type = %s,
            level = %s,
            storage_type = %s,
            max_weight_kg = %s,
            volume_cbm = %s,
            occupaid_volume_cbm = %s,
            occupaid_weight = %s,
            reserved_cbm = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE warehouse_location_id = %s
        """, (
            new_location_id,
            w.warehouse_id,
            final_zone,
            rack,
            shelf,
            location_status,
            w.is_active,
            w.zone_type,
            level,
            storage_type,
            0.0 if is_dock_pack_temp else (w.max_weight_kg or 0),
            0.0 if is_dock_pack_temp else (w.volume_cbm or 0),
            current_occ_vol,   # occupaid_volume_cbm — preserve existing
            current_occ_wt,    # occupaid_weight — preserve existing
            0.00,              # reserved_cbm
            warehouse_location_id
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": "Warehouse storage updated successfully",
            "warehouse_location_id": new_location_id
        }

    except HTTPException as e:
        raise e

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
 


      
# =============================
# CARTON BOX MASTER
# =============================
@app.post("/carton-box-create")
def create_carton_box(box: CartonBoxModel, _ = Depends(get_current_user)):
    # Validation
    if box.length <= 0 or box.breadth <= 0 or box.height <= 0 or box.weight <= 0:
        raise HTTPException(status_code=400, detail="Length, Breadth, Height, and Weight must be greater than zero")
    
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT box_id
            FROM carton_box
            WHERE request_id = %s
        """, (box.request_id,))

        existing = cursor.fetchone()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Duplicate request detected"
            )

        # Generate custom Box ID: BOX-001, BOX-002...
        cursor.execute("SELECT box_id FROM carton_box WHERE box_id LIKE 'BOX-%%' ORDER BY box_id DESC LIMIT 1")
        last_id_row = cursor.fetchone()
        
        if last_id_row:
            try:
                last_num = int(last_id_row[0].split('-')[1])
                new_id = f"BOX-{last_num + 1:03d}"
            except:
                new_id = "BOX-001"
        else:
            new_id = "BOX-001"

        # Insert with explicit is_active value
        cursor.execute("""
            INSERT INTO carton_box (box_id, box_name, length, breadth, height, weight, is_active, created_at, request_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (new_id, box.box_name, box.length, box.breadth, box.height, box.weight, box.is_active, datetime.now(), box.request_id))
        
        conn.commit()
        return {"message": f"Carton Box {new_id} created successfully", "box_id": new_id, "is_active": box.is_active}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()




@app.get("/carton-box-read")
def read_carton_boxes(_ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        # Explicitly select all columns including is_active
        cursor.execute("SELECT box_id, box_name, length, breadth, height, weight, is_active, created_at FROM carton_box ORDER BY box_id ASC")
        rows = cursor.fetchall()
        
        boxes = []
        for r in rows:
            # Convert is_active to boolean properly
            is_active_val = r[6]
            if isinstance(is_active_val, bool):
                is_active = is_active_val
            elif isinstance(is_active_val, int):
                is_active = bool(is_active_val)
            elif isinstance(is_active_val, str):
                is_active = is_active_val.lower() in ['true', '1', 'yes']
            else:
                is_active = True
            
            boxes.append({
                "box_id": r[0],
                "box_name": r[1],
                "length": float(r[2]),
                "breadth": float(r[3]),
                "height": float(r[4]),
                "weight": float(r[5]),
                "is_active": is_active,  # Return as proper boolean
                "created_at": r[7] if len(r) > 7 else None
            })
        
        return boxes
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.put("/carton-box-update/{box_id}")
def update_carton_box(box_id: str, box: CartonBoxModel, _ = Depends(get_current_user)):
    # Validation
    if box.length <= 0 or box.breadth <= 0 or box.height <= 0 or box.weight <= 0:
        raise HTTPException(status_code=400, detail="Length, Breadth, Height, and Weight must be greater than zero")
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Check if box exists
        cursor.execute("SELECT box_id FROM carton_box WHERE box_id = %s", (box_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Carton Box not found")
        
        # Update all fields including is_active
        cursor.execute("""
            UPDATE carton_box
            SET box_name=%s, length=%s, breadth=%s, height=%s, weight=%s, is_active=%s
            WHERE box_id=%s
        """, (box.box_name, box.length, box.breadth, box.height, box.weight, box.is_active, box_id))
        
        conn.commit()
        
        # Fetch and return the updated record
        cursor.execute("SELECT box_id, box_name, length, breadth, height, weight, is_active FROM carton_box WHERE box_id = %s", (box_id,))
        updated_box = cursor.fetchone()
        
        return {
            "message": "Carton Box updated successfully",
            "data": {
                "box_id": updated_box[0],
                "box_name": updated_box[1],
                "length": float(updated_box[2]),
                "breadth": float(updated_box[3]),
                "height": float(updated_box[4]),
                "weight": float(updated_box[5]),
                "is_active": bool(updated_box[6])  # Convert to boolean
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# =============================
# Purchase Order Create API
# =============================
@app.post("/purchase-order-create")
def create_purchase_order(po: PurchaseOrderCreate, background_tasks: BackgroundTasks, current_user = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        
        # Prevent duplicate request
        
        cursor.execute("""
            SELECT purchase_order_id
            FROM purchase_order
            WHERE request_id = %s
        """, (po.request_id,))

        existing = cursor.fetchone()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Duplicate request detected"
            )

        # ✅ Handle both dict and string return from get_current_user
        if isinstance(current_user, dict):
            created_by = current_user.get("username", "unknown")
        else:
            created_by = str(current_user)

        today = date.today()
        date_part = today.strftime("%y%m%d")

        cursor.execute("""
            SELECT purchase_order_id
            FROM purchase_order
            WHERE purchase_order_id LIKE %s
            ORDER BY purchase_order_id DESC
            LIMIT 1
        """, (f"PO-{date_part}-%",))

        last_po = cursor.fetchone()

        if last_po:
            last_number = int(last_po[0].split("-")[-1])
            new_number = last_number + 1
        else:
            new_number = 1

        purchase_order_id = f"PO-{date_part}-{str(new_number).zfill(3)}"

        cursor.execute("""
            SELECT lead_time_days
            FROM vendors
            WHERE id = %s
        """, (po.vendor_id,))

        vendor = cursor.fetchone()

        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")

        lead_time_days = vendor[0]
        order_date = date.today()
        expected_date = order_date + timedelta(days=lead_time_days)
        status = "Approved"

        total_cost = 0.0
        for line in po.lines:
            cursor.execute("SELECT Unit_cost FROM products WHERE products_id = %s", (line.product_id,))
            prod = cursor.fetchone()
            if not prod:
                raise HTTPException(status_code=404, detail=f"Product {line.product_id} not found")
            total_cost += float(prod[0]) * line.ordered_qty

        cursor.execute("""
            INSERT INTO purchase_order(
                purchase_order_id,
                vendor_id,
                order_date,
                expected_date,
                status,
                total_cost,
                created_by,
                created_at,
                request_id
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            purchase_order_id,
            po.vendor_id,
            order_date,
            expected_date,
            status,
            total_cost,
            created_by,
            datetime.now(),
            po.request_id
        ))

        for line in po.lines:
            cursor.execute("SELECT Unit_cost FROM products WHERE products_id = %s", (line.product_id,))
            unit_cost = float(cursor.fetchone()[0])
            line_total = unit_cost * line.ordered_qty
            cursor.execute("""
                INSERT INTO purchase_order_lines(
                    purchase_order_id,
                    product_id,
                    ordered_qty,
                    unit_cost,
                    total_cost,
                    status
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                purchase_order_id,
                line.product_id,
                line.ordered_qty,
                unit_cost,
                line_total,
                "Pending"
            ))

        conn.commit()
        cursor.close()
        conn.close()

        # Send mail to vendor
        vendor_email = get_vendor_email(po.vendor_id)
        if vendor_email:
            total_qty = sum(line.ordered_qty for line in po.lines)
            background_tasks.add_task(
                send_po_email,
                vendor_email=vendor_email,
                po_id=purchase_order_id,
                status="Approved",
                ordered_qty=total_qty,
                product_id="Multi-Product"
            )

        return {
            "message": "Purchase Order Created Successfully",
            "purchase_order_id": purchase_order_id,
            "expected_date": expected_date,
            "created_by": created_by
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



# ================================================================
#   product ID and unit --> Dropdown for Purchase order table
# ================================================================
@app.get("/products-dropdown")
def products_dropdown():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT products_id, name, unit
        FROM products
        WHERE is_active = TRUE
    """)

    rows = cursor.fetchall()

    result = []

    for r in rows:
        result.append({
            "products_id": r[0],
            "name": r[1],
            "unit": r[2]
        })

    return result

# ====================================================
#  vendor ID's -->  Dropdown for Purchase order table
# ====================================================
@app.get("/vendors-dropdown")
def vendors_dropdown():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, name
            FROM vendors
            WHERE is_active = TRUE
            ORDER BY name
        """)

        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        return [
            {
                "vendor_id": r[0],
                "vendor_name": r[1]
            }
            for r in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# =============================
# PURCHASE ORDER Read APIs
# =============================
@app.get("/purchase-order-read")
def read_purchase_order(_ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT p.*, a.status AS vendor_status, a.expected_delivery_date, a.viewed_at,
                   v.name AS vendor_name
            FROM purchase_order p
            LEFT JOIN po_vendor_activity a ON p.purchase_order_id = a.purchase_order_id
            LEFT JOIN vendors v ON p.vendor_id = v.id
            ORDER BY p.purchase_order_id DESC
        """)
        header_rows = cursor.fetchall()

        cursor.execute("""
            SELECT l.po_line_id, l.purchase_order_id, l.product_id, l.ordered_qty, l.received_qty, l.unit_cost, l.total_cost, l.status, pr.name
            FROM purchase_order_lines l
            LEFT JOIN products pr ON l.product_id = pr.products_id
        """)
        line_rows = cursor.fetchall()

        cursor.close()
        conn.close()

        from collections import defaultdict
        lines_by_po = defaultdict(list)
        for lr in line_rows:
            lines_by_po[lr[1]].append({
                "po_line_id": lr[0],
                "product_id": lr[2],
                "ordered_qty": lr[3],
                "received_qty": lr[4],
                "unit_cost": lr[5],
                "total_cost": lr[6],
                "status": lr[7],
                "product_name": lr[8]
            })

        result = []
        for r in header_rows:
            po_id = r[0]
            result.append({
                "purchase_order_id": po_id,
                "vendor_id": r[1],
                "order_date": r[2],
                "expected_date": r[10] if r[10] is not None else r[3],
                "status": r[4],
                "total_cost": r[5],
                "created_by": r[6],
                "created_at": r[7],
                "vendor_status": r[9],
                "viewed_at": r[11],
                "vendor_name": r[12],
                "lines": lines_by_po.get(po_id, [])
            })

        return result

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    



# =============================
# AUTO PURCHASE ORDER CREATE 
# =============================
def auto_create_purchase_orders(so_number):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # =============================
        # 1. Get Products from Order
        # =============================
        cursor.execute("""
            SELECT DISTINCT product_id
            FROM sales_order_lines
            WHERE so_number = %s
        """, (so_number,))
        
        product_rows = cursor.fetchall()
        if not product_rows:
            return {"message": "No products found for this order"}

        results = []
        for prow in product_rows:
            product_id = prow[0]

            # =============================
            # 2. TOTAL DEMAND (ALL ORDERS)
            # =============================
            cursor.execute("""
                SELECT 
                    COALESCE(SUM(CASE 
                        WHEN status = 'OPEN' THEN ordered_qty 
                        ELSE 0 END), 0),

                    COALESCE(SUM(CASE 
                        WHEN status = 'PARTIALLY_RESERVED' 
                        THEN (ordered_qty - reserved_qty) 
                        ELSE 0 END), 0)
                FROM sales_order_lines
                WHERE product_id = %s
            """, (product_id,))

            open_qty, partial_shortage = cursor.fetchone()
            total_demand = float(open_qty) + float(partial_shortage)

            # =============================
            # 3. STOCK (ON HAND - RESERVED)
            # =============================
            cursor.execute("""
                SELECT 
                    COALESCE(SUM(on_hand_qty), 0),
                    COALESCE(SUM(reserved_qty), 0)
                FROM stock_balances
                WHERE product_id = %s
                AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
            """, (product_id,))
            
            total_on_hand, total_reserved = cursor.fetchone()
            available_stock = float(total_on_hand) - float(total_reserved)

            # =============================
            # 4. MINIMUM STOCK
            # =============================
            cursor.execute("""
                SELECT minimum_stock
                FROM products
                WHERE products_id = %s
            """, (product_id,))
            
            product_res = cursor.fetchone()
            if not product_res:
                continue
            minimum_stock = float(product_res[0])

            # =============================
            # 5. INCOMING STOCK (Approved PO)
            # =============================
            cursor.execute("""
                SELECT COALESCE(SUM(l.ordered_qty - COALESCE(l.received_qty, 0)), 0)
                FROM purchase_order_lines l
                JOIN purchase_order p ON l.purchase_order_id = p.purchase_order_id
                WHERE l.product_id = %s
                AND p.status = 'Approved'
            """, (product_id,))

            incoming_po = float(cursor.fetchone()[0])

            # =============================
            # 6. EXISTING AUTO PO
            # =============================
            cursor.execute("""
                SELECT p.purchase_order_id, COALESCE(l.ordered_qty, 0)
                FROM purchase_order p
                JOIN purchase_order_lines l ON p.purchase_order_id = l.purchase_order_id
                WHERE l.product_id = %s
                AND p.status = 'Auto-Created'
                ORDER BY p.created_at DESC
                LIMIT 1
            """, (product_id,))

            existing_po = cursor.fetchone()
            existing_auto_po_qty = float(existing_po[1]) if existing_po else 0

            # =============================
            # 7. FINAL CALCULATION
            # =============================
            effective_stock = available_stock + incoming_po
            required_stock = minimum_stock + total_demand

            shortage = required_stock - effective_stock
            final_qty = shortage - existing_auto_po_qty

            # =============================
            # 8. DECISION
            # =============================
            if final_qty <= 0:
                results.append({"product_id": product_id, "message": "No new PO required"})
                continue
            
            today = date.today()

            # =============================
            # 9. UPDATE or INSERT
            # =============================

            if existing_po:
                # 🔄 UPDATE existing Auto PO
                po_id = existing_po[0]

                cursor.execute("""
                    UPDATE purchase_order_lines
                    SET ordered_qty = ordered_qty + %s,
                        total_cost = (ordered_qty + %s) * unit_cost
                    WHERE purchase_order_id = %s AND product_id = %s
                """, (final_qty, final_qty, po_id, product_id))

                cursor.execute("""
                    UPDATE purchase_order
                    SET total_cost = (SELECT SUM(total_cost) FROM purchase_order_lines WHERE purchase_order_id = %s),
                        created_at = %s
                    WHERE purchase_order_id = %s
                """, (po_id, today, po_id))

            else:
                # 🆕 CREATE new Auto PO
                date_part = today.strftime("%y%m%d")

                cursor.execute("""
                    SELECT purchase_order_id
                    FROM purchase_order
                    WHERE purchase_order_id LIKE %s
                    ORDER BY purchase_order_id DESC
                    LIMIT 1
                """, (f"PO-{date_part}-%",))

                last_po = cursor.fetchone()
                new_number = int(last_po[0].split("-")[-1]) + 1 if last_po else 1

                po_id = f"PO-{date_part}-{str(new_number).zfill(3)}"

                cursor.execute("SELECT unit_cost FROM products WHERE products_id = %s", (product_id,))
                p_cost = cursor.fetchone()
                unit_cost = float(p_cost[0]) if p_cost and p_cost[0] is not None else 0.0
                line_total = unit_cost * final_qty

                cursor.execute("""
                    INSERT INTO purchase_order (
                        purchase_order_id,
                        vendor_id,
                        order_date,           
                        status,
                        total_cost,
                        created_by,
                        created_at
                    )
                    VALUES (%s, NULL, %s, %s, %s, %s, %s)
                """, (
                    po_id,
                    today,
                    "Auto-Created",
                    line_total,
                    "System",
                    datetime.now()
                ))

                cursor.execute("""
                    INSERT INTO purchase_order_lines (
                        purchase_order_id,
                        product_id,
                        ordered_qty,
                        unit_cost,
                        total_cost,
                        status
                    )
                    VALUES (%s, %s, %s, %s, %s, 'Pending')
                """, (
                    po_id,
                    product_id,
                    final_qty,
                    unit_cost,
                    line_total
                ))
            results.append({
                "message": "Auto PO Updated" if existing_po else "Auto PO Created",
                "product_id": product_id,
                "added_qty": final_qty
            })
            
        conn.commit()
        return results

    except Exception as e:
        raise Exception(str(e))

    finally:
        cursor.close()
        conn.close()


# ========================================================
# 🔁 Recheck function for Demand or Available qty check
# =======================================================
def calculate_required_po(cursor, product_id):

    # =============================
    # 1. TOTAL DEMAND
    # =============================
    cursor.execute("""
        SELECT 
            COALESCE(SUM(CASE 
                WHEN status = 'OPEN' THEN ordered_qty 
                ELSE 0 END), 0),

            COALESCE(SUM(CASE 
                WHEN status = 'PARTIALLY_RESERVED' 
                THEN (ordered_qty - reserved_qty) 
                ELSE 0 END), 0)
        FROM sales_order_lines
        WHERE product_id = %s
    """, (product_id,))

    open_qty, partial_shortage = cursor.fetchone()
    total_demand = float(open_qty) + float(partial_shortage)

    # =============================
    # 2. STOCK (ONLY VALID STOCK)
    # =============================
    cursor.execute("""
        SELECT 
            COALESCE(SUM(on_hand_qty), 0),
            COALESCE(SUM(reserved_qty), 0)
        FROM stock_balances
        WHERE product_id = %s
        AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE + INTERVAL '2 days')
    """, (product_id,))

    total_on_hand, total_reserved = cursor.fetchone()
    available_stock = float(total_on_hand) - float(total_reserved)

    # =============================
    # 3. MINIMUM STOCK
    # =============================
    cursor.execute("""
        SELECT minimum_stock
        FROM products
        WHERE products_id = %s
    """, (product_id,))

    minimum_stock = float(cursor.fetchone()[0])

    cursor.execute("""
        SELECT COALESCE(SUM(l.ordered_qty - COALESCE(l.received_qty, 0)), 0)
        FROM purchase_order_lines l
        JOIN purchase_order p ON l.purchase_order_id = p.purchase_order_id
        WHERE l.product_id = %s
        AND p.status = 'Approved'
    """, (product_id,))

    incoming_po = float(cursor.fetchone()[0])

    # =============================
    # 5. FINAL CALCULATION
    # =============================
    effective_stock = available_stock + incoming_po
    required_stock = minimum_stock + total_demand

    shortage = required_stock - effective_stock

    final_qty = max(0, shortage)

    return round(final_qty, 2)


# ===========================================================
# 🔄 UPDATE PO (Vendor + Lines) --> Auto Purchase Order / Draft
# ===========================================================
@app.put("/purchase-order-update/{po_id}")
def update_purchase_order(po_id: str, payload: PurchaseOrderUpdatePayload, current_user = Depends(get_current_user)):
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Check if PO exists and status is Auto-Created or HOLD
        cursor.execute("SELECT status FROM purchase_order WHERE purchase_order_id = %s", (po_id,))
        po = cursor.fetchone()
        if not po:
            raise HTTPException(status_code=404, detail="Purchase Order not found")
        
        status = po[0]
        if status not in ("Auto-Created", "HOLD"):
            raise HTTPException(status_code=400, detail="Only Auto-Created or HOLD POs can be updated")

        # Validate vendor
        cursor.execute("SELECT id FROM vendors WHERE id = %s", (payload.vendor_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Vendor not found")

        # Calculate new total cost and validate products
        total_cost = 0.0
        validated_lines = []
        for line in payload.lines:
            cursor.execute("SELECT Unit_cost FROM products WHERE products_id = %s", (line.product_id,))
            prod = cursor.fetchone()
            if not prod:
                raise HTTPException(status_code=404, detail=f"Product {line.product_id} not found")
            unit_cost = float(prod[0])
            total_cost += unit_cost * line.ordered_qty
            validated_lines.append((line.product_id, line.ordered_qty, unit_cost, unit_cost * line.ordered_qty))

        # Update purchase_order
        cursor.execute("""
            UPDATE purchase_order
            SET vendor_id = %s,
                total_cost = %s
            WHERE purchase_order_id = %s
        """, (payload.vendor_id, total_cost, po_id))

        # Delete old lines
        cursor.execute("DELETE FROM purchase_order_lines WHERE purchase_order_id = %s", (po_id,))

        # Insert new lines
        for pline in validated_lines:
            cursor.execute("""
                INSERT INTO purchase_order_lines (
                    purchase_order_id,
                    product_id,
                    ordered_qty,
                    unit_cost,
                    total_cost,
                    status
                ) VALUES (%s, %s, %s, %s, %s, 'Pending')
            """, (po_id, pline[0], pline[1], pline[2], pline[3]))

        conn.commit()
        return {"message": "Purchase Order updated successfully", "po_id": po_id}

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ===========================================================
# 🔁 RECHECK Button API -->  Auto Purchase Order
# ===========================================================
@app.get("/purchase-order-recheck/{po_id}")
def recheck_po(po_id: str, _ = Depends(get_current_user)):

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # =============================
        # 1. GET PO DETAILS
        # =============================
        cursor.execute("""
            SELECT product_id, ordered_qty
            FROM purchase_order_lines
            WHERE purchase_order_id = %s
        """, (po_id,))

        rows = cursor.fetchall()

        if not rows:
            raise HTTPException(status_code=404, detail="PO lines not found")

        results = []
        for row in rows:
            product_id, old_qty = row
            old_qty = float(old_qty)

            # =============================
            # 2. RE-CALCULATE
            # =============================
            new_qty = calculate_required_po(cursor, product_id)

            # =============================
            # 3. DIFFERENCE
            # =============================
            difference = round(new_qty - old_qty, 2)
            results.append({
                "product_id": product_id,
                "old_qty": old_qty,
                "updated_qty": new_qty,
                "difference": difference,
                "status": "INCREASE" if difference > 0 else "DECREASE" if difference < 0 else "NO_CHANGE"
            })

        return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


# ================================================
#  HOLD Button API  --> Auto Purchase Order
# ================================================
# ================================================
#  HOLD Button API  --> Auto Purchase Order
# ================================================
@app.put("/purchase-order-hold/{po_id}")
def hold_purchase_order(po_id: str, payload: PurchaseOrderVendorUpdate, _ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT purchase_order_id
            FROM purchase_order
            WHERE purchase_order_id = %s
        """, (po_id,))
        
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Purchase Order not found")

        cursor.execute("""
            UPDATE purchase_order
            SET vendor_id = %s
            WHERE purchase_order_id = %s
        """, (
            payload.vendor_id,
            po_id
        ))

        conn.commit()

        return {
            "message": "PO moved to HOLD and updated",
            "po_id": po_id
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()



# ==================================================
# Update Button APIs --> Auto Purchase Order
# ==================================================
@app.put("/purchase-order-approve/{po_id}")
def approve_purchase_order(po_id: str, p: PurchaseOrderVendorUpdate, current_user: str = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        vendor_id = p.vendor_id

        # Get vendor lead time
        cursor.execute("""
            SELECT lead_time_days
            FROM vendors
            WHERE id = %s
        """, (vendor_id,))

        vendor = cursor.fetchone()

        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")

        lead_time_days = vendor[0] or 0
        today = date.today()
        expected_date = today + timedelta(days=lead_time_days)
        username = current_user["username"]

        cursor.execute("""
            UPDATE purchase_order
            SET 
                vendor_id = %s,
                order_date = %s,
                expected_date = %s,
                status = 'Approved',
                created_by = %s
            WHERE purchase_order_id = %s
        """, (
            vendor_id,
            today,
            expected_date,
            username,
            po_id
        ))

        conn.commit()
        cursor.close()
        conn.close()

        # Send mail to vendor
        vendor_email = get_vendor_email(p.vendor_id)
        if vendor_email:
            send_po_email(vendor_email=vendor_email, po_id=po_id, status="Approved", ordered_qty=0, product_id="Multi-Product")

        return {"message": "Purchase Order Approved Successfully"}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    


# ==============================================
# CANCEL Button API --> Auto Purchase Order
# ==============================================
@app.put("/purchase-order-auto-cancel/{po_id}")
def cancel_auto_po(po_id: str, current_user: str = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # ✅ Check PO exists and is Auto-Created
        cursor.execute("""
            SELECT status, created_by
            FROM purchase_order
            WHERE purchase_order_id = %s
        """, (po_id,))
        
        po = cursor.fetchone()

        if not po:
            raise HTTPException(status_code=404, detail="PO not found")

        status, created_by = po

        if status != "Auto-Created":
            raise HTTPException(status_code=400, detail="Only Auto-Created PO can be cancelled this way")

        username = current_user["username"]

        # ✅ Update
        cursor.execute("""
            UPDATE purchase_order
            SET 
                status = 'Cancelled',
                created_by = %s
            WHERE purchase_order_id = %s
        """, (username, po_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {"message": "Auto PO Cancelled Successfully"}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class CancelPOModel(BaseModel):
    request_id:str


@app.put("/purchase-order-cancel/{po_id}")
def cancel_purchase_order(
    po_id: str,
    data: CancelPOModel,
    _ = Depends(get_current_user)
):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # ✅ Duplicate request check
        cursor.execute("""
            SELECT 1
            FROM purchase_order
            WHERE request_id = %s
        """, (data.request_id,))

        if cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail="Duplicate cancel request detected"
            )

        # ✅ Lock PO row
        cursor.execute("""
            SELECT status
            FROM purchase_order
            WHERE purchase_order_id = %s
            FOR UPDATE
        """, (po_id,))

        po = cursor.fetchone()

        if not po:
            raise HTTPException(status_code=404, detail="PO not found")

        # ✅ Already cancelled
        if po[0] == "Cancelled":
            raise HTTPException(
                status_code=400,
                detail="Purchase Order already cancelled"
            )

        # ✅ Dispatch check
        cursor.execute("""
            SELECT status
            FROM po_vendor_activity
            WHERE purchase_order_id = %s
        """, (po_id,))

        activity = cursor.fetchone()

        if activity and activity[0] == "COMPLETED":
            raise HTTPException(
                status_code=400,
                detail="Cannot cancel: Purchase Order already dispatched"
            )

        # ✅ Cancel PO
        cursor.execute("""
            UPDATE purchase_order
            SET status = 'Cancelled', request_id = %s
            WHERE purchase_order_id = %s
        """, (data.request_id, po_id,))

        conn.commit()

        return {
            "message": "Purchase Order Cancelled"
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()

# =============================
# goods receipts Create APIs
# =============================
@app.post("/goods-receipts-create")
def create_goods_receipt(grn: GoodsReceiptCreate, _ = Depends(get_current_user)):

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT grn_id
            FROM goods_receipts
            WHERE request_id = %s
        """, (grn.request_id,))

        existing = cursor.fetchone()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Duplicate request detected"
            )

        # =============================
        # Generate GRN ID
        # =============================

        today = date.today()
        date_part = today.strftime("%y%m%d")

        prefix = f"GRN-{date_part}"

        cursor.execute("""
            SELECT grn_id
            FROM goods_receipts
            WHERE grn_id LIKE %s
            ORDER BY grn_id DESC
            LIMIT 1
        """, (f"{prefix}%",))

        last = cursor.fetchone()

        if last:
            last_no = int(last[0].split("-")[-1])
            next_no = last_no + 1
        else:
            next_no = 1

        grn_id = f"{prefix}-{str(next_no).zfill(3)}"

        # =============================
        # Default Values
        # =============================
        receipt_date = date.today()
        status = "Received"

        # =============================
        # Insert GRN
        # =============================
        cursor.execute("""
            INSERT INTO goods_receipts(
                grn_id,
                po_id,
                gate_entry_no,
                warehouses_id,
                dock_location_id,
                receipt_date,
                status,
                vendor_invoice_no,
                vendor_invoice_date,
                invoice_amount,
                eway_bill_number,
                vehicle_number,
                request_id
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """,(
            grn_id,
            grn.po_id,
            grn.gate_entry,
            grn.warehouses_id,
            grn.dock_location,
            receipt_date,
            status,
            grn.vendor_invoice_no,
            grn.vendor_invoice_date,
            abs(grn.invoice_amount),
            grn.eway_bill_number,
            grn.vehicle_number,
            grn.request_id
        ))

        # =============================
        # Update Purchase Order total_cost using invoice_amount
        # =============================

        cursor.execute("""
            UPDATE purchase_order
            SET total_cost = %s
            WHERE purchase_order_id = %s
        """, (
            grn.invoice_amount,
            grn.po_id
        ))



        # =============================
        # Update Purchase Order received_qty and status
        # =============================
        status = "Approved"

        if grn.invoice_amount > 0:
            status = "Received"

        cursor.execute("""
            UPDATE purchase_order
            SET status = %s
            WHERE purchase_order_id = %s
        """, (status, grn.po_id))

        conn.commit()

        # =============================
        # Dropdown Data
        # =============================

        cursor.execute("""
            SELECT purchase_order_id
            FROM purchase_order
            WHERE status != 'Cancelled'
        """)
        po_rows = cursor.fetchall()
        po_list = [r[0] for r in po_rows]

        cursor.execute("""
            SELECT warehouses_id
            FROM warehouses
            WHERE is_active = TRUE
        """)
        wh_rows = cursor.fetchall()
        warehouse_list = [r[0] for r in wh_rows]

        cursor.close()
        conn.close()

        return {
            "message": "Goods Receipt Created Successfully",
            "grn_id": grn_id,
            "receipt_date": receipt_date,
            "status": status,
            "dropdown_data": {
                "po_ids": po_list,
                "warehouse_ids": warehouse_list
            }
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    

#=================================================================
#   GET purchase_order_id -- DropDown for goods receipts table
#==================================================================
@app.get("/goods-receipts-dropdown")
def goods_receipts_dropdown():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT p.purchase_order_id
        FROM purchase_order p
        JOIN po_vendor_activity a ON p.purchase_order_id = a.purchase_order_id
        WHERE p.status = 'Approved' AND a.status = 'COMPLETED'
    """)

    po_list = [r[0] for r in cursor.fetchall()]

    cursor.close()
    conn.close()

    return {
        "po_ids": po_list
    }

#=================================================================
#   GET warehouse id -- DropDown for goods receipts table
#==================================================================
@app.get("/warehouse-dropdown/{po_id}")
def warehouse_dropdown(po_id: str, _ = Depends(get_current_user)):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT DISTINCT warehouse_id
        FROM warehouse_storages
        WHERE location_status = 'Available'
    """)

    warehouse_list = [r[0] for r in cursor.fetchall()]

    cursor.close()
    conn.close()

    return warehouse_list



# ==========================================================
#   GET Dock Locations based on Warehouse (Receive Zone)
# ==========================================================
@app.get("/dock-location-dropdown/{warehouse_id}")
def dock_location_dropdown(warehouse_id: str):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT warehouse_location_id
        FROM warehouse_storages
        WHERE warehouse_id = %s
        AND zone_type = 'Dock'
        AND is_active = TRUE
        AND location_status = 'Available'
    """, (warehouse_id,))

    locations = [r[0] for r in cursor.fetchall()]

    cursor.close()
    conn.close()

    return locations


@app.get("/next-gate-entry")
def get_next_gate_entry():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Count GRNs created today
        cursor.execute("SELECT count(*) FROM goods_receipts WHERE receipt_date = CURRENT_DATE")
        count = cursor.fetchone()[0]
        
        # Format DDMMYYYY + (count+1) padded to 3 digits
        date_str = datetime.now().strftime("%d%m%Y")
        next_entry = f"{date_str}{count + 1:03d}"
        
        cursor.close()
        conn.close()
        
        return {"next_gate_entry": next_entry}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================
# goods receipts read APIs
# =============================
@app.get("/goods-receipts-read")
def read_goods_receipt(_ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM goods_receipts ORDER BY grn_id DESC")
        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        return [
            {
                "grn_id": r[0],
                "po_id": r[1],
                "gate_entry": r[2],
                "warehouses_id": r[3],
                "dock_location_id": r[4],
                "receipt_date": r[5],
                "status": r[6],
                "vendor_invoice_no": r[7],
                "vendor_invoice_date": r[8],
                "invoice_amount": r[9],
                "eway_bill_number":r[10],
                "vehicle_number": r[11]
            }
            for r in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
# =============================
# GRN ITEMS Bulk Create API
# =============================
@app.post("/grn-items-create-bulk")
def create_grn_items_bulk(payload: GRNItemBulkCreate, _ = Depends(get_current_user)):
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Duplicate check by request_id (check the first item's ID)
        cursor.execute("""
            SELECT 1 FROM grn_items WHERE request_id = %s LIMIT 1
        """, (f"{payload.request_id}-0",))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Duplicate request detected")

        # Verify GRN and get PO
        cursor.execute("SELECT po_id FROM goods_receipts WHERE grn_id = %s", (payload.grn_id,))
        po = cursor.fetchone()
        if not po:
            raise HTTPException(status_code=404, detail="GRN not found")
        po_id = po[0]

        today = date.today()
        date_part = today.strftime("%y%m%d")
        prefix = f"MI-{date_part}"

        cursor.execute("""
            SELECT grn_item_id FROM grn_items 
            WHERE grn_item_id LIKE %s ORDER BY grn_item_id DESC LIMIT 1
        """, (f"{prefix}%",))
        last = cursor.fetchone()
        next_no = int(last[0].split("-")[-1]) + 1 if last else 1

        for idx, product in enumerate(payload.products):
            grn_item_id = f"{prefix}-{str(next_no).zfill(3)}"
            next_no += 1

            # Generate Batch
            cursor.execute("""
                SELECT batch_no FROM grn_items 
                WHERE product_id = %s ORDER BY grn_item_id DESC LIMIT 1
            """, (product.product_id,))
            last_batch = cursor.fetchone()
            batch_no = f"B-{str(int(last_batch[0].split('-')[1]) + 1).zfill(3)}" if last_batch else "B-001"

            # Insert GRN Item
            item_request_id = f"{payload.request_id}-{idx}"
            cursor.execute("""
                INSERT INTO grn_items(
                    grn_item_id, grn_id, product_id, batch_no, expiry_date,
                    received_qty, accepted_qty, rejected_qty, rejection_reason, request_id
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                grn_item_id, payload.grn_id, product.product_id, batch_no, product.expiry_date,
                product.received_qty, product.accepted_qty, product.rejected_qty, product.rejection_reason, item_request_id
            ))

            # Auto Create Putaway Task
            if product.accepted_qty > 0:
                create_putaway_task(cursor, payload.grn_id, grn_item_id, product.product_id, batch_no, product.accepted_qty)

            # Update PO Line
            cursor.execute("""
                UPDATE purchase_order_lines
                SET received_qty = COALESCE(received_qty, 0) + %s
                WHERE purchase_order_id = %s AND product_id = %s
                RETURNING ordered_qty, received_qty
            """, (product.accepted_qty, po_id, product.product_id))
            line_res = cursor.fetchone()
            if line_res:
                ordered, received = line_res
                if received >= ordered:
                    cursor.execute("UPDATE purchase_order_lines SET status = 'Received' WHERE purchase_order_id = %s AND product_id = %s", (po_id, product.product_id))

        # Update GRN Status
        cursor.execute("""
            UPDATE goods_receipts SET status = 'QC Completed' WHERE grn_id = %s
        """, (payload.grn_id,))

        # Update PO Status
        cursor.execute("""
            UPDATE purchase_order
            SET status = (
                SELECT CASE
                    WHEN COUNT(*) FILTER (WHERE status != 'Received') = 0 THEN 'Closed'
                    ELSE 'Partially Received'
                END
                FROM purchase_order_lines WHERE purchase_order_id = %s
            )
            WHERE purchase_order_id = %s
        """, (po_id, po_id))

        conn.commit()
        return {"status": "success", "message": "Material Inspection saved successfully"}

    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# =============================
# GRN ITEMS Create API
# =============================
@app.post("/grn-items-create")
def create_grn_item(item: GRNItemCreate, _ = Depends(get_current_user)):

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT grn_item_id
            FROM grn_items
            WHERE request_id = %s
        """, (item.request_id,))

        existing = cursor.fetchone()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Duplicate request detected"
            )

        # =============================
        # Generate GRN ITEM ID
        # Format: MI-YYMMDD-001
        # =============================

        today = date.today()
        date_part = today.strftime("%y%m%d")
        prefix = f"MI-{date_part}"

        cursor.execute("""
            SELECT grn_item_id
            FROM grn_items
            WHERE grn_item_id LIKE %s
            ORDER BY grn_item_id DESC
            LIMIT 1
        """, (f"{prefix}%",))

        last = cursor.fetchone()

        if last:
            last_no = int(last[0].split("-")[-1])
            next_no = last_no + 1
        else:
            next_no = 1

        grn_item_id = f"{prefix}-{str(next_no).zfill(3)}"


        cursor.execute("SELECT po_id FROM goods_receipts WHERE grn_id = %s", (item.grn_id,))
        po = cursor.fetchone()
        if not po:
            raise HTTPException(status_code=404, detail="GRN not found")
        po_id = po[0]

        product_id = item.product_id
        expiry_value = item.expiry_date if item.expiry_date else None
    

        # =============================
        # 🔥 Generate Batch (B-001)
        # =============================
        cursor.execute("""
            SELECT batch_no
            FROM grn_items
            WHERE product_id = %s
            ORDER BY grn_item_id DESC
            LIMIT 1
        """, (product_id,))
        last_batch = cursor.fetchone()

        if last_batch:
            last_num = int(last_batch[0].split("-")[1])
            batch_no = f"B-{str(last_num + 1).zfill(3)}"
        else:
            batch_no = "B-001"


        # =============================
        # Insert GRN Item
        # =============================
        
        cursor.execute("""
            INSERT INTO grn_items(
                grn_item_id,
                grn_id,
                product_id,
                batch_no,
                expiry_date,
                received_qty,
                accepted_qty,
                rejected_qty,
                rejection_reason,
                location_id,
                request_id
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            grn_item_id,     # AUTO GENERATED
            item.grn_id,
            product_id,
            batch_no,        # AUTO GENERATED
            expiry_value,
            item.received_qty,
            item.accepted_qty,
            item.rejected_qty,
            item.rejection_reason,
            None,
            item.request_id
        ))

        # ==================================
        # AUTO CREATE PUTAWAY TASK
        # ==================================
        if item.accepted_qty > 0:
            create_putaway_task(cursor, item.grn_id, grn_item_id, product_id, batch_no, item.accepted_qty)


        # ==================================
        # Update GRN Status → QC Completed
        # ==================================
        cursor.execute("""
            UPDATE goods_receipts
            SET status = 'QC Completed'
            WHERE grn_id = %s
        """, (item.grn_id,))

        # Update Purchase Order Lines received_qty
        cursor.execute("SELECT po_id FROM goods_receipts WHERE grn_id = %s", (item.grn_id,))
        po = cursor.fetchone()
        if po:
            po_id = po[0]
            cursor.execute("""
                UPDATE purchase_order_lines
                SET received_qty = COALESCE(received_qty, 0) + %s
                WHERE purchase_order_id = %s AND product_id = %s
                RETURNING ordered_qty, received_qty
            """, (item.accepted_qty, po_id, product_id))
            
            line_res = cursor.fetchone()
            if line_res:
                ordered, received = line_res
                if received >= ordered:
                    cursor.execute("UPDATE purchase_order_lines SET status = 'Received' WHERE purchase_order_id = %s AND product_id = %s", (po_id, product_id))

            # =============================
            # Get Warehouse ID from GRN
            # =============================

            cursor.execute("""
                SELECT warehouses_id
                FROM goods_receipts
                WHERE grn_id = %s
            """, (item.grn_id,))

            warehouse = cursor.fetchone()

            if not warehouse:
                raise HTTPException(status_code=404, detail="Warehouse not found")

            warehouse_id = warehouse[0]
   

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": "GRN Item Created",
            "grn_item_id": grn_item_id,
            "product_id": product_id
        }

    except HTTPException as e:
        raise e

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ====================================
# AUTO RESERVE TRIGGER FUNCTION
# ====================================
def auto_reserve_on_stock_arrival(product_id: str, created_by: str):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Find open SO lines for this product that still need reservations
        cursor.execute("""
            SELECT 
                l.so_line_id,
                l.so_number,
                l.ordered_qty,
                l.reserved_qty,
                COALESCE(l.issued_qty, 0)
            FROM sales_order_lines l
            JOIN orders h ON h.so_number = l.so_number
            WHERE l.product_id = %s
              AND l.status IN ('OPEN', 'PARTIALLY_RESERVED')
            ORDER BY h.created_at ASC
            FOR UPDATE OF l
        """, (product_id,))

        pending = cursor.fetchall()
        if not pending:
            return

        for line_id, son, oqty, rqty, iqty in pending:
            oqty = to_float(oqty)
            rqty = to_float(rqty)
            iqty = to_float(iqty)

            needed = oqty - rqty
            if needed <= 0:
                continue

            cursor.execute("""
                    SELECT batch_no, warehouse_id, location_id, on_hand_qty,
                           COALESCE(reserved_qty, 0),
                           (on_hand_qty - COALESCE(reserved_qty, 0)) AS avail
                    FROM stock_balances
                    WHERE product_id = %s
                        AND (on_hand_qty - COALESCE(reserved_qty, 0)) > 0
                    ORDER BY expiry_date ASC NULLS LAST, created_at ASC, id ASC
                """, (product_id,))

            stock = cursor.fetchall()
            if not stock:
                continue

            added = 0.0
            blist_ledger = []

            for row in stock:
                bn, wi, li, oh, rs, av = row
                av = to_float(av)

                if needed <= 0:
                    break
                if av <= 0:
                    continue

                alloc      = min(needed, av)
                before_qty = av

                cursor.execute("""
                    UPDATE stock_balances
                    SET reserved_qty = LEAST(
                            COALESCE(reserved_qty, 0) + %s,
                            on_hand_qty
                        ),
                        updated_at   = CURRENT_TIMESTAMP
                    WHERE product_id  = %s
                      AND batch_no    = %s
                      AND location_id = %s
                """, (alloc, product_id, bn, li))

                blist_ledger.append({
                    "wi": wi, "li": li, "bn": bn,
                    "alloc": alloc, "before_qty": before_qty
                })

                added  += alloc
                needed -= alloc

            if added > 0:
                nr = rqty + added
                if abs(nr - oqty) < 0.00001:
                    nr = oqty

                final_type = "RESERVE" if abs(nr - oqty) < 0.00001 else "PARTIALLY RESERVED"
                new_status = "RESERVED" if final_type == "RESERVE" else "PARTIALLY_RESERVED"

                for entry in blist_ledger:
                    insert_ledger(
                        cursor,
                        product_id     = product_id,
                        warehouse_id   = entry["wi"] or 'NONE',
                        location_id    = entry["li"] or 'NONE',
                        batch_no       = entry["bn"],
                        movement_type  = final_type,
                        reference_id   = son,
                        quantity       = entry["alloc"],
                        created_by     = created_by,
                        reference_type = "ORDER",
                        before_qty     = entry["before_qty"]
                    )

                # Update the SO line status and reserved qty
                cursor.execute("""
                    UPDATE sales_order_lines
                    SET reserved_qty = %s, status = %s
                    WHERE so_line_id = %s
                """, (nr, new_status, line_id))

                # Update the header order status
                cursor.execute("""
                    UPDATE orders
                    SET status = (
                        SELECT CASE
                            WHEN COUNT(*) FILTER (WHERE status = 'OPEN') > 0
                             AND COUNT(*) FILTER (WHERE status IN ('RESERVED','PARTIALLY_RESERVED')) = 0
                            THEN 'OPEN'
                            WHEN COUNT(*) FILTER (WHERE status = 'RESERVED') = COUNT(*)
                            THEN 'RESERVED'
                            ELSE 'PARTIALLY_RESERVED'
                        END
                        FROM sales_order_lines WHERE so_number = %s
                    )
                    WHERE so_number = %s
                """, (son, son))

        # ✅ Commit first
        conn.commit()

        # Trigger pick task creation for updated SOs
        updated_sos = list({row[1] for row in pending})
        for so_num in updated_sos:
            create_pick_tasks_header(so_num)

    except Exception as e:
        conn.rollback()
        print(f"[AUTO-RESERVE ERROR] {e}")
        raise

    finally:
        cursor.close()
        conn.close()

def create_putaway_task(cursor, grn_id, grn_item_id, product_id, batch, qty):

    # =================================
    # 🔹 Step 1: Get product details
    # =================================
    cursor.execute("""
        SELECT storage_type, product_type, abc_class, unit_weight_kg, material_volume_cbm
        FROM products
        WHERE products_id = %s
    """, (product_id,))
    
    product = cursor.fetchone()
    if not product:
        raise Exception("Product not found")

    storage_type, product_type, abc_class, unit_weight, unit_volume = product

    unit_weight = float(unit_weight or 0)
    unit_volume = float(unit_volume or 0)

    remaining_qty = int(qty)
    allocations = []

    # 🔥 Track used capacity in memory
    temp_usage = {}

    # =============================
    # 🔹 Step 2: ABC Strategy
    # =============================
    if abc_class == 'A':
        full_priority = ['L0','L1']
        split_priority = ['L0','L1']
        rest_levels = ['L2','L3','L4']

    elif abc_class == 'B':
        full_priority = ['L2','L3']
        split_priority = ['L2','L3']
        rest_levels = ['L4','L0','L1']

    else:
        full_priority = ['L4']
        split_priority = ['L4']
        rest_levels = ['L3','L2','L1','L0']

    # =============================
    # 🔹 Helper: Get locations
    # =============================
    def get_locations(level):
        cursor.execute("""
            SELECT 
                ws.warehouse_location_id,

                -- 🔹 Remaining volume after confirmed + reserved
                (ws.volume_cbm 
                - ws.occupaid_volume_cbm 
                - COALESCE(SUM(pt.suggested_quantity * p.material_volume_cbm), 0)
                ) AS free_volume,

                -- 🔹 Remaining weight after confirmed + reserved
                (ws.max_weight_kg 
                - ws.occupaid_weight 
                - COALESCE(SUM(pt.suggested_quantity * p.unit_weight_kg), 0)
                ) AS free_weight

            FROM warehouse_storages ws

            -- 🔹 Join pending putaway tasks (reservation)
            LEFT JOIN putaway_tasks pt
                ON ws.warehouse_location_id = pt.suggested_location
                AND pt.status IN ('PENDING')

            -- 🔹 Join product to convert qty → volume/weight
            LEFT JOIN products p
                ON pt.product_id = p.products_id

            WHERE 
                ws.location_status = 'Available'
                AND ws.is_active = TRUE
                AND ws.zone_type = 'Storage'
                AND ws.storage_type = %s      -- product storage type
                AND ws.zone = %s              -- product type (RM/FG)
                AND ws.level = %s             -- level filter (L0/L1...)

            GROUP BY 
                ws.warehouse_location_id,
                ws.volume_cbm,
                ws.occupaid_volume_cbm,
                ws.max_weight_kg,
                ws.occupaid_weight

            HAVING 
                (ws.volume_cbm 
                - ws.occupaid_volume_cbm 
                - COALESCE(SUM(pt.suggested_quantity * p.material_volume_cbm), 0)
                ) > 0
                AND
                (ws.max_weight_kg 
                - ws.occupaid_weight 
                - COALESCE(SUM(pt.suggested_quantity * p.unit_weight_kg), 0)
                ) > 0

            ORDER BY free_volume DESC;
        """, (storage_type, product_type, level))

        return cursor.fetchall()

    # =============================
    # 🔹 Allocation Engine
    # =============================
    def try_allocate(levels, full_first=True):
        nonlocal remaining_qty

        for level in levels:
            if remaining_qty <= 0:
                break

            locations = get_locations(level)

            # 🔹 FULL FIT FIRST
            if full_first:
                for loc_id, free_volume, free_weight in locations:
                    free_volume = float(free_volume or 0)
                    free_weight = float(free_weight or 0)

                    already_used = temp_usage.get(loc_id, 0)

                    max_by_volume = float(free_volume // unit_volume) if unit_volume > 0 else remaining_qty
                    max_by_weight = float(free_weight // unit_weight) if unit_weight > 0 else remaining_qty

                    capacity = min(max_by_volume, max_by_weight)

                    # 🔥 subtract already used
                    capacity = max(0, capacity - already_used)

                    if capacity >= remaining_qty:
                        allocations.append((loc_id, remaining_qty))
                        temp_usage[loc_id] = temp_usage.get(loc_id, 0) + remaining_qty
                        remaining_qty = 0
                        return

            # 🔹 SPLIT LOGIC
            for loc_id, free_volume, free_weight in locations:
                if remaining_qty <= 0:
                    break

                free_volume = float(free_volume or 0)
                free_weight = float(free_weight or 0)

                already_used = temp_usage.get(loc_id, 0)

                max_by_volume = float(free_volume // unit_volume) if unit_volume > 0 else 0
                max_by_weight = float(free_weight // unit_weight) if unit_weight > 0 else 0

                capacity = min(max_by_volume, max_by_weight)

                # 🔥 subtract already used
                capacity = max(0, capacity - already_used)

                if capacity <= 0:
                    continue

                alloc_qty = min(remaining_qty, capacity)

                allocations.append((loc_id, alloc_qty))

                # 🔥 update usage
                temp_usage[loc_id] = temp_usage.get(loc_id, 0) + alloc_qty

                remaining_qty -= alloc_qty

    # =============================
    # 🔹 Run Allocation
    # =============================
    try_allocate(full_priority, full_first=True)

    if remaining_qty > 0:
        try_allocate(split_priority, full_first=False)

    if remaining_qty > 0:
        try_allocate(rest_levels, full_first=True)

    # =============================
    # 🔹 Generate Task IDs
    # =============================
    today = date.today()
    prefix = f"PUT-{today.strftime('%y%m%d')}"

    cursor.execute("""
        SELECT task_id
        FROM putaway_tasks
        WHERE task_id LIKE %s
        ORDER BY task_id DESC
        LIMIT 1
    """, (f"{prefix}%",))

    last = cursor.fetchone()
    counter = int(last[0].split("-")[-1]) + 1 if last else 1

    # =============================
    # 🔹 Insert ASSIGNED tasks
    # =============================
    for loc_id, alloc_qty in allocations:
        task_id = f"{prefix}-{str(counter).zfill(3)}"
        counter += 1

        cursor.execute("""
            INSERT INTO putaway_tasks 
            (task_id, grn_id, grn_item_id, product_id, batch_no,
             suggested_quantity, actual_quantity,
             suggested_location, actual_location, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            task_id,
            grn_id,
            grn_item_id,
            product_id,
            batch,
            int(alloc_qty),
            0,
            loc_id,
            None,
            'PENDING'
        ))

    # =============================
    # 🔹 Insert UNASSIGNED task
    # =============================
    if remaining_qty > 0:
        task_id = f"{prefix}-{str(counter).zfill(3)}"

        cursor.execute("""
            INSERT INTO putaway_tasks 
            (task_id, grn_id, grn_item_id, product_id, batch_no,
             suggested_quantity, actual_quantity,
             suggested_location, actual_location, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            task_id,
            grn_id,
            grn_item_id,
            product_id,
            batch,
            int(remaining_qty),
            0,
            None,   # ✅ no location available
            None,
            'UNASSIGNED'
        ))

        print(f"⚠️ UNASSIGNED qty: {remaining_qty}")

# ========================================
#  GET GRN ID --> Dropdown gor grn  form 
# ========================================
@app.get("/grn-dropdown")
def grn_dropdown():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT grn_id FROM goods_receipts WHERE status = 'Received' ")
    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    return [r[0] for r in rows]

# ========================================
# Check if Product has Expiry Tracking
# ========================================
@app.get("/check-expiry/{grn_id}")
def check_expiry(grn_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Get the PO linked to this GRN
        cursor.execute("SELECT po_id FROM goods_receipts WHERE grn_id = %s", (grn_id,))
        grn_row = cursor.fetchone()
        if not grn_row:
            raise HTTPException(status_code=404, detail="GRN not found")
        po_id = grn_row[0]

        # Get all product lines for this PO
        cursor.execute("""
            SELECT l.product_id, p.name, l.ordered_qty, p.is_expiry_tracked
            FROM purchase_order_lines l
            JOIN products p ON p.products_id = l.product_id
            WHERE l.purchase_order_id = %s
        """, (po_id,))
        lines = cursor.fetchall()

        if not lines:
            raise HTTPException(status_code=404, detail="No product lines found for this PO")

        return {
            "lines": [
                {
                    "product_id":       r[0],
                    "product_name":     r[1] or r[0],
                    "ordered_qty":      float(r[2]),
                    "is_expiry_tracked": r[3]
                }
                for r in lines
            ]
        }
    finally:
        cursor.close()
        conn.close()




# =============================
#  GRN ITEMS read APIs
# =============================
@app.get("/grn-items-read")
def read_grn_item(_ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM grn_items ORDER BY grn_item_id DESC")
        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        return [
            {
                "grn_item_id": r[0],
                "grn_id": r[1],
                "product_id": r[2],
                "batch_no": r[3],
                "expiry_date": r[4],
                "received_qty": r[5],
                "accepted_qty": r[6],
                "rejected_qty": r[7],
                "location_id": r[9]
            }
            for r in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    

#==========================================
#    Putaway tasks Page
#==========================================

@app.get("/storage-locations-read")
def get_storage_locations():
    """
    Fetches all locations where zone_type is 'Storage' or not 'Dock'
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT warehouse_location_id FROM warehouse_storages WHERE zone_type NOT IN ('Dock', 'Pack') AND is_active = TRUE")
        rows = cursor.fetchall()
        return [r[0] for r in rows]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()



# =============================
#  Put Away Tasks read APIs
# =============================
@app.get("/putaway-read")
def read_putaway(_ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM putaway_tasks ORDER BY created_at DESC")
        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        return [
            {
                "task_id": r[0],
                "grn_id": r[1],
                "grn_item_id": r[2],
                "product_id": r[3],
                "batch_no": r[4],
                "suggested_quantity": r[5],
                "actual_quantity": r[6],
                "suggested_location": r[7],
                "actual_location": r[8],
                "status": r[9],
                "completed_at": r[11]
            }
            for r in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/putaway-locations/{task_id}")
def get_filtered_locations(task_id: str):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # 🔹 Step 1: Get task
        cursor.execute("""
            SELECT product_id, suggested_quantity, grn_id, suggested_location, status
            FROM putaway_tasks
            WHERE task_id = %s
        """, (task_id,))
        task = cursor.fetchone()

        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        product_id, suggested_qty, grn_id, suggested_location, status = task

        is_unassigned = (
            status == "UNASSIGNED"
            or suggested_location is None
            or suggested_location == "NO-SPACE-FOUND"
        )

        # 🔹 Step 2: Get product
        cursor.execute("""
            SELECT storage_type, product_type,
                   unit_weight_kg, material_volume_cbm
            FROM products
            WHERE products_id = %s
        """, (product_id,))
        product = cursor.fetchone()

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        storage_type, product_type, unit_weight, unit_volume = product

        unit_weight = float(unit_weight or 0)
        unit_volume = float(unit_volume or 0)

        # 🔥 Step 3: Fetch locations (Storage + Temp for UNASSIGNED)
        if is_unassigned:
            cursor.execute("""
                SELECT 
                    warehouse_location_id,
                    level,
                    max_weight_kg,
                    occupaid_weight,
                    volume_cbm,
                    occupaid_volume_cbm,
                    zone_type
                FROM warehouse_storages
                WHERE 
                    is_active = TRUE
                    AND location_status = 'Available'
                    AND (
                        (
                            zone_type = 'Temp'
                            AND warehouse_location_id LIKE '%%TEMP-IN%%'
                        )
                        OR (
                            zone_type = 'Storage'
                            AND storage_type = %s
                        )
                    )
            """, (storage_type,))
        else:
            cursor.execute("""
                SELECT 
                    warehouse_location_id,
                    level,
                    max_weight_kg,
                    occupaid_weight,
                    volume_cbm,
                    occupaid_volume_cbm,
                    zone_type
                FROM warehouse_storages
                WHERE 
                    zone_type = 'Storage'
                    AND is_active = TRUE
                    AND location_status = 'Available'
                    AND storage_type = %s
                    AND zone = %s
            """, (storage_type, product_type))

        rows = cursor.fetchall()

        valid_locations = []

        for r in rows:
            loc_id = r[0]
            level = r[1]
            max_wt = float(r[2])
            used_wt = float(r[3])
            total_vol = float(r[4])
            used_vol = float(r[5])
            zone_type = r[6]

            available_weight = max_wt - used_wt
            available_volume = total_vol - used_vol

            # 🔥 Temp logic: allow flexible fit
            if zone_type == "Temp":
                valid_locations.append({
                    "location_id": loc_id,
                    "level": level,
                    "fit_qty": int(suggested_qty),
                    "zone_type": zone_type,
                    "is_suggested": loc_id == suggested_location
                })
                continue
            else:
                if unit_weight <= 0 and unit_volume <= 0:
                    fit_qty = suggested_qty
                else:
                    fit_by_weight = available_weight // unit_weight if unit_weight > 0 else suggested_qty
                    fit_by_volume = available_volume // unit_volume if unit_volume > 0 else suggested_qty
                    fit_qty = int(min(fit_by_weight, fit_by_volume))

            if fit_qty > 0:
                valid_locations.append({
                    "location_id": loc_id,
                    "level": level,
                    "fit_qty": fit_qty,
                    "zone_type": zone_type,
                    "is_suggested": loc_id == suggested_location
                })

        # 🔥 Sorting priority
        valid_locations.sort(
            key=lambda x: (
                x["zone_type"] != "Storage",   # Storage first
                not x["is_suggested"],         # Suggested next
                -x["fit_qty"]                 # Bigger capacity
            )
        )

        return valid_locations

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



# =============================
#  Get GRN Pending Qty (Use Max)
# =============================
@app.get("/putaway-max-qty/{task_id}")
def get_max_qty(task_id: str):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # 🔹 Step 1: Get GRN ID
        cursor.execute("""
            SELECT grn_id
            FROM putaway_tasks
            WHERE task_id = %s
        """, (task_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Task not found")

        grn_id = row[0]

        # 🔹 Step 2: Sum all PENDING qty for that GRN
        cursor.execute("""
            SELECT COALESCE(SUM(suggested_quantity), 0)
            FROM putaway_tasks
            WHERE grn_id = %s
              AND status = 'PENDING'
        """, (grn_id,))

        total_pending = cursor.fetchone()[0]

        return {
            "grn_id": grn_id,
            "pending_qty": int(total_pending)
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))




class PutawayConfirmRequest(BaseModel):
    request_id: str
    location_id: str
    quantity: int

# =============================
#  PUTAway confirm
# =============================
@app.post("/putaway-confirm/{task_id}")
def confirm_putaway(task_id: str, payload: PutawayConfirmRequest, _ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT task_id
            FROM putaway_tasks
            WHERE request_id = %s
        """, (payload.request_id,))

        existing = cursor.fetchone()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Duplicate request detected"
            )

        actual_location = payload.location_id
        actual_qty      = payload.quantity

        # =====================================================================
        # 🔹 1. Get Task
        # =====================================================================
        cursor.execute("""
            SELECT product_id, grn_id
            FROM putaway_tasks
            WHERE task_id = %s
        """, (task_id,))
        task = cursor.fetchone()

        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        product_id, grn_id = task

        # =====================================================================
        # 🔹 2. Get Dock Location from GRN
        # =====================================================================
        cursor.execute("""
            SELECT dock_location_id
            FROM goods_receipts
            WHERE grn_id = %s
        """, (grn_id,))
        grn_loc          = cursor.fetchone()
        dock_location_id = grn_loc[0] if grn_loc else None

        # =====================================================================
        # 🔹 3. Product details
        # =====================================================================
        cursor.execute("""
            SELECT unit_weight_kg, material_volume_cbm
            FROM products
            WHERE products_id = %s
        """, (product_id,))
        prod_row = cursor.fetchone()

        if not prod_row:
            raise HTTPException(status_code=404, detail="Product not found")

        unit_weight = float(prod_row[0] or 0)
        unit_volume = float(prod_row[1] or 0)

        used_weight = unit_weight * actual_qty
        used_volume = unit_volume * actual_qty

        # =====================================================================
        # 🔹 4. Storage validation
        # =====================================================================
        cursor.execute("""
            SELECT max_weight_kg, occupaid_weight, volume_cbm, occupaid_volume_cbm
            FROM warehouse_storages
            WHERE warehouse_location_id = %s
        """, (actual_location,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Location not found")

        max_wt    = float(row[0] or 0)
        used_wt   = float(row[1] or 0)
        total_vol = float(row[2] or 0)
        fill_vol  = float(row[3] or 0)

        # Account for OTHER pending putaway tasks already targeting this location
        cursor.execute("""
            SELECT
                COALESCE(SUM(pt.suggested_quantity * p.material_volume_cbm), 0),
                COALESCE(SUM(pt.suggested_quantity * p.unit_weight_kg), 0)
            FROM putaway_tasks pt
            JOIN products p ON pt.product_id = p.products_id
            WHERE pt.suggested_location = %s
              AND pt.status = 'PENDING'
              AND pt.task_id != %s
        """, (actual_location, task_id))
        pending_row = cursor.fetchone()
        pending_vol = float(pending_row[0] or 0)
        pending_wt  = float(pending_row[1] or 0)

        new_weight = used_wt  + pending_wt  + used_weight
        new_volume = fill_vol + pending_vol + used_volume

        weight_exceeded = max_wt    > 0 and new_weight > max_wt
        volume_exceeded = total_vol > 0 and new_volume > total_vol

        if weight_exceeded :
            raise HTTPException(status_code=400, detail="Weight exceeds location capacity")
        if volume_exceeded:
            raise HTTPException(status_code=400, detail="Volume exceeds location capacity")

        # =====================================================================
        # 🔹 5. GRN qty validation
        # =====================================================================
        cursor.execute("""
            SELECT COALESCE(SUM(suggested_quantity), 0)
            FROM putaway_tasks
            WHERE grn_id = %s
        """, (grn_id,))
        total_grn_qty = cursor.fetchone()[0]

        cursor.execute("""
            SELECT COALESCE(SUM(actual_quantity), 0)
            FROM putaway_tasks
            WHERE grn_id   = %s
              AND task_id != %s
        """, (grn_id, task_id))
        used_qty = cursor.fetchone()[0]

        remaining_qty = total_grn_qty - used_qty

        if actual_qty > remaining_qty:
            raise HTTPException(
                status_code=400,
                detail=f"Exceeded GRN limit. Remaining allowed: {remaining_qty}"
            )

        # =====================================================================
        # 🔹 6. Full putaway check
        # =====================================================================
        is_full_putaway = (actual_qty == total_grn_qty)

        # =====================================================================
        # 🔹 7. Update storage capacity (skip for Temp zones)
        # =====================================================================
        cursor.execute("""
            SELECT zone_type FROM warehouse_storages
            WHERE warehouse_location_id = %s
        """, (actual_location,))
        zone_row = cursor.fetchone()
        zone_type = zone_row[0] if zone_row else None

        if zone_type != 'Temp':
            cursor.execute("""
                UPDATE warehouse_storages
                SET occupaid_weight     = %s,
                    occupaid_volume_cbm = %s,
                    updated_at          = NOW()
                WHERE warehouse_location_id = %s
            """, (new_weight, new_volume, actual_location))

        # =====================================================================
        # 🔹 8. Complete current task
        # =====================================================================
        cursor.execute("""
            UPDATE putaway_tasks
            SET actual_quantity = %s,
                actual_location = %s,
                status          = 'COMPLETED',
                completed_at    = NOW(),
                request_id = %s
            WHERE task_id = %s
        """, (actual_qty, actual_location, payload.request_id, task_id))

        # =====================================================================
        # 🔹 9. Cancel other tasks if full putaway
        # =====================================================================
        if is_full_putaway:
            cursor.execute("""
                UPDATE putaway_tasks
                SET status       = 'CANCELLED',
                    completed_at = NOW()
                WHERE grn_id   = %s
                  AND task_id != %s
                  AND status  != 'COMPLETED'
            """, (grn_id, task_id))

        # =====================================================================
        # 🔹 10. Get expiry date from GRN items
        # =====================================================================
        cursor.execute("""
            SELECT expiry_date
            FROM grn_items
            WHERE grn_id = %s
        """, (grn_id,))
        grn_row     = cursor.fetchone()
        expiry_date = grn_row[0] if grn_row else None

        # =====================================================================
        # 🔹 11. Update stock_balances + ledger + GRN item location
        # =====================================================================
        cursor.execute("""
            SELECT product_id, actual_location, batch_no, actual_quantity
            FROM putaway_tasks
            WHERE task_id = %s AND status = 'COMPLETED'
        """, (task_id,))
        completed_rows = cursor.fetchall()

        for crow in completed_rows:
            c_product_id, location_id, batch_no, total_qty = crow
            total_qty = float(total_qty or 0)

            # Get warehouse_id
            cursor.execute("""
                SELECT warehouse_id
                FROM warehouse_storages
                WHERE warehouse_location_id = %s
            """, (location_id,))
            wh           = cursor.fetchone()
            warehouse_id = wh[0] if wh else None

            # Snapshot BEFORE stock insert
            cursor.execute("""
                SELECT COALESCE(SUM(on_hand_qty), 0)
                FROM stock_balances
                WHERE product_id   = %s
                  AND warehouse_id = %s
                  AND location_id  = %s
            """, (c_product_id, warehouse_id, location_id))
            snap        = cursor.fetchone()
            snap_before = float(snap[0]) if snap else 0.0

            # Stock balance upsert
            cursor.execute("""
                INSERT INTO stock_balances (
                    product_id, warehouse_id, location_id,
                    batch_no, expiry_date, on_hand_qty, reserved_qty, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, 0, CURRENT_TIMESTAMP)
                ON CONFLICT (product_id, warehouse_id, location_id, batch_no)
                DO UPDATE SET
                    on_hand_qty = stock_balances.on_hand_qty + EXCLUDED.on_hand_qty,
                    updated_at  = CURRENT_TIMESTAMP;
            """, (c_product_id, warehouse_id, location_id, batch_no, expiry_date, total_qty))

            # ✅ Handle both dict and string return from get_current_user
            if isinstance(_, dict):
                created_by = _.get("username", "unknown")
            else:
                created_by = str(_)

            # Ledger entry
            insert_ledger(
                cursor,
                c_product_id,
                warehouse_id,
                location_id,
                batch_no,
                "PUT AWAY",
                grn_id,
                total_qty,
                created_by,
                from_location_id = dock_location_id,
                before_qty       = snap_before,
                reference_type   = "PUTAWAY"
            )

            # GRN item location update
            cursor.execute("""
                UPDATE grn_items
                SET location_id = CASE
                    WHEN location_id IS NULL OR location_id = '-' OR location_id = ''
                        THEN %s
                    WHEN location_id NOT LIKE '%%' || %s || '%%'
                        THEN location_id || ', ' || %s
                    ELSE location_id
                END
                WHERE grn_id     = %s
                  AND product_id = %s
                  AND batch_no   = %s
            """, (location_id, location_id, location_id, grn_id, c_product_id, batch_no))

        # =====================================================================
        # ✅ STEP 1 — Putaway done
        # ✅ STEP 2 — Commit stock update
        # =====================================================================
        conn.commit()
        print(f"[PUTAWAY] Task {task_id} committed. product={product_id} location={actual_location} qty={actual_qty}")

        # =====================================================================
        # ✅ STEP 3 — Auto reserve trigger
        # Stock is now in stock_balances, safe to reserve against pending orders
        # =====================================================================
        try:
            auto_reserve_on_stock_arrival(product_id, created_by)
            print(f"[PUTAWAY] Auto-reserve triggered for product {product_id}")
        except Exception as e:
            print(f"[WARNING] Auto-reserve failed for {product_id}: {e}")

        # =====================================================================
        # ✅ STEP 4 — Success response
        # =====================================================================
        return {
            "message"      : "Putaway completed successfully",
            "full_putaway" : is_full_putaway,
            "task_id"      : task_id,
            "product_id"   : product_id,
            "location"     : actual_location,
            "qty"          : actual_qty
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        cursor.close()
        conn.close()


# ============================================================
# STOCK LEDGER INSERT FUNCTION
# ============================================================
def insert_ledger(
    cursor,
    product_id,
    warehouse_id,
    location_id,
    batch_no,
    movement_type,
    reference_id,
    quantity,
    created_by,
    from_location_id=None,
    before_qty=None,
    reference_type=None,
    to_location_id=None
):

    INBOUND = {
        "PUT AWAY"
    }

    OUTBOUND = {
        "OUT",
        "DISPATCH",
        "PACKAGED"
    }

    RESERVE = {
        "RESERVE",
        "PARTIALLY RESERVED"   
    }

    CANCEL = {
        "RESERVATION CANCELLED"
    }

    quantity = abs(float(quantity))

    if before_qty is None:

        cursor.execute("""
            SELECT
                COALESCE(SUM(on_hand_qty), 0),
                COALESCE(SUM(reserved_qty), 0)
            FROM stock_balances
            WHERE product_id   = %s
              AND warehouse_id = %s
              AND location_id  = %s
              AND batch_no     = %s
        """, (
            product_id,
            warehouse_id,
            location_id,
            batch_no
        ))

        snap = cursor.fetchone()
        on_hand_qty  = float(snap[0] or 0)
        reserved_qty = float(snap[1] or 0)

        if movement_type in OUTBOUND:
            before_qty = on_hand_qty
        else:
            before_qty = on_hand_qty - reserved_qty

    before_qty = float(before_qty)

    if movement_type in INBOUND:
        movement_qty = +quantity
    elif movement_type in OUTBOUND:
        movement_qty = +quantity         
    elif movement_type in RESERVE:
        movement_qty = +quantity
    elif movement_type in CANCEL:
        movement_qty = +quantity
    else:
        movement_qty = quantity

    if movement_type in INBOUND:
        after_qty = before_qty + quantity
    elif movement_type in OUTBOUND:
        after_qty = max(0, before_qty - quantity)  # ✅ prevent negative
    elif movement_type in RESERVE:
        after_qty = max(0, before_qty - quantity)
    elif movement_type in CANCEL:
        after_qty = before_qty + quantity
    else:
        after_qty = before_qty

    # ── FROM / TO LOCATION ──────────────────────────────────────────
    if movement_type in INBOUND:
        from_loc = from_location_id
        to_loc   = location_id

    elif movement_type in OUTBOUND:
        from_loc = location_id
        to_loc   = to_location_id        # ← packing zone / dispatch loc

    elif movement_type in CANCEL:
        from_loc = location_id
        to_loc   = None

    else:
        from_loc = location_id
        to_loc   = None

    today  = datetime.now().strftime("%y%m%d")
    prefix = f"MOV-{today}-"

    cursor.execute("""
        SELECT movement_id
        FROM stock_ledger
        WHERE movement_id LIKE %s
        ORDER BY movement_id DESC
        LIMIT 1
    """, (f"{prefix}%",))

    last = cursor.fetchone()

    if last:
        try:
            last_num    = int(last[0].split("-")[-1])
            movement_id = f"{prefix}{str(last_num + 1).zfill(3)}"
        except Exception:
            movement_id = f"{prefix}001"
    else:
        movement_id = f"{prefix}001"

    cursor.execute("""
        INSERT INTO stock_ledger
        (
            movement_id,
            product_id,
            warehouse,
            from_location,
            to_location,
            batch_no,
            movement_type,
            reference_id,
            reference_type,
            before_qty,
            movement_qty,
            after_qty,
            created_by,
            created_datetime
        )
        VALUES
        (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
        )
    """, (
        movement_id,
        product_id,
        warehouse_id,
        from_loc,
        to_loc,
        batch_no or "-",
        movement_type,
        reference_id,
        reference_type,
        before_qty,
        movement_qty,
        after_qty,
        created_by
    ))

    if movement_type in RESERVE:
        ui_qty = -movement_qty            # ← negative for display
    elif movement_type in CANCEL:
        ui_qty = movement_qty
    elif movement_type in OUTBOUND:
        ui_qty = -movement_qty            # ← negative for UI display (stock going out)
    else:
        ui_qty = movement_qty

    print(
        f"[LEDGER] "
        f"{movement_type} | "
        f"Before={before_qty} | "
        f"DB(stored)=+{movement_qty} | "
        f"UI(display)={ui_qty} | "
        f"After={after_qty} | "
        f"From={from_loc} | "
        f"To={to_loc}"
    )

# =============================
#  STOCK LEDGER- api 
# =============================
@app.get("/stock-ledger-read")
def read_ledger(_ = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                movement_id,
                product_id,
                warehouse,
                from_location,
                to_location,
                batch_no,
                movement_type,
                reference_id,
                reference_type,
                before_qty,
                movement_qty,
                after_qty,
                created_by,
                created_datetime
            FROM stock_ledger
            ORDER BY created_datetime DESC
        """)

        rows = cursor.fetchall()
        result = []

        for r in rows:
            result.append({
                "movement_id":      r[0],
                "product_id":       r[1],
                "warehouse":        r[2] or "-",
                "from_location":    r[3] or "-",
                "to_location":      r[4] or "-",
                "batch_no":         r[5] or "-",
                "movement_type":    r[6],
                "reference_id":     r[7] or "-",
                "reference_type":   r[8] or "-",
                "before_qty":       float(r[9])  if r[9]  is not None else 0,
                "movement_qty":     float(r[10]) if r[10] is not None else 0,
                "after_qty":        float(r[11]) if r[11] is not None else 0,
                "created_by":       r[12] or "-",
                "created_datetime": r[13].strftime("%Y-%m-%d %H:%M:%S") if r[13] else None,
            })

        return result

    finally:
        cursor.close()
        conn.close()


        
# ======================================
# EXPIRY Details for Batches table
# =======================================
@app.get("/expiry-dashboard")
def expiry_dashboard(_ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT 
                p.name AS product_name,
                sb.product_id,
                sb.batch_no,
                sb.expiry_date,

                -- Days Left
                (sb.expiry_date - CURRENT_DATE) AS days_left,

                sb.on_hand_qty,

                -- Location Format (WH-ZONE-RACK-SHELF)
                (sb.warehouse_id || '-' || sb.location_id) AS location,

                -- Product Cost
                p.unit_cost,

                -- Expiry Status
                CASE 
                    WHEN sb.expiry_date < CURRENT_DATE THEN 'EXPIRED'
                    WHEN sb.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING_SOON'
                    ELSE 'SAFE'
                END AS status

            FROM stock_balances sb
            JOIN products p ON sb.product_id = p.products_id

            WHERE sb.on_hand_qty > 0
            AND sb.expiry_date IS NOT NULL

            ORDER BY sb.expiry_date ASC
        """)

        rows = cursor.fetchall()

        result = []

        for r in rows:
            product_name = r[0]
            product_id = r[1]
            batch_no = r[2]
            expiry_date = r[3]
            days_left = r[4]
            qty = float(r[5])
            location = r[6]
            unit_cost = float(r[7])
            status = r[8]

            expiry_value = qty * unit_cost

            result.append({
                "product": product_name,
                "product_id": product_id,
                "batch": batch_no,
                "expiry": expiry_date.strftime("%d-%m-%Y") if expiry_date else None,
                "days_left": int(days_left) if days_left is not None else None,
                "qty": qty,
                "location": location,
                "expiry_stock_value": round(expiry_value, 2),
                "status": status
            })

        cursor.close()
        conn.close()

        return result

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    




# ===============================================================
# EXPIRY ALERT API for Batches Page --> ExpiryAlertPopup.jsx
# ===============================================================
@app.get("/expiry-alerts")
def expiry_alerts():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT 
                p.name,
                sb.batch_no,
                sb.expiry_date,
                (sb.expiry_date - CURRENT_DATE) AS days_left,
                sb.on_hand_qty,

                CASE 
                    WHEN sb.expiry_date < CURRENT_DATE THEN 'EXPIRED'
                    WHEN sb.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'CRITICAL'
                    WHEN sb.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'WARNING'
                    ELSE 'SAFE'
                END AS alert_level

            FROM stock_balances sb
            JOIN products p ON sb.product_id = p.products_id

            WHERE sb.on_hand_qty > 0
            AND sb.expiry_date IS NOT NULL
            AND sb.expiry_date <= CURRENT_DATE + INTERVAL '30 days'

            ORDER BY sb.expiry_date ASC
        """)

        rows = cursor.fetchall()

        alerts = []

        for r in rows:
            alerts.append({
                "product": r[0],
                "batch": r[1],
                "expiry": r[2].strftime("%d-%m-%Y"),
                "days_left": int(r[3]),
                "qty": float(r[4]),
                "level": r[5]
            })

        cursor.close()
        conn.close()

        return alerts

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

  
# ═══════════════════════════════════════════════════════════════════════════════
# STOCK TRANSFER
# ═══════════════════════════════════════════════════════════════════════════════
# ── Helper functions ───────────────────────────────────────────────────────────
@app.post("/sync-reserved-quantities")
def sync_reserved_quantities_api():

    conn = get_connection()
    cursor = conn.cursor()

    try:
        n = sync_reserved_quantities(cursor)
        conn.commit()
        return {"message": "Reserved quantities synced successfully", "records_synced": n}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    finally:
        cursor.close()
        conn.close()




def generate_dispatch_id(cursor):
    cursor.execute("SELECT COALESCE(MAX(CAST(SPLIT_PART(dispatches_id,'-',2) AS INTEGER)),0) FROM dispat")
    return f"DP-{(cursor.fetchone()[0] or 0) + 1:03d}"





def _zone_code(z): return {"Raw Materials": "RM", "Finished Goods": "FG", "Trading Items": "TI"}.get(z, z)

def _product_row(r):
    return {"products_id": r[0], "name": r[1], "barcode": r[2], "unit": r[3], "product_type": r[4],
            "is_batch_tracked": r[5], "is_expiry_tracked": r[6], "minimum_stock": to_float(r[7]),
            "unit_cost": to_float(r[8]), "is_active": r[9],
            "created_at": r[10].strftime("%Y-%m-%d") if r[10] else None,
            "updated_at": r[11].strftime("%Y-%m-%d %H:%M:%S") if r[11] else None}


# ── Auto-reserve ───────────────────────────────────────────────────────────────
@app.get("/stock-movements-summary")
def stock_movements_summary():
    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT movement_type, SUM(ABS(quantity)) as total_qty, COUNT(*) as count
            FROM stock_ledger GROUP BY movement_type""")
        rows = cursor.fetchall()
        out_types = {'TRANSFER_OUT', 'CANCEL_RESERVATION', 'TRANSFER_CANCEL'}
        in_types = {'IN', 'PURCHASE', 'TRANSFER_IN', 'RESERVE'}
        total_in = 0.0; total_out = 0.0; total_reserve = 0.0; total_movements = 0
        breakdown = {}
        for r in rows:
            mtype, qty, cnt = r[0], to_float(r[1]), r[2]
            breakdown[mtype] = {"qty": qty, "count": cnt}
            total_movements += cnt
            if mtype in in_types and mtype not in {'RESERVE'}:
                total_in += qty
            elif mtype == 'RESERVE':
                total_reserve += qty
            elif mtype in out_types:
                total_out += qty
        return {"total_movements": total_movements, "total_in": total_in,
                "total_out": total_out, "total_reserve": total_reserve, "breakdown": breakdown}
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))
    finally: cursor.close(); conn.close()


def calculate_status(ordered, reserved, issued=0):
    ordered = round(to_float(ordered), 5)
    reserved = round(to_float(reserved), 5)
    issued = round(to_float(issued), 5)
    if issued >= ordered: return "COMPLETED"
    if reserved >= ordered or abs(reserved - ordered) < 0.00001: return "RESERVED"
    if reserved > 0: return "PARTIALLY_RESERVED"
    return "OPEN"


# ── Sync reserved ──────────────────────────────────────────────────────────────
def sync_reserved_quantities(cursor):
    try:
        cursor.execute("""
            SELECT product_id,batch_no,SUM(reserved_qty) FROM orders
            WHERE status IN ('RESERVED','PARTIALLY_RESERVED') AND reserved_qty>0
              AND batch_no IS NOT NULL AND batch_no!='-'
            GROUP BY product_id,batch_no""")
        synced = 0
        for pid, bn, total in cursor.fetchall():
            total = total
            cursor.execute("""SELECT id, reserved_qty, on_hand_qty
                FROM stock_balances WHERE product_id=%s AND batch_no=%s""", (pid, bn))
            stock = cursor.fetchone()
            if stock:
                sb_id, sb_reserved, sb_on_hand = stock[0], stock[1], stock[2]
                effective_reserved = min(total, sb_on_hand)
                if sb_reserved != effective_reserved and sb_on_hand > 0:
                    cursor.execute("UPDATE stock_balances SET reserved_qty=%s,updated_at=CURRENT_TIMESTAMP WHERE id=%s",
                                   (effective_reserved, sb_id)); synced += 1
            else:
                cursor.execute("INSERT INTO stock_balances (product_id,warehouse_id,location_id,batch_no,on_hand_qty,reserved_qty) VALUES (%s,'WH001','LOC001',%s,%s,%s)",
                               (pid, bn, total, total)); synced += 1
        return synced
    except Exception as e:
        print(f"Error in sync_reserved_quantities: {e}"); return 0

@app.get("/reserved-stock-for-transfer")
def get_reserved_stock_for_transfer(product_id: Optional[str] = None):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # ✅ Base conditions
        where_clauses = [
            "o.status = 'RESERVED'",
            """NOT EXISTS (
                SELECT 1 FROM stock_transfers st
                WHERE st.so_number = o.so_number
                AND st.status IN ('PENDING', 'COMPLETED')
            )"""
        ]
        params = []



        if product_id:
            where_clauses.append("o.product_id = %s")
            params.append(resolve_product_id(cursor, product_id))

        where = "WHERE " + " AND ".join(where_clauses)

        cursor.execute(f"""
            SELECT
                o.so_number,
                o.product_id,
                COALESCE(p.name, 'Unknown') AS product_name,
                o.batch_no,
                o.reserved_qty
            FROM orders o
            LEFT JOIN products p ON o.product_id = p.products_id
            {where}
            ORDER BY o.id
        """, params)

        orders = cursor.fetchall()
        result = []
        s_no = 1

        for order in orders:
            so_number, prod_id, product_name, batch_no_str, reserved_qty = order
            reserved_qty = reserved_qty

            if not batch_no_str or batch_no_str == '-':
                result.append({
                    "s_no": s_no,
                    "order_no": so_number,
                    "from_location": "-",
                    "product_id": prod_id,
                    "product_name": product_name,
                    "batch_no": "-",
                    "reserved_qty": reserved_qty,
                    "dispatch_area": "",
                    "action": "Transfer"
                })
                s_no += 1
                continue

            batches = [b.strip() for b in batch_no_str.split(',') if b.strip()]

            # Fetch location for each batch — only for from_location display
            batch_locations = []
            for bn in batches:
                cursor.execute("""
                    SELECT warehouse_id, location_id
                    FROM stock_balances
                    WHERE product_id = %s AND batch_no = %s
                    LIMIT 1
                """, (prod_id, bn))
                sb = cursor.fetchone()
                if sb:
                    wh_id, loc_id = sb
                    from_loc = f"{wh_id} {loc_id}" if loc_id else wh_id
                    batch_locations.append({
                        "batch_no": bn,
                        "from_location": from_loc
                    })

            if len(batch_locations) <= 1:
                # Single batch row
                result.append({
                    "s_no": s_no,
                    "order_no": so_number,
                    "from_location": batch_locations[0]["from_location"] if batch_locations else "-",
                    "product_id": prod_id,
                    "product_name": product_name,
                    "batch_no": batch_locations[0]["batch_no"] if batch_locations else batch_no_str,
                    "reserved_qty": reserved_qty,
                    "dispatch_area": "",
                    "action": "Transfer"
                })
            else:
                # Multi-batch — combine locations, use order's reserved_qty directly
                from_locations = ", ".join(
                    dict.fromkeys(bl["from_location"] for bl in batch_locations)
                )
                all_batches = ", ".join(bl["batch_no"] for bl in batch_locations)

                result.append({
                    "s_no": s_no,
                    "order_no": so_number,
                    "from_location": from_locations,
                    "product_id": prod_id,
                    "product_name": product_name,
                    "batch_no": all_batches,
                    "reserved_qty": reserved_qty,
                    "dispatch_area": "",
                    "action": "Transfer"
                })

            s_no += 1

        return result

    except Exception as e:
        print(f"[ERROR] {e}")
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@app.get("/batches")
def get_batches(product_id: Optional[str] = None):
    conn = get_connection(); cursor = conn.cursor()
    try:
        q = """SELECT ROW_NUMBER() OVER (ORDER BY product_id, expiry_date ASC NULLS LAST) AS row_num,
                      product_id, warehouse_id, location_id, batch_no, expiry_date,
                      on_hand_qty, COALESCE(reserved_qty,0),
                      (on_hand_qty - COALESCE(reserved_qty,0))
               FROM stock_balances WHERE 1=1"""
        p = []
        if product_id: q += " AND product_id=%s"; p.append(resolve_product_id(cursor, product_id))
        q += " ORDER BY product_id, expiry_date ASC NULLS LAST"
        cursor.execute(q, p)
        return [{"row_num": r[0], "product_id": r[1], "warehouse_id": r[2], "location_id": r[3], "batch_no": r[4],
                 "expiry_date": r[5].strftime("%Y-%m-%d") if r[5] else None,
                 "on_hand_qty": to_float(r[6]), "reserved_qty": to_float(r[7]), "available_qty": to_float(r[8])} for r in cursor.fetchall()]
    finally: cursor.close(); conn.close()

@app.get("/products-active")
def read_active_products():
    try:
        conn = get_connection(); cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE is_active=TRUE ORDER BY name")
        rows = cursor.fetchall(); cursor.close(); conn.close()
        
        return [_product_row(r) for r in rows]
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================
#  stock_balances read APIs
# =============================
@app.get("/stock-balances-read")
def read_stock_balances(_ = Depends(get_current_user)
):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM stock_balances ORDER BY updated_at DESC")
        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        return [
            {
                "id": r[0],
                "product_id": r[1],
                "warehouse_id": r[2],
                "location_id": r[3],
                "batch_no": r[4],
                "expiry_date": r[5],
                "on_hand_qty": r[6],
                "reserved_qty": r[7],
                "created_at": r[8],
                "updated_at": r[9]
            }
            for r in rows
        ]

    except Exception as e:
         raise HTTPException(status_code=400, detail=str(e))
    
     

# =============================
# =============================
# SO number generator helper
# =============================
def generate_so_number(cursor) -> str:
    """Generate a sequential SO number: SO-YYMMDD-NNN"""
    from datetime import date as _date
    today = _date.today()
    date_part = today.strftime("%y%m%d")
    cursor.execute(
        "SELECT so_number FROM orders WHERE so_number LIKE %s ORDER BY so_number DESC LIMIT 1 FOR UPDATE",
        (f"SO-{date_part}-%",)
    )
    last = cursor.fetchone()
    if last:
        next_no = int(last[0].split("-")[-1]) + 1
    else:
        next_no = 1
    return f"SO-{date_part}-{str(next_no).zfill(3)}"

# =============================
# Sales Order CREATE  API
# =============================
@app.post("/sales-orders-create")
def create_sales_order(order: dict, _ = Depends(get_current_user)):

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT so_number FROM orders WHERE request_id = %s", (order.get("request_id"),))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Duplicate request detected")

        cid = order.get("customer_id")
        
        # ✅ Handle both dict and string return from get_current_user
        if isinstance(_, dict):
            created_by = _.get("username", "unknown")
        else:
            created_by = str(_)

        # GENERATE SO NUMBER
        so = generate_so_number(cursor)

        total_amount = 0.0
        overall_status_set = set()
        all_batches_used = []

        # Insert header first
        cursor.execute("""
            INSERT INTO orders (so_number, customer_id, status, total_amount, request_id, created_by)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
        """, (so, cid, "PENDING", 0.0, order.get("request_id"), created_by))
        order_id = cursor.fetchone()[0]

        for line in order.get("lines", []):
            pid = line.get("product_id")
            oqty = float(line.get("ordered_qty"))
            
            cursor.execute("SELECT Unit_cost FROM products WHERE products_id = %s", (pid,))
            price_row = cursor.fetchone()
            unit_price = float(price_row[0]) if price_row and price_row[0] else 0.0
            line_total = unit_price * oqty
            total_amount += line_total

            rem = oqty
            total_res = 0.0
            blist = []

            # FETCH STOCK (FEFO)
            cursor.execute("""
                SELECT batch_no, on_hand_qty, COALESCE(reserved_qty, 0), warehouse_id, location_id
                FROM stock_balances
                WHERE product_id = %s
                  AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
                  AND (on_hand_qty - COALESCE(reserved_qty, 0)) > 0
                ORDER BY expiry_date ASC NULLS LAST, created_at ASC, id ASC
            """, (pid,))
            rows = cursor.fetchall()

            for row in rows:
                batch_no, on_hand, reserved, warehouse_id, location_id = row
                on_hand = float(on_hand)
                reserved = float(reserved)
                avail = on_hand - reserved
                if avail <= 0: continue
                rq = min(rem, avail)
                if rq <= 0: continue
                
                before_qty = avail
                # UPDATE STOCK BALANCE
                cursor.execute("""
                    UPDATE stock_balances
                    SET reserved_qty = COALESCE(reserved_qty, 0) + %s, updated_at = CURRENT_TIMESTAMP
                    WHERE product_id = %s AND batch_no = %s AND location_id = %s
                """, (rq, pid, batch_no, location_id))
                
                rem -= rq
                total_res += rq
                blist.append({"batch_no": batch_no, "reserved_qty": rq, "warehouse_id": warehouse_id, "location_id": location_id, "before_qty": before_qty})
                all_batches_used.append({"product_id": pid, "batch_no": batch_no, "location_id": location_id, "reserved_qty": rq})
                if rem <= 0: break

            if total_res == 0:
                line_status = "OPEN"
            elif total_res < oqty:
                line_status = "PARTIALLY_RESERVED"
            else:
                line_status = "RESERVED"
            
            overall_status_set.add(line_status)

            final_movement_type = "PARTIALLY RESERVED" if total_res < oqty else "RESERVE"
            for b in blist:
                insert_ledger(cursor, product_id=pid, warehouse_id=b["warehouse_id"], location_id=b["location_id"], batch_no=b["batch_no"], movement_type=final_movement_type, reference_id=so, quantity=b["reserved_qty"], created_by=created_by, before_qty=b["before_qty"], reference_type="ORDER")

            # INSERT sales_order_lines
            cursor.execute("""
                INSERT INTO sales_order_lines (so_number, product_id, ordered_qty, reserved_qty, issued_qty, unit_price, total_price, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (so, pid, oqty, total_res, 0, unit_price, line_total, line_status))

        # FINAL STATUS
        header_status = "OPEN"
        if "OPEN" in overall_status_set and "PARTIALLY_RESERVED" not in overall_status_set and "RESERVED" not in overall_status_set:
            header_status = "OPEN"
        elif "OPEN" not in overall_status_set and "PARTIALLY_RESERVED" not in overall_status_set and "RESERVED" in overall_status_set:
            header_status = "RESERVED"
        else:
            header_status = "PARTIALLY_RESERVED"

        cursor.execute("UPDATE orders SET total_amount = %s, status = %s WHERE so_number = %s", (total_amount, header_status, so))
        
        conn.commit()

        # POST PROCESS
        try:
            auto_create_purchase_orders(so)
        except Exception as e:
            print(f"[WARNING] auto_create_purchase_orders failed: {e}")

        try:
            create_pick_tasks_header(so)
        except Exception as e:
            print(f"[WARNING] create_pick_tasks_header failed: {e}")

        return {
            "message": "Sales Order Created Successfully",
            "order_id": order_id,
            "order_number": so,
            "status": header_status,
            "batches_used": all_batches_used
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()


def create_pick_tasks_header(order_id):
    import traceback
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT 1 FROM pick_task_header WHERE order_id = %s", (order_id,))
        if cursor.fetchone():
            return

        cursor.execute("SELECT so_number, status, total_amount FROM orders WHERE so_number = %s", (order_id,))
        order = cursor.fetchone()
        if not order: return

        so_number, status, total_amount = order
        if status != "RESERVED":
            print(f"[PICK TASK] Skipping {order_id}: status is {status}")
            return

        today = date.today()
        date_part = today.strftime("%y%m%d")

        cursor.execute("SELECT picking_id FROM pick_task_header WHERE picking_id LIKE %s ORDER BY picking_id DESC LIMIT 1", (f"PICK-{date_part}-%",))
        last = cursor.fetchone()

        if last:
            last_no = int(last[0].split("-")[-1])
            next_no = last_no + 1
        else:
            next_no = 1

        picking_id = f"PICK-{date_part}-{str(next_no).zfill(3)}"

        cursor.execute("SELECT SUM(ordered_qty), SUM(issued_qty) FROM sales_order_lines WHERE so_number = %s", (order_id,))
        totals = cursor.fetchone()
        total_req = totals[0] or 0
        total_picked = totals[1] or 0

        cursor.execute("""
            INSERT INTO pick_task_header (picking_id, order_id, total_required_qty, total_picked_qty, status)
            VALUES (%s, %s, %s, %s, %s)
        """, (picking_id, order_id, total_req, total_picked, "PENDING"))

        # Create pick task lines based on ledger reservations
        cursor.execute("""
            SELECT product_id, batch_no, from_location, SUM(ABS(movement_qty)) 
            FROM stock_ledger 
            WHERE reference_id = %s AND movement_type IN ('RESERVE', 'PARTIALLY RESERVED') 
            GROUP BY product_id, batch_no, from_location
            HAVING SUM(ABS(movement_qty)) > 0
        """, (order_id,))
        
        reserved_batches = cursor.fetchall()
        if not reserved_batches:
            print(f"[PICK TASK] No ledger reservations found for {order_id}")

        for pid, bno, loc, qty in reserved_batches:
            cursor.execute("""
                INSERT INTO pick_task_lines (picking_id, product_id, batch_id, location_id, required_qty, picked_qty, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (picking_id, pid, bno, loc, qty, 0, "PENDING"))

        conn.commit()
        print(f"[PICK TASK] Created {picking_id} for order {order_id} with {len(reserved_batches)} lines")

    except Exception as e:
        print(f"[PICK TASK ERROR] {e}")
        traceback.print_exc()
        conn.rollback()
    finally:
        if 'cursor' in locals() and cursor: cursor.close()
        if 'conn' in locals() and conn: conn.close()


# =============================
# Read Sales Orders API
# =============================
@app.get("/sales-orders-read")
def get_sales_orders(_ = Depends(get_current_user)):
    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT id,so_number,customer_id,status,order_date,total_amount,created_by FROM orders ORDER BY order_date DESC")
        header_rows = cursor.fetchall()
        
        cursor.execute("SELECT so_line_id, so_number, product_id, ordered_qty, reserved_qty, issued_qty, unit_price, total_price, status FROM sales_order_lines")
        line_rows = cursor.fetchall()

        from collections import defaultdict
        lines_by_so = defaultdict(list)
        for lr in line_rows:
            lines_by_so[lr[1]].append({
                "so_line_id": lr[0],
                "product_id": lr[2],
                "ordered_qty": to_float(lr[3]),
                "reserved_qty": to_float(lr[4]),
                "issued_qty": to_float(lr[5]),
                "unit_price": to_float(lr[6]),
                "total_price": to_float(lr[7]),
                "status": lr[8]
            })

        return [
            {
                "id": r[0], 
                "order_no": r[1], 
                "customer_id": r[2],
                "status": r[3], 
                "order_date": r[4].strftime("%Y-%m-%d %H:%M:%S") if r[4] else None,
                "total_amount": to_float(r[5]),
                "created_by": r[6],
                "lines": lines_by_so.get(r[1], [])
            } 
            for r in header_rows
        ]
    
    except Exception as e: 
        raise HTTPException(status_code=400, detail=str(e))
    
    finally: cursor.close(); conn.close()


# ============================================================
# SALES ORDER CANCEL
# ============================================================
@app.post("/sales-orders-cancel/{so_number}")
def cancel_sales_order(so_number: str, _ = Depends(get_current_user)):

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # ====================================================
        # GET TOTAL RESERVED QTY PER BATCH+LOCATION (AGGREGATED)
        # ====================================================
        cursor.execute("""
            SELECT
               product_id,
               batch_no,
               SUM(ABS(movement_qty)) AS qty,
               warehouse              AS warehouse_id,
               from_location          AS location_id
            FROM stock_ledger
            WHERE reference_id = %s
                AND reference_type = 'ORDER'
                AND movement_type IN ('RESERVE', 'PARTIALLY RESERVED')
            GROUP BY product_id, batch_no, warehouse, from_location
        """, (so_number,))

        rows = cursor.fetchall()

        # ====================================================
        # NO RESERVATION FOUND — just cancel header + lines
        # ====================================================
        if not rows:
            cursor.execute("""
                UPDATE orders
                SET status = 'CANCELLED'
                WHERE so_number = %s
            """, (so_number,))

            cursor.execute("""
                UPDATE sales_order_lines
                SET reserved_qty = 0, status = 'CANCELLED'
                WHERE so_number = %s
            """, (so_number,))
            conn.commit()
            return {
                "status": "success",
                "message": f"Order {so_number} cancelled (no reservations)"
            }

        product_id = None

        for row in rows:
            product_id, batch_no, qty, warehouse_id, location_id = row
            qty = float(qty or 0)

            if qty <= 0:
                continue

            # ------------------------------------------------
            # GET STOCK SNAPSHOT BEFORE RELEASE
            # ------------------------------------------------
            cursor.execute("""
                SELECT
                    COALESCE(on_hand_qty, 0),
                    COALESCE(reserved_qty, 0)
                FROM stock_balances
                WHERE product_id  = %s
                  AND batch_no    = %s
                  AND location_id = %s
                LIMIT 1
            """, (product_id, batch_no, location_id))

            stock = cursor.fetchone()

            if not stock:
                continue

            on_hand_qty  = float(stock[0] or 0)
            reserved_qty = float(stock[1] or 0)

            # available qty before release (for ledger)
            before_qty = on_hand_qty - reserved_qty

            # ------------------------------------------------
            # PREVENT DUPLICATE CANCEL LEDGER
            # ------------------------------------------------
            cursor.execute("""
                SELECT 1
                FROM stock_ledger
                WHERE reference_id   = %s
                  AND reference_type = 'ORDER'
                  AND movement_type  = 'RESERVATION CANCELLED'
                  AND product_id     = %s
                  AND batch_no       = %s
                  AND from_location  = %s
            """, (so_number, product_id, batch_no, location_id))

            exists = cursor.fetchone()

            # ✅ Handle both dict and string return from get_current_user
            if isinstance(_, dict):
                created_by = _.get("username", "unknown")
            else:
                created_by = str(_)

            if not exists:
                insert_ledger(
                    cursor,
                    product_id     = product_id,
                    warehouse_id   = warehouse_id or "NONE",
                    location_id    = location_id  or "NONE",
                    batch_no       = batch_no,
                    movement_type  = "RESERVATION CANCELLED",
                    reference_id   = so_number,
                    quantity       = qty,        
                    created_by     = created_by,
                    before_qty     = before_qty,
                    reference_type = "ORDER"
                )

            # ------------------------------------------------
            # RELEASE FULL AGGREGATED RESERVED QTY
            # ------------------------------------------------
            cursor.execute("""
                UPDATE stock_balances
                SET reserved_qty =
                    GREATEST(COALESCE(reserved_qty, 0) - %s, 0),
                    updated_at = CURRENT_TIMESTAMP
                WHERE product_id  = %s
                  AND batch_no    = %s
                  AND location_id = %s
            """, (qty, product_id, batch_no, location_id))  # ← qty is now 10, not 2

        # ====================================================
        # UPDATE ORDER + LINES STATUS
        # ====================================================
        cursor.execute("""
            UPDATE orders
            SET status = 'CANCELLED'
            WHERE so_number = %s
        """, (so_number,))

        cursor.execute("""
            UPDATE sales_order_lines
            SET reserved_qty = 0, status = 'CANCELLED'
            WHERE so_number = %s
        """, (so_number,))

        # ====================================================
        # DELETE PICK TASKS
        # ====================================================
        cursor.execute("""
            SELECT picking_id FROM pick_task_header
            WHERE order_id = %s
        """, (so_number,))
        pick_row = cursor.fetchone()

        if pick_row:
            picking_id = pick_row[0]
            cursor.execute("DELETE FROM pick_task_lines WHERE picking_id = %s", (picking_id,))
            cursor.execute("DELETE FROM pick_task_header WHERE picking_id = %s", (picking_id,))

        conn.commit()

        # ====================================================
        # AUTO RESERVE OTHER WAITING ORDERS
        # ====================================================
        if product_id:
            try:
                auto_reserve_on_stock_arrival(product_id, created_by)
            except Exception as e:
                print(f"[WARNING] Auto reserve failed: {e}")

        return {
            "status": "success",
            "message": f"Order {so_number} cancelled successfully"
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()






# =============================
# Read Pick Task Header
# =============================
@app.get("/pick-task-header-read")
def read_pick_task_header( _ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT picking_id, order_id, total_required_qty, total_picked_qty, status, completed_at, created_at, stock_updated FROM pick_task_header ORDER BY created_at DESC")
        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        return [
            {
                "picking_id": r[0],
                "order_id": r[1],
                "total_required_qty": r[2],
                "total_picked_qty": r[3],
                "status": r[4],
                "completed_at": r[5],
                "created_at": r[6],
                "stock_updated": r[7]
            }
            for r in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    

# ============================================
# Pick Task Lines Read (Filtered)
# ============================================
@app.get("/pick-task-lines-read")
def read_pick_task_lines(picking_id: str,  _ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT 
                line_id,
                picking_id,
                product_id,
                batch_id,
                location_id,
                required_qty,
                picked_qty,
                status,
                packing_zone,
                completed_at
            FROM pick_task_lines
            WHERE picking_id = %s
        """, (picking_id,))

        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        return [
            {
                "line_id":      r[0],
                "picking_id":   r[1],
                "product_id":   r[2],
                "batch_id":     r[3],
                "location_id":  r[4],
                "required_qty": float(r[5] or 0),
                "picked_qty":   float(r[6] or 0),
                "status":       r[7],
                "packing_zone": r[8],
                "completed_at": str(r[9]) if r[9] else None
            }
            for r in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    

# ============================================
# Picking tasks table Pack Location DropDown
# ============================================
@app.get("/pack-location-dropdown")
def pack_location_dropdown( _ = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT warehouse_location_id 
        FROM warehouse_storages 
        WHERE is_active = TRUE AND zone_type = 'Pack'
    """)

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    return [r[0] for r in rows]


# ============================================
# Complete Picking Line API
# ============================================
@app.put("/pick-task-line-complete/{line_id}")
def complete_pick_task_line(line_id: int, payload: dict,  _ = Depends(get_current_user)):

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # =============================
        # INPUT
        # =============================
        picked_qty = float(payload.get("picked_qty", 0))
        packing_zone = payload.get("packing_zone")

        if not packing_zone:
            raise HTTPException(status_code=400, detail="Packing zone required")

        if picked_qty < 0:
            raise HTTPException(status_code=400, detail="Picked qty cannot be negative")

        # =============================
        # FETCH LINE
        # =============================
        # =============================
        # FETCH LINE
        # =============================
        cursor.execute("""
            SELECT required_qty, picked_qty, status,
                   location_id, batch_id, picking_id, product_id
            FROM pick_task_lines
            WHERE line_id = %s
        """, (line_id,))

        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Line not found")

        required_qty, old_picked, status, location_id, batch_id, picking_id, product_id = row

        if status == "Completed":
            raise HTTPException(status_code=400, detail="Already completed")

        if picked_qty > float(required_qty):
            raise HTTPException(status_code=400, detail="Picked qty exceeds required qty")

        # =============================
        # STATUS LOGIC
        # =============================
        if picked_qty == float(required_qty):
            new_status = "Completed"
            completed_at = datetime.now()
        else:
            new_status = "Short_Picked"
            completed_at = None

        # =============================
        # UPDATE LINE
        # =============================
        cursor.execute("""
            UPDATE pick_task_lines
            SET picked_qty = %s,
                packing_zone = %s,
                status = %s,
                completed_at = %s
            WHERE line_id = %s
        """, (picked_qty, packing_zone, new_status, completed_at, line_id))

        # =============================
        # FETCH HEADER INFO
        # =============================
        cursor.execute("""
            SELECT order_id
            FROM pick_task_header
            WHERE picking_id = %s
        """, (picking_id,))

        order_id = cursor.fetchone()[0]

        # =============================
        # HEADER CALCULATION
        # =============================
        cursor.execute("""
            SELECT 
                COALESCE(SUM(picked_qty),0),
                COUNT(*),
                COALESCE(SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END),0)
            FROM pick_task_lines
            WHERE picking_id = %s
        """, (picking_id,))

        total_picked, total_lines, completed_lines = cursor.fetchone()

        if completed_lines == total_lines:
            header_status = "Completed"

            cursor.execute("""
                SELECT MAX(completed_at)
                FROM pick_task_lines
                WHERE picking_id = %s
            """, (picking_id,))

            header_completed_at = cursor.fetchone()[0]

        elif total_picked == 0:
            header_status = "Pending"
            header_completed_at = None
        else:
            header_status = "Short_Picked"
            header_completed_at = None

        # =============================
        # UPDATE HEADER
        # =============================
        cursor.execute("""
            UPDATE pick_task_header
            SET total_picked_qty = %s,
                status = %s,
                completed_at = %s
            WHERE picking_id = %s
        """, (
            total_picked,
            header_status,
            header_completed_at,
            picking_id
        ))

        # =============================
        # STOCK UPDATE (ONLY ONCE)
        # =============================
        if header_status == "Completed":

            cursor.execute("""
                SELECT stock_updated 
                FROM pick_task_header 
                WHERE picking_id = %s
            """, (picking_id,))

            stock_updated = cursor.fetchone()[0]

            if not stock_updated:

                # 🔹 Get all lines
                cursor.execute("""
                    SELECT location_id, batch_id, picked_qty, packing_zone, product_id
                    FROM pick_task_lines
                    WHERE picking_id = %s
                """, (picking_id,))

                lines = cursor.fetchall()

                for location_id, batch_id, qty, packing_zone, product_id in lines:

                    if float(qty) <= 0:
                        continue

                    # =============================
                    # GET PRODUCT DATA
                    # =============================
                    cursor.execute("""
                        SELECT unit_weight_kg, material_volume_cbm
                        FROM products
                        WHERE products_id = %s
                    """, (product_id,))

                    product = cursor.fetchone()

                    if not product:
                        raise HTTPException(status_code=400, detail="Product not found")

                    unit_weight, unit_volume = product

                    unit_weight = float(unit_weight or 0)
                    unit_volume = float(unit_volume or 0)

                    total_weight = unit_weight * float(qty)
                    total_volume = unit_volume * float(qty)

                    # =============================
                    # LOCK STOCK (ONLY ONCE - REMOVED DUPLICATE)
                    # =============================
                    cursor.execute("""
                        SELECT warehouse_id, on_hand_qty, reserved_qty
                        FROM stock_balances
                        WHERE location_id = %s 
                        AND batch_no = %s 
                        AND product_id = %s
                        FOR UPDATE
                    """, (location_id, batch_id, product_id))

                    stock = cursor.fetchone()

                    if not stock:
                        raise HTTPException(status_code=400, detail="Stock not found")

                    warehouse_id, on_hand, reserved = stock

                    # available qty before deduction
                    available_before = float(on_hand)

                    if float(on_hand) < float(qty):
                        raise HTTPException(status_code=400, detail="Insufficient stock")

                    # =============================
                    # UPDATE STOCK
                    # =============================
                    cursor.execute("""
                        UPDATE stock_balances
                        SET on_hand_qty = %s,
                            reserved_qty = %s,
                            updated_at = %s
                        WHERE location_id = %s 
                        AND batch_no = %s 
                        AND product_id = %s
                    """, (
                        float(on_hand) - float(qty),
                        max(float(reserved or 0) - float(qty), 0),
                        datetime.now(),
                        location_id,
                        batch_id,
                        product_id
                    ))

                    cursor.execute("""
                        UPDATE warehouse_storages
                        SET occupaid_volume_cbm = GREATEST(
                                COALESCE(occupaid_volume_cbm, 0) - %s,
                                0
                            ),
                            occupaid_weight = GREATEST(
                                COALESCE(occupaid_weight, 0) - %s,
                                0
                            )
                        WHERE warehouse_location_id = %s
                    """, (
                        total_volume,
                        total_weight,
                        location_id
                    ))

                    # ✅ Handle both dict and string return from get_current_user
                    if isinstance(_, dict):
                        created_by = _.get("username", "unknown")
                    else:
                        created_by = str(_)

                    # =============================
                    # INSERT LEDGER
                    # =============================
                    insert_ledger(
                        cursor,
                        product_id=product_id,
                        warehouse_id=warehouse_id,
                        location_id=location_id,
                        batch_no=batch_id,
                        movement_type="OUT",
                        reference_id=picking_id,
                        reference_type="PICKING",
                        quantity=qty,
                        created_by= created_by,
                        to_location_id=packing_zone,
                        before_qty=available_before
                    )

                    # 🔹 Update SO line issued_qty
                    cursor.execute("""
                        UPDATE sales_order_lines
                        SET issued_qty = COALESCE(issued_qty, 0) + %s,
                            status = CASE WHEN COALESCE(issued_qty, 0) + %s >= ordered_qty THEN 'Issued' ELSE status END
                        WHERE so_number = %s AND product_id = %s
                    """, (qty, qty, order_id, product_id))

                # 🔹 Update order header status
                cursor.execute("""
                    UPDATE orders
                    SET status = 'Issued'
                    WHERE so_number = %s
                """, (order_id,))

                # 🔹 Mark stock updated
                cursor.execute("""
                    UPDATE pick_task_header
                    SET stock_updated = TRUE
                    WHERE picking_id = %s
                """, (picking_id,))

                # 🔹 Create package
                create_package(cursor, order_id)

        conn.commit()

        return {
            "message": "Line updated successfully",
            "line_status": new_status,
            "header_status": header_status
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ================================================
#  PICK TASKS Table Warehouse ID Drop Down
# ================================================
@app.get("/packing-zones/{batch_id}")
def get_packing_zones(batch_id: str):

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Step 1: get warehouse_id from stock_balances
        cursor.execute("""
            SELECT warehouse_id
            FROM stock_balances
            WHERE batch_no = %s
            LIMIT 1
        """, (batch_id,))

        wh = cursor.fetchone()
        if not wh:
            return []

        warehouse_id = wh[0]

        # Step 2: get PACK zones from warehouse_storages
        cursor.execute("""
            SELECT warehouse_location_id
            FROM warehouse_storages
            WHERE warehouse_id = %s
            AND zone_type = 'Pack'
        """, (warehouse_id,))

        zones = [row[0] for row in cursor.fetchall()]

        return zones

    finally:
        cursor.close()
        conn.close()





#--------------------------------------------------
#    Package Table QTY boxes wise split function
#--------------------------------------------------
def calculate_package_data(cursor, order_id: str):

    # 1. CHECK PICKING COMPLETED
    cursor.execute("""
        SELECT COUNT(*) 
        FROM pick_task_header
        WHERE order_id = %s AND status != 'Completed'
    """, (order_id,))
    
    if cursor.fetchone()[0] > 0:
        raise HTTPException(status_code=400, detail="All picking tasks are not completed")

    # 2. GET PICK DATA
    cursor.execute("""
        SELECT l.product_id, SUM(l.picked_qty)
        FROM pick_task_lines l
        JOIN pick_task_header h ON l.picking_id = h.picking_id
        WHERE h.order_id = %s AND l.status = 'Completed'
        GROUP BY l.product_id
    """, (order_id,))
    
    rows = cursor.fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="No picking data found")

    total_qty = 0
    total_boxes = 0
    box_no_counter = 1
    boxes = []

    for product_id, picked_qty in rows:

        picked_qty = int(picked_qty)
        total_qty += picked_qty

        # ✅ FIXED COLUMN NAMES
        cursor.execute("""
            SELECT box_id, units_per_box, unit_weight_kg, material_volume_cbm
            FROM products
            WHERE products_id = %s
        """, (product_id,))
        
        product = cursor.fetchone()

        if not product:
            raise HTTPException(status_code=404, detail=f"Product {product_id} not found")

        box_id, unit_per_box, unit_weight, volume = product

        if not box_id:
            raise HTTPException(status_code=400, detail=f"Box not mapped for product {product_id}")

        if not unit_per_box or unit_per_box == 0:
            raise HTTPException(status_code=400, detail=f"Invalid units_per_box for product {product_id}")

        unit_weight = float(unit_weight or 0)
        volume = float(volume or 0)

        
        # BOX — only active boxes allowed
        cursor.execute("""
            SELECT weight FROM carton_box WHERE box_id = %s AND is_active = TRUE
        """, (box_id,))

        box_data = cursor.fetchone()

        if not box_data:
            raise HTTPException(
                status_code=400,
                detail=f"Carton box '{box_id}' is inactive or not found. Please assign an active carton box to this product before packaging."
            )

        box_weight = float(box_data[0])

        num_boxes = math.ceil(picked_qty / unit_per_box)
        total_boxes += num_boxes

        remaining_qty = picked_qty

        for _ in range(num_boxes):

            qty = min(unit_per_box, remaining_qty)
            remaining_qty -= qty

            weight = box_weight + (unit_weight * qty)
            total_volume = volume * qty

            boxes.append({
                "box_no": box_no_counter,
                "box_id": box_id,
                "product_id": product_id,
                "qty": qty,
                "weight": round(weight, 2),
                "volume": round(total_volume, 4)
            })

            box_no_counter += 1

    return {
        "total_qty": total_qty,
        "total_boxes": total_boxes,
        "boxes": boxes
    }




#===========================================================
#    Package table data insert from picking table function
#===========================================================
def create_package(cursor, order_id):
    # Prevent duplicate
    cursor.execute("""
        SELECT 1 FROM packages WHERE order_id = %s
    """, (order_id,))
    
    if cursor.fetchone():
        return None  # already created

    data = calculate_package_data(cursor, order_id)

    total_qty = data["total_qty"]
    total_boxes = data["total_boxes"]
    boxes = data["boxes"]

    today = datetime.now().strftime("%y%m%d")

    cursor.execute("""
        SELECT package_id 
        FROM packages
        WHERE package_id LIKE %s
        ORDER BY package_id DESC
        LIMIT 1
    """, (f"PACK-{today}-%",))

    last = cursor.fetchone()

    if last:
        count = int(last[0].split("-")[-1]) + 1
    else:
        count = 1

    package_id = f"PACK-{today}-{str(count).zfill(3)}"

    # Insert header
    cursor.execute("""
        INSERT INTO packages (package_id, order_id, total_boxes, total_qty)
        VALUES (%s, %s, %s, %s)
    """, (package_id, order_id, total_boxes, total_qty))

    # Insert boxes
    for box in boxes:
        barcode = f"BOX-{package_id}-{box['box_no']}"

        cursor.execute("""
            INSERT INTO package_boxes
            (package_id, box_id, box_no, product_id, qty, weight, volume, barcode)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            package_id,
            box["box_id"],
            box["box_no"],
            box["product_id"],
            box["qty"],
            box["weight"],
            box["volume"],
            barcode
        ))

    return package_id


@app.get("/api/packages")
def get_packages(_ = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT 
                package_id, 
                order_id, 
                total_boxes, 
                total_qty,
                created_at, 
                status
            FROM packages
            ORDER BY created_at DESC
        """)

        rows = cursor.fetchall()

        result = []
        for r in rows:
            result.append({
                "package_id": r[0],
                "order_id": r[1],
                "total_boxes": r[2],
                "total_qty": r[3],
                "created_at": str(r[4]),
                "status": r[5]   # ✅ IMPORTANT
            })

        return result

    finally:
        cursor.close()
        conn.close()

@app.post("/api/clear-dispatch-reserved")
def clear_dispatch_reserved(_ = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE warehouse_storages
            SET reserved_cbm = 0
            WHERE zone_type = 'Dispatch'
        """)
        conn.commit()

        return {"message": "Dispatch reserved cleared"}

    finally:
        cursor.close()
        conn.close()

@app.get("/api/packages/{package_id}/boxes")
def get_package_boxes(package_id: str, _ = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT 
                pb.id,
                pb.box_no,
                pb.box_id,
                pb.qty,
                pb.weight,
                pb.volume,
                pb.barcode,
                pb.dispatch_type,
                pb.location_id,
                pb.product_id,
                p.name
            FROM package_boxes pb
            LEFT JOIN products p ON pb.product_id = p.products_id
            WHERE pb.package_id = %s
            ORDER BY pb.box_no
        """, (package_id,))

        rows = cursor.fetchall()

        return [
            {
                "id": r[0],
                "box_no": r[1],
                "box_id": r[2],
                "qty": r[3],
                "weight": float(r[4]) if r[4] else 0,
                "volume": float(r[5]) if r[5] else 0,
                "barcode": r[6],
                "dispatch_type": r[7],
                "location_id": r[8],
                "product_id": r[9],
                "product_name": r[10] if r[10] else r[9],
            }
            for r in rows
        ]

    finally:
        cursor.close()
        conn.close()

@app.get("/api/locations")
def get_locations(zone_type: str, required_volume: float, _ = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # =============================
        # STORAGE LOGIC
        # =============================
        if zone_type == "Dispatch":

            cursor.execute("""
                SELECT 
                    warehouse_location_id,
                    volume_cbm,
                    occupaid_volume_cbm,
                    reserved_cbm
                FROM warehouse_storages
                WHERE zone_type = %s
                AND is_active = TRUE
            """, (zone_type,))

            rows = cursor.fetchall()

            valid_locations = []

            for loc_id, total_vol, used_vol, reserved in rows:
                total_vol = float(total_vol or 0)
                used_vol = float(used_vol or 0)
                reserved = float(reserved or 0)

                available_vol = total_vol - used_vol - reserved

                if required_volume <= available_vol:
                    valid_locations.append({
                        "location_id": loc_id,
                        "available_volume": round(available_vol, 4)
                    })

            return valid_locations

        # =============================
        # DOCK LOGIC (NO VOLUME CHECK)
        # =============================
        elif zone_type == "Dock":

            cursor.execute("""
                SELECT warehouse_location_id
                FROM warehouse_storages
                WHERE zone_type = %s
                AND is_active = TRUE
            """, (zone_type,))

            rows = cursor.fetchall()

            return [
                {
                    "location_id": row[0]   # ✅ FIX
                }
                for row in rows
            ]

        else:
            return []

    finally:
        cursor.close()
        conn.close()



#====================================================================
#   API to update reserved volumn to warehouse_storage table
#====================================================================
@app.post("/api/reserve-location")
def reserve_location(data: dict, _ = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    location_id = data["location_id"]
    volume = float(data["volume"])

    try:
        # 🔒 lock row (important)
        cursor.execute("""
            SELECT volume_cbm, occupaid_volume_cbm, reserved_cbm
            FROM warehouse_storages
            WHERE warehouse_location_id = %s
            FOR UPDATE
        """, (location_id,))

        row = cursor.fetchone()

        if not row:
            raise HTTPException(404, "Location not found")

        total, used, reserved = map(float, row)

        available = total - used - reserved

        if volume > available:
            raise HTTPException(400, "Not enough space")

        # ✅ reserve
        cursor.execute("""
            UPDATE warehouse_storages
            SET reserved_cbm = reserved_cbm + %s
            WHERE warehouse_location_id = %s
        """, (volume, location_id))

        conn.commit()

        return {"message": "Reserved"}

    except Exception as e:
        conn.rollback()
        raise HTTPException(400, str(e))

    finally:
        cursor.close()
        conn.close()

#====================================================
#   Release Location (when user closes)
#====================================================
@app.post("/api/release-location")
def release_location(data: dict, _ = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE warehouse_storages
            SET reserved_cbm = GREATEST(reserved_cbm - %s, 0)
            WHERE warehouse_location_id = %s
            AND zone_type = 'Dispatch'
        """, (data["volume"], data["location_id"]))

        conn.commit()
        return {"message": "Released"}

    finally:
        cursor.close()
        conn.close()


#==========================================
#   package Location Save POST API
#==========================================
@app.put("/api/package-box/{id}/location")
def update_box_location(id: int, data: dict, _ = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE package_boxes
            SET dispatch_type = %s,
                location_id = %s
            WHERE id = %s
        """, (data["dispatch_type"], data["location_id"], id))

        conn.commit()
        return {"message": "Updated"}

    except Exception as e:
        conn.rollback()
        raise HTTPException(400, str(e))

    finally:
        cursor.close()
        conn.close()
  
@app.post("/dispatch/{order_id}")
def dispatch_order(order_id: str, _= Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute("""
            SELECT status 
            FROM packages
            WHERE order_id = %s
        """, (order_id,))

        status_row = cursor.fetchone()

        status = status_row[0]

        if status == "PACKED":
            raise HTTPException(status_code=400, detail="Already PACKED")

                       
        # ✅ Update orders
        cursor.execute("""
            UPDATE orders
            SET status = 'PACKED'
            WHERE so_number = %s
            RETURNING so_number
        """, (order_id,))

        order = cursor.fetchone()

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        # ✅ Update packages
        cursor.execute("""
            UPDATE packages
            SET status = 'PACKED'
            WHERE order_id = %s
        """, (order_id,))

        # ✅ Update warehouse storage volumes
        cursor.execute("""
            UPDATE warehouse_storages ws
            SET 
                occupaid_volume_cbm = ws.occupaid_volume_cbm + agg.total_vol,
                reserved_cbm = ws.reserved_cbm - agg.total_vol
            FROM (
                SELECT location_id, SUM(volume) as total_vol
                FROM package_boxes
                WHERE package_id IN (
                    SELECT package_id FROM packages WHERE order_id = %s
                )
                AND dispatch_type = 'Store Location'
                GROUP BY location_id
            ) agg
            WHERE ws.warehouse_location_id = agg.location_id
            AND ws.zone_type = 'Dispatch';
        """, (order_id,))

        # ====================================================
        # ✅ INSERT STOCK LEDGER ENTRY FOR PACKAGING
        # ====================================================

        # Get package_id
        cursor.execute("""
            SELECT package_id FROM packages WHERE order_id = %s LIMIT 1
        """, (order_id,))
        pkg_row = cursor.fetchone()
        package_id = pkg_row[0] if pkg_row else order_id

        # ====================================================
        # GET TOTAL PICKED QTY PER PRODUCT & BATCH
        # ====================================================
        cursor.execute("""
            SELECT
                ptl.product_id,
                ptl.batch_id,
                SUM(ptl.picked_qty) AS total_qty
            FROM pick_task_header pth
            JOIN pick_task_lines ptl
                ON ptl.picking_id = pth.picking_id
            WHERE pth.order_id = %s
              AND ptl.picked_qty > 0
            GROUP BY ptl.product_id, ptl.batch_id
        """, (order_id,))
        
        batch_product_qtys = cursor.fetchall()

        # Get package location (one per package)
        cursor.execute("""
            SELECT
                ptl.packing_zone,
                ws.warehouse_id,
                SUM(ptl.picked_qty) as qty
            FROM pick_task_header pth
            JOIN pick_task_lines ptl
                ON pth.picking_id = ptl.picking_id
            LEFT JOIN warehouse_storages ws
                ON ws.warehouse_location_id = ptl.location_id
            WHERE pth.order_id = %s
            AND ptl.picked_qty > 0
            GROUP BY
                ptl.product_id,
                ptl.batch_id,
                ptl.packing_zone,
                ws.warehouse_id
        """, (order_id,))
        loc_row = cursor.fetchone()

        # Get package location (one per package)
        cursor.execute("""
            SELECT DISTINCT
                pb.location_id
            FROM packages pkg
            JOIN package_boxes pb
                ON pb.package_id = pkg.package_id
            LEFT JOIN warehouse_storages ws
                ON ws.warehouse_location_id = pb.location_id
            WHERE pkg.order_id = %s
              AND pb.location_id IS NOT NULL
            LIMIT 1
        """, (order_id,))
        to_location = cursor.fetchone()

        if loc_row and batch_product_qtys:
            from_location_id  = loc_row[0]
            warehouse_id = loc_row[1] or "NONE"

            for product_id, batch_no, qty in batch_product_qtys:
                qty = float(qty)
                batch_no = batch_no or "-"

                # ✅ Handle both dict and string return from get_current_user
                if isinstance(_, dict):
                    created_by = _.get("username", "unknown")
                else:
                    created_by = str(_)

                insert_ledger(
                    cursor,
                    product_id=product_id,
                    warehouse_id=warehouse_id,
                    location_id=from_location_id,
                    batch_no=batch_no,
                    movement_type="PACKAGED",
                    reference_type="PACKAGE",
                    reference_id=package_id,
                    quantity=qty,
                    created_by=created_by,
                    to_location_id= to_location,
                    before_qty=qty        # ✅ before = picked qty, after = 0
                 )

        conn.commit()
        return {"message": "Order + Packages dispatched successfully"}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        cursor.close()
        conn.close()






@app.post("/post-create")
def read(current_user=Depends(get_current_user)):

    conn = get_connection()
    cursor = conn.cursor()

    if isinstance(current_user, dict):
        username = current_user.get("username", "unknown")
        role = current_user.get("role", "")
    else:
        username = str(current_user)
        role = ""

    print("=" * 50)
    print("🚚 DISPATCH REFRESHED")
    print(f"👤 User : {username}")
    print(f"🔑 Role : {role}")
    print(f"🕐 Time : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)

    cursor.close()
    conn.close()

    return {
        "current_user": username,
        "role": role
    }


# ═══════════════════════════════════════
# READY DROPDOWN (DISPATCHED ORDERS)
# ═══════════════════════════════════════

@app.get("/ready-read")
def read_ready_dropdown(_ = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get all PACKED order headers
        cursor.execute("""
            SELECT 
                o.so_number,
                pk.package_id,
                pk.total_boxes,
                pb.location_id
            FROM orders o
            LEFT JOIN packages pk ON o.so_number = pk.order_id
            LEFT JOIN (
                SELECT DISTINCT ON (package_id)
                    package_id,
                    location_id
                FROM package_boxes
                WHERE location_id IS NOT NULL
                ORDER BY package_id, id ASC
            ) pb ON pb.package_id = pk.package_id
            WHERE o.status = 'PACKED'
            ORDER BY o.created_at DESC
        """)
        header_rows = cursor.fetchall()

        # Get lines for those orders
        so_nums = [r[0] for r in header_rows]
        if not so_nums:
            return []

        placeholders = ','.join(['%s'] * len(so_nums))
        cursor.execute(f"""
            SELECT l.so_number, l.product_id, p.name, l.issued_qty
            FROM sales_order_lines l
            LEFT JOIN products p ON l.product_id = p.products_id
            WHERE l.so_number IN ({placeholders})
        """, so_nums)
        line_rows = cursor.fetchall()

        from collections import defaultdict
        lines_by_so = defaultdict(list)
        for lr in line_rows:
            lines_by_so[lr[0]].append({"product_id": lr[1], "product_name": lr[2] or lr[1], "issued_qty": float(lr[3] or 0)})

        result = []
        for r in header_rows:
            so_number = r[0]
            lines = lines_by_so.get(so_number, [{"product_id": "-", "product_name": "-", "issued_qty": 0}])
            
            # Aggregate multiple products if present
            product_names = ", ".join(set([str(l["product_name"]) for l in lines]))
            total_qty = sum([l["issued_qty"] for l in lines])
            display_product_id = "Multiple" if len(lines) > 1 else lines[0]["product_id"]

            result.append({
                "order_no":    so_number,
                "product_id":  display_product_id,
                "product_name": product_names,
                "batch_no":    "-",
                "quantity":    total_qty,
                "package_id":  r[1] or "-",
                "total_boxes": r[2] or 0,
                "location":    r[3] or "-",
            })
        return result

    except Exception as e:
        print(f"[ERROR /ready-read] {e}")
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        cursor.close()
        conn.close()










# ═══════════════════════════════════════════════════════════════════════════════
# CREATE DISPATCH WITH INVOICE (Combined)
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/create-dispatch-with-invoice")
async def create_dispatch(
    so_number: str = Form(...),
    courier_name: str = Form(...),
    dispatch_location: str = Form(...),
    proof: UploadFile = File(None),
    _ = Depends(get_current_user)
):
    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute("""
            SELECT status
            FROM dispat
            WHERE o_id = %s
        """, (so_number,))

        status_row = cursor.fetchone()

        if status_row:
            status = status_row[0]

            if status == "Completed":
                raise HTTPException(
                    status_code=400,
                    detail="Dispatch Already Completed"
                )


        # =============================
        # 1. GET ORDER LINES & COSTS
        # =============================
        cursor.execute("""
            SELECT l.product_id, l.issued_qty, p.name, p.unit_cost
            FROM sales_order_lines l
            LEFT JOIN products p ON p.products_id = l.product_id
            WHERE l.so_number = %s
        """, (so_number,))
        lines = cursor.fetchall()

        if not lines:
            raise HTTPException(status_code=404, detail="Order lines not found")

        total_shipped_qty = 0
        total_base_amount = 0.0

        for l in lines:
            q = float(l[1] or 0)
            c = float(l[3] or 0)
            total_shipped_qty += q
            total_base_amount += (q * c)

        if total_shipped_qty == 0:
            raise HTTPException(status_code=400, detail="Issued qty is zero for all lines")

        product_names = ", ".join(set([l[2] for l in lines]))
        display_product_id = "Multiple" if len(lines) > 1 else lines[0][0]

        # =============================
        # 2. HANDLE FILE UPLOAD
        # =============================
        proof_file = None

        if proof and proof.filename:

            # ✅ Create folder automatically if missing
            upload_dir = Path("uploads")
            upload_dir.mkdir(parents=True, exist_ok=True)

            # ✅ Generate unique filename
            ext = os.path.splitext(proof.filename)[1]
            proof_file = f"{uuid.uuid4()}{ext}"

            # ✅ Full file path
            file_path = upload_dir / proof_file

            # ✅ Save image
            with open(file_path, "wb") as f:
                shutil.copyfileobj(proof.file, f)

        # =============================
        # 3. GENERATE DISPATCH ID
        # =============================
        dispatch_id = generate_dispatch_id(cursor)

        # =============================
        # 4. INSERT INTO DISPATCH TABLE
        # =============================
        cursor.execute("""
            INSERT INTO dispat (
                dispatches_id, o_id, courier_name, tracking_number,
                dispatch_date, status, delivered_at, proof_url, shipped_qty, dispatch_location
            )
            VALUES (%s,%s,%s,%s,NOW(),%s,NULL,%s,%s,%s)
            RETURNING id, dispatches_id
        """, (dispatch_id, so_number, courier_name, None, "Completed", proof_file, total_shipped_qty, dispatch_location))
        dispatch_row = cursor.fetchone()

        # =============================
        # 5. STOCK LEDGER — one entry per product & batch
        # =============================
        cursor.execute("""
            SELECT ptl.product_id, ptl.batch_id, SUM(ptl.picked_qty) AS total_qty
            FROM pick_task_lines ptl
            JOIN pick_task_header pth ON ptl.picking_id = pth.picking_id
            WHERE pth.order_id = %s AND ptl.picked_qty > 0
            GROUP BY ptl.product_id, ptl.batch_id
        """, (so_number,))
        batch_rows = cursor.fetchall()

        cursor.execute("""
            SELECT warehouse_id FROM warehouse_storages
            WHERE warehouse_location_id = %s
        """, (dispatch_location,))
        dispatch_wh_row = cursor.fetchone()
        dispatch_warehouse_id = dispatch_wh_row[0] if dispatch_wh_row else "-"

        if batch_rows:
            for batch_row in batch_rows:
                b_product_id = batch_row[0]
                b_batch_no = str(batch_row[1]).strip() if batch_row[1] else "-"
                b_qty = float(batch_row[2] or 0)
                if b_qty <= 0:
                    continue

                # ✅ Get before_qty from PACKAGED ledger entry
                cursor.execute("""
                    SELECT before_qty FROM stock_ledger
                    WHERE product_id    = %s
                      AND batch_no      = %s
                      AND movement_type = 'PACKAGED'
                      AND ABS(movement_qty) = %s
                    ORDER BY created_datetime DESC
                    LIMIT 1
                """, (b_product_id, b_batch_no, b_qty))
                snap = cursor.fetchone()
                before_qty_snap = float(snap[0] or 0) if snap else b_qty

                # ✅ Handle both dict and string return from get_current_user
                if isinstance(_, dict):
                    created_by = _.get("username", "unknown")
                else:
                    created_by = str(_)

                insert_ledger(
                    cursor,
                    product_id     = b_product_id,
                    warehouse_id   = dispatch_warehouse_id,
                    location_id    = dispatch_location,
                    batch_no       = b_batch_no,
                    movement_type  = "DISPATCH",
                    reference_type = "DISPATCH",
                    reference_id   = dispatch_id,
                    quantity       = b_qty,
                    before_qty     = before_qty_snap,
                    created_by     = created_by,
                    to_location_id = dispatch_location,
                )

        # =============================
        # 6. INVOICE CREATION
        # =============================
        cursor.execute("SELECT id FROM invoices WHERE so_number = %s", (so_number,))
        existing_invoice = cursor.fetchone()

        if existing_invoice:
            invoice_id = existing_invoice[0]
            invoice_number = None
            invoice_status = "already_exists"
        else:
            gst_amount = round(total_base_amount * 0.18, 2)
            total_amount = round(total_base_amount + gst_amount, 2)
            invoice_number = generate_invoice_number(cursor)

            cursor.execute("""
                INSERT INTO invoices (
                    so_number, product_id, product_name, quantity,
                    invoice_number, invoice_date, total_amount, gst_amount, status
                )
                VALUES (%s,%s,%s,%s,%s,CURRENT_DATE,%s,%s,%s)
                RETURNING id
            """, (so_number, display_product_id, product_names, total_shipped_qty, invoice_number, total_amount, gst_amount, "Generated"))
            invoice_id = cursor.fetchone()[0]
            invoice_status = "created"

        # =============================
        # 7. UPDATE ORDER STATUS
        # =============================
        cursor.execute("""
            UPDATE orders SET status = 'DISPATCHED' WHERE so_number = %s
        """, (so_number,))

        conn.commit()

        return {
            "message": "Dispatch & Invoice created successfully",
            "dispatch": {
                "id": dispatch_row[0],
                "dispatch_id": dispatch_row[1],
                "order_id": so_number,
                "courier": courier_name,
                "shipped_qty": total_shipped_qty
            },
            "invoice": {
                "id": invoice_id,
                "invoice_number": invoice_number,
                "status": invoice_status
            }
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        cursor.close()
        conn.close()




#===========================================
#  warehouse dispatch location ID drop down
#===========================================
@app.get("/api/dispatch-locations")
def get_dispatch_locations(_= Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT warehouse_location_id
            FROM warehouse_storages
            WHERE zone_type = 'Dock'
            AND is_active = true
            ORDER BY warehouse_location_id
        """)

        rows = cursor.fetchall()

        return [
            {
                "location_id": row[0]
            }
            for row in rows
        ]

    finally:
        cursor.close()
        conn.close()

def generate_invoice_number(cursor):
    today = datetime.now().strftime("%y%m%d")
    prefix = f"INV-{today}"
    cursor.execute(
        "SELECT COALESCE(MAX(CAST(split_part(invoice_number,'-',3) AS INTEGER)),0) FROM invoices WHERE invoice_number LIKE %s",
        (prefix + "%",))
    return f"{prefix}-{str(cursor.fetchone()[0] + 1).zfill(3)}"


# ═══════════════════════════════════════════════════════════════════════════════
# INVOICES
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/invoices-read")
def read_invoices(_ = Depends(get_current_user)):
    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT i.id, i.so_number, i.product_id, i.product_name, i.quantity,
                   i.invoice_number, i.invoice_date, i.total_amount, i.gst_amount, i.status, i.created_at,
                   (
                       SELECT json_agg(json_build_object(
                           'product_id', l.product_id,
                           'product_name', p.name,
                           'quantity', l.issued_qty,
                           'unit_cost', p.unit_cost,
                           'base_amount', ROUND(l.issued_qty * COALESCE(p.unit_cost, 0), 2)
                       ))
                       FROM sales_order_lines l
                       LEFT JOIN products p ON p.products_id = l.product_id
                       WHERE l.so_number = i.so_number AND l.issued_qty > 0
                   ) AS lines
            FROM invoices i ORDER BY i.created_at DESC
        """)
        return [{"id": r[0], "so_number": r[1] or "-", "product_id": r[2] or "-",
                 "product_name": r[3] or "-", "quantity": to_float(r[4]),
                 "invoice_number": r[5] or "-",
                 "invoice_date": r[6].strftime("%Y-%m-%d") if r[6] else None,
                 "total_amount": to_float(r[7]), "gst_amount": to_float(r[8]),
                 "base_amount": round(to_float(r[7]) - to_float(r[8]), 2),
                 "status": r[9] or "-",
                 "created_at": r[10].strftime("%Y-%m-%d %H:%M:%S") if r[10] else None,
                 "lines": r[11] or []}
                for r in cursor.fetchall()]
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))
    finally: cursor.close(); conn.close()


# ═══════════════════════════════════════════════════════════════════════════════
# E-WAY BILL
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/eway-create")
def create_eway(data: EwayCreate, _ = Depends(get_current_user)):
    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM eway WHERE invoice_id = %s::text", (str(data.invoice_id),))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="E-way bill already exists for this invoice")

        cursor.execute("""
            SELECT id, invoice_number, product_id, product_name, quantity
            FROM invoices WHERE id = %s
        """, (data.invoice_id,))
        invoice = cursor.fetchone()
        if not invoice: raise HTTPException(status_code=404, detail="Invoice not found")

        invoice_id, invoice_number, product_id, product_name, quantity = invoice
        quantity = to_float(quantity)

        eway_bill_number = (
            data.eway_bill_number.strip()
            if data.eway_bill_number and data.eway_bill_number.strip()
            else generate_eway_number(cursor)
        )

        final_product_id   = data.product_id   or product_id
        final_product_name = data.product_name or product_name
        final_qty          = data.qty          or quantity
        document_no        = generate_document_number(cursor)

        cursor.execute("""
            INSERT INTO eway (
                invoice_id, invoice_number, product_id, product_name, quantity,
                eway_bill_number, vehicle_number, validity_date,
                gstin_recipient, place_of_delivery, value_of_goods,
                transporter, from_place, document_no
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id, eway_bill_number
        """, (
            str(invoice_id), invoice_number, final_product_id, final_product_name, final_qty,
            eway_bill_number, data.vehicle_number.upper(), data.validity_date,
            data.gstin_recipient, data.place_of_delivery, data.value_of_goods,
            data.transporter, data.from_place, document_no
        ))

        row = cursor.fetchone()
        conn.commit()

        return {
            "message":           "E-way bill created successfully",
            "id":                row[0],
            "eway_bill_number":  row[1],
            "invoice_id":        invoice_id,
            "invoice_number":    invoice_number,
            "document_no":       document_no,
            "product_id":        final_product_id,
            "product_name":      final_product_name,
            "qty":               final_qty,
            "vehicle_number":    data.vehicle_number.upper(),
            "validity_date":     data.validity_date.strftime("%Y-%m-%d"),
            "gstin_recipient":   data.gstin_recipient,
            "place_of_delivery": data.place_of_delivery,
            "value_of_goods":    data.value_of_goods,
            "transporter":       data.transporter,
            "from_place":        data.from_place,
        }

    except HTTPException: conn.rollback(); raise
    except Exception as e: conn.rollback(); raise HTTPException(status_code=400, detail=str(e))
    finally: cursor.close(); conn.close()


def generate_document_number(cursor):
    cursor.execute("SELECT COALESCE(MAX(CAST(document_no AS INTEGER)), 0) FROM eway WHERE document_no ~ '^[0-9]+$'")
    next_num = cursor.fetchone()[0] + 1
    return str(next_num).zfill(3)


def generate_eway_number(cursor):
    today = datetime.now().strftime("%y%m%d")
    prefix = f"EWB-{today}"
    cursor.execute(
        "SELECT COALESCE(MAX(CAST(split_part(eway_bill_number,'-',3) AS INTEGER)),0) FROM eway WHERE eway_bill_number LIKE %s",
        (prefix + "%",))
    return f"{prefix}-{str(cursor.fetchone()[0] + 1).zfill(3)}"



@app.get("/eway-read")
def read_eways(_ = Depends(get_current_user)):
    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT e.id, e.invoice_id, e.product_id, e.product_name, e.quantity,
                   e.eway_bill_number, e.vehicle_number, e.validity_date, e.created_at,
                   COALESCE(e.invoice_number, i.invoice_number, '-') AS invoice_number,
                   e.gstin_recipient, e.place_of_delivery, e.value_of_goods,
                   e.transporter, e.from_place, e.document_no
            FROM eway e
            LEFT JOIN invoices i ON i.id::text = e.invoice_id
            ORDER BY e.created_at DESC
        """)
        return [
            {
                "id":                r[0],
                "invoice_id":        r[1],
                "product_id":        r[2]  or "-",
                "product_name":      r[3]  or "-",
                "qty":               to_float(r[4]),
                "eway_bill_number":  r[5]  or "-",
                "vehicle_number":    r[6]  or "-",
                "validity_date":     r[7].strftime("%Y-%m-%d") if r[7] else None,
                "created_at":        r[8].strftime("%Y-%m-%d %H:%M:%S") if r[8] else None,
                "invoice_number":    r[9]  or "-",
                "gstin_recipient":   r[10] or "-",
                "place_of_delivery": r[11] or "-",
                "value_of_goods":    to_float(r[12]) if r[12] else None,
                "transporter":       r[13] or "-",
                "from_place":        r[14] or "-",
                "document_no":       r[15] or "-",
            }
            for r in cursor.fetchall()
        ]
    
    except Exception as e:
        print(f"[ERROR /eway-read] {e}")
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close(); conn.close()


@app.get("/invoices-without-eway")
def invoices_without_eway(_ = Depends(get_current_user)):
    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT i.id, i.so_number, i.product_id, i.product_name,
                   i.quantity, i.invoice_number, i.invoice_date,
                   i.total_amount, i.gst_amount, i.status
            FROM invoices i
            WHERE NOT EXISTS (
                SELECT 1 FROM eway e
                WHERE e.invoice_id = i.id::text
            )
            ORDER BY i.created_at DESC
        """)
        return [
            {
                "id":             r[0],
                "so_number":      r[1] or "-",
                "product_id":     r[2] or "-",
                "product_name":   r[3] or "-",
                "quantity":       to_float(r[4]),
                "invoice_number": r[5] or "-",
                "invoice_date":   r[6].strftime("%Y-%m-%d") if r[6] else None,
                "total_amount":   to_float(r[7]),
                "gst_amount":     to_float(r[8]),
                "base_amount":    round(to_float(r[7]) - to_float(r[8]), 2),
                "status":         r[9] or "-",
            }
            for r in cursor.fetchall()
        ]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close(); conn.close()        


# ═══════════════════════════════════════════════════════════════════════════════
# DISPATCH
# ═══════════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════════
# DISPATCH LIST READ  — shows courier_id + courier name from courier table
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/dispatch-list")
def get_dispatch_list(_ = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT 
                d.id,
                d.dispatches_id,
                d.o_id,
                d.courier_name,
                d.tracking_number,
                d.dispatch_date,
                d.delivered_at,
                d.status,
                d.proof_url,
                d.shipped_qty,
                d.dispatch_location,
                o.so_number,
                o.customer_id,
                COALESCE(c.name, 'Unknown')  AS customer_name,
                COALESCE(cr.courier_id, '-') AS courier_id

            FROM dispat d
            LEFT JOIN orders    o   ON d.o_id = o.so_number
            LEFT JOIN customers c   ON o.customer_id = c.customers_id
            LEFT JOIN courier   cr  ON LOWER(cr.name) = LOWER(d.courier_name)

            ORDER BY d.dispatch_date DESC
        """)

        header_rows = cursor.fetchall()

        # Fetch lines for all dispatched SOs
        so_nums = list({r[2] for r in header_rows if r[2]})
        lines_by_so = {}
        if so_nums:
            placeholders = ','.join(['%s'] * len(so_nums))
            cursor.execute(f"""
                SELECT l.so_number, l.product_id, p.name, l.ordered_qty
                FROM sales_order_lines l
                LEFT JOIN products p ON l.product_id = p.products_id
                WHERE l.so_number IN ({placeholders})
            """, so_nums)
            from collections import defaultdict
            _lines = defaultdict(list)
            for lr in cursor.fetchall():
                _lines[lr[0]].append({"product_id": lr[1], "product_name": lr[2] or lr[1], "ordered_qty": float(lr[3] or 0)})
            lines_by_so = _lines

        result = []
        for r in header_rows:
            so_number = r[11]
            so_lines = lines_by_so.get(so_number, [{"product_id": "-", "product_name": "-", "ordered_qty": 0}])
            # For dispatch list, aggregate products into a comma-separated string
            product_names = ", ".join(set(l["product_name"] for l in so_lines)) if so_lines else "-"
            product_ids = ", ".join(set(l["product_id"] for l in so_lines)) if so_lines else "-"
            ordered_qty = sum(l["ordered_qty"] for l in so_lines)

            result.append({
                "id":                r[0],
                "dispatches_id":     r[1],
                "reference_id":      r[2],
                "courier_name":      r[3],
                "tracking_number":   r[4] or "-",
                "dispatch_date":     r[5].strftime("%Y-%m-%d %H:%M:%S") if r[5] else None,
                "delivered_at":      r[6].strftime("%Y-%m-%d %H:%M:%S") if r[6] else None,
                "status":            r[7] or "Completed",
                "proof_url":         r[8],
                "shipped_qty":       to_float(r[9]),
                "dispatch_location": r[10] or "-",
                "order_number":      r[11] or "-",
                "product_id":        product_ids,
                "product_name":      product_names,
                "customer_id":       r[12] or "-",
                "customer_name":     r[13] or r[12] or "-",
                "batch_no":          "-",
                "ordered_qty":       ordered_qty,
                "courier_id":        r[14] or "-",
                "courier_service":   f"{r[14]} {r[3]}" if r[14] and r[14] != '-' else r[3] or "-"
            })

        return {"total": len(result), "dispatches": result}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        cursor.close()
        conn.close()

        
#-----------------------------------------------
#   This is dashboard funcrions and API's
#-----------------------------------------------
@app.get("/dashboard-summary")
def dashboard_summary():
    conn = get_connection()
    cursor = conn.cursor()

    # =========================
    # COUNTS -- Total Customers
    # =========================
    cursor.execute("""
        SELECT 
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE is_active = TRUE) AS active,
            COUNT(*) FILTER (WHERE is_active = FALSE) AS inactive
        FROM customers
    """)

    cust_total, cust_active, cust_inactive = cursor.fetchone()

    # ==============================
    # COUNTS -- Total Vendors
    # ==============================
    cursor.execute("""
        SELECT 
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE is_active = TRUE) AS active,
            COUNT(*) FILTER (WHERE is_active = FALSE) AS inactive
        FROM vendors
    """)

    ven_total, ven_active, ven_inactive = cursor.fetchone()

    # ==============================
    # COUNTS -- Total Products
    # ==============================
    cursor.execute("""
        SELECT 
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE is_active = TRUE) AS active,
            COUNT(*) FILTER (WHERE is_active = FALSE) AS inactive
        FROM products
    """)

    product_total, product_active, product_inactive = cursor.fetchone()

    # =========================
    # STOCK
    # =========================
    cursor.execute("""
        SELECT 
            COALESCE(SUM(on_hand_qty),0),
            COALESCE(SUM(reserved_qty),0)
        FROM stock_balances
    """)
    total_stock, total_reserved = cursor.fetchone()
    available_stock = total_stock - total_reserved

    # =========================
    # EXPIRED
    # =========================
    cursor.execute("""
        SELECT COUNT(*) 
        FROM stock_balances
        WHERE expiry_date IS NOT NULL 
        AND expiry_date < CURRENT_DATE
    """)
    expired_products = cursor.fetchone()[0]

    # =========================
    # SOLD QTY  ✅ FIXED
    # =========================
    cursor.execute("""
        SELECT COALESCE(SUM(issued_qty),0) 
        FROM sales_order_lines
    """)
    sold_qty = cursor.fetchone()[0]

    # =========================
    # Total QTY Waiting for Approval
    # =========================
    cursor.execute("""
        SELECT COUNT(*) 
        FROM purchase_order
        WHERE Status = 'Approved' 
        
    """)
    waiting_approve = cursor.fetchall()[0]

    # =========================
    # Sold AMOUNT ✅ FIXED
    # =========================
    cursor.execute("""
        SELECT COALESCE(SUM(total_amount),0) 
        FROM invoices
    """)
    selling_amount = cursor.fetchone()[0]

    # =========================
    # PURCHASE (from lines table)
    # =========================
    cursor.execute("""
        SELECT 
            COALESCE(SUM(l.received_qty),0),
            COALESCE(SUM(h.total_cost),0)
        FROM purchase_order h
        LEFT JOIN purchase_order_lines l ON h.purchase_order_id = l.purchase_order_id
        WHERE h.status = 'Received'
    """)
    purchase_qty, purchase_amount = cursor.fetchone()

    # =========================
    # WAREHOUSE SUMMARY
    # =========================
    # Total warehouses
    cursor.execute("SELECT COUNT(*) FROM warehouses")
    total_warehouses = cursor.fetchone()[0]

    # Total storage locations
    cursor.execute("SELECT COUNT(*) FROM warehouse_storages")
    total_locations = cursor.fetchone()[0]

    cursor.execute("""
        SELECT 
            COUNT(*) FILTER (WHERE LOWER(location_status) = 'occupied'),
            COUNT(*) FILTER (WHERE LOWER(location_status) = 'available'),
            COUNT(*) FILTER (WHERE LOWER(location_status) = 'restricted')
        FROM warehouse_storages
    """)

    occupied, available, restricted = cursor.fetchone()

    # =========================
    # PRODUCT-WISE AVAILABLE STOCK
    # =========================
    cursor.execute("""
        SELECT 
            p.products_id,
            p.name,
            COALESCE(sb.available_qty, 0)   AS available_qty,
            COALESCE(po.auto_qty, 0)        AS auto_created_qty,
            COALESCE(po.approved_qty, 0)    AS approved_qty,
            COALESCE(o.shortage_qty, 0)     AS shortage_qty
        FROM products p

        LEFT JOIN (
            SELECT 
                product_id,
                SUM(on_hand_qty - reserved_qty) AS available_qty
            FROM stock_balances
            WHERE expiry_date IS NULL OR expiry_date >= CURRENT_DATE
            GROUP BY product_id
        ) sb ON sb.product_id = p.products_id

        LEFT JOIN (
            SELECT 
                l.product_id,
                SUM(CASE WHEN h.status = 'Auto-Created' THEN l.ordered_qty ELSE 0 END) AS auto_qty,
                SUM(CASE WHEN h.status = 'Approved'     THEN l.ordered_qty ELSE 0 END) AS approved_qty
            FROM purchase_order_lines l
            JOIN purchase_order h ON h.purchase_order_id = l.purchase_order_id
            GROUP BY l.product_id
        ) po ON po.product_id = p.products_id

        LEFT JOIN (
            SELECT 
                product_id,
                SUM(
                    CASE 
                        WHEN status = 'PARTIALLY_RESERVED' THEN (ordered_qty - reserved_qty)
                        WHEN status = 'OPEN'               THEN ordered_qty
                        ELSE 0
                    END
                ) AS shortage_qty
            FROM sales_order_lines
            GROUP BY product_id
        ) o ON o.product_id = p.products_id

        WHERE 
            COALESCE(sb.available_qty, 0) < COALESCE(p.minimum_stock, 0)
            OR COALESCE(o.shortage_qty, 0) > 0

        ORDER BY 
            COALESCE(o.shortage_qty, 0) DESC,
            COALESCE(sb.available_qty, 0) ASC
    """)

    result = cursor.fetchall()

    data = [
        {
            "product_id": row[0],
            "name": row[1],
            "available_qty": float(row[2]),
            "auto_created_qty": float(row[3]),
            "approved_qty": float(row[4]),
            "shortage": float(row[5])
        }
        for row in result
    ]

    # =========================
    # WEEKLY PURCHASE vs SALES
    # =========================
    cursor.execute("""
        SELECT 
            DATE(h.created_at) as dt,
            COALESCE(SUM(l.received_qty), 0) as purchase,
            0 as sales
        FROM purchase_order h
        LEFT JOIN purchase_order_lines l ON h.purchase_order_id = l.purchase_order_id
        WHERE h.created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(h.created_at)

        UNION ALL

        SELECT 
            DATE(h.created_at) as dt,
            0,
            COALESCE(SUM(l.issued_qty), 0)
        FROM orders h
        LEFT JOIN sales_order_lines l ON h.so_number = l.so_number
        WHERE h.created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(h.created_at)
    """)

    weekly_raw = cursor.fetchall()

    # =========================
    # MONTHLY PURCHASE vs SALES
    # =========================
    cursor.execute("""
        SELECT 
            DATE_TRUNC('month', h.created_at) as dt,
            COALESCE(SUM(l.received_qty), 0),
            0
        FROM purchase_order h
        LEFT JOIN purchase_order_lines l ON h.purchase_order_id = l.purchase_order_id
        GROUP BY DATE_TRUNC('month', h.created_at)

        UNION ALL

        SELECT 
            DATE_TRUNC('month', h.created_at),
            0,
            COALESCE(SUM(l.issued_qty), 0)
        FROM orders h
        LEFT JOIN sales_order_lines l ON h.so_number = l.so_number
        GROUP BY DATE_TRUNC('month', h.created_at)
    """)

    monthly_raw = cursor.fetchall()

    weekly_chart = format_chart(weekly_raw)
    monthly_chart = format_chart(monthly_raw)
    
    cursor.close()
    conn.close()

    return {
        "customers": {
            "total": cust_total,
            "active": cust_active,
            "inactive": cust_inactive
        },
        "vendors": {
            "total": ven_total,
            "active": ven_active,
            "inactive": ven_inactive
        },
        "products": {
            "total": product_total,
            "active": product_active,
            "inactive": product_inactive
        },
        "available_stock": float(available_stock),
        "expired_products": expired_products,
        "waiting_Approve" : waiting_approve,
        "sold_qty": float(sold_qty),
        "sold_amount": float(selling_amount),
        "purchase_qty": purchase_qty,
        "purchase_amount": float(purchase_amount),

        "total_warehouses": total_warehouses,
        "total_locations": total_locations,
        "warehouse_status": {
            "occupied": occupied,
            "available": available,
            "restricted": restricted
        },

        "low_stock": data,

        "weekly_chart": weekly_chart,
        "monthly_chart": monthly_chart
    }

def format_chart(data, days=7, is_month=False):

    result = defaultdict(lambda: {"purchase": 0, "sales": 0})

    # Step 1: Fill actual DB data
    for row in data:
        key = row[0].strftime("%Y-%m-%d") if not is_month else row[0].strftime("%Y-%m")
        result[key]["purchase"] += float(row[1])
        result[key]["sales"] += float(row[2])

    final = []

    # Step 2: Generate full range
    today = datetime.today()

    for i in range(days):
        day = today - timedelta(days=(days - 1 - i))
        key = day.strftime("%Y-%m-%d")

        final.append({
            "name": day.strftime("%d %b"),   # nice label
            "purchase": result[key]["purchase"],
            "sales": result[key]["sales"]
        })

    return final

def format_days(data, days=7, start_date=None):
    """
    Format daily purchase & sales data.
    - data: list of tuples (date, purchase, sales)
    - days: number of days to show
    - start_date: datetime object to start the range (optional, defaults to today)
    """
    result = defaultdict(lambda: {"purchase": 0, "sales": 0})

    # Aggregate actual DB data
    for row in data:
        key = row[0].strftime("%Y-%m-%d")
        result[key]["purchase"] += float(row[1] or 0)
        result[key]["sales"] += float(row[2] or 0)

    if start_date is None:
        start_date = datetime.today()

    final = []
    for i in range(days):
        d = start_date + timedelta(days=i)
        key = d.strftime("%Y-%m-%d")

        final.append({
            "name": d.strftime("%d %b"),
            "purchase": result[key]["purchase"],
            "sales": result[key]["sales"]
        })

    return final

def format_weeks(data):
    result = defaultdict(lambda: {"purchase": 0, "sales": 0})

    # Aggregate purchase & sales per week start
    for row in data:
        key = row[0]  # week start date (datetime)
        result[key]["purchase"] += float(row[1] or 0)
        result[key]["sales"] += float(row[2] or 0)

    final = []

    for k in sorted(result.keys()):
        v = result[k]
        week_start = k
        week_end = k + timedelta(days=6)

        # Compute week number within month
        week_number = ((week_start.day - 1) // 7) + 1

        week_label = f"Week {week_number} ({week_start.strftime('%b %d')}–{week_end.strftime('%b %d')})"

        final.append({
            "name": week_label,
            "purchase": v["purchase"],
            "sales": v["sales"],
            "week_start": week_start.strftime("%Y-%m-%d")  # for drill-down
        })

    return final

def format_months(data):
    result = defaultdict(lambda: {"purchase": 0, "sales": 0})

    for row in data:
        key = row[0].strftime("%m")
        result[key]["purchase"] += float(row[1] or 0)
        result[key]["sales"] += float(row[2] or 0)

    final = []

    for i in range(1, 13):
        key = f"{i:02d}"
        dt = datetime(2024, i, 1)

        final.append({
            "name": dt.strftime("%b"),
            "purchase": result[key]["purchase"],
            "sales": result[key]["sales"]
        })

    return final

def format_years(data):
    result = defaultdict(lambda: {"purchase": 0, "sales": 0})

    for row in data:
        key = row[0].strftime("%Y")
        result[key]["purchase"] += float(row[1] or 0)
        result[key]["sales"] += float(row[2] or 0)

    current_year = datetime.today().year
    final = []

    for y in range(current_year - 4, current_year + 1):
        key = str(y)

        final.append({
            "name": key,
            "purchase": result[key]["purchase"],
            "sales": result[key]["sales"]
        })

    return final

@app.get("/chart-data")
def get_chart_data(view: str, year: int = None, month: int = None, week_start: str = None):
    conn = get_connection()
    cursor = conn.cursor()

    # =========================
    # LIVE (LAST 7 DAYS)
    # =========================
    if view == "live":
        cursor.execute("""
            SELECT DATE(h.created_at), SUM(l.received_qty), 0
            FROM purchase_order h
            LEFT JOIN purchase_order_lines l ON h.purchase_order_id = l.purchase_order_id
            WHERE h.created_at >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY DATE(h.created_at)

            UNION ALL

            SELECT DATE(h.created_at), 0, SUM(l.issued_qty)
            FROM orders h
            LEFT JOIN sales_order_lines l ON h.so_number = l.so_number
            WHERE h.created_at >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY DATE(h.created_at)
        """)
        data = cursor.fetchall()
        result = format_days(data, 7)

    # =========================
    # YEAR VIEW (LAST 5 YEARS)
    # =========================
    elif view == "year":
        cursor.execute("""
            SELECT DATE_TRUNC('year', h.created_at), SUM(l.received_qty), 0
            FROM purchase_order h
            LEFT JOIN purchase_order_lines l ON h.purchase_order_id = l.purchase_order_id
            GROUP BY 1

            UNION ALL

            SELECT DATE_TRUNC('year', h.created_at), 0, SUM(l.issued_qty)
            FROM orders h
            LEFT JOIN sales_order_lines l ON h.so_number = l.so_number
            GROUP BY 1
        """)
        data = cursor.fetchall()
        result = format_years(data)

    # =========================
    # MONTH VIEW (SELECTED YEAR)
    # =========================
    elif view == "month" and year:
        cursor.execute("""
            SELECT DATE_TRUNC('month', h.created_at), SUM(l.received_qty), 0
            FROM purchase_order h
            LEFT JOIN purchase_order_lines l ON h.purchase_order_id = l.purchase_order_id
            WHERE EXTRACT(YEAR FROM h.created_at) = %s
            GROUP BY 1

            UNION ALL

            SELECT DATE_TRUNC('month', h.created_at), 0, SUM(l.issued_qty)
            FROM orders h
            LEFT JOIN sales_order_lines l ON h.so_number = l.so_number
            WHERE EXTRACT(YEAR FROM h.created_at) = %s
            GROUP BY 1
        """, (year, year))
        data = cursor.fetchall()
        result = format_months(data)

    # =========================
    # WEEK VIEW (SELECTED MONTH)
    # =========================
    elif view == "week" and year and month:
        cursor.execute("""
            SELECT DATE_TRUNC('week', h.created_at), SUM(l.received_qty), 0
            FROM purchase_order h
            LEFT JOIN purchase_order_lines l ON h.purchase_order_id = l.purchase_order_id
            WHERE EXTRACT(YEAR FROM h.created_at)=%s 
            AND EXTRACT(MONTH FROM h.created_at)=%s
            GROUP BY 1

            UNION ALL

            SELECT DATE_TRUNC('week', h.created_at), 0, SUM(l.issued_qty)
            FROM orders h
            LEFT JOIN sales_order_lines l ON h.so_number = l.so_number
            WHERE EXTRACT(YEAR FROM h.created_at)=%s 
            AND EXTRACT(MONTH FROM h.created_at)=%s
            GROUP BY 1
        """, (year, month, year, month))
        data = cursor.fetchall()
        result = format_weeks(data)

    # =========================
    # DAY VIEW (SELECTED WEEK)
    # =========================
    elif view == "day" and week_start:
        cursor.execute("""
            SELECT DATE(h.created_at), SUM(l.received_qty), 0
            FROM purchase_order h
            LEFT JOIN purchase_order_lines l ON h.purchase_order_id = l.purchase_order_id
            WHERE DATE(h.created_at) BETWEEN %s AND %s::date + INTERVAL '6 days'
            GROUP BY 1

            UNION ALL

            SELECT DATE(h.created_at), 0, SUM(l.issued_qty)
            FROM orders h
            LEFT JOIN sales_order_lines l ON h.so_number = l.so_number
            WHERE DATE(h.created_at) BETWEEN %s AND %s::date + INTERVAL '6 days'
            GROUP BY 1
        """, (week_start, week_start, week_start, week_start))

        data = cursor.fetchall()
        start_date_obj = datetime.strptime(week_start, "%Y-%m-%d")

        result = format_days(data, 7, start_date=start_date_obj)

    cursor.close()
    conn.close()

    return result

#-----------------------------------------------
#   This is dashboard inventory funcrionss
#-----------------------------------------------
@app.get("/inventory-dashboard")
def inventory_dashboard(_ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Waiting Orders
        cursor.execute("""
            SELECT COUNT(*) FROM orders
            WHERE status = 'RESERVED' or status = 'OUT' 
        """)
        waiting_orders = cursor.fetchone()[0]

        # 2. Completed Orders
        cursor.execute("""
            SELECT COUNT(*) FROM orders
            WHERE status = 'Completed'
        """)
        completed_orders = cursor.fetchone()[0]

        # 3. Cancelled Orders
        cursor.execute("""
            SELECT COUNT(*) FROM orders
            WHERE status = 'CANCELLED'
        """)
        cancelled_orders = cursor.fetchone()[0]

        # 4. Items Expiring Today
        cursor.execute("""
            SELECT COUNT(*) 
                FROM stock_balances
                WHERE expiry_date = CURRENT_DATE
                AND (on_hand_qty - reserved_qty) > 0;
        """)
        expiring_today = cursor.fetchone()[0]

        # 5. Demand (Pending Orders)
        cursor.execute("""
            SELECT COALESCE(SUM(ordered_qty - reserved_qty), 0)
            FROM orders
            WHERE status = 'OPEN' or status = 'PARTIALLY_RESERVED'
        """)
        demand = cursor.fetchone()[0]

        # 6. Total Order Count
        cursor.execute("""
            SELECT COUNT(*) FROM orders
        """)
        total_order = cursor.fetchone()[0]

        # 7. Warehouse-wise Inventory Value
        cursor.execute("""
            SELECT 
                warehouse_id,
                ROUND(SUM(available_qty * unit_cost), 2) AS value
            FROM (
                SELECT 
                    sb.warehouse_id,
                    sb.product_id,
                    SUM(sb.on_hand_qty) - SUM(COALESCE(sb.reserved_qty, 0)) AS available_qty,
                    p.unit_cost
                FROM stock_balances sb
                JOIN products p 
                    ON sb.product_id = p.products_id
                WHERE 
                    sb.on_hand_qty > 0
                    AND (sb.expiry_date IS NULL OR sb.expiry_date > CURRENT_DATE)
                GROUP BY sb.warehouse_id, sb.product_id, p.unit_cost
            ) t
            GROUP BY warehouse_id
        """)

        warehouse_values = [
            {"warehouse_id": row[0], "value": float(row[1])}
            for row in cursor.fetchall()
        ]

        #---------------------------------------------
        # 8. Product Type-wise Available Qty
        #--------------------------------------------
        cursor.execute("""
            SELECT 
                CASE 
                    WHEN p.product_type = 'Raw Materials' THEN 'RM'
                    WHEN p.product_type = 'Finished Goods' THEN 'FG'
                    WHEN p.product_type = 'Trading Items' THEN 'TI'
                    ELSE 'OTH'
                END AS type,
                
                ROUND(SUM(
                    COALESCE(sb.on_hand_qty,0) - COALESCE(sb.reserved_qty,0)
                ), 2) AS available_qty

            FROM stock_balances sb
            JOIN products p 
                ON sb.product_id = p.products_id

            WHERE 
                sb.on_hand_qty > 0
                AND (
                    sb.expiry_date IS NULL 
                    OR sb.expiry_date > CURRENT_DATE
                )

            GROUP BY p.product_type
            ORDER BY type
        """)

        product_type_data = [
            {"type": row[0], "value": float(row[1])}
            for row in cursor.fetchall()
        ]

         # =========================
         # PRODUCT-WISE AVAILABLE STOCK
         # =========================
        cursor.execute("""
            SELECT 
                p.name,

                ROUND(
                    COALESCE(SUM(
                        COALESCE(sb.on_hand_qty,0) - COALESCE(sb.reserved_qty,0)
                    ), 0), 
                2) AS available_qty

            FROM products p

            LEFT JOIN stock_balances sb 
                ON p.products_id = sb.product_id
                AND (
                    sb.expiry_date IS NULL 
                    OR sb.expiry_date > CURRENT_DATE
                )

            WHERE 
                p.is_active = TRUE

            GROUP BY p.name

            ORDER BY available_qty DESC
        """)

        result = [
            {
                "name": r[0],
                "available_qty": float(r[1])
            }
            for r in cursor.fetchall()
        ]

        # ================================
        # VENDOR Dashboard ANALYTICS 
        # ================================
        cursor.execute("""
            SELECT 
                po.vendor_id,

                ROUND(SUM(po.total_cost), 2) AS total_purchase_value,

                COUNT(*) FILTER (WHERE po.status = 'Received') AS completed_orders,

                ROUND(
                    COUNT(*) FILTER (
                        WHERE gr.receipt_date <= po.expected_date
                    ) * 100.0 
                    / NULLIF(COUNT(gr.grn_id), 0), 
                2) AS on_time_delivery_pct,

                ROUND(
                    AVG(gr.receipt_date - po.order_date), 
                2) AS avg_delivery_days,


                ROUND(
                    SUM(COALESCE(gi.rejected_qty, 0)) * 100.0 /
                    NULLIF(SUM(COALESCE(gi.received_qty, 0)), 0),
                2) AS rejection_rate

            FROM purchase_order po

            LEFT JOIN goods_receipts gr 
                ON po.purchase_order_id = gr.po_id

            LEFT JOIN grn_items gi 
                ON gr.grn_id = gi.grn_id

            LEFT JOIN vendors v 
                ON po.vendor_id = v.id
                       
            WHERE po.vendor_id IS NOT NULL

            GROUP BY po.vendor_id, v.lead_time_days
            ORDER BY po.vendor_id
        """)

        vendor_kpi = [
            {
                "vendor_id": row[0],
                "total_purchase_value": float(row[1] or 0),
                "completed_orders": row[2],
                "on_time_delivery_pct": float(row[3] or 0),
                "avg_delivery_days": float(row[4] or 0),
                "rejection_rate": float(row[5] or 0),
            }
            for row in cursor.fetchall()
        ]


        # ==================================
        # Customer Dashboard ANALYTICS
        # ==================================
        cursor.execute("""
            SELECT 
                o.customer_id,

                COUNT(o.id) AS total_orders,

                COUNT(*) FILTER (WHERE o.status = 'Completed') AS completed_orders,

                COUNT(*) FILTER (WHERE o.status = 'CANCELLED') AS cancelled_orders,

                ROUND(COALESCE(SUM(i.total_amount), 0), 2) AS total_spend,

                ROUND(
                    COALESCE(SUM(i.total_amount), 0) /
                    NULLIF(COUNT(*) FILTER (WHERE o.status = 'Completed'), 0),
                2) AS avg_order_value,

                MAX(o.order_date) AS last_order_date

            FROM orders o

            LEFT JOIN invoices i 
                ON o.so_number = i.so_number

            GROUP BY o.customer_id

            ORDER BY total_spend DESC
        """)

        customer_kpi = [
            {
                "customer_id": row[0],
                "total_orders": row[1],
                "completed_orders": row[2],
                "cancelled_orders": row[3],
                "total_spend": float(row[4] or 0),
                "avg_order_value": float(row[5] or 0),
                "last_order_date": str(row[6]) if row[6] else None,
            }
            for row in cursor.fetchall()
        ]

        return {
            "waiting_orders": waiting_orders,
            "completed_orders": completed_orders,
            "cancelled_orders": cancelled_orders,
            "expiring_today": expiring_today,
            "demand": float(demand),
            "total_order": float(total_order),
            
            "warehouse_inventory_value": warehouse_values,

            "product_type_summary": product_type_data,
            "product_wie_stock":result,
            "vendor_kpi": vendor_kpi,
            "customer_kpi": customer_kpi
        }

    except Exception as e:
        return {"error": str(e)}











@app.get("/reports/purchase")
def get_purchase_report(
    from_date: date = Query(...),
    to_date: date = Query(...),
    filter_type: str = Query("order_date"),
    _ = Depends(get_current_user)
):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # ✅ Base Query
        base_query = """
        SELECT 
            po.purchase_order_id AS po_number,
            pol.product_id,
            po.vendor_id,
            po.order_date,
            pol.ordered_qty,
            po.status,

            COALESCE(pol.received_qty, 0) AS received_qty,

            COALESCE(SUM(gi.rejected_qty), 0) AS rejected_qty,

            MAX(gr.receipt_date) AS last_receipt_date,

            STRING_AGG(DISTINCT gr.warehouses_id, ', ') AS warehouse

        FROM purchase_order po

        INNER JOIN purchase_order_lines pol
            ON po.purchase_order_id = pol.purchase_order_id

        LEFT JOIN goods_receipts gr
            ON po.purchase_order_id = gr.po_id

        LEFT JOIN grn_items gi
            ON gr.grn_id = gi.grn_id
            AND pol.product_id = gi.product_id

        WHERE po.status IN ('Approved', 'Received', 'Cancelled', 'Closed')
        """

        # ✅ Dynamic Filter
        if filter_type == "order_date":

            base_query += """
                AND po.order_date BETWEEN %s AND %s
            """

        elif filter_type == "received_date":

            base_query += """
                AND po.status = 'Closed'
                AND gr.receipt_date BETWEEN %s AND %s
            """

        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid filter_type"
            )

        # ✅ Group By
        base_query += """
        GROUP BY 
            po.purchase_order_id,
            pol.product_id,
            po.vendor_id,
            po.order_date,
            pol.ordered_qty,
            po.status,
            pol.received_qty

        ORDER BY po.order_date DESC
        """

        # ✅ Execute
        cursor.execute(base_query, (from_date, to_date))
        rows = cursor.fetchall()

        # ✅ Column Names
        columns = [desc[0] for desc in cursor.description]

        # ✅ Convert Response
        data = []

        for row in rows:

            record = dict(zip(columns, row))

            # ✅ Cancelled Orders
            if record.get("status") == "Cancelled":

                record["received_qty"] = 0
                record["rejected_qty"] = 0
                record["last_receipt_date"] = "Cancelled"
                record["warehouse"] = "Cancelled"

            # ✅ Approved / Pending Receipt
            elif float(record.get("received_qty", 0)) == 0:

                record["received_qty"] = 0
                record["rejected_qty"] = 0
                record["last_receipt_date"] = "Not Received"
                record["warehouse"] = "Not Assigned"

            # ✅ Fully / Partially Received
            else:

                if record["last_receipt_date"] is None:
                    record["last_receipt_date"] = "Not Received"

                if record["warehouse"] is None:
                    record["warehouse"] = "Not Assigned"

            data.append(record)

        cursor.close()
        conn.close()

        return {
            "status": "success",
            "count": len(data),
            "data": data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




#--------------------------------------
#    Report page for sales order report
#----------------------------------------
@app.get("/reports/sales")
def get_sales_report(
    from_date: date,
    to_date: date,
    filter_type: str = "order_date",
    status_filter: str = None,
    page: int = 1,
    limit: int = 10,
    _ = Depends(get_current_user)
):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        offset = (page - 1) * limit

        # ✅ Base Query
        base_query = """
        FROM orders o

        LEFT JOIN sales_order_lines sol
            ON o.so_number = sol.so_number

        LEFT JOIN invoices i
            ON o.so_number = i.so_number
            AND sol.product_id = i.product_id

        LEFT JOIN dispat d
            ON o.so_number = d.o_id

        WHERE 1=1
        """

        params = []

        # ✅ Date Filter
        if filter_type == "order_date":

            base_query += """
                AND DATE(o.order_date) BETWEEN %s AND %s
            """

        else:

            base_query += """
                AND DATE(d.dispatch_date) BETWEEN %s AND %s
            """

        params.extend([from_date, to_date])

        # ✅ Status Filter
        if status_filter:

            base_query += """
            AND (
                CASE
                    WHEN o.status = 'Completed' THEN 'Delivered'
                    WHEN o.status = 'CANCELLED' THEN 'Cancelled'
                    ELSE 'Not Delivered'
                END = %s
            )
            """

            params.append(status_filter)

        # ✅ Total Count
        count_query = """
        SELECT COUNT(DISTINCT o.so_number)
        """ + base_query

        cursor.execute(count_query, tuple(params))
        total = cursor.fetchone()[0]

        # ✅ Main Query
        data_query = """
        SELECT 
            o.so_number,
            o.customer_id,

            sol.product_id,

            o.order_date,

            sol.ordered_qty,

            COALESCE(sol.issued_qty, 0) AS delivered_qty,

            COALESCE(i.total_amount, 0) AS total_amount,

            MAX(d.dispatch_date) AS delivery_date,

            CASE
                WHEN o.status = 'Completed' THEN 'Delivered'
                WHEN o.status = 'CANCELLED' THEN 'Cancelled'
                ELSE 'Not Delivered'
            END AS status

        """ + base_query + """

        GROUP BY 
            o.so_number,
            o.customer_id,
            sol.product_id,
            o.order_date,
            sol.ordered_qty,
            sol.issued_qty,
            i.total_amount,
            o.status

        ORDER BY o.order_date DESC

        LIMIT %s OFFSET %s
        """

        params.extend([limit, offset])

        cursor.execute(data_query, tuple(params))
        rows = cursor.fetchall()

        # ✅ Column Names
        columns = [desc[0] for desc in cursor.description]

        data = []

        for row in rows:

            record = dict(zip(columns, row))

            # ✅ Delivery Date Handling
            if record["delivery_date"] is None:
                record["delivery_date"] = "Not Delivered"

            data.append(record)

        cursor.close()
        conn.close()

        return {
            "status": "success",
            "page": page,
            "limit": limit,
            "total": total,
            "data": data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))













# ==========================
# CREATE COMPANY
# ==========================
@app.post("/company/create", status_code=201)
def create_company(payload: CompanyModel, _ = Depends(get_current_user)):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        print("Received data:", payload.dict())

        # =====================================================
        # ALLOW ONLY ONE COMPANY
        # =====================================================

        cursor.execute("""
            SELECT id
            FROM companies
            LIMIT 1
        """)

        existing_company = cursor.fetchone()

        if existing_company:

            raise HTTPException(
                status_code=400,
                detail="Company Details already exists. Multiple companies are not allowed."
            )

        # =====================================================
        # CHECK GSTIN DUPLICATE
        # =====================================================

        if payload.gstin and payload.gstin.strip():

            cursor.execute(
                """
                SELECT id
                FROM companies
                WHERE LOWER(gstin) = LOWER(%s)
                """,
                (payload.gstin.strip(),)
            )

            if cursor.fetchone():

                raise HTTPException(
                    status_code=400,
                    detail="GSTIN already exists"
                )

        # =====================================================
        # INSERT COMPANY
        # =====================================================

        cursor.execute("""
            INSERT INTO companies
            (
                company_name,
                gstin,
                pan_number,
                phone,
                email,
                street_address,
                city,
                state,
                pincode,
                country
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            RETURNING id
        """, (

            payload.companyName.strip(),

            payload.gstin.strip()
            if payload.gstin else None,

            payload.pan.strip()
            if payload.pan else None,

            payload.phone.strip()
            if payload.phone else None,

            payload.email.strip()
            if payload.email else None,

            payload.streetAddress.strip()
            if payload.streetAddress else None,

            payload.city.strip()
            if payload.city else None,

            payload.state.strip()
            if payload.state else None,

            payload.pincode.strip()
            if payload.pincode else None,

            payload.country.strip()
            if payload.country else "India"

        ))

        # =====================================================
        # GET NEW COMPANY ID
        # =====================================================

        new_id = cursor.fetchone()[0]

        conn.commit()

        print(f"Company created with ID: {new_id}")

        return {
            "id": new_id,
            "message": "Company created successfully",
            "company_id": new_id
        }

    # =========================================================
    # HANDLE HTTP ERRORS
    # =========================================================

    except HTTPException:
        raise

    # =========================================================
    # HANDLE OTHER ERRORS
    # =========================================================

    except Exception as e:

        conn.rollback()

        print("CREATE ERROR:", str(e))

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    # =========================================================
    # CLOSE CONNECTION
    # =========================================================

    finally:

        cursor.close()
        conn.close()

# ==========================
# READ ALL COMPANIES
# ==========================
@app.get("/company/read")
def read_companies(_ = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT 
                id,
                company_name,
                gstin,
                pan_number,
                phone,
                email,
                street_address,
                city,
                state,
                pincode,
                country
            FROM companies
            ORDER BY id DESC
        """)

        rows = cursor.fetchall()

        companies = []
        for r in rows:
            companies.append({
                "id": r[0],
                "companyName": r[1] or "",
                "gstin": r[2] or "",
                "pan": r[3] or "",
                "phone": r[4] or "",
                "email": r[5] or "",
                "streetAddress": r[6] or "",
                "city": r[7] or "",
                "state": r[8] or "",
                "pincode": r[9] or "",
                "country": r[10] or "India",
            })
        
        print(f"Returning {len(companies)} companies")  # Debug log
        return companies

    except Exception as e:
        print("READ ERROR:", str(e))  # Debug log
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        cursor.close()
        conn.close()

# ==========================
# UPDATE COMPANY
# ==========================
@app.put("/company/update/{company_id}")
def update_company(company_id: int, payload: CompanyModel, _ = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check if company exists
        cursor.execute("SELECT id FROM companies WHERE id=%s", (company_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Company not found")

        print(f"Updating company ID: {company_id}")  # Debug log

        # Update company
        cursor.execute("""
            UPDATE companies SET
                company_name=%s,
                gstin=%s,
                pan_number=%s,
                phone=%s,
                email=%s,
                street_address=%s,
                city=%s,
                state=%s,
                pincode=%s,
                country=%s
            WHERE id=%s
        """, (
            payload.companyName.strip(),
            payload.gstin.strip() if payload.gstin else None,
            payload.pan.strip() if payload.pan else None,
            payload.phone.strip() if payload.phone else None,
            payload.email.strip() if payload.email else None,
            payload.streetAddress.strip() if payload.streetAddress else None,
            payload.city.strip() if payload.city else None,
            payload.state.strip() if payload.state else None,
            payload.pincode.strip() if payload.pincode else None,
            payload.country.strip() if payload.country else "India",
            company_id
        ))

        conn.commit()
        return {"message": "Company updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("UPDATE ERROR:", str(e))  # Debug log
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        cursor.close()
        conn.close()


# ==============================
# CREATE COURIER
# ==============================
@app.post("/courier-create")
def create_courier(data: dict, _ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Prevent duplicate request
        cursor.execute("""
            SELECT courier_id
            FROM courier
            WHERE request_id = %s
        """, (data.get("request_id"),))

        existing = cursor.fetchone()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Duplicate request detected"
            )

        # Generate Courier ID
        today = datetime.now()
        date_part = today.strftime("%y%m%d")

        cursor.execute("""
            SELECT courier_id FROM courier
            WHERE courier_id LIKE %s
            ORDER BY courier_id DESC LIMIT 1
        """, (f"CRR-{date_part}-%",))

        last = cursor.fetchone()

        if last:
            last_number = int(last[0].split("-")[-1])
            new_number = last_number + 1
        else:
            new_number = 1

        courier_id = f"CRR-{date_part}-{str(new_number).zfill(3)}"

        # Insert
        cursor.execute("""
            INSERT INTO courier (
                courier_id, name, address, city, state, country,
                pin_code, contact_person, phone_number, email,
                service_type, coverage_area, is_active, created_at, request_id
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            courier_id,
            data.get("name"),
            data.get("address"),
            data.get("city"),
            data.get("state"),
            data.get("country"),
            data.get("pin_code"),
            data.get("contact_person"),
            data.get("phone_number"),
            data.get("email"),
            data.get("service_type"),
            data.get("coverage_area"),
            data.get("is_active"),
            datetime.now(),
            data.get("request_id")
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": "Courier Created",
            "courier_id": courier_id
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==============================
# READ COURIERS
# ==============================
@app.get("/courier-read")
def read_couriers(_ = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT 
                id, courier_id, name, address, city, state, country,
                pin_code, contact_person, phone_number, email,
                service_type, coverage_area, tracking_available,
                created_at, is_active
            FROM courier
            ORDER BY created_at DESC
        """)
        rows = cursor.fetchall()
        return [
            {
                "id": r[0],
                "courier_id": r[1] or "-",
                "name": r[2] or "-",
                "address": r[3] or "-",
                "city": r[4] or "-",
                "state": r[5] or "-",
                "country": r[6] or "-",
                "pin_code": r[7] or "-",
                "contact_person": r[8] or "-",
                "phone_number": r[9] or "-",
                "email": r[10] or "-",
                "service_type": r[11] or "-",
                "coverage_area": r[12] or "-",
                "tracking_available": bool(r[13]),
                "created_at": str(r[14]) if r[14] else None,
                "is_active": r[15] if r[15] is not None else True,
            }
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# ==============================
# UPDATE COURIER
# ==============================
@app.put("/courier-update/{id}")
def update_courier(id: int, data: dict, _ = Depends(get_current_user)):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE courier SET
                name=%s, address=%s, city=%s, state=%s, country=%s,
                pin_code=%s, contact_person=%s, phone_number=%s, email=%s,
                service_type=%s, coverage_area=%s, is_active=%s
            WHERE id=%s
        """, (
            data.get("name"),
            data.get("address"),
            data.get("city"),
            data.get("state"),
            data.get("country"),
            data.get("pin_code"),
            data.get("contact_person"),
            data.get("phone_number"),
            data.get("email"),
            data.get("service_type"),
            data.get("coverage_area"),
            data.get("is_active"),   
            id
        ))
        conn.commit()
        return {"message": "Courier Updated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# ==============================
# READ COURIERS - ID + NAME ONLY
# (For Create Courier / general name list)
# ==============================
@app.get("/courier-names")
def read_courier_names(_ = Depends(get_current_user)):
    """
    Returns courier_id and name only.
    Used in: Create Courier reference / name lookup.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT
                courier_id,
                name
            FROM courier
            ORDER BY created_at DESC
        """)

        rows = cursor.fetchall()

        return [
            {
                "courier_id": r[0] or "-",
                "name": r[1] or "-"
            }
            for r in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        cursor.close()
        conn.close()




# ==============================
# READ COURIERS - ACTIVE ONLY
# For Dispatch Form Dropdown
# ==============================
@app.get("/courier-dropdown")
def read_courier_dropdown(_ = Depends(get_current_user)):
    """
    Returns ONLY active couriers (is_active = TRUE)
    Used in: Create Dispatch + Invoice form (courier selector)
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT
                courier_id,
                name
            FROM courier
            WHERE is_active = TRUE
            ORDER BY name ASC
        """)

        rows = cursor.fetchall()

        return [
            {
                "courier_id": r[0] or "-",
                "name": r[1] or "-"
            }
            for r in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@app.get("/stock-movements-summary")
def stock_movements_summary():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT movement_type,
                   SUM(ABS(movement_qty)) as total_qty,
                   COUNT(*) as count
            FROM stock_ledger
            GROUP BY movement_type
        """)

        rows = cursor.fetchall()

        RESERVE_TYPES  = {"RESERVE", "PARTIALLY RESERVED"}
        INBOUND_TYPES  = {"PUT AWAY"}
        OUTBOUND_TYPES = {"OUT", "DISPATCH", "PACKAGED"}
        CANCEL_TYPES   = {"RESERVATION CANCELLED"}

        total_in       = 0.0
        total_out      = 0.0
        total_reserve  = 0.0
        total_packaged = 0.0
        total_cancel   = 0.0
        total_movements = 0
        breakdown = {}

        for r in rows:
            mtype, qty, cnt = r[0], to_float(r[1]), r[2]
            breakdown[mtype] = {"qty": qty, "count": cnt}
            total_movements += cnt

            if mtype in INBOUND_TYPES:
                total_in += qty
            elif mtype in OUTBOUND_TYPES and mtype != "PACKAGED":
                total_out += qty
            elif mtype == "PACKAGED":
                total_packaged += qty
            elif mtype in RESERVE_TYPES:
                total_reserve += qty        # ← abs() already applied in SQL
            elif mtype in CANCEL_TYPES:
                total_cancel += qty

        return {
            "total_movements"      : total_movements,
            "total_in"             : total_in,
            "total_out"            : total_out,
            "total_reserve"        : total_reserve,
            "total_packaged"       : total_packaged,
            "reservations_cancelled": total_cancel,
            "breakdown"            : breakdown
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        cursor.close()
        conn.close()

# =============================
# VENDOR PORTAL APIs
# =============================

@app.get("/vendor/pos")
def get_vendor_pos(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "VENDOR":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    vendor_id = current_user.get("vendor_id")
    if not vendor_id:
        raise HTTPException(status_code=400, detail="No vendor profile linked to this user")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Ensure activity records exist and set viewed_at for new ones
        cursor.execute("""
            INSERT INTO po_vendor_activity (purchase_order_id, vendor_id, viewed_at)
            SELECT purchase_order_id, vendor_id, CURRENT_TIMESTAMP
            FROM purchase_order
            WHERE vendor_id = %s
            AND purchase_order_id NOT IN (SELECT purchase_order_id FROM po_vendor_activity)
        """, (vendor_id,))
        conn.commit()

        # Fetch POs assigned to this vendor
        cursor.execute("""
            SELECT 
                p.purchase_order_id, p.status, p.created_at,
                a.expected_delivery_date, a.dispatched_at, a.dispatch_note, a.vehicle_number, a.viewed_at, a.status AS vendor_status,
                p.total_cost, p.order_date
            FROM purchase_order p
            LEFT JOIN po_vendor_activity a ON p.purchase_order_id = a.purchase_order_id
            WHERE p.vendor_id = %s
            ORDER BY p.purchase_order_id DESC
        """, (vendor_id,))
        header_rows = cursor.fetchall()
        
        cursor.execute("""
            SELECT l.po_line_id, l.purchase_order_id, l.product_id, l.ordered_qty, l.received_qty, l.unit_cost, l.total_cost, l.status, pr.name
            FROM purchase_order_lines l
            LEFT JOIN products pr ON l.product_id = pr.products_id
        """)
        line_rows = cursor.fetchall()

        from collections import defaultdict
        lines_by_po = defaultdict(list)
        for lr in line_rows:
            lines_by_po[lr[1]].append({
                "po_line_id": lr[0],
                "product_id": lr[2],
                "ordered_qty": lr[3],
                "received_qty": lr[4],
                "unit_cost": lr[5],
                "total_cost": lr[6],
                "status": lr[7],
                "product_name": lr[8]
            })

        return [
            {
                "purchase_order_id": r[0],
                "status": r[1],
                "created_at": r[2],
                "expected_delivery_date": r[3],
                "dispatched_at": r[4],
                "dispatch_note": r[5],
                "vehicle_number": r[6],
                "viewed_at": r[7],
                "vendor_status": r[8],
                "total_cost": r[9],
                "order_date": r[10],
                "lines": lines_by_po.get(r[0], [])
            }
            for r in header_rows
        ]
    finally:
        cursor.close()
        conn.close()

@app.put("/vendor/po-activity/{po_id}")
def update_vendor_po_activity(po_id: str, activity: VendorActivityUpdate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "VENDOR":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    vendor_id = current_user.get("vendor_id")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Verify PO belongs to this vendor and is not cancelled
        cursor.execute("SELECT vendor_id, status FROM purchase_order WHERE purchase_order_id = %s", (po_id,))
        po = cursor.fetchone()
        if not po or po[0] != vendor_id:
            raise HTTPException(status_code=403, detail="Purchase order not found or not assigned to you")
            
        if po[1] == 'Cancelled':
            raise HTTPException(status_code=400, detail="This Purchase Order has been cancelled and cannot be updated.")

        # Check if activity record exists and get status
        cursor.execute("SELECT activity_id, status FROM po_vendor_activity WHERE purchase_order_id = %s", (po_id,))
        exists = cursor.fetchone()

        if exists and exists[1] == 'COMPLETED':
            raise HTTPException(status_code=400, detail="This PO is already marked as completed and cannot be updated.")

        # If they are providing dispatch info, validate it
        is_dispatching = activity.dispatched_at is not None or activity.vehicle_number is not None
        if is_dispatching:
            if not activity.dispatched_at or not activity.vehicle_number:
                raise HTTPException(status_code=400, detail="Dispatch Date & Time and Vehicle Number are required to mark as dispatched.")
            new_status = 'COMPLETED'
        else:
            new_status = 'PENDING'

        if exists:
            # Update existing
            cursor.execute("""
                UPDATE po_vendor_activity 
                SET expected_delivery_date = COALESCE(%s, expected_delivery_date),
                    dispatched_at = COALESCE(%s, dispatched_at),
                    dispatch_note = COALESCE(%s, dispatch_note),
                    vehicle_number = COALESCE(%s, vehicle_number),
                    status = %s
                WHERE purchase_order_id = %s
            """, (activity.expected_delivery_date, activity.dispatched_at, activity.dispatch_note, activity.vehicle_number, new_status, po_id))
        else:
            # Insert new
            cursor.execute("""
                INSERT INTO po_vendor_activity 
                (purchase_order_id, vendor_id, expected_delivery_date, dispatched_at, dispatch_note, vehicle_number, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (po_id, vendor_id, activity.expected_delivery_date, activity.dispatched_at, activity.dispatch_note, activity.vehicle_number, new_status))
        
        conn.commit()
        return {"message": "Activity updated successfully"}
    finally:
        cursor.close()
        conn.close()