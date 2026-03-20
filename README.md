# E-Commerce Website

A full-stack e-commerce application built with Node.js, Express, MongoDB, and React.

## Features

- 🛍️ Product browsing and filtering
- 🛒 Shopping cart functionality
- 👤 User authentication (signup/login)
- ⭐ Product reviews and ratings
- 📦 Order placement and tracking
- 📊 Event tracking (view, cart, purchase, review)
- 📈 Admin dashboard with live data streaming

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- CORS enabled

### Frontend
- React
- React Router
- Axios
- Vite

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running locally on port 27017)

### Backend Setup
```bash
cd backend
npm install
node get-data.js          # Load initial product data
./start-servers.sh        # Start both Express (port 3000) and WebSocket (port 8080) servers
# OR run separately:
# node server.js          # Express server on port 3000
# node websocket-server.js # WebSocket server on port 8080
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev       # Start dev server on port 5173
```

## API Endpoints

### Products
- `GET /products` - Get all products
- `POST /products` - Create new product
- `GET /products/:id` - Get product by ID

### Users
- `GET /users` - Get all users
- `POST /users` - Create new user

### Orders
- `GET /orders` - Get all orders
- `POST /orders` - Create new order

### Order Items
- `GET /order_items` - Get all order items
- `POST /order_items` - Create order item

### Reviews
- `GET /reviews` - Get all reviews
- `GET /reviews/product/:productId` - Get reviews for specific product
- `POST /reviews` - Submit new review

### Events
- `GET /events` - Get all tracked events
- `POST /events` - Track new event

### WebSocket
- `ws://localhost:8080/stream` - Live data stream for admin dashboard

## Database Collections

- **products** - Product catalog (30 items)
- **users** - Registered users (50+ users)
- **orders** - Order records (50+ orders)
- **order_items** - Individual items in orders (100+ items)
- **reviews** - Product reviews (100+ reviews)
- **events** - User activity tracking (view, cart, purchase, review)

## Usage

1. Browse products on the home page
2. Click on a product to view details and reviews
3. Add products to cart
4. Login or signup to place orders
5. Write reviews for products you've viewed
6. Access admin dashboard at `/admin` (requires admin user: admin@eshop.com)

## Project Structure

```
dummy-ecommerce-website/
├── backend/
│   ├── models/              # Mongoose schemas
│   ├── routes/              # API route handlers
│   ├── server.js            # Express server
│   ├── websocket-server.js  # WebSocket server for live data
│   ├── start-servers.sh     # Script to start both servers
│   └── get-data.js          # Data loading script
├── frontend/
│   └── src/
│       ├── components/      # Reusable components
│       ├── pages/           # Page components (includes Admin)
│       ├── context/         # React context (Cart)
│       └── api.js           # API client
└── ecommerce_dataset/       # CSV data files
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT
