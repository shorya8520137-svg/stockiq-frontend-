"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./order.module.css";
import { api } from "../../utils/api";
import ChatUI from "./chatui";

import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
} from "../../components/ui/alert-dialog";

const PAGE_SIZE = 12;

export default function OrderSheet() {
    const [orders, setOrders] = useState([]);
    const [tokens, setTokens] = useState([]);
    const [input, setInput] = useState("");
    const [page, setPage] = useState(1);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggest, setShowSuggest] = useState(false);
    const [checkedId, setCheckedId] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    
    // Remarks editing state
    const [editingRemark, setEditingRemark] = useState(null);
    const [remarkValues, setRemarkValues] = useState({});
    const [savingRemark, setSavingRemark] = useState(null);

    // Export functionality state
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [selectedWarehouses, setSelectedWarehouses] = useState([]);
    const [exporting, setExporting] = useState(false);

    const searchRef = useRef(null);

    const fetchOrders = async (tokenList = []) => {
        const res = await api("/api/ordersheet-universal-search", "POST", {
            tokens: tokenList,
        });
        setOrders(Array.isArray(res) ? res : []);
        setPage(1);
        setCheckedId(null);
    };

    useEffect(() => {
        fetchOrders([]);
    }, []);

    // Get unique warehouses from orders and initialize selection
    useEffect(() => {
        const uniqueWarehouses = [...new Set(orders.map(order => order.warehouse).filter(Boolean))];
        if (uniqueWarehouses.length > 0 && selectedWarehouses.length === 0) {
            setSelectedWarehouses(uniqueWarehouses);
        }
    }, [orders, selectedWarehouses.length]);

    useEffect(() => {
        if (!input.trim()) {
            setSuggestions([]);
            setShowSuggest(false);
            return;
        }

        const t = setTimeout(async () => {
            try {
                const res = await api(
                    `/api/ordersheet-suggest?query=${encodeURIComponent(input)}`,
                    "GET"
                );
                setSuggestions(Array.isArray(res) ? res : []);
                setShowSuggest(true);
            } catch {
                setShowSuggest(false);
            }
        }, 250);

        return () => clearTimeout(t);
    }, [input]);

    const addToken = (v) => {
        const val = v.trim().toLowerCase();
        if (!val || tokens.includes(val)) return;
        const updated = [...tokens, val];
        setTokens(updated);
        setInput("");
        setShowSuggest(false);
        fetchOrders(updated);
    };

    const removeToken = (t) => {
        const updated = tokens.filter((x) => x !== t);
        setTokens(updated);
        fetchOrders(updated);
    };

    // Remarks handling functions
    const handleRemarkEdit = (orderId, currentRemark) => {
        setEditingRemark(orderId);
        setRemarkValues(prev => ({
            ...prev,
            [orderId]: currentRemark || ""
        }));
    };

    const handleRemarkChange = (orderId, value) => {
        setRemarkValues(prev => ({
            ...prev,
            [orderId]: value
        }));
    };

    const saveRemark = async (orderId) => {
        const remarkText = remarkValues[orderId] || "";
        setSavingRemark(orderId);
        
        try {
            await api(`/api/orders/update-remark`, "POST", {
                orderId: orderId,
                remark: remarkText
            });
            
            // Update local state
            setOrders(prev => prev.map(order => 
                order.id === orderId 
                    ? { ...order, remark: remarkText }
                    : order
            ));
            
            setSuccessMsg("Remark updated successfully");
            setTimeout(() => setSuccessMsg(""), 2000);
        } catch (error) {
            console.error("Failed to save remark:", error);
            setSuccessMsg("Failed to update remark");
            setTimeout(() => setSuccessMsg(""), 2000);
        } finally {
            setSavingRemark(null);
            setEditingRemark(null);
        }
    };

    const cancelRemarkEdit = () => {
        setEditingRemark(null);
        setRemarkValues({});
    };

    // Parse and highlight mentions and hashtags
    const parseRemarkText = (text) => {
        if (!text) return "";
        
        return text
            .split(/(\s+)/)
            .map((part, index) => {
                // Handle mentions (@username)
                if (part.match(/^@\w+/)) {
                    return `<span class="${styles.mention}" key="${index}">${part}</span>`;
                }
                // Handle hashtags (#tag)
                if (part.match(/^#\w+/)) {
                    return `<span class="${styles.hashtag}" key="${index}">${part}</span>`;
                }
                return part;
            })
            .join('');
    };

    /* ================= EXPORT FUNCTIONALITY ================= */
    const getUniqueWarehouses = () => {
        return [...new Set(orders.map(order => order.warehouse).filter(Boolean))];
    };

    const handleWarehouseToggle = (warehouse) => {
        setSelectedWarehouses(prev => {
            if (prev.includes(warehouse)) {
                return prev.filter(w => w !== warehouse);
            } else {
                return [...prev, warehouse];
            }
        });
    };

    const selectAllWarehouses = () => {
        setSelectedWarehouses(getUniqueWarehouses());
    };

    const deselectAllWarehouses = () => {
        setSelectedWarehouses([]);
    };

    const exportToCSV = async () => {
        if (selectedWarehouses.length === 0) {
            alert("Please select at least one warehouse to export");
            return;
        }

        setExporting(true);
        try {
            // Filter orders by selected warehouses and current filters
            const exportData = filteredOrders.filter(order => 
                selectedWarehouses.includes(order.warehouse)
            );

            if (exportData.length === 0) {
                alert("No orders found for selected warehouses and current filters");
                return;
            }

            // Create CSV content with all order fields
            const headers = [
                "Customer", "Product", "Quantity", "Dimensions", "AWB", "Order Ref", 
                "Warehouse", "Status", "Payment Mode", "Amount", "Date", "Remarks"
            ];
            
            const csvContent = [
                headers.join(","),
                ...exportData.map(order => [
                    `"${order.customer || ""}"`,
                    `"${order.product_name || ""}"`,
                    order.quantity || order.qty || 1,
                    `"${order.dimensions || (order.length && order.width && order.height 
                        ? `${order.length}×${order.width}×${order.height}` 
                        : "N/A")}"`,
                    `"${order.awb || ""}"`,
                    `"${order.order_ref || ""}"`,
                    `"${order.warehouse || ""}"`,
                    `"${order.status || ""}"`,
                    `"${order.payment_mode || ""}"`,
                    order.invoice_amount || 0,
                    `"${order.timestamp ? new Date(order.timestamp).toLocaleDateString() : ""}"`,
                    `"${order.remark || ""}"`
                ].join(","))
            ].join("\n");

            // Create and download file
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            
            const warehouseNames = selectedWarehouses.join("_");
            const fileName = selectedWarehouses.length === getUniqueWarehouses().length 
                ? `orders_all_warehouses_${new Date().toISOString().split('T')[0]}.csv`
                : `orders_${warehouseNames}_${new Date().toISOString().split('T')[0]}.csv`;
                
            link.setAttribute("download", fileName);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setShowExportDropdown(false);
            setSuccessMsg(`Exported ${exportData.length} orders successfully`);
            setTimeout(() => setSuccessMsg(""), 3000);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Export failed. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    /* ================= CLOSE EXPORT DROPDOWN ON OUTSIDE CLICK ================= */
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showExportDropdown && !event.target.closest(`.${styles.exportDropdown}`)) {
                setShowExportDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showExportDropdown]);

    const filteredOrders = useMemo(() => {
        return orders.filter((o) => {
            if (!o.timestamp) return true;
            const d = new Date(o.timestamp);
            if (fromDate && d < new Date(fromDate)) return false;
            if (toDate && d > new Date(toDate)) return false;
            return true;
        });
    }, [orders, fromDate, toDate]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredOrders.length / PAGE_SIZE)
    );

    const paginatedOrders = filteredOrders.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE
    );

    return (
        <div className={styles.container}>
            {deleting && (
                <div className={styles.centerLoader}>
                    <div className={styles.spinner} />
                </div>
            )}

            {successMsg && (
                <div className={styles.successToast}>{successMsg}</div>
            )}

            <header className={styles.header}>
                <div className={styles.titleWrapper}>
                    <h1 className={styles.title}>Orders</h1>
                    <div className={styles.stats}>
                        {filteredOrders.length} records <kbd className={styles.kbd}>/</kbd> Search
                    </div>
                </div>
                
                {/* Export Button */}
                <div className={styles.exportSection}>
                    <div className={styles.exportDropdown}>
                        <button
                            className={styles.exportBtn}
                            onClick={() => setShowExportDropdown(!showExportDropdown)}
                            disabled={exporting}
                        >
                            {exporting ? "Exporting..." : "📊 Export"}
                        </button>
                        
                        {showExportDropdown && (
                            <div className={styles.exportPanel}>
                                <div className={styles.exportHeader}>
                                    <h4>Export Order Data</h4>
                                    <button
                                        className={styles.closeExport}
                                        onClick={() => setShowExportDropdown(false)}
                                    >
                                        ✕
                                    </button>
                                </div>
                                
                                <div className={styles.warehouseSelection}>
                                    <div className={styles.selectionActions}>
                                        <button
                                            className={styles.selectAllBtn}
                                            onClick={selectAllWarehouses}
                                        >
                                            Select All
                                        </button>
                                        <button
                                            className={styles.deselectAllBtn}
                                            onClick={deselectAllWarehouses}
                                        >
                                            Deselect All
                                        </button>
                                    </div>
                                    
                                    <div className={styles.warehouseList}>
                                        {getUniqueWarehouses().map((warehouse) => (
                                            <label
                                                key={warehouse}
                                                className={styles.warehouseCheckbox}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedWarehouses.includes(warehouse)}
                                                    onChange={() => handleWarehouseToggle(warehouse)}
                                                />
                                                <span className={styles.checkboxLabel}>
                                                    {warehouse}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className={styles.exportActions}>
                                    <div className={styles.exportInfo}>
                                        {selectedWarehouses.length} warehouse(s) selected
                                    </div>
                                    <button
                                        className={styles.downloadBtn}
                                        onClick={exportToCSV}
                                        disabled={selectedWarehouses.length === 0 || exporting}
                                    >
                                        {exporting ? "Preparing..." : "Download CSV"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className={styles.filterBar}>
                <div className={styles.searchWrapper} ref={searchRef}>
                    {tokens.map((t, i) => (
                        <span key={i} className={styles.chip} tabIndex={0}>
                            {t}
                            <button
                                onClick={() => removeToken(t)}
                                className={styles.chipClose}
                                tabIndex={-1}
                            >
                                ×
                            </button>
                        </span>
                    ))}

                    <input
                        className={styles.searchInput}
                        placeholder="Search orders (Press / to focus)"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") addToken(input);
                        }}
                    />

                    {showSuggest && suggestions.length > 0 && (
                        <ul className={styles.suggestionList} role="listbox">
                            {suggestions.map((s, i) => (
                                <li
                                    key={i}
                                    role="option"
                                    onMouseDown={() => addToken(s)}
                                    className={styles.suggestionItem}
                                    tabIndex={0}
                                >
                                    {s}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className={styles.dateFilter}>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className={styles.dateInput}
                    />
                    <span className={styles.dateArrow}>→</span>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className={styles.dateInput}
                    />
                </div>
            </div>

            <motion.div 
                className={styles.tableContainer}
                key={`${fromDate}-${toDate}-${tokens.join(',')}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className={styles.tableCard}>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                            <tr>
                                <th className={`${styles.th} ${styles.delCol}`}>Del</th>
                                <th className={`${styles.th} ${styles.customerCol}`}>Customer</th>
                                <th className={styles.th}>Product</th>
                                <th className={styles.th}>Qty</th>
                                <th className={styles.th}>Dimensions</th>
                                <th className={styles.th}>AWB</th>
                                <th className={styles.th}>Order Ref</th>
                                <th className={styles.th}>Warehouse</th>
                                <th className={styles.th}>Status</th>
                                <th className={styles.th}>Payment</th>
                                <th className={styles.th}>Amount</th>
                                <th className={styles.th}>Remarks</th>
                                <th className={styles.th}>Date</th>
                            </tr>
                            </thead>
                            <tbody>
                            <AnimatePresence mode="popLayout">
                            {paginatedOrders.map((o, i) => (
                                <motion.tr 
                                    key={o.id} 
                                    className={styles.tr}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ 
                                        duration: 0.3, 
                                        delay: i * 0.02,
                                        ease: [0.16, 1, 0.3, 1]
                                    }}
                                >
                                    <td className={`${styles.td} ${styles.delCol}`}>
                                        <AlertDialog
                                            open={checkedId === o.id}
                                            onOpenChange={(open) =>
                                                setCheckedId(open ? o.id : null)
                                            }
                                        >
                                            <AlertDialogTrigger asChild>
                                                <input
                                                    type="checkbox"
                                                    checked={checkedId === o.id}
                                                    onChange={() =>
                                                        setCheckedId(o.id)
                                                    }
                                                    className={styles.checkbox}
                                                />
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete order?</AlertDialogTitle>
                                                    <AlertDialogDescription>{o.product_name}</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={async () => {
                                                            setDeleting(true);
                                                            setCheckedId(null);
                                                            await api(`/api/orders/delete/${o.warehouse}/${o.id}`, "DELETE");
                                                            setSuccessMsg("Order deleted");
                                                            await fetchOrders(tokens);
                                                            setTimeout(() => {
                                                                setDeleting(false);
                                                                setSuccessMsg("");
                                                            }, 2000);
                                                        }}
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </td>
                                    <td className={`${styles.td} ${styles.customerCol}`}>
                                        <div className={styles.cellContent}>{o.customer}</div>
                                    </td>
                                    <td className={styles.td}><div className={styles.cellContent}>{o.product_name}</div></td>
                                    <td className={styles.td}>
                                        <div className={styles.qtyBadge}>{o.quantity || o.qty || 1}</div>
                                    </td>
                                    <td className={styles.td}>
                                        <div className={styles.dimensionsBadge}>
                                            {o.dimensions || o.length && o.width && o.height 
                                                ? `${o.length || 0}×${o.width || 0}×${o.height || 0}` 
                                                : "N/A"}
                                        </div>
                                    </td>
                                    <td className={styles.td}><div className={styles.cellContent}>{o.awb}</div></td>
                                    <td className={styles.td}><div className={styles.cellContent}>{o.order_ref}</div></td>
                                    <td className={styles.td}>
                                        <span className={styles.warehouseTag}>{o.warehouse}</span>
                                    </td>
                                    <td className={styles.td}>
                                        <span className={styles.statusTag}>{o.status}</span>
                                    </td>
                                    <td className={styles.td}><div className={styles.cellContent}>{o.payment_mode}</div></td>
                                    <td className={styles.td}>
                                        <div className={styles.amount}>₹{o.invoice_amount}</div>
                                    </td>
                                    <td className={`${styles.td} ${styles.remarkCell}`}>
                                        {editingRemark === o.id ? (
                                            <div className={styles.remarkEditor}>
                                                <textarea
                                                    value={remarkValues[o.id] || ""}
                                                    onChange={(e) => handleRemarkChange(o.id, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && e.ctrlKey) {
                                                            e.preventDefault();
                                                            saveRemark(o.id);
                                                        }
                                                        if (e.key === "Escape") {
                                                            e.preventDefault();
                                                            cancelRemarkEdit();
                                                        }
                                                    }}
                                                    placeholder="Add remark... Use @username for mentions, #tag for hashtags (Ctrl+Enter to save, Esc to cancel)"
                                                    className={styles.remarkInput}
                                                    rows={2}
                                                    autoFocus
                                                />
                                                <div className={styles.remarkActions}>
                                                    <button
                                                        onClick={() => saveRemark(o.id)}
                                                        disabled={savingRemark === o.id}
                                                        className={styles.saveBtn}
                                                    >
                                                        {savingRemark === o.id ? "..." : "Save"}
                                                    </button>
                                                    <button
                                                        onClick={cancelRemarkEdit}
                                                        className={styles.cancelBtn}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div 
                                                className={styles.remarkDisplay}
                                                onClick={() => handleRemarkEdit(o.id, o.remark)}
                                            >
                                                {o.remark ? (
                                                    <div 
                                                        className={styles.remarkText}
                                                        dangerouslySetInnerHTML={{ 
                                                            __html: parseRemarkText(o.remark) 
                                                        }}
                                                    />
                                                ) : (
                                                    <span className={styles.remarkPlaceholder}>
                                                        Click to add remark...
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className={styles.td}>
                                        <div className={styles.date}>{new Date(o.timestamp).toLocaleDateString()}</div>
                                    </td>
                                </motion.tr>
                            ))}
                            </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.div>

            <motion.div 
                className={styles.pagination}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                <motion.button
                    className={`${styles.pageBtn} ${page === 1 ? styles.disabled : ''}`}
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    whileHover={{ scale: page !== 1 ? 1.05 : 1 }}
                    whileTap={{ scale: page !== 1 ? 0.95 : 1 }}
                    transition={{ duration: 0.2 }}
                >
                    Prev
                </motion.button>
                <span className={styles.pageInfo}>{page} / {totalPages}</span>
                <motion.button
                    className={`${styles.pageBtn} ${page === totalPages ? styles.disabled : ''}`}
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === totalPages}
                    whileHover={{ scale: page !== totalPages ? 1.05 : 1 }}
                    whileTap={{ scale: page !== totalPages ? 0.95 : 1 }}
                    transition={{ duration: 0.2 }}
                >
                    Next
                </motion.button>
            </motion.div>

            <ChatUI />
        </div>
    );
}
