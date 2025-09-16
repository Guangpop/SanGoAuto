// 真實場景測試 - 模擬實際遊戲中維護成本後停止的情況
// Tests that reproduce the exact real-world scenario where game stops after maintenance costs

describe('Real World Game Stopping Scenario', () => {
    let mockGameEngine;
    let mockTurnManager;
    let timeoutCalls;
    let executionLog;

    beforeEach(() => {
        executionLog = [];
        timeoutCalls = [];

        // 追蹤setTimeout調用
        const originalSetTimeout = global.setTimeout;
        global.setTimeout = jest.fn((callback, delay) => {
            if (isNaN(delay) || delay <= 0) {
                executionLog.push(`❌ Invalid setTimeout delay: ${delay}`);
                return null;
            }

            const id = Math.random();
            timeoutCalls.push({ callback, delay, id });
            executionLog.push(`⏰ setTimeout called with delay: ${delay}ms`);
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
            game: jest.fn((...args) => {
                executionLog.push(`GAME: ${args.join(' ')}`);
            }),
            delayedLogBatch: jest.fn((messages, delay, interval) => {
                executionLog.push(`delayedLogBatch: ${messages.length} messages, delay=${delay}, interval=${interval}`);
            })
        };

        // 模擬GameHelpers (包含實際的隨機函數)
        global.GameHelpers = {
            randomFloat: jest.fn((min, max) => {
                const result = Math.random() * (max - min) + min;
                executionLog.push(`GameHelpers.randomFloat(${min}, ${max}) = ${result}`);
                return result;
            }),
            checkProbability: jest.fn((percent) => {
                const result = Math.random() < (percent / 100);
                executionLog.push(`GameHelpers.checkProbability(${percent}) = ${result}`);
                return result;
            }),
            randomChoice: jest.fn((choices) => {
                const result = choices[Math.floor(Math.random() * choices.length)];
                executionLog.push(`GameHelpers.randomChoice = ${result}`);
                return result;
            }),
            clamp: jest.fn((value, min, max) => Math.max(min, Math.min(max, value)))
        };

        // 模擬實際遊戲狀態（基於用戶提供的事件日誌）
        mockGameEngine = {
            gameData: {
                cities: Array.from({ length: 27 }, (_, i) => ({
                    id: `city${i}`,
                    name: `城市${i}`
                }))
            },
            gameState: {
                player: {
                    gold: 50,
                    troops: 300,
                    citiesControlled: 3,
                    maintenanceCost: 0,
                    attributes: {
                        destiny: 15, // 低於25，不會觸發時間異常
                        politics: 20,
                        leadership: 25
                    },
                    battlesWon: 1,
                    battlesLost: 0
                },
                currentTurn: 8, // 非10的倍數，不會觸發時間流速異常
                settings: {
                    gameSpeed: 1
                },
                status: 'playing'
            },
            isRunning: true,
            eventSystem: {
                processRandomEventsWithMessages: jest.fn().mockImplementation(async () => {
                    executionLog.push('eventSystem.processRandomEventsWithMessages called');
                    return [{ category: '隨機事件', message: '測試隨機事件' }];
                })
            },
            battleSystem: {
                processBattleWithMessages: jest.fn().mockImplementation(async () => {
                    executionLog.push('battleSystem.processBattleWithMessages called');
                    return [{ category: '戰鬥', message: '戰鬥測試' }];
                }),
                processRecruitmentWithMessages: jest.fn().mockImplementation(async () => {
                    executionLog.push('battleSystem.processRecruitmentWithMessages called');
                    return [];
                })
            }
        };

        // 完整模擬實際的TurnManager（包含所有時間調整邏輯）
        mockTurnManager = {
            gameEngine: mockGameEngine,
            turnInterval: 3000,
            gameLoop: null,

            async processResourceProductionWithMessages() {
                executionLog.push('processResourceProductionWithMessages called');
                return [{ category: '資源產出', message: '城池產出：金錢+20，兵力+10' }];
            },

            async processMaintenanceCostsWithMessages() {
                executionLog.push('processMaintenanceCostsWithMessages START');
                const messages = [];

                // 完全複製實際的維護成本邏輯
                const maintenanceCost = this.gameEngine.gameState.player.citiesControlled * 20;
                this.gameEngine.gameState.player.maintenanceCost = maintenanceCost;
                executionLog.push(`Calculated maintenance cost: ${maintenanceCost}`);

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

                executionLog.push(`processMaintenanceCostsWithMessages END, returning ${messages.length} messages`);
                return messages;
            },

            async processLevelUpWithMessages() {
                executionLog.push('processLevelUpWithMessages called');
                return [];
            },

            checkGameEnd() {
                executionLog.push('checkGameEnd called');
                const totalCities = this.gameEngine.gameData.cities.length;
                if (this.gameEngine.gameState.player.citiesControlled >= totalCities) {
                    this.endGame(true);
                    return true;
                }

                if (this.gameEngine.gameState.player.troops <= 0 && this.gameEngine.gameState.player.citiesControlled <= 0) {
                    this.endGame(false);
                    return true;
                }

                return false;
            },

            endGame(victory) {
                this.gameEngine.isRunning = false;
                this.gameEngine.gameState.status = 'game_over';
                executionLog.push(`Game ended: ${victory ? 'Victory' : 'Defeat'}`);
            },

            // 完整複製實際的executeGameTurn，包含所有時間調整邏輯
            async executeGameTurn() {
                executionLog.push('=== executeGameTurn START ===');

                if (!this.gameEngine.isRunning || this.gameEngine.gameState.status !== 'playing') {
                    executionLog.push('EARLY RETURN: Game not running or wrong status');
                    return;
                }

                this.gameEngine.gameState.currentTurn++;
                executionLog.push(`Turn incremented to: ${this.gameEngine.gameState.currentTurn}`);

                const turnMessages = [];
                let actualInterval = this.turnInterval; // 關鍵：移到外面避免作用域問題
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

                    executionLog.push(`Total messages after all phases: ${turnMessages.length}`);

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

                        executionLog.push(`Timing calculation - baseDelay:${baseDelay}, eventInterval:${eventInterval}`);
                        executionLog.push(`lastEventTime:${lastEventTime}, buffer:${buffer}, requiredInterval:${requiredInterval}`);
                        executionLog.push(`actualInterval adjusted to: ${actualInterval}`);

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

                // 關鍵：完整模擬所有時間調整邏輯
                executionLog.push('=== TIME ADJUSTMENT PHASE START ===');

                // 根據天命值和當前狀況調整間隔
                const destiny = this.gameEngine.gameState.player.attributes.destiny || 0;
                executionLog.push(`Player destiny: ${destiny}`);
                if (destiny >= 25) {
                    const multiplier = global.GameHelpers.randomFloat(0.8, 1.2);
                    actualInterval *= multiplier;
                    executionLog.push(`Destiny adjustment: actualInterval *= ${multiplier} = ${actualInterval}`);
                }

                // 戰鬥時加快節奏
                if (this.gameEngine.gameState.player.battlesWon > this.gameEngine.gameState.player.battlesLost + 2) {
                    actualInterval *= 0.9;
                    executionLog.push(`Battle speed adjustment: actualInterval *= 0.9 = ${actualInterval}`);
                }

                // 每10回合有機會觸發"時間流速異常"
                const currentTurn = this.gameEngine.gameState.currentTurn;
                executionLog.push(`Current turn: ${currentTurn}, is multiple of 10: ${currentTurn % 10 === 0}`);
                if (currentTurn % 10 === 0 && global.GameHelpers.checkProbability(25)) {
                    const timeEffect = global.GameHelpers.randomChoice(['accelerate', 'decelerate']);
                    if (timeEffect === 'accelerate') {
                        actualInterval *= 0.5;
                        global.gameLogger.game('時間異象', '⚡ 時光加速，回合間隔縮短！');
                        executionLog.push(`Time anomaly - accelerate: actualInterval *= 0.5 = ${actualInterval}`);
                    } else {
                        actualInterval *= 1.5;
                        global.gameLogger.game('時間異象', '🐌 時光凝滯，回合間隔延長');
                        executionLog.push(`Time anomaly - decelerate: actualInterval *= 1.5 = ${actualInterval}`);
                    }
                }

                executionLog.push('=== TIME ADJUSTMENT PHASE END ===');

                // 安排下一回合
                executionLog.push('About to schedule next turn');
                executionLog.push(`Final actualInterval: ${actualInterval}`);
                executionLog.push(`gameSpeed: ${this.gameEngine.gameState.settings.gameSpeed}`);

                const finalDelay = actualInterval / this.gameEngine.gameState.settings.gameSpeed;
                executionLog.push(`Final delay calculation: ${actualInterval} / ${this.gameEngine.gameState.settings.gameSpeed} = ${finalDelay}`);

                // 檢查計算結果是否有效
                if (isNaN(finalDelay) || finalDelay <= 0) {
                    executionLog.push(`❌ INVALID DELAY: ${finalDelay}, actualInterval=${actualInterval}, gameSpeed=${this.gameEngine.gameState.settings.gameSpeed}`);
                    return;
                }

                this.gameLoop = global.setTimeout(() => {
                    executionLog.push('Next turn callback triggered');
                    this.executeGameTurn();
                }, finalDelay);

                executionLog.push(`setTimeout ID: ${this.gameLoop}`);
                executionLog.push('=== executeGameTurn END ===');
            }
        };
    });

    describe('維護成本場景模擬', () => {
        test('應該完整模擬維護成本後的時間調整流程', async () => {
            console.log('=== 開始模擬實際遊戲場景 ===');

            await mockTurnManager.executeGameTurn();

            console.log('=== 完整執行日誌 ===');
            executionLog.forEach((log, index) => {
                console.log(`${index + 1}. ${log}`);
            });

            console.log('=== setTimeout調用分析 ===');
            timeoutCalls.forEach((call, index) => {
                console.log(`${index + 1}. Delay: ${call.delay}ms, Valid: ${!isNaN(call.delay) && call.delay > 0}`);
            });

            // 驗證執行流程
            expect(executionLog).toContain('=== executeGameTurn START ===');
            expect(executionLog).toContain('processMaintenanceCostsWithMessages START');
            expect(executionLog).toContain('processMaintenanceCostsWithMessages END, returning 1 messages');
            expect(executionLog).toContain('=== TIME ADJUSTMENT PHASE START ===');
            expect(executionLog).toContain('=== TIME ADJUSTMENT PHASE END ===');
            expect(executionLog).toContain('About to schedule next turn');
            expect(executionLog).toContain('=== executeGameTurn END ===');

            // 驗證setTimeout被正確調用
            expect(global.setTimeout).toHaveBeenCalled();
            expect(timeoutCalls.length).toBe(1);

            // 驗證延遲時間有效
            const timeoutCall = timeoutCalls[0];
            expect(timeoutCall.delay).toBeGreaterThan(0);
            expect(timeoutCall.delay).not.toBeNaN();

            // 沒有無效延遲的錯誤
            expect(executionLog.filter(log => log.includes('❌ INVALID DELAY')).length).toBe(0);
        });

        test('應該測試金錢不足導致兵力損失的情況', async () => {
            // 設置金錢不足的狀態
            mockGameEngine.gameState.player.gold = 10; // 需要60金錢維護，只有10
            mockGameEngine.gameState.player.troops = 200;

            await mockTurnManager.executeGameTurn();

            console.log('=== 金錢不足場景執行結果 ===');
            executionLog.filter(log =>
                log.includes('maintenance') ||
                log.includes('維護') ||
                log.includes('金錢') ||
                log.includes('兵力')
            ).forEach(log => console.log(log));

            // 驗證維護成本邏輯
            expect(mockGameEngine.gameState.player.gold).toBe(0);
            expect(mockGameEngine.gameState.player.troops).toBeLessThan(200);

            // 遊戲應該繼續（還有城池）
            expect(global.setTimeout).toHaveBeenCalled();
        });

        test('應該測試時間異常觸發的情況', async () => {
            // 設置第10回合觸發時間異常
            mockGameEngine.gameState.currentTurn = 9; // 會變成10

            // 強制概率檢查返回true
            global.GameHelpers.checkProbability.mockReturnValue(true);
            global.GameHelpers.randomChoice.mockReturnValue('accelerate');

            await mockTurnManager.executeGameTurn();

            console.log('=== 時間異常場景執行結果 ===');
            executionLog.filter(log =>
                log.includes('Time anomaly') ||
                log.includes('時間異象') ||
                log.includes('multiple of 10')
            ).forEach(log => console.log(log));

            // 驗證時間異常邏輯被觸發
            expect(executionLog.some(log => log.includes('Time anomaly'))).toBe(true);
            expect(global.setTimeout).toHaveBeenCalled();
        });
    });
});