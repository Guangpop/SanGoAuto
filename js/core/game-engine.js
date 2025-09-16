// 三國天命 - 遊戲核心引擎
// Core game engine with skill selection and main game loop

class GameEngine {
    constructor() {
        this.gameData = {
            skills: [],
            cities: [],
            generals: [],
            equipment: [],
            events: []
        };

        this.gameState = null;
        this.isRunning = false;
        this.gameLoop = null;
        this.turnInterval = 3000; // 3秒一輪

        // 初始化遊戲數據
        this.initializeGameData();
    }

    /**
     * 載入遊戲數據
     */
    async initializeGameData() {
        try {
            gameLogger.info('系統', '正在載入遊戲資源...');

            // 載入所有數據檔案
            const [skills, cities, generals, equipment, events] = await Promise.all([
                this.loadJSON('js/data/skills.json'),
                this.loadJSON('js/data/cities.json'),
                this.loadJSON('js/data/generals.json'),
                this.loadJSON('js/data/equipment.json'),
                this.loadJSON('js/data/events.json')
            ]);

            this.gameData = { skills, cities, generals, equipment, events };
            gameLogger.info('系統', '遊戲資源載入完成');

        } catch (error) {
            gameLogger.error('系統', '遊戲資源載入失敗', error);
        }
    }

