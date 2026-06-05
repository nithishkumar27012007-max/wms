from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from passlib.context import CryptContext
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends
from jose import jwt
from datetime import datetime, timedelta
import psycopg2
import uuid
import os 

router = APIRouter()     
security = HTTPBearer()

# 🔐 Config
SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 🔗 Database Connection
def get_connection():
    return psycopg2.connect(
        host="localhost",        # server IP
        database="whm_db",           # ← correct database
        user="postgres",        # ← correct user
        password="Sway123",   # ← correct password
        port="5432"
    )

class LoginRequest(BaseModel):
    username: str
    password: str

class SignupRequest(BaseModel):
    username: str
    password: str
    role: str 
    vendor_id: str | None = None

class UpdateUserRequest(BaseModel):
    role: str | None = None
    is_active: bool | None = None
    new_password: str | None = None

#----------------------------------------
#     Dependency for get Current User
#-----------------------------------------
def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    token = credentials.credentials

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # ---------------------------------
        # JWT Validation
        # ---------------------------------
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        username = payload.get("sub")
        role = payload.get("role")
        vendor_id = payload.get("vendor_id")

        if not username:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication"
            )

        # ---------------------------------
        # Read Session UUID from Header
        # ---------------------------------
        session_uuid = request.headers.get("session-uuid")

        if not session_uuid:
            raise HTTPException(
                status_code=401,
                detail="Session UUID missing"
            )

        # ---------------------------------
        # Expire Old Sessions Automatically
        # ---------------------------------
        cursor.execute("""
            UPDATE user_sessions
            SET
                is_active = FALSE,
                logout_time = NOW(),
                logout_reason = 'SESSION_EXPIRED'
            WHERE
                expiry_time < NOW()
                AND is_active = TRUE
        """)

        # ---------------------------------
        # Expire Idle Sessions Automatically
        # ---------------------------------
        cursor.execute("""
            UPDATE user_sessions
            SET
                is_active = FALSE,
                logout_time = NOW(),
                logout_reason = 'IDLE_TIMEOUT'
            WHERE
                last_activity < NOW() - INTERVAL '30 minutes'
                AND is_active = TRUE
        """)

        conn.commit() 

        # ---------------------------------
        # Validate Current Session
        # ---------------------------------
        cursor.execute("""
            SELECT id
            FROM user_sessions
            WHERE
                session_uuid = %s
                AND is_active = TRUE
                AND expiry_time > NOW()
                AND last_activity > NOW() - INTERVAL '30 minutes'
        """, (session_uuid,))

        session = cursor.fetchone()

        if not session:
            raise HTTPException(
                status_code=401,
                detail="Session expired. Please login again."
            )

        # ---------------------------------
        # Update Last Activity
        # ---------------------------------
        cursor.execute("""
            UPDATE user_sessions
            SET
                last_activity = NOW()
            WHERE
                session_uuid = %s
        """, (session_uuid,))

        conn.commit()

        return {
            "username": username,
            "role": role,
            "session_uuid": session_uuid,
            "vendor_id": vendor_id
        }

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    finally:
        cursor.close()
        conn.close()
    
