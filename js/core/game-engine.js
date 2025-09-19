// 三國天命 - 遊戲核心引擎
// Core game engine with module integration

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
        this.dataReady = false; // 添加數據準備標誌

        // 初始化子系統
        this.skillSystem = new SkillSystem(this);
        this.battleSystem = new BattleSystem(this);
        this.eventSystem = new EventSystem(this);
        this.turnManager = new TurnManager(this);

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
            this.dataReady = true; // 標記數據準備完成
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
        this.skillSystem.startSkillSelection();

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
     * 選擇技能 (委託給技能系統)
     */
    selectSkill(skillId) {
        return this.skillSystem.selectSkill(skillId);
    }

    /**
     * 跳過技能輪 (委託給技能系統)
     */
    skipSkillRound() {
        this.skillSystem.skipSkillRound();
    }


    /**
     * 獲取遊戲狀態
     */
    getGameState() {
        return this.gameState;
    }

    /**
     * 獲取技能選擇狀態
     */
    get skillSelection() {
        return this.skillSystem.getSkillSelection();
    }
}

// 創建全局遊戲引擎實例
window.gameEngine = new GameEngine();

// 導出類別
window.GameEngine = GameEngine;