document.addEventListener('DOMContentLoaded', function() {
    const fileDropArea = document.querySelector('.file-drop-area');
    const uploadForm = document.getElementById('uploadForm');
    let currentFileInput = document.getElementById('fileInput');
    let selectedFile = null;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileDropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        fileDropArea.addEventListener(eventName, () => fileDropArea.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileDropArea.addEventListener(eventName, () => fileDropArea.classList.remove('dragover'), false);
    });

    fileDropArea.addEventListener('drop', handleDrop);

    function handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFileSelect(files[0]);
    }

    document.querySelector('.choose-file-button').addEventListener('click', () => currentFileInput.click());
    currentFileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFileSelect(e.target.files[0]);
    });

    function handleFileSelect(file) {
        selectedFile = file;
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        const ext = file.name.split('.').pop().toUpperCase();
        fileDropArea.innerHTML = `
            <div style="text-align: center; padding: 25px;">
                <div style="font-size: 1.3rem; font-weight: 600; margin-bottom: 8px; color: var(--primary);">
                    ${file.name}
                </div>
                <div style="color: var(--text-light); font-size: 0.95rem; margin-bottom: 12px;">
                    ${fileSize} MB • ${ext}
                </div>
                <div style="color: var(--success); font-size: 0.9rem; font-weight: 500;">
                    ✓ Ready for AI analysis
                </div>
            </div>
            <input type="file" class="file-input" id="fileInput" accept=".pdf,.docx,.txt">
        `;
        currentFileInput = document.getElementById('fileInput');
        currentFileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) handleFileSelect(e.target.files[0]);
        });
    }

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedFile) return showAlert('Please select a file first!', 'error');

        const ext = selectedFile.name.split('.').pop().toLowerCase();
        if (!['pdf', 'docx', 'txt'].includes(ext)) return showAlert('Only PDF, DOCX, TXT!', 'error');
        if (selectedFile.size > 10 * 1024 * 1024) return showAlert('File too large (max 10MB)!', 'error');

        showLoader();
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch('/analyze', { method: 'POST', body: formData });
            const data = await response.json();

            if (response.ok) {
                displayResults(data);
            } else {
                throw new Error(data.error || 'Analysis failed');
            }
        } catch (error) {
            showAlert(`Error: ${error.message}`, 'error');
        } finally {
            hideLoader();
        }
    });

    function showLoader() {
        document.getElementById('loader').classList.remove('hidden');
        document.getElementById('results').classList.add('hidden');
        document.getElementById('analyzeBtn').disabled = true;
        document.getElementById('analyzeBtn').innerHTML = '⏳ Analyzing...';
    }

    function hideLoader() {
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('analyzeBtn').disabled = false;
        document.getElementById('analyzeBtn').innerHTML = '🚀 Analyze Document';
    }

    function displayResults(data) {
        document.getElementById('summaryText').textContent = data.summary || 'No summary.';
        
        const keywordsContainer = document.getElementById('keywordsContainer');
        keywordsContainer.innerHTML = '';
        if (data.keywords?.length) {
            data.keywords.slice(0, 12).forEach(keyword => {
                const span = document.createElement('span');
                span.className = 'tag';
                span.textContent = keyword;
                span.onclick = () => copyToClipboard(keyword, span);
                keywordsContainer.appendChild(span);
            });
        }

        const questionsList = document.getElementById('questionsList');
        questionsList.innerHTML = '';
        if (data.questions?.length) {
            data.questions.slice(0, 8).forEach(question => {
                const li = document.createElement('li');
                li.textContent = question;
                questionsList.appendChild(li);
            });
        }

        // 🔥 MCQ QUIZ SECTION
        const mcqSection = document.getElementById('mcqSection');
        if (data.mcqs && data.mcqs.length > 0) {
            mcqSection.innerHTML = `
                <div style="margin-bottom: 25px;">
                    <span style="color: var(--success); font-size: 1.2rem; font-weight: 700;">
                        ✅ ${data.mcqs.length} AI MCQs Generated
                    </span>
                </div>
                <div style="background: linear-gradient(135deg, rgba(159, 122, 234, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%); padding: 25px; border-radius: 16px; border-left: 5px solid #9f7aea; text-align: center;">
                    <button id="startQuizBtn" class="quiz-btn" style="background: linear-gradient(135deg, #9f7aea, #805ad5); color: white; border: none; padding: 16px 40px; border-radius: 30px; font-weight: 700; font-size: 1.1rem; cursor: pointer; box-shadow: 0 8px 25px rgba(159, 122, 234, 0.4);">
                        🎯 Take Interactive Quiz
                    </button>
                </div>
            `;
            document.getElementById('startQuizBtn').onclick = () => showQuizModal(data.mcqs);
        } else {
            mcqSection.innerHTML = '<p style="color: var(--text-light);">No MCQs generated</p>';
        }

        document.getElementById('wordCount').textContent = data.word_count || 0;
        document.getElementById('results').classList.remove('hidden');
        document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
    }

    // 🔥 FIXED QUIZ MODAL - NO GREEN BORDER BUG
    function showQuizModal(mcqs) {
        const modal = document.createElement('div');
        modal.id = 'quizModal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100vh; background: rgba(0,0,0,0.7); z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 20px;';

        let currentQuestion = 0;
        let score = 0;
        let answered = false;

        modal.innerHTML = `
            <div style="background: white; padding: 40px; border-radius: 24px; max-width: 650px; max-height: 85vh; overflow-y: auto; box-shadow: 0 25px 70px rgba(0,0,0,0.4);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #f7fafc;">
                    <div>
                        <h3 style="margin: 0 0 5px 0; color: #9f7aea; font-size: 1.4rem;">📝 Document Quiz</h3>
                        <div style="color: #718096; font-size: 0.95rem;" id="questionCounter">Q1 of ${mcqs.length}</div>
                    </div>
                    <button id="closeQuizBtn" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #a0aec0; padding: 0; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">×</button>
                </div>
                <div id="quizContent"></div>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('closeQuizBtn').onclick = () => modal.remove();

        function showQuestion() {
            const q = mcqs[currentQuestion];
            answered = false;
            document.getElementById('questionCounter').textContent = `Q${currentQuestion + 1} of ${mcqs.length}`;

            document.getElementById('quizContent').innerHTML = `
                <div style="margin-bottom: 30px; padding: 25px; background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%); border-radius: 16px; border-left: 4px solid #9f7aea;">
                    <div style="font-size: 1.15rem; font-weight: 600; color: #2d3748; line-height: 1.5;">${q.question}</div>
                    <div style="color: #718096; font-size: 0.9rem; font-style: italic;">(${q.keyword?.toUpperCase() || 'General'})</div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 15px;" id="optionsContainer">
                    ${q.options.map((option, idx) => `
                        <button class="quiz-option" data-idx="${idx}" style="
                            padding: 18px 22px; background: #f7fafc; border: 2px solid #e2e8f0;
                            border-radius: 14px; cursor: pointer; font-size: 1rem; 
                            transition: all 0.3s ease; text-align: left; font-weight: 500;
                        ">
                            <span style="font-weight: 700; color: var(--primary); margin-right: 12px;">
                                ${String.fromCharCode(65 + idx)}.
                            </span>
                            ${option}
                        </button>
                    `).join('')}
                </div>
                <div style="margin-top: 25px; text-align: center;">
                    <button id="nextQuestionBtn" style="display: none; background: #9f7aea; color: white; border: none; padding: 12px 30px; border-radius: 25px; font-weight: 600; cursor: pointer;">Next →</button>
                </div>
            `;

            // ✅ FIXED: Clean option handlers
            document.querySelectorAll('.quiz-option').forEach(btn => {
                btn.onclick = function() {
                    if (answered) return;
                    answered = true;

                    const selectedIdx = parseInt(this.dataset.idx);
                    const correctIdx = mcqs[currentQuestion].correct;
                    const options = document.querySelectorAll('.quiz-option');

                    options.forEach((option, idx) => {
                        option.style.cursor = 'not-allowed';
                        option.disabled = true;

                        // ✅ FIXED: Only highlight AFTER selection
                        if (idx === correctIdx) {
                            option.style.background = '#48bb78';
                            option.style.color = 'white';
                            option.style.border = '3px solid #48bb78';
                        } else if (idx === selectedIdx && selectedIdx !== correctIdx) {
                            option.style.background = '#fed7d7';
                            option.style.color = '#c53030';
                            option.style.border = '3px solid #f56565';
                        }
                    });

                    if (selectedIdx === correctIdx) score++;
                    document.getElementById('nextQuestionBtn').style.display = 'inline-block';
                };
            });

            document.getElementById('nextQuestionBtn').onclick = () => {
                currentQuestion++;
                if (currentQuestion < mcqs.length) {
                    showQuestion();
                } else {
                    showQuizResults();
                }
            };
        }

        function showQuizResults() {
            const percentage = Math.round((score / mcqs.length) * 100);
            document.getElementById('quizContent').innerHTML = `
                <div style="text-align: center; padding: 50px 30px;">
                    <div style="font-size: 4rem; margin-bottom: 20px; font-weight: 700;">${score}/${mcqs.length}</div>
                    <h2 style="font-size: 1.8rem; margin: 0 0 20px 0;">${percentage}%</h2>
                    <p style="font-size: 1.2rem; color: #4a5568; margin-bottom: 30px;">
                        ${percentage >= 70 ? '🎉 Excellent!' : percentage >= 50 ? '👍 Good job!' : '📚 Keep studying!'}
                    </p>
                    <button onclick="document.getElementById('quizModal').remove()" style="
                        background: linear-gradient(135deg, #48bb78, #38a169); color: white; border: none; 
                        padding: 18px 50px; border-radius: 30px; font-size: 1.2rem; font-weight: 700; cursor: pointer;
                    ">🎉 Finish</button>
                </div>
            `;
        }

        showQuestion();
    }

    function copyToClipboard(text, element) {
        navigator.clipboard.writeText(text).then(() => {
            const original = element.textContent;
            element.textContent = 'Copied!';
            element.style.background = '#48bb78';
            setTimeout(() => {
                element.textContent = original;
                element.style.background = '';
            }, 1500);
        });
    }

    function showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 4000);
    }

    console.log('✅ Perfect AI Summarizer + MCQ Quiz loaded!');
});
