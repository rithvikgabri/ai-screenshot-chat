# Screenshot Selection Implementation Guide

This guide explains how to implement the macOS-style screenshot selection functionality from this project into your own chat application.

## Overview

The screenshot selection feature provides a native macOS-like experience where users can:
- Capture their screen using the browser's Screen Capture API
- Select a specific area by clicking and dragging (like Cmd+Shift+4)
- See real-time dimensions while selecting
- Get the cropped image as a data URL

## Prerequisites

- React 18+ or 19+
- TypeScript (optional but recommended)
- Tailwind CSS for styling (or adapt styles to your CSS framework)

## Implementation Steps

### 1. Create the ScreenshotSelector Component

First, create the `ScreenshotSelector` component that handles the selection UI:

```tsx
// components/ScreenshotSelector.tsx
import { useState, useEffect, useRef, useCallback } from 'react'

interface ScreenshotSelectorProps {
  imageSrc: string
  onSelectionComplete: (croppedImageUrl: string) => void
  onCancel: () => void
}

interface Selection {
  startX: number
  startY: number
  endX: number
  endY: number
}

async function getCroppedImage(
  imageSrc: string,
  selection: Selection,
  imageElement: HTMLImageElement
): Promise<string> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Calculate the actual selection bounds
  const left = Math.min(selection.startX, selection.endX)
  const top = Math.min(selection.startY, selection.endY)
  const width = Math.abs(selection.endX - selection.startX)
  const height = Math.abs(selection.endY - selection.startY)

  // Calculate scale between displayed size and natural size
  const scaleX = imageElement.naturalWidth / imageElement.width
  const scaleY = imageElement.naturalHeight / imageElement.height

  // Set canvas size to the selection size
  canvas.width = width * scaleX
  canvas.height = height * scaleY

  // Draw the selected portion of the image
  ctx.drawImage(
    imageElement,
    left * scaleX,
    top * scaleY,
    width * scaleX,
    height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  )

  return canvas.toDataURL('image/png')
}

export function ScreenshotSelector({ imageSrc, onSelectionComplete, onCancel }: ScreenshotSelectorProps) {
  const [isSelecting, setIsSelecting] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Calculate selection box dimensions and position
  const getSelectionBox = useCallback(() => {
    if (!selection) return null

    const left = Math.min(selection.startX, selection.endX)
    const top = Math.min(selection.startY, selection.endY)
    const width = Math.abs(selection.endX - selection.startX)
    const height = Math.abs(selection.endY - selection.startY)

    return { left, top, width, height }
  }, [selection])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsSelecting(true)
    setSelection({
      startX: x,
      startY: y,
      endX: x,
      endY: y
    })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !selection) return

    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setSelection({
      ...selection,
      endX: x,
      endY: y
    })
  }, [isSelecting, selection])

  const handleMouseUp = useCallback(async () => {
    if (!isSelecting || !selection || !imageRef.current) return

    const box = getSelectionBox()
    if (!box || box.width < 10 || box.height < 10) {
      // Selection too small, cancel
      setIsSelecting(false)
      setSelection(null)
      return
    }

    try {
      const croppedImage = await getCroppedImage(imageSrc, selection, imageRef.current)
      onSelectionComplete(croppedImage)
    } catch (error) {
      console.error('Error cropping image:', error)
    }

    setIsSelecting(false)
    setSelection(null)
  }, [isSelecting, selection, imageSrc, onSelectionComplete, getSelectionBox])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const selectionBox = getSelectionBox()
  const showSelection = isSelecting && selectionBox && (selectionBox.width > 0 || selectionBox.height > 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-6xl max-h-[90vh] mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-100 dark:bg-gray-900 px-4 py-3 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Select Screenshot Area
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Cancel selection"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Click and drag to select area • Press ESC to cancel
          </p>
        </div>

        {/* Selection area */}
        <div 
          ref={overlayRef}
          className="relative bg-gray-50 dark:bg-gray-900 cursor-crosshair select-none overflow-auto"
          style={{ maxHeight: 'calc(90vh - 80px)' }}
          role="dialog"
          aria-label="Screenshot selection area"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Screenshot image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Screenshot to select from"
            className="block"
            draggable={false}
          />

          {/* Selection overlay */}
          {showSelection && selectionBox && (
            <>
              {/* Dark overlay outside selection */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Top */}
                <div 
                  className="absolute left-0 right-0 bg-black/50"
                  style={{ top: 0, height: selectionBox.top }}
                />
                {/* Bottom */}
                <div 
                  className="absolute left-0 right-0 bg-black/50"
                  style={{ top: selectionBox.top + selectionBox.height, bottom: 0 }}
                />
                {/* Left */}
                <div 
                  className="absolute bg-black/50"
                  style={{ 
                    left: 0, 
                    top: selectionBox.top, 
                    width: selectionBox.left, 
                    height: selectionBox.height 
                  }}
                />
                {/* Right */}
                <div 
                  className="absolute bg-black/50"
                  style={{ 
                    left: selectionBox.left + selectionBox.width, 
                    right: 0, 
                    top: selectionBox.top, 
                    height: selectionBox.height 
                  }}
                />
              </div>

              {/* Selection box */}
              <div
                data-testid="selection-box"
                className="absolute border-2 border-blue-500 shadow-lg pointer-events-none"
                style={{
                  left: selectionBox.left,
                  top: selectionBox.top,
                  width: selectionBox.width,
                  height: selectionBox.height
                }}
              >
                {/* Dimensions display */}
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {selectionBox.width} × {selectionBox.height}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

### 2. Integrate with Your Chat Component

Add screenshot capture functionality to your chat component:

```tsx
// components/ChatComponent.tsx
import { useState } from 'react'
import { ScreenshotSelector } from './ScreenshotSelector'

