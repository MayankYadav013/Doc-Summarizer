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
   ✅ CORS CONFIGURATION
   ========================= */
const allowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  'https://doc-summarizer-frontend01.onrender.com',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    console.log('Request from origin:', origin);
    
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      console.log('CORS allowed for:', origin);
      callback(null, true);
    } else {
      console.warn('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.static('uploads'));

/* =========================
   ✅ GEMINI AI SETUP
   ========================= */
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set');
  process.exit(1);
}

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
    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  }
});

/* =========================
   ✅ HELPER FUNCTIONS
   ========================= */
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

async function extractTextFromImage(filePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
    return text;
  } catch (error) {
    console.error('OCR error:', error);
    throw new Error('Failed to extract text from image');
  }
}

async function generateSummary(text, length) {
  try {
    let prompt;
    switch (length) {
      case 'short': 
        prompt = `Summarize in 2-3 sentences:\n\n${text}`; 
        break;
      case 'medium': 
        prompt = `Summarize in 1-2 paragraphs:\n\n${text}`; 
        break;
      case 'long': 
        prompt = `Summarize in 3-4 paragraphs:\n\n${text}`; 
        break;
      default: 
        prompt = `Summarize this text:\n\n${text}`;
    }
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error('Gemini API Error:', err.message);
    return "AI service is currently unavailable. Please try again later.";
  }
}

/* =========================
   ✅ ROUTES
   ========================= */

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Server running', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Upload route
app.post('/api/upload', upload.single('document'), async (req, res) => {
  try {
    console.log('Upload request received');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    console.log('Processing file:', req.file.originalname);

    let extractedText = '';
    
    if (ext === '.pdf') {
      extractedText = await extractTextFromPDF(filePath);
    } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      extractedText = await extractTextFromImage(filePath);
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ error: 'No text could be extracted from the document' });
    }

    console.log('Generating summaries...');

    const [shortSummary, mediumSummary, longSummary] = await Promise.all([
      generateSummary(extractedText, 'short'),
      generateSummary(extractedText, 'medium'),
      generateSummary(extractedText, 'long')
    ]);

    // Cleanup file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    console.log('Processing complete');

    res.json({
      success: true,
      originalText: extractedText.substring(0, 1000) + (extractedText.length > 1000 ? '...' : ''),
      summaries: { 
        short: shortSummary, 
        medium: mediumSummary, 
        long: longSummary 
      },
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

  } catch (error) {
    console.error('Error processing document:', error.message);
    
    // Cleanup file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to process document: ' + error.message 
    });
  }
});

/* =========================
   ✅ ERROR HANDLERS
   ========================= */
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Max size is 10MB.' });
  }
  
  console.error('Server Error:', error.message);
  res.status(500).json({ error: error.message });
});

/* =========================
   ✅ START SERVER
   ========================= */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Allowed Origins: ${allowedOrigins.join(', ')}`);
});
