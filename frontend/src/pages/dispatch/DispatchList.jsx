import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import PageHeader from '../../components/PageHeader';
import TopTabNav from '../../components/TopTabNav';
import { jwtDecode } from "jwt-decode";
import { getAuthHeaders } from "../../utils/authHeaders";

const API_URL = "http://127.0.0.1:8000";


const getRoleTabs = () => {
  const token = localStorage.getItem("token");
  let role = null;

  if (token) {
    try {
      const decoded = jwtDecode(token);
      role = decoded.role?.toUpperCase();
    } catch {
      role = null;
    }
  }

  if (role === "ADMIN" || role === "DISPATCH MANAGER") {
    return [
      { label: 'Ready', path: '/dispatch/ready' },
      { label: 'Dispatch List', path: '/dispatch/dispatch-list' },
    ];
  }

  return [];
};

function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(window.jspdf.jsPDF); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => resolve(window.jspdf.jsPDF);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function numberToWords(n) {
  if (n === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (n) => n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  const three = (n) => n >= 100 ? ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + two(n % 100) : "") : two(n);
  if (n < 0) return "Minus " + numberToWords(-n);
  let r = "";
  if (Math.floor(n / 10000000)) { r += three(Math.floor(n / 10000000)) + " Crore "; n %= 10000000; }
  if (Math.floor(n / 100000)) { r += three(Math.floor(n / 100000)) + " Lakh "; n %= 100000; }
  if (Math.floor(n / 1000)) { r += three(Math.floor(n / 1000)) + " Thousand "; n %= 1000; }
  if (n) r += three(n);
  return r.trim();
}

