# 🚀 Vercel Deployment Guide - MegaBeat

## 📋 Contract Info

- **Contract**: MegaBeatGame
- **Address**: `0xF9e9b5301ECC46E3d74452a8482923cc446C4886`
- **Network**: MegaETH Testnet
- **Chain ID**: 654321

## 🏗️ Frontend Structure

```
megabeat/
├── contracts/
├── scripts/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── GameCanvas.tsx       # Pixi.js game renderer
│   │   │   ├── SongCard.tsx         # Карточка песни
│   │   │   └── ScoreBoard.tsx       # Счетчик очков
│   │   ├── hooks/
│   │   │   ├── useMegaETHBlockClock.ts  # ⚡ КРИТИЧЕСКИЙ ХУК!
│   │   │   └── useGameSession.ts        # Данные игры
│   │   ├── pages/
│   │   │   ├── index.tsx            # Выбор песни
│   │   │   └── game/[songId].tsx    # Игровой экран
│   │   └── contractInfo.ts
│   ├── package.json
│   └── vite.config.ts
└── vercel.json
```

## 📄 vercel.json

```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "framework": "vite",
  "installCommand": "cd frontend && npm install"
}
```

## 🎨 Frontend Implementation

### 1. Contract Info (contractInfo.ts)

```typescript
export const MEGABEAT_ADDRESS = "0xF9e9b5301ECC46E3d74452a8482923cc446C4886";
export const MEGABEAT_ABI = [
  "function startGame(uint256 songId) external payable",
  "function hitNote(uint256 noteIndex) external",
  "function getGame(address player) external view returns (tuple(address player, uint256 songId, uint64 startBlock, uint256 score, uint256 currentNoteIndex, bool active))",
  "event GameStarted(address indexed player, uint256 songId, uint64 startBlock)",
  "event NoteHit(address indexed player, uint256 noteIndex, uint256 score)",
  "event NoteMiss(address indexed player, uint256 noteIndex)",
  "event GameFinished(address indexed player, uint256 finalScore)"
];
```

### 2. 🔥 Critical Hook: useMegaETHBlockClock.ts

```typescript
import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';

const megaETH = {
  id: 654321,
  name: 'MegaETH',
  rpcUrls: { default: { http: ['https://rpc.megaeth.xyz'] } }
};

/**
 * ⚡ CRITICAL: This hook is the "clock" of the entire game!
 * It updates every 10ms with the current block number.
 */
export function useMegaETHBlockClock() {
  const [currentBlock, setCurrentBlock] = useState<bigint>(0n);
  
  useEffect(() => {
    const client = createPublicClient({
      chain: megaETH,
      transport: http()
    });
    
    // Poll block number every 10ms (matching MegaETH block time)
    const interval = setInterval(async () => {
      const block = await client.getBlockNumber();
      setCurrentBlock(block);
    }, 10);
    
    return () => clearInterval(interval);
  }, []);
  
  return currentBlock;
}
```

### 3. Game Canvas Component (GameCanvas.tsx)

```typescript
'use client';
import { useEffect, useRef, useState } from 'react';
import { useMegaETHBlockClock } from '../hooks/useMegaETHBlockClock';
import { useWriteContract } from 'wagmi';
import * as PIXI from 'pixi.js';

interface Props {
  startBlock: bigint;
  noteBlocks: bigint[];
  onFinish: () => void;
}

export function GameCanvas({ startBlock, noteBlocks, onFinish }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const currentBlock = useMegaETHBlockClock(); // ⚡ Updates every 10ms!
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  
  const { writeContract } = useWriteContract();
  
  useEffect(() => {
    // Initialize Pixi.js app
    const app = new PIXI.Application({
      width: 800,
      height: 600,
      backgroundColor: 0x1a1a2e
    });
    
    canvasRef.current?.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;
    
    // Render game track and notes
    renderTrack(app);
    
    return () => app.destroy();
  }, []);
  
  useEffect(() => {
    // Update note positions based on currentBlock
    if (!appRef.current) return;
    
    const targetBlock = startBlock + noteBlocks[currentNoteIndex];
    const blocksUntilHit = Number(targetBlock - currentBlock);
    
    // Move note sprite based on blocksUntilHit
    // (Implementation depends on your game design)
    
  }, [currentBlock, currentNoteIndex, startBlock, noteBlocks]);
  
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      // Send transaction immediately!
      writeContract({
        address: MEGABEAT_ADDRESS,
        abi: MEGABEAT_ABI,
        functionName: 'hitNote',
        args: [currentNoteIndex]
      });
      
      setCurrentNoteIndex(prev => prev + 1);
      
      if (currentNoteIndex >= noteBlocks.length - 1) {
        onFinish();
      }
    }
  };
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentNoteIndex]);
  
  return <div ref={canvasRef} className="game-canvas" />;
}

function renderTrack(app: PIXI.Application) {
  // Draw the game track (vertical line, hit zone, etc.)
  const hitLine = new PIXI.Graphics();
  hitLine.lineStyle(4, 0x00ff00);
  hitLine.moveTo(0, 500);
  hitLine.lineTo(800, 500);
  app.stage.addChild(hitLine);
}
```

