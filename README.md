# Hotel Management System API

A RESTful API for hotel management built with Node.js and PostgreSQL.

## Database Setup (pgAdmin 4)

### Connecting to Render.com PostgreSQL

1. Open **pgAdmin 4**
2. Right-click on **Servers** → **Register** → **Server**
3. In the **General** tab:
   - Name: `Hotel DB (Render)`
4. In the **Connection** tab:
   - Host: `dpg-d4si5enpm1nc73c3gdv0-a.oregon-postgres.render.com`
   - Port: `5432`
   - Maintenance database: `hotel_db_ns61`
   - Username: `hotel_admin`
   - Password: `JkjMsUaZUcEvoqd9dTCl2hzzXaxfbS9d`
5. In the **SSL** tab:
   - SSL mode: `Require`
6. Click **Save**

### Creating Tables

1. After connecting, expand your server → Databases → `hotel_db_ns61`
2. Right-click on `hotel_db_ns61` → **Query Tool**
3. Copy and paste the contents of `database/schema.sql`
4. Click **Execute** (F5) to run the SQL

## Project Setup

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

```bash
# Install dependencies
npm install

# Start development server (with auto-reload)
npm run dev

# Start production server
npm start
```

The API will run on `http://localhost:3000`

## Database Schema

### Entity Relationships

```
room_types (1) ──────< (N) rooms
rooms (1) ──────< (N) reviews
rooms (1) ──────< (N) room_bookings
customers (1) ──────< (N) reviews
customers (1) ──────< (N) bookings
bookings (1) ──────< (N) room_bookings
bookings (1) ──────── (1) payments
```

## API Endpoints

### Room Types
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/roomtypes` | Get all room types |
| GET | `/api/roomtypes/:id` | Get single room type |
| POST | `/api/roomtypes` | Create room type |
| PUT | `/api/roomtypes/:id` | Update room type |
| DELETE | `/api/roomtypes/:id` | Delete room type |
| GET | `/api/roomtypes/:id/rooms` | Get all rooms of a room type |

### Rooms
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms` | Get all rooms with room type info |
| GET | `/api/rooms/:id` | Get single room with room type info |
| POST | `/api/rooms` | Create room |
| PUT | `/api/rooms/:id` | Update room |
| DELETE | `/api/rooms/:id` | Delete room |
| GET | `/api/rooms/:id/reviews` | Get all reviews for a room |
| GET | `/api/rooms/:id/bookings` | Get all bookings for a room |
| POST | `/api/rooms/:roomId/reviews` | Add review for a room |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | Get all customers |
| GET | `/api/customers/:id` | Get single customer |
| POST | `/api/customers` | Create customer |
| PUT | `/api/customers/:id` | Update customer |
| DELETE | `/api/customers/:id` | Delete customer |
| GET | `/api/customers/:id/bookings` | Get customer's bookings with rooms |
| GET | `/api/customers/:id/reviews` | Get customer's reviews with room info |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings` | Get all bookings |
| GET | `/api/bookings/:id` | Get single booking with details |
| POST | `/api/bookings` | Create booking with rooms |
| PUT | `/api/bookings/:id` | Update booking |
| DELETE | `/api/bookings/:id` | Delete booking |
| GET | `/api/bookings/:id/payment` | Get payment for booking |
| POST | `/api/bookings/:bookingId/rooms/:roomId` | Assign room to booking |
| DELETE | `/api/bookings/:bookingId/rooms/:roomId` | Remove room from booking |
| POST | `/api/bookings/:bookingId/payment` | Create payment for booking |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments` | Get all payments |
| GET | `/api/payments/:id` | Get single payment |
| PUT | `/api/payments/:id` | Update payment |
| GET | `/api/payments/:id/booking` | Get booking info for payment |

### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reviews` | Get all reviews |
| GET | `/api/reviews/:id` | Get single review with details |
| PUT | `/api/reviews/:id` | Update review |
| DELETE | `/api/reviews/:id` | Delete review |

## Example API Requests

### Create a Room Type
```json
POST /api/roomtypes
{
    "name": "Deluxe Suite",
    "description": "Luxury suite with ocean view",
    "base_price": 350.00,
    "max_occupancy": 4,
    "amenities": ["WiFi", "TV", "AC", "Mini Bar", "Jacuzzi"]
}
```

### Create a Customer
```json
POST /api/customers
{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "address": "123 Main St",
    "id_type": "passport",
    "id_number": "AB123456"
}
```

### Create a Booking with Rooms
```json
POST /api/bookings
{
    "customer_id": 1,
    "check_in_date": "2025-01-15",
    "check_out_date": "2025-01-20",
    "special_requests": "Late check-in requested",
    "room_ids": [1, 2]
}
```

### Create a Payment
```json
POST /api/bookings/1/payment
{
    "amount": 500.00,
    "payment_method": "credit_card",
    "payment_status": "completed",
    "transaction_id": "TXN123456"
}
```

### Create a Review
```json
POST /api/rooms/1/reviews
{
    "customer_id": 1,
    "rating": 5,
    "comment": "Excellent room with amazing view!"
}
```

## Project Structure

```
hotel/
├── database/
│   └── schema.sql          # Database schema and sample data
├── src/
│   ├── config/
│   │   └── db.js           # Database connection
│   ├── controllers/
│   │   ├── roomTypesController.js
│   │   ├── roomsController.js
│   │   ├── customersController.js
│   │   ├── bookingsController.js
│   │   ├── paymentsController.js
│   │   └── reviewsController.js
│   ├── routes/
│   │   ├── roomTypesRoutes.js
│   │   ├── roomsRoutes.js
│   │   ├── customersRoutes.js
│   │   ├── bookingsRoutes.js
│   │   ├── paymentsRoutes.js
│   │   └── reviewsRoutes.js
│   └── app.js              # Main application entry
├── .env                    # Environment variables
├── .gitignore
├── package.json
└── README.md
```

## Environment Variables

Create a `.env` file in the root directory:

```env
DB_HOST=dpg-d4si5enpm1nc73c3gdv0-a.oregon-postgres.render.com
DB_PORT=5432
DB_NAME=hotel_db_ns61
DB_USER=hotel_admin
DB_PASSWORD=JkjMsUaZUcEvoqd9dTCl2hzzXaxfbS9d
PORT=3000
NODE_ENV=development
```

## License

ISC
