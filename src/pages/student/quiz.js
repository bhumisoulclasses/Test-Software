// ============================================
// QUIZ ENGINE — Bhumi Soul Student
// Pro Features: Anti-cheat, Fullscreen, Analytics
// ============================================

import { supabase } from '../../supabase.js';
import { navigate, state } from '../../main.js';
import { showToast, formatTime, shuffleArray, saveLocal, loadLocal } from '../../utils.js';

let quizTimer = null;
let questionTimers = {}; // { questionIndex: seconds }
let currentQuestionActiveStartTime = Date.now();
let tabSwitchCount = 0;
let isFullscreen = false;

export async function renderQuiz(container, testId) {
  const student = state.student;
  if (!student) { navigate('login'); return; }

  // Reset state
  tabSwitchCount = 0;
  questionTimers = {};
  isFullscreen = false;

  container.innerHTML = `
    <div class="quiz-container">
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Initializing secure environments...</p>
      </div>
    </div>
  `;

  try {
    // Fetch test & questions (Omit correct_answer for security)
    const [testRes, questionsRes] = await Promise.all([
      supabase.from('tests').select('*').eq('id', testId).single(),
      supabase.from('questions').select('id, test_id, question_text, option_a, option_b, option_c, option_d, order_num').eq('test_id', testId).order('order_num'),
    ]);

    const test = testRes.data;
    let questions = questionsRes.data || [];

    if (!test || questions.length === 0) {
      showToast('Test not found or has no questions', 'error');
      navigate('student-dashboard');
      return;
    }

    // Look for an existing incomplete attempt first
    let attempt;
    const { data: existingAttempts } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('student_id', student.id)
      .eq('test_id', testId)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1);

    if (existingAttempts && existingAttempts.length > 0) {
      attempt = existingAttempts[0];
      tabSwitchCount = attempt.tab_switches || 0;
    } else {
      const { data: newAttempt, error: attemptError } = await supabase
        .from('test_attempts')
        .insert({
          student_id: student.id,
          test_id: testId,
          total_questions: questions.length,
          status: 'in_progress',
          tab_switches: 0
        })
        .select()
        .single();

      if (attemptError) throw attemptError;
      attempt = newAttempt;
    }

    // Auto-Save / State Resumption
    const quizStateKey = `bhumi_quiz_${attempt.id}`;
    let quizState = loadLocal(quizStateKey);

    if (quizState && quizState.questionOrder) {
      // Re-order questions based on saved randomized sequence
      const order = quizState.questionOrder;
      if (order.length === questions.length) {
        questions.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      }
    } else {
      // First time loading -> shuffle and save
      questions = shuffleArray(questions);
      quizState = {
        currentQuestion: 0,
        questionOrder: questions.map(q => q.id),
        answers: new Array(questions.length).fill(null), // 'A', 'B', 'C', 'D'
        flagged: new Array(questions.length).fill(false),
        timeLeft: test.duration_minutes * 60,
        attemptId: attempt.id,
        submitted: false,
      };
      saveLocal(quizStateKey, quizState);
    }

    // Force Fullscreen Modal Before Start
    renderFullscreenPrompt(container, test, questions, quizState);

  } catch (err) {
    console.error('Quiz load error:', err);
    showToast('Failed to load quiz: ' + err.message, 'error');
    navigate('student-dashboard');
  }
}

function renderFullscreenPrompt(container, test, questions, quizState) {
  container.innerHTML = `
    <div class="quiz-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 70vh; text-align: center;">
      <div class="empty-state-icon" style="opacity: 1; font-size: 4rem; margin-bottom: 24px;">🛡️</div>
      <h2 style="font-size: 1.8rem; margin-bottom: 16px;">Strict Environment Required</h2>
      <p style="color: var(--text-secondary); max-width: 500px; margin-bottom: 32px;">
        This test uses <strong>Bhumi Soul ProGuard™</strong>. <br>
        1. The test must be taken in Fullscreen mode.<br>
        2. Switching tabs or minimizing the window will be logged as a violation.<br>
        3. 3 violations will result in auto-submission and a penalty.
      </p>
      <button class="btn btn-primary btn-lg" id="enter-fullscreen-btn">
        Enter Fullscreen & Start Test
      </button>
      <button class="btn btn-secondary" style="margin-top: 16px;" id="cancel-test-btn">
        Cancel
      </button>
    </div>
  `;

  document.getElementById('cancel-test-btn').addEventListener('click', () => navigate('student-dashboard'));

  document.getElementById('enter-fullscreen-btn').addEventListener('click', async () => {
    try {
      // 1. Request Webcam Permission First
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      quizState.proctorStream = stream;

      // 2. Request Fullscreen
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) { /* Safari */
        await document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) { /* IE11 */
        await document.documentElement.msRequestFullscreen();
      }
      
      isFullscreen = true;
      currentQuestionActiveStartTime = Date.now();

      // 3. Inject Floating Webcam UI globally
      const camWrapper = document.createElement('div');
      camWrapper.className = 'proctor-cam-container';
      camWrapper.id = 'proctor-cam-wrapper';
      camWrapper.innerHTML = '<video id="proctor-cam" autoplay playsinline muted></video>';
      document.body.appendChild(camWrapper);
      document.getElementById('proctor-cam').srcObject = stream;

      renderQuizUI(container, test, questions, quizState);
      setupAntiCheat(container, test, questions, quizState);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
        showToast('Camera access is strictly required for proctoring. Please allow permissions.', 'error');
      } else {
        showToast('Fullscreen is required to take this test. Please try again.', 'error');
      }
    }
  });
}

