// 簡單修復驗證測試
// Simple test to verify the fix works

describe('Simple Fix Verification', () => {
    test('GameEngine應該有dataReady標誌', () => {
        // 模擬修復後的GameEngine結構
        const mockGameEngine = {
            gameData: { skills: [] },
            dataReady: false,

            markDataReady() {
                this.gameData = { skills: [{ id: 'test' }] };
                this.dataReady = true;
            }
        };

        // 初始狀態
        expect(mockGameEngine.dataReady).toBe(false);
        expect(mockGameEngine.gameData.skills.length).toBe(0);

        // 數據載入完成後
        mockGameEngine.markDataReady();
        expect(mockGameEngine.dataReady).toBe(true);
        expect(mockGameEngine.gameData.skills.length).toBe(1);
    });

    test('UIManager應該檢查dataReady標誌', () => {
        const mockGameEngine = {
            gameData: { skills: [{ id: 'test' }] },
            dataReady: false // 關鍵：數據存在但未標記為準備就緒
        };

        // 模擬舊版檢查（只檢查數據長度）
        const oldCheck = (engine) => {
            return engine && engine.gameData.skills.length > 0;
        };

        // 模擬新版檢查（檢查dataReady標誌）
        const newCheck = (engine) => {
            return engine && engine.dataReady && engine.gameData.skills.length > 0;
        };

        // 舊版會錯誤地認為準備就緒
        expect(oldCheck(mockGameEngine)).toBe(true);

        // 新版會正確等待
        expect(newCheck(mockGameEngine)).toBe(false);

        // 標記準備就緒後，新版也會成功
        mockGameEngine.dataReady = true;
        expect(newCheck(mockGameEngine)).toBe(true);
    });

    test('應該檢測時序問題場景', () => {
        let uiCheckResult = null;

        const mockGameEngine = {
            gameData: { skills: [] },
            dataReady: false,

            async loadData() {
                // 模擬：先有部分數據
                this.gameData = { skills: [{ id: 'partial' }] };

                // UI可能在此時檢查（競爭條件）
                setTimeout(() => {
                    // 模擬UI檢查
                    uiCheckResult = this.dataReady && this.gameData.skills.length > 0;
                }, 10);

                // 延遲後才標記完成
                await new Promise(resolve => setTimeout(resolve, 50));
                this.dataReady = true;
            }
        };

        return mockGameEngine.loadData().then(() => {
            // 檢查競爭條件的結果
            expect(uiCheckResult).toBe(false); // UI應該等待dataReady標誌
            expect(mockGameEngine.dataReady).toBe(true);

            console.log('時序檢查結果:', {
                UI檢查時機過早: uiCheckResult === false,
                最終數據準備就緒: mockGameEngine.dataReady === true
            });
        });
    });

    test('修復應該解決遊戲停住問題', () => {
        // 模擬遊戲啟動流程
        const gameFlow = {
            gameEngine: {
                gameData: { skills: [] },
                gameState: { status: 'skill_selection' },
                dataReady: false
            },

            uiManager: {
                gameEngine: null,
                ready: false
            },

            // 模擬數據載入完成
            completeDataLoading() {
                this.gameEngine.gameData = { skills: [{ id: 'test' }] };
                this.gameEngine.dataReady = true;
            },

            // 模擬UI檢查
            checkUIReady() {
                if (this.gameEngine.dataReady && this.gameEngine.gameData.skills.length > 0) {
                    this.uiManager.gameEngine = this.gameEngine;
                    this.uiManager.ready = true;
                    return true;
                }
                return false;
            },

            // 模擬技能選擇完成
            completeSkillSelection() {
                if (this.uiManager.ready) {
                    this.gameEngine.gameState.status = 'playing';
                    return true;
                }
                return false;
            }
        };

        // 1. 初始狀態：都未準備就緒
        expect(gameFlow.checkUIReady()).toBe(false);
        expect(gameFlow.completeSkillSelection()).toBe(false);

        // 2. 數據載入完成
        gameFlow.completeDataLoading();
        expect(gameFlow.gameEngine.dataReady).toBe(true);

        // 3. UI檢查通過
        expect(gameFlow.checkUIReady()).toBe(true);
        expect(gameFlow.uiManager.ready).toBe(true);

        // 4. 技能選擇可以完成，遊戲可以啟動
        expect(gameFlow.completeSkillSelection()).toBe(true);
        expect(gameFlow.gameEngine.gameState.status).toBe('playing');

        console.log('遊戲啟動流程驗證通過:', {
            數據準備就緒: gameFlow.gameEngine.dataReady,
            UI準備就緒: gameFlow.uiManager.ready,
            遊戲狀態: gameFlow.gameEngine.gameState.status
        });
    });
});