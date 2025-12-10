const express = require('express');
const router = express.Router();
const {
    getAllRoomTypes,
    getRoomTypeById,
    createRoomType,
    updateRoomType,
    deleteRoomType,
    getRoomsByRoomType
} = require('../controllers/roomTypesController');

// Basic CRUD routes
router.get('/', getAllRoomTypes);
router.get('/:id', getRoomTypeById);
router.post('/', createRoomType);
router.put('/:id', updateRoomType);
router.delete('/:id', deleteRoomType);

// Relational endpoint
router.get('/:id/rooms', getRoomsByRoomType);

module.exports = router;
