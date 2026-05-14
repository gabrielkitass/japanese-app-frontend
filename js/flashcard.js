const Flashcard = (() => {
  let cards = [], currentIndex = 0, correctCount = 0;
  let startTime = 0;

  async function init() {
    await loadCategories();
    document.getElementById('fc-level').addEventListener('change', loadCategories);
    document.getElementById('fc-card').addEventListener('click', flip);
    document.getElementById('fc-wrong').addEventListener('click', () => answer(false));
    document.getElementById('fc-correct').addEventListener('click', () => answer(true));
    document.getElementById('fc-start').addEventListener('click', loadCards);
  }

  async function loadCategories() {
    const level = document.getElementById('fc-level').value;
    const data = await API.request(`/api/flashcards/categories?level=${level}`);
    const select = document.getElementById('fc-category');
    select.innerHTML = '<option value="">すべて</option>';
    (data.categories || []).forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.name;
      opt.textContent = `${cat.name} (${cat.learned}/${cat.total})`;
      select.appendChild(opt);
    });
  }

  async function loadCards() {
    const level = document.getElementById('fc-level').value;
    const category = document.getElementById('fc-category').value;
    const mode = document.getElementById('fc-mode').value;
    const data = await API.request(
      `/api/flashcards?level=${level}&category=${encodeURIComponent(category)}&mode=${mode}`
    );
    cards = data.cards || [];
    currentIndex = 0;
    correctCount = 0;
    document.getElementById('fc-session').hidden = false;
    document.getElementById('fc-setup').hidden = true;
    showCard();
  }

  function showCard() {
    if (currentIndex >= cards.length) return showResults();
    const card = cards[currentIndex];
    const lang = I18n.getCurrentLang ? I18n.getCurrentLang() : 'pt';
    document.getElementById('fc-japanese').textContent = card.japanese;
    document.getElementById('fc-reading').textContent = card.reading;
    document.getElementById('fc-meaning').textContent =
      lang === 'pt' ? card.meaning_pt : card.meaning_en;
    document.getElementById('fc-example').textContent =
      card.example_sentence || '';

    document.querySelector('.fc-back').hidden = true;
    document.querySelector('.fc-front').hidden = false;
    document.getElementById('fc-actions').hidden = true;
    updateProgress();
    startTime = Date.now();
  }

  function flip() {
    if (document.querySelector('.fc-back').hidden) {
      document.querySelector('.fc-front').hidden = true;
      document.querySelector('.fc-back').hidden = false;
      document.getElementById('fc-actions').hidden = false;
    }
  }

  async function answer(isCorrect) {
    const card = cards[currentIndex];
    const responseTimeMs = Date.now() - startTime;
    if (isCorrect) correctCount++;
    try {
      await API.request('/api/flashcards/result', {
        method: 'POST',
        body: JSON.stringify({ cardId: card.id, correct: isCorrect, responseTimeMs })
      });
    } catch (e) {
      console.error('Failed to save result:', e);
    }
    currentIndex++;
    showCard();
  }

  function updateProgress() {
    document.getElementById('fc-count').textContent = `${currentIndex + 1} / ${cards.length}`;
    const pct = cards.length ? ((currentIndex) / cards.length * 100) : 0;
    document.getElementById('fc-bar').style.width = `${pct}%`;
  }

  function showResults() {
    const pct = cards.length ? Math.round(correctCount / cards.length * 100) : 0;
    document.getElementById('fc-session').hidden = true;
    document.getElementById('fc-results').hidden = false;
    document.getElementById('fc-result-score').textContent = `${pct}%`;
    document.getElementById('fc-result-detail').textContent =
      `${correctCount} / ${cards.length}`;
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tab-flashcard')) Flashcard.init();
});
