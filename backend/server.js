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

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  process.env.FRONTEND_URL // We'll set this in deployment
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(null, true); // Allow all origins for now, restrict later if needed
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.static('uploads'));

// Initialize Gemini AI (Free tier model)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// Configure multer for file uploads
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
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
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

// Extract text from image using OCR
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

// Generate summary using Gemini API
async function generateSummary(text, length) {
  try {
    let prompt;
    
    switch (length) {
      case 'short':
        prompt = `Please provide a concise summary of the following text in 2-3 sentences, highlighting only the most important points:\n\n${text}`;
        break;
      case 'medium':
        prompt = `Please provide a medium-length summary of the following text in 1-2 paragraphs, covering the main ideas and key details:\n\n${text}`;
        break;
      case 'long':
        prompt = `Please provide a comprehensive summary of the following text in 3-4 paragraphs, including main ideas, supporting details, and key insights:\n\n${text}`;
        break;
      default:
        prompt = `Please provide a summary of the following text:\n\n${text}`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    throw new Error('Failed to generate summary: ' + error.message);
  }
}

// Routes
app.post('/api/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { summaryLength = 'medium' } = req.body;
    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    let extractedText = '';

    // Extract text based on file type
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

    // Generate summaries for all three lengths
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
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to process document: ' + error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 10MB.' });
    }
  }
  res.status(500).json({ error: error.message });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});