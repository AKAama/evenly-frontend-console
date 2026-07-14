import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Card, Table, Button, Modal, Form, Input, Space, Tag, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';

export function PlatformUsersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.listPlatformUsers());
    } catch (err) {
      message.error(err.message || '加载平台账号失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await api.createPlatformUser(values);
      message.success('平台账号已创建');
      setOpen(false);
      form.resetFields();
      load();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.message || '创建失败');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', width: 140 },
    { title: '显示名', dataIndex: 'display_name', width: 140 },
    { title: '邮箱', dataIndex: 'email' },
    {
      title: '类型',
      dataIndex: 'account_kind',
      width: 100,
      render: () => <Tag color="gold">平台</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      render: (v) => (v ? new Date(v).toLocaleString() : '—'),
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <Card
        title="平台账号"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              新建平台账号
            </Button>
          </Space>
        }
      >
        <p style={{ color: '#666', marginBottom: 16 }}>
          平台账号仅用于运营控制台（审计等），不能创建/加入账本，也不会出现在 App 分账成员里。
        </p>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={false} />
      </Card>

      <Modal
        title="新建平台账号"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleCreate}
        confirmLoading={saving}
        okText="创建"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="ops@example.com" />
          </Form.Item>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, min: 3, max: 30 }]}
            extra="英文字母开头，可含数字和下划线"
          >
            <Input placeholder="ops_admin" />
          </Form.Item>
          <Form.Item name="display_name" label="显示名">
            <Input placeholder="运营" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, min: 8 }]}>
            <Input.Password placeholder="至少 8 位" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
