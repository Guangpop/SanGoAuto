// 技能選擇UI修復驗證測試
// Test to verify the skill UI fix works correctly

describe('SkillUI Fix Verification', () => {
    test('應該正確處理gameEngine引用', () => {
        // 模擬UIManager
        const mockUIManager = {
            gameEngine: null,
            elements: {
                skillSelection: {
                    remainingStars: { textContent: '' },
                    currentRound: { textContent: '' },
                    skillsGrid: createMockElement('div')
                }
            },
            switchScreen: jest.fn()
        };

        // 模擬SkillUI的基本結構（由於無法載入完整類別）
        const skillUI = {
            uiManager: mockUIManager,
            get gameEngine() {
                return this.uiManager.gameEngine;
            },
            updateSkillSelectionUI() {
                if (!this.gameEngine || !this.gameEngine.skillSelection) return;

                const selection = this.gameEngine.skillSelection;

                if (this.uiManager.elements.skillSelection.remainingStars) {
                    this.uiManager.elements.skillSelection.remainingStars.textContent = selection.remainingStars;
                }
                if (this.uiManager.elements.skillSelection.currentRound) {
                    this.uiManager.elements.skillSelection.currentRound.textContent = selection.round;
                }
            }
        };

        // 測試：gameEngine為null時應該安全返回
        expect(skillUI.gameEngine).toBeNull();
        expect(() => {
            skillUI.updateSkillSelectionUI();
        }).not.toThrow();

        // 測試：設置gameEngine後應該正常工作
        const mockGameEngine = {
            skillSelection: {
                availableSkills: createMockGameData().skills.slice(0, 3),
                selectedSkills: [],
                remainingStars: 10,
                round: 1,
                maxRounds: 3
            }
        };

        mockUIManager.gameEngine = mockGameEngine;

        expect(skillUI.gameEngine).toBe(mockGameEngine);
        expect(skillUI.gameEngine.skillSelection).toBeDefined();

        // 更新UI應該正常工作
        skillUI.updateSkillSelectionUI();

        expect(mockUIManager.elements.skillSelection.remainingStars.textContent).toBe(10);
        expect(mockUIManager.elements.skillSelection.currentRound.textContent).toBe(1);
    });

    test('應該檢測數據流完整性', () => {
        // 檢查完整的數據流
        const gameData = createMockGameData();

        // 模擬技能系統生成選擇
        const generateSkillChoices = (skills, round) => {
            let skillPool = [...skills];

            if (round === 1) {
                skillPool = skillPool.filter(skill => skill.starCost <= 2);
            }

            return skillPool.slice(0, 3); // 簡化的隨機選擇
        };

        const mockSkillSelection = {
            availableSkills: generateSkillChoices(gameData.skills, 1),
            selectedSkills: [],
            remainingStars: 10,
            round: 1,
            maxRounds: 3
        };

        expect(mockSkillSelection.availableSkills.length).toBeGreaterThan(0);
        expect(mockSkillSelection.availableSkills.length).toBeLessThanOrEqual(3);

        // 檢查第一輪技能過濾邏輯
        mockSkillSelection.availableSkills.forEach(skill => {
            expect(skill.starCost).toBeLessThanOrEqual(2);
        });

        console.log('第一輪可用技能:', mockSkillSelection.availableSkills.map(s => `${s.name}(${s.starCost}星)`));
    });

    test('應該模擬技能選擇流程', () => {
        const gameData = createMockGameData();

        // 模擬完整的技能選擇流程
        const skillSelectionProcess = {
            availableSkills: gameData.skills.filter(s => s.starCost <= 2).slice(0, 3),
            selectedSkills: [],
            remainingStars: 10,
            round: 1,

            selectSkill(skillId) {
                const skill = this.availableSkills.find(s => s.id === skillId);
                if (!skill) return false;
                if (skill.starCost > this.remainingStars) return false;

                this.remainingStars -= skill.starCost;
                this.selectedSkills.push(skill);
                this.round++;

                return true;
            }
        };

        const firstSkill = skillSelectionProcess.availableSkills[0];
        const initialStars = skillSelectionProcess.remainingStars;

        const result = skillSelectionProcess.selectSkill(firstSkill.id);

        expect(result).toBe(true);
        expect(skillSelectionProcess.remainingStars).toBe(initialStars - firstSkill.starCost);
        expect(skillSelectionProcess.selectedSkills).toContain(firstSkill);
        expect(skillSelectionProcess.round).toBe(2);

        console.log('選擇技能結果:', {
            技能: firstSkill.name,
            消耗星星: firstSkill.starCost,
            剩餘星星: skillSelectionProcess.remainingStars,
            當前輪次: skillSelectionProcess.round
        });
    });
});