function setupAntiCheat(container, test, questions, quizState) {
  const handleVisibilityChange = () => {
    if (document.hidden && !quizState.submitted) {
      tabSwitchCount++;
      
      if (tabSwitchCount >= 3) {
        showToast('🚨 Violation Limit Exceeded! Auto-submitting test.', 'error');
        submitQuiz(container, test, questions, quizState);
      } else {
        showWarningModal(`🚨 PROCTOR ALERT (${tabSwitchCount}/3) 🚨<br>You navigated away from the test. This has been logged. Continuous violations will automatically submit your test.`);
        
        // Update DB with tab switch count
        supabase.from('test_attempts')
          .update({ tab_switches: tabSwitchCount })
          .eq('id', quizState.attemptId)
          .then(() => {}); 
      }
    }
  };

  const handleFullscreenChange = () => {
    if (!document.fullscreenElement && !quizState.submitted) {
      showWarningModal(`🚨 PROCTOR ALERT 🚨<br>Fullscreen mode exited. Please return to fullscreen immediately.`);
    }
  };

  const preventCopyPaste = (e) => {
    e.preventDefault();
    showToast('⚠️ Copy/Paste is strictly prohibited during the exam.', 'error');
  };

  const preventContextMenu = (e) => {
    e.preventDefault();
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('copy', preventCopyPaste);
  document.addEventListener('cut', preventCopyPaste);
  document.addEventListener('paste', preventCopyPaste);
  document.addEventListener('contextmenu', preventContextMenu);

  // Store cleanup
  quizState.cleanupEvents = () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('copy', preventCopyPaste);
    document.removeEventListener('cut', preventCopyPaste);
    document.removeEventListener('paste', preventCopyPaste);
    document.removeEventListener('contextmenu', preventContextMenu);
    
    // Cleanup WebRTC Camera Stream
    if (quizState.proctorStream) {
      quizState.proctorStream.getTracks().forEach(track => track.stop());
    }
    const camWrapper = document.getElementById('proctor-cam-wrapper');
    if (camWrapper) {
      camWrapper.remove();
    }
  };
}

