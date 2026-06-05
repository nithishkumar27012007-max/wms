import { useEffect, useState } from "react";

export default function ExpiryAlertPopup() {

    const [alerts, setAlerts] = useState([]);
    const [show, setShow] = useState(false);

    useEffect(() => {
        fetch("https://expand-best-therapist-surgeon.trycloudflare.com/expiry-alerts")
            .then(res => res.json())
            .then(data => {
                if (data.length > 0) {
                    setAlerts(data);
                    setShow(true);

                    // 🔊 sound
                    const audio = new Audio("/alert.mp3");
                    audio.play().catch(() => {});

                    // 🔒 disable scroll
                    document.body.style.overflow = "hidden";
                }
            })
            .catch(err => console.error(err));

        // cleanup
        return () => {
            document.body.style.overflow = "auto";
        };
    }, []);

    const handleClose = () => {
        setShow(false);
        document.body.style.overflow = "auto"; // ✅ enable scroll again
    };

    if (!show) return null;

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",

            // 🔥 blur + dark overlay
            backdropFilter: "blur(6px)",
            background: "rgba(0,0,0,0.3)",

            display: "flex",
            justifyContent: "center",
            alignItems: "center",

            zIndex: 99999
        }}>

            {/* POPUP */}
            <div style={{
                width: "380px",
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                padding: "20px"
            }}>

                <h4 style={{ marginBottom: "10px" }}>⚠️ Expiry Alerts</h4>

                <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                    {alerts.map((a, i) => (
                        <div key={i} style={{
                            padding: "10px",
                            marginBottom: "8px",
                            borderRadius: "6px",
                            fontSize: "14px",
                            background:
                                a.level === "EXPIRED" ? "#ffe5e5" :
                                a.level === "CRITICAL" ? "#fff3cd" :
                                "#e7f3ff"
                        }}>
                            <strong>{a.product}</strong> ({a.batch}) <br />
                            Exp: {a.expiry} <br />
                            Days Left: {a.days_left} <br />
                            Qty: {a.qty}
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleClose}
                    style={{
                        marginTop: "12px",
                        width: "100%",
                        padding: "10px",
                        border: "none",
                        background: "#111",
                        color: "white",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "600"
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    );
}