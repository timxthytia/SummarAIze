import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import html2pdf from 'html2pdf.js';
import DOMPurify from 'dompurify';
import { toPng, toJpeg } from 'html-to-image';

/* Downloads a summaries as PDF or DOCX (PNG/JPEG). */
export const handleDownload = async (title, summaryHTML, format, apiUrl) => {
  const container = document.createElement('div');
  container.innerHTML = DOMPurify.sanitize(summaryHTML);

  if (format === 'pdf') {
    container.querySelectorAll('.ql-align-center').forEach(el => {
      el.style.textAlign = 'center';
    });
    container.querySelectorAll('.ql-align-right').forEach(el => {
      el.style.textAlign = 'right';
    });
    container.querySelectorAll('.ql-align-left').forEach(el => {
      el.style.textAlign = 'left';
    });
    container.style.color = 'black';
    // Remove bold styling from all un-bolded elements
    function forceNormalWeight(el) {
      for (const node of el.childNodes) {
        if (node.nodeType === 1) { // element
          if (
            node.tagName !== 'B' &&
            node.tagName !== 'STRONG'
          ) {
            node.style.fontWeight = 'normal';
          }
          forceNormalWeight(node);
        }
      }
    }
    forceNormalWeight(container);
    // Inject CSS to force normal/bold text styles for PDF export
    const style = document.createElement('style');
    style.innerHTML = `
      .ql-editor { font-weight: normal !important; }
      .ql-editor strong, .ql-editor b { font-weight: bold !important; }
    `;
    document.head.appendChild(style);
    html2pdf()
      .set({
        margin: [10, 20],
        filename: `${title || 'summary'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(container)
      .save()
      .then(() => {
        document.head.removeChild(style);
      })
      .catch(() => {
        document.head.removeChild(style);
      });
  } else if (format === 'docx') {
    try {
      const response = await fetch(`${apiUrl}/generate-docx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          html: container.innerHTML,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate DOCX');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title || 'summary'}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading DOCX:', error);
      alert('Failed to download DOCX file');
    }
  }
};