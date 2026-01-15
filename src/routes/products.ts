import { Router, Request, Response } from 'express';
import Product from '../models/Product';
import { protect, admin, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to accept only images
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
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
});

// GET all products (Public)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, category, minPrice, maxPrice, page = '1', limit = '12' } = req.query;
    let query: any = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (category) {
      query.category = category;
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const totalProducts = await Product.countDocuments(query);
    const products = await Product.find(query)
      .limit(limitNum)
      .skip(skip)
      .sort({ createdAt: -1 });

    res.json({
      products,
      currentPage: pageNum,
      totalPages: Math.ceil(totalProducts / limitNum),
      totalProducts
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error });
  }
});

// GET single product (Public)
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error });
  }
});

// POST create product (Private/Admin)
router.post('/', protect, admin, upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const productData: any = {
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      category: req.body.category,
      stock: req.body.stock || 0
    };

    // If file was uploaded, use the file path; otherwise use the provided URL
    if (req.file) {
      productData.image = `${req.protocol}://${req.get('host')}/uploads/products/${req.file.filename}`;
    } else if (req.body.image) {
      productData.image = req.body.image;
    } else {
      res.status(400).json({ message: 'Please provide an image file or URL' });
      return;
    }

    const newProduct = new Product(productData);
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: 'Error creating product', error });
  }
});

// PUT update product (Private/Admin)
router.put('/:id', protect, admin, upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const updateData: any = {
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      category: req.body.category,
      stock: req.body.stock
    };

    // If new file was uploaded, use it; otherwise keep existing or use provided URL
    if (req.file) {
      updateData.image = `${req.protocol}://${req.get('host')}/uploads/products/${req.file.filename}`;
    } else if (req.body.image) {
      updateData.image = req.body.image;
    }

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedProduct) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ message: 'Error updating product', error });
  }
});

// DELETE product (Private/Admin)
router.delete('/:id', protect, admin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error });
  }
});

export default router;
