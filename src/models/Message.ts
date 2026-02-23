import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  message: { type: String, required: true },
  sender_name: { type: String, required: true },
  picture: { type: String, required: false }, // Imgur URL
  createdAt: { type: Date, default: Date.now }
});

export const Message = mongoose.model('Message', messageSchema);