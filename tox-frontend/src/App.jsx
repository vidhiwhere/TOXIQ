import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Loader from './components/Loader'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Highlights from './components/Highlights'
import DemoVideo from './components/DemoVideo'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import Footer from './components/Footer'
import Predict from './pages/Predict'
import Research from './pages/Research'
import Chat from './pages/Chat'
import './App.css'

export default function App() {
  const [loaded, setLoaded] = useState(false)

  return (
    <>
      <Loader onComplete={() => setLoaded(true)} />

      <div className={`app-page ${loaded ? 'app-page--visible' : ''}`}>
        <Navbar />
        <Routes>
          <Route path="/" element={
            <>
              <Hero />
              <Highlights />
              <DemoVideo />
              <Features />
              <HowItWorks />
              <Footer />
            </>
          } />
          <Route path="/predict" element={<Predict />} />
          <Route path="/research" element={<Research />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </div>
    </>
  )
}
