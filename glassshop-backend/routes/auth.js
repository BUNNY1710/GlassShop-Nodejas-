const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User, Shop } = require('../models');
const { generateToken } = require('../utils/jwt');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// Register shop (Public)
router.post('/register-shop', async (req, res) => {
  try {
    const { username, password, shopName, email } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }
    if (!password || !password.trim()) {
      return res.status(400).json({ error: 'Password is required' });
    }
    if (!shopName || !shopName.trim()) {
      return res.status(400).json({ error: 'Shop name is required' });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ where: { userName: username } });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists. Please choose a different username.' });
    }

    // Create shop
    const shop = await Shop.create({
      shopName,
      email
    });

    // Create admin user
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      userName: username,
      password: hashedPassword,
      role: 'ROLE_ADMIN',
      shopId: shop.id
    });

    res.json({ message: 'Shop registered successfully' });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Username already exists. Please choose a different username.' });
    }
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
});

// Create staff (Admin only)
router.post('/create-staff', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const existingUser = await User.findOne({ where: { userName: username } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      userName: username,
      password: hashedPassword,
      role: 'ROLE_STAFF',
      shopId: admin.shopId
    });

    res.json({ message: 'Staff created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }
    if (!password || !password.trim()) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const user = await User.findOne({ where: { userName: username } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user.userName, user.role);

    res.json({
      token,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed: ' + error.message });
  }
});

// Get profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found: ' + req.user.username });
    }

    res.json({
      username: user.userName,
      role: user.role,
      shopId: user.shop ? user.shop.id : null,
      shopName: user.shop ? user.shop.shopName : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findOne({ where: { userName: req.user.username } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Old password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get staff list (Admin only)
router.get('/staff', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const admin = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const staff = await User.findAll({
      where: {
        shopId: admin.shopId,
        role: 'ROLE_STAFF'
      }
    });

    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete staff (Admin only)
router.delete('/staff/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const admin = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const staff = await User.findByPk(req.params.id);
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    // Security: same shop only
    if (staff.shopId !== admin.shopId) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    await staff.destroy();
    res.json({ message: 'Staff removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
