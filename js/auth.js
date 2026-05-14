const Auth = (() => {
  const TOKEN_KEY = 'auth_token';
  const USER_KEY = 'auth_user';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  }
  function isLoggedIn() { return !!getToken(); }

  async function login(email, password) {
    const res = await fetch(CONFIG.API_BASE_URL + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'ログイン失敗');
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    API.setToken(data.token);
    return data.user;
  }

  async function register(name, email, password) {
    const res = await fetch(CONFIG.API_BASE_URL + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '登録失敗');
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    API.setToken(data.token);
    return data.user;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/login.html';
  }

  function requireAuth(role) {
    const user = getUser();
    if (!user || !getToken()) {
      window.location.href = '/login.html';
      return null;
    }
    if (role && user.role !== role) {
      window.location.href = user.role === 'teacher' ? '/teacher.html' : '/student.html';
      return null;
    }
    API.setToken(getToken());
    return user;
  }

  return { getToken, getUser, isLoggedIn, login, register, logout, requireAuth };
})();
