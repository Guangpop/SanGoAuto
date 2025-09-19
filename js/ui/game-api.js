/**
 * 三國天命 - Game API 介面
 *
 * 這是 Phaser 與 DOM 之間的唯一通信介面
 * 按照 PRD 文檔規範實作，確保職責分離
 */

(function() {
    'use strict';

    // DOM 元素引用
    const elements = {
        // 頂部資訊欄
        playerName: null,
        playerLevel: null,
        statAttack: null,
        statSkill: null,
        statRule: null,
        statPolitics: null,
        statCharisma: null,
        money: null,
        troops: null,
        cities: null,

        // 事件日誌
        eventLog: null,

        // 底部 Tab
        tabButtons: null,
        tabContent: null,
        currentTab: 'generals',

        // 戰鬥 Modal
        battleModal: null,
        battleHeader: null,
        battleLog: null,
        battleClose: null
    };

    // 初始化 DOM 元素引用
    function initElements() {
        console.log('🔧 初始化 gameAPI DOM 元素...');

        // 頂部資訊欄
        elements.playerName = document.getElementById('player-name');
        elements.playerLevel = document.getElementById('player-level');
        elements.statAttack = document.getElementById('stat-attack');
        elements.statSkill = document.getElementById('stat-skill');
        elements.statRule = document.getElementById('stat-rule');
        elements.statPolitics = document.getElementById('stat-politics');
        elements.statCharisma = document.getElementById('stat-charisma');
        elements.money = document.getElementById('money');
        elements.troops = document.getElementById('troops');
        elements.cities = document.getElementById('cities');

        // 事件日誌
        elements.eventLog = document.getElementById('event-log');

        // 底部 Tab
        elements.tabButtons = document.querySelectorAll('.tab-btn');
        elements.tabContent = document.getElementById('tab-content');

        // 戰鬥 Modal
        elements.battleModal = document.getElementById('battle-modal');
        elements.battleHeader = document.getElementById('battle-header');
        elements.battleLog = document.getElementById('battle-log');
        elements.battleClose = document.getElementById('battle-close');

        // 檢查關鍵元素是否存在
        const missingElements = [];
        if (!elements.playerLevel) missingElements.push('player-level');
        if (!elements.statAttack) missingElements.push('stat-attack');
        if (!elements.statSkill) missingElements.push('stat-skill');
        if (!elements.statRule) missingElements.push('stat-rule');
        if (!elements.statPolitics) missingElements.push('stat-politics');
        if (!elements.statCharisma) missingElements.push('stat-charisma');
        if (!elements.money) missingElements.push('money');
        if (!elements.troops) missingElements.push('troops');
        if (!elements.cities) missingElements.push('cities');
        if (!elements.eventLog) missingElements.push('event-log');
        if (!elements.tabContent) missingElements.push('tab-content');

        if (missingElements.length > 0) {
            console.error('❌ 缺少關鍵DOM元素:', missingElements);
            console.log('🔍 所有可能的玩家相關元素:');
            const allPlayerElements = document.querySelectorAll('[id*="player"], [id*="stat"], [id*="money"], [id*="troops"], [id*="cities"]');
            allPlayerElements.forEach(el => {
                console.log(`  - ${el.id}: ${el.tagName}`);
            });
        } else {
            console.log('✅ 所有DOM元素都已找到');
        }

        // 綁定事件
        bindEvents();

        // 初始化Tab內容
        updateTabContent();

        // 添加初始事件以確保日誌可見
        setTimeout(() => {
            if (elements.eventLog && elements.eventLog.children.length === 0) {
                console.log('🔧 添加初始事件到空的日誌');
                addEventToQueue('🎮 遊戲系統已載入', { type: 'info' });
            }
        }, 1000);
    }

    // 綁定事件監聽器
    function bindEvents() {
        // Tab 切換
        elements.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                switchTab(btn.dataset.tab);
            });
        });

        // 戰鬥 Modal 關閉
        if (elements.battleClose) {
            elements.battleClose.addEventListener('click', () => {
                closeBattleModal();
            });
        }
    }

    // Tab 切換邏輯
    function switchTab(tabName) {
        // 更新按鈕狀態
        elements.tabButtons.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        elements.currentTab = tabName;
        updateTabContent();
    }

    // 更新 Tab 內容
    function updateTabContent() {
        if (!elements.tabContent) return;

        // 清空現有內容
        elements.tabContent.innerHTML = '';

        // 根據當前選中的 tab 顯示對應內容
        const mockData = getMockTabData(elements.currentTab);
        mockData.forEach(item => {
            const itemCard = createItemCard(item);
            elements.tabContent.appendChild(itemCard);
        });
    }

    // 創建 Item 卡片
    function createItemCard(item) {
        const card = document.createElement('div');
        card.className = 'item-card';

        card.innerHTML = `
            <div class="faction">${item.faction}</div>
            <img class="avatar" src="${item.avatar}" alt="${item.name}" onerror="this.style.display='none'">
            <div class="stars">${'★'.repeat(item.stars)}${'☆'.repeat(5-item.stars)}</div>
            <div class="name">${item.name}</div>
            <div class="subtext">${item.subtext}</div>
        `;

        return card;
    }

    // 獲取遊戲數據或模擬數據
    function getMockTabData(tabName) {
        // 嘗試從遊戲引擎獲取真實數據
        if (window.gameEngine && window.gameEngine.gameState) {
            const gameState = window.gameEngine.gameState;

            switch (tabName) {
                case 'generals':
                    // 獲取玩家的武將
                    const playerGenerals = [];
                    if (gameState.cities) {
                        gameState.cities.forEach(city => {
                            if (city.faction === 'player' && city.garrison) {
                                city.garrison.forEach(general => {
                                    playerGenerals.push({
                                        id: general.id,
                                        faction: '玩家',
                                        avatar: `assets/gen_${general.id}.png`,
                                        stars: Math.min(5, Math.floor(general.stats?.totalPower / 20) || 3),
                                        name: general.name,
                                        subtext: `武力 ${general.stats?.attack || 0}, 智力 ${general.stats?.intellect || 0}`
                                    });
                                });
                            }
                        });
                    }
                    // 如果沒有武將，顯示預設內容
                    if (playerGenerals.length === 0) {
                        playerGenerals.push({
                            id: 'player_char',
                            faction: '玩家',
                            avatar: '',
                            stars: Math.min(5, Math.floor((gameState.player.attributes.strength + gameState.player.attributes.intelligence) / 20)),
                            name: gameState.player.name,
                            subtext: `武力 ${gameState.player.attributes.strength}, 智力 ${gameState.player.attributes.intelligence}`
                        });
                    }
                    return playerGenerals;

                case 'cities':
                    // 獲取所有城池狀態
                    const cities = [];
                    if (gameState.cities) {
                        gameState.cities.forEach(city => {
                            let factionName = '中立';
                            if (city.faction === 'player') factionName = '玩家';
                            else if (city.faction && city.faction !== 'neutral') factionName = '敵對';

                            cities.push({
                                id: city.id,
                                faction: factionName,
                                avatar: '',
                                stars: city.faction === 'player' ? 3 : (city.canAttack ? 2 : 1),
                                name: city.name,
                                subtext: city.faction === 'player' ? `已控制` : (city.canAttack ? '可攻擊' : '距離遠')
                            });
                        });
                    }
                    return cities;

                case 'gear':
                    // 獲取玩家裝備
                    const equipment = [];
                    if (gameState.player.equipment) {
                        Object.entries(gameState.player.equipment).forEach(([slot, item]) => {
                            if (item) {
                                equipment.push({
                                    id: item.id,
                                    faction: item.rarity || '普通',
                                    avatar: '',
                                    stars: item.rarity === 'legendary' ? 5 : (item.rarity === 'rare' ? 3 : 1),
                                    name: item.name,
                                    subtext: item.effects || '無特效'
                                });
                            }
                        });
                    }
                    // 如果沒有裝備，顯示默認提示
                    if (equipment.length === 0) {
                        equipment.push({
                            id: 'no_equipment',
                            faction: '提示',
                            avatar: '',
                            stars: 0,
                            name: '尚無裝備',
                            subtext: '通過戰鬥或事件獲得'
                        });
                    }
                    return equipment;
            }
        }

        // 備用模擬數據
        const mockData = {
            generals: [
                { id: 'player_default', faction: '玩家', avatar: '', stars: 3, name: '玩家', subtext: '等待數據載入...' }
            ],
            cities: [
                { id: 'start_city', faction: '玩家', avatar: '', stars: 2, name: '起始城池', subtext: '等待數據載入...' }
            ],
            gear: [
                { id: 'no_gear', faction: '提示', avatar: '', stars: 0, name: '尚無裝備', subtext: '等待數據載入...' }
            ]
        };

        return mockData[tabName] || [];
    }

    // 事件日誌相關函數
    const eventQueue = [];
    let isProcessingEvents = false;

    function addEventToQueue(text, meta = {}) {
        eventQueue.push({ text, meta, timestamp: Date.now() });
        processEventQueue();
    }

    function processEventQueue() {
        if (isProcessingEvents || eventQueue.length === 0) return;

        // 移除戰鬥檢查，因為可能阻止事件顯示
        // if (document.body.classList.contains('in-battle')) return;

        isProcessingEvents = true;
        const event = eventQueue.shift();

        console.log('🎯 開始處理事件隊列:', event.text);

        // 多重方式尋找事件日誌元素
        let eventLogElement = elements.eventLog;
        if (!eventLogElement) {
            console.log('🔍 elements.eventLog 不存在，嘗試重新查找...');
            eventLogElement = document.getElementById('event-log');
            if (eventLogElement) {
                elements.eventLog = eventLogElement; // 更新緩存
                console.log('✅ 重新找到 event-log 元素');
            }
        }

        if (!eventLogElement) {
            console.log('🔍 getElementById 失敗，嘗試 querySelector...');
            eventLogElement = document.querySelector('#event-log, .event-log, [data-event-log]');
            if (eventLogElement) {
                elements.eventLog = eventLogElement; // 更新緩存
                console.log('✅ querySelector 找到事件日誌元素');
            }
        }

        // 如果還是找不到，創建備用元素
        if (!eventLogElement) {
            console.error('❌ 完全找不到事件日誌元素，創建備用元素');
            eventLogElement = createEmergencyEventLog();
        }

        console.log('📝 添加事件到日誌:', event.text);

        const eventItem = document.createElement('div');
        eventItem.className = 'event-item entering';
        eventItem.textContent = `[${new Date().toLocaleTimeString()}] ${event.text}`;

        // 根據事件類型添加樣式
        if (event.meta.type === 'warning') {
            eventItem.style.borderLeftColor = '#f39c12';
            eventItem.style.backgroundColor = '#fff8e1';
        } else if (event.meta.type === 'battle') {
            eventItem.style.borderLeftColor = '#e74c3c';
            eventItem.style.backgroundColor = '#ffebee';
        } else {
            eventItem.style.borderLeftColor = '#3498db';
            eventItem.style.backgroundColor = '#e3f2fd';
        }

        // 添加基本樣式確保可見
        eventItem.style.margin = '2px 0';
        eventItem.style.padding = '4px 8px';
        eventItem.style.borderRadius = '3px';
        eventItem.style.borderLeft = '3px solid';
        eventItem.style.fontSize = '12px';

        eventLogElement.appendChild(eventItem);

        // 觸發滑入動畫
        requestAnimationFrame(() => {
            eventItem.classList.remove('entering');
            eventItem.classList.add('entered');
        });

        // 滾動到底部
        eventLogElement.scrollTop = eventLogElement.scrollHeight;

        // 保持最多 20 條記錄
        const items = eventLogElement.querySelectorAll('.event-item');
        if (items.length > 20) {
            items[0].remove();
        }

        // 處理下一個事件（較短延遲）
        setTimeout(() => {
            isProcessingEvents = false;
            processEventQueue();
        }, 800); // 減少到0.8秒
    }

    // 創建緊急備用事件日誌
    function createEmergencyEventLog() {
        console.log('🚨 創建緊急備用事件日誌');

        let emergencyLog = document.getElementById('emergency-event-log');
        if (!emergencyLog) {
            emergencyLog = document.createElement('div');
            emergencyLog.id = 'emergency-event-log';
            emergencyLog.style.cssText = `
                position: fixed !important;
                top: 50px !important;
                right: 20px !important;
                width: 300px !important;
                height: 400px !important;
                background: rgba(255, 255, 255, 0.98) !important;
                border: 3px solid #e74c3c !important;
                border-radius: 8px !important;
                padding: 10px !important;
                z-index: 999999 !important;
                overflow-y: auto !important;
                font-family: monospace !important;
                font-size: 11px !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
            `;

            const title = document.createElement('div');
            title.textContent = '🚨 緊急事件日誌';
            title.style.cssText = `
                font-weight: bold !important;
                margin-bottom: 10px !important;
                color: #e74c3c !important;
                text-align: center !important;
                border-bottom: 1px solid #e74c3c !important;
                padding-bottom: 5px !important;
            `;
            emergencyLog.appendChild(title);

            // 添加到body
            document.body.appendChild(emergencyLog);
            console.log('✅ 緊急事件日誌已創建並添加到頁面');
        }

        return emergencyLog;
    }

    // 戰鬥 Modal 控制
    function openBattleModal(battleData) {
        if (!elements.battleModal) return;

        elements.battleHeader.textContent = `${battleData.attacker.name} VS ${battleData.defender.name}`;
        elements.battleLog.innerHTML = '';

        elements.battleModal.classList.remove('hidden');
        elements.battleModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('in-battle');
    }

    function closeBattleModal() {
        if (!elements.battleModal) return;

        elements.battleModal.classList.add('hidden');
        elements.battleModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('in-battle');
    }

    // 建立全域 API
    window.gameAPI = {
        // 初始化
        init: function() {
            // 等待 DOM 載入完成
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initElements);
            } else {
                initElements();
            }
        },

        // 更新頂部欄位（同步數值）
        updatePlayerStats: function(stats) {
            if (!stats) {
                console.warn('⚠️ updatePlayerStats 收到空數據');
                return;
            }

            console.log('🔄 updatePlayerStats 被調用:', stats);

            // 強制重新查找DOM元素（防止元素丟失）
            this.refreshElements();

            let updateCount = 0;

            if (stats.level && elements.playerLevel) {
                elements.playerLevel.textContent = stats.level;
                updateCount++;
                console.log('✅ 更新等級:', stats.level);
            } else if (stats.level) {
                console.warn('❌ playerLevel 元素不存在');
            }

            if (stats.money !== undefined && elements.money) {
                elements.money.textContent = stats.money.toLocaleString();
                updateCount++;
                console.log('✅ 更新金錢:', stats.money);
            } else if (stats.money !== undefined) {
                console.warn('❌ money 元素不存在');
            }

            if (stats.troops !== undefined && elements.troops) {
                elements.troops.textContent = stats.troops.toLocaleString();
                updateCount++;
                console.log('✅ 更新兵力:', stats.troops);
            } else if (stats.troops !== undefined) {
                console.warn('❌ troops 元素不存在');
            }

            if (stats.cities !== undefined && elements.cities) {
                elements.cities.textContent = stats.cities;
                updateCount++;
                console.log('✅ 更新城池:', stats.cities);
            } else if (stats.cities !== undefined) {
                console.warn('❌ cities 元素不存在');
            }

            if (stats.stats) {
                if (stats.stats.attack !== undefined && elements.statAttack) {
                    elements.statAttack.textContent = stats.stats.attack;
                    updateCount++;
                    console.log('✅ 更新武力:', stats.stats.attack);
                } else if (stats.stats.attack !== undefined) {
                    console.warn('❌ statAttack 元素不存在');
                }

                if (stats.stats.intellect !== undefined && elements.statSkill) {
                    elements.statSkill.textContent = stats.stats.intellect;
                    updateCount++;
                    console.log('✅ 更新智力:', stats.stats.intellect);
                } else if (stats.stats.intellect !== undefined) {
                    console.warn('❌ statSkill 元素不存在');
                }

                if (stats.stats.rule !== undefined && elements.statRule) {
                    elements.statRule.textContent = stats.stats.rule;
                    updateCount++;
                    console.log('✅ 更新統治:', stats.stats.rule);
                } else if (stats.stats.rule !== undefined) {
                    console.warn('❌ statRule 元素不存在');
                }

                if (stats.stats.politics !== undefined && elements.statPolitics) {
                    elements.statPolitics.textContent = stats.stats.politics;
                    updateCount++;
                    console.log('✅ 更新政治:', stats.stats.politics);
                } else if (stats.stats.politics !== undefined) {
                    console.warn('❌ statPolitics 元素不存在');
                }

                if (stats.stats.charisma !== undefined && elements.statCharisma) {
                    elements.statCharisma.textContent = stats.stats.charisma;
                    updateCount++;
                    console.log('✅ 更新魅力:', stats.stats.charisma);
                } else if (stats.stats.charisma !== undefined) {
                    console.warn('❌ statCharisma 元素不存在');
                }
            }

            console.log(`🔄 updatePlayerStats 完成，更新了 ${updateCount} 個元素`);

            if (updateCount === 0) {
                console.error('❌ 沒有成功更新任何元素，檢查DOM結構');
                // 列出當前頁面的所有可能元素
                const playerElements = document.querySelectorAll('[id*="player"], [id*="stat"], [id*="money"], [id*="troops"], [id*="cities"]');
                console.log('🔍 頁面中找到的玩家相關元素:', playerElements);
            }
        },

        // 重新查找DOM元素
        refreshElements: function() {
            elements.playerLevel = document.getElementById('player-level');
            elements.statAttack = document.getElementById('stat-attack');
            elements.statSkill = document.getElementById('stat-skill');
            elements.statRule = document.getElementById('stat-rule');
            elements.statPolitics = document.getElementById('stat-politics');
            elements.statCharisma = document.getElementById('stat-charisma');
            elements.money = document.getElementById('money');
            elements.troops = document.getElementById('troops');
            elements.cities = document.getElementById('cities');
        },

        // 推一條事件文字到事件日誌（DOM handle）
        pushEventLog: function(text, meta = {}) {
            console.log('🎯 pushEventLog 被調用:', text, meta);
            console.log('🔍 當前事件隊列長度:', eventQueue.length);
            console.log('🔍 是否正在處理事件:', isProcessingEvents);

            // 立即添加到隊列，不做DOM檢查（讓processEventQueue處理）
            addEventToQueue(text, meta);

            // 添加緊急處理邏輯
            if (eventQueue.length > 5) {
                console.warn('⚠️ 事件隊列過長，可能有阻塞問題');
                // 強制處理一次
                setTimeout(() => {
                    if (eventQueue.length > 0) {
                        console.log('🚨 強制處理阻塞的事件隊列');
                        isProcessingEvents = false; // 重置標誌
                        processEventQueue();
                    }
                }, 100);
            }
        },

        // 創建備用事件日誌（如果原元素不存在）
        createFallbackEventLog: function(initialText) {
            console.log('🚨 創建備用事件日誌');

            let fallbackLog = document.getElementById('fallback-event-log');
            if (!fallbackLog) {
                fallbackLog = document.createElement('div');
                fallbackLog.id = 'fallback-event-log';
                fallbackLog.style.cssText = `
                    position: fixed;
                    top: 100px;
                    left: 20px;
                    width: 300px;
                    height: 200px;
                    background: rgba(255, 255, 255, 0.95);
                    border: 2px solid red;
                    border-radius: 8px;
                    padding: 10px;
                    z-index: 9999;
                    overflow-y: auto;
                    font-size: 12px;
                `;

                const title = document.createElement('div');
                title.textContent = '🚨 備用事件日誌';
                title.style.cssText = 'font-weight: bold; margin-bottom: 10px; color: red;';
                fallbackLog.appendChild(title);

                document.body.appendChild(fallbackLog);
            }

            const item = document.createElement('div');
            item.textContent = initialText;
            item.style.cssText = 'margin: 2px 0; padding: 4px; background: #f0f0f0; border-radius: 3px;';
            fallbackLog.appendChild(item);
        },

        // 進入戰鬥模式（Phaser 會做動畫）
        enterBattleMode: function(battleData) {
            openBattleModal(battleData);

            // 模擬戰鬥過程
            const battleSteps = [
                `${battleData.attacker.name} 發起攻擊！`,
                `${battleData.defender.name} 進行反擊！`,
                `激烈的戰鬥進行中...`,
                `戰鬥結束！`
            ];

            battleSteps.forEach((step, index) => {
                setTimeout(() => {
                    const logItem = document.createElement('div');
                    logItem.textContent = step;
                    logItem.style.marginBottom = '8px';
                    elements.battleLog.appendChild(logItem);
                }, index * 1000);
            });
        },

        // 戰鬥結束，傳結果給 DOM
        exitBattleMode: function(result) {
            setTimeout(() => {
                closeBattleModal();

                // 將戰鬥結果加入事件日誌
                const resultText = result.winner === 'player'
                    ? `戰鬥勝利！獲得${result.loot?.gold || 0}金錢`
                    : '戰鬥失敗...';

                this.pushEventLog(resultText, { type: 'battle' });

                if (result.capturedGenerals && result.capturedGenerals.length > 0) {
                    result.capturedGenerals.forEach(general => {
                        this.pushEventLog(`${general.name} 投降加入！`, { type: 'info' });
                    });
                }
            }, 4000); // 戰鬥動畫結束後
        },

        // 請求 Phaser 在地圖上播放一次事件特效（可選）
        playMapEffect: function(effectName, targetNodeId, options = {}) {
            // 這裡會通知 Phaser 播放特效
            console.log('Play effect:', effectName, 'at', targetNodeId, options);
            // 實際使用時這裡會調用 Phaser 的方法
        },

        // 更新Tab內容（當遊戲數據改變時調用）
        updateTabContent: function(tabName = null) {
            if (tabName) {
                if (elements.currentTab === tabName) {
                    updateTabContent();
                }
            } else {
                updateTabContent();
            }
        },

        // 手動刷新所有UI（用於調試）
        refreshUI: function() {
            // 強制重新初始化所有DOM元素
            console.log('🔄 強制重新初始化gameAPI...');
            initElements();

            updateTabContent();

            // 如果有遊戲狀態，更新玩家數據
            if (window.gameEngine && window.gameEngine.gameState) {
                const player = window.gameEngine.gameState.player;
                this.updatePlayerStats({
                    level: player.level,
                    money: player.gold,
                    troops: player.troops,
                    cities: player.citiesControlled,
                    stats: {
                        attack: player.attributes.strength,
                        intellect: player.attributes.intelligence,
                        rule: player.attributes.leadership,
                        politics: player.attributes.politics,
                        charisma: player.attributes.charisma
                    }
                });
            }
        },

        // 強制重新初始化（當畫面切換時調用）
        forceReinit: function() {
            console.log('🔧 強制重新初始化gameAPI DOM元素...');

            // 清理舊狀態
            isProcessingEvents = false;

            // 重新初始化所有元素
            initElements();

            // 強制重新查找事件日誌元素
            elements.eventLog = document.getElementById('event-log');
            if (elements.eventLog) {
                console.log('✅ forceReinit 成功找到事件日誌元素');
                console.log('📏 事件日誌元素大小:', elements.eventLog.offsetWidth, 'x', elements.eventLog.offsetHeight);
                console.log('📍 事件日誌元素位置:', elements.eventLog.getBoundingClientRect());
            } else {
                console.error('❌ forceReinit 未找到事件日誌元素');

                // 嘗試等待DOM更新
                setTimeout(() => {
                    elements.eventLog = document.getElementById('event-log');
                    if (elements.eventLog) {
                        console.log('✅ 延遲後找到事件日誌元素');
                    } else {
                        console.error('❌ 延遲後仍未找到，DOM可能有問題');
                        // 列出所有可能的元素
                        const allPossible = document.querySelectorAll('[id*="event"], [class*="event"], [id*="log"], [class*="log"]');
                        console.log('🔍 頁面中所有包含event或log的元素:', allPossible);
                    }
                }, 200);
            }

            // 添加一個測試事件確保工作正常
            setTimeout(() => {
                this.pushEventLog('🔄 UI重新初始化完成', { type: 'info' });
            }, 300);
        },

        // 開發測試用的方法
        test: {
            updateStats: function() {
                window.gameAPI.updatePlayerStats({
                    level: 5,
                    money: 1500,
                    troops: 2500,
                    cities: 3,
                    stats: {
                        attack: 45,
                        intellect: 38,
                        rule: 42,
                        politics: 35,
                        charisma: 50
                    }
                });
            },

            addTestEvents: function() {
                const events = [
                    '遊戲開始，玩家建立根據地',
                    '發現附近有敵軍活動',
                    '招募到新武將：關羽',
                    '攻下許都城池！',
                    '獲得稀有裝備：青龍偃月刀'
                ];

                events.forEach((event, index) => {
                    setTimeout(() => {
                        window.gameAPI.pushEventLog(event, {
                            type: index % 2 === 0 ? 'info' : 'warning'
                        });
                    }, index * 500);
                });
            },

            startBattle: function() {
                window.gameAPI.enterBattleMode({
                    attacker: { name: '玩家' },
                    defender: { name: '曹操' },
                    mapNodeId: 'city_xudu'
                });

                setTimeout(() => {
                    window.gameAPI.exitBattleMode({
                        winner: 'player',
                        capturedGenerals: [{ name: '許褚' }],
                        loot: { gold: 500 }
                    });
                }, 5000);
            }
        }
    };

    // 自動初始化
    window.gameAPI.init();

})();