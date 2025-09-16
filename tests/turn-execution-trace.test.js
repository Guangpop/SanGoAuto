// 回合執行追蹤測試 - 詳細追蹤executeGameTurn的執行流程
// Tests to trace the complete execution flow of executeGameTurn

describe('Turn Execution Flow Tracing', () => {
    let mockGameEngine;
    let mockTurnManager;
    let executionLog;
    let timeoutCalls;
    let originalSetTimeout;

    beforeEach(() => {
        executionLog = [];
        timeoutCalls = [];

        // 追蹤setTimeout調用
        originalSetTimeout = global.setTimeout;
        global.setTimeout = jest.fn((callback, delay) => {
            const id = Math.random();
            const logEntry = {
                id,
                callback: callback.toString(),
                delay,
                timestamp: Date.now()
            };
            timeoutCalls.push(logEntry);
            executionLog.push(`setTimeout called with delay: ${delay}ms`);
            return id;
        });

        // 模擬gameLogger
        global.gameLogger = {
            error: jest.fn((...args) => {
                executionLog.push(`ERROR: ${args.join(' ')}`);
            }),
            debug: jest.fn((...args) => {
                executionLog.push(`DEBUG: ${args.join(' ')}`);
            }),
            delayedLogBatch: jest.fn((...args) => {
                executionLog.push(`delayedLogBatch called with ${args[0].length} messages`);
            })
        };

        // 模擬GameHelpers
        global.GameHelpers = {
            randomFloat: jest.fn(() => {
                executionLog.push('GameHelpers.randomFloat called');
                return 1.0;
            }),
            checkProbability: jest.fn(() => {
                executionLog.push('GameHelpers.checkProbability called');
                return false;
            }),
            randomChoice: jest.fn(() => {
                executionLog.push('GameHelpers.randomChoice called');
                return 'test';
            })
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
                currentTurn: 0,
                settings: { gameSpeed: 1 },
                status: 'playing'
            },
            isRunning: true,
            eventSystem: {
                processRandomEventsWithMessages: jest.fn().mockImplementation(async () => {
                    executionLog.push('eventSystem.processRandomEventsWithMessages called');
                    return [{ category: '隨機事件', message: '測試事件' }];
                })
            },
            battleSystem: {
                processBattleWithMessages: jest.fn().mockImplementation(async () => {
                    executionLog.push('battleSystem.processBattleWithMessages called');
                    return [{ category: '戰鬥', message: '戰鬥結果' }];
                }),
                processRecruitmentWithMessages: jest.fn().mockImplementation(async () => {
                    executionLog.push('battleSystem.processRecruitmentWithMessages called');
                    return [];
                })
            }
        };

        // 模擬實際的TurnManager（使用真實邏輯）
        mockTurnManager = {
            gameEngine: mockGameEngine,
            turnInterval: 3000,
            gameLoop: null,

            async processResourceProductionWithMessages() {
                executionLog.push('processResourceProductionWithMessages start');
                return [{ category: '資源產出', message: '資源+100' }];
            },

            async processMaintenanceCostsWithMessages() {
                executionLog.push('processMaintenanceCostsWithMessages start');
                const cost = this.gameEngine.gameState.player.citiesControlled * 20;
                this.gameEngine.gameState.player.gold -= cost;
                executionLog.push(`maintenance cost: ${cost}, remaining gold: ${this.gameEngine.gameState.player.gold}`);
                return [{ category: '維護成本', message: `支付${cost}金錢` }];
            },

            async processLevelUpWithMessages() {
                executionLog.push('processLevelUpWithMessages start');
                return [];
            },

            checkGameEnd() {
                executionLog.push('checkGameEnd called');
                const totalCities = this.gameEngine.gameData.cities.length;
                if (this.gameEngine.gameState.player.citiesControlled >= totalCities) {
                    executionLog.push('Game ended: Victory');
                    return true;
                }
                if (this.gameEngine.gameState.player.troops <= 0 && this.gameEngine.gameState.player.citiesControlled <= 0) {
                    executionLog.push('Game ended: Defeat');
                    return true;
                }
                executionLog.push('Game continues');
                return false;
            },

            // 完整複製實際的executeGameTurn邏輯
            async executeGameTurn() {
                executionLog.push('=== executeGameTurn START ===');

                // 第一個檢查點
                if (!this.gameEngine.isRunning || this.gameEngine.gameState.status !== 'playing') {
                    executionLog.push('EARLY RETURN: Game not running or wrong status');
                    executionLog.push(`isRunning: ${this.gameEngine.isRunning}, status: ${this.gameEngine.gameState.status}`);
                    return;
                }

                executionLog.push('Game state check passed');
                this.gameEngine.gameState.currentTurn++;
                executionLog.push(`Turn incremented to: ${this.gameEngine.gameState.currentTurn}`);

                const turnMessages = [];
                let actualInterval = this.turnInterval;
                executionLog.push(`Initial actualInterval: ${actualInterval}`);

                turnMessages.push({
                    category: '回合',
                    message: `--- 第 ${this.gameEngine.gameState.currentTurn} 回合開始 ---`
                });

                try {
                    executionLog.push('TRY block started');

                    // 1. 資源產出階段
                    const resourceMessages = await this.processResourceProductionWithMessages();
                    turnMessages.push(...resourceMessages);
                    executionLog.push(`Added ${resourceMessages.length} resource messages`);

                    // 2. 隨機事件階段
                    const eventMessages = await this.gameEngine.eventSystem.processRandomEventsWithMessages();
                    turnMessages.push(...eventMessages);
                    executionLog.push(`Added ${eventMessages.length} event messages`);

                    // 3. 戰鬥階段
                    const battleMessages = await this.gameEngine.battleSystem.processBattleWithMessages();
                    turnMessages.push(...battleMessages);
                    executionLog.push(`Added ${battleMessages.length} battle messages`);

                    // 4. 收編階段
                    const recruitmentMessages = await this.gameEngine.battleSystem.processRecruitmentWithMessages();
                    turnMessages.push(...recruitmentMessages);
                    executionLog.push(`Added ${recruitmentMessages.length} recruitment messages`);

                    // 5. 升級階段
                    const levelUpMessages = await this.processLevelUpWithMessages();
                    turnMessages.push(...levelUpMessages);
                    executionLog.push(`Added ${levelUpMessages.length} levelUp messages`);

                    // 6. 維護成本階段
                    const maintenanceMessages = await this.processMaintenanceCostsWithMessages();
                    turnMessages.push(...maintenanceMessages);
                    executionLog.push(`Added ${maintenanceMessages.length} maintenance messages`);

                    executionLog.push(`Total messages: ${turnMessages.length}`);

                    // 分批延遲顯示所有訊息
                    if (turnMessages.length > 0) {
                        executionLog.push('Processing message display timing');
                        global.gameLogger.delayedLogBatch(turnMessages, 200, 2000);

                        // 計算事件顯示完畢需要的時間
                        const baseDelay = 200;
                        const eventInterval = 2000;
                        const lastEventTime = baseDelay + ((turnMessages.length - 1) * eventInterval);
                        const buffer = 500;

                        // 確保下一個回合在所有事件顯示完畢後開始
                        const requiredInterval = lastEventTime + buffer;
                        actualInterval = Math.max(actualInterval, requiredInterval);

                        executionLog.push(`Calculated timing - lastEventTime: ${lastEventTime}, requiredInterval: ${requiredInterval}, actualInterval: ${actualInterval}`);

                        global.gameLogger.debug('時間管理',
                            `事件數量: ${turnMessages.length}, 最後事件時間: ${lastEventTime}ms, ` +
                            `調整回合間隔: ${this.turnInterval}ms → ${actualInterval}ms`
                        );
                    }

                    // 檢查遊戲結束條件
                    if (this.checkGameEnd()) {
                        executionLog.push('RETURN: Game ended');
                        return;
                    }

                    executionLog.push('TRY block completed successfully');

                } catch (error) {
                    executionLog.push(`CATCH block: ${error.message}`);
                    global.gameLogger.error('遊戲', '回合處理出錯', error);
                }

                // 關鍵點：安排下一回合
                executionLog.push('About to schedule next turn');
                executionLog.push(`Final actualInterval: ${actualInterval}`);
                executionLog.push(`gameSpeed: ${this.gameEngine.gameState.settings.gameSpeed}`);
                executionLog.push(`Final delay: ${actualInterval / this.gameEngine.gameState.settings.gameSpeed}`);

                this.gameLoop = setTimeout(() => {
                    executionLog.push('Next turn callback triggered');
                    this.executeGameTurn();
                }, actualInterval / this.gameEngine.gameState.settings.gameSpeed);

                executionLog.push(`setTimeout ID: ${this.gameLoop}`);
                executionLog.push('=== executeGameTurn END ===');
            }
        };
    });

    afterEach(() => {
        global.setTimeout = originalSetTimeout;
    });

    describe('完整執行流程追蹤', () => {
        test('應該追蹤完整的executeGameTurn執行', async () => {
            console.log('開始執行executeGameTurn...');

            await mockTurnManager.executeGameTurn();

            console.log('=== 執行日誌 ===');
            executionLog.forEach((log, index) => {
                console.log(`${index + 1}. ${log}`);
            });

            console.log('=== setTimeout調用 ===');
            timeoutCalls.forEach((call, index) => {
                console.log(`${index + 1}. ID: ${call.id}, Delay: ${call.delay}ms`);
            });

            // 基本驗證
            expect(executionLog).toContain('=== executeGameTurn START ===');
            expect(executionLog).toContain('=== executeGameTurn END ===');
            expect(executionLog).toContain('About to schedule next turn');

            // 關鍵驗證：setTimeout是否被調用
            expect(global.setTimeout).toHaveBeenCalled();
            expect(timeoutCalls.length).toBe(1);

            // 驗證延遲時間合理
            const timeoutCall = timeoutCalls[0];
            expect(timeoutCall.delay).toBeGreaterThan(0);

            // 驗證沒有提前返回
            expect(executionLog).not.toContain('EARLY RETURN');
            expect(executionLog).not.toContain('RETURN: Game ended');
        });

        test('應該追蹤遊戲狀態檢查失敗的情況', async () => {
            // 設置遊戲未運行狀態
            mockGameEngine.isRunning = false;

            await mockTurnManager.executeGameTurn();

            console.log('=== 遊戲未運行時的執行日誌 ===');
            executionLog.forEach((log, index) => {
                console.log(`${index + 1}. ${log}`);
            });

            // 應該提前返回
            expect(executionLog).toContain('EARLY RETURN: Game not running or wrong status');
            expect(executionLog).toContain('isRunning: false');

            // 不應該安排下一回合
            expect(global.setTimeout).not.toHaveBeenCalled();
            expect(timeoutCalls.length).toBe(0);
        });

        test('應該追蹤遊戲結束時的情況', async () => {
            // 設置勝利條件
            mockGameEngine.gameState.player.citiesControlled = 27; // 等於總城池數

            await mockTurnManager.executeGameTurn();

            console.log('=== 遊戲勝利時的執行日誌 ===');
            executionLog.forEach((log, index) => {
                console.log(`${index + 1}. ${log}`);
            });

            // 應該檢測到遊戲結束
            expect(executionLog).toContain('Game ended: Victory');
            expect(executionLog).toContain('RETURN: Game ended');

            // 不應該安排下一回合
            expect(global.setTimeout).not.toHaveBeenCalled();
        });

        test('應該追蹤維護成本異常的情況', async () => {
            // 設置維護成本拋出異常
            mockTurnManager.processMaintenanceCostsWithMessages = jest.fn().mockImplementation(async () => {
                executionLog.push('processMaintenanceCostsWithMessages throwing error');
                throw new Error('維護成本計算錯誤');
            });

            await mockTurnManager.executeGameTurn();

            console.log('=== 維護成本異常時的執行日誌 ===');
            executionLog.forEach((log, index) => {
                console.log(`${index + 1}. ${log}`);
            });

            // 應該捕獲異常
            expect(executionLog).toContain('CATCH block: 維護成本計算錯誤');
            expect(executionLog).toContain('ERROR: 遊戲 回合處理出錯 Error: 維護成本計算錯誤');

            // 關鍵：即使有異常，也應該安排下一回合
            expect(executionLog).toContain('About to schedule next turn');
            expect(global.setTimeout).toHaveBeenCalled();
            expect(timeoutCalls.length).toBe(1);
        });

        test('應該檢查actualInterval的計算過程', async () => {
            await mockTurnManager.executeGameTurn();

            // 找到時間計算相關的日誌
            const timingLogs = executionLog.filter(log =>
                log.includes('actualInterval') ||
                log.includes('Calculated timing') ||
                log.includes('Final delay')
            );

            console.log('=== 時間計算過程 ===');
            timingLogs.forEach((log, index) => {
                console.log(`${index + 1}. ${log}`);
            });

            // 驗證時間計算過程存在
            expect(timingLogs.length).toBeGreaterThan(0);

            // 驗證最終延遲時間合理
            const finalDelayLog = executionLog.find(log => log.includes('Final delay:'));
            expect(finalDelayLog).toBeDefined();

            const delayMatch = finalDelayLog.match(/Final delay: (\d+)/);
            if (delayMatch) {
                const finalDelay = parseInt(delayMatch[1]);
                expect(finalDelay).toBeGreaterThan(0);
                expect(finalDelay).toBeLessThan(30000); // 不超過30秒
            }
        });
    });
});