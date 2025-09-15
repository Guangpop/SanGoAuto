# 三國天命 SanGoAuto

> 一款基於三國歷史的放置養成小遊戲

## 🎮 遊戲簡介

三國天命是一款以三國歷史為背景的放置型養成遊戲。玩家在開局時選擇天命技能並分配能力值，之後遊戲將自動推進，通過隨機事件、攻城戰、招降將領等方式發展勢力，最終目標是統一天下。

### ✨ 主要特色

- **自動化放置玩法** - 玩家僅需在開局做出選擇，遊戲自動推進
- **豐富的技能系統** - 100+ 種天命技能，每局隨機抽取
- **策略性能力配點** - 五維能力值影響不同遊戲面向
- **隨機事件驅動** - 天命數值影響事件觸發機率
- **三國歷史背景** - 經典城池、將領、裝備設定
- **完整UI界面** - 實時顯示遊戲狀態和事件日誌

## 🚀 快速開始

### 線上遊玩
直接在瀏覽器中打開 `index.html` 即可開始遊戲。

### 本地開發

```bash
# 克隆專案
git clone https://github.com/username/SanGoAuto.git
cd SanGoAuto

# 啟動本地伺服器（推薦）
python -m http.server 8000
# 或使用 Node.js
npx serve .

# 在瀏覽器中打開 http://localhost:8000
```

### GitHub Pages 部署

1. 將專案推送到 GitHub 倉庫
2. 在倉庫設定中啟用 GitHub Pages
3. 選擇 `main` 分支作為來源
4. 遊戲將自動部署到 `https://username.github.io/SanGoAuto`

## 🎯 遊戲玩法

### 🌟 技能選擇階段
1. 獲得 10 顆星星作為初始資源
2. 進行 3 輪技能抽選，每輪從 3 個隨機技能中選擇 1 個或跳過
3. 剩餘星星自動轉換為能力值點數（1星 = 10點）

### ⚔️ 主遊戲循環
每個回合自動執行：
1. **隨機事件階段** - 觸發 0-2 個隨機事件
2. **戰鬥階段** - 攻打相鄰城池
3. **收編階段** - 嘗試招降敵將
4. **升級階段** - 每2勝升1級

### 📊 能力值系統
- **武力** - 影響攻擊傷害
- **智力** - 影響技能成功率和傷害
- **統治** - 影響帶兵數量和承受傷害
- **政治** - 影響城池資源產出和守城成功率
- **魅力** - 影響將領投降率和自動投奔機率
- **天命** - 隱藏屬性，影響隨機事件機率

## 🖥️ 遊戲界面

### 主要功能
- **玩家狀態面板** - 實時顯示等級、屬性、資源
- **城池管理** - 查看控制的城池和敵方城池
- **將領列表** - 顯示麾下將領的詳細信息
- **事件日誌** - 實時記錄遊戲進程
- **遊戲控制** - 暫停、倍速、存檔功能

### 操作說明
- 🖱️ **技能選擇**：點擊技能卡片選擇，或點擊"跳過此輪"
- ⏸️ **暫停遊戲**：點擊暫停按鈕控制遊戲進行
- ⚡ **調整速度**：使用 1x/2x/4x 按鈕調整遊戲速度
- 📜 **查看日誌**：在事件記錄區域查看最新50條遊戲事件

## 🎲 演示模式

遊戲提供完整的演示系統：

```javascript
// 在瀏覽器控制台中輸入：
demo.startDemo()                 // 自動演示完整遊戲流程
demo.manualSkillSelection()      // 手動技能選擇模式

// 查看遊戲日誌
gameLogger.getGameLogs()         // 獲取遊戲事件日誌
gameLogger.exportLogs()          // 導出完整日誌
```

## 🛠️ 技術架構

### 前端技術
- **HTML5 + CSS3** - 響應式界面設計
- **Vanilla JavaScript** - 純 JS 實現，無框架依賴
- **模組化架構** - 清晰的代碼結構和職責分離

