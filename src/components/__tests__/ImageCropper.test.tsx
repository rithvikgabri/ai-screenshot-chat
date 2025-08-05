import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ImageCropper } from '../ImageCropper'

// Mock react-easy-crop
jest.mock('react-easy-crop', () => ({
  __esModule: true,
  default: ({ crop, zoom, onCropChange, onZoomChange, children }: any) => (
    <div data-testid="react-easy-crop">
      <div data-testid="crop-values">
        crop: {JSON.stringify(crop)}, zoom: {zoom}
      </div>
      <button onClick={() => onCropChange({ x: 10, y: 10 })}>Change Crop</button>
      <button onClick={() => onZoomChange(2)}>Change Zoom</button>
      {children}
    </div>
  ),
}))

describe('ImageCropper', () => {
  const mockOnCropComplete = jest.fn()
  const mockOnCancel = jest.fn()
  const testImageSrc = 'data:image/png;base64,test'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render cropping interface with all controls', () => {
    render(
      <ImageCropper
        imageSrc={testImageSrc}
        onCropComplete={mockOnCropComplete}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Crop Screenshot')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Apply Crop')).toBeInTheDocument()
    expect(screen.getByText('Skip Crop')).toBeInTheDocument()
    expect(screen.getByLabelText('Zoom')).toBeInTheDocument()
  })

  it('should display aspect ratio buttons', () => {
    render(
      <ImageCropper
        imageSrc={testImageSrc}
        onCropComplete={mockOnCropComplete}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.getByText('1:1')).toBeInTheDocument()
    expect(screen.getByText('4:3')).toBeInTheDocument()
    expect(screen.getByText('16:9')).toBeInTheDocument()
  })

  it('should call onCancel when cancel button is clicked', () => {
    render(
      <ImageCropper
        imageSrc={testImageSrc}
        onCropComplete={mockOnCropComplete}
        onCancel={mockOnCancel}
      />
    )

    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it('should call onCropComplete with original image when skip crop is clicked', () => {
    render(
      <ImageCropper
        imageSrc={testImageSrc}
        onCropComplete={mockOnCropComplete}
        onCancel={mockOnCancel}
      />
    )

    fireEvent.click(screen.getByText('Skip Crop'))
    expect(mockOnCropComplete).toHaveBeenCalledWith(testImageSrc)
  })

  it('should update zoom value when slider is changed', () => {
    render(
      <ImageCropper
        imageSrc={testImageSrc}
        onCropComplete={mockOnCropComplete}
        onCancel={mockOnCancel}
      />
    )

    const zoomSlider = screen.getByLabelText('Zoom')
    fireEvent.change(zoomSlider, { target: { value: '2' } })
    
    expect(zoomSlider).toHaveValue('2')
  })

  it('should change aspect ratio when aspect ratio button is clicked', () => {
    render(
      <ImageCropper
        imageSrc={testImageSrc}
        onCropComplete={mockOnCropComplete}
        onCancel={mockOnCancel}
      />
    )

    const squareButton = screen.getByText('1:1')
    fireEvent.click(squareButton)
    
    // Check that the button is now active (has different styling)
    expect(squareButton).toHaveClass('bg-blue-500', 'text-white')
  })

  it('should handle keyboard shortcuts', () => {
    render(
      <ImageCropper
        imageSrc={testImageSrc}
        onCropComplete={mockOnCropComplete}
        onCancel={mockOnCancel}
      />
    )

    // Test Escape key
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })


  it('should have proper accessibility attributes', () => {
    render(
      <ImageCropper
        imageSrc={testImageSrc}
        onCropComplete={mockOnCropComplete}
        onCancel={mockOnCancel}
      />
    )

    // Check for proper ARIA labels
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Image cropping dialog')
    expect(screen.getByLabelText('Zoom')).toHaveAttribute('aria-valuemin', '1')
    expect(screen.getByLabelText('Zoom')).toHaveAttribute('aria-valuemax', '3')
  })

  it('should display crop instructions', () => {
    render(
      <ImageCropper
        imageSrc={testImageSrc}
        onCropComplete={mockOnCropComplete}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText(/Drag to move/)).toBeInTheDocument()
  })
})