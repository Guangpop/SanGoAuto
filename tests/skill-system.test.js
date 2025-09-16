// 技能系統單元測試
// Unit tests for the skill system functionality

describe('SkillSystem', () => {
    let mockGameEngine;
    let skillSystem;
    let mockGameData;

    beforeEach(() => {
        // 創建模擬遊戲數據
        mockGameData = createMockGameData();

        // 創建模擬遊戲引擎
        mockGameEngine = {
            gameData: mockGameData,
            gameState: {
                player: {
                    attributes: {
                        strength: 10,
                        intelligence: 10,
                        leadership: 10,
                        politics: 10,
                        charisma: 10,
                        destiny: 0
                    },
                    skills: []
                },
                status: 'skill_selection'
            },
            turnManager: {
                startMainGameLoop: jest.fn()
            }
        };

        // 模擬全局對象
        global.gameLogger = {
            game: jest.fn(),
            warn: jest.fn(),
            logSkillSelection: jest.fn(),
            logAttributeAllocation: jest.fn()
        };

        global.GameHelpers = {
            randomPercent: jest.fn(() => 50),
            randomInt: jest.fn((min, max) => Math.floor((min + max) / 2)),
            randomChoice: jest.fn(arr => arr[0]),
            randomChoices: jest.fn((arr, count) => arr.slice(0, count))
        };

        // 創建技能系統實例
        skillSystem = new SkillSystem(mockGameEngine);
    });

    describe('startSkillSelection', () => {
        test('應該初始化技能選擇狀態', () => {
            skillSystem.startSkillSelection();

            expect(skillSystem.skillSelection).toEqual({
                availableSkills: expect.any(Array),
                selectedSkills: [],
                remainingStars: 10,
                round: 1,
                maxRounds: 3
            });

            expect(global.gameLogger.game).toHaveBeenCalledWith(
                '技能選擇',
                '🌟 開始天命技能選擇，共3輪，每輪從3個技能中選擇1個'
            );
        });

        test('應該生成初始技能選擇項', () => {
            skillSystem.startSkillSelection();

            expect(skillSystem.skillSelection.availableSkills).toHaveLength(3);
            expect(global.GameHelpers.randomChoices).toHaveBeenCalled();
        });
    });

    describe('generateSkillChoices', () => {
        beforeEach(() => {
            skillSystem.skillSelection = {
                availableSkills: [],
                selectedSkills: [],
                remainingStars: 10,
                round: 1,
                maxRounds: 3
            };
        });

        test('第一輪應該過濾高星技能', () => {
            skillSystem.skillSelection.round = 1;
            skillSystem.generateSkillChoices();

            // 檢查是否調用了randomChoices，且技能池被過濾
            expect(global.GameHelpers.randomChoices).toHaveBeenCalled();

            // 模擬的GameHelpers.randomChoices應該接收過濾後的技能池
            const callArgs = global.GameHelpers.randomChoices.mock.calls[0];
            const skillPool = callArgs[0];
            const count = callArgs[1];

            expect(count).toBe(3);
            // 第一輪應該只有starCost <= 2的技能
            skillPool.forEach(skill => {
                expect(skill.starCost).toBeLessThanOrEqual(2);
            });
        });

        test('應該避免重複技能', () => {
            // 添加已選技能
            skillSystem.skillSelection.selectedSkills = [mockGameData.skills[0]];
            skillSystem.generateSkillChoices();

            const callArgs = global.GameHelpers.randomChoices.mock.calls[0];
            const skillPool = callArgs[0];

            // 確保技能池不包含已選技能
            expect(skillPool.find(skill => skill.id === mockGameData.skills[0].id)).toBeUndefined();
        });
    });

    describe('selectSkill', () => {
        beforeEach(() => {
            skillSystem.startSkillSelection();
        });

        test('應該成功選擇有效技能', () => {
            const skillToSelect = skillSystem.skillSelection.availableSkills[0];
            const initialStars = skillSystem.skillSelection.remainingStars;

            const result = skillSystem.selectSkill(skillToSelect.id);

            expect(result).toBe(true);
            expect(skillSystem.skillSelection.remainingStars).toBe(initialStars - skillToSelect.starCost);
            expect(skillSystem.skillSelection.selectedSkills).toContain(skillToSelect);
            expect(global.gameLogger.logSkillSelection).toHaveBeenCalled();
        });

        test('應該拒絕不存在的技能', () => {
            const result = skillSystem.selectSkill('nonexistent_skill');

            expect(result).toBe(false);
            expect(global.gameLogger.warn).toHaveBeenCalledWith(
                '技能選擇',
                '技能不存在',
                'nonexistent_skill'
            );
        });

        test('應該拒絕費用不足的技能', () => {
            // 設置剩餘星星為0
            skillSystem.skillSelection.remainingStars = 0;
            const skillToSelect = skillSystem.skillSelection.availableSkills[0];

            const result = skillSystem.selectSkill(skillToSelect.id);

            expect(result).toBe(false);
            expect(global.gameLogger.warn).toHaveBeenCalledWith(
                '技能選擇',
                '星星不足',
                expect.objectContaining({
                    required: skillToSelect.starCost,
                    remaining: 0
                })
            );
        });
    });

    describe('skipSkillRound', () => {
        beforeEach(() => {
            skillSystem.startSkillSelection();
        });

        test('應該跳過當前輪次', () => {
            const initialRound = skillSystem.skillSelection.round;

            skillSystem.skipSkillRound();

            expect(skillSystem.skillSelection.round).toBe(initialRound + 1);
            expect(global.gameLogger.game).toHaveBeenCalledWith(
                '技能選擇',
                `跳過第${initialRound}輪技能選擇`
            );
        });
    });

    describe('applySkillEffects', () => {
        test('應該正確應用屬性加成效果', () => {
            const skill = {
                effects: [
                    { type: 'attribute_bonus', target: 'strength', value: 5 }
                ]
            };

            const initialStrength = mockGameEngine.gameState.player.attributes.strength;
            skillSystem.applySkillEffects(skill);

            expect(mockGameEngine.gameState.player.attributes.strength)
                .toBe(initialStrength + 5);
        });

        test('應該正確應用全屬性加成', () => {
            const skill = {
                effects: [
                    { type: 'attribute_bonus', target: 'all_attributes', value: 2 }
                ]
            };

            const initialAttributes = { ...mockGameEngine.gameState.player.attributes };
            skillSystem.applySkillEffects(skill);

            Object.keys(initialAttributes).forEach(attr => {
                if (attr !== 'destiny') {
                    expect(mockGameEngine.gameState.player.attributes[attr])
                        .toBe(initialAttributes[attr] + 2);
                }
            });
        });
    });

    describe('getSkillSelection', () => {
        test('應該返回當前技能選擇狀態', () => {
            skillSystem.startSkillSelection();

            const selection = skillSystem.getSkillSelection();

            expect(selection).toBe(skillSystem.skillSelection);
            expect(selection).toHaveProperty('availableSkills');
            expect(selection).toHaveProperty('selectedSkills');
            expect(selection).toHaveProperty('remainingStars');
            expect(selection).toHaveProperty('round');
        });

        test('未開始選擇時應該返回null', () => {
            const selection = skillSystem.getSkillSelection();
            expect(selection).toBeNull();
        });
    });
});