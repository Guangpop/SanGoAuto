// 事件時間間隔測試
// Tests for event timing and delay functionality

describe('Event Timing System', () => {
    let mockLogger;
    let mockTurnManager;
    let timeoutCalls;
    let originalSetTimeout;

    beforeEach(() => {
        // 記錄所有setTimeout調用
        timeoutCalls = [];
        originalSetTimeout = global.setTimeout;

        global.setTimeout = jest.fn((callback, delay) => {
            timeoutCalls.push({ callback, delay, calledAt: Date.now() });
            return originalSetTimeout(callback, delay);
        });

        // 模擬gameLogger
        mockLogger = {
            _log: jest.fn(),
            delayedLog: function(level, category, message, data = null, delay = 0) {
                if (delay <= 0) {
                    this._log(level, category, message, data);
                } else {
                    setTimeout(() => {
                        this._log(level, category, message, data);
                    }, delay);
                }
            },
            delayedLogBatch: function(messages, baseDelay = 0, interval = 2000) {
                messages.forEach((msg, index) => {
                    const totalDelay = baseDelay + (index * interval);
                    this.delayedLog(
                        msg.level || 'GAME',
                        msg.category || '遊戲',
                        msg.message,
                        msg.data || null,
                        totalDelay
                    );
                });
            }
        };

        global.gameLogger = mockLogger;
    });

    afterEach(() => {
        global.setTimeout = originalSetTimeout;
        jest.clearAllTimers();
    });

    describe('delayedLogBatch 時間間隔測試', () => {
        test('應該以正確的間隔安排事件', () => {
            const messages = [
                { message: '事件1' },
                { message: '事件2' },
                { message: '事件3' }
            ];

            mockLogger.delayedLogBatch(messages, 200, 2000);

            // 檢查setTimeout調用次數
            expect(global.setTimeout).toHaveBeenCalledTimes(3);

            // 檢查延遲時間是否正確
            const delays = timeoutCalls.map(call => call.delay);
            expect(delays).toEqual([200, 2200, 4200]);
        });

        test('應該計算正確的總顯示時間', () => {
            const messages = [
                { message: '事件1' },
                { message: '事件2' },
                { message: '事件3' },
                { message: '事件4' }
            ];

            mockLogger.delayedLogBatch(messages, 200, 2000);

            const delays = timeoutCalls.map(call => call.delay);
            const maxDelay = Math.max(...delays);

            // 4個事件：基礎200ms + (3 * 2000ms) = 6200ms
            expect(maxDelay).toBe(6200);
        });

        test('應該檢測時間衝突問題', () => {
            // 模擬回合系統的問題
            const turnInterval = 3000; // 回合間隔3秒
            const eventInterval = 2000; // 事件間隔2秒
            const baseDelay = 200;

            const messages = [
                { message: '回合1事件1' },
                { message: '回合1事件2' },
                { message: '回合1事件3' }
            ];

            mockLogger.delayedLogBatch(messages, baseDelay, eventInterval);

            const lastEventTime = baseDelay + ((messages.length - 1) * eventInterval);

            // 檢查是否超過回合間隔
            expect(lastEventTime).toBeGreaterThan(turnInterval);

            console.log(`回合間隔: ${turnInterval}ms`);
            console.log(`最後事件顯示時間: ${lastEventTime}ms`);
            console.log(`時間衝突: ${lastEventTime > turnInterval ? '是' : '否'}`);
        });
    });

    describe('回合時間管理測試', () => {
        test('應該計算適當的回合間隔', () => {
            // 測試不同事件數量下的最佳回合間隔
            const testCases = [
                { events: 1, expected: 2200 }, // 200 + 0*2000 = 200ms
                { events: 2, expected: 2400 }, // 200 + 1*2000 = 2200ms
                { events: 3, expected: 4400 }, // 200 + 2*2000 = 4200ms
                { events: 4, expected: 6400 }, // 200 + 3*2000 = 6200ms
                { events: 5, expected: 8400 }  // 200 + 4*2000 = 8200ms
            ];

            testCases.forEach(({ events, expected }) => {
                const baseDelay = 200;
                const eventInterval = 2000;
                const buffer = 200; // 緩衝時間

                const lastEventTime = baseDelay + ((events - 1) * eventInterval);
                const recommendedTurnInterval = lastEventTime + buffer;

                expect(recommendedTurnInterval).toBe(expected);
            });
        });

        test('應該驗證動態回合間隔計算', () => {
            // 模擬動態調整回合間隔的邏輯
            const calculateTurnInterval = (messageCount) => {
                const baseDelay = 200;
                const eventInterval = 2000;
                const buffer = 500; // 增加緩衝時間

                const lastEventTime = baseDelay + ((messageCount - 1) * eventInterval);
                return Math.max(3000, lastEventTime + buffer); // 最小3秒
            };

            expect(calculateTurnInterval(1)).toBe(3000); // 最小間隔
            expect(calculateTurnInterval(2)).toBe(3000); // 2700 < 3000，使用最小值
            expect(calculateTurnInterval(3)).toBe(4700); // 4200 + 500
            expect(calculateTurnInterval(4)).toBe(6700); // 6200 + 500
        });
    });

    describe('實際時間測試', () => {
        jest.useFakeTimers();

        test('應該按正確順序觸發事件', () => {
            const messages = [
                { message: '第一個事件' },
                { message: '第二個事件' },
                { message: '第三個事件' }
            ];

            mockLogger.delayedLogBatch(messages, 100, 1000);

            // 初始狀態，沒有事件觸發
            expect(mockLogger._log).not.toHaveBeenCalled();

            // 前進100ms，第一個事件應該觸發
            jest.advanceTimersByTime(100);
            expect(mockLogger._log).toHaveBeenCalledTimes(1);
            expect(mockLogger._log).toHaveBeenLastCalledWith('GAME', '遊戲', '第一個事件', null);

            // 前進1000ms，第二個事件應該觸發
            jest.advanceTimersByTime(1000);
            expect(mockLogger._log).toHaveBeenCalledTimes(2);
            expect(mockLogger._log).toHaveBeenLastCalledWith('GAME', '遊戲', '第二個事件', null);

            // 前進1000ms，第三個事件應該觸發
            jest.advanceTimersByTime(1000);
            expect(mockLogger._log).toHaveBeenCalledTimes(3);
            expect(mockLogger._log).toHaveBeenLastCalledWith('GAME', '遊戲', '第三個事件', null);
        });

        jest.useRealTimers();
    });
});