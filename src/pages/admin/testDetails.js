// ============================================
// TEST DETAILS PAGE — Bhumi Soul Admin
// Per-test breakdown with student scores
// ============================================

import { supabase } from '../../supabase.js';
import { navigate, state } from '../../main.js';
import { showToast, formatDate, getInitials, getGrade, staggerDelay } from '../../utils.js';
import { buildLayout, attachSidebarListeners } from './dashboard.js';

export async function renderTestDetails(container, testId) {
  container.innerHTML = buildLayout('dashboard', `
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading test details...</p>
    </div>
  `);

  attachSidebarListeners(container);

  try {
    // Fetch test + questions + attempts
    const [testRes, questionsRes, attemptsRes] = await Promise.all([
      supabase.from('tests').select('*').eq('id', testId).single(),
      supabase.from('questions').select('*').eq('test_id', testId).order('order_num'),
      supabase.from('test_attempts')
        .select('*, students(name, email, avatar_color, login_id)')
        .eq('test_id', testId)
        .eq('status', 'completed')
        .order('percentage', { ascending: false }),
    ]);

    const test = testRes.data;
    const questions = questionsRes.data || [];
    const attempts = attemptsRes.data || [];

    if (!test) {
      showToast('Test not found', 'error');
      navigate('admin-dashboard');
      return;
    }

    const avgScore = attempts.length > 0
      ? attempts.reduce((s, a) => s + (a.percentage || 0), 0) / attempts.length
      : 0;
    const highestScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.percentage || 0)) : 0;
    
    // Pro Analytics
    const flaggedAttempts = attempts.filter(a => (a.tab_switches || 0) > 0).length;

    const mainContent = container.querySelector('#main-content');
    mainContent.innerHTML = `
      <div class="test-detail-header">
        <button class="back-btn" id="back-btn">←</button>
        <div>
          <h1>${test.title}</h1>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">
            ${test.description || 'No description'} • Created ${formatDate(test.created_at)}
          </p>
        </div>
        <div style="margin-left: auto; display: flex; gap: 8px;">
          <span class="test-card-badge ${test.is_active ? 'badge-active' : 'badge-inactive'}">
            ${test.is_active ? '● Active' : '● Inactive'}
          </span>
          <span class="test-card-badge badge-${test.difficulty?.toLowerCase() || 'medium'}">
            ${test.difficulty || 'Medium'}
          </span>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="stats-grid" style="margin-bottom: 32px;">
        <div class="stat-card glass-card green">
          <div class="stat-icon green">📝</div>
          <div class="stat-value">${test.total_questions}</div>
          <div class="stat-label">Questions</div>
        </div>
        <div class="stat-card glass-card blue">
          <div class="stat-icon blue">👥</div>
          <div class="stat-value">${attempts.length}</div>
          <div class="stat-label">Attempts</div>
        </div>
        <div class="stat-card glass-card purple">
          <div class="stat-icon purple">📊</div>
          <div class="stat-value">${avgScore.toFixed(1)}%</div>
          <div class="stat-label">Average Score</div>
        </div>
        <div class="stat-card glass-card ${flaggedAttempts > 0 ? 'orange' : 'green'}">
          <div class="stat-icon ${flaggedAttempts > 0 ? 'orange' : 'green'}">🛡️</div>
          <div class="stat-value" style="${flaggedAttempts > 0 ? 'color: #f5576c;' : ''}">${flaggedAttempts}</div>
          <div class="stat-label">Flagged Attempts</div>
        </div>
      </div>

      <!-- Student Attempts -->
      <div class="section-header">
        <h2>🎓 Student Attempts & Proctoring</h2>
      </div>
      ${attempts.length > 0 ? `
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Student</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${attempts.map((a, i) => {
              const grade = getGrade(a.percentage || 0);
              const tabSwitches = a.tab_switches || 0;
              const proctorBadge = tabSwitches === 0 
                ? '<span style="color: #00f260; font-size: 0.8rem;">Clean ✓</span>' 
                : `<span style="color: #f5576c; font-size: 0.8rem; font-weight: 600;">⚠️ ${tabSwitches} Violations</span>`;
                
              return `
              <tr class="stagger-item" style="${staggerDelay(i)}">
                <td>
                  <div class="rank-badge ${i < 3 ? `rank-${i+1}` : 'rank-other'}">${i + 1}</div>
                </td>
                <td>
                  <div class="student-info">
                    <div class="student-avatar" style="background: ${a.students?.avatar_color || '#0575e6'}">
                      ${getInitials(a.students?.name)}
                    </div>
                    <div>
                      <div style="font-weight: 600;">${a.students?.name || 'Unknown'}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${a.students?.login_id || ''}</div>
                    </div>
                  </div>
                </td>
                <td>${a.score}/${a.total_questions}</td>
                <td>
                  <div style="display:flex; align-items:center; gap:10px;">
                    <strong style="color: ${grade.color}">${(a.percentage || 0).toFixed(1)}%</strong>
                    <div class="score-bar-container">
                      <div class="score-bar" style="width: ${a.percentage || 0}%"></div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    <span style="color: ${grade.color}; font-weight: 700;">Grade: ${grade.grade}</span>
                    ${proctorBadge}
                  </div>
                </td>
                <td style="color: var(--text-muted); font-size: 0.85rem;">${formatDate(a.completed_at)}</td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      ` : `
        <div class="empty-state glass-card-static">
          <div class="empty-state-icon">📊</div>
          <h3>No Attempts Yet</h3>
          <p>No students have taken this test yet.</p>
        </div>
      `}

      <!-- Test Controls -->
      <div style="display: flex; gap: 12px; margin-top: 32px;">
        <button class="btn btn-secondary" id="toggle-active-btn">
          ${test.is_active ? '⏸️ Deactivate Test' : '▶️ Activate Test'}
        </button>
        <button class="btn btn-danger" id="delete-test-btn">
          🗑️ Delete Test
        </button>
      </div>
    `;

    // Back button
    document.getElementById('back-btn').addEventListener('click', () => navigate('admin-dashboard'));

    // Toggle active
    document.getElementById('toggle-active-btn').addEventListener('click', async () => {
      const { error } = await supabase.from('tests').update({ is_active: !test.is_active }).eq('id', testId);
      if (error) {
        showToast('Failed to update test: ' + error.message, 'error');
      } else {
        showToast(`Test ${test.is_active ? 'deactivated' : 'activated'}`, 'success');
        renderTestDetails(container, testId);
      }
    });

    // Delete test
    document.getElementById('delete-test-btn').addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this test? This cannot be undone.')) {
        const { error } = await supabase.from('tests').delete().eq('id', testId);
        if (error) {
          showToast('Failed to delete test: ' + error.message, 'error');
        } else {
          showToast('Test deleted', 'info');
          navigate('admin-dashboard');
        }
      }
    });

  } catch (err) {
    console.error('Test details error:', err);
    showToast('Failed to load test details', 'error');
    navigate('admin-dashboard');
  }
}
