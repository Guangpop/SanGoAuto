// 三國天命 - 工具函數
// Helper utilities for game mechanics

class GameHelpers {
    /**
     * 生成指定範圍的隨機整數
     * @param {number} min 最小值
     * @param {number} max 最大值
     * @returns {number} 隨機整數
     */
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * 生成指定範圍的隨機浮點數
     * @param {number} min 最小值
     * @param {number} max 最大值
     * @returns {number} 隨機浮點數
     */
    static randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * 生成0-100的隨機數，用於機率判定
     * @returns {number} 0-100的隨機數
     */
    static randomPercent() {
        return Math.random() * 100;
    }

    /**
     * 根據機率判定是否成功
     * @param {number} probability 成功機率(0-100)
     * @returns {boolean} 是否成功
     */
    static checkProbability(probability) {
        return this.randomPercent() <= probability;
    }

    /**
     * 從陣列中隨機選擇一個元素
     * @param {Array} array 目標陣列
     * @returns {*} 隨機選中的元素
     */
    static randomChoice(array) {
        if (!array || array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * 從陣列中隨機選擇多個不重複元素
     * @param {Array} array 目標陣列
     * @param {number} count 選擇數量
     * @returns {Array} 隨機選中的元素陣列
     */
    static randomChoices(array, count) {
        if (!array || array.length === 0) return [];
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, array.length));
    }

    /**
     * 限制數值在指定範圍內
     * @param {number} value 原值
     * @param {number} min 最小值
     * @param {number} max 最大值
     * @returns {number} 限制後的值
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * 根據天命值調整事件機率
     * @param {number} baseProbability 基礎機率
     * @param {number} destinyModifier 天命修正值
     * @param {number} playerDestiny 玩家天命值
     * @returns {number} 調整後的機率
     */
    static calculateEventProbability(baseProbability, destinyModifier, playerDestiny = 0) {
        // 天命影響公式：每10點天命影響1%機率
        const destinyEffect = (playerDestiny / 10) * (destinyModifier / 100);
        const finalProbability = baseProbability + destinyEffect;
        return this.clamp(finalProbability, 0, 100);
    }

    /**
     * 計算戰鬥力評分
     * @param {Object} attributes 能力值對象
     * @param {Array} skills 技能陣列
     * @param {Object} equipment 裝備對象
     * @returns {number} 戰鬥力評分
     */
    static calculateCombatPower(attributes, skills = [], equipment = {}) {
        let basePower = 0;

        // 基礎屬性權重
        basePower += attributes.strength * 1.2;      // 武力權重最高
        basePower += attributes.intelligence * 1.0;  // 智力影響技能
        basePower += attributes.leadership * 0.8;    // 統治影響兵力
        basePower += attributes.politics * 0.3;      // 政治權重較低
        basePower += attributes.charisma * 0.5;      // 魅力間接影響

        // 技能加成
        skills.forEach(skill => {
            if (skill.type === 'combat') {
                basePower += skill.starCost * 10;
            }
        });

        // 裝備加成
        Object.values(equipment).forEach(item => {
            if (item && item.attributeBonus) {
                Object.entries(item.attributeBonus).forEach(([attr, bonus]) => {
                    if (attr === 'strength') basePower += bonus * 1.2;
                    else if (attr === 'intelligence') basePower += bonus * 1.0;
                    else if (attr === 'leadership') basePower += bonus * 0.8;
                    else basePower += bonus * 0.5;
                });
            }
        });

        return Math.round(basePower);
    }

