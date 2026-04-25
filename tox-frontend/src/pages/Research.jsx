import { useRef, useState, useEffect } from 'react'
import gsap from 'gsap'
import ResearchBackground from '../components/ResearchBackground'
import './Research.css'

const articles = [
  {
    id: 1,
    title: 'Nanotoxicology: developments and new insights',
    excerpt: 'Covers history, challenges, and future of nanotoxicology. Explains how nanoparticles affect biological systems.',
    tag: 'Development',
    date: 'Recent',
    url: '#',
    image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80' // microscope
  },
  {
    id: 2,
    title: 'Nanoparticle safety in biomedical designs',
    excerpt: 'Shows how nanoparticle size & surface affect toxicity. Explains oxidative stress & inflammation.',
    tag: 'Medicine',
    date: 'Recent',
    url: '#',
    image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80' // medical lab
  },
  {
    id: 3,
    title: 'Nanotoxicology: aquatic environment and biological systems',
    excerpt: 'Focus on water systems + ecosystem damage. Covers ROS, genotoxicity, and ecotoxicity.',
    tag: 'Environment',
    date: 'Recent',  
    url: '#',
    image: 'https://images.unsplash.com/photo-1518241353311-bf1f5d6f3cd4?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80' // water/environment
  },
  {
    id: 4,
    title: 'Advances and pitfalls in research methodology',
    excerpt: 'Explains experimental limitations. Crucial approaches for alternative testing methodologies.',
    tag: 'Methods',
    date: 'Recent',
    url: '#',
    image: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80' // abstract scientific
  },
  {
    id: 5,
    title: 'Nanotechnology, nanotoxicology, and neuroscience',
    excerpt: 'Explores brain-related risks and human neuro-impact from systemic nanoparticle exposure.',
    tag: 'Neuroscience',
    date: 'Recent',
    url: '#',
    image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80' // brain/abstract
  },
  {
    id: 6,
    title: 'Mechanisms of nanotoxicology',
    excerpt: 'Explains how toxicity happens at the molecular level. Includes safer alternative testing strategies.',
    tag: 'Mechanisms',
    date: 'Recent',
    url: '#',
    image: 'https://images.unsplash.com/photo-1530213786676-4c4ff078c582?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80' // molecular/biology
  },
  {
    id: 7,
    title: 'Recent progress in nanotoxicology and nanosafety',
    excerpt: 'Discusses risks vs benefits and highlights critical gaps in current nanosafety evaluation.',
    tag: 'Nanosafety',
    date: 'Recent',
    url: '#',
    image: 'https://images.unsplash.com/photo-1563213126-a4273aed2016?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80' // glowing data/chemistry
  },
  {
    id: 8,
    title: 'Toxicology, nanotoxicology and occupational diseases',
    excerpt: 'Focuses on the ethical and safety implications for workers exposed directly to nanoparticles.',
    tag: 'Occupational',
    date: 'Recent',
    url: '#',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80' // factory/science tech
  },
  {
    id: 9,
    title: 'Frontiers Nanotoxicology Articles Collection',
    excerpt: 'Contains 2025–2026 latest research papers on microplastics, carbon nanotubes, and immune response.',
    tag: 'Trending',
    date: '2025-2026',
    url: 'https://www.frontiersin.org/',
    image: 'https://images.unsplash.com/photo-1614935151651-0bea6508ab6b?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80' // advanced tech/molecules
  },
  {
    id: 10,
    title: 'Food Nanotoxicology',
    excerpt: 'Studies toxicity and long-term implications in next-generation nano-enabled food systems.',
    tag: 'Advanced',
    date: 'Mar 2026',
    url: 'https://arxiv.org/abs/2603.03356',
    image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638ce?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80' // food structure
  },
  {
    id: 11,
    title: 'Metal Nanoparticle Toxicity',
    excerpt: 'Deep analytical coverage of biocompatibility and toxicity levels of synthetic metals.',
    tag: 'Advanced',
    date: 'Aug 2021',
    url: 'https://arxiv.org/abs/2108.05964',
    image: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80' // metallic texture/science
  },
  {
    id: 12,
    title: 'AI in Nanotoxicology',
    excerpt: 'Utilizing massive machine learning arrays and graph neural networks to predict molecular toxicity.',
    tag: 'Advanced',
    date: 'Sep 2024',
    url: 'https://arxiv.org/abs/2409.15322',
    image: 'https://images.unsplash.com/photo-1516110833967-0b5716ca1387?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80' // AI / Network graph
  }
]

