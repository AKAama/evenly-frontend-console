import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import {
  Card,
  Table,
  Input,
  Button,
  Space,
  Tag,
  Drawer,
  Descriptions,
  List,
  message,
  Statistic,
  Row,
  Col,
  Select,
} from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';

export function AdminLedgersPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [overview, setOverview] = useState(null);
  const [open, setOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminListLedgers({
        q: q || undefined,
        status: statusFilter || undefined,
        limit: 200,
      });
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      message.error(err.message || '加载账本失败');
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openLedger = async (ledgerId) => {
    setDetailLoading(true);
    setOpen(true);
    try {
      setOverview(await api.adminLedgerOverview(ledgerId));
    } catch (err) {
      message.error(err.message || '加载账本详情失败');
      setOverview(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    { title: '账本', dataIndex: 'name', render: (t) => <strong>{t}</strong> },
    {
      title: '状态',
      dataIndex: 'status',
      width: 140,
      render: (s, r) => (
        <Space size={4} wrap>
          {s === 'archived' ? <Tag>归档</Tag> : <Tag color="green">正常</Tag>}
          {r.is_orphan ? <Tag color="orange">悬空</Tag> : null}
        </Space>
      ),
    },
    {
      title: '所有者',
      key: 'owner',
      render: (_, r) => (
        <div>
          <div>{r.owner_label || '—'}</div>
          <div style={{ color: '#888', fontSize: 12 }}>{r.owner_email || ''}</div>
        </div>
      ),
    },
    { title: '成员', dataIndex: 'member_count', width: 80 },
    { title: '账单数', dataIndex: 'expense_count', width: 80 },
    {
      title: '实付合计',
      dataIndex: 'total_spend',
      width: 120,
      render: (v) => `¥${Number(v || 0).toFixed(2)}`,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 170,
      render: (v) => (v ? new Date(v).toLocaleString() : '—'),
    },
    {
      title: '',
      width: 90,
      render: (_, r) => (
        <Button type="link" onClick={() => openLedger(r.id)}>
          查看
        </Button>
      ),
    },
  ];

  const expenses = overview?.expenses || [];
  const members = overview?.ledger?.members || [];
  const spend = expenses
    .filter((e) => e.status !== 'rejected')
    .reduce((s, e) => s + Number(e.total_amount || 0) - Number(e.refund_amount || 0), 0);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Card
        title={`全部账本（${total}）`}
        extra={
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜账本名"
              style={{ width: 200 }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onPressEnter={load}
            />
            <Select
              allowClear
              placeholder="状态"
              style={{ width: 140 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'active', label: '正常' },
                { value: 'archived', label: '归档' },
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
        title={overview?.ledger?.name || '账本详情'}
        width={720}
        open={open}
        onClose={() => setOpen(false)}
        loading={detailLoading}
      >
        {overview?.ledger && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic title="成员" value={members.filter((m) => m.status === 'active').length} />
              </Col>
              <Col span={8}>
                <Statistic title="账单" value={expenses.length} />
              </Col>
              <Col span={8}>
                <Statistic title="实付合计" prefix="¥" value={spend.toFixed(2)} />
              </Col>
            </Row>
            <Descriptions size="small" column={1} bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="货币">{overview.ledger.currency}</Descriptions.Item>
              <Descriptions.Item label="账本 ID">{overview.ledger.id}</Descriptions.Item>
            </Descriptions>

            <h4>成员</h4>
            <List
              size="small"
              bordered
              style={{ marginBottom: 16 }}
              dataSource={members}
              renderItem={(m) => (
                <List.Item>
                  <Space>
                    <span>
                      {m.user?.display_name || m.user?.username || m.temporary_name || '临时'}
                    </span>
                    {m.is_temporary && <Tag>临时</Tag>}
                    <Tag>{m.status}</Tag>
                    {m.user?.email && <span style={{ color: '#888' }}>{m.user.email}</span>}
                  </Space>
                </List.Item>
              )}
            />

            <h4>账单</h4>
            <Table
              size="small"
              rowKey="id"
              pagination={{ pageSize: 20 }}
              dataSource={expenses}
              columns={[
                { title: '标题', dataIndex: 'title', ellipsis: true },
                {
                  title: '金额',
                  key: 'amt',
                  width: 140,
                  render: (_, r) => {
                    const refund = Number(r.refund_amount || 0);
                    const net = Number(r.total_amount) - refund;
                    return (
                      <span>
                        ¥{net.toFixed(2)}
                        {refund > 0 && (
                          <span style={{ color: '#888', fontSize: 12 }}>
                            {' '}
                            (退¥{refund.toFixed(2)})
                          </span>
                        )}
                      </span>
                    );
                  },
                },
                {
                  title: '付款人',
                  width: 100,
                  render: (_, r) => r.payer?.display_name || r.payer?.username || '—',
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 90,
                  render: (s) => {
                    const map = { pending: '待确认', confirmed: '已确认', rejected: '已拒绝' };
                    return <Tag>{map[s] || s}</Tag>;
                  },
                },
                { title: '日期', dataIndex: 'expense_date', width: 110 },
              ]}
            />
          </>
        )}
      </Drawer>
    </div>
  );
}
