import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product';
import User from './models/User';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce_app';

const sampleProducts = [
  {
    name: 'Wireless Headphones',
    price: 99.99,
    description: 'High-quality wireless headphones with noise cancellation.',
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
    stock: 50
  },
  {
    name: 'Smart Watch',
    price: 199.99,
    description: 'Advanced smartwatch with fitness tracking and heart rate monitor.',
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80',
    stock: 30
  },
  {
    name: 'Running Shoes',
    price: 79.99,
    description: 'Lightweight and comfortable running shoes for daily use.',
    category: 'Footwear',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80',
    stock: 100
  },
  {
    name: 'Backpack',
    price: 49.99,
    description: 'Durable backpack with laptop compartment.',
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80',
    stock: 200
  },
   {
    name: 'Mechanical Keyboard',
    price: 129.50,
    description: 'RGB mechanical keyboard with blue switches.',
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b91a05c?w=500&q=80',
    stock: 15
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Product.deleteMany({});
    await User.deleteMany({}); // Optional: clear users too

    // Insert Products
    await Product.insertMany(sampleProducts);
    console.log('Products seeded');

    // Create Admin User
    const adminUser = new User({
        username: 'admin',
        password: 'password123' // Plain text as per requirements
    });
    await adminUser.save();
    console.log('Admin user created');

    mongoose.disconnect();
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
