const express = require('express');
const router = express.Router();
const { AuditLog, User, Shop } = require('../models');
const { Op } = require('sequelize');
const { requireAdmin, requireStaff } = require('../middleware/auth');

// Get recent audit logs (Admin only)
router.get('/recent', requireAdmin, async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.shopId) {
      // Return empty array if user doesn't have a shop
      return res.json([]);
    }

    const logs = await AuditLog.findAll({
      where: { shopId: user.shopId },
      order: [['timestamp', 'DESC']],
      limit: 100
    });

    res.json(logs || []);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: error.message, details: error.stack });
  }
});

// Get transfer count (Admin and Staff)
router.get('/transfer-count', requireStaff, async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return 0 if user doesn't have a shop
    if (!user.shopId) {
      return res.json({ count: 0 });
    }

    const count = await AuditLog.count({
      where: {
        shopId: user.shopId,
        action: 'TRANSFER'
      }
    });

    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Error fetching transfer count:', error);
    // Return 0 on error to prevent frontend crashes
    res.json({ count: 0 });
  }
});

module.exports = router;
