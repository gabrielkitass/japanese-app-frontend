const I18n = (() => {
  let currentLang = 'ja';
  let translations = {};

  async function load(lang) {
    const response = await fetch(`./locales/${lang}.json`);
    translations = await response.json();
    currentLang = lang;
    localStorage.setItem('preferred_lang', lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (translations[key]) el.textContent = translations[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (translations[key]) el.placeholder = translations[key];
    });
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
  }

  function t(key) { return translations[key] || key; }
  function getCurrentLang() { return currentLang; }

  async function init() {
    const saved = localStorage.getItem('preferred_lang');
    const browserLang = navigator.language.startsWith('pt') ? 'pt'
                      : navigator.language.startsWith('en') ? 'en' : 'ja';
    await load(saved || browserLang);
  }

  return { init, load, t, getCurrentLang };
})();
