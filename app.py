import os
import nltk
import re
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import pdfplumber
import docx
from transformers import pipeline
from rake_nltk import Rake
import traceback

# Download NLTK data
nltk.download('punkt', quiet=True)
nltk.download('stopwords', quiet=True)
nltk.download('punkt_tab', quiet=True)

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Load summarizer safely
summarizer = None
try:
    print("🔄 Loading T5 model...")
    summarizer = pipeline("summarization", model="t5-small", device=-1)
    print("✅ T5 model loaded!")
except Exception as e:
    print(f"❌ Model loading failed: {e}")

def extract_text_from_file(filepath, extension):
    try:
        if extension == 'pdf':
            with pdfplumber.open(filepath) as pdf:
                text = ""
                for page in pdf.pages[:10]:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                return text
        elif extension == 'docx':
            doc = docx.Document(filepath)
            return "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
        elif extension == 'txt':
            with open(filepath, 'r', encoding='utf-8') as f:
                return f.read()
    except Exception as e:
        print(f"❌ Text extraction failed: {e}")
    return ""

def generate_summary(text):
    """✅ FIXED: Clean, readable summaries"""
    if len(text) < 50:
        return "Document too short for summary."
    
    text = re.sub(r'\s+', ' ', text[:3000]).strip()
    
    # Try T5 with clean output
    if summarizer:
        try:
            input_text = "summarize: " + text[:500]
            result = summarizer(input_text, max_length=120, min_length=30, do_sample=False, clean_up_tokenization_spaces=True)
            summary = result[0]['summary_text'].strip()
            
            # Clean formatting
            summary = re.sub(r'\s+', ' ', summary)
            summary = re.sub(r'\.\s*\.', '.', summary)
            summary = summary.replace(' . ', '. ').replace(' , ', ', ')
            
            if len(summary) > 20:
                return summary.capitalize()
        except:
            pass
    
    # ✅ BETTER FALLBACK: Extractive summary
    sentences = nltk.sent_tokenize(text)
    if len(sentences) < 3:
        return '. '.join(sentences[:2]) + '.'
    
    # First sentence + 2 longest sentences
    summary_sentences = [sentences[0]]
    scored = [(i, len(s.split())) for i, s in enumerate(sentences[1:], 1)]
    top_sentences = sorted(scored, key=lambda x: x[1], reverse=True)[:2]
    
    for idx, _ in top_sentences:
        summary_sentences.append(sentences[idx])
    
    summary = ' '.join(summary_sentences)
    return summary[:400].rstrip('.') + '.'

def extract_keywords(text):
    keywords = []
    text_sample = text[:3000].lower()
    
    try:
        r = Rake()
        r.extract_keywords_from_text(text_sample)
        rake_kw = r.get_ranked_phrases()[:10]
        keywords = [kw.strip() for kw in rake_kw if len(kw.split()) <= 4]
    except:
        pass
    
    if len(keywords) < 6:
        words = nltk.word_tokenize(text_sample)
        stop_words = set(nltk.corpus.stopwords.words('english'))
        freq = {}
        for word in words:
            if word.isalpha() and len(word) > 2 and word not in stop_words:
                freq[word] = freq.get(word, 0) + 1
        fallback = sorted(freq, key=freq.get, reverse=True)[:8]
        keywords.extend(fallback[:10-len(keywords)])
    
    if not keywords:
        keywords = ['skills', 'experience', 'professional']
    
    return keywords[:12]

def generate_questions(text, keywords):
    questions = []
    for kw in keywords[:4]:
        questions.extend([f"What is '{kw}'?", f"Why is '{kw}' important?"])
    return questions[:6]

def generate_mcqs(text, keywords, num_questions=6):
    """✅ FIXED MCQs with realistic content"""
    mcq_templates = [
        ("What is the primary role of '{}'?", ["Core responsibility", "Key skill", "Team member", "Irrelevant"]),
        ("'{}' refers to?", ["Main expertise", "Company name", "Job title", "Location"]),
        ("What does '{}' enable?", ["Task automation", "Document storage", "Email management", "Reporting"]),
        ("Why is '{}' important?", ["Business impact", "Office location", "Salary details", "Office hours"])
    ]
    
    questions = []
    for i, kw in enumerate(keywords[:num_questions]):
        if i < len(mcq_templates):
            q_template, options = mcq_templates[i % len(mcq_templates)]
            question = q_template.format(kw)
            
            correct_idx = i % 3  # 0, 1, or 2
            final_options = options.copy()
            final_options[correct_idx], final_options[3] = final_options[3], final_options[correct_idx]
            
            questions.append({
                'question': question,
                'options': final_options,
                'correct': correct_idx,
                'keyword': kw
            })
    
    return questions

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze_document():
    print("🎯 ANALYZE REQUEST")
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    filename = file.filename
    extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    file.save(filepath)
    
    try:
        text = extract_text_from_file(filepath, extension)
        if len(text.strip()) < 20:
            return jsonify({'error': 'No readable text found'}), 400
        
        summary = generate_summary(text)
        keywords = extract_keywords(text)
        questions = generate_questions(text, keywords)
        mcqs = generate_mcqs(text, keywords)
        word_count = len(text.split())
        
        if os.path.exists(filepath):
            os.remove(filepath)
        
        return jsonify({
            'summary': summary,
            'keywords': keywords,
            'questions': questions,
            'mcqs': mcqs,
            'word_count': word_count
        })
        
    except Exception as e:
        print(f"ERROR: {traceback.format_exc()}")
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500

if __name__ == '__main__':
    print("🚀 AI Document Summarizer + MCQ Quiz")
    app.run(debug=True, port=5000)
