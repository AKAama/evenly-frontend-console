import { useEffect, useState } from 'react';
import { api } from '../api';
import { Card, Form, Input, Button, Space, message, Descriptions, Tag } from 'antd';
import { LockOutlined } from '@ant-design/icons';

/**
 * Account settings for console users (especially platform ops who never open Dashboard profile).
 */
export function AccountSettingsPage({ user: initialUser, onUserUpdated }) {
  const [user, setUser] = useState(initialUser || null);
  const [loading, setLoading] = useState(!initialUser);
  const [saving, setSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (initialUser) {
        setUser(initialUser);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const me = await api.getMe();
        if (!cancelled) setUser(me);
      } catch (err) {
        message.error(err.message || '加载账户失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialUser]);

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
      if (err?.errorFields) return;
      message.error(err.message || '修改密码失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, maxWidth: 560, margin: '0 auto' }}>
        <Card loading />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 560, margin: '0 auto' }}>
      <Card title="账户设置">
        <Descriptions column={1} size="small" bordered style={{ marginBottom: 24 }}>
          <Descriptions.Item label="显示名">{user?.display_name || '—'}</Descriptions.Item>
          <Descriptions.Item label="用户名">@{user?.username || '—'}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{user?.email || '—'}</Descriptions.Item>
          <Descriptions.Item label="类型">
            {user?.account_kind === 'platform' ? (
              <Tag color="gold">平台账号</Tag>
            ) : (
              <Tag>普通用户</Tag>
            )}
          </Descriptions.Item>
        </Descriptions>

        {showPasswordForm ? (
          <Form form={passwordForm} layout="vertical">
            <Form.Item
              name="old_password"
              label="当前密码"
              rules={[{ required: true, message: '请输入当前密码' }]}
            >
              <Input.Password placeholder="请输入当前密码" autoComplete="current-password" />
            </Form.Item>
            <Form.Item
              name="new_password"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码至少 6 位' },
              ]}
            >
              <Input.Password placeholder="请输入新密码" autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              name="confirm_password"
              label="确认新密码"
              rules={[{ required: true, message: '请确认新密码' }]}
            >
              <Input.Password placeholder="请再次输入新密码" autoComplete="new-password" />
            </Form.Item>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="primary" danger block loading={saving} onClick={handleChangePassword}>
                保存新密码
              </Button>
              <Button
                block
                onClick={() => {
                  passwordForm.resetFields();
                  setShowPasswordForm(false);
                }}
              >
                取消
              </Button>
            </Space>
          </Form>
        ) : (
          <Button icon={<LockOutlined />} block type="primary" onClick={() => setShowPasswordForm(true)}>
            修改密码
          </Button>
        )}
      </Card>
    </div>
  );
}
