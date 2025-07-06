import { useEffect, useRef, useState } from 'react'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const playerRef = useRef(null)
  const touchStartRef = useRef({ x: 0, y: 0 })

  const [leftOffset, setLeftOffset] = useState(200)
  const [jumping, setJumping] = useState(false)
  const [playerY, setPlayerY] = useState(0)
  const [obstacles, setObstacles] = useState([])
  const [gameOver, setGameOver] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [playCount, setPlayCount] = useState(0)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('highScore') || 0))

  const [customPlayerImg, setCustomPlayerImg] = useState(null)
  const [obstacleImages, setObstacleImages] = useState([])

  const laneWidth = 100
  const playerBaseTop = 500
  const jumpHeight = 80
  const playerWidth = 50
  const playerHeight = 50

  const handleMove = (e) => {
    if (!gameStarted || gameOver) return
    if (e.key === 'ArrowLeft') setLeftOffset((prev) => Math.max(0, prev - laneWidth))
    else if (e.key === 'ArrowRight') setLeftOffset((prev) => Math.min(400, prev + laneWidth))
    else if (e.key === 'ArrowUp' && !jumping) {
      setJumping(true)
      setPlayerY(-jumpHeight)
      setTimeout(() => {
        setPlayerY(0)
        setJumping(false)
      }, 1100)
    }
  }

  const startGame = () => {
    setGameStarted(true)
    setGameOver(false)
    setObstacles([])
    setPlayerY(0)
    setJumping(false)
    setLeftOffset(200)
    setScore(0)
    setPlayCount((prev) => prev + 1)
  }

  const getObstacleImage = () => {
    const validImages = obstacleImages.filter((ob) => !ob.deleted)
    if (validImages.length === 0) return null
    const index = Math.floor(Math.random() * validImages.length)
    return validImages[index].img
  }

  const handlePlayerImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        setCustomPlayerImg(result)
        localStorage.setItem('customPlayerImg', result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleObstacleImagesUpload = (e) => {
    const files = Array.from(e.target.files)
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        const newImage = { img: result, deleted: false }
        setObstacleImages((prev) => {
          const updated = [...prev, newImage]
          localStorage.setItem('obstacleImages', JSON.stringify(updated))
          return updated
        })
      }
      reader.readAsDataURL(file)
    })
  }

  useEffect(() => {
    const savedPlayer = localStorage.getItem('customPlayerImg')
    const savedObstacles = JSON.parse(localStorage.getItem('obstacleImages') || '[]')
    if (savedPlayer) setCustomPlayerImg(savedPlayer)
    if (savedObstacles?.length) setObstacleImages(savedObstacles)
  }, [])

  useEffect(() => {
    if (!gameStarted || gameOver) return
    const spawn = setInterval(() => {
      const lanes = [0, 100, 200, 300, 400]
      const randomLeft = lanes[Math.floor(Math.random() * lanes.length)]
      const isLow = Math.random() < 0.5
      const image = getObstacleImage()

      setObstacles((prev) => [
        ...prev,
        {
          id: Date.now(),
          top: 0,
          left: randomLeft,
          height: isLow ? 30 : 50,
          img: image,
        },
      ])
    }, 1000)

    return () => clearInterval(spawn)
  }, [gameStarted, gameOver, obstacleImages])

  useEffect(() => {
    if (!gameStarted || gameOver) return
    const move = setInterval(() => {
      setObstacles((prev) =>
        prev
          .map((obs) => ({ ...obs, top: obs.top + 10 }))
          .filter((obs) => {
            const isVisible = obs.top < 600
            if (!isVisible) {
              setScore((s) => s + 1)
            }
            return isVisible
          })
      )
    }, 100)

    return () => clearInterval(move)
  }, [gameStarted, gameOver])

  useEffect(() => {
    if (!gameStarted || gameOver) return
    const playerTop = playerBaseTop + playerY
    const playerBottom = playerTop + playerHeight
    const playerRight = leftOffset + playerWidth

    obstacles.forEach((obs) => {
      const obsBottom = obs.top + obs.height
      const obsRight = obs.left + 50
      const xCollision = obs.left < playerRight && obsRight > leftOffset
      const yCollision = obsBottom > playerTop && obs.top < playerBottom
      if (xCollision && yCollision) {
        if ((obs.height === 30 && !jumping) || obs.height === 50) {
          setGameOver(true)
          setHighScore((prevHigh) => {
            const newHigh = Math.max(score, prevHigh)
            localStorage.setItem('highScore', newHigh)
            return newHigh
          })
        }
      }
    })
  }, [obstacles, leftOffset, jumping, gameStarted, gameOver, score])

  useEffect(() => {
    document.addEventListener('keydown', handleMove)
    return () => document.removeEventListener('keydown', handleMove)
  }, [leftOffset, jumping, gameStarted, gameOver])

  useEffect(() => {
    const handleTouchStart = (e) => {
      const touch = e.touches[0]
      touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    }

    const handleTouchEnd = (e) => {
      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = touch.clientY - touchStartRef.current.y

      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      if (!gameStarted || gameOver) return

      if (absX > absY) {
        if (deltaX > 30) setLeftOffset((prev) => Math.min(400, prev + laneWidth))
        else if (deltaX < -30) setLeftOffset((prev) => Math.max(0, prev - laneWidth))
      } else {
        if (deltaY < -30 && !jumping) {
          setJumping(true)
          setPlayerY(-jumpHeight)
          setTimeout(() => {
            setPlayerY(0)
            setJumping(false)
          }, 1100)
        }
      }
    }

    const gameArea = document.getElementById('game-area')
    gameArea.addEventListener('touchstart', handleTouchStart)
    gameArea.addEventListener('touchend', handleTouchEnd)

    return () => {
      gameArea.removeEventListener('touchstart', handleTouchStart)
      gameArea.removeEventListener('touchend', handleTouchEnd)
    }
  }, [jumping, gameStarted, gameOver])

  return (
    <div className="min-h-screen w-full bg-black flex flex-col md:flex-row">
      <div id="game-area" className="relative w-screen md:flex-1 bg-black overflow-hidden" style={{ height: '600px' }}>
        {gameStarted && !gameOver && (
          <div className="absolute top-2 left-2 text-white text-lg bg-black/60 px-3 py-1 rounded">
            Score: {score}
          </div>
        )}
        {highScore > 0 && (
          <div className="absolute top-2 right-2 text-yellow-300 text-lg bg-black/60 px-3 py-1 rounded">
            High Score: {highScore}
          </div>
        )}

        {gameStarted &&
          obstacles.map((obs) =>
            obs.img ? (
              <img
                key={obs.id}
                src={obs.img}
                alt="Obstacle"
                style={{
                  position: 'absolute',
                  top: `${obs.top}px`,
                  left: `${obs.left}px`,
                  width: 50,
                  height: obs.height,
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                key={obs.id}
                style={{
                  position: 'absolute',
                  top: `${obs.top}px`,
                  left: `${obs.left}px`,
                  width: 50,
                  height: obs.height,
                  backgroundColor: 'red',
                  borderRadius: 8,
                }}
              />
            )
          )}

        {gameStarted && (
          <img
            ref={playerRef}
            src={playCount > 1 && customPlayerImg ? customPlayerImg : viteLogo}
            alt="Player"
            style={{
              position: 'absolute',
              top: `${playerBaseTop + playerY}px`,
              left: `${leftOffset}px`,
              width: playerWidth,
              height: playerHeight,
              objectFit: 'cover',
              transition: 'all 0.2s ease-out',
            }}
          />
        )}

        {!gameStarted && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-4">
            <h1 className="text-4xl font-bold mb-4">Temple Run: Jump Game</h1>
            <p className="text-xl mb-2">⬅️ ➡️ Swipe to move</p>
            <p className="text-xl mb-2">⬆️ Swipe up to jump</p>
            <p className="text-xl mb-6">Avoid tall blocks at all cost!</p>
            <button
              onClick={startGame}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded mt-2 text-lg"
            >
              {playCount === 0 ? 'Start Game' : 'Play Again'}
            </button>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-4xl font-bold gap-4 bg-black/80">
            <div>Game Over</div>
            <div className="text-2xl">Score: {score}</div>
            <div className="text-xl text-yellow-400">High Score: {highScore}</div>
            <button
              onClick={startGame}
              className="bg-white text-black px-6 py-2 rounded text-2xl hover:bg-gray-300"
            >
              Restart
            </button>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      <div className="w-full md:w-[300px] bg-gray-900 text-white p-4 flex flex-col gap-4 overflow-y-auto">
        <h2 className="text-lg font-semibold">Settings</h2>

        {playCount > 0 && (
          <>
            <div>
              <label htmlFor="player-img" className="block font-medium mb-1">
                Your Character Image:
              </label>
              <div className="flex items-center gap-2">
                <label htmlFor="player-img" className="cursor-pointer bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-sm">
                  Choose Image
                </label>
                <input id="player-img" type="file" accept="image/*" onChange={handlePlayerImageUpload} className="hidden" />
                {customPlayerImg && (
                  <img src={customPlayerImg} alt="Preview" className="w-8 h-8 rounded object-cover border border-gray-700" />
                )}
              </div>
            </div>

            <div>
              <label htmlFor="obstacle-imgs" className="block font-medium mb-1">
                Obstacle Images:
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <label htmlFor="obstacle-imgs" className="cursor-pointer bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-sm">
                  Choose Images
                </label>
                <input
                  id="obstacle-imgs"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleObstacleImagesUpload}
                  className="hidden"
                />
                {obstacleImages.filter((ob) => !ob.deleted).slice(0, 3).map((ob, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={ob.img}
                      alt="Obstacle Preview"
                      className="w-8 h-8 rounded object-cover border border-gray-700"
                    />
                    <button
                      className="absolute -top-2 -right-2 bg-gray-800 text-red-400 rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-80 hover:opacity-100"
                      title="Delete"
                      onClick={() => {
                        const updated = obstacleImages.map((o, i) =>
                          i === idx ? { ...o, deleted: true } : o
                        )
                        setObstacleImages(updated)
                        localStorage.setItem('obstacleImages', JSON.stringify(updated))
                      }}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {obstacleImages.filter((ob) => !ob.deleted).length > 0 && (
                <button
                  className="mt-2 text-xs text-red-400 hover:text-red-600 underline"
                  onClick={() => {
                    const updated = obstacleImages.map((ob) => ({ ...ob, deleted: true }))
                    setObstacleImages(updated)
                    localStorage.setItem('obstacleImages', JSON.stringify(updated))
                  }}
                >
                  Clear All
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App
