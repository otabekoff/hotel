const express = require('express');
const router = express.Router();
const {
    getAllBookings,
    getBookingById,
    createBooking,
    updateBooking,
    deleteBooking,
    getBookingPayment,
    assignRoomToBooking,
    removeRoomFromBooking
} = require('../controllers/bookingsController');
const { createPaymentForBooking } = require('../controllers/paymentsController');

// Basic CRUD routes
router.get('/', getAllBookings);
router.get('/:id', getBookingById);
router.post('/', createBooking);
router.put('/:id', updateBooking);
router.delete('/:id', deleteBooking);

// Relational endpoint
router.get('/:id/payment', getBookingPayment);

// Room assignment endpoints
router.post('/:bookingId/rooms/:roomId', assignRoomToBooking);
router.delete('/:bookingId/rooms/:roomId', removeRoomFromBooking);

// Payment endpoint
router.post('/:bookingId/payment', createPaymentForBooking);

module.exports = router;
