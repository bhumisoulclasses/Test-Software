// ============================================
// LOGIN PAGE — Bhumi Soul
// Dual-mode: Admin / Student login
// ============================================

import { supabase } from '../supabase.js';
import { navigate, state } from '../main.js';
import { showToast } from '../utils.js';

export function renderLogin(container) {
  let activeTab = 'admin'; // 'admin' or 'student'

  container.innerHTML = `
    <div class="login-container">
      <div class="login-card glass-card-static" style="display: flex; flex-direction: column; align-items: center;">
        <img src="/logo.jpeg" alt="Bhumi Soul" class="login-logo" id="login-logo" onerror="this.style.display='none'" style="filter: invert(1) hue-rotate(180deg) brightness(1.5); mix-blend-mode: screen; max-height: 100px; object-fit: contain; margin-bottom: -10px;">
        <p class="login-subtitle" style="letter-spacing: 2px; text-transform: uppercase; font-size: 0.75rem; color: var(--text-muted);">Enterprise Exam Platform</p>
        
        <div class="login-tabs">
          <button class="login-tab active" id="tab-admin" data-tab="admin">🔐 Admin</button>
          <button class="login-tab" id="tab-student" data-tab="student">🎓 Student</button>
        </div>
        
        <div id="login-form-area">
          ${adminForm()}
        </div>
        
        <div class="login-footer">
          <p>Powered by <strong class="text-gradient">Bhumi Soul</strong> © 2026</p>
        </div>
      </div>
    </div>
  `;

  // Tab switching
  container.querySelectorAll('.login-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      container.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const formArea = document.getElementById('login-form-area');
      formArea.innerHTML = activeTab === 'admin' ? adminForm() : studentForm();
      attachFormListeners(activeTab);
    });
  });

  attachFormListeners('admin');
}

function adminForm() {
  return `
    <form id="admin-login-form" class="login-form">
      <div class="input-group">
        <label for="admin-password">Admin Password</label>
        <input type="password" id="admin-password" class="input-field" placeholder="Enter admin password" required autocomplete="current-password">
      </div>
      <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;" id="admin-login-btn">
        🚀 Enter Admin Panel
      </button>
    </form>
  `;
}

function studentForm() {
  return `
    <form id="student-login-form" class="login-form">
      <div class="input-group">
        <label for="student-login-id">Login ID</label>
        <input type="text" id="student-login-id" class="input-field" placeholder="Enter your login ID" required>
      </div>
      <div class="input-group">
        <label for="student-password">Password</label>
        <input type="password" id="student-password" class="input-field" placeholder="Enter your password" required>
      </div>
      <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;" id="student-login-btn">
        🎯 Login as Student
      </button>
      <p style="margin-top: 16px; font-size: 0.82rem; color: var(--text-muted);">
        Don't have an account? Contact your admin.
      </p>
    </form>
  `;
}

function attachFormListeners(tab) {
  if (tab === 'admin') {
    const form = document.getElementById('admin-login-form');
    if (form) {
      form.addEventListener('submit', handleAdminLogin);
    }
  } else {
    const form = document.getElementById('student-login-form');
    if (form) {
      form.addEventListener('submit', handleStudentLogin);
    }
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('admin-login-btn');
  const password = document.getElementById('admin-password').value;
  
  btn.innerHTML = '<div class="spinner spinner-sm" style="display:inline-block"></div> Verifying...';
  btn.disabled = true;

  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('admin_password')
      .limit(1)
      .single();

    if (error) throw error;

    if (data && data.admin_password === password) {
      state.isAdmin = true;
      showToast('Welcome, Admin! 🚀', 'success');
      navigate('admin-dashboard');
    } else {
      showToast('Invalid password', 'error');
      btn.innerHTML = '🚀 Enter Admin Panel';
      btn.disabled = false;
    }
  } catch (err) {
    showToast('Connection error: ' + err.message, 'error');
    btn.innerHTML = '🚀 Enter Admin Panel';
    btn.disabled = false;
  }
}

async function handleStudentLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('student-login-btn');
  const loginId = document.getElementById('student-login-id').value.trim();
  const password = document.getElementById('student-password').value;
  
  btn.innerHTML = '<div class="spinner spinner-sm" style="display:inline-block"></div> Logging in...';
  btn.disabled = true;

  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('login_id', loginId)
      .eq('password', password)
      .single();

    if (error || !data) {
      showToast('Invalid login ID or password', 'error');
      btn.innerHTML = '🎯 Login as Student';
      btn.disabled = false;
      return;
    }

    state.student = data;
    showToast(`Welcome back, ${data.name}! 🎉`, 'success');
    navigate('student-dashboard');
  } catch (err) {
    showToast('Connection error: ' + err.message, 'error');
    btn.innerHTML = '🎯 Login as Student';
    btn.disabled = false;
  }
}
