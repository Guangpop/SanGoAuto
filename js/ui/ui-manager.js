// 三國天命 - UI管理器
// Main UI Manager with modular components

class UIManager {
    constructor() {
        this.currentScreen = 'loading';
        this.gameEngine = null;
        this.updateInterval = null;

        // UI元素引用
        this.elements = {
            screens: {},
            playerInfo: {},
            gameControls: {},
            eventLog: {},
            mainMenu: {},
            skillSelection: {}
        };

        // 初始化UI組件
        this.skillUI = new SkillUI(this);
        this.gameUI = new GameUI(this);
        this.eventLogUI = new EventLogUI(this);

        this.init();
    }

    /**
     * 初始化UI管理器
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.eventLogUI.setupEventLog();

        // 等待遊戲引擎準備
        this.waitForGameEngine();
    }

    /**
     * 緩存DOM元素
     */
    cacheElements() {
        // 螢幕元素
        this.elements.screens = {
            loading: document.getElementById('loading-screen'),
            mainMenu: document.getElementById('main-menu'),
            skillSelection: document.getElementById('skill-selection'),
            gameScreen: document.getElementById('game-screen'),
            gameOver: document.getElementById('game-over')
        };

        // 玩家信息元素
        this.elements.playerInfo = {
            name: document.getElementById('player-name'),
            level: document.getElementById('player-level'),
            strength: document.getElementById('attr-strength'),
            intelligence: document.getElementById('attr-intelligence'),
            leadership: document.getElementById('attr-leadership'),
            politics: document.getElementById('attr-politics'),
            charisma: document.getElementById('attr-charisma'),
            gold: document.getElementById('player-gold'),
            troops: document.getElementById('player-troops'),
            cities: document.getElementById('cities-controlled')
        };

        // 遊戲控制元素
        this.elements.gameControls = {
            pauseBtn: document.getElementById('pause-game'),
            saveBtn: document.getElementById('save-game'),
            speed1x: document.getElementById('speed-1x'),
            speed2x: document.getElementById('speed-2x'),
            speed4x: document.getElementById('speed-4x')
        };

        // 事件日誌元素
        this.elements.eventLog = {
            container: document.getElementById('event-messages'),
            clearBtn: document.getElementById('clear-log')
        };

        // 主選單元素
        this.elements.mainMenu = {
            newGameBtn: document.getElementById('start-new-game'),
            loadGameBtn: document.getElementById('load-game'),
            settingsBtn: document.getElementById('show-settings'),
            rulesBtn: document.getElementById('show-rules')
        };

        // 技能選擇元素
        this.elements.skillSelection = {
            container: document.getElementById('skill-selection'),
            skillsGrid: document.getElementById('available-skills'),
            remainingStars: document.getElementById('remaining-stars'),
            currentRound: document.getElementById('current-round'),
            skipBtn: document.getElementById('skip-skill'),
            confirmBtn: document.getElementById('confirm-selection')
        };
    }

    /**
     * 綁定事件處理器
     */
    bindEvents() {
        // 主選單事件
        if (this.elements.mainMenu.newGameBtn) {
            this.elements.mainMenu.newGameBtn.addEventListener('click', () => this.startNewGame());
        }

        // 遊戲控制事件
        if (this.elements.gameControls.pauseBtn) {
            this.elements.gameControls.pauseBtn.addEventListener('click', () => this.togglePause());
        }

        if (this.elements.gameControls.saveBtn) {
            this.elements.gameControls.saveBtn.addEventListener('click', () => this.saveGame());
        }

        // 速度控制
        ['1', '2', '4'].forEach(speed => {
            const btn = document.getElementById(`speed-${speed}x`);
            if (btn) {
                btn.addEventListener('click', () => this.setGameSpeed(parseInt(speed)));
            }
        });

        // 事件日誌清除
        if (this.elements.eventLog.clearBtn) {
            this.elements.eventLog.clearBtn.addEventListener('click', () => this.eventLogUI.clearEventLog());
        }

        // 技能選擇事件
        if (this.elements.skillSelection.skipBtn) {
            this.elements.skillSelection.skipBtn.addEventListener('click', () => this.skillUI.skipSkillRound());
        }
    }

    /**
     * 等待遊戲引擎準備
     */
    async waitForGameEngine() {
        const checkEngine = () => {
            if (window.gameEngine && window.gameEngine.gameData.skills.length > 0) {
                this.gameEngine = window.gameEngine;
                this.showMainMenu();
            } else {
                setTimeout(checkEngine, 100);
            }
        };
        checkEngine();
    }

    /**
     * 顯示主選單
     */
    showMainMenu() {
        this.switchScreen('mainMenu');
        this.updateLoadingText('遊戲準備就緒');
    }

    /**
     * 開始新遊戲
     */
    startNewGame() {
        if (!this.gameEngine) return;

        this.gameEngine.startNewGame();
        this.skillUI.showSkillSelection();
        this.startUIUpdates();
    }

    /**
     * 開始UI更新循環
     */
    startUIUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(() => {
            if (this.gameEngine && this.gameEngine.gameState) {
                this.gameUI.updateGameUI();

                // 檢查遊戲結束
                if (this.gameEngine.gameState.status === 'game_over') {
                    this.gameUI.showGameOver();
                }
            }
        }, 1000); // 每秒更新一次
    }

    /**
     * 切換暫停狀態
     */
    togglePause() {
        if (this.gameEngine) {
            this.gameEngine.togglePause();
            const btn = this.elements.gameControls.pauseBtn;
            if (btn) {
                btn.textContent = this.gameEngine.isRunning ? '暫停' : '繼續';
            }
        }
    }

    /**
     * 設置遊戲速度
     */
    setGameSpeed(speed) {
        if (this.gameEngine) {
            this.gameEngine.setGameSpeed(speed);

            // 更新速度按鈕樣式
            ['1', '2', '4'].forEach(s => {
                const btn = document.getElementById(`speed-${s}x`);
                if (btn) {
                    btn.classList.toggle('active', s === speed.toString());
                }
            });
        }
    }

    /**
     * 保存遊戲
     */
    saveGame() {
        // TODO: 實現保存功能
        console.log('保存功能尚未實現');
    }

    /**
     * 切換螢幕
     */
    switchScreen(screenName) {
        Object.values(this.elements.screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });

        const targetScreen = this.elements.screens[screenName];
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenName;
        }
    }

    /**
     * 更新載入文字
     */
    updateLoadingText(text) {
        const loadingText = document.getElementById('loading-text');
        if (loadingText) {
            loadingText.textContent = text;
        }
    }

    /**
     * 添加日誌訊息（由gameLogger調用）
     */
    addLogMessage(logEntry) {
        this.eventLogUI.addLogMessage(logEntry);
    }

    /**
     * 銷毀UI管理器
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

// 創建全局UI管理器實例
window.uiManager = new UIManager();

// 導出類別
window.UIManager = UIManager;