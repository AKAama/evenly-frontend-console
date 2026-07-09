import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { Card, Row, Col, Button, Modal, Form, Input, Select, DatePicker, Table, Tag, message, Popconfirm, Space, Avatar, List, InputNumber, Tabs, Tooltip, Divider, Badge, Alert } from 'antd';
import { PlusOutlined, UserAddOutlined, DollarOutlined, SwapOutlined, LogoutOutlined, ArrowLeftOutlined, ReloadOutlined, ExportOutlined, UserOutlined, CameraOutlined, LockOutlined, CheckOutlined, CloseOutlined, DeleteOutlined, UserDeleteOutlined, AudioOutlined } from '@ant-design/icons';
import html2canvas from 'html2canvas';
import dayjs from 'dayjs';

export function Dashboard({ onLogout }) {
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [respondingInvitationId, setRespondingInvitationId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadHome();
  }, []);

  const loadHome = async () => {
    setLoading(true);
    await Promise.all([loadLedgers(), loadInvitations(), loadCurrentUser()]);
    setLoading(false);
  };

  const loadCurrentUser = async () => {
    try {
      setCurrentUser(await api.getMe());
    } catch (err) {
      message.error(err.message);
    }
  };

  const loadLedgers = async () => {
    try {
      const data = await api.getLedgers();
      setLedgers(data);
    } catch (err) {
      message.error(err.message);
    } finally {}
  };

  const loadInvitations = async () => {
    try {
      const data = await api.getPendingInvitations();
      setInvitations(data);
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleInvitation = async (invitationId, accept) => {
    setRespondingInvitationId(invitationId);
    try {
      if (accept) await api.acceptInvitation(invitationId);
      else await api.rejectInvitation(invitationId);
      message.success(accept ? '已加入账本' : '已拒绝邀请');
      setInvitations((items) => items.filter((item) => item.id !== invitationId));
      if (accept) await loadLedgers();
    } catch (err) {
      message.error(err.message);
    } finally {
      setRespondingInvitationId(null);
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

  const handleLeaveLedger = async (id) => {
    try {
      await api.leaveLedger(id);
      message.success('已退出账本');
      await loadLedgers();
      if (selectedLedger?.id === id) setSelectedLedger(null);
    } catch (err) {
      message.error(err.message);
    }
  };

  if (selectedLedger) {
    return (
      <LedgerDetail
        ledger={selectedLedger}
        onBack={() => setSelectedLedger(null)}
        onRefresh={loadLedgers}
        onLeave={() => handleLeaveLedger(selectedLedger.id)}
      />
    );
  }

  return (
    <div style={styles.container}>
      <Card title="我的账本" extra={
        <Space>
          <Button icon={<UserOutlined />} onClick={() => setProfileOpen(true)}>个人中心</Button>
          <Button icon={<LogoutOutlined />} onClick={onLogout}>退出</Button>
        </Space>
      } style={styles.mainCard}>
        {invitations.length > 0 && (
          <Card
            size="small"
            title={<Space><Badge count={invitations.length} /><span>待处理邀请</span></Space>}
            style={{ marginBottom: 16 }}
          >
            <List
              dataSource={invitations}
              renderItem={(invitation) => (
                <List.Item
                  actions={[
                    <Button
                      key="reject"
                      icon={<CloseOutlined />}
                      disabled={respondingInvitationId === invitation.id}
                      onClick={() => handleInvitation(invitation.id, false)}
                    >
                      拒绝
                    </Button>,
                    <Button
                      key="accept"
                      type="primary"
                      icon={<CheckOutlined />}
                      loading={respondingInvitationId === invitation.id}
                      onClick={() => handleInvitation(invitation.id, true)}
                    >
                      接受
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar>{invitation.ledger_name?.[0] || '?'}</Avatar>}
                    title={invitation.ledger_name}
                    description={`${invitation.invited_by_name} 邀请你加入`}
                  />
                </List.Item>
              )}
            />
          </Card>
        )}

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
                    {currentUser?.id === ledger.owner_id ? (
                      <Popconfirm title="确定删除这个账本吗？" onConfirm={(e) => { e?.stopPropagation(); handleDeleteLedger(ledger.id); }}>
                        <Button type="link" danger size="small" onClick={(e) => e.stopPropagation()}>删除</Button>
                      </Popconfirm>
                    ) : (
                      <Popconfirm title="确定退出这个账本吗？" onConfirm={(e) => { e?.stopPropagation(); handleLeaveLedger(ledger.id); }}>
                        <Button type="link" danger size="small" onClick={(e) => e.stopPropagation()}>退出</Button>
                      </Popconfirm>
                    )}
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

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} onAccountDeleted={onLogout} />
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
const getMemberName = (member) => member?.nickname || member?.temporary_name || member?.user?.display_name || member?.user?.email || '成员';
const getMemberId = (member) => member?.id || member?.user_id;

const expensePresets = [
  { category: '餐饮', items: ['早餐', '午餐', '晚餐'] },
  { category: '交通', items: ['打车', '高铁'] },
  { category: '住宿', items: ['酒店', '民宿'] },
];

const VOICE_SAMPLE_RATE = 16000;

const downsampleBuffer = (buffer, inputRate, outputRate = VOICE_SAMPLE_RATE) => {
  if (inputRate === outputRate) return buffer;
  const ratio = inputRate / outputRate;
  const outputLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(outputLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
      accum += buffer[i];
      count += 1;
    }
    result[offsetResult] = count ? accum / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
};

const floatTo16BitPCM = (input) => {
  const output = new ArrayBuffer(input.length * 2);
  const view = new DataView(output);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return output;
};

const buildSplitsByDraft = (draft, fallbackMembers) => {
  const draftSplits = draft?.splits || [];
  if (draftSplits.length > 0) {
    return draftSplits.map((split) => ({
      memberId: split.member_id,
      amount: Number(split.amount || 0),
    }));
  }

  const amount = Number(draft?.total_amount || draft?.amount || 0);
  if (!amount || fallbackMembers.length === 0) return [];
  const totalCents = Math.round(amount * 100);
  const baseCents = Math.floor(totalCents / fallbackMembers.length);
  let remainder = totalCents - baseCents * fallbackMembers.length;
  return fallbackMembers.map((member) => {
    const extraCent = remainder > 0 ? 1 : 0;
    remainder -= extraCent;
    return {
      memberId: getMemberId(member),
      amount: (baseCents + extraCent) / 100,
    };
  });
};

function ProfileModal({ open, onClose, onAccountDeleted }) {
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

  const handleDeleteAccount = async () => {
    try {
      setSaving(true);
      await api.deleteAccount();
      message.success('账户已删除');
      onAccountDeleted?.();
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
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
	                <Divider />
	                <Popconfirm
	                  title="永久删除账户？"
	                  description="个人资料、拥有的账本及关联记录将永久删除，且无法恢复。"
	                  okText="永久删除"
	                  cancelText="取消"
	                  okButtonProps={{ danger: true, loading: saving }}
	                  onConfirm={handleDeleteAccount}
	                >
	                  <Button danger icon={<DeleteOutlined />} block>删除账户</Button>
	                </Popconfirm>
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

function LedgerDetail({ ledger, onBack, onRefresh, onLeave }) {
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [settlementHistory, setSettlementHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('expenses');
  const [currentUser, setCurrentUser] = useState(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [createExpenseOpen, setCreateExpenseOpen] = useState(false);
  const [voiceExpenseOpen, setVoiceExpenseOpen] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState(null);
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

  const handleDeleteExpense = async (expenseId) => {
    try {
      await api.deleteExpense(expenseId);
      message.success('账单已删除');
      await loadData();
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await api.removeMember(ledger.id, memberId);
      message.success('成员已移除');
      await loadData();
      onRefresh?.();
    } catch (err) {
      message.error(err.message);
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
        const splitUserIds = r.splits?.map(s => s.user_id) || [];
        const hasConfirmed = r.confirmations?.some(c => c.user_id === currentUser?.id);
        const canRespond = r.status === 'pending' && splitUserIds.includes(currentUser?.id) && !hasConfirmed;
        const canDelete = currentUser?.id === r.created_by || currentUser?.id === ledger.owner_id;

        if (!canRespond && !canDelete) return hasConfirmed ? '已响应' : '-';

        return (
          <Space>
            {canRespond && (
              <>
                <Button type="link" size="small" onClick={() => handleConfirmExpense(r.id, 'confirmed')}>确认</Button>
                <Button type="link" danger size="small" onClick={() => handleConfirmExpense(r.id, 'rejected')}>拒绝</Button>
              </>
            )}
            {canDelete && (
              <Popconfirm title="确定删除这笔账单吗？" onConfirm={() => handleDeleteExpense(r.id)}>
                <Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label="删除账单" />
              </Popconfirm>
            )}
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
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => status === 'pending'
        ? <Tag color="gold">等待接受</Tag>
        : <Tag color="green">已加入</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, r) => {
        const canRemove = currentUser?.id === ledger.owner_id && r.user_id !== ledger.owner_id;
        if (!canRemove) return '-';
        return (
          <Popconfirm
            title={`确定移除 ${r.nickname || r.temporary_name || r.user?.display_name || '该成员'} 吗？`}
            description="仍有未结清余额的成员无法移除。"
            onConfirm={() => handleRemoveMember(r.id || r.user_id)}
          >
            <Button type="text" danger size="small" icon={<UserDeleteOutlined />} aria-label="移除成员" />
          </Popconfirm>
        );
      },
    },
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
        extra={<Space><Button icon={<ExportOutlined />} onClick={handleExportImage}>导出</Button><Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>{currentUser?.id !== ledger.owner_id && <Popconfirm title="确定退出这个账本吗？" description="存在未结清余额时无法退出。" onConfirm={onLeave}><Button danger>退出账本</Button></Popconfirm>}</Space>}
        style={styles.mainCard}
      >
        <Card type="inner" extra={
          <Space wrap>
            {currentUser?.id === ledger.owner_id && (
              <Button icon={<UserAddOutlined />} onClick={() => setAddMemberOpen(true)}>邀请成员</Button>
            )}
            <Button icon={<AudioOutlined />} onClick={() => setVoiceExpenseOpen(true)}>语音记账</Button>
            <Button
              type="primary"
              icon={<DollarOutlined />}
              onClick={() => {
                setVoiceDraft(null);
                setCreateExpenseOpen(true);
              }}
            >
              添加支出
            </Button>
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
        onCancel={() => {
          setCreateExpenseOpen(false);
          setVoiceDraft(null);
        }}
        ledgerId={ledger.id}
        members={members}
        initialDraft={voiceDraft}
        onSuccess={() => { setCreateExpenseOpen(false); setVoiceDraft(null); loadData(); }}
      />

      <VoiceExpenseModal
        open={voiceExpenseOpen}
        ledgerId={ledger.id}
        onCancel={() => setVoiceExpenseOpen(false)}
        onDraft={(draft) => {
          setVoiceDraft(draft);
          setVoiceExpenseOpen(false);
          setCreateExpenseOpen(true);
        }}
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
      message.success('邀请已发送');
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
    <Modal title="邀请成员" open={open} onCancel={onCancel} footer={null} width={500}>
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
                {isAdded ? '已邀请' : '邀请'}
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

function CreateExpenseModal({ open, onCancel, ledgerId, members, initialDraft, onSuccess }) {
  const [form] = Form.useForm();
  const [splitType, setSplitType] = useState('equal');
  const [splits, setSplits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  const amount = Form.useWatch('amount', form);
  const activeMembers = useMemo(
    () => (members || []).filter((member) => !member.status || member.status === 'active'),
    [members]
  );
  const registeredMembers = useMemo(() => activeMembers.filter((member) => member.user_id), [activeMembers]);
  const selectedMembers = useMemo(
    () => activeMembers.filter((member) => selectedMemberIds.includes(getMemberId(member))),
    [activeMembers, selectedMemberIds]
  );

  const buildEqualSplits = useCallback((value, targetMembers = selectedMembers) => {
    if (!value || targetMembers.length === 0) return [];
    const totalCents = Math.round(Number(value) * 100);
    const baseCents = Math.floor(totalCents / targetMembers.length);
    let remainder = totalCents - baseCents * targetMembers.length;

    return targetMembers.map((member) => {
      const extraCent = remainder > 0 ? 1 : 0;
      const cents = baseCents + extraCent;
      remainder -= extraCent;
      return { memberId: getMemberId(member), amount: cents / 100 };
    });
  }, [selectedMembers]);

  useEffect(() => {
    if (!open) return;
    const initialMemberIds = initialDraft?.participant_member_ids?.length
      ? initialDraft.participant_member_ids
      : activeMembers.map(getMemberId).filter(Boolean);
    const draftMembers = activeMembers.filter((member) => initialMemberIds.includes(getMemberId(member)));
    const draftAmount = Number(initialDraft?.total_amount || initialDraft?.amount || 0) || undefined;
    const draftSplitType = initialDraft?.split_type === 'exact' ? 'exact' : 'equal';
    const draftSplits = initialDraft
      ? buildSplitsByDraft(initialDraft, draftMembers)
      : [];

    setSelectedMemberIds(initialMemberIds);
    setSplitType(draftSplitType);
    setSplits(draftSplits);
    form.resetFields();
    form.setFieldsValue({
      title: initialDraft?.title,
      amount: draftAmount,
      date: initialDraft?.expense_date ? dayjs(initialDraft.expense_date) : dayjs(),
      payer_id: initialDraft?.payer_user_id,
      participants: initialMemberIds,
      description: initialDraft?.note || initialDraft?.transcript,
    });
  }, [open, activeMembers, form, initialDraft]);

  useEffect(() => {
    if (amount && selectedMembers.length > 0 && splitType === 'equal') {
      setSplits(buildEqualSplits(amount));
    }
  }, [amount, selectedMembers, splitType, buildEqualSplits]);

  const handleAmountChange = (value) => {
    if (splitType === 'equal' && value && selectedMembers.length > 0) {
      setSplits(buildEqualSplits(value));
    }
  };

  const handleParticipantsChange = (memberIds) => {
    setSelectedMemberIds(memberIds);
    const payerId = form.getFieldValue('payer_id');
    const payerMember = registeredMembers.find((member) => member.user_id === payerId);
    if (payerMember && !memberIds.includes(getMemberId(payerMember))) {
      form.setFieldValue('payer_id', undefined);
    }
  };

  const handlePayerChange = (userId) => {
    const payerMember = registeredMembers.find((member) => member.user_id === userId);
    const memberId = getMemberId(payerMember);
    if (memberId && !selectedMemberIds.includes(memberId)) {
      const nextIds = [...selectedMemberIds, memberId];
      setSelectedMemberIds(nextIds);
      form.setFieldValue('participants', nextIds);
    }
  };

  const updateExactSplit = (memberId, value) => {
    setSplits((current) => [
      ...current.filter((split) => split.memberId !== memberId),
      { memberId, amount: Number(value || 0) },
    ]);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (selectedMembers.length === 0) {
        message.error('请至少选择一位参与人');
        return;
      }

      const payerMember = registeredMembers.find((member) => member.user_id === values.payer_id);
      if (!payerMember || !selectedMemberIds.includes(getMemberId(payerMember))) {
        message.error('付款人必须同时参与这笔账单');
        return;
      }

      const resolvedSplits = splitType === 'equal' ? buildEqualSplits(values.amount) : splits;
      const splitTotal = resolvedSplits.reduce((sum, split) => sum + Number(split.amount || 0), 0);
      if (resolvedSplits.some((split) => split.amount <= 0) || Math.abs(splitTotal - Number(values.amount)) > 0.005) {
        message.error('分摊金额必须大于 0，且总和需要等于账单金额');
        return;
      }

      setLoading(true);
      await api.createExpense(ledgerId, {
        title: values.title,
        total_amount: parseFloat(values.amount),
        payer_id: values.payer_id,
        expense_date: values.date.format('YYYY-MM-DD'),
        note: values.description,
        splits: selectedMembers.map((member) => {
          const split = resolvedSplits.find((item) => item.memberId === getMemberId(member));
          return {
            user_id: member.user_id || null,
            member_id: getMemberId(member),
            amount: split?.amount,
          };
        }),
      });
      message.success('添加成功');
      form.resetFields();
      onSuccess();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="添加账单" open={open} onCancel={onCancel} onOk={handleSubmit} confirmLoading={loading} width={680} okText="添加账单">
      <Form form={form} layout="vertical">
        <Form.Item label="快捷类别">
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {expensePresets.map((group) => (
              <Space key={group.category} wrap>
                <Tag color="blue">{group.category}</Tag>
                {group.items.map((item) => (
                  <Button key={item} size="small" onClick={() => form.setFieldValue('title', item)}>{item}</Button>
                ))}
              </Space>
            ))}
          </Space>
        </Form.Item>
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
          <Select placeholder="选择付款人" onChange={handlePayerChange}>
            {registeredMembers.map((member) => (
              <Select.Option key={member.user_id} value={member.user_id}>{getMemberName(member)}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="participants" label="参与人" rules={[{ required: true, message: '请至少选择一位参与人' }]}>
          <Select mode="multiple" placeholder="选择参与人" value={selectedMemberIds} onChange={handleParticipantsChange} optionFilterProp="label">
            {activeMembers.map((member) => (
              <Select.Option key={getMemberId(member)} value={getMemberId(member)} label={getMemberName(member)}>
                <Space>
                  <Avatar size={24} src={member.user?.avatar_url}>{getMemberName(member)[0]}</Avatar>
                  <span>{getMemberName(member)}</span>
                  {member.is_temporary && <Tag>临时</Tag>}
                </Space>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="description" label="说明">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="分摊方式">
          <Select
            value={splitType}
            onChange={(value) => {
              setSplitType(value);
              if (value === 'exact') setSplits(buildEqualSplits(amount));
            }}
            style={{ width: 200 }}
          >
            <Select.Option value="equal">平均分摊</Select.Option>
            <Select.Option value="exact">按金额</Select.Option>
          </Select>
        </Form.Item>
        {splitType !== 'equal' && (
          <Form.Item label="分摊明细">
            {selectedMembers.map((member) => (
              <div key={getMemberId(member)} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ flex: 1 }}>{getMemberName(member)}</span>
                <InputNumber
                  min={0.01}
                  step={0.01}
                  prefix="¥"
                  style={{ width: 150 }}
                  value={splits.find((split) => split.memberId === getMemberId(member))?.amount}
                  onChange={(value) => updateExactSplit(getMemberId(member), value)}
                />
              </div>
            ))}
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}

function VoiceExpenseModal({ open, ledgerId, onCancel, onDraft }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const processorRef = useRef(null);
  const sinkRef = useRef(null);

  const cleanupAudio = useCallback(() => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    sinkRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    audioContextRef.current?.close?.();
    processorRef.current = null;
    sourceRef.current = null;
    sinkRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
  }, []);

  const resetSession = useCallback(() => {
    cleanupAudio();
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
    setRecording(false);
    setProcessing(false);
    setPartialText('');
    setFinalText('');
    setDraft(null);
    setError('');
  }, [cleanupAudio]);

  useEffect(() => {
    if (!open) resetSession();
    return () => resetSession();
  }, [open, resetSession]);

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('当前浏览器不支持麦克风录音');
      return;
    }

    resetSession();
    setError('');
    setProcessing(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const sink = audioContext.createGain();
      const ws = new WebSocket(api.voiceExpenseSessionUrl(ledgerId));

      sink.gain.value = 0;
      streamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceRef.current = source;
      processorRef.current = processor;
      sinkRef.current = sink;
      wsRef.current = ws;

      ws.binaryType = 'arraybuffer';
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'start',
          audio: {
            format: 'pcm_s16le',
            sample_rate: VOICE_SAMPLE_RATE,
            channels: 1,
          },
        }));
        source.connect(processor);
        processor.connect(sink);
        sink.connect(audioContext.destination);
        setRecording(true);
      };

      processor.onaudioprocess = (event) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const input = event.inputBuffer.getChannelData(0);
        const downsampled = downsampleBuffer(input, audioContext.sampleRate);
        ws.send(floatTo16BitPCM(downsampled));
      };

      ws.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (payload.type === 'ready') return;
        if (payload.type === 'partial_transcript') {
          setPartialText(payload.text || '');
          return;
        }
        if (payload.type === 'final_transcript') {
          setPartialText('');
          setFinalText((current) => [current, payload.text].filter(Boolean).join(' '));
          return;
        }
        if (payload.type === 'draft') {
          setDraft(payload.data);
          setProcessing(false);
          setRecording(false);
          cleanupAudio();
          return;
        }
        if (payload.type === 'error') {
          setError(payload.message || '语音识别失败');
          setProcessing(false);
          setRecording(false);
          cleanupAudio();
        }
      };

      ws.onerror = () => {
        setError('语音服务连接失败');
        setProcessing(false);
        setRecording(false);
        cleanupAudio();
      };

      ws.onclose = () => {
        setRecording(false);
      };
    } catch (err) {
      setError(err.message || '无法启动麦克风');
      cleanupAudio();
    }
  };

  const stopRecording = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
      setProcessing(true);
    }
    setRecording(false);
    cleanupAudio();
  };

  const handleCancel = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cancel' }));
    }
    resetSession();
    onCancel();
  };

  const transcriptText = [finalText, partialText].filter(Boolean).join(' ');

  return (
    <Modal
      title="语音记账"
      open={open}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>关闭</Button>,
        recording ? (
          <Button key="stop" danger type="primary" icon={<AudioOutlined />} onClick={stopRecording}>
            停止并解析
          </Button>
        ) : (
          <Button key="start" type="primary" icon={<AudioOutlined />} onClick={startRecording} disabled={processing}>
            开始录音
          </Button>
        ),
        <Button
          key="use"
          type="primary"
          disabled={!draft}
          onClick={() => onDraft(draft)}
        >
          使用草稿
        </Button>,
      ]}
      width={640}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {error && <Alert type="error" message={error} showIcon />}
        {recording && <Alert type="info" message="正在录音，讲话结束后点击停止并解析。" showIcon />}
        {processing && <Alert type="warning" message="正在生成账单草稿..." showIcon />}

        <Card size="small" title="实时识别">
          <div style={{ minHeight: 72, color: transcriptText ? '#111827' : '#8c8c8c', lineHeight: 1.7 }}>
            {transcriptText || '点击开始录音后，这里会显示识别到的内容。'}
          </div>
        </Card>

        {draft && (
          <Card size="small" title="账单草稿">
            <Space direction="vertical" size={8}>
              <div><strong>{draft.title}</strong> · ¥{draft.total_amount || draft.amount}</div>
              <div>付款人：{draft.payer_user_id}</div>
              <div>参与人数：{draft.participant_member_ids?.length || 0} · 分摊方式：{draft.split_type === 'exact' ? '按金额' : '平均分摊'}</div>
              {draft.confirmation_text && <div style={{ color: '#6b7280' }}>{draft.confirmation_text}</div>}
            </Space>
          </Card>
        )}
      </Space>
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
