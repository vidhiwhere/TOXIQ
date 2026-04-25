import { useState } from 'react'

const SCAFFOLDS = [
  { name: 'Benzene', smiles: 'c1ccccc1', icon: '⬡' },
  { name: 'Pyridine', smiles: 'c1ccncc1', icon: '⬡N' },
  { name: 'Indole', smiles: 'c1ccc2[nH]ccc2c1', icon: '🔷' },
  { name: 'Piperidine', smiles: 'C1CCNCC1', icon: '⬡' },
  { name: 'Morpholine', smiles: 'C1COCCN1', icon: '⬡' },
  { name: 'Imidazole', smiles: 'c1cnc[nH]1', icon: '⬡' },
  { name: 'Thiophene', smiles: 'c1ccsc1', icon: '⬡S' },
  { name: 'Purine', smiles: 'c1ncnc2[nH]cnc12', icon: '🔷' },
  { name: 'Aspirin', smiles: 'CC(=O)Oc1ccccc1C(=O)O', icon: '💊' },
  { name: 'Caffeine', smiles: 'Cn1cnc2c1c(=O)n(C)c(=O)n2C', icon: '☕' },
  { name: 'Bisphenol A', smiles: 'CC(c1ccc(O)cc1)(c1ccc(O)cc1)C', icon: '⚠️' },
  { name: 'Paracetamol', smiles: 'CC(=O)Nc1ccc(O)cc1', icon: '💊' },
]

export default function ScaffoldPicker({ onSelect }) {
  const [filter, setFilter] = useState('')
  const filtered = SCAFFOLDS.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="dashboard-panel" style={{ marginTop: '1rem' }}>
      <h3 style={{ marginBottom: '0.75rem' }}>🧱 Scaffold Picker</h3>
      <p style={{ color: '#a0a0b0', fontSize: '0.82rem', marginBottom: '1rem' }}>
        Click any scaffold to load its SMILES into the prediction input.
      </p>
      <input
        type="text" placeholder="Search scaffolds..."
        value={filter} onChange={e => setFilter(e.target.value)}
        style={{
          width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, marginBottom: '1rem', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem'
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
        {filtered.map(s => (
          <button key={s.name} onClick={() => onSelect(s.smiles)}
            style={{
              padding: '0.6rem 0.5rem', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
              background: 'rgba(155,77,255,0.08)', border: '1px solid rgba(155,77,255,0.2)',
              color: '#c8d8ff', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(155,77,255,0.2)'; e.currentTarget.style.borderColor = '#9b4dff66' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(155,77,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(155,77,255,0.2)' }}
          >
            <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>{s.icon}</div>
            <div>{s.name}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
