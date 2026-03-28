// ============================================
// MANAGE STUDENTS — Bhumi Soul Admin
// Add, view, edit, delete students
// ============================================

import { supabase } from '../../supabase.js';
import { navigate, state } from '../../main.js';
import { showToast, getInitials, staggerDelay, formatDate } from '../../utils.js';
import { buildLayout, attachSidebarListeners } from './dashboard.js';

let currentPage = 1;
const itemsPerPage = 12;

export async function renderManageStudents(container) {
  currentPage = 1;
  container.innerHTML = buildLayout('manage-students', `
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading students...</p>
    </div>
  `);

  attachSidebarListeners(container);
  await loadStudents(container);
}

async function loadStudents(container) {
  try {
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    const { data: students, error, count } = await supabase
      .from('students')
      .select('*', { count: 'exact' })
      .order('name')
      .range(from, to);

    if (error) throw error;
    
    const totalPages = Math.ceil((count || 0) / itemsPerPage) || 1;

    const mainContent = container.querySelector('#main-content');
    mainContent.innerHTML = `
      <div class="top-bar">
        <div>
          <h1>Manage Students</h1>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">
            ${count || 0} student${count !== 1 ? 's' : ''} registered
          </p>
        </div>
        <div class="top-bar-actions">
          <button class="btn btn-primary" id="add-student-btn">
            ➕ Add Student
          </button>
        </div>
      </div>

      ${students.length > 0 ? `
        <div class="student-management-grid">
          ${students.map((s, i) => {
            const colors = ['#00f260', '#0575e6', '#764ba2', '#f5af19', '#f5576c', '#4facfe'];
            const color = s.avatar_color || colors[i % colors.length];
            return `
              <div class="student-mgmt-card glass-card stagger-item" style="${staggerDelay(i)}">
                <div class="student-avatar" style="background: ${color}; width: 48px; height: 48px; font-size: 1rem;">
                  ${getInitials(s.name)}
                </div>
                <div class="student-mgmt-info">
                  <h4>${s.name}</h4>
                  <p>ID: ${s.login_id} ${s.email ? '• ' + s.email : ''}</p>
                  <p style="font-size: 0.75rem; color: var(--text-muted);">Joined ${formatDate(s.created_at)}</p>
                </div>
                <div class="student-mgmt-actions">
                  <button class="btn btn-sm btn-glass edit-student" data-id="${s.id}" data-name="${s.name}" data-email="${s.email || ''}" data-login="${s.login_id}" data-password="${s.password}">
                    Edit <svg width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style="margin-left:4px;"><path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z"></path></svg>
                  </button>
                  <button class="btn btn-sm btn-danger delete-student" data-id="${s.id}" data-name="${s.name}">
                    Delete <svg width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style="margin-left:4px;"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        ${totalPages > 1 ? `
          <div class="pagination-controls" style="display: flex; gap: 12px; justify-content: center; margin-top: 32px; align-items: center;">
            <button class="btn btn-sm btn-glass" id="prev-page-btn" ${currentPage === 1 ? 'disabled style="opacity:0.5"' : ''}>← Previous</button>
            <span style="font-size: 0.95rem; color: var(--text-secondary); font-weight: 500;">Page ${currentPage} of ${totalPages}</span>
            <button class="btn btn-sm btn-glass" id="next-page-btn" ${currentPage === totalPages ? 'disabled style="opacity:0.5"' : ''}>Next →</button>
          </div>
        ` : ''}
      ` : `
        <div class="empty-state glass-card-static">
          <div class="empty-state-icon">👥</div>
          <h3>No Students Yet</h3>
          <p>Add your first student to get started.</p>
        </div>
      `}
    `;

    // Add student
    document.getElementById('add-student-btn').addEventListener('click', () => {
      showStudentModal(container);
    });

    // Pagination listeners
    const prevBtn = document.getElementById('prev-page-btn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          loadStudents(container);
        }
      });
    }

    const nextBtn = document.getElementById('next-page-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          loadStudents(container);
        }
      });
    }

    // Edit student
    mainContent.querySelectorAll('.edit-student').forEach(btn => {
      btn.addEventListener('click', () => {
        showStudentModal(container, {
          id: btn.dataset.id,
          name: btn.dataset.name,
          email: btn.dataset.email,
          login_id: btn.dataset.login,
          password: btn.dataset.password,
        });
      });
    });

    // Delete student
    mainContent.querySelectorAll('.delete-student').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm(`Delete student "${btn.dataset.name}"? This will also delete their test history.`)) {
          const { error } = await supabase.from('students').delete().eq('id', btn.dataset.id);
          if (error) {
            showToast('Failed to delete student: ' + error.message, 'error');
          } else {
            showToast('Student deleted', 'info');
            // If deleting the last item on the page, go to prev page
            if (students.length === 1 && currentPage > 1) {
              currentPage--;
            }
            loadStudents(container);
          }
        }
      });
    });

  } catch (err) {
    console.error('Load students error:', err);
    showToast('Failed to load students', 'error');
  }
}

function showStudentModal(container, student = null) {
  const isEdit = !!student;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content glass-card-static">
      <div class="modal-header">
        <h3>${isEdit ? '✏️ Edit Student' : '➕ Add New Student'}</h3>
        <button class="modal-close" id="modal-close">✕</button>
      </div>
      <form id="student-form">
        <div class="input-group">
          <label for="s-name">Full Name *</label>
          <input type="text" id="s-name" class="input-field" placeholder="Enter full name" value="${student?.name || ''}" required>
        </div>
        <div class="input-group">
          <label for="s-email">Email</label>
          <input type="email" id="s-email" class="input-field" placeholder="student@email.com" value="${student?.email || ''}">
        </div>
        <div class="input-group">
          <label for="s-login">Login ID * (used by student to log in)</label>
          <input type="text" id="s-login" class="input-field" placeholder="e.g., student01" value="${student?.login_id || ''}" required>
        </div>
        <div class="input-group">
          <label for="s-password">Password *</label>
          <input type="text" id="s-password" class="input-field" placeholder="Set a password" value="${student?.password || ''}" required>
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? '💾 Update' : '➕ Add Student'}</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#modal-close').addEventListener('click', close);
  overlay.querySelector('#modal-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('s-name').value.trim();
    const email = document.getElementById('s-email').value.trim() || null;
    const login_id = document.getElementById('s-login').value.trim();
    const password = document.getElementById('s-password').value;

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('students')
          .update({ name, email, login_id, password })
          .eq('id', student.id);
        if (error) throw error;
        showToast('Student updated', 'success');
      } else {
        const colors = ['#00f260', '#0575e6', '#764ba2', '#f5af19', '#f5576c', '#4facfe', '#fa709a'];
        const avatar_color = colors[Math.floor(Math.random() * colors.length)];
        
        const { error } = await supabase
          .from('students')
          .insert({ name, email, login_id, password, avatar_color });
        if (error) throw error;
        showToast('Student added! 🎉', 'success');
      }
      close();
      loadStudents(container);
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  });
}
