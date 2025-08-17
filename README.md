# **SummarAIze** ✨  
*AI-powered productivity app for smarter studying*  

---

## 🚀 Overview  
**SummarAIze** is a full-stack web application that helps students **revise smarter** by transforming raw study material into:  
- AI-generated **summaries** 📄  
- Interactive **mind maps** 🧠  
- Realistic **test-taking simulations** 📝  

Built for NUS Orbital 2025 (Apollo 11 level), SummarAIze combines **LLMs**, **OCR**, and **document parsing** into a single streamlined revision tool.  

---

## ✨ Features  

### 🔹 Summarizer  
- Upload text, PDFs, or DOCX files.  
- AI generates structured **summaries** with headings and bullet points.  
- Export summaries to **PDF** or **DOCX** (preserving inline styles).  

### 🔹 Mind Map Generator  
- Convert study notes into interactive **mind maps**.  
- Expand/collapse nodes for better knowledge visualization.  
- Future support for exporting mind maps as **PDF / Image**.  

### 🔹 Test Mode  
- Upload a paper → auto-extract questions (MCQ, open-ended, file upload).  
- Built-in **online test interface** with timer & navigation.  
- Auto-save + structured storage in Firebase.  
- Review mode: see past attempts with **statistics per paper**.  

### 🔹 Export & Sharing  
- Save content as **PDF / DOCX** with preserved formatting.  
- Downloadable for offline revision or printing.  

### 🔹 User Dashboard  
- Manage all your **summaries, mind maps, and test papers** in one place.  
- Rename, delete, or re-download files.  
- Infinite scroll design with modern **glassmorphism UI**.  

---

## 🛠 Tech Stack  

**Frontend**  
- [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)  
- [Tailwind CSS](https://tailwindcss.com/)  
- [html2pdf.js](https://ekoopmans.github.io/html2pdf.js/)  

**Backend**  
- [FastAPI](https://fastapi.tiangolo.com/)  
- [Uvicorn](https://www.uvicorn.org/)  
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract)  
- Deployed on **Google Cloud Run**  

**Database & Auth**  
- [Firebase Auth](https://firebase.google.com/)  
- [Firebase Firestore](https://firebase.google.com/)  

**Other Integrations**  
- DOCX generation via `python-docx`  
- Sanitization with `DOMPurify`  
