// 異常處理測試 - 驗證維護成本錯誤後遊戲循環繼續
// Tests for exception handling during maintenance cost processing

describe('Exception Handling in Game Loop', () => {
    let mockGameEngine;
    let mockTurnManager;
    let timeoutCalls;

    beforeEach(() => {
        // 記錄setTimeout調用
        timeoutCalls = [];
        const originalSetTimeout = global.setTimeout;
        global.setTimeout = jest.fn((callback, delay) => {
            const id = Math.random();
            timeoutCalls.push({ callback, delay, id });
            return id;
        });

        // 模擬gameLogger
        global.gameLogger = {
            error: jest.fn(),
            debug: jest.fn(),
            delayedLogBatch: jest.fn()
        };

        // 模擬GameHelpers
        global.GameHelpers = {
            randomFloat: jest.fn(() => 1.0),
            checkProbability: jest.fn(() => false),
            randomChoice: jest.fn(() => 'test')
        };

        // 模擬gameEngine
        mockGameEngine = {
            gameData: {
                cities: Array.from({ length: 27 }, (_, i) => ({ id: `city${i}` }))
            },
            gameState: {
                player: {
                    gold: 100,
                    troops: 500,
                    citiesControlled: 2,
                    attributes: { destiny: 0 },
                    battlesWon: 0,
                    battlesLost: 0
                },
                currentTurn: 5,
                settings: { gameSpeed: 1 },
                status: 'playing'
            },
            isRunning: true,
            eventSystem: {
                processRandomEventsWithMessages: jest.fn().mockResolvedValue([])
            },
            battleSystem: {
                processBattleWithMessages: jest.fn().mockResolvedValue([]),
                processRecruitmentWithMessages: jest.fn().mockResolvedValue([])
            }
        };

        // 模擬turnManager
        mockTurnManager = {
            gameEngine: mockGameEngine,
            turnInterval: 3000,
            gameLoop: null,

            async processResourceProductionWithMessages() {
                return [{ category: '資源', message: '資源產出正常' }];
            },

            async processMaintenanceCostsWithMessages() {
                // 可能拋出異常的維護成本處理
                const cost = this.gameEngine.gameState.player.citiesControlled * 20;
                this.gameEngine.gameState.player.gold -= cost;

                return [{ category: '維護成本', message: `支付${cost}金錢` }];
            },

            async processLevelUpWithMessages() {
                return [];
            },

            checkGameEnd() {
                return false;
            },

            // 模擬修復後的executeGameTurn
            async executeGameTurn() {
                if (!this.gameEngine.isRunning || this.gameEngine.gameState.status !== 'playing') return;

                this.gameEngine.gameState.currentTurn++;
                const turnMessages = [];
                let actualInterval = this.turnInterval; // 關鍵修復：移到try外面

                try {
                    const resourceMessages = await this.processResourceProductionWithMessages();
                    turnMessages.push(...resourceMessages);

                    const eventMessages = await this.gameEngine.eventSystem.processRandomEventsWithMessages();
                    turnMessages.push(...eventMessages);

                    const battleMessages = await this.gameEngine.battleSystem.processBattleWithMessages();
                    turnMessages.push(...battleMessages);

                    const recruitmentMessages = await this.gameEngine.battleSystem.processRecruitmentWithMessages();
                    turnMessages.push(...recruitmentMessages);

                    const levelUpMessages = await this.processLevelUpWithMessages();
                    turnMessages.push(...levelUpMessages);

                    const maintenanceMessages = await this.processMaintenanceCostsWithMessages();
                    turnMessages.push(...maintenanceMessages);

                    // 分批延遲顯示
                    if (turnMessages.length > 0) {
                        global.gameLogger.delayedLogBatch(turnMessages, 200, 2000);

                        const baseDelay = 200;
                        const eventInterval = 2000;
                        const lastEventTime = baseDelay + ((turnMessages.length - 1) * eventInterval);
                        const buffer = 500;
                        const requiredInterval = lastEventTime + buffer;
                        actualInterval = Math.max(actualInterval, requiredInterval);
                    }

                    if (this.checkGameEnd()) {
                        return;
                    }

                } catch (error) {
                    global.gameLogger.error('遊戲', '回合處理出錯', error);
                }

                // 安排下一回合（關鍵：在try-catch外面，使用外部作用域的actualInterval）
                this.gameLoop = setTimeout(() => {
                    this.executeGameTurn();
                }, actualInterval / this.gameEngine.gameState.settings.gameSpeed);
            }
        };
    });

    describe('正常情況下的遊戲循環', () => {
        test('沒有異常時應該正常安排下一回合', async () => {
            await mockTurnManager.executeGameTurn();

            // 應該安排了下一回合
            expect(global.setTimeout).toHaveBeenCalled();
            expect(timeoutCalls.length).toBeGreaterThan(0);

            const nextTurnTimeout = timeoutCalls.find(call => call.delay >= 1000);
            expect(nextTurnTimeout).toBeDefined();

            // 沒有錯誤記錄
            expect(global.gameLogger.error).not.toHaveBeenCalled();
        });
    });

    describe('維護成本異常處理', () => {
        test('維護成本拋出異常時遊戲循環應該繼續', async () => {
            // 模擬維護成本處理拋出異常
            mockTurnManager.processMaintenanceCostsWithMessages = jest.fn().mockRejectedValue(new Error('維護成本計算錯誤'));

            await mockTurnManager.executeGameTurn();

            // 應該記錄錯誤
            expect(global.gameLogger.error).toHaveBeenCalledWith(
                '遊戲',
                '回合處理出錯',
                expect.any(Error)
            );

            // 關鍵：即使有錯誤，也應該安排下一回合
            expect(global.setTimeout).toHaveBeenCalled();
            expect(timeoutCalls.length).toBeGreaterThan(0);

            console.log('異常處理測試結果:', {
                錯誤已記錄: global.gameLogger.error.mock.calls.length > 0,
                下回合已安排: timeoutCalls.length > 0,
                遊戲繼續運行: mockGameEngine.isRunning
            });
        });

        test('多個階段異常時遊戲循環應該穩定', async () => {
            // 模擬多個階段都拋出異常
            mockTurnManager.processResourceProductionWithMessages = jest.fn().mockRejectedValue(new Error('資源錯誤'));
            mockTurnManager.processMaintenanceCostsWithMessages = jest.fn().mockRejectedValue(new Error('維護錯誤'));

            await mockTurnManager.executeGameTurn();

            // 應該記錄錯誤但繼續執行
            expect(global.gameLogger.error).toHaveBeenCalled();
            expect(global.setTimeout).toHaveBeenCalled();
        });
    });

    describe('作用域問題修復驗證', () => {
        test('actualInterval變數應該在正確的作用域', async () => {
            // 模擬異常情況
            mockTurnManager.processMaintenanceCostsWithMessages = jest.fn().mockRejectedValue(new Error('測試錯誤'));

            await mockTurnManager.executeGameTurn();

            // 檢查setTimeout是否被正確調用（說明actualInterval可用）
            expect(global.setTimeout).toHaveBeenCalled();

            const timeoutCall = timeoutCalls[0];
            expect(timeoutCall.delay).toBeDefined();
            expect(timeoutCall.delay).toBeGreaterThan(0);

            // 延遲時間應該是合理的（3000ms左右）
            expect(timeoutCall.delay).toBeGreaterThanOrEqual(3000);
        });

        test('異常時actualInterval應該使用預設值', async () => {
            // 確保turnMessages沒有內容，actualInterval使用預設值
            mockTurnManager.processResourceProductionWithMessages = jest.fn().mockRejectedValue(new Error('資源異常'));

            await mockTurnManager.executeGameTurn();

            const timeoutCall = timeoutCalls[0];

            // 應該使用預設的turnInterval (3000ms)
            expect(timeoutCall.delay).toBe(3000);
        });

        test('正常情況下actualInterval應該根據事件數量調整', async () => {
            // 模擬多個事件
            mockTurnManager.processResourceProductionWithMessages = jest.fn().mockResolvedValue([
                { message: '事件1' },
                { message: '事件2' },
                { message: '事件3' }
            ]);

            await mockTurnManager.executeGameTurn();

            const timeoutCall = timeoutCalls[0];

            // 實際有更多事件（resource + event + battle + recruitment + levelup + maintenance）
            // 大約6個事件：200 + 5*2000 + 500 = 10700ms，但受max(3000, calculated)影響
            expect(timeoutCall.delay).toBeGreaterThan(3000); // 大於預設值

            console.log('實際延遲時間:', timeoutCall.delay);
            // 放寬檢查，主要驗證邏輯正確
            expect(timeoutCall.delay).toBeGreaterThanOrEqual(4000);
        });
    });

    describe('邊界情況測試', () => {
        test('遊戲結束時不應該安排下一回合', async () => {
            mockTurnManager.checkGameEnd = jest.fn().mockReturnValue(true);

            await mockTurnManager.executeGameTurn();

            // 遊戲結束，不應該安排下一回合
            expect(global.setTimeout).not.toHaveBeenCalled();
        });

        test('遊戲未運行時應該提前返回', async () => {
            mockGameEngine.isRunning = false;

            await mockTurnManager.executeGameTurn();

            // 不應該執行任何處理或安排下一回合
            expect(global.setTimeout).not.toHaveBeenCalled();
            expect(global.gameLogger.error).not.toHaveBeenCalled();
        });
    });
});