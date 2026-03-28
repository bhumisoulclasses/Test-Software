// ============================================
// ADMIN DASHBOARD — Bhumi Soul
// Stats, Leaderboard, Test List, Analytics
// ============================================

import { supabase } from '../../supabase.js';
import { navigate, logout, state } from '../../main.js';
import { showToast, animateCounter, animateCounterDecimal, formatDate, getInitials, staggerDelay, getGrade } from '../../utils.js';

export async function renderAdminDashboard(container) {
  container.innerHTML = buildLayout('dashboard', `
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading dashboard...</p>
    </div>
  `);

  attachSidebarListeners(container);
  await loadDashboardData(container);
}

function buildLayout(activePage, content) {
  return `
    <button class="mobile-menu-btn" id="mobile-menu-btn">☰</button>
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    <div class="dashboard-layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo" style="flex-direction: column; align-items: flex-start; gap: 4px; padding: 24px 20px 12px;">
          <img src="/logo.jpeg" alt="Bhumi Soul" onerror="this.style.display='none'" style="width: 140px; object-fit: contain; object-position: left; filter: invert(1) hue-rotate(180deg) brightness(1.5); mix-blend-mode: screen; margin-bottom: 4px;">
          <span style="letter-spacing: 1.5px; opacity: 0.7; font-size: 0.75rem;">ADMIN PANEL</span>
        </div>
        <nav class="sidebar-nav">
          <button class="nav-item ${activePage === 'dashboard' ? 'active' : ''}" data-page="admin-dashboard">
            <span class="nav-icon">📊</span> Dashboard
          </button>
          <button class="nav-item ${activePage === 'create-test' ? 'active' : ''}" data-page="admin-create-test">
            <span class="nav-icon">📝</span> Create Test
          </button>
          <button class="nav-item ${activePage === 'manage-students' ? 'active' : ''}" data-page="admin-manage-students">
            <span class="nav-icon">👥</span> Manage Students
          </button>
        </nav>
        <div class="sidebar-footer">
          <button class="nav-item" id="logout-btn">
            <span class="nav-icon">🚪</span> Logout
          </button>
        </div>
      </aside>
      <main class="main-content" id="main-content">
        ${content}
      </main>
    </div>
  `;
}

function attachSidebarListeners(container) {
  // Navigation
  container.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });
  
  // Logout
  const logoutBtn = container.querySelector('#logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
  
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
}

