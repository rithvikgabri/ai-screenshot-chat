'use client'

import { useChat } from '@ai-sdk/react'
import { useState, useEffect, useRef } from 'react'
import type { MyUIMessage } from '@/lib/types'
import { ImageCropper } from '@/components/ImageCropper'

export default function ChatPage() {
  const { messages, sendMessage, setMessages } = useChat<MyUIMessage>()
  const [input, setInput] = useState('')
  const [tempScreenshot, setTempScreenshot] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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

      // Show cropper instead of directly adding to chat
      setTempScreenshot(dataURL)
    } catch (error) {
      console.error('Error capturing screen:', error)
    }
  }

  const handleCropComplete = (croppedImageUrl: string) => {
    const newMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: '',
      parts: [{
        type: 'image-screenshot',
        data: { url: croppedImageUrl }
      }]
    } as any // eslint-disable-line @typescript-eslint/no-explicit-any
    setMessages(prevMessages => [...prevMessages, newMessage])
    setTempScreenshot(null)
  }

  const handleCropCancel = () => {
    setTempScreenshot(null)
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                AI Screenshot Chat
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Start a conversation or capture a screenshot to begin
              </p>
            </div>
          </div>
        )}
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              {message.parts.map((part: any, i) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                switch (part.type) {
                  case 'text':
                    return <div key={`${message.id}-${i}`} className="whitespace-pre-wrap">{part.text}</div>
                  case 'image-screenshot':
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        key={`${message.id}-${i}`} 
                        src={part.data.url} 
                        alt="Screenshot"
                        className="mt-2 rounded-lg max-w-full shadow-lg"
                      />
                    )
                  default:
                    return null
                }
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <form
          onSubmit={e => {
            e.preventDefault()
            if (input.trim()) {
              sendMessage({ text: input })
              setInput('')
            }
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          <button 
            type="submit" 
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            Send
          </button>
          <button
            type="button"
            onClick={captureScreen}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            title="Capture screenshot"
          >
            📸
          </button>
        </form>
      </div>

      {tempScreenshot && (
        <ImageCropper
          imageSrc={tempScreenshot}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  )
}