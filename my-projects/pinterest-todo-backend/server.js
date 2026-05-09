const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Simple test route
app.get('/', (req, res) => {
  res.json({ message: 'Pinterest Todo API is running!' });
});

// Register route (directly in server.js for testing)
app.post('/api/auth/register', async (req, res) => {
  console.log('📝 Register request:', req.body);
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    const User = require('./models/User');
    
    // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    user = new User({ username, email, password });
    await user.save();
    
    const jwt = require('jsonwebtoken');
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
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Login route
app.post('/api/auth/login', async (req, res) => {
  console.log('🔐 Login request:', req.body.username);
  try {
    const { username, password } = req.body;
    const User = require('./models/User');
    const jwt = require('jsonwebtoken');
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
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
        followers: user.followers.length,
        following: user.following.length,
        badge: user.badge,
        totalCompleted: user.totalCompleted
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get user route
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ message: 'No token' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    const User = require('./models/User');
    const user = await User.findById(decoded.userId).select('-password');
    
    res.json({
      ...user.toObject(),
      followers: user.followers.length,
      following: user.following.length
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Tasks routes
app.get('/api/tasks', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token' });
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    const Task = require('./models/Task');
    const tasks = await Task.find({ user: decoded.userId }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token' });
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    const Task = require('./models/Task');
    const { text } = req.body;
    const task = new Task({ user: decoded.userId, text, completed: false });
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token' });
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    const Task = require('./models/Task');
    const task = await Task.findOne({ _id: req.params.id, user: decoded.userId });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    task.completed = !task.completed;
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token' });
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    const Task = require('./models/Task');
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: decoded.userId });
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});