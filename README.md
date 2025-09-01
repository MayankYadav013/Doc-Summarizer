# Smart Document Summarizer

A full-stack MERN application that extracts text from PDF files and images using OCR technology, then generates intelligent summaries using Google's Gemini AI with three different length options (short, medium, long).

## 🚀 Features

### Core Functionality
- **Document Upload**: Drag-and-drop or file picker interface for PDF and image files
- **Text Extraction**: 
  - PDF parsing with formatting preservation
  - OCR (Optical Character Recognition) for scanned documents and images
- **AI-Powered Summarization**: Three summary lengths using Google Gemini API
  - **Short**: 2-3 sentences highlighting key points
  - **Medium**: 1-2 paragraphs covering main ideas
  - **Long**: 3-4 paragraphs with comprehensive details
- **Smart Summary Display**: Tabbed interface to switch between summary lengths
- **Download Functionality**: Export summaries as text files

### UI/UX Features
- Modern, responsive design with glassmorphism effects
- Mobile-first approach with touch-friendly interfaces
- Real-time file validation and error handling
- Progress indicators and loading states
- Intuitive drag-and-drop file upload

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **Multer** for file upload handling
- **pdf-parse** for PDF text extraction
- **Tesseract.js** for OCR functionality
- **Google Generative AI** (Gemini) for summarization
- **CORS** for cross-origin requests

### Frontend
- **React** 18 with functional components and hooks
- **Lucide React** for modern icons
- **CSS3** with advanced features (backdrop-filter, gradients)
- **Responsive design** with mobile optimization


## 📁 Project Structure

```
document-summarizer/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env
│   └── uploads/ (created automatically)
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   ├── package.json
│   └── .env
└── README.md
```

## 🎯 Usage

1. **Upload Document**: 
   - Drag and drop a PDF or image file onto the upload area
   - Or click "Choose File" to select from your device

2. **Processing**: 
   - The application extracts text from your document
   - Sends the text to Gemini AI for summarization

3. **View Summaries**: 
   - Switch between Short, Medium, and Long summaries using tabs
   - Each provides different levels of detail

4. **Download**: 
   - Click the download button to save any summary as a text file

5. **Process More Documents**: 
   - Click "Process Another Document" to start over

## 📱 Supported File Types

- **PDF Files**: `.pdf`
- **Image Files**: `.jpg`, `.jpeg`, `.png`
- **Maximum File Size**: 10MB

## 🔒 Security Features

- File type validation
- File size limits
- Input sanitization
- Error handling and user feedback
- Temporary file cleanup

## 🐛 Troubleshooting

### Common Issues

1. **Gemini API Errors**
   - Verify your API key is correct
   - Check API quota and billing settings

2. **File Upload Issues**
   - Ensure file size is under 10MB
   - Check supported file formats

3. **CORS Errors**
   - Verify backend CORS configuration
   - Check frontend API URL configuration