function showWarningModal(message) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '99999';
  overlay.innerHTML = `
    <div class="modal-content glass-card-static" style="border-color: #f5576c; box-shadow: 0 0 40px rgba(245,87,108,0.3); text-align: center;">
      <div style="font-size: 3rem; margin-bottom: 16px;">⚠️</div>
      <h3 style="color: #f5576c; margin-bottom: 16px; font-size: 1.4rem;">Security Violation</h3>
      <p style="margin-bottom: 24px; font-size: 1.1rem; line-height: 1.6;">${message}</p>
      <button class="btn btn-danger btn-lg" id="dismiss-warning">I Understand</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#dismiss-warning').addEventListener('click', () => overlay.remove());
}

function renderQuizUI(container, test, questions, quizState) {
  function render() {
    const q = questions[quizState.currentQuestion];
    const idx = quizState.currentQuestion;
    const total = questions.length;
    const progress = ((idx + 1) / total) * 100;

    container.innerHTML = `
      <div class="quiz-container">
        <!-- Header -->
        <div class="quiz-header">
          <div>
            <h2 style="font-size: 1.2rem; font-weight: 700;">${test.title}</h2>
            <p style="color: var(--text-secondary); font-size: 0.85rem;">${total} Questions • ${test.difficulty || 'Medium'}</p>
          </div>
          <div class="quiz-timer ${quizState.timeLeft <= 60 ? 'warning' : ''}" id="timer">
            ⏱️ <span id="timer-text">${formatTime(quizState.timeLeft)}</span>
          </div>
        </div>
        
        <!-- Progress -->
        <div class="quiz-progress">
          <div class="quiz-progress-bar" style="width: ${progress}%"></div>
        </div>
        
        <!-- Question Palette -->
        <div style="margin-bottom: 8px; font-size: 0.85rem; color: var(--text-secondary); display: flex; justify-content: space-between;">
           <span>Question Navigator</span>
           <span style="color: #f5af19; display: flex; align-items: center; gap: 4px;">🚩 Flagged for review</span>
        </div>
        <div class="question-palette">
          ${questions.map((_, i) => {
            const isAnswered = quizState.answers[i] !== null;
            const isCurrent = i === idx;
            const isFlagged = quizState.flagged[i];
            
            let classes = 'palette-btn';
            if (isAnswered) classes += ' answered';
            if (isCurrent) classes += ' current';
            if (isFlagged) classes += ' flagged';
            
            return `
              <button class="${classes}" data-q-idx="${i}">
                ${i + 1}
                ${isFlagged ? '<span style="position: absolute; top: -4px; right: -4px; font-size: 10px;">🚩</span>' : ''}
              </button>
            `;
          }).join('')}
        </div>
        
        <!-- Question Card -->
        <div class="question-card glass-card-static">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <div class="question-number" style="margin-bottom: 0;">Question ${idx + 1} of ${total}</div>
            <button class="btn btn-sm ${quizState.flagged[idx] ? 'btn-primary' : 'btn-glass'}" id="flag-btn" style="border-radius: 6px; padding: 6px 12px; font-size: 0.8rem;">
              ${quizState.flagged[idx] ? '🚩 Unflag' : '🚩 Flag for review'}
            </button>
          </div>
          <div class="question-text">${q.question_text}</div>
          <div class="options-list">
            ${['A', 'B', 'C', 'D'].map(letter => {
              const optionText = q[`option_${letter.toLowerCase()}`];
              const isSelected = quizState.answers[idx] === letter;
              return `
                <button class="option-btn ${isSelected ? 'selected' : ''}" data-option="${letter}">
                  <span class="option-letter">${letter}</span>
                  <span>${optionText}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
        
        <!-- Navigation -->
        <div class="quiz-nav">
          <button class="btn btn-glass" id="prev-btn" ${idx === 0 ? 'disabled style="opacity:0.4;pointer-events:none;"' : ''}>
            ← Previous
          </button>
          <span style="color: var(--text-secondary); font-size: 0.9rem;">
            ${quizState.answers.filter(a => a !== null).length} / ${total} answered
          </span>
          ${idx === total - 1 ? `
            <button class="btn btn-primary" id="submit-btn">
              🏁 Submit Test
            </button>
          ` : `
            <button class="btn btn-primary" id="next-btn">
              Next →
            </button>
          `}
        </div>
      </div>
    `;

    // Helper to log time
    const logTimeForCurrentQuestion = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - currentQuestionActiveStartTime) / 1000);
      questionTimers[idx] = (questionTimers[idx] || 0) + elapsed;
      currentQuestionActiveStartTime = now; // reset for next question
    };

    // Attach event listeners
    // Option selection
    container.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        quizState.answers[idx] = btn.dataset.option;
        saveLocal(`bhumi_quiz_${quizState.attemptId}`, quizState);
        // Auto-next after short delay for better UX
        setTimeout(() => {
          if (idx < total - 1) {
            logTimeForCurrentQuestion();
            quizState.currentQuestion++;
            render();
          } else {
            render(); // just rerender to show selection if last question
          }
        }, 300);
        render(); // immediately show selection
      });
    });

    // Flag button
    const flagBtn = document.getElementById('flag-btn');
    if (flagBtn) {
      flagBtn.addEventListener('click', () => {
        quizState.flagged[idx] = !quizState.flagged[idx];
        saveLocal(`bhumi_quiz_${quizState.attemptId}`, quizState);
        render();
      });
    }

    // Palette navigation
    container.querySelectorAll('.palette-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        logTimeForCurrentQuestion();
        quizState.currentQuestion = parseInt(btn.dataset.qIdx);
        render();
      });
    });

    // Previous
    const prevBtn = document.getElementById('prev-btn');
    if (prevBtn && idx > 0) {
      prevBtn.addEventListener('click', () => {
        logTimeForCurrentQuestion();
        quizState.currentQuestion--;
        render();
      });
    }

    // Next
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        logTimeForCurrentQuestion();
        quizState.currentQuestion++;
        render();
      });
    }

    // Submit
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        logTimeForCurrentQuestion();
        const unanswered = quizState.answers.filter(a => a === null).length;
        if (unanswered > 0) {
          if (!confirm(`You have ${unanswered} unanswered question(s). Are you sure you want to submit?`)) {
            return;
          }
        }
        submitQuiz(container, test, questions, quizState);
      });
    }
  }

  // Start timer
  if (quizTimer) clearInterval(quizTimer);
  quizTimer = setInterval(() => {
    quizState.timeLeft--;
    const timerText = document.getElementById('timer-text');
    const timerEl = document.getElementById('timer');
    
    if (timerText) timerText.textContent = formatTime(quizState.timeLeft);
    if (timerEl && quizState.timeLeft <= 60) timerEl.classList.add('warning');
    
    if (quizState.timeLeft % 5 === 0) {
      saveLocal(`bhumi_quiz_${quizState.attemptId}`, quizState);
    }
    
    if (quizState.timeLeft <= 0) {
      clearInterval(quizTimer);
      showToast('⏰ Time is up! Auto-submitting...', 'info');
      submitQuiz(container, test, questions, quizState);
    }
  }, 1000);

  render();
}

