import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import {
  Card,
  Table,
  Input,
  Select,
  Space,
  Tag,
  Button,
  Drawer,
  Descriptions,
  List,
  message,
  Modal,
  Form,
  Typography,
  Alert,
} from 'antd';
import { ReloadOutlined, SearchOutlined, KeyOutlined, CopyOutlined } from '@ant-design/icons';

const { Text } = Typography;

const fallbackColor = (key, color) => color || ({
  founder: 'gold',
  crew: 'blue',
  mate: 'orange',
  beta: 'purple',
  vip: 'magenta',
}[key] || 'blue');

function randomPassword(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < len; i += 1) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

export function AdminUsersPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [accountKind, setAccountKind] = useState(undefined);
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [badgeOptions, setBadgeOptions] = useState([]);
  const [savingBadge, setSavingBadge] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [lastResetPassword, setLastResetPassword] = useState(null);
  const [pwdForm] = Form.useForm();
  const [deactivating, setDeactivating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminListUsers({ q: q || undefined, account_kind: accountKind, limit: 200 });
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      message.error(err.message || '加载用户失败');
    } finally {
      setLoading(false);
    }
  }, [q, accountKind]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.adminListBadges();
        setBadgeOptions(data.items || []);
      } catch {
        // non-blocking
      }
    })();
  }, []);

  const openDetail = async (userId) => {
    try {
      const data = await api.adminGetUser(userId);
      setDetail(data);
      setDetailOpen(true);
    } catch (err) {
      message.error(err.message || '加载用户详情失败');
    }
  };

  const setBadge = async (badge) => {
    if (!detail?.user?.id) return;
    setSavingBadge(true);
    try {
      const updated = await api.adminSetUserBadge(detail.user.id, badge);
      setDetail((prev) => (prev ? { ...prev, user: { ...prev.user, ...updated } } : prev));
      setRows((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, badge: updated.badge, badge_label: updated.badge_label } : r))
      );
      message.success(badge ? `已设置铭牌：${updated.badge_label || badge}` : '已清除铭牌');
    } catch (err) {
      message.error(err.message || '设置铭牌失败');
    } finally {
      setSavingBadge(false);
    }
  };

  const openResetPassword = () => {
    setLastResetPassword(null);
    pwdForm.resetFields();
    const generated = randomPassword(10);
    pwdForm.setFieldsValue({ new_password: generated, confirm_password: generated });
    setPwdOpen(true);
  };

  const submitResetPassword = async () => {
    if (!detail?.user?.id) return;
    try {
      const values = await pwdForm.validateFields();
      if (values.new_password !== values.confirm_password) {
        message.error('两次输入的密码不一致');
        return;
      }
      setPwdSaving(true);
      await api.adminResetUserPassword(detail.user.id, values.new_password);
      setLastResetPassword(values.new_password);
      message.success('密码已重置，请把新密码告知用户');
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.message || '重置失败');
    } finally {
      setPwdSaving(false);
    }
  };

  const copyPassword = async () => {
    if (!lastResetPassword) return;
    try {
      await navigator.clipboard.writeText(lastResetPassword);
      message.success('已复制新密码');
    } catch {
      message.warning('复制失败，请手动选中复制');
    }
  };

  const confirmDeactivate = () => {
    if (!detail?.user?.id) return;
    if (detail.user.status === 'deactivated') {
      message.info('该账号已注销');
      return;
    }
    Modal.confirm({
      title: '注销此账号？',
      content: (
        <div>
          <p>
            将注销 <strong>{detail.user.public_display_name || detail.user.display_name || detail.user.username}</strong>
            。对方无法再登录；账单历史保留。
          </p>
          <p style={{ color: '#666', fontSize: 13 }}>
            其作为 Owner 的账本：有其他成员则自动移交给最早加入者；仅自己则归档为悬空账本。
          </p>
        </div>
      ),
      okText: '确认注销',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setDeactivating(true);
        try {
          const res = await api.adminDeactivateUser(detail.user.id);
          const lines = (res.transfers || []).map((t) => {
            if (t.action === 'transfer' && t.new_owner) {
              return `「${t.ledger_name}」→ ${t.new_owner.display_name}`;
            }
            if (t.action === 'archive') {
              return `「${t.ledger_name}」已归档`;
            }
            return `「${t.ledger_name}」${t.action}`;
          });
          Modal.info({
            title: '注销完成',
            content: (
              <div>
                <p>请将下列结果告知相关成员（如有需要）：</p>
                <ul>
                  {lines.length ? lines.map((l) => <li key={l}>{l}</li>) : <li>无账本移交/归档</li>}
                </ul>
              </div>
            ),
          });
          setDetailOpen(false);
          load();
        } catch (err) {
          message.error(err.message || '注销失败');
          throw err;
        } finally {
          setDeactivating(false);
        }
      },
    });
  };

  const columns = [
    {
      title: '用户',
      key: 'user',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{r.public_display_name || r.display_name || r.username}</span>
            {r.badge_label && r.status !== 'deactivated' && (
              <Tag color={fallbackColor(r.badge, r.badge_color)} style={{ marginInlineEnd: 0 }}>
                {r.badge_label}
              </Tag>
            )}
            {r.status === 'deactivated' && <Tag>已注销</Tag>}
          </div>
          <div style={{ color: '#888', fontSize: 12 }}>@{r.username}</div>
        </div>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      render: (e, r) => (r.status === 'deactivated' ? <span style={{ color: '#bbb' }}>—</span> : e),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s) =>
        s === 'deactivated' ? <Tag>已注销</Tag> : <Tag color="green">正常</Tag>,
    },
    {
      title: '类型',
      dataIndex: 'account_kind',
      width: 100,
      render: (k) =>
        k === 'platform' ? <Tag color="gold">平台</Tag> : <Tag color="blue">用户</Tag>,
    },
    {
      title: '铭牌',
      dataIndex: 'badge',
      width: 100,
      render: (b, r) =>
        r.badge_label ? (
          <Tag color={fallbackColor(b, r.badge_color)}>{r.badge_label}</Tag>
        ) : (
          <span style={{ color: '#bbb' }}>—</span>
        ),
    },
    { title: '所属账本', dataIndex: 'membership_count', width: 90 },
    { title: '拥有账本', dataIndex: 'owned_ledger_count', width: 90 },
    { title: '创建账单', dataIndex: 'expense_created_count', width: 90 },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      width: 170,
      render: (v) => (v ? new Date(v).toLocaleString() : '—'),
    },
    {
      title: '',
      width: 90,
      render: (_, r) => (
        <Button type="link" onClick={() => openDetail(r.id)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
      <Card
        title={`全部用户（${total}）`}
        extra={
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜邮箱 / 用户名"
              style={{ width: 220 }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onPressEnter={load}
            />
            <Select
              allowClear
              placeholder="账号类型"
              style={{ width: 120 }}
              value={accountKind}
              onChange={setAccountKind}
              options={[
                { value: 'app', label: '普通用户' },
                { value: 'platform', label: '平台' },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={load}>
              刷新
            </Button>
          </Space>
        }
      >
        <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={{ pageSize: 50 }} />
      </Card>

      <Drawer
        title="用户详情"
        width={520}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        extra={
          detail?.user ? (
            <Space>
              {detail.user.status !== 'deactivated' && (
                <Button danger loading={deactivating} onClick={confirmDeactivate}>
                  注销账号
                </Button>
              )}
              {detail.user.status !== 'deactivated' && (
                <Button icon={<KeyOutlined />} onClick={openResetPassword}>
                  重置密码
                </Button>
              )}
            </Space>
          ) : null
        }
      >
        {detail?.user && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="显示名">
                {detail.user.public_display_name || detail.user.display_name || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="用户名">@{detail.user.username}</Descriptions.Item>
              <Descriptions.Item label="邮箱">
                {detail.user.status === 'deactivated' ? '—' : detail.user.email}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {detail.user.status === 'deactivated' ? (
                  <Tag>已注销</Tag>
                ) : (
                  <Tag color="green">正常</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="类型">
                {detail.user.account_kind === 'platform' ? '平台账号' : '普通用户'}
              </Descriptions.Item>
              <Descriptions.Item label="铭牌">
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Select
                    allowClear
                    placeholder="无铭牌"
                    style={{ width: '100%' }}
                    loading={savingBadge}
                    value={detail.user.badge || undefined}
                    onChange={(v) => setBadge(v ?? null)}
                    options={badgeOptions.map((b) => ({
                      value: b.key,
                      label: `${b.label}${b.description ? ` — ${b.description}` : ''}`,
                    }))}
                  />
                  <div style={{ color: '#888', fontSize: 12 }}>
                    仅展示用标识，不影响分账权限。可在「铭牌管理」维护类型。
                  </div>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {detail.user.created_at ? new Date(detail.user.created_at).toLocaleString() : '—'}
              </Descriptions.Item>
            </Descriptions>
            {detail.user.status !== 'deactivated' && (
              <div style={{ marginTop: 16 }}>
                <Button block icon={<KeyOutlined />} onClick={openResetPassword}>
                  帮用户重置密码
                </Button>
                <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                  不会发邮件。重置后请把新密码私下告知用户；对方可用用户名/邮箱 + 新密码登录。
                </Text>
                <Button
                  block
                  danger
                  style={{ marginTop: 12 }}
                  loading={deactivating}
                  onClick={confirmDeactivate}
                >
                  注销此账号
                </Button>
                <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                  软注销：账单保留；Owner 账本自动移交或归档。邮箱立即释放，用户名冷却 90 天。
                </Text>
              </div>
            )}
            <h4 style={{ marginTop: 20 }}>拥有的账本</h4>
            <List
              size="small"
              dataSource={detail.owned_ledgers || []}
              locale={{ emptyText: '无' }}
              renderItem={(item) => (
                <List.Item>
                  {item.name} · 成员 {item.member_count} · 账单 {item.expense_count} · 实付 ¥
                  {Number(item.total_spend || 0).toFixed(2)}
                </List.Item>
              )}
            />
            <h4 style={{ marginTop: 16 }}>加入的账本</h4>
            <List
              size="small"
              dataSource={detail.memberships || []}
              locale={{ emptyText: '无' }}
              renderItem={(item) => (
                <List.Item>
                  {item.ledger_name || item.ledger_id} · {item.status}
                </List.Item>
              )}
            />
          </>
        )}
      </Drawer>

      <Modal
        title={
          detail?.user
            ? `重置密码 · ${detail.user.display_name || detail.user.username}`
            : '重置密码'
        }
        open={pwdOpen}
        onCancel={() => setPwdOpen(false)}
        onOk={submitResetPassword}
        confirmLoading={pwdSaving}
        okText="确认重置"
        destroyOnClose
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="不会发送邮件"
          description="新密码仅显示在此；请用安全方式告知用户。Apple 登录用户也可再设密码，便于账号密码登录。"
        />
        <Form form={pwdForm} layout="vertical">
          <Form.Item
            name="new_password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '至少 6 位' },
            ]}
          >
            <Input.Password placeholder="至少 6 位" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label="确认新密码"
            rules={[{ required: true, message: '请再次输入' }]}
          >
            <Input.Password placeholder="再次输入" autoComplete="new-password" />
          </Form.Item>
          <Button
            type="link"
            style={{ padding: 0, marginBottom: 12 }}
            onClick={() => {
              const p = randomPassword(10);
              pwdForm.setFieldsValue({ new_password: p, confirm_password: p });
            }}
          >
            随机生成密码
          </Button>
        </Form>
        {lastResetPassword && (
          <Alert
            type="success"
            showIcon
            message="重置成功"
            description={
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Text>
                  新密码：
                  <Text code copyable={false}>
                    {lastResetPassword}
                  </Text>
                </Text>
                <Button size="small" icon={<CopyOutlined />} onClick={copyPassword}>
                  复制密码
                </Button>
              </Space>
            }
          />
        )}
      </Modal>
    </div>
  );
}
