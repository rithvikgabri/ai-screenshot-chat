import { POST } from '../route'

// Mock the AI SDK modules before importing them
jest.mock('ai', () => ({
  streamText: jest.fn(),
  convertToModelMessages: jest.fn((messages) => messages),
}))

jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(),
}))

// Import after mocking
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

describe('/api/chat', () => {
  const mockStreamText = streamText as jest.MockedFunction<typeof streamText>
  const mockToUIMessageStreamResponse = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // Setup default mock return value
    mockStreamText.mockReturnValue({
      toUIMessageStreamResponse: mockToUIMessageStreamResponse,
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    mockToUIMessageStreamResponse.mockReturnValue(new Response())
    
    // Mock openai to return a model object
    ;(openai as jest.MockedFunction<typeof openai>).mockReturnValue({} as any) // eslint-disable-line @typescript-eslint/no-explicit-any
  })

  it('should handle POST request with messages', async () => {
    const mockMessages = [
      { id: '1', role: 'user', content: 'Hello', parts: [{ type: 'text', text: 'Hello' }] }
    ]

    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: mockMessages }),
    })

    const response = await POST(request)

    expect(mockStreamText).toHaveBeenCalledWith({
      model: expect.anything(),
      messages: expect.anything(),
    })
    expect(mockToUIMessageStreamResponse).toHaveBeenCalled()
    expect(response).toBeInstanceOf(Response)
  })

  it('should use OpenAI GPT-4o model', async () => {
    const mockOpenAIModel = jest.fn()
    ;(openai as jest.MockedFunction<typeof openai>).mockReturnValue(mockOpenAIModel)

    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: [] }),
    })

    await POST(request)

    expect(openai).toHaveBeenCalledWith('gpt-4o')
    expect(mockStreamText).toHaveBeenCalledWith({
      model: mockOpenAIModel,
      messages: expect.anything(),
    })
  })

  it('should convert UI messages to model messages', async () => {
    const mockMessages = [
      { 
        id: '1', 
        role: 'user', 
        content: 'Hello',
        parts: [{ type: 'text', text: 'Hello' }]
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Hi there!',
        parts: [{ type: 'text', text: 'Hi there!' }]
      }
    ]

    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: mockMessages }),
    })

    await POST(request)

    // Verify streamText was called
    expect(mockStreamText).toHaveBeenCalled()
    const streamTextCall = mockStreamText.mock.calls[0][0]
    expect(streamTextCall.messages).toBeDefined()
  })

  it('should handle empty messages array', async () => {
    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: [] }),
    })

    const response = await POST(request)

    expect(mockStreamText).toHaveBeenCalledWith({
      model: expect.anything(),
      messages: expect.anything(),
    })
    expect(response).toBeInstanceOf(Response)
  })

  it('should return stream response', async () => {
    const mockStreamResponse = new Response('stream', {
      headers: {
        'Content-Type': 'text/event-stream',
      },
    })
    mockToUIMessageStreamResponse.mockReturnValue(mockStreamResponse)

    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: [] }),
    })

    const response = await POST(request)

    expect(response).toBe(mockStreamResponse)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
  })
})