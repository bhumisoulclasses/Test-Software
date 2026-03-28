// ============================================
// BHUMI SOUL — MAIN APPLICATION
// Router + State Management + App Init
// ============================================

import { supabase } from './supabase.js';
import { createParticles, showToast, saveLocal, loadLocal } from './utils.js';
import { renderLogin } from './pages/login.js';
import { renderAdminDashboard } from './pages/admin/dashboard.js';
import { renderCreateTest } from './pages/admin/createTest.js';
import { renderTestDetails } from './pages/admin/testDetails.js';
import { renderManageStudents } from './pages/admin/manageStudents.js';
import { renderStudentDashboard } from './pages/student/dashboard.js';
import { renderQuiz } from './pages/student/quiz.js';
import { renderResults } from './pages/student/results.js';

// ---- Global State Persistent ----
export const state = loadLocal('bhumi_state', {
  currentPage: 'login',
  isAdmin: false,
  student: null,
  currentTestId: null,
  currentAttemptId: null,
});

// ---- Router ----
export function navigate(page, params = {}, replaceHistory = false) {
  const container = document.getElementById('page-container');
  
  container.classList.add('page-exit');
  
  setTimeout(() => {
    container.classList.remove('page-exit');
    container.innerHTML = '';
    
    state.currentPage = page;
    Object.assign(state, params);
    saveLocal('bhumi_state', state);

    // Update URL natively
    const url = new URL(window.location);
    url.searchParams.set('page', page);
    
    if (replaceHistory) {
      window.history.replaceState({ page, params }, '', url);
    } else {
      window.history.pushState({ page, params }, '', url);
    }

    switch (page) {
      case 'login':
        renderLogin(container);
        break;
      case 'admin-dashboard':
        renderAdminDashboard(container);
        break;
      case 'admin-create-test':
        renderCreateTest(container);
        break;
      case 'admin-test-details':
        renderTestDetails(container, state.currentTestId);
        break;
      case 'admin-manage-students':
        renderManageStudents(container);
        break;
      case 'student-dashboard':
        renderStudentDashboard(container);
        break;
      case 'student-quiz':
        renderQuiz(container, state.currentTestId);
        break;
      case 'student-results':
        renderResults(container, state.currentAttemptId);
        break;
      default:
        renderLogin(container);
    }
    
    container.classList.add('page-enter');
    setTimeout(() => container.classList.remove('page-enter'), 500);
  }, 300);
}

// Handle Browser Back Button Natively
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.page) {
    navigate(e.state.page, e.state.params, true);
  } else {
    const page = new URLSearchParams(window.location.search).get('page') || 'login';
    navigate(page, {}, true);
  }
});

// ---- Logout ----
export function logout() {
  state.isAdmin = false;
  state.student = null;
  state.currentTestId = null;
  state.currentAttemptId = null;
  saveLocal('bhumi_state', state);
  localStorage.removeItem('bhumi_state'); // Clear everything to be safe
  
  showToast('Logged out successfully', 'info');
  navigate('login');
}

// ---- App Init ----
function init() {
  createParticles();
  
  // Restore routing exactly where they left it
  const urlParams = new URLSearchParams(window.location.search);
  let requestedPage = urlParams.get('page') || state.currentPage || 'login';
  
  if (!state.isAdmin && !state.student && requestedPage !== 'login') {
    requestedPage = 'login';
  } else if (requestedPage === 'login' && state.isAdmin) {
    requestedPage = 'admin-dashboard';
  } else if (requestedPage === 'login' && state.student) {
    requestedPage = 'student-dashboard';
  }

  navigate(requestedPage, {}, true);
}

document.addEventListener('DOMContentLoaded', init);
