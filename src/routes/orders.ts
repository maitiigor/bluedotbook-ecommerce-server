import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import Order from '../models/Order';
import Cart from '../models/Cart';
import { protect, admin, AuthRequest } from '../middleware/auth';

const router = Router();

// Validation middleware
const validateCreateOrder = [
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('items.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('items.*.name').trim().notEmpty().withMessage('Item name is required'),
  body('items.*.price').isFloat({ min: 0.01 }).withMessage('Price must be a positive number'),
  body('items.*.image').trim().notEmpty().withMessage('Image is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shippingAddress').isObject().withMessage('Shipping address is required'),
  body('shippingAddress.fullName').trim().notEmpty().withMessage('Full name is required').isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
  body('shippingAddress.address').trim().notEmpty().withMessage('Address is required').isLength({ min: 5, max: 200 }).withMessage('Address must be between 5 and 200 characters'),
  body('shippingAddress.city').trim().notEmpty().withMessage('City is required').isLength({ min: 2, max: 50 }).withMessage('City must be between 2 and 50 characters'),
  body('shippingAddress.postalCode').trim().notEmpty().withMessage('Postal code is required').isLength({ min: 3, max: 20 }).withMessage('Postal code must be between 3 and 20 characters'),
  body('shippingAddress.country').trim().notEmpty().withMessage('Country is required').isLength({ min: 2, max: 50 }).withMessage('Country must be between 2 and 50 characters')
];

const validateOrderId = [
  param('id').isMongoId().withMessage('Invalid order ID')
];

const validateOrderStatus = [
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status value')
];

// POST create order
router.post('/', protect, validateCreateOrder, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
      return;
    }

    const { items, shippingAddress } = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({ message: 'No items in order' });
      return;
    }

    if (!shippingAddress) {
      res.status(400).json({ message: 'Shipping address is required' });
      return;
    }

    // Calculate total
    const totalAmount = items.reduce((sum: number, item: any) => 
      sum + (item.price * item.quantity), 0
    );

    const order = new Order({
      userId: req.user?.id,
      items,
      totalAmount,
      shippingAddress,
      status: 'pending'
    });

    await order.save();

    // Clear user's cart after successful order
    await Cart.findOneAndUpdate(
      { userId: req.user?.id },
      { items: [] }
    );

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: 'Error creating order', error });
  }
});

// GET user's orders
router.get('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await Order.find({ userId: req.user?.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error });
  }
});

// GET single order
router.get('/:id', protect, validateOrderId, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
      return;
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Check if order belongs to user (unless admin)
    if (order.userId.toString() !== req.user?.id && !req.user?.isAdmin) {
      res.status(403).json({ message: 'Not authorized to view this order' });
      return;
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order', error });
  }
});

// GET all orders (admin only)
router.get('/admin/all', protect, admin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('userId', 'username');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error });
  }
});

// PUT update order status (admin only)
router.put('/:id/status', protect, admin, validateOrderStatus, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
      return;
    }

    const { status } = req.body;

    if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: 'Error updating order status', error });
  }
});

export default router;
