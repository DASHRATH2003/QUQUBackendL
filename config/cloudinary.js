const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with your credentials
cloudinary.config({
    cloud_name: 'dqspnxe8q',
    api_key: '545181832128251',
    api_secret: 'y6hPhdt8U_Vp903J6XziLleUJDg'
});

// Function to upload image to Cloudinary
const uploadToCloudinary = async (file) => {
    try {
        console.log('Attempting to upload file to Cloudinary:', file.originalname);
        
        // Upload the file to Cloudinary
        const result = await cloudinary.uploader.upload(file.path, {
            folder: 'blur-products', // This will create a folder in your Cloudinary account
            use_filename: true,
            unique_filename: true,
            overwrite: true,
            resource_type: "auto"
        });

        console.log('File uploaded successfully to Cloudinary');
        console.log('Cloudinary URL:', result.secure_url);
        
        return result.secure_url;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw new Error('Failed to upload image to Cloudinary: ' + error.message);
    }
};

module.exports = { uploadToCloudinary, cloudinary }; 