// 回合執行調試腳本 - 添加到現有遊戲中進行實時診斷
// Debug script to inject into the running game for real-time diagnosis

(function() {
    'use strict';

    // 保存原始方法
    const originalSetTimeout = window.setTimeout;
    const originalClearTimeout = window.clearTimeout;

    // 創建調試日誌
    const debugLog = [];
    let timeoutCounter = 0;
    let activeTimeouts = new Map();

    // 包裝setTimeout以追蹤調用
    window.setTimeout = function(callback, delay) {
        timeoutCounter++;
        const timeoutId = timeoutCounter;

        const logEntry = {
            id: timeoutId,
            delay: delay,
            timestamp: Date.now(),
            stackTrace: new Error().stack,
            executed: false
        };

        debugLog.push(`⏰ setTimeout #${timeoutId} scheduled with delay ${delay}ms`);

        // 包裝回調以追蹤執行
        const wrappedCallback = function() {
            logEntry.executed = true;
            debugLog.push(`✅ setTimeout #${timeoutId} executed`);
            activeTimeouts.delete(realTimeoutId);

            try {
                return callback.apply(this, arguments);
            } catch (error) {
                debugLog.push(`❌ setTimeout #${timeoutId} callback error: ${error.message}`);
                throw error;
            }
        };

        const realTimeoutId = originalSetTimeout(wrappedCallback, delay);
        activeTimeouts.set(realTimeoutId, logEntry);

        return realTimeoutId;
    };

    // 包裝clearTimeout以追蹤取消
    window.clearTimeout = function(timeoutId) {
        if (activeTimeouts.has(timeoutId)) {
            const logEntry = activeTimeouts.get(timeoutId);
            debugLog.push(`🚫 setTimeout #${logEntry.id} cancelled`);
            activeTimeouts.delete(timeoutId);
        }
        return originalClearTimeout(timeoutId);
    };

    // 如果遊戲引擎存在，包裝關鍵方法
    if (window.gameEngine && window.gameEngine.turnManager) {
        const turnManager = window.gameEngine.turnManager;
        const originalExecuteGameTurn = turnManager.executeGameTurn;

        turnManager.executeGameTurn = async function() {
            debugLog.push('🚀 executeGameTurn START');
            debugLog.push(`   Game running: ${this.gameEngine.isRunning}`);
            debugLog.push(`   Game status: ${this.gameEngine.gameState.status}`);
            debugLog.push(`   Current turn: ${this.gameEngine.gameState.currentTurn}`);

            try {
                const result = await originalExecuteGameTurn.call(this);
                debugLog.push('✅ executeGameTurn completed normally');
                return result;
            } catch (error) {
                debugLog.push(`❌ executeGameTurn error: ${error.message}`);
                debugLog.push(`   Stack: ${error.stack}`);
                throw error;
            }
        };

        // 包裝維護成本方法
        const originalProcessMaintenance = turnManager.processMaintenanceCostsWithMessages;
        turnManager.processMaintenanceCostsWithMessages = async function() {
            debugLog.push('💰 processMaintenanceCostsWithMessages START');
            debugLog.push(`   Player gold: ${this.gameEngine.gameState.player.gold}`);
            debugLog.push(`   Player cities: ${this.gameEngine.gameState.player.citiesControlled}`);

            try {
                const result = await originalProcessMaintenance.call(this);
                debugLog.push(`✅ processMaintenanceCostsWithMessages completed, returned ${result.length} messages`);
                debugLog.push(`   New gold: ${this.gameEngine.gameState.player.gold}`);
                return result;
            } catch (error) {
                debugLog.push(`❌ processMaintenanceCostsWithMessages error: ${error.message}`);
                throw error;
            }
        };

        // 包裝遊戲結束檢查
        const originalCheckGameEnd = turnManager.checkGameEnd;
        turnManager.checkGameEnd = function() {
            debugLog.push('🏁 checkGameEnd START');
            debugLog.push(`   Player troops: ${this.gameEngine.gameState.player.troops}`);
            debugLog.push(`   Player cities: ${this.gameEngine.gameState.player.citiesControlled}`);

            const result = originalCheckGameEnd.call(this);
            debugLog.push(`✅ checkGameEnd result: ${result}`);

            if (result) {
                debugLog.push('🛑 GAME ENDED - No next turn scheduled');
            }

            return result;
        };
    }

    // 全局調試函數
    window.getDebugLog = function() {
        return debugLog.slice(); // 返回副本
    };

    window.printDebugLog = function() {
        console.log('=== 回合執行調試日誌 ===');
        debugLog.forEach((entry, index) => {
            console.log(`${index + 1}. ${entry}`);
        });

        console.log('\n=== 活躍的setTimeout ===');
        if (activeTimeouts.size === 0) {
            console.log('沒有活躍的setTimeout');
        } else {
            activeTimeouts.forEach((logEntry, timeoutId) => {
                console.log(`Timeout ID: ${timeoutId}, 延遲: ${logEntry.delay}ms, 已執行: ${logEntry.executed}`);
            });
        }
    };

    window.clearDebugLog = function() {
        debugLog.length = 0;
        console.log('調試日誌已清除');
    };

    window.forceNextTurn = function() {
        if (window.gameEngine && window.gameEngine.turnManager) {
            debugLog.push('🔧 FORCED next turn execution');
            window.gameEngine.turnManager.executeGameTurn();
        }
    };

    // 監控遊戲狀態變化
    if (window.gameEngine) {
        let lastTurn = window.gameEngine.gameState.currentTurn;
        let lastGold = window.gameEngine.gameState.player.gold;

        const monitorInterval = setInterval(() => {
            const currentTurn = window.gameEngine.gameState.currentTurn;
            const currentGold = window.gameEngine.gameState.player.gold;

            if (currentTurn !== lastTurn) {
                debugLog.push(`📈 Turn changed: ${lastTurn} → ${currentTurn}`);
                lastTurn = currentTurn;
            }

            if (currentGold !== lastGold) {
                debugLog.push(`💰 Gold changed: ${lastGold} → ${currentGold}`);
                lastGold = currentGold;
            }
        }, 1000);

        // 清理函數
        window.stopDebugMonitoring = function() {
            clearInterval(monitorInterval);
            console.log('停止調試監控');
        };
    }

    console.log('🔍 回合執行調試器已啟動');
    console.log('使用方法:');
    console.log('  printDebugLog() - 顯示調試日誌');
    console.log('  clearDebugLog() - 清除調試日誌');
    console.log('  forceNextTurn() - 強制執行下一回合');
    console.log('  stopDebugMonitoring() - 停止監控');

})();