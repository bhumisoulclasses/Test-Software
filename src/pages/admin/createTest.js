// ============================================
// CREATE TEST PAGE — Bhumi Soul Admin
// Upload TXT, preview, save to Supabase
// ============================================

import { supabase } from '../../supabase.js';
import { navigate, state } from '../../main.js';
import { showToast } from '../../utils.js';
import { parseQuestionsTxt } from '../../parser.js';
import { buildLayout, attachSidebarListeners } from './dashboard.js';

export function renderCreateTest(container) {
  container.innerHTML = buildLayout('create-test', `
    <div class="top-bar">
      <div>
        <h1>Create New Test</h1>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">
          Upload a TXT file with questions or enter them manually.
        </p>
      </div>
    </div>
    
    <!-- Test Info Form -->
    <div class="glass-card-static" style="padding: 28px; margin-bottom: 24px;">
      <h3 style="margin-bottom: 20px; font-size: 1.1rem;">📋 Test Information</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div class="input-group">
          <label for="test-title">Test Title *</label>
          <input type="text" id="test-title" class="input-field" placeholder="e.g., Mathematics Quiz - Chapter 5" required>
        </div>
        <div class="input-group">
          <label for="test-category">Category</label>
          <input type="text" id="test-category" class="input-field" placeholder="e.g., Mathematics, Science" value="General">
        </div>
        <div class="input-group">
          <label for="test-duration">Duration (minutes)</label>
          <input type="number" id="test-duration" class="input-field" placeholder="30" value="30" min="1" max="300">
        </div>
        <div class="input-group">
          <label for="test-difficulty">Difficulty</label>
          <select id="test-difficulty" class="input-field">
            <option value="Easy">Easy</option>
            <option value="Medium" selected>Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>
      <div class="input-group">
        <label for="test-description">Description (optional)</label>
        <input type="text" id="test-description" class="input-field" placeholder="Brief description of this test...">
      </div>
    </div>
    
    <!-- Upload Section -->
    <div class="glass-card-static" style="padding: 28px; margin-bottom: 24px;">
      <h3 style="margin-bottom: 16px; font-size: 1.1rem;">📄 Upload Questions (TXT File)</h3>
      <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">
        Upload a .txt file in one of these formats:
      </p>
      <div class="glass-card-static" style="padding: 16px; margin-bottom: 20px; font-family: monospace; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.8;">
        1. What is 2 + 2?<br>
        A) 3<br>
        B) 4<br>
        C) 5<br>
        D) 6<br>
        Answer: B<br><br>
        2. What is the capital of India?<br>
        A) Mumbai<br>
        B) Kolkata<br>
        C) New Delhi<br>
        D) Chennai<br>
        Answer: C
      </div>
      
      <div class="upload-zone" id="upload-zone">
        <span class="upload-zone-icon">📂</span>
        <h3>Drop your TXT file here</h3>
        <p>or click to browse • Supports .txt files</p>
        <input type="file" id="file-input" accept=".txt" style="display: none;">
      </div>
      
      <div id="file-info" style="margin-top: 12px; display: none;">
        <div class="glass-card-static" style="padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
          <span id="file-name" style="font-size: 0.9rem;">📄 file.txt</span>
          <button class="btn btn-sm btn-danger" id="remove-file">✕ Remove</button>
        </div>
      </div>
    </div>
    
    <!-- Manual Builder Section -->
    <div class="glass-card-static" style="padding: 28px; margin-bottom: 24px;">
      <h3 style="margin-bottom: 16px; font-size: 1.1rem;">✍️ Manual Question Builder</h3>
      <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 20px;">
        Alternatively, manually type your questions below and add them to the test one by one.
      </p>
      
      <div class="input-group" style="margin-bottom: 16px;">
        <label>Question Text *</label>
        <textarea id="manual-q-text" class="input-field" rows="2" placeholder="Enter question here..."></textarea>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
        <div class="input-group">
          <label>Option A *</label>
          <input type="text" id="manual-q-a" class="input-field" placeholder="Option A text">
        </div>
        <div class="input-group">
          <label>Option B *</label>
          <input type="text" id="manual-q-b" class="input-field" placeholder="Option B text">
        </div>
        <div class="input-group">
          <label>Option C *</label>
          <input type="text" id="manual-q-c" class="input-field" placeholder="Option C text">
        </div>
        <div class="input-group">
          <label>Option D *</label>
          <input type="text" id="manual-q-d" class="input-field" placeholder="Option D text">
        </div>
      </div>
      
      <div style="display: flex; gap: 16px; align-items: center;">
        <div class="input-group" style="flex: 1;">
          <label>Correct Answer *</label>
          <select id="manual-q-ans" class="input-field">
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </div>
        <button class="btn btn-primary" id="add-manual-q-btn" style="flex: 2; height: 48px; margin-top: 18px;">
          ➕ Add Question to Preview
        </button>
      </div>
    </div>
    
    <!-- Question Preview -->
    <div id="preview-section" style="display: none;">
      <div class="section-header">
        <h2>👁️ Preview Questions (<span id="question-count">0</span> found)</h2>
      </div>
      <div class="glass-card-static" style="padding: 24px; margin-bottom: 24px; max-height: 500px; overflow-y: auto;">
        <div id="questions-preview"></div>
      </div>
    </div>
    
    <!-- Submit -->
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button class="btn btn-secondary" id="cancel-btn">Cancel</button>
      <button class="btn btn-primary btn-lg" id="save-test-btn" disabled>
        💾 Save Test & Publish
      </button>
    </div>
  `);

  attachSidebarListeners(container);
  
  let parsedQuestions = [];

  // Upload zone interactions
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  const fileInfo = document.getElementById('file-info');

  uploadZone.addEventListener('click', () => fileInput.click());
  
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });
  
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.txt')) {
      processFile(file);
    } else {
      showToast('Please upload a .txt file', 'error');
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) processFile(e.target.files[0]);
  });

  document.getElementById('remove-file').addEventListener('click', () => {
    parsedQuestions = [];
    fileInput.value = '';
    fileInfo.style.display = 'none';
    uploadZone.style.display = 'block';
    renderPreview();
  });

  // Manual Question Builder Logic
  document.getElementById('add-manual-q-btn').addEventListener('click', () => {
    const qText = document.getElementById('manual-q-text').value.trim();
    const optA = document.getElementById('manual-q-a').value.trim();
    const optB = document.getElementById('manual-q-b').value.trim();
    const optC = document.getElementById('manual-q-c').value.trim();
    const optD = document.getElementById('manual-q-d').value.trim();
    const ans = document.getElementById('manual-q-ans').value;

    if (!qText || !optA || !optB || !optC || !optD) {
      showToast('Please fill out the question and all 4 options', 'error');
      return;
    }

    parsedQuestions.push({
      question_text: qText,
      option_a: optA,
      option_b: optB,
      option_c: optC,
      option_d: optD,
      correct_answer: ans
    });

    // Clear inputs
    document.getElementById('manual-q-text').value = '';
    document.getElementById('manual-q-a').value = '';
    document.getElementById('manual-q-b').value = '';
    document.getElementById('manual-q-c').value = '';
    document.getElementById('manual-q-d').value = '';

    showToast('Question added manually!', 'success');
    renderPreview();
  });

  function processFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const fileQs = parseQuestionsTxt(content);
      
      if (fileQs.length === 0) {
        showToast('No questions could be parsed from this file. Check the format.', 'error');
        return;
      }

      parsedQuestions = [...parsedQuestions, ...fileQs];

      // Show file info
      document.getElementById('file-name').textContent = `📄 ${file.name}`;
      fileInfo.style.display = 'block';
      uploadZone.style.display = 'none';
      
      showToast(`${fileQs.length} questions parsed successfully! ✅`, 'success');
      renderPreview();
    };
    reader.readAsText(file);
  }

  function renderPreview() {
    const previewSection = document.getElementById('preview-section');
    const saveBtn = document.getElementById('save-test-btn');
    
    if (parsedQuestions.length === 0) {
      previewSection.style.display = 'none';
      saveBtn.disabled = true;
      return;
    }

    previewSection.style.display = 'block';
    document.getElementById('question-count').textContent = parsedQuestions.length;
    
    const previewEl = document.getElementById('questions-preview');
    previewEl.innerHTML = parsedQuestions.map((q, i) => `
      <div class="glass-card" style="padding: 16px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="background: var(--gradient-main); color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; flex-shrink: 0;">
              ${i + 1}
            </span>
            <strong style="font-size: 0.95rem;">${q.question_text}</strong>
          </div>
          <button class="btn btn-sm btn-danger remove-q-btn" data-idx="${i}" style="padding: 4px 8px; font-size: 0.75rem;">Delete</button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem; color: var(--text-secondary);">
          <div style="padding: 8px; border-radius: 6px; ${q.correct_answer === 'A' ? 'background: rgba(0,242,96,0.1); color: var(--accent);' : ''}">A) ${q.option_a}</div>
          <div style="padding: 8px; border-radius: 6px; ${q.correct_answer === 'B' ? 'background: rgba(0,242,96,0.1); color: var(--accent);' : ''}">B) ${q.option_b}</div>
          <div style="padding: 8px; border-radius: 6px; ${q.correct_answer === 'C' ? 'background: rgba(0,242,96,0.1); color: var(--accent);' : ''}">C) ${q.option_c}</div>
          <div style="padding: 8px; border-radius: 6px; ${q.correct_answer === 'D' ? 'background: rgba(0,242,96,0.1); color: var(--accent);' : ''}">D) ${q.option_d}</div>
        </div>
        <div style="margin-top: 8px; font-size: 0.8rem; color: var(--accent); font-weight: 600;">
          ✓ Correct: ${q.correct_answer}
        </div>
      </div>
    `).join('');

    saveBtn.disabled = false;

    // Attach delete listeners
    document.querySelectorAll('.remove-q-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        parsedQuestions.splice(idx, 1);
        renderPreview();
      });
    });
  }

  // Save test
  document.getElementById('save-test-btn').addEventListener('click', async () => {
    const title = document.getElementById('test-title').value.trim();
    if (!title) {
      showToast('Please enter a test title', 'error');
      return;
    }
    if (parsedQuestions.length === 0) {
      showToast('No questions to save', 'error');
      return;
    }

    const btn = document.getElementById('save-test-btn');
    btn.innerHTML = '<div class="spinner spinner-sm" style="display:inline-block"></div> Saving...';
    btn.disabled = true;

    try {
      // Create test
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .insert({
          title,
          description: document.getElementById('test-description').value.trim() || null,
          duration_minutes: parseInt(document.getElementById('test-duration').value) || 30,
          difficulty: document.getElementById('test-difficulty').value,
          category: document.getElementById('test-category').value.trim() || 'General',
          total_questions: parsedQuestions.length,
          is_active: true,
        })
        .select()
        .single();

      if (testError) throw testError;

      // Insert questions
      const questionsToInsert = parsedQuestions.map((q, i) => ({
        test_id: testData.id,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        order_num: i + 1,
      }));

      const { error: qError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (qError) throw qError;

      showToast(`Test "${title}" created with ${parsedQuestions.length} questions! 🎉`, 'success');
      navigate('admin-dashboard');

    } catch (err) {
      console.error('Save test error:', err);
      showToast('Failed to save test: ' + err.message, 'error');
      btn.innerHTML = '💾 Save Test & Publish';
      btn.disabled = false;
    }
  });

  // Cancel
  document.getElementById('cancel-btn').addEventListener('click', () => navigate('admin-dashboard'));
}
