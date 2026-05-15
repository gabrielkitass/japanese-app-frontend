(() => {
  const user = Auth.requireAuth('teacher');
  if (!user) return;
  document.getElementById('admin-name').textContent = user.name;

  function showToast(msg, isError = false) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = isError ? 'error' : '';
    void el.offsetWidth;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2800);
  }

  function fmtYen(n) {
    return '¥' + Number(n).toLocaleString('ja-JP');
  }

  function trialDaysLeft(trialEndsAt) {
    if (!trialEndsAt) return null;
    const diff = new Date(trialEndsAt) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function statusBadge(status) {
    const map = {
      trial:     ['status-trial',     '🔵 トライアル'],
      active:    ['status-active',    '🟢 契約中'],
      cancelled: ['status-cancelled', '🔴 解約'],
      suspended: ['status-suspended', '⚫ 停止中'],
    };
    const [cls, label] = map[status] || ['status-suspended', status];
    return `<span class="status-badge ${cls}">${label}</span>`;
  }

  function trialCell(teacher) {
    const days = trialDaysLeft(teacher.trial_ends_at);
    if (days === null) return '<span style="color:#475569">—</span>';
    let cls = days > 14 ? 'ok' : days > 7 ? 'warning' : 'urgent';
    if (days < 0) return `<span class="trial-days urgent">終了 (${Math.abs(days)}日前)</span>`;
    return `<span class="trial-days ${cls}">${days}日</span>`;
  }

  function renderTeachersTable(teachers) {
    const tbody = document.getElementById('teachers-tbody');
    if (!teachers.length) {
      tbody.innerHTML = '<tr class="loading-row"><td colspan="6">先生がいません</td></tr>';
      return;
    }
    tbody.innerHTML = teachers.map(t => {
      const isSuspended = t.subscription_status === 'suspended' || t.subscription_status === 'cancelled';
      return `
        <tr>
          <td>
            <div class="teacher-name">${escapeHtml(t.name)}</div>
            <div class="teacher-email">${escapeHtml(t.email)}</div>
          </td>
          <td>${t.student_count}</td>
          <td>${statusBadge(t.subscription_status || 'trial')}</td>
          <td>${trialCell(t)}</td>
          <td style="color:#64748b; font-size:0.8rem;">${new Date(t.created_at).toLocaleDateString('ja-JP')}</td>
          <td>
            <div class="action-btns">
              <button class="btn-xs btn-extend" onclick="extendTrial('${t.id}', '${escapeHtml(t.name)}')">+30日</button>
              ${isSuspended
                ? `<button class="btn-xs btn-activate" onclick="setStatus('${t.id}', 'active', '${escapeHtml(t.name)}')">有効化</button>`
                : `<button class="btn-xs btn-suspend" onclick="setStatus('${t.id}', 'suspended', '${escapeHtml(t.name)}')">停止</button>`
              }
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  async function loadStats() {
    try {
      const data = await API.request('/api/admin/stats');
      if (data.error) { showToast('権限なし: ' + data.error, true); return; }
      document.getElementById('st-teachers').textContent = data.teachers;
      document.getElementById('st-students').textContent = data.students;
      document.getElementById('st-revenue').textContent = fmtYen(data.revenue_jpy);
      document.getElementById('st-cost').textContent = fmtYen(data.estimated_cost_jpy);
      document.getElementById('st-tokens').textContent = Number(data.tokens_month).toLocaleString() + ' トークン';
      const profitEl = document.getElementById('st-profit');
      profitEl.textContent = fmtYen(data.profit_jpy);
      profitEl.closest('.stat-card').className = 'stat-card ' + (data.profit_jpy >= 0 ? 'green' : 'red');
      document.getElementById('st-today').textContent = Number(data.tokens_today).toLocaleString();
    } catch (e) {
      showToast('統計の読み込みに失敗: ' + e.message, true);
    }
  }

  async function loadTeachers() {
    try {
      const data = await API.request('/api/admin/teachers');
      renderTeachersTable(data.teachers || []);
    } catch (e) {
      document.getElementById('teachers-tbody').innerHTML =
        `<tr class="loading-row"><td colspan="6" style="color:#f87171">読み込みエラー: ${escapeHtml(e.message)}</td></tr>`;
    }
  }

  window.loadAll = async function () {
    await Promise.all([loadStats(), loadTeachers()]);
  };

  window.extendTrial = async function (id, name) {
    if (!confirm(`${name} のトライアルを30日延長しますか？`)) return;
    try {
      await API.request(`/api/admin/teacher/${id}/extend-trial`, { method: 'POST', body: JSON.stringify({ days: 30 }) });
      showToast(`✅ ${name} のトライアルを30日延長しました`);
      loadTeachers();
    } catch (e) { showToast(e.message, true); }
  };

  window.setStatus = async function (id, status, name) {
    const label = status === 'suspended' ? '停止' : '有効化';
    if (!confirm(`${name} を${label}しますか？`)) return;
    try {
      await API.request(`/api/admin/teacher/${id}/set-status`, { method: 'POST', body: JSON.stringify({ status }) });
      showToast(`✅ ${name} を${label}しました`);
      loadTeachers();
    } catch (e) { showToast(e.message, true); }
  };

  window.doLogout = function () {
    if (confirm('ログアウトしますか？')) Auth.logout();
  };

  loadAll();
})();
