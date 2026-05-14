const TTS = (() => {
  const LANG_MAP = { ja: 'ja-JP', en: 'en-US', pt: 'pt-BR' };

  function getVoices() {
    return new Promise(resolve => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) return resolve(voices);
      const handler = () => resolve(speechSynthesis.getVoices());
      speechSynthesis.addEventListener('voiceschanged', handler, { once: true });
      setTimeout(() => resolve(speechSynthesis.getVoices()), 1000);
    });
  }

  async function speak(text, lang, btnEl) {
    if (!('speechSynthesis' in window)) {
      if (btnEl) { btnEl.textContent = '❌'; setTimeout(() => btnEl.textContent = '🔊', 1500); }
      return;
    }

    if (btnEl) { btnEl.textContent = '⏳'; btnEl.disabled = true; }
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_MAP[lang || (typeof I18n !== 'undefined' ? I18n.getCurrentLang() : 'ja')] || 'ja-JP';
    utterance.rate = 0.85;
    utterance.volume = 1.0;

    const voices = await getVoices();
    const voice = voices.find(v => v.lang === utterance.lang)
               || voices.find(v => v.lang.startsWith(utterance.lang.split('-')[0]));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => { if (btnEl) btnEl.textContent = '🔈'; };
    utterance.onend = () => { if (btnEl) { btnEl.textContent = '🔊'; btnEl.disabled = false; } };
    utterance.onerror = (e) => {
      console.warn('TTS error:', e.error);
      if (btnEl) { btnEl.textContent = '🔊'; btnEl.disabled = false; }
    };

    speechSynthesis.speak(utterance);
  }

  function speakJapanese(htmlText, btnEl) {
    const plain = htmlText.replace(/<rt>[^<]*<\/rt>/g, '').replace(/<[^>]+>/g, '');
    speak(plain, 'ja', btnEl);
  }

  function stop() { speechSynthesis.cancel(); }

  return { speak, speakJapanese, stop, LANG_MAP };
})();
