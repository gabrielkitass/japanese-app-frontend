const TTS = (() => {
  const LANG_MAP = { ja: 'ja-JP', en: 'en-US', pt: 'pt-BR' };

  function speak(text, lang) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_MAP[lang || I18n.getCurrentLang()] || 'ja-JP';
    utterance.rate = 0.85;
    const trySpeak = () => {
      const voices = speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang === utterance.lang)
                 || voices.find(v => v.lang.startsWith(utterance.lang.split('-')[0]));
      if (voice) utterance.voice = voice;
      speechSynthesis.speak(utterance);
    };
    if (speechSynthesis.getVoices().length === 0) {
      speechSynthesis.addEventListener('voiceschanged', trySpeak, { once: true });
    } else {
      trySpeak();
    }
  }

  function speakJapanese(htmlText) {
    const plain = htmlText.replace(/<rt>[^<]*<\/rt>/g, '').replace(/<[^>]+>/g, '');
    speak(plain, 'ja');
  }

  function stop() { speechSynthesis.cancel(); }

  return { speak, speakJapanese, stop, LANG_MAP };
})();