    /**
     * 格式化時間戳為可讀字串
     * @param {number} timestamp 時間戳
     * @returns {string} 格式化的時間字串
     */
    static formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-TW', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * 深度複製對象
     * @param {Object} obj 要複製的對象
     * @returns {Object} 複製後的對象
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));

        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }

    /**
     * 生成唯一ID
     * @param {string} prefix 前綴
     * @returns {string} 唯一ID
     */
    static generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
    }

    /**
     * 計算兩個城池之間是否相鄰
     * @param {Object} city1 城池1
     * @param {Object} city2 城池2
     * @returns {boolean} 是否相鄰
     */
    static areAdjacentCities(city1, city2) {
        return city1.connections.includes(city2.id);
    }

    /**
     * 根據魅力值計算招降成功率
     * @param {number} playerCharisma 玩家魅力值
     * @param {number} generalLevel 將領等級
     * @param {Object} bonuses 額外加成
     * @returns {number} 招降成功率(0-100)
     */
    static calculateRecruitmentRate(playerCharisma, generalLevel, bonuses = {}) {
        // 基礎公式：魅力值每點提供2%成功率，將領等級每級降低5%
        let baseRate = (playerCharisma * 2) - (generalLevel * 5);

        // 技能加成
        if (bonuses.recruitmentBonus) {
            baseRate += bonuses.recruitmentBonus;
        }

        // 裝備加成
        if (bonuses.equipmentBonus) {
            baseRate += bonuses.equipmentBonus;
        }

        return this.clamp(baseRate, 5, 95); // 最低5%，最高95%
    }

    /**
     * 驗證遊戲狀態的完整性
     * @param {Object} gameState 遊戲狀態
     * @returns {Object} 驗證結果 {valid: boolean, errors: Array}
     */
    static validateGameState(gameState) {
        const errors = [];

        if (!gameState.player) {
            errors.push('缺少玩家數據');
        } else {
            // 驗證玩家屬性
            const attrs = gameState.player.attributes;
            if (!attrs || typeof attrs !== 'object') {
                errors.push('玩家屬性數據無效');
            } else {
                ['strength', 'intelligence', 'leadership', 'politics', 'charisma'].forEach(attr => {
                    if (typeof attrs[attr] !== 'number' || attrs[attr] < 0 || attrs[attr] > 100) {
                        errors.push(`玩家${attr}屬性值無效`);
                    }
                });
            }

            // 驗證玩家等級
            if (typeof gameState.player.level !== 'number' ||
                gameState.player.level < 1 || gameState.player.level > 10) {
                errors.push('玩家等級無效');
            }
        }

        if (!gameState.cities || typeof gameState.cities !== 'object') {
            errors.push('城池數據無效');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 權重隨機選擇器
     * @param {Array} items 選項陣列，每項需包含 {item, weight}
     * @returns {*} 根據權重隨機選中的項目
     */
    static weightedRandomChoice(items) {
        if (!items || items.length === 0) return null;

        const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
        let random = Math.random() * totalWeight;

        for (const item of items) {
            random -= (item.weight || 1);
            if (random <= 0) {
                return item.item || item;
            }
        }

        return items[items.length - 1].item || items[items.length - 1];
    }

    /**
     * 隨機洗牌陣列
     * @param {Array} array 要洗牌的陣列
     * @returns {Array} 洗牌後的陣列副本
     */
    static shuffleArray(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    /**
     * 生成高斯分布隨機數（Box-Muller變換）
     * @param {number} mean 平均值
     * @param {number} stdDev 標準差
     * @returns {number} 符合高斯分布的隨機數
     */
    static gaussianRandom(mean = 0, stdDev = 1) {
        let u = 0, v = 0;
        while(u === 0) u = Math.random(); // 避免 log(0)
        while(v === 0) v = Math.random();

        const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        return z * stdDev + mean;
    }

    /**
     * 基於種子的偽隨機數生成器
     * @param {number} seed 隨機種子
     * @returns {Function} 偽隨機數生成函數
     */
    static createSeededRandom(seed) {
        let state = seed;
        return function() {
            state = (state * 9301 + 49297) % 233280;
            return state / 233280;
        };
    }

    /**
     * 計算動態事件權重
     * @param {Object} event 事件對象
     * @param {Object} gameState 遊戲狀態
     * @returns {number} 事件權重
     */
    static calculateEventWeight(event, gameState) {
        let weight = event.baseWeight || 1;

        // 根據天命值調整權重
        const destiny = gameState.player.attributes.destiny || 0;
        if (event.destinyModifier) {
            weight *= (1 + (destiny * event.destinyModifier / 100));
        }

        // 根據等級調整權重
        if (event.levelRequirement) {
            if (gameState.player.level < event.levelRequirement.min) {
                weight = 0;
            } else if (event.levelRequirement.preferred) {
                const levelDiff = Math.abs(gameState.player.level - event.levelRequirement.preferred);
                weight *= Math.max(0.1, 1 - (levelDiff * 0.2));
            }
        }

        // 根據城池數量調整權重
        if (event.cityRequirement) {
            const cities = gameState.player.citiesControlled;
            if (cities < event.cityRequirement.min) {
                weight = 0;
            } else if (cities > event.cityRequirement.max) {
                weight *= 0.5;
            }
        }

        return Math.max(0, weight);
    }

    /**
     * 動態難度調整器
     * @param {Object} gameState 遊戲狀態
     * @returns {Object} 難度調整參數
     */
    static calculateDifficultyAdjustments(gameState) {
        const player = gameState.player;
        const winRate = player.battlesWon / (player.battlesWon + player.battlesLost + 1);

        let difficultyModifier = 1.0;

        // 根據勝率調整難度
        if (winRate > 0.8) {
            difficultyModifier = 1.3; // 增加難度
        } else if (winRate < 0.3) {
            difficultyModifier = 0.7; // 降低難度
        }

        // 根據等級調整
        const levelBonus = player.level / 10;
        difficultyModifier += levelBonus * 0.2;

        // 根據城池數量調整
        const cityBonus = (player.citiesControlled - 1) * 0.1;
        difficultyModifier += cityBonus;

        return {
            combatModifier: difficultyModifier,
            eventSeverity: this.clamp(difficultyModifier, 0.5, 2.0),
            resourceModifier: 1 / difficultyModifier
        };
    }
}

// 導出工具類
window.GameHelpers = GameHelpers;