// 數據載入同步問題測試
// Tests for data loading synchronization issues

describe('Data Loading Synchronization', () => {
    let mockGameEngine;
    let mockUIManager;

    beforeEach(() => {
        // 模擬fetch
        global.fetch = jest.fn();

        // 模擬gameLogger
        global.gameLogger = {
            info: jest.fn(),
            error: jest.fn()
        };

        // 重置GameEngine模擬
        mockGameEngine = {
            gameData: { skills: [] },
            isDataLoaded: false,

            async initializeGameData() {
                try {
                    global.gameLogger.info('系統', '正在載入遊戲資源...');

                    // 模擬異步數據載入
                    const skillsData = [
                        { id: 'skill1', name: '技能1', starCost: 1 },
                        { id: 'skill2', name: '技能2', starCost: 2 }
                    ];

                    // 延遲模擬網絡請求
                    await new Promise(resolve => setTimeout(resolve, 100));

                    this.gameData = { skills: skillsData };
                    this.isDataLoaded = true;
                    global.gameLogger.info('系統', '遊戲資源載入完成');

                } catch (error) {
                    global.gameLogger.error('系統', '遊戲資源載入失敗', error);
                }
            }
        };

        // 模擬UIManager
        mockUIManager = {
            gameEngine: null,
            gameEngineReady: false,

            async waitForGameEngine() {
                const checkEngine = () => {
                    if (window.gameEngine &&
                        window.gameEngine.gameData &&
                        window.gameEngine.gameData.skills.length > 0) {
                        this.gameEngine = window.gameEngine;
                        this.gameEngineReady = true;
                        this.showMainMenu();
                    } else {
                        setTimeout(checkEngine, 100);
                    }
                };
                checkEngine();
            },

            showMainMenu() {
                console.log('主選單顯示');
            }
        };

        // 設置全局gameEngine
        global.window = global.window || {};
        global.window.gameEngine = mockGameEngine;
    });

    describe('數據載入時序問題', () => {
        test('應該檢測異步載入競爭條件', async () => {
            // 模擬：UIManager立即開始等待，但GameEngine還在載入
            const waitPromise = mockUIManager.waitForGameEngine();

            // 此時gameEngine存在但數據尚未載入
            expect(mockGameEngine.gameData.skills.length).toBe(0);
            expect(mockUIManager.gameEngineReady).toBe(false);

            // 啟動數據載入
            await mockGameEngine.initializeGameData();

            // 等待UI管理器檢測到數據準備就緒
            await new Promise(resolve => setTimeout(resolve, 150));

            expect(mockGameEngine.gameData.skills.length).toBeGreaterThan(0);
            expect(mockUIManager.gameEngineReady).toBe(true);
        });

        test('應該檢測數據載入失敗情況', async () => {
            // 模擬數據載入失敗
            const brokenGameEngine = {
                ...mockGameEngine,
                async initializeGameData() {
                    throw new Error('網絡錯誤');
                }
            };

            global.window.gameEngine = brokenGameEngine;

            const waitPromise = mockUIManager.waitForGameEngine();

            try {
                await brokenGameEngine.initializeGameData();
            } catch (error) {
                expect(error.message).toBe('網絡錯誤');
            }

            // UIManager應該仍在等待
            expect(mockUIManager.gameEngineReady).toBe(false);
        });
    });

    describe('改進的數據載入同步', () => {
        test('應該使用Promise通知數據準備就緒', async () => {
            // 改進版GameEngine
            const improvedGameEngine = {
                gameData: { skills: [] },
                isDataLoaded: false,
                dataLoadPromise: null,

                constructor() {
                    this.dataLoadPromise = this.initializeGameData();
                },

                async initializeGameData() {
                    global.gameLogger.info('系統', '正在載入遊戲資源...');

                    await new Promise(resolve => setTimeout(resolve, 50));

                    this.gameData = {
                        skills: [
                            { id: 'skill1', name: '技能1', starCost: 1 },
                            { id: 'skill2', name: '技能2', starCost: 2 }
                        ]
                    };
                    this.isDataLoaded = true;

                    global.gameLogger.info('系統', '遊戲資源載入完成');
                    return this.gameData;
                }
            };

            improvedGameEngine.dataLoadPromise = improvedGameEngine.initializeGameData();

            // 改進版UIManager
            const improvedUIManager = {
                gameEngine: null,

                async waitForGameEngine() {
                    if (window.gameEngine && window.gameEngine.dataLoadPromise) {
                        await window.gameEngine.dataLoadPromise;
                        this.gameEngine = window.gameEngine;
                        this.showMainMenu();
                    }
                },

                showMainMenu() {
                    console.log('主選單顯示（改進版）');
                }
            };

            global.window.gameEngine = improvedGameEngine;

            // 等待數據載入和UI初始化
            await improvedUIManager.waitForGameEngine();

            expect(improvedGameEngine.isDataLoaded).toBe(true);
            expect(improvedUIManager.gameEngine).toBe(improvedGameEngine);
        });

        test('應該提供數據載入狀態事件', () => {
            // 事件驅動版本
            const eventGameEngine = {
                gameData: { skills: [] },
                listeners: [],

                on(event, callback) {
                    this.listeners.push({ event, callback });
                },

                emit(event, data) {
                    this.listeners
                        .filter(l => l.event === event)
                        .forEach(l => l.callback(data));
                },

                async initializeGameData() {
                    this.emit('loading-start');

                    await new Promise(resolve => setTimeout(resolve, 50));

                    this.gameData = { skills: [{ id: 'test', name: 'Test Skill' }] };

                    this.emit('loading-complete', this.gameData);
                }
            };

            const eventUIManager = {
                gameEngine: null,
                ready: false,

                async waitForGameEngine() {
                    if (window.gameEngine) {
                        window.gameEngine.on('loading-complete', (gameData) => {
                            this.gameEngine = window.gameEngine;
                            this.ready = true;
                        });

                        await window.gameEngine.initializeGameData();
                    }
                }
            };

            global.window.gameEngine = eventGameEngine;

            return eventUIManager.waitForGameEngine().then(() => {
                expect(eventUIManager.ready).toBe(true);
                expect(eventGameEngine.gameData.skills.length).toBe(1);
            });
        });
    });

    describe('實際修復方案', () => {
        test('應該添加dataReady標誌', async () => {
            const fixedGameEngine = {
                gameData: { skills: [] },
                dataReady: false,

                async initializeGameData() {
                    global.gameLogger.info('系統', '正在載入遊戲資源...');

                    await new Promise(resolve => setTimeout(resolve, 50));

                    this.gameData = {
                        skills: [
                            { id: 'skill1', name: '技能1' },
                            { id: 'skill2', name: '技能2' }
                        ]
                    };

                    this.dataReady = true; // 關鍵標誌
                    global.gameLogger.info('系統', '遊戲資源載入完成');
                }
            };

            const fixedUIManager = {
                gameEngine: null,

                async waitForGameEngine() {
                    const checkEngine = () => {
                        if (window.gameEngine &&
                            window.gameEngine.dataReady &&
                            window.gameEngine.gameData.skills.length > 0) {
                            this.gameEngine = window.gameEngine;
                            this.showMainMenu();
                        } else {
                            setTimeout(checkEngine, 100);
                        }
                    };
                    checkEngine();
                },

                showMainMenu() {
                    console.log('遊戲準備就緒');
                }
            };

            global.window.gameEngine = fixedGameEngine;

            // 同時啟動數據載入和UI等待
            const loadPromise = fixedGameEngine.initializeGameData();
            const uiPromise = fixedUIManager.waitForGameEngine();

            await loadPromise;
            await new Promise(resolve => setTimeout(resolve, 150)); // 等待UI檢測

            expect(fixedGameEngine.dataReady).toBe(true);
            expect(fixedUIManager.gameEngine).toBe(fixedGameEngine);
        });
    });
});