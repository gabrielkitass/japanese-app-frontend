let currentHomework = null;
let currentUser = null;
let currentTopic = '';
let currentLevel = 'beginner';
let hwEditorMode = false;

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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
  if (name === 'billing') loadBilling();
  if (name === 'add-student') renderInviteLink();
}

function renderInviteLink() {
  if (!currentUser) return;
  const base = window.location.href.replace(/[^/]*$/, '');
  const link = `${base}register-student.html?t=${currentUser.id}`;
  const el = document.getElementById('invite-link');
  if (el) el.value = link;
}

function copyInviteLink() {
  const el = document.getElementById('invite-link');
  if (!el) return;
  navigator.clipboard.writeText(el.value).then(() => {
    const msg = document.getElementById('copy-msg');
    if (msg) { msg.style.display = 'block'; setTimeout(() => msg.style.display = 'none', 2500); }
  }).catch(() => {
    el.select();
    document.execCommand('copy');
  });
}

function switchLang(lang, btnEl) {
  I18n.load(lang);
  document.querySelectorAll('.sidebar .lang-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
}

async function loadDashboard() {
  try {
    const data = await API.request('/api/teacher/stats');
    document.getElementById('stat-students').textContent = data.student_count;
    document.getElementById('stat-homework').textContent = data.homework_this_week;
    document.getElementById('stat-active').textContent = data.active_today;
    loadSentHistory();
  } catch (err) {
    document.getElementById('stat-students').textContent = '—';
  }
}

async function quickGenerate() {
  const topic = document.getElementById('quick-topic').value.trim();
  if (!topic) return;
  const btn = document.getElementById('quick-btn');
  const preview = document.getElementById('quick-preview');
  const actions = document.getElementById('quick-actions');
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="loading-spinner"></span> 生成中...`;
  preview.style.display = 'none';
  actions.style.display = 'none';
  try {
    const data = await API.generateHomework(topic, 'beginner', '');
    currentHomework = data.homework;
    currentTopic = topic;
    currentLevel = 'beginner';
    const hw = data.homework;
    const questions = hw.questions || [];
    preview.style.display = 'block';
    preview.innerHTML = `
      <div style="margin-bottom:12px;"><span style="font-size:1rem; font-weight:700;">${escapeHtml(hw.title || topic)}</span></div>
      ${questions.slice(0, 3).map((q, i) => `
        <div style="background:var(--bg); border-radius:10px; padding:14px; margin-bottom:10px;">
          <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:6px;">問題 ${i + 1}</div>
          <div style="font-weight:600; margin-bottom:10px;">${escapeHtml(q.question)}</div>
          <div style="font-size:0.82rem; color:var(--text-muted);">...全${questions.length}問生成済み</div>
        </div>`).join('')}
    `;
    actions.style.display = 'block';
    populateStudentDropdown();
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

async function generateHomework() {
  const topic = document.getElementById('hw-topic').value.trim();
  const level = document.getElementById('hw-level').value;
  if (!topic) { showHwError('テーマを入力してください'); return; }
  await hwDoGenerate(topic, level, 'gen-btn', '');
}

async function generateFromPdf() {
  const context = document.getElementById('pdf-context').value.trim();
  const topic = document.getElementById('pdf-topic').value.trim() || 'PDFテキスト';
  const level = document.getElementById('pdf-level').value;
  if (!context) { showHwError('PDFを先にアップロードしてください'); return; }
  await hwDoGenerate(topic, level, 'pdf-gen-btn', context);
}

async function hwDoGenerate(topic, level, btnId, context) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="loading-spinner"></span> 生成中...`;
  showHwError('');
  document.getElementById('hw-preview-section').style.display = 'none';
  try {
    const data = await API.generateHomework(topic, level, context);
    currentHomework = data.homework;
    currentTopic = topic;
    currentLevel = level;
    showHwPreview(data.homework);
    populateStudentDropdown();
  } catch (err) {
    showHwError(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
  }
}

function showHwError(msg) {
  const el = document.getElementById('hw-error');
  if (!el) return;
  if (!msg) { el.style.display = 'none'; return; }
  el.textContent = msg;
  el.style.display = 'block';
}

function showHwPreview(hw) {
  const questions = hw.questions || [];
  const previewEl = document.getElementById('hw-preview');
  const editorEl = document.getElementById('hw-editor');
  const btn = document.getElementById('edit-toggle-btn');
  editorEl.style.display = 'none';
  previewEl.style.display = 'block';
  if (btn) btn.textContent = '✏️ 編集する';
  hwEditorMode = false;
  previewEl.innerHTML = `
    <div style="font-weight:700; font-size:1rem; margin-bottom:14px;">${escapeHtml(hw.title || '')}</div>
    ${questions.map((q, i) => `
      <div style="background:var(--bg); border-radius:10px; padding:14px; margin-bottom:10px;">
        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:6px; font-weight:700;">問題 ${i + 1}</div>
        <div style="font-weight:600; margin-bottom:10px;">${escapeHtml(q.question)}</div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${(q.options || []).map((opt, j) => `
            <div style="padding:8px 12px; border-radius:8px; font-size:0.9rem;
              background:${j === q.correct ? '#e8f5e9' : 'var(--card)'};
              border:1px solid ${j === q.correct ? 'var(--success)' : 'var(--border)'};
              color:${j === q.correct ? 'var(--success)' : 'var(--text)'};">
              ${j === q.correct ? '✅ ' : ''}${escapeHtml(opt)}
            </div>`).join('')}
        </div>
        ${q.explanation ? `<div style="margin-top:8px; font-size:0.82rem; color:var(--text-muted);">💡 ${escapeHtml(q.explanation)}</div>` : ''}
      </div>`).join('')}
  `;
  document.getElementById('hw-preview-section').style.display = 'block';
}

function switchHwTab(tab) {
  ['topic', 'video', 'pdf', 'manual'].forEach(t => {
    const panel = document.getElementById(`hw-panel-${t}`);
    const btn = document.getElementById(`tab-${t}`);
    if (panel) panel.style.display = t === tab ? '' : 'none';
    if (btn) {
      btn.style.borderBottomColor = t === tab ? 'var(--primary)' : 'transparent';
      btn.style.color = t === tab ? 'var(--primary)' : 'var(--text-muted)';
      btn.style.fontWeight = t === tab ? '700' : '600';
    }
  });
  if (tab === 'manual') initManualMode();
  document.getElementById('hw-preview-section').style.display = 'none';
  showHwError('');
}

async function fetchVideoTranscript() {
  const url = document.getElementById('video-url').value.trim();
  if (!url) { showHwError('YouTube URLを入力してください'); return; }
  const btn = document.getElementById('video-fetch-btn');
  const status = document.getElementById('video-fetch-status');
  btn.disabled = true;
  btn.textContent = '取得中...';
  status.style.color = 'var(--text-muted)';
  status.textContent = '⏳ 字幕を取得しています...';
  try {
    const res = await fetch(CONFIG.API_BASE_URL + '/api/video-transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API.getToken() },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    document.getElementById('video-context').value = data.text;
    status.style.color = 'var(--success)';
    status.textContent = `✅ ${data.segments}セグメント・${data.chars}文字の字幕を取得しました`;
    if (!document.getElementById('video-topic').value) {
      document.getElementById('video-topic').value = '授業の復習';
    }
  } catch (err) {
    status.style.color = 'var(--danger)';
    status.textContent = `⚠️ ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.textContent = '🔍 字幕取得';
  }
}

async function generateFromVideo() {
  const context = document.getElementById('video-context').value.trim();
  const topic = document.getElementById('video-topic').value.trim() || '授業の復習';
  const level = document.getElementById('video-level').value;
  if (!context) { showHwError('授業内容を入力するか、YouTube字幕を取得してください'); return; }
  await hwDoGenerate(topic, level, 'video-gen-btn', context);
}

function toggleHwEditor() {
  if (hwEditorMode) {
    currentHomework = collectHwEdits();
    showHwPreview(currentHomework);
  } else {
    openHwEditor(currentHomework);
  }
}

function openHwEditor(hw) {
  if (!hw) return;
  hwEditorMode = true;
  const previewEl = document.getElementById('hw-preview');
  const editorEl = document.getElementById('hw-editor');
  const btn = document.getElementById('edit-toggle-btn');
  previewEl.style.display = 'none';
  if (btn) btn.textContent = '👁 プレビューに戻る';
  editorEl.style.display = 'block';
  const questions = hw.questions || [];
  editorEl.innerHTML = `
    <div style="margin-bottom:16px;">
      <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:6px;">タイトル</label>
      <input type="text" id="edit-title" value="${escapeHtml(hw.title || '')}"
        style="width:100%; padding:10px 14px; border:2px solid var(--border); border-radius:8px; font-size:0.95rem; box-sizing:border-box; background:var(--bg); color:var(--text);">
    </div>
    <div id="edit-questions-container">
      ${questions.map((q, i) => buildQuestionEditor(q, i)).join('')}
    </div>
    <button class="btn btn-ghost" onclick="addEditorQuestion()" style="width:100%; margin-top:8px;">＋ 問題を追加</button>
  `;
}

function buildQuestionEditor(q, i) {
  const opts = q.options || ['', '', '', ''];
  const uid = Date.now() + i;
  return `<div class="eq-card" style="background:var(--bg); border:1px solid var(--border); border-radius:10px; padding:16px; margin-bottom:12px;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
      <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted);">問題 ${i + 1}</span>
      <button onclick="removeEditorQuestion(this)" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:0.82rem;">🗑 削除</button>
    </div>
    <textarea class="eq-question" rows="2" style="width:100%; padding:10px; border:2px solid var(--border); border-radius:8px; font-size:0.9rem; resize:vertical; box-sizing:border-box; margin-bottom:10px; background:var(--card); color:var(--text); font-family:inherit;">${escapeHtml(q.question)}</textarea>
    ${['A','B','C','D'].map((l, j) => `
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
        <input type="radio" name="eq-correct-${uid}" class="eq-correct" value="${j}" ${q.correct === j ? 'checked' : ''} title="正解に設定">
        <input type="text" class="eq-option" value="${escapeHtml(opts[j] || '')}" placeholder="選択肢${l}"
          style="flex:1; padding:8px 10px; border:2px solid var(--border); border-radius:8px; font-size:0.88rem; background:var(--card); color:var(--text);">
      </div>`).join('')}
    <textarea class="eq-explanation" rows="2" style="width:100%; padding:10px; border:2px solid var(--border); border-radius:8px; font-size:0.85rem; resize:vertical; box-sizing:border-box; margin-top:6px; background:var(--card); color:var(--text); font-family:inherit;" placeholder="解説（ポルトガル語または英語、任意）">${escapeHtml(q.explanation || '')}</textarea>
  </div>`;
}

function addEditorQuestion() {
  const container = document.getElementById('edit-questions-container');
  const i = container.querySelectorAll('.eq-card').length;
  container.insertAdjacentHTML('beforeend', buildQuestionEditor({ question: '', options: ['', '', '', ''], correct: 0, explanation: '' }, i));
}

function removeEditorQuestion(btn) {
  const card = btn.closest('.eq-card');
  const container = card.parentElement;
  if (container.querySelectorAll('.eq-card').length <= 1) return;
  card.remove();
  container.querySelectorAll('.eq-card').forEach((c, i) => {
    c.querySelector('span').textContent = `問題 ${i + 1}`;
  });
}

function collectHwEdits() {
  const title = document.getElementById('edit-title')?.value.trim() || '';
  const cards = document.querySelectorAll('#edit-questions-container .eq-card');
  const questions = Array.from(cards).map((card, i) => {
    const options = Array.from(card.querySelectorAll('.eq-option')).map(inp => inp.value.trim());
    const correctEl = card.querySelector('.eq-correct:checked');
    return {
      id: i + 1,
      type: 'multiple_choice',
      question: card.querySelector('.eq-question').value.trim(),
      options,
      correct: correctEl ? parseInt(correctEl.value) : 0,
      explanation: card.querySelector('.eq-explanation').value.trim()
    };
  });
  return { title, questions };
}

function initManualMode() {
  if (document.getElementById('manual-title').value) return;
  document.getElementById('manual-title').value = '';
  document.getElementById('manual-questions-container').innerHTML = '';
  addManualQuestion();
}

function addManualQuestion() {
  const container = document.getElementById('manual-questions-container');
  const i = container.querySelectorAll('.eq-card').length;
  container.insertAdjacentHTML('beforeend', buildQuestionEditor({ question: '', options: ['', '', '', ''], correct: 0, explanation: '' }, i));
}

function saveManualHomework() {
  const title = document.getElementById('manual-title').value.trim() || '手動作成の宿題';
  const cards = document.querySelectorAll('#manual-questions-container .eq-card');
  const questions = Array.from(cards).map((card, i) => {
    const options = Array.from(card.querySelectorAll('.eq-option')).map(inp => inp.value.trim());
    const correctEl = card.querySelector('.eq-correct:checked');
    return {
      id: i + 1,
      type: 'multiple_choice',
      question: card.querySelector('.eq-question').value.trim(),
      options,
      correct: correctEl ? parseInt(correctEl.value) : 0,
      explanation: card.querySelector('.eq-explanation').value.trim()
    };
  }).filter(q => q.question.trim());
  if (questions.length === 0) { showHwError('少なくとも1問入力してください'); return; }
  currentHomework = { title, questions };
  currentTopic = title;
  currentLevel = 'beginner';
  showHwPreview(currentHomework);
  populateStudentDropdown();
}

async function handlePdfFile(file) {
  if (!file) return;
  const zone = document.getElementById('pdf-drop-zone');
  zone.innerHTML = `<div style="font-size:2rem;">⏳</div><div style="font-weight:600; margin-top:8px;">PDF解析中...</div>`;
  try {
    const formData = new FormData();
    formData.append('pdf', file);
    const res = await fetch(CONFIG.API_BASE_URL + '/api/parse-pdf', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + API.getToken() },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'PDF解析失敗');
    document.getElementById('pdf-context').value = data.text;
    document.getElementById('pdf-extracted-section').style.display = 'block';
    zone.innerHTML = `<div style="font-size:2rem;">✅</div><div style="font-weight:700; margin-top:8px;">${escapeHtml(file.name)}</div><div style="font-size:0.82rem; color:var(--text-muted); margin-top:4px;">${data.pages}ページ・${data.chars}文字抽出</div>`;
  } catch (err) {
    zone.innerHTML = `<div style="font-size:2rem; cursor:pointer;" onclick="document.getElementById('pdf-file-input').click()">📄</div><div style="font-weight:600; color:var(--danger); margin-top:8px;">${escapeHtml(err.message)}</div><div style="font-size:0.82rem; color:var(--text-muted); margin-top:4px;">クリックして再試行</div>`;
  }
}

function handlePdfDrop(e) {
  e.preventDefault();
  document.getElementById('pdf-drop-zone').style.borderColor = 'var(--border)';
  const file = e.dataTransfer.files[0];
  if (file?.type === 'application/pdf') handlePdfFile(file);
  else showHwError('PDFファイルのみ対応しています');
}

async function sendToAll() {
  if (!currentHomework) return;
  const btn = event.target;
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> 配布中...';
  try {
    const data = await API.request('/api/homework/assign', {
      method: 'POST',
      body: JSON.stringify({
        homework: currentHomework,
        topic: currentTopic || '日常会話',
        level: currentLevel || 'beginner'
      })
    });
    btn.innerHTML = `✅ ${data.assigned}人に配布しました！`;
    setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 3000);
    loadDashboard();
  } catch (err) {
    showError(err.message);
    btn.innerHTML = original;
    btn.disabled = false;
  }
}

async function loadStudents() {
  const tbody = document.getElementById('students-tbody');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted);">${I18n.t('loading')}</td></tr>`;

  try {
    const data = await API.request('/api/auth/students');
    const students = data.students || [];
    if (students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted);">まだ生徒がいません。「生徒追加」から追加してください。</td></tr>`;
      document.getElementById('stat-students').textContent = '0';
      return;
    }
    tbody.innerHTML = students.map(s => {
      const submitted = parseInt(s.hw_submitted) || 0;
      const total = parseInt(s.hw_total) || 0;
      const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;
      const lastActive = s.last_active ? new Date(s.last_active).toLocaleDateString('ja-JP') : '—';
      return `
      <tr>
        <td>${escapeHtml(s.name)}</td>
        <td>${s.native_language === 'pt' ? '🇧🇷 PT' : s.native_language === 'en' ? '🇺🇸 EN' : '🇯🇵 JA'}</td>
        <td><span class="level-badge level-${s.level}">${s.level}</span></td>
        <td>${submitted}/${total} 提出</td>
        <td>
          <div class="progress-bar" style="width:120px;">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
        </td>
        <td>${lastActive}</td>
        <td>
          <button class="btn btn-ghost" onclick="showFlashcardStats('${s.id}', '${escapeHtml(s.name)}')">
            📊 カード進捗
          </button>
        </td>
      </tr>`;
    }).join('');
    document.getElementById('stat-students').textContent = students.length;
    renderProgressChart(students);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--danger); padding:16px;">${err.message}</td></tr>`;
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

async function generateReport() {
  const btn = document.getElementById('report-btn');
  const content = document.getElementById('report-content');
  btn.disabled = true;
  btn.innerHTML = `<span class="loading-spinner"></span> 分析中...`;
  content.textContent = 'AIが生徒データを分析しています...';
  try {
    const data = await API.request('/api/reports/weakness');
    content.textContent = data.report;
  } catch (err) {
    content.innerHTML = `<span style="color:var(--danger)">${err.message}</span>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✨ レポート生成';
  }
}

async function loadBilling() {
  const area = document.getElementById('billing-status-area');
  try {
    const data = await API.request('/api/billing/status');
    const isTrialActive = data.status === 'trial' && new Date(data.trial_ends_at) > new Date();
    const trialDaysLeft = isTrialActive
      ? Math.ceil((new Date(data.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24))
      : 0;

    area.innerHTML = `
      <div style="margin-bottom:20px;">
        <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:4px;">ステータス</div>
        <div style="font-size:1.2rem; font-weight:700; color:${isTrialActive ? 'var(--accent)' : 'var(--success)'}">
          ${isTrialActive ? `🎁 無料トライアル（残り${trialDaysLeft}日）` : '✅ 有効'}
        </div>
      </div>
      <div style="margin-bottom:20px;">
        <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:4px;">生徒数</div>
        <div style="font-size:1.5rem; font-weight:700;">${data.student_count}人</div>
      </div>
      <div style="margin-bottom:24px;">
        <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:4px;">トライアル終了後の月額</div>
        <div style="font-size:1.5rem; font-weight:700; color:var(--primary)">¥${data.monthly_cost.toLocaleString()}</div>
        <div style="font-size:0.8rem; color:var(--text-muted)">（¥500 × ${data.student_count}人）</div>
      </div>
      ${isTrialActive
        ? `<button class="btn btn-primary" onclick="startBilling()" style="width:100%">💳 今すぐ支払い方法を登録</button>
           <div style="font-size:0.8rem; color:var(--text-muted); margin-top:8px; text-align:center">
             トライアル中は課金されません
           </div>`
        : `<div class="btn btn-success" style="width:100%; text-align:center;">✅ 支払い設定済み</div>`
      }
      <button class="btn btn-ghost" onclick="openBillingPortal()" style="width:100%; margin-top:8px;">
        💳 支払い方法・請求書を確認
      </button>
      <button class="btn btn-ghost" onclick="cancelSubscription()" style="width:100%; margin-top:8px; color:var(--danger);">
        サブスクリプションを解約
      </button>
    `;
  } catch (err) {
    area.innerHTML = `<span style="color:var(--danger)">${escapeHtml(err.message)}</span>`;
  }
}

async function startBilling() {
  try {
    const data = await API.request('/api/billing/create-checkout', { method: 'POST', body: JSON.stringify({}) });
    if (!data?.url) throw new Error('チェックアウトURLが取得できませんでした');
    window.location.href = data.url;
  } catch (err) {
    showError(err.message);
  }
}

function showError(msg) {
  const el = document.getElementById('error-area');
  el.innerHTML = `<div class="error-msg" style="margin-top:16px;">${msg}</div>`;
}

function clearError() {
  document.getElementById('error-area').innerHTML = '';
}

async function showFlashcardStats(studentId, studentName) {
  const modal = document.createElement('div');
  modal.id = 'fc-stats-modal';
  modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div style="background:var(--card);border-radius:16px;width:100%;max-width:520px;max-height:85vh;overflow-y:auto;padding:28px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h2 style="font-size:1.1rem;margin:0;">📊 ${studentName} のカード進捗</h2>
          <button onclick="document.getElementById('fc-stats-modal').remove()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--text-muted);">✕</button>
        </div>
        <div id="fc-stats-content">
          <div style="text-align:center;padding:20px;color:var(--text-muted);">読み込み中...</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  try {
    const data = await API.request(`/api/teacher/flashcard-stats/${studentId}`);
    const s = data.summary;
    const lastActivity = s.last_activity
      ? new Date(s.last_activity).toLocaleDateString('ja-JP')
      : 'なし';

    const categoryRows = data.categories.map(cat => {
      const masteredPct = cat.total > 0 ? Math.round(cat.mastered / cat.total * 100) : 0;
      const barColor = masteredPct >= 80 ? 'var(--success)' : masteredPct >= 40 ? 'var(--accent)' : 'var(--danger)';
      return `
        <tr>
          <td style="padding:8px 4px;font-weight:600;">${cat.category}</td>
          <td style="padding:8px 4px;text-align:center;color:var(--text-muted);">${cat.learned}/${cat.total}</td>
          <td style="padding:8px 4px;text-align:center;">
            <div style="background:var(--border);border-radius:4px;height:8px;width:80px;display:inline-block;vertical-align:middle;">
              <div style="background:${barColor};height:100%;width:${masteredPct}%;border-radius:4px;"></div>
            </div>
            <span style="margin-left:6px;font-size:0.8rem;color:var(--text-muted);">${masteredPct}%</span>
          </td>
          <td style="padding:8px 4px;text-align:center;color:var(--danger);">${cat.due > 0 ? `${cat.due}件` : '—'}</td>
        </tr>`;
    }).join('');

    document.getElementById('fc-stats-content').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">
        <div style="background:var(--bg);border-radius:10px;padding:14px;text-align:center;">
          <div style="font-size:1.6rem;font-weight:800;color:var(--primary);">${s.total_learned || 0}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">学習済み</div>
        </div>
        <div style="background:var(--bg);border-radius:10px;padding:14px;text-align:center;">
          <div style="font-size:1.6rem;font-weight:800;color:var(--success);">${s.total_mastered || 0}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">定着済み</div>
        </div>
        <div style="background:var(--bg);border-radius:10px;padding:14px;text-align:center;">
          <div style="font-size:1.6rem;font-weight:800;color:var(--accent);">${s.total_due || 0}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">要復習</div>
        </div>
      </div>
      <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:16px;">最終学習: ${lastActivity}</p>

      ${data.categories.length > 0 ? `
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:20px;">
          <thead><tr style="border-bottom:1px solid var(--border);">
            <th style="padding:8px 4px;text-align:left;color:var(--text-muted);">カテゴリ</th>
            <th style="padding:8px 4px;text-align:center;color:var(--text-muted);">学習</th>
            <th style="padding:8px 4px;text-align:center;color:var(--text-muted);">定着率</th>
            <th style="padding:8px 4px;text-align:center;color:var(--text-muted);">要復習</th>
          </tr></thead>
          <tbody>${categoryRows}</tbody>
        </table>
      ` : '<p style="text-align:center;color:var(--text-muted);padding:16px;">フラッシュカードをまだ使用していません</p>'}

      <button class="btn btn-primary" style="width:100%;"
        onclick="suggestHomeworkFromFlashcards('${studentId}', '${studentName}', this)">
        🤖 弱点から宿題を自動提案
      </button>
      <div id="hw-suggestion-result" style="margin-top:16px;"></div>
    `;
  } catch (err) {
    document.getElementById('fc-stats-content').innerHTML =
      `<div style="color:var(--danger);padding:16px;">${err.message}</div>`;
  }
}

async function suggestHomeworkFromFlashcards(studentId, studentName, btn) {
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> AI分析中...';
  const resultEl = document.getElementById('hw-suggestion-result');

  try {
    const data = await API.request('/api/teacher/suggest-homework', {
      method: 'POST',
      body: JSON.stringify({ studentId })
    });
    const s = data.suggestion;
    const exerciseHTML = (s.exercises || []).map((ex, i) => `
      <div style="background:var(--bg);border-radius:8px;padding:12px;margin-bottom:8px;">
        <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">${ex.type}</div>
        <div style="font-weight:600;margin-bottom:4px;">${ex.instruction}</div>
        <div style="font-size:0.9rem;color:var(--text);">${ex.content}</div>
      </div>`).join('');

    resultEl.innerHTML = `
      <div style="border:1px solid var(--border);border-radius:12px;padding:16px;">
        <div style="font-weight:700;margin-bottom:12px;">📝 ${s.theme}</div>
        ${exerciseHTML}
        ${s.teacher_note ? `<div style="background:#fff8e1;border-radius:8px;padding:10px;margin-top:8px;font-size:0.85rem;color:#8a6914;">💡 ${s.teacher_note}</div>` : ''}
        <button class="btn btn-primary" style="width:100%;margin-top:12px;"
          onclick="applyHomeworkSuggestion(${JSON.stringify(s).replace(/"/g, '&quot;')})">
          この宿題を配布する
        </button>
      </div>`;
    btn.disabled = false;
    btn.textContent = '🤖 弱点から宿題を自動提案';
  } catch (err) {
    resultEl.innerHTML = `<div style="color:var(--danger);">${err.message}</div>`;
    btn.disabled = false;
    btn.textContent = '🤖 弱点から宿題を自動提案';
  }
}

function applyHomeworkSuggestion(suggestion) {
  document.getElementById('fc-stats-modal')?.remove();
  showPage('homework', document.querySelector('.sidebar a[href="#homework"]'));
  const topicInput = document.getElementById('hw-topic');
  if (topicInput) topicInput.value = suggestion.theme;
}

async function openBillingPortal() {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = '読み込み中...';
  try {
    const data = await API.request('/api/billing/portal', { method: 'POST', body: '{}' });
    window.location.href = data.url;
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.textContent = '💳 支払い方法・請求書を確認';
  }
}

async function cancelSubscription() {
  if (!confirm('サブスクリプションを解約しますか？現在の請求期間末まで利用できます。')) return;
  try {
    await API.request('/api/billing/cancel', { method: 'POST', body: '{}' });
    alert('解約処理を受け付けました。請求期間末まで引き続きご利用いただけます。');
    loadBilling();
  } catch (err) {
    alert(err.message);
  }
}

async function populateStudentDropdown() {
  const sel = document.getElementById('hw-target-student');
  const qsel = document.getElementById('quick-target-student');
  if (!sel && !qsel) return;
  try {
    const data = await API.request('/api/auth/students');
    const options = (data.students || []).map(s =>
      `<option value="${s.id}">${escapeHtml(s.name)}</option>`
    ).join('');
    if (sel) sel.innerHTML = '<option value="">👤 特定の生徒に送る...</option>' + options;
    if (qsel) qsel.innerHTML = '<option value="">👤 特定の生徒に送る...</option>' + options;
  } catch {}
}

async function sendToStudent() {
  if (!currentHomework) return;
  const sel = document.getElementById('hw-target-student') || document.getElementById('quick-target-student');
  const studentId = sel?.value;
  if (!studentId) { alert('生徒を選択してください'); return; }
  const btn = document.getElementById('send-to-student-btn');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner dark"></span>';
  try {
    await API.request('/api/homework/assign-individual', {
      method: 'POST',
      body: JSON.stringify({
        studentId,
        homework: currentHomework,
        topic: currentTopic || '日常会話',
        level: currentLevel || 'beginner'
      })
    });
    btn.innerHTML = '✅ 送信しました！';
    setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 2500);
  } catch (err) {
    showError(err.message);
    btn.innerHTML = original;
    btn.disabled = false;
  }
}

async function loadSentHistory() {
  try {
    const data = await API.request('/api/teacher/homework/sent');
    const sent = data.sent || [];

    // Find or create the history card in the dashboard
    let histCard = document.getElementById('sent-hw-history');
    if (!histCard) {
      histCard = document.createElement('div');
      histCard.id = 'sent-hw-history';
      histCard.className = 'card';
      histCard.style.marginTop = '16px';
      document.getElementById('page-dashboard').appendChild(histCard);
    }

    histCard.innerHTML = `
      <h2 style="font-size:1rem; margin-bottom:12px; color:var(--text-muted);">📋 最近配布した宿題</h2>
      ${sent.length === 0
        ? '<div style="color:var(--text-muted); font-size:0.85rem;">まだ宿題を配布していません</div>'
        : sent.slice(0, 5).map(h => {
            const date = new Date(h.created_at).toLocaleDateString('ja-JP', {month:'short', day:'numeric'});
            const submitRate = h.total_sent > 0 ? Math.round(h.submitted_count / h.total_sent * 100) : 0;
            return `<div style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border);">
              <div>
                <div style="font-weight:600;">${escapeHtml(h.topic || '日常会話')}</div>
                <div style="font-size:0.78rem; color:var(--text-muted);">${date} · ${h.level} · ${h.total_sent}人に配布</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:0.85rem; font-weight:700; color:${submitRate >= 70 ? 'var(--success)' : 'var(--accent)'};">${submitRate}% 提出</div>
                ${h.avg_score ? `<div style="font-size:0.75rem; color:var(--text-muted);">平均 ${Math.round(h.avg_score)}点</div>` : ''}
              </div>
            </div>`;
          }).join('')}
    `;
  } catch {} // silently fail if endpoint not ready
}
