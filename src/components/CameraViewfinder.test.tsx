import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CameraViewfinder } from './CameraViewfinder';

// Stable mock for useCameraGuidance — returning the same object reference every call
// prevents startCamera's useCallback from recreating on every render, which would
// trigger the useEffect([startCamera]) to fire again and consume the queued mock value.
let mockIsReady = true;
vi.mock('../hooks/useCameraGuidance', () => {
  return { 
    useCameraGuidance: () => ({
      state: { 
        isReady: mockIsReady, 
        assessment: { 
          guidanceType: 'warning', 
          overallScore: 50, 
          composition: { distance: 'not-detected', isCentered: true },
          guidanceMessage: 'camera.alignBottle'
        },
        holdProgress: 0,
        isHolding: false,
      },
      startGuidance: vi.fn(),
      stopGuidance: vi.fn(),
    })
  };
});

// Mock MediaDevices API
const mockStream = {
  getVideoTracks: vi.fn(() => [{
    getCapabilities: vi.fn(() => ({ torch: true })),
    applyConstraints: vi.fn(),
    stop: vi.fn(),
  }]),
  getTracks: vi.fn(() => []),
};

const getUserMediaSpy = vi.fn();

beforeEach(() => {
  // Mock console.error to reduce noise
  vi.spyOn(console, 'error').mockImplementation(() => {});
  
  // Mock canvas getContext
  const mockCtx = {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1,
    })),
    canvas: { width: 0, height: 0 },
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    mockCtx as unknown as CanvasRenderingContext2D
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,mock');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CameraViewfinder', () => {
  const mockOnCapture = vi.fn();
  const mockOnError = vi.fn();
  const mockOnPermissionDenied = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnCapture.mockClear();
    mockOnError.mockClear();
    mockOnPermissionDenied.mockClear();
    // Spy must be set up AFTER clearAllMocks — clearAllMocks removes spy implementations
    vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockImplementation(getUserMediaSpy);
    getUserMediaSpy.mockReset();
    mockStream.getTracks.mockReset();
  });

  describe('initialization', () => {
    it('should request camera permission on mount', async () => {
      getUserMediaSpy.mockResolvedValueOnce(mockStream);
      
      render(<CameraViewfinder 
        onCapture={mockOnCapture}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
      />);
      
      await waitFor(() => {
        expect(getUserMediaSpy).toHaveBeenCalledWith({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      });
    });

    it('should show loading state while requesting camera', () => {
      getUserMediaSpy.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<CameraViewfinder 
        onCapture={mockOnCapture}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
      />);
      
      expect(screen.getByText('Starting camera…')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('successful camera initialization', () => {
    beforeEach(() => {
      getUserMediaSpy.mockResolvedValueOnce(mockStream);
    });

    it('should render video element when camera is active', async () => {
      render(<CameraViewfinder 
        onCapture={mockOnCapture}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
      />);
      
      await waitFor(() => {
        const video = screen.getByLabelText('Live camera feed for bottle scanning');
        expect(video).toBeInTheDocument();
      });
    });

    it('should render framing guide overlay', async () => {
      render(<CameraViewfinder
        onCapture={mockOnCapture}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
      />);

      await waitFor(() => {
        // Guidance overlay is always rendered when camera is active; status pill shows "Align Bottle" when not ready
        const overlay = document.querySelector('.camera-guidance-overlay');
        expect(overlay).toBeInTheDocument();
      });
    });

    it('should render capture button', async () => {
      render(<CameraViewfinder 
        onCapture={mockOnCapture}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
      />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Capture photo')).toBeInTheDocument();
      });
    });

    it('should have hidden canvas for image processing', async () => {
      render(<CameraViewfinder 
        onCapture={mockOnCapture}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
      />);
      
      await waitFor(() => {
        const canvas = document.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
      });
    });
  });

  describe('permission denied', () => {
    beforeEach(() => {
      getUserMediaSpy.mockRejectedValueOnce(new DOMException('Permission denied', 'NotAllowedError'));
    });

    it('should show error state when permission denied', async () => {
      render(<CameraViewfinder
        onCapture={mockOnCapture}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
      />);

      await waitFor(() => {
        // permission-denied state renders "Camera Access Required" (not "Camera Unavailable")
        expect(screen.getByText('Camera Access Required')).toBeInTheDocument();
      });
    });

    it('should have alert role for accessibility', async () => {
      render(<CameraViewfinder 
        onCapture={mockOnCapture}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
      />);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('camera errors', () => {
    it('should handle no camera found error', async () => {
      getUserMediaSpy.mockRejectedValueOnce(
        new DOMException('No camera found', 'NotFoundError')
      );
      
      render(<CameraViewfinder 
        onCapture={mockOnCapture}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
      />);
      
      await waitFor(() => {
        expect(screen.getByText('Camera Unavailable')).toBeInTheDocument();
      });
      
      expect(mockOnError).toHaveBeenCalled();
    });

    it('should handle camera in use error', async () => {
      getUserMediaSpy.mockRejectedValueOnce(
        new DOMException('Camera in use', 'NotReadableError')
      );
      
      render(<CameraViewfinder 
        onCapture={mockOnCapture}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
      />);
      
      await waitFor(() => {
        expect(screen.getByText('Camera Unavailable')).toBeInTheDocument();
      });
      
      expect(mockOnError).toHaveBeenCalled();
    });
  });

  describe('image capture', () => {
    beforeEach(() => {
      getUserMediaSpy.mockResolvedValueOnce(mockStream);
      mockIsReady = false;
    });

    it('should show "Capture manually" label when live guidance is enabled', async () => {
      render(<CameraViewfinder 
        onCapture={mockOnCapture}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
        enableLiveGuidance={true}
      />);
      
      await waitFor(() => {
        expect(screen.getByText('Capture manually')).toBeInTheDocument();
      });
    });

    it('should trigger onCapture when isReady becomes true (auto-capture)', async () => {
      const { rerender } = render(<CameraViewfinder 
        onCapture={mockOnCapture}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
        enableLiveGuidance={true}
      />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Live camera feed for bottle scanning')).toBeInTheDocument();
      });

      // Simulate guidance becoming ready
      mockIsReady = true;
      rerender(<CameraViewfinder 
        onCapture={mockOnCapture}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
        enableLiveGuidance={true}
      />);

      await waitFor(() => {
        expect(mockOnCapture).toHaveBeenCalled();
      });
    });

    it('should have capture button available', async () => {
      mockIsReady = true;
      render(<CameraViewfinder 
        onCapture={mockOnCapture}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
      />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Capture photo')).toBeInTheDocument();
      });
    });

    it('should create canvas for image processing', async () => {
      render(<CameraViewfinder 
        onCapture={mockOnCapture}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
      />);
      
      await waitFor(() => {
        const canvas = document.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
      });
    });
  });

  describe('cleanup', () => {
    it('should stop camera stream on unmount', async () => {
      const mockTrack = {
        getCapabilities: vi.fn(() => ({ torch: true })),
        applyConstraints: vi.fn(),
        stop: vi.fn(),
      };
      
      const mockStreamWithStop = {
        ...mockStream,
        getVideoTracks: vi.fn(() => [mockTrack]),
        getTracks: vi.fn(() => [mockTrack]),
      };
      
      getUserMediaSpy.mockResolvedValueOnce(mockStreamWithStop);
      
      const { unmount } = render(<CameraViewfinder 
        onCapture={mockOnCapture}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
      />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Live camera feed for bottle scanning')).toBeInTheDocument();
      });
      
      unmount();
      
      expect(mockTrack.stop).toHaveBeenCalled();
    });
  });
});
