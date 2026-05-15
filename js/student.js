let chatHistory = [];
let xp = parseInt(localStorage.getItem('xp') || '0');
let streak = parseInt(localStorage.getItem('streak') || '0');
let currentUser = null;
let STUDENT_ID = API.getStudentId() || 'demo-student-001';

document.addEventListener('DOMContentLoaded', () => {
  // 認証チェック（auth.js が読み込まれている場合）
  if (typeof Auth !== 'undefined') {
    currentUser = Auth.requireAuth('student');
    if (!currentUser) return;
    STUDENT_ID = currentUser.id;
    API.setStudentId(currentUser.id);
    if (currentUser.native_language) {
      localStorage.setItem('preferred_lang', currentUser.native_language);
    }
  }

  const savedLang = localStorage.getItem('preferred_lang');
  if (savedLang) {
    startApp(savedLang);
  }
  updateStats();

  // オンボーディング（初回のみ表示）
  Onboarding.show();
});

async function selectLang(lang) {
  await I18n.load(lang);
  localStorage.setItem('preferred_lang', lang);
  startApp(lang);
}

function startApp(lang) {
  document.getElementById('lang-screen').style.display = 'none';
  document.getElementById('main-app').style.display = 'flex';
  document.getElementById('lang-indicator').textContent =
    lang === 'ja' ? '🇯🇵' : lang === 'en' ? '🇺🇸' : '🇧🇷';
  switchTab('homework');
}

function updateStats() {
  document.getElementById('xp-count').textContent = xp;
  document.getElementById('streak-count').textContent = streak;
}

function addXP(amount) {
  xp += amount;
  localStorage.setItem('xp', xp);
  updateStats();
  showXPPopup(`+${amount} XP`);
}

function showXPPopup(text) {
  const popup = document.createElement('div');
  popup.className = 'xp-popup';
  popup.textContent = text;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 2000);
}

function showLangMenu() {
  const langs = [
    { code: 'ja', label: '🇯🇵 日本語' },
    { code: 'en', label: '🇺🇸 English' },
    { code: 'pt', label: '🇧🇷 Português' }
  ];
  const current = I18n.getCurrentLang();
  const next = langs[(langs.findIndex(l => l.code === current) + 1) % langs.length];
  selectLang(next.code);
}

function switchTab(tab, btnEl) {
  if (btnEl) {
    document.querySelectorAll('.student-nav button').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }
  const content = document.getElementById('tab-content');
  const fcSection = document.getElementById('tab-flashcard');

  if (tab === 'flashcard') {
    content.style.display = 'none';
    fcSection.hidden = false;
    return;
  }

  content.style.display = '';
  fcSection.hidden = true;

  if (tab === 'homework') renderHomeworkTab(content);
  else if (tab === 'chat') renderChatTab(content);
  else if (tab === 'progress') renderProgressTab(content).catch(() => {});
  else if (tab === 'settings') renderSettingsTab(content);
}


async function renderHomeworkTab(container) {
  container.innerHTML = `
    <h2 style="font-size:1.1rem; margin-bottom:16px;">${I18n.t('todays_homework')}</h2>
    <div id="hw-list" style="display:flex; align-items:center; justify-content:center; padding:40px 0; color:var(--text-muted);">
      <span class="loading-spinner"></span>&nbsp; ${I18n.t('loading')}
    </div>`;

  try {
    const data = await API.request('/api/student/homework');
    const hw = data.homework;
    const hwList = document.getElementById('hw-list');

    if (!hw) {
      hwList.innerHTML = `
        <div style="text-align:center; padding:48px 20px;">
          <div style="font-size:3rem; margin-bottom:16px;">✅</div>
          <div style="font-size:1rem; font-weight:600; margin-bottom:8px;">${I18n.t('no_homework')}</div>
          <div style="font-size:0.85rem; color:var(--text-muted);">
            ${I18n.getCurrentLang() === 'pt' ? 'Nenhuma tarefa no momento. Pratique com os cartões de vocabulário!' :
              I18n.getCurrentLang() === 'en' ? 'No homework right now. Practice with flashcards!' :
              'フラッシュカードで自習しましょう！'}
          </div>
        </div>`;
      return;
    }

    const questions = hw.content?.questions || [];
    window._hwState = { id: hw.id, total: questions.length, correct: 0, answered: 0, answers: [] };

    hwList.innerHTML = `
      <div class="homework-card">
        <h3 style="margin-bottom:4px;">📝 ${escapeHtml(hw.topic || '日常会話')}</h3>
        <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:16px;">
          ${hw.content?.title ? escapeHtml(hw.content.title) : ''}
          &nbsp;·&nbsp; ${questions.length}問
        </div>
        ${questions.map((q, i) => `
          <div class="question-block" id="q-block-${i}">
            <div class="question-text">
              <span style="font-weight:700; color:var(--primary);">${i + 1}.</span>
              ${escapeHtml(q.question)}
              <button class="tts-btn" style="font-size:1rem;" onclick="TTS.speakJapanese('${escapeHtml(q.question)}')">🔊</button>
            </div>
            <div class="options-list">
              ${(q.options || []).map((opt, j) => `
                <button class="option-btn" onclick="hwAnswer(this, ${i}, ${j}, ${q.correct})">
                  ${escapeHtml(opt)}
                </button>`).join('')}
            </div>
          </div>`).join('')}
        <div id="hw-submit-area" style="display:none; margin-top:20px; text-align:center;"></div>
      </div>`;
  } catch (err) {
    document.getElementById('hw-list').innerHTML =
      `<div style="color:var(--danger); padding:16px;">${escapeHtml(err.message)}</div>`;
  }
}

