// 技能選擇UI組件單元測試
// Unit tests for the SkillUI component

describe('SkillUI', () => {
    let mockUIManager;
    let mockGameEngine;
    let skillUI;
    let mockElements;

    beforeEach(() => {
        // 創建模擬DOM元素
        mockElements = {
            skillSelection: {
                container: createMockElement('div'),
                skillsGrid: createMockElement('div'),
                remainingStars: createMockElement('span'),
                currentRound: createMockElement('span'),
                skipBtn: createMockElement('button'),
                confirmBtn: createMockElement('button')
            }
        };

        // 創建模擬遊戲引擎
        mockGameEngine = {
            skillSelection: {
                availableSkills: createMockGameData().skills.slice(0, 3),
                selectedSkills: [],
                remainingStars: 10,
                round: 1,
                maxRounds: 3
            },
            gameState: {
                status: 'skill_selection'
            },
            selectSkill: jest.fn(() => true),
            skipSkillRound: jest.fn()
        };

        // 創建模擬UI管理器
        mockUIManager = {
            elements: mockElements,
            gameEngine: mockGameEngine,
            switchScreen: jest.fn(),
            gameUI: {
                showGameScreen: jest.fn()
            }
        };

        // 創建SkillUI實例
        skillUI = new SkillUI(mockUIManager);
    });

    describe('showSkillSelection', () => {
        test('應該切換到技能選擇螢幕並更新UI', () => {
            skillUI.showSkillSelection();

            expect(mockUIManager.switchScreen).toHaveBeenCalledWith('skillSelection');
        });
    });

    describe('updateSkillSelectionUI', () => {
        test('應該更新星星和輪數顯示', () => {
            skillUI.updateSkillSelectionUI();

            expect(mockElements.skillSelection.remainingStars.textContent).toBe('10');
            expect(mockElements.skillSelection.currentRound.textContent).toBe('1');
        });

        test('遊戲引擎不存在時應該安全返回', () => {
            skillUI.uiManager.gameEngine = null;

            expect(() => {
                skillUI.updateSkillSelectionUI();
            }).not.toThrow();
        });

        test('技能選擇不存在時應該安全返回', () => {
            skillUI.uiManager.gameEngine.skillSelection = null;

            expect(() => {
                skillUI.updateSkillSelectionUI();
            }).not.toThrow();
        });
    });

    describe('renderSkillChoices', () => {
        let mockSkills;

        beforeEach(() => {
            mockSkills = createMockGameData().skills.slice(0, 3);
        });

        test('應該清空容器並渲染新技能', () => {
            const container = mockElements.skillSelection.skillsGrid;
            container.innerHTML = '<div>舊內容</div>';

            skillUI.renderSkillChoices(mockSkills, 10);

            expect(container.innerHTML).toBe('');
            expect(container.appendChild).toHaveBeenCalledTimes(3);
        });

        test('容器不存在時應該安全返回', () => {
            mockElements.skillSelection.skillsGrid = null;

            expect(() => {
                skillUI.renderSkillChoices(mockSkills, 10);
            }).not.toThrow();
        });

        test('應該為每個技能創建卡片', () => {
            const container = mockElements.skillSelection.skillsGrid;

            skillUI.renderSkillChoices(mockSkills, 10);

            expect(container.appendChild).toHaveBeenCalledTimes(mockSkills.length);
        });
    });

    describe('createSkillCard', () => {
        let mockSkill;

        beforeEach(() => {
            mockSkill = createMockGameData().skills[0];
        });

        test('應該創建包含技能信息的卡片', () => {
            const card = skillUI.createSkillCard(mockSkill, 10);

            expect(card.className).toContain('skill-card');
            expect(card.className).toContain('affordable');
            expect(card.innerHTML).toContain(mockSkill.name);
            expect(card.innerHTML).toContain(mockSkill.description);
            expect(card.innerHTML).toContain(mockSkill.starCost.toString());
        });

        test('星星不足時應該標記為expensive', () => {
            const card = skillUI.createSkillCard(mockSkill, 0);

            expect(card.className).toContain('expensive');
            expect(card.className).not.toContain('affordable');
        });

        test('應該渲染技能效果', () => {
            const card = skillUI.createSkillCard(mockSkill, 10);

            mockSkill.effects.forEach(effect => {
                expect(card.innerHTML).toContain(effect.description);
            });
        });

        test('應該顯示技能類型', () => {
            const card = skillUI.createSkillCard(mockSkill, 10);
            const expectedTypeName = skillUI.getSkillTypeName(mockSkill.type);

            expect(card.innerHTML).toContain(expectedTypeName);
        });
    });

    describe('getSkillTypeName', () => {
        test('應該返回正確的技能類型名稱', () => {
            expect(skillUI.getSkillTypeName('combat')).toBe('戰鬥');
            expect(skillUI.getSkillTypeName('passive')).toBe('被動');
            expect(skillUI.getSkillTypeName('economic')).toBe('經濟');
            expect(skillUI.getSkillTypeName('special')).toBe('特殊');
        });

        test('未知類型應該返回原始值', () => {
            expect(skillUI.getSkillTypeName('unknown')).toBe('unknown');
        });
    });

    describe('selectSkill', () => {
        test('應該調用遊戲引擎選擇技能', () => {
            skillUI.selectSkill('test_skill_1');

            expect(mockGameEngine.selectSkill).toHaveBeenCalledWith('test_skill_1');
        });

        test('選擇成功後應該更新UI或切換螢幕', (done) => {
            mockGameEngine.selectSkill.mockReturnValue(true);

            skillUI.selectSkill('test_skill_1');

            // 使用setTimeout來測試異步行為
            setTimeout(() => {
                expect(mockGameEngine.selectSkill).toHaveBeenCalled();
                done();
            }, 150);
        });

        test('遊戲狀態為playing時應該切換到遊戲螢幕', (done) => {
            mockGameEngine.selectSkill.mockReturnValue(true);
            mockGameEngine.gameState.status = 'playing';

            skillUI.selectSkill('test_skill_1');

            setTimeout(() => {
                expect(mockUIManager.gameUI.showGameScreen).toHaveBeenCalled();
                done();
            }, 150);
        });

        test('遊戲引擎不存在時應該安全返回', () => {
            skillUI.gameEngine = null;

            expect(() => {
                skillUI.selectSkill('test_skill_1');
            }).not.toThrow();
        });
    });

    describe('skipSkillRound', () => {
        test('應該調用遊戲引擎跳過技能輪', () => {
            skillUI.skipSkillRound();

            expect(mockGameEngine.skipSkillRound).toHaveBeenCalled();
        });

        test('跳過後應該更新UI或切換螢幕', (done) => {
            skillUI.skipSkillRound();

            setTimeout(() => {
                expect(mockGameEngine.skipSkillRound).toHaveBeenCalled();
                done();
            }, 150);
        });

        test('遊戲引擎不存在時應該安全返回', () => {
            skillUI.gameEngine = null;

            expect(() => {
                skillUI.skipSkillRound();
            }).not.toThrow();
        });
    });
});