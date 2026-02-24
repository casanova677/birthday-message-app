// src/server.ts
import 'dotenv/config';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import multer from 'multer';
import QRCode from 'qrcode';

import { Message } from './models/Message.js';
import streamifier from 'streamifier';
import cloudinary from './cloudinary.js';



/* ---------------- ENV LOAD (ONCE, SAFE) ---------------- */
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8')
    .split('\n')
    .forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...val] = trimmed.split('=');
        if (key) {
          process.env[key] = val.join('=').trim();
        }
      }
    });
  console.log('✅ .env loaded');
} else {
  console.error('❌ .env not found');
}

/* ---------------- DATABASE ---------------- */
mongoose
  .connect(process.env.MONGO_URI!, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

/* ---------------- MULTER (MEMORY + LIMITS) ---------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    console.log('Incoming file:', file.mimetype); // 🔥 debug
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files allowed'));
    }
    cb(null, true);
  }
});

/* ---------------- APP SETUP ---------------- */
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));

/* ---------------- RATE LIMITER ---------------- */
export const submitLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1,
  message: 'Please wait one minute before sending another message 💖'
});

/* ---------------- ROUTES ---------------- */
app.get('/', async (_req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 });
  res.render('home', { messages });
});

app.get('/submit', (_req, res) => {
  res.render('submit');
});

// Admin page
app.get('/admin', async (req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 });
  res.render('admin', { messages });
});

// Delete one message
app.post('/admin/delete/:id', async (req, res) => {
  await Message.findByIdAndDelete(req.params.id);
  res.redirect('/admin');
});

// Delete all messages
app.post('/admin/delete-all', async (req, res) => {
  await Message.deleteMany({});
  res.redirect('/admin');
});

app.post('/submit', submitLimiter, upload.single('picture'), async (req, res) => {
  
  const { message } = req.body;
  const{ sender_name } = req.body;
 let pictureUrl: string | null = null;

  if (!message || message.length > 300) {
    return res.status(400).send('Message too long or empty.');
  }

if (req.file) {
  try {
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'messages',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

      streamifier.createReadStream(req.file!.buffer).pipe(stream);
    });

    pictureUrl = uploadResult.secure_url;
    console.log('✅ Uploaded to Cloudinary:', pictureUrl);

  } catch (err) {
    console.error('❌ Cloudinary upload failed:', err);
  }
}
  const newMessage = await Message.create({ message,sender_name, picture: pictureUrl });
  io.emit('newMessage', newMessage);

  res.redirect('/');
});

app.get('/messages/latest', async (req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 });
  res.json(messages);
});

/* ---------------- QR ---------------- */
app.get('/qr', async (_req, res) => {
  const siteUrl = 'https://your-deployed-site.com';
  const qrPath = path.join(__dirname, '../public/qr.png');

  QRCode.toFile(qrPath, siteUrl, err => {
    if (err) return res.send('QR generation failed');
    res.sendFile(qrPath);
  });
});

/* ---------------- SOCKET ---------------- */
io.on('connection', () => {
  console.log('⚡ User connected');
});

/* ---------------- START ---------------- */
server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});