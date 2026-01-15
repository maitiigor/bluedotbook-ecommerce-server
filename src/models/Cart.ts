import mongoose, { Schema, Document } from 'mongoose';

export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

export interface ICart extends Document {
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
  updatedAt: Date;
}

const CartItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 }
});

const CartSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [CartItemSchema],
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
CartSchema.pre('save', function(next) {
  this.updatedAt = new Date();
});

export default mongoose.model<ICart>('Cart', CartSchema);