function hwAnswer(btn, qIndex, choiceIndex, correctIndex) {
  const block = document.getElementById(`q-block-${qIndex}`);
  if (block.dataset.answered) return;
  block.dataset.answered = '1';

  const options = block.querySelectorAll('.option-btn');
  options.forEach(b => b.disabled = true);

  const isCorrect = choiceIndex === correctIndex;
  btn.classList.add(isCorrect ? 'correct' : 'incorrect');
  options[correctIndex].classList.add('correct');

  if (isCorrect) window._hwState.correct++;
  window._hwState.answered++;

  if (window._hwState.answered === window._hwState.total) {
    const score = Math.round((window._hwState.correct / window._hwState.total) * 100);
    const submitArea = document.getElementById('hw-submit-area');
    submitArea.style.display = 'block';
    submitArea.innerHTML = `
      <div style="font-size:2rem; margin-bottom:8px;">${score >= 80 ? '🎉' : score >= 60 ? '💪' : '📚'}</div>
      <div style="font-size:1.3rem; font-weight:700; margin-bottom:4px;">
        ${window._hwState.correct} / ${window._hwState.total} 正解
      </div>
      <div style="color:var(--text-muted); margin-bottom:16px;">スコア: ${score}点</div>
      <button class="btn btn-primary" onclick="hwSubmit(${score})" id="hw-submit-btn">
        📤 ${I18n.getCurrentLang() === 'pt' ? 'Enviar resultado' : I18n.getCurrentLang() === 'en' ? 'Submit result' : '結果を提出'}
      </button>`;
  }
}

