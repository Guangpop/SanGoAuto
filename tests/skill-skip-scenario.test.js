// 技能跳過場景測試 - 測試用戶跳過所有技能選擇輪次的情況
// Tests for scenarios where user skips all skill selection rounds

describe('Skill Skip Scenarios', () => {
    let mockGameEngine;
    let mockSkillSystem;

    beforeEach(() => {
        // 模擬gameLogger
        global.gameLogger = {
            game: jest.fn(),
            logAttributeAllocation: jest.fn()
        };

        // 模擬GameHelpers
        global.GameHelpers = {
            randomPercent: jest.fn(() => 50),
            randomInt: jest.fn(() => 3),
            randomChoice: jest.fn(arr => arr[0]),
            randomChoices: jest.fn((arr, count) => arr.slice(0, count))
        };

        // 模擬turnManager
        const mockTurnManager = {
            startMainGameLoop: jest.fn()
        };

        // 模擬gameEngine
        mockGameEngine = {
            gameData: {
                skills: [
                    { id: 'skill1', name: '技能1', starCost: 1, effects: [] },
                    { id: 'skill2', name: '技能2', starCost: 2, effects: [] },
                    { id: 'skill3', name: '技能3', starCost: 3, effects: [] }
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
                status: 'skill_selection'
            },
            turnManager: mockTurnManager
        };

        // 模擬真實的SkillSystem行為
        mockSkillSystem = {
            gameEngine: mockGameEngine,
            skillSelection: null,

            startSkillSelection() {
                this.skillSelection = {
                    availableSkills: [],
                    selectedSkills: [],
                    remainingStars: 10,
                    round: 1,
                    maxRounds: 3
                };

                global.gameLogger.game('技能選擇', '🌟 開始天命技能選擇，共3輪，每輪從3個技能中選擇1個');
                this.generateSkillChoices();
            },

            generateSkillChoices() {
                let skillPool = [...this.gameEngine.gameData.skills];

                if (this.skillSelection.round === 1) {
                    skillPool = skillPool.filter(skill => skill.starCost <= 2);
                }

                const unavailableSkills = this.skillSelection.selectedSkills.map(s => s.id);
                skillPool = skillPool.filter(skill => !unavailableSkills.includes(skill.id));

                this.skillSelection.availableSkills = global.GameHelpers.randomChoices(skillPool, 3);

                global.gameLogger.game('技能選擇',
                    `第${this.skillSelection.round}輪技能選擇：`,
                    this.skillSelection.availableSkills.map(s => `${s.name}(${s.starCost}星)`)
                );
            },

            skipSkillRound() {
                global.gameLogger.game('技能選擇', `跳過第${this.skillSelection.round}輪技能選擇`);
                this.nextSkillRound();
            },

            nextSkillRound() {
                this.skillSelection.round++;

                if (this.skillSelection.round > this.skillSelection.maxRounds) {
                    this.finishSkillSelection();
                } else {
                    this.generateSkillChoices();
                }
            },

            finishSkillSelection() {
                // 剩餘星星轉換為屬性點
                this.convertStarsToAttributes();

                // 將選中的技能添加到玩家
                this.gameEngine.gameState.player.skills = [...this.skillSelection.selectedSkills];

                global.gameLogger.logAttributeAllocation(this.gameEngine.gameState.player.attributes);

                // 開始主遊戲循環
                this.gameEngine.gameState.status = 'playing';
                this.gameEngine.turnManager.startMainGameLoop();
            },

            convertStarsToAttributes() {
                const totalPoints = this.skillSelection.remainingStars * 10;
                const attributes = ['strength', 'intelligence', 'leadership', 'politics', 'charisma'];

                global.gameLogger.game('屬性分配', `剩餘${this.skillSelection.remainingStars}星轉換為${totalPoints}屬性點`);

                // 簡化版屬性分配
                for (let i = 0; i < totalPoints; i++) {
                    const attr = global.GameHelpers.randomChoice(attributes);
                    this.gameEngine.gameState.player.attributes[attr]++;
                }

                if (this.skillSelection.remainingStars >= 5) {
                    const bonusAttr = global.GameHelpers.randomChoice(attributes);
                    this.gameEngine.gameState.player.attributes[bonusAttr] += global.GameHelpers.randomInt(2, 5);
                }
            }
        };
    });

    describe('跳過所有技能選擇輪次', () => {
        test('應該能夠跳過第1輪', () => {
            mockSkillSystem.startSkillSelection();

            expect(mockSkillSystem.skillSelection.round).toBe(1);

            mockSkillSystem.skipSkillRound();

            expect(mockSkillSystem.skillSelection.round).toBe(2);
            expect(global.gameLogger.game).toHaveBeenCalledWith('技能選擇', '跳過第1輪技能選擇');
        });

        test('應該能夠跳過第2輪', () => {
            mockSkillSystem.startSkillSelection();
            mockSkillSystem.skipSkillRound(); // 跳過第1輪

            expect(mockSkillSystem.skillSelection.round).toBe(2);

            mockSkillSystem.skipSkillRound(); // 跳過第2輪

            expect(mockSkillSystem.skillSelection.round).toBe(3);
        });

        test('跳過第3輪應該完成技能選擇並啟動遊戲', () => {
            mockSkillSystem.startSkillSelection();

            // 跳過所有3輪
            mockSkillSystem.skipSkillRound(); // 第1輪 → 第2輪
            mockSkillSystem.skipSkillRound(); // 第2輪 → 第3輪
            mockSkillSystem.skipSkillRound(); // 第3輪 → 完成

            // 檢查遊戲狀態
            expect(mockGameEngine.gameState.status).toBe('playing');
            expect(mockGameEngine.turnManager.startMainGameLoop).toHaveBeenCalled();
            expect(global.gameLogger.logAttributeAllocation).toHaveBeenCalled();
        });

        test('跳過所有輪次應該分配所有剩餘星星', () => {
            mockSkillSystem.startSkillSelection();

            const initialAttributes = { ...mockGameEngine.gameState.player.attributes };
            const initialStars = mockSkillSystem.skillSelection.remainingStars;

            // 跳過所有輪次（不選擇任何技能）
            mockSkillSystem.skipSkillRound();
            mockSkillSystem.skipSkillRound();
            mockSkillSystem.skipSkillRound();

            // 檢查屬性分配（10星 * 10點 = 100點屬性增加）
            const totalAttributeIncrease = Object.keys(initialAttributes).reduce((sum, attr) => {
                return sum + (mockGameEngine.gameState.player.attributes[attr] - initialAttributes[attr]);
            }, 0);

            expect(totalAttributeIncrease).toBeGreaterThanOrEqual(100); // 至少100點（可能有額外獎勵）
            expect(mockGameEngine.gameState.player.skills).toHaveLength(0); // 沒有技能

            console.log('屬性分配結果:', {
                初始星星: initialStars,
                屬性增加總計: totalAttributeIncrease,
                最終屬性: mockGameEngine.gameState.player.attributes
            });
        });
    });

    describe('混合選擇和跳過場景', () => {
        test('選擇1個技能然後跳過剩餘輪次', () => {
            mockSkillSystem.startSkillSelection();

            // 第1輪：選擇技能
            const firstSkill = mockSkillSystem.skillSelection.availableSkills[0];
            mockSkillSystem.skillSelection.remainingStars -= firstSkill.starCost;
            mockSkillSystem.skillSelection.selectedSkills.push(firstSkill);
            mockSkillSystem.nextSkillRound();

            // 第2輪和第3輪：跳過
            mockSkillSystem.skipSkillRound();
            mockSkillSystem.skipSkillRound();

            expect(mockGameEngine.gameState.status).toBe('playing');
            expect(mockGameEngine.gameState.player.skills).toHaveLength(1);
            expect(mockGameEngine.turnManager.startMainGameLoop).toHaveBeenCalled();
        });
    });

    describe('遊戲啟動確認', () => {
        test('完整的用戶跳過流程應該啟動遊戲', () => {
            console.log('=== 完整用戶跳過流程測試 ===');

            // 1. 開始技能選擇
            mockSkillSystem.startSkillSelection();
            console.log('1. 初始狀態 - 輪次:', mockSkillSystem.skillSelection.round, '狀態:', mockGameEngine.gameState.status);

            // 2. 用戶點擊「跳過此輪」3次
            console.log('2. 用戶開始跳過輪次...');

            mockSkillSystem.skipSkillRound();
            console.log('   跳過第1輪後 - 輪次:', mockSkillSystem.skillSelection.round);

            mockSkillSystem.skipSkillRound();
            console.log('   跳過第2輪後 - 輪次:', mockSkillSystem.skillSelection.round);

            mockSkillSystem.skipSkillRound();
            console.log('   跳過第3輪後 - 狀態:', mockGameEngine.gameState.status);

            // 3. 驗證遊戲已啟動
            expect(mockGameEngine.gameState.status).toBe('playing');
            expect(mockGameEngine.turnManager.startMainGameLoop).toHaveBeenCalledTimes(1);

            console.log('3. 遊戲啟動確認 - startMainGameLoop調用次數:', mockGameEngine.turnManager.startMainGameLoop.mock.calls.length);
            console.log('=== 測試完成：遊戲應該正常運行 ===');
        });
    });
});