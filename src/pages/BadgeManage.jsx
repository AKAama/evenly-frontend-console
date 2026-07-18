import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import {
  Card,
  Table,
  Input,
  Select,
  Space,
  Tag,
  Button,
  Row,
  Col,
  Statistic,
  Typography,
  message,
  Empty,
  Modal,
  Form,
  Popconfirm,
  Switch,
  Tabs,
  Divider,
} from 'antd';
import {
  ReloadOutlined,
  SearchOutlined,
  IdcardOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;

const COLOR_OPTIONS = [
  { value: 'gold', label: '金色 gold' },
  { value: 'blue', label: '蓝色 blue' },
  { value: 'orange', label: '橙色 orange' },
  { value: 'purple', label: '紫色 purple' },
  { value: 'magenta', label: '玫红 magenta' },
  { value: 'red', label: '红色 red' },
  { value: 'green', label: '绿色 green' },
  { value: 'cyan', label: '青色 cyan' },
  { value: 'geekblue', label: '极客蓝 geekblue' },
  { value: 'volcano', label: '火山 volcano' },
  { value: 'lime', label: '青柠 lime' },
];

/**
 * Manage badge definitions (创始人/船员/…) and assign them to users.
 */
export function BadgeManagePage() {
  const [catalog, setCatalog] = useState([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [q, setQ] = useState('');
  const [badgeFilter, setBadgeFilter] = useState(undefined);
  const [savingId, setSavingId] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [savingDef, setSavingDef] = useState(false);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const data = await api.adminListBadges();
      setCatalog(data.items || []);
      setUnassignedCount(data.unassigned_count || 0);
    } catch (err) {
      message.error(err.message || '加载铭牌目录失败');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminListUsers({
        q: q || undefined,
        badge: badgeFilter,
        account_kind: 'app',
        limit: 300,
      });
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      message.error(err.message || '加载用户失败');
    } finally {
      setLoading(false);
    }
  }, [q, badgeFilter]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const activeCatalog = useMemo(
    () => catalog.filter((b) => b.is_active !== false),
    [catalog]
  );

  const totalBadged = useMemo(
    () => catalog.reduce((sum, b) => sum + (b.user_count || 0), 0),
    [catalog]
  );

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ color: 'blue', is_active: true });
    setEditorOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    form.setFieldsValue({
      label: row.label,
      description: row.description,
      color: row.color || 'blue',
      sort_order: row.sort_order,
      is_active: row.is_active !== false,
      key: row.key,
    });
    setEditorOpen(true);
  };

  const saveDefinition = async () => {
    try {
      const values = await form.validateFields();
      setSavingDef(true);
      if (editing) {
        await api.adminUpdateBadge(editing.id, {
          label: values.label,
          description: values.description ?? null,
          color: values.color,
          sort_order: values.sort_order,
          is_active: values.is_active,
        });
        message.success('铭牌已更新');
      } else {
        await api.adminCreateBadge({
          label: values.label,
          description: values.description,
          color: values.color,
          key: values.key || undefined,
          sort_order: values.sort_order,
        });
        message.success('铭牌已创建');
      }
      setEditorOpen(false);
      loadCatalog();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.message || '保存失败');
    } finally {
      setSavingDef(false);
    }
  };

  const removeDefinition = async (row) => {
    try {
      await api.adminDeleteBadge(row.id);
      message.success(`已删除「${row.label}」；持有用户的铭牌已清除`);
      if (badgeFilter === row.key) setBadgeFilter(undefined);
      loadCatalog();
      loadUsers();
    } catch (err) {
      message.error(err.message || '删除失败');
    }
  };

  const setUserBadge = async (userId, badge) => {
    setSavingId(userId);
    try {
      const updated = await api.adminSetUserBadge(userId, badge);
      setRows((prev) =>
        prev.map((r) =>
          r.id === userId
            ? {
                ...r,
                badge: updated.badge,
                badge_label: updated.badge_label,
                badge_color: updated.badge_color,
              }
            : r
        )
      );
      message.success(badge ? `已发放「${updated.badge_label || badge}」` : '已清除铭牌');
      loadCatalog();
    } catch (err) {
      message.error(err.message || '操作失败');
    } finally {
      setSavingId(null);
    }
  };

  const defColumns = [
    {
      title: '铭牌',
      key: 'badge',
      render: (_, r) => (
        <Space>
          <Tag color={r.color || 'blue'}>{r.label}</Tag>
          {!r.is_active && <Tag>已停用</Tag>}
        </Space>
      ),
    },
    {
      title: '标识 key',
      dataIndex: 'key',
      width: 120,
      render: (k) => <Text code>{k}</Text>,
    },
    {
      title: '说明',
      dataIndex: 'description',
      ellipsis: true,
      render: (d) => d || <Text type="secondary">—</Text>,
    },
    {
      title: '持有人数',
      dataIndex: 'user_count',
      width: 100,
      render: (n, r) => (
        <Button type="link" size="small" onClick={() => setBadgeFilter(r.key)}>
          {n || 0} 人
        </Button>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      width: 70,
    },
    {
      title: '操作',
      width: 160,
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Popconfirm
            title={`删除「${r.label}」？`}
            description="持有该铭牌的用户会被清除标识。"
            onConfirm={() => removeDefinition(r)}
            okText="删除"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const userColumns = [
    {
      title: '用户',
      key: 'user',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>{r.display_name || r.username}</span>
            {r.badge_label && (
              <Tag color={r.badge_color || 'default'} style={{ marginInlineEnd: 0 }}>
                {r.badge_label}
              </Tag>
            )}
          </div>
          <div style={{ color: '#888', fontSize: 12 }}>
            @{r.username} · {r.email}
          </div>
        </div>
      ),
    },
    {
      title: '发放铭牌',
      dataIndex: 'badge',
      width: 220,
      render: (b, r) => (
        <Select
          allowClear
          placeholder="无铭牌"
          style={{ width: '100%' }}
          loading={savingId === r.id}
          value={b || undefined}
          onChange={(v) => setUserBadge(r.id, v ?? null)}
          options={activeCatalog.map((item) => ({
            value: item.key,
            label: item.label,
          }))}
        />
      ),
    },
    {
      title: '账本',
      width: 120,
      render: (_, r) => (
        <span style={{ color: '#666', fontSize: 13 }}>
          拥有 {r.owned_ledger_count ?? 0} · 加入 {r.membership_count ?? 0}
        </span>
      ),
    },
    {
      title: '操作',
      width: 90,
      render: (_, r) =>
        r.badge ? (
          <Button
            type="link"
            danger
            size="small"
            disabled={savingId === r.id}
            onClick={() => setUserBadge(r.id, null)}
          >
            清除
          </Button>
        ) : (
          <span style={{ color: '#ccc' }}>—</span>
        ),
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <div>
          <Space align="center" style={{ marginBottom: 4 }}>
            <IdcardOutlined style={{ fontSize: 22, color: '#1677ff' }} />
            <Text strong style={{ fontSize: 20 }}>
              铭牌管理
            </Text>
          </Space>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            自己维护铭牌类型（如创始人、船员、搭子），再发给好友。App 内成员旁展示，不影响分账权限。
          </Paragraph>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8} md={6}>
            <Card loading={catalogLoading} size="small">
              <Statistic title="已授铭牌人数" value={totalBadged} prefix={<IdcardOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Card
              loading={catalogLoading}
              size="small"
              hoverable
              onClick={() => setBadgeFilter('none')}
              style={{
                borderColor: badgeFilter === 'none' ? '#1677ff' : undefined,
                cursor: 'pointer',
              }}
            >
              <Statistic title="无铭牌用户" value={unassignedCount} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                点击筛选
              </Text>
            </Card>
          </Col>
          {catalog
            .filter((b) => b.is_active !== false)
            .map((b) => (
              <Col xs={12} sm={8} md={6} key={b.key}>
                <Card
                  loading={catalogLoading}
                  size="small"
                  hoverable
                  onClick={() => setBadgeFilter(b.key === badgeFilter ? undefined : b.key)}
                  style={{
                    borderColor: badgeFilter === b.key ? '#1677ff' : undefined,
                    cursor: 'pointer',
                  }}
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Tag color={b.color || 'blue'}>{b.label}</Tag>
                    <Statistic value={b.user_count || 0} suffix="人" valueStyle={{ fontSize: 22 }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {b.description || b.key}
                    </Text>
                  </Space>
                </Card>
              </Col>
            ))}
        </Row>

        <Tabs
          defaultActiveKey="definitions"
          items={[
            {
              key: 'definitions',
              label: '铭牌类型',
              children: (
                <Card
                  title="铭牌定义"
                  extra={
                    <Space>
                      <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        新建铭牌
                      </Button>
                      <Button icon={<ReloadOutlined />} onClick={loadCatalog}>
                        刷新
                      </Button>
                    </Space>
                  }
                >
                  <Table
                    rowKey="id"
                    loading={catalogLoading}
                    columns={defColumns}
                    dataSource={catalog}
                    pagination={false}
                    locale={{ emptyText: <Empty description="还没有铭牌，点右上角新建" /> }}
                  />
                </Card>
              ),
            },
            {
              key: 'assign',
              label: '发放给用户',
              children: (
                <Card
                  title={`用户（${total}）`}
                  extra={
                    <Space wrap>
                      <Input
                        allowClear
                        prefix={<SearchOutlined />}
                        placeholder="搜邮箱 / 用户名 / 显示名"
                        style={{ width: 240 }}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onPressEnter={loadUsers}
                      />
                      <Select
                        allowClear
                        placeholder="按铭牌筛选"
                        style={{ width: 140 }}
                        value={badgeFilter}
                        onChange={setBadgeFilter}
                        options={[
                          { value: 'none', label: '无铭牌' },
                          ...catalog.map((b) => ({ value: b.key, label: b.label })),
                        ]}
                      />
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => {
                          loadCatalog();
                          loadUsers();
                        }}
                      >
                        刷新
                      </Button>
                    </Space>
                  }
                >
                  <Table
                    rowKey="id"
                    loading={loading}
                    columns={userColumns}
                    dataSource={rows}
                    pagination={{ pageSize: 40, showTotal: (t) => `共 ${t} 人` }}
                    locale={{
                      emptyText: (
                        <Empty description={badgeFilter ? '该筛选下没有用户' : '暂无用户'} />
                      ),
                    }}
                  />
                </Card>
              ),
            },
          ]}
        />
      </Space>

      <Modal
        title={editing ? `编辑铭牌 · ${editing.label}` : '新建铭牌'}
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        onOk={saveDefinition}
        confirmLoading={savingDef}
        destroyOnClose
        okText="保存"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="label"
            label="显示名称"
            rules={[{ required: true, message: '请输入名称，如：创始人' }]}
          >
            <Input placeholder="创始人 / 船员 / 搭子 …" maxLength={40} showCount />
          </Form.Item>
          {!editing && (
            <Form.Item
              name="key"
              label="标识 key（可选）"
              extra="小写英文/数字/下划线；不填则自动生成。创建后不可改。"
            >
              <Input placeholder="如 founder、crew" maxLength={32} />
            </Form.Item>
          )}
          {editing && (
            <Form.Item label="标识 key">
              <Text code>{editing.key}</Text>
            </Form.Item>
          )}
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={2} placeholder="给运营自己看的备注" maxLength={200} showCount />
          </Form.Item>
          <Form.Item name="color" label="颜色" rules={[{ required: true }]}>
            <Select options={COLOR_OPTIONS} />
          </Form.Item>
          <Form.Item name="sort_order" label="排序（数字越小越靠前）">
            <Input type="number" placeholder="10" />
          </Form.Item>
          {editing && (
            <Form.Item name="is_active" label="启用" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          )}
        </Form>
        <Divider style={{ margin: '8px 0 0' }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          停用后不能再新发给用户；已持有的用户仍显示，除非你清除或删除铭牌。
        </Text>
      </Modal>
    </div>
  );
}
