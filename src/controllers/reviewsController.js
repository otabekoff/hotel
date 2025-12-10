const pool = require('../config/db');

// Get all reviews
const getAllReviews = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT rev.*, 
                    r.room_number, r.floor, rt.name as room_type_name,
                    c.first_name, c.last_name, c.email
             FROM reviews rev
             JOIN rooms r ON rev.room_id = r.id
             JOIN room_types rt ON r.room_type_id = rt.id
             JOIN customers c ON rev.customer_id = c.id
             ORDER BY rev.created_at DESC`
        );
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Get single review by ID with room and customer info
const getReviewById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT rev.*, 
                    r.room_number, r.floor, r.price_per_night, rt.name as room_type_name, rt.amenities,
                    c.first_name, c.last_name, c.email
             FROM reviews rev
             JOIN rooms r ON rev.room_id = r.id
             JOIN room_types rt ON r.room_type_id = rt.id
             JOIN customers c ON rev.customer_id = c.id
             WHERE rev.id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching review:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Create review for a room by a customer
const createReview = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { customer_id, rating, comment } = req.body;
        
        if (!customer_id || !rating) {
            return res.status(400).json({ 
                success: false, 
                message: 'customer_id and rating are required' 
            });
        }
        
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ 
                success: false, 
                message: 'Rating must be between 1 and 5' 
            });
        }
        
        // Check if room exists
        const roomCheck = await pool.query('SELECT id FROM rooms WHERE id = $1', [roomId]);
        if (roomCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }
        
        // Check if customer exists
        const customerCheck = await pool.query('SELECT id FROM customers WHERE id = $1', [customer_id]);
        if (customerCheck.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid customer_id' });
        }
        
        const result = await pool.query(
            `INSERT INTO reviews (room_id, customer_id, rating, comment) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [roomId, customer_id, rating, comment]
        );
        
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Update review
const updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        
        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Rating must be between 1 and 5' 
            });
        }
        
        const result = await pool.query(
            `UPDATE reviews 
             SET rating = COALESCE($1, rating),
                 comment = COALESCE($2, comment),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 RETURNING *`,
            [rating, comment, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Delete review
const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM reviews WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        
        res.json({ success: true, message: 'Review deleted successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getAllReviews,
    getReviewById,
    createReview,
    updateReview,
    deleteReview
};