export function ChatComponent() {
  const [messages, setMessages] = useState<Message[]>([])
  const [tempScreenshot, setTempScreenshot] = useState<string | null>(null)

  const captureScreen = async () => {
    try {
      // Check if screen capture is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('Screen capture is not supported in your browser')
        return
      }

      // Prompt user to pick a screen/window/tab
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as MediaTrackConstraints,
        audio: false
      })

      // Create video element to capture frame
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()

      // Draw first frame to canvas
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0)

      // Convert to data URL
      const dataURL = canvas.toDataURL('image/png')

      // Stop capture to free resources
      stream.getTracks().forEach(track => track.stop())

      // Show selector instead of directly adding to chat
      setTempScreenshot(dataURL)
    } catch (error) {
      console.error('Error capturing screen:', error)
    }
  }

  const handleSelectionComplete = (croppedImageUrl: string) => {
    // Add the cropped screenshot to your messages
    const newMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: '',
      image: croppedImageUrl,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, newMessage])
    setTempScreenshot(null)
  }

  const handleSelectionCancel = () => {
    setTempScreenshot(null)
  }

  return (
    <div className="chat-container">
      {/* Your chat messages UI */}
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id}>
            {msg.content && <p>{msg.content}</p>}
            {msg.image && <img src={msg.image} alt="Screenshot" />}
          </div>
        ))}
      </div>

      {/* Chat input with screenshot button */}
      <div className="chat-input">
        <button onClick={captureScreen} title="Capture screenshot">
          📸
        </button>
        {/* Other chat input controls */}
      </div>

      {/* Screenshot selector modal */}
      {tempScreenshot && (
        <ScreenshotSelector
          imageSrc={tempScreenshot}
          onSelectionComplete={handleSelectionComplete}
          onCancel={handleSelectionCancel}
        />
      )}
    </div>
  )
}
```

### 3. Handle Browser Permissions

Make sure to handle browser permissions gracefully:

```tsx
const captureScreen = async () => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' } as MediaTrackConstraints,
      audio: false
    })
    // ... rest of capture logic
  } catch (error: any) {
    if (error.name === 'NotAllowedError') {
      alert('Screen capture permission was denied')
    } else if (error.name === 'NotSupportedError') {
      alert('Screen capture is not supported in this browser')
    } else {
      console.error('Error capturing screen:', error)
      alert('Failed to capture screen')
    }
  }
}
```

### 4. TypeScript Types (Optional)

If using TypeScript, define your types:

```typescript
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  image?: string
  timestamp: Date
}

interface Selection {
  startX: number
  startY: number
  endX: number
  endY: number
}
```

### 5. Styling Without Tailwind

If you're not using Tailwind CSS, here are the key styles to implement:

```css
/* ScreenshotSelector.css */
.screenshot-selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.screenshot-selector-modal {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-width: 72rem;
  max-height: 90vh;
  margin: 0 1rem;
  overflow: hidden;
}

