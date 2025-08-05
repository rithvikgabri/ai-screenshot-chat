'use client'

import { useChat } from '@ai-sdk/react'
import { useState } from 'react'
import type { MyUIMessage } from '@/lib/types'

export default function ChatPage() {
  const { messages, sendMessage, setMessages } = useChat<MyUIMessage>()
  const [input, setInput] = useState('')

  const captureScreen = async () => {
    try {
      // Check if screen capture is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('Screen capture is not supported in your browser')
        return
      }

      // Prompt user to pick a screen/window/tab
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
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

      // Add screenshot to chat
      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: '',
          parts: [{
            type: 'image-screenshot',
            data: { url: dataURL }
          }]
        }
      ])
    } catch (error) {
      console.error('Error capturing screen:', error)
    }
  }

  return (
    <div className="flex flex-col w-full max-w-md mx-auto py-24 stretch">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map(message => (
          <div key={message.id} className="whitespace-pre-wrap">
            <strong>{message.role === 'user' ? 'You:' : 'AI:'}</strong>
            {message.parts.map((part, i) => {
              switch (part.type) {
                case 'text':
                  return <div key={`${message.id}-${i}`}>{part.text}</div>
                case 'image-screenshot':
                  return (
                    <img 
                      key={`${message.id}-${i}`} 
                      src={part.data.url} 
                      alt="Screenshot"
                      className="mt-2 rounded max-w-full"
                    />
                  )
                default:
                  return null
              }
            })}
          </div>
        ))}
      </div>

      <form
        onSubmit={e => {
          e.preventDefault()
          if (input.trim()) {
            sendMessage({ text: input })
            setInput('')
          }
        }}
        className="sticky bottom-0 flex gap-1"
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask me anything..."
          className="flex-1 border p-2 rounded"
        />
        <button type="submit" className="px-4 py-2 border rounded">
          Send
        </button>
        <button
          type="button"
          onClick={captureScreen}
          className="px-2 py-2 border rounded"
        >
          📸
        </button>
      </form>
    </div>
  )
}