    /**
     * 載入JSON檔案
     */
    async loadJSON(path) {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`無法載入 ${path}: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * 開始新遊戲
     */
    startNewGame() {
        gameLogger.info('遊戲', '開始新遊戲');

        // 初始化遊戲狀態
        this.gameState = this.createInitialGameState();

        // 開始技能選擇階段
        this.startSkillSelection();

        return this.gameState;
    }

    /**
     * 創建初始遊戲狀態
     */
    createInitialGameState() {
        return {
            player: {
                name: '玩家',
                level: 1,
                attributes: {
                    strength: 10,
                    intelligence: 10,
                    leadership: 10,
                    politics: 10,
                    charisma: 10,
                    destiny: 0
                },
                skills: [],
                equipment: {},
                gold: 200,
                troops: 800,
                maxTroops: 1000, // 基於統治能力的兵力上限
                citiesControlled: 1,
                battlesWon: 0,
                battlesLost: 0,
                generalsRecruited: 0,
                maintenanceCost: 0 // 城池維護成本
            },
            cities: new Map(this.gameData.cities.map(city => [city.id, {...city}])),
            availableGenerals: [...this.gameData.generals],
            currentTurn: 0,
            gameStartTime: Date.now(),
            settings: {
                gameSpeed: 1,
                language: 'zh',
                soundEnabled: true,
                musicEnabled: true,
                autoSaveInterval: 60
            },
            randomSeed: Date.now(),
            eventHistory: [],
            status: 'skill_selection',
            turnsWithoutEvents: 0,
            currentSeason: 'spring',
            weatherEffects: null
        };
    }

    /**
     * 開始技能選擇階段
     */
    startSkillSelection() {
        this.skillSelection = {
            availableSkills: [],
            selectedSkills: [],
            remainingStars: 10,
            round: 1,
            maxRounds: 3
        };

        gameLogger.game('技能選擇', '🌟 開始天命技能選擇，共3輪，每輪從3個技能中選擇1個');
        this.generateSkillChoices();
    }

    /**
     * 生成技能選擇項
     */
    generateSkillChoices() {
        // 動態技能池 - 根據輪次調整技能稀有度
        let skillPool = [...this.gameData.skills];

        if (this.skillSelection.round === 1) {
            // 第一輪：更多低星技能，幫助新手起步
            skillPool = skillPool.filter(skill => skill.starCost <= 2);
        } else if (this.skillSelection.round === 2) {
            // 第二輪：平衡的技能選擇
            const lowCostChance = GameHelpers.randomPercent();
            if (lowCostChance < 60) {
                skillPool = skillPool.filter(skill => skill.starCost <= 2);
            }
        } else {
            // 第三輪：如果剩餘星星多，提供更多高星技能
            if (this.skillSelection.remainingStars >= 3) {
                const highCostPool = skillPool.filter(skill => skill.starCost >= 2);
                if (highCostPool.length >= 3) {
                    skillPool = highCostPool;
                }
            }
        }

        // 避免重複技能
        const unavailableSkills = this.skillSelection.selectedSkills.map(s => s.id);
        skillPool = skillPool.filter(skill => !unavailableSkills.includes(skill.id));

        // 確保有足夠的技能可選
        if (skillPool.length < 3) {
            skillPool = this.gameData.skills.filter(skill => !unavailableSkills.includes(skill.id));
        }

        // 從技能庫中隨機選擇3個技能
        this.skillSelection.availableSkills = GameHelpers.randomChoices(skillPool, 3);

        gameLogger.game('技能選擇',
            `第${this.skillSelection.round}輪技能選擇：`,
            this.skillSelection.availableSkills.map(s => `${s.name}(${s.starCost}星)`)
        );
    }

    /**
     * 選擇技能
     */
    selectSkill(skillId) {
        const skill = this.skillSelection.availableSkills.find(s => s.id === skillId);
        if (!skill) {
            gameLogger.warn('技能選擇', '技能不存在', skillId);
            return false;
        }

        if (skill.starCost > this.skillSelection.remainingStars) {
            gameLogger.warn('技能選擇', '星星不足', {
                required: skill.starCost,
                remaining: this.skillSelection.remainingStars
            });
            return false;
        }

        // 消耗星星並記錄技能
        this.skillSelection.remainingStars -= skill.starCost;
        this.skillSelection.selectedSkills.push(skill);

        gameLogger.logSkillSelection(skill.name, skill.starCost, this.skillSelection.remainingStars);

        // 應用技能效果
        this.applySkillEffects(skill);

        this.nextSkillRound();
        return true;
    }

    /**
     * 跳過當前技能輪
     */
    skipSkillRound() {
        gameLogger.game('技能選擇', `跳過第${this.skillSelection.round}輪技能選擇`);
        this.nextSkillRound();
    }

    /**
     * 進入下一輪技能選擇
     */
    nextSkillRound() {
        this.skillSelection.round++;

        if (this.skillSelection.round > this.skillSelection.maxRounds) {
            this.finishSkillSelection();
        } else {
            this.generateSkillChoices();
        }
    }

    /**
     * 完成技能選擇階段
     */
    finishSkillSelection() {
        // 剩餘星星轉換為屬性點
        this.convertStarsToAttributes();

        // 將選中的技能添加到玩家
        this.gameState.player.skills = [...this.skillSelection.selectedSkills];

        gameLogger.logAttributeAllocation(this.gameState.player.attributes);

        // 開始主遊戲循環
        this.gameState.status = 'playing';
        this.startMainGameLoop();
    }

    /**
     * 將剩餘星星轉換為屬性點
     */
    convertStarsToAttributes() {
        const totalPoints = this.skillSelection.remainingStars * 10;
        const attributes = ['strength', 'intelligence', 'leadership', 'politics', 'charisma'];

        gameLogger.game('屬性分配', `剩餘${this.skillSelection.remainingStars}星轉換為${totalPoints}屬性點`);

        // 更智能的屬性分配 - 增加隨機性但避免過度偏科
        const attributeWeights = {};
        attributes.forEach(attr => {
            attributeWeights[attr] = GameHelpers.randomInt(1, 4); // 隨機權重
        });

        // 根據權重分配點數
        for (let i = 0; i < totalPoints; i++) {
            const weightedChoices = [];
            attributes.forEach(attr => {
                for (let j = 0; j < attributeWeights[attr]; j++) {
                    weightedChoices.push(attr);
                }
            });

            const attr = GameHelpers.randomChoice(weightedChoices);
            this.gameState.player.attributes[attr]++;

            // 每分配10點後調整權重，增加變化
            if (i % 10 === 9) {
                const randomAttr = GameHelpers.randomChoice(attributes);
                attributeWeights[randomAttr] = GameHelpers.randomInt(1, 5);
            }
        }

        // 額外隨機獎勵 - 基於剩餘星星數
        if (this.skillSelection.remainingStars >= 5) {
            const bonusAttr = GameHelpers.randomChoice(attributes);
            this.gameState.player.attributes[bonusAttr] += GameHelpers.randomInt(2, 5);
            gameLogger.game('屬性分配', `🎁 高星星剩餘獎勵：${bonusAttr}+${this.gameState.player.attributes[bonusAttr]}`);
        }
    }

    /**
     * 應用技能效果
     */
    applySkillEffects(skill) {
        skill.effects.forEach(effect => {
            switch (effect.type) {
                case 'attribute_bonus':
                    if (effect.target === 'all_attributes') {
                        Object.keys(this.gameState.player.attributes).forEach(attr => {
                            if (attr !== 'destiny') {
                                this.gameState.player.attributes[attr] += effect.value;
                            }
                        });
                    } else {
                        this.gameState.player.attributes[effect.target] += effect.value;
                    }
                    break;

                case 'special':
                    // 特殊效果會在相應時機觸發
                    break;
            }
        });
    }

    /**
     * 開始主遊戲循環
     */
    startMainGameLoop() {
        gameLogger.game('遊戲', '🚀 進入主遊戲階段');
        this.isRunning = true;

        // 隨機選擇起始城池 - 增加遊戲變化性
        const possibleStartCities = ['jiangxia', 'xuchang', 'chengdu', 'jianye', 'luoyang'];
        const randomStartId = GameHelpers.randomChoice(possibleStartCities);
        let startCity = this.gameData.cities.find(c => c.id === randomStartId);

        // 備選方案
        if (!startCity) {
            startCity = this.gameData.cities.find(c => c.id === 'jiangxia');
        }

        if (startCity) {
            startCity.faction = 'player';
            startCity.garrison = [];
            this.gameState.cities.set(startCity.id, startCity);
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
                    this.gameState.player.gold += GameHelpers.randomInt(100, 300);
                    gameLogger.game('起始獎勵', '政治中心獎勵：額外金錢');
                    break;
                case 'recruitment':
                    this.gameState.player.troops += GameHelpers.randomInt(100, 200);
                    gameLogger.game('起始獎勵', '募兵要地獎勵：額外兵力');
                    break;
                case 'trade':
                    this.gameState.player.gold += GameHelpers.randomInt(150, 250);
                    gameLogger.game('起始獎勵', '商貿繁榮獎勵：額外金錢');
                    break;
                case 'defense':
                    this.gameState.player.attributes.leadership += GameHelpers.randomInt(3, 8);
                    gameLogger.game('起始獎勵', '戰略要地獎勵：統治力提升');
                    break;
            }
        }

        // 隨機起始事件機率
        if (GameHelpers.checkProbability(30)) {
            this.triggerRandomStartingEvent();
        }

        // 季節性資源調整
        const season = GameHelpers.randomChoice(['spring', 'summer', 'autumn', 'winter']);
        this.applySeasonalEffects(season);
    }

    /**
     * 觸發隨機起始事件
     */
    triggerRandomStartingEvent() {
        const startingEvents = [
            {
                name: '天降異象',
                effect: () => {
                    this.gameState.player.attributes.destiny += GameHelpers.randomInt(5, 15);
                    gameLogger.game('起始事件', '🌟 天降異象，天命大增！');
                }
            },
            {
                name: '義士來投',
                effect: () => {
                    this.gameState.player.troops += GameHelpers.randomInt(50, 150);
                    gameLogger.game('起始事件', '⚔️ 義士來投，兵力增加！');
                }
            },
            {
                name: '商人贊助',
                effect: () => {
                    this.gameState.player.gold += GameHelpers.randomInt(200, 500);
                    gameLogger.game('起始事件', '💰 商人贊助，財富增加！');
                }
            },
            {
                name: '名師指點',
                effect: () => {
                    const attr = GameHelpers.randomChoice(['intelligence', 'politics', 'charisma']);
                    this.gameState.player.attributes[attr] += GameHelpers.randomInt(5, 10);
                    gameLogger.game('起始事件', `📚 名師指點，${attr}提升！`);
                }
            }
        ];

        const event = GameHelpers.randomChoice(startingEvents);
        event.effect();
    }

    /**
     * 應用季節效果
     */
    applySeasonalEffects(season) {
        this.gameState.currentSeason = season;

        switch (season) {
            case 'spring':
                this.gameState.player.troops += GameHelpers.randomInt(20, 80);
                gameLogger.game('季節效果', '🌸 春季：萬物復甦，招兵容易');
                break;
            case 'summer':
                this.gameState.player.gold += GameHelpers.randomInt(50, 150);
                gameLogger.game('季節效果', '☀️ 夏季：農作豐收，稅收增加');
                break;
            case 'autumn':
                this.gameState.player.attributes.politics += GameHelpers.randomInt(2, 6);
                gameLogger.game('季節效果', '🍂 秋季：思考時節，政治力提升');
                break;
            case 'winter':
                this.gameState.player.attributes.strength += GameHelpers.randomInt(2, 6);
                gameLogger.game('季節效果', '❄️ 冬季：練兵時節，武力提升');
                break;
        }
    }

    /**
     * 執行一輪遊戲
     */
    async executeGameTurn() {
        if (!this.isRunning || this.gameState.status !== 'playing') return;

        this.gameState.currentTurn++;
        gameLogger.game('回合', `--- 第 ${this.gameState.currentTurn} 回合開始 ---`);

        try {
            // 1. 資源產出階段
            await this.processResourceProduction();

            // 2. 隨機事件階段
            await this.processRandomEvents();

            // 3. 戰鬥階段
            await this.processBattle();

            // 4. 收編階段
            await this.processRecruitment();

            // 5. 升級階段
            await this.processLevelUp();

            // 6. 維護成本階段
            await this.processMaintenanceCosts();

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
        const destiny = this.gameState.player.attributes.destiny || 0;
        if (destiny >= 25) {
            actualInterval *= GameHelpers.randomFloat(0.8, 1.2); // 高天命時間更不規律
        }

        // 戰鬥時加快節奏
        if (this.gameState.player.battlesWon > this.gameState.player.battlesLost + 2) {
            actualInterval *= 0.9; // 連勝時加快
        }

        // 每10回合有機會觸發"時間流速異常"
        if (this.gameState.currentTurn % 10 === 0 && GameHelpers.checkProbability(25)) {
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
        }, actualInterval / this.gameState.settings.gameSpeed);
    }

    /**
     * 處理資源產出階段
     */
    async processResourceProduction() {
        const playerCities = Array.from(this.gameState.cities.values())
            .filter(city => city.faction === 'player');

        let totalGoldProduction = 0;
        let totalTroopProduction = 0;

        // 計算總產出
        playerCities.forEach(city => {
            // 金錢產出受政治能力影響
            const politicsBonus = this.gameState.player.attributes.politics / 100;
            const goldProduction = Math.floor(city.goldProduction * (1 + politicsBonus));
            totalGoldProduction += goldProduction;

            // 兵力產出
            totalTroopProduction += city.troopProduction;
        });

        // 更新資源
        this.gameState.player.gold += totalGoldProduction;
        const newTroops = Math.min(
            this.gameState.player.troops + totalTroopProduction,
            this.gameState.player.maxTroops
        );
        const troopsGained = newTroops - this.gameState.player.troops;
        this.gameState.player.troops = newTroops;

        // 更新兵力上限（基於統治能力）
        this.updateTroopLimits();

        if (totalGoldProduction > 0 || troopsGained > 0) {
            gameLogger.game('資源產出',
                `城池產出：金錢+${totalGoldProduction}，兵力+${troopsGained}`);
        }
    }

    /**
     * 更新兵力上限
     */
    updateTroopLimits() {
        // 玩家兵力上限基於統治能力和城池數量
        const baseLimit = 500;
        const leadershipBonus = this.gameState.player.attributes.leadership * 10;
        const cityBonus = this.gameState.player.citiesControlled * 200;

        this.gameState.player.maxTroops = baseLimit + leadershipBonus + cityBonus;

        // 更新同伴將領兵力上限
        this.gameState.availableGenerals
            .filter(general => general.status === 'ally')
            .forEach(general => {
                general.maxTroops = Math.floor(general.attributes.leadership * 20);
            });
    }

    /**
     * 處理維護成本階段
     */
    async processMaintenanceCosts() {
        // 計算城池維護成本
        const maintenanceCost = this.gameState.player.citiesControlled * 20;
        this.gameState.player.maintenanceCost = maintenanceCost;

        if (this.gameState.player.gold >= maintenanceCost) {
            this.gameState.player.gold -= maintenanceCost;
            if (maintenanceCost > 0) {
                gameLogger.game('維護成本', `支付城池維護費用：${maintenanceCost}金錢`);
            }
        } else {
            // 金錢不足時的懲罰
            const shortage = maintenanceCost - this.gameState.player.gold;
            this.gameState.player.gold = 0;
            this.gameState.player.troops = Math.max(0, this.gameState.player.troops - shortage * 2);
            gameLogger.game('維護成本', `💰 金錢不足！損失${shortage * 2}兵力代替維護費用`);
        }
    }

    /**
     * 處理隨機事件
     */
    async processRandomEvents() {
        // 動態調整事件觸發數量 - 增加更多隨機性
        let eventCount;
        const destiny = this.gameState.player.attributes.destiny || 0;
        const level = this.gameState.player.level;

        // 根據天命值和等級調整事件頻率
        if (destiny >= 30) {
            eventCount = GameHelpers.randomInt(1, 3); // 高天命更多事件
        } else if (level >= 5) {
            eventCount = GameHelpers.randomInt(0, 3); // 高等級時事件更頻繁
        } else {
            eventCount = GameHelpers.randomInt(0, 2); // 基礎事件頻率
        }

        // 特殊情況：連續無事件時強制觸發
        if (this.gameState.turnsWithoutEvents >= 3) {
            eventCount = Math.max(eventCount, 1);
            this.gameState.turnsWithoutEvents = 0;
        }

        if (eventCount === 0) {
            this.gameState.turnsWithoutEvents = (this.gameState.turnsWithoutEvents || 0) + 1;
        } else {
            this.gameState.turnsWithoutEvents = 0;
        }

        for (let i = 0; i < eventCount; i++) {
            const event = this.selectRandomEvent();
            if (event) {
                this.executeEvent(event);
            }
        }
    }

    /**
     * 選擇隨機事件
     */
    selectRandomEvent() {
        const validEvents = this.gameData.events.filter(event =>
            this.checkEventRequirements(event)
        );

        if (validEvents.length === 0) return null;

        // 根據機率選擇事件
        const playerDestiny = this.gameState.player.attributes.destiny || 0;

        for (const event of validEvents) {
            const probability = GameHelpers.calculateEventProbability(
                event.baseProbability,
                event.destinyModifier,
                playerDestiny
            );

            if (GameHelpers.checkProbability(probability)) {
                return event;
            }
        }

        return null;
    }

    /**
     * 檢查事件觸發條件
     */
    checkEventRequirements(event) {
        if (!event.requirements) return true;

        return event.requirements.every(req => {
            switch (req.type) {
                case 'level':
                    return this.evaluateCondition(this.gameState.player.level, req.operator, req.value);
                case 'city_count':
                    return this.evaluateCondition(this.gameState.player.citiesControlled, req.operator, req.value);
                case 'attribute':
                    return this.evaluateCondition(this.gameState.player.attributes[req.target], req.operator, req.value);
                default:
                    return true;
            }
        });
    }

    /**
     * 評估條件
     */
    evaluateCondition(value, operator, target) {
        switch (operator) {
            case '>=': return value >= target;
            case '<=': return value <= target;
            case '>': return value > target;
            case '<': return value < target;
            case '==': return value == target;
            case '!=': return value != target;
            default: return true;
        }
    }

    /**
     * 執行事件
     */
    executeEvent(event) {
        let selectedOutcome;

        if (event.isChoice) {
            // 選擇事件 - 這裡簡化為隨機選擇，實際應該由玩家決定
            selectedOutcome = GameHelpers.randomChoice(event.outcomes);
        } else {
            // 機率事件
            const roll = GameHelpers.randomPercent();
            let cumulativeProb = 0;

            for (const outcome of event.outcomes) {
                cumulativeProb += outcome.probability;
                if (roll <= cumulativeProb) {
                    selectedOutcome = outcome;
                    break;
                }
            }
        }

        if (selectedOutcome) {
            gameLogger.logEvent(event.name, event.type, selectedOutcome.name, selectedOutcome.effects);
            this.applyEventEffects(selectedOutcome.effects);

            // 記錄事件歷史
            this.gameState.eventHistory.push({
                eventId: event.id,
                outcomeId: selectedOutcome.id,
                timestamp: Date.now(),
                description: `${event.name} - ${selectedOutcome.name}`
            });
        }
    }

    /**
     * 應用事件效果
     */
    applyEventEffects(effects) {
        effects.forEach(effect => {
            switch (effect.type) {
                case 'attribute_change':
                    const oldValue = this.gameState.player.attributes[effect.target];
                    this.gameState.player.attributes[effect.target] =
                        GameHelpers.clamp(oldValue + effect.value, 0, 100);
                    gameLogger.logResourceChange(effect.target, effect.value, '事件效果');
                    break;

                case 'gain_gold':
                    this.gameState.player.gold += effect.value;
                    if (effect.value !== 0) {
                        gameLogger.logResourceChange('gold', effect.value, '事件效果');
                    }
                    break;

                case 'lose_troops':
                    this.gameState.player.troops = Math.max(0, this.gameState.player.troops - effect.value);
                    gameLogger.logResourceChange('troops', -effect.value, '事件效果');
                    break;

                case 'gain_equipment':
                    // 簡化實現，實際需要根據稀有度選擇裝備
                    const equipment = this.selectRandomEquipment(effect.target);
                    if (equipment) {
                        gameLogger.logEquipmentGain(equipment.name, equipment.rarity);
                    }
                    break;
            }
        });
    }

    /**
     * 選擇隨機裝備
     */
    selectRandomEquipment(targetType) {
        let validEquipment = this.gameData.equipment.filter(equipment =>
            this.canPlayerObtainEquipment(equipment)
        );

        // 根據目標類型過濾
        if (targetType && targetType !== 'random') {
            if (targetType.includes('legendary')) {
                validEquipment = validEquipment.filter(e => e.rarity === 'legendary');
            } else if (targetType.includes('rare')) {
                validEquipment = validEquipment.filter(e => e.rarity === 'rare');
            }
        }

        return GameHelpers.randomChoice(validEquipment);
    }

    /**
     * 檢查玩家是否能獲得指定裝備
     */
    canPlayerObtainEquipment(equipment) {
        if (!equipment.requirements) return true;

        // 檢查城池數量需求
        if (equipment.requirements.minCityCount &&
            this.gameState.player.citiesControlled < equipment.requirements.minCityCount) {
            return false;
        }

        // 檢查是否僅限事件獲得
        if (equipment.requirements.eventOnly) {
            return false; // 在事件中會特別處理
        }

        return true;
    }

    /**
     * 處理戰鬥階段
     */
    async processBattle() {
        // 檢查是否有足夠兵力戰鬥
        if (this.gameState.player.troops < 50) {
            gameLogger.game('戰鬥', '兵力不足，暫停攻城');
            return;
        }

        // 選擇目標城池（僅限相鄰城池）
        const targetCity = this.selectAdjacentBattleTarget();
        if (!targetCity) {
            gameLogger.game('戰鬥', '沒有可攻打的相鄰城池');
            return;
        }

        // 計算戰鬥力（結合屬性、技能、裝備、兵力）
        const playerCombatPower = this.calculatePlayerCombatPower();
        const enemyCombatPower = this.calculateEnemyCombatPower(targetCity);

        // 戰鬥結算
        const battleResult = this.resolveBattleWithTroops(playerCombatPower, enemyCombatPower);

        // 處理戰鬥結果
        this.gameState.player.troops -= battleResult.playerCasualties;

        gameLogger.logBattle(
            playerCombatPower.totalPower,
            enemyCombatPower.totalPower,
            targetCity.name,
            battleResult.victory,
            battleResult.playerCasualties
        );

        if (battleResult.victory) {
            this.gameState.player.battlesWon++;
            this.captureCity(targetCity);

            // 戰勝後有機會俘獲敵將
            this.processCapturedGenerals(targetCity);
        } else {
            this.gameState.player.battlesLost++;
        }
    }

    /**
     * 選擇相鄰的戰鬥目標
     */
    selectAdjacentBattleTarget() {
        const playerCities = Array.from(this.gameState.cities.values())
            .filter(city => city.faction === 'player');

        const adjacentEnemyCities = [];

        playerCities.forEach(playerCity => {
            playerCity.connections.forEach(connectionId => {
                const connectedCity = this.gameState.cities.get(connectionId);
                if (connectedCity && connectedCity.faction !== 'player') {
                    // 避免重複添加同一個城池
                    if (!adjacentEnemyCities.find(city => city.id === connectedCity.id)) {
                        adjacentEnemyCities.push(connectedCity);
                    }
                }
            });
        });

        return GameHelpers.randomChoice(adjacentEnemyCities);
    }

    /**
     * 計算玩家戰鬥力
     */
    calculatePlayerCombatPower() {
        const player = this.gameState.player;

        // 基礎屬性戰力
        let basePower = 0;
        basePower += player.attributes.strength * 1.5;      // 武力最重要
        basePower += player.attributes.intelligence * 1.2;  // 智力影響技能
        basePower += player.attributes.leadership * 1.0;    // 統治影響指揮

        // 技能加成
        let skillBonus = 0;
        player.skills.forEach(skill => {
            skill.effects.forEach(effect => {
                if (effect.type === 'combat_bonus' || effect.type === 'attribute_bonus') {
                    skillBonus += effect.value;
                }
            });
        });

        // 裝備加成
        let equipmentBonus = 0;
        Object.values(player.equipment).forEach(item => {
            if (item && item.attributeBonus) {
                Object.entries(item.attributeBonus).forEach(([attr, bonus]) => {
                    if (attr === 'strength') equipmentBonus += bonus * 1.5;
                    else if (attr === 'intelligence') equipmentBonus += bonus * 1.2;
                    else if (attr === 'leadership') equipmentBonus += bonus * 1.0;
                    else equipmentBonus += bonus * 0.8;
                });
            }
        });

        // 兵力加成（兵力越多戰鬥力越強）
        const troopBonus = Math.sqrt(player.troops) * 2;

        const totalPower = basePower + skillBonus + equipmentBonus + troopBonus;

        return {
            basePower,
            skillBonus,
            equipmentBonus,
            troopBonus,
            totalPower: Math.floor(totalPower)
        };
    }

    /**
     * 計算敵方戰鬥力
     */
    calculateEnemyCombatPower(city) {
        let totalPower = city.defenseValue;

        // 駐守將領加成
        city.garrison.forEach(generalId => {
            const general = this.gameState.availableGenerals.find(g => g.id === generalId);
            if (general) {
                const generalPower = GameHelpers.calculateCombatPower(
                    general.attributes,
                    [],
                    general.equipment || {}
                );
                totalPower += generalPower;

                // 兵力加成
                totalPower += Math.sqrt(general.troops || 500) * 1.5;
            }
        });

        return {
            basePower: city.defenseValue,
            garrisonPower: totalPower - city.defenseValue,
            totalPower: Math.floor(totalPower)
        };
    }

    /**
     * 基於兵力的戰鬥結算
     */
    resolveBattleWithTroops(playerPower, enemyPower) {
        // 計算基礎勝率
        const powerRatio = playerPower.totalPower / (playerPower.totalPower + enemyPower.totalPower);
        let winRate = powerRatio * 100;

        // 添加隨機因素
        winRate = GameHelpers.clamp(winRate, 15, 85);

        const victory = GameHelpers.checkProbability(winRate);

        // 計算傷亡
        let playerCasualties;
        if (victory) {
            // 勝利時傷亡較少
            playerCasualties = Math.floor(this.gameState.player.troops * GameHelpers.randomInt(5, 15) / 100);
        } else {
            // 失敗時傷亡較多
            playerCasualties = Math.floor(this.gameState.player.troops * GameHelpers.randomInt(20, 40) / 100);
        }

        return {
            victory,
            playerCasualties: Math.min(playerCasualties, this.gameState.player.troops),
            winRate: Math.round(winRate)
        };
    }

    /**
     * 處理俘獲的將領
     */
    processCapturedGenerals(city) {
        if (city.garrison.length === 0) return;

        city.garrison.forEach(generalId => {
            const general = this.gameState.availableGenerals.find(g => g.id === generalId);
            if (general && general.status !== 'ally') {
                // 根據魅力值決定是否招降
                const recruitmentRate = GameHelpers.calculateRecruitmentRate(
                    this.gameState.player.attributes.charisma,
                    general.level
                );

                if (GameHelpers.checkProbability(recruitmentRate)) {
                    general.status = 'ally';
                    general.faction = 'player';
                    this.gameState.player.generalsRecruited++;

                    gameLogger.logRecruitment(general.name, true, recruitmentRate);

                    // 分配兵力給新將領
                    this.allocateTroopsToGeneral(general);
                } else {
                    gameLogger.logRecruitment(general.name, false, recruitmentRate);
                }
            }
        });
    }

    /**
     * 為將領分配兵力
     */
    allocateTroopsToGeneral(general) {
        const availableTroops = Math.floor(this.gameState.player.troops * 0.2); // 分配20%兵力
        const troopsToAllocate = Math.min(availableTroops, general.maxTroops);

        if (troopsToAllocate > 0) {
            general.troops = troopsToAllocate;
            this.gameState.player.troops -= troopsToAllocate;

            gameLogger.game('兵力分配', `為${general.name}分配${troopsToAllocate}兵力`);
        }
    }


    /**
     * 占領城池
     */
    captureCity(city) {
        city.faction = 'player';
        this.gameState.player.citiesControlled++;

        gameLogger.game('佔領', `🏰 成功佔領【${city.name}】`);
    }

    /**
     * 處理收編階段
     */
    async processRecruitment() {
        // 簡化實現：有機會獲得隨機將領
        if (GameHelpers.checkProbability(20)) { // 20%機率
            const availableGeneral = GameHelpers.randomChoice(
                this.gameState.availableGenerals.filter(g => g.status !== 'player')
            );

            if (availableGeneral) {
                const successRate = GameHelpers.calculateRecruitmentRate(
                    this.gameState.player.attributes.charisma,
                    availableGeneral.level
                );

                const success = GameHelpers.checkProbability(successRate);

                gameLogger.logRecruitment(availableGeneral.name, success, Math.round(successRate));

                if (success) {
                    availableGeneral.status = 'ally';
                    availableGeneral.faction = 'player';
                    this.gameState.player.generalsRecruited++;
                }
            }
        }
    }

    /**
     * 處理升級階段
     */
    async processLevelUp() {
        if (this.gameState.player.battlesWon > 0 &&
            this.gameState.player.battlesWon % 2 === 0 && // 每2勝升1級
            this.gameState.player.level < 10) {

            this.gameState.player.level++;

            // 隨機屬性提升
            const attributeGains = {};
            const totalGain = GameHelpers.randomInt(3, 8);
            const attributes = ['strength', 'intelligence', 'leadership', 'politics', 'charisma'];

            for (let i = 0; i < totalGain; i++) {
                const attr = GameHelpers.randomChoice(attributes);
                attributeGains[attr] = (attributeGains[attr] || 0) + 1;
                this.gameState.player.attributes[attr] =
                    GameHelpers.clamp(this.gameState.player.attributes[attr] + 1, 0, 100);
            }

            gameLogger.logLevelUp(this.gameState.player.level, attributeGains);
        }
    }

    /**
     * 檢查遊戲結束條件
     */
    checkGameEnd() {
        // 勝利條件：控制所有城池
        const totalCities = this.gameData.cities.length;
        if (this.gameState.player.citiesControlled >= totalCities) {
            this.endGame(true);
            return true;
        }

        // 失敗條件：沒有兵力且沒有城池
        if (this.gameState.player.troops <= 0 && this.gameState.player.citiesControlled <= 0) {
            this.endGame(false);
            return true;
        }

        return false;
    }

    /**
     * 結束遊戲
     */
    endGame(victory) {
        this.isRunning = false;
        this.gameState.status = 'game_over';
        this.gameState.gameEndTime = Date.now();

        if (this.gameLoop) {
            clearTimeout(this.gameLoop);
            this.gameLoop = null;
        }

        const finalStats = {
            level: this.gameState.player.level,
            cities: this.gameState.player.citiesControlled,
            battles: this.gameState.player.battlesWon
        };

        gameLogger.logGameEnd(victory, finalStats);
    }

    /**
     * 暫停/繼續遊戲
     */
    togglePause() {
        if (this.gameState.status === 'playing') {
            this.isRunning = !this.isRunning;
            if (this.isRunning) {
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
        this.gameState.settings.gameSpeed = GameHelpers.clamp(speed, 0.5, 4);
        gameLogger.info('設定', `遊戲速度設為 ${speed}x`);
    }

    /**
     * 獲取遊戲狀態
     */
    getGameState() {
        return this.gameState;
    }
}

// 創建全局遊戲引擎實例
window.gameEngine = new GameEngine();

// 導出類別
window.GameEngine = GameEngine;