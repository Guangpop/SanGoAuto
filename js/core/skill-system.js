// 三國天命 - 技能系統
// Skill selection and management system

class SkillSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.skillSelection = null;
    }

    /**
     * 開始技能選擇階段
     */
    startSkillSelection() {
        this.skillSelection = {
            availableSkills: [],
            selectedSkills: [],
            remainingStars: 10,
            round: 1,
            maxRounds: 3
        };

        gameLogger.game('技能選擇', '🌟 開始天命技能選擇，共3輪，每輪從3個技能中選擇1個');
        this.generateSkillChoices();
    }

    /**
     * 生成技能選擇項
     */
    generateSkillChoices() {
        // 動態技能池 - 根據輪次調整技能稀有度
        let skillPool = [...this.gameEngine.gameData.skills];

        if (this.skillSelection.round === 1) {
            // 第一輪：更多低星技能，幫助新手起步
            skillPool = skillPool.filter(skill => skill.starCost <= 2);
        } else if (this.skillSelection.round === 2) {
            // 第二輪：平衡的技能選擇
            const lowCostChance = GameHelpers.randomPercent();
            if (lowCostChance < 60) {
                skillPool = skillPool.filter(skill => skill.starCost <= 2);
            }
        } else {
            // 第三輪：如果剩餘星星多，提供更多高星技能
            if (this.skillSelection.remainingStars >= 3) {
                const highCostPool = skillPool.filter(skill => skill.starCost >= 2);
                if (highCostPool.length >= 3) {
                    skillPool = highCostPool;
                }
            }
        }

        // 避免重複技能
        const unavailableSkills = this.skillSelection.selectedSkills.map(s => s.id);
        skillPool = skillPool.filter(skill => !unavailableSkills.includes(skill.id));

        // 確保有足夠的技能可選
        if (skillPool.length < 3) {
            skillPool = this.gameEngine.gameData.skills.filter(skill => !unavailableSkills.includes(skill.id));
        }

        // 從技能庫中隨機選擇3個技能
        this.skillSelection.availableSkills = GameHelpers.randomChoices(skillPool, 3);

        gameLogger.game('技能選擇',
            `第${this.skillSelection.round}輪技能選擇：`,
            this.skillSelection.availableSkills.map(s => `${s.name}(${s.starCost}星)`)
        );
    }

    /**
     * 選擇技能
     */
    selectSkill(skillId) {
        const skill = this.skillSelection.availableSkills.find(s => s.id === skillId);
        if (!skill) {
            gameLogger.warn('技能選擇', '技能不存在', skillId);
            return false;
        }

        if (skill.starCost > this.skillSelection.remainingStars) {
            gameLogger.warn('技能選擇', '星星不足', {
                required: skill.starCost,
                remaining: this.skillSelection.remainingStars
            });
            return false;
        }

        // 消耗星星並記錄技能
        this.skillSelection.remainingStars -= skill.starCost;
        this.skillSelection.selectedSkills.push(skill);

        gameLogger.logSkillSelection(skill.name, skill.starCost, this.skillSelection.remainingStars);

        // 應用技能效果
        this.applySkillEffects(skill);

        this.nextSkillRound();
        return true;
    }

    /**
     * 跳過當前技能輪
     */
    skipSkillRound() {
        gameLogger.game('技能選擇', `跳過第${this.skillSelection.round}輪技能選擇`);
        this.nextSkillRound();
    }

    /**
     * 進入下一輪技能選擇
     */
    nextSkillRound() {
        this.skillSelection.round++;

        if (this.skillSelection.round > this.skillSelection.maxRounds) {
            this.finishSkillSelection();
        } else {
            this.generateSkillChoices();
        }
    }

    /**
     * 完成技能選擇階段
     */
    finishSkillSelection() {
        console.log('🎯 開始完成技能選擇流程...');

        // 剩餘星星轉換為屬性點
        this.convertStarsToAttributes();

        // 將選中的技能添加到玩家
        this.gameEngine.gameState.player.skills = [...this.skillSelection.selectedSkills];

        console.log('✅ 玩家最終狀態:', this.gameEngine.gameState.player);

        gameLogger.logAttributeAllocation(this.gameEngine.gameState.player.attributes);

        // 開始主遊戲循環
        this.gameEngine.gameState.status = 'playing';

        console.log('🔄 準備顯示遊戲主畫面...');

        // 顯示遊戲主畫面並更新UI
        if (window.uiManager) {
            console.log('📱 UIManager 存在，調用 showGameScreen...');
            window.uiManager.gameUI.showGameScreen();

            // 確保UI正確更新玩家數據
            setTimeout(() => {
                console.log('🔄 更新遊戲UI...');
                window.uiManager.gameUI.updateGameUI();

                // 同時使用 gameAPI 更新
                if (window.gameAPI) {
                    console.log('🔄 使用 gameAPI 更新UI...');
                    window.gameAPI.updatePlayerStats({
                        level: this.gameEngine.gameState.player.level,
                        money: this.gameEngine.gameState.player.gold,
                        troops: this.gameEngine.gameState.player.troops,
                        cities: this.gameEngine.gameState.player.citiesControlled,
                        stats: {
                            attack: this.gameEngine.gameState.player.attributes.strength,
                            intellect: this.gameEngine.gameState.player.attributes.intelligence,
                            rule: this.gameEngine.gameState.player.attributes.leadership,
                            politics: this.gameEngine.gameState.player.attributes.politics,
                            charisma: this.gameEngine.gameState.player.attributes.charisma
                        }
                    });

                    window.gameAPI.pushEventLog('🎮 遊戲開始！', { type: 'info' });
                    window.gameAPI.pushEventLog(`⭐ 最終屬性分配完成`, { type: 'info' });
                } else {
                    console.error('❌ gameAPI 不存在');
                }
            }, 200);
        } else {
            console.error('❌ UIManager 不存在');
        }

        console.log('🚀 啟動主遊戲循環...');
        this.gameEngine.turnManager.startMainGameLoop();
    }

    /**
     * 將剩餘星星轉換為屬性點
     */
    convertStarsToAttributes() {
        const totalPoints = this.skillSelection.remainingStars * 10;
        const attributes = ['strength', 'intelligence', 'leadership', 'politics', 'charisma'];

        gameLogger.game('屬性分配', `剩餘${this.skillSelection.remainingStars}星轉換為${totalPoints}屬性點`);

        // 更智能的屬性分配 - 增加隨機性但避免過度偏科
        const attributeWeights = {};
        attributes.forEach(attr => {
            attributeWeights[attr] = GameHelpers.randomInt(1, 4); // 隨機權重
        });

        // 根據權重分配點數
        for (let i = 0; i < totalPoints; i++) {
            const weightedChoices = [];
            attributes.forEach(attr => {
                for (let j = 0; j < attributeWeights[attr]; j++) {
                    weightedChoices.push(attr);
                }
            });

            const attr = GameHelpers.randomChoice(weightedChoices);
            this.gameEngine.gameState.player.attributes[attr]++;

            // 每分配10點後調整權重，增加變化
            if (i % 10 === 9) {
                const randomAttr = GameHelpers.randomChoice(attributes);
                attributeWeights[randomAttr] = GameHelpers.randomInt(1, 5);
            }
        }

        // 額外隨機獎勵 - 基於剩餘星星數
        if (this.skillSelection.remainingStars >= 5) {
            const bonusAttr = GameHelpers.randomChoice(attributes);
            this.gameEngine.gameState.player.attributes[bonusAttr] += GameHelpers.randomInt(2, 5);
            gameLogger.game('屬性分配', `🎁 高星星剩餘獎勵：${bonusAttr}+${this.gameEngine.gameState.player.attributes[bonusAttr]}`);
        }
    }

    /**
     * 應用技能效果
     */
    applySkillEffects(skill) {
        skill.effects.forEach(effect => {
            switch (effect.type) {
                case 'attribute_bonus':
                    if (effect.target === 'all_attributes') {
                        Object.keys(this.gameEngine.gameState.player.attributes).forEach(attr => {
                            if (attr !== 'destiny') {
                                this.gameEngine.gameState.player.attributes[attr] += effect.value;
                            }
                        });
                    } else {
                        this.gameEngine.gameState.player.attributes[effect.target] += effect.value;
                    }
                    break;

                case 'special':
                    // 特殊效果會在相應時機觸發
                    break;
            }
        });
    }

    /**
     * 獲取當前技能選擇狀態
     */
    getSkillSelection() {
        return this.skillSelection;
    }
}

// 導出類別
window.SkillSystem = SkillSystem;