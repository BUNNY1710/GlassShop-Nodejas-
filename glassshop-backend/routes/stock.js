const express = require('express');
const router = express.Router();
const { Stock, Glass, StockHistory, User, Shop, AuditLog } = require('../models');
const { Op } = require('sequelize');
const { requireStaff } = require('../middleware/auth');

// Apply auth middleware for all routes (staff and admin)
router.use(requireStaff);

// Get all stock
router.get('/all', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const stocks = await Stock.findAll({
      where: { shopId: user.shopId },
      include: [{ model: Glass, as: 'glass' }]
    });

    res.json(stocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent stock activity
router.get('/recent', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const stocks = await Stock.findAll({
      where: { shopId: user.shopId },
      include: [{ model: Glass, as: 'glass' }],
      order: [['updatedAt', 'DESC']],
      limit: 3
    });

    const activities = stocks.map(stock => ({
      id: stock.id,
      glassType: stock.glass?.type || 'N/A',
      standNo: stock.standNo,
      quantity: stock.quantity,
      height: stock.height,
      width: stock.width,
      updatedAt: stock.updatedAt
    }));

    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update stock (add/remove)
router.post('/update', async (req, res) => {
  try {
    const { glassType, unit, standNo, quantity, action, height, width } = req.body;

    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json('❌ User not found or not linked to a shop');
    }

    // Parse thickness from glass type (e.g., "5MM" -> 5)
    const thickness = parseInt(glassType.replace('MM', '').replace('mm', '').trim());

    // Find or create glass
    let glass = await Glass.findOne({
      where: {
        type: glassType.toUpperCase(),
        thickness: thickness,
        unit: unit || 'MM'
      }
    });

    if (!glass) {
      glass = await Glass.create({
        type: glassType.toUpperCase(),
        thickness: thickness,
        unit: unit || 'MM'
      });
    }

    // Find or create stock
    let stock = await Stock.findOne({
      where: {
        glassId: glass.id,
        standNo: standNo,
        shopId: user.shopId,
        height: height || null,
        width: width || null
      }
    });

    if (!stock) {
      stock = await Stock.create({
        glassId: glass.id,
        standNo: standNo,
        shopId: user.shopId,
        quantity: 0,
        minQuantity: 5, // Must be > 0 per database constraint (default is 5)
        height: height,
        width: width
      });
    }

    // Update quantity based on action
    if (action === 'ADD') {
      stock.quantity += quantity;
    } else if (action === 'REMOVE') {
      stock.quantity = Math.max(0, stock.quantity - quantity);
    }

    await stock.save();

    // Create stock history
    await StockHistory.create({
      glassId: glass.id,
      standNo: standNo,
      quantity: quantity,
      action: action,
      shopId: user.shopId
    });

    // Create audit log
    await AuditLog.create({
      username: user.userName,
      role: user.role,
      action: action,
      glassType: glassType,
      quantity: quantity,
      standNo: standNo,
      height: height,
      width: width,
      shopId: user.shopId,
      timestamp: new Date()
    });

    // Return string message as expected by frontend
    res.json(`✅ Stock ${action === 'ADD' ? 'added' : 'removed'} successfully`);
  } catch (error) {
    console.error('Error updating stock:', error);
    // Return error as string to match frontend expectation
    const errorMessage = error.response?.data?.error || error.message || 'Failed to update stock';
    res.status(500).json(`❌ ${errorMessage}`);
  }
});

// Transfer stock
router.post('/transfer', async (req, res) => {
  try {
    const { glassType, unit, fromStand, toStand, quantity, height, width } = req.body;

    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json('❌ User not found or not linked to a shop');
    }

    const thickness = parseInt(glassType.replace('MM', '').replace('mm', '').trim());

    let glass = await Glass.findOne({
      where: {
        type: glassType.toUpperCase(),
        thickness: thickness,
        unit: unit || 'MM'
      }
    });

    if (!glass) {
      return res.status(404).json('❌ Glass type not found');
    }

    // Find source stock
    const sourceStock = await Stock.findOne({
      where: {
        glassId: glass.id,
        standNo: fromStand,
        shopId: user.shopId,
        height: height || null,
        width: width || null
      }
    });

    if (!sourceStock || sourceStock.quantity < quantity) {
      return res.status(400).json('❌ Insufficient stock in source stand');
    }

    // Find or create destination stock
    let destStock = await Stock.findOne({
      where: {
        glassId: glass.id,
        standNo: toStand,
        shopId: user.shopId,
        height: height || null,
        width: width || null
      }
    });

    if (!destStock) {
      destStock = await Stock.create({
        glassId: glass.id,
        standNo: toStand,
        shopId: user.shopId,
        quantity: 0,
        minQuantity: sourceStock.minQuantity,
        height: height,
        width: width
      });
    }

    // Transfer quantity
    sourceStock.quantity -= quantity;
    destStock.quantity += quantity;

    await sourceStock.save();
    await destStock.save();

    // Create audit log
    await AuditLog.create({
      username: user.userName,
      role: user.role,
      action: 'TRANSFER',
      glassType: glassType,
      quantity: quantity,
      fromStand: fromStand,
      toStand: toStand,
      height: height,
      width: width,
      shopId: user.shopId,
      timestamp: new Date()
    });

    // Return string message as expected by frontend
    res.json('✅ Stock transferred successfully');
  } catch (error) {
    console.error('Error transferring stock:', error);
    // Return error as string to match frontend expectation
    const errorMessage = error.response?.data?.error || error.message || 'Transfer failed';
    res.status(500).json(`❌ ${errorMessage}`);
  }
});

// Undo last action (simplified - just returns message)
router.post('/undo', async (req, res) => {
  res.json('✅ Undo functionality - implement based on your requirements');
});

// Low stock alerts
router.get('/alert/low', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user || !user.shopId) {
      return res.status(404).json({ error: 'User not found or not linked to a shop' });
    }

    const lowStocks = await Stock.findAll({
      where: {
        shopId: user.shopId,
        quantity: { [Op.lte]: { [Op.col]: 'Stock.min_quantity' } }
      },
      include: [{ model: Glass, as: 'glass' }]
    });

    res.json(lowStocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI explanations (simplified)
router.get('/ai/explain', async (req, res) => {
  res.json({ message: 'AI explanation service - implement based on your requirements' });
});

// Reorder suggestions (simplified)
router.get('/reorder/suggest', async (req, res) => {
  res.json({ message: 'Reorder suggestions - implement based on your requirements' });
});

module.exports = router;
