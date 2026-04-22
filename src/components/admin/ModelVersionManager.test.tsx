/**
 * Unit Tests for ModelVersionManager Component
 * Story 10-2 - Task 4.1, 4.2
 * 
 * Tests version list rendering, activate/deactivate button interactions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModelVersionManager } from './ModelVersionManager';

// Mock translation function
const mockT = (key: string, fallback: string) => fallback;

describe('ModelVersionManager', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Scope spy to sessionStorage only — direct Storage.prototype assignment was removed because
    // vi.restoreAllMocks() cannot restore it (not a spy), and it polluted localStorage in all tests.
    vi.spyOn(window.sessionStorage, 'getItem').mockImplementation((key) => {
      if (key === 'afia_admin_session') return 'mock-admin-token';
      return null;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders version list with correct data', async () => {
    const mockVersions = [
      {
        version: 'v1.0.0',
        mae: 0.052,
        val_accuracy: 0.85,
        training_samples_count: 500,
        deployed_at: '2026-04-01T10:00:00Z',
        is_active: true,
        r2_key: 'models/v1.0.0/model.json'
      },
      {
        version: 'v0.9.0',
        mae: 0.061,
        val_accuracy: 0.82,
        training_samples_count: 300,
        deployed_at: '2026-03-15T10:00:00Z',
        is_active: false,
        r2_key: 'models/v0.9.0/model.json'
      }
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ versions: mockVersions })
    });

    render(<ModelVersionManager t={mockT} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    });

    // Verify version data is displayed
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByText('v0.9.0')).toBeInTheDocument();
    expect(screen.getByText('5.20')).toBeInTheDocument(); // MAE as percentage
    expect(screen.getByText('85%')).toBeInTheDocument(); // Val accuracy (maximumFractionDigits: 1)
    expect(screen.getByText('500')).toBeInTheDocument(); // Training samples
    
    // Verify active/inactive badges
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('calls activate endpoint when activate button clicked', async () => {
    const mockVersions = [
      {
        version: 'v1.0.0',
        mae: 0.052,
        val_accuracy: 0.85,
        training_samples_count: 500,
        deployed_at: '2026-04-01T10:00:00Z',
        is_active: true,
        r2_key: 'models/v1.0.0/model.json'
      },
      {
        version: 'v0.9.0',
        mae: 0.061,
        val_accuracy: 0.82,
        training_samples_count: 300,
        deployed_at: '2026-03-15T10:00:00Z',
        is_active: false,
        r2_key: 'models/v0.9.0/model.json'
      }
    ];

    // First call: fetch versions
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ versions: mockVersions })
    });

    // Second call: activate endpoint
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    // Third call: refresh versions after activation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        versions: mockVersions.map(v => 
          v.version === 'v0.9.0' ? { ...v, is_active: true } : { ...v, is_active: false }
        )
      })
    });

    render(<ModelVersionManager t={mockT} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('v0.9.0')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Find and click activate button for v0.9.0
    const activateButtons = screen.getAllByText('Activate');
    fireEvent.click(activateButtons[0]);

    // Verify activate endpoint was called
    await waitFor(() => {
      const activateCalls = mockFetch.mock.calls.filter((call: any) => 
        call[0]?.includes('/admin/model/activate')
      );
      expect(activateCalls.length).toBeGreaterThan(0);
      const activateCall = activateCalls[0];
      expect(activateCall[1]?.method).toBe('POST');
      expect(activateCall[1]?.body).toBe(JSON.stringify({ version: 'v0.9.0' }));
    }, { timeout: 3000 });
  }, 15000);

  it('shows confirmation dialog when deactivate button clicked', async () => {
    const mockVersions = [
      {
        version: 'v1.0.0',
        mae: 0.052,
        val_accuracy: 0.85,
        training_samples_count: 500,
        deployed_at: '2026-04-01T10:00:00Z',
        is_active: true,
        r2_key: 'models/v1.0.0/model.json'
      }
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ versions: mockVersions })
    });

    // Mock window.confirm
    const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<ModelVersionManager t={mockT} />);

    await waitFor(() => {
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    });

    // Click deactivate button
    const deactivateButton = screen.getByText('Deactivate');
    fireEvent.click(deactivateButton);

    // Verify confirmation was shown
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.stringContaining('Deactivate this version')
    );

    mockConfirm.mockRestore();
  });

  it('displays loading state while fetching versions', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ModelVersionManager t={mockT} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays error state when fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ModelVersionManager t={mockT} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load model versions/i)).toBeInTheDocument();
    });
  });

  it('refreshes version list after successful activation', async () => {
    const mockVersions = [
      {
        version: 'v1.0.0',
        mae: 0.052,
        val_accuracy: 0.85,
        training_samples_count: 500,
        deployed_at: '2026-04-01T10:00:00Z',
        is_active: false,
        r2_key: 'models/v1.0.0/model.json'
      }
    ];

    // Initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ versions: mockVersions })
    });

    // Activate call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    // Refresh fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        versions: [{ ...mockVersions[0], is_active: true }]
      })
    });

    render(<ModelVersionManager t={mockT} />);

    await waitFor(() => {
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    });

    const activateButton = screen.getByText('Activate');
    fireEvent.click(activateButton);

    // Verify refresh was called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + activate + refresh
    });
  });
});
