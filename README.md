# AI-Based Document Summarizer & Question Generator (NLP)

An intelligent NLP-powered web application that extracts text from documents and automatically generates summaries, keywords, descriptive questions, and multiple-choice quizzes. The system is built using Flask and integrates transformer-based summarization with keyword extraction and text processing techniques for efficient document analysis. 

## Overview

The AI-Based Document Summarizer & Question Generator is designed to simplify document understanding and assessment creation. It accepts PDF, DOCX, and TXT files, processes the content using Natural Language Processing techniques, and produces meaningful outputs such as concise summaries, key topics, open-ended questions, and MCQ quizzes.

This project is useful for:
- Students and learners
- Teachers and trainers
- HR and recruitment teams
- Researchers and content analysts

## Features

- Upload and analyze PDF, DOCX, and TXT files
- Generate concise document summaries using T5 transformer models
- Extract important keywords using RAKE and NLTK
- Create descriptive questions from document content
- Generate multiple-choice questions with answer evaluation
- Responsive and user-friendly web interface
- Drag-and-drop file upload support
- Real-time validation and error handling
- Temporary file processing for better privacy

## Technologies Used

### Backend
- Python
- Flask
- Flask-CORS
- Jinja2

### NLP and Document Processing
- Hugging Face Transformers (T5)
- NLTK
- RAKE-NLTK
- pdfplumber
- python-docx

### Frontend
- HTML5
- CSS3
- JavaScript

## Project Structure

```bash
AI-Based-Document-Summarizer/
│
├── app.py
├── requirements.txt
├── templates/
│   └── index.html
├── static/
│   ├── style.css
│   └── script.js
├── uploads/
└── README.md
```

## How It Works

1. The user uploads a PDF, DOCX, or TXT file.
2. The application extracts text from the document.
3. The extracted text is processed using NLP techniques.
4. A summary is generated using the T5 transformer model.
5. Keywords are extracted using RAKE and NLTK.
6. Descriptive questions and MCQs are generated from the content.
7. The results are displayed in an interactive web interface.

## Installation

### Prerequisites
Make sure you have the following installed:
- Python 3.8 or above
- pip

### Steps

1. Clone the repository:
```bash
git clone https://github.com/your-username/ai-document-summarizer.git
```

2. Move into the project directory:
```bash
cd ai-document-summarizer
```

3. Create a virtual environment:
```bash
python -m venv venv
```

4. Activate the virtual environment:

For Windows:
```bash
venv\Scripts\activate
```

For macOS/Linux:
```bash
source venv/bin/activate
```

5. Install dependencies:
```bash
pip install -r requirements.txt
```

6. Download required NLTK resources in Python shell if needed:
```python
import nltk
nltk.download('punkt')
nltk.download('stopw
