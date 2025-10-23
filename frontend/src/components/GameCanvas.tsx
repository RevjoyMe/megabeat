import { useEffect, useRef } from 'react'
import * as PIXI from 'pixi.js'
import './GameCanvas.css'

interface Props {
  startBlock: bigint
  currentBlock: bigint
  noteBlocks: bigint[]
  currentNoteIndex: number
}

export default function GameCanvas({ startBlock, currentBlock, noteBlocks, currentNoteIndex }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const notesRef = useRef<PIXI.Graphics[]>([])
  
  useEffect(() => {
    if (!containerRef.current) return
    
    // Initialize Pixi app
    const app = new PIXI.Application({
      width: 800,
      height: 600,
      backgroundColor: 0x1a1a2e,
      antialias: true,
    })
    
    containerRef.current.appendChild(app.view as HTMLCanvasElement)
    appRef.current = app
    
    // Draw track (vertical line)
    const track = new PIXI.Graphics()
    track.lineStyle(4, 0x444466)
    track.moveTo(400, 0)
    track.lineTo(400, 600)
    app.stage.addChild(track)
    
    // Draw hit line (where notes should be hit)
    const hitLine = new PIXI.Graphics()
    hitLine.lineStyle(6, 0x00ff00)
    hitLine.moveTo(300, 500)
    hitLine.lineTo(500, 500)
    app.stage.addChild(hitLine)
    
    // Add hit zone indicator
    const hitZone = new PIXI.Graphics()
    hitZone.beginFill(0x00ff00, 0.1)
    hitZone.drawRect(300, 480, 200, 40)
    hitZone.endFill()
    app.stage.addChild(hitZone)
    
    return () => {
      app.destroy(true, { children: true })
    }
  }, [])
  
  useEffect(() => {
    if (!appRef.current || startBlock === 0n) return
    
    const app = appRef.current
    
    // Clear old notes
    notesRef.current.forEach(note => note.destroy())
    notesRef.current = []
    
    // Create notes for upcoming notes
    noteBlocks.forEach((noteBlock, index) => {
      if (index < currentNoteIndex) return // Skip already hit notes
      
      const note = new PIXI.Graphics()
      note.beginFill(index === currentNoteIndex ? 0xff6b6b : 0x4ecdc4)
      note.drawCircle(0, 0, 30)
      note.endFill()
      note.x = 400
      
      app.stage.addChild(note)
      notesRef.current.push(note)
    })
    
    // Animation loop
    const ticker = new PIXI.Ticker()
    ticker.add(() => {
      if (startBlock === 0n) return
      
      notesRef.current.forEach((note, index) => {
        const noteIndex = currentNoteIndex + index
        if (noteIndex >= noteBlocks.length) return
        
        const targetBlock = startBlock + noteBlocks[noteIndex]
        const blocksUntilHit = Number(targetBlock - currentBlock)
        
        // Position calculation
        // 500 = hit line Y position
        // Each block moves note by 1 pixel
        // When blocksUntilHit = 0, note should be at Y=500
        const y = 500 - blocksUntilHit
        
        note.y = y
        
        // Highlight current note
        if (index === 0) {
          note.clear()
          note.beginFill(0xff6b6b)
          note.drawCircle(0, 0, 30)
          note.endFill()
        }
        
        // Hide notes that are too far off screen
        note.visible = y > -50 && y < 650
      })
    })
    ticker.start()
    
    return () => {
      ticker.stop()
      ticker.destroy()
    }
  }, [startBlock, currentBlock, noteBlocks, currentNoteIndex])
  
  return (
    <div className="canvas-container">
      <div ref={containerRef} className="pixi-canvas" />
    </div>
  )
}

