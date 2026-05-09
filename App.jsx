import { useState, useEffect } from 'react';
import './App.css';

// API Configuration
const API_URL = 'http://localhost:5000/api';

// Helper function for API calls
const apiCall = async (endpoint, method = 'GET', body = null, token = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['x-auth-token'] = token;
  }
  
  const options = {
    method,
    headers,
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  
  return data;
};

function App() {
  const [tasks, setTasks] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [newTaskText, setNewTaskText] = useState('');
  
  // User state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [badge, setBadge] = useState('bronze');
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load user from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      const user = JSON.parse(storedUser);
      setUsername(user.username);
      setFollowers(user.followers);
      setFollowing(user.following);
      setBadge(user.badge);
      setIsLoggedIn(true);
      fetchTasks(storedToken);
    }
  }, []);

  // Fetch tasks from backend
  const fetchTasks = async (authToken) => {
    try {
      const tasksData = await apiCall('/tasks', 'GET', null, authToken);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  // Handle login/register
  const handleAuth = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    
    if (isRegistering && !email.trim()) {
      setError('Email is required for registration');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const endpoint = isRegistering ? '/auth/register' : '/auth/login';
      const body = isRegistering 
        ? { username, email, password }
        : { username, password };
      
      const data = await apiCall(endpoint, 'POST', body);
      
      // Save token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUsername(data.user.username);
      setFollowers(data.user.followers);
      setFollowing(data.user.following);
      setBadge(data.user.badge);
      setIsLoggedIn(true);
      setShowLoginModal(false);
      
      // Fetch tasks after login
      await fetchTasks(data.token);
      
      // Reset form
      setUsername('');
      setEmail('');
      setPassword('');
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setToken(null);
    setTasks([]);
    setUsername('');
    setFollowers(0);
    setFollowing(0);
    setBadge('bronze');
  };

  // Add task
  const addTask = async () => {
    if (!newTaskText.trim()) return;
    
    try {
      const newTask = await apiCall('/tasks', 'POST', { text: newTaskText }, token);
      setTasks([newTask, ...tasks]);
      setNewTaskText('');
      if (currentFilter === 'completed') setCurrentFilter('all');
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  // Toggle task completion
  const toggleTask = async (taskId) => {
    try {
      const updatedTask = await apiCall(`/tasks/${taskId}`, 'PUT', null, token);
      setTasks(tasks.map(task => 
        task._id === taskId ? updatedTask : task
      ));
      
      // Update badge if needed (refetch user data)
      const userData = await apiCall('/auth/me', 'GET', null, token);
      setBadge(userData.badge);
      setFollowers(userData.followers);
      setFollowing(userData.following);
      localStorage.setItem('user', JSON.stringify(userData));
      
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  // Delete task
  const deleteTask = async (taskId) => {
    try {
      await apiCall(`/tasks/${taskId}`, 'DELETE', null, token);
      setTasks(tasks.filter(task => task._id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const getFilteredTasks = () => {
    if (currentFilter === 'all') return tasks;
    if (currentFilter === 'active') return tasks.filter(t => !t.completed);
    if (currentFilter === 'completed') return tasks.filter(t => t.completed);
    return tasks;
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const filteredTasks = getFilteredTasks();
  
  const getBadgeInfo = () => {
    switch(badge) {
      case 'gold':
        return { icon: '🏆', color: '#FFD700', name: 'Gold Member', emoji: '👑' };
      case 'silver':
        return { icon: '🥈', color: '#C0C0C0', name: 'Silver Member', emoji: '⭐' };
      default:
        return { icon: '🥉', color: '#CD7F32', name: 'Bronze Member', emoji: '🌱' };
    }
  };
  
  const badgeInfo = getBadgeInfo();
  const nextBadgeThreshold = badge === 'bronze' ? 10 : badge === 'silver' ? 20 : 20;
  const progressToNext = badge === 'gold' ? 100 : Math.min(100, (completedTasks / nextBadgeThreshold) * 100);

  // If not logged in, show login prompt
  if (!isLoggedIn) {
    return (
      <div className="app-container">
        <div className="brand-section">
          <h1>
            <i className="fab fa-pinterest"></i> 
            Pin&nbsp;Task
          </h1>
          <div className="sub">✦ curate your daily inspiration board ✦</div>
        </div>
        
        <div className="login-prompt">
          <i className="fas fa-sign-in-alt"></i>
          <h2>Welcome to PinTask!</h2>
          <p>Login or Sign up to start organizing your tasks</p>
          <button className="primary-btn" onClick={() => setShowLoginModal(true)}>
            <i className="fas fa-arrow-right"></i> Get Started
          </button>
        </div>

        {/* Login Modal */}
        {showLoginModal && (
          <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2><i className="fab fa-pinterest"></i> {isRegistering ? 'Create Account' : 'Welcome Back'}</h2>
                <button className="modal-close" onClick={() => setShowLoginModal(false)}>×</button>
              </div>
              <div className="modal-body">
                {error && <div className="error-message">{error}</div>}
                
                <input 
                  type="text" 
                  placeholder="Username" 
                  className="modal-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                
                {isRegistering && (
                  <input 
                    type="email" 
                    placeholder="Email" 
                    className="modal-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                )}
                
                <input 
                  type="password" 
                  placeholder="Password" 
                  className="modal-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                />
                
                <button className="modal-login-btn" onClick={handleAuth} disabled={loading}>
                  {loading ? 'Processing...' : (isRegistering ? 'Sign Up' : 'Login')}
                </button>
                
                <p className="modal-switch">
                  {isRegistering ? 'Already have an account?' : "Don't have an account?"}
                  <button onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError('');
                  }}>
                    {isRegistering ? 'Login' : 'Sign Up'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Logged in view
  return (
    <div className="app-container">
      {/* User Bar */}
      <div className="user-bar">
        <div className="user-info">
          <div className="user-avatar">
            <i className="fas fa-user-circle"></i>
          </div>
          <div className="user-details">
            <span className="username">@{username}</span>
            <div className="badge-display" style={{ color: badgeInfo.color }}>
              {badgeInfo.emoji} {badgeInfo.name}
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
        
        <div className="social-stats">
          <div className="stat-item">
            <i className="fas fa-users"></i>
            <span className="stat-value">{followers}</span>
            <span className="stat-label">Followers</span>
          </div>
          <div className="stat-item">
            <i className="fas fa-user-friends"></i>
            <span className="stat-value">{following}</span>
            <span className="stat-label">Following</span>
          </div>
          <div className="stat-item">
            <i className="fas fa-tasks"></i>
            <span className="stat-value">{completedTasks}</span>
            <span className="stat-label">Tasks Done</span>
          </div>
        </div>
      </div>

      {/* Badge Progress */}
      {badge !== 'gold' && (
        <div className="progress-section">
          <div className="progress-header">
            <span>Progress to {badge === 'bronze' ? 'Silver' : 'Gold'} Badge</span>
            <span>{completedTasks}/{nextBadgeThreshold} tasks</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progressToNext}%` }}></div>
          </div>
        </div>
      )}

      <div className="brand-section">
        <h1>
          <i className="fab fa-pinterest"></i> 
          Pin&nbsp;Task
        </h1>
        <div className="sub">✦ curate your daily inspiration board ✦</div>
      </div>

      <div className="stats-row">
        <div className="stats">
          <i className="far fa-calendar-alt"></i> total tasks: <span>{totalTasks}</span>   |  
          <i className="fas fa-check-circle"></i> done: <span>{completedTasks}</span>
        </div>
        <div className="filter-buttons">
          <button 
            className={`filter-chip ${currentFilter === 'all' ? 'active' : ''}`}
            onClick={() => setCurrentFilter('all')}
          >
            All pins
          </button>
          <button 
            className={`filter-chip ${currentFilter === 'active' ? 'active' : ''}`}
            onClick={() => setCurrentFilter('active')}
          >
            To do
          </button>
          <button 
            className={`filter-chip ${currentFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setCurrentFilter('completed')}
          >
            Completed
          </button>
        </div>
      </div>

      <div className="todo-grid">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <i className="far fa-smile-wink"></i>
            <p>✨ No tasks here yet... add a new pin! ✨</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div 
              key={task._id} 
              className={`task-card ${task.completed ? 'completed' : ''}`}
              onClick={() => toggleTask(task._id)}
            >
              <div className="card-inner">
                <div className="task-header">
                  <div className="task-text">{task.text}</div>
                  <div className="task-actions">
                    <button 
                      className="action-btn check-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTask(task._id);
                      }}
                    >
                      {task.completed ? 
                        <i className="fas fa-check-circle"></i> : 
                        <i className="far fa-circle"></i>
                      }
                    </button>
                    <button 
                      className="action-btn delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTask(task._id);
                      }}
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
                <div className="task-footer">
                  <div className="date-badge">
                    <i className="far fa-clock"></i> 
                    {task.createdAt ? new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'recent'}
                  </div>
                  <div className="pin-icon"><i className="fas fa-thumbtack"></i></div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="add-card-section">
        <input 
          type="text" 
          className="add-input" 
          placeholder="Write your new idea... e.g., 'Buy vintage poster' or 'Sketch new layout' ✨"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTask()}
        />
        <button className="primary-btn" onClick={addTask}>
          <i className="fas fa-plus-circle"></i> Add new pin
        </button>
      </div>
      <footer>
        <i className="fas fa-thumbtack"></i> Complete tasks to earn badges! • Tasks saved to cloud ☁️
      </footer>
    </div>
  );
}

export default App;