import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Card, Table, Input, Select, Space, Tag, Button, Drawer, Descriptions, List, message } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';

export function AdminUsersPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [accountKind, setAccountKind] = useState(undefined);
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

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

  const openDetail = async (userId) => {
    try {
      const data = await api.adminGetUser(userId);
      setDetail(data);
      setDetailOpen(true);
    } catch (err) {
      message.error(err.message || '加载用户详情失败');
    }
  };

  const columns = [
    {
      title: '用户',
      key: 'user',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.display_name || r.username}</div>
          <div style={{ color: '#888', fontSize: 12 }}>@{r.username}</div>
        </div>
      ),
    },
    { title: '邮箱', dataIndex: 'email' },
    {
      title: '类型',
      dataIndex: 'account_kind',
      width: 100,
      render: (k) =>
        k === 'platform' ? <Tag color="gold">平台</Tag> : <Tag color="blue">用户</Tag>,
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
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
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
      >
        {detail?.user && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="显示名">{detail.user.display_name || '—'}</Descriptions.Item>
              <Descriptions.Item label="用户名">@{detail.user.username}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{detail.user.email}</Descriptions.Item>
              <Descriptions.Item label="类型">
                {detail.user.account_kind === 'platform' ? '平台账号' : '普通用户'}
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {detail.user.created_at ? new Date(detail.user.created_at).toLocaleString() : '—'}
              </Descriptions.Item>
            </Descriptions>
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
    </div>
  );
}
