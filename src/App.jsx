import { useEffect, useRef, useState } from 'react'
import viteLogo from '/vite.svg'
import './App.css'

const laneWidth = 100, baseTop = 500, jumpHeight = 80, playerSize = 50

export default function App() {
  const playerRef = useRef(null)
  const touchRef = useRef({ x: 0, y: 0 })

  const [left, setLeft] = useState(200)
  const [jumping, setJumping] = useState(false)
  const [yOffset, setYOffset] = useState(0)
  const [obstacles, setObstacles] = useState([])
  const [started, setStarted] = useState(false)
  const [over, setOver] = useState(false)
  const [score, setScore] = useState(0)
  const [plays, setPlays] = useState(0)
  const [highScore, setHighScore] = useState(() => +localStorage.getItem('highScore') || 0)
  const [playerImg, setPlayerImg] = useState(null)
  const [obImgs, setObImgs] = useState([])
  const [speed, setSpeed] = useState(1)

  const lanes = [0, 100, 200, 300, 400]

  const jump = () => {
    setJumping(true)
    setYOffset(-jumpHeight)
    setTimeout(() => {
      setYOffset(0)
      setJumping(false)
    }, 1100)
  }

  const move = (dir) => {
    if (!started || over) return
    if (dir === 'left') setLeft((p) => Math.max(0, p - laneWidth))
    else if (dir === 'right') setLeft((p) => Math.min(400, p + laneWidth))
    else if (dir === 'up' && !jumping) jump()
  }

  const getRandomObstacleImage = () => {
    const valid = obImgs.filter((o) => !o.deleted)
    return valid.length ? valid[Math.floor(Math.random() * valid.length)].img : null
  }

  const startGame = () => {
    setStarted(true)
    setOver(false)
    setObstacles([])
    setYOffset(0)
    setJumping(false)
    setLeft(200)
    setScore(0)
    setSpeed(1)
    setPlays((p) => p + 1)
  }

  const handleUpload = (e, isPlayer = false) => {
    const files = Array.from(e.target.files)
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (isPlayer) {
          setPlayerImg(result)
          localStorage.setItem('customPlayerImg', result)
        } else {
          const newImg = { img: result, deleted: false }
          setObImgs((prev) => {
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

  // Dynamic obstacle spawning
  useEffect(() => {
    if (!started || over) return

    let spawnTimeout
    const spawnObstacle = () => {
      const isLow = Math.random() < 0.5
      setObstacles((obs) => [
        ...obs,
        {
          id: Date.now(),
          top: 0,
          left: lanes[Math.floor(Math.random() * lanes.length)],
          height: isLow ? 30 : 50,
          img: getRandomObstacleImage(),
        },
      ])
      const nextDelay = Math.max(200, 1000 - speed * 150)
      spawnTimeout = setTimeout(spawnObstacle, nextDelay)
    }

    spawnObstacle()
    return () => clearTimeout(spawnTimeout)
  }, [started, over, speed, obImgs])

  useEffect(() => {
    if (!started || over) return
    const move = setInterval(() => {
      setObstacles((obs) =>
        obs
          .map((o) => ({ ...o, top: o.top + 10 * speed }))
          .filter((o) => {
            const visible = o.top < 600
            if (!visible) setScore((s) => s + speed)
            return visible
          })
      )
    }, 100)
    return () => clearInterval(move)
  }, [started, over, speed])

  useEffect(() => {
    if (!started || over) return
    const pTop = baseTop + yOffset
    const pBottom = pTop + playerSize
    const pRight = left + playerSize

    obstacles.forEach((o) => {
      const oBottom = o.top + o.height
      const oRight = o.left + 50
      const xHit = o.left < pRight && oRight > left
      const yHit = oBottom > pTop && o.top < pBottom
      const fatal = o.height === 30 ? !jumping : true
      if (xHit && yHit && fatal) {
        setOver(true)
        setHighScore((prev) => {
          const newHigh = Math.max(score, prev)
          localStorage.setItem('highScore', newHigh)
          return newHigh
        })
      }
    })
  }, [obstacles, left, jumping, started, over, score])

  useEffect(() => {
    const onKey = (e) => move({ ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up' }[e.key])
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [left, jumping, started, over])

  useEffect(() => {
    const area = document.getElementById('game-area')
    const start = (e) => {
      const t = e.touches[0]
      touchRef.current = { x: t.clientX, y: t.clientY }
    }
    const end = (e) => {
      const t = e.changedTouches[0]
      const dx = t.clientX - touchRef.current.x
      const dy = t.clientY - touchRef.current.y
      const ax = Math.abs(dx), ay = Math.abs(dy)
      if (!started || over) return
      if (ax > ay) move(dx > 30 ? 'right' : dx < -30 ? 'left' : '')
      else if (dy < -30 && !jumping) jump()
    }
    area.addEventListener('touchstart', start)
    area.addEventListener('touchend', end)
    return () => {
      area.removeEventListener('touchstart', start)
      area.removeEventListener('touchend', end)
    }
  }, [jumping, started, over])

  const renderObstacle = (o) => o.img ? (
    <img key={o.id} src={o.img} alt="Obstacle" className="absolute" style={{ top: o.top, left: o.left, width: 50, height: o.height, objectFit: 'cover' }} />
  ) : (
    <div key={o.id} className="absolute bg-red-600 rounded" style={{ top: o.top, left: o.left, width: 50, height: o.height }} />
  )

  const playerSrc = plays > 1 && playerImg ? playerImg : viteLogo

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-black text-white">
      {/* Game Area */}
      <div id="game-area" className="relative flex-1" style={{ height: 600 }}>
        {started && !over && (
          <>
            <div className="absolute top-2 left-2 bg-black/60 px-3 py-1 rounded">Score: {score}</div>
            <div className="absolute bottom-2 left-2 flex gap-2 bg-black/50 px-3 py-2 rounded">
              <button onClick={() => setSpeed((s) => Math.max(1, s - 1))} className="bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-sm">−</button>
              <span className="px-2 text-yellow-300">Speed: {speed}</span>
              <button onClick={() => setSpeed((s) => Math.min(5, s + 1))} className="bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-sm">+</button>
            </div>
          </>
        )}

        {highScore > 0 && <div className="absolute top-2 right-2 bg-black/60 px-3 py-1 rounded text-yellow-300">High Score: {highScore}</div>}

        {started && obstacles.map(renderObstacle)}

        {started && (
          <img ref={playerRef} src={playerSrc} alt="Player" className="absolute transition-all ease-out duration-200"
            style={{ top: baseTop + yOffset, left, width: playerSize, height: playerSize, objectFit: 'cover' }} />
        )}

        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <h1 className="text-4xl font-bold mb-4">Temple Run: Jump Game</h1>
            <p className="text-xl mb-2">⬅️ ➡️ Swipe to move</p>
            <p className="text-xl mb-2">⬆️ Swipe up to jump</p>
            <p className="text-xl mb-6">Avoid tall blocks!</p>
            <button onClick={startGame} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-lg">
              {plays === 0 ? 'Start Game' : 'Play Again'}
            </button>
          </div>
        )}

        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4 text-4xl font-bold">
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

      {/* Settings Panel */}
      <div className="w-full md:w-[300px] bg-gray-900 p-4 flex flex-col gap-4 overflow-y-auto">
        <h2 className="text-lg font-semibold">Settings</h2>
        {plays > 0 && (
          <>
            {/* Player Image Upload */}
            <div>
              <label htmlFor="player-img" className="block font-medium mb-1">Your Character Image:</label>
              <div className="flex items-center gap-2">
                <label htmlFor="player-img" className="cursor-pointer bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-sm">Choose Image</label>
                <input id="player-img" type="file" accept="image/*" onChange={(e) => handleUpload(e, true)} className="hidden" />
                {playerImg && <img src={playerImg} className="w-8 h-8 rounded object-cover border border-gray-700" />}
              </div>
            </div>

            {/* Obstacle Image Upload */}
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
      </div>
    </div>
  )
}
