// Mock order data with dimensions for demonstration
export const mockOrdersWithDimensions = [
    {
        id: 1,
        customer: "John Smith",
        product_name: "Wireless Headphones",
        quantity: 2,
        dimensions: "20×15×8",
        length: 20,
        width: 15,
        height: 8,
        awb: "AWB123456789",
        order_ref: "ORD-2024-001",
        warehouse: "GGM_WH",
        status: "Processing",
        payment_mode: "Credit Card",
        invoice_amount: 2999,
        timestamp: new Date().toISOString(),
        remark: "@john please check the delivery address #urgent"
    },
    {
        id: 2,
        customer: "Sarah Johnson",
        product_name: "Laptop Stand",
        quantity: 1,
        dimensions: "30×25×5",
        length: 30,
        width: 25,
        height: 5,
        awb: "AWB987654321",
        order_ref: "ORD-2024-002",
        warehouse: "BLR_WH",
        status: "Shipped",
        payment_mode: "UPI",
        invoice_amount: 1599,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        remark: "Handle with care #fragile"
    },
    {
        id: 3,
        customer: "Mike Wilson",
        product_name: "Gaming Mouse",
        quantity: 3,
        dimensions: "12×8×4",
        length: 12,
        width: 8,
        height: 4,
        awb: "AWB456789123",
        order_ref: "ORD-2024-003",
        warehouse: "MUM_WH",
        status: "Delivered",
        payment_mode: "Cash on Delivery",
        invoice_amount: 4497,
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        remark: "@mike confirmed delivery #completed"
    },
    {
        id: 4,
        customer: "Emma Davis",
        product_name: "Bluetooth Speaker",
        quantity: 1,
        dimensions: "18×10×10",
        length: 18,
        width: 10,
        height: 10,
        awb: "AWB789123456",
        order_ref: "ORD-2024-004",
        warehouse: "AMD_WH",
        status: "Pending",
        payment_mode: "Net Banking",
        invoice_amount: 2299,
        timestamp: new Date(Date.now() - 259200000).toISOString(),
        remark: "Customer requested gift wrapping"
    },
    {
        id: 5,
        customer: "David Brown",
        product_name: "Smartphone Case",
        quantity: 5,
        dimensions: "16×8×2",
        length: 16,
        width: 8,
        height: 2,
        awb: "AWB321654987",
        order_ref: "ORD-2024-005",
        warehouse: "HYD_WH",
        status: "Processing",
        payment_mode: "Credit Card",
        invoice_amount: 1995,
        timestamp: new Date(Date.now() - 345600000).toISOString(),
        remark: "@david bulk order discount applied #wholesale"
    }
];

// Function to get orders with dimensions
export const getOrdersWithDimensions = () => {
    return mockOrdersWithDimensions;
};

// Function to simulate API delay
export const simulateApiDelay = (ms = 500) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};