import { useState, useEffect } from 'react';
import { api } from '../api';

export function Dashboard({ onLogout }) {
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLedgerName, setNewLedgerName] = useState('');
  const [selectedLedger, setSelectedLedger] = useState(null);

  useEffect(() => {
    loadLedgers();
  }, []);

  const loadLedgers = async () => {
    try {
      const data = await api.getLedgers();
      setLedgers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLedger = async (e) => {
    e.preventDefault();
    if (!newLedgerName.trim()) return;
    try {
      await api.createLedger(newLedgerName);
      setNewLedgerName('');
      loadLedgers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteLedger = async (id) => {
    if (!window.confirm('确定要删除这个账本吗？')) return;
    try {
      await api.deleteLedger(id);
      loadLedgers();
      if (selectedLedger?.id === id) setSelectedLedger(null);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>我的账本</h1>
        <button onClick={onLogout} style={styles.logoutBtn}>退出登录</button>
      </header>

      <div style={styles.content}>
        <form onSubmit={handleCreateLedger} style={styles.createForm}>
          <input
            type="text"
            placeholder="新账本名称"
            value={newLedgerName}
            onChange={(e) => setNewLedgerName(e.target.value)}
            style={styles.input}
          />
          <button type="submit" style={styles.createBtn}>创建账本</button>
        </form>

        {loading ? (
          <p>加载中...</p>
        ) : ledgers.length === 0 ? (
          <p style={styles.empty}>暂无账本，创建一个吧</p>
        ) : (
          <div style={styles.grid}>
            {ledgers.map((ledger) => (
              <div key={ledger.id} style={styles.card}>
                <h3>{ledger.name}</h3>
                <p>货币: {ledger.currency}</p>
                <div style={styles.cardActions}>
                  <button
                    onClick={() => api.getLedger(ledger.id).then(setSelectedLedger)}
                    style={styles.actionBtn}
                  >
                    查看
                  </button>
                  <button
                    onClick={() => handleDeleteLedger(ledger.id)}
                    style={styles.deleteBtn}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LedgerDetail({ ledger, onBack, onRefresh }) {
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [activeTab, setActiveTab] = useState('expenses');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showCreateExpense, setShowCreateExpense] = useState(false);
  const [showCreateSettlement, setShowCreateSettlement] = useState(false);

  useEffect(() => {
    loadData();
  }, [ledger.id]);

  const loadData = async () => {
    try {
      const [membersData, expensesData, settlementsData] = await Promise.all([
        api.getMembers(ledger.id),
        api.getExpenses(ledger.id),
        api.getSettlements(ledger.id),
      ]);
      setMembers(membersData);
      setExpenses(expensesData);
      setSettlements(settlementsData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmExpense = async (expenseId, status) => {
    try {
      await api.confirmExpense(expenseId, status);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>← 返回</button>
        <h2>{ledger.name}</h2>
      </header>

      <div style={styles.tabs}>
        <button
          style={activeTab === 'expenses' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('expenses')}
        >
          支出 ({expenses.length})
        </button>
        <button
          style={activeTab === 'members' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('members')}
        >
          成员 ({members.length})
        </button>
        <button
          style={activeTab === 'settlements' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('settlements')}
        >
          结算 ({settlements.length})
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'expenses' && (
          <>
            <button style={styles.addBtn} onClick={() => setShowCreateExpense(true)}>
              + 添加支出
            </button>
            {expenses.length === 0 ? (
              <p style={styles.empty}>暂无支出记录</p>
            ) : (
              expenses.map((exp) => (
                <div key={exp.id} style={styles.expenseCard}>
                  <div style={styles.expenseHeader}>
                    <h4>{exp.title || '未命名支出'}</h4>
                    <span style={styles.amount}>¥{exp.total_amount}</span>
                  </div>
                  <p>付款人: {exp.payer?.display_name || exp.payer?.email}</p>
                  <p>日期: {exp.expense_date}</p>
                  <p>状态: {exp.status === 'pending' ? '待确认' : exp.status === 'confirmed' ? '已确认' : '已拒绝'}</p>
                  {exp.status === 'pending' && (
                    <div style={styles.expenseActions}>
                      <button
                        onClick={() => handleConfirmExpense(exp.id, 'confirmed')}
                        style={styles.confirmBtn}
                      >
                        确认
                      </button>
                      <button
                        onClick={() => handleConfirmExpense(exp.id, 'rejected')}
                        style={styles.rejectBtn}
                      >
                        否决
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
            {showCreateExpense && (
              <CreateExpenseModal
                ledgerId={ledger.id}
                members={members}
                onClose={() => setShowCreateExpense(false)}
                onSuccess={() => {
                  setShowCreateExpense(false);
                  loadData();
                }}
              />
            )}
          </>
        )}

        {activeTab === 'members' && (
          <>
            <button style={styles.addBtn} onClick={() => setShowAddMember(true)}>
              + 添加成员
            </button>
            {members.length === 0 ? (
              <p style={styles.empty}>暂无成员</p>
            ) : (
              members.map((member) => (
                <div key={member.user_id} style={styles.memberCard}>
                  <div style={styles.avatar}>
                    {member.user?.display_name?.[0] || member.user?.email?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p style={styles.memberName}>{member.nickname || member.user?.display_name || member.user?.email}</p>
                    <p style={styles.memberEmail}>{member.user?.email}</p>
                  </div>
                </div>
              ))
            )}
            {showAddMember && (
              <AddMemberModal
                ledgerId={ledger.id}
                existingMemberIds={members.map(m => m.user_id)}
                onClose={() => setShowAddMember(false)}
                onSuccess={() => {
                  setShowAddMember(false);
                  loadData();
                }}
              />
            )}
          </>
        )}

        {activeTab === 'settlements' && (
          <>
            <button style={styles.addBtn} onClick={() => setShowCreateSettlement(true)}>
              + 添加结算
            </button>
            {settlements.length === 0 ? (
              <p style={styles.empty}>暂无结算记录</p>
            ) : (
              settlements.map((s) => (
                <div key={s.id} style={styles.settlementCard}>
                  <span>{s.from_user?.display_name || s.from_user?.email}</span>
                  <span> → </span>
                  <span>{s.to_user?.display_name || s.to_user?.email}</span>
                  <span style={styles.amount}> ¥{s.amount}</span>
                  <p style={styles.settleDate}>{new Date(s.settled_at).toLocaleDateString()}</p>
                </div>
              ))
            )}
            {showCreateSettlement && (
              <CreateSettlementModal
                ledgerId={ledger.id}
                members={members}
                onClose={() => setShowCreateSettlement(false)}
                onSuccess={() => {
                  setShowCreateSettlement(false);
                  loadData();
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AddMemberModal({ ledgerId, existingMemberIds, onClose, onSuccess }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const results = await api.searchUsers(searchQuery);
      // Filter out existing members and current user
      const filtered = results.filter(u => !existingMemberIds.includes(u.id));
      setSearchResults(filtered);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (userId) => {
    setAddingId(userId);
    try {
      await api.addMember(ledgerId, userId, '');
      onSuccess();
    } catch (err) {
      alert(err.message);
      setAddingId(null);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3>添加成员</h3>
        <div style={styles.searchRow}>
          <input
            type="text"
            placeholder="搜索邮箱或用户名"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.input}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} style={styles.searchBtn} disabled={loading}>
            {loading ? '搜索中...' : '搜索'}
          </button>
        </div>
        <div style={styles.searchResults}>
          {searchResults.map((user) => (
            <div key={user.id} style={styles.searchResultItem}>
              <span>{user.display_name || user.email}</span>
              <span style={styles.userEmail}>{user.email}</span>
              <button
                onClick={() => handleAddMember(user.id)}
                style={styles.addBtnSmall}
                disabled={addingId === user.id}
              >
                {addingId === user.id ? '添加中...' : '添加'}
              </button>
            </div>
          ))}
          {searchResults.length === 0 && searchQuery && !loading && (
            <p style={styles.noResults}>未找到用户</p>
          )}
        </div>
        <button onClick={onClose} style={styles.closeBtn}>关闭</button>
      </div>
    </div>
  );
}

function CreateExpenseModal({ ledgerId, members, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [splits, setSplits] = useState([]);
  const [splitType, setSplitType] = useState('equal'); // equal, percentage, exact
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize splits with equal amounts
    if (members.length > 0) {
      initializeSplits();
    }
  }, [members.length, splitType]);

  const initializeSplits = () => {
    if (!amount || !members.length) return;
    
    if (splitType === 'equal') {
      const equalAmount = (parseFloat(amount) / members.length).toFixed(2);
      setSplits(members.map(m => ({ userId: m.user_id, amount: equalAmount })));
    }
  };

  const handleAmountChange = (value) => {
    setAmount(value);
    if (splitType === 'equal') {
      initializeSplits();
    }
  };

  const handleSplitChange = (userId, field, value) => {
    setSplits(prev => prev.map(s => 
      s.userId === userId ? { ...s, [field]: value } : s
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount || !payerId) {
      alert('请填写必填项');
      return;
    }

    setLoading(true);
    try {
      await api.createExpense(ledgerId, {
        title,
        total_amount: parseFloat(amount),
        payer_id: payerId,
        expense_date: date,
        description,
        splits: splits.map(s => ({
          user_id: s.userId,
          amount: parseFloat(s.amount),
        })),
      });
      onSuccess();
    } catch (err) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <form style={styles.modal} onSubmit={handleSubmit}>
        <h3>添加支出</h3>
        
        <label style={styles.label}>标题 *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={styles.input}
          required
        />

        <label style={styles.label}>金额 *</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          style={styles.input}
          required
        />

        <label style={styles.label}>付款人 *</label>
        <select
          value={payerId}
          onChange={(e) => setPayerId(e.target.value)}
          style={styles.input}
          required
        >
          <option value="">选择付款人</option>
          {members.map(m => (
            <option key={m.user_id} value={m.user_id}>
              {m.nickname || m.user?.display_name || m.user?.email}
            </option>
          ))}
        </select>

        <label style={styles.label}>日期 *</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={styles.input}
          required
        />

        <label style={styles.label}>说明</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{...styles.input, minHeight: '60px'}}
        />

        <label style={styles.label}>分摊方式: {splitType === 'equal' ? '平均' : splitType === 'percentage' ? '按比例' : '按金额'}</label>
        <select
          value={splitType}
          onChange={(e) => setSplitType(e.target.value)}
          style={styles.input}
        >
          <option value="equal">平均分摊</option>
          <option value="percentage">按比例</option>
          <option value="exact">按金额</option>
        </select>

        <div style={styles.splitSection}>
          <p style={styles.splitTitle}>分摊明细:</p>
          {members.map(m => (
            <div key={m.user_id} style={styles.splitRow}>
              <span style={styles.splitName}>{m.nickname || m.user?.display_name || m.user?.email}</span>
              <input
                type="number"
                step="0.01"
                value={splits.find(s => s.userId === m.user_id)?.amount || ''}
                onChange={(e) => handleSplitChange(m.user_id, 'amount', e.target.value)}
                style={styles.splitInput}
                placeholder="金额"
              />
            </div>
          ))}
        </div>

        <div style={styles.modalActions}>
          <button type="button" onClick={onClose} style={styles.cancelBtn}>取消</button>
          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? '提交中...' : '提交'}
          </button>
        </div>
      </form>
    </div>
  );
}

function CreateSettlementModal({ ledgerId, members, onClose, onSuccess }) {
  const [fromUserId, setFromUserId] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromUserId || !toUserId || !amount) {
      alert('请填写必填项');
      return;
    }

    if (fromUserId === toUserId) {
      alert('付款人和收款人不能相同');
      return;
    }

    setLoading(true);
    try {
      await api.createSettlement(ledgerId, fromUserId, toUserId, parseFloat(amount), note);
      onSuccess();
    } catch (err) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <form style={styles.modal} onSubmit={handleSubmit}>
        <h3>添加结算</h3>
        
        <label style={styles.label}>付款人 *</label>
        <select
          value={fromUserId}
          onChange={(e) => setFromUserId(e.target.value)}
          style={styles.input}
          required
        >
          <option value="">选择付款人</option>
          {members.map(m => (
            <option key={m.user_id} value={m.user_id}>
              {m.nickname || m.user?.display_name || m.user?.email}
            </option>
          ))}
        </select>

        <label style={styles.label}>收款人 *</label>
        <select
          value={toUserId}
          onChange={(e) => setToUserId(e.target.value)}
          style={styles.input}
          required
        >
          <option value="">选择收款人</option>
          {members.map(m => (
            <option key={m.user_id} value={m.user_id}>
              {m.nickname || m.user?.display_name || m.user?.email}
            </option>
          ))}
        </select>

        <label style={styles.label}>金额 *</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={styles.input}
          required
        />

        <label style={styles.label}>说明</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={styles.input}
        />

        <div style={styles.modalActions}>
          <button type="button" onClick={onClose} style={styles.cancelBtn}>取消</button>
          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? '提交中...' : '提交'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5',
  },
  header: {
    background: 'white',
    padding: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  content: {
    padding: '1rem',
    maxWidth: '800px',
    margin: '0 auto',
  },
  logoutBtn: {
    marginLeft: 'auto',
    padding: '8px 16px',
    background: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  createForm: {
    display: 'flex',
    gap: '8px',
    marginBottom: '1rem',
  },
  input: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  createBtn: {
    padding: '10px 20px',
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem',
  },
  card: {
    background: 'white',
    padding: '1rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  actionBtn: {
    flex: 1,
    padding: '8px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deleteBtn: {
    flex: 1,
    padding: '8px',
    background: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    padding: '2rem',
  },
  tabs: {
    display: 'flex',
    background: 'white',
    borderBottom: '1px solid #ddd',
  },
  tab: {
    flex: 1,
    padding: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    fontSize: '14px',
  },
  activeTab: {
    flex: 1,
    padding: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderBottom: '2px solid #4CAF50',
    color: '#4CAF50',
    fontSize: '14px',
  },
  backBtn: {
    padding: '8px 12px',
    background: 'none',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  expenseCard: {
    background: 'white',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  expenseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  expenseActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  confirmBtn: {
    padding: '8px 16px',
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  rejectBtn: {
    padding: '8px 16px',
    background: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  memberCard: {
    background: 'white',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#2196F3',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
  },
  memberName: {
    margin: 0,
    fontWeight: '500',
  },
  memberEmail: {
    margin: 0,
    fontSize: '12px',
    color: '#999',
  },
  settlementCard: {
    background: 'white',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  settleDate: {
    margin: '8px 0 0',
    fontSize: '12px',
    color: '#999',
  },
  addBtn: {
    width: '100%',
    padding: '12px',
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '1rem',
    fontSize: '14px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '400px',
    maxHeight: '80vh',
    overflow: 'auto',
  },
  searchRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '1rem',
  },
  searchBtn: {
    padding: '10px 16px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  searchResults: {
    maxHeight: '200px',
    overflow: 'auto',
    marginBottom: '1rem',
  },
  searchResultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    borderBottom: '1px solid #eee',
  },
  userEmail: {
    flex: 1,
    fontSize: '12px',
    color: '#999',
  },
  addBtnSmall: {
    padding: '4px 12px',
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  noResults: {
    textAlign: 'center',
    color: '#999',
    padding: '1rem',
  },
  closeBtn: {
    width: '100%',
    padding: '10px',
    background: '#ddd',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  label: {
    display: 'block',
    marginBottom: '4px',
    fontSize: '14px',
    fontWeight: '500',
  },
  splitSection: {
    marginTop: '1rem',
    padding: '1rem',
    background: '#f9f9f9',
    borderRadius: '4px',
  },
  splitTitle: {
    margin: '0 0 8px',
    fontWeight: '500',
    fontSize: '14px',
  },
  splitRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  splitName: {
    flex: 1,
    fontSize: '14px',
  },
  splitInput: {
    width: '100px',
    padding: '6px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  modalActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '1rem',
  },
  cancelBtn: {
    flex: 1,
    padding: '10px',
    background: '#ddd',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 1,
    padding: '10px',
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};