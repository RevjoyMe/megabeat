import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWatchContractEvent, useBlockNumber } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { parseEther } from 'viem'
import { CONTRACT_ADDRESS, CONTRACT_ABI, DEMO_SONG_NOTES, ENTRY_FEE } from '../contractConfig'
import GameCanvas from './GameCanvas'
import './GameInterface.css'

type GameState = 'menu' | 'countdown' | 'playing' | 'finished'

export default function GameInterface() {
  const { address, isConnected } = useAccount()
  const [gameState, setGameState] = useState<GameState>('menu')
  const [score, setScore] = useState(0)
  const [currentNote, setCurrentNote] = useState(0)
  const [startBlock, setStartBlock] = useState<bigint>(0n)
  const [feedback, setFeedback] = useState<string>('')
  const [countdown, setCountdown] = useState(3)
  
  const { data: currentBlock } = useBlockNumber({ watch: true })
  const { writeContract, isPending } = useWriteContract()
  
  // Watch for game start
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    eventName: 'GameStarted',
    onLogs(logs) {
      logs.forEach((log: any) => {
        if (log.args.player?.toLowerCase() === address?.toLowerCase()) {
          setStartBlock(log.args.startBlock)
          setGameState('countdown')
          startCountdown()
        }
      })
    },
  })
  
  // Watch for note hits
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    eventName: 'NoteHit',
    onLogs(logs) {
      logs.forEach((log: any) => {
        if (log.args.player?.toLowerCase() === address?.toLowerCase()) {
          const noteScore = Number(log.args.score)
          setScore(prev => prev + noteScore)
          
          if (noteScore === 100) showFeedback('PERFECT! 🔥')
          else if (noteScore === 50) showFeedback('GOOD! ✨')
          else showFeedback('MISS! 😢')
          
          setCurrentNote(prev => prev + 1)
        }
      })
    },
  })
  
  // Watch for game finish
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    eventName: 'GameFinished',
    onLogs(logs) {
      logs.forEach((log: any) => {
        if (log.args.player?.toLowerCase() === address?.toLowerCase()) {
          setGameState('finished')
        }
      })
    },
  })
  
  const startCountdown = () => {
    let count = 3
    setCountdown(count)
    const interval = setInterval(() => {
      count--
      if (count > 0) {
        setCountdown(count)
      } else {
        clearInterval(interval)
        setGameState('playing')
      }
    }, 1000)
  }
  
  const showFeedback = (text: string) => {
    setFeedback(text)
    setTimeout(() => setFeedback(''), 1000)
  }
  
  const handleStartGame = () => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'startGame',
      args: [0n], // Song ID 0 (demo song)
      value: parseEther(ENTRY_FEE),
    })
  }
  
  const handleHitNote = () => {
    if (gameState !== 'playing') return
    
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'hitNote',
      args: [BigInt(currentNote)],
    })
  }
  
  const handleRestart = () => {
    setGameState('menu')
    setScore(0)
    setCurrentNote(0)
    setStartBlock(0n)
  }
  
  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameState === 'playing') {
        e.preventDefault()
        handleHitNote()
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [gameState, currentNote])
  
  return (
    <div className="game-container">
      <div className="game-header">
        <div className="score-display">
          <h3>Score</h3>
          <div className="score">{score}</div>
        </div>
        <ConnectButton />
      </div>
      
      {!isConnected ? (
        <div className="connect-prompt">
          <h2>Connect Wallet to Play</h2>
          <p>Entry Fee: {ENTRY_FEE} ETH</p>
        </div>
      ) : gameState === 'menu' ? (
        <div className="menu-screen">
          <h2>🎵 MegaBeat</h2>
          <div className="song-info">
            <h3>Demo Song</h3>
            <p>Difficulty: Easy</p>
            <p>Notes: {DEMO_SONG_NOTES.length}</p>
            <p>Entry Fee: {ENTRY_FEE} ETH</p>
          </div>
          <button 
            className="play-button" 
            onClick={handleStartGame}
            disabled={isPending}
          >
            {isPending ? 'Starting...' : 'Play Game'}
          </button>
          <div className="instructions">
            <h4>How to Play:</h4>
            <ul>
              <li>Press SPACE when notes reach the hit line</li>
              <li>Perfect timing = 100 points</li>
              <li>Close timing = 50 points</li>
              <li>Miss = 0 points</li>
              <li>Game uses 10ms block precision!</li>
            </ul>
          </div>
        </div>
      ) : gameState === 'countdown' ? (
        <div className="countdown-screen">
          <div className="countdown-number">{countdown}</div>
          <p>Get Ready!</p>
        </div>
      ) : gameState === 'playing' ? (
        <div className="game-screen">
          <GameCanvas
            startBlock={startBlock}
            currentBlock={currentBlock || 0n}
            noteBlocks={DEMO_SONG_NOTES.map(n => BigInt(n))}
            currentNoteIndex={currentNote}
          />
          {feedback && (
            <div className="feedback-popup">{feedback}</div>
          )}
          <div className="controls">
            <p>Press SPACE to hit notes!</p>
            <p>Note: {currentNote + 1} / {DEMO_SONG_NOTES.length}</p>
          </div>
        </div>
      ) : (
        <div className="finish-screen">
          <h2>Game Complete!</h2>
          <div className="final-score">
            <h3>Final Score</h3>
            <div className="score">{score}</div>
            <p>out of {DEMO_SONG_NOTES.length * 100}</p>
          </div>
          <button className="play-button" onClick={handleRestart}>
            Play Again
          </button>
        </div>
      )}
    </div>
  )
}

