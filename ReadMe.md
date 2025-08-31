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

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 16 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Git](https://git-scm.com/)

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd document-summarizer
```

### 2. Backend Setup
```bash
# Create backend directory
mkdir backend
cd backend

# Initialize npm and install dependencies
npm init -y
npm install express multer cors pdf-parse tesseract.js @google/generative-ai dotenv
npm install -D nodemon

# Create the server.js file (copy from the backend artifact)
# Create .env file with your Gemini API key
```

### 3. Frontend Setup
```bash
# Navigate back to root and create frontend
cd ..
npx create-react-app frontend
cd frontend

# Install additional dependencies
npm install lucide-react

# Replace src/App.js and src/App.css with the provided files
# Create .env file for frontend configuration
```

### 4. Environment Configuration

#### Backend (.env)
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000
```

### 5. Get Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your backend .env file

## 🚀 Running the Application

### Development Mode

#### Start Backend Server
```bash
cd backend
npm run dev
# or
npm start
```

The backend server will start on `http://localhost:5000`

#### Start Frontend Development Server
```bash
cd frontend
npm start
```

The frontend will start on `http://localhost:3000`

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

## 🌐 Deployment

### Backend Deployment (Heroku/Railway)
1. Create a new app on your hosting platform
2. Set environment variables (GEMINI_API_KEY, PORT)
3. Connect your repository and deploy

### Frontend Deployment (Netlify/Vercel)
1. Build the production version: `npm run build`
2. Deploy the `build` folder
3. Update REACT_APP_API_URL to point to your deployed backend

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

4. **OCR Not Working**
   - Large images may take longer to process
   - Ensure image quality is good for better text extraction

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Google Gemini AI for intelligent summarization
- Tesseract.js for OCR capabilities
- React community for excellent documentation
- Lucide for beautiful icons

## 🔮 Future Enhancements

- Multi-language support for OCR and summarization
- User authentication and document history
- Batch processing for multiple documents
- Summary customization options
- Export to different formats (PDF, Word, etc.)
- Real-time collaboration features

---

**Made with ❤️ using the MERN Stack and AI**