#----------------------------------------
#     Dependency for Create Access Token
#-----------------------------------------
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/login")
def login(request: LoginRequest):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # 1. Check Admin/Manager Users Table
        cursor.execute("""
            SELECT 
                u.id,
                u.password_hash,
                r.name,
                NULL as vendor_id
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.username = %s AND u.is_active = TRUE
        """, (request.username,))
        
        user = cursor.fetchone()

        # 2. Check Vendor Portal Users Table if not found
        if not user:
            cursor.execute("""
                SELECT 
                    portal_user_id as id,
                    password_hash,
                    'VENDOR' as name,
                    vendor_id
                FROM vendor_portal_users
                WHERE email = %s AND is_active = TRUE
            """, (request.username,))
            user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user_id, stored_hash, role, vendor_id = user

        # 3. Verify Password
        if not pwd_context.verify(request.password, stored_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # 4. Session Management
        session_uuid = str(uuid.uuid4())
        expiry_time = datetime.now() + timedelta(hours=8)

        # Manage user_sessions (Wrapped in try/except in case Vendor IDs aren't allowed in user_sessions table)
        try:
            cursor.execute("""
                UPDATE user_sessions
                SET
                    is_active = FALSE,
                    logout_time = NOW(),
                    logout_reason = 'LOGIN_FROM_OTHER_DEVICE'
                WHERE
                    user_id = %s
                    AND is_active = TRUE
            """, (user_id,))

            cursor.execute("""
                INSERT INTO user_sessions (
                    user_id,
                    session_uuid,
                    expiry_time
                )
                VALUES (%s, %s, %s)
            """, (user_id, session_uuid, expiry_time))
            
        except Exception as e:
            print(f"Session tracking skipped: {e}")
            conn.rollback() # reset transaction state if session insert fails for vendors

        conn.commit()

        # 5. Generate Token
        token_data = {
            "sub": request.username,
            "role": role
        }
        if vendor_id:
            token_data["vendor_id"] = vendor_id

        token = create_access_token(token_data)

        return {
            "access_token": token,
            "token_type": "bearer",
            "session_uuid": session_uuid
        }

    finally:
        cursor.close()
        conn.close()


#----------------------------------------
#     SignUp Page Post API
#-----------------------------------------

@router.post("/signup")
def signup(request: SignupRequest, _= Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        hashed_password = pwd_context.hash(request.password)

        if request.role.upper() == "VENDOR":
            # 1️⃣ Check if vendor email already exists
            cursor.execute("SELECT portal_user_id FROM vendor_portal_users WHERE email = %s", (request.username,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Vendor user email already exists")

            if not request.vendor_id:
                raise HTTPException(status_code=400, detail="Vendor ID is required for vendor users")

            cursor.execute("""
                INSERT INTO vendor_portal_users (vendor_id, email, password_hash)
                VALUES (%s, %s, %s)
                RETURNING portal_user_id
            """, (request.vendor_id, request.username, hashed_password))
            
            user_id = cursor.fetchone()[0]
        else:
            # 1️⃣ Check if username already exists in main users
            cursor.execute("SELECT id FROM users WHERE username = %s", (request.username,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Username already exists")

            # 2️⃣ Check if role exists
            cursor.execute("SELECT id FROM roles WHERE name = %s", (request.role,))
            role_data = cursor.fetchone()
            
            if not role_data:
                raise HTTPException(status_code=400, detail="Invalid role")
            role_id = role_data[0]

            # 3️⃣ Insert standard user
            cursor.execute("""
                INSERT INTO users (username, password_hash, role_id)
                VALUES (%s, %s, %s)
                RETURNING id
            """, (request.username, hashed_password, role_id))
            user_id = cursor.fetchone()[0]

        conn.commit()
        return {
            "message": "User created successfully",
            "user_id": user_id
        }
    finally:
        cursor.close()
        conn.close()

from fastapi import Request

#----------------------------------------
#     Logout API
#-----------------------------------------
@router.post("/logout")
def logout(
    request: Request,
    current_user = Depends(get_current_user)
):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        session_uuid = request.headers.get("session-uuid")

        cursor.execute("""
            UPDATE user_sessions
            SET
                is_active = FALSE,
                logout_time = NOW(),
                logout_reason = 'MANUAL_LOGOUT'
            WHERE
                session_uuid = %s
                AND is_active = TRUE
        """, (session_uuid,))

        conn.commit()

        return {
            "message": "Logout successful"
        }

    finally:
        cursor.close()
        conn.close()

#----------------------------------------
#     Users read  API(GET)
#-----------------------------------------
@router.get("/users")
def get_users(_= Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get standard users
        cursor.execute("""
            SELECT 
                u.id,
                u.username,
                r.name AS role,
                u.is_active,
                u.created_at
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.id DESC
        """)
        user_rows = cursor.fetchall()

        # Get vendor users
        cursor.execute("""
            SELECT 
                portal_user_id,
                email AS username,
                'VENDOR' AS role,
                is_active,
                created_at,
                vendor_id
            FROM vendor_portal_users
            ORDER BY portal_user_id DESC
        """)
        vendor_rows = cursor.fetchall()

        users = []
        for row in user_rows:
            users.append({
                "id": row[0],
                "username": row[1],
                "role": row[2],
                "is_active": row[3],
                "created_at": row[4],
                "is_vendor": False
            })

        for row in vendor_rows:
            users.append({
                "id": row[0], # prefix to avoid ID collisions
                "username": row[1],
                "role": row[2],
                "is_active": row[3],
                "created_at": row[4],
                "vendor_id": row[5],
                "is_vendor": True
            })

        return users
    finally:
        cursor.close()
        conn.close()

#----------------------------------------
#     Users Update  API(PUT)
#-----------------------------------------
@router.put("/users/{user_id}")
def update_user(user_id: int, request: UpdateUserRequest):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # ==========================================
        # Check Normal User
        # ==========================================
        cursor.execute("""
            SELECT id
            FROM users
            WHERE id = %s
        """, (user_id,))

        normal_user = cursor.fetchone()

        # ==========================================
        # Check Vendor User
        # ==========================================
        cursor.execute("""
            SELECT portal_user_id
            FROM vendor_portal_users
            WHERE portal_user_id = %s
        """, (user_id,))

        vendor_user = cursor.fetchone()

        # ==========================================
        # User Not Found
        # ==========================================
        if not normal_user and not vendor_user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        # ==========================================
        # NORMAL USERS UPDATE
        # ==========================================
        if normal_user:

            # 🔹 Update role
            if request.role:

                cursor.execute("""
                    SELECT id
                    FROM roles
                    WHERE name = %s
                """, (request.role,))

                role = cursor.fetchone()

                if not role:
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid role"
                    )

                role_id = role[0]

                cursor.execute("""
                    UPDATE users
                    SET role_id = %s
                    WHERE id = %s
                """, (role_id, user_id))

            # 🔹 Update active status
            if request.is_active is not None:

                cursor.execute("""
                    UPDATE users
                    SET is_active = %s
                    WHERE id = %s
                """, (request.is_active, user_id))

            # 🔹 Reset password
            if request.new_password:

                hashed = pwd_context.hash(request.new_password)

                cursor.execute("""
                    UPDATE users
                    SET password_hash = %s
                    WHERE id = %s
                """, (hashed, user_id))

        # ==========================================
        # VENDOR USERS UPDATE
        # ==========================================
        if vendor_user:

            # 🔹 Update active status
            if request.is_active is not None:

                cursor.execute("""
                    UPDATE vendor_portal_users
                    SET is_active = %s
                    WHERE portal_user_id = %s
                """, (request.is_active, user_id))

            # 🔹 Reset password
            if request.new_password:

                hashed = pwd_context.hash(request.new_password)

                cursor.execute("""
                    UPDATE vendor_portal_users
                    SET password_hash = %s
                    WHERE portal_user_id = %s
                """, (hashed, user_id))

        conn.commit()

        return {
            "message": "User updated successfully"
        }

    finally:
        cursor.close()
        conn.close()


#----------------------------------------------
#     Automatic data insert to Roles and users table
#----------------------------------------------
def seed_data():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # 🔹 Insert roles (only if empty)
        cursor.execute("SELECT COUNT(*) FROM roles")
        count = cursor.fetchone()[0]

        if count == 0:
            cursor.execute("""
                INSERT INTO roles (name) VALUES
                ('ADMIN'),
                ('PURCHASE MANAGER'),
                ('INVENTORY MANAGER'),
                ('SALES MANAGER'),
                ('DISPATCH MANAGER')
            """)
            print("✅ Roles inserted")

        # 🔹 Insert users (only if empty)
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]

        if user_count == 0:

            # ✅ Correct mapping (username → role name)
            users = [
                ("admin", "ADMIN"),
                ("purchase manager", "PURCHASE MANAGER"),
                ("inventory manager", "INVENTORY MANAGER"),
                ("sales manager", "SALES MANAGER"),
                ("dispatch manager", "DISPATCH MANAGER")
            ]

            for username, role_name in users:

                # 🔹 Get role_id
                cursor.execute("SELECT id FROM roles WHERE name=%s", (role_name,))
                role = cursor.fetchone()

                if not role:
                    raise Exception(f"Role not found: {role_name}")

                role_id = role[0]

                # 🔹 Hash password (same as username)
                hashed = pwd_context.hash(username)

                cursor.execute("""
                    INSERT INTO users (username, password_hash, role_id)
                    VALUES (%s, %s, %s)
                """, (username, hashed, role_id))

            print("✅ Users inserted")

        conn.commit()

    finally:
        cursor.close()
        conn.close()