const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
});

// Update badge when task completion changes
TaskSchema.post('save', async function(doc) {
  if (doc.completed) {
    const User = mongoose.model('User');
    const Task = mongoose.model('Task');
    const completedCount = await Task.countDocuments({ 
      user: doc.user, 
      completed: true 
    });
    
    const user = await User.findById(doc.user);
    if (user) {
      user.totalCompleted = completedCount;
      
      // Update badge based on completed tasks
      if (completedCount >= 20) {
        user.badge = 'gold';
      } else if (completedCount >= 10) {
        user.badge = 'silver';
      } else {
        user.badge = 'bronze';
      }
      
      await user.save();
    }
  }
});

module.exports = mongoose.model('Task', TaskSchema);