let currentHomework = null;
let currentUser = null;

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
    const hw = data.homework;
    const questions = hw.questions || [];
    preview.style.display = 'block';
    preview.innerHTML = `
      <div style="margin-bottom:12px;">
        <span style="font-size:1rem; font-weight:700;">${hw.title || topic}</span>
        <span style="margin-left:8px; font-size:0.8rem; color:var(--text-muted); background:var(--bg); padding:2px 8px; border-radius:12px;">${level}</span>
      </div>
      ${questions.map((q, i) => `
        <div style="background:var(--bg); border-radius:10px; padding:14px; margin-bottom:10px;">
          <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:6px;">問題 ${i + 1}</div>
          <div style="font-weight:600; margin-bottom:10px;">${q.question}</div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${(q.options || []).map((opt, j) => `
              <div style="padding:8px 12px; border-radius:8px; font-size:0.9rem;
                background:${j === q.correct ? '#e8f5e9' : 'var(--card)'};
                border:1px solid ${j === q.correct ? 'var(--success)' : 'var(--border)'};
                color:${j === q.correct ? 'var(--success)' : 'var(--text)'};">
                ${j === q.correct ? '✅ ' : ''}${opt}
              </div>`).join('')}
          </div>
          ${q.explanation ? `<div style="margin-top:8px; font-size:0.82rem; color:var(--text-muted);">💡 ${q.explanation}</div>` : ''}
        </div>`).join('')}
    `;
    actions.style.display = 'block';
    populateStudentDropdown();
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `✨ ${I18n.t('generate')}`;
  }
}

async function sendToAll() {
  if (!currentHomework) return;
  const btn = event.target;
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> 配布中...';
  try {
    const topicEl = document.getElementById('hw-topic') || document.getElementById('quick-topic');
    const levelEl = document.getElementById('hw-level');
    const data = await API.request('/api/homework/assign', {
      method: 'POST',
      body: JSON.stringify({
        homework: currentHomework,
        topic: topicEl?.value || '日常会話',
        level: levelEl?.value || 'beginner'
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
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">${I18n.t('loading')}</td></tr>`;

  try {
    const data = await API.request('/api/auth/students');
    const students = data.students || [];
    if (students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">まだ生徒がいません。「生徒追加」から追加してください。</td></tr>`;
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
        <td>
          <button class="btn btn-ghost" onclick="showFlashcardStats('${s.id}', '${s.name}')">
            📊 カード進捗
          </button>
        </td>
      </tr>
    `).join('');
    document.getElementById('stat-students').textContent = students.length;
    renderProgressChart(students);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--danger); padding:16px;">${err.message}</td></tr>`;
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
        <div style="font-size:0.8rem; color:var(--text-muted)">（¥1,000 × ${data.student_count}人）</div>
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
    area.innerHTML = `<span style="color:var(--danger)">${err.message}</span>`;
  }
}

async function startBilling() {
  try {
    const data = await API.request('/api/billing/create-checkout', { method: 'POST', body: JSON.stringify({}) });
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
    const topicEl = document.getElementById('hw-topic') || document.getElementById('quick-topic');
    const levelEl = document.getElementById('hw-level');
    await API.request('/api/homework/assign-individual', {
      method: 'POST',
      body: JSON.stringify({
        studentId,
        homework: currentHomework,
        topic: topicEl?.value || '日常会話',
        level: levelEl?.value || 'beginner'
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
