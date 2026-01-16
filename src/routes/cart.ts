import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import Cart from '../models/Cart';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// GET user's cart
router.get('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let cart = await Cart.findOne({ userId: req.user?.id });
    
    if (!cart) {
      // Create empty cart if doesn't exist
      cart = new Cart({ userId: req.user?.id, items: [] });
      await cart.save();
    }
    
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cart', error });
  }
});

// Validation middleware
const validateCartUpdate = [
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('items.*.name').trim().notEmpty().withMessage('Item name is required'),
  body('items.*.price').isFloat({ min: 0.01 }).withMessage('Price must be a positive number'),
  body('items.*.image').trim().notEmpty().withMessage('Image is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

const validateProductId = [
  param('productId').isMongoId().withMessage('Invalid product ID')
];

// POST/UPDATE cart (add or update items)
router.post('/', protect, validateCartUpdate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
      return;
    }

    const { items } = req.body;
    
    let cart = await Cart.findOne({ userId: req.user?.id });
    
    if (!cart) {
      cart = new Cart({ userId: req.user?.id, items });
    } else {
      cart.items = items;
    }
    
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(400).json({ message: 'Error updating cart', error });
  }
});

// DELETE item from cart
router.delete('/:productId', protect, validateProductId, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
      return;
    }

    const cart = await Cart.findOne({ userId: req.user?.id });
    
    if (!cart) {
      res.status(404).json({ message: 'Cart not found' });
      return;
    }
    
    cart.items = cart.items.filter(item => item.productId.toString() !== req.params.productId);
    await cart.save();
    
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Error removing item from cart', error });
  }
});

// DELETE clear entire cart
router.delete('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cart = await Cart.findOne({ userId: req.user?.id });
    
    if (!cart) {
      res.status(404).json({ message: 'Cart not found' });
      return;
    }
    
    cart.items = [];
    await cart.save();
    
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Error clearing cart', error });
  }
});

export default router;
