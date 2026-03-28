// ============================================
// STUDENT DASHBOARD — Bhumi Soul
// Available tests, past results, profile
// ============================================

import { supabase } from '../../supabase.js';
import { navigate, logout, state } from '../../main.js';
import { showToast, formatDate, formatDuration, getInitials, staggerDelay, getGrade } from '../../utils.js';

export async function renderStudentDashboard(container) {
  const student = state.student;
  if (!student) {
    navigate('login');
    return;
  }

  container.innerHTML = `
    <button class="mobile-menu-btn" id="mobile-menu-btn">☰</button>
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    <div class="dashboard-layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo" style="flex-direction: column; align-items: flex-start; gap: 4px; padding: 24px 20px 12px;">
          <img src="/logo.jpeg" alt="Bhumi Soul" onerror="this.style.display='none'" style="width: 140px; object-fit: contain; object-position: left; filter: invert(1) hue-rotate(180deg) brightness(1.5); mix-blend-mode: screen; margin-bottom: 4px;">
          <span style="letter-spacing: 1.5px; opacity: 0.7; font-size: 0.75rem;">STUDENT PORTAL</span>
        </div>
        <nav class="sidebar-nav">
          <button class="nav-item active" data-page="student-dashboard">
            <span class="nav-icon">🏠</span> Dashboard
          </button>
        </nav>
        <div class="sidebar-footer">
          <!-- Profile card -->
          <div class="glass-card-static" style="padding: 16px; margin-bottom: 12px; text-align: center;">
            <div class="student-avatar" style="background: ${student.avatar_color || '#0575e6'}; width: 56px; height: 56px; margin: 0 auto 8px; font-size: 1.2rem;">
              ${getInitials(student.name)}
            </div>
            <div style="font-weight: 600; font-size: 0.95rem;">${student.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">ID: ${student.login_id}</div>
          </div>
          <button class="nav-item" id="logout-btn">
            <span class="nav-icon">🚪</span> Logout
          </button>
        </div>
      </aside>
      <main class="main-content" id="main-content">
        <div class="loading-container">
          <div class="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </main>
    </div>
  `;

  // Navigation
  container.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  document.getElementById('logout-btn').addEventListener('click', logout);

  // Mobile menu
  const menuBtn = container.querySelector('#mobile-menu-btn');
  const sidebar = container.querySelector('#sidebar');
  const overlay = container.querySelector('#sidebar-overlay');
  
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    });
  }

  await loadStudentData(container, student);
}

