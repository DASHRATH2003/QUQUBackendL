const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://QUQULONDON:London@cluster0.8rftzlr.mongodb.net/QUQU';

async function testConnection() {
    try {
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(MONGODB_URI);
        console.log('Successfully connected to MongoDB Atlas');

        // List all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\nCollections in database:', collections.map(c => c.name));

        // Check for existing users
        const existingUsers = await User.find({});
        console.log('\nExisting users:', existingUsers.map(user => ({
            email: user.email,
            isAdmin: user.isAdmin,
            role: user.role
        })));

        // Create or update admin user
        const adminEmail = 'admin@blur.com';
        let adminUser = await User.findOne({ email: adminEmail });

        if (adminUser) {
            console.log('\nUpdating existing admin user...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            
            adminUser.password = hashedPassword;
            adminUser.isAdmin = true;
            adminUser.role = 'admin';
            await adminUser.save();
            
            console.log('Admin user updated successfully');
        } else {
            console.log('\nCreating new admin user...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            
            adminUser = new User({
                name: 'Admin User',
                email: adminEmail,
                password: hashedPassword,
                isAdmin: true,
                role: 'admin'
            });
            
            await adminUser.save();
            console.log('Admin user created successfully');
        }

        // Verify admin user
        const verifyAdmin = await User.findOne({ email: adminEmail });
        console.log('\nVerified admin user:', {
            id: verifyAdmin._id,
            email: verifyAdmin.email,
            isAdmin: verifyAdmin.isAdmin,
            role: verifyAdmin.role,
            hasPassword: !!verifyAdmin.password
        });

    } catch (error) {
        console.error('Database error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

testConnection(); 