const Auth = (() => {
  const TOKEN_KEY = 'auth_token';
  const USER_KEY = 'auth_user';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  }
  function isLoggedIn() { return !!getToken(); }

  async function authFetch(path, body) {
    const res = await fetch(CONFIG.API_BASE_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    let data;
    try { data = await res.json(); }
    catch { throw new Error('サーバーが起動中です。10秒後に再試行してください。'); }
    if (!res.ok) throw new Error(data.error || 'エラーが発生しました');
    return data;
  }

  async function login(email, password) {
    const data = await authFetch('/api/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    API.setToken(data.token);
    return data.user;
  }

  async function register(name, email, password) {
    const data = await authFetch('/api/auth/register', { name, email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    API.setToken(data.token);
    return data.user;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = 'login.html';
  }

  function requireAuth(role) {
    const user = getUser();
    if (!user || !getToken()) {
      window.location.href = 'login.html';
      return null;
    }
    if (role && user.role !== role) {
      window.location.href = user.role === 'teacher' ? 'teacher.html' : 'student.html';
      return null;
    }
    API.setToken(getToken());
    return user;
  }

  return { getToken, getUser, isLoggedIn, login, register, logout, requireAuth };
})();
