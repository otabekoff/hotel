const express = require('express');
const router = express.Router();
const {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerBookings,
    getCustomerReviews
} = require('../controllers/customersController');

// Basic CRUD routes
router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

// Relational endpoints
router.get('/:id/bookings', getCustomerBookings);
router.get('/:id/reviews', getCustomerReviews);

module.exports = router;
