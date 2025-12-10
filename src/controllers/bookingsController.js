const pool = require('../config/db');

// Get all bookings
const getAllBookings = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT b.*, c.first_name, c.last_name, c.email, c.phone,
                    json_agg(
                        json_build_object(
                            'room_id', r.id,
                            'room_number', r.room_number,
                            'room_type', rt.name,
                            'floor', r.floor,
                            'price_per_night', rb.price_per_night
                        )
                    ) FILTER (WHERE r.id IS NOT NULL) as rooms
             FROM bookings b
             JOIN customers c ON b.customer_id = c.id
             LEFT JOIN room_bookings rb ON b.id = rb.booking_id
             LEFT JOIN rooms r ON rb.room_id = r.id
             LEFT JOIN room_types rt ON r.room_type_id = rt.id
             GROUP BY b.id, c.first_name, c.last_name, c.email, c.phone
             ORDER BY b.created_at DESC`
        );
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Get single booking by ID with customer and room info
const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT b.*, c.first_name, c.last_name, c.email, c.phone, c.address,
                    json_agg(
                        json_build_object(
                            'room_id', r.id,
                            'room_number', r.room_number,
                            'room_type', rt.name,
                            'floor', r.floor,
                            'price_per_night', rb.price_per_night
                        )
                    ) FILTER (WHERE r.id IS NOT NULL) as rooms
             FROM bookings b
             JOIN customers c ON b.customer_id = c.id
             LEFT JOIN room_bookings rb ON b.id = rb.booking_id
             LEFT JOIN rooms r ON rb.room_id = r.id
             LEFT JOIN room_types rt ON r.room_type_id = rt.id
             WHERE b.id = $1
             GROUP BY b.id, c.first_name, c.last_name, c.email, c.phone, c.address`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Create new booking with multiple rooms
