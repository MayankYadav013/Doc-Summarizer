const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================
   ✅ ENHANCED CORS CONFIGURATION
   ========================= */
const allowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  'https://doc-summarizer-frontend01.onrender.com',
  process.env.FRONTEND_URL
].filter(Boolean); // Remove any undefined values

// Enhanced CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    console.log('🔍 Request from origin:', origin);
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log('✅ No origin - allowing request');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      console.log('✅ CORS allowed for:', origin);
      callback(null, true);
    } else {
      console.warn('❌ Blocked by CORS:', origin);
      console.log('📋 Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept',
    'Origin'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false
}));

// Explicit OPTIONS handler for all routes
app.options('*', (req, res) => {
  console.log('🚁 Preflight request from:', req.headers.origin);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} from ${req.headers.origin || 'no-origin'}`);
  next();
});

app.use(express.json());
app.use(express.static('uploads'));

/* =========================
   ✅ GEMINI AI SETUP
   ========================= */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

/* =========================
   ✅ MULTER UPLOAD SETUP
   ========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) cb(null, true);
    else cb(new Error('Only PDF and image files are allowed'));
  }
});

/* =========================
   ✅ HELPER FUNCTIONS
   ========================= */
async function extractTextFromPDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

async function extractTextFromImage(filePath) {
  const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
  return text;
}

async function generateSummary(text, length) {
  try {
    let prompt;
    switch (length) {
      case 'short': prompt = `Summarize in 2-3 sentences:\n\n${text}`; break;
      case 'medium': prompt = `Summarize in 1-2 paragraphs:\n\n${text}`; break;
      case 'long': prompt = `Summarize in 3-4 paragraphs:\n\n${text}`; break;
      default: prompt = `Summarize this text:\n\n${text}`;
    }
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error('❌ Gemini API Error:', err.message);
    return "AI service is currently unavailable. Please try again later.";
  }
}

/* =========================
   ✅ ROUTES
   ========================= */

// Health check route (moved before upload route)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Server running ✅', 
    timestamp: new Date().toISOString(),
    allowedOrigins: allowedOrigins,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Enhanced upload route with better error handling
app.post('/api/upload', upload.single('document'), async (req, res) => {
  try {
    console.log('📤 Upload request received from:', req.headers.origin);
    console.log('📁 File:', req.file ? req.file.originalname : 'No file');

    if (!req.file) {
      console.warn('❌ No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { summaryLength = 'medium' } = req.body;
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    console.log('🔄 Processing file:', req.file.originalname, 'Type:', ext);

    let extractedText = '';
    if (ext === '.pdf') {
      extractedText = await extractTextFromPDF(filePath);
    } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      extractedText = await extractTextFromImage(filePath);
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    if (!extractedText.trim()) {
      console.warn('❌ No text extracted from file');
      return res.status(400).json({ error: 'No text could be extracted from the document' });
    }

    console.log('📝 Text extracted, generating summaries...');

    const [shortSummary, mediumSummary, longSummary] = await Promise.all([
      generateSummary(extractedText, 'short'),
      generateSummary(extractedText, 'medium'),
      generateSummary(extractedText, 'long')
    ]);

    // Cleanup file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🗑️ Cleanup: File deleted');
    }

    console.log('✅ Processing complete, sending response');

    res.json({
      success: true,
      originalText: extractedText.substring(0, 1000) + (extractedText.length > 1000 ? '...' : ''),
      summaries: { short: shortSummary, medium: mediumSummary, long: longSummary },
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

  } catch (error) {
    console.error('❌ Error processing document:', error.message);
    console.error('❌ Full error:', error);
    
    // Cleanup file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to process document: ' + error.message });
  }
});

/* =========================
   ✅ ERROR HANDLERS
   ========================= */
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Max size is 10MB.' });
    }
    return res.status(400).json({ error: 'File upload error: ' + error.message });
  }
  
  console.error('❌ Server Error:', error.message);
  res.status(500).json({ error: error.message || 'Internal server error' });
});

// Catch-all route for debugging
app.use('*', (req, res) => {
  console.log('❓ Unmatched route:', req.method, req.originalUrl);
  res.status(404).json({ error: 'Route not found' });
});

/* =========================
   ✅ START SERVER
   ========================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📋 Allowed Origins:`, allowedOrigins);
  console.log(`🔑 Gemini API Key configured: ${!!process.env.GEMINI_API_KEY}`);
});
