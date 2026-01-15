import { Router, Response } from 'express';
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

// POST/UPDATE cart (add or update items)
router.post('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
router.delete('/:productId', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