async function loadStudentData(container, student) {
  try {
    // Fetch tests & student's attempts
    const [testsRes, attemptsRes] = await Promise.all([
      supabase.from('tests').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('test_attempts')
        .select('*, tests(title, total_questions, category, difficulty)')
        .eq('student_id', student.id)
        .order('completed_at', { ascending: false }),
    ]);

    const allTests = testsRes.data || [];
    const myAttempts = attemptsRes.data || [];
    const completedAttempts = myAttempts.filter(a => a.status === 'completed');
    const attemptedTestIds = new Set(completedAttempts.map(a => a.test_id));
    
    // Available tests = active tests not yet attempted
    const availableTests = allTests.filter(t => !attemptedTestIds.has(t.id));
    
    // Student stats
    const totalCompleted = completedAttempts.length;
    const avgScore = totalCompleted > 0
      ? completedAttempts.reduce((s, a) => s + (a.percentage || 0), 0) / totalCompleted
      : 0;
    const bestScore = totalCompleted > 0 ? Math.max(...completedAttempts.map(a => a.percentage || 0)) : 0;

    const mainContent = container.querySelector('#main-content');
    mainContent.innerHTML = `
      <div class="top-bar">
        <div>
          <h1>Welcome, <span class="text-gradient">${student.name.split(' ')[0]}</span>! 👋</h1>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">
            Ready to conquer some tests today?
          </p>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card glass-card green stagger-item" style="${staggerDelay(0)}">
          <div class="stat-icon green">✅</div>
          <div class="stat-value">${totalCompleted}</div>
          <div class="stat-label">Tests Completed</div>
        </div>
        <div class="stat-card glass-card blue stagger-item" style="${staggerDelay(1)}">
          <div class="stat-icon blue">📊</div>
          <div class="stat-value">${avgScore.toFixed(1)}%</div>
          <div class="stat-label">Average Score</div>
        </div>
        <div class="stat-card glass-card purple stagger-item" style="${staggerDelay(2)}">
          <div class="stat-icon purple">🏆</div>
          <div class="stat-value">${bestScore.toFixed(0)}%</div>
          <div class="stat-label">Best Score</div>
        </div>
        <div class="stat-card glass-card orange stagger-item" style="${staggerDelay(3)}">
          <div class="stat-icon orange">📝</div>
          <div class="stat-value">${availableTests.length}</div>
          <div class="stat-label">Available Tests</div>
        </div>
      </div>

      <!-- Available Tests -->
      <div class="section-header">
        <h2>🎯 Available Tests</h2>
      </div>
      ${availableTests.length > 0 ? `
        <div class="tests-grid">
          ${availableTests.map((t, i) => `
            <div class="test-card glass-card stagger-item" style="${staggerDelay(i + 4)}">
              <div style="display: flex; gap: 8px;">
                <span class="test-card-badge badge-${(t.difficulty || 'Medium').toLowerCase()}">${t.difficulty || 'Medium'}</span>
                <span class="test-card-badge badge-active">${t.category || 'General'}</span>
              </div>
              <h3>${t.title}</h3>
              <p>${t.description || 'No description provided'}</p>
              <div class="test-meta">
                <span>📝 ${t.total_questions} Questions</span>
                <span>⏱️ ${formatDuration(t.duration_minutes)}</span>
              </div>
              <div class="test-card-actions">
                <button class="btn btn-primary start-test-btn" data-test-id="${t.id}">
                  🚀 Start Test
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state glass-card-static" style="margin-bottom: 32px;">
          <div class="empty-state-icon">🎉</div>
          <h3>All Caught Up!</h3>
          <p>You've completed all available tests. Check back later for new ones.</p>
        </div>
      `}

      <!-- Past Results -->
      <div class="section-header" style="margin-top: 32px;">
        <h2>📜 Your Test History</h2>
      </div>
      ${completedAttempts.length > 0 ? `
        <div class="tests-grid">
          ${completedAttempts.map((a, i) => {
            const grade = getGrade(a.percentage || 0);
            return `
              <div class="test-card glass-card stagger-item" style="${staggerDelay(i + availableTests.length + 4)}">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                  <span class="test-card-badge badge-${(a.tests?.difficulty || 'Medium').toLowerCase()}">${a.tests?.category || 'General'}</span>
                  <span style="font-size: 1.4rem; font-weight: 800; color: ${grade.color}">${grade.grade}</span>
                </div>
                <h3>${a.tests?.title || 'Unknown Test'}</h3>
                <div style="display: flex; align-items: center; gap: 12px; margin: 8px 0;">
                  <div style="flex: 1;">
                    <div class="score-bar-container" style="height: 10px;">
                      <div class="score-bar" style="width: ${a.percentage || 0}%; background: ${grade.color}"></div>
                    </div>
                  </div>
                  <strong style="color: ${grade.color}; font-size: 1.1rem;">${(a.percentage || 0).toFixed(0)}%</strong>
                </div>
                <div class="test-meta">
                  <span>✅ ${a.score}/${a.total_questions}</span>
                  <span>📅 ${formatDate(a.completed_at)}</span>
                </div>
                <div class="test-card-actions">
                  <button class="btn btn-sm btn-glass view-result-btn" data-attempt-id="${a.id}">
                    👁️ View Details
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="empty-state glass-card-static">
          <div class="empty-state-icon">📜</div>
          <h3>No History Yet</h3>
          <p>Your test results will appear here after you complete a test.</p>
        </div>
      `}
    `;

    // Event listeners
    mainContent.querySelectorAll('.start-test-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navigate('student-quiz', { currentTestId: btn.dataset.testId });
      });
    });

    mainContent.querySelectorAll('.view-result-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navigate('student-results', { currentAttemptId: btn.dataset.attemptId });
      });
    });

  } catch (err) {
    console.error('Student dashboard error:', err);
    showToast('Failed to load dashboard data', 'error');
  }
}
