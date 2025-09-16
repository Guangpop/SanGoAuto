// 三國天命 - 遊戲日誌系統
// Game logging system for development and debugging

class GameLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 500; // 最大日誌數量
        this.logLevels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            GAME: 4  // 遊戲事件專用級別
        };
        this.currentLevel = this.logLevels.INFO; // 當前日誌級別
        this.enableConsole = true; // 是否輸出到控制台
    }

    /**
     * 設置日誌級別
     * @param {string} level 日誌級別
     */
    setLevel(level) {
        if (this.logLevels.hasOwnProperty(level)) {
            this.currentLevel = this.logLevels[level];
        }
    }

    /**
     * 記錄日誌的核心方法
     * @param {string} level 日誌級別
     * @param {string} category 分類
     * @param {string} message 訊息
     * @param {Object} data 額外數據
     */
    _log(level, category, message, data = null) {
        const levelValue = this.logLevels[level] || 0;
        if (levelValue < this.currentLevel) return;

        const logEntry = {
            timestamp: Date.now(),
            level: level,
            category: category,
            message: message,
            data: data,
            gameTime: this._getGameTime()
        };

        this.logs.push(logEntry);

        // 限制日誌數量
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // 控制台輸出
        if (this.enableConsole) {
            this._consoleLog(logEntry);
        }

        // 觸發日誌事件（用於UI更新）
        this._notifyUI(logEntry);
    }

    /**
     * 獲取遊戲時間（如果遊戲正在運行）
     */
    _getGameTime() {
        if (window.gameEngine && window.gameEngine.gameState) {
            const startTime = window.gameEngine.gameState.gameStartTime;
            if (startTime) {
                return Date.now() - startTime;
            }
        }
        return 0;
    }

    /**
     * 控制台輸出格式化
     * @param {Object} logEntry 日誌項目
     */
    _consoleLog(logEntry) {
        const time = GameHelpers.formatTime(logEntry.timestamp);
        const gameTime = logEntry.gameTime > 0 ?
            `[遊戲時間:${Math.floor(logEntry.gameTime / 1000)}s]` : '';

        const prefix = `[${time}]${gameTime}[${logEntry.level}][${logEntry.category}]`;
        const message = `${prefix} ${logEntry.message}`;

        switch (logEntry.level) {
            case 'ERROR':
                console.error(message, logEntry.data);
                break;
            case 'WARN':
                console.warn(message, logEntry.data);
                break;
            case 'GAME':
                console.log(`🎮 ${message}`, logEntry.data);
                break;
            case 'INFO':
                console.info(message, logEntry.data);
                break;
            default:
                console.log(message, logEntry.data);
        }
    }

    /**
     * 通知UI更新（如果有UI管理器）
     * @param {Object} logEntry 日誌項目
     */
    _notifyUI(logEntry) {
        if (window.uiManager && typeof window.uiManager.addLogMessage === 'function') {
            window.uiManager.addLogMessage(logEntry);
        }
    }

    /**
     * 延遲顯示日誌訊息
     * @param {string} level 日誌級別
     * @param {string} category 分類
     * @param {string} message 訊息
     * @param {Object} data 額外數據
     * @param {number} delay 延遲時間（毫秒）
     */
    delayedLog(level, category, message, data = null, delay = 0) {
        if (delay <= 0) {
            this._log(level, category, message, data);
        } else {
            setTimeout(() => {
                this._log(level, category, message, data);
            }, delay);
        }
    }

    /**
     * 批量延遲顯示訊息
     * @param {Array} messages 訊息陣列，每項包含 {level, category, message, data?, delay?}
     * @param {number} baseDelay 基礎延遲時間
     * @param {number} interval 訊息間隔時間
     */
    delayedLogBatch(messages, baseDelay = 0, interval = 2000) {
        messages.forEach((msg, index) => {
            const totalDelay = baseDelay + (index * interval);
            this.delayedLog(
                msg.level || 'GAME',
                msg.category || '遊戲',
                msg.message,
                msg.data || null,
                totalDelay
            );
        });
    }

    // === 公共日誌方法 ===

    debug(category, message, data) {
        this._log('DEBUG', category, message, data);
    }

    info(category, message, data) {
        this._log('INFO', category, message, data);
    }

    warn(category, message, data) {
        this._log('WARN', category, message, data);
    }

    error(category, message, data) {
        this._log('ERROR', category, message, data);
    }

    game(category, message, data) {
        this._log('GAME', category, message, data);
    }

    // === 遊戲專用日誌方法 ===

    /**
     * 記錄技能選擇
     */
    logSkillSelection(skillName, starCost, remainingStars) {
        this.game('技能選擇', `選擇技能【${skillName}】，消耗${starCost}星，剩餘${remainingStars}星`);
    }

    /**
     * 記錄屬性分配
     */
    logAttributeAllocation(attributes) {
        const attrStr = Object.entries(attributes)
            .map(([key, value]) => `${this._getAttributeName(key)}:${value}`)
            .join(', ');
        this.game('屬性分配', `最終屬性 - ${attrStr}`);
    }

    /**
     * 記錄戰鬥結果
     */
    logBattle(playerPower, enemyPower, cityName, result, casualties = 0) {
        const resultText = result ? '勝利' : '失敗';
        const casualtyText = casualties > 0 ? `，損失${casualties}兵力` : '';
        this.game('戰鬥', `攻打【${cityName}】${resultText}（我方戰力:${playerPower} vs 敵方戰力:${enemyPower}）${casualtyText}`);
    }

    /**
     * 記錄將領招降
     */
    logRecruitment(generalName, success, successRate) {
        const result = success ? '成功' : '失敗';
        this.game('招降', `招降【${generalName}】${result}（成功率:${successRate}%）`);
    }

    /**
     * 記錄等級提升
     */
    logLevelUp(newLevel, attributeGains) {
        const gainStr = Object.entries(attributeGains)
            .filter(([_, value]) => value > 0)
            .map(([key, value]) => `${this._getAttributeName(key)}+${value}`)
            .join(', ');
        this.game('升級', `升級至Lv.${newLevel}，${gainStr}`);
    }

    /**
     * 記錄隨機事件
     */
    logEvent(eventName, eventType, outcome, effects = []) {
        const typeIcon = this._getEventTypeIcon(eventType);
        const effectStr = effects.length > 0 ?
            `，效果：${effects.map(e => e.description).join('、')}` : '';
        this.game('隨機事件', `${typeIcon}【${eventName}】- ${outcome}${effectStr}`);
    }

    /**
     * 記錄資源變化
     */
    logResourceChange(resourceType, amount, reason = '') {
        const sign = amount >= 0 ? '+' : '';
        const reasonText = reason ? `（${reason}）` : '';
        this.game('資源變化', `${this._getResourceName(resourceType)}${sign}${amount}${reasonText}`);
    }

    /**
     * 記錄裝備獲得
     */
    logEquipmentGain(equipmentName, rarity) {
        const rarityIcon = this._getRarityIcon(rarity);
        this.game('裝備獲得', `${rarityIcon}獲得【${equipmentName}】`);
    }

    /**
     * 記錄遊戲結束
     */
    logGameEnd(victory, finalStats) {
        const result = victory ? '🎉統一天下！' : '💀英雄末路';
        this.game('遊戲結束', `${result} - 等級:${finalStats.level}, 城池:${finalStats.cities}, 勝仗:${finalStats.battles}`);
    }

    // === 輔助方法 ===

    _getAttributeName(key) {
        const names = {
            strength: '武力',
            intelligence: '智力',
            leadership: '統治',
            politics: '政治',
            charisma: '魅力',
            destiny: '天命'
        };
        return names[key] || key;
    }

    _getResourceName(type) {
        const names = {
            gold: '金錢',
            troops: '兵力',
            cities: '城池'
        };
        return names[type] || type;
    }

    _getEventTypeIcon(type) {
        const icons = {
            positive: '✨',
            negative: '⚡',
            neutral: '📜',
            choice: '🤔'
        };
        return icons[type] || '📝';
    }

    _getRarityIcon(rarity) {
        const icons = {
            common: '⚪',
            rare: '🔵',
            legendary: '🟡'
        };
        return icons[rarity] || '';
    }

    // === 日誌管理方法 ===

    /**
     * 獲取所有日誌
     */
    getAllLogs() {
        return [...this.logs];
    }

    /**
     * 根據分類獲取日誌
     */
    getLogsByCategory(category) {
        return this.logs.filter(log => log.category === category);
    }

    /**
     * 獲取遊戲事件日誌
     */
    getGameLogs() {
        return this.logs.filter(log => log.level === 'GAME');
    }

    /**
     * 清除所有日誌
     */
    clearLogs() {
        this.logs = [];
        if (this.enableConsole) {
            console.clear();
        }
    }

    /**
     * 導出日誌到文字格式
     */
    exportLogs() {
        return this.logs.map(log => {
            const time = GameHelpers.formatTime(log.timestamp);
            const data = log.data ? ` | ${JSON.stringify(log.data)}` : '';
            return `[${time}][${log.level}][${log.category}] ${log.message}${data}`;
        }).join('\n');
    }

    /**
     * 設置控制台輸出開關
     */
    setConsoleOutput(enable) {
        this.enableConsole = enable;
    }
}

// 創建全局日誌實例
window.gameLogger = new GameLogger();

// 導出類別
window.GameLogger = GameLogger;