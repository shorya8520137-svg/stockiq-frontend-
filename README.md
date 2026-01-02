# StockIQ Frontend

A modern inventory management system frontend built with Next.js.

## Features

- 📊 Dashboard with analytics
- 📦 Inventory management
- 🛒 Order processing
- 📱 Product management with bulk import
- 💬 Team messaging
- 🔐 Role-based permissions
- 📱 Responsive design

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd stockiq-frontend
```

2. Install dependencies
```bash
npm install
```

3. Run the development server
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Product Management

The product management system includes:
- Single product creation
- Bulk import via CSV/Excel
- Category management
- Search and filtering
- Pagination

### Backend Integration

The frontend expects a backend API running on `http://localhost:3001` with the following endpoints:

#### Product Controller (`controllers/productController.js`)
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/bulk/import` - Bulk import
- `GET /api/products/categories/all` - List categories
- `POST /api/products/categories` - Create category

#### Product Routes (`routes/productRoutes.js`)
- Authentication middleware
- Permission-based access control
- File upload handling for bulk import

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── products/          # Product management pages
│   ├── inventory/         # Inventory pages
│   ├── messages/          # Team messaging
│   └── ...
├── components/            # Reusable components
├── contexts/              # React contexts (Auth, Permissions)
└── utils/                 # Utility functions

controllers/               # Backend controllers (for reference)
routes/                   # Backend routes (for reference)
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## License

MIT