// ─────────────────────────────────────────────────────────────────
//  INVOICE PDF  — company details come from /company/read (DB)
// ─────────────────────────────────────────────────────────────────
async function downloadInvoicePDF(inv, companyDetails) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, M = 15, col2 = W / 2;
  const fmt = (v) => v != null ? `INR ${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-";

  // ── Company details from DB (fixed field mapping) ──
  const companyName    = companyDetails?.companyName  || "YOUR COMPANY NAME";
  
  // Fix: Use streetAddress instead of address
  const companyAddress = [
    companyDetails?.streetAddress,  // Changed from 'address'
    companyDetails?.city,
    companyDetails?.state,
    companyDetails?.pincode,
    companyDetails?.country
  ].filter(Boolean).join(", ") || "Company Address";
  
  const companyPhone   = companyDetails?.phone  || "-";
  const companyEmail   = companyDetails?.email  || "-";
  const companyGstin   = companyDetails?.gstin  || "-";
  const companyPan     = companyDetails?.pan    || "-";

  // ── Header banner ──────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 42, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName.toUpperCase(), M, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  
  // Split address into multiple lines if too long
  const splitAddress = doc.splitTextToSize(companyAddress, W - (M * 2));
  doc.text(splitAddress, M, 18);
  
  doc.text(`Phone: ${companyPhone}  |  Email: ${companyEmail}`, M, 23);
  doc.text(`GSTIN: ${companyGstin}  |  PAN: ${companyPan}`, M, 28);

  // ── "TAX INVOICE" label (top-right) ───────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("TAX INVOICE", W - M, 13, { align: "right" });

  // ── Meta strip ────────────────────────────────────────────────
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 42, W, 20, "F");

  const meta = [
    ["INVOICE NO", inv.invoice_number ?? "-"],
    ["ORDER NO",   inv.so_number      ?? "-"],
    ["DATE",       inv.invoice_date   ?? "-"],
  ];
  const mW = (W - M * 2) / meta.length;
  meta.forEach(([lbl, val], i) => {
    const x = M + i * mW;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(lbl, x, 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(val, x, 58);
  });

  // ── Helpers ───────────────────────────────────────────────────
  const hline = (y, r = 220, g = 220, b = 220) => {
    doc.setDrawColor(r, g, b);
    doc.line(M, y, W - M, y);
  };

  let y = 76;

  // ── Product details ───────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("PRODUCT DETAILS", M, y);
  hline(y + 2);
  y += 10;

  const lv = (label, value, x, lw = 34) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(String(value ?? "-"), x + lw, y);
  };

  const productIds = inv.lines?.length > 0 ? inv.lines.map(l => l.product_id).join(", ") : (inv.product_id ?? "-");
  const productNames = inv.lines?.length > 0 ? inv.lines.map(l => l.product_name).join(", ") : (inv.product_name ?? "-");

  lv("Product ID:",   productIds, M);
  lv("Product Name:", productNames, col2, 38);
  y += 8;
  lv("Quantity:", String(inv.quantity ?? "-"), M);
  y += 4;
  hline(y + 2);
  y += 12;

  // ── Charges breakdown ─────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("CHARGES BREAKDOWN", M, y);
  hline(y + 2);
  y += 10;

  const tH = 8;
  const cols = [M + 2, 105, 160];

  doc.setFillColor(248, 250, 252);
  doc.rect(M, y - 5, W - M * 2, tH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Description", cols[0], y);
  doc.text("Rate",        cols[1], y);
  doc.text("Amount",      cols[2], y);
  hline(y + 2, 200, 200, 200);
  y += 9;

  const gstAmt   = Number(inv.gst_amount   ?? 0);
  const totalAmt = Number(inv.total_amount ?? 0);

  const rows = [];
  if (inv.lines && inv.lines.length > 0) {
    inv.lines.forEach(l => {
      rows.push([
        `${l.product_id} - ${l.product_name}`,
        `${l.quantity} unit(s) x INR ${Number(l.unit_cost).toFixed(2)}`,
        fmt(l.base_amount)
      ]);
    });
  } else {
    const baseAmt  = Number(inv.base_amount  ?? 0);
    const qty      = Number(inv.quantity ?? 1);
    const unitCost = qty > 0 ? (baseAmt / qty).toFixed(2) : "0.00";
    rows.push(["Product / Service", `${qty} unit(s) x INR ${unitCost}`, fmt(baseAmt)]);
  }

  rows.push(["GST @ 18%", "Applied on base amount", fmt(gstAmt)]);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  rows.forEach(([d, r, a], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 255);
      doc.rect(M, y - 5, W - M * 2, tH, "F");
    }
    doc.text(d, cols[0], y);
    doc.text(r, cols[1], y);
    doc.text(a, cols[2], y);
    y += 9;
  });

  hline(y - 2, 180, 180, 180);
  y += 2;

  // ── Total row ─────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(M, y - 5, W - M * 2, 11, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL AMOUNT", cols[0], y + 1);
  doc.text(fmt(totalAmt), W - M - 2, y + 1, { align: "right" });

  y += 16;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`Amount in words: ${numberToWords(Math.round(totalAmt))} Rupees Only`, M, y);

  // ── Terms ─────────────────────────────────────────────────────
  y += 8;
  hline(y);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("TERMS & CONDITIONS", M, y);
  y += 6;
  const terms = [
    "1. Payment due within 30 days of invoice.",
    "2. Goods once sold are not returnable.",
    "3. Subject to Chennai jurisdiction.",
    "4. E. & O.E.",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  terms.forEach((t, i) => doc.text(t, M, y + i * 6));

  // ── Signatures ────────────────────────────────────────────────
  y += terms.length * 6 + 8;
  hline(y);
  y += 10;
  doc.setDrawColor(150, 150, 150);
  doc.line(M,          y + 12, M + 48,    y + 12);
  doc.line(W - M - 48, y + 12, W - M,     y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("Receiver's Signature", M,      y + 17);
  doc.text("Authorised Signatory",  W - M, y + 17, { align: "right" });

  // ── Footer ────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 282, W, 15, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "This is a computer generated invoice and does not require a physical signature.",
    W / 2, 288, { align: "center" }
  );
  doc.text(
    `Generated: ${new Date().toLocaleString("en-IN")}`,
    W / 2, 293, { align: "center" }
  );

  doc.save(`${inv.invoice_number ?? "Invoice"}.pdf`);
}


export default function DispatchList() {

  const tabs = getRoleTabs();

  const [dispatchForm, setDispatchForm] = useState({
    o_id: "",
    courier_id: "",
    courier_name: "",
    location_id: "",
  });

  const [ewayForm, setEwayForm] = useState({
    invoice_id: "",
    invoice_number: "",
    gstin_recipient: "",
    place_of_delivery: "",
    value_of_goods: "",
    transporter: "",
    vehicle_number: "",
    from_place: "Thiruvalluvar",
    validity_date: "",
    eway_bill_number: "",
  });

  const [orders,        setOrders]        = useState([]);
  const [data,          setData]          = useState([]);
  const [invoices,      setInvoices]      = useState([]);
  const [ewayBills,     setEwayBills]     = useState([]);
  const [ewayInvoices,  setEwayInvoices]  = useState([]);
  const [couriers,      setCouriers]      = useState([]);
  const [locations,     setLocations]     = useState([]);
  const [proof,         setProof]         = useState(null);
  const [preview,       setPreview]       = useState(null);

  // ── Company details fetched from /company/read ──────────────
  const [companyDetails, setCompanyDetails] = useState(null);

  const [selectedOrder,    setSelectedOrder]    = useState(null);
  const [loading,          setLoading]          = useState(false);
  const [isSubmitting,     setIsSubmitting]     = useState(false);
  const [isEwaySubmitting, setIsEwaySubmitting] = useState(false);
  const [successResult,    setSuccessResult]    = useState(null);
  const [ewaySuccess,      setEwaySuccess]      = useState(null);
  const [error,            setError]            = useState(null);
  const [ewayError,        setEwayError]        = useState(null);
  const [downloadingId,    setDownloadingId]    = useState(null);
  const [showProofModal,   setShowProofModal]   = useState(false);
  const [selectedProof,    setSelectedProof]    = useState(null);

  // resolve courier_id → display name
  const getCourierName = (courierId) => {
    const found = couriers.find(c => c.courier_id === courierId);
    return found ? found.name : courierId || "-";
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        ordersRes, dispatchRes, invoiceRes, ewayRes,
        ewayInvoicesRes, locationRes, courierRes, companyRes,
      ] = await Promise.all([
        axios.get(`${API_URL}/ready-read`,
          {
          headers: getAuthHeaders()
          }
        ),
        axios.get(`${API_URL}/dispatch-list`,
          {
            headers: getAuthHeaders()
          }
        ),
        axios.get(`${API_URL}/invoices-read`,
          {
          headers: getAuthHeaders()
          }
        ),
        axios.get(`${API_URL}/eway-read`,
          {
          headers: getAuthHeaders()
          }
        ),
        axios.get(`${API_URL}/invoices-without-eway`,
          {
          headers: getAuthHeaders()
          }
        ),
        axios.get(`${API_URL}/api/dispatch-locations`,
          {
          headers: getAuthHeaders()
          }
        ),
        axios.get(`${API_URL}/courier-dropdown`, 
          {
            headers: getAuthHeaders()
          }
        ),
        axios.get(`${API_URL}/company/read`,
          {
          headers: getAuthHeaders()
          }
        ),       // ← company details
      ]);

      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);

      const allDispatches = dispatchRes.data?.dispatches
        ?? (Array.isArray(dispatchRes.data) ? dispatchRes.data : []);
      setData(allDispatches.filter(d => d.status?.toLowerCase() === "completed"));

      setInvoices(Array.isArray(invoiceRes.data)       ? invoiceRes.data       : []);
      setEwayBills(Array.isArray(ewayRes.data)         ? ewayRes.data          : []);
      setLocations(Array.isArray(locationRes.data)     ? locationRes.data      : []);
      setEwayInvoices(Array.isArray(ewayInvoicesRes.data) ? ewayInvoicesRes.data : []);
      setCouriers(Array.isArray(courierRes.data)       ? courierRes.data       : []);

      // Use the first company record (most recently created, since ordered by id DESC)
      const companyList = Array.isArray(companyRes.data) ? companyRes.data : [];
      setCompanyDetails(companyList.length > 0 ? companyList[0] : null);

    } catch (err) {

      if (err.response?.status === 401) {
        localStorage.clear();
        window.location.href = "/";
        return;
      }

      setError("Failed to fetch data. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  // Courier dropdown change
  const handleDispatchChange = (e) => {
    const { name, value } = e.target;
    if (name === "courier_id") {
      const selected = couriers.find(c => c.courier_id === value);
      const courierName = selected ? selected.name : "";
      setDispatchForm(prev => ({ ...prev, courier_id: value, courier_name: courierName }));
      setEwayForm(prev => ({ ...prev, transporter: courierName }));
    } else {
      setDispatchForm(prev => ({ ...prev, [name]: value }));
    }
    setError(null);
  };

  const handleEwayChange = (e) => {
    const { name, value } = e.target;
    setEwayForm(prev => ({ ...prev, [name]: value }));
    setEwayError(null);
  };

  const handleOrderSelect = (e) => {
    const val = e.target.value;
    if (!val) { setSelectedOrder(null); setDispatchForm(prev => ({ ...prev, o_id: "" })); return; }
    try {
      const sel = JSON.parse(val);
      setSelectedOrder(sel);
      setDispatchForm(prev => ({ ...prev, o_id: sel.order_no }));
    } catch (err) { console.error(err); }
  };

  const handleEwayInvoiceSelect = (e) => {
    const val = e.target.value;
    const inv = ewayInvoices.find((i) => String(i.id) === String(val));
    if (inv) {
      const matchedDispatch = data.find(
        (d) => d.order_number === inv.so_number || d.reference_id === inv.so_number
      );
      const transporterName = matchedDispatch
        ? getCourierName(matchedDispatch.courier_name)
        : dispatchForm.courier_name || "";
      setEwayForm(prev => ({
        ...prev,
        invoice_id:    val,
        invoice_number: inv.invoice_number ?? "",
        value_of_goods: inv.total_amount   ?? "",
        transporter:   transporterName,
      }));
    } else {
      setEwayForm(prev => ({
        ...prev,
        invoice_id:    val,
        invoice_number: "",
        value_of_goods: "",
        transporter:   "",
      }));
    }
    setEwayError(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Only image files are allowed"); e.target.value = null; return; }
    if (file.size > 5 * 1024 * 1024) { alert("Maximum file size is 5MB"); e.target.value = null; return; }
    setProof(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {

  e.preventDefault();

  if (!selectedOrder) {
    return alert("Please select an order");
  }

  if (!dispatchForm.courier_id) {
    return alert("Please select a courier");
  }

  if (!dispatchForm.location_id) {
    return alert("Please select dispatch location");
  }

  setIsSubmitting(true);

  setError(null);

  setSuccessResult(null);

  try {

    // ===========================
    // CREATE FORM DATA
    // ===========================
    const formData = new FormData();

    formData.append(
      "so_number",
      dispatchForm.o_id
    );

    formData.append(
      "courier_name",
      dispatchForm.courier_name
    );

    formData.append(
      "dispatch_location",
      dispatchForm.location_id
    );

    // ===========================
    // OPTIONAL IMAGE
    // ===========================
    if (proof) {

      formData.append(
        "proof",
        proof
      );
    }

    // ===========================
    // API CALL
    // ===========================
    const res = await axios.post(
      `${API_URL}/create-dispatch-with-invoice`,
      formData,
      {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "multipart/form-data",
        },
      }
    );

    // ===========================
    // SUCCESS
    // ===========================
    setSuccessResult(res.data);

    alert("Dispatch Completed Successfully");

    // ===========================
    // RESET FORM
    // ===========================
    setDispatchForm({
      o_id: "",
      courier_id: "",
      courier_name: "",
      location_id: "",
    });

    setProof(null);

    setPreview(null);

    setSelectedOrder(null);

    // ===========================
    // REFRESH
    // ===========================
    await fetchAllData();

  } catch (err) {

    // ===========================
    // TOKEN EXPIRED
    // ===========================
    if (err.response?.status === 401) {

      localStorage.clear();

      window.location.href = "/";

      return;
    }

    // ===========================
    // ERROR MESSAGE
    // ===========================
    let msg =
      err.response?.data?.detail ||
      "Error creating dispatch & invoice.";

    const errData =
      err.response?.data?.detail;

    if (Array.isArray(errData)) {

      msg = errData
        .map(
          e =>
            `${e.loc?.join(" → ")}: ${e.msg}`
        )
        .join(", ");

    } else if (
      typeof errData === "string"
    ) {

      msg = errData;
    }

    alert(msg);

    setError(msg);

    console.error(err);

  } finally {

    setIsSubmitting(false);
  }
};

  const handleEwaySubmit = async (e) => {

  e.preventDefault();

  if (!ewayForm.invoice_id)
    return alert("Please select an invoice");

  if (!ewayForm.gstin_recipient)
    return alert("Please enter GSTIN of Recipient");

  if (!ewayForm.place_of_delivery)
    return alert("Please enter Place of Delivery");

  if (!ewayForm.value_of_goods)
    return alert("Please enter Value of Goods");

  if (!ewayForm.vehicle_number)
    return alert("Please enter Vehicle Number");

  if (!ewayForm.validity_date)
    return alert("Please select Validity Date");

  setIsEwaySubmitting(true);

  setEwayError(null);

  const selectedInv = ewayInvoices.find(
    i => String(i.id) === String(ewayForm.invoice_id)
  );

  const payload = {

    invoice_id:
      Number(ewayForm.invoice_id),

    product_id:
      selectedInv?.product_id ?? null,

    product_name:
      selectedInv?.product_name ?? null,

    qty:
      selectedInv?.quantity ?? null,

    eway_bill_number:
      ewayForm.eway_bill_number || null,

    vehicle_number:
      ewayForm.vehicle_number.toUpperCase(),

    validity_date:
      ewayForm.validity_date,

    gstin_recipient:
      ewayForm.gstin_recipient.toUpperCase(),

    place_of_delivery:
      ewayForm.place_of_delivery,

    value_of_goods:
      Number(ewayForm.value_of_goods),

    transporter:
      ewayForm.transporter,

    from_place:
      ewayForm.from_place,
  };

  try {

    const res = await axios.post(
      `${API_URL}/eway-create`,
      payload,
      {
        headers: getAuthHeaders()
      }
    );

    // ===========================
    // SUCCESS
    // ===========================
    setEwaySuccess({
      ...res.data,
      ...payload
    });

    setEwayForm({

      invoice_id: "",
      invoice_number: "",
      gstin_recipient: "",
      place_of_delivery: "",
      value_of_goods: "",
      transporter: "",
      vehicle_number: "",
      from_place: "Thiruvalluvar",
      validity_date: "",
      eway_bill_number: "",
    });

    await fetchAllData();

  } catch (err) {

    // ===========================
    // TOKEN EXPIRED
    // ===========================
    if (err.response?.status === 401) {

      localStorage.clear();

      window.location.href = "/";

      return;
    }

    // ===========================
    // ERROR
    // ===========================
    const msg =
      err.response?.data?.detail ??
      "Error creating E-Way Bill.";

    alert(msg);

    setEwayError(msg);

    console.error(err);

  } finally {

    setIsEwaySubmitting(false);
  }
};

  // ── PDF download — passes companyDetails ────────────────────
  const handleDownloadPDF = async (inv) => {
    setDownloadingId(inv.id);
    try {
      await downloadInvoicePDF(inv, companyDetails);
    } catch (e) {
      alert("PDF generation failed: " + e.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const viewProof = (url) => {
    if (!url) return;
    const fullUrl = url.startsWith("http") ? url : `${API_URL}/uploads/${url}`;
    setSelectedProof(fullUrl); setShowProofModal(true);
  };

  const getImageUrl = (u) => {
    if (!u) return null;
    if (u.startsWith("http")) return u;
    return `${API_URL}${u.startsWith('/') ? '' : '/uploads/'}${u}`;
  };

  const formatDate = useCallback((d) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleDateString("en-IN", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return "-"; }
  }, []);

  const formatCurrency = (v) => v != null
    ? `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-";

  const s = {
    container:      { maxWidth: "1400px", margin: "0 auto", padding: "20px", backgroundColor: "#f8fafc", minHeight: "100vh" },
    pageContent:    { backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,.1)", padding: "24px", marginTop: "20px" },
    error:          { backgroundColor: "#fee2e2", color: "#dc2626", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", borderLeft: "4px solid #dc2626", fontSize: "14px" },
    success:        { backgroundColor: "#dcfce7", color: "#166534", padding: "16px 20px", borderRadius: "10px", marginBottom: "20px", borderLeft: "4px solid #16a34a", fontSize: "14px" },
    successGrid:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" },
    successItem:    { backgroundColor: "#f0fdf4", borderRadius: "6px", padding: "8px 12px", fontSize: "13px" },
    successLabel:   { color: "#64748b", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" },
    successValue:   { color: "#0f172a", fontWeight: "600", marginTop: "2px" },
    section:        { backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px", marginBottom: "28px" },
    sectionEway:    { backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #bfdbfe", padding: "24px", marginBottom: "28px" },
    sectionTitle:   { fontSize: "18px", fontWeight: "700", color: "#0f172a", marginBottom: "20px", paddingBottom: "12px", borderBottom: "2px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px" },
    sectionTitleBlue: { fontSize: "18px", fontWeight: "700", color: "#1e3a8a", marginBottom: "20px", paddingBottom: "12px", borderBottom: "2px solid #bfdbfe", display: "flex", alignItems: "center", gap: "8px" },
    form:           { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" },
    formEway:       { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" },
    fg:             { display: "flex", flexDirection: "column", gap: "6px" },
    label:          { fontSize: "13px", fontWeight: "600", color: "#334155", display: "flex", alignItems: "center", gap: "4px" },
    labelBlue:      { fontSize: "13px", fontWeight: "600", color: "#1e3a8a", display: "flex", alignItems: "center", gap: "4px" },
    input:          { padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", outline: "none", backgroundColor: "#fff" },
    inputBlue:      { padding: "10px 12px", border: "1px solid #bfdbfe", borderRadius: "8px", fontSize: "14px", outline: "none", backgroundColor: "#f8faff" },
    inputReadOnly:  { padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", outline: "none", backgroundColor: "#f1f5f9", cursor: "default", color: "#475569" },
    select:         { padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", outline: "none", backgroundColor: "#fff" },
    selectBlue:     { padding: "10px 12px", border: "1px solid #bfdbfe", borderRadius: "8px", fontSize: "14px", outline: "none", backgroundColor: "#f8faff" },
    btnPrimary:     { backgroundColor: "#3b82f6", color: "#fff", padding: "10px 22px", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
    btnBlue:        { backgroundColor: "#1e3a8a", color: "#fff", padding: "10px 22px", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
    btnSecondary:   { backgroundColor: "#64748b", color: "#fff", padding: "10px 22px", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "500", cursor: "pointer" },
    btnDownload:    { backgroundColor: "#dc2626", color: "#fff", padding: "5px 13px", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" },
    btnDownloadOff: { backgroundColor: "#fca5a5", cursor: "not-allowed" },
    btnDisabled:    { opacity: 0.5, cursor: "not-allowed" },
    btnGroup:       { display: "flex", gap: "12px", gridColumn: "1 / -1", marginTop: "4px" },
    hint:           { color: "#94a3b8", fontSize: "12px" },
    preview:        { width: "76px", height: "76px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e2e8f0", marginTop: "6px" },
    table:          { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
    th:             { padding: "11px 12px", backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0", textAlign: "left", fontWeight: "700", color: "#1e293b", whiteSpace: "nowrap" },
    thBlue:         { padding: "11px 12px", backgroundColor: "#eff6ff", borderBottom: "2px solid #bfdbfe", textAlign: "left", fontWeight: "700", color: "#1e3a8a", whiteSpace: "nowrap" },
    td:             { padding: "11px 12px", borderBottom: "1px solid #f1f5f9", color: "#334155", verticalAlign: "middle" },
    badge:          (bg, color) => ({ display: "inline-block", padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", backgroundColor: bg, color }),
    proofImg:       { width: "38px", height: "38px", objectFit: "cover", borderRadius: "6px", cursor: "pointer", border: "1px solid #e2e8f0" },
    empty:          { textAlign: "center", padding: "40px", color: "#94a3b8", fontSize: "14px" },
    modal:          { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.9)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, cursor: "pointer" },
    modalImg:       { maxWidth: "90%", maxHeight: "90%", objectFit: "contain", borderRadius: "8px" },
    infoCard:       { backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#1e40af", marginTop: "6px", gridColumn: "1 / -1" },
    // Company banner shown above Invoice Records table
    companyBanner:  { backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#166534" },
    companyBannerWarn: { backgroundColor: "#fefce8", border: "1px solid #fde047", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#854d0e" },
  };

  const displayData   = Array.isArray(data) ? data : [];
  const selectedEwayInv = ewayInvoices.find((i) => String(i.id) === String(ewayForm.invoice_id));

  return (
    <div style={s.container}>
      <PageHeader title="Dispatch Management" breadcrumbs={["Dispatch", "Dispatch List"]} />
      <TopTabNav tabs={tabs} />

      <div style={s.pageContent}>
        {error     && <div style={s.error}>⚠️ {error}</div>}
        {ewayError && <div style={s.error}>⚠️ {ewayError}</div>}

        {/* ── Success: Dispatch + Invoice ── */}
        {successResult && (
          <div style={s.success}>
            <div style={{ fontWeight: "700", fontSize: "15px", marginBottom: "6px" }}>✅ Dispatch & Invoice Created Successfully</div>
            <div style={s.successGrid}>
              {[
                ["Dispatch ID",    successResult.dispatch?.dispatches_id ?? "-"],
                ["Order No",       successResult.dispatch?.order_number  ?? "-"],
                ["Shipped Qty",    successResult.dispatch?.shipped_qty   ?? "-"],
                ["Invoice Number", successResult.invoice?.invoice_number ?? "-"],
              ].map(([lbl, val]) => (
                <div key={lbl} style={s.successItem}>
                  <div style={s.successLabel}>{lbl}</div>
                  <div style={s.successValue}>{val}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setSuccessResult(null)} style={{ ...s.btnSecondary, marginTop: "12px", padding: "6px 14px", fontSize: "12px" }}>
              Dismiss
            </button>
          </div>
        )}

        {/* ── Success: E-Way Bill ── */}
        {ewaySuccess && (
          <div style={s.success}>
            <div style={{ fontWeight: "700", fontSize: "15px", marginBottom: "6px" }}>✅ E-Way Bill Generated Successfully</div>
            <div style={s.successGrid}>
              {[
                ["E-Way Bill No",    ewaySuccess.eway_bill_number   ?? "-"],
                ["Invoice Number",   ewaySuccess.invoice_number     ?? "-"],
                ["GSTIN Recipient",  ewaySuccess.gstin_recipient    ?? "-"],
                ["Place of Delivery",ewaySuccess.place_of_delivery  ?? "-"],
                ["Vehicle No",       ewaySuccess.vehicle_number     ?? "-"],
                ["Valid Until",      ewaySuccess.validity_date      ?? "-"],
              ].map(([lbl, val]) => (
                <div key={lbl} style={s.successItem}>
                  <div style={s.successLabel}>{lbl}</div>
                  <div style={{ ...s.successValue, color: "#1e3a8a" }}>{val}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setEwaySuccess(null)} style={{ ...s.btnSecondary, marginTop: "12px", padding: "6px 14px", fontSize: "12px" }}>
              Dismiss
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            CREATE DISPATCH + INVOICE
        ═══════════════════════════════════════════════ */}
        <div style={s.section}>
         <h2 style={s.sectionTitle}>
  🚚 Create Dispatch + Invoice
  <div
    style={{ position: "relative", display: "inline-block", marginLeft: "4px" }}
  >
    <svg
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="#6b7280" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round"
      style={{ cursor: "pointer", marginTop: "2px" }}
      onClick={() => window.location.href = "/help?section=dispatch"}
      title="View help for Dispatch Management"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  </div>
</h2>
          <form onSubmit={handleSubmit} style={s.form}>

            <div style={s.fg}>
              <label style={s.label}>Select Order *</label>
              <select value={selectedOrder ? JSON.stringify(selectedOrder) : ""} onChange={handleOrderSelect} required disabled={isSubmitting} style={s.select}>
                <option value="">Select Order</option>
                {orders.map((o) => (
                  <option key={o.order_no} value={JSON.stringify(o)}>{o.order_no}</option>
                ))}
              </select>
            </div>

            <div style={s.fg}>
              <label style={s.label}>Courier Service *</label>
              <select name="courier_id" value={dispatchForm.courier_id} onChange={handleDispatchChange} required disabled={isSubmitting} style={s.select}>
                <option value="">Select Courier</option>
                {couriers.map((c) => (
                  <option key={c.courier_id} value={c.courier_id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={s.fg}>
              <label style={s.label}>Delivery Proof</label>
              <input type="file" onChange={handleFileChange} accept="image/*" disabled={isSubmitting} style={s.input} />
              <small style={s.hint}>JPG/PNG, max 5 MB</small>
              {preview && <img src={preview} alt="preview" style={s.preview} />}
            </div>

            <div style={s.fg}>
              <label style={s.label}>Dispatch Location *</label>
              <select name="location_id" value={dispatchForm.location_id} onChange={handleDispatchChange} required disabled={isSubmitting} style={s.select}>
                <option value="">Select Location</option>
                {locations.map((loc, i) => (
                  <option key={i} value={loc.location_id}>{loc.location_id}</option>
                ))}
              </select>
            </div>

            <div style={s.btnGroup}>
              <button type="button" onClick={() => { setDispatchForm({ o_id: "", courier_id: "", courier_name: "", location_id: "" }); setProof(null); setPreview(null); setSelectedOrder(null); }} style={s.btnSecondary} disabled={isSubmitting}>
                🗑️ Clear
              </button>
              <button type="submit" style={{ ...s.btnPrimary, ...(isSubmitting || loading ? s.btnDisabled : {}) }}>
                ✨ Create Dispatch & Invoice
              </button>
            </div>
          </form>
        </div>

        {/* ══════════════════════════════════════════════
            COMPLETED DISPATCHES
        ═══════════════════════════════════════════════ */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>✅ Completed Dispatches ({displayData.length})</h2>
          {loading ? (
            <div style={s.empty}>⏳ Loading...</div>
          ) : displayData.length === 0 ? (
            <div style={s.empty}>No completed dispatches found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["#", "Dispatch ID", "Order No", "Courier", "Dispatch Date", "Status", "Proof", "Qty", "Dispatch Area"].map((h) => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayData.map((d, i) => (
                    <tr key={d.id ?? i}>
                      <td style={s.td}><span style={s.badge("#e2e8f0", "#475569")}>{d.id}</span></td>
                      <td style={s.td}><span style={s.badge("#dbeafe", "#1e40af")}>{d.dispatches_id}</span></td>
                      <td style={{ ...s.td, fontWeight: "600" }}>{d.order_number}</td>
                      <td style={s.td}><span style={s.badge("#fef3c7", "#92400e")}>{getCourierName(d.courier_name)}</span></td>
                      <td style={s.td}>{formatDate(d.dispatch_date)}</td>
                      <td style={s.td}><span style={s.badge("#10b981", "#fff")}>✅ {d.status}</span></td>
                      <td style={s.td}>
                        {d.proof_url
                          ? <img src={getImageUrl(d.proof_url)} width="38" height="38" onClick={() => viewProof(d.proof_url)} style={s.proofImg} alt="proof" />
                          : "—"}
                      </td>
                      <td style={{ ...s.td, textAlign: "center" }}><span style={s.badge("#dcfce7", "#166534")}>{d.shipped_qty}</span></td>
                      <td style={{ ...s.td, textAlign: "center" }}><span style={s.badge("#dcfce7", "#166534")}>{d.dispatch_location}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════
            INVOICE RECORDS
        ═══════════════════════════════════════════════ */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>🧾 Invoice Records ({invoices.length})</h2>

          {/* Company details banner — shown above invoice table */}
          {companyDetails ? (
            <div style={s.companyBanner}>
              🏢 &nbsp;
              
            </div>
          ) : (
            <div style={s.companyBannerWarn}>
              ⚠️ &nbsp;
              <span>
                
              </span>
            </div>
          )}

          {invoices.length === 0 ? (
            <div style={s.empty}>No invoices found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["ID", "Order No", "Product", "Qty", "Invoice No", "Date", "Base Amt", "GST", "Total", "Status", "PDF"].map((h) => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => (
                    <tr key={inv.id ?? i}>
                      <td style={s.td}>{inv.id ?? "-"}</td>
                      <td style={{ ...s.td, fontWeight: "600" }}>{inv.so_number ?? "-"}</td>
                      <td style={s.td}>
                        {inv.lines && inv.lines.length > 0 ? (
                          inv.lines.map((l, idx) => (
                            <div key={idx} style={{ whiteSpace: "nowrap", marginBottom: "4px" }}>
                              <span style={s.badge("#e2e8f0", "#475569")}>{l.product_id}</span> {l.product_name}
                            </div>
                          ))
                        ) : (
                          inv.product_name ?? "-"
                        )}
                      </td>
                      <td style={{ ...s.td, textAlign: "center" }}>{inv.quantity ?? "-"}</td>
                      <td style={s.td}><span style={s.badge("#ede9fe", "#5b21b6")}>{inv.invoice_number ?? "-"}</span></td>
                      <td style={s.td}>{inv.invoice_date ?? "-"}</td>
                      <td style={s.td}>{formatCurrency(inv.base_amount)}</td>
                      <td style={s.td}>{formatCurrency(inv.gst_amount)}</td>
                      <td style={{ ...s.td, fontWeight: "700" }}>{formatCurrency(inv.total_amount)}</td>
                      <td style={s.td}>
                        <span style={inv.status === "Paid" ? s.badge("#dcfce7", "#166534") : s.badge("#e2e8f0", "#475569")}>
                          {inv.status ?? "-"}
                        </span>
                      </td>
                      <td style={s.td}>
                        <button
                          onClick={() => handleDownloadPDF(inv)}
                          disabled={downloadingId === inv.id}
                          style={{ ...s.btnDownload, ...(downloadingId === inv.id ? s.btnDownloadOff : {}) }}
                        >
                          {downloadingId === inv.id ? "⏳" : "📄"} PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════
            GENERATE E-WAY BILL
        ═══════════════════════════════════════════════ */}
        <div style={s.sectionEway}>
         <h2 style={s.sectionTitleBlue}>
  🛣️ Generate E-Way Bill
  <div style={{ position: "relative", display: "inline-block", marginLeft: "4px" }}>
    <svg
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="#6b7280" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round"
      style={{ cursor: "pointer", marginTop: "2px" }}
      onClick={() => window.location.href = "/help?section=dispatch"}
      title="View help for E-Way Bill"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  </div>
</h2>

          <form onSubmit={handleEwaySubmit}>
            <div style={s.formEway}>

              <div style={s.fg}>
                <label style={s.labelBlue}>Select Invoice * ({ewayInvoices.length} available)</label>
                <select value={ewayForm.invoice_id} onChange={handleEwayInvoiceSelect} required disabled={isEwaySubmitting} style={s.selectBlue}>
                  <option value="">— Select Invoice —</option>
                  {ewayInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      #{inv.id} | {inv.invoice_number} | {inv.product_name} (Qty:{inv.quantity}) | {formatCurrency(inv.total_amount)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={s.fg}>
                <label style={s.labelBlue}>Invoice Number</label>
                <input type="text" name="invoice_number" value={ewayForm.invoice_number} readOnly disabled={isEwaySubmitting} placeholder="Auto-filled from invoice" style={s.inputReadOnly} />
              </div>

              <div style={s.fg}>
                <label style={s.labelBlue}>GSTIN of Recipient *</label>
                <input type="text" name="gstin_recipient" value={ewayForm.gstin_recipient} onChange={handleEwayChange} placeholder="e.g. 29HIJCJ5678K1Z9" maxLength={15} required disabled={isEwaySubmitting} style={{ ...s.inputBlue, textTransform: "uppercase" }} onInput={(e) => e.target.value = e.target.value.toUpperCase()} />
              </div>

              <div style={s.fg}>
                <label style={s.labelBlue}>Place of Delivery *</label>
                <input type="text" name="place_of_delivery" value={ewayForm.place_of_delivery} onChange={handleEwayChange} placeholder="e.g. Chennai" required disabled={isEwaySubmitting} style={s.inputBlue} />
              </div>

              <div style={s.fg}>
                <label style={s.labelBlue}>Value of Goods (₹) *</label>
                <input type="number" name="value_of_goods" value={ewayForm.value_of_goods} placeholder="Auto-filled from invoice" min="0" required disabled={isEwaySubmitting} readOnly style={s.inputReadOnly} />
              </div>

              <div style={s.fg}>
                <label style={s.labelBlue}>Transporter / Courier</label>
                <input type="text" name="transporter" value={ewayForm.transporter} readOnly disabled={isEwaySubmitting} placeholder="Auto-filled from dispatch courier" style={s.inputReadOnly} />
              </div>

              <div style={s.fg}>
                <label style={s.labelBlue}>Vehicle No *</label>
                <input type="text" name="vehicle_number" value={ewayForm.vehicle_number} onChange={handleEwayChange} placeholder="e.g. TN01AB1234" required disabled={isEwaySubmitting} style={{ ...s.inputBlue, textTransform: "uppercase" }} onInput={(e) => e.target.value = e.target.value.toUpperCase()} />
              </div>

              <div style={s.fg}>
                <label style={s.labelBlue}>From (Place)</label>
                <input type="text" name="from_place" value={ewayForm.from_place} readOnly disabled={isEwaySubmitting} style={s.inputReadOnly} />
              </div>

              <div style={s.fg}>
                <label style={s.labelBlue}>Valid Until *</label>
                <input type="date" name="validity_date" value={ewayForm.validity_date} onChange={handleEwayChange} required disabled={isEwaySubmitting} style={s.inputBlue} min={new Date().toISOString().split("T")[0]} />
              </div>

            </div>

            {selectedEwayInv && (
              <div style={s.infoCard}>
                <strong>Invoice Details:</strong> {selectedEwayInv.invoice_number} |
                Product: {selectedEwayInv.product_name} | Qty: {selectedEwayInv.quantity} |
                Total: {formatCurrency(selectedEwayInv.total_amount)}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <button type="button" onClick={() => setEwayForm({ invoice_id: "", invoice_number: "", gstin_recipient: "", place_of_delivery: "", value_of_goods: "", transporter: "", vehicle_number: "", from_place: "Thiruvalluvar", validity_date: "", eway_bill_number: "" })} style={s.btnSecondary} disabled={isEwaySubmitting}>
                🗑️ Clear
              </button>
              <button type="submit" style={{ ...s.btnBlue, ...(isEwaySubmitting ? s.btnDisabled : {}) }}>
                🛣️ Generate E-Way Bill
              </button>
            </div>
          </form>
        </div>

        {/* ══════════════════════════════════════════════
            E-WAY BILL RECORDS
        ═══════════════════════════════════════════════ */}
        <div style={s.sectionEway}>
          <h2 style={s.sectionTitleBlue}>📋 E-Way Bill Records ({ewayBills.length})</h2>
          {ewayBills.length === 0 ? (
            <div style={s.empty}>No E-Way Bills found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["ID", "Invoice No", "Product", "Qty", "E-Way Bill No", "GSTIN Recipient",
                      "Place of Delivery", "Vehicle No", "From", "Valid Until",
                      "Transporter", "Value (₹)", "Created", "Action"].map((h) => (
                        <th key={h} style={s.thBlue}>{h}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {ewayBills.map((eway, i) => (
                    <tr key={eway.id ?? i}>
                      <td style={s.td}><span style={s.badge("#e2e8f0", "#475569")}>{eway.id ?? i + 1}</span></td>
                      <td style={s.td}><span style={s.badge("#ede9fe", "#5b21b6")}>{eway.invoice_number ?? "-"}</span></td>
                      <td style={s.td}>{eway.product_name ?? "-"}</td>
                      <td style={{ ...s.td, textAlign: "center" }}>{eway.qty ?? "-"}</td>
                      <td style={s.td}><span style={s.badge("#dbeafe", "#1e3a8a")}>{eway.eway_bill_number ?? "-"}</span></td>
                      <td style={s.td}>{eway.gstin_recipient ?? "-"}</td>
                      <td style={s.td}>{eway.place_of_delivery ?? "-"}</td>
                      <td style={s.td}><span style={s.badge("#fef3c7", "#92400e")}>{eway.vehicle_number ?? "-"}</span></td>
                      <td style={s.td}>{eway.from_place ?? "-"}</td>
                      <td style={s.td}>{eway.validity_date ?? "-"}</td>
                      <td style={s.td}>{eway.transporter ?? "-"}</td>
                      <td style={s.td}>{eway.value_of_goods ? formatCurrency(eway.value_of_goods) : "-"}</td>
                      <td style={s.td}>{formatDate(eway.created_at)}</td>
                      <td style={s.td}>
                        <button
                          onClick={() => alert("The E-Way Bill has been created through the SCM application by utilizing the official E-Way Bill portal API.")}
                          style={{ backgroundColor: "#059669", color: "#fff", padding: "5px 13px", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                        >
                          ✅
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── Proof image modal ── */}
      {showProofModal && (
        <div style={s.modal} onClick={() => setShowProofModal(false)}>
          <img src={selectedProof} alt="Delivery Proof" style={s.modalImg} />
        </div>
      )}
    </div>
  );
}