const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/paymentsController');

router.get('/', paymentsController.getAllPayments);
router.get('/:id', paymentsController.getPaymentById);
router.put('/:id', paymentsController.updatePayment);
router.get('/:id/booking', paymentsController.getBookingForPayment);

module.exports = router;
