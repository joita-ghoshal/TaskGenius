import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../layout/Navbar';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Joita Ghoshal', avatar: '' },
    logout: vi.fn()
  })
}));

vi.mock('../../hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn()
  })
}));

const renderWithRouter = (ui) => render(<BrowserRouter>{ui}</BrowserRouter>);

describe('Navbar', () => {
  it('renders the TaskGenius brand', () => {
    renderWithRouter(<Navbar />);
    expect(screen.getAllByText('TaskGenius').length).toBeGreaterThan(0);
  });

  it('shows user initials in the avatar', () => {
    renderWithRouter(<Navbar />);
    expect(screen.getAllByText('JG').length).toBeGreaterThan(0);
  });
});
