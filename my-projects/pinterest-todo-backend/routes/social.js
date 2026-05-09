const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Follow a user
router.post('/follow/:userId', auth, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.user);
    
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (currentUser.following.includes(userToFollow._id)) {
      return res.status(400).json({ message: 'Already following' });
    }
    
    currentUser.following.push(userToFollow._id);
    userToFollow.followers.push(currentUser._id);
    
    await currentUser.save();
    await userToFollow.save();
    
    res.json({ 
      message: 'Followed successfully',
      followers: userToFollow.followers.length,
      following: currentUser.following.length
    });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unfollow a user
router.post('/unfollow/:userId', auth, async (req, res) => {
  try {
    const userToUnfollow = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.user);
    
    currentUser.following = currentUser.following.filter(
      id => id.toString() !== userToUnfollow._id.toString()
    );
    userToUnfollow.followers = userToUnfollow.followers.filter(
      id => id.toString() !== currentUser._id.toString()
    );
    
    await currentUser.save();
    await userToUnfollow.save();
    
    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search users
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    const users = await User.find({
      username: { $regex: q, $options: 'i' },
      _id: { $ne: req.user }
    }).select('username badge followers').limit(20);
    
    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile
router.get('/profile/:username', auth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      ...user.toObject(),
      followers: user.followers.length,
      following: user.following.length
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get leaderboard (top users by completed tasks)
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const users = await User.find()
      .select('username badge totalCompleted')
      .sort({ totalCompleted: -1 })
      .limit(10);
    
    res.json(users);
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;