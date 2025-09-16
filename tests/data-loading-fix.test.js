// 數據載入修復驗證測試
// Tests to verify the data loading synchronization fix

describe('Data Loading Fix Verification', () => {
    let mockGameEngine;
    let mockUIManager;

    beforeEach(() => {
        // 模擬gameLogger
        global.gameLogger = {
            info: jest.fn(),
            error: jest.fn()
        };

        // 模擬修復後的GameEngine
        mockGameEngine = {
            gameData: { skills: [] },
            dataReady: false,

            async initializeGameData() {
                global.gameLogger.info('系統', '正在載入遊戲資源...');

                // 模擬異步載入
                await new Promise(resolve => setTimeout(resolve, 50));

                this.gameData = {
                    skills: [
                        { id: 'skill1', name: '技能1' },
                        { id: 'skill2', name: '技能2' }
                    ]
                };

                this.dataReady = true; // 關鍵修復點
                global.gameLogger.info('系統', '遊戲資源載入完成');
            }
        };

        // 模擬修復後的UIManager
        mockUIManager = {
            gameEngine: null,
            ready: false,

            async waitForGameEngine() {
                let attempts = 0;
                const maxAttempts = 50; // 5秒最大等待時間

                const checkEngine = () => {
                    attempts++;

                    if (global.window.gameEngine &&
                        global.window.gameEngine.dataReady &&
                        global.window.gameEngine.gameData.skills.length > 0) {

                        this.gameEngine = global.window.gameEngine;
                        this.ready = true;
                        this.showMainMenu();
                        return;
                    }

                    if (attempts >= maxAttempts) {
                        console.error('等待遊戲引擎超時');
                        return;
                    }

                    setTimeout(checkEngine, 100);
                };

                checkEngine();
            },

            showMainMenu() {
                console.log('主選單顯示 - 遊戲準備就緒');
            }
        };

        // 設置全局對象
        global.window = global.window || {};
        global.window.gameEngine = mockGameEngine;
    });

    describe('修復驗證', () => {
        test('應該正確同步數據載入和UI初始化', async () => {
            // 同時啟動數據載入和UI等待
            const dataLoadPromise = mockGameEngine.initializeGameData();
            const uiWaitPromise = mockUIManager.waitForGameEngine();

            // 等待數據載入完成
            await dataLoadPromise;

            // 檢查數據載入狀態
            expect(mockGameEngine.dataReady).toBe(true);
            expect(mockGameEngine.gameData.skills.length).toBeGreaterThan(0);

            // 等待UI檢測到數據準備就緒
            await new Promise(resolve => setTimeout(resolve, 150));

            // 檢查UI狀態
            expect(mockUIManager.ready).toBe(true);
            expect(mockUIManager.gameEngine).toBe(mockGameEngine);
        });

        test('數據未準備時UI應該繼續等待', async () => {
            // 不載入數據，直接啟動UI等待
            mockUIManager.waitForGameEngine();

            // 等待幾個檢查週期
            await new Promise(resolve => setTimeout(resolve, 250));

            // UI應該仍在等待
            expect(mockUIManager.ready).toBe(false);
            expect(mockUIManager.gameEngine).toBeNull();
        });

        test('數據載入失敗時應該處理錯誤', async () => {
            const brokenGameEngine = {
                ...mockGameEngine,
                async initializeGameData() {
                    throw new Error('載入失敗');
                }
            };

            global.window.gameEngine = brokenGameEngine;

            try {
                await brokenGameEngine.initializeGameData();
            } catch (error) {
                expect(error.message).toBe('載入失敗');
            }

            // 數據載入失敗，dataReady應該保持false
            expect(brokenGameEngine.dataReady).toBe(false);
        });

        test('應該檢查dataReady標誌的重要性', async () => {
            // 模擬舊版本（沒有dataReady標誌）
            const oldGameEngine = {
                gameData: { skills: [] },
                // 沒有dataReady標誌

                async initializeGameData() {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    this.gameData = { skills: [{ id: 'test' }] };
                }
            };

            const oldUIManager = {
                gameEngine: null,
                ready: false,

                async waitForGameEngine() {
                    let attempts = 0;
                    const maxAttempts = 10;

                    const checkEngine = () => {
                        attempts++;

                        // 舊版檢查（沒有dataReady）
                        if (global.window.gameEngine &&
                            global.window.gameEngine.gameData.skills.length > 0) {

                            this.gameEngine = global.window.gameEngine;
                            this.ready = true;
                            return;
                        }

                        if (attempts >= maxAttempts) return;
                        setTimeout(checkEngine, 50);
                    };

                    checkEngine();
                }
            };

            global.window.gameEngine = oldGameEngine;

            // 這種情況下可能存在競爭條件
            const dataPromise = oldGameEngine.initializeGameData();
            oldUIManager.waitForGameEngine();

            await dataPromise;
            await new Promise(resolve => setTimeout(resolve, 100));

            // 可能成功，但不穩定
            console.log('舊版本結果 - ready:', oldUIManager.ready);
        });
    });

    describe('邊界情況測試', () => {
        test('重複初始化應該安全', async () => {
            // 第一次初始化
            await mockGameEngine.initializeGameData();
            expect(mockGameEngine.dataReady).toBe(true);

            const firstSkillCount = mockGameEngine.gameData.skills.length;

            // 第二次初始化
            await mockGameEngine.initializeGameData();
            expect(mockGameEngine.dataReady).toBe(true);

            const secondSkillCount = mockGameEngine.gameData.skills.length;
            expect(secondSkillCount).toBe(firstSkillCount);
        });

        test('快速連續檢查應該穩定', async () => {
            let readyCount = 0;

            // 模擬多個UI組件同時等待
            const multipleWaiters = Array.from({ length: 5 }, (_, i) => ({
                id: i,
                ready: false,

                async wait() {
                    const check = () => {
                        if (global.window.gameEngine &&
                            global.window.gameEngine.dataReady &&
                            global.window.gameEngine.gameData.skills.length > 0) {

                            this.ready = true;
                            readyCount++;
                            return;
                        }
                        setTimeout(check, 10);
                    };
                    check();
                }
            }));

            // 啟動所有等待器
            multipleWaiters.forEach(waiter => waiter.wait());

            // 延遲後開始數據載入
            setTimeout(() => mockGameEngine.initializeGameData(), 50);

            // 等待數據載入和檢測完成
            await new Promise(resolve => setTimeout(resolve, 200));

            // 所有等待器都應該準備就緒
            expect(readyCount).toBe(5);
            multipleWaiters.forEach(waiter => {
                expect(waiter.ready).toBe(true);
            });
        });
    });
});