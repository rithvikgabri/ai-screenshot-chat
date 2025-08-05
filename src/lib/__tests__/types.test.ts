import type { MyUIMessage, ScreenshotPart } from '../types'
import type { UIMessage } from 'ai'

describe('Custom Message Types', () => {
  describe('ScreenshotPart', () => {
    it('should have the correct structure', () => {
      const screenshotPart: ScreenshotPart = {
        type: 'image-screenshot',
        data: {
          url: 'data:image/png;base64,iVBORw0KGgoAAAANS...'
        }
      }

      expect(screenshotPart.type).toBe('image-screenshot')
      expect(screenshotPart.data).toHaveProperty('url')
      expect(screenshotPart.data.url).toContain('data:image')
    })

    it('should support object URLs', () => {
      const screenshotPart: ScreenshotPart = {
        type: 'image-screenshot',
        data: {
          url: 'blob:http://localhost:3000/12345-67890'
        }
      }

      expect(screenshotPart.data.url).toContain('blob:')
    })
  })

  describe('MyUIMessage', () => {
    it('should support text parts', () => {
      const message: MyUIMessage = {
        id: '1',
        role: 'user',
        content: 'Hello',
        parts: [
          {
            type: 'text',
            text: 'Hello'
          }
        ]
      }

      expect(message.parts[0].type).toBe('text')
      expect((message.parts[0] as any).text).toBe('Hello') // eslint-disable-line @typescript-eslint/no-explicit-any
    })

    it('should support screenshot parts', () => {
      const message: MyUIMessage = {
        id: '2',
        role: 'user',
        content: '',
        parts: [
          {
            type: 'image-screenshot',
            data: {
              url: 'data:image/png;base64,iVBORw0KGgoAAAANS...'
            }
          }
        ]
      }

      expect(message.parts[0].type).toBe('image-screenshot')
      expect((message.parts[0] as ScreenshotPart).data.url).toContain('data:image')
    })

    it('should support mixed text and screenshot parts', () => {
      const message: MyUIMessage = {
        id: '3',
        role: 'user',
        content: 'Check this screenshot',
        parts: [
          {
            type: 'text',
            text: 'Check this screenshot'
          },
          {
            type: 'image-screenshot',
            data: {
              url: 'data:image/png;base64,iVBORw0KGgoAAAANS...'
            }
          }
        ]
      }

      expect(message.parts).toHaveLength(2)
      expect(message.parts[0].type).toBe('text')
      expect(message.parts[1].type).toBe('image-screenshot')
    })

    it('should support assistant role', () => {
      const message: MyUIMessage = {
        id: '4',
        role: 'assistant',
        content: 'I can see the screenshot',
        parts: [
          {
            type: 'text',
            text: 'I can see the screenshot'
          }
        ]
      }

      expect(message.role).toBe('assistant')
    })

    it('should be compatible with UIMessage type', () => {
      const message: MyUIMessage = {
        id: '5',
        role: 'user',
        content: 'Test',
        parts: [
          {
            type: 'text',
            text: 'Test'
          }
        ]
      }

      // This should compile without errors
      const uiMessage: UIMessage = message
      expect(uiMessage.id).toBe('5')
    })
  })
})