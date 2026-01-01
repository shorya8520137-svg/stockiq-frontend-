"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import styles from "./inventory.module.css";
import { api } from "../../utils/api";

import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "../../components/ui/table";

import ProductTracker from "./ProductTracker";

const PAGE_SIZE = 12;

/**
 * ✅ SOURCE OF TRUTH
 * key = warehouse_code
 * value = display name
 */
const WAREHOUSES = [
    { code: "GGM_WH", name: "Gurgaon Warehouse" },
    { code: "BLR_WH", name: "Bangalore Warehouse" },
    { code: "MUM_WH", name: "Mumbai Warehouse" },
    { code: "AMD_WH", name: "Ahmedabad Warehouse" },
    { code: "HYD_WH", name: "Hyderabad Warehouse" },
];

export default function InventorySheet() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const [page, setPage] = useState(1);
    const [activeWarehouse, setActiveWarehouse] = useState(WAREHOUSES[0]);

    const [openTracker, setOpenTracker] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Export functionality state
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [selectedWarehouses, setSelectedWarehouses] = useState(WAREHOUSES.map(w => w.code));
    const [exporting, setExporting] = useState(false);

    /* ================= LOAD INVENTORY ================= */
    useEffect(() => {
        let ignore = false;
        setLoading(true);

        api(
            `/api/inventory/by-warehouse?warehouse=${activeWarehouse.code}`
        )
            .then((data) => {
                if (ignore) return;
                setItems(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => {
                if (ignore) return;
                setItems([]);
                setLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [activeWarehouse]);

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

    /* ================= SEARCH FUNCTIONALITY ================= */
    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        
        if (query.trim().length > 0) {
            // Filter items based on search query
            const filtered = items.filter(item => 
                item.product.toLowerCase().includes(query.toLowerCase()) ||
                (item.barcode && item.barcode.toLowerCase().includes(query.toLowerCase()))
            );
            setSuggestions(filtered.slice(0, 5)); // Show max 5 suggestions
            setShowSuggestions(true);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (item) => {
        setSearchQuery(item.product);
        setShowSuggestions(false);
        setSelectedProduct(item);
        setOpenTracker(true);
    };

    /* ================= FILTERED ITEMS ================= */
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items;
        
        return items.filter(item => 
            item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.barcode && item.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [items, searchQuery]);

    /* ================= EXPORT FUNCTIONALITY ================= */
    const handleWarehouseToggle = (warehouseCode) => {
        setSelectedWarehouses(prev => {
            if (prev.includes(warehouseCode)) {
                return prev.filter(code => code !== warehouseCode);
            } else {
                return [...prev, warehouseCode];
            }
        });
    };

    const selectAllWarehouses = () => {
        setSelectedWarehouses(WAREHOUSES.map(w => w.code));
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
            // Fetch data for selected warehouses
            const allData = [];
            
            for (const warehouseCode of selectedWarehouses) {
                try {
                    const data = await api(`/api/inventory/by-warehouse?warehouse=${warehouseCode}`);
                    if (Array.isArray(data)) {
                        allData.push(...data);
                    }
                } catch (error) {
                    console.error(`Failed to fetch data for warehouse ${warehouseCode}:`, error);
                }
            }

            if (allData.length === 0) {
                alert("No data found for selected warehouses");
                return;
            }

            // Create CSV content
            const headers = ["Product", "Barcode", "Stock", "Warehouse"];
            const csvContent = [
                headers.join(","),
                ...allData.map(item => [
                    `"${item.product || ""}"`,
                    `"${item.barcode || ""}"`,
                    item.stock || 0,
                    `"${item.warehouse || ""}"`
                ].join(","))
            ].join("\n");

            // Create and download file
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            
            const warehouseNames = selectedWarehouses.map(code => 
                WAREHOUSES.find(w => w.code === code)?.name || code
            ).join("_");
            
            const fileName = selectedWarehouses.length === WAREHOUSES.length 
                ? `inventory_all_warehouses_${new Date().toISOString().split('T')[0]}.csv`
                : `inventory_${warehouseNames}_${new Date().toISOString().split('T')[0]}.csv`;
                
            link.setAttribute("download", fileName);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setShowExportDropdown(false);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Export failed. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    /* ================= PAGINATION ================= */
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
    const paginated = filteredItems.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE
    );

    return (
        <div className={styles.container}>
            {/* SEARCH BAR */}
            <div className={styles.searchSection}>
                <div className={styles.searchWrapper}>
                    <input
                        type="text"
                        placeholder="Search products by name or barcode..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className={styles.searchInput}
                        onFocus={() => {
                            if (suggestions.length > 0) {
                                setShowSuggestions(true);
                            }
                        }}
                        onBlur={() => {
                            // Delay hiding suggestions to allow clicks
                            setTimeout(() => setShowSuggestions(false), 200);
                        }}
                    />
                    
                    {/* Clear Search Button */}
                    {searchQuery && (
                        <button
                            className={styles.clearSearch}
                            onClick={() => {
                                setSearchQuery("");
                                setShowSuggestions(false);
                                setPage(1);
                            }}
                        >
                            ✕
                        </button>
                    )}
                    
                    {/* Search Suggestions */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className={styles.suggestionList}>
                            {suggestions.map((item, index) => (
                                <div
                                    key={`${item.barcode || item.product}-${index}`}
                                    className={styles.suggestionItem}
                                    onClick={() => handleSuggestionClick(item)}
                                >
                                    <div className={styles.suggestionContent}>
                                        <div className={styles.suggestionTitle}>{item.product}</div>
                                        <div className={styles.suggestionMeta}>
                                            {item.barcode && <span>Barcode: {item.barcode}</span>}
                                            <span>Stock: {item.stock}</span>
                                            <span>{item.warehouse}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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
                                    <h4>Export Inventory Data</h4>
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
                                        {WAREHOUSES.map((warehouse) => (
                                            <label
                                                key={warehouse.code}
                                                className={styles.warehouseCheckbox}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedWarehouses.includes(warehouse.code)}
                                                    onChange={() => handleWarehouseToggle(warehouse.code)}
                                                />
                                                <span className={styles.checkboxLabel}>
                                                    {warehouse.name}
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
            </div>

            {/* WAREHOUSE FILTER */}
            <div className={styles.filterBar}>
                <div className={styles.warehouseChips}>
                    {WAREHOUSES.map((w, index) => (
                        <motion.button
                            key={w.code}
                            className={`${styles.chip} ${
                                w.code === activeWarehouse.code ? styles.activeChip : ""
                            }`}
                            onClick={() => {
                                setActiveWarehouse(w);
                                setPage(1);
                                setSearchQuery(""); // Clear search when changing warehouse
                                setShowSuggestions(false);
                            }}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {w.name}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* TABLE */}
            <motion.div 
                className={styles.tableCard}
                key={activeWarehouse.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className={styles.tableWrapper}>
                    <Table className={styles.table}>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Stock</TableHead>
                                <TableHead>Warehouse</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {!loading &&
                                paginated.map((item, i) => (
                                    <motion.tr
                                        key={`${item.barcode || item.product}-${i}`}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ 
                                            duration: 0.3, 
                                            delay: i * 0.03,
                                            ease: [0.16, 1, 0.3, 1]
                                        }}
                                        className={styles.tableRow}
                                    >
                                        <TableCell>{item.product}</TableCell>

                                        <TableCell>
                                            <motion.button
                                                className={styles.stockBtn}
                                                onClick={() => {
                                                    setSelectedProduct(item);
                                                    setOpenTracker(true);
                                                }}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                {item.stock}
                                            </motion.button>
                                        </TableCell>

                                        <TableCell>
                      <span className={styles.warehouseTag}>
                        {item.warehouse}
                      </span>
                                        </TableCell>
                                    </motion.tr>
                                ))}

                            {loading && (
                                <TableRow>
                                    <TableCell colSpan={3} className={styles.loading}>
                                        Loading inventory…
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </motion.div>

            {/* PAGINATION */}
            <div className={styles.pagination}>
                <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                >
                    Prev
                </button>
                <span>
          {page} / {totalPages}
        </span>
                <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                >
                    Next
                </button>
            </div>

            {/* PRODUCT TRACKER (TIMELINE) */}
            {openTracker && selectedProduct && (
                <ProductTracker
                    barcodeOverride={selectedProduct.barcode}
                    warehouseFilter={activeWarehouse.code}
                    onClose={() => setOpenTracker(false)}
                />
            )}
        </div>
    );
}