async function loadDashboardData(container) {
  try {
    // Fetch all data in parallel
    const [studentsRes, testsRes, attemptsRes] = await Promise.all([
      supabase.from('students').select('*').order('average_score', { ascending: false }),
      supabase.from('tests').select('*').order('created_at', { ascending: false }),
      supabase.from('test_attempts').select('*, students(name, avatar_color)').eq('status', 'completed').order('percentage', { ascending: false }),
    ]);

    const students = studentsRes.data || [];
    const tests = testsRes.data || [];
    const attempts = attemptsRes.data || [];

    // Calculate stats
    const totalStudents = students.length;
    const totalTests = tests.length;
    const totalAttempts = attempts.length;
    const avgScore = attempts.length > 0 
      ? attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length 
      : 0;
    
    // Top performers (aggregate by student)
    const studentScores = {};
    attempts.forEach(a => {
      if (!studentScores[a.student_id]) {
        studentScores[a.student_id] = {
          name: a.students?.name || 'Unknown',
          color: a.students?.avatar_color || '#0575e6',
          totalScore: 0,
          count: 0,
          bestScore: 0,
        };
      }
      studentScores[a.student_id].totalScore += (a.percentage || 0);
      studentScores[a.student_id].count++;
      studentScores[a.student_id].bestScore = Math.max(studentScores[a.student_id].bestScore, a.percentage || 0);
    });

    const leaderboard = Object.entries(studentScores)
      .map(([id, data]) => ({
        id,
        ...data,
        avgScore: data.totalScore / data.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);

    const mainContent = container.querySelector('#main-content');
    mainContent.innerHTML = `
      <div class="top-bar">
        <div>
          <h1>Dashboard</h1>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">
            Welcome back, Admin. Here's your platform overview.
          </p>
        </div>
        <div class="top-bar-actions">
          <button class="btn btn-primary" id="create-test-btn">
            ➕ Create Test
          </button>
        </div>
      </div>
      
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card glass-card green stagger-item" style="${staggerDelay(0)}">
          <div class="stat-icon green">👥</div>
          <div class="stat-value" id="stat-students">0</div>
          <div class="stat-label">Total Students</div>
          <div class="stat-change up">↑ Active</div>
        </div>
        <div class="stat-card glass-card blue stagger-item" style="${staggerDelay(1)}">
          <div class="stat-icon blue">📝</div>
          <div class="stat-value" id="stat-tests">0</div>
          <div class="stat-label">Total Tests</div>
          <div class="stat-change up">↑ Published</div>
        </div>
        <div class="stat-card glass-card purple stagger-item" style="${staggerDelay(2)}">
          <div class="stat-icon purple">🎯</div>
          <div class="stat-value" id="stat-attempts">0</div>
          <div class="stat-label">Total Attempts</div>
        </div>
        <div class="stat-card glass-card orange stagger-item" style="${staggerDelay(3)}">
          <div class="stat-icon orange">⭐</div>
          <div class="stat-value" id="stat-avg">0</div>
          <div class="stat-label">Average Score %</div>
        </div>
      </div>
      
      <!-- Two Column: leaderboard + recent tests -->
      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px; margin-bottom: 32px;">
        <!-- Leaderboard -->
        <div>
          <div class="section-header">
            <h2>🏆 Leaderboard — Top Performers</h2>
          </div>
          ${leaderboard.length > 0 ? `
            <table class="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student</th>
                  <th>Avg Score</th>
                  <th>Tests</th>
                  <th>Best</th>
                </tr>
              </thead>
              <tbody>
                ${leaderboard.map((s, i) => `
                  <tr class="stagger-item" style="${staggerDelay(i + 4)}">
                    <td>
                      <div class="rank-badge ${i < 3 ? `rank-${i+1}` : 'rank-other'}">
                        ${i === 0 ? '👑' : i + 1}
                      </div>
                    </td>
                    <td>
                      <div class="student-info">
                        <div class="student-avatar" style="background: ${s.color}">
                          ${getInitials(s.name)}
                        </div>
                        <span>${s.name}</span>
                      </div>
                    </td>
                    <td>
                      <div style="display:flex; align-items:center; gap:12px;">
                        <strong style="color: ${getGrade(s.avgScore).color}">${s.avgScore.toFixed(1)}%</strong>
                        <div class="score-bar-container">
                          <div class="score-bar" style="width: ${s.avgScore}%"></div>
                        </div>
                      </div>
                    </td>
                    <td>${s.count}</td>
                    <td><span style="color: ${getGrade(s.bestScore).color}">${s.bestScore.toFixed(0)}%</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <div class="empty-state glass-card-static">
              <div class="empty-state-icon">🏆</div>
              <h3>No Data Yet</h3>
              <p>Students will appear here after they take tests.</p>
            </div>
          `}
        </div>

        <!-- Recent Tests -->
        <div>
          <div class="section-header">
            <h2>📋 Recent Tests</h2>
          </div>
          ${tests.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${tests.slice(0, 5).map((t, i) => {
                const testAttempts = attempts.filter(a => a.test_id === t.id);
                const testAvg = testAttempts.length > 0 
                  ? testAttempts.reduce((s, a) => s + (a.percentage || 0), 0) / testAttempts.length 
                  : 0;
                return `
                <div class="glass-card stagger-item" style="padding: 18px; cursor: pointer; ${staggerDelay(i + 4)}" 
                     data-test-detail="${t.id}">
                  <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom: 8px;">
                    <h4 style="font-size: 0.95rem; font-weight: 600;">${t.title}</h4>
                    <span class="test-card-badge ${t.is_active ? 'badge-active' : 'badge-inactive'}">
                      ${t.is_active ? '● Active' : '● Inactive'}
                    </span>
                  </div>
                  <div class="test-meta">
                    <span>📝 ${t.total_questions} Qs</span>
                    <span>⏱️ ${t.duration_minutes} min</span>
                    <span>👥 ${testAttempts.length} attempts</span>
                    <span>📊 ${testAvg.toFixed(0)}% avg</span>
                  </div>
                </div>
              `}).join('')}
            </div>
          ` : `
            <div class="empty-state glass-card-static">
              <div class="empty-state-icon">📝</div>
              <h3>No Tests Created</h3>
              <p>Create your first test to get started!</p>
            </div>
          `}
        </div>
      </div>

      <!-- Score Distribution Chart -->
      ${attempts.length > 0 ? `
        <div class="section-header">
          <h2>📈 Score Distribution</h2>
        </div>
        <div class="chart-container glass-card-static">
          <div class="bar-chart" id="score-chart">
            ${buildScoreDistributionChart(attempts)}
          </div>
        </div>
      ` : ''}
    `;

    // Animate counters
    setTimeout(() => {
      animateCounter(document.getElementById('stat-students'), totalStudents);
      animateCounter(document.getElementById('stat-tests'), totalTests);
      animateCounter(document.getElementById('stat-attempts'), totalAttempts);
      animateCounterDecimal(document.getElementById('stat-avg'), avgScore);
    }, 200);

    // Create test button
    const createBtn = mainContent.querySelector('#create-test-btn');
    if (createBtn) createBtn.addEventListener('click', () => navigate('admin-create-test'));

    // Test detail click
    mainContent.querySelectorAll('[data-test-detail]').forEach(card => {
      card.addEventListener('click', () => {
        navigate('admin-test-details', { currentTestId: card.dataset.testDetail });
      });
    });

  } catch (err) {
    console.error('Dashboard load error:', err);
    showToast('Failed to load dashboard data', 'error');
  }
}

function buildScoreDistributionChart(attempts) {
  const ranges = [
    { label: '0-20%', min: 0, max: 20 },
    { label: '21-40%', min: 21, max: 40 },
    { label: '41-60%', min: 41, max: 60 },
    { label: '61-80%', min: 61, max: 80 },
    { label: '81-100%', min: 81, max: 100 },
  ];

  const counts = ranges.map(r => ({
    ...r,
    count: attempts.filter(a => (a.percentage || 0) >= r.min && (a.percentage || 0) <= r.max).length,
  }));

  const maxCount = Math.max(...counts.map(c => c.count), 1);

  return counts.map(c => `
    <div class="bar-item">
      <div class="bar-value">${c.count}</div>
      <div class="bar" style="height: ${(c.count / maxCount) * 100}%"></div>
      <div class="bar-label">${c.label}</div>
    </div>
  `).join('');
}

export { buildLayout, attachSidebarListeners };
