import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import NavbarLoggedin from '../components/NavbarLoggedin';
import '../styles/TestModeUpload.css';
import { renderAsync } from 'docx-preview';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const WORDS_PER_PAGE = 500;

const TestModeUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const [docxTextPages, setDocxTextPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setError('');
    setSelectedFile(null);
    setFileType(null);
    setPdfData(null);
    setDocxTextPages([]);
    setCurrentPage(1);
    setNumPages(0);

    if (!file) {
      return;
    }

    const type = file.type;
    setFileType(type);

    if (type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const arrayBuffer = event.target.result;
        setPdfData(arrayBuffer);
      };
      reader.onerror = () => {
        setError('Failed to read PDF file.');
      };
      reader.readAsArrayBuffer(file);
      setSelectedFile(file);
    } else if (
      type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx')
    ) {
      // Read DOCX file as ArrayBuffer and extract text
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target.result;
          // Create a temporary element to render docx content
          const container = document.createElement('div');
          await renderAsync(arrayBuffer, container);
          // Extract text content from rendered container
          const text = container.innerText || container.textContent || '';
          // Split text into pages by WORDS_PER_PAGE
          const words = text.split(/\s+/).filter(Boolean);
          const pages = [];
          for (let i = 0; i < words.length; i += WORDS_PER_PAGE) {
            pages.push(words.slice(i, i + WORDS_PER_PAGE).join(' '));
          }
          setDocxTextPages(pages);
          setNumPages(pages.length);
          setSelectedFile(file);
        } catch (err) {
          setError('Failed to parse DOCX file.');
        }
      };
      reader.onerror = () => {
        setError('Failed to read DOCX file.');
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError('Unsupported file type. Please upload PDF or DOCX.');
    }
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  };

  return (
    <div className="upload-container">
      <NavbarLoggedin />
      <div className="upload-card">
        <h1 className="upload-title">Upload Past-Year Test Paper</h1>
        <div className="file-upload-section">
          <label>Upload PDF/DOCX:</label><br />
          <label className="custom-file-upload">
            Choose File
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
            />
          </label>
          {selectedFile && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#ccc' }}>
              {selectedFile.name}
            </div>
          )}
        </div>
        {error && <div className="error-message">{error}</div>}

        {selectedFile && fileType === 'application/pdf' && pdfData && (
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <Document
              file={pdfData}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error) => {
                console.error('PDF load error:', error);
                setError('Failed to load PDF file.');
              }}
              loading="Loading PDF..."
              error="Failed to load PDF."
            >
              <Page pageNumber={currentPage} />
            </Document>
            <div style={{ marginTop: '1rem' }}>
              <button onClick={goToPreviousPage} disabled={currentPage <= 1}>
                Previous
              </button>
              <span style={{ margin: '0 1rem' }}>
                Page {currentPage} of {numPages}
              </span>
              <button onClick={goToNextPage} disabled={currentPage >= numPages}>
                Next
              </button>
            </div>
          </div>
        )}

        {selectedFile && (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || selectedFile.name.endsWith('.docx')) && docxTextPages.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <div style={{ whiteSpace: 'pre-wrap', textAlign: 'left', border: '1px solid #ccc', padding: '1rem', maxHeight: '600px', overflowY: 'auto' }}>
              {docxTextPages[currentPage - 1]}
            </div>
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <button onClick={goToPreviousPage} disabled={currentPage <= 1}>
                Previous
              </button>
              <span style={{ margin: '0 1rem' }}>
                Page {currentPage} of {numPages}
              </span>
              <button onClick={goToNextPage} disabled={currentPage >= numPages}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestModeUpload;