async function hwSubmit(score) {
  const btn = document.getElementById('hw-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span>';
  try {
    const res = await API.request('/api/student/homework/submit', {
      method: 'POST',
      body: JSON.stringify({ homeworkId: window._hwState.id, score })
    });
    addXP(res.xp || 10);
    btn.innerHTML = `✅ ${I18n.getCurrentLang() === 'pt' ? 'Enviado!' : I18n.getCurrentLang() === 'en' ? 'Submitted!' : '提出しました！'}`;
    setTimeout(() => renderHomeworkTab(document.getElementById('tab-content')), 2000);
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '📤 再試行';
  }
}


function renderChatTab(container) {
  container.innerHTML = `
    <div class="chat-container">
      <div class="chat-messages" id="chat-messages">
        <div class="chat-bubble ai">
          ${I18n.getCurrentLang() === 'pt'
            ? 'Olá! Sou seu tutor de japonês. Pode me perguntar qualquer coisa em português! 🎌'
            : I18n.getCurrentLang() === 'en'
            ? 'Hi! I\'m your Japanese tutor. Ask me anything in English! 🎌'
            : 'こんにちは！何でも日本語について聞いてください！🎌'}
        </div>
      </div>
      <div class="chat-input-row">
        <textarea class="chat-input" id="chat-input" rows="1"
          data-i18n-placeholder="chat_placeholder"
          placeholder="${I18n.t('chat_placeholder')}"
          onkeypress="if(event.key==='Enter' && !event.shiftKey){event.preventDefault(); sendChat();}"></textarea>
        <button class="btn btn-primary" onclick="sendChat()" id="chat-send-btn">
          ➤
        </button>
      </div>
    </div>
  `;
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;

  const messages = document.getElementById('chat-messages');
  messages.innerHTML += `<div class="chat-bubble user">${escapeHtml(msg)}</div>`;
  input.value = '';
  chatHistory.push({ role: 'user', content: msg });

  const sendBtn = document.getElementById('chat-send-btn');
  sendBtn.disabled = true;
  messages.innerHTML += `<div class="chat-bubble ai" id="typing">...</div>`;
  messages.scrollTop = messages.scrollHeight;

  try {
    const data = await API.sendChatMessage(STUDENT_ID, msg, chatHistory);
    document.getElementById('typing')?.remove();

    let replyText = data.reply;
    let parsed;
    try { parsed = JSON.parse(replyText); } catch { parsed = null; }

    let bubbleHtml = '';
    if (parsed?.reply) {
      bubbleHtml = escapeHtml(parsed.reply);
      if (parsed.examples?.length) {
        bubbleHtml += parsed.examples.map(ex => `
          <div class="example">
            <ruby>${escapeHtml(ex.text)}<rt>${escapeHtml(ex.reading || '')}</rt></ruby>
            <button class="tts-btn" onclick="TTS.speakJapanese('${escapeHtml(ex.text)}')">🔊</button>
          </div>`).join('');
      }
    } else {
      bubbleHtml = escapeHtml(replyText);
    }

    messages.innerHTML += `<div class="chat-bubble ai">${bubbleHtml}</div>`;
    chatHistory.push({ role: 'assistant', content: replyText });
    addXP(5);
  } catch (err) {
    document.getElementById('typing')?.remove();
    messages.innerHTML += `<div class="chat-bubble ai" style="color:var(--danger)">${escapeHtml(err.message)}</div>`;
  } finally {
    sendBtn.disabled = false;
    messages.scrollTop = messages.scrollHeight;
  }
}

async function renderProgressTab(container) {
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;

  container.innerHTML = `
    <h2 style="font-size:1.1rem; margin-bottom:20px;">${I18n.t('progress')}</h2>
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <span style="font-weight:700;">${I18n.t('level')} ${level}</span>
        <span class="xp-badge">⭐ ${xp} XP</span>
      </div>
      <div class="progress-bar" style="margin-bottom:6px;">
        <div class="progress-fill" style="width:${xpInLevel}%"></div>
      </div>
      <small style="color:var(--text-muted)">次のレベルまで ${100 - xpInLevel} XP</small>
    </div>
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex; align-items:center; gap:16px;">
        <span style="font-size:2.5rem;">🔥</span>
        <div>
          <div style="font-size:2rem; font-weight:800; line-height:1;">${streak}</div>
          <div style="color:var(--text-muted); font-size:0.85rem;">${I18n.t('streak')} / ${I18n.t('days')}</div>
        </div>
      </div>
    </div>
    <div class="card" id="fc-progress-card">
      <h3 style="font-size:0.9rem; margin-bottom:12px; color:var(--text-muted);">🃏 単語カード進捗</h3>
      <div style="color:var(--text-muted); font-size:0.85rem;">読み込み中...</div>
    </div>
    <div class="card" id="hw-progress-card" style="margin-top:16px;">
      <h3 style="font-size:0.9rem; margin-bottom:12px; color:var(--text-muted);">📝 宿題履歴</h3>
      <div style="color:var(--text-muted); font-size:0.85rem;">読み込み中...</div>
    </div>`;

  // フラッシュカード進捗をAPIから取得
  try {
    const fc = await API.request('/api/flashcards/categories');
    const cats = fc.categories || [];
    const totalLearned = cats.reduce((sum, c) => sum + parseInt(c.learned || 0), 0);
    const totalCards = cats.reduce((sum, c) => sum + parseInt(c.total || 0), 0);
    const totalDue = cats.reduce((sum, c) => sum + parseInt(c.due || 0), 0);
    document.getElementById('fc-progress-card').innerHTML = `
      <h3 style="font-size:0.9rem; margin-bottom:12px; color:var(--text-muted);">🃏 単語カード進捗</h3>
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:14px;">
        <div style="text-align:center; background:var(--bg); border-radius:10px; padding:12px;">
          <div style="font-size:1.6rem; font-weight:800; color:var(--primary);">${totalLearned}</div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">学習済み</div>
        </div>
        <div style="text-align:center; background:var(--bg); border-radius:10px; padding:12px;">
          <div style="font-size:1.6rem; font-weight:800; color:var(--success);">${totalCards}</div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">総単語数</div>
        </div>
        <div style="text-align:center; background:var(--bg); border-radius:10px; padding:12px;">
          <div style="font-size:1.6rem; font-weight:800; color:var(--accent);">${totalDue}</div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">要復習</div>
        </div>
      </div>
      ${cats.map(c => {
        const pct = c.total > 0 ? Math.round(parseInt(c.learned) / parseInt(c.total) * 100) : 0;
        return `<div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
          <div style="width:60px; font-size:0.82rem; flex-shrink:0;">${c.name}</div>
          <div style="flex:1; background:var(--border); border-radius:4px; height:6px;">
            <div style="width:${pct}%; height:100%; background:var(--primary); border-radius:4px;"></div>
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); width:32px; text-align:right;">${pct}%</div>
        </div>`;
      }).join('')}`;
  } catch { /* ignore */ }

  // 宿題履歴（APIから取得）
  try {
    const hwHist = await API.request('/api/student/homework/history');
    const history = hwHist.history || [];
    document.getElementById('hw-progress-card').innerHTML = `
      <h3 style="font-size:0.9rem; margin-bottom:12px; color:var(--text-muted);">📝 宿題履歴</h3>
      ${history.length === 0
        ? '<div style="color:var(--text-muted); font-size:0.85rem;">まだ提出した宿題はありません</div>'
        : history.map(h => {
            const date = new Date(h.created_at).toLocaleDateString('ja-JP', {month:'short', day:'numeric'});
            const scoreColor = h.score >= 80 ? 'var(--success)' : h.score >= 60 ? 'var(--warning)' : 'var(--danger)';
            return `<div style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border);">
              <div>
                <div style="font-weight:600; font-size:0.9rem;">${escapeHtml(h.topic || '日常会話')}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${date} · ${h.level}</div>
              </div>
              <div style="font-size:1.3rem; font-weight:800; color:${scoreColor};">${h.score}点</div>
            </div>`;
          }).join('')}
    `;
  } catch { /* ignore */ }
}

