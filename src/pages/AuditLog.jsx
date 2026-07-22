import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Card, Table, DatePicker, Select, Space, Tag, Statistic, Row, Col, message, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const CN_TZ = 'Asia/Shanghai';

/** Audit timestamps are UTC (often naive in DB); always show China local time. */
function formatAuditTime(v) {
  if (!v) return '—';
  // If backend sends no Z/offset, treat as UTC.
  let parsed = dayjs.utc(v);
  if (!parsed.isValid() && typeof v === 'string' && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(v)) {
    parsed = dayjs.utc(`${v}Z`);
  }
  if (!parsed.isValid()) return String(v);
  return parsed.tz(CN_TZ).format('HH:mm:ss');
}

const SOURCE_COLOR = {
  ios: 'blue',
  console: 'purple',
  web: 'cyan',
  api: 'default',
  android: 'green',
};

const ACTION_LABEL = {
  'auth.login': '登录',
  'auth.register': '注册',
  'auth.apple_login': 'Apple 登录',
  'ledger.create': '创建账本',
  'ledger.join_invite': '加入账本',
  'expense.create': '记一笔',
  'expense.refund': '退款',
  'expense.delete': '删除账单',
  'expense.confirmed': '确认账单',
  'expense.rejected': '拒绝账单',
  'settlement.create': '记录转账',
  'user.deactivate': '注销账号',
  'user.deactivate_admin': '管理员注销账号',
};

export function AuditLogPage() {
  const [day, setDay] = useState(dayjs());
  const [source, setSource] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ by_action: [], total: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dayStr = day.format('YYYY-MM-DD');
      const [list, sum] = await Promise.all([
        api.getAuditEvents({ day: dayStr, source, limit: 300 }),
        api.getAuditSummary({ day: dayStr }),
      ]);
      setRows(list.items || []);
      setTotal(list.total || 0);
      setSummary(sum || { by_action: [], total: 0 });
    } catch (err) {
      message.error(err.message || '加载审计日志失败');
    } finally {
      setLoading(false);
    }
  }, [day, source]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    {
      title: '时间 (北京)',
      dataIndex: 'created_at',
      width: 100,
      render: (v) => formatAuditTime(v),
    },
    {
      title: '用户',
      dataIndex: 'actor_label',
      width: 120,
      render: (v) => v || '—',
    },
    {
      title: '操作',
      dataIndex: 'action',
      width: 140,
      render: (a) => <Tag>{ACTION_LABEL[a] || a}</Tag>,
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 90,
      render: (s) => <Tag color={SOURCE_COLOR[s] || 'default'}>{s}</Tag>,
    },
    {
      title: '说明',
      dataIndex: 'summary',
      ellipsis: true,
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      width: 120,
      render: (v) => v || '—',
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Card
        title="审计日志"
        extra={
          <Space>
            <DatePicker value={day} onChange={(d) => d && setDay(d)} allowClear={false} />
            <Select
              allowClear
              placeholder="来源"
              style={{ width: 120 }}
              value={source}
              onChange={setSource}
              options={[
                { value: 'ios', label: 'iOS' },
                { value: 'console', label: 'Console' },
                { value: 'web', label: 'Web' },
                { value: 'api', label: 'API' },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={load}>
              刷新
            </Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic title={`${day.format('YYYY-MM-DD')} 总事件`} value={summary.total || total} />
          </Col>
          {(summary.by_action || []).slice(0, 3).map((item) => (
            <Col span={6} key={item.action}>
              <Statistic title={ACTION_LABEL[item.action] || item.action} value={item.count} />
            </Col>
          ))}
        </Row>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 50, showTotal: (t) => `共 ${t} 条` }}
          size="middle"
        />
      </Card>
    </div>
  );
}
