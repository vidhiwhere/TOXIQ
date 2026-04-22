import { useState, useRef, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import ReactMarkdown from 'react-markdown'
import ChatAIOrb from '../components/ChatAIOrb'
import './Chat.css'

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      content: 'Hello! I am the ToxIQ AI Assistant. Tell me the name of a molecule (e.g., "Aspirin" or "Caffeine") to fetch its real-time profile from PubChem and ChEMBL.'
    }
  ])
  const [inputVal, setInputVal] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!inputVal.trim()) return

    const userMessage = inputVal.trim()
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setInputVal('')
    setLoading(true)

    try {
      const res = await fetch('http://127.0.0.1:8000/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ molecule_name: userMessage, message: '' })
      })

      const data = await res.json()

      if (data.success) {
        setMessages(prev => [...prev, { 
          role: 'bot', 
          content: data.message,
          image: data.image_base64
        }])
      } else {
        setMessages(prev => [...prev, { role: 'bot', content: data.message }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', content: 'Sorry, I encountered an error connecting to the backend servers. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat-page-wrapper">
      <div className="chat-split-layout">
        
        {/* Left Side: 3D Core */}
        <div className="chat-3d-section">
          <Canvas camera={{ position: [0, 0, 8], fov: 40 }}>
            <Suspense fallback={null}>
              <ChatAIOrb loading={loading} />
            </Suspense>
          </Canvas>
          <div className="chat-3d-overlay">
            <h3>ToxIQ Intelligence Core</h3>
            <p className={loading ? 'core-active' : 'core-idle'}>
              {loading ? 'Fetching Molecular Data...' : 'System Online'}
            </p>
          </div>
        </div>

        {/* Right Side: Chat Interface */}
        <div className="chat-ui-section">
          <div className="chat-container">
            <div className="chat-header">
              <h2>🤖 AI Assistant</h2>
            </div>
            
            <div className="chat-messages">
              {messages.map((msg, idx) => (
                <div key={idx} className={`message-wrapper ${msg.role}`}>
                  <div className="message-bubble">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {msg.image && (
                      <img 
                        src={`data:image/png;base64,${msg.image}`} 
                        alt="Molecule Structure" 
                        className="bot-molecule-img" 
                      />
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="message-wrapper bot">
                  <div className="message-bubble">
                    <div className="loading-dots">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSend}>
              <input
                type="text"
                className="chat-input"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Type a molecule name (e.g. Paclitaxel)..."
                disabled={loading}
              />
              <button type="submit" className="chat-send-btn" disabled={loading || !inputVal.trim()}>
                ➤
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}
