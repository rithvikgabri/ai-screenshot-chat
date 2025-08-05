import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatPage from '../page'
import { useChat } from '@ai-sdk/react'

// Mock the useChat hook
jest.mock('@ai-sdk/react', () => ({
  useChat: jest.fn(),
}))

// Mock navigator.mediaDevices
const mockGetDisplayMedia = jest.fn()
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getDisplayMedia: mockGetDisplayMedia,
  },
  writable: true,
})

describe('ChatPage', () => {
  const mockSendMessage = jest.fn()
  const mockSetMessages = jest.fn()
  
  const defaultMockChat = {
    messages: [],
    sendMessage: mockSendMessage,
    setMessages: mockSetMessages,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useChat as jest.Mock).mockReturnValue(defaultMockChat)
    
    // Reset mediaDevices mock
    mockGetDisplayMedia.mockReset()
  })

  it('should render the chat interface', () => {
    render(<ChatPage />)
    
    expect(screen.getByPlaceholderText('Ask me anything...')).toBeInTheDocument()
    expect(screen.getByText('Send')).toBeInTheDocument()
    expect(screen.getByText('📸')).toBeInTheDocument()
  })

  it('should show empty state when no messages', () => {
    render(<ChatPage />)
    
    expect(screen.getByText('AI Screenshot Chat')).toBeInTheDocument()
    expect(screen.getByText('Start a conversation or capture a screenshot to begin')).toBeInTheDocument()
  })

  it('should display messages', () => {
    const mockMessages = [
      {
        id: '1',
        role: 'user',
        content: 'Hello',
        parts: [{ type: 'text', text: 'Hello' }],
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Hi there!',
        parts: [{ type: 'text', text: 'Hi there!' }],
      },
    ]
    
    ;(useChat as jest.Mock).mockReturnValue({
      ...defaultMockChat,
      messages: mockMessages,
    })

    render(<ChatPage />)
    
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('should send a message when form is submitted', async () => {
    const user = userEvent.setup()
    render(<ChatPage />)
    
    const input = screen.getByPlaceholderText('Ask me anything...')
    const sendButton = screen.getByText('Send')
    
    await user.type(input, 'Test message')
    await user.click(sendButton)
    
    expect(mockSendMessage).toHaveBeenCalledWith({ text: 'Test message' })
    expect(input).toHaveValue('')
  })

  it('should send message on Enter key', async () => {
    const user = userEvent.setup()
    render(<ChatPage />)
    
    const input = screen.getByPlaceholderText('Ask me anything...')
    
    await user.type(input, 'Test message{enter}')
    
    expect(mockSendMessage).toHaveBeenCalledWith({ text: 'Test message' })
    expect(input).toHaveValue('')
  })

  it('should display screenshot parts in messages', () => {
    const mockMessages = [
      {
        id: '1',
        role: 'user',
        content: '',
        parts: [
          {
            type: 'image-screenshot',
            data: { url: 'data:image/png;base64,test' },
          },
        ],
      },
    ]
    
    ;(useChat as jest.Mock).mockReturnValue({
      ...defaultMockChat,
      messages: mockMessages,
    })

    render(<ChatPage />)
    
    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('src', 'data:image/png;base64,test')
    expect(image).toHaveClass('mt-2', 'rounded-lg', 'max-w-full', 'shadow-lg')
  })

  describe('Screenshot functionality', () => {
    beforeEach(() => {
      // Mock HTMLCanvasElement methods
      HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
        drawImage: jest.fn(),
      })) as any // eslint-disable-line @typescript-eslint/no-explicit-any
      
      HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mockdata')
      
      // Mock HTMLVideoElement
      HTMLVideoElement.prototype.play = jest.fn(() => Promise.resolve())
      Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
        get: jest.fn(() => 1920),
      })
      Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
        get: jest.fn(() => 1080),
      })
    })

    it('should capture screenshot when button is clicked', async () => {
      const mockStop = jest.fn()
      const mockStream = {
        getTracks: jest.fn(() => [{ stop: mockStop }]),
      }
      
      mockGetDisplayMedia.mockResolvedValue(mockStream)
      
      const user = userEvent.setup()
      render(<ChatPage />)
      
      const screenshotButton = screen.getByText('📸')
      await user.click(screenshotButton)
      
      await waitFor(() => {
        expect(mockGetDisplayMedia).toHaveBeenCalledWith({
          video: { cursor: 'always' },
          audio: false,
        })
      })
      
      await waitFor(() => {
        expect(mockSetMessages).toHaveBeenCalled()
      })
      
      const setMessagesCall = mockSetMessages.mock.calls[0][0]
      const newMessages = setMessagesCall([])
      expect(newMessages).toHaveLength(1)
      expect(newMessages[0].role).toBe('user')
      expect(newMessages[0].parts[0].type).toBe('image-screenshot')
      expect(newMessages[0].parts[0].data.url).toContain('data:image/png')
      
      // Verify stream was stopped
      expect(mockStop).toHaveBeenCalled()
    })

    it('should handle screenshot capture errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      mockGetDisplayMedia.mockRejectedValue(new Error('Permission denied'))
      
      const user = userEvent.setup()
      render(<ChatPage />)
      
      const screenshotButton = screen.getByText('📸')
      await user.click(screenshotButton)
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error capturing screen:', expect.any(Error))
      })
      
      // Ensure no message was added
      expect(mockSetMessages).not.toHaveBeenCalled()
      
      consoleErrorSpy.mockRestore()
    })

    it('should handle browser without screen capture support', async () => {
      // Remove mediaDevices to simulate unsupported browser
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        writable: true,
      })
      
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation()
      
      const user = userEvent.setup()
      render(<ChatPage />)
      
      const screenshotButton = screen.getByText('📸')
      await user.click(screenshotButton)
      
      expect(alertSpy).toHaveBeenCalledWith('Screen capture is not supported in your browser')
      
      alertSpy.mockRestore()
      
      // Restore mediaDevices
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getDisplayMedia: mockGetDisplayMedia,
        },
        writable: true,
      })
    })
  })

  it('should display mixed text and screenshot parts', () => {
    const mockMessages = [
      {
        id: '1',
        role: 'user',
        content: 'Check this screenshot',
        parts: [
          { type: 'text', text: 'Check this screenshot' },
          {
            type: 'image-screenshot',
            data: { url: 'data:image/png;base64,test' },
          },
        ],
      },
    ]
    
    ;(useChat as jest.Mock).mockReturnValue({
      ...defaultMockChat,
      messages: mockMessages,
    })

    render(<ChatPage />)
    
    expect(screen.getByText('Check this screenshot')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/png;base64,test')
  })
})