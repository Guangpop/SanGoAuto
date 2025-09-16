// 三國天命 - 事件系統
// Random event and effect management system

class EventSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
    }

    /**
     * 處理隨機事件（返回訊息版本）
     */
    async processRandomEventsWithMessages() {
        const messages = [];

        // 動態調整事件觸發數量 - 增加更多隨機性
        let eventCount;
        const destiny = this.gameEngine.gameState.player.attributes.destiny || 0;
        const level = this.gameEngine.gameState.player.level;

        // 根據天命值和等級調整事件頻率
        if (destiny >= 30) {
            eventCount = GameHelpers.randomInt(1, 3); // 高天命更多事件
        } else if (level >= 5) {
            eventCount = GameHelpers.randomInt(0, 3); // 高等級時事件更頻繁
        } else {
            eventCount = GameHelpers.randomInt(0, 2); // 基礎事件頻率
        }

        // 特殊情況：連續無事件時強制觸發
        if (this.gameEngine.gameState.turnsWithoutEvents >= 3) {
            eventCount = Math.max(eventCount, 1);
            this.gameEngine.gameState.turnsWithoutEvents = 0;
        }

        if (eventCount === 0) {
            this.gameEngine.gameState.turnsWithoutEvents = (this.gameEngine.gameState.turnsWithoutEvents || 0) + 1;
        } else {
            this.gameEngine.gameState.turnsWithoutEvents = 0;
        }

        for (let i = 0; i < eventCount; i++) {
            const event = this.selectRandomEvent();
            if (event) {
                const eventMessage = this.executeEventWithMessage(event);
                if (eventMessage) {
                    messages.push(eventMessage);
                }
            }
        }

        return messages;
    }

    /**
     * 選擇隨機事件
     */
    selectRandomEvent() {
        const validEvents = this.gameEngine.gameData.events.filter(event =>
            this.checkEventRequirements(event)
        );

        if (validEvents.length === 0) return null;

        // 根據機率選擇事件
        const playerDestiny = this.gameEngine.gameState.player.attributes.destiny || 0;

        for (const event of validEvents) {
            const probability = GameHelpers.calculateEventProbability(
                event.baseProbability,
                event.destinyModifier,
                playerDestiny
            );

            if (GameHelpers.checkProbability(probability)) {
                return event;
            }
        }

        return null;
    }

    /**
     * 檢查事件觸發條件
     */
    checkEventRequirements(event) {
        if (!event.requirements) return true;

        return event.requirements.every(req => {
            switch (req.type) {
                case 'level':
                    return this.evaluateCondition(this.gameEngine.gameState.player.level, req.operator, req.value);
                case 'city_count':
                    return this.evaluateCondition(this.gameEngine.gameState.player.citiesControlled, req.operator, req.value);
                case 'attribute':
                    return this.evaluateCondition(this.gameEngine.gameState.player.attributes[req.target], req.operator, req.value);
                default:
                    return true;
            }
        });
    }

    /**
     * 評估條件
     */
    evaluateCondition(value, operator, target) {
        switch (operator) {
            case '>=': return value >= target;
            case '<=': return value <= target;
            case '>': return value > target;
            case '<': return value < target;
            case '==': return value == target;
            case '!=': return value != target;
            default: return true;
        }
    }

    /**
     * 執行事件（返回訊息版本）
     */
    executeEventWithMessage(event) {
        let selectedOutcome;

        if (event.isChoice) {
            // 選擇事件 - 這裡簡化為隨機選擇，實際應該由玩家決定
            selectedOutcome = GameHelpers.randomChoice(event.outcomes);
        } else {
            // 機率事件
            const roll = GameHelpers.randomPercent();
            let cumulativeProb = 0;

            for (const outcome of event.outcomes) {
                cumulativeProb += outcome.probability;
                if (roll <= cumulativeProb) {
                    selectedOutcome = outcome;
                    break;
                }
            }
        }

        if (selectedOutcome) {
            this.applyEventEffects(selectedOutcome.effects);

            // 記錄事件歷史
            this.gameEngine.gameState.eventHistory.push({
                eventId: event.id,
                outcomeId: selectedOutcome.id,
                timestamp: Date.now(),
                description: `${event.name} - ${selectedOutcome.name}`
            });

            // 返回格式化的訊息
            const typeIcon = this.getEventTypeIcon(event.type);
            const effectStr = selectedOutcome.effects.length > 0 ?
                `，效果：${selectedOutcome.effects.map(e => e.description).join('、')}` : '';

            return {
                category: '隨機事件',
                message: `${typeIcon}【${event.name}】- ${selectedOutcome.name}${effectStr}`,
                data: selectedOutcome.effects
            };
        }

        return null;
    }

    /**
     * 獲取事件類型圖示
     */
    getEventTypeIcon(type) {
        const icons = {
            positive: '✨',
            negative: '⚡',
            neutral: '📜',
            choice: '🤔'
        };
        return icons[type] || '📝';
    }

    /**
     * 應用事件效果
     */
    applyEventEffects(effects) {
        effects.forEach(effect => {
            switch (effect.type) {
                case 'attribute_change':
                    const oldValue = this.gameEngine.gameState.player.attributes[effect.target];
                    this.gameEngine.gameState.player.attributes[effect.target] =
                        GameHelpers.clamp(oldValue + effect.value, 0, 100);
                    gameLogger.logResourceChange(effect.target, effect.value, '事件效果');
                    break;

                case 'gain_gold':
                    this.gameEngine.gameState.player.gold += effect.value;
                    if (effect.value !== 0) {
                        gameLogger.logResourceChange('gold', effect.value, '事件效果');
                    }
                    break;

                case 'lose_troops':
                    this.gameEngine.gameState.player.troops = Math.max(0, this.gameEngine.gameState.player.troops - effect.value);
                    gameLogger.logResourceChange('troops', -effect.value, '事件效果');
                    break;

                case 'gain_equipment':
                    // 簡化實現，實際需要根據稀有度選擇裝備
                    const equipment = this.selectRandomEquipment(effect.target);
                    if (equipment) {
                        gameLogger.logEquipmentGain(equipment.name, equipment.rarity);
                    }
                    break;
            }
        });
    }

    /**
     * 選擇隨機裝備
     */
    selectRandomEquipment(targetType) {
        let validEquipment = this.gameEngine.gameData.equipment.filter(equipment =>
            this.canPlayerObtainEquipment(equipment)
        );

        // 根據目標類型過濾
        if (targetType && targetType !== 'random') {
            if (targetType.includes('legendary')) {
                validEquipment = validEquipment.filter(e => e.rarity === 'legendary');
            } else if (targetType.includes('rare')) {
                validEquipment = validEquipment.filter(e => e.rarity === 'rare');
            }
        }

        return GameHelpers.randomChoice(validEquipment);
    }

    /**
     * 檢查玩家是否能獲得指定裝備
     */
    canPlayerObtainEquipment(equipment) {
        if (!equipment.requirements) return true;

        // 檢查城池數量需求
        if (equipment.requirements.minCityCount &&
            this.gameEngine.gameState.player.citiesControlled < equipment.requirements.minCityCount) {
            return false;
        }

        // 檢查是否僅限事件獲得
        if (equipment.requirements.eventOnly) {
            return false; // 在事件中會特別處理
        }

        return true;
    }

    /**
     * 觸發隨機起始事件
     */
    triggerRandomStartingEvent() {
        const startingEvents = [
            {
                name: '天降異象',
                effect: () => {
                    this.gameEngine.gameState.player.attributes.destiny += GameHelpers.randomInt(5, 15);
                    gameLogger.game('起始事件', '🌟 天降異象，天命大增！');
                }
            },
            {
                name: '義士來投',
                effect: () => {
                    this.gameEngine.gameState.player.troops += GameHelpers.randomInt(50, 150);
                    gameLogger.game('起始事件', '⚔️ 義士來投，兵力增加！');
                }
            },
            {
                name: '商人贊助',
                effect: () => {
                    this.gameEngine.gameState.player.gold += GameHelpers.randomInt(200, 500);
                    gameLogger.game('起始事件', '💰 商人贊助，財富增加！');
                }
            },
            {
                name: '名師指點',
                effect: () => {
                    const attr = GameHelpers.randomChoice(['intelligence', 'politics', 'charisma']);
                    this.gameEngine.gameState.player.attributes[attr] += GameHelpers.randomInt(5, 10);
                    gameLogger.game('起始事件', `📚 名師指點，${attr}提升！`);
                }
            }
        ];

        const event = GameHelpers.randomChoice(startingEvents);
        event.effect();
    }
}

// 導出類別
window.EventSystem = EventSystem;