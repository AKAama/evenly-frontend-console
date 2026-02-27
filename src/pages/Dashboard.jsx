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

  if (selectedLedger) {
    return (
      <LedgerDetail
        ledger={selectedLedger}
        onBack={() => setSelectedLedger(null)}
        onRefresh={() => {
          api.getLedger(selectedLedger.id).then(setSelectedLedger);
        }}
      />
    );
  }

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
          expenses.length === 0 ? (
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
                <p>状态: {exp.status}</p>
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
          )
        )}

        {activeTab === 'members' && (
          members.length === 0 ? (
            <p style={styles.empty}>暂无成员</p>
          ) : (
            members.map((member) => (
              <div key={member.user_id} style={styles.memberCard}>
                <div style={styles.avatar}>
                  {member.user?.display_name?.[0] || member.user?.email[0]?.toUpperCase()}
                </div>
                <div>
                  <p style={styles.memberName}>{member.nickname || member.user?.display_name || member.user?.email}</p>
                  <p style={styles.memberEmail}>{member.user?.email}</p>
                </div>
              </div>
            ))
          )
        )}

        {activeTab === 'settlements' && (
          settlements.length === 0 ? (
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
          )
        )}
      </div>
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
  },
  activeTab: {
    flex: 1,
    padding: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderBottom: '2px solid #4CAF50',
    color: '#4CAF50',
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
};
