const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { sequelize } = require('./models');
const { authMiddleware } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const stockRoutes = require('./routes/stock');
const customerRoutes = require('./routes/customer');
const quotationRoutes = require('./routes/quotation');
const invoiceRoutes = require('./routes/invoice');
const auditRoutes = require('./routes/audit');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Public routes (no auth required)
app.use('/auth', authRoutes);

// Protected routes (auth required)
app.use('/stock', authMiddleware, stockRoutes);
app.use('/api/customers', authMiddleware, customerRoutes);
app.use('/api/quotations', authMiddleware, quotationRoutes);
app.use('/api/invoices', authMiddleware, invoiceRoutes);
app.use('/audit', authMiddleware, auditRoutes);
app.use('/ai', authMiddleware, aiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'GlassShop Backend API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// Database connection and server start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Sync database (set force: false in production, use migrations instead)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: false });
      console.log('✅ Database models synchronized.');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