const createBooking = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { customer_id, check_in_date, check_out_date, status, special_requests, room_ids } = req.body;
        
        if (!customer_id || !check_in_date || !check_out_date) {
            return res.status(400).json({ 
                success: false, 
                message: 'customer_id, check_in_date, and check_out_date are required' 
            });
        }
        
        await client.query('BEGIN');
        
        // Check if customer exists
        const customerCheck = await client.query('SELECT id FROM customers WHERE id = $1', [customer_id]);
        if (customerCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Invalid customer_id' });
        }
        
        // Calculate total amount if rooms are provided
        let totalAmount = 0;
        const checkIn = new Date(check_in_date);
        const checkOut = new Date(check_out_date);
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        
        if (room_ids && room_ids.length > 0) {
            // Check room availability
            const roomsResult = await client.query(
                'SELECT id, price_per_night, status FROM rooms WHERE id = ANY($1)',
                [room_ids]
            );
            
            if (roomsResult.rows.length !== room_ids.length) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'One or more rooms not found' });
            }
            
            // Calculate total
            roomsResult.rows.forEach(room => {
                totalAmount += parseFloat(room.price_per_night) * nights;
            });
        }
        
        // Create booking
        const bookingResult = await client.query(
            `INSERT INTO bookings (customer_id, check_in_date, check_out_date, total_amount, status, special_requests) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [customer_id, check_in_date, check_out_date, totalAmount, status || 'pending', special_requests]
        );
        
        const booking = bookingResult.rows[0];
        
        // Create room bookings
        if (room_ids && room_ids.length > 0) {
            for (const roomId of room_ids) {
                const roomResult = await client.query('SELECT price_per_night FROM rooms WHERE id = $1', [roomId]);
                await client.query(
                    'INSERT INTO room_bookings (booking_id, room_id, price_per_night) VALUES ($1, $2, $3)',
                    [booking.id, roomId, roomResult.rows[0].price_per_night]
                );
            }
        }
        
        await client.query('COMMIT');
        
        // Fetch complete booking with rooms
        const completeBooking = await pool.query(
            `SELECT b.*, c.first_name, c.last_name, c.email,
                    json_agg(
                        json_build_object(
                            'room_id', r.id,
                            'room_number', r.room_number,
                            'price_per_night', rb.price_per_night
                        )
                    ) FILTER (WHERE r.id IS NOT NULL) as rooms
             FROM bookings b
             JOIN customers c ON b.customer_id = c.id
             LEFT JOIN room_bookings rb ON b.id = rb.booking_id
             LEFT JOIN rooms r ON rb.room_id = r.id
             WHERE b.id = $1
             GROUP BY b.id, c.first_name, c.last_name, c.email`,
            [booking.id]
        );
        
        res.status(201).json({ success: true, data: completeBooking.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating booking:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    } finally {
        client.release();
    }
};

// Update booking
const updateBooking = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { id } = req.params;
        const { customer_id, check_in_date, check_out_date, total_amount, status, special_requests, room_ids } = req.body;
        
        await client.query('BEGIN');
        
        // Check if booking exists
        const bookingCheck = await client.query('SELECT * FROM bookings WHERE id = $1', [id]);
        if (bookingCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        
        // Update booking
        const result = await client.query(
            `UPDATE bookings 
             SET customer_id = COALESCE($1, customer_id),
                 check_in_date = COALESCE($2, check_in_date),
                 check_out_date = COALESCE($3, check_out_date),
                 total_amount = COALESCE($4, total_amount),
                 status = COALESCE($5, status),
                 special_requests = COALESCE($6, special_requests),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $7 RETURNING *`,
            [customer_id, check_in_date, check_out_date, total_amount, status, special_requests, id]
        );
        
        // Update room assignments if room_ids provided
        if (room_ids) {
            // Remove existing room assignments
            await client.query('DELETE FROM room_bookings WHERE booking_id = $1', [id]);
            
            // Add new room assignments
            for (const roomId of room_ids) {
                const roomResult = await client.query('SELECT price_per_night FROM rooms WHERE id = $1', [roomId]);
                if (roomResult.rows.length > 0) {
                    await client.query(
                        'INSERT INTO room_bookings (booking_id, room_id, price_per_night) VALUES ($1, $2, $3)',
                        [id, roomId, roomResult.rows[0].price_per_night]
                    );
                }
            }
            
            // Recalculate total
            const checkIn = new Date(result.rows[0].check_in_date);
            const checkOut = new Date(result.rows[0].check_out_date);
            const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
            
            const roomsTotal = await client.query(
                'SELECT SUM(price_per_night) as total FROM room_bookings WHERE booking_id = $1',
                [id]
            );
            
            const newTotal = parseFloat(roomsTotal.rows[0].total || 0) * nights;
            await client.query('UPDATE bookings SET total_amount = $1 WHERE id = $2', [newTotal, id]);
        }
        
        await client.query('COMMIT');
        
        // Fetch updated booking
        const updatedBooking = await pool.query(
            `SELECT b.*, c.first_name, c.last_name, c.email,
                    json_agg(
                        json_build_object(
                            'room_id', r.id,
                            'room_number', r.room_number,
                            'price_per_night', rb.price_per_night
                        )
                    ) FILTER (WHERE r.id IS NOT NULL) as rooms
             FROM bookings b
             JOIN customers c ON b.customer_id = c.id
             LEFT JOIN room_bookings rb ON b.id = rb.booking_id
             LEFT JOIN rooms r ON rb.room_id = r.id
             WHERE b.id = $1
             GROUP BY b.id, c.first_name, c.last_name, c.email`,
            [id]
        );
        
        res.json({ success: true, data: updatedBooking.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating booking:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    } finally {
        client.release();
    }
};

// Delete booking
const deleteBooking = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Room bookings will be deleted automatically due to CASCADE
        const result = await pool.query('DELETE FROM bookings WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        
        res.json({ success: true, message: 'Booking and associated room bookings deleted successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Get payment for a booking
const getBookingPayment = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if booking exists
        const bookingCheck = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
        if (bookingCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        
        const result = await pool.query(
            'SELECT * FROM payments WHERE booking_id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No payment found for this booking',
                booking: bookingCheck.rows[0]
            });
        }
        
        res.json({
            success: true,
            booking: bookingCheck.rows[0],
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching booking payment:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Assign a room to a booking
const assignRoomToBooking = async (req, res) => {
    try {
        const { bookingId, roomId } = req.params;
        
        // Check if booking exists
        const bookingCheck = await pool.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
        if (bookingCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        
        // Check if room exists
        const roomCheck = await pool.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
        if (roomCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }
        
        // Check if already assigned
        const existingCheck = await pool.query(
            'SELECT * FROM room_bookings WHERE booking_id = $1 AND room_id = $2',
            [bookingId, roomId]
        );
        if (existingCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Room already assigned to this booking' });
        }
        
        const result = await pool.query(
            'INSERT INTO room_bookings (booking_id, room_id, price_per_night) VALUES ($1, $2, $3) RETURNING *',
            [bookingId, roomId, roomCheck.rows[0].price_per_night]
        );
        
        res.status(201).json({ 
            success: true, 
            message: 'Room assigned to booking successfully',
            data: result.rows[0] 
        });
    } catch (error) {
        console.error('Error assigning room to booking:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Remove a room from a booking
const removeRoomFromBooking = async (req, res) => {
    try {
        const { bookingId, roomId } = req.params;
        
        const result = await pool.query(
            'DELETE FROM room_bookings WHERE booking_id = $1 AND room_id = $2 RETURNING *',
            [bookingId, roomId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Room assignment not found' });
        }
        
        res.json({ 
            success: true, 
            message: 'Room removed from booking successfully',
            data: result.rows[0] 
        });
    } catch (error) {
        console.error('Error removing room from booking:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getAllBookings,
    getBookingById,
    createBooking,
    updateBooking,
    deleteBooking,
    getBookingPayment,
    assignRoomToBooking,
    removeRoomFromBooking
};
