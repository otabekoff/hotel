const express = require('express');
const router = express.Router();
const {
    getAllReviews,
    getReviewById,
    updateReview,
    deleteReview
} = require('../controllers/reviewsController');

// Basic routes
router.get('/', getAllReviews);
router.get('/:id', getReviewById);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);

module.exports = router;
