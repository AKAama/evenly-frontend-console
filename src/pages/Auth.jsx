import { useState } from 'react';
import { api } from '../api';
import { Form, Input, Button, Card, message, Upload } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, UploadOutlined } from '@ant-design/icons';
import { useRive } from '@rive-app/react-canvas';

function RiveAnimation({ className }) {
  const { RiveComponent, isLoading, error } = useRive({
    src: '/22487-42095-look.riv',
    stateMachines: "State Machine 1",
    autoplay: true,
  });

  if (error) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red', fontSize: '18px' }}>
        错误: {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#fff' }}>
        加载中...
      </div>
    );
  }

  return (
    <div className={className} style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <RiveComponent
        style={{ width: '100%', height: '100%', maxWidth: '800px', maxHeight: '800px' }}
        onMouseDown={(e) => e.preventDefault()}
      />
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    background: '#fff',
  },
  leftPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60px',
  },
  leftTitle: {
    color: '#333',
    fontSize: '48px',
    fontWeight: 'bold',
    marginBottom: '20px',
    textAlign: 'center',
  },
  leftSubtitle: {
    color: '#666',
    fontSize: '18px',
    marginBottom: '40px',
    textAlign: 'center',
  },
  rightPanel: {
    flex: '0 0 720px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px',
    background: '#fff',
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    border: 'none',
  },
  switchLink: {
    textAlign: 'center',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #f0f0f0',
  },
  inputStyle: {
    height: '48px',
    borderRadius: '8px',
    background: '#f5f5f5',
    border: 'none',
  },
  buttonStyle: {
    height: '48px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
  },
};

export function LoginPage({ onLogin, onSwitchToRegister }) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await api.login(values.email, values.password);
      message.success('登录成功');
      onLogin();
    } catch (err) {
      message.error(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.leftPanel} onMouseDown={(e) => e.preventDefault()}>
        <RiveAnimation />
      </div>
      <div style={styles.rightPanel}>
        <Card variant="borderless" title="登录" style={styles.card}>
          <Form form={form} onFinish={onFinish} layout="vertical">
            <Form.Item
              name="email"
              rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}
            >
              <Input prefix={<MailOutlined style={{ color: '#999' }} />} placeholder="邮箱" size="large" style={styles.inputStyle} />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined style={{ color: '#999' }} />} placeholder="密码" size="large" style={styles.inputStyle} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block size="large" style={styles.buttonStyle}>
                LOGIN IN
              </Button>
            </Form.Item>
          </Form>
          <div style={styles.switchLink}>
            没有账号? <Button type="link" onClick={onSwitchToRegister} style={{ padding: 0, height: 'auto' }}>立即注册</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function RegisterPage({ onRegister, onSwitchToLogin }) {
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [form] = Form.useForm();

  const handleSendCode = async () => {
    try {
      const email = form.getFieldValue('email');
      if (!email) {
        message.warning('请先输入邮箱');
        return;
      }
      setSendingCode(true);
      await api.sendVerificationCode(email);
      message.success('验证码已发送');
      setCountdown(6);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      message.error(err.message || '发送失败');
    } finally {
      setSendingCode(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const avatar = values.avatar?.[0]?.originFileObj;
      await api.register(values.email, values.password, values.displayName, values.code, avatar);
      message.success('注册成功');
      onRegister();
    } catch (err) {
      message.error(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.leftPanel} onMouseDown={(e) => e.preventDefault()}>
        <RiveAnimation />
        <div style={styles.leftTitle}>加入我们</div>
        <div style={styles.leftSubtitle}>创建一个账号，开始您的旅程</div>
      </div>
      <div style={styles.rightPanel}>
        <Card variant="borderless" title="注册" style={styles.card}>
          <Form form={form} onFinish={onFinish} layout="vertical">
            <Form.Item
              name="email"
              rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}
            >
              <Input prefix={<MailOutlined style={{ color: '#999' }} />} placeholder="邮箱" size="large" style={styles.inputStyle} />
            </Form.Item>
            <Form.Item name="code" rules={[{ required: true, message: '请输入验证码' }]}>
              <Input.Search
                placeholder="验证码"
                enterButton={countdown > 0 ? `${countdown}s` : '发送验证码'}
                onSearch={handleSendCode}
                loading={sendingCode}
                disabled={countdown > 0}
                size="large"
                style={styles.inputStyle}
              />
            </Form.Item>
            <Form.Item name="displayName" rules={[{ required: true, message: '请输入显示名称' }]}>
              <Input prefix={<UserOutlined style={{ color: '#999' }} />} placeholder="显示名称" size="large" style={styles.inputStyle} />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }]}>
              <Input.Password prefix={<LockOutlined style={{ color: '#999' }} />} placeholder="密码" size="large" style={styles.inputStyle} />
            </Form.Item>
            <Form.Item name="confirmPassword" dependencies={['password']}
              rules={[
                { required: true, message: '请确认密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve();
                    return Promise.reject(new Error('两次密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: '#999' }} />} placeholder="确认密码" size="large" style={styles.inputStyle} />
            </Form.Item>
            <Form.Item name="avatar" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList}>
              <Upload beforeUpload={() => false} maxCount={1} listType="picture">
                <Button icon={<UploadOutlined />} style={{ height: '48px', borderRadius: '8px' }}>上传头像（可选）</Button>
              </Upload>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block size="large" style={styles.buttonStyle}>
                注册
              </Button>
            </Form.Item>
          </Form>
          <div style={styles.switchLink}>
            已有账号? <Button type="link" onClick={onSwitchToLogin} style={{ padding: 0, height: 'auto' }}>立即登录</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
