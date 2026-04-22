import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Icosahedron, MeshDistortMaterial, Sparkles, Float } from '@react-three/drei'
import * as THREE from 'three'

export default function ChatAIOrb({ loading }) {
  const coreRef = useRef()
  const wireframeRef = useRef()

  // Animate the core based on state
  useFrame((state, delta) => {
    if (!coreRef.current || !wireframeRef.current) return

    // Base rotation
    const baseSpeed = 0.5
    const activeSpeed = 6.0
    
    // Smoothly interpolate rotation speed based on loading state
    const targetSpeed = loading ? activeSpeed : baseSpeed
    
    coreRef.current.rotation.y += delta * targetSpeed * 0.5
    coreRef.current.rotation.x += delta * targetSpeed * 0.3
    
    wireframeRef.current.rotation.y -= delta * targetSpeed * 0.3
    wireframeRef.current.rotation.z += delta * targetSpeed * 0.2

    // Scale pulsing when loading
    const targetScale = loading ? 1.15 + Math.sin(state.clock.elapsedTime * 15) * 0.05 : 1.0
    coreRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1)
    wireframeRef.current.scale.lerp(new THREE.Vector3(targetScale + 0.1, targetScale + 0.1, targetScale + 0.1), 0.1)
  })

  return (
    <Float speed={loading ? 4 : 2} rotationIntensity={0.5} floatIntensity={1}>
      {/* Outer Glow / Particles */}
      <Sparkles 
        count={ loading ? 100 : 40 } 
        scale={ 4 } 
        size={ loading ? 6 : 2 } 
        speed={ loading ? 1.5 : 0.2 } 
        color={ loading ? '#00ffcc' : '#9b4dff' } 
      />

      {/* Inner Core */}
      <Icosahedron ref={coreRef} args={[1, 64]}>
        <MeshDistortMaterial 
          color={loading ? '#c4a8ff' : '#4d1e99'}
          emissive={loading ? '#6a4fb0' : '#220044'}
          emissiveIntensity={loading ? 2 : 1}
          distort={loading ? 0.6 : 0.3} 
          speed={loading ? 8 : 2} 
          roughness={0.1}
          metalness={0.9}
        />
      </Icosahedron>

      {/* Outer Wireframe Shell */}
      <Icosahedron ref={wireframeRef} args={[1.2, 2]}>
        <meshStandardMaterial 
          color={loading ? '#00ffcc' : '#9b4dff'} 
          wireframe 
          transparent 
          opacity={0.3} 
          emissive={loading ? '#00ffcc' : '#9b4dff'}
          emissiveIntensity={0.8}
        />
      </Icosahedron>

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={loading ? 3 : 1} color="#c4a8ff" />
      <pointLight position={[-5, -5, -5]} intensity={1} color="#00ffcc" />
    </Float>
  )
}
