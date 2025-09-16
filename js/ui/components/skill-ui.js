// 三國天命 - 技能選擇UI組件
// Skill selection interface components

class SkillUI {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.gameEngine = uiManager.gameEngine;
    }

    /**
     * 顯示技能選擇界面
     */
    showSkillSelection() {
        this.uiManager.switchScreen('skillSelection');
        this.updateSkillSelectionUI();
    }

    /**
     * 更新技能選擇UI
     */
    updateSkillSelectionUI() {
        if (!this.gameEngine || !this.gameEngine.skillSelection) return;

        const selection = this.gameEngine.skillSelection;

        // 更新星星和輪數顯示
        if (this.uiManager.elements.skillSelection.remainingStars) {
            this.uiManager.elements.skillSelection.remainingStars.textContent = selection.remainingStars;
        }
        if (this.uiManager.elements.skillSelection.currentRound) {
            this.uiManager.elements.skillSelection.currentRound.textContent = selection.round;
        }

        // 更新技能選項
        this.renderSkillChoices(selection.availableSkills, selection.remainingStars);
    }

    /**
     * 渲染技能選擇項
     */
    renderSkillChoices(skills, remainingStars) {
        const container = this.uiManager.elements.skillSelection.skillsGrid;
        if (!container) return;

        container.innerHTML = '';

        skills.forEach((skill, index) => {
            const skillCard = this.createSkillCard(skill, remainingStars);
            skillCard.addEventListener('click', () => {
                if (skill.starCost <= remainingStars) {
                    this.selectSkill(skill.id);
                }
            });
            container.appendChild(skillCard);
        });
    }

    /**
     * 創建技能卡片
     */
    createSkillCard(skill, remainingStars) {
        const card = document.createElement('div');
        const affordable = skill.starCost <= remainingStars;

        card.className = `skill-card ${affordable ? 'affordable' : 'expensive'}`;
        card.innerHTML = `
            <div class="skill-header">
                <h4 class="skill-name">${skill.name}</h4>
                <div class="skill-cost">
                    <span>⭐</span>
                    <span>${skill.starCost}</span>
                </div>
            </div>
            <p class="skill-description">${skill.description}</p>
            <div class="skill-effects">
                ${skill.effects.map(effect =>
                    `<div class="skill-effect">${effect.description}</div>`
                ).join('')}
            </div>
            <div class="skill-type">${this.getSkillTypeName(skill.type)}</div>
        `;

        return card;
    }

    /**
     * 獲取技能類型名稱
     */
    getSkillTypeName(type) {
        const names = {
            combat: '戰鬥',
            passive: '被動',
            economic: '經濟',
            special: '特殊'
        };
        return names[type] || type;
    }

    /**
     * 選擇技能
     */
    selectSkill(skillId) {
        if (this.gameEngine && this.gameEngine.selectSkill(skillId)) {
            setTimeout(() => {
                if (this.gameEngine.gameState.status === 'skill_selection') {
                    this.updateSkillSelectionUI();
                } else {
                    this.uiManager.gameUI.showGameScreen();
                }
            }, 100);
        }
    }

    /**
     * 跳過技能輪
     */
    skipSkillRound() {
        if (this.gameEngine) {
            this.gameEngine.skipSkillRound();
            setTimeout(() => {
                if (this.gameEngine.gameState.status === 'skill_selection') {
                    this.updateSkillSelectionUI();
                } else {
                    this.uiManager.gameUI.showGameScreen();
                }
            }, 100);
        }
    }
}

// 導出類別
window.SkillUI = SkillUI;