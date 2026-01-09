"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./productTracker.module.css";
import { api } from "../../utils/api";

/* ================= LABEL MAP ================= */
const LABELS = {
    OPENING: "Opening",
    BULK_UPLOAD: "Bulk Upload",
    DISPATCH: "Dispatch",
    SALE: "Dispatch",
    RETURN: "Return",
    DAMAGE: "Damage",
    RECOVER: "Recover",
    RECOVERY: "Recover",
    SELF_TRANSFER: "Transfer",
    ADJUSTMENT_IN: "Adjustment In",
};

export default function ProductTracker({
                                           barcodeOverride,
                                           warehouseFilter,
                                           onClose,
                                       }) {
    const barcode = barcodeOverride;

    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    /* 🔍 SEARCH */
    const [input, setInput] = useState("");
    const [tokens, setTokens] = useState([]);
    const [debouncedInput, setDebouncedInput] = useState("");

    /* 📅 DATE FILTER */
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const [summary, setSummary] = useState({
        opening: 0,
        bulkUpload: 0,
        dispatch: 0,
        damage: 0,
        returns: 0,
        recovery: 0,
        selfTransferIn: 0,
        selfTransferOut: 0,
        totalIn: 0,
        totalOut: 0,
        finalStock: 0,
    });

    /* 📜 SCROLL TRACKING */
    const [scrollPosition, setScrollPosition] = useState(0);
    const [visibleRowIndex, setVisibleRowIndex] = useState(null);
    const [tableWrapperRef, setTableWrapperRef] = useState(null);

    /* ================= FETCH DATA ================= */
    useEffect(() => {
        if (!barcode) {
            setLoading(false);
            return;
        }

        let mounted = true;
        document.body.style.overflow = "hidden";

        const fetchTracker = async () => {
            try {
                setLoading(true);
                setError("");

                // ✅ Updated to use new timeline API
                let url = `/timeline/${encodeURIComponent(barcode)}`;

                if (warehouseFilter && warehouseFilter !== "ALL") {
                    url += `?warehouse=${encodeURIComponent(warehouseFilter)}`;
                }

                const data = await api(url);
                if (!mounted) return;

                // Handle new timeline API response format from controller
                const timelineData = data.data?.timeline || [];
                const summaryData = data.data?.summary || {};
                const breakdown = summaryData.breakdown || {};

                if (!Array.isArray(timelineData)) {
                    throw new Error("Invalid API response");
                }

                // Timeline already has balance_after calculated by controller
                // Just format for display
                const formattedTimeline = timelineData.map((item, index) => ({
                    ...item,
                    timestamp: item.timestamp,
                    type: item.type,
                    quantity: item.quantity || 0,
                    warehouse: item.warehouse,
                    reference: item.reference,
                    direction: item.direction,
                    balance_after: item.balance_after || 0,
                    description: item.description || ''
                }));

                console.log('📊 Timeline entries:', formattedTimeline.length);
                console.log('📊 Summary from API:', summaryData);

                // Use summary directly from controller (already calculated correctly)
                const calculatedSummary = {
                    opening: breakdown.opening || 0,
                    bulkUpload: breakdown.bulk_upload || 0,
                    dispatch: breakdown.dispatch || 0,
                    damage: breakdown.damage || 0,
                    returns: breakdown.returns || 0,
                    recovery: breakdown.recovery || 0,
                    selfTransferIn: breakdown.self_transfer_in || 0,
                    selfTransferOut: breakdown.self_transfer_out || 0,
                    totalIn: summaryData.total_in || 0,
                    totalOut: summaryData.total_out || 0,
                    finalStock: summaryData.current_stock || 0,
                };

                console.log('📊 Calculated summary:', calculatedSummary);

                setSummary(calculatedSummary);
                setTimeline(formattedTimeline);
                setLoading(false);
            } catch (err) {
                if (mounted) {
                    console.error('Timeline fetch error:', err);
                    setError("Failed to load tracking data");
                    setLoading(false);
                }
            }
        };

        fetchTracker();

        return () => {
            mounted = false;
            document.body.style.overflow = "auto";
        };
    }, [barcode, warehouseFilter]);

    /* ================= DEBOUNCE SEARCH INPUT ================= */
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedInput(input);
        }, 300);

        return () => clearTimeout(timer);
    }, [input]);

    /* ================= SEARCH HANDLERS ================= */
    const addToken = (value) => {
        const v = value.trim().toLowerCase();
        if (!v) return;
        if (!tokens.includes(v)) setTokens([...tokens, v]);
        setInput("");
    };

    const removeToken = (t) => {
        setTokens(tokens.filter((x) => x !== t));
    };

    /* ================= FILTER TIMELINE ================= */
    const filteredTimeline = useMemo(() => {
        return timeline.filter((row) => {
            const text = `
        ${row.type}
        ${row.warehouse}
        ${row.reference}
      `.toLowerCase();

            const tokenMatch = tokens.every((t) => text.includes(t));

            const date = row.timestamp?.split("T")[0];
            const afterFrom = !fromDate || date >= fromDate;
            const beforeTo = !toDate || date <= toDate;

            return tokenMatch && afterFrom && beforeTo;
        });
    }, [timeline, tokens, fromDate, toDate]);

    /* ================= SCROLL TRACKING ================= */
    useEffect(() => {
        if (!tableWrapperRef || loading || filteredTimeline.length === 0) return;

        const handleScroll = () => {
            const container = tableWrapperRef;
            const scrollTop = container.scrollTop;
            const containerHeight = container.clientHeight;
            
            setScrollPosition(scrollTop);

            // Find the visible row at the top of the viewport
            const tbody = container.querySelector('tbody');
            if (!tbody) return;

            const rows = Array.from(tbody.querySelectorAll('tr'));
            const headerHeight = container.querySelector('thead')?.offsetHeight || 0;
            const threshold = scrollTop + headerHeight + 50; // 50px offset for better UX

            let visibleIndex = null;
            let accumulatedHeight = headerHeight;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowHeight = row.offsetHeight;
                accumulatedHeight += rowHeight;

                if (accumulatedHeight >= threshold) {
                    visibleIndex = i;
                    break;
                }
            }

            // If scrolled to top, show first row
            if (scrollTop < 50) {
                visibleIndex = 0;
            }

            // If scrolled to bottom, show last row
            if (scrollTop + containerHeight >= container.scrollHeight - 10) {
                visibleIndex = rows.length - 1;
            }

            setVisibleRowIndex(visibleIndex);
        };

        // Throttle scroll events for performance
        let ticking = false;
        const throttledScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };

        tableWrapperRef.addEventListener('scroll', throttledScroll, { passive: true });
        handleScroll(); // Initial call

        return () => {
            tableWrapperRef.removeEventListener('scroll', throttledScroll);
        };
    }, [tableWrapperRef, loading, filteredTimeline]);

    return (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={styles.modal}>
                <button className={styles.closeTopBtn} onClick={onClose}>
                    ✕
                </button>

                <div className={styles.modalContent}>
                    <h2 className={styles.header}>
                        Product Tracker — <span>{barcode}</span>
                    </h2>

                    {/* ================= SUMMARY ================= */}
                    {loading ? (
                        <div className={styles.skeletonSummary}>
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className={styles.skeletonCard} />
                            ))}
                        </div>
                    ) : (
                        <motion.div 
                            className={styles.breakdownBox}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            key={`summary-${filteredTimeline.length}`}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: 0.05 }}
                            >
                                Opening: <motion.strong
                                    key={summary.opening}
                                    initial={{ scale: 1.2 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                >{summary.opening}</motion.strong>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                            >
                                Bulk Upload: <motion.strong
                                    key={summary.bulkUpload}
                                    initial={{ scale: 1.2 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                >{summary.bulkUpload}</motion.strong>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: 0.15 }}
                            >
                                Dispatch: <motion.span
                                    key={summary.dispatch}
                                    initial={{ scale: 1.2 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                >{summary.dispatch}</motion.span>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: 0.2 }}
                            >
                                Damage: <motion.span
                                    key={summary.damage}
                                    initial={{ scale: 1.2 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                >{summary.damage}</motion.span>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: 0.25 }}
                            >
                                Return: <motion.span
                                    key={summary.returns}
                                    initial={{ scale: 1.2 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                >{summary.returns}</motion.span>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: 0.3 }}
                            >
                                Recover: <motion.span
                                    key={summary.recovery}
                                    initial={{ scale: 1.2 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                >{summary.recovery}</motion.span>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: 0.32 }}
                            >
                                Transfer In: <motion.span
                                    key={summary.selfTransferIn}
                                    initial={{ scale: 1.2 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                >{summary.selfTransferIn}</motion.span>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: 0.34 }}
                            >
                                Transfer Out: <motion.span
                                    key={summary.selfTransferOut}
                                    initial={{ scale: 1.2 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                >{summary.selfTransferOut}</motion.span>
                            </motion.div>
                            <motion.div 
                                className={styles.finalStock}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: 0.4 }}
                            >
                                Final Stock: <motion.strong
                                    key={summary.finalStock}
                                    initial={{ scale: 1.3, color: "#2563eb" }}
                                    animate={{ scale: 1, color: "#1d4ed8" }}
                                    transition={{ duration: 0.4 }}
                                >{summary.finalStock}</motion.strong>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* ================= FILTER BAR ================= */}
                    <div className={styles.filterBar}>
                        <div className={styles.searchWrapper}>
                            {tokens.map((t, i) => (
                                <span key={i} className={styles.chip}>
                    {t}
                                    <button onClick={() => removeToken(t)}>×</button>
                  </span>
                            ))}

                            <input
                                placeholder="Search type, warehouse, reference…"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addToken(input)}
                                disabled={loading}
                            />
                        </div>

                        <input
                            type="date"
                            className={styles.dateInput}
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            disabled={loading}
                        />
                        <input
                            type="date"
                            className={styles.dateInput}
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    {/* ================= TABLE ================= */}
                    <motion.div 
                        className={styles.tableWrapper}
                        ref={setTableWrapperRef}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                    >
                        <motion.table 
                            className={styles.logTable}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.3 }}
                        >
                            <thead>
                            <tr>
                                <th>Type</th>
                                <th>Qty</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Warehouse</th>
                                <th>Reference</th>
                                <th>Balance</th>
                            </tr>
                            </thead>

                            <motion.tbody
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.4 }}
                            >
                            {loading ? (
                                <>
                                    {[...Array(5)].map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan="7">
                                                <div className={styles.skeletonRow} />
                                            </td>
                                        </tr>
                                    ))}
                                </>
                            ) : error ? (
                                <tr>
                                    <td colSpan="7" className={styles.status}>
                                        <div className={styles.loadingSpinner}>
                                            <span>⚠️</span>
                                            <span>{error}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredTimeline.length === 0 ? (
                                <motion.tr
                                    key="no-results"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <td colSpan="7" className={styles.status}>
                                        No records found
                                    </td>
                                </motion.tr>
                            ) : (
                                <AnimatePresence mode="popLayout" initial={false}>
                                    {filteredTimeline.map((row, i) => {
                                        const [date, time] = row.timestamp.split("T");
                                        const isVisible = visibleRowIndex === i;
                                        const rowKey = `${row.timestamp}-${row.reference || i}-${row.type}`;
                                        
                                        return (
                                            <motion.tr
                                                key={rowKey}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ 
                                                    opacity: 1, 
                                                    x: 0
                                                }}
                                                exit={{ 
                                                    opacity: 0, 
                                                    x: 20
                                                }}
                                                transition={{
                                                    opacity: { duration: 0.2 },
                                                    x: { duration: 0.3, ease: "easeOut" }
                                                }}
                                                className={`${isVisible ? styles.activeRow : ''}`}
                                                data-row-index={i}
                                            >
                                                <td>
                                    <span
                                        className={`${styles.statusTag} ${
                                            styles[row.type]
                                        }`}
                                    >
                                      {LABELS[row.type] || row.type}
                                    </span>
                                                </td>
                                                <td>{row.quantity}</td>
                                                <td>{date}</td>
                                                <td>{time.slice(0, 8)}</td>
                                                <td>{row.warehouse}</td>
                                                <td>{row.reference || "—"}</td>
                                                <td className={row.balance_after < 0 ? styles.negativeBalance : ''}>{row.balance_after}</td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            )}
                            </motion.tbody>
                        </motion.table>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
