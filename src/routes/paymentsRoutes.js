const express = require('express');
const router = express.Router();
const {
    getAllPayments,
    getPaymentById,
    updatePayment,
    getPaymentBooking
} = require('../controllers/paymentsController');

// Basic routes
router.get('/', getAllPayments);
router.get('/:id', getPaymentById);
router.put('/:id', updatePayment);

// Relational endpoint
router.get('/:id/booking', getPaymentBooking);

module.exports = router;
