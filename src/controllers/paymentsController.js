const pool = require('../config/db');

// Get all payments
const getAllPayments = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, b.check_in_date, b.check_out_date, b.status as booking_status,
                    c.first_name, c.last_name, c.email
             FROM payments p
             JOIN bookings b ON p.booking_id = b.id
             JOIN customers c ON b.customer_id = c.id
             ORDER BY p.payment_date DESC`
        );
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Get single payment by ID
const getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT p.*, b.check_in_date, b.check_out_date, b.status as booking_status, b.total_amount as booking_total,
                    c.first_name, c.last_name, c.email, c.phone
             FROM payments p
             JOIN bookings b ON p.booking_id = b.id
             JOIN customers c ON b.customer_id = c.id
             WHERE p.id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Create payment for a booking
const createPaymentForBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { amount, payment_method, payment_status, transaction_id } = req.body;
        
        // Check if booking exists
        const bookingCheck = await pool.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
        if (bookingCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        
        // Check if payment already exists for this booking
        const paymentCheck = await pool.query('SELECT * FROM payments WHERE booking_id = $1', [bookingId]);
        if (paymentCheck.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Payment already exists for this booking. Use PUT to update.' 
            });
        }
        
        if (!amount || !payment_method) {
            return res.status(400).json({ 
                success: false, 
                message: 'amount and payment_method are required' 
            });
        }
        
        const result = await pool.query(
            `INSERT INTO payments (booking_id, amount, payment_method, payment_status, transaction_id) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [bookingId, amount, payment_method, payment_status || 'pending', transaction_id]
        );
        
        // Update booking status to confirmed if payment is completed
        if (payment_status === 'completed') {
            await pool.query(
                "UPDATE bookings SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                [bookingId]
            );
        }
        
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Update payment
const updatePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, payment_method, payment_status, transaction_id } = req.body;
        
        const result = await pool.query(
            `UPDATE payments 
             SET amount = COALESCE($1, amount),
                 payment_method = COALESCE($2, payment_method),
                 payment_status = COALESCE($3, payment_status),
                 transaction_id = COALESCE($4, transaction_id),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5 RETURNING *`,
            [amount, payment_method, payment_status, transaction_id, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }
        
        // Update booking status if payment is completed
        if (payment_status === 'completed') {
            await pool.query(
                "UPDATE bookings SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                [result.rows[0].booking_id]
            );
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Get booking info for a payment
const getPaymentBooking = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if payment exists
        const paymentCheck = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
        if (paymentCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }
        
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
            [paymentCheck.rows[0].booking_id]
        );
        
        res.json({
            success: true,
            payment: paymentCheck.rows[0],
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching payment booking:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getAllPayments,
    getPaymentById,
    createPaymentForBooking,
    updatePayment,
    getPaymentBooking
};
