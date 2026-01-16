import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import jwt from 'jsonwebtoken';

const router = Router();

const generateToken = (id: string, isAdmin: boolean) => {
  return jwt.sign({ id, isAdmin }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

// Validation middleware
const validateLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password')
    .notEmpty().withMessage('Password is required')
];

const validateRegister = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Login Route
router.post('/login', validateLogin, async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
      return;
    }

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
router.post('/register', validateRegister, async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
      return;
    }

    const { username, password } = req.body;
    
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
