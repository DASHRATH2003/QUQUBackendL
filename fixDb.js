const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function fixDatabase() {
    try {
        // Connect to MongoDB
        const uri = 'mongodb://localhost:27017/blur-ecommerce';
        console.log('Connecting to MongoDB at:', uri);
        
        await mongoose.connect(uri);
        console.log('Connected to MongoDB successfully');

        // List all databases
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();
        console.log('\nAvailable databases:', dbs.databases.map(db => db.name));

        // List all collections in current database
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\nCollections in current database:', collections.map(c => c.name));

        // Check for users collection
        const users = await User.find({});
        console.log('\nFound users:', users.length);
        console.log('Users:', users.map(u => ({ 
            email: u.email, 
            isAdmin: u.isAdmin, 
            role: u.role 
        })));

        // Delete existing admin user if exists
        await User.deleteOne({ email: 'admin@blur.com' });
        console.log('\nDeleted existing admin user');

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
        console.log('\nCreated new admin user');

        // Verify admin user
        const verifyAdmin = await User.findOne({ email: 'admin@blur.com' });
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

fixDatabase(); 