async function submitQuiz(container, test, questions, quizState) {
  if (quizState.submitted) return;
  quizState.submitted = true;
  
  if (quizTimer) clearInterval(quizTimer);
  if (quizState.cleanupEvents) quizState.cleanupEvents();
  
  localStorage.removeItem(`bhumi_quiz_${quizState.attemptId}`);
  
  // Exit fullscreen if active
  if (document.fullscreenElement) {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  container.innerHTML = `
    <div class="quiz-container">
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Crunching Analytics & Submitting...</p>
      </div>
    </div>
  `;

  try {
    // 🚨 SECURE FETCH: Get correct answers *only* when submitting 🚨
    const { data: secureQuestions, error: fetchError } = await supabase
      .from('questions')
      .select('id, correct_answer')
      .eq('test_id', test.id);
      
    if (fetchError) throw fetchError;
    
    // Map secure answers for validation
    const answerMap = {};
    secureQuestions.forEach(sq => {
      answerMap[sq.id] = sq.correct_answer;
    });

    // Calculate score
    let score = 0;
    const answerRecords = [];

    questions.forEach((q, i) => {
      const selectedAnswer = quizState.answers[i];
      const actualCorrectAnswer = answerMap[q.id];
      const isCorrect = selectedAnswer === actualCorrectAnswer;
      if (isCorrect) score++;
      
      const timeSpent = questionTimers[i] || 0;
      
      answerRecords.push({
        attempt_id: quizState.attemptId,
        question_id: q.id,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        time_spent_seconds: timeSpent // Analytics
      });
    });

    const percentage = (score / questions.length) * 100;
    const timeTaken = (test.duration_minutes * 60) - quizState.timeLeft;

    // Save answers
    const { error: answersError } = await supabase
      .from('attempt_answers')
      .insert(answerRecords);
    if (answersError) throw answersError;

    // Update attempt
    const { error: attemptError } = await supabase
      .from('test_attempts')
      .update({
        score,
        percentage,
        time_taken_seconds: timeTaken,
        completed_at: new Date().toISOString(),
        status: 'completed',
        tab_switches: tabSwitchCount
      })
      .eq('id', quizState.attemptId);
    if (attemptError) throw attemptError;

    // Update student stats
    const { data: allAttempts } = await supabase
      .from('test_attempts')
      .select('percentage')
      .eq('student_id', state.student.id)
      .eq('status', 'completed');

    if (allAttempts) {
      const avgScore = allAttempts.reduce((s, a) => s + (a.percentage || 0), 0) / allAttempts.length;
      await supabase
        .from('students')
        .update({
          total_tests_taken: allAttempts.length,
          average_score: avgScore,
        })
        .eq('id', state.student.id);
    }

    // Navigate to results
    showToast('Test submitted successfully! 🎉', 'success');
    navigate('student-results', { currentAttemptId: quizState.attemptId });

  } catch (err) {
    console.error('Submit quiz error:', err);
    showToast('Failed to submit: ' + err.message, 'error');
    navigate('student-dashboard');
  }
}
