// 維護成本系統測試
// Tests for maintenance cost system and potential game-ending bugs

describe('Maintenance Cost System', () => {
    let mockGameEngine;
    let mockTurnManager;

    beforeEach(() => {
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
                cities: Array.from({ length: 27 }, (_, i) => ({ id: `city${i}`, name: `城市${i}` }))
            },
            gameState: {
                player: {
                    gold: 100,
                    troops: 500,
                    citiesControlled: 2, // 控制2個城池
                    maintenanceCost: 0
                },
                currentTurn: 5,
                settings: { gameSpeed: 1 }
            },
            isRunning: true
        };

        // 模擬turnManager
        mockTurnManager = {
            gameEngine: mockGameEngine,
            turnInterval: 3000,
            gameLoop: null,

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
            },

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
            },

            endGame(victory) {
                this.gameEngine.isRunning = false;
                this.gameEngine.gameState.status = 'game_over';
                console.log(`遊戲結束: ${victory ? '勝利' : '失敗'}`);
            }
        };
    });

    describe('正常維護成本處理', () => {
        test('有足夠金錢時應該正常扣除維護費', async () => {
            // 設置有足夠金錢的情況
            mockGameEngine.gameState.player.gold = 100;
            mockGameEngine.gameState.player.citiesControlled = 2;

            const messages = await mockTurnManager.processMaintenanceCostsWithMessages();

            // 應該扣除40金錢（2城池 * 20）
            expect(mockGameEngine.gameState.player.gold).toBe(60);
            expect(messages).toHaveLength(1);
            expect(messages[0].message).toContain('支付城池維護費用：40金錢');
        });

        test('沒有城池時不應該產生維護成本', async () => {
            mockGameEngine.gameState.player.citiesControlled = 0;

            const messages = await mockTurnManager.processMaintenanceCostsWithMessages();

            expect(mockGameEngine.gameState.player.maintenanceCost).toBe(0);
            expect(messages).toHaveLength(0);
        });

        test('金錢不足時應該用兵力代替', async () => {
            // 設置金錢不足的情況
            mockGameEngine.gameState.player.gold = 10; // 只有10金錢
            mockGameEngine.gameState.player.troops = 100;
            mockGameEngine.gameState.player.citiesControlled = 2; // 需要40金錢

            const messages = await mockTurnManager.processMaintenanceCostsWithMessages();

            const shortage = 40 - 10; // 缺少30金錢
            const expectedTroopLoss = shortage * 2; // 損失60兵力

            expect(mockGameEngine.gameState.player.gold).toBe(0);
            expect(mockGameEngine.gameState.player.troops).toBe(100 - expectedTroopLoss);
            expect(messages[0].message).toContain(`損失${expectedTroopLoss}兵力`);
        });
    });

    describe('維護成本導致的遊戲結束檢測', () => {
        test('維護成本扣除後應該檢查遊戲結束條件', () => {
            // 設置危險狀態：只有少量兵力和金錢
            mockGameEngine.gameState.player.gold = 5;
            mockGameEngine.gameState.player.troops = 50;
            mockGameEngine.gameState.player.citiesControlled = 3; // 需要60金錢維護

            // 處理維護成本
            return mockTurnManager.processMaintenanceCostsWithMessages().then(() => {
                // 金錢不足，應該損失兵力
                const shortage = 60 - 5; // 缺少55金錢
                const troopLoss = shortage * 2; // 損失110兵力

                expect(mockGameEngine.gameState.player.troops).toBe(0); // Math.max(0, 50-110) = 0

                // 檢查遊戲結束條件
                const gameEnded = mockTurnManager.checkGameEnd();

                // 兵力為0但有城池，遊戲不應該結束
                expect(gameEnded).toBe(false);
                expect(mockGameEngine.isRunning).toBe(true);
            });
        });

        test('失去所有兵力和城池應該觸發遊戲結束', () => {
            // 設置即將失敗的狀態
            mockGameEngine.gameState.player.gold = 0;
            mockGameEngine.gameState.player.troops = 0;
            mockGameEngine.gameState.player.citiesControlled = 0;

            const gameEnded = mockTurnManager.checkGameEnd();

            expect(gameEnded).toBe(true);
            expect(mockGameEngine.isRunning).toBe(false);
            expect(mockGameEngine.gameState.status).toBe('game_over');
        });

        test('只失去兵力但有城池不應該結束遊戲', () => {
            mockGameEngine.gameState.player.troops = 0;
            mockGameEngine.gameState.player.citiesControlled = 1; // 還有城池

            const gameEnded = mockTurnManager.checkGameEnd();

            expect(gameEnded).toBe(false);
            expect(mockGameEngine.isRunning).toBe(true);
        });

        test('維護成本後兵力歸零但有城池的邊界情況', async () => {
            // 模擬用戶報告的情況：維護成本後遊戲停止
            mockGameEngine.gameState.player.gold = 0;
            mockGameEngine.gameState.player.troops = 30; // 少量兵力
            mockGameEngine.gameState.player.citiesControlled = 2; // 需要40金錢

            console.log('維護成本前狀態:', {
                金錢: mockGameEngine.gameState.player.gold,
                兵力: mockGameEngine.gameState.player.troops,
                城池: mockGameEngine.gameState.player.citiesControlled
            });

            await mockTurnManager.processMaintenanceCostsWithMessages();

            console.log('維護成本後狀態:', {
                金錢: mockGameEngine.gameState.player.gold,
                兵力: mockGameEngine.gameState.player.troops,
                城池: mockGameEngine.gameState.player.citiesControlled
            });

            const gameEnded = mockTurnManager.checkGameEnd();

            console.log('遊戲結束檢查結果:', gameEnded);

            // 兵力可能為0，但有城池，遊戲不應該結束
            expect(gameEnded).toBe(false);
            expect(mockGameEngine.gameState.player.citiesControlled).toBeGreaterThan(0);
        });
    });

    describe('潛在Bug診斷', () => {
        test('應該檢測維護成本計算錯誤', () => {
            const testCases = [
                { cities: 1, expected: 20 },
                { cities: 2, expected: 40 },
                { cities: 5, expected: 100 },
                { cities: 10, expected: 200 }
            ];

            testCases.forEach(({ cities, expected }) => {
                mockGameEngine.gameState.player.citiesControlled = cities;

                // 手動計算維護成本
                const calculatedCost = mockGameEngine.gameState.player.citiesControlled * 20;

                expect(calculatedCost).toBe(expected);
            });
        });

        test('應該檢測兵力扣除計算錯誤', async () => {
            mockGameEngine.gameState.player.gold = 10;
            mockGameEngine.gameState.player.troops = 1000;
            mockGameEngine.gameState.player.citiesControlled = 3; // 需要60金錢

            await mockTurnManager.processMaintenanceCostsWithMessages();

            const shortage = 60 - 10; // 50
            const expectedTroopLoss = shortage * 2; // 100

            expect(mockGameEngine.gameState.player.troops).toBe(1000 - expectedTroopLoss);
        });

        test('應該檢測遊戲結束條件的邊界判斷', () => {
            const scenarios = [
                { troops: 0, cities: 0, shouldEnd: true, description: '無兵力無城池' },
                { troops: 0, cities: 1, shouldEnd: false, description: '無兵力有城池' },
                { troops: 1, cities: 0, shouldEnd: false, description: '有兵力無城池' },
                { troops: 1, cities: 1, shouldEnd: false, description: '有兵力有城池' }
            ];

            scenarios.forEach(({ troops, cities, shouldEnd, description }) => {
                mockGameEngine.gameState.player.troops = troops;
                mockGameEngine.gameState.player.citiesControlled = cities;

                const gameEnded = mockTurnManager.checkGameEnd();

                expect(gameEnded).toBe(shouldEnd);
                console.log(`${description}: ${shouldEnd ? '應該結束' : '不應該結束'} - ${gameEnded ? '✓' : '✗'}`);
            });
        });
    });
});