.screenshot-selector-header {
  background-color: #f3f4f6;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.screenshot-selector-area {
  position: relative;
  background-color: #f9fafb;
  cursor: crosshair;
  user-select: none;
  overflow: auto;
  max-height: calc(90vh - 80px);
}

.selection-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.selection-box {
  position: absolute;
  border: 2px solid #3b82f6;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  pointer-events: none;
}

.selection-dimensions {
  position: absolute;
  bottom: -32px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #3b82f6;
  color: white;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  white-space: nowrap;
}
```

## Usage Example

Here's a complete example of how to use the screenshot functionality in a chat application:

```tsx
import React, { useState } from 'react'
import { ScreenshotSelector } from './components/ScreenshotSelector'

function App() {
  const [messages, setMessages] = useState([])
  const [screenshotData, setScreenshotData] = useState(null)

  const handleScreenshotCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      })

      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)

      const dataURL = canvas.toDataURL('image/png')
      stream.getTracks().forEach(track => track.stop())

      setScreenshotData(dataURL)
    } catch (error) {
      console.error('Screenshot capture failed:', error)
    }
  }

  const handleSelectionComplete = (croppedImage) => {
    // Send the cropped image to your chat
    sendMessage({
      type: 'image',
      content: croppedImage
    })
    setScreenshotData(null)
  }

  return (
    <div className="app">
      <button onClick={handleScreenshotCapture}>
        Take Screenshot
      </button>

      {screenshotData && (
        <ScreenshotSelector
          imageSrc={screenshotData}
          onSelectionComplete={handleSelectionComplete}
          onCancel={() => setScreenshotData(null)}
        />
      )}
    </div>
  )
}
```

## Browser Compatibility

The screenshot functionality works in modern browsers that support the Screen Capture API:

- ✅ Chrome/Edge (version 72+)
- ✅ Firefox (version 66+)
- ✅ Safari (version 13+)
- ❌ Internet Explorer (not supported)

## Security Considerations

1. **HTTPS Required**: The Screen Capture API only works on secure contexts (HTTPS)
2. **User Permission**: Users must explicitly grant permission to capture their screen
3. **Origin Restrictions**: Cannot capture cross-origin iframes without permission

## Customization Options

You can customize the selection experience:

```tsx
// Custom minimum selection size
const MIN_SELECTION_SIZE = 20 // pixels

// Custom selection box color
const SELECTION_BORDER_COLOR = '#00ff00' // green

// Show/hide dimensions
const SHOW_DIMENSIONS = true

// Custom overlay opacity
const OVERLAY_OPACITY = 0.6
```

## Testing

Here's a basic test for the screenshot selector:

```tsx
import { render, fireEvent, screen } from '@testing-library/react'
import { ScreenshotSelector } from './ScreenshotSelector'

describe('ScreenshotSelector', () => {
  it('should call onSelectionComplete when area is selected', () => {
    const mockComplete = jest.fn()
    const mockCancel = jest.fn()
    
    render(
      <ScreenshotSelector
        imageSrc="data:image/png;base64,test"
        onSelectionComplete={mockComplete}
        onCancel={mockCancel}
      />
    )

    const dialog = screen.getByRole('dialog')
    
    // Simulate selection
    fireEvent.mouseDown(dialog, { clientX: 100, clientY: 100 })
    fireEvent.mouseMove(dialog, { clientX: 200, clientY: 200 })
    fireEvent.mouseUp(dialog)

    // Should complete selection
    expect(mockComplete).toHaveBeenCalled()
  })
})
```

## Troubleshooting

Common issues and solutions:

1. **"Screen capture is not supported"**
   - Ensure you're using HTTPS
   - Check browser compatibility
   - Verify browser permissions

2. **Selection not working**
   - Check that mouse events are properly bound
   - Ensure no z-index conflicts
   - Verify pointer-events CSS property

3. **Cropped image is blank**
   - Check CORS policies for images
   - Ensure canvas drawing is complete
   - Verify image dimensions

## Conclusion

This implementation provides a native-feeling screenshot selection experience that integrates seamlessly with chat applications. The modular design makes it easy to adapt to different frameworks and styling systems.