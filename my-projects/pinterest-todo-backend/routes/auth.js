const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  console.log('📝 Register request received:', req.body);
  try {
    const { username, email, password } = req.body;
    
    // Check if all fields are present
    if (!username || !email || !password) {
      console.log('❌ Missing fields');
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      console.log('❌ User already exists');
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    user = new User({ username, email, password });
    await user.save();
    console.log('✅ User created successfully:', user._id);
    
    // Create token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        followers: 0,
        following: 0,
        badge: 'bronze',
        totalCompleted: 0
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  console.log('🔐 Login request received:', req.body.username);
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      console.log('❌ User not found');
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Invalid password');
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Create token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );
    
    console.log('✅ Login successful:', username);
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        followers: user.followers.length,
        following: user.following.length,
        badge: user.badge,
        totalCompleted: user.totalCompleted
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).select('-password');
    res.json({
      ...user.toObject(),
      followers: user.followers.length,
      following: user.following.length
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;