const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'creator'],
    default: 'user'
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  notificationSettings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    orderUpdates: {
      type: Boolean,
      default: true
    },
    productUpdates: {
      type: Boolean,
      default: true
    },
    securityAlerts: {
      type: Boolean,
      default: true
    }
  },
  adminPreferences: {
    darkMode: {
      type: Boolean,
      default: false
    },
    compactView: {
      type: Boolean,
      default: false
    },
    autoLogout: {
      type: Number,
      default: 30,
      min: 5,
      max: 120
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema); 