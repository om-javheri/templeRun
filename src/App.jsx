import { useEffect, useRef, useState } from 'react'
import viteLogo from '/vite.svg'
import './App.css'

const laneWidth = 100, baseTop = 500, jumpHeight = 80, playerSize = 50

export default function App() {
  const playerRef = useRef(null)
  const touchRef = useRef({ x: 0, y: 0 })
  const invulnerableRef = useRef(false)
  const gameContainerRef = useRef(null)

  const [left, setLeft] = useState(200)
  const [jumping, setJumping] = useState(false)
  const [yOffset, setYOffset] = useState(0)
  const [obstacles, setObstacles] = useState([])
  const [powerUps, setPowerUps] = useState([])
  const [started, setStarted] = useState(false)
  const [over, setOver] = useState(false)
  const [score, setScore] = useState(0)
  const [plays, setPlays] = useState(0)
  const [highScore, setHighScore] = useState(() => +localStorage.getItem('highScore') || 0)
  const [playerImg, setPlayerImg] = useState(null)
  const [obImgs, setObImgs] = useState([])
  const [speed, setSpeed] = useState(1)

  const [shields, setShields] = useState(0)
  const [doubleScore, setDoubleScore] = useState(false)
  const [slowMotion, setSlowMotion] = useState(false)

  const [lanes, setLanes] = useState([])

  useEffect(() => {
    const calculateLanes = () => {
      if (!gameContainerRef.current) return
      const width = gameContainerRef.current.offsetWidth
      const newLaneCount = Math.max(3, Math.floor(width / laneWidth))
      const newLanes = Array.from({ length: newLaneCount }, (_, i) => i * laneWidth)
      setLanes(newLanes)
      setLeft(newLanes[Math.floor(newLaneCount / 2)])
    }
    calculateLanes()
    window.addEventListener('resize', calculateLanes)
    return () => window.removeEventListener('resize', calculateLanes)
  }, [])

  const jump = () => {
    setJumping(true)
    setYOffset(-jumpHeight)
    setTimeout(() => {
      setYOffset(0)
      setJumping(false)
    }, 1100)
  }

  const move = dir => {
    if (!started || over) return
    const currentIndex = lanes.indexOf(left)
    if (dir === 'left' && currentIndex > 0) setLeft(lanes[currentIndex - 1])
    else if (dir === 'right' && currentIndex < lanes.length - 1) setLeft(lanes[currentIndex + 1])
    else if (dir === 'up' && !jumping) jump()
  }

  const getRandomObstacleImage = () => {
    const valid = obImgs.filter(o => !o.deleted)
    return valid.length ? valid[Math.floor(Math.random() * valid.length)].img : null
  }

  const startGame = () => {
    setStarted(true); setOver(false)
    setObstacles([]); setPowerUps([])
    setYOffset(0); setJumping(false)
    setScore(0); setSpeed(1)
    setShields(0); setDoubleScore(false); setSlowMotion(false)
    invulnerableRef.current = false
    setPlays(p => p + 1)
    setLeft(lanes[Math.floor(lanes.length / 2)] || 200)
  }

  const handleUpload = (e, isPlayer = false) => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (isPlayer) {
          setPlayerImg(result)
          localStorage.setItem('customPlayerImg', result)
        } else {
          const newImg = { img: result, deleted: false }
          setObImgs(prev => {
            const updated = [...prev, newImg]
            localStorage.setItem('obstacleImages', JSON.stringify(updated))
            return updated
          })
        }
      }
      reader.readAsDataURL(file)
    })
  }

  useEffect(() => {
    const savedPlayer = localStorage.getItem('customPlayerImg')
    const savedObs = JSON.parse(localStorage.getItem('obstacleImages') || '[]')
    if (savedPlayer) setPlayerImg(savedPlayer)
    if (savedObs.length) setObImgs(savedObs)
  }, [])

  useEffect(() => {
    if (!started || over) return
    let spawnTimeout
    const spawnObstacle = () => {
      const isLow = Math.random() < 0.5
      setObstacles(obs => [
        ...obs,
        {
          id: Date.now(),
          top: 0,
          left: lanes[Math.floor(Math.random() * lanes.length)],
          height: isLow ? 30 : 50,
          img: getRandomObstacleImage(),
        },
      ])
      const delay = Math.max(200, 1000 - speed * 150)
      spawnTimeout = setTimeout(spawnObstacle, delay)
    }
    spawnObstacle()
    return () => clearTimeout(spawnTimeout)
  }, [started, over, speed, obImgs, lanes])

  useEffect(() => {
    if (!started || over) return
    const iv = setInterval(() => {
      setObstacles(obs =>
        obs
          .map(o => ({ ...o, top: o.top + 10 * speed * (slowMotion ? 0.5 : 1) }))
          .filter(o => {
            const vis = o.top < 600
            if (!vis) {
              const pts = doubleScore ? speed * 2 : speed
              setScore(s => s + pts)
            }
            return vis
          })
      )
    }, 100)
    return () => clearInterval(iv)
  }, [started, over, speed, doubleScore, slowMotion])

  useEffect(() => {
    if (!started || over) return
    let puTimeout
    const spawnPU = () => {
      const types = ['shield', 'double', 'slow']
      setPowerUps(p => [
        ...p,
        {
          id: Date.now(),
          top: 0,
          left: lanes[Math.floor(Math.random() * lanes.length)],
          type: types[Math.floor(Math.random() * types.length)]
        }
      ])
      puTimeout = setTimeout(spawnPU, 5000 + Math.random() * 5000)
    }
    spawnPU()
    return () => clearTimeout(puTimeout)
  }, [started, over, lanes])

  useEffect(() => {
    if (!started || over) return
    const iv = setInterval(() => {
      setPowerUps(ps => {
        const consumed = new Set()
        return ps
          .map(p => ({ ...p, top: p.top + 5 * speed * (slowMotion ? 0.5 : 1) }))
          .filter(p => {
            const px = p.left, py = p.top
            const pt = baseTop + yOffset, pr = left + playerSize
            const hit = px < pr && px + 40 > left && py + 40 > pt && py < pt + playerSize
            if (hit && !consumed.has(p.id)) {
              consumed.add(p.id)
              if (p.type === 'shield') setShields(s => s + 1)
              if (p.type === 'double') {
                setDoubleScore(true)
                setTimeout(() => setDoubleScore(false), 10000)
              }
              if (p.type === 'slow') {
                setSlowMotion(true)
                setTimeout(() => setSlowMotion(false), 10000)
              }
              return false
            }
            return p.top < 600
          })
      })
    }, 100)
    return () => clearInterval(iv)
  }, [started, over, speed, slowMotion, yOffset, left])

  useEffect(() => {
    if (!started || over) return
    const pT = baseTop + yOffset, pb = pT + playerSize, pr = left + playerSize

    obstacles.forEach(o => {
      const ob = o.top + o.height, or = o.left + 50
      const xHit = o.left < pr && or > left
      const yHit = ob > pT && o.top < pb
      const fatal = o.height === 30 ? !jumping : true

      if (xHit && yHit && fatal) {
        if (shields > 0 && !invulnerableRef.current) {
          setShields(s => s - 1)
          invulnerableRef.current = true
          setTimeout(() => { invulnerableRef.current = false }, 1000)
          return
        }
        if (!invulnerableRef.current) {
          setOver(true)
          setHighScore(hs => {
            const nh = Math.max(score, hs)
            localStorage.setItem('highScore', nh)
            return nh
          })
        }
      }
    })
  }, [obstacles, left, jumping, started, over, score, shields])

  useEffect(() => {
    const onKey = e => move({ ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up' }[e.key])
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [left, jumping, started, over])

  useEffect(() => {
    const area = document.getElementById('game-area')
    const st = e => { const t = e.touches[0]; touchRef.current = { x: t.clientX, y: t.clientY } }
    const en = e => {
      const t = e.changedTouches[0]
      const dx = t.clientX - touchRef.current.x, dy = t.clientY - touchRef.current.y
      if (!started || over) return
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 30 ? 'right' : dx < -30 ? 'left' : '')
      else if (dy < -30 && !jumping) jump()
    }
    area.addEventListener('touchstart', st)
    area.addEventListener('touchend', en)
    return () => {
      area.removeEventListener('touchstart', st)
      area.removeEventListener('touchend', en)
    }
  }, [jumping, started, over])

  const playerSrc = plays > 1 && playerImg ? playerImg : viteLogo

  const renderObstacle = o => o.img ? (
    <img key={o.id} src={o.img} alt="" className="absolute" style={{ top: o.top, left: o.left, width: 50, height: o.height, objectFit: 'cover' }} />
  ) : (
    <div key={o.id} className="absolute bg-red-600 rounded" style={{ top: o.top, left: o.left, width: 50, height: o.height }} />
  )

  const renderPower = p => (
    <div key={p.id} className="absolute" style={{ top: p.top, left: p.left, width: 40, height: 40 }}>
      {p.type === 'shield' && (
        <svg viewBox="0 0 24 24" fill="#0bf"><path d="M12 2L4 5v6c0 5 3.8 9.7 8 11 4.2-1.3 8-6 8-11V5l-8-3z" /></svg>
      )}
      {p.type === 'double' && (
        <svg viewBox="0 0 24 24" fill="#ff0"><text x="4" y="18" fontSize="18" fontWeight="bold">×2</text></svg>
      )}
      {p.type === 'slow' && (
        <svg viewBox="0 0 24 24" fill="#0f0"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 10h4M12 12l-3 3" /></svg>
      )}
    </div>
  )

  return (
    <div className="w-full h-screen flex flex-col md:flex-row bg-black text-white overflow-hidden">
  {/* Game Area */}
  <div id="game-area" className="relative flex-1 flex justify-center items-center pb-20 overflow-hidden z-20 h-screen">
    <div ref={gameContainerRef} className="relative h-full" style={{ width: `${laneWidth * (lanes.length || 5)}px` }}>
      {started && !over && (
        <>
          <div className="absolute top-2 left-2 bg-black/60 px-3 py-1 rounded z-30">Score: {score}</div>
          <div className="absolute bottom-2 left-2 flex gap-2 bg-black/50 px-3 py-2 rounded z-30 ">
            <button onClick={() => setSpeed((s) => Math.max(1, s - 1))} className="bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-sm">−</button>
            <span className="px-2 text-yellow-300">Speed: {speed}</span>
            <button onClick={() => setSpeed((s) => Math.min(5, s + 1))} className="bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-sm">+</button>
          </div>
          <div className="absolute top-2 right-2 bg-black/60 px-3 py-1 rounded text-yellow-300 z-30">High Score: {highScore}</div>
          <div className="absolute top-12 left-2 flex gap-2 z-30">
            {shields > 0 && <div className="bg-sky-500 text-black px-2 py-1 rounded">🛡 {shields}</div>}
            {doubleScore && <div className="bg-yellow-400 text-black px-2 py-1 rounded">×2</div>}
            {slowMotion && <div className="bg-green-400 text-black px-2 py-1 rounded">🐢</div>}
          </div>
        </>
      )}

      {started && obstacles.map(o =>
        o.img ? (
          <img key={o.id} src={o.img} alt="" className="absolute" style={{ top: o.top, left: o.left, width: 50, height: o.height, objectFit: 'cover', zIndex: 25 }} />
        ) : (
          <div key={o.id} className="absolute bg-red-600 rounded" style={{ top: o.top, left: o.left, width: 50, height: o.height, zIndex: 25 }} />
        )
      )}

      {started && powerUps.map(p => (
        <div key={p.id} className="absolute" style={{ top: p.top, left: p.left, width: 40, height: 40, zIndex: 26 }}>
          {p.type === 'shield' && <svg viewBox="0 0 24 24" fill="#0bf"><path d="M12 2L4 5v6c0 5 3.8 9.7 8 11 4.2-1.3 8-6 8-11V5l-8-3z" /></svg>}
          {p.type === 'double' && <svg viewBox="0 0 24 24" fill="#ff0"><text x="4" y="18" fontSize="18" fontWeight="bold">×2</text></svg>}
          {p.type === 'slow' && <svg viewBox="0 0 24 24" fill="#0f0"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 10h4M12 12l-3 3" /></svg>}
        </div>
      ))}

      {started && (
        <img
          ref={playerRef}
          src={playerSrc}
          alt="Player"
          className="absolute transition-all ease-out duration-200"
          style={{ top: baseTop + yOffset, left, width: playerSize, height: playerSize, objectFit: 'cover', zIndex: 30 }}
        />
      )}

      {!started && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 overflow-y-auto max-h-full z-30">
          <h1 className="text-4xl font-bold mb-4">Temple Run: Jump Game</h1>
          <p className="text-xl mb-2">⬅️ ➡️ Swipe to move</p>
          <p className="text-xl mb-2">⬆️ Swipe up to jump</p>
          <p className="text-xl mb-6">Avoid tall blocks!</p>
          <div className="text-white text-base bg-black/50 px-4 py-3 rounded mb-6 w-full max-w-md">
            <p className="mb-1 font-semibold underline">⚡ Power-Ups:</p>
            <p>🛡 <span className="text-sky-400">Shield:</span> Saves you twice from collision</p>
            <p>×2 <span className="text-yellow-300">Double Score:</span> 2x points for 10s</p>
            <p>🐢 <span className="text-green-400">Slow Motion:</span> Slows the game for 10s</p>
          </div>
          <button onClick={startGame} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-lg">
            {plays === 0 ? 'Start Game' : 'Play Again'}
          </button>
        </div>
      )}

      {over && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4 text-4xl font-bold z-30">
          <div>Game Over</div>
          <div className="text-2xl">Score: {score}</div>
          <div className="text-xl text-yellow-400">High Score: {highScore}</div>
          <div className="text-base text-gray-300">Speed: {speed}</div>
          <button onClick={startGame} className="bg-white text-black px-6 py-2 rounded text-2xl hover:bg-gray-300">
            Restart
          </button>
        </div>
      )}
    </div>
  </div>

  {/* Settings Panel */}
 {!started && <div className="fixed bottom-0 md:right-0 z-30 w-full md:w-[350px] bg-transparent p-6 md:p-4 flex flex-col gap-6 md:gap-4 overflow-y-auto max-h-[90dvh] md:max-h-none text-sm md:text-base ">
    <h2 className="text-lg font-semibold">Settings</h2>
    {plays > 0 && (
      <>
        <div>
          <label htmlFor="player-img" className="block font-medium mb-1">Your Character Image:</label>
          <div className="flex items-center gap-2">
            <label htmlFor="player-img" className="cursor-pointer bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-sm">Choose Image</label>
            <input id="player-img" type="file" accept="image/*" onChange={(e) => handleUpload(e, true)} className="hidden" />
            {playerImg && <img src={playerImg} className="w-8 h-8 rounded object-cover border border-gray-700" />}
          </div>
        </div>
        <div>
          <label htmlFor="obstacle-imgs" className="block font-medium mb-1">Obstacle Images:</label>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="obstacle-imgs" className="cursor-pointer bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-sm">Choose Images</label>
            <input id="obstacle-imgs" type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
            {obImgs.filter((o) => !o.deleted).slice(0, 3).map((o, i) => (
              <div key={i} className="relative group">
                <img src={o.img} className="w-8 h-8 rounded object-cover border border-gray-700" />
                <button onClick={() => {
                  const updated = obImgs.map((img, idx) => idx === i ? { ...img, deleted: true } : img)
                  setObImgs(updated)
                  localStorage.setItem('obstacleImages', JSON.stringify(updated))
                }} className="absolute -top-2 -right-2 bg-gray-800 text-red-400 rounded-full w-4 h-4 text-xs flex items-center justify-center opacity-80 hover:opacity-100" title="Delete">✕</button>
              </div>
            ))}
          </div>
          {obImgs.some((o) => !o.deleted) && (
            <button className="mt-2 text-xs text-red-400 hover:text-red-600 underline" onClick={() => {
              const updated = obImgs.map((o) => ({ ...o, deleted: true }))
              setObImgs(updated)
              localStorage.setItem('obstacleImages', JSON.stringify(updated))
            }}>Clear All</button>
          )}
        </div>
      </>
    )}
  </div>}
</div>

  )
}

