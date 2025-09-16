# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SanGoAuto** is a Three Kingdoms-themed idle game designed for GitHub Pages deployment. The game features automatic progression with minimal player interaction, focusing on random events, city conquest, and general recruitment mechanics.

### Game Specifications
- **Session Length**: ~10 minutes per playthrough
- **Language**: Primary Chinese with i18n support for future localization
- **Replayability**: New Game+ mode with unlock rewards and progression bonuses after completion

### Core Concept
- **Platform**: GitHub Pages (static web hosting)
- **Tech Stack**: HTML + CSS + JavaScript (frontend-only)
- **Theme**: Three Kingdoms historical setting with idle/incremental gameplay
- **Gameplay**: Players make initial choices (skills + attribute allocation), then watch automated progression through random events and city battles

## Development Commands

```bash
# Serve locally (when using a static server)
python -m http.server 8000
# or
npx serve .

# Testing (Required for all changes)
npm test                    # Run all Jest tests
npm test -- --watch        # Run tests in watch mode
npm test specific.test.js   # Run specific test file

# Deploy to GitHub Pages
git push origin main
```

## ⚠️ CRITICAL: Testing Requirements

**從現在開始，所有的修改或新增功能都必須使用Jest撰寫單元測試來確保修改的正確性以及是否有副作用 (side effect)。**

### 測試驅動開發 (TDD) 規範：

#### 1. 必須測試的情況：
- **每個新功能** - 必須先寫測試，後寫實現
- **每個修改** - 必須有對應的測試來驗證修改正確性
- **每個bug修復** - 必須有測試重現問題並驗證修復
- **重構代碼** - 必須確保現有測試通過

#### 2. 測試覆蓋要求：
- **功能測試** - 驗證功能按預期工作
- **邊界測試** - 測試邊界條件和錯誤情況
- **副作用檢測** - 確保修改不會破壞現有功能
- **集成測試** - 驗證組件間正確協作

#### 3. 測試文件結構：
```
tests/
├── setup.js                   # 測試環境設置與mock
├── integration.test.js        # 集成測試
├── skill-system.test.js       # 技能系統測試
├── skill-ui.test.js           # 技能UI測試
├── [component-name].test.js   # 其他組件測試
└── [feature-name].test.js     # 功能特定測試
```

#### 4. 開發流程：
1. **分析需求** → 2. **編寫測試** → 3. **實現功能** → 4. **運行測試** → 5. **重構優化**

#### 5. 測試標準：
- 使用中文描述測試用例，便於理解
- 每個測試專注單一功能點
- 適當使用mock避免外部依賴
- 測試必須具有描述性的名稱

## Architecture

### Game Structure
Based on the PRD (`claude_prd.md`), the game follows this architecture:

1. **Initialization Phase**
   - Player receives 10 stars
   - Random skill selection (3 rounds from 100+ skills database)
   - Attribute allocation (武力/智力/統治/政治/魅力)

2. **Main Game Loop** (~8-10 minutes total)
   - Random events (triggered by 天命 values)
   - City conquest battles
   - General recruitment/management
   - Player leveling (Lv.1-10)
   - Resource management (gold, equipment, troops)

3. **Post-Game Content**
   - New Game+ mode with legacy bonuses
   - Unlock system for additional skills/starting bonuses
   - Achievement-based progression rewards

4. **Data Systems**
   - Skills database (100+ skills with star costs)
   - Cities database (Three Kingdoms locations with connections)
   - Generals database (historical Three Kingdoms characters)
   - Events database (random events with probability modifiers)
   - Equipment system (common/rare/legendary tiers)

### Technical Architecture

**Frontend-Only Design:**
- **Data Storage**: JSON files for game data (skills, cities, generals, events)
- **Game State**: localStorage for save/load functionality
- **Game Loop**: JavaScript timers (setInterval) for automated progression
- **UI Framework**: Vanilla JavaScript or lightweight framework (React/Vue consideration)
- **Localization**: i18n system for Chinese (primary) with English support structure

**Key Components:**
- Game initialization and skill selection UI
- Main game display (player stats, event log, map overview)
- Battle resolution system
- Random event system with probability calculations
- Save/load system using localStorage

### File Organization
```
/
├── claude_prd.md          # Product Requirements Document (Chinese)
├── index.html             # Main game entry point (to be created)
├── css/                   # Styling
├── js/                    # Game logic
│   ├── game.js           # Main game controller
│   ├── data/             # JSON databases
│   │   ├── skills.json   # 100+ skills with costs/effects
│   │   ├── cities.json   # Three Kingdoms cities and connections
│   │   ├── generals.json # Historical characters with stats
│   │   └── events.json   # Random events with probabilities
│   ├── utils/            # Helper functions
│   └── i18n/             # Localization files
│       ├── zh.json       # Chinese translations (primary)
│       └── en.json       # English translations (future)
└── assets/               # Images, fonts, other static assets
```

