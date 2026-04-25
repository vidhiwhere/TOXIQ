export default function DecisionBanner({ decision, confidence, top3 }) {
  const config = {
    Proceed:  { emoji: '✅', color: '#00ffcc', glow: '#00ffcc44', label: 'PROCEED TO DEVELOPMENT', bg: 'rgba(0,255,204,0.06)' },
    Optimize: { emoji: '⚠️', color: '#f5a623', glow: '#f5a62344', label: 'OPTIMIZE BEFORE ADVANCING', bg: 'rgba(245,166,35,0.06)' },
    Reject:   { emoji: '❌', color: '#ff3366', glow: '#ff336644', label: 'REJECT — HIGH TOXICITY RISK', bg: 'rgba(255,51,102,0.06)' },
  }
  const c = config[decision] || config.Optimize
  const pct = Math.round((confidence || 0) * 100)
  const circ = 2 * Math.PI * 36
  const dash = (pct / 100) * circ

  return (
    <div className="decision-banner" style={{ background: c.bg, borderColor: c.color + '55', boxShadow: `0 0 40px ${c.glow}` }}>
      <div className="decision-left">
        <div className="decision-emoji" style={{ fontSize: '3rem' }}>{c.emoji}</div>
        <div>
          <div className="decision-label" style={{ color: '#a0a0b0', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>AI Verdict</div>
          <div className="decision-text" style={{ color: c.color, fontSize: '1.6rem', fontWeight: 900, letterSpacing: '0.05em', textShadow: `0 0 20px ${c.color}88` }}>{c.label}</div>
        </div>
      </div>

      <div className="decision-center">
        <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="45" cy="45" r="36" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
          <circle cx="45" cy="45" r="36" fill="none" stroke={c.color} strokeWidth="7"
            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 6px ${c.color})` }} />
        </svg>
        <div style={{ position: 'absolute', textAlign: 'center' }}>
          <div style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 800 }}>{pct}%</div>
          <div style={{ color: '#a0a0b0', fontSize: '0.65rem', textTransform: 'uppercase' }}>Confidence</div>
        </div>
      </div>

      {top3 && top3.length > 0 && (
        <div className="decision-right">
          <div style={{ color: '#a0a0b0', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Top Risk Drivers</div>
          {top3.map((item, i) => (
            <div key={i} className="top-risk-pill" style={{ borderColor: i === 0 ? c.color + '66' : 'rgba(255,255,255,0.08)' }}>
              <span style={{ color: i === 0 ? c.color : '#ccc', fontWeight: 700, fontSize: '0.8rem' }}>{item.meaning}</span>
              <span style={{ color: item.probability >= 0.5 ? '#ff3366' : '#00ffcc', fontWeight: 800, fontSize: '0.85rem', marginLeft: 'auto' }}>
                {(item.probability * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
