import { Router, Request, Response } from 'express';
import User from '../models/User';
import jwt from 'jsonwebtoken';

const router = Router();

const generateToken = (id: string, isAdmin: boolean) => {
  return jwt.sign({ id, isAdmin }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

// Login Route
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (user && (await user.comparePassword(password))) {
       const isAdmin = user.username === 'admin';
       res.json({ 
         user: { 
             id: user._id, 
             username: user.username, 
             isAdmin,
             token: generateToken((user._id as any).toString(), isAdmin)
         },
         message: 'Login successful' 
       });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Register Route
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    
    // Validation
    if (!username || !password) {
      res.status(400).json({ message: 'Username and password are required' });
      return;
    }
    
    if (password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters' });
      return;
    }
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }
    
    const newUser = new User({ username, password });
    await newUser.save();
    
    // Return user data and token for auto-login
    const isAdmin = username === 'admin';
    res.status(201).json({ 
      user: { 
        id: newUser._id, 
        username: newUser.username, 
        isAdmin,
        token: generateToken((newUser._id as any).toString(), isAdmin)
      },
      message: 'User created successfully' 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;
