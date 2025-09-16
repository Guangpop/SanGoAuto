// 三國天命 - 戰鬥系統
// Battle and combat management system

class BattleSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
    }

    /**
     * 處理戰鬥階段（返回訊息版本）
     */
    async processBattleWithMessages() {
        const messages = [];

        // 檢查是否有足夠兵力戰鬥
        if (this.gameEngine.gameState.player.troops < 50) {
            messages.push({
                category: '戰鬥',
                message: '兵力不足，暫停攻城'
            });
            return messages;
        }

        // 選擇目標城池（僅限相鄰城池）
        const targetCity = this.selectAdjacentBattleTarget();
        if (!targetCity) {
            messages.push({
                category: '戰鬥',
                message: '沒有可攻打的相鄰城池'
            });
            return messages;
        }

        // 計算戰鬥力（結合屬性、技能、裝備、兵力）
        const playerCombatPower = this.calculatePlayerCombatPower();
        const enemyCombatPower = this.calculateEnemyCombatPower(targetCity);

        // 戰鬥結算
        const battleResult = this.resolveBattleWithTroops(playerCombatPower, enemyCombatPower);

        // 處理戰鬥結果
        this.gameEngine.gameState.player.troops -= battleResult.playerCasualties;

        const resultText = battleResult.victory ? '勝利' : '失敗';
        const casualtyText = battleResult.playerCasualties > 0 ? `，損失${battleResult.playerCasualties}兵力` : '';

        messages.push({
            category: '戰鬥',
            message: `攻打【${targetCity.name}】${resultText}（我方戰力:${playerCombatPower.totalPower} vs 敵方戰力:${enemyCombatPower.totalPower}）${casualtyText}`
        });

        if (battleResult.victory) {
            this.gameEngine.gameState.player.battlesWon++;
            this.captureCity(targetCity);

            messages.push({
                category: '佔領',
                message: `🏰 成功佔領【${targetCity.name}】`
            });

            // 戰勝後有機會俘獲敵將
            const captureMessages = this.processCapturedGeneralsWithMessages(targetCity);
            messages.push(...captureMessages);
        } else {
            this.gameEngine.gameState.player.battlesLost++;
        }

        return messages;
    }

    /**
     * 選擇相鄰的戰鬥目標
     */
    selectAdjacentBattleTarget() {
        const playerCities = Array.from(this.gameEngine.gameState.cities.values())
            .filter(city => city.faction === 'player');

        const adjacentEnemyCities = [];

        playerCities.forEach(playerCity => {
            playerCity.connections.forEach(connectionId => {
                const connectedCity = this.gameEngine.gameState.cities.get(connectionId);
                if (connectedCity && connectedCity.faction !== 'player') {
                    // 避免重複添加同一個城池
                    if (!adjacentEnemyCities.find(city => city.id === connectedCity.id)) {
                        adjacentEnemyCities.push(connectedCity);
                    }
                }
            });
        });

        return GameHelpers.randomChoice(adjacentEnemyCities);
    }

    /**
     * 計算玩家戰鬥力
     */
    calculatePlayerCombatPower() {
        const player = this.gameEngine.gameState.player;

        // 基礎屬性戰力
        let basePower = 0;
        basePower += player.attributes.strength * 1.5;      // 武力最重要
        basePower += player.attributes.intelligence * 1.2;  // 智力影響技能
        basePower += player.attributes.leadership * 1.0;    // 統治影響指揮

        // 技能加成
        let skillBonus = 0;
        player.skills.forEach(skill => {
            skill.effects.forEach(effect => {
                if (effect.type === 'combat_bonus' || effect.type === 'attribute_bonus') {
                    skillBonus += effect.value;
                }
            });
        });

        // 裝備加成
        let equipmentBonus = 0;
        Object.values(player.equipment).forEach(item => {
            if (item && item.attributeBonus) {
                Object.entries(item.attributeBonus).forEach(([attr, bonus]) => {
                    if (attr === 'strength') equipmentBonus += bonus * 1.5;
                    else if (attr === 'intelligence') equipmentBonus += bonus * 1.2;
                    else if (attr === 'leadership') equipmentBonus += bonus * 1.0;
                    else equipmentBonus += bonus * 0.8;
                });
            }
        });

        // 兵力加成（兵力越多戰鬥力越強）
        const troopBonus = Math.sqrt(player.troops) * 2;

        const totalPower = basePower + skillBonus + equipmentBonus + troopBonus;

        return {
            basePower,
            skillBonus,
            equipmentBonus,
            troopBonus,
            totalPower: Math.floor(totalPower)
        };
    }

    /**
     * 計算敵方戰鬥力
     */
    calculateEnemyCombatPower(city) {
        let totalPower = city.defenseValue;

        // 駐守將領加成
        city.garrison.forEach(generalId => {
            const general = this.gameEngine.gameState.availableGenerals.find(g => g.id === generalId);
            if (general) {
                const generalPower = GameHelpers.calculateCombatPower(
                    general.attributes,
                    [],
                    general.equipment || {}
                );
                totalPower += generalPower;

                // 兵力加成
                totalPower += Math.sqrt(general.troops || 500) * 1.5;
            }
        });

        return {
            basePower: city.defenseValue,
            garrisonPower: totalPower - city.defenseValue,
            totalPower: Math.floor(totalPower)
        };
    }

    /**
     * 基於兵力的戰鬥結算
     */
    resolveBattleWithTroops(playerPower, enemyPower) {
        // 計算基礎勝率
        const powerRatio = playerPower.totalPower / (playerPower.totalPower + enemyPower.totalPower);
        let winRate = powerRatio * 100;

        // 添加隨機因素
        winRate = GameHelpers.clamp(winRate, 15, 85);

        const victory = GameHelpers.checkProbability(winRate);

        // 計算傷亡
        let playerCasualties;
        if (victory) {
            // 勝利時傷亡較少
            playerCasualties = Math.floor(this.gameEngine.gameState.player.troops * GameHelpers.randomInt(5, 15) / 100);
        } else {
            // 失敗時傷亡較多
            playerCasualties = Math.floor(this.gameEngine.gameState.player.troops * GameHelpers.randomInt(20, 40) / 100);
        }

        return {
            victory,
            playerCasualties: Math.min(playerCasualties, this.gameEngine.gameState.player.troops),
            winRate: Math.round(winRate)
        };
    }

    /**
     * 占領城池
     */
    captureCity(city) {
        city.faction = 'player';
        this.gameEngine.gameState.player.citiesControlled++;
    }

    /**
     * 處理俘獲的將領（返回訊息版本）
     */
    processCapturedGeneralsWithMessages(city) {
        const messages = [];

        if (city.garrison.length === 0) return messages;

        city.garrison.forEach(generalId => {
            const general = this.gameEngine.gameState.availableGenerals.find(g => g.id === generalId);
            if (general && general.status !== 'ally') {
                // 根據魅力值決定是否招降
                const recruitmentRate = GameHelpers.calculateRecruitmentRate(
                    this.gameEngine.gameState.player.attributes.charisma,
                    general.level
                );

                const success = GameHelpers.checkProbability(recruitmentRate);
                const result = success ? '成功' : '失敗';

                messages.push({
                    category: '招降',
                    message: `招降【${general.name}】${result}（成功率:${Math.round(recruitmentRate)}%）`
                });

                if (success) {
                    general.status = 'ally';
                    general.faction = 'player';
                    this.gameEngine.gameState.player.generalsRecruited++;

                    // 分配兵力給新將領
                    this.allocateTroopsToGeneral(general);
                }
            }
        });

        return messages;
    }

    /**
     * 為將領分配兵力
     */
    allocateTroopsToGeneral(general) {
        const availableTroops = Math.floor(this.gameEngine.gameState.player.troops * 0.2); // 分配20%兵力
        const troopsToAllocate = Math.min(availableTroops, general.maxTroops);

        if (troopsToAllocate > 0) {
            general.troops = troopsToAllocate;
            this.gameEngine.gameState.player.troops -= troopsToAllocate;

            gameLogger.game('兵力分配', `為${general.name}分配${troopsToAllocate}兵力`);
        }
    }

    /**
     * 處理收編階段（返回訊息版本）
     */
    async processRecruitmentWithMessages() {
        const messages = [];

        // 簡化實現：有機會獲得隨機將領
        if (GameHelpers.checkProbability(20)) { // 20%機率
            const availableGeneral = GameHelpers.randomChoice(
                this.gameEngine.gameState.availableGenerals.filter(g => g.status !== 'player')
            );

            if (availableGeneral) {
                const successRate = GameHelpers.calculateRecruitmentRate(
                    this.gameEngine.gameState.player.attributes.charisma,
                    availableGeneral.level
                );

                const success = GameHelpers.checkProbability(successRate);
                const result = success ? '成功' : '失敗';

                messages.push({
                    category: '招降',
                    message: `招降【${availableGeneral.name}】${result}（成功率:${Math.round(successRate)}%）`
                });

                if (success) {
                    availableGeneral.status = 'ally';
                    availableGeneral.faction = 'player';
                    this.gameEngine.gameState.player.generalsRecruited++;
                }
            }
        }

        return messages;
    }
}

// 導出類別
window.BattleSystem = BattleSystem;