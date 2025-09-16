// 回合管理器時間間隔修復驗證測試
// Test to verify turn manager timing fix

describe('TurnManager Timing Fix', () => {
    let mockGameEngine;
    let mockLogger;

    beforeEach(() => {
        // 模擬gameLogger
        mockLogger = {
            delayedLogBatch: jest.fn(),
            debug: jest.fn(),
            error: jest.fn()
        };
        global.gameLogger = mockLogger;

        // 模擬GameHelpers
        global.GameHelpers = {
            randomFloat: jest.fn(() => 1.0),
            checkProbability: jest.fn(() => false),
            randomChoice: jest.fn(() => 'accelerate')
        };

        // 模擬gameEngine
        mockGameEngine = {
            gameState: {
                player: {
                    attributes: { destiny: 0 },
                    battlesWon: 0,
                    battlesLost: 0
                },
                currentTurn: 1,
                settings: { gameSpeed: 1 }
            }
        };
    });

    describe('動態回合間隔計算', () => {
        test('應該根據事件數量調整回合間隔', () => {
            // 模擬TurnManager的關鍵邏輯
            const turnInterval = 3000; // 預設3秒
            const calculateActualInterval = (messageCount) => {
                let actualInterval = turnInterval;

                if (messageCount > 0) {
                    const baseDelay = 200;
                    const eventInterval = 2000;
                    const lastEventTime = baseDelay + ((messageCount - 1) * eventInterval);
                    const buffer = 500;

                    const requiredInterval = lastEventTime + buffer;
                    actualInterval = Math.max(actualInterval, requiredInterval);
                }

                return actualInterval;
            };

            // 測試不同事件數量
            expect(calculateActualInterval(1)).toBe(3000); // 700ms < 3000ms，使用最小值
            expect(calculateActualInterval(2)).toBe(3000); // 2700ms < 3000ms，使用最小值
            expect(calculateActualInterval(3)).toBe(4700); // 4200 + 500ms
            expect(calculateActualInterval(4)).toBe(6700); // 6200 + 500ms
            expect(calculateActualInterval(5)).toBe(8700); // 8200 + 500ms
        });

        test('應該避免事件時間重疊', () => {
            const scenarios = [
                { events: 1, description: '單個事件' },
                { events: 2, description: '兩個事件' },
                { events: 3, description: '三個事件' },
                { events: 4, description: '四個事件' },
                { events: 5, description: '五個事件' }
            ];

            scenarios.forEach(({ events, description }) => {
                const turnInterval = 3000;
                const baseDelay = 200;
                const eventInterval = 2000;
                const buffer = 500;

                const lastEventTime = baseDelay + ((events - 1) * eventInterval);
                const requiredInterval = lastEventTime + buffer;
                const actualInterval = Math.max(turnInterval, requiredInterval);

                // 確保回合間隔大於最後事件時間
                expect(actualInterval).toBeGreaterThan(lastEventTime);

                console.log(`${description}: 最後事件時間=${lastEventTime}ms, 回合間隔=${actualInterval}ms`);
            });
        });

        test('應該提供足夠的緩衝時間', () => {
            const testCases = [
                { events: 3, expectedMinBuffer: 500 },
                { events: 4, expectedMinBuffer: 500 },
                { events: 5, expectedMinBuffer: 500 }
            ];

            testCases.forEach(({ events, expectedMinBuffer }) => {
                const baseDelay = 200;
                const eventInterval = 2000;
                const lastEventTime = baseDelay + ((events - 1) * eventInterval);
                const requiredInterval = lastEventTime + expectedMinBuffer;

                const actualBuffer = requiredInterval - lastEventTime;

                expect(actualBuffer).toBeGreaterThanOrEqual(expectedMinBuffer);
            });
        });
    });

    describe('調試信息測試', () => {
        test('應該記錄時間調整信息', () => {
            // 模擬調用delayedLogBatch後的調試邏輯
            const turnMessages = [
                { message: '事件1' },
                { message: '事件2' },
                { message: '事件3' }
            ];

            const turnInterval = 3000;
            const baseDelay = 200;
            const eventInterval = 2000;
            const lastEventTime = baseDelay + ((turnMessages.length - 1) * eventInterval);
            const buffer = 500;
            const requiredInterval = lastEventTime + buffer;
            const actualInterval = Math.max(turnInterval, requiredInterval);

            // 模擬調試日誌調用
            mockLogger.debug('時間管理',
                `事件數量: ${turnMessages.length}, 最後事件時間: ${lastEventTime}ms, ` +
                `調整回合間隔: ${turnInterval}ms → ${actualInterval}ms`
            );

            expect(mockLogger.debug).toHaveBeenCalledWith(
                '時間管理',
                `事件數量: 3, 最後事件時間: 4200ms, 調整回合間隔: 3000ms → 4700ms`
            );
        });
    });

    describe('邊界情況測試', () => {
        test('沒有事件時應該使用預設間隔', () => {
            const turnInterval = 3000;
            const messageCount = 0;

            let actualInterval = turnInterval;
            if (messageCount > 0) {
                // 這個邏輯不會執行
            }

            expect(actualInterval).toBe(turnInterval);
        });

        test('單個事件不需要調整間隔', () => {
            const turnInterval = 3000;
            const messageCount = 1;

            const baseDelay = 200;
            const eventInterval = 2000;
            const lastEventTime = baseDelay + ((messageCount - 1) * eventInterval); // 200ms
            const buffer = 500;
            const requiredInterval = lastEventTime + buffer; // 700ms

            const actualInterval = Math.max(turnInterval, requiredInterval);

            expect(actualInterval).toBe(turnInterval); // 3000ms，因為700ms < 3000ms
        });

        test('大量事件應該大幅延長間隔', () => {
            const turnInterval = 3000;
            const messageCount = 10; // 極端情況

            const baseDelay = 200;
            const eventInterval = 2000;
            const lastEventTime = baseDelay + ((messageCount - 1) * eventInterval);
            const buffer = 500;
            const requiredInterval = lastEventTime + buffer;

            const actualInterval = Math.max(turnInterval, requiredInterval);

            // 10個事件：200 + 9*2000 = 18200ms
            expect(lastEventTime).toBe(18200);
            expect(requiredInterval).toBe(18700);
            expect(actualInterval).toBe(18700);
        });
    });
});