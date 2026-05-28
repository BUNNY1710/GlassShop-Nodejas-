/**
 * Dashboard Component Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../../context/ThemeProvider';
import Dashboard from '../Dashboard';
import * as api from '../../api/api';

jest.mock('../../api/api', () => ({
  get: jest.fn(),
}));

const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorageMock.getItem.mockImplementation((key) => {
      if (key === 'role') return 'ROLE_ADMIN';
      if (key === 'token') return 'test-token';
      if (key === 'username') return 'admin';
      return null;
    });
  });

  const renderDashboard = (role = 'ROLE_ADMIN') => {
    sessionStorageMock.getItem.mockImplementation((key) => {
      if (key === 'role') return role;
      if (key === 'token') return 'test-token';
      if (key === 'username') return 'admin';
      return null;
    });
    return render(
      <ThemeProvider>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </ThemeProvider>
    );
  };

  test('renders dashboard greeting', () => {
    api.get.mockResolvedValue({ data: [] });
    renderDashboard();
    expect(screen.getByText(/good day/i)).toBeInTheDocument();
  });

  test('displays loading state with greeting', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderDashboard();
    expect(screen.getByText(/good day/i)).toBeInTheDocument();
  });

  test('displays KPI cards for ADMIN role', async () => {
    api.get
      .mockResolvedValueOnce({ data: [{ id: 1 }] })
      .mockResolvedValueOnce({ data: [{ id: 1 }] })
      .mockResolvedValueOnce({ data: 5 })
      .mockResolvedValueOnce({ data: [{ id: 1 }] });

    renderDashboard('ROLE_ADMIN');

    await waitFor(() => {
      expect(screen.getByText(/active skus/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/transfers/i)).toBeInTheDocument();
    expect(screen.getByText(/team members/i)).toBeInTheDocument();
    expect(screen.getByText(/recent events/i)).toBeInTheDocument();
  });

  test('hides admin-only KPIs for STAFF role', async () => {
    api.get
      .mockResolvedValueOnce({ data: [{ id: 1 }] })
      .mockResolvedValueOnce({ data: 3 });

    renderDashboard('ROLE_STAFF');

    await waitFor(() => {
      expect(screen.getByText(/active skus/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/team members/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/recent events/i)).not.toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    api.get.mockRejectedValueOnce(new Error('Network error'));
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/good day/i)).toBeInTheDocument();
    });
  });

  test('fetches data on component mount', () => {
    api.get.mockResolvedValue({ data: [] });
    renderDashboard();
    expect(api.get).toHaveBeenCalled();
  });
});
