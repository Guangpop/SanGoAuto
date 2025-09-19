// 三國天命 - 遊戲初始化腳本
// Game initialization script

(function() {
    'use strict';

    console.log('🎮 開始初始化三國天命遊戲...');

    // 等待所有腳本載入完成
    function waitForDependencies() {
        return new Promise((resolve) => {
            function checkDependencies() {
                const required = [
                    'GameLogger',
                    'GameEngine',
                    'UIManager',
                    'gameAPI'
                ];

                const missing = required.filter(dep => !window[dep]);

                if (missing.length === 0) {
                    console.log('✅ 所有依賴項已載入');
                    resolve();
                } else {
                    console.log('⏳ 等待依賴項載入:', missing);
                    setTimeout(checkDependencies, 100);
                }
            }

            checkDependencies();
        });
    }

    // 初始化遊戲
    async function initializeGame() {
        try {
            await waitForDependencies();

            console.log('🔧 創建遊戲引擎實例...');
            if (!window.gameEngine) {
                window.gameEngine = new GameEngine();
            }

            console.log('🎨 創建UI管理器實例...');
            if (!window.uiManager) {
                window.uiManager = new UIManager();
            }

            // 等待遊戲數據載入
            console.log('📂 等待遊戲數據載入...');
            while (!window.gameEngine.dataReady) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log('✅ 遊戲初始化完成！');
            console.log('🎯 遊戲引擎狀態:', {
                dataReady: window.gameEngine.dataReady,
                hasGameData: !!window.gameEngine.gameData,
                skillsCount: window.gameEngine.gameData.skills?.length || 0
            });

            // 確保gameAPI正確初始化
            if (window.gameAPI && window.gameAPI.init) {
                console.log('🔧 初始化 gameAPI...');
                window.gameAPI.init();
            }

            return true;

        } catch (error) {
            console.error('❌ 遊戲初始化失敗:', error);
            return false;
        }
    }

    // 監控遊戲狀態變化
    function monitorGameState() {
        let lastStatus = null;

        setInterval(() => {
            if (window.gameEngine && window.gameEngine.gameState) {
                const currentStatus = window.gameEngine.gameState.status;
                if (currentStatus !== lastStatus) {
                    console.log(`🔄 遊戲狀態變化: ${lastStatus} → ${currentStatus}`);
                    lastStatus = currentStatus;

                    // 如果進入遊戲主階段，確保UI正確更新
                    if (currentStatus === 'playing') {
                        console.log('🎮 遊戲進入主階段，強制更新UI...');
                        setTimeout(() => {
                            if (window.gameAPI && window.gameAPI.refreshUI) {
                                window.gameAPI.refreshUI();
                            }
                        }, 500);
                    }
                }
            }
        }, 1000);
    }

    // 添加調試工具到 window
    window.gameDebug = {
        forceShowGame: function() {
            console.log('🔧 強制顯示遊戲畫面...');
            if (window.uiManager) {
                window.uiManager.switchScreen('gameScreen');
                if (window.gameAPI) {
                    window.gameAPI.refreshUI();
                }
            }
        },

        simulateGameStart: function() {
            console.log('🔧 模擬遊戲開始...');
            if (!window.gameEngine.gameState) {
                window.gameEngine.gameState = window.gameEngine.createInitialGameState();
            }
            window.gameEngine.gameState.status = 'playing';
            this.forceShowGame();
        },

        checkUI: function() {
            console.log('🔍 UI狀態檢查:');
            console.log('- gameEngine存在:', !!window.gameEngine);
            console.log('- gameState存在:', !!(window.gameEngine && window.gameEngine.gameState));
            console.log('- uiManager存在:', !!window.uiManager);
            console.log('- gameAPI存在:', !!window.gameAPI);
            console.log('- 當前螢幕:', window.uiManager?.currentScreen);

            if (window.gameEngine && window.gameEngine.gameState) {
                console.log('- 玩家狀態:', window.gameEngine.gameState.player);
            }
        }
    };

    // 頁面載入時初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeGame().then(success => {
                if (success) {
                    monitorGameState();
                }
            });
        });
    } else {
        initializeGame().then(success => {
            if (success) {
                monitorGameState();
            }
        });
    }

})();