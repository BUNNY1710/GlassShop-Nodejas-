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

// CORS Configuration
const getAllowedOrigins = () => {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map(o => o.trim());
  }
  // Default allowed origins for development
  return [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://13.60.53.94',
    'http://16.16.73.29'  // Current EC2 IP
  ];
};

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      // In development, allow all origins; in production, be strict
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('Not allowed by CORS'));
      } else {
        callback(null, true); // Allow in development
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['Authorization', 'Content-Type'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  preflightContinue: false,
  maxAge: 86400 // 24 hours
};

// Middleware - CORS must be before bodyParser
app.use(cors(corsOptions));

// Handle preflight requests explicitly for all routes
app.options('*', cors(corsOptions));

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

    // Listen on all interfaces (0.0.0.0) so nginx can proxy to it
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
      console.log(`📡 Accessible at http://localhost:${PORT} and http://127.0.0.1:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
