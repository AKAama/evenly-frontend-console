import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { Card, Row, Col, Button, Modal, Form, Input, Select, DatePicker, Table, Tag, message, Popconfirm, Space, Avatar, List, InputNumber, Tabs, Tooltip, Divider } from 'antd';
import { PlusOutlined, UserAddOutlined, DollarOutlined, SwapOutlined, LogoutOutlined, ArrowLeftOutlined, ReloadOutlined, ExportOutlined, UserOutlined, CameraOutlined, LockOutlined } from '@ant-design/icons';
import html2canvas from 'html2canvas';
import dayjs from 'dayjs';

export function Dashboard({ onLogout }) {
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    loadLedgers();
  }, []);

  const loadLedgers = async () => {
    try {
      const data = await api.getLedgers();
      setLedgers(data);
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLedger = async (values) => {
    try {
      await api.createLedger(values.name, values.currency || 'CNY');
      message.success('创建成功');
      setCreateModalOpen(false);
      loadLedgers();
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleDeleteLedger = async (id) => {
    try {
      await api.deleteLedger(id);
      message.success('删除成功');
      loadLedgers();
      if (selectedLedger?.id === id) setSelectedLedger(null);
    } catch (err) {
      message.error(err.message);
    }
  };

  if (selectedLedger) {
    return <LedgerDetail ledger={selectedLedger} onBack={() => setSelectedLedger(null)} onRefresh={loadLedgers} />;
  }

  return (
    <div style={styles.container}>
      <Card title="我的账本" extra={
        <Space>
          <Button icon={<UserOutlined />} onClick={() => setProfileOpen(true)}>个人中心</Button>
          <Button icon={<LogoutOutlined />} onClick={onLogout}>退出</Button>
        </Space>
      } style={styles.mainCard}>
        <div style={styles.createForm}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>创建账本</Button>
        </div>

        {loading ? (
          <div style={styles.loading}>加载中...</div>
        ) : ledgers.length === 0 ? (
          <EmptyState onCreate={() => setCreateModalOpen(true)} />
        ) : (
          <Row gutter={[16, 16]}>
            {ledgers.map((ledger) => (
              <Col xs={24} sm={12} md={8} lg={6} key={ledger.id}>
                <Card hoverable style={styles.ledgerCard} onClick={() => setSelectedLedger(ledger)}>
                  <Card.Meta
                    avatar={<Avatar style={{ backgroundColor: '#1890ff' }}>{ledger.name[0]}</Avatar>}
                    title={ledger.name}
                    description={<Tag color="blue">{ledger.currency}</Tag>}
                  />
                  <div style={styles.cardActions}>
                    <Button type="link" size="small">查看详情</Button>
                    <Popconfirm title="确定删除这个账本吗？" onConfirm={(e) => { e?.stopPropagation(); handleDeleteLedger(ledger.id); }}>
                      <Button type="link" danger size="small" onClick={(e) => e.stopPropagation()}>删除</Button>
                    </Popconfirm>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      <Modal title="创建账本" open={createModalOpen} onCancel={() => setCreateModalOpen(false)} footer={null}>
        <Form onFinish={handleCreateLedger} layout="vertical">
          <Form.Item name="name" label="账本名称" rules={[{ required: true, message: '请输入账本名称' }]}>
            <Input placeholder="如：旅行AA" />
          </Form.Item>
          <Form.Item name="currency" label="货币" initialValue="CNY">
            <Select>
              <Select.Option value="CNY">人民币 (CNY)</Select.Option>
              <Select.Option value="USD">美元 (USD)</Select.Option>
              <Select.Option value="JPY">日元 (JPY)</Select.Option>
              <Select.Option value="EUR">欧元 (EUR)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>创建</Button>
          </Form.Item>
        </Form>
      </Modal>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>📋</div>
      <h3>暂无账本</h3>
      <p>创建一个账本开始你的AA记账之旅</p>
      <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>创建账本</Button>
    </div>
  );
}

const getUserDisplayName = (user) => user?.display_name || user?.email || '用户';
const getUserInitial = (user) => getUserDisplayName(user)[0]?.toUpperCase() || '?';

function ProfileModal({ open, onClose }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const avatarInputRef = useRef(null);

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getMe();
      setUser(data);
      profileForm.setFieldsValue({
        display_name: data.display_name || '',
        email: data.email,
      });
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [profileForm]);

  useEffect(() => {
    if (open) {
      loadUser();
    } else {
      setShowPasswordForm(false);
      passwordForm.resetFields();
    }
  }, [open, loadUser, passwordForm]);

  const handleUpdateProfile = async () => {
    try {
      const values = await profileForm.validateFields();
      setSaving(true);
      await api.updateUser({ display_name: values.display_name });
      message.success('更新成功');
      loadUser();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      const values = await passwordForm.validateFields();
      if (values.new_password !== values.confirm_password) {
        message.error('两次输入的密码不一致');
        return;
      }
      setSaving(true);
      await api.changePassword(values.old_password, values.new_password);
      message.success('密码修改成功');
      passwordForm.resetFields();
      setShowPasswordForm(false);
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (file) => {
    if (!file) return false;
    try {
      const updatedUser = await api.uploadAvatar(file);
      setUser(updatedUser);
      message.success('头像上传成功');
    } catch (err) {
      message.error(err.message);
    } finally {
    }
    return false;
  };

  return (
    <Modal
      title="个人中心"
      open={open}
      onCancel={() => {
        setShowPasswordForm(false);
        passwordForm.resetFields();
        onClose();
      }}
      width={500}
      footer={null}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>加载中...</div>
      ) : (
	        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          {
            key: 'profile',
            label: '个人资料',
            children: (
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                  <Avatar
                    size={80}
                    src={user?.avatar_url}
                    style={{ backgroundColor: '#1890ff' }}
                  >
                    {user?.display_name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
                  </Avatar>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      background: '#1890ff',
                      borderRadius: '50%',
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#fff',
                      fontSize: 14,
                    }}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <CameraOutlined />
                  </div>
                  <input
                    type="file"
                    ref={avatarInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarChange(file);
                    }}
                  />
                </div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{user?.display_name || '未设置昵称'}</div>
                <div style={{ color: '#999', fontSize: 12 }}>{user?.email}</div>
              </div>
            ),
          },
          {
            key: 'account',
            label: '账号设置',
            children: (
              <Form form={profileForm} layout="vertical">
                <Form.Item name="email" label="邮箱">
                  <Input disabled />
                </Form.Item>
                <Form.Item name="display_name" label="显示名称" rules={[{ max: 50, message: '最多50个字符' }]}>
                  <Input placeholder="输入你的显示名称" />
                </Form.Item>
	                <Button type="primary" onClick={handleUpdateProfile} loading={saving} block>
	                  保存修改
	                </Button>
	                <Divider />
	                {showPasswordForm ? (
	                  <Form form={passwordForm} layout="vertical">
	                    <Form.Item name="old_password" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
	                      <Input.Password placeholder="请输入当前密码" />
	                    </Form.Item>
	                    <Form.Item name="new_password" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少6位' }]}>
	                      <Input.Password placeholder="请输入新密码" />
	                    </Form.Item>
	                    <Form.Item name="confirm_password" label="确认新密码" rules={[{ required: true, message: '请确认新密码' }]}>
	                      <Input.Password placeholder="请再次输入新密码" />
	                    </Form.Item>
	                    <Space style={{ width: '100%' }} direction="vertical">
	                      <Button type="primary" danger onClick={handleChangePassword} loading={saving} block>
	                        保存新密码
	                      </Button>
	                      <Button onClick={() => { passwordForm.resetFields(); setShowPasswordForm(false); }} block>
	                        取消
	                      </Button>
	                    </Space>
	                  </Form>
	                ) : (
	                  <Button icon={<LockOutlined />} onClick={() => setShowPasswordForm(true)} block>
	                    修改密码
	                  </Button>
	                )}
	              </Form>
            ),
          },
        ]} />
      )}
      {user && (
        <div style={{ marginTop: 24, padding: '12px 16px', background: '#fafafa', borderRadius: 6, fontSize: 12, color: '#999' }}>
          注册时间：{dayjs(user.created_at).format('YYYY-MM-DD HH:mm')}
        </div>
      )}
    </Modal>
  );
}

function LedgerDetail({ ledger, onBack, onRefresh }) {
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [settlementHistory, setSettlementHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('expenses');
  const [currentUser, setCurrentUser] = useState(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [createExpenseOpen, setCreateExpenseOpen] = useState(false);
  const [createSettlementOpen, setCreateSettlementOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 获取当前用户信息
      const userData = await api.getMe();
      setCurrentUser(userData);

      // 先获取成员，因为其他操作需要成员信息
      const membersData = await api.getMembers(ledger.id);
      setMembers(membersData);

      // 如果没有成员，不请求 expenses 和 settlements
      if (membersData.length === 0) {
        setExpenses([]);
        setSettlements([]);
        setSettlementHistory([]);
      } else {
        // 并行获取 expenses 和 settlements
        const [expensesData, settlementsData, settlementHistoryData] = await Promise.all([
          api.getExpenses(ledger.id),
          api.getSettlements(ledger.id),
          api.getSettlementHistory(ledger.id),
        ]);
        setExpenses(expensesData);
        setSettlements(settlementsData);
        setSettlementHistory(settlementHistoryData);
      }
    } catch (err) {
      console.error('Failed to load ledger data:', err);
      // 如果是 403 错误，说明不是成员，重置数据
      if (err.message?.includes('Not a member')) {
        message.error('您不是该账本成员');
        setMembers([]);
        setExpenses([]);
        setSettlements([]);
        setSettlementHistory([]);
      } else {
        message.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [ledger.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConfirmExpense = async (expenseId, status) => {
    try {
      const updatedExpense = await api.confirmExpense(expenseId, status);
      message.success(status === 'confirmed' ? '已确认' : '已拒绝');
      // 立即更新本地状态，让按钮立即消失，同时添加确认记录
      setExpenses(prev => prev.map(exp => {
        if (exp.id === expenseId) {
          return {
            ...exp,
            status: updatedExpense.status,
            confirmations: [
              ...(exp.confirmations || []),
              { user_id: currentUser?.id, status: status }
            ]
          };
        }
        return exp;
      }));
    } catch (err) {
      message.error(err.message);
      // 如果是已确认错误，刷新数据
      if (err.message?.includes('already responded')) {
        loadData();
      }
    }
  };

  const handleExportImage = async () => {
    setExportOpen(true);
  };

  const handleExportConfirm = async () => {
    const element = document.getElementById('export-preview');
    if (!element) return;

    try {
      message.loading({ content: '正在导出...', key: 'export' });
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      const data = canvas.toDataURL('image/png');

      const link = document.createElement('a');
      link.href = data;
      link.download = `${ledger.name}_${dayjs().format('YYYY-MM-DD')}.png`;
      link.click();

      message.success({ content: '导出成功', key: 'export' });
    } catch (err) {
      message.error({ content: '导出失败', key: 'export' });
    }
  };

  const expenseColumns = [
    { title: '标题', dataIndex: 'title', key: 'title', render: (t) => t || '未命名支出' },
    { title: '金额', dataIndex: 'total_amount', key: 'amount', render: (v) => <span style={{ color: '#52c41a', fontWeight: 'bold' }}>¥{v}</span> },
    { title: '付款人', key: 'payer', render: (_, r) => r.payer?.display_name || r.payer?.email },
    { title: '日期', dataIndex: 'expense_date', key: 'date' },
    {
      title: '确认状态',
      key: 'confirmations',
      render: (_, r) => {
        // 只显示参与了该支出的成员（通过 splits 确定）
        const splitUserIds = r.splits?.map(s => s.user_id) || [];
        if (splitUserIds.length === 0) return '-';

        return (
          <Space size={4}>
            {splitUserIds.map(userId => {
              const member = members.find(m => m.user_id === userId);
              const confirmation = r.confirmations?.find(c => c.user_id === userId);
              const memberName = member?.nickname || member?.user?.display_name || member?.user?.email || '?';

              if (confirmation?.status === 'confirmed') {
                return (
                  <Tooltip key={userId} title={`${memberName}: 已确认`}>
                    <Avatar size={24} style={{ backgroundColor: '#52c41a', fontSize: 12 }}>✓</Avatar>
                  </Tooltip>
                );
              } else if (confirmation?.status === 'rejected') {
                return (
                  <Tooltip key={userId} title={`${memberName}: 已拒绝`}>
                    <Avatar size={24} style={{ backgroundColor: '#ff4d4f', fontSize: 12 }}>✕</Avatar>
                  </Tooltip>
                );
              } else {
                return (
                  <Tooltip key={userId} title={`${memberName}: 待确认`}>
                    <Avatar size={24} style={{ backgroundColor: '#d9d9d9', fontSize: 12, color: '#fff' }}>?</Avatar>
                  </Tooltip>
                );
              }
            })}
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, r) => {
        // 如果不是待确认状态，不显示按钮
        if (r.status !== 'pending') return '-';
        // 检查当前用户是否已经确认过
        const splitUserIds = r.splits?.map(s => s.user_id) || [];
        if (!splitUserIds.includes(currentUser?.id)) return '-';
        const hasConfirmed = r.confirmations?.some(c => c.user_id === currentUser?.id);
        if (hasConfirmed) return '已确认';
        return (
          <Space>
            <Button type="link" size="small" onClick={() => handleConfirmExpense(r.id, 'confirmed')}>确认</Button>
            <Button type="link" danger size="small" onClick={() => handleConfirmExpense(r.id, 'rejected')}>拒绝</Button>
          </Space>
        );
      },
    },
  ];

  const memberColumns = [
    { 
      title: '成员', 
      key: 'user',
      render: (_, r) => (
        <Space>
          <Avatar src={r.user?.avatar_url} style={{ backgroundColor: r.is_temporary ? '#fa8c16' : '#1890ff' }}>
            {r.is_temporary ? (r.temporary_name?.[0] || '?') : getUserInitial(r.user)}
          </Avatar>
          <span>{r.nickname || r.user?.display_name || r.user?.email}</span>
        </Space>
      )
    },
    { title: '邮箱', dataIndex: ['user', 'email'], key: 'email' },
  ];

  const settlementColumns = [
    {
      title: '从',
      key: 'from',
      render: (_, r) => r.from_user_name || '-'
    },
    {
      title: '到',
      key: 'to',
      render: (_, r) => r.to_user_name || '-'
    },
    { 
      title: '金额', 
      dataIndex: 'amount', 
      key: 'amount',
      render: (v) => <span style={{ color: '#52c41a', fontWeight: 'bold' }}>¥{v}</span>
    },
  ];

  const settlementHistoryColumns = [
    {
      title: '付款人',
      key: 'from',
      render: (_, r) => r.from_user?.display_name || r.from_user?.email || '-'
    },
    {
      title: '收款人',
      key: 'to',
      render: (_, r) => r.to_user?.display_name || r.to_user?.email || '-'
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (v) => <span style={{ color: '#52c41a', fontWeight: 'bold' }}>¥{v}</span>
    },
    { title: '日期', dataIndex: 'settled_at', key: 'date', render: (v) => dayjs(v).format('YYYY-MM-DD') },
  ];

  return (
    <div style={styles.container}>
      <Card
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={onBack} />
            <span>{ledger.name}</span>
          </Space>
        }
        extra={<Space><Button icon={<ExportOutlined />} onClick={handleExportImage}>导出</Button><Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button><Button onClick={onBack}>返回</Button></Space>}
        style={styles.mainCard}
      >
        <Card type="inner" extra={
          <Space wrap>
            <Button icon={<UserAddOutlined />} onClick={() => setAddMemberOpen(true)}>添加成员</Button>
            <Button type="primary" icon={<DollarOutlined />} onClick={() => setCreateExpenseOpen(true)}>添加支出</Button>
            <Button icon={<SwapOutlined />} onClick={() => setCreateSettlementOpen(true)}>添加结算</Button>
          </Space>
        }>
          成员 {members.length} | 支出 {expenses.length} | 结算建议 {settlements.length}
        </Card>

        <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginTop: '16px' }} items={[
          { key: 'expenses', label: `支出 (${expenses.length})`, children: <Table columns={expenseColumns} dataSource={expenses} rowKey="id" loading={loading} pagination={false} /> },
          { key: 'members', label: `成员 (${members.length})`, children: <Table columns={memberColumns} dataSource={members} rowKey={(row) => row.id || row.user_id} loading={loading} pagination={false} /> },
          { key: 'settlements', label: `结算建议 (${settlements.length})`, children: <Table columns={settlementColumns} dataSource={settlements} rowKey={(row) => `${row.from_user_id}-${row.to_user_id}-${row.amount}`} loading={loading} pagination={false} /> },
          { key: 'settlementHistory', label: `结算历史 (${settlementHistory.length})`, children: <Table columns={settlementHistoryColumns} dataSource={settlementHistory} rowKey="id" loading={loading} pagination={false} /> },
        ]} />
      </Card>

      <AddMemberModal
        open={addMemberOpen}
        onCancel={() => setAddMemberOpen(false)}
        ledgerId={ledger.id}
        existingIds={members.map(m => m.user_id).filter(Boolean)}
        onSuccess={() => { setAddMemberOpen(false); loadData(); }}
      />

      <CreateExpenseModal
        open={createExpenseOpen}
        onCancel={() => setCreateExpenseOpen(false)}
        ledgerId={ledger.id}
        members={members}
        onSuccess={() => { setCreateExpenseOpen(false); loadData(); }}
      />

      <CreateSettlementModal
        open={createSettlementOpen}
        onCancel={() => setCreateSettlementOpen(false)}
        ledgerId={ledger.id}
        members={members}
        onSuccess={() => { setCreateSettlementOpen(false); loadData(); }}
      />

      <ExportPreviewModal
        open={exportOpen}
        onCancel={() => setExportOpen(false)}
        ledger={ledger}
        members={members}
        expenses={expenses}
        settlements={settlements}
        onExport={handleExportConfirm}
      />
    </div>
  );
}

function AddMemberModal({ open, onCancel, ledgerId, existingIds, onSuccess }) {
  const [search, setSearch] = useState('');
  const [temporaryName, setTemporaryName] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [addedIds, setAddedIds] = useState([]);
  const [addingTemporary, setAddingTemporary] = useState(false);

  useEffect(() => {
    if (!open) {
      setAddingId(null);
      setAddedIds([]);
    }
  }, [open]);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const users = await api.searchUsers(search);
      setResults(users);
    } catch (err) {
      message.error(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (userId) => {
    setAddingId(userId);
    try {
      await api.addMember(ledgerId, userId, '');
      setAddedIds(prev => [...new Set([...prev, userId])]);
      message.success('添加成功');
      onSuccess();
    } catch (err) {
      message.error(err.message);
    } finally {
      setAddingId(null);
    }
  };

  const handleAddTemporary = async () => {
    const name = temporaryName.trim();
    if (!name) {
      message.warning('请输入临时成员名称');
      return;
    }
    setAddingTemporary(true);
    try {
      await api.addTemporaryMember(ledgerId, name);
      message.success('临时成员添加成功');
      setTemporaryName('');
      onSuccess();
    } catch (err) {
      message.error(err.message);
    } finally {
      setAddingTemporary(false);
    }
  };

  return (
    <Modal title="添加成员" open={open} onCancel={onCancel} footer={null} width={500}>
      <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
        <Input placeholder="搜索邮箱或用户名" value={search} onChange={(e) => setSearch(e.target.value)} onPressEnter={handleSearch} />
        <Button type="primary" loading={searching} onClick={handleSearch}>搜索</Button>
      </Space.Compact>
      <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
        <Input placeholder="临时成员名称" value={temporaryName} onChange={(e) => setTemporaryName(e.target.value)} onPressEnter={handleAddTemporary} />
        <Button loading={addingTemporary} onClick={handleAddTemporary}>添加临时成员</Button>
      </Space.Compact>
      <List
        dataSource={results}
        renderItem={(user) => {
          const isAdded = existingIds.includes(user.id) || addedIds.includes(user.id);
          return (
            <List.Item actions={[
              <Button
                key="add"
                type="primary"
                size="small"
                disabled={isAdded}
                loading={addingId === user.id}
                onClick={() => handleAdd(user.id)}
              >
                {isAdded ? '已添加' : '添加'}
              </Button>
            ]}>
              <List.Item.Meta
                avatar={<Avatar src={user.avatar_url}>{getUserInitial(user)}</Avatar>}
                title={getUserDisplayName(user)}
                description={user.email}
              />
            </List.Item>
          );
        }}
        locale={{ emptyText: '搜索用户' }}
      />
    </Modal>
  );
}

function CreateExpenseModal({ open, onCancel, ledgerId, members, onSuccess }) {
  const [form] = Form.useForm();
  const [splitType, setSplitType] = useState('equal');
  const [splits, setSplits] = useState([]);
  const [loading, setLoading] = useState(false);

  const amount = Form.useWatch('amount', form);
  const membersList = useMemo(() => (members || []).filter(m => m.user_id), [members]);

  const buildEqualSplits = useCallback((value) => {
    if (!value || membersList.length === 0) return [];
    const totalCents = Math.round(Number(value) * 100);
    const baseCents = Math.floor(totalCents / membersList.length);
    let remainder = totalCents - baseCents * membersList.length;

    return membersList.map((m) => {
      const extraCent = remainder > 0 ? 1 : 0;
      const cents = baseCents + extraCent;
      remainder -= extraCent;
      return { userId: m.user_id, amount: cents / 100 };
    });
  }, [membersList]);

  useEffect(() => {
    if (amount && membersList.length > 0 && splitType === 'equal') {
      setSplits(buildEqualSplits(amount));
    }
  }, [amount, membersList, splitType, buildEqualSplits]);

  const handleAmountChange = (value) => {
    if (splitType === 'equal' && value && membersList.length > 0) {
      setSplits(buildEqualSplits(value));
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await api.createExpense(ledgerId, {
        title: values.title,
        total_amount: parseFloat(values.amount),
        payer_id: values.payer_id,
        expense_date: values.date.format('YYYY-MM-DD'),
        note: values.description,
        splits: splitType === 'equal' 
          ? splits.map(s => ({ user_id: s.userId, amount: s.amount }))
          : values.splits,
      });
      message.success('添加成功');
      onSuccess();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="添加支出" open={open} onCancel={onCancel} onOk={handleSubmit} confirmLoading={loading} width={600}>
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="标题" rules={[{ required: true }]}>
          <Input placeholder="如：午餐" />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="amount" label="金额" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} step={0.01} prefix="¥" onChange={handleAmountChange} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="date" label="日期" rules={[{ required: true }]} initialValue={dayjs()}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="payer_id" label="付款人" rules={[{ required: true }]}>
          <Select placeholder="选择付款人">
            {membersList.map(m => <Select.Option key={m.user_id} value={m.user_id}>{m.nickname || m.user?.display_name || m.user?.email}</Select.Option>)}
          </Select>
        </Form.Item>
        <Form.Item name="description" label="说明">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="分摊方式">
          <Select value={splitType} onChange={setSplitType} style={{ width: 200 }}>
            <Select.Option value="equal">平均分摊</Select.Option>
            <Select.Option value="exact">按金额</Select.Option>
          </Select>
        </Form.Item>
        {splitType !== 'equal' && (
          <Form.Item label="分摊明细">
            {membersList.map((m, idx) => (
              <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 120 }}>{m.nickname || m.user?.display_name || m.user?.email}</span>
                <Form.Item noStyle name={['splits', idx, 'amount']} initialValue={0}>
                  <InputNumber min={0} step={0.01} prefix="¥" style={{ width: 120 }} />
                </Form.Item>
                <Form.Item noStyle name={['splits', idx, 'user_id']} hidden initialValue={m.user_id} />
              </div>
            ))}
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}

function CreateSettlementModal({ open, onCancel, ledgerId, members, onSuccess }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const registeredMembers = (members || []).filter(m => m.user_id);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await api.createSettlement(ledgerId, values.from_user_id, values.to_user_id, parseFloat(values.amount), values.note);
      message.success('结算成功');
      onSuccess();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="添加结算" open={open} onCancel={onCancel} onOk={handleSubmit} confirmLoading={loading}>
      <Form form={form} layout="vertical">
        <Form.Item name="from_user_id" label="付款人" rules={[{ required: true }]}>
          <Select placeholder="选择付款人">
            {registeredMembers.map(m => <Select.Option key={m.user_id} value={m.user_id}>{m.nickname || m.user?.display_name || m.user?.email}</Select.Option>)}
          </Select>
        </Form.Item>
        <Form.Item name="to_user_id" label="收款人" rules={[{ required: true }]}>
          <Select placeholder="选择收款人">
            {registeredMembers.map(m => <Select.Option key={m.user_id} value={m.user_id}>{m.nickname || m.user?.display_name || m.user?.email}</Select.Option>)}
          </Select>
        </Form.Item>
        <Form.Item name="amount" label="金额" rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} min={0} step={0.01} prefix="¥" />
        </Form.Item>
        <Form.Item name="note" label="说明">
          <Input placeholder="如：还饭钱" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function ExportPreviewModal({ open, onCancel, ledger, members, expenses, settlements, onExport }) {
  // 计算统计数据
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.total_amount), 0);

  return (
    <Modal
      title="导出预览"
      open={open}
      onCancel={onCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={onCancel}>取消</Button>,
        <Button key="export" type="primary" onClick={onExport}>确认导出</Button>
      ]}
    >
      <div id="export-preview" style={{ padding: '24px', background: '#fff', minHeight: '400px' }}>
        {/* 头部 */}
        <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid #1890ff', paddingBottom: '16px' }}>
          <h1 style={{ margin: 0, color: '#1890ff', fontSize: '24px' }}>{ledger.name}</h1>
          <p style={{ margin: '8px 0 0', color: '#666' }}>账本汇总</p>
        </div>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col span={8}>
            <div style={{ textAlign: 'center', padding: '16px', background: '#f0f5ff', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>总支出</div>
              <div style={{ fontSize: '24px', color: '#1890ff', fontWeight: 'bold' }}>¥{totalExpenses.toFixed(2)}</div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center', padding: '16px', background: '#f6ffed', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>参与人数</div>
              <div style={{ fontSize: '24px', color: '#52c41a', fontWeight: 'bold' }}>{members.length}</div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center', padding: '16px', background: '#fff7e6', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>支出记录</div>
              <div style={{ fontSize: '24px', color: '#fa8c16', fontWeight: 'bold' }}>{expenses.length}</div>
            </div>
          </Col>
        </Row>

        {/* 成员列表 */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', color: '#333', borderLeft: '3px solid #1890ff', paddingLeft: '8px', marginBottom: '12px' }}>参与成员</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {members.map(m => (
              <Tag key={m.id || m.user_id} color={m.is_temporary ? 'orange' : 'blue'} style={{ padding: '4px 12px' }}>
                {m.nickname || m.user?.display_name || m.user?.email}
              </Tag>
            ))}
          </div>
        </div>

        {/* 结算建议 */}
        {settlements.length > 0 && (
            <div>
              <h3 style={{ fontSize: '14px', color: '#333', borderLeft: '3px solid #722ed1', paddingLeft: '8px', marginBottom: '12px' }}>结算建议</h3>
              <Table
                  size="small"
                  dataSource={settlements}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    { title: '付款人', render: (_, r) => r.from_user_name },
                    { title: '收款人', render: (_, r) => r.to_user_name },
                    { title: '金额', render: (_, r) => `¥${Number(r.amount).toFixed(2)}` },
                  ]}
              />
            </div>
        )}

        {/* 支出明细 */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', color: '#333', borderLeft: '3px solid #52c41a', paddingLeft: '8px', marginBottom: '12px' }}>支出明细</h3>
          <Table
            size="small"
            dataSource={expenses}
            rowKey="id"
            pagination={false}
            columns={[
              { title: '标题', dataIndex: 'title', render: (t) => t || '未命名' },
              { title: '金额', dataIndex: 'total_amount', render: (v) => `¥${Number(v).toFixed(2)}` },
              { title: '付款人', render: (_, r) => r.payer?.display_name || r.payer?.email || '-' },
              { title: '状态', dataIndex: 'status', render: (s) => s === 'confirmed' ? '已确认' : s === 'rejected' ? '已拒绝' : '待确认' },
            ]}
          />
        </div>

        {/* 底部 */}
        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #eee', color: '#999', fontSize: '12px' }}>
          生成于 {dayjs().format('YYYY-MM-DD HH:mm:ss')}
        </div>
      </div>
    </Modal>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f0f2f5',
    padding: '24px',
  },
  mainCard: {
    maxWidth: 1200,
    margin: '0 auto',
    borderRadius: '8px',
  },
  createForm: {
    marginBottom: '24px',
  },
  loading: {
    textAlign: 'center',
    padding: '48px',
    color: '#999',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  ledgerCard: {
    cursor: 'pointer',
    borderRadius: '8px',
  },
  cardActions: {
    marginTop: '12px',
    display: 'flex',
    justifyContent: 'space-between',
  },
};
