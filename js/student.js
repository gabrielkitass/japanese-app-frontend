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
  if (tab === 'homework') renderHomeworkTab(content);
  else if (tab === 'flashcard') renderFlashcardTab(content);
  else if (tab === 'chat') renderChatTab(content);
  else if (tab === 'progress') renderProgressTab(content);
}

// フラッシュカードデータ（ブラジル人向け日常語彙）
const FLASHCARDS = [
  { ja: '野菜', reading: 'やさい', pt: 'Verdura / Legume', en: 'Vegetable' },
  { ja: '値段', reading: 'ねだん', pt: 'Preço', en: 'Price' },
  { ja: '電車', reading: 'でんしゃ', pt: 'Trem / Metrô', en: 'Train' },
  { ja: '駅', reading: 'えき', pt: 'Estação', en: 'Station' },
  { ja: '病院', reading: 'びょういん', pt: 'Hospital', en: 'Hospital' },
  { ja: '薬', reading: 'くすり', pt: 'Remédio', en: 'Medicine' },
  { ja: '仕事', reading: 'しごと', pt: 'Trabalho', en: 'Work' },
  { ja: '休み', reading: 'やすみ', pt: 'Descanso / Folga', en: 'Day off' },
  { ja: '学校', reading: 'がっこう', pt: 'Escola', en: 'School' },
  { ja: '友達', reading: 'ともだち', pt: 'Amigo(a)', en: 'Friend' },
  { ja: '家族', reading: 'かぞく', pt: 'Família', en: 'Family' },
  { ja: '食べ物', reading: 'たべもの', pt: 'Comida', en: 'Food' },
];

let fcIndex = 0;
let fcFlipped = false;
let fcCorrect = 0;
let fcTotal = 0;

function renderFlashcardTab(container) {
  fcIndex = 0; fcFlipped = false; fcCorrect = 0; fcTotal = 0;
  const shuffled = [...FLASHCARDS].sort(() => Math.random() - 0.5);
  window._fcCards = shuffled;
  renderFC(container);
}

function renderFC(container) {
  const card = window._fcCards[fcIndex];
  const lang = I18n.getCurrentLang();
  const translation = lang === 'pt' ? card.pt : lang === 'en' ? card.en : card.reading;

  container.innerHTML = `
    <div style="text-align:center; padding:16px 0;">
      <div style="color:var(--text-muted); font-size:0.85rem; margin-bottom:16px;">
        ${fcIndex + 1} / ${window._fcCards.length}
        &nbsp;|&nbsp; ✅ ${fcCorrect} 正解
      </div>
      <div class="progress-bar" style="margin-bottom:24px;">
        <div class="progress-fill" style="width:${((fcIndex) / window._fcCards.length) * 100}%"></div>
      </div>
      <div id="fc-card" onclick="flipCard(this)"
        style="background:var(--card); border:2px solid var(--border); border-radius:20px;
               padding:40px 24px; cursor:pointer; min-height:200px; display:flex;
               flex-direction:column; align-items:center; justify-content:center; gap:12px;
               box-shadow:var(--shadow); transition:all 0.3s; margin-bottom:24px;">
        <div style="font-size:3rem; font-weight:800; color:var(--primary);">
          <ruby>${card.ja}<rt>${card.reading}</rt></ruby>
        </div>
        <button class="tts-btn" style="font-size:1.5rem;" onclick="event.stopPropagation(); TTS.speakJapanese('${card.ja}', this)">🔊</button>
        <div id="fc-translation" style="display:none; font-size:1.3rem; color:var(--text); margin-top:8px;">${translation}</div>
        <div style="color:var(--text-muted); font-size:0.8rem; margin-top:8px;">タップで答えを見る</div>
      </div>
      <div id="fc-actions" style="display:none; display:flex; gap:12px; justify-content:center;">
        <button class="btn" style="background:#fdecea; color:var(--danger); flex:1;" onclick="fcAnswer(false)">
          ❌ わからない
        </button>
        <button class="btn" style="background:#e8f5e9; color:var(--success); flex:1;" onclick="fcAnswer(true)">
          ✅ わかった！
        </button>
      </div>
    </div>
  `;
}

function flipCard(el) {
  if (fcFlipped) return;
  fcFlipped = true;
  document.getElementById('fc-translation').style.display = 'block';
  el.querySelector('div:last-child').style.display = 'none';
  document.getElementById('fc-actions').style.display = 'flex';
  el.style.borderColor = 'var(--primary)';
}

function fcAnswer(correct) {
  fcTotal++;
  if (correct) { fcCorrect++; addXP(5); }
  fcFlipped = false;
  fcIndex++;
  const container = document.getElementById('tab-content');
  if (fcIndex >= window._fcCards.length) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px 20px;">
        <div style="font-size:3rem; margin-bottom:16px;">${fcCorrect >= window._fcCards.length * 0.8 ? '🎉' : '💪'}</div>
        <h2 style="margin-bottom:8px;">${fcCorrect} / ${window._fcCards.length} 正解</h2>
        <p style="color:var(--text-muted); margin-bottom:24px;">+${fcCorrect * 5} XP 獲得！</p>
        <button class="btn btn-primary" onclick="renderFlashcardTab(document.getElementById('tab-content'))">
          もう一度
        </button>
      </div>`;
  } else {
    renderFC(container);
  }
}

function renderHomeworkTab(container) {
  container.innerHTML = `
    <h2 style="font-size:1.1rem; margin-bottom:16px;" data-i18n="todays_homework">${I18n.t('todays_homework')}</h2>
    <div id="hw-list">
      <div class="homework-card">
        <h3>📝 ${I18n.t('vocabulary')}: スーパーで買い物</h3>
        <div class="question-block">
          <div class="question-text">
            1. 「<ruby>野菜<rt>やさい</rt></ruby>」 はポルトガル語で？
            <button class="tts-btn" onclick="TTS.speakJapanese('<ruby>野菜<rt>やさい</rt></ruby>')">🔊</button>
          </div>
          <div class="options-list">
            <button class="option-btn" onclick="answerQuestion(this, false)">🍖 Carne</button>
            <button class="option-btn" onclick="answerQuestion(this, true)">🥦 Verdura / Legume</button>
            <button class="option-btn" onclick="answerQuestion(this, false)">🐟 Peixe</button>
          </div>
        </div>
        <div class="question-block">
          <div class="question-text">
            2. 「<ruby>値段<rt>ねだん</rt></ruby>」 の意味は？
            <button class="tts-btn" onclick="TTS.speakJapanese('<ruby>値段<rt>ねだん</rt></ruby>')">🔊</button>
          </div>
          <div class="options-list">
            <button class="option-btn" onclick="answerQuestion(this, false)">Quantidade</button>
            <button class="option-btn" onclick="answerQuestion(this, false)">Qualidade</button>
            <button class="option-btn" onclick="answerQuestion(this, true)">Preço</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function answerQuestion(btn, isCorrect) {
  const options = btn.closest('.options-list').querySelectorAll('.option-btn');
  options.forEach(b => b.disabled = true);
  btn.classList.add(isCorrect ? 'correct' : 'incorrect');
  if (isCorrect) {
    addXP(10);
  } else {
    options.forEach(b => { if (b.dataset.correct) b.classList.add('correct'); });
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

function renderProgressTab(container) {
  const percent = Math.min(100, Math.floor(xp / 5));
  container.innerHTML = `
    <h2 style="font-size:1.1rem; margin-bottom:20px;" data-i18n="progress">${I18n.t('progress')}</h2>
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span>${I18n.t('level')} ${Math.floor(xp / 100) + 1}</span>
        <span class="xp-badge">⭐ ${xp} XP</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${xp % 100}%"></div>
      </div>
      <small style="color:var(--text-muted)">${100 - (xp % 100)} XP → 次のレベル</small>
    </div>
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <span style="font-size:2rem;">🔥</span>
        <div>
          <div style="font-size:1.5rem; font-weight:700;">${streak} <span data-i18n="days">${I18n.t('days')}</span></div>
          <div style="color:var(--text-muted); font-size:0.85rem;">${I18n.t('streak')}</div>
        </div>
      </div>
    </div>
    <div class="card">
      <h3 style="font-size:0.95rem; margin-bottom:12px; color:var(--text-muted);">今週の学習</h3>
      <div style="display:flex; gap:8px;">
        ${['月','火','水','木','金','土','日'].map((d, i) => `
          <div style="flex:1; text-align:center;">
            <div style="width:100%; height:40px; background:${i < 4 ? 'var(--primary)' : 'var(--border)'}; border-radius:4px; opacity:${i < 4 ? '1' : '0.3'}"></div>
            <div style="font-size:0.7rem; margin-top:4px; color:var(--text-muted)">${d}</div>
          </div>`).join('')}
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
