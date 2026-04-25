import { useState, useRef, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import ReactMarkdown from 'react-markdown'
import ChatAIOrb from '../components/ChatAIOrb'
import './Chat.css'

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      content: 'Hello! I am the **ToxIQ AI Assistant**. Enter a molecule name (e.g., *Aspirin*, *Caffeine*, *Paclitaxel*) to fetch its real-time chemical profile from PubChem, ChEMBL, Wikipedia, and openFDA.'
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

  // Extract a molecule name from natural-language input
  const extractMoleculeName = (text) => {
    const cleaned = text
      .replace(/^(is|what is|tell me about|lookup|search|find|show me|analyse|analyze|describe|explain)\s+/i, '')
      .replace(/\s+(safe|toxic|dangerous|safe\?|toxic\?|dangerous\?|profile|data|info|information|details|properties|structure)\s*\??$/i, '')
      .replace(/\?$/, '')
      .trim()
    return cleaned
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!inputVal.trim()) return

    const userMessage = inputVal.trim()
    const moleculeName = extractMoleculeName(userMessage)
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setInputVal('')
    setLoading(true)

    try {
      const res = await fetch('http://127.0.0.1:8000/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ molecule_name: moleculeName, message: '' })
      })

      const data = await res.json()

      if (data.success) {
        setMessages(prev => [...prev, { 
          role: 'bot', 
          content: data.message,
          image: data.image_base64
        }])
      } else {
        setMessages(prev => [...prev, { 
          role: 'bot', 
          content: `I couldn't find data for **"${moleculeName}"**. Try a specific molecule name like *Aspirin*, *Caffeine*, *Ibuprofen*, or *Paclitaxel*.`
        }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', content: '⚠️ Error connecting to the ToxIQ backend. Please ensure the API server is running.' }])
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

            <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {[
                { label: '💊 Aspirin', mol: 'Aspirin' },
                { label: '☕ Caffeine', mol: 'Caffeine' },
                { label: '⚗️ Bisphenol A', mol: 'Bisphenol A' },
                { label: '🧬 Paclitaxel', mol: 'Paclitaxel' },
                { label: '💉 Ibuprofen', mol: 'Ibuprofen' },
              ].map(({ label, mol }, idx) => (
                <button key={idx} onClick={() => setInputVal(mol)}
                  style={{
                    background: 'rgba(155,77,255,0.1)', border: '1px solid rgba(155,77,255,0.2)', color: '#c8d8ff',
                    padding: '0.35rem 0.75rem', borderRadius: 16, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(155,77,255,0.25)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#9b4dff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(155,77,255,0.1)'; e.currentTarget.style.color = '#c8d8ff'; e.currentTarget.style.borderColor = 'rgba(155,77,255,0.2)' }}
                >
                  {label}
                </button>
              ))}
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
