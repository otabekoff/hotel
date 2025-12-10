const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const roomTypesRoutes = require('./routes/roomTypesRoutes');
const roomsRoutes = require('./routes/roomsRoutes');
const customersRoutes = require('./routes/customersRoutes');
const bookingsRoutes = require('./routes/bookingsRoutes');
const paymentsRoutes = require('./routes/paymentsRoutes');
const reviewsRoutes = require('./routes/reviewsRoutes');

// API routes
app.use('/api/roomtypes', roomTypesRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/reviews', reviewsRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Hotel Management API',
        version: '1.0.0',
        endpoints: {
            roomTypes: '/api/roomtypes',
            rooms: '/api/rooms',
            customers: '/api/customers',
            bookings: '/api/bookings',
            payments: '/api/payments',
            reviews: '/api/reviews'
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API documentation: http://localhost:${PORT}`);
});

module.exports = app;
