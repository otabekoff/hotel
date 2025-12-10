-- Hotel Management System Database Schema
-- Run these commands in pgAdmin 4 to create the tables

-- First, connect to your render.com PostgreSQL database:
-- Host: dpg-d4si5enpm1nc73c3gdv0-a.oregon-postgres.render.com
-- Port: 5432
-- Database: hotel_db_ns61
-- Username: hotel_admin
-- Password: JkjMsUaZUcEvoqd9dTCl2hzzXaxfbS9d

-- Drop tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS room_bookings CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS room_types CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- 1. Room Types Table
CREATE TABLE room_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    max_occupancy INTEGER NOT NULL DEFAULT 2,
    amenities TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Rooms Table (Many-to-One with Room Types)
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    room_number VARCHAR(20) NOT NULL UNIQUE,
    room_type_id INTEGER NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    floor INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
    price_per_night DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customers Table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    id_type VARCHAR(50),
    id_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bookings Table (Many-to-One with Customers)
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    total_amount DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
    special_requests TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_dates CHECK (check_out_date > check_in_date)
);

-- 5. Room Bookings Table (Junction table: Many-to-Many between Bookings and Rooms)
CREATE TABLE room_bookings (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    price_per_night DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(booking_id, room_id)
);

-- 6. Payments Table (One-to-One with Bookings)
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'online')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_id VARCHAR(100),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Reviews Table (Many-to-One with Rooms and Customers)
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_rooms_room_type_id ON rooms(room_type_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_room_bookings_booking_id ON room_bookings(booking_id);
CREATE INDEX idx_room_bookings_room_id ON room_bookings(room_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_reviews_room_id ON reviews(room_id);
CREATE INDEX idx_reviews_customer_id ON reviews(customer_id);

-- Insert sample room types
INSERT INTO room_types (name, description, base_price, max_occupancy, amenities) VALUES
('Standard', 'Comfortable room with basic amenities', 100.00, 2, ARRAY['WiFi', 'TV', 'AC']),
('Deluxe', 'Spacious room with premium amenities', 180.00, 3, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar', 'Room Service']),
('Suite', 'Luxury suite with separate living area', 300.00, 4, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar', 'Room Service', 'Jacuzzi', 'Kitchen']),
('Family', 'Large room suitable for families', 250.00, 6, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar', 'Extra Beds']);

-- Insert sample rooms
INSERT INTO rooms (room_number, room_type_id, floor, status, price_per_night) VALUES
('101', 1, 1, 'available', 100.00),
('102', 1, 1, 'available', 100.00),
('103', 2, 1, 'available', 180.00),
('201', 2, 2, 'available', 180.00),
('202', 3, 2, 'available', 300.00),
('301', 3, 3, 'available', 300.00),
('302', 4, 3, 'available', 250.00);

-- Insert sample customers
INSERT INTO customers (first_name, last_name, email, phone, address, id_type, id_number) VALUES
('John', 'Doe', 'john.doe@email.com', '+1234567890', '123 Main St, City', 'passport', 'AB123456'),
('Jane', 'Smith', 'jane.smith@email.com', '+0987654321', '456 Oak Ave, Town', 'driver_license', 'DL789012');

COMMENT ON TABLE room_types IS 'Stores different types of rooms available in the hotel';
COMMENT ON TABLE rooms IS 'Individual rooms in the hotel';
COMMENT ON TABLE customers IS 'Hotel guests and customers';
COMMENT ON TABLE bookings IS 'Room reservations made by customers';
COMMENT ON TABLE room_bookings IS 'Junction table linking bookings to multiple rooms';
COMMENT ON TABLE payments IS 'Payment records for bookings (one-to-one with bookings)';
COMMENT ON TABLE reviews IS 'Customer reviews for rooms';
