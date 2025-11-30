/* ========== Simple frontend logic using localStorage ========== */

/* Quote list (same as original) */
const quotes = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" }
];

let currentUser = null;   // { id, name, email }
let habits = [];          // loaded for currentUser

/* ---------- Utilities ---------- */
function uid() {
  return Date.now() + Math.floor(Math.random() * 1000);
}
function todayString() {
  return new Date().toDateString();
}
function yesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toDateString();
}

/* ---------- Auth using localStorage ---------- */
/* users stored under key 'hf_users' = array of { id, name, email, password } */
function getAllUsers() {
  return JSON.parse(localStorage.getItem('hf_users') || '[]');
}
function saveAllUsers(users) {
  localStorage.setItem('hf_users', JSON.stringify(users));
}

function registerUser(name, email, password) {
  const users = getAllUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok:false, error: 'Email already registered' };
  }
  const user = { id: uid(), name, email, password };
  users.push(user);
  saveAllUsers(users);
  // set current user
  localStorage.setItem('hf_currentUser', JSON.stringify({ id: user.id, name:user.name, email:user.email }));
  return { ok:true, user: { id: user.id, name:user.name, email:user.email } };
}
function loginUser(email, password) {
  const users = getAllUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) return { ok:false, error: 'Invalid email or password' };
  localStorage.setItem('hf_currentUser', JSON.stringify({ id: user.id, name:user.name, email:user.email }));
  return { ok:true, user: { id:user.id, name:user.name, email:user.email } };
}
function logout() {
  localStorage.removeItem('hf_currentUser');
  currentUser = null;
  habits = [];
  updateNavigation();
  showPage('home');
}

/* ---------- Habits stored per user key = 'hf_habits_<userId>' ---------- */
function loadHabitsFromStorage() {
  if (!currentUser) { habits = []; return; }
  const key = `hf_habits_${currentUser.id}`;
  habits = JSON.parse(localStorage.getItem(key) || '[]');
}
function saveHabitsToStorage() {
  if (!currentUser) return;
  const key = `hf_habits_${currentUser.id}`;
  localStorage.setItem(key, JSON.stringify(habits));
}

/* ---------- Habit actions ---------- */
function addHabitFromInput(name) {
  const trimmed = name.trim();
  if (!trimmed) return { ok:false, error:'Habit name cannot be empty' };
  const habit = {
    id: uid(),
    name: trimmed,
    streak: 0,
    lastCheckin: null,
    createdAt: new Date().toISOString()
  };
  habits.unshift(habit);
  saveHabitsToStorage();
  return { ok:true, habit };
}

function addHabit() {
  const input = document.getElementById('newHabitInput');
  const name = input.value || input.placeholder || '';
  const result = addHabitFromInput(name);
  if (!result.ok) {
    alert(result.error);
    return;
  }
  input.value = '';
  renderHabits();
}

function promptAddHabit() {
  // show inline add
  document.getElementById('addHabitInline').style.display = 'flex';
  document.getElementById('newHabitInput').focus();
}
function hideAddInline() {
  document.getElementById('addHabitInline').style.display = 'none';
  document.getElementById('newHabitInput').value = '';
}

function findHabitById(id) {
  return habits.find(h => String(h.id) === String(id));
}

function checkIn(habitId) {
  const habit = findHabitById(habitId);
  if (!habit) return alert('Habit not found');
  const today = todayString();

  if (habit.lastCheckin === today) {
    return; // already checked
  }

  // if last checked yesterday -> increment streak, else reset to 1
  if (habit.lastCheckin === yesterdayString()) {
    habit.streak = (habit.streak || 0) + 1;
  } else {
    habit.streak = 1;
  }
  habit.lastCheckin = today;
  saveHabitsToStorage();
  renderHabits();
}

function deleteHabit(habitId) {
  if (!confirm('Delete this habit?')) return;
  habits = habits.filter(h => String(h.id) !== String(habitId));
  saveHabitsToStorage();
  renderHabits();
}

function editHabit(habitId) {
  const habit = findHabitById(habitId);
  if (!habit) return alert('Habit not found');
  const newName = prompt('Edit habit name:', habit.name);
  if (newName && newName.trim()) {
    habit.name = newName.trim();
    saveHabitsToStorage();
    renderHabits();
  }
}

