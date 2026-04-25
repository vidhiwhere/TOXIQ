export default function AdmetCard({ admet }) {
  if (!admet) return null
  const sections = [
    { key: 'absorption', label: 'Absorption', icon: '⬇️', desc: 'Oral uptake into systemic circulation' },
    { key: 'distribution', label: 'Distribution', icon: '🔀', desc: 'Tissue penetration & plasma binding' },
    { key: 'metabolism', label: 'Metabolism', icon: '⚗️', desc: 'Hepatic CYP enzyme liability' },
    { key: 'excretion', label: 'Excretion', icon: '🔄', desc: 'Primary elimination route' },
    { key: 'toxicity_summary', label: 'Toxicity', icon: '☠️', desc: 'Overall toxicological concern' },
  ]
  const colorMap = {
    'Good': '#00ffcc', 'High': '#00ffcc', 'Low Risk': '#00ffcc', 'Low Concern': '#00ffcc',
    'Moderate': '#f5a623', 'Mixed': '#f5a623', 'Moderate Risk': '#f5a623', 'Moderate Concern': '#f5a623', 'Renal': '#9b4dff',
    'Poor': '#ff3366', 'Low': '#ff3366', 'High Risk': '#ff3366', 'High Concern': '#ff3366', 'Hepatic': '#f5a623',
  }
  return (
    <div className="dashboard-panel admet-card">
      <h3 style={{ marginBottom: '1rem' }}>🧬 ADMET Overview</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
        {sections.map(s => {
          const val = admet[s.key] || 'Unknown'
          const col = colorMap[val] || '#a0a0b0'
          return (
            <div key={s.key} style={{
              padding: '1rem', borderRadius: 10, textAlign: 'center',
              background: `${col}0d`, border: `1px solid ${col}33`
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{s.icon}</div>
              <div style={{ color: '#a0a0b0', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>{s.label}</div>
              <div style={{ color: col, fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.3rem' }}>{val}</div>
              <div style={{ color: '#666677', fontSize: '0.68rem' }}>{s.desc}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
