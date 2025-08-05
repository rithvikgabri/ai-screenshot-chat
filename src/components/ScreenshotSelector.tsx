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