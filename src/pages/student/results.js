// ============================================
// RESULTS PAGE — Bhumi Soul Student
// Score display, answer review, confetti
// ============================================

import { supabase } from '../../supabase.js';
import { navigate, state } from '../../main.js';
import { showToast, formatDate, formatTime, getGrade, launchConfetti, staggerDelay } from '../../utils.js';

export async function renderResults(container, attemptId) {
  container.innerHTML = `
    <div class="results-container">
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading your results...</p>
      </div>
    </div>
  `;

  try {
    // Fetch attempt + answers + questions
    const { data: attempt, error: attemptError } = await supabase
      .from('test_attempts')
      .select('*, tests(title, total_questions, category, difficulty)')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) throw new Error('Attempt not found');

    const { data: answers } = await supabase
      .from('attempt_answers')
      .select('*, questions(question_text, option_a, option_b, option_c, option_d, correct_answer, order_num)')
      .eq('attempt_id', attemptId)
      .order('created_at');

    const sortedAnswers = (answers || []).sort((a, b) => 
      (a.questions?.order_num || 0) - (b.questions?.order_num || 0)
    );

    const grade = getGrade(attempt.percentage || 0);
    const correct = sortedAnswers.filter(a => a.is_correct).length;
    const incorrect = sortedAnswers.filter(a => !a.is_correct && a.selected_answer).length;
    const skipped = sortedAnswers.filter(a => !a.selected_answer).length;
    
    // Proctoring Data
    const tabSwitches = attempt.tab_switches || 0;
    const proctorColor = tabSwitches === 0 ? '#00f260' : tabSwitches < 3 ? '#f5af19' : '#f5576c';

    // Trigger confetti for good scores
    if (attempt.percentage >= 70) {
      setTimeout(() => launchConfetti(), 500);
    }

    // SVG circular progress
    const radius = 85;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (circumference * (attempt.percentage || 0)) / 100;

    container.innerHTML = `
      <div class="results-container page-enter">
        <!-- Score Circle -->
        <div class="results-score-circle">
          <svg width="200" height="200">
            <circle cx="100" cy="100" r="${radius}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="12"/>
            <circle cx="100" cy="100" r="${radius}" fill="none" stroke="${grade.color}" stroke-width="12"
              stroke-dasharray="${circumference}" 
              stroke-dashoffset="${offset}"
              stroke-linecap="round"
              style="transition: stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1);"
            />
          </svg>
          <div style="text-align: center;">
            <div class="score-text" style="color: ${grade.color}">${(attempt.percentage || 0).toFixed(0)}%</div>
            <div class="score-label">Grade: <strong style="color: ${grade.color}; font-size: 1.2rem;">${grade.grade}</strong></div>
          </div>
        </div>

        <h1 style="font-size: 1.8rem; margin-bottom: 4px;">
          ${attempt.percentage >= 80 ? '🎉 Excellent!' : attempt.percentage >= 60 ? '👍 Good Job!' : attempt.percentage >= 40 ? '💪 Keep Trying!' : '📚 Study More!'}
        </h1>
        <p style="color: var(--text-secondary); margin-bottom: 32px; font-size: 0.95rem;">
          ${attempt.tests?.title || 'Test'} • Completed on ${formatDate(attempt.completed_at)}
        </p>

        <!-- Stats Row -->
        <div class="results-stats">
          <div class="result-stat glass-card-static stagger-item" style="${staggerDelay(0)}">
            <div class="result-stat-value correct">${correct}</div>
            <div class="result-stat-label">✅ Correct</div>
          </div>
          <div class="result-stat glass-card-static stagger-item" style="${staggerDelay(1)}">
            <div class="result-stat-value incorrect">${incorrect}</div>
            <div class="result-stat-label">❌ Incorrect</div>
          </div>
          <div class="result-stat glass-card-static stagger-item" style="${staggerDelay(2)}">
            <div class="result-stat-value skipped">${skipped}</div>
            <div class="result-stat-label">⏭️ Skipped</div>
          </div>
        </div>

        <!-- Extra Info -->
        <div class="glass-card-static" style="padding: 20px; margin-bottom: 32px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; text-align: center;">
          <div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">Score</div>
            <div style="font-weight: 700; font-size: 1.1rem;">${attempt.score} / ${attempt.total_questions}</div>
          </div>
          <div style="border-left: 1px solid var(--border-glass);">
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">Time Taken</div>
            <div style="font-weight: 700; font-size: 1.1rem;">${formatTime(attempt.time_taken_seconds || 0)}</div>
          </div>
          <div style="border-left: 1px solid var(--border-glass);">
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">Difficulty</div>
            <div style="font-weight: 700; font-size: 1.1rem;">${attempt.tests?.difficulty || 'Medium'}</div>
          </div>
          <div style="border-left: 1px solid var(--border-glass);">
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">Proctoring Status</div>
            <div style="font-weight: 700; font-size: 1rem; color: ${proctorColor};">
              ${tabSwitches === 0 ? 'Clean' : `${tabSwitches} Violations`}
            </div>
          </div>
        </div>

        <!-- Answer Review -->
        <div class="answer-review">
          <h2 style="text-align: center; margin-bottom: 20px;">📋 Advanced Analytics & Review</h2>
          ${sortedAnswers.map((a, i) => {
            const q = a.questions;
            if (!q) return '';
            const selectedText = a.selected_answer ? q[`option_${a.selected_answer.toLowerCase()}`] : 'Not answered';
            const correctText = q[`option_${q.correct_answer.toLowerCase()}`];
            
            // Analytics visualization
            const testObj = attempt.tests || {};
            const avgTimeExpected = ((testObj.duration_minutes || 1) * 60) / (attempt.total_questions || 1);
            const timeColor = (a.time_spent_seconds || 0) > avgTimeExpected * 1.5 ? '#f5af19' : 'var(--text-secondary)';
            
            return `
              <div class="review-item glass-card-static ${a.is_correct ? 'correct-review' : 'incorrect-review'} stagger-item" 
                   style="${staggerDelay(i + 3)}; position: relative;">
                
                <div style="position: absolute; top: 16px; right: 20px; font-size: 0.8rem; color: ${timeColor}; display: flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px;">
                  ⏱️ ${a.time_spent_seconds || 0}s
                </div>

                <div class="review-question" style="padding-right: 60px;">
                  <span style="color: var(--text-muted); margin-right: 8px;">Q${i + 1}.</span>
                  ${q.question_text}
                </div>
                <div class="review-answer">
                  Your answer: 
                  <span class="${a.is_correct ? 'correct-text' : 'incorrect-text'}">
                    ${a.selected_answer ? `${a.selected_answer}) ${selectedText}` : 'Skipped'} 
                    ${a.is_correct ? '✅' : '❌'}
                  </span>
                  ${!a.is_correct ? `
                    <br>Correct answer: 
                    <span class="correct-text">${q.correct_answer}) ${correctText} ✓</span>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Actions -->
        <div style="margin-top: 32px; display: flex; gap: 12px; justify-content: center;">
          <button class="btn btn-primary btn-lg" id="back-dashboard-btn">
            🏠 Back to Dashboard
          </button>
        </div>
      </div>
    `;

    document.getElementById('back-dashboard-btn').addEventListener('click', () => {
      navigate('student-dashboard');
    });

  } catch (err) {
    console.error('Results error:', err);
    showToast('Failed to load results: ' + err.message, 'error');
    navigate('student-dashboard');
  }
}
