const pool = require('../config/db');

// Get all customers
const getAllCustomers = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM customers ORDER BY id');
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Get single customer by ID
const getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Create new customer
const createCustomer = async (req, res) => {
    try {
        const { first_name, last_name, email, phone, address, id_type, id_number } = req.body;
        
        if (!first_name || !last_name || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'first_name, last_name, and email are required' 
            });
        }
        
        const result = await pool.query(
            `INSERT INTO customers (first_name, last_name, email, phone, address, id_type, id_number) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [first_name, last_name, email, phone, address, id_type, id_number]
        );
        
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating customer:', error);
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Update customer
const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, email, phone, address, id_type, id_number } = req.body;
        
        const result = await pool.query(
            `UPDATE customers 
             SET first_name = COALESCE($1, first_name),
                 last_name = COALESCE($2, last_name),
                 email = COALESCE($3, email),
                 phone = COALESCE($4, phone),
                 address = COALESCE($5, address),
                 id_type = COALESCE($6, id_type),
                 id_number = COALESCE($7, id_number),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $8 RETURNING *`,
            [first_name, last_name, email, phone, address, id_type, id_number, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating customer:', error);
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Delete customer
const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        
        res.json({ success: true, message: 'Customer deleted successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Get all bookings of a customer with rooms info
const getCustomerBookings = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if customer exists
        const customerCheck = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
        if (customerCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        
        const result = await pool.query(
            `SELECT b.*, 
                    json_agg(
                        json_build_object(
                            'room_id', r.id,
                            'room_number', r.room_number,
                            'room_type', rt.name,
                            'floor', r.floor,
                            'price_per_night', rb.price_per_night
                        )
                    ) as rooms
             FROM bookings b
             LEFT JOIN room_bookings rb ON b.id = rb.booking_id
             LEFT JOIN rooms r ON rb.room_id = r.id
             LEFT JOIN room_types rt ON r.room_type_id = rt.id
             WHERE b.customer_id = $1
             GROUP BY b.id
             ORDER BY b.check_in_date DESC`,
            [id]
        );
        
        res.json({
            success: true,
            customer: customerCheck.rows[0],
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching customer bookings:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Get all reviews by a customer with room info
const getCustomerReviews = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if customer exists
        const customerCheck = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
        if (customerCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        
        const result = await pool.query(
            `SELECT rev.*, r.room_number, r.floor, rt.name as room_type_name
             FROM reviews rev
             JOIN rooms r ON rev.room_id = r.id
             JOIN room_types rt ON r.room_type_id = rt.id
             WHERE rev.customer_id = $1
             ORDER BY rev.created_at DESC`,
            [id]
        );
        
        res.json({
            success: true,
            customer: customerCheck.rows[0],
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching customer reviews:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerBookings,
    getCustomerReviews
};
