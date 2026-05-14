const API = (() => {
  function getToken() { return sessionStorage.getItem('auth_token'); }
  function setToken(t) { sessionStorage.setItem('auth_token', t); }
  function getStudentId() { return localStorage.getItem('student_id'); }
  function setStudentId(id) { localStorage.setItem('student_id', id); }

  async function request(endpoint, options = {}) {
    const url = CONFIG.API_BASE_URL + endpoint;
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (getToken()) headers['Authorization'] = `Bearer ${getToken()}`;
    const response = await fetch(url, { ...options, headers });
    if (response.status === 429) throw new Error(I18n.t('rate_limit_error'));
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `${I18n.t('error_generic')} (${response.status})`);
    }
    return response.json();
  }

  const sendChatMessage = (studentId, message, history = []) =>
    request(CONFIG.ENDPOINTS.CHAT, {
      method: 'POST',
      body: JSON.stringify({ studentId, message, history })
    });

  const generateHomework = (topic, level = 'beginner') =>
    request(CONFIG.ENDPOINTS.GENERATE_HOMEWORK, {
      method: 'POST',
      body: JSON.stringify({ topic, level })
    });

  const getProgress = (studentId) =>
    request(`${CONFIG.ENDPOINTS.PROGRESS_GET}/${studentId}`);

  const saveProgress = (studentId, lessonId, score, details = {}) =>
    request(CONFIG.ENDPOINTS.PROGRESS_POST, {
      method: 'POST',
      body: JSON.stringify({ studentId, lessonId, score, details })
    });

  return { setToken, getToken, setStudentId, getStudentId, sendChatMessage, generateHomework, getProgress, saveProgress };
})();
