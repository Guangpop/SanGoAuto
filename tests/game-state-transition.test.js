// 遊戲狀態轉換測試 - 診斷從技能選擇到主遊戲的狀態轉換
// Tests for game state transitions from skill selection to main game

describe('Game State Transition', () => {
    let mockGameEngine;
    let mockSkillSystem;
    let mockTurnManager;

    beforeEach(() => {
        // 模擬gameLogger
        global.gameLogger = {
            game: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            logSkillSelection: jest.fn(),
            logAttributeAllocation: jest.fn(),
            delayedLogBatch: jest.fn()
        };

        // 模擬GameHelpers
        global.GameHelpers = {
            randomPercent: jest.fn(() => 50),
            randomInt: jest.fn(() => 5),
            randomChoice: jest.fn(() => 'test'),
            randomChoices: jest.fn((arr, count) => arr.slice(0, count))
        };

        // 模擬turnManager
        mockTurnManager = {
            startMainGameLoop: jest.fn()
        };

        // 模擬gameEngine
        mockGameEngine = {
            gameData: {
                skills: [
                    { id: 'skill1', name: '技能1', starCost: 1, effects: [] },
                    { id: 'skill2', name: '技能2', starCost: 2, effects: [] }
                ]
            },
            gameState: {
                player: {
                    attributes: {
                        strength: 10, intelligence: 10, leadership: 10,
                        politics: 10, charisma: 10, destiny: 0
                    },
                    skills: []
                },
                status: 'skill_selection' // 關鍵：初始狀態
            },
            turnManager: mockTurnManager
        };

        // 創建SkillSystem實例
        mockSkillSystem = {
            gameEngine: mockGameEngine,
            skillSelection: null,

            startSkillSelection() {
                this.skillSelection = {
                    availableSkills: this.gameEngine.gameData.skills.slice(0, 3),
                    selectedSkills: [],
                    remainingStars: 10,
                    round: 1,
                    maxRounds: 3
                };
            },

            finishSkillSelection() {
                // 剩餘星星轉換為屬性點（簡化版本）
                const totalPoints = this.skillSelection.remainingStars * 10;
                const attributes = ['strength', 'intelligence', 'leadership', 'politics', 'charisma'];

                for (let i = 0; i < totalPoints; i++) {
                    const attr = attributes[i % attributes.length];
                    this.gameEngine.gameState.player.attributes[attr]++;
                }

                // 將選中的技能添加到玩家
                this.gameEngine.gameState.player.skills = [...this.skillSelection.selectedSkills];

                global.gameLogger.logAttributeAllocation(this.gameEngine.gameState.player.attributes);

                // 開始主遊戲循環 - 關鍵步驟
                this.gameEngine.gameState.status = 'playing';
                this.gameEngine.turnManager.startMainGameLoop();
            },

            selectSkill(skillId) {
                const skill = this.skillSelection.availableSkills.find(s => s.id === skillId);
                if (!skill || skill.starCost > this.skillSelection.remainingStars) {
                    return false;
                }

                this.skillSelection.remainingStars -= skill.starCost;
                this.skillSelection.selectedSkills.push(skill);
                this.skillSelection.round++;

                if (this.skillSelection.round > this.skillSelection.maxRounds) {
                    this.finishSkillSelection();
                }

                return true;
            }
        };
    });

    describe('技能選擇到主遊戲轉換', () => {
        test('應該從skill_selection狀態開始', () => {
            expect(mockGameEngine.gameState.status).toBe('skill_selection');
        });

        test('技能選擇完成後應該設置為playing狀態', () => {
            mockSkillSystem.startSkillSelection();

            // 模擬完成3輪技能選擇
            mockSkillSystem.selectSkill('skill1'); // 第1輪
            mockSkillSystem.selectSkill('skill2'); // 第2輪
            mockSkillSystem.selectSkill('skill1'); // 第3輪，觸發完成

            expect(mockGameEngine.gameState.status).toBe('playing');
            expect(mockTurnManager.startMainGameLoop).toHaveBeenCalled();
        });

        test('應該正確處理技能選擇數據', () => {
            mockSkillSystem.startSkillSelection();

            const initialStars = mockSkillSystem.skillSelection.remainingStars;
            const result = mockSkillSystem.selectSkill('skill1');

            expect(result).toBe(true);
            expect(mockSkillSystem.skillSelection.remainingStars).toBe(initialStars - 1);
            expect(mockSkillSystem.skillSelection.selectedSkills).toHaveLength(1);
        });

        test('應該將選中技能添加到玩家', () => {
            mockSkillSystem.startSkillSelection();

            // 完成技能選擇流程
            mockSkillSystem.selectSkill('skill1');
            mockSkillSystem.selectSkill('skill2');
            mockSkillSystem.selectSkill('skill1');

            expect(mockGameEngine.gameState.player.skills).toHaveLength(3);
            expect(global.gameLogger.logAttributeAllocation).toHaveBeenCalled();
        });

        test('應該轉換剩餘星星為屬性點', () => {
            mockSkillSystem.startSkillSelection();

            const initialAttributes = { ...mockGameEngine.gameState.player.attributes };

            // 完成技能選擇（會有剩餘星星）
            mockSkillSystem.selectSkill('skill1'); // 消耗1星，剩9星
            mockSkillSystem.selectSkill('skill1'); // 消耗1星，剩8星
            mockSkillSystem.selectSkill('skill1'); // 消耗1星，剩7星

            // 檢查屬性是否增加（7星 * 10 = 70點屬性）
            const totalAttributeIncrease = Object.keys(initialAttributes).reduce((sum, attr) => {
                return sum + (mockGameEngine.gameState.player.attributes[attr] - initialAttributes[attr]);
            }, 0);

            expect(totalAttributeIncrease).toBe(70);
        });
    });

    describe('狀態轉換問題診斷', () => {
        test('應該檢測狀態轉換失敗', () => {
            // 模擬狀態轉換失敗的情況
            const brokenSkillSystem = {
                ...mockSkillSystem,
                finishSkillSelection() {
                    // 故意不設置狀態為playing
                    this.gameEngine.turnManager.startMainGameLoop();
                }
            };

            brokenSkillSystem.startSkillSelection();

            // 模擬完成技能選擇
            brokenSkillSystem.finishSkillSelection();

            // 狀態應該仍然是skill_selection（問題）
            expect(mockGameEngine.gameState.status).toBe('skill_selection');
            expect(mockTurnManager.startMainGameLoop).toHaveBeenCalled();

            console.log('狀態轉換失敗診斷:', {
                遊戲狀態: mockGameEngine.gameState.status,
                startMainGameLoop是否被調用: mockTurnManager.startMainGameLoop.mock.calls.length > 0
            });
        });

        test('應該檢測executeGameTurn的狀態檢查', () => {
            // 模擬executeGameTurn的邏輯
            const mockExecuteGameTurn = () => {
                if (mockGameEngine.gameState.status !== 'playing') {
                    console.log('executeGameTurn退出：狀態不是playing，當前狀態:', mockGameEngine.gameState.status);
                    return false;
                }
                return true;
            };

            // 狀態為skill_selection時
            mockGameEngine.gameState.status = 'skill_selection';
            expect(mockExecuteGameTurn()).toBe(false);

            // 狀態為playing時
            mockGameEngine.gameState.status = 'playing';
            expect(mockExecuteGameTurn()).toBe(true);
        });

        test('應該檢測完整的遊戲啟動流程', () => {
            console.log('=== 遊戲啟動流程診斷 ===');

            // 1. 初始狀態
            console.log('1. 初始狀態:', mockGameEngine.gameState.status);

            // 2. 開始技能選擇
            mockSkillSystem.startSkillSelection();
            console.log('2. 技能選擇啟動後:', mockGameEngine.gameState.status);

            // 3. 完成技能選擇
            mockSkillSystem.selectSkill('skill1');
            mockSkillSystem.selectSkill('skill2');
            mockSkillSystem.selectSkill('skill1'); // 第3輪完成

            console.log('3. 技能選擇完成後:', mockGameEngine.gameState.status);
            console.log('4. startMainGameLoop調用次數:', mockTurnManager.startMainGameLoop.mock.calls.length);

            expect(mockGameEngine.gameState.status).toBe('playing');
            expect(mockTurnManager.startMainGameLoop).toHaveBeenCalled();
        });
    });
});