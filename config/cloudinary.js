const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

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
        
        let uploadResult;
        
        if (file.buffer) {
            // Handle buffer upload
            const streamifier = require('streamifier');
            const stream = streamifier.createReadStream(file.buffer);
            
            // Create upload stream
            const uploadPromise = new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'blur-products',
                        resource_type: 'auto'
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                
                stream.pipe(uploadStream);
            });
            
            uploadResult = await uploadPromise;
        } else {
            // Handle file path upload (fallback)
            uploadResult = await cloudinary.uploader.upload(file.path, {
                folder: 'blur-products',
                use_filename: true,
                unique_filename: true,
                overwrite: true,
                resource_type: "auto"
            });
        }

        console.log('File uploaded successfully to Cloudinary');
        console.log('Cloudinary URL:', uploadResult.secure_url);
        
        return uploadResult.secure_url;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw new Error('Failed to upload image to Cloudinary: ' + error.message);
    }
};

module.exports = { uploadToCloudinary, cloudinary }; 