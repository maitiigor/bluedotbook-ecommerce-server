import { Router, Response } from 'express';
import Order from '../models/Order';
import Cart from '../models/Cart';
import { protect, admin, AuthRequest } from '../middleware/auth';

const router = Router();

// POST create order
router.post('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
router.get('/:id', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
router.put('/:id/status', protect, admin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
