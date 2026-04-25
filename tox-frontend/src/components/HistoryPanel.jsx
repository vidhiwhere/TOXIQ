import { useState, useEffect } from 'react'

const HISTORY_KEY = 'toxiq_history'
const MAX_ITEMS = 10

export function saveToHistory(smiles, result) {
  try {
    const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    const entry = {
      smiles, decision: result.decision, confidence: result.confidence_score,
      maxProb: Math.max(...Object.values(result.assays)),
      lipinski: result.lipinski?.pass,
      timestamp: new Date().toISOString(),
    }
    const filtered = existing.filter(e => e.smiles !== smiles)
    const updated = [entry, ...filtered].slice(0, MAX_ITEMS)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  } catch {}
}

export default function HistoryPanel({ onSelect, onClose }) {
  const [history, setHistory] = useState([])
  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')) } catch {}
  }, [])

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY)
    setHistory([])
  }

  const decColor = { Proceed: '#00ffcc', Optimize: '#f5a623', Reject: '#ff3366' }

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, height: '100vh', width: 340, zIndex: 1000,
      background: 'rgba(8,8,18,0.97)', borderLeft: '1px solid rgba(155,77,255,0.25)',
      backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column',
      boxShadow: '-20px 0 60px rgba(0,0,0,0.5)'
    }}>
      <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>🕓 Prediction History</div>
          <div style={{ color: '#a0a0b0', fontSize: '0.75rem', marginTop: 2 }}>{history.length} saved</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a0a0b0', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
        {history.length === 0 ? (
          <div style={{ color: '#555', textAlign: 'center', marginTop: '3rem', fontSize: '0.9rem' }}>No predictions yet.<br/>Run a prediction to save it here.</div>
        ) : history.map((h, i) => (
          <div key={i} onClick={() => onSelect(h.smiles)}
            style={{
              marginBottom: '0.75rem', padding: '0.85rem 1rem', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              transition: 'border-color 0.2s, background 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#9b4dff55'; e.currentTarget.style.background = 'rgba(155,77,255,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
          >
            <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#c8d8ff', marginBottom: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.smiles}</div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 12, background: `${decColor[h.decision] || '#666'}22`, color: decColor[h.decision] || '#aaa', border: `1px solid ${decColor[h.decision] || '#666'}44` }}>{h.decision}</span>
              <span style={{ color: '#666677', fontSize: '0.7rem' }}>{Math.round((h.confidence || 0) * 100)}% conf</span>
              <span style={{ color: '#666677', fontSize: '0.7rem' }}>|</span>
              <span style={{ color: h.lipinski ? '#00ffcc88' : '#ff336688', fontSize: '0.7rem' }}>{h.lipinski ? '💊 Drug-like' : '⚠ Not drug-like'}</span>
            </div>
            <div style={{ color: '#444455', fontSize: '0.65rem', marginTop: '0.35rem' }}>{new Date(h.timestamp).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={clearHistory} style={{
            width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid rgba(255,51,102,0.3)',
            background: 'rgba(255,51,102,0.06)', color: '#ff3366', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem'
          }}>Clear History</button>
        </div>
      )}
    </div>
  )
}
