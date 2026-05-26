# 🏪 Online General Store — Full-Stack E-Commerce Platform

A professional full-stack e-commerce application built with **Spring Boot** (Java) + **React** (Vite), featuring a **Customer Storefront** and an **Admin POS Dashboard**.

![Java](https://img.shields.io/badge/Java-21-orange?style=flat-square)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.0-brightgreen?style=flat-square)
![React](https://img.shields.io/badge/React-19-blue?style=flat-square)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue?style=flat-square)
![Vite](https://img.shields.io/badge/Vite-8.0-purple?style=flat-square)

---

## ✨ Features

### 🛒 Customer Storefront
- **Product Browsing** — Grid layout with category filters, search, and product cards
- **Advanced Search & Filters** — Sort by price/rating/name, price range slider, rating filter, stock filter
- **Product Detail Page** — Full product info with image zoom-on-hover
- **Shopping Cart** — Add/remove items, quantity controls, delivery fee calculation
- **Checkout System** — Customer info, payment mode selection, order placement
- **🎫 Coupon Codes** — Apply discount codes at checkout with live validation
- **📦 Order Tracking** — Track orders by phone number with visual timeline
- **⭐ Product Reviews & Ratings** — Star ratings with written reviews
- **❤️ Wishlist** — Save products for later with dedicated page
- **🤖 Product Recommendations** — "Frequently Bought Together" section
- **💬 Live Chat** — WhatsApp-style chat bubble to talk with store admin
- **🔔 Notifications** — Real-time order status updates via notification bell
- **↩️ Return Requests** — Request returns on delivered orders
- **🌙 Dark Mode** — System-wide dark theme with smooth transitions

### 📊 Admin POS Dashboard
- **Business Dashboard** — Revenue cards, interactive SVG charts, activity feed
- **📈 Revenue Trend Chart** — Daily revenue visualization (SVG bar chart)
- **🏷️ Category Sales Chart** — Category-wise breakdown (SVG donut chart)
- **🛒 Point of Sale** — In-store billing with Retail/Wholesale modes
- **📦 Order Ledger** — Full order management with status updates
- **🚚 Dispatch Hub** — Delivery assignment with visual order timeline
- **🛠️ Stock Master** — Warehouse management with stock level indicators
- **🎫 Coupon Manager** — Create, enable/disable, delete discount coupons
- **💬 Support Inbox** — Reply to customer chats in real-time
- **📦 Returns Management** — Approve/reject return requests with customer notifications
- **📤 CSV Export** — Download orders, inventory, and revenue data as CSV
- **🔔 Stock Alerts** — Visual alerts for low and critical stock items
- **🧾 Invoice Generation** — Professional printable invoices (Retail & GST)
- **🌙 Dark Mode** — Full dark theme support

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Java 21, Spring Boot 4, Spring Data JPA, REST APIs |
| **Database** | MySQL 8 |
| **Frontend (User)** | React 19, React Router 7, Vite 8 |
| **Frontend (Admin)** | React 19, Vite 8 |
| **Styling** | Vanilla CSS with CSS Custom Properties (Dark Mode) |
| **Charts** | Pure SVG (no external chart library) |

---

## 📁 Project Structure

```
online-general-store/
├── backend/                        # Spring Boot API
│   └── src/main/java/.../
│       ├── model/                  # JPA Entities
│       │   ├── Product.java
│       │   ├── Order.java
│       │   ├── Review.java
│       │   ├── Coupon.java
│       │   ├── Message.java
│       │   ├── Notification.java
│       │   └── ReturnRequest.java
│       ├── repository/             # Data Access Layer
│       └── controller/             # REST Controllers
│           ├── ProductController.java
│           ├── OrderController.java
│           ├── ReviewController.java
│           ├── AnalyticsController.java
│           ├── CouponController.java
│           ├── MessageController.java
│           ├── NotificationController.java
│           └── ReturnController.java
├── frontend-user/                  # Customer Storefront (React)
│   └── src/
│       ├── App.jsx                 # Main app with routing, dark mode, chat
│       ├── Store.jsx               # Product listing with filters
│       ├── Cart.jsx                # Shopping cart
│       ├── Checkout.jsx            # Checkout with coupon support
│       ├── ProductDetail.jsx       # Product page with zoom & recommendations
│       ├── MyOrders.jsx            # Order tracking with returns
│       ├── Wishlist.jsx            # Wishlist page
│       └── index.css               # Complete theme system
└── frontend-admin/                 # Admin Dashboard (React)
    └── src/
        ├── App.jsx                 # Full admin panel with all features
        └── index.css               # Admin styles
```

---

## 🚀 Getting Started

### Prerequisites
- **Java 21** (JDK)
- **MySQL 8** (running locally)
- **Node.js 18+** and npm
- **Maven** (or use the wrapper)

### 1. Database Setup
Create a MySQL database:
```sql
CREATE DATABASE generalstore;
```

### 2. Backend Configuration
Update `backend/src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/generalstore
spring.datasource.username=root
spring.datasource.password=YOUR_PASSWORD
spring.jpa.hibernate.ddl-auto=update
```

### 3. Start Backend
```bash
cd backend
mvn spring-boot:run
```
The API starts at `http://localhost:8080`

### 4. Start Customer Frontend
```bash
cd frontend-user
npm install
npm run dev
```
Opens at `http://localhost:5173`

### 5. Start Admin Dashboard
```bash
cd frontend-admin
npm install
npm run dev
```
Opens at `http://localhost:5174`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| POST | `/api/products` | Add a product |
| PUT | `/api/products/{id}` | Update a product |
| DELETE | `/api/products/{id}` | Delete a product |
| GET | `/api/orders` | List all orders |
| POST | `/api/orders` | Place an order |
| PUT | `/api/orders/{id}` | Update order status |
| GET | `/api/orders/track?phone=` | Track orders by phone |
| GET | `/api/reviews/{productId}` | Get product reviews |
| POST | `/api/reviews` | Submit a review |
| GET | `/api/analytics/summary` | Dashboard analytics |
| GET | `/api/analytics/top-products` | Top selling products |
| GET | `/api/analytics/revenue-trend` | Daily revenue data |
| GET | `/api/analytics/category-sales` | Category breakdown |
| GET | `/api/analytics/recommendations/{id}` | Product recommendations |
| GET | `/api/coupons` | List coupons |
| POST | `/api/coupons` | Create coupon |
| POST | `/api/coupons/validate` | Validate & apply coupon |
| GET | `/api/messages/conversations` | Chat conversations |
| POST | `/api/messages` | Send a message |
| GET | `/api/notifications/{phone}` | Get notifications |
| POST | `/api/returns` | Submit return request |
| PUT | `/api/returns/{id}` | Approve/reject return |

---

## 📸 screenshots

### 🛒 Customer Storefront

| Store Home | Product Grid (Light Mode) |
|---|---|
| ![Store Home](screenshots/store-home.png) | ![Store Light](screenshots/store-light.png) |

| Shopping Cart | Track My Orders |
|---|---|
| ![Cart](screenshots/cart.png) | ![Orders](screenshots/track-orders.png) |

---

### 📊 Admin POS Dashboard

| Business Dashboard | Revenue & Category Charts |
|---|---|
| ![Dashboard](screenshots/admin-dashboard.png) | ![Charts](screenshots/admin-charts.png) |

| Point of Sale | Order Ledger |
|---|---|
| ![POS](screenshots/pos-billing.png) | ![Orders](screenshots/order-ledger.png) |

| Dispatch Hub | Stock Master |
|---|---|
| ![Dispatch](screenshots/dispatch-hub.png) | ![Stock](screenshots/stock-master.png) |

| Add Product | Invoice Preview |
|---|---|
| ![Add Product](screenshots/add-product.png) | ![Invoice](screenshots/invoice.png) |

| Support Inbox |  |
|---|---|
| ![Support](screenshots/support-inbox.png) | |
---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

Made with ❤️ using Spring Boot + React
