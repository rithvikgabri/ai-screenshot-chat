# Project Handoff: AI Screenshot Chat

## Project Overview

**AI Screenshot Chat** is a Next.js application that enables users to chat with AI (OpenAI GPT-4o) while sharing screenshots. Currently, screenshots are captured using the browser's Screen Capture API, which allows users to select their entire screen, a specific window, or a browser tab.

## Current State

### ✅ Implemented Features
- Real-time AI chat using Vercel AI SDK v5
- Screenshot capture via `getDisplayMedia()` API
- Full test coverage (97.82%)
- Modern UI with Tailwind CSS and dark mode
- TypeScript throughout
- Production-ready build

### 🚧 Next Feature: Screenshot Cropping (Option A)

The next feature to implement is **in-browser cropping** after screenshot capture. This will allow users to:
1. Capture their screen/window/tab (current functionality)
2. See the captured image in a modal/overlay
3. Select a specific area to crop
4. Send only the cropped portion to the AI chat

## Implementation Plan for Cropping Feature

### 1. **Install Cropping Library**
```bash
pnpm add react-image-crop
pnpm add -D @types/react-image-crop
```

Or alternatively, use `react-easy-crop` which has better mobile support:
```bash
pnpm add react-easy-crop
```

### 2. **Create Cropping Component**

Create `src/components/ImageCropper.tsx`:

```typescript
import { useState } from 'react'
import ReactCrop, { Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

interface ImageCropperProps {
  imageSrc: string
  onCropComplete: (croppedImageUrl: string) => void
  onCancel: () => void
}

export function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 50,
    height: 50,
    x: 25,
    y: 25
  })

  const getCroppedImg = async () => {
    const image = new Image()
    image.src = imageSrc
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    // Calculate pixel crop values
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    
    canvas.width = crop.width
    canvas.height = crop.height
    
    ctx?.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    )
    
    const croppedImageUrl = canvas.toDataURL('image/png')
    onCropComplete(croppedImageUrl)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
        <h2 className="text-xl font-bold mb-4">Crop Screenshot</h2>
        
        <ReactCrop crop={crop} onChange={setCrop}>
          <img src={imageSrc} alt="Screenshot to crop" />
        </ReactCrop>
        
        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={getCroppedImg}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Use Cropped Area
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 3. **Update Chat Component**

Modify `src/app/page.tsx` to include cropping:

```typescript
// Add state for cropping
const [tempScreenshot, setTempScreenshot] = useState<string | null>(null)

// Update captureScreen function
const captureScreen = async () => {
  try {
    // ... existing capture code ...
    
    // Instead of directly adding to messages, show cropper
    const dataURL = canvas.toDataURL('image/png')
    stream.getTracks().forEach(track => track.stop())
    
    // Show cropper instead of adding to chat
    setTempScreenshot(dataURL)
  } catch (error) {
    console.error('Error capturing screen:', error)
  }
}

// Add handler for crop complete
const handleCropComplete = (croppedImageUrl: string) => {
  const newMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content: '',
    parts: [{
      type: 'image-screenshot',
      data: { url: croppedImageUrl }
    }]
  } as any
  setMessages(prevMessages => [...prevMessages, newMessage])
  setTempScreenshot(null)
}

// Add cropper to render
{tempScreenshot && (
  <ImageCropper
    imageSrc={tempScreenshot}
    onCropComplete={handleCropComplete}
    onCancel={() => setTempScreenshot(null)}
  />
)}
```

### 4. **Write Tests**

Create `src/components/__tests__/ImageCropper.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { ImageCropper } from '../ImageCropper'

describe('ImageCropper', () => {
  const mockOnCropComplete = jest.fn()
  const mockOnCancel = jest.fn()
  
  it('should render cropping interface', () => {
    render(
      <ImageCropper
        imageSrc="data:image/png;base64,test"
        onCropComplete={mockOnCropComplete}
        onCancel={mockOnCancel}
      />
    )
    
    expect(screen.getByText('Crop Screenshot')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Use Cropped Area')).toBeInTheDocument()
  })
  
  // Add more tests for cropping functionality
})
```

### 5. **Update README**

Add to the features section:
- ✂️ **Screenshot cropping** - Select specific areas after capture

## Technical Considerations

### State Management
- The cropping modal should be managed with local state in the chat component
- Consider using a context if the app grows more complex

### Performance
- Large screenshots may cause performance issues
- Consider resizing images before cropping if they're too large
- Use `URL.createObjectURL()` for better memory management with large images

### UX Improvements
1. Add a loading state while processing the crop
2. Show instructions on how to use the cropper
3. Add preset aspect ratios (16:9, 4:3, 1:1, free)
4. Allow zooming for precise cropping

### Accessibility
- Ensure keyboard navigation works in the cropper
- Add proper ARIA labels
- Test with screen readers

## Testing Checklist

- [ ] Cropper appears after screenshot capture
- [ ] Can adjust crop area with mouse/touch
- [ ] Cancel button closes cropper without adding image
- [ ] Crop button adds cropped image to chat
- [ ] Original screenshot is discarded after cropping
- [ ] Works on different screen sizes
- [ ] Memory is properly cleaned up (no leaks)

## Alternative Libraries

If `react-image-crop` doesn't meet needs:
1. **react-easy-crop** - Better mobile support, pinch-to-zoom
2. **cropperjs** - More features but larger bundle
3. **Custom implementation** - Full control but more work

## Browser Compatibility

Cropping works in all browsers since it uses Canvas API:
- ✅ Chrome
- ✅ Firefox  
- ✅ Safari
- ✅ Edge

## Deployment Notes

No changes needed for deployment - the cropping happens entirely client-side.

## Questions for Product

1. Should we save the full screenshot or only the cropped version?
2. Do we want preset aspect ratios or free-form cropping?
3. Should users be able to re-crop after sending?
4. Do we want to add annotation tools (arrows, text) in the future?

## Resources

- [react-image-crop docs](https://github.com/DominicTobias/react-image-crop)
- [Canvas API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Image manipulation best practices](https://web.dev/fast/#optimize-your-images)

---

Good luck with the implementation! The test coverage should remain high, and the cropping feature will greatly improve the user experience by allowing precise screenshot selection.