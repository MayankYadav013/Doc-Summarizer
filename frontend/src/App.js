import React, { useState, useCallback } from 'react';
import { Upload, FileText, Image, Download, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import './App.css';

// ✅ Use environment variable (falls back to backend on Render if not set)
const API_URL = process.env.REACT_APP_API_URL || "https://doc-summarizer-backend01.onrender.com";

function App() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [activeSummaryType, setActiveSummaryType] = useState('medium');

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (file) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      setError('❌ Please select a PDF or image file (JPG, PNG)');
      return;
    }

    if (file.size > maxSize) {
      setError('❌ File size must be less than 10MB');
      return;
    }

    setFile(file);
    setError('');
    setResult(null);
  };

  const uploadAndProcess = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError('');

    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.includes("API limit")) {
          throw new Error("⚠️ AI quota exceeded. Please try again later.");
        }
        throw new Error(data.error || 'Failed to process document');
      }

      setResult(data);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to process document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSummary = (summaryType) => {
    if (!result) return;

    const summary = result.summaries[summaryType];
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summaryType}-summary-${result.fileName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetApp = () => {
    setFile(null);
    setResult(null);
    setError('');
    setActiveSummaryType('medium');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <FileText className="logo-icon" />
            <h1>Smart Document Summarizer</h1>
          </div>
          <p className="subtitle">Upload PDFs or images and get AI-powered summaries instantly</p>
        </div>
      </header>

      <main className="main-content">
        {!result ? (
          <div className="upload-section">
            <div
              className={`upload-area ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {!file ? (
                <>
                  <Upload className="upload-icon" />
                  <h3>Drop your document here</h3>
                  <p>Support for PDF files and images (JPG, PNG)</p>
                  <p className="file-limit">Maximum file size: 10MB</p>
                  <label className="file-input-label">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                      className="file-input"
                    />
                    Choose File
                  </label>
                </>
              ) : (
                <div className="file-preview">
                  <div className="file-info">
                    {file.type === 'application/pdf' ? (
                      <FileText className="file-icon pdf" />
                    ) : (
                      <Image className="file-icon image" />
                    )}
                    <div className="file-details">
                      <h4>{file.name}</h4>
                      <p>{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <div className="file-actions">
                    <button
                      className="btn btn-primary"
                      onClick={uploadAndProcess}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader className="btn-icon spinning" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="btn-icon" />
                          Generate Summary
                        </>
                      )}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={resetApp}
                      disabled={isProcessing}
                    >
                      Choose Different File
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="error-message">
                <AlertCircle className="error-icon" />
                <span>{error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="results-section">
            <div className="results-header">
              <h2>Summary Results</h2>
              <div className="file-info-small">
                <span className="file-name">{result.fileName}</span>
                <span className="file-size">{formatFileSize(result.fileSize)}</span>
              </div>
            </div>

            {/* ✅ Optional: Show extracted text preview */}
            <div className="summary-content">
              <h3>Extracted Text (Preview)</h3>
              <p className="summary-text">{result.originalText}</p>
            </div>

            <div className="summary-controls">
              <div className="summary-tabs">
                {['short', 'medium', 'long'].map((type) => (
                  <button
                    key={type}
                    className={`tab ${activeSummaryType === type ? 'active' : ''}`}
                    onClick={() => setActiveSummaryType(type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)} Summary
                  </button>
                ))}
              </div>
              <button
                className="btn btn-outline"
                onClick={() => downloadSummary(activeSummaryType)}
              >
                <Download className="btn-icon" />
                Download
              </button>
            </div>

            <div className="summary-content">
              <div className="summary-text">
                {result.summaries[activeSummaryType]}
              </div>
            </div>

            <div className="summary-actions">
              <button className="btn btn-primary" onClick={resetApp}>
                Process Another Document
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>&copy; 2025 Smart Document Summarizer. Powered by AI.</p>
      </footer>
    </div>
  );
}

export default App;
