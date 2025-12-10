const pool = require('../config/db');

// Get all room types
const getAllRoomTypes = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM room_types ORDER BY id');
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching room types:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Get single room type by ID
const getRoomTypeById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM room_types WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Room type not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching room type:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Create new room type
const createRoomType = async (req, res) => {
    try {
        const { name, description, base_price, max_occupancy, amenities } = req.body;
        
        if (!name || !base_price) {
            return res.status(400).json({ success: false, message: 'Name and base_price are required' });
        }
        
        const result = await pool.query(
            `INSERT INTO room_types (name, description, base_price, max_occupancy, amenities) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, description, base_price, max_occupancy || 2, amenities || []]
        );
        
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating room type:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Update room type
const updateRoomType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, base_price, max_occupancy, amenities } = req.body;
        
        const result = await pool.query(
            `UPDATE room_types 
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 base_price = COALESCE($3, base_price),
                 max_occupancy = COALESCE($4, max_occupancy),
                 amenities = COALESCE($5, amenities),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6 RETURNING *`,
            [name, description, base_price, max_occupancy, amenities, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Room type not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating room type:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Delete room type
const deleteRoomType = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM room_types WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Room type not found' });
        }
        
        res.json({ success: true, message: 'Room type deleted successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting room type:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Get all rooms of a specific room type
const getRoomsByRoomType = async (req, res) => {
    try {
        const { id } = req.params;
        
        // First check if room type exists
        const roomTypeCheck = await pool.query('SELECT * FROM room_types WHERE id = $1', [id]);
        if (roomTypeCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Room type not found' });
        }
        
        const result = await pool.query(
            `SELECT r.*, rt.name as room_type_name, rt.description as room_type_description
             FROM rooms r
             JOIN room_types rt ON r.room_type_id = rt.id
             WHERE r.room_type_id = $1
             ORDER BY r.room_number`,
            [id]
        );
        
        res.json({
            success: true,
            room_type: roomTypeCheck.rows[0],
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching rooms by room type:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getAllRoomTypes,
    getRoomTypeById,
    createRoomType,
    updateRoomType,
    deleteRoomType,
    getRoomsByRoomType
};
