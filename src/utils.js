// ============================================
// BHUMI SOUL — UTILITY FUNCTIONS
// ============================================

/**
 * Show a toast notification
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Animated counter effect
 */
export function animateCounter(element, target, duration = 1500) {
  let start = 0;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.floor(eased * target);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * Animate counter with decimal
 */
export function animateCounterDecimal(element, target, duration = 1500) {
  let start = 0;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = (eased * target).toFixed(1);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * Format date to readable string
 */
export function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { 
    day: 'numeric', month: 'short', year: 'numeric' 
  });
}

/**
 * Format time from seconds
 */
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format duration in minutes to readable string
 */
export function formatDuration(minutes) {
  if (minutes >= 60) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return `${minutes} min`;
}

/**
 * Get initials from name
 */
export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * Generate stagger animation delays
 */
export function staggerDelay(index, base = 50) {
  return `animation-delay: ${index * base}ms`;
}

/**
 * Create particles for background
 */
export function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  container.innerHTML = '';
  
  for (let i = 0; i < 40; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.cssText = `
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      --duration: ${3 + Math.random() * 4}s;
      --delay: ${Math.random() * 5}s;
      width: ${2 + Math.random() * 3}px;
      height: ${2 + Math.random() * 3}px;
      background: ${Math.random() > 0.5 ? 'rgba(0,242,96,0.25)' : 'rgba(5,117,230,0.25)'};
    `;
    container.appendChild(particle);
  }
}

/**
 * Launch confetti effect
 */
export function launchConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  
  const colors = ['#00f260', '#0575e6', '#f5af19', '#f5576c', '#764ba2', '#ffd700'];
  
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = Math.random() > 0.5 ? '50%' : '0';
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${color};
      border-radius: ${shape};
      --fall-duration: ${1.5 + Math.random() * 2}s;
      --fall-delay: ${Math.random() * 0.5}s;
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
    `;
    container.appendChild(piece);
  }
  
  setTimeout(() => container.remove(), 4000);
}

/**
 * Generate a grade from percentage
 */
export function getGrade(percentage) {
  if (percentage >= 90) return { grade: 'A+', color: '#00f260' };
  if (percentage >= 80) return { grade: 'A', color: '#00f260' };
  if (percentage >= 70) return { grade: 'B+', color: '#4facfe' };
  if (percentage >= 60) return { grade: 'B', color: '#0575e6' };
  if (percentage >= 50) return { grade: 'C', color: '#f5af19' };
  if (percentage >= 40) return { grade: 'D', color: '#f093fb' };
  return { grade: 'F', color: '#f5576c' };
}

/**
 * Debounce function
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Shuffle an array efficiently (Fisher-Yates)
 */
export function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * LocalStorage wrappers for state persistence
 */
export function saveLocal(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

export function loadLocal(key, fallback = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error('Failed to load from localStorage', e);
    return fallback;
  }
}
