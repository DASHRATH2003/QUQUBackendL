const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { uploadToCloudinary } = require('../config/cloudinary');

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'tmp')); // Store files temporarily
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for multer
const fileFilter = (req, file, cb) => {
  console.log('Received file:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype
  });

  // Accept only images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}).single('image');

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('creator', 'name');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('creator', 'name');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create product route
router.post('/', auth, (req, res) => {
  console.log('=== Starting product creation ===');
  console.log('Headers:', req.headers);

  upload(req, res, async function(err) {
    try {
      console.log('Request body:', req.body);
      console.log('Uploaded file:', req.file);

      // Handle multer errors
      if (err instanceof multer.MulterError) {
        console.error('Multer error:', err);
        return res.status(400).json({
          message: 'File upload error',
          error: err.message
        });
      } else if (err) {
        console.error('Other upload error:', err);
        return res.status(400).json({
          message: 'Error uploading file',
          error: err.message
        });
      }

      // Check if file exists
      if (!req.file) {
        console.error('No file in request');
        return res.status(400).json({ message: 'Product image is required' });
      }

      // Check authorization
      if (!req.user || (req.user.role !== 'creator' && req.user.role !== 'admin')) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const { name, description, price, category, stock } = req.body;

      // Validate required fields
      if (!name || !description || !price || !category || !stock) {
        return res.status(400).json({ 
          message: 'Missing required fields',
          required: ['name', 'description', 'price', 'category', 'stock'],
          received: { name, description, price, category, stock }
        });
      }

      console.log('Uploading to Cloudinary...');
      // Upload to Cloudinary
      const imageUrl = await uploadToCloudinary(req.file);
      console.log('Cloudinary upload successful:', imageUrl);

      // Create new product
      const product = new Product({
        name,
        description,
        price: Number(price),
        image: imageUrl,
        category,
        stock: Number(stock),
        creator: req.user._id
      });

      console.log('Saving product to database...');
      // Save to database
      const savedProduct = await product.save();
      console.log('Product saved successfully:', savedProduct);

      res.status(201).json(savedProduct);
    } catch (error) {
      console.error('Error in product creation:', error);
      res.status(500).json({ 
        message: 'Error creating product', 
        error: error.message 
      });
    }
  });
});

// Update product (protected - only creator/admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { name, description, price, image, category, stock, ingredients } = req.body;

    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price || product.price;
    product.image = image || product.image;
    product.category = category || product.category;
    product.stock = stock || product.stock;
    product.ingredients = ingredients || product.ingredients;

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete product (protected - only creator/admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('Attempting to delete product:', req.params.id);
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      console.log('Product not found');
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user is admin or product creator
    if (req.user.role !== 'admin' && product.creator.toString() !== req.user._id.toString()) {
      console.log('User not authorized:', req.user.role);
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete the product using deleteOne
    await Product.deleteOne({ _id: req.params.id });
    
    console.log('Product deleted successfully');
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ 
      message: 'Error deleting product',
      error: error.message 
    });
  }
});

// Add product rating
router.post('/:id/ratings', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const { rating, review } = req.body;

    // Check if user already rated
    const alreadyRated = product.ratings.find(
      r => r.user.toString() === req.user._id.toString()
    );

    if (alreadyRated) {
      return res.status(400).json({ message: 'Product already rated' });
    }

    product.ratings.push({
      user: req.user._id,
      rating,
      review
    });

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 