let currentHomework = null;

document.addEventListener('DOMContentLoaded', () => {
  I18n.init();
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

  const DEMO_STUDENTS = [
    { name: 'Maria Silva', native_language: 'pt', level: 'beginner', streak: 12, progress: 45 },
    { name: 'John Smith', native_language: 'en', level: 'elementary', streak: 5, progress: 62 },
    { name: 'Ana Oliveira', native_language: 'pt', level: 'beginner', streak: 21, progress: 38 },
  ];

  tbody.innerHTML = DEMO_STUDENTS.map(s => `
    <tr>
      <td>${s.name}</td>
      <td>${s.native_language === 'pt' ? '🇧🇷 PT' : '🇺🇸 EN'}</td>
      <td><span class="level-badge level-${s.level}">${s.level}</span></td>
      <td>🔥 ${s.streak}日</td>
      <td>
        <div class="progress-bar" style="width:120px;">
          <div class="progress-fill" style="width:${s.progress}%"></div>
        </div>
        <small style="color:var(--text-muted)">${s.progress}%</small>
      </td>
    </tr>
  `).join('');

  document.getElementById('stat-students').textContent = DEMO_STUDENTS.length;
}

function showError(msg) {
  const el = document.getElementById('error-area');
  el.innerHTML = `<div class="error-msg" style="margin-top:16px;">${msg}</div>`;
}

function clearError() {
  document.getElementById('error-area').innerHTML = '';
}
