const pool = require('../config/db');

// Get all rooms with room type info
const getAllRooms = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT r.*, rt.name as room_type_name, rt.description as room_type_description,
                    rt.base_price as room_type_base_price, rt.max_occupancy, rt.amenities
             FROM rooms r
             JOIN room_types rt ON r.room_type_id = rt.id
             ORDER BY r.room_number`
        );
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Get single room by ID with room type info
const getRoomById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT r.*, rt.name as room_type_name, rt.description as room_type_description,
                    rt.base_price as room_type_base_price, rt.max_occupancy, rt.amenities
             FROM rooms r
             JOIN room_types rt ON r.room_type_id = rt.id
             WHERE r.id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching room:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Create new room
const createRoom = async (req, res) => {
    try {
        const { room_number, room_type_id, floor, status, price_per_night } = req.body;
        
        if (!room_number || !room_type_id || !floor || !price_per_night) {
            return res.status(400).json({ 
                success: false, 
                message: 'room_number, room_type_id, floor, and price_per_night are required' 
            });
        }
        
        // Check if room type exists
        const roomTypeCheck = await pool.query('SELECT id FROM room_types WHERE id = $1', [room_type_id]);
        if (roomTypeCheck.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid room_type_id' });
        }
        
        const result = await pool.query(
            `INSERT INTO rooms (room_number, room_type_id, floor, status, price_per_night) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [room_number, room_type_id, floor, status || 'available', price_per_night]
        );
        
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating room:', error);
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: 'Room number already exists' });
        }
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Update room
const updateRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const { room_number, room_type_id, floor, status, price_per_night } = req.body;
        
        // Check if room type exists if provided
        if (room_type_id) {
            const roomTypeCheck = await pool.query('SELECT id FROM room_types WHERE id = $1', [room_type_id]);
            if (roomTypeCheck.rows.length === 0) {
                return res.status(400).json({ success: false, message: 'Invalid room_type_id' });
            }
        }
        
        const result = await pool.query(
            `UPDATE rooms 
             SET room_number = COALESCE($1, room_number),
                 room_type_id = COALESCE($2, room_type_id),
                 floor = COALESCE($3, floor),
                 status = COALESCE($4, status),
                 price_per_night = COALESCE($5, price_per_night),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6 RETURNING *`,
            [room_number, room_type_id, floor, status, price_per_night, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating room:', error);
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: 'Room number already exists' });
        }
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Delete room
const deleteRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM rooms WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }
        
        res.json({ success: true, message: 'Room deleted successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Get all reviews for a room with customer info
const getRoomReviews = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if room exists
        const roomCheck = await pool.query('SELECT * FROM rooms WHERE id = $1', [id]);
        if (roomCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }
        
        const result = await pool.query(
            `SELECT rev.*, c.first_name, c.last_name, c.email
             FROM reviews rev
             JOIN customers c ON rev.customer_id = c.id
             WHERE rev.room_id = $1
             ORDER BY rev.created_at DESC`,
            [id]
        );
        
        res.json({
            success: true,
            room: roomCheck.rows[0],
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching room reviews:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Get all bookings for a room with customer info
const getRoomBookings = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if room exists
        const roomCheck = await pool.query('SELECT * FROM rooms WHERE id = $1', [id]);
        if (roomCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }
        
        const result = await pool.query(
            `SELECT b.*, c.first_name, c.last_name, c.email, c.phone,
                    rb.price_per_night as booked_price
             FROM bookings b
             JOIN room_bookings rb ON b.id = rb.booking_id
             JOIN customers c ON b.customer_id = c.id
             WHERE rb.room_id = $1
             ORDER BY b.check_in_date DESC`,
            [id]
        );
        
        res.json({
            success: true,
            room: roomCheck.rows[0],
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching room bookings:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getAllRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom,
    getRoomReviews,
    getRoomBookings
};
