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

// ================= CORS CONFIG =================
const allowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  'https://doc-summarizer.vercel.app', 
  process.env.FRONTEND_URL              
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g., mobile apps, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.static('uploads'));

// ================= GEMINI AI CONFIG =================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// ================= MULTER CONFIG =================
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
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  }
});

// ================= HELPERS =================
// Extract text from PDF
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
}

// Extract text from Image
async function extractTextFromImage(filePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng', {
      logger: m => console.log(m)
    });
    return text;
  } catch (error) {
    throw new Error('Failed to extract text from image: ' + error.message);
  }
}

// Generate Summary using Gemini API
async function generateSummary(text, length) {
  try {
    let prompt;
    switch (length) {
      case 'short':
        prompt = `Summarize in 2-3 concise sentences:\n\n${text}`;
        break;
      case 'medium':
        prompt = `Summarize in 1-2 paragraphs:\n\n${text}`;
        break;
      case 'long':
        prompt = `Provide a comprehensive summary (3-4 paragraphs):\n\n${text}`;
        break;
      default:
        prompt = `Summarize the following text:\n\n${text}`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    throw new Error('Failed to generate summary: ' + error.message);
  }
}

// ================= ROUTES =================
// Upload + Summarize
app.post('/api/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { summaryLength = 'medium' } = req.body;
    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    let extractedText = '';
    if (fileExtension === '.pdf') {
      extractedText = await extractTextFromPDF(filePath);
    } else if (['.jpg', '.jpeg', '.png'].includes(fileExtension)) {
      extractedText = await extractTextFromImage(filePath);
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ error: 'No text could be extracted from the document' });
    }

    const [shortSummary, mediumSummary, longSummary] = await Promise.all([
      generateSummary(extractedText, 'short'),
      generateSummary(extractedText, 'medium'),
      generateSummary(extractedText, 'long')
    ]);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

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
    console.error('Error processing document:', error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ error: 'Failed to process document: ' + error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Max 10MB.' });
    }
  }
  res.status(500).json({ error: error.message });
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
