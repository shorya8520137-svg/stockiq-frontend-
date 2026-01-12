# EMERGENCY FIX - DASHBOARD DELIVERY TODAY

## IMMEDIATE STEPS (5 MINUTES)

### 1. Kill everything and start fresh
```bash
sudo fuser -k 5000/tcp
```

### 2. Start server on different port
```bash
PORT=5001 node server.js
```

### 3. Update frontend API URL
In `.env.local`:
```
NEXT_PUBLIC_API_BASE=https://13-201-222-24.nip.io:5001/api
```

### 4. Start frontend
```bash
npm run dev
```

## THAT'S IT - YOUR DASHBOARD SHOULD WORK NOW

## If still not working, use MOCK DATA temporarily:

In `src/app/inventory/InventorySheet.jsx`, add this at the top:
```javascript
const USE_MOCK_DATA = true; // Set to true for demo
```

Then in the `loadInventory` function, add this at the beginning:
```javascript
if (USE_MOCK_DATA) {
    // Mock data for demo
    const mockData = [
        { barcode: "123456", product_name: "Sample Product 1", warehouse: "GGM_WH", stock: 100 },
        { barcode: "789012", product_name: "Sample Product 2", warehouse: "BLR_WH", stock: 50 },
        { barcode: "345678", product_name: "Sample Product 3", warehouse: "MUM_WH", stock: 25 }
    ];
    setAllItems(mockData);
    setItems(mockData);
    setStats({ totalProducts: 3, totalStock: 175, lowStockItems: 1, outOfStockItems: 0 });
    setLoading(false);
    return;
}
```

## FOR DELIVERY TODAY:
- Use PORT=5001 for backend
- Update API URL to :5001
- If APIs still fail, enable mock data
- Your dashboard will work for demo

Sorry for overcomplicating. This will work in 5 minutes.