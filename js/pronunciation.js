const Pronunciation = (() => {
  let recognition = null;
  let currentWord = null;
  let retryCount = 0;
  let isRecording = false;

  function isSupported() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  function init(word, reading) {
    currentWord = { japanese: word, reading };
    retryCount = 0;
    show();
  }

  function show() {
    const modal = document.createElement('div');
    modal.id = 'pronunciation-modal';
    modal.innerHTML = `
      <div class="pron-overlay" onclick="Pronunciation.close()"></div>
      <div class="pron-box">
        <button class="pron-close" onclick="Pronunciation.close()">✕</button>
        <div class="pron-word" id="pron-word">${currentWord.japanese}</div>
        <div class="pron-reading" id="pron-reading">${currentWord.reading}</div>
        <button class="pron-tts-btn" onclick="Pronunciation.playAudio()">🔊 Ouvir pronúncia</button>

        <div id="pron-idle">
          <p class="pron-instruction">Toque no microfone e fale a palavra</p>
          ${!isSupported() ? '<p class="pron-warn">⚠️ Seu navegador não suporta reconhecimento de voz</p>' : ''}
          <button class="pron-mic-btn" onclick="Pronunciation.startRecording()" ${!isSupported() ? 'disabled' : ''}>
            🎤
          </button>
        </div>

        <div id="pron-recording" hidden>
          <div class="pron-wave">🎙️ Ouvindo...</div>
          <div class="pron-hint">Fale agora</div>
        </div>

        <div id="pron-result" hidden>
          <div id="pron-feedback-text" class="pron-feedback"></div>
          <div id="pron-tip-text" class="pron-tip"></div>
          <div id="pron-encourage-text" class="pron-encourage"></div>
          <div class="pron-actions">
            <button class="btn btn-ghost" onclick="Pronunciation.retry()">🔄 Tentar novamente</button>
            <button class="btn btn-primary" onclick="Pronunciation.close()">✓ Entendi</button>
          </div>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.id = 'pron-style';
    style.textContent = `
      #pronunciation-modal { position: fixed; inset: 0; z-index: 8888; display: flex; align-items: flex-end; }
      .pron-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
      .pron-box { position: relative; background: white; border-radius: 24px 24px 0 0; padding: 32px 24px 40px;
                  width: 100%; max-width: 480px; margin: 0 auto; text-align: center; }
      .pron-close { position: absolute; top: 16px; right: 16px; background: none; border: none;
                    font-size: 1.2rem; cursor: pointer; color: #999; }
      .pron-word { font-size: 2.5rem; font-weight: 800; margin-bottom: 4px; }
      .pron-reading { font-size: 1rem; color: #666; margin-bottom: 16px; }
      .pron-tts-btn { background: #f0f4ff; border: none; border-radius: 8px; padding: 8px 16px;
                      cursor: pointer; font-size: 0.9rem; color: #4A90D9; margin-bottom: 20px; }
      .pron-instruction { color: #555; margin-bottom: 16px; }
      .pron-mic-btn { width: 80px; height: 80px; border-radius: 50%; border: none; font-size: 2rem;
                      background: #4A90D9; cursor: pointer; box-shadow: 0 4px 16px rgba(74,144,217,0.4);
                      transition: transform 0.1s; }
      .pron-mic-btn:active { transform: scale(0.95); }
      .pron-mic-btn:disabled { background: #ccc; box-shadow: none; cursor: not-allowed; }
      .pron-wave { font-size: 2rem; animation: pulse 1s infinite; margin-bottom: 8px; }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      .pron-hint { color: #4A90D9; font-weight: 600; }
      .pron-feedback { font-size: 1rem; color: #27AE60; font-weight: 600; margin: 12px 0 8px; }
      .pron-tip { font-size: 0.9rem; color: #555; margin-bottom: 8px; font-style: italic; }
      .pron-encourage { font-size: 1.1rem; margin-bottom: 16px; }
      .pron-actions { display: flex; gap: 8px; justify-content: center; }
      .pron-warn { color: #E74C3C; font-size: 0.85rem; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);
  }

  function playAudio() {
    if (window.TTS) TTS.speak(currentWord.japanese, 'ja');
  }

  function startRecording() {
    if (isRecording) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    document.getElementById('pron-idle').hidden = true;
    document.getElementById('pron-recording').hidden = false;
    isRecording = true;

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      isRecording = false;
      await sendForJudgment(transcript);
    };

    recognition.onerror = () => {
      isRecording = false;
      document.getElementById('pron-idle').hidden = false;
      document.getElementById('pron-recording').hidden = true;
    };

    recognition.onend = () => { isRecording = false; };
    recognition.start();
  }

  async function sendForJudgment(transcript) {
    document.getElementById('pron-recording').hidden = true;
    try {
      const result = await API.request('/api/pronunciation', {
        method: 'POST',
        body: JSON.stringify({
          japanese: currentWord.japanese,
          userTranscript: transcript,
          targetReading: currentWord.reading
        })
      });
      showResult(result);
    } catch {
      showResult({
        feedback: '接続エラー。もう一度試してください。',
        tip: '',
        encouragement: retryCount < 3 ? 'もう一度！' : 'ゆっくり練習しよう',
        success: false
      });
    }
  }

  function showResult(result) {
    document.getElementById('pron-feedback-text').textContent = result.feedback || '';
    document.getElementById('pron-tip-text').textContent = result.tip || '';
    document.getElementById('pron-encourage-text').textContent = result.encouragement || '';
    document.getElementById('pron-result').hidden = false;
    retryCount++;
  }

  function retry() {
    document.getElementById('pron-result').hidden = true;
    document.getElementById('pron-idle').hidden = false;
    // 5回目以降はスロー再生のヒントを表示
    if (retryCount >= 5) {
      const hint = document.querySelector('.pron-instruction');
      if (hint) hint.textContent = '💡 Dica: Ouça o áudio lentamente e repita sílaba por sílaba';
    }
  }

  function close() {
    const modal = document.getElementById('pronunciation-modal');
    const style = document.getElementById('pron-style');
    if (modal) modal.remove();
    if (style) style.remove();
    if (recognition) { try { recognition.abort(); } catch (e) {} }
    isRecording = false;
    currentWord = null;
    retryCount = 0;
  }

  return { init, close, retry, startRecording, playAudio, isSupported };
})();
