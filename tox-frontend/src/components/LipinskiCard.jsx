export default function LipinskiCard({ lipinski }) {
  if (!lipinski) return null
  const { pass, violations, rule_values } = lipinski
  const rules = [
    { label: 'Molecular Weight', rule: 'MW ≤ 500', value: `${rule_values.MW} g/mol`, pass: rule_values.MW <= 500 },
    { label: 'Lipophilicity', rule: 'LogP ≤ 5', value: rule_values.LogP, pass: rule_values.LogP <= 5 },
    { label: 'H-Bond Donors', rule: 'HBD ≤ 5', value: rule_values.HBD, pass: rule_values.HBD <= 5 },
    { label: 'H-Bond Acceptors', rule: 'HBA ≤ 10', value: rule_values.HBA, pass: rule_values.HBA <= 10 },
  ]
  return (
    <div className="dashboard-panel lipinski-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>💊 Lipinski Rule of Five</h3>
        <span style={{
          padding: '0.3rem 0.8rem', borderRadius: 20, fontWeight: 800, fontSize: '0.8rem',
          background: pass ? 'rgba(0,255,204,0.12)' : 'rgba(255,51,102,0.12)',
          color: pass ? '#00ffcc' : '#ff3366',
          border: `1px solid ${pass ? '#00ffcc44' : '#ff336644'}`
        }}>{pass ? '✅ Drug-Like' : `❌ ${violations.length} Violation${violations.length > 1 ? 's' : ''}`}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {rules.map((r, i) => (
          <div key={i} style={{
            padding: '0.75rem 1rem', borderRadius: 8,
            background: r.pass ? 'rgba(0,255,204,0.04)' : 'rgba(255,51,102,0.06)',
            border: `1px solid ${r.pass ? '#00ffcc22' : '#ff336633'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#a0a0b0', fontSize: '0.78rem' }}>{r.label}</span>
              <span style={{ fontSize: '1rem' }}>{r.pass ? '✅' : '❌'}</span>
            </div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', margin: '0.25rem 0 0.1rem' }}>{r.value}</div>
            <div style={{ color: r.pass ? '#00ffcc88' : '#ff336688', fontSize: '0.72rem' }}>{r.rule}</div>
          </div>
        ))}
      </div>
      {!pass && (
        <div style={{ marginTop: '1rem', padding: '0.6rem 1rem', background: 'rgba(255,51,102,0.06)', borderRadius: 8, borderLeft: '3px solid #ff3366', fontSize: '0.82rem', color: '#ffaaaa' }}>
          <strong>Violations:</strong> {violations.join(' • ')} — This compound may have poor oral bioavailability.
        </div>
      )}
    </div>
  )
}