### 4. Game Page (game/[songId].tsx)

```typescript
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useWriteContract, useWatchContractEvent } from 'wagmi';
import { GameCanvas } from '../../components/GameCanvas';
import { MEGABEAT_ADDRESS, MEGABEAT_ABI } from '../../contractInfo';

export default function GamePage() {
  const { songId } = useParams();
  const [gameStarted, setGameStarted] = useState(false);
  const [startBlock, setStartBlock] = useState<bigint>(0n);
  const [score, setScore] = useState(0);
  
  const { writeContract } = useWriteContract();
  
  // Listen for GameStarted event
  useWatchContractEvent({
    address: MEGABEAT_ADDRESS,
    abi: MEGABEAT_ABI,
    eventName: 'GameStarted',
    onLogs(logs) {
      const log = logs[0];
      setStartBlock(log.args.startBlock!);
      setGameStarted(true);
    }
  });
  
  // Listen for NoteHit events (real-time feedback!)
  useWatchContractEvent({
    address: MEGABEAT_ADDRESS,
    abi: MEGABEAT_ABI,
    eventName: 'NoteHit',
    onLogs(logs) {
      const log = logs[0];
      const noteScore = Number(log.args.score);
      setScore(prev => prev + noteScore);
      
      // Show feedback
      if (noteScore === 100) showFeedback('PERFECT! +100');
      else if (noteScore === 50) showFeedback('GOOD! +50');
    }
  });
  
  // Listen for NoteMiss
  useWatchContractEvent({
    address: MEGABEAT_ADDRESS,
    abi: MEGABEAT_ABI,
    eventName: 'NoteMiss',
    onLogs() {
      showFeedback('MISS! +0');
    }
  });
  
  const handleStartGame = () => {
    writeContract({
      address: MEGABEAT_ADDRESS,
      abi: MEGABEAT_ABI,
      functionName: 'startGame',
      args: [BigInt(songId as string)],
      value: parseEther('0.001') // Entry fee
    });
  };
  
  if (!gameStarted) {
    return (
      <div className="start-screen">
        <h1>Ready to Play?</h1>
        <button onClick={handleStartGame}>Start Game (0.001 ETH)</button>
      </div>
    );
  }
  
  return (
    <div className="game-screen">
      <div className="score-display">Score: {score}</div>
      <GameCanvas 
        startBlock={startBlock}
        noteBlocks={[200n, 300n, 400n, 500n, 600n]} // Demo song
        onFinish={() => alert(`Game Over! Score: ${score}`)}
      />
      <div className="instructions">Press SPACE to hit notes!</div>
    </div>
  );
}

function showFeedback(text: string) {
  // Show animated feedback (implement with CSS animations or a toast library)
  console.log(text);
}
```

### 5. Song Selection (index.tsx)

```typescript
'use client';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();
  
  const songs = [
    { id: 0, name: 'Demo Song', difficulty: 'Easy', entryFee: '0.001' }
  ];
  
  return (
    <div className="song-selection">
      <h1>🎵 MegaBeat - Select a Song</h1>
      {songs.map(song => (
        <div key={song.id} className="song-card">
          <h2>{song.name}</h2>
          <p>Difficulty: {song.difficulty}</p>
          <p>Entry Fee: {song.entryFee} ETH</p>
          <button onClick={() => navigate(`/game/${song.id}`)}>
            Play
          </button>
        </div>
      ))}
    </div>
  );
}
```

## 🌐 Environment Variables

```
NEXT_PUBLIC_MEGABEAT_ADDRESS=0xF9e9b5301ECC46E3d74452a8482923cc446C4886
NEXT_PUBLIC_MEGAETH_RPC=https://rpc.megaeth.xyz
NEXT_PUBLIC_CHAIN_ID=654321
```

## 📦 Package.json (frontend)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "wagmi": "^2.0.0",
    "viem": "^2.0.0",
    "pixi.js": "^7.0.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

## 🚀 Deployment Steps

1. Push to GitHub
2. Import to Vercel
3. Add Environment Variables
4. Deploy!

## ✅ Testing

1. Connect wallet
2. Start game (pay 0.001 ETH)
3. Wait for countdown
4. Press Space when notes reach the line
5. Watch real-time score updates!

---

**Game On! 🎮**