/* ---------- Render ---------- */
function renderHabits() {
  const list = document.getElementById('habitsList');
  if (!list) return;
  if (!currentUser) {
    list.innerHTML = '<p style="text-align:center;color:#888;">Please login to see your habits.</p>';
    return;
  }

  if (!habits || habits.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:#888;">No habits yet. Add your first habit!</p>';
    return;
  }

  const today = todayString();
  list.innerHTML = habits.map(habit => {
    const isCheckedToday = habit.lastCheckin === today;
    return `
      <div class="habit-item">
        <div class="habit-info">
          <div class="habit-name">${escapeHtml(habit.name)}</div>
          <div class="habit-streak">🔥 ${habit.streak || 0} day streak</div>
        </div>
        <div>
          <button class="checkin-btn ${isCheckedToday ? 'checked' : ''}" ${isCheckedToday ? 'disabled' : ''} onclick="checkIn('${habit.id}')">
            ${isCheckedToday ? '✓ Done Today' : 'Check In'}
          </button>
          <button class="small-btn" onclick="editHabit('${habit.id}')">Edit</button>
          <button class="small-btn" onclick="deleteHabit('${habit.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

/* simple escaping to avoid user HTML injection in this demo */
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));
}

/* ---------- Navigation & UI ---------- */
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');

  // If dashboard, load habits
  if (pageId === 'dashboard') {
    if (!currentUser) {
      showMessage('loginMessage', 'Please login first!', 'error');
      showPage('login');
      return;
    } else {
      loadHabitsFromStorage();
      renderHabits();
      document.getElementById('addHabitInline').style.display = 'none';
    }
  }

  // hide register/login messages when showing other pages
  if (pageId !== 'login') document.getElementById('loginMessage').innerHTML = '';
  if (pageId !== 'register') document.getElementById('registerMessage').innerHTML = '';
}

/* update nav buttons depending on auth */
function updateNavigation() {
  const loggedIn = !!currentUser;
  document.getElementById('loginNavBtn').style.display = loggedIn ? 'none' : 'inline-block';
  document.getElementById('registerNavBtn').style.display = loggedIn ? 'none' : 'inline-block';
  document.getElementById('dashboardNavBtn').style.display = loggedIn ? 'inline-block' : 'none';
  document.getElementById('logoutNavBtn').style.display = loggedIn ? 'inline-block' : 'none';
}

/* show messages inside forms */
function showMessage(elementId, message, type='success') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = `<div class="${type === 'error' ? 'error-message' : 'success-message'}">${message}</div>`;
  setTimeout(() => { el.innerHTML = ''; }, 4000);
}

/* ---------- Quote rotation ---------- */
function updateQuote() {
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  const q = document.getElementById('motivationalQuote');
  const a = document.getElementById('quoteAuthor');
  const dq = document.getElementById('dashboardQuote');
  const da = document.getElementById('dashboardQuoteAuthor');
  if (q && a) { q.textContent = `"${randomQuote.text}"`; a.textContent = `- ${randomQuote.author}`; }
  if (dq && da) { dq.textContent = `"${randomQuote.text}"`; da.textContent = `- ${randomQuote.author}`; }
}

/* ---------- Form handlers (connected from HTML) ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // initialize auth if present
  const cur = localStorage.getItem('hf_currentUser');
  if (cur) {
    currentUser = JSON.parse(cur);
  }
  updateNavigation();
  updateQuote();
  setInterval(updateQuote, 60000);

  // forms
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const res = loginUser(email, password);
      if (!res.ok) {
        showMessage('loginMessage', res.error, 'error');
        return;
      }
      currentUser = res.user;
      updateNavigation();
      loadHabitsFromStorage();
      renderHabits();
      showPage('dashboard');
      showMessage('loginMessage', 'Welcome back!', 'success');
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('registerName').value.trim();
      const email = document.getElementById('registerEmail').value.trim();
      const password = document.getElementById('registerPassword').value;
      const res = registerUser(name, email, password);
      if (!res.ok) {
        showMessage('registerMessage', res.error, 'error');
        return;
      }
      currentUser = res.user;
      updateNavigation();
      loadHabitsFromStorage();
      renderHabits();
      showPage('dashboard');
      showMessage('registerMessage', 'Account created successfully!', 'success');
    });
  }

  // show home by default
  showPage('home');
});
