import React, { useCallback, useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import './PdfUploader.scss';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfUploaderProps {
  onPdfUpload: (pdfContent: string) => void;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({ onPdfUpload }) => {
  const [currentPdf, setCurrentPdf] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractPdfText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => (item as any).str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  };

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a valid PDF file');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      const arrayBuffer = await file.arrayBuffer();
      const extractedText = await extractPdfText(arrayBuffer);
      onPdfUpload(extractedText);
      setCurrentPdf(file.name);
    } catch (error) {
      console.error('Error processing PDF:', error);
      setError('Error processing PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [onPdfUpload]);

  return (
    <div className="pdf-uploader">
      <div className="pdf-uploader__header">
        <h3>PDF Document</h3>
      </div>
      <div className="pdf-uploader__content">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="pdf-uploader__input"
          disabled={isProcessing}
        />
        {isProcessing && (
          <div className="pdf-uploader__status processing">
            Processing PDF...
          </div>
        )}
        {error && (
          <div className="pdf-uploader__status error">
            {error}
          </div>
        )}
        {currentPdf && !error && (
          <div className="pdf-uploader__status success">
            Current PDF: {currentPdf}
          </div>
        )}
      </div>
    </div>
  );
}; 