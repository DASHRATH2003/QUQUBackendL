const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth'); // Added auth middleware

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    // Create token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key-here',
      { expiresIn: '24h' }
    );

    // Return user data without password
    const userToReturn = user.toObject();
    delete userToReturn.password;

    res.status(201).json({ token, ...userToReturn });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('Received login request');
    console.log('Request body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);

    const { email, password } = req.body;

    // Validate request body
    if (!email || !password) {
      console.log('Missing required fields:', { 
        hasEmail: !!email, 
        hasPassword: !!password,
        emailType: typeof email,
        passwordType: typeof password
      });
      return res.status(400).json({
        message: 'Missing required fields',
        details: {
          email: !email ? 'Email is required' : undefined,
          password: !password ? 'Password is required' : undefined
        }
      });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('User found:', !!user);
    
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(400).json({
        message: 'Invalid credentials',
        details: 'User not found'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);
    
    if (!isMatch) {
      console.log('Invalid password for user:', email);
      return res.status(400).json({
        message: 'Invalid credentials',
        details: 'Invalid password'
      });
    }

    // Create token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key-here',
      { expiresIn: '24h' }
    );

    // Return user data without password
    const userToReturn = user.toObject();
    delete userToReturn.password;

    console.log('Login successful:', {
      email: userToReturn.email,
      isAdmin: userToReturn.isAdmin,
      role: userToReturn.role
    });

    res.json({
      token,
      ...userToReturn,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Server error',
      details: error.message
    });
  }
});

// Verify token
router.get('/verify-token', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ valid: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ valid: false, message: 'User not found' });
    }

    res.json({ valid: true });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ valid: false, message: error.message });
  }
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Profile request successful:', {
      email: user.email,
      isAdmin: user.isAdmin,
      role: user.role
    });

    res.json(user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({ message: 'Invalid token', details: error.message });
  }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is already taken by another user
    if (email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    user.name = name || user.name;
    user.email = email || user.email;
    await user.save();

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Error changing password', error: error.message });
  }
});

module.exports = router; 