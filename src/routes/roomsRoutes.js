const express = require('express');
const router = express.Router();
const {
    getAllRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom,
    getRoomReviews,
    getRoomBookings
} = require('../controllers/roomsController');
const { createReview } = require('../controllers/reviewsController');

// Basic CRUD routes
router.get('/', getAllRooms);
router.get('/:id', getRoomById);
router.post('/', createRoom);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);

// Relational endpoints
router.get('/:id/reviews', getRoomReviews);
router.get('/:id/bookings', getRoomBookings);

// Create review for a room
router.post('/:roomId/reviews', createReview);

module.exports = router;