### 核心系統
- **遊戲引擎** (`js/core/game-engine.js`) - 核心遊戲邏輯
- **UI管理器** (`js/ui/ui-manager.js`) - 界面狀態管理
- **日誌系統** (`js/utils/logger.js`) - 完整的事件記錄
- **工具函數** (`js/utils/helpers.js`) - 通用工具方法

### 數據系統
- **JSON 數據檔** - 技能、城池、將領、裝備、事件
- **localStorage** - 本地存檔系統（規劃中）
- **實時狀態** - 動態更新遊戲界面

## 📁 專案結構

```
SanGoAuto/
├── index.html              # 遊戲主頁面
├── css/                    # 樣式文件
│   ├── reset.css          # CSS 重置
│   ├── main.css           # 主要樣式
│   ├── components.css     # UI組件樣式
│   └── animations.css     # 動畫效果
├── js/                     # JavaScript 檔案
│   ├── core/              # 核心遊戲邏輯
│   │   ├── types.ts       # 數據結構定義
│   │   ├── game-engine.js # 遊戲引擎
│   │   └── demo.js        # 演示系統
│   ├── ui/                # UI管理
│   │   └── ui-manager.js  # UI管理器
│   ├── utils/             # 工具函數
│   │   ├── helpers.js     # 通用工具
│   │   └── logger.js      # 日誌系統
│   ├── data/              # 遊戲數據
│   │   ├── skills.json    # 技能數據
│   │   ├── cities.json    # 城池數據
│   │   ├── generals.json  # 將領數據
│   │   ├── equipment.json # 裝備數據
│   │   └── events.json    # 事件數據
│   └── i18n/              # 多語言支援
│       ├── zh.json        # 中文翻譯
│       └── en.json        # 英文翻譯
├── assets/                 # 遊戲資源（待添加）
│   ├── images/            # 圖片資源
│   └── audio/             # 音效資源
└── docs/                   # 文檔
    ├── CLAUDE.md          # 開發指南
    └── claude_prd.md      # 產品需求文檔
```

## 🎨 特色功能

### 🎯 完整的遊戲體驗
- **10分鐘遊戲時長** - 適中的遊戲節奏
- **豐富的三國元素** - 歷史人物、城池、裝備
- **策略性決策** - 技能選擇影響整局遊戲

### 🖼️ 精美的用戶界面
- **三國主題設計** - 古銅色、金色配色方案
- **響應式布局** - 支援桌面和行動裝置
- **實時數據更新** - 動態顯示遊戲狀態

### 🔧 開發友好
- **模組化設計** - 易於擴展和維護
- **完整日誌系統** - 便於調試和觀察
- **TypeScript 支援** - 完整的型別定義

## 🚀 部署到 GitHub Pages

### 自動部署
1. Fork 此專案到你的 GitHub 帳戶
2. 在專案設定中啟用 GitHub Pages
3. 選擇 `main` 分支
4. 遊戲將自動部署並可通過 GitHub Pages URL 訪問

### 手動部署
```bash
# 如果有自定義修改，推送到你的倉庫
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

## 🎮 遊戲截圖

### 主選單
![主選單](docs/images/main-menu.png)

### 技能選擇
![技能選擇](docs/images/skill-selection.png)

### 遊戲界面
![遊戲界面](docs/images/game-screen.png)

## 🤝 貢獻指南

歡迎提交 Issue 和 Pull Request！

### 開發流程
1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

### 代碼規範
- 使用一致的代碼風格
- 添加必要的註釋
- 確保功能正常運作
- 更新相關文檔

## 📄 授權條款

本專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 檔案

## 🙏 致謝

- 三國歷史資料參考
- 開源社群的貢獻
- Claude Code 開發協助
- 所有測試和反饋用戶

---

**🎯 立即體驗：** [遊戲連結](https://username.github.io/SanGoAuto)
**⭐ 喜歡的話請給個星星！**

**遊戲時長**: ~10分鐘/局 | **語言**: 中文 | **平台**: Web瀏覽器 | **類型**: 放置養成