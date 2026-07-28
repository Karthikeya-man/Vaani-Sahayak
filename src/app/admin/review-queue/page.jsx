"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { IoArrowBack, IoCheckmarkCircle, IoAlertCircle, IoRefresh, IoPersonOutline, IoLocationOutline, IoCallOutline } from "react-icons/io5";

export default function ReviewQueuePage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedItem, setSelectedItem] = useState(null);
    const [officerName, setOfficerName] = useState("Dr. K. Sharma (KVK)");
    const [correctedAnswer, setCorrectedAnswer] = useState("");
    const [actionType, setActionType] = useState("override");
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const fetchQueue = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/admin/review-queue");
            if (!res.ok) throw new Error("Failed to load review queue");
            const data = await res.json();
            setItems(data.items || []);
            if (data.items && data.items.length > 0 && !selectedItem) {
                setSelectedItem(data.items[0]);
                setCorrectedAnswer(data.items[0].ai_guess || "");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    const handleSelect = (item) => {
        setSelectedItem(item);
        setCorrectedAnswer(item.ai_guess || "");
        setSuccessMessage("");
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!selectedItem || !correctedAnswer.trim()) return;

        setSubmitting(true);
        setSuccessMessage("");
        try {
            const res = await fetch("/api/admin/review-queue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reviewId: selectedItem.review_id,
                    action: actionType,
                    correctedAnswer: correctedAnswer.trim(),
                    officerName: officerName.trim()
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to submit review");

            setSuccessMessage(`✅ Resolution submitted! Farmer ${data.notifyResult?.farmerId ? "notified" : ""} with officer's response.`);
            fetchQueue();
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif", color: "#1e293b", padding: "2rem" }}>
            {/* Header */}
            <div style={{ maxWidth: "1200px", margin: "0 auto 2rem auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <Link href="/admin" style={{ color: "#10b981", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                        <IoArrowBack size={18} /> Back to Admin Portal
                    </Link>
                    <h1 style={{ fontSize: "1.8rem", fontWeight: "700", margin: 0, color: "#0f172a" }}>🌾 Agricultural Officer Review Queue</h1>
                    <p style={{ margin: "0.25rem 0 0 0", color: "#64748b" }}>Human-in-the-loop escalation panel for low-confidence disease scans & failed scheme applications</p>
                </div>
                <button onClick={fetchQueue} style={{ background: "#ffffff", border: "1px solid #cbd5e1", padding: "0.6rem 1.2rem", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "600" }}>
                    <IoRefresh size={18} /> Refresh Queue
                </button>
            </div>

            <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "2rem" }}>
                
                {/* Left Panel: Review Queue List */}
                <div style={{ background: "#ffffff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Pending Escalations</span>
                        <span style={{ background: "#f1f5f9", padding: "0.2rem 0.6rem", borderRadius: "12px", fontSize: "0.85rem", color: "#475569" }}>{items.length} items</span>
                    </h2>

                    {loading ? (
                        <p style={{ color: "#64748b" }}>Loading queue items...</p>
                    ) : error ? (
                        <p style={{ color: "#ef4444" }}>{error}</p>
                    ) : items.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
                            <IoCheckmarkCircle size={48} color="#10b981" />
                            <p style={{ marginTop: "1rem", fontWeight: "600" }}>Queue is empty!</p>
                            <p style={{ fontSize: "0.9rem" }}>No low-confidence scans or form errors pending review.</p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {items.map((item) => {
                                const isSelected = selectedItem?.review_id === item.review_id;
                                const isPending = item.review_status === "pending";
                                return (
                                    <div
                                        key={item.review_id}
                                        onClick={() => handleSelect(item)}
                                        style={{
                                            padding: "1rem",
                                            borderRadius: "10px",
                                            border: isSelected ? "2px solid #10b981" : "1px solid #e2e8f0",
                                            background: isSelected ? "#f0fdf4" : "#ffffff",
                                            cursor: "pointer",
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                            <span style={{
                                                fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", padding: "0.2rem 0.5rem", borderRadius: "4px",
                                                background: item.type === "scan" ? "#fef3c7" : "#e0e7ff",
                                                color: item.type === "scan" ? "#b45309" : "#4338ca"
                                            }}>
                                                {item.type === "scan" ? "Crop Scan" : "Scheme Application"}
                                            </span>
                                            <span style={{
                                                fontSize: "0.75rem", fontWeight: "600",
                                                color: isPending ? "#f59e0b" : "#10b981"
                                            }}>
                                                ● {item.review_status}
                                            </span>
                                        </div>
                                        <div style={{ fontWeight: "600", fontSize: "0.95rem", color: "#0f172a" }}>{item.farmer_name} ({item.farmer_district})</div>
                                        <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.25rem" }}>AI Guess: {item.ai_guess || "N/A"}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Panel: Resolution Form & Details */}
                <div style={{ background: "#ffffff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    {selectedItem ? (
                        <form onSubmit={handleSubmitReview}>
                            <h2 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "1rem" }}>
                                Review Escalation #{selectedItem.review_id.substring(0, 8)}
                            </h2>

                            {/* Farmer Info Card */}
                            <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", border: "1px solid #e2e8f0" }}>
                                <div style={{ fontWeight: "600", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <IoPersonOutline /> {selectedItem.farmer_name}
                                </div>
                                <div style={{ fontSize: "0.85rem", color: "#475569", display: "flex", gap: "1.5rem" }}>
                                    <span><IoCallOutline /> {selectedItem.farmer_phone}</span>
                                    <span><IoLocationOutline /> {selectedItem.farmer_district}, {selectedItem.farmer_state}</span>
                                    <span>Language: <b>{selectedItem.farmer_language.toUpperCase()}</b></span>
                                </div>
                            </div>

                            {/* Escalated Item Details */}
                            {selectedItem.type === "scan" && (
                                <div style={{ marginBottom: "1.5rem" }}>
                                    <h4 style={{ margin: "0 0 0.5rem 0", color: "#334155" }}>Escalated Crop Scan Photo</h4>
                                    {selectedItem.image_url ? (
                                        <img src={selectedItem.image_url} alt="Crop Scan" style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                                    ) : (
                                        <div style={{ padding: "2rem", background: "#f1f5f9", textAlign: "center", borderRadius: "8px", color: "#64748b" }}>Photo uploaded by farmer</div>
                                    )}
                                    <div style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
                                        <div><b>AI Crop:</b> {selectedItem.scan_crop || "Cotton"}</div>
                                        <div><b>AI Initial Guess:</b> {selectedItem.ai_guess}</div>
                                        <div><b>AI Confidence Score:</b> {selectedItem.scan_confidence ? `${Math.round(selectedItem.scan_confidence * 100)}%` : "N/A"}</div>
                                    </div>
                                </div>
                            )}

                            {selectedItem.type === "scheme" && (
                                <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
                                    <h4 style={{ margin: "0 0 0.5rem 0", color: "#991b1b" }}><IoAlertCircle /> Scheme Application Failure</h4>
                                    <div><b>Scheme:</b> {selectedItem.scheme_title || "Govt Scheme"}</div>
                                    <div><b>Failure Reason:</b> {selectedItem.scheme_error_reason || "Playwright form filling failed (CAPTCHA / field mismatch)"}</div>
                                </div>
                            )}

                            {/* Officer Resolution Controls */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem" }}>
                                <div>
                                    <label style={{ display: "block", fontWeight: "600", fontSize: "0.9rem", marginBottom: "0.3rem" }}>Assigned Officer Name</label>
                                    <input
                                        type="text"
                                        value={officerName}
                                        onChange={(e) => setOfficerName(e.target.value)}
                                        style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                        required
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", fontWeight: "600", fontSize: "0.9rem", marginBottom: "0.3rem" }}>Review Action</label>
                                    <select
                                        value={actionType}
                                        onChange={(e) => setActionType(e.target.value)}
                                        style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                    >
                                        <option value="override">Override AI Diagnosis & Provide Corrected Treatment</option>
                                        <option value="approve">Approve AI Diagnosis & Confirm Dosage</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: "block", fontWeight: "600", fontSize: "0.9rem", marginBottom: "0.3rem" }}>
                                        Officer Corrected Recommendation / Dosage
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={correctedAnswer}
                                        onChange={(e) => setCorrectedAnswer(e.target.value)}
                                        placeholder="Enter the official agricultural officer treatment recommendation, dosage, or instructions..."
                                        style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontFamily: "inherit" }}
                                        required
                                    />
                                </div>

                                {successMessage && (
                                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "0.75rem", borderRadius: "6px", fontSize: "0.9rem" }}>
                                        {successMessage}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        background: "#10b981", color: "#ffffff", border: "none", padding: "0.8rem", borderRadius: "8px", fontWeight: "700", cursor: "pointer",
                                        opacity: submitting ? 0.7 : 1, marginTop: "0.5rem"
                                    }}
                                >
                                    {submitting ? "Submitting & Dispatched to Farmer..." : "Submit Resolution & Notify Farmer"}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#94a3b8" }}>
                            Select an item from the left queue to review and submit resolution.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
