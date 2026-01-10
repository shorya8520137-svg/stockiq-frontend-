import { apiRequest } from './index';

export const bulkUploadAPI = {
    /**
     * Upload bulk inventory data using the specific endpoint
     * @param {Array} rows - Array of inventory items
     * @returns {Promise} Upload result with success/failed counts
     */
    async upload(rows) {
        return apiRequest('/bulk-upload', {
            method: 'POST',
            body: JSON.stringify({ rows })
        });
    },

    /**
     * Upload bulk inventory data with real-time progress tracking
     * @param {Array} rows - Array of inventory items
     * @param {Function} onProgress - Progress callback function
     * @returns {Promise} Upload result with success/failed counts
     */
    async uploadWithProgress(rows, onProgress) {
        const API_BASE_URL = API_CONFIG.BASE_URL;
        
        return new Promise((resolve, reject) => {
            const eventSource = new EventSource(`${API_BASE_URL}/bulk-upload/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ rows })
            });

            // For browsers that don't support POST with EventSource, use fetch with streaming
            fetch(`${API_BASE_URL}/bulk-upload/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ rows })
            }).then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                function readStream() {
                    return reader.read().then(({ done, value }) => {
                        if (done) {
                            return;
                        }

                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n');

                        lines.forEach(line => {
                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.slice(6));
                                    
                                    if (onProgress) {
                                        onProgress(data);
                                    }

                                    if (data.type === 'complete') {
                                        resolve({
                                            success: true,
                                            inserted: data.inserted,
                                            failed: data.failed,
                                            successRows: data.successRows,
                                            failedRows: data.failedRows
                                        });
                                        return;
                                    }

                                    if (data.type === 'error' && !data.row) {
                                        reject(new Error(data.message));
                                        return;
                                    }
                                } catch (e) {
                                    console.warn('Failed to parse SSE data:', line);
                                }
                            }
                        });

                        return readStream();
                    });
                }

                return readStream();
            }).catch(error => {
                reject(error);
            });
        });
    },

    /**
     * Get available warehouses for bulk upload
     * @returns {Promise} List of warehouses
     */
    async getWarehouses() {
        return apiRequest('/bulk-upload/warehouses');
    },

    /**
     * Get bulk upload history
     * @returns {Promise} Upload history records
     */
    async getHistory() {
        return apiRequest('/bulk-upload/history');
    },

    /**
     * Download CSV template for bulk upload
     * @returns {string} CSV template content
     */
    getCSVTemplate() {
        return [
            "barcode,product_name,variant,qty,unit_cost",
            "1382-335,BBD HH Ag 09,Size - 0-3m,10,25.50",
            "1383-335,,Size - 3-6m,5,15.00", 
            "235-499,HH_Bathtub Medium 351,,20,30.75",
            "2460-3499,,,8,12.00",
            "SAMPLE-001,,,0,0"
        ].join('\n');
    },

    /**
     * Parse CSV content to rows array
     * @param {string} csvContent - Raw CSV content
     * @param {string} warehouse - Selected warehouse code
     * @returns {Array} Parsed rows for upload
     */
    parseCSV(csvContent, warehouse) {
        const lines = csvContent.split('\n').filter(line => line.trim());
        if (lines.length === 0) return [];

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        console.log('CSV Headers found:', headers);
        
        return lines.slice(1).map((line, index) => {
            if (!line.trim()) return null; // Skip empty lines
            
            // Better CSV parsing - handle quoted fields and spaces
            const values = this.parseCSVLine(line);
            const row = { warehouse }; // Add warehouse to each row
            
            headers.forEach((header, headerIndex) => {
                const value = (values[headerIndex] || '').trim();
                
                // Map common header variations
                const normalizedHeader = this.normalizeHeader(header);
                
                // Convert specific fields to appropriate types
                if (normalizedHeader === 'qty' || normalizedHeader === 'quantity') {
                    // Handle various qty formats - FIXED parsing
                    if (value === '' || value === null || value === undefined) {
                        row.qty = 0; // Default to 0 for empty values
                    } else {
                        // Clean the value first - remove any extra spaces or characters
                        const cleanValue = value.toString().trim();
                        const numericValue = parseInt(cleanValue);
                        row.qty = isNaN(numericValue) ? 0 : numericValue;
                    }
                    
                    // Log any problematic conversions
                    if (row.qty < 0 && value !== '' && !value.includes('-')) {
                        console.warn(`Unexpected negative qty conversion at row ${index + 1}:`, {
                            original: value,
                            cleaned: value.toString().trim(),
                            final: row.qty,
                            rawLine: line
                        });
                    }
                } else if (normalizedHeader === 'unit_cost' || normalizedHeader === 'cost') {
                    row.unit_cost = value ? parseFloat(value) : 0;
                } else if (normalizedHeader === 'barcode') {
                    row.barcode = value;
                } else if (normalizedHeader === 'product_name' || normalizedHeader === 'name') {
                    // Clean up product name - remove extra spaces, but allow empty
                    row.product_name = value ? value.replace(/\s+/g, ' ').trim() : '';
                } else if (normalizedHeader === 'variant') {
                    row.variant = value || '';
                } else {
                    row[normalizedHeader] = value;
                }
            });
            
            // Set default unit_cost if not provided
            if (!row.unit_cost) {
                row.unit_cost = 0;
            }
            
            // Auto-generate product name if missing but barcode exists
            if (row.barcode && (!row.product_name || row.product_name.trim() === '')) {
                row.product_name = `Product ${row.barcode}`;
            }
            
            return row;
        }).filter(row => row && row.barcode); // Only filter out rows without barcode
    },

    /**
     * Parse a single CSV line handling quoted fields
     * @param {string} line - CSV line
     * @returns {Array} Parsed values
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim()); // Trim each value
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim()); // Add the last value and trim it
        
        // Handle cases where there might be trailing commas or missing values
        // Ensure we have at least 4 values (barcode, product_name, variant, qty)
        while (values.length < 4) {
            values.push('');
        }
        
        return values;
    },

    /**
     * Normalize header names to handle variations
     * @param {string} header - Header name
     * @returns {string} Normalized header
     */
    normalizeHeader(header) {
        const normalized = header.toLowerCase().trim();
        
        // Handle common variations
        const headerMap = {
            'product name': 'product_name',
            'productname': 'product_name',
            'name': 'product_name',
            'quantity': 'qty',
            'amount': 'qty',
            'stock': 'qty',
            'cost': 'unit_cost',
            'price': 'unit_cost',
            'unit cost': 'unit_cost',
            'unitcost': 'unit_cost'
        };
        
        return headerMap[normalized] || normalized.replace(/\s+/g, '_');
    },

    /**
     * Validate CSV row data - ULTRA RELAXED VALIDATION
     * @param {Object} row - Single row data
     * @returns {Object} Validation result
     */
    validateRow(row) {
        const errors = [];
        
        // ONLY BARCODE IS STRICTLY REQUIRED
        if (!row.barcode || row.barcode.toString().trim() === '') {
            errors.push('Barcode is required');
        }
        
        // Product name is optional - can be auto-generated or updated later
        if (!row.product_name || row.product_name.toString().trim() === '') {
            // Auto-generate product name from barcode if missing
            row.product_name = `Product ${row.barcode}`;
        }
        
        // Warehouse should be set by the system
        if (!row.warehouse) {
            errors.push('Warehouse not set');
        }
        
        // VERY RELAXED quantity validation - accept almost anything
        if (row.qty === undefined || row.qty === null || row.qty === '') {
            // Set default quantity to 0 instead of error
            row.qty = 0;
        } else {
            // Try to convert to number, be very forgiving
            const qtyStr = row.qty.toString().trim();
            const qty = parseInt(qtyStr);
            if (isNaN(qty)) {
                // Try to extract numbers from string
                const numberMatch = qtyStr.match(/-?\d+/);
                if (numberMatch) {
                    row.qty = parseInt(numberMatch[0]);
                } else {
                    row.qty = 0; // Default to 0 instead of error
                }
            } else {
                row.qty = qty;
            }
        }
        
        // VERY RELAXED unit cost validation
        if (row.unit_cost === undefined || row.unit_cost === '' || row.unit_cost === null) {
            row.unit_cost = 0; // Default to 0
        } else {
            const costStr = row.unit_cost.toString().trim();
            const cost = parseFloat(costStr);
            if (isNaN(cost)) {
                row.unit_cost = 0; // Default to 0 instead of error
            } else {
                row.unit_cost = Math.abs(cost); // Ensure positive cost
            }
        }
        
        // Clean up variant field - completely optional
        if (!row.variant || row.variant.toString().trim() === '') {
            row.variant = ''; // Default to empty string
        } else {
            row.variant = row.variant.toString().trim();
        }
        
        // Clean up barcode - remove extra spaces
        if (row.barcode) {
            row.barcode = row.barcode.toString().trim();
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings: [], // Could add warnings for auto-corrections
            autoCorrections: {
                productNameGenerated: !row.product_name || row.product_name === `Product ${row.barcode}`,
                quantityDefaulted: row.qty === 0,
                costDefaulted: row.unit_cost === 0
            }
        };
    }
};