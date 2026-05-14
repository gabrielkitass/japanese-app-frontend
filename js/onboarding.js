const Onboarding = (() => {
  const STORAGE_KEY = 'nihongo_onboarding_done';
  const NAME_KEY = 'nihongo_student_name';

  function isComplete() {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }

  function show() {
    if (isComplete()) return;
    const overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.innerHTML = `
      <div class="onboarding-container">
        <!-- 画面1: 言語選択 + 感情フック -->
        <div class="ob-screen" id="ob-screen-1">
          <div class="ob-emoji">🎌</div>
          <h1 class="ob-title">Bem-vindo ao<br><strong>にほんごアプリ</strong>!</h1>
          <p class="ob-subtitle">O app que vai te ajudar a aprender japonês todo dia 🌟</p>
          <div class="ob-lang-buttons">
            <button class="ob-lang-btn active" data-lang="pt" onclick="Onboarding.setLang('pt', this)">🇧🇷 Português</button>
            <button class="ob-lang-btn" data-lang="en" onclick="Onboarding.setLang('en', this)">🇺🇸 English</button>
            <button class="ob-lang-btn" data-lang="ja" onclick="Onboarding.setLang('ja', this)">🇯🇵 日本語</button>
          </div>
          <button class="ob-next-btn" onclick="Onboarding.goTo(2)">Vamos começar! →</button>
        </div>

        <!-- 画面2: 名前入力 -->
        <div class="ob-screen" id="ob-screen-2" hidden>
          <div class="ob-emoji">😊</div>
          <h1 class="ob-title">Qual é o seu nome?</h1>
          <p class="ob-subtitle">Vamos personalizar sua experiência</p>
          <input type="text" id="ob-name-input" class="ob-input" placeholder="Ex: Maria" maxlength="30">
          <div id="ob-name-error" class="ob-error" hidden>Por favor, insira seu nome</div>
          <button class="ob-next-btn" onclick="Onboarding.submitName()">Continuar →</button>
        </div>

        <!-- 画面3: 最初のカード体験（必ずXP獲得） -->
        <div class="ob-screen" id="ob-screen-3" hidden>
          <div class="ob-xp-badge">+10 XP</div>
          <h1 class="ob-title" id="ob-name-greeting">Olá!</h1>
          <p class="ob-subtitle">Vamos aprender sua primeira palavra em japonês!</p>
          <div class="ob-first-card">
            <div class="ob-card-front">
              <div class="ob-japanese">ありがとう</div>
              <div class="ob-reading">arigatou</div>
            </div>
            <div class="ob-card-back" hidden>
              <div class="ob-meaning">Obrigado(a)</div>
              <div class="ob-example">ありがとうございます！</div>
              <div class="ob-example-pt">Muito obrigado(a)!</div>
            </div>
          </div>
          <button class="ob-flip-btn" id="ob-flip-btn" onclick="Onboarding.flipCard()">Toque para ver →</button>
          <button class="ob-finish-btn" id="ob-finish-btn" hidden onclick="Onboarding.finish()">
            Entendi! Vamos começar! 🎉
          </button>
        </div>
      </div>
    `;

    // スタイル
    const style = document.createElement('style');
    style.textContent = `
      #onboarding-overlay {
        position: fixed; inset: 0; background: linear-gradient(135deg, #4A90D9 0%, #2C5F8A 100%);
        z-index: 9999; display: flex; align-items: center; justify-content: center;
        padding: 20px;
      }
      .onboarding-container { width: 100%; max-width: 420px; text-align: center; }
      .ob-screen { color: white; }
      .ob-emoji { font-size: 3.5rem; margin-bottom: 16px; }
      .ob-title { font-size: 1.6rem; font-weight: 800; margin-bottom: 8px; line-height: 1.3; }
      .ob-subtitle { font-size: 1rem; opacity: 0.85; margin-bottom: 28px; }
      .ob-lang-buttons { display: flex; gap: 8px; justify-content: center; margin-bottom: 24px; flex-wrap: wrap; }
      .ob-lang-btn { padding: 10px 18px; border: 2px solid rgba(255,255,255,0.4); border-radius: 24px;
                     background: rgba(255,255,255,0.15); color: white; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; }
      .ob-lang-btn.active { background: white; color: #4A90D9; border-color: white; font-weight: 700; }
      .ob-next-btn, .ob-finish-btn { width: 100%; padding: 16px; border-radius: 12px; border: none;
                      background: white; color: #4A90D9; font-size: 1.1rem; font-weight: 700;
                      cursor: pointer; margin-top: 8px; transition: transform 0.1s; }
      .ob-next-btn:active, .ob-finish-btn:active { transform: scale(0.98); }
      .ob-input { width: 100%; padding: 14px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.4);
                  background: rgba(255,255,255,0.15); color: white; font-size: 1.1rem; text-align: center;
                  margin-bottom: 8px; box-sizing: border-box; }
      .ob-input::placeholder { color: rgba(255,255,255,0.6); }
      .ob-error { color: #FFD700; font-size: 0.85rem; margin-bottom: 8px; }
      .ob-xp-badge { display: inline-block; background: #FFD700; color: #333; font-weight: 800;
                     padding: 6px 16px; border-radius: 20px; font-size: 1rem; margin-bottom: 12px; }
      .ob-first-card { background: white; border-radius: 16px; padding: 28px 20px; margin: 20px 0;
                       box-shadow: 0 8px 32px rgba(0,0,0,0.15); cursor: pointer; min-height: 120px;
                       display: flex; flex-direction: column; align-items: center; justify-content: center; }
      .ob-japanese { font-size: 2.2rem; font-weight: 800; color: #1a1a1a; margin-bottom: 6px; }
      .ob-reading { font-size: 1rem; color: #666; }
      .ob-meaning { font-size: 1.5rem; font-weight: 700; color: #4A90D9; margin-bottom: 8px; }
      .ob-example { font-size: 0.95rem; color: #333; margin-bottom: 4px; }
      .ob-example-pt { font-size: 0.9rem; color: #666; }
      .ob-flip-btn { width: 100%; padding: 14px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.6);
                     background: transparent; color: white; font-size: 1rem; cursor: pointer; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(overlay);
  }

  let selectedLang = 'pt';

  function setLang(lang, btn) {
    selectedLang = lang;
    document.querySelectorAll('.ob-lang-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (window.I18n) I18n.load(lang);
  }

  function goTo(screen) {
    document.querySelectorAll('.ob-screen').forEach(s => s.hidden = true);
    document.getElementById(`ob-screen-${screen}`).hidden = false;
    if (screen === 2) {
      setTimeout(() => document.getElementById('ob-name-input').focus(), 100);
    }
  }

  function submitName() {
    const name = document.getElementById('ob-name-input').value.trim();
    const errEl = document.getElementById('ob-name-error');
    if (!name) { errEl.hidden = false; return; }
    errEl.hidden = true;
    localStorage.setItem(NAME_KEY, name);
    document.getElementById('ob-name-greeting').textContent = `Olá, ${name}! 👋`;
    goTo(3);
  }

  function flipCard() {
    document.querySelector('.ob-card-front').hidden = true;
    document.querySelector('.ob-card-back').hidden = false;
    document.getElementById('ob-flip-btn').hidden = true;
    document.getElementById('ob-finish-btn').hidden = false;
    // XPバッジをアニメーション
    const badge = document.querySelector('.ob-xp-badge');
    badge.style.transform = 'scale(1.3)';
    setTimeout(() => { badge.style.transform = 'scale(1)'; badge.style.transition = 'transform 0.3s'; }, 300);
  }

  function finish() {
    localStorage.setItem(STORAGE_KEY, 'true');
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) overlay.remove();
    // 名前をUIに反映
    const name = localStorage.getItem(NAME_KEY);
    const nameEl = document.getElementById('student-name');
    if (nameEl && name) nameEl.textContent = name;
  }

  return { show, setLang, goTo, submitName, flipCard, finish, isComplete,
           getName: () => localStorage.getItem(NAME_KEY) };
})();
