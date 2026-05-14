let currentHomework = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  I18n.init();
  if (typeof Auth !== 'undefined') {
    currentUser = Auth.requireAuth('teacher');
    if (!currentUser) return;
  }
  loadDashboard();
});

function showPage(name, linkEl) {
  document.querySelectorAll('[id^="page-"]').forEach(p => p.style.display = 'none');
  document.getElementById(`page-${name}`).style.display = 'block';
  document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');

  if (name === 'students') loadStudents();
}

function switchLang(lang, btnEl) {
  I18n.load(lang);
  document.querySelectorAll('.sidebar .lang-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
}

async function loadDashboard() {
  document.getElementById('stat-students').textContent = '—';
}

async function quickGenerate() {
  const topic = document.getElementById('quick-topic').value.trim();
  if (!topic) return;
  await doGenerate(topic, 'beginner', 'quick-btn', 'quick-preview', 'quick-actions');
}

async function generateHomework() {
  const topic = document.getElementById('hw-topic').value.trim();
  const level = document.getElementById('hw-level').value;
  if (!topic) return;
  await doGenerate(topic, level, 'gen-btn', 'hw-preview', 'hw-actions');
}

async function doGenerate(topic, level, btnId, previewId, actionsId) {
  const btn = document.getElementById(btnId);
  const preview = document.getElementById(previewId);
  const actions = document.getElementById(actionsId);

  btn.disabled = true;
  btn.innerHTML = `<span class="loading-spinner"></span> ${I18n.t('generating')}`;
  preview.style.display = 'none';
  actions.style.display = 'none';
  clearError();

  try {
    const data = await API.generateHomework(topic, level);
    currentHomework = data.homework;
    preview.style.display = 'block';
    preview.textContent = typeof data.homework === 'object'
      ? JSON.stringify(data.homework, null, 2)
      : data.homework;
    actions.style.display = 'block';
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `✨ ${I18n.t('generate')}`;
  }
}

async function sendToAll() {
  alert('配布機能は Phase 2 で実装予定です。');
}

async function loadStudents() {
  const tbody = document.getElementById('students-tbody');
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--text-muted);">${I18n.t('loading')}</td></tr>`;

  try {
    const data = await API.request('/api/auth/students');
    const students = data.students || [];
    if (students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--text-muted);">まだ生徒がいません。「生徒追加」から追加してください。</td></tr>`;
      document.getElementById('stat-students').textContent = '0';
      return;
    }
    tbody.innerHTML = students.map(s => `
      <tr>
        <td>${s.name}</td>
        <td>${s.native_language === 'pt' ? '🇧🇷 PT' : s.native_language === 'en' ? '🇺🇸 EN' : '🇯🇵 JA'}</td>
        <td><span class="level-badge level-${s.level}">${s.level}</span></td>
        <td>${s.lessons_completed || 0} レッスン</td>
        <td>
          <div class="progress-bar" style="width:120px;">
            <div class="progress-fill" style="width:${Math.min(100, (s.lessons_completed || 0) * 10)}%"></div>
          </div>
        </td>
      </tr>
    `).join('');
    document.getElementById('stat-students').textContent = students.length;
    renderProgressChart(students);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--danger); padding:16px;">${err.message}</td></tr>`;
  }
}

function renderProgressChart(students) {
  const existing = document.getElementById('progress-chart-area');
  if (existing) existing.remove();
  if (!students.length || typeof Chart === 'undefined') return;

  const area = document.createElement('div');
  area.id = 'progress-chart-area';
  area.className = 'card';
  area.style.marginTop = '24px';
  area.innerHTML = `<h3 style="font-size:0.95rem; margin-bottom:16px; color:var(--text-muted);">📊 生徒別進捗</h3>
    <canvas id="progress-chart" height="80"></canvas>`;
  document.getElementById('page-students').appendChild(area);

  new Chart(document.getElementById('progress-chart'), {
    type: 'bar',
    data: {
      labels: students.map(s => s.name.split(' ')[0]),
      datasets: [{
        label: '完了レッスン数',
        data: students.map(s => s.lessons_completed || 0),
        backgroundColor: '#4A90D9',
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });
}

async function addStudent() {
  const name = document.getElementById('new-student-name').value.trim();
  const email = document.getElementById('new-student-email').value.trim();
  const password = document.getElementById('new-student-password').value;
  const native_language = document.getElementById('new-student-lang').value;
  const level = document.getElementById('new-student-level').value;
  const errEl = document.getElementById('add-student-error');
  const btn = document.getElementById('add-student-btn');

  errEl.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = `<span class="loading-spinner"></span>`;

  try {
    await API.request('/api/auth/add-student', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, native_language, level })
    });
    ['new-student-name','new-student-email','new-student-password'].forEach(id => {
      document.getElementById(id).value = '';
    });
    btn.innerHTML = '✅ 追加しました！';
    setTimeout(() => { btn.innerHTML = '➕ 生徒を追加'; btn.disabled = false; }, 2000);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = '➕ 生徒を追加';
  }
}

function showError(msg) {
  const el = document.getElementById('error-area');
  el.innerHTML = `<div class="error-msg" style="margin-top:16px;">${msg}</div>`;
}

function clearError() {
  document.getElementById('error-area').innerHTML = '';
}