## Development Notes

- **Language**: PRD is in Chinese, but code should use English for maintainability
- **Deployment**: Designed for GitHub Pages static hosting
- **Save System**: Client-side only using localStorage
- **Game Balance**: Heavy emphasis on randomization and probability systems
- **UI/UX**: Minimal interaction design - focus on automated progression display
- **Session Design**: Optimized for 10-minute gameplay sessions with satisfying completion
- **Progression System**: New Game+ unlocks and achievement-based rewards for replayability
- **Localization**: Build with i18n from start - Chinese primary, English structure prepared

## Key Game Mechanics to Implement

1. **Probability Systems**: Random events, skill triggers, battle outcomes
2. **Attribute Calculations**: Combat resolution based on 5 core stats
3. **Graph Traversal**: City connections for conquest progression
4. **Resource Management**: Equipment acquisition based on city count
5. **AI Behavior**: Automated decision making for idle gameplay
6. **Session Management**: 10-minute optimal gameplay pacing with natural stopping points
7. **Progression Tracking**: Unlock system and New Game+ bonus calculations
8. **Localization Engine**: Dynamic text loading based on language preference

## Game Balance & Mechanics Details

### Combat System (To Be Defined)
- **Battle Calculation Formula**: Weight distribution for 武力/智力/統治/政治/魅力 in combat
- **Skill Success Rate**: How 智力 affects skill trigger probability
- **Damage Mitigation**: How 統治 affects damage absorption
- **Equipment Bonuses**: Multiplier effects for common/rare/legendary gear

### Probability Systems (To Be Defined)
- **天命 Impact Formula**: How hidden 天命 stat modifies event probabilities
- **Event Trigger Rates**: Base percentages and 天命 modifiers for each event type
- **General Recruitment**: 魅力-based surrender rate calculations
- **Equipment Drop Rates**: City count thresholds for rare/legendary drops

### Progression Pacing (To Be Defined)
- **Level-up Timing**: Optimal intervals for player progression within 10 minutes
- **City Conquest Rate**: Balanced progression through map territories
- **Resource Generation**: Gold and equipment acquisition curves

## User Experience Features (To Be Implemented)

### Game Speed Control
- **Speed Settings**: 1x, 2x, 4x playback speed options
- **Auto-pause**: Strategic pause points for player decision making
- **Fast-forward**: Skip animations while preserving game logic

### Enhanced Save System
- **Multiple Save Slots**: 3-5 save game slots for different runs
- **Auto-save**: Periodic progress preservation every 30 seconds
- **Save States**: Preserve exact game state including RNG seeds
- **Export/Import**: Save data backup and sharing capabilities

### Offline Progress (To Be Designed)
- **Offline Calculation**: Determine progress when game is closed
- **Return Bonus**: Balanced offline rewards without breaking progression
- **Time Caps**: Maximum offline progress duration (e.g., 4 hours)

## Technical Implementation Considerations

### Performance Optimization
- **Memory Management**: Prevent memory leaks in long game sessions
- **Event Cleanup**: Proper timer and event listener disposal
- **Efficient Rendering**: Minimize DOM manipulation during automated gameplay
- **Asset Loading**: Lazy loading for non-critical game resources

### Error Handling & Reliability
- **Save Corruption**: Recovery mechanisms for damaged save data
- **Network Issues**: Graceful handling of asset loading failures
- **Browser Compatibility**: Fallbacks for older browser versions
- **Data Validation**: Input sanitization and state consistency checks

### Content Expansion Framework

### Event System Enhancement
- **Interactive Events**: Some events requiring player choice (20% of events)
- **Chain Events**: Multi-stage events with branching outcomes
- **Seasonal Events**: Special events unlocked through achievements
- **Dynamic Events**: Events that reference current game state

### Achievement System (Base Version)
- **Combat Achievements**: Win streaks, damage records, perfect battles
- **Collection Achievements**: Recruit specific generals, obtain legendary equipment
- **Progression Achievements**: Reach certain levels, conquer regions
- **Hidden Achievements**: Secret objectives discovered through gameplay

### New Game+ Features (To Be Designed)
- **Legacy Bonuses**: Permanent stat bonuses from previous runs
- **Unlock Progression**: New skills, starting equipment, or generals
- **Prestige Currency**: Meta-progression resource earned from completions
- **Difficulty Scaling**: Balanced challenge increase with better rewards