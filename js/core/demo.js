// 三國天命 - 遊戲演示腳本
// Demo script to showcase game mechanics

class GameDemo {
    constructor() {
        this.engine = null;
        this.isAutoPlay = false;
        this.skillSelectionIndex = 0;
    }

    /**
     * 開始演示
     */
    async startDemo() {
        console.log('='.repeat(60));
        console.log('🎮 三國天命放置小遊戲 - 演示開始');
        console.log('='.repeat(60));

        // 等待遊戲引擎初始化
        this.engine = window.gameEngine;
        if (!this.engine.gameData.skills.length) {
            console.log('⏳ 等待遊戲資源載入...');
            await new Promise(resolve => {
                const checkLoaded = () => {
                    if (this.engine.gameData.skills.length > 0) {
                        resolve();
                    } else {
                        setTimeout(checkLoaded, 100);
                    }
                };
                checkLoaded();
            });
        }

        // 開始新遊戲
        this.engine.startNewGame();
        console.log('✨ 遊戲初始化完成');

        // 自動進行技能選擇
        await this.autoSkillSelection();

        // 觀察遊戲進行
        this.observeGameProgress();
    }

    /**
     * 自動技能選擇演示
     */
    async autoSkillSelection() {
        console.log('\n🌟 開始自動技能選擇演示...');

        while (this.engine.gameState.status === 'skill_selection') {
            const skillSelection = this.engine.skillSelection;
            console.log(`\n--- 第${skillSelection.round}輪技能選擇 ---`);
            console.log(`剩餘星星: ${skillSelection.remainingStars}`);
            console.log('可選技能:');

            skillSelection.availableSkills.forEach((skill, index) => {
                const affordable = skill.starCost <= skillSelection.remainingStars ? '✅' : '❌';
                console.log(`  ${index + 1}. ${skill.name} (${skill.starCost}星) ${affordable}`);
                console.log(`     ${skill.description}`);
            });

            // 自動選擇策略：優先選擇能負擔得起的最貴技能
            await new Promise(resolve => setTimeout(resolve, 1000)); // 延遲演示效果

            const affordableSkills = skillSelection.availableSkills
                .filter(skill => skill.starCost <= skillSelection.remainingStars);

            if (affordableSkills.length > 0) {
                // 選擇最貴的可負擔技能
                const selectedSkill = affordableSkills.reduce((prev, current) =>
                    current.starCost > prev.starCost ? current : prev
                );

                console.log(`🎯 自動選擇: ${selectedSkill.name}`);
                this.engine.selectSkill(selectedSkill.id);
            } else {
                console.log('🚫 跳過此輪（無可負擔技能）');
                this.engine.skipSkillRound();
            }
        }

        console.log('\n✅ 技能選擇階段完成');
        this.displayPlayerStats();
    }

    /**
     * 顯示玩家狀態
     */
    displayPlayerStats() {
        const player = this.engine.gameState.player;
        console.log('\n📊 玩家最終屬性:');
        console.log(`等級: Lv.${player.level}`);
        console.log(`武力: ${player.attributes.strength}`);
        console.log(`智力: ${player.attributes.intelligence}`);
        console.log(`統治: ${player.attributes.leadership}`);
        console.log(`政治: ${player.attributes.politics}`);
        console.log(`魅力: ${player.attributes.charisma}`);
        console.log(`天命: ${player.attributes.destiny}`);

        console.log('\n🛡️ 已選技能:');
        player.skills.forEach(skill => {
            console.log(`  • ${skill.name} - ${skill.description}`);
        });

        console.log('\n💰 初始資源:');
        console.log(`金錢: ${player.gold}`);
        console.log(`兵力: ${player.troops}`);
        console.log(`城池: ${player.citiesControlled}`);
    }

    /**
     * 觀察遊戲進程
     */
    observeGameProgress() {
        console.log('\n🚀 主遊戲循環開始，自動觀察模式...');
        console.log('（遊戲將自動進行，可在控制台觀察詳細日誌）');

        // 設定遊戲速度為2倍
        this.engine.setGameSpeed(2);

        // 定期顯示遊戲狀態
        const statusInterval = setInterval(() => {
            if (!this.engine.isRunning || this.engine.gameState.status !== 'playing') {
                clearInterval(statusInterval);
                this.showFinalResults();
                return;
            }

            this.displayGameStatus();
        }, 5000); // 每5秒顯示一次狀態

        // 設定最大觀察時間（10分鐘）
        setTimeout(() => {
            if (this.engine.isRunning) {
                console.log('\n⏰ 演示時間到達上限，結束觀察');
                this.engine.endGame(false);
            }
            clearInterval(statusInterval);
        }, 600000);
    }

    /**
     * 顯示當前遊戲狀態
     */
    displayGameStatus() {
        const player = this.engine.gameState.player;
        const turn = this.engine.gameState.currentTurn;

        console.log('\n' + '─'.repeat(50));
        console.log(`⚔️  第${turn}回合狀態報告`);
        console.log(`等級: Lv.${player.level} | 金錢: ${player.gold} | 兵力: ${player.troops}`);
        console.log(`城池: ${player.citiesControlled} | 勝仗: ${player.battlesWon} | 敗仗: ${player.battlesLost}`);
        console.log(`招募將領: ${player.generalsRecruited}`);

        // 顯示控制的城池
        const controlledCities = Array.from(this.engine.gameState.cities.values())
            .filter(city => city.faction === 'player')
            .map(city => city.name);

        if (controlledCities.length > 0) {
            console.log(`控制城池: ${controlledCities.join(', ')}`);
        }

        console.log('─'.repeat(50));
    }

    /**
     * 顯示最終結果
     */
    showFinalResults() {
        console.log('\n' + '='.repeat(60));
        console.log('🏁 遊戲結束 - 最終統計');
        console.log('='.repeat(60));

        const player = this.engine.gameState.player;
        const gameTime = this.engine.gameState.gameEndTime - this.engine.gameState.gameStartTime;
        const minutes = Math.floor(gameTime / 60000);
        const seconds = Math.floor((gameTime % 60000) / 1000);

        console.log(`遊戲時長: ${minutes}分${seconds}秒`);
        console.log(`最終等級: Lv.${player.level}`);
        console.log(`控制城池: ${player.citiesControlled}`);
        console.log(`戰鬥勝利: ${player.battlesWon}`);
        console.log(`戰鬥失敗: ${player.battlesLost}`);
        console.log(`招募將領: ${player.generalsRecruited}`);
        console.log(`最終金錢: ${player.gold}`);
        console.log(`剩餘兵力: ${player.troops}`);

        // 顯示事件歷史
        if (this.engine.gameState.eventHistory.length > 0) {
            console.log('\n📜 重要事件回顧:');
            this.engine.gameState.eventHistory.slice(-10).forEach(event => {
                const time = GameHelpers.formatTime(event.timestamp);
                console.log(`  [${time}] ${event.description}`);
            });
        }

        // 顯示完整日誌選項
        console.log('\n💡 提示：');
        console.log('  輸入 gameLogger.exportLogs() 可查看完整遊戲日誌');
        console.log('  輸入 demo.startDemo() 可重新開始演示');

        console.log('\n🎮 演示結束，感謝體驗三國天命！');
        console.log('='.repeat(60));
    }

    /**
     * 手動技能選擇（用於交互演示）
     */
    manualSkillSelection() {
        if (this.engine.gameState.status !== 'skill_selection') {
            console.log('❌ 當前不在技能選擇階段');
            return;
        }

        const skillSelection = this.engine.skillSelection;
        console.log(`\n--- 第${skillSelection.round}輪技能選擇 ---`);
        console.log(`剩餘星星: ${skillSelection.remainingStars}`);

        skillSelection.availableSkills.forEach((skill, index) => {
            const affordable = skill.starCost <= skillSelection.remainingStars ? '✅' : '❌';
            console.log(`${index + 1}. ${skill.name} (${skill.starCost}星) ${affordable}`);
            console.log(`   ${skill.description}`);
        });

        console.log('\n使用方法:');
        console.log('  demo.selectSkill(0) - 選擇第1個技能');
        console.log('  demo.selectSkill(1) - 選擇第2個技能');
        console.log('  demo.selectSkill(2) - 選擇第3個技能');
        console.log('  demo.skipRound() - 跳過此輪');
    }

    /**
     * 選擇技能（用於交互演示）
     */
    selectSkill(index) {
        if (this.engine.gameState.status !== 'skill_selection') {
            console.log('❌ 當前不在技能選擇階段');
            return;
        }

        const skill = this.engine.skillSelection.availableSkills[index];
        if (!skill) {
            console.log('❌ 無效的技能索引');
            return;
        }

        const success = this.engine.selectSkill(skill.id);
        if (success) {
            console.log(`✅ 成功選擇技能: ${skill.name}`);
        } else {
            console.log('❌ 技能選擇失敗');
        }

        if (this.engine.gameState.status === 'skill_selection') {
            setTimeout(() => this.manualSkillSelection(), 100);
        } else {
            this.displayPlayerStats();
        }
    }

    /**
     * 跳過技能輪（用於交互演示）
     */
    skipRound() {
        if (this.engine.gameState.status !== 'skill_selection') {
            console.log('❌ 當前不在技能選擇階段');
            return;
        }

        this.engine.skipSkillRound();
        console.log('⏭️ 已跳過此輪');

        if (this.engine.gameState.status === 'skill_selection') {
            setTimeout(() => this.manualSkillSelection(), 100);
        } else {
            this.displayPlayerStats();
        }
    }
}

// 創建全局演示實例
window.demo = new GameDemo();

// 自動開始演示（可註解掉）
document.addEventListener('DOMContentLoaded', () => {
    // 延遲啟動以確保所有資源載入完成
    setTimeout(() => {
        console.log('🎯 輸入 demo.startDemo() 開始遊戲演示');
        console.log('🎯 輸入 demo.manualSkillSelection() 進行手動技能選擇');

        // 取消註解下行可自動開始演示
        // demo.startDemo();
    }, 1000);
});