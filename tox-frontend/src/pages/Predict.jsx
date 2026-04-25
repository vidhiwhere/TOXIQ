import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three/webgpu'
import { float, If, PI, color, cos, instanceIndex, Loop, mix, mod, sin, instancedArray, Fn, uint, uniform, uniformArray, hash, vec3, vec4 } from 'three/tsl'
import { OrbitControls } from 'three-stdlib'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'
import DecisionBanner from '../components/DecisionBanner'
import LipinskiCard from '../components/LipinskiCard'
import AdmetCard from '../components/AdmetCard'
import HistoryPanel, { saveToHistory } from '../components/HistoryPanel'
import ScaffoldPicker from '../components/ScaffoldPicker'

import './Predict.css'

export default function Predict() {
  const containerRef = useRef(null)
  const dashboardRef = useRef(null)
  const compareDashboardRef = useRef(null)

  const [smiles, setSmiles] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const [compareSmiles1, setCompareSmiles1] = useState('')
  const [compareSmiles2, setCompareSmiles2] = useState('')
  const [compareResult1, setCompareResult1] = useState(null)
  const [compareResult2, setCompareResult2] = useState(null)
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareError, setCompareError] = useState(null)

  // New feature state
  const [showHistory, setShowHistory] = useState(false)
  const [showScaffold, setShowScaffold] = useState(false)
  const [batchFile, setBatchFile] = useState(null)
  const [batchResults, setBatchResults] = useState(null)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchError, setBatchError] = useState(null)
  const [similarResults, setSimilarResults] = useState(null)
  const [similarLoading, setSimilarLoading] = useState(false)
  const batchRef = useRef(null)

  const handlePredict = async (e) => {
    e.preventDefault()
    if (!smiles.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setSimilarResults(null)
    try {
      const res = await fetch('http://127.0.0.1:8000/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smiles })
      })
      if (!res.ok) throw new Error('Prediction failed')
      const data = await res.json()
      setResult(data)
      saveToHistory(smiles, data)
      setTimeout(() => { dashboardRef.current?.scrollIntoView({ behavior: 'smooth' }) }, 100)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBatch = async () => {
    if (!batchFile) return
    setBatchLoading(true)
    setBatchError(null)
    setBatchResults(null)
    try {
      const fd = new FormData()
      fd.append('file', batchFile)
      const res = await fetch('http://127.0.0.1:8000/api/batch', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Batch prediction failed')
      const data = await res.json()
      setBatchResults(data)
      setTimeout(() => { batchRef.current?.scrollIntoView({ behavior: 'smooth' }) }, 100)
    } catch (err) {
      setBatchError(err.message)
    } finally {
      setBatchLoading(false)
    }
  }

  const handleSimilar = async () => {
    if (!smiles.trim()) return
    setSimilarLoading(true)
    setSimilarResults(null)
    try {
      const res = await fetch('http://127.0.0.1:8000/api/similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smiles, top_k: 5 })
      })
      const data = await res.json()
      setSimilarResults(data.similar || [])
    } catch {}
    finally { setSimilarLoading(false) }
  }

  const handleExportPDF = () => { window.print() }

  // Draw the SHAP highlighted molecule when result updates
  useEffect(() => {
    if (result && result.smiles) {
      setTimeout(() => {
        const canvas = document.getElementById('shap-canvas')
        if (canvas && window.SmiDrawer) {
          try {
            const drawer = new window.SmiDrawer({ width: 400, height: 300, padding: 5.0 })
            // Green = safe atoms, Red = harmful atoms identified by SHAP
            const harmfulSet = new Set(result.shap_atoms || [])
            const highlights = {}
            for (let i = 0; i < 150; i++) {
              highlights[i] = harmfulSet.has(i) ? '#ff3366' : '#00cc66'
            }
            drawer.draw(result.smiles, '#shap-canvas', 'dark', false, { atoms: highlights, bonds: {} })
          } catch (e) {
            console.error('SmilesDrawer render failed', e)
          }
        }
      }, 300)
    }
  }, [result])

  useEffect(() => {
    if (!compareResult1 && !compareResult2) return

    const drawOnCanvas = (id, smiles, atoms, harmfulColor) => {
      let attempts = 0
      const maxAttempts = 20
      const interval = setInterval(() => {
        attempts++
        const canvas = document.getElementById(id)
        if (canvas && window.SmiDrawer) {
          clearInterval(interval)
          try {
            const drawer = new window.SmiDrawer({ width: 400, height: 250, padding: 5.0 })
            const harmfulSet = new Set(atoms || [])
            const highlights = {}
            // Color all atoms green (safe), override harmful ones with red
            for (let i = 0; i < 150; i++) {
              highlights[i] = harmfulSet.has(i) ? '#ff3366' : '#00cc66'
            }
            drawer.draw(smiles, `#${id}`, 'dark', false, { atoms: highlights, bonds: {} })
          } catch(e) { 
            console.error(`SmiDrawer failed for ${id}:`, e)
          }
        }
        if (attempts >= maxAttempts) clearInterval(interval)
      }, 150)
    }

    if (compareResult1?.smiles) {
      drawOnCanvas('shap-canvas-c1', compareResult1.smiles, compareResult1.shap_atoms, '#ff3366')
    }
    if (compareResult2?.smiles) {
      drawOnCanvas('shap-canvas-c2', compareResult2.smiles, compareResult2.shap_atoms, '#00ffcc')
    }
  }, [compareResult1, compareResult2])

  const handleCompare = async (e) => {
    e.preventDefault()
    if (!compareSmiles1.trim() || !compareSmiles2.trim()) return
    setCompareLoading(true)
    setCompareError(null)
    setCompareResult1(null)
    setCompareResult2(null)

    try {
      const [res1, res2] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ smiles: compareSmiles1 })
        }),
        fetch('http://127.0.0.1:8000/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ smiles: compareSmiles2 })
        })
      ])
      
      if (!res1.ok || !res2.ok) throw new Error('Prediction failed for one or both compounds')
      
      const data1 = await res1.json()
      const data2 = await res2.json()
      
      setCompareResult1(data1)
      setCompareResult2(data2)

      setTimeout(() => {
        compareDashboardRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (err) {
      setCompareError(err.message)
    } finally {
      setCompareLoading(false)
    }
  }

  const setExample = (exampleSmiles) => {
    setSmiles(exampleSmiles)
  }

  const assayMeanings = {
    'NR-AR': 'Androgen Receptor',
    'NR-AR-LBD': 'Androgen Receptor Ligand-Binding Domain',
    'NR-AhR': 'Aryl Hydrocarbon Receptor',
    'NR-Aromatase': 'Aromatase',
    'NR-ER': 'Estrogen Receptor',
    'NR-ER-LBD': 'Estrogen Receptor Ligand-Binding Domain',
    'NR-PPAR-gamma': 'Peroxisome Proliferator-Activated Receptor gamma',
    'SR-ARE': 'Oxidative Stress',
    'SR-ATAD5': 'Genotoxicity',
    'SR-HSE': 'Cellular Stress',
    'SR-MMP': 'Mitochondrial Toxicity',
    'SR-p53': 'DNA Damage (p53)'
  }

  let maxProb = 0
  let toxicCount = 0
  let sortedAssays = []
  let riskData = { level: 'LOW', label: 'LOW RISK', class: 'low-risk' }
  let topAssay = ['None', 0]
  let insightText = ''

  if (result && result.assays) {
    sortedAssays = Object.entries(result.assays).sort((a, b) => b[1] - a[1])
    topAssay = sortedAssays[0]
    maxProb = topAssay[1]
    toxicCount = sortedAssays.filter(([, prob]) => prob >= 0.5).length

    if (maxProb > 0.7 || toxicCount >= 2) {
      riskData = { level: 'HIGH', label: 'HIGH RISK', class: 'high-risk' }
    } else if (maxProb >= 0.3) {
      riskData = { level: 'MEDIUM', label: 'MEDIUM RISK', class: 'medium-risk' }
    }

    if (riskData.level === 'LOW') {
      insightText = "This compound presents a minimal pharmacological toxicity risk across all key evaluated targets."
    } else {
      const desc = assayMeanings[topAssay[0]] || topAssay[0]
      if (riskData.level === 'MEDIUM') {
        insightText = `This compound flags a moderate hazard concern, primarily driven by mild disruption to ${desc}.`
      } else {
        insightText = `This compound operates as a systemic hazard, predominantly triggering significant disruption pathways linked to ${desc}.`
      }
    }
  }

  // Generate Compare Radar Data
  let compareRadarData = []
  if (compareResult1 && compareResult2) {
    const keys = Object.keys(assayMeanings)
    compareRadarData = keys.map(assay => ({
      assay: assay,
      comp1: compareResult1.assays[assay] ? parseFloat((compareResult1.assays[assay] * 100).toFixed(1)) : 0,
      comp2: compareResult2.assays[assay] ? parseFloat((compareResult2.assays[assay] * 100).toFixed(1)) : 0
    }))
  }

  const constructRiskData = (res) => {
    if (!res) return null
    let arr = Object.entries(res.assays).sort((a,b) => b[1]-a[1])
    let maxP = arr[0][1]
    let tc = arr.filter(([, p]) => p >= 0.5).length
    if (maxP > 0.7 || tc >= 2) return { level: 'HIGH', label: 'HIGH RISK', class: 'high-risk' }
    if (maxP >= 0.3) return { level: 'MEDIUM', label: 'MEDIUM RISK', class: 'medium-risk' }
    return { level: 'LOW', label: 'LOW RISK', class: 'low-risk' }
  }

  const risk1 = constructRiskData(compareResult1)
  const risk2 = constructRiskData(compareResult2)

  useEffect(() => {
    if (!containerRef.current) return

    let camera, scene, renderer, controls, updateCompute
    let attractors = []
    let active = true

    async function init() {
      camera = new THREE.PerspectiveCamera(25, window.innerWidth / window.innerHeight, 0.1, 100)
      camera.position.set(3, 5, 8)

      scene = new THREE.Scene()
      const ambientLight = new THREE.AmbientLight('#ffffff', 0.5)
      scene.add(ambientLight)
      const directionalLight = new THREE.DirectionalLight('#ffffff', 1.5)
      directionalLight.position.set(4, 2, 0)
      scene.add(directionalLight)

      try {
        renderer = new THREE.WebGPURenderer({ antialias: true })
        await renderer.init() 
      } catch (error) {
        console.error('WebGPU not supported', error)
        if (containerRef.current) {
          containerRef.current.innerHTML = '<div class="predict-error">WebGPU is not supported by your browser. Please try Chrome 113+ or Edge 113+.</div>'
        }
        return
      }
      
      if (!active) {
        renderer.dispose()
        return
      }

      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setClearColor('#05050A') 
      
      if (containerRef.current) {
        containerRef.current.appendChild(renderer.domElement)
      }

      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.minDistance = 0.1
      controls.maxDistance = 50

      const attractorsPositions = uniformArray([
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(1, 0, -0.5),
        new THREE.Vector3(0, 0.5, 1)
      ])
      const attractorsRotationAxes = uniformArray([
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(1, 0, -0.5).normalize()
      ])
      const attractorsLength = uniform(attractorsPositions.array.length, 'uint')
      const helpersRingGeometry = new THREE.RingGeometry(1, 1.02, 32, 1, 0, Math.PI * 1.5)
      const helpersArrowGeometry = new THREE.ConeGeometry(0.1, 0.4, 12, 1, false)
      const helpersMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })

      for (let i = 0; i < attractorsPositions.array.length; i++) {
        const attractor = {}
        attractor.position = attractorsPositions.array[i]
        attractor.orientation = attractorsRotationAxes.array[i]
        attractor.reference = new THREE.Object3D()
        attractor.reference.position.copy(attractor.position)
        attractor.reference.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), attractor.orientation)
        scene.add(attractor.reference)

        attractor.helper = new THREE.Group()
        attractor.helper.scale.setScalar(0.325)
        // hide helpers for a cleaner look
        attractor.helper.visible = false
        attractor.reference.add(attractor.helper)

        attractor.ring = new THREE.Mesh(helpersRingGeometry, helpersMaterial)
        attractor.ring.rotation.x = -Math.PI * 0.5
        attractor.helper.add(attractor.ring)

        attractor.arrow = new THREE.Mesh(helpersArrowGeometry, helpersMaterial)
        attractor.arrow.position.x = 1
        attractor.arrow.position.z = 0.2
        attractor.arrow.rotation.x = Math.PI * 0.5
        attractor.helper.add(attractor.arrow)

        attractors.push(attractor)
      }

      const count = Math.pow(2, 18)
      const material = new THREE.SpriteNodeMaterial({ blending: THREE.AdditiveBlending, depthWrite: false })

      const attractorMass = uniform(Number(`1e7`))
      const particleGlobalMass = uniform(Number(`1e4`))
      const timeScale = uniform(1)
      const spinningStrength = uniform(2.75)
      const maxSpeed = uniform(8)
      const gravityConstant = 6.67e-11
      const velocityDamping = uniform(0.1)
      const scale = uniform(0.008)
      const boundHalfExtent = uniform(8)
      
      const colorA = uniform(color('#9b4dff'))
      const colorB = uniform(color('#4d9bff'))

      const positionBuffer = instancedArray(count, 'vec3')
      const velocityBuffer = instancedArray(count, 'vec3')

      const sphericalToVec3 = Fn(([phi, theta]) => {
        const sinPhiRadius = sin(phi)
        return vec3(
          sinPhiRadius.mul(sin(theta)),
          cos(phi),
          sinPhiRadius.mul(cos(theta))
        )
      })

      const initComputeFn = Fn(() => {
        const position = positionBuffer.element(instanceIndex)
        const velocity = velocityBuffer.element(instanceIndex)
        const basePosition = vec3(
          hash(instanceIndex.add(uint(Math.random() * 0xffffff))),
          hash(instanceIndex.add(uint(Math.random() * 0xffffff))),
          hash(instanceIndex.add(uint(Math.random() * 0xffffff)))
        ).sub(0.5).mul(vec3(5, 0.2, 5))
        position.assign(basePosition)

        const phi = hash(instanceIndex.add(uint(Math.random() * 0xffffff))).mul(PI).mul(2)
        const theta = hash(instanceIndex.add(uint(Math.random() * 0xffffff))).mul(PI)
        const baseVelocity = sphericalToVec3(phi, theta).mul(0.05)
        velocity.assign(baseVelocity)
      })

      const initCompute = initComputeFn().compute(count)
      renderer.compute(initCompute)

      const particleMassMultiplier = hash(instanceIndex.add(uint(Math.random() * 0xffffff))).remap(0.25, 1).toVar()
      const particleMass = particleMassMultiplier.mul(particleGlobalMass).toVar()

      const update = Fn(() => {
        const delta = float(1 / 60).mul(timeScale).toVar()
        const position = positionBuffer.element(instanceIndex)
        const velocity = velocityBuffer.element(instanceIndex)
        const force = vec3(0).toVar()

        Loop(attractorsLength, ({ i }) => {
          const attractorPosition = attractorsPositions.element(i)
          const attractorRotationAxis = attractorsRotationAxes.element(i)
          const toAttractor = attractorPosition.sub(position)
          const distance = toAttractor.length()
          const direction = toAttractor.normalize()

          const gravityStrength = attractorMass.mul(particleMass).mul(gravityConstant).div(distance.pow(2)).toVar()
          const gravityForce = direction.mul(gravityStrength)
          force.addAssign(gravityForce)

          const spinningForce = attractorRotationAxis.mul(gravityStrength).mul(spinningStrength)
          const spinningVelocity = spinningForce.cross(toAttractor)
          force.addAssign(spinningVelocity)
        })

        velocity.addAssign(force.mul(delta))
        const speed = velocity.length()
        If(speed.greaterThan(maxSpeed), () => {
          velocity.assign(velocity.normalize().mul(maxSpeed))
        })
        velocity.mulAssign(velocityDamping.oneMinus())
        position.addAssign(velocity.mul(delta))

        const halfHalfExtent = boundHalfExtent.div(2).toVar()
        position.assign(mod(position.add(halfHalfExtent), boundHalfExtent).sub(halfHalfExtent))
      })

      updateCompute = update().compute(count).setName('Update Particles')

      material.positionNode = positionBuffer.toAttribute()
      material.colorNode = Fn(() => {
        const velocity = velocityBuffer.toAttribute()
        const speed = velocity.length()
        const colorMix = speed.div(maxSpeed).smoothstep(0, 0.5)
        const finalColor = mix(colorA, colorB, colorMix)
        return vec4(finalColor, 1)
      })()
      material.scaleNode = particleMassMultiplier.mul(scale)

      const geometry = new THREE.PlaneGeometry(1, 1)
      const mesh = new THREE.InstancedMesh(geometry, material, count)
      scene.add(mesh)

      renderer.setAnimationLoop(() => {
        if (!active) return
        controls.update()
        renderer.compute(updateCompute)
        renderer.render(scene, camera)
      })
    }

    init()

    const handleResize = () => {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      active = false
      window.removeEventListener('resize', handleResize)
      if (renderer) {
        renderer.setAnimationLoop(null)
        if (containerRef.current && renderer.domElement && containerRef.current.contains(renderer.domElement)) {
          containerRef.current.removeChild(renderer.domElement)
        }
        renderer.dispose()
      }
      if (controls) controls.dispose()
    }
  }, [])

  return (
    <div className="predict-page-wrapper">
      {showHistory && (
        <HistoryPanel
          onSelect={(s) => { setSmiles(s); setShowHistory(false) }}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* TOOLBAR */}
      <div className="predict-toolbar">
        <button className="toolbar-btn" onClick={() => setShowHistory(h => !h)}>🕓 History</button>
        <button className="toolbar-btn" onClick={() => setShowScaffold(s => !s)}>🧱 Scaffolds</button>
        <button className="toolbar-btn toolbar-btn--pdf" onClick={handleExportPDF}>📄 Export PDF</button>
      </div>

      {/* 1. HERO GRAPHIC SECTION */}
      <div className="predict-container" ref={containerRef}>
        <div className="predict-overlay">
          <h2 className="predict-title">ToxIQ Connectivity Model</h2>
          <p className="predict-desc">Real-time molecular attractor projection and Tox21 prediction.</p>
        </div>
      </div>

      {/* 2. INPUT SECTIONS (SIDE-BY-SIDE) */}
      <div className="predict-inputs-wrapper">
        {/* Single Molecule Card */}
        <div className="glass-panel">
          <h2 className="predict-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>ToxIQ Single Screen</h2>
          <p style={{ color: '#a0a0b0', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Run a deep multi-assay toxicity prediction on a single compound.</p>
          <form onSubmit={handlePredict} className="predict-form" style={{ flexDirection: 'column', gap: '1rem' }}>
            <input 
              type="text" 
              className="predict-input" 
              placeholder="Enter SMILES (e.g. CC(=O)Oc1ccccc1C(=O)O)" 
              value={smiles}
              onChange={(e) => setSmiles(e.target.value)}
              required
            />
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="example-btn" onClick={() => setExample('CC(=O)Oc1ccccc1C(=O)O')}>Aspirin</button>
              <button type="button" className="example-btn" onClick={() => setExample('Cn1cnc2c1c(=O)n(c(=O)n2C)C')}>Caffeine</button>
              <button type="button" className="example-btn" onClick={() => setExample('CC(c1ccc(O)cc1)(c1ccc(O)cc1)C')}>Bisphenol A</button>
            </div>
            <button 
              type="submit" 
              className="action-btn action-btn--purple" 
              disabled={loading} 
              style={{ width: '100%' }}
            >
              {loading ? (
                <span style={{display:'flex', alignItems:'center', gap:8, justifyContent:'center'}}>
                  <span className="spinner"></span> Analyzing...
                </span>
              ) : (
                <span style={{display:'flex', alignItems:'center', gap:10, justifyContent:'center'}}>
                  <span style={{fontSize:'1.1rem'}}>🔬</span> Predict Toxicity
                </span>
              )}
            </button>
          </form>
          {error && <div className="predict-error-msg" style={{ color: '#ff3366', marginTop: '1rem' }}>{error}</div>}
        </div>

        {/* Batch CSV Card */}
        <div className="glass-panel">
          <h2 className="predict-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#f5a623' }}>📁 Batch Screening</h2>
          <p style={{ color: '#a0a0b0', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Upload a CSV with a <code style={{color:'#f5a623'}}>smiles</code> column to screen multiple compounds at once.</p>
          <input
            type="file" accept=".csv"
            onChange={e => setBatchFile(e.target.files[0])}
            style={{ marginBottom: '1rem', color: '#a0a0b0', fontSize: '0.85rem', width: '100%' }}
          />
          <button
            className="action-btn action-btn--gold"
            onClick={handleBatch}
            disabled={!batchFile || batchLoading}
            style={{ width: '100%' }}
          >
            {batchLoading ? <span style={{display:'flex',alignItems:'center',gap:8,justifyContent:'center'}}><span className="spinner"></span> Screening...</span>
              : <span style={{display:'flex',alignItems:'center',gap:10,justifyContent:'center'}}><span>📁</span> Run Batch Screen</span>}
          </button>
          {batchError && <div style={{ color: '#ff3366', marginTop: '0.75rem', fontSize: '0.85rem' }}>{batchError}</div>}
        </div>

        {/* Dual Molecule Card */}
        <div className="glass-panel">
          <h2 className="predict-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#00ffcc' }}>A/B Screening Chamber</h2>
          <p style={{ color: '#a0a0b0', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Run concurrent pharmacological variance analysis on two compounds.</p>
          <form className="predict-form" onSubmit={handleCompare} style={{ flexDirection: 'column', gap: '1rem' }}>
            <input 
              type="text" 
              value={compareSmiles1} 
              onChange={(e) => setCompareSmiles1(e.target.value)} 
              placeholder="Molecule A — e.g. Aspirin" 
              className="predict-input"
              required
            />
            <input 
              type="text" 
              value={compareSmiles2} 
              onChange={(e) => setCompareSmiles2(e.target.value)} 
              placeholder="Molecule B — e.g. Bisphenol A" 
              className="predict-input"
              required
            />
            <button 
              type="submit" 
              className="action-btn action-btn--cyan" 
              disabled={compareLoading} 
              style={{ width: '100%' }}
            >
              {compareLoading ? (
                <span style={{display:'flex', alignItems:'center', gap:8, justifyContent:'center'}}>
                  <span className="spinner"></span> Comparing...
                </span>
              ) : (
                <span style={{display:'flex', alignItems:'center', gap:10, justifyContent:'center'}}>
                  <span style={{fontSize:'1.1rem'}}>⚡</span> Run A/B Comparison
                </span>
              )}
            </button>
          </form>
          {compareError && <div className="predict-error-msg" style={{ color: '#ff3366', marginTop: '1rem' }}>{compareError}</div>}
        </div>
      </div>

      {/* SCAFFOLD PICKER */}
      {showScaffold && (
        <div style={{ padding: '0 2rem', maxWidth: 1400, margin: '0 auto' }}>
          <ScaffoldPicker onSelect={(s) => { setSmiles(s); setShowScaffold(false) }} />
        </div>
      )}

      {/* BATCH RESULTS */}
      {batchResults && (
        <div className="predict-dashboard-section" ref={batchRef}>
          <h2 className="dashboard-title">📁 Batch Screening Results <span style={{color:'#f5a623', fontSize:'1rem'}}>({batchResults.count} compounds)</span></h2>
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="compare-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#a0a0b0', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  {['Name','SMILES','Decision','Confidence','Max Tox','Toxic Assays','Drug-like','Top Assay','PAINS'].map(h => (
                    <th key={h} style={{ padding: '0.9rem 0.75rem', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batchResults.results.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: i%2===0?'rgba(255,255,255,0.015)':'transparent' }}>
                    <td style={{ padding: '0.75rem', color: '#c8d8ff', fontWeight: 600 }}>{r.name}</td>
                    <td style={{ padding: '0.75rem', color: '#666677', fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.smiles}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.8rem', color: r.decision==='Proceed'?'#00ffcc':r.decision==='Reject'?'#ff3366':'#f5a623' }}>
                        {r.decision==='Proceed'?'✅':r.decision==='Reject'?'❌':'⚠️'} {r.decision || 'Error'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#fff' }}>{r.confidence_score ? `${(r.confidence_score*100).toFixed(0)}%` : '—'}</td>
                    <td style={{ padding: '0.75rem', color: r.max_prob>=0.5?'#ff3366':'#00ffcc', fontWeight: 700 }}>{r.max_prob ? `${(r.max_prob*100).toFixed(1)}%` : '—'}</td>
                    <td style={{ padding: '0.75rem', color: r.toxic_count>0?'#ff3366':'#00ffcc' }}>{r.toxic_count !== undefined ? `${r.toxic_count}/12` : '—'}</td>
                    <td style={{ padding: '0.75rem', color: r.lipinski_pass?'#00ffcc':'#ff3366' }}>{r.lipinski_pass !== undefined ? (r.lipinski_pass?'✅':'❌') : '—'}</td>
                    <td style={{ padding: '0.75rem', color: '#a0a0b0', fontSize: '0.8rem' }}>{r.top_assay || '—'}</td>
                    <td style={{ padding: '0.75rem', color: r.pains_alert?'#f5a623':'#666677', fontSize: '0.78rem' }}>{r.pains_alert || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. SINGLE RESULTS DASHBOARD SECTION */}
      {result && (
        <div className="predict-dashboard-section" ref={dashboardRef}>
          <div className="dashboard-header-container">
            <h2 className="dashboard-title">Prediction Dashboard</h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={handleSimilar} disabled={similarLoading} className="toolbar-btn" style={{ fontSize: '0.8rem' }}>
                {similarLoading ? '⏳ Searching...' : '🔍 Similar Molecules'}
              </button>
            </div>
          </div>

          {/* DECISION BANNER */}
          <DecisionBanner decision={result.decision} confidence={result.confidence_score} top3={result.top3_risks} />

          <div className="dashboard-summary-box">
            <div className="summary-icon">ℹ</div>
            <div className="summary-text">
              <strong>Pharmacological Insight:</strong> {insightText}
            </div>
          </div>

          {result.pains_alert && (
            <div className="dashboard-pains-alert">
              <div className="pains-icon">⚠</div>
              <div className="pains-text">
                <strong>PAINS Alert (Pan Assay Interference Compounds):</strong> {result.pains_alert}
                <br/><small>This structure contains features known to cause false positives in biological screening assays.</small>
              </div>
            </div>
          )}

          {/* Lipinski + ADMET row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', margin: '1.5rem 0' }}>
            <LipinskiCard lipinski={result.lipinski} />
            <AdmetCard admet={result.admet} />
          </div>

          {/* SHAP Text Explanation */}
          {result.shap_text && (
            <div className="dashboard-summary-box" style={{ borderLeftColor: '#9b4dff', borderColor: '#9b4dff33', marginBottom: '1.5rem' }}>
              <div className="summary-icon" style={{ background: 'rgba(155,77,255,0.15)', color: '#9b4dff' }}>🧠</div>
              <div className="summary-text">
                <strong>SHAP Explanation:</strong> {result.shap_text}
              </div>
            </div>
          )}

          {/* Improvement Suggestions */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div className="dashboard-panel" style={{ marginBottom: '1.5rem', borderLeft: '3px solid #f5a623' }}>
              <h3 style={{ color: '#f5a623', marginBottom: '0.75rem' }}>💡 Molecule Improvement Suggestions</h3>
              <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                {result.suggestions.map((s, i) => (
                  <li key={i} style={{ color: '#c8d8ff', fontSize: '0.88rem', marginBottom: '0.5rem', lineHeight: 1.5 }}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Similar Molecules */}
          {similarResults && similarResults.length > 0 && (
            <div className="dashboard-panel" style={{ marginBottom: '1.5rem' }}>
              <h3>🔍 Similar Molecules (Tox21 Dataset)</h3>
              <p style={{ color: '#a0a0b0', fontSize: '0.82rem', marginBottom: '1rem' }}>Based on Morgan fingerprint Tanimoto similarity.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {similarResults.map((m, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(155,77,255,0.2)', borderRadius: 10, padding: '0.75rem', cursor: 'pointer', transition: 'border-color 0.2s' }}
                    onClick={() => setSmiles(m.smiles)}
                    title="Click to load this SMILES">
                    {m.image_base64 && <img src={`data:image/png;base64,${m.image_base64}`} alt="mol" style={{ width: '100%', borderRadius: 6, background: '#fff', marginBottom: '0.5rem' }} />}
                    <div style={{ color: '#9b4dff', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.25rem' }}>Similarity: {(m.similarity * 100).toFixed(1)}%</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#666677', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.smiles}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="dashboard-grid">
            {/* Radar Chart Panel */}
            <div className="dashboard-panel radar-panel">
              <h3>Toxicity Profile</h3>
              <div className="radar-container">
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" 
                    data={Object.entries(result.assays).map(([k, v]) => ({ subject: k, A: v * 100 }))}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#a0a0b0', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#05050A', borderColor: '#9b4dff', color: '#fff' }} itemStyle={{ color: '#00ffcc' }} />
                    <Radar name="Probability" dataKey="A" stroke="#00ffcc" fill="#9b4dff" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3D Viewer Panel */}
            <div className="dashboard-panel viewer-panel">
              <h3>3D Molecule Viewer</h3>
              <iframe 
                src={`https://embed.molview.org/v1/?mode=balls&smiles=${encodeURIComponent(result.smiles)}&bg=black`} 
                className="mol-iframe" 
                title="3D Viewer"
              />
            </div>

            {/* Molecule Info Panel */}
            <div className="dashboard-panel info-panel" style={{ gridColumn: 'span 12' }}>
              <h3>Molecule SHAP Analysis</h3>
              <div style={{display:'flex', gap:'1.5rem', marginBottom:'1rem', flexWrap:'wrap'}}>
                <span style={{display:'flex', alignItems:'center', gap:6, fontSize:'0.85rem'}}>
                  <span style={{width:12, height:12, borderRadius:'50%', background:'#ff3366', display:'inline-block', boxShadow:'0 0 6px #ff336688'}}></span>
                  <span style={{color:'#ff3366', fontWeight:600}}>Harmful Atoms</span>
                  <span style={{color:'#a0a0b0', fontSize:'0.8rem'}}>(contributes to toxicity)</span>
                </span>
                <span style={{display:'flex', alignItems:'center', gap:6, fontSize:'0.85rem'}}>
                  <span style={{width:12, height:12, borderRadius:'50%', background:'#00cc66', display:'inline-block', boxShadow:'0 0 6px #00cc6688'}}></span>
                  <span style={{color:'#00cc66', fontWeight:600}}>Safe Atoms</span>
                  <span style={{color:'#a0a0b0', fontSize:'0.8rem'}}>(non-toxic substructure)</span>
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div className="image-box" style={{backgroundColor: '#0a0a0f', borderRadius: 8, padding: 10}}>
                  <canvas id="shap-canvas" width="400" height="300" />
                </div>

                <div className="predict-properties" style={{ flex: 1, minWidth: '300px' }}>
                  {Object.entries(result.properties).map(([key, val]) => (
                    <div key={key} className="prop-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="prop-label" style={{ color: '#a0a0b0' }}>{key}</span>
                      <span className="prop-val" style={{ color: '#fff', fontWeight: 'bold' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Assay Scores Panel */}
            <div className="dashboard-panel assays-panel" style={{ gridColumn: 'span 12' }}>
              <h3>Tox21 Assay Scores</h3>
              <div className="top-drivers-section">
                <h4 className="sub-title">Top Risk Drivers</h4>
                <div className="top-drivers-list">
                  {sortedAssays.slice(0, 3).map(([assay, prob]) => (
                    <div key={'top-'+assay} className="driver-pill">
                      <span className="driver-name">{assayMeanings[assay] || assay}</span>
                      <span className={`driver-score ${prob >= 0.5 ? 'toxic' : 'safe'}`}>{(prob * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="predict-assays-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {sortedAssays.map(([assay, prob]) => {
                  const isToxic = prob >= 0.5
                  return (
                    <div key={assay} className={`assay-item ${isToxic ? 'toxic' : 'safe'}`} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 8 }}>
                      <div className="assay-header">
                        <span className="assay-name" title={assayMeanings[assay]}>{assay} 
                          <span className="assay-desc" style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6 }}>{assayMeanings[assay]}</span>
                        </span>
                        <div className="assay-stats" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                          <span className={`assay-badge ${isToxic ? 'badge-toxic' : 'badge-safe'}`}>{isToxic ? 'TOXIC' : 'SAFE'}</span>
                          <span className="assay-prob">{(prob * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="assay-bar-wrapper" style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: '0.5rem' }}>
                        <div className="assay-bar" style={{ width: `${prob * 100}%`, height: '100%', background: isToxic ? '#ff3366' : '#00ffcc', borderRadius: 2 }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. COMPARE RESULTS DASHBOARD SECTION */}
      {compareResult1 && compareResult2 && (() => {
        const assayKeys = Object.keys(assayMeanings)
        const maxP1 = Math.max(...Object.values(compareResult1.assays))
        const maxP2 = Math.max(...Object.values(compareResult2.assays))
        const toxicCount1 = Object.values(compareResult1.assays).filter(p => p >= 0.5).length
        const toxicCount2 = Object.values(compareResult2.assays).filter(p => p >= 0.5).length
        const saferMol = (maxP1 < maxP2 || toxicCount1 < toxicCount2) ? 'A' : 'B'
        const saferColor = saferMol === 'A' ? '#ff3366' : '#00ffcc'
        const saferResult = saferMol === 'A' ? compareResult1 : compareResult2
        const worstA = Object.entries(compareResult1.assays).sort((a,b)=>b[1]-a[1])[0]
        const worstB = Object.entries(compareResult2.assays).sort((a,b)=>b[1]-a[1])[0]
        const insightComp = saferMol === 'A'
          ? `Molecule A is the safer candidate, showing lower toxicity risk (${(maxP1*100).toFixed(0)}% vs ${(maxP2*100).toFixed(0)}%) with fewer active assay hits (${toxicCount1} vs ${toxicCount2}). Molecule B primarily flags concerning activity along the ${assayMeanings[worstB[0]] || worstB[0]} pathway.`
          : `Molecule B is the safer candidate, showing lower toxicity risk (${(maxP2*100).toFixed(0)}% vs ${(maxP1*100).toFixed(0)}%) with fewer active assay hits (${toxicCount2} vs ${toxicCount1}). Molecule A primarily flags concerning activity along the ${assayMeanings[worstA[0]] || worstA[0]} pathway.`

        return (
        <div className="predict-dashboard-section cmp-section" ref={compareDashboardRef}>
          
          {/* Header */}
          <div className="dashboard-header-container">
            <h2 className="dashboard-title">A/B Comparative Analysis</h2>
            <div className="confidence-score-badge" style={{gap: '1.5rem'}}>
              <span style={{color: '#a0a0b0', fontSize: '0.85rem', textTransform:'uppercase'}}>Safer Molecule:</span>
              <span style={{color: saferColor, fontWeight: 800, fontSize: '1.4rem', textShadow: `0 0 15px ${saferColor}88`}}>
                Molecule {saferMol} ✓
              </span>
            </div>
          </div>

          {/* Insight Box */}
          <div className="dashboard-summary-box" style={{borderLeftColor: saferColor, borderColor: `${saferColor}33`}}>
            <div className="summary-icon" style={{background: `${saferColor}22`, color: saferColor}}>🧠</div>
            <div className="summary-text">
              <strong>Comparative Insight:</strong> {insightComp}
            </div>
          </div>

          {/* PAINS alerts */}
          {(compareResult1.pains_alert || compareResult2.pains_alert) && (
            <div className="compare-profile-grid" style={{marginBottom: '2rem'}}>
              <div>
                {compareResult1.pains_alert && (
                  <div className="dashboard-pains-alert" style={{margin:0}}>
                    <div className="pains-icon">⚠</div>
                    <div className="pains-text"><strong>Molecule A — PAINS:</strong> {compareResult1.pains_alert}</div>
                  </div>
                )}
              </div>
              <div>
                {compareResult2.pains_alert && (
                  <div className="dashboard-pains-alert" style={{margin:0}}>
                    <div className="pains-icon">⚠</div>
                    <div className="pains-text"><strong>Molecule B — PAINS:</strong> {compareResult2.pains_alert}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Basic Info: 2D Structure + Key Properties */}
          <div className="cmp-section-label">Basic Info</div>
          <div className="compare-profile-grid">
            {[{r: compareResult1, label:'A', color:'#ff3366', cid:'c1'}, {r: compareResult2, label:'B', color:'#00ffcc', cid:'c2'}].map(({r, label, color, cid}) => (
              <div key={label} className="dashboard-panel">
                <h3 style={{color}}>Molecule {label}</h3>
                <div style={{marginBottom:'1rem', color:'#a0a0b0', fontSize:'0.8rem', wordBreak:'break-all', fontFamily:'monospace'}}>{r.smiles}</div>
                {/* 2D structure via PubChem */}
                <div style={{background:'#fff', borderRadius:8, padding:8, marginBottom:'1rem', display:'flex', justifyContent:'center'}}>
                  <img 
                    src={`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(r.smiles)}/PNG?image_size=300x200`}
                    alt={`Molecule ${label} 2D`}
                    style={{maxWidth:'100%', borderRadius:4}}
                    onError={(e) => { e.target.style.display='none' }}
                  />
                </div>
                {/* Key properties */}
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem'}}>
                  {Object.entries(r.properties).map(([k, v]) => (
                    <div key={k} style={{background:'rgba(255,255,255,0.03)', padding:'0.5rem 0.75rem', borderRadius:6, borderLeft:`3px solid ${color}44`}}>
                      <div style={{color:'#a0a0b0', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.05em'}}>{k}</div>
                      <div style={{color:'#fff', fontWeight:600, fontSize:'0.9rem'}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Risk Level Cards */}
          <div className="cmp-section-label">Toxicity Results</div>
          <div className="compare-profile-grid">
            {[{r: compareResult1, label:'A', rd: risk1, color:'#ff3366'}, {r: compareResult2, label:'B', rd: risk2, color:'#00ffcc'}].map(({r, label, rd, color}) => {
              const maxP = Math.max(...Object.values(r.assays))
              const tc = Object.values(r.assays).filter(p => p>=0.5).length
              return (
                <div key={label} className="dashboard-panel" style={{borderTop: `3px solid ${color}`}}>
                  <h3 style={{color}}>Molecule {label} — Toxicity Summary</h3>
                  <div style={{display:'flex', alignItems:'center', gap:'2rem', marginBottom:'1.5rem'}}>
                    <div>
                      <div style={{color:'#a0a0b0', fontSize:'0.8rem', marginBottom:'0.25rem'}}>Risk Level</div>
                      <div className={`risk-level ${rd?.class}`} style={{fontSize:'2rem', fontWeight:800}}>{rd?.label}</div>
                    </div>
                    <div>
                      <div style={{color:'#a0a0b0', fontSize:'0.8rem', marginBottom:'0.25rem'}}>Max Confidence</div>
                      <div style={{color:'#fff', fontSize:'1.5rem', fontWeight:700}}>{(maxP*100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <div style={{color:'#a0a0b0', fontSize:'0.8rem', marginBottom:'0.25rem'}}>Toxic Assays</div>
                      <div style={{color: tc>0?'#ff3366':'#00ffcc', fontSize:'1.5rem', fontWeight:700}}>{tc}/12</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Dual Radar Chart */}
          <div className="cmp-section-label">Comparison View</div>
          <div className="dashboard-panel radar-panel" style={{maxWidth:'1400px', margin:'0 auto', width:'100%', boxSizing:'border-box', minHeight:'480px'}}>
            <h3>Dual Mechanism Overlay</h3>
            <ResponsiveContainer width="100%" height={430}>
              <RadarChart cx="50%" cy="50%" outerRadius="78%" data={compareRadarData}>
                <PolarGrid stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3"/>
                <PolarAngleAxis dataKey="assay" tick={{ fill: '#c8d8ff', fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(15,15,25,0.95)', border: '1px solid #9b4dff', borderRadius: 8 }} />
                <Radar name="Molecule A" dataKey="comp1" stroke="#ff3366" strokeWidth={3} fill="#ff3366" fillOpacity={0.35} />
                <Radar name="Molecule B" dataKey="comp2" stroke="#00ffcc" strokeWidth={3} fill="#00ffcc" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
            <div style={{display:'flex', justifyContent:'center', gap:'2rem', marginTop:'0.5rem'}}>
              <span style={{color:'#ff3366', fontWeight:'bold', display:'flex', alignItems:'center', gap:6}}><span style={{width:14, height:14, background:'#ff3366', borderRadius:2, display:'inline-block'}}></span>Molecule A</span>
              <span style={{color:'#00ffcc', fontWeight:'bold', display:'flex', alignItems:'center', gap:6}}><span style={{width:14, height:14, background:'#00ffcc', borderRadius:2, display:'inline-block'}}></span>Molecule B</span>
            </div>
          </div>

          {/* Assay-wise Comparison Table */}
          <div className="dashboard-panel assays-panel" style={{maxWidth:'1400px', margin:'2rem auto 0 auto', width:'100%', boxSizing:'border-box', overflowX: 'auto'}}>
            <h3>Assay-wise Toxicity Comparison Table</h3>
            <table className="compare-table" style={{width: '100%', borderCollapse: 'collapse', marginTop: '1rem', textAlign: 'left', minWidth: '800px'}}>
              <thead>
                <tr style={{borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#a0a0b0', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em'}}>
                  <th style={{padding: '1.2rem 1rem'}}>Assay / Pathway</th>
                  <th style={{padding: '1.2rem 1rem', color: '#ff3366'}}>Molecule A Risk</th>
                  <th style={{padding: '1.2rem 1rem', color: '#00ffcc'}}>Molecule B Risk</th>
                  <th style={{padding: '1.2rem 1rem'}}>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {assayKeys.map((assay, idx) => {
                  const p1 = compareResult1.assays[assay] || 0
                  const p2 = compareResult2.assays[assay] || 0
                  const t1 = p1 >= 0.5
                  const t2 = p2 >= 0.5
                  const betterA = p1 < p2
                  return (
                    <tr key={assay} style={{borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent', transition: 'background-color 0.2s'}}>
                      <td style={{padding: '1rem'}}>
                        <div style={{color: '#c8d8ff', fontWeight: 600, fontSize: '0.95rem'}}>{assay}</div>
                        <div style={{color: '#666677', fontSize: '0.8rem', marginTop: '0.2rem'}}>{assayMeanings[assay]}</div>
                      </td>
                      <td style={{padding: '1rem'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                          <span style={{fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: 4, background: t1 ? 'rgba(255,51,102,0.15)' : 'rgba(0,255,204,0.15)', color: t1 ? '#ff3366' : '#00ffcc', fontWeight: 700}}>{t1 ? 'TOXIC' : 'SAFE'}</span>
                          <span style={{color: '#fff', fontWeight: 600, fontSize: '0.95rem'}}>{(p1 * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td style={{padding: '1rem'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                          <span style={{fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: 4, background: t2 ? 'rgba(255,51,102,0.15)' : 'rgba(0,255,204,0.15)', color: t2 ? '#ff3366' : '#00ffcc', fontWeight: 700}}>{t2 ? 'TOXIC' : 'SAFE'}</span>
                          <span style={{color: '#fff', fontWeight: 600, fontSize: '0.95rem'}}>{(p2 * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td style={{padding: '1rem'}}>
                        {betterA ? (
                          <span style={{color: '#ff3366', fontSize: '0.8rem', background: 'rgba(255,51,102,0.1)', padding: '0.3rem 0.6rem', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600}}><span style={{fontSize:'1.1rem'}}>↓</span> Molecule A Safer</span>
                        ) : (
                          <span style={{color: '#00ffcc', fontSize: '0.8rem', background: 'rgba(0,255,204,0.1)', padding: '0.3rem 0.6rem', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600}}><span style={{fontSize:'1.1rem'}}>↓</span> Molecule B Safer</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* SHAP Comparison */}
          <div className="cmp-section-label">SHAP Toxicity Comparison</div>
          <div className="compare-profile-grid">
            {[{label:'A', cid:'c1', color:'#ff3366', r:compareResult1}, {label:'B', cid:'c2', color:'#00ffcc', r:compareResult2}].map(({label, cid, color, r}) => (
              <div key={label} className="dashboard-panel">
                <h3 style={{color}}>Molecule {label} — Toxicity Substructures</h3>
                <p style={{color:'#a0a0b0', fontSize:'0.8rem', marginBottom:'1rem', fontStyle:'italic'}}>
                  Highlighted atoms indicate substructures contributing most to toxicity in the highest-risk assay.
                </p>
                <div style={{background:'#0a0a0f', padding:'1rem', borderRadius:8, display:'flex', justifyContent:'center', border:`1px solid ${color}22`}}>
                  <canvas id={`shap-canvas-${cid}`} width="400" height="250" style={{display:'block', margin:'0 auto', maxWidth:'100%'}}/>
                </div>
                {/* 3D viewer */}
                <div style={{marginTop:'1rem', background:'#05050A', borderRadius:8, overflow:'hidden'}}>
                  <iframe src={`https://embed.molview.org/v1/?mode=balls&smiles=${encodeURIComponent(r.smiles)}&bg=black`} style={{width:'100%', height:220, border:'none', display:'block'}} />
                </div>
              </div>
            ))}
          </div>

        </div>
        )
      })()}
    </div>
  )
}
