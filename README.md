# MegaBeat 🎵 - On-Chain Rhythm Game на MegaETH

## 🎯 Концепция

**MegaBeat** — это первая полностью on-chain ритм-игра (как Guitar Hero), где точность измеряется на уровне **блокчейн-блоков**. "Ноты" привязаны к конкретным номерам мини-блоков MegaETH (с точностью до 10 мс). Игрок должен отправить транзакцию "Hit" так, чтобы она попала именно в тот блок. Очки начисляются за точность: Perfect (100), Good (50), Miss (0).

## 🚀 Почему MegaETH?

Только **10ms блоки** дают достаточное временное разрешение для судейства ритм-игры. На Ethereum (12 сек) это было бы невозможно — это как играть в Guitar Hero с задержкой в 12 секунд!

## 📝 Deployed Contract

- **Contract Name**: MegaBeatGame
- **Address**: `0xF9e9b5301ECC46E3d74452a8482923cc446C4886`
- **Network**: MegaETH Testnet
- **Explorer**: https://megaexplorer.xyz/address/0xF9e9b5301ECC46E3d74452a8482923cc446C4886

## 🏗️ Архитектура

### Smart Contract (MegaBeatGame.sol)

**Ключевые структуры:**
```solidity
struct Song {
    string name;
    uint64[] noteBlocks;  // Номера блоков для нот
    uint256 entryFee;
}

struct GameSession {
    address player;
    uint256 songId;
    uint64 startBlock;
    uint256 score;
    uint256 currentNoteIndex;
    bool active;
}
```

**Основные функции:**
- `startGame(uint256 songId)` - начать игру (платный вход)
- `hitNote(uint256 noteIndex)` - нажать ноту (ключевая функция!)
- `getGame(address player)` - получить информацию об игре (view)

**Логика Scoring:**
```solidity
if (block.number == targetBlock) → Perfect! (100 очков)
else if (block.number == targetBlock ± 1) → Good! (50 очков)
else → Miss! (0 очков)
```

**События:**
- `GameStarted` - игра началась
- `NoteHit` - нота нажата (с указанием очков)
- `NoteMiss` - промах
- `GameFinished` - игра завершена

## 💻 Tech Stack

- **Smart Contracts**: Solidity 0.8.20, Hardhat, OpenZeppelin
- **Frontend** (планируется): React + Vite, Pixi.js (для game canvas), TypeScript, wagmi, viem
- **Blockchain**: MegaETH (10ms blocks = идеальное разрешение для ритм-игры!)

## 🎮 User Flow

### 1. Выбор Песни
- Пользователь видит список песен
- Каждая песня: название, рекорд, сложность, плата за вход (0.001 ETH)
- Нажимает "Play"

### 2. Начало Игры
- Модальное окно: "Ready? Press Start!"
- Пользователь подписывает `startGame()` транзакцию
- Фронтенд слушает событие `GameStarted` через **Realtime API**
- Обратный отсчет: "3... 2... 1... GO!"

### 3. Игровой Процесс (КЛЮЧЕВАЯ МЕХАНИКА!)

**Хук useMegaETHBlockClock:**
```typescript
const [currentBlock, setCurrentBlock] = useState(0);

megaeth.subscribe('newMiniblocks', (block) => {
  setCurrentBlock(block.number); // Обновляется каждые 10ms!
});
```

**Рендеринг Нот (GameCanvas.tsx):**
- Канвас знает `startBlock` и `song.noteBlocks`
- Нота №5 должна быть нажата в блоке `startBlock + song.noteBlocks[5]`
- Нота "движется" вниз по "дорожке"
- Когда `currentBlock` приближается к `targetBlock`, нота приближается к "линии нажатия"

**Нажатие (User Action):**
- Игрок нажимает Пробел
- Фронтенд **немедленно** отправляет транзакцию:
  ```typescript
  writeContract({ 
    functionName: 'hitNote', 
    args: [currentNoteIndex] 
  });
  ```

**Feedback (Realtime API):**
- Фронтенд **не показывает** "Perfect" сразу (нельзя знать заранее!)
- Фронтенд слушает события `NoteHit` и `NoteMiss`
- Через ~20-50ms приходит событие с `score`
- На экране вспыхивает: "PERFECT! +100" или "MISS! +0"
- Счетчик очков обновляется

### 4. Завершение
- После последней ноты → событие `GameFinished`
- Экран: "Your Score: 450 / 500. High Score: 480"

## 🔥 Уникальные Фичи

1. **On-Chain Timing**: Вся логика судейства 100% on-chain
2. **10ms Precision**: Достаточно для реалистичной ритм-игры
3. **Provable Scores**: Все рекорды неизменяемы и проверяемы
4. **Real-time Feedback**: Мгновенный отклик через Realtime API

## 🛠️ Local Development

```bash
npm install
npm run compile
npm run deploy  # уже задеплоено!
```

## 📚 Документация

См. [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) для инструкций по деплою на Vercel.

---

**Built with ❤️ for MegaETH Hackathon**

