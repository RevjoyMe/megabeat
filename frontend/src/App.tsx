import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { config } from './wagmi'
import GameInterface from './components/GameInterface'
import '@rainbow-me/rainbowkit/styles.css'
import './App.css'

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <div className="app">
            <header>
              <div className="header-content">
                <h1>🎵 MegaBeat</h1>
                <p className="subtitle">On-chain rhythm game • 10ms precision</p>
                <div className="badge">MegaETH Testnet</div>
              </div>
            </header>
            
            <main>
              <GameInterface />
            </main>
            
            <footer>
              <p>Built on MegaETH • Contract: 0xF9e9b5301ECC46E3d74452a8482923cc446C4886</p>
            </footer>
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App

