import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ScreenshotSelector } from '../ScreenshotSelector'

describe('ScreenshotSelector', () => {
  const mockOnSelectionComplete = jest.fn()
  const mockOnCancel = jest.fn()
  const testImageSrc = 'data:image/png;base64,test'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render screenshot in fullscreen overlay', () => {
    render(
      <ScreenshotSelector
        imageSrc={testImageSrc}
        onSelectionComplete={mockOnSelectionComplete}
        onCancel={mockOnCancel}
      />
    )

    const overlay = screen.getByRole('dialog')
    expect(overlay).toHaveAttribute('aria-label', 'Screenshot selection area')
    
    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('src', testImageSrc)
    expect(image).toHaveAttribute('alt', 'Screenshot to select from')
  })

  it('should show title and instructions', () => {
    render(
      <ScreenshotSelector
        imageSrc={testImageSrc}
        onSelectionComplete={mockOnSelectionComplete}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Select Screenshot Area')).toBeInTheDocument()
    expect(screen.getByText(/Click and drag/)).toBeInTheDocument()
  })

  it('should have a close button', () => {
    render(
      <ScreenshotSelector
        imageSrc={testImageSrc}
        onSelectionComplete={mockOnSelectionComplete}
        onCancel={mockOnCancel}
      />
    )

    const closeButton = screen.getByLabelText('Cancel selection')
    fireEvent.click(closeButton)
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it('should cancel on Escape key', () => {
    render(
      <ScreenshotSelector
        imageSrc={testImageSrc}
        onSelectionComplete={mockOnSelectionComplete}
        onCancel={mockOnCancel}
      />
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it('should start selection on mouse down', () => {
    render(
      <ScreenshotSelector
        imageSrc={testImageSrc}
        onSelectionComplete={mockOnSelectionComplete}
        onCancel={mockOnCancel}
      />
    )

    const overlay = screen.getByRole('dialog')
    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 100 })

    // Should not show selection box until mouse moves
    expect(screen.queryByTestId('selection-box')).not.toBeInTheDocument()
  })

  it('should draw selection box on mouse drag', () => {
    render(
      <ScreenshotSelector
        imageSrc={testImageSrc}
        onSelectionComplete={mockOnSelectionComplete}
        onCancel={mockOnCancel}
      />
    )

    const overlay = screen.getByRole('dialog')
    
    // Start selection
    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 100 })
    
    // Drag to create selection
    fireEvent.mouseMove(overlay, { clientX: 200, clientY: 200 })
    
    // Should show selection box
    const selectionBox = screen.getByTestId('selection-box')
    expect(selectionBox).toBeInTheDocument()
    expect(selectionBox).toHaveStyle({
      left: '100px',
      top: '100px',
      width: '100px',
      height: '100px'
    })
  })

  it('should complete selection on mouse up', async () => {
    // Mock canvas and image loading
    const mockCanvas = {
      getContext: jest.fn(() => ({
        drawImage: jest.fn(),
      })),
      toDataURL: jest.fn(() => 'data:image/png;base64,cropped'),
      width: 0,
      height: 0,
    }
    
    const originalCreateElement = document.createElement
    document.createElement = jest.fn((tagName) => {
      if (tagName === 'canvas') {
        return mockCanvas as unknown as HTMLCanvasElement
      }
      return originalCreateElement.call(document, tagName)
    })

    const originalImage = global.Image
    global.Image = class MockImage extends window.Image {
      src = ''
      onload: (() => void) | null = null
      naturalWidth = 1000
      naturalHeight = 800
      width = 1000
      height = 800
      constructor() {
        super()
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 0)
      }
    }

    render(
      <ScreenshotSelector
        imageSrc={testImageSrc}
        onSelectionComplete={mockOnSelectionComplete}
        onCancel={mockOnCancel}
      />
    )

    const overlay = screen.getByRole('dialog')
    
    // Create selection
    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 100 })
    fireEvent.mouseMove(overlay, { clientX: 200, clientY: 200 })
    fireEvent.mouseUp(overlay)

    // Should call onSelectionComplete with cropped image
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(mockOnSelectionComplete).toHaveBeenCalledWith('data:image/png;base64,cropped')

    // Restore mocks
    document.createElement = originalCreateElement
    global.Image = originalImage
  })

  it('should show dimensions while selecting', () => {
    render(
      <ScreenshotSelector
        imageSrc={testImageSrc}
        onSelectionComplete={mockOnSelectionComplete}
        onCancel={mockOnCancel}
      />
    )

    const overlay = screen.getByRole('dialog')
    
    // Start selection
    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 100 })
    fireEvent.mouseMove(overlay, { clientX: 250, clientY: 180 })
    
    // Should show dimensions
    expect(screen.getByText('150 × 80')).toBeInTheDocument()
  })

  it('should handle reverse selection (bottom-right to top-left)', () => {
    render(
      <ScreenshotSelector
        imageSrc={testImageSrc}
        onSelectionComplete={mockOnSelectionComplete}
        onCancel={mockOnCancel}
      />
    )

    const overlay = screen.getByRole('dialog')
    
    // Start selection from bottom-right
    fireEvent.mouseDown(overlay, { clientX: 300, clientY: 300 })
    
    // Drag to top-left
    fireEvent.mouseMove(overlay, { clientX: 100, clientY: 100 })
    
    // Should still show correct selection box
    const selectionBox = screen.getByTestId('selection-box')
    expect(selectionBox).toHaveStyle({
      left: '100px',
      top: '100px',
      width: '200px',
      height: '200px'
    })
  })

  it('should not complete selection if area is too small', () => {
    render(
      <ScreenshotSelector
        imageSrc={testImageSrc}
        onSelectionComplete={mockOnSelectionComplete}
        onCancel={mockOnCancel}
      />
    )

    const overlay = screen.getByRole('dialog')
    
    // Create very small selection
    fireEvent.mouseDown(overlay, { clientX: 100, clientY: 100 })
    fireEvent.mouseMove(overlay, { clientX: 102, clientY: 102 })
    fireEvent.mouseUp(overlay)

    // Should not call onSelectionComplete
    expect(mockOnSelectionComplete).not.toHaveBeenCalled()
  })

  it('should have proper cursor style on selection area', () => {
    render(
      <ScreenshotSelector
        imageSrc={testImageSrc}
        onSelectionComplete={mockOnSelectionComplete}
        onCancel={mockOnCancel}
      />
    )

    const selectionArea = screen.getByRole('dialog')
    expect(selectionArea).toHaveClass('cursor-crosshair')
  })
})