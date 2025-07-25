const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGODB_URI = 'mongodb+srv://QUQULONDON:London@cluster0.8rftzlr.mongodb.net/QUQU';

async function createAdminUser() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully to MongoDB');

        // Delete existing admin if exists
        await User.deleteOne({ email: 'admin@blur.com' });
        console.log('Deleted existing admin user if any');

        // Create new admin user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        const adminUser = new User({
            name: 'Admin User',
            email: 'admin@blur.com',
            password: hashedPassword,
            isAdmin: true,
            role: 'admin'
        });

        await adminUser.save();
        console.log('New admin user created successfully');
        console.log('Email:', adminUser.email);
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
        process.exit(0);
    }
}

createAdminUser(); 