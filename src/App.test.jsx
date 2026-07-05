import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

vi.mock('@rive-app/react-canvas', () => ({
  useRive: () => ({
    RiveComponent: () => <div data-testid="rive-animation" />,
    isLoading: false,
    error: null,
  }),
}));

test('renders login page for guests', async () => {
  render(<App />);
  expect(await screen.findByRole('button', { name: /login in/i })).toBeInTheDocument();
  expect(screen.getByPlaceholderText('邮箱或用户名')).toBeInTheDocument();
});