export default function Research() {
  const containerRef = useRef(null)
  const cardsRef = useRef([])
  const [activeArticle, setActiveArticle] = useState(null)
  
  // PubMed Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [pubmedResults, setPubmedResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    try {
      const res = await fetch('http://127.0.0.1:8000/api/pubmed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      })
      const data = await res.json()
      setPubmedResults(data.articles || [])
    } catch {}
    finally { setSearchLoading(false) }
  }

  useEffect(() => {
    // Generate 12 perfectly dispersed zones across a 4x3 grid logic
    const initialZones = []
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        initialZones.push({
          left: (col * 22) + 12, // 12% to 78% spread
          top: (row * 28) + 15   // 15% to 71% spread
        })
      }
    }

    cardsRef.current.forEach((card, i) => {
      if (!card) return
      const zone = initialZones[i % initialZones.length]
      gsap.set(card, {
        left: `${zone.left + (Math.random() * 8 - 4)}%`, 
        top: `${zone.top + (Math.random() * 8 - 4)}%`,
        xPercent: -50,
        yPercent: -50,
        rotation: Math.random() * 360,
        scale: Math.random() * 0.3 + 0.85 
      })
    })

    const ctx = gsap.context(() => {
      cardsRef.current.forEach((card) => {
        if (!card) return
        const drift = () => {
          gsap.to(card, {
            x: `random(-100, 100)`,
            y: `random(-100, 100)`,
            rotation: `random(-90, 90)`, 
            duration: `random(12, 18)`, 
            ease: "sine.inOut",
            onComplete: drift 
          })
        }
        drift() 
      })
    }, containerRef)

    return () => ctx.revert() 
  }, [])

  const handleCardClick = (article) => {
    setActiveArticle(article)
    setTimeout(() => {
      gsap.fromTo('.card-modal-wrapper', 
        { opacity: 0, scale: 0.85, y: 30 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'power3.out' }
      )
    }, 10)
  }

  const closeModal = () => {
    gsap.to('.card-modal-wrapper', {
      opacity: 0, scale: 0.95, y: 15, duration: 0.3, ease: 'power2.in',
      onComplete: () => setActiveArticle(null)
    })
  }

  return (
    <div className="research-page" ref={containerRef}>
      <ResearchBackground />
      <h1 className="research-header">Current Research & Insights</h1>
      
      {/* PubMed Search Bar */}
      <div style={{ position: 'relative', zIndex: 100, maxWidth: 600, margin: '0 auto 2rem auto', padding: '0 2rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search PubMed (e.g., 'Bisphenol A toxicity')"
            style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: 8, background: 'rgba(10,10,20,0.8)', border: '1px solid rgba(155,77,255,0.4)', color: '#fff', fontSize: '0.9rem' }}
          />
          <button type="submit" disabled={searchLoading} style={{ padding: '0 1.5rem', borderRadius: 8, background: 'linear-gradient(135deg, #9b4dff, #00ffcc)', border: 'none', color: '#05050A', fontWeight: 'bold', cursor: 'pointer' }}>
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {pubmedResults.length > 0 && (
        <div style={{ position: 'relative', zIndex: 100, maxWidth: 800, margin: '0 auto 2rem auto', background: 'rgba(15,15,25,0.85)', padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(155,77,255,0.3)', backdropFilter: 'blur(10px)' }}>
          <h3 style={{ color: '#00ffcc', marginBottom: '1rem', marginTop: 0 }}>PubMed Results</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pubmedResults.map((article, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 8, borderLeft: '3px solid #9b4dff' }}>
                <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ color: '#c8d8ff', fontSize: '1.05rem', fontWeight: 600, textDecoration: 'none', display: 'block', marginBottom: '0.4rem' }}>{article.title}</a>
                <div style={{ color: '#a0a0b0', fontSize: '0.8rem' }}>{article.authors} • <strong>{article.journal}</strong> ({article.year})</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className={`research-particles-container ${activeArticle ? 'blurred' : ''}`}>
        {articles.map((article, i) => (
          <div 
            key={article.id}
            ref={el => cardsRef.current[i] = el}
            className="research-bubble"
            onClick={() => handleCardClick(article)}
            onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 2.5, zIndex: 50, duration: 0.3 })}
            onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, zIndex: 1, duration: 0.3 })}
          >
            <div className="research-bubble-glass">
              <h3>{article.title}</h3>
            </div>
          </div>
        ))}
      </div>

      {activeArticle && (
        <div className="research-overlay" onClick={closeModal}>
          <div className="card card-modal-wrapper" onClick={e => e.stopPropagation()}>
            <button className="research-modal-close" onClick={closeModal}>✕</button>
            <div className="header">
              <div className="image">
                <img src={activeArticle.image} alt={activeArticle.title} className="card-custom-img" />
                <span className="tag">{activeArticle.tag}</span>
              </div>
              <div className="date">
                <span>{activeArticle.date}</span>
              </div>
            </div>
            <div className="info">
              <a rel="noopener noreferrer" href={activeArticle.url} className="block" target={activeArticle.url === '#' ? '_self' : '_blank'}>
                <span className="title">{activeArticle.title}</span>
              </a>
              <p className="description">{activeArticle.excerpt}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
