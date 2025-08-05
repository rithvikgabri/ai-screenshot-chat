import type { UIMessage } from 'ai'

export type ScreenshotPart = {
  type: 'image-screenshot'
  data: {
    url: string // Data URL or Object URL
  }
}

export type MyUIMessage = UIMessage<never, ScreenshotPart>