// 三國天命 - UI管理器
// UI Manager for game interface

class UIManager {
    constructor() {
        this.currentScreen = 'loading';
        this.gameEngine = null;
        this.updateInterval = null;
        this.eventLogContainer = null;
        this.maxEventLogs = 50;

        // UI元素引用
        this.elements = {
            screens: {},
            playerInfo: {},
            gameControls: {},
            eventLog: {},
            cityList: {},
            generalList: {}
        };

        this.init();
    }

    /**
     * 初始化UI管理器
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.setupEventLog();

        // 等待遊戲引擎準備
        this.waitForGameEngine();
    }

    /**
     * 緩存DOM元素
     */
    cacheElements() {
        // 螢幕元素
        this.elements.screens = {
            loading: document.getElementById('loading-screen'),
            mainMenu: document.getElementById('main-menu'),
            skillSelection: document.getElementById('skill-selection'),
            gameScreen: document.getElementById('game-screen'),
            gameOver: document.getElementById('game-over')
        };

        // 玩家信息元素
        this.elements.playerInfo = {
            name: document.getElementById('player-name'),
            level: document.getElementById('player-level'),
            strength: document.getElementById('attr-strength'),
            intelligence: document.getElementById('attr-intelligence'),
            leadership: document.getElementById('attr-leadership'),
            politics: document.getElementById('attr-politics'),
            charisma: document.getElementById('attr-charisma'),
            gold: document.getElementById('player-gold'),
            troops: document.getElementById('player-troops'),
            cities: document.getElementById('cities-controlled')
        };

        // 遊戲控制元素
        this.elements.gameControls = {
            pauseBtn: document.getElementById('pause-game'),
            saveBtn: document.getElementById('save-game'),
            speed1x: document.getElementById('speed-1x'),
            speed2x: document.getElementById('speed-2x'),
            speed4x: document.getElementById('speed-4x')
        };

        // 事件日誌元素
        this.elements.eventLog = {
            container: document.getElementById('event-messages'),
            clearBtn: document.getElementById('clear-log')
        };

        // 主選單元素
        this.elements.mainMenu = {
            newGameBtn: document.getElementById('start-new-game'),
            loadGameBtn: document.getElementById('load-game'),
            settingsBtn: document.getElementById('show-settings'),
            rulesBtn: document.getElementById('show-rules')
        };

        // 技能選擇元素
        this.elements.skillSelection = {
            container: document.getElementById('skill-selection'),
            skillsGrid: document.getElementById('available-skills'),
            remainingStars: document.getElementById('remaining-stars'),
            currentRound: document.getElementById('current-round'),
            skipBtn: document.getElementById('skip-skill'),
            confirmBtn: document.getElementById('confirm-selection')
        };
    }

    /**
     * 綁定事件處理器
     */
    bindEvents() {
        // 主選單事件
        if (this.elements.mainMenu.newGameBtn) {
            this.elements.mainMenu.newGameBtn.addEventListener('click', () => this.startNewGame());
        }

        // 遊戲控制事件
        if (this.elements.gameControls.pauseBtn) {
            this.elements.gameControls.pauseBtn.addEventListener('click', () => this.togglePause());
        }

        if (this.elements.gameControls.saveBtn) {
            this.elements.gameControls.saveBtn.addEventListener('click', () => this.saveGame());
        }

        // 速度控制
        ['1', '2', '4'].forEach(speed => {
            const btn = document.getElementById(`speed-${speed}x`);
            if (btn) {
                btn.addEventListener('click', () => this.setGameSpeed(parseInt(speed)));
            }
        });

        // 事件日誌清除
        if (this.elements.eventLog.clearBtn) {
            this.elements.eventLog.clearBtn.addEventListener('click', () => this.clearEventLog());
        }

        // 技能選擇事件
        if (this.elements.skillSelection.skipBtn) {
            this.elements.skillSelection.skipBtn.addEventListener('click', () => this.skipSkillRound());
        }
    }

    /**
     * 等待遊戲引擎準備
     */
    async waitForGameEngine() {
        const checkEngine = () => {
            if (window.gameEngine && window.gameEngine.gameData.skills.length > 0) {
                this.gameEngine = window.gameEngine;
                this.showMainMenu();
            } else {
                setTimeout(checkEngine, 100);
            }
        };
        checkEngine();
    }

    /**
     * 顯示主選單
     */
    showMainMenu() {
        this.switchScreen('mainMenu');
        this.updateLoadingText('遊戲準備就緒');
    }

    /**
     * 開始新遊戲
     */
    startNewGame() {
        if (!this.gameEngine) return;

        this.gameEngine.startNewGame();
        this.showSkillSelection();
        this.startUIUpdates();
    }

    /**
     * 顯示技能選擇界面
     */
    showSkillSelection() {
        this.switchScreen('skillSelection');
        this.updateSkillSelectionUI();
    }

    /**
     * 更新技能選擇UI
     */
    updateSkillSelectionUI() {
        if (!this.gameEngine || !this.gameEngine.skillSelection) return;

        const selection = this.gameEngine.skillSelection;

        // 更新星星和輪數顯示
        if (this.elements.skillSelection.remainingStars) {
            this.elements.skillSelection.remainingStars.textContent = selection.remainingStars;
        }
        if (this.elements.skillSelection.currentRound) {
            this.elements.skillSelection.currentRound.textContent = selection.round;
        }

        // 更新技能選項
        this.renderSkillChoices(selection.availableSkills, selection.remainingStars);
    }

    /**
     * 渲染技能選擇項
     */
    renderSkillChoices(skills, remainingStars) {
        const container = this.elements.skillSelection.skillsGrid;
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
                    this.showGameScreen();
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
                    this.showGameScreen();
                }
            }, 100);
        }
    }

    /**
     * 顯示遊戲主界面
     */
    showGameScreen() {
        this.switchScreen('gameScreen');
        this.updateGameUI();
    }

    /**
     * 開始UI更新循環
     */
    startUIUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(() => {
            if (this.gameEngine && this.gameEngine.gameState) {
                this.updateGameUI();

                // 檢查遊戲結束
                if (this.gameEngine.gameState.status === 'game_over') {
                    this.showGameOver();
                }
            }
        }, 1000); // 每秒更新一次
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
        if (this.elements.playerInfo.name) {
            this.elements.playerInfo.name.textContent = player.name;
        }
        if (this.elements.playerInfo.level) {
            this.elements.playerInfo.level.textContent = player.level;
        }

        // 屬性
        const attributes = ['strength', 'intelligence', 'leadership', 'politics', 'charisma'];
        attributes.forEach(attr => {
            const element = this.elements.playerInfo[attr];
            if (element) {
                element.textContent = player.attributes[attr];
                this.animateValueChange(element, player.attributes[attr]);
            }
        });

        // 資源（顯示當前值/最大值和維護成本）
        if (this.elements.playerInfo.gold) {
            const goldText = player.gold.toLocaleString();
            const maintenanceCost = player.maintenanceCost || 0;
            this.elements.playerInfo.gold.textContent = maintenanceCost > 0 ?
                `${goldText} (-${maintenanceCost}/回合)` : goldText;
        }
        if (this.elements.playerInfo.troops) {
            this.elements.playerInfo.troops.textContent =
                `${player.troops.toLocaleString()}/${player.maxTroops.toLocaleString()}`;
        }
        if (this.elements.playerInfo.cities) {
            this.elements.playerInfo.cities.textContent = player.citiesControlled;
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
     * 設置事件日誌
     */
    setupEventLog() {
        this.eventLogContainer = this.elements.eventLog.container;
    }

    /**
     * 添加日誌訊息（由gameLogger調用）
     */
    addLogMessage(logEntry) {
        if (!this.eventLogContainer) return;

        // 只顯示遊戲級別的日誌
        if (logEntry.level !== 'GAME') return;

        const messageElement = document.createElement('div');
        messageElement.className = `event-message ${this.getEventClass(logEntry.category)}`;

        messageElement.innerHTML = `
            <div class="event-timestamp">${GameHelpers.formatTime(logEntry.timestamp)}</div>
            <div class="event-title">[${logEntry.category}]</div>
            <div class="event-description">${logEntry.message}</div>
        `;

        // 添加到容器頂部
        this.eventLogContainer.insertBefore(messageElement, this.eventLogContainer.firstChild);

        // 限制日誌數量
        while (this.eventLogContainer.children.length > this.maxEventLogs) {
            this.eventLogContainer.removeChild(this.eventLogContainer.lastChild);
        }

        // 滾動到頂部顯示最新消息
        this.eventLogContainer.scrollTop = 0;

        // 添加動畫效果
        messageElement.classList.add('fade-in');
    }

    /**
     * 獲取事件樣式類別
     */
    getEventClass(category) {
        const classMap = {
            '隨機事件': 'neutral',
            '戰鬥': 'negative',
            '升級': 'positive',
            '招降': 'positive',
            '技能選擇': 'positive',
            '屬性分配': 'positive',
            '佔領': 'positive'
        };
        return classMap[category] || 'neutral';
    }

    /**
     * 清除事件日誌
     */
    clearEventLog() {
        if (this.eventLogContainer) {
            this.eventLogContainer.innerHTML = '';
        }
    }

    /**
     * 切換暫停狀態
     */
    togglePause() {
        if (this.gameEngine) {
            this.gameEngine.togglePause();
            const btn = this.elements.gameControls.pauseBtn;
            if (btn) {
                btn.textContent = this.gameEngine.isRunning ? '暫停' : '繼續';
            }
        }
    }

    /**
     * 設置遊戲速度
     */
    setGameSpeed(speed) {
        if (this.gameEngine) {
            this.gameEngine.setGameSpeed(speed);

            // 更新速度按鈕樣式
            ['1', '2', '4'].forEach(s => {
                const btn = document.getElementById(`speed-${s}x`);
                if (btn) {
                    btn.classList.toggle('active', s === speed.toString());
                }
            });
        }
    }

    /**
     * 保存遊戲
     */
    saveGame() {
        // TODO: 實現保存功能
        console.log('保存功能尚未實現');
    }

    /**
     * 切換螢幕
     */
    switchScreen(screenName) {
        Object.values(this.elements.screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });

        const targetScreen = this.elements.screens[screenName];
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenName;
        }
    }

    /**
     * 更新載入文字
     */
    updateLoadingText(text) {
        const loadingText = document.getElementById('loading-text');
        if (loadingText) {
            loadingText.textContent = text;
        }
    }

    /**
     * 顯示遊戲結束畫面
     */
    showGameOver() {
        this.switchScreen('gameOver');

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
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

    /**
     * 銷毀UI管理器
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

// 創建全局UI管理器實例
window.uiManager = new UIManager();

// 導出類別
window.UIManager = UIManager;