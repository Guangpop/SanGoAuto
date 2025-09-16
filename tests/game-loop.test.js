// 遊戲循環測試 - 診斷遊戲停住問題
// Tests for game loop continuation and turn management

describe('Game Loop Continuation', () => {
    let mockGameEngine;
    let mockTurnManager;
    let timeoutCalls;
    let originalSetTimeout;
    let originalClearTimeout;

    beforeEach(() => {
        // 記錄setTimeout調用
        timeoutCalls = [];
        originalSetTimeout = global.setTimeout;
        originalClearTimeout = global.clearTimeout;

        global.setTimeout = jest.fn((callback, delay) => {
            const id = Math.random();
            timeoutCalls.push({ callback, delay, id, cleared: false });
            return id;
        });

        global.clearTimeout = jest.fn((id) => {
            const call = timeoutCalls.find(c => c.id === id);
            if (call) call.cleared = true;
        });

        // 模擬gameLogger
        global.gameLogger = {
            game: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            delayedLogBatch: jest.fn()
        };

        // 模擬GameHelpers
        global.GameHelpers = {
            randomChoice: jest.fn(() => 'jiangxia'),
            randomFloat: jest.fn(() => 1.0),
            checkProbability: jest.fn(() => false),
            randomInt: jest.fn(() => 1)
        };

        // 模擬遊戲數據
        const mockCities = [
            { id: 'jiangxia', name: '江夏', faction: 'other' },
            { id: 'xuchang', name: '許昌', faction: 'other' }
        ];

        // 模擬gameEngine
        mockGameEngine = {
            gameData: {
                cities: mockCities
            },
            gameState: {
                player: {
                    attributes: {
                        strength: 10, intelligence: 10, leadership: 10,
                        politics: 10, charisma: 10, destiny: 0
                    },
                    citiesControlled: 1,
                    troops: 800,
                    gold: 200,
                    battlesWon: 0,
                    battlesLost: 0
                },
                cities: new Map(mockCities.map(city => [city.id, {...city}])),
                currentTurn: 0,
                settings: { gameSpeed: 1 },
                status: 'playing'
            },
            isRunning: false
        };

        // 模擬TurnManager的關鍵方法
        mockTurnManager = {
            gameEngine: mockGameEngine,
            turnInterval: 3000,
            gameLoop: null,

            startMainGameLoop() {
                global.gameLogger.game('遊戲', '🚀 進入主遊戲階段');
                this.gameEngine.isRunning = true;

                // 設置起始城池
                const startCity = this.gameEngine.gameData.cities.find(c => c.id === 'jiangxia');
                if (startCity) {
                    startCity.faction = 'player';
                    this.gameEngine.gameState.cities.set(startCity.id, startCity);
                }

                this.executeGameTurn();
            },

            executeGameTurn() {
                // 模擬回合處理
                const turnMessages = [
                    { message: '測試事件1' },
                    { message: '測試事件2' }
                ];

                // 計算間隔時間
                let actualInterval = this.turnInterval;
                if (turnMessages.length > 0) {
                    global.gameLogger.delayedLogBatch(turnMessages, 200, 2000);

                    const baseDelay = 200;
                    const eventInterval = 2000;
                    const lastEventTime = baseDelay + ((turnMessages.length - 1) * eventInterval);
                    const buffer = 500;
                    const requiredInterval = lastEventTime + buffer;
                    actualInterval = Math.max(actualInterval, requiredInterval);
                }

                // 檢查遊戲結束條件
                if (this.checkGameEnd()) {
                    return;
                }

                // 安排下一回合
                this.gameLoop = setTimeout(() => {
                    this.executeGameTurn();
                }, actualInterval / this.gameEngine.gameState.settings.gameSpeed);
            },

            checkGameEnd() {
                // 勝利條件：控制所有城池
                const totalCities = this.gameEngine.gameData.cities.length;
                if (this.gameEngine.gameState.player.citiesControlled >= totalCities) {
                    this.endGame(true);
                    return true;
                }

                // 失敗條件：沒有兵力且沒有城池
                if (this.gameEngine.gameState.player.troops <= 0 &&
                    this.gameEngine.gameState.player.citiesControlled <= 0) {
                    this.endGame(false);
                    return true;
                }

                return false;
            },

            endGame(victory) {
                this.gameEngine.isRunning = false;
                this.gameEngine.gameState.status = 'game_over';
                if (this.gameLoop) {
                    clearTimeout(this.gameLoop);
                    this.gameLoop = null;
                }
                global.gameLogger.game('遊戲', victory ? '🎉 遊戲勝利!' : '💀 遊戲結束');
            }
        };
    });

    afterEach(() => {
        global.setTimeout = originalSetTimeout;
        global.clearTimeout = originalClearTimeout;
    });

    describe('遊戲循環啟動', () => {
        test('應該正確啟動主遊戲循環', () => {
            mockTurnManager.startMainGameLoop();

            expect(mockTurnManager.gameEngine.isRunning).toBe(true);
            expect(global.gameLogger.game).toHaveBeenCalledWith('遊戲', '🚀 進入主遊戲階段');

            // 檢查是否設置了起始城池
            const startCity = mockTurnManager.gameEngine.gameState.cities.get('jiangxia');
            expect(startCity.faction).toBe('player');
        });

        test('應該在第一回合後安排下一回合', () => {
            mockTurnManager.startMainGameLoop();

            // 應該有一個setTimeout調用來安排下一回合
            expect(global.setTimeout).toHaveBeenCalled();
            expect(timeoutCalls.length).toBeGreaterThan(0);

            const gameLoopTimeout = timeoutCalls.find(call => call.delay > 1000);
            expect(gameLoopTimeout).toBeDefined();

            console.log('setTimeout調用:', timeoutCalls.map(c => ({ delay: c.delay, cleared: c.cleared })));
        });
    });

    describe('遊戲結束條件檢查', () => {
        test('正常遊戲狀態不應該觸發遊戲結束', () => {
            const result = mockTurnManager.checkGameEnd();

            expect(result).toBe(false);
            expect(mockTurnManager.gameEngine.isRunning).toBe(false); // 尚未啟動
        });

        test('控制所有城池應該觸發勝利', () => {
            mockTurnManager.gameEngine.gameState.player.citiesControlled = 2; // 等於城池總數

            const result = mockTurnManager.checkGameEnd();

            expect(result).toBe(true);
            expect(mockTurnManager.gameEngine.status).toBeUndefined(); // 或檢查正確的遊戲狀態
            expect(global.gameLogger.game).toHaveBeenCalledWith('遊戲', '🎉 遊戲勝利!');
        });

        test('沒有兵力和城池應該觸發失敗', () => {
            mockTurnManager.gameEngine.gameState.player.troops = 0;
            mockTurnManager.gameEngine.gameState.player.citiesControlled = 0;

            const result = mockTurnManager.checkGameEnd();

            expect(result).toBe(true);
            expect(global.gameLogger.game).toHaveBeenCalledWith('遊戲', '💀 遊戲結束');
        });
    });

    describe('回合執行連續性', () => {
        test('應該能夠執行多個回合', () => {
            mockTurnManager.startMainGameLoop();

            // 第一個回合應該安排下一個回合
            expect(timeoutCalls.length).toBeGreaterThan(0);

            const firstTimeout = timeoutCalls[timeoutCalls.length - 1];
            expect(firstTimeout.callback).toBeInstanceOf(Function);

            // 模擬執行第二個回合
            firstTimeout.callback();

            // 應該有更多的setTimeout調用
            expect(timeoutCalls.length).toBeGreaterThan(1);

            console.log('多回合執行:', {
                總timeout數: timeoutCalls.length,
                遊戲是否運行: mockTurnManager.gameEngine.isRunning
            });
        });

        test('遊戲結束時應該停止循環', () => {
            // 設置遊戲結束條件
            mockTurnManager.gameEngine.gameState.player.citiesControlled = 2;

            mockTurnManager.startMainGameLoop();

            // 由於遊戲結束，不應該安排下一回合
            const gameLoopTimeouts = timeoutCalls.filter(call => call.delay > 1000);
            expect(gameLoopTimeouts.length).toBe(0); // 遊戲立即結束，沒有安排下一回合
        });
    });

    describe('潛在問題診斷', () => {
        test('應該檢測異步問題', () => {
            // 檢查delayedLogBatch是否影響遊戲循環
            mockTurnManager.executeGameTurn();

            expect(global.gameLogger.delayedLogBatch).toHaveBeenCalled();

            const mainGameLoop = timeoutCalls.find(call => call.delay >= 3000);
            expect(mainGameLoop).toBeDefined();

            console.log('異步調用分析:', {
                delayedLogBatch調用: global.gameLogger.delayedLogBatch.mock.calls.length,
                主循環timeout: mainGameLoop ? mainGameLoop.delay : 'undefined',
                所有timeout延遲: timeoutCalls.map(c => c.delay)
            });
        });

        test('應該檢測gameEngine狀態變化', () => {
            const initialStatus = mockTurnManager.gameEngine.gameState.status;
            mockTurnManager.startMainGameLoop();
            const afterStartStatus = mockTurnManager.gameEngine.gameState.status;

            console.log('遊戲狀態變化:', {
                初始狀態: initialStatus,
                啟動後狀態: afterStartStatus,
                isRunning: mockTurnManager.gameEngine.isRunning
            });

            expect(mockTurnManager.gameEngine.isRunning).toBe(true);
        });
    });
});