const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function testDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/blur-ecommerce');
        console.log('Connected to MongoDB successfully');

        // Check if admin user exists
        const adminUser = await User.findOne({ email: 'admin@blur.com' });
        
        if (adminUser) {
            console.log('Admin user exists:', {
                email: adminUser.email,
                isAdmin: adminUser.isAdmin,
                role: adminUser.role
            });

            // Create new admin if needed
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            
            // Update admin user
            adminUser.password = hashedPassword;
            adminUser.isAdmin = true;
            adminUser.role = 'admin';
            await adminUser.save();
            
            console.log('Admin user updated successfully');
        } else {
            // Create new admin user
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            
            const newAdmin = new User({
                name: 'Admin User',
                email: 'admin@blur.com',
                password: hashedPassword,
                isAdmin: true,
                role: 'admin'
            });
            
            await newAdmin.save();
            console.log('New admin user created successfully');
        }

        // Verify admin user
        const verifyAdmin = await User.findOne({ email: 'admin@blur.com' });
        console.log('\nVerified admin user:', {
            email: verifyAdmin.email,
            isAdmin: verifyAdmin.isAdmin,
            role: verifyAdmin.role
        });

    } catch (error) {
        console.error('Database error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

testDatabase(); 