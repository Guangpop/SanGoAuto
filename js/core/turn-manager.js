// 三國天命 - 回合管理器
// Turn-based game loop and resource management

class TurnManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.turnInterval = 3000; // 3秒一輪
        this.gameLoop = null;
    }

    /**
     * 開始主遊戲循環
     */
    startMainGameLoop() {
        gameLogger.game('遊戲', '🚀 進入主遊戲階段');
        this.gameEngine.isRunning = true;

        // 隨機選擇起始城池 - 增加遊戲變化性
        const possibleStartCities = ['jiangxia', 'xuchang', 'chengdu', 'jianye', 'luoyang'];
        const randomStartId = GameHelpers.randomChoice(possibleStartCities);
        let startCity = this.gameEngine.gameData.cities.find(c => c.id === randomStartId);

        // 備選方案
        if (!startCity) {
            startCity = this.gameEngine.gameData.cities.find(c => c.id === 'jiangxia');
        }

        if (startCity) {
            startCity.faction = 'player';
            startCity.garrison = [];
            this.gameEngine.gameState.cities.set(startCity.id, startCity);
            gameLogger.game('遊戲', `🏰 起始城池：【${startCity.name}】`);
        }

        // 根據起始城池調整初始資源
        this.randomizeStartingConditions(startCity);

        this.executeGameTurn();
    }

    /**
     * 隨機化起始條件
     */
    randomizeStartingConditions(startCity) {
        // 根據起始城池的特殊獎勵調整資源
        if (startCity && startCity.specialBonus) {
            switch (startCity.specialBonus) {
                case 'politics':
                    this.gameEngine.gameState.player.gold += GameHelpers.randomInt(100, 300);
                    gameLogger.game('起始獎勵', '政治中心獎勵：額外金錢');
                    break;
                case 'recruitment':
                    this.gameEngine.gameState.player.troops += GameHelpers.randomInt(100, 200);
                    gameLogger.game('起始獎勵', '募兵要地獎勵：額外兵力');
                    break;
                case 'trade':
                    this.gameEngine.gameState.player.gold += GameHelpers.randomInt(150, 250);
                    gameLogger.game('起始獎勵', '商貿繁榮獎勵：額外金錢');
                    break;
                case 'defense':
                    this.gameEngine.gameState.player.attributes.leadership += GameHelpers.randomInt(3, 8);
                    gameLogger.game('起始獎勵', '戰略要地獎勵：統治力提升');
                    break;
            }
        }

        // 隨機起始事件機率
        if (GameHelpers.checkProbability(30)) {
            this.gameEngine.eventSystem.triggerRandomStartingEvent();
        }

        // 季節性資源調整
        const season = GameHelpers.randomChoice(['spring', 'summer', 'autumn', 'winter']);
        this.applySeasonalEffects(season);
    }

    /**
     * 應用季節效果
     */
    applySeasonalEffects(season) {
        this.gameEngine.gameState.currentSeason = season;

        switch (season) {
            case 'spring':
                this.gameEngine.gameState.player.troops += GameHelpers.randomInt(20, 80);
                gameLogger.game('季節效果', '🌸 春季：萬物復甦，招兵容易');
                break;
            case 'summer':
                this.gameEngine.gameState.player.gold += GameHelpers.randomInt(50, 150);
                gameLogger.game('季節效果', '☀️ 夏季：農作豐收，稅收增加');
                break;
            case 'autumn':
                this.gameEngine.gameState.player.attributes.politics += GameHelpers.randomInt(2, 6);
                gameLogger.game('季節效果', '🍂 秋季：思考時節，政治力提升');
                break;
            case 'winter':
                this.gameEngine.gameState.player.attributes.strength += GameHelpers.randomInt(2, 6);
                gameLogger.game('季節效果', '❄️ 冬季：練兵時節，武力提升');
                break;
        }
    }

    /**
     * 執行一輪遊戲
     */
    async executeGameTurn() {
        if (!this.gameEngine.isRunning || this.gameEngine.gameState.status !== 'playing') return;

        this.gameEngine.gameState.currentTurn++;

        // 收集回合內所有訊息，稍後分批顯示
        const turnMessages = [];

        turnMessages.push({
            category: '回合',
            message: `--- 第 ${this.gameEngine.gameState.currentTurn} 回合開始 ---`
        });

        try {
            // 1. 資源產出階段
            const resourceMessages = await this.processResourceProductionWithMessages();
            turnMessages.push(...resourceMessages);

            // 2. 隨機事件階段
            const eventMessages = await this.gameEngine.eventSystem.processRandomEventsWithMessages();
            turnMessages.push(...eventMessages);

            // 3. 戰鬥階段
            const battleMessages = await this.gameEngine.battleSystem.processBattleWithMessages();
            turnMessages.push(...battleMessages);

            // 4. 收編階段
            const recruitmentMessages = await this.gameEngine.battleSystem.processRecruitmentWithMessages();
            turnMessages.push(...recruitmentMessages);

            // 5. 升級階段
            const levelUpMessages = await this.processLevelUpWithMessages();
            turnMessages.push(...levelUpMessages);

            // 6. 維護成本階段
            const maintenanceMessages = await this.processMaintenanceCostsWithMessages();
            turnMessages.push(...maintenanceMessages);

            // 分批延遲顯示所有訊息
            if (turnMessages.length > 0) {
                gameLogger.delayedLogBatch(turnMessages, 200, 2000);
            }

            // 檢查遊戲結束條件
            if (this.checkGameEnd()) {
                return;
            }

        } catch (error) {
            gameLogger.error('遊戲', '回合處理出錯', error);
        }

        // 隨機調整回合間隔 - 增加節奏變化
        let actualInterval = this.turnInterval;

        // 根據天命值和當前狀況調整間隔
        const destiny = this.gameEngine.gameState.player.attributes.destiny || 0;
        if (destiny >= 25) {
            actualInterval *= GameHelpers.randomFloat(0.8, 1.2); // 高天命時間更不規律
        }

        // 戰鬥時加快節奏
        if (this.gameEngine.gameState.player.battlesWon > this.gameEngine.gameState.player.battlesLost + 2) {
            actualInterval *= 0.9; // 連勝時加快
        }

        // 每10回合有機會觸發"時間流速異常"
        if (this.gameEngine.gameState.currentTurn % 10 === 0 && GameHelpers.checkProbability(25)) {
            const timeEffect = GameHelpers.randomChoice(['accelerate', 'decelerate']);
            if (timeEffect === 'accelerate') {
                actualInterval *= 0.5;
                gameLogger.game('時間異象', '⚡ 時光加速，回合間隔縮短！');
            } else {
                actualInterval *= 1.5;
                gameLogger.game('時間異象', '🐌 時光凝滯，回合間隔延長');
            }
        }

        // 安排下一回合
        this.gameLoop = setTimeout(() => {
            this.executeGameTurn();
        }, actualInterval / this.gameEngine.gameState.settings.gameSpeed);
    }

    /**
     * 處理資源產出階段（返回訊息版本）
     */
    async processResourceProductionWithMessages() {
        const messages = [];
        const playerCities = Array.from(this.gameEngine.gameState.cities.values())
            .filter(city => city.faction === 'player');

        let totalGoldProduction = 0;
        let totalTroopProduction = 0;

        // 計算總產出
        playerCities.forEach(city => {
            // 金錢產出受政治能力影響
            const politicsBonus = this.gameEngine.gameState.player.attributes.politics / 100;
            const goldProduction = Math.floor(city.goldProduction * (1 + politicsBonus));
            totalGoldProduction += goldProduction;

            // 兵力產出
            totalTroopProduction += city.troopProduction;
        });

        // 更新資源
        this.gameEngine.gameState.player.gold += totalGoldProduction;
        const newTroops = Math.min(
            this.gameEngine.gameState.player.troops + totalTroopProduction,
            this.gameEngine.gameState.player.maxTroops
        );
        const troopsGained = newTroops - this.gameEngine.gameState.player.troops;
        this.gameEngine.gameState.player.troops = newTroops;

        // 更新兵力上限（基於統治能力）
        this.updateTroopLimits();

        if (totalGoldProduction > 0 || troopsGained > 0) {
            messages.push({
                category: '資源產出',
                message: `城池產出：金錢+${totalGoldProduction}，兵力+${troopsGained}`
            });
        }

        return messages;
    }

    /**
     * 更新兵力上限
     */
    updateTroopLimits() {
        // 玩家兵力上限基於統治能力和城池數量
        const baseLimit = 500;
        const leadershipBonus = this.gameEngine.gameState.player.attributes.leadership * 10;
        const cityBonus = this.gameEngine.gameState.player.citiesControlled * 200;

        this.gameEngine.gameState.player.maxTroops = baseLimit + leadershipBonus + cityBonus;

        // 更新同伴將領兵力上限
        this.gameEngine.gameState.availableGenerals
            .filter(general => general.status === 'ally')
            .forEach(general => {
                general.maxTroops = Math.floor(general.attributes.leadership * 20);
            });
    }

    /**
     * 處理升級階段（返回訊息版本）
     */
    async processLevelUpWithMessages() {
        const messages = [];

        if (this.gameEngine.gameState.player.battlesWon > 0 &&
            this.gameEngine.gameState.player.battlesWon % 2 === 0 && // 每2勝升1級
            this.gameEngine.gameState.player.level < 10) {

            this.gameEngine.gameState.player.level++;

            // 隨機屬性提升
            const attributeGains = {};
            const totalGain = GameHelpers.randomInt(3, 8);
            const attributes = ['strength', 'intelligence', 'leadership', 'politics', 'charisma'];

            for (let i = 0; i < totalGain; i++) {
                const attr = GameHelpers.randomChoice(attributes);
                attributeGains[attr] = (attributeGains[attr] || 0) + 1;
                this.gameEngine.gameState.player.attributes[attr] =
                    GameHelpers.clamp(this.gameEngine.gameState.player.attributes[attr] + 1, 0, 100);
            }

            const gainStr = Object.entries(attributeGains)
                .filter(([_, value]) => value > 0)
                .map(([key, value]) => `${this.getAttributeName(key)}+${value}`)
                .join(', ');

            messages.push({
                category: '升級',
                message: `升級至Lv.${this.gameEngine.gameState.player.level}，${gainStr}`
            });
        }

        return messages;
    }

    /**
     * 處理維護成本階段（返回訊息版本）
     */
    async processMaintenanceCostsWithMessages() {
        const messages = [];

        // 計算城池維護成本
        const maintenanceCost = this.gameEngine.gameState.player.citiesControlled * 20;
        this.gameEngine.gameState.player.maintenanceCost = maintenanceCost;

        if (this.gameEngine.gameState.player.gold >= maintenanceCost) {
            this.gameEngine.gameState.player.gold -= maintenanceCost;
            if (maintenanceCost > 0) {
                messages.push({
                    category: '維護成本',
                    message: `支付城池維護費用：${maintenanceCost}金錢`
                });
            }
        } else {
            // 金錢不足時的懲罰
            const shortage = maintenanceCost - this.gameEngine.gameState.player.gold;
            this.gameEngine.gameState.player.gold = 0;
            this.gameEngine.gameState.player.troops = Math.max(0, this.gameEngine.gameState.player.troops - shortage * 2);

            messages.push({
                category: '維護成本',
                message: `💰 金錢不足！損失${shortage * 2}兵力代替維護費用`
            });
        }

        return messages;
    }

    /**
     * 檢查遊戲結束條件
     */
    checkGameEnd() {
        // 勝利條件：控制所有城池
        const totalCities = this.gameEngine.gameData.cities.length;
        if (this.gameEngine.gameState.player.citiesControlled >= totalCities) {
            this.endGame(true);
            return true;
        }

        // 失敗條件：沒有兵力且沒有城池
        if (this.gameEngine.gameState.player.troops <= 0 && this.gameEngine.gameState.player.citiesControlled <= 0) {
            this.endGame(false);
            return true;
        }

        return false;
    }

    /**
     * 結束遊戲
     */
    endGame(victory) {
        this.gameEngine.isRunning = false;
        this.gameEngine.gameState.status = 'game_over';
        this.gameEngine.gameState.gameEndTime = Date.now();

        if (this.gameLoop) {
            clearTimeout(this.gameLoop);
            this.gameLoop = null;
        }

        const finalStats = {
            level: this.gameEngine.gameState.player.level,
            cities: this.gameEngine.gameState.player.citiesControlled,
            battles: this.gameEngine.gameState.player.battlesWon
        };

        gameLogger.logGameEnd(victory, finalStats);
    }

    /**
     * 暫停/繼續遊戲
     */
    togglePause() {
        if (this.gameEngine.gameState.status === 'playing') {
            this.gameEngine.isRunning = !this.gameEngine.isRunning;
            if (this.gameEngine.isRunning) {
                this.executeGameTurn();
            } else if (this.gameLoop) {
                clearTimeout(this.gameLoop);
                this.gameLoop = null;
            }
        }
    }

    /**
     * 設置遊戲速度
     */
    setGameSpeed(speed) {
        this.gameEngine.gameState.settings.gameSpeed = GameHelpers.clamp(speed, 0.5, 4);
        gameLogger.info('設定', `遊戲速度設為 ${speed}x`);
    }

    /**
     * 獲取屬性名稱
     */
    getAttributeName(key) {
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
}

// 導出類別
window.TurnManager = TurnManager;