// 三國天命 - 遊戲主界面UI組件
// Main game interface components

class GameUI {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.gameEngine = uiManager.gameEngine;
    }

    /**
     * 顯示遊戲主界面
     */
    showGameScreen() {
        this.uiManager.switchScreen('gameScreen');
        this.updateGameUI();
    }

    /**
     * 更新遊戲UI
     */
    updateGameUI() {
        if (!this.gameEngine || !this.gameEngine.gameState) return;

        this.updatePlayerInfo();
        this.updateCitiesList();
        this.updateGeneralsList();
    }

    /**
     * 更新玩家信息
     */
    updatePlayerInfo() {
        const player = this.gameEngine.gameState.player;

        // 基本信息
        if (this.uiManager.elements.playerInfo.name) {
            this.uiManager.elements.playerInfo.name.textContent = player.name;
        }
        if (this.uiManager.elements.playerInfo.level) {
            this.uiManager.elements.playerInfo.level.textContent = player.level;
        }

        // 屬性
        const attributes = ['strength', 'intelligence', 'leadership', 'politics', 'charisma'];
        attributes.forEach(attr => {
            const element = this.uiManager.elements.playerInfo[attr];
            if (element) {
                element.textContent = player.attributes[attr];
                this.animateValueChange(element, player.attributes[attr]);
            }
        });

        // 資源（顯示當前值/最大值和維護成本）
        if (this.uiManager.elements.playerInfo.gold) {
            const goldText = player.gold.toLocaleString();
            const maintenanceCost = player.maintenanceCost || 0;
            this.uiManager.elements.playerInfo.gold.textContent = maintenanceCost > 0 ?
                `${goldText} (-${maintenanceCost}/回合)` : goldText;
        }
        if (this.uiManager.elements.playerInfo.troops) {
            this.uiManager.elements.playerInfo.troops.textContent =
                `${player.troops.toLocaleString()}/${player.maxTroops.toLocaleString()}`;
        }
        if (this.uiManager.elements.playerInfo.cities) {
            this.uiManager.elements.playerInfo.cities.textContent = player.citiesControlled;
        }

        // 顯示裝備解鎖狀態
        const statusContainer = document.getElementById('player-status-info');
        if (statusContainer) {
            let equipmentInfo = '';
            const cityCount = player.citiesControlled;
            if (cityCount >= 5) {
                equipmentInfo = '🗡️ 可購買：普通、稀有、高階稀有裝備';
            } else if (cityCount >= 3) {
                equipmentInfo = '🗡️ 可購買：普通、稀有裝備';
            } else if (cityCount >= 1) {
                equipmentInfo = '🗡️ 可購買：普通裝備';
            }
            statusContainer.innerHTML = `<div class="equipment-unlock">${equipmentInfo}</div>`;
        }
    }

    /**
     * 更新城池列表
     */
    updateCitiesList() {
        const mapContainer = document.getElementById('game-map');
        if (!mapContainer) return;

        const cities = Array.from(this.gameEngine.gameState.cities.values());
        const playerCities = cities.filter(city => city.faction === 'player');

        mapContainer.innerHTML = `
            <div class="cities-overview">
                <h4>控制城池 (${playerCities.length}/${cities.length})</h4>
                <div class="cities-grid">
                    ${playerCities.map(city => {
                        // 計算政治加成後的實際產出
                        const politicsBonus = this.gameEngine.gameState.player.attributes.politics / 100;
                        const actualGoldProduction = Math.floor(city.goldProduction * (1 + politicsBonus));

                        return `
                            <div class="city-card player-controlled">
                                <h5>${city.name}</h5>
                                <div class="city-stats">
                                    <div class="city-stat">
                                        <span class="stat-label">金錢產出:</span>
                                        <span class="stat-value">${actualGoldProduction}/回合</span>
                                    </div>
                                    <div class="city-stat">
                                        <span class="stat-label">兵力產出:</span>
                                        <span class="stat-value">${city.troopProduction}/回合</span>
                                    </div>
                                    <div class="city-stat">
                                        <span class="stat-label">防禦值:</span>
                                        <span class="stat-value">${city.defenseValue}</span>
                                    </div>
                                </div>
                                <div class="city-connections">
                                    連接: ${city.connections.map(connId => {
                                        const connCity = this.gameEngine.gameState.cities.get(connId);
                                        return connCity ? connCity.name : connId;
                                    }).join(', ')}
                                </div>
                                <div class="city-garrison">
                                    駐守: ${city.garrison.length > 0 ? city.garrison.join(', ') : '無'}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="enemy-cities-summary">
                    <h5>敵方城池</h5>
                    ${cities.filter(city => city.faction !== 'player').map(city => {
                        // 檢查是否與玩家城池相鄰
                        const isAdjacent = playerCities.some(playerCity =>
                            playerCity.connections.includes(city.id) || city.connections.includes(playerCity.id)
                        );

                        return `
                            <div class="enemy-city-item ${isAdjacent ? 'adjacent' : ''}">
                                <span class="city-name">${city.name} ${isAdjacent ? '⚔️' : ''}</span>
                                <span class="city-faction">${this.getFactionName(city.faction)} (防禦:${city.defenseValue})</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    /**
     * 更新將領列表
     */
    updateGeneralsList() {
        const generals = this.gameEngine.gameState.availableGenerals
            .filter(general => general.status === 'ally' || general.faction === 'player');

        const mapContainer = document.getElementById('game-map');
        if (!mapContainer) return;

        // 在現有地圖內容後添加將領信息
        const existingContent = mapContainer.innerHTML;
        mapContainer.innerHTML = existingContent + `
            <div class="generals-overview">
                <h4>麾下將領 (${generals.length})</h4>
                <div class="generals-grid">
                    ${generals.map(general => {
                        const maxTroops = general.maxTroops || Math.floor(general.attributes.leadership * 20);
                        const currentTroops = general.troops || 0;
                        const troopRatio = maxTroops > 0 ? Math.round((currentTroops / maxTroops) * 100) : 0;

                        return `
                            <div class="general-card">
                                <div class="general-header">
                                    <h5>${general.name}</h5>
                                    <span class="general-level">Lv.${general.level}</span>
                                </div>
                                <div class="general-attributes">
                                    <div class="attr-mini" title="武力">${general.attributes.strength}</div>
                                    <div class="attr-mini" title="智力">${general.attributes.intelligence}</div>
                                    <div class="attr-mini" title="統治">${general.attributes.leadership}</div>
                                    <div class="attr-mini" title="政治">${general.attributes.politics}</div>
                                    <div class="attr-mini" title="魅力">${general.attributes.charisma}</div>
                                </div>
                                <div class="general-troops">
                                    兵力: ${currentTroops}/${maxTroops} (${troopRatio}%)
                                </div>
                                <div class="general-status">
                                    狀態: ${this.getStatusName(general.status)}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    /**
     * 顯示遊戲結束畫面
     */
    showGameOver() {
        this.uiManager.switchScreen('gameOver');

        if (this.uiManager.updateInterval) {
            clearInterval(this.uiManager.updateInterval);
            this.uiManager.updateInterval = null;
        }

        // 更新遊戲結束統計
        const player = this.gameEngine.gameState.player;
        const gameTime = this.gameEngine.gameState.gameEndTime - this.gameEngine.gameState.gameStartTime;

        const statsContainer = document.getElementById('game-stats');
        if (statsContainer) {
            const minutes = Math.floor(gameTime / 60000);
            const seconds = Math.floor((gameTime % 60000) / 1000);

            statsContainer.innerHTML = `
                <div class="stat-item">
                    <span class="stat-label">遊戲時長:</span>
                    <span class="stat-value">${minutes}分${seconds}秒</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">最終等級:</span>
                    <span class="stat-value">Lv.${player.level}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">控制城池:</span>
                    <span class="stat-value">${player.citiesControlled}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">戰鬥勝利:</span>
                    <span class="stat-value">${player.battlesWon}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">招募將領:</span>
                    <span class="stat-value">${player.generalsRecruited}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">最終金錢:</span>
                    <span class="stat-value">${player.gold.toLocaleString()}</span>
                </div>
            `;
        }

        // 設定結束標題
        const resultTitle = document.getElementById('game-result-title');
        if (resultTitle) {
            const victory = player.citiesControlled >= this.gameEngine.gameData.cities.length;
            resultTitle.textContent = victory ? '🎉 天下統一！' : '💀 英雄末路';
        }
    }

    /**
     * 獲取勢力名稱
     */
    getFactionName(faction) {
        const names = {
            wei: '魏',
            shu: '蜀',
            wu: '吳',
            other: '其他',
            player: '玩家'
        };
        return names[faction] || faction;
    }

    /**
     * 獲取狀態名稱
     */
    getStatusName(status) {
        const names = {
            enemy: '敵對',
            neutral: '中立',
            ally: '盟友',
            player: '玩家'
        };
        return names[status] || status;
    }

    /**
     * 數值變化動畫
     */
    animateValueChange(element, newValue) {
        const oldValue = parseInt(element.dataset.oldValue || element.textContent);
        if (oldValue !== newValue) {
            element.dataset.oldValue = newValue;

            if (newValue > oldValue) {
                element.classList.add('value-increase');
                setTimeout(() => element.classList.remove('value-increase'), 1000);
            } else if (newValue < oldValue) {
                element.classList.add('value-decrease');
                setTimeout(() => element.classList.remove('value-decrease'), 1000);
            }
        }
    }
}

// 導出類別
window.GameUI = GameUI;