const pool = require('../config/db');

// Get all payments
exports.getAllPayments = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM payments');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single payment
exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Payment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update payment
exports.updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_method, payment_status, transaction_id } = req.body;
    const result = await pool.query(
      `UPDATE payments 
       SET amount=$1, payment_method=$2, payment_status=$3, transaction_id=$4 
       WHERE id=$5 RETURNING *`,
      [amount, payment_method, payment_status, transaction_id, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Payment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get booking info for payment
exports.getBookingForPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT b.* FROM bookings b 
       JOIN payments p ON b.id = p.booking_id 
       WHERE p.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Booking not found for this payment' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
