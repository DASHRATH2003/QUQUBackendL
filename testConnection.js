require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function testConnection() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/blur-ecommerce');
        console.log('Successfully connected to MongoDB.');

        // Create admin user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        // First delete any existing admin user
        await User.deleteOne({ email: 'admin@blur.com' });

        // Create new admin user
        const adminUser = new User({
            name: 'Admin User',
            email: 'admin@blur.com',
            password: hashedPassword,
            isAdmin: true,
            role: 'admin'
        });

        await adminUser.save();
        console.log('Admin user created successfully');
        console.log('Email: admin@blur.com');
        console.log('Password: admin123');

        // Verify the user was created
        const verifyUser = await User.findOne({ email: 'admin@blur.com' });
        console.log('\nVerifying created user:');
        console.log('User found:', !!verifyUser);
        console.log('Is Admin:', verifyUser.isAdmin);
        console.log('Role:', verifyUser.role);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

testConnection(); 