import { useState, useEffect } from 'react';
import { LoginPage, RegisterPage } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { AuditLogPage } from './pages/AuditLog';
import { PlatformUsersPage } from './pages/PlatformUsers';
import { AdminUsersPage } from './pages/AdminUsers';
import { AdminLedgersPage } from './pages/AdminLedgers';
import { AccountSettingsPage } from './pages/AccountSettings';
import { api } from './api';
import { Layout, Menu, Button, Space, Tag } from 'antd';
import {
  BookOutlined,
  AuditOutlined,
  TeamOutlined,
  UserOutlined,
  DatabaseOutlined,
  LogoutOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Header, Content } = Layout;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeMenu, setActiveMenu] = useState('ledgers');

  const applyUser = (user) => {
    setCurrentUser(user);
    // Platform ops land on global ledgers view by default.
    if (user?.account_kind === 'platform') {
      setActiveMenu('all-ledgers');
    }
  };

  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      setIsAuthenticated(false);
      setCurrentUser(null);
    });

    api.getMe()
      .then((user) => {
        setIsAuthenticated(true);
        applyUser(user);
      })
      .catch(() => {
        setIsAuthenticated(false);
        setCurrentUser(null);
      })
      .finally(() => {
        setIsCheckingSession(false);
      });
  }, []);

  const handleLogin = async () => {
    setIsAuthenticated(true);
    try {
      applyUser(await api.getMe());
    } catch {
      setCurrentUser(null);
    }
  };

  const handleRegister = async () => {
    setIsAuthenticated(true);
    try {
      applyUser(await api.getMe());
    } catch {
      setCurrentUser(null);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setActiveMenu('ledgers');
    }
  };

  if (isCheckingSession) {
    return null;
  }

  if (isAuthenticated) {
    const isAdmin = Boolean(currentUser?.is_admin);
    const isPlatform = currentUser?.account_kind === 'platform';
    const menuItems = [
      ...(!isPlatform
        ? [{ key: 'ledgers', icon: <BookOutlined />, label: '我的账本' }]
        : []),
      ...(isAdmin
        ? [
            { key: 'all-ledgers', icon: <DatabaseOutlined />, label: '全部账本' },
            { key: 'all-users', icon: <UserOutlined />, label: '全部用户' },
            { key: 'audit', icon: <AuditOutlined />, label: '审计日志' },
            { key: 'platform-users', icon: <TeamOutlined />, label: '平台账号' },
          ]
        : []),
      { key: 'account', icon: <SettingOutlined />, label: '账户' },
    ];

    let body = <Dashboard onLogout={handleLogout} hideChrome />;
    if (activeMenu === 'all-ledgers' && isAdmin) body = <AdminLedgersPage />;
    if (activeMenu === 'all-users' && isAdmin) body = <AdminUsersPage />;
    if (activeMenu === 'audit' && isAdmin) body = <AuditLogPage />;
    if (activeMenu === 'platform-users' && isAdmin) body = <PlatformUsersPage />;
    if (activeMenu === 'account') {
      body = (
        <AccountSettingsPage
          user={currentUser}
          onUserUpdated={(u) => setCurrentUser(u)}
        />
      );
    }
    if (isPlatform && activeMenu === 'ledgers') body = <AdminLedgersPage />;

    return (
      <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#001529',
            padding: '0 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Evenly Console</span>
            <Menu
              theme="dark"
              mode="horizontal"
              selectedKeys={[activeMenu]}
              items={menuItems}
              onClick={({ key }) => setActiveMenu(key)}
              style={{ minWidth: 420, background: 'transparent', flex: 1 }}
            />
          </div>
          <Space>
            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
              {currentUser?.display_name || currentUser?.username || ''}
            </span>
            {isPlatform && <Tag color="gold">平台账号</Tag>}
            {isAdmin && !isPlatform && <Tag color="blue">管理员</Tag>}
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => setActiveMenu('account')}
              style={{ color: '#fff' }}
            >
              账户
            </Button>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} style={{ color: '#fff' }}>
              退出
            </Button>
          </Space>
        </Header>
        <Content>{body}</Content>
      </Layout>
    );
  }

  return showRegister ? (
    <RegisterPage
      onRegister={handleRegister}
      onSwitchToLogin={() => setShowRegister(false)}
    />
  ) : (
    <LoginPage
      onLogin={handleLogin}
      onSwitchToRegister={() => setShowRegister(true)}
    />
  );
}

export default App;