function renderSettingsTab(container) {
  const user = (typeof Auth !== 'undefined') ? Auth.getUser() : null;
  const lang = I18n.getCurrentLang();
  const langs = [
    { code: 'ja', label: '🇯🇵 日本語' },
    { code: 'en', label: '🇺🇸 English' },
    { code: 'pt', label: '🇧🇷 Português' }
  ];

  container.innerHTML = `
    <h2 style="font-size:1.1rem; margin-bottom:20px;">${I18n.t('settings')}</h2>

    ${user ? `
    <div class="settings-card">
      <div class="settings-avatar">${escapeHtml(user.name ? user.name[0].toUpperCase() : '?')}</div>
      <div class="settings-user-info">
        <div class="settings-username">${escapeHtml(user.name || '')}</div>
        <div class="settings-email">${escapeHtml(user.email || '')}</div>
      </div>
    </div>` : ''}

    <div class="settings-section">
      <div class="settings-label">🌐 ${I18n.t('select_language') || '言語'}</div>
      <div class="settings-lang-btns">
        ${langs.map(l => `
          <button class="settings-lang-btn ${l.code === lang ? 'active' : ''}"
            onclick="selectLang('${l.code}'); renderSettingsTab(document.getElementById('tab-content'))">
            ${l.label}
          </button>`).join('')}
      </div>
    </div>

    <div class="settings-section">
      <button class="btn btn-danger settings-logout-btn" onclick="confirmLogout()">
        🚪 ${I18n.t('logout')}
      </button>
    </div>
  `;
}

function confirmLogout() {
  const lang = I18n.getCurrentLang();
  const msg = lang === 'pt' ? 'Deseja sair?' : lang === 'en' ? 'Log out?' : 'ログアウトしますか？';
  if (confirm(msg) && typeof Auth !== 'undefined') Auth.logout();
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
