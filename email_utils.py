import smtplib
from email.message import EmailMessage

# Import the database connection function from your auth.py file
from auth import get_connection

# Email configuration
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USER = 'salesexecutiveswayautomation@gmail.com'
EMAIL_PASSWORD = 'watx dauu qoiq vhef'

def get_vendor_email(vendor_id: str):
    """Fetches the vendor's email address from the database based on their ID."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT email FROM vendors WHERE id = %s", (vendor_id,))
        result = cursor.fetchone()
        if result:
            return result[0]
        return None
    except Exception as e:
        print(f"Error fetching vendor email: {e}")
        return None
    finally:
        cursor.close()
        conn.close()


def get_company_name():
    """Fetches the primary company name from the database."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT company_name FROM companies LIMIT 1")
        result = cursor.fetchone()
        if result:
            return result[0]
        return "Pure Software SCM"
    except Exception as e:
        print(f"Error fetching company name: {e}")
        return "Pure Software SCM"
    finally:
        cursor.close()
        conn.close()

def get_product_name(product_id: str):
    """Fetches the product name from the database based on the ID."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT name FROM products WHERE products_id = %s", (product_id,))
        result = cursor.fetchone()
        if result:
            return result[0]
        return "Unknown Product"
    except Exception as e:
        print(f"Error fetching product name: {e}")
        return "Unknown Product"
    finally:
        cursor.close()
        conn.close()

def send_po_email(vendor_email: str, po_id: str, status: str, ordered_qty: float, product_id: str):
    """Sends an email notification to the vendor regarding the purchase order."""
    if not vendor_email:
        print(f"No email provided for PO {po_id}")
        return

    company_name = get_company_name()

    # Fetch purchase order lines from database
    conn = get_connection()
    cursor = conn.cursor()
    lines = []
    try:
        cursor.execute("""
            SELECT pol.product_id, p.name, pol.ordered_qty
            FROM purchase_order_lines pol
            LEFT JOIN products p ON p.products_id = pol.product_id
            WHERE pol.purchase_order_id = %s
        """, (po_id,))
        lines = cursor.fetchall()
    except Exception as e:
        print(f"Error fetching PO lines for email: {e}")
    finally:
        cursor.close()
        conn.close()

    # Build products list for text content and table for html content
    if lines:
        products_text = ""
        for pid, name, qty in lines:
            name = name or pid or "Unknown Product"
            products_text += f"\n    - {pid}: {name} (Quantity: {float(qty)})"

        html_rows = ""
        for pid, name, qty in lines:
            name = name or pid or "Unknown Product"
            html_rows += f"""
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{pid}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">{float(qty)}</td>
            </tr>
            """
        
        products_html = f"""
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9em; background-color: #ffffff; border: 1px solid #e2e8f0;">
            <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
                    <th style="padding: 8px; color: #475569; font-weight: 600;">Product ID</th>
                    <th style="padding: 8px; color: #475569; font-weight: 600;">Product Name</th>
                    <th style="padding: 8px; color: #475569; font-weight: 600; text-align: right;">Qty</th>
                </tr>
            </thead>
            <tbody>
                {html_rows}
            </tbody>
        </table>
        """
    else:
        # Fallback if no lines were retrieved
        fallback_name = get_product_name(product_id)
        products_text = f"\n    - {product_id}: {fallback_name} (Quantity: {ordered_qty})"
        products_html = f"""
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9em; background-color: #ffffff; border: 1px solid #e2e8f0;">
            <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
                    <th style="padding: 8px; color: #475569; font-weight: 600;">Product ID</th>
                    <th style="padding: 8px; color: #475569; font-weight: 600;">Product Name</th>
                    <th style="padding: 8px; color: #475569; font-weight: 600; text-align: right;">Qty</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{product_id}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{fallback_name}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">{ordered_qty}</td>
                </tr>
            </tbody>
        </table>
        """

    msg = EmailMessage()
    msg['Subject'] = f"Update on Purchase Order: {po_id} - {status}"
    msg['From'] = EMAIL_USER
    msg['To'] = vendor_email
    
    # Plain text fallback
    text_content = f"""
    Dear Vendor,

    We are writing to inform you that Purchase Order {po_id} has been {status}.

    Order Details:
    - Purchase Order ID: {po_id}
    - Status: {status}
    - Products: {products_text}

    Please review the order and process it accordingly. If you have any questions, please reach out to our procurement team.

    Best Regards,
    {company_name} Procurement Team
    """
    msg.set_content(text_content)

    # Professional HTML content
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0; background-color: #f9f9f9; }}
            .container {{ max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-top: 5px solid #0056b3; }}
            h2 {{ color: #0056b3; margin-top: 0; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; }}
            .details {{ background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0056b3; }}
            .details strong {{ display: inline-block; width: 140px; color: #555; }}
            .footer {{ margin-top: 30px; font-size: 0.9em; color: #777; border-top: 1px solid #eee; padding-top: 20px; }}
            .status {{ font-weight: bold; color: {'#28a745' if status.lower() == 'approved' else '#0056b3'}; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Purchase Order Update</h2>
            <p>Dear Vendor,</p>
            <p>We are writing to officially notify you that <strong>Purchase Order {po_id}</strong> has been <span class="status">{status.lower()}</span>.</p>
            
            <div class="details">
                <p><strong>PO Number:</strong> {po_id}</p>
                <p><strong>Order Status:</strong> <span class="status">{status}</span></p>
                <p style="margin-bottom: 5px;"><strong>Products ordered:</strong></p>
                {products_html}
            </div>
            
            <p>Please review these details and proceed with the necessary processing on your end. If you require further clarification or need to discuss this order, please do not hesitate to contact our procurement department.</p>
            
            <p>Thank you for your continued partnership.</p>
            
            <div class="footer">
                <p>Best Regards,<br>
                <strong>{company_name} Procurement Team</strong></p>
                <p><em>This is an automated message generated by the {company_name} System. Please do not reply directly to this email.</em></p>
            </div>
        </div>
    </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')

    try:
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()  # Secure the connection
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            server.send_message(msg)
            print(f"Email sent successfully to {vendor_email} for PO {po_id}")
    except Exception as e:
        print(f"Failed to send email to {vendor_email}: {e}")