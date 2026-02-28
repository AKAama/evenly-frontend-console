const API_BASE = 'http://localhost:8000';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // Auth
  register: async (email, password, displayName, avatar) => {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    if (displayName) formData.append('display_name', displayName);
    if (avatar) formData.append('avatar', avatar);

    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },

  login: async (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      throw new Error('Invalid credentials');
    }
    return res.json();
  },

  // User
  getMe: async () => {
    const res = await fetch(`${API_BASE}/users/me`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to get user');
    return res.json();
  },

  searchUsers: async (query) => {
    const res = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(query)}`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to search users');
    return res.json();
  },

  // Ledgers
  getLedgers: async () => {
    const res = await fetch(`${API_BASE}/ledgers`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to get ledgers');
    return res.json();
  },

  createLedger: async (name, currency = 'CNY') => {
    const res = await fetch(`${API_BASE}/ledgers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ name, currency }),
    });
    if (!res.ok) throw new Error('Failed to create ledger');
    return res.json();
  },

  getLedger: async (id) => {
    const res = await fetch(`${API_BASE}/ledgers/${id}`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to get ledger');
    return res.json();
  },

  deleteLedger: async (id) => {
    const res = await fetch(`${API_BASE}/ledgers/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to delete ledger');
  },

  // Members
  addMember: async (ledgerId, userId, nickname) => {
    const res = await fetch(`${API_BASE}/ledgers/${ledgerId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ user_id: userId, nickname }),
    });
    if (!res.ok) throw new Error('Failed to add member');
    return res.json();
  },

  getMembers: async (ledgerId) => {
    const res = await fetch(`${API_BASE}/ledgers/${ledgerId}/members`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to get members');
    return res.json();
  },

  // Expenses
  getExpenses: async (ledgerId) => {
    const res = await fetch(`${API_BASE}/ledgers/${ledgerId}/expenses`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to get expenses');
    return res.json();
  },

  createExpense: async (ledgerId, expense) => {
    const res = await fetch(`${API_BASE}/ledgers/${ledgerId}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(expense),
    });
    if (!res.ok) throw new Error('Failed to create expense');
    return res.json();
  },

  confirmExpense: async (expenseId, status) => {
    const res = await fetch(`${API_BASE}/expenses/${expenseId}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to confirm expense');
    return res.json();
  },

  // Settlements
  getSettlements: async (ledgerId) => {
    const res = await fetch(`${API_BASE}/ledgers/${ledgerId}/settlements`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to get settlements');
    return res.json();
  },

  createSettlement: async (ledgerId, fromUserId, toUserId, amount, note) => {
    const res = await fetch(`${API_BASE}/ledgers/${ledgerId}/settlements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        from_user_id: fromUserId,
        to_user_id: toUserId,
        amount,
        note,
      }),
    });
    if (!res.ok) throw new Error('Failed to create settlement');
    return res.json();
  },
};
