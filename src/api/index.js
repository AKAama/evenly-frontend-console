const API_BASE = import.meta.env.REACT_APP_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';

let unauthorizedHandler = null;

const parseError = async (res, fallback) => {
  try {
    const data = await res.json();
    return data.detail || data.message || fallback;
  } catch {
    return fallback;
  }
};

const request = async (path, options = {}) => {
  const headers = {
    'X-Client': 'console',
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    unauthorizedHandler?.();
  }

  return res;
};

const jsonRequest = async (path, options = {}, fallback = 'Request failed') => {
  const res = await request(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    throw new Error(await parseError(res, fallback));
  }

  if (res.status === 204) return null;
  return res.json();
};

const formRequest = async (path, formData, options = {}, fallback = 'Request failed') => {
  const res = await request(path, {
    ...options,
    method: options.method || 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await parseError(res, fallback));
  }

  return res.json();
};

const websocketUrl = (path) => {
  const base = new URL(API_BASE);
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  base.pathname = path;
  base.search = '';
  base.hash = '';
  return base.toString();
};

export const api = {
  setUnauthorizedHandler: (handler) => {
    unauthorizedHandler = handler;
  },

  logout: async () => {
    await request('/auth/logout', { method: 'POST' });
  },

  // Auth
  sendVerificationCode: async (email) => {
    return jsonRequest(
      `/auth/send-verification?email=${encodeURIComponent(email)}`,
      { method: 'POST' },
      'Failed to send code'
    );
  },

  register: async (email, username, password, displayName, code, avatar) => {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('username', username);
    formData.append('password', password);
    formData.append('code', code);
    if (displayName) formData.append('display_name', displayName);
    if (avatar) formData.append('avatar', avatar);

    return formRequest('/auth/register', formData, {}, 'Registration failed');
  },

  login: async (identifier, password) => {
    const formData = new FormData();
    formData.append('username', identifier);
    formData.append('password', password);

    return formRequest('/auth/login', formData, {}, 'Invalid credentials');
  },

  // User
  getMe: async () => {
    return jsonRequest('/users/me', {}, 'Failed to get user');
  },

  updateUser: async (data) => {
    return jsonRequest(
      '/users/me',
      { method: 'PUT', body: JSON.stringify(data) },
      'Failed to update user'
    );
  },

  changePassword: async (oldPassword, newPassword) => {
    return jsonRequest(
      '/users/me/password',
      {
        method: 'PUT',
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      },
      'Failed to change password'
    );
  },

  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return formRequest('/users/me/avatar', formData, {}, 'Failed to upload avatar');
  },

  deleteAccount: async () => {
    return jsonRequest('/users/me', { method: 'DELETE' }, 'Failed to delete account');
  },

  searchUsers: async (query) => {
    return jsonRequest(`/users/search?q=${encodeURIComponent(query)}`, {}, 'Failed to search users');
  },

  // Ledgers
  getLedgers: async () => {
    return jsonRequest('/ledgers', {}, 'Failed to get ledgers');
  },

  createLedger: async (name, currency = 'CNY') => {
    return jsonRequest(
      '/ledgers',
      {
        method: 'POST',
        body: JSON.stringify({ name, currency }),
      },
      'Failed to create ledger'
    );
  },

  getLedger: async (id) => {
    return jsonRequest(`/ledgers/${id}`, {}, 'Failed to get ledger');
  },

  deleteLedger: async (id) => {
    return jsonRequest(`/ledgers/${id}`, { method: 'DELETE' }, 'Failed to delete ledger');
  },

  leaveLedger: async (id) => {
    return jsonRequest(`/ledgers/${id}/members/me`, { method: 'DELETE' }, 'Failed to leave ledger');
  },

  getPendingInvitations: async () => {
    return jsonRequest('/ledgers/invitations/pending', {}, 'Failed to get invitations');
  },

  acceptInvitation: async (invitationId) => {
    return jsonRequest(
      `/ledgers/invitations/${invitationId}/accept`,
      { method: 'POST' },
      'Failed to accept invitation'
    );
  },

  rejectInvitation: async (invitationId) => {
    return jsonRequest(
      `/ledgers/invitations/${invitationId}/reject`,
      { method: 'POST' },
      'Failed to reject invitation'
    );
  },

  // Members
  addMember: async (ledgerId, userId, nickname) => {
    return jsonRequest(
      `/ledgers/${ledgerId}/members`,
      {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, nickname }),
      },
      'Failed to add member'
    );
  },

  addTemporaryMember: async (ledgerId, temporaryName) => {
    return jsonRequest(
      `/ledgers/${ledgerId}/members`,
      {
        method: 'POST',
        body: JSON.stringify({
          is_temporary: true,
          temporary_name: temporaryName,
        }),
      },
      'Failed to add temporary member'
    );
  },

  getMembers: async (ledgerId) => {
    return jsonRequest(`/ledgers/${ledgerId}/members`, {}, 'Failed to get members');
  },

  removeMember: async (ledgerId, memberId) => {
    return jsonRequest(
      `/ledgers/${ledgerId}/members/${memberId}`,
      { method: 'DELETE' },
      'Failed to remove member'
    );
  },

  getInviteLink: async (ledgerId) => {
    return jsonRequest(
      `/ledgers/${ledgerId}/invite-link`,
      {},
      'Failed to get invite link'
    );
  },

  rotateInviteLink: async (ledgerId) => {
    return jsonRequest(
      `/ledgers/${ledgerId}/invite-link/rotate`,
      { method: 'POST' },
      'Failed to rotate invite link'
    );
  },

  // Expenses
  getExpenses: async (ledgerId) => {
    return jsonRequest(`/expenses/ledgers/${ledgerId}/expenses`, {}, 'Failed to get expenses');
  },

  createExpense: async (ledgerId, expense) => {
    return jsonRequest(
      `/expenses/ledgers/${ledgerId}/expenses`,
      {
        method: 'POST',
        body: JSON.stringify(expense),
      },
      'Failed to create expense'
    );
  },

  setExpenseRefund: async (expenseId, payload) => {
    return jsonRequest(
      `/expenses/${expenseId}/refund`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      'Failed to set expense refund'
    );
  },

  confirmExpense: async (expenseId, status) => {
    return jsonRequest(
      `/expenses/${expenseId}/confirm`,
      {
        method: 'POST',
        body: JSON.stringify({ status }),
      },
      'Failed to confirm expense'
    );
  },

  deleteExpense: async (expenseId) => {
    return jsonRequest(`/expenses/${expenseId}`, { method: 'DELETE' }, 'Failed to delete expense');
  },

  voiceExpenseSessionUrl: (ledgerId) => websocketUrl(`/expenses/ledgers/${ledgerId}/voice-session`),

  // Settlements
  getSettlements: async (ledgerId) => {
    return jsonRequest(`/ledgers/${ledgerId}/settlements`, {}, 'Failed to get settlements');
  },

  getSettlementHistory: async (ledgerId) => {
    return jsonRequest(`/ledgers/${ledgerId}/settlements/history`, {}, 'Failed to get settlement history');
  },

  createSettlement: async (ledgerId, fromUserId, toUserId, amount, note) => {
    return jsonRequest(
      `/ledgers/${ledgerId}/settlements`,
      {
        method: 'POST',
        body: JSON.stringify({
          from_user_id: fromUserId,
          to_user_id: toUserId,
          amount,
          note,
        }),
      },
      'Failed to create settlement'
    );
  },

  // Admin audit feed
  getAuditEvents: async ({ day, source, action, limit = 200, offset = 0 } = {}) => {
    const params = new URLSearchParams();
    if (day) params.set('day', day);
    if (source) params.set('source', source);
    if (action) params.set('action', action);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    return jsonRequest(`/admin/audit-events?${params}`, {}, 'Failed to load audit events');
  },

  getAuditSummary: async ({ day } = {}) => {
    const params = new URLSearchParams();
    if (day) params.set('day', day);
    return jsonRequest(`/admin/audit-events/summary?${params}`, {}, 'Failed to load audit summary');
  },

  listPlatformUsers: async () => {
    return jsonRequest('/admin/platform-users', {}, 'Failed to list platform users');
  },

  createPlatformUser: async ({ email, username, password, display_name }) => {
    return jsonRequest(
      '/admin/platform-users',
      {
        method: 'POST',
        body: JSON.stringify({ email, username, password, display_name }),
      },
      'Failed to create platform user'
    );
  },

  adminListUsers: async ({ q, account_kind, limit = 100, offset = 0 } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (account_kind) params.set('account_kind', account_kind);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    return jsonRequest(`/admin/users?${params}`, {}, 'Failed to list users');
  },

  adminGetUser: async (userId) => {
    return jsonRequest(`/admin/users/${userId}`, {}, 'Failed to get user');
  },

  adminListLedgers: async ({ q, limit = 100, offset = 0 } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    return jsonRequest(`/admin/ledgers?${params}`, {}, 'Failed to list ledgers');
  },

  adminLedgerOverview: async (ledgerId) => {
    return jsonRequest(`/admin/ledgers/${ledgerId}/overview`, {}, 'Failed to load ledger overview');
  },
};
