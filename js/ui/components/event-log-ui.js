// 三國天命 - 事件日誌UI組件
// Event logging and display interface components

class EventLogUI {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.eventLogContainer = null;
        this.maxEventLogs = 50;
    }

    /**
     * 設置事件日誌
     */
    setupEventLog() {
        this.eventLogContainer = this.uiManager.elements.eventLog.container;
    }

    /**
     * 添加日誌訊息（由gameLogger調用）
     */
    addLogMessage(logEntry) {
        if (!this.eventLogContainer) return;

        // 只顯示遊戲級別的日誌
        if (logEntry.level !== 'GAME') return;

        const messageElement = document.createElement('div');
        const eventClass = this.getEventClass(logEntry.category);
        const animationClass = this.getAnimationClass(logEntry.category);

        messageElement.className = `event-message ${eventClass} ${animationClass}`;

        // 初始設置為透明，準備動畫
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateX(-100%)';

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

        // 使用requestAnimationFrame確保DOM更新後再觸發動畫
        requestAnimationFrame(() => {
            messageElement.style.opacity = '1';
            messageElement.style.transform = 'translateX(0)';

            // 根據事件類型添加特殊動畫效果
            if (logEntry.category === '戰鬥') {
                messageElement.classList.add('battle-result');
            } else if (logEntry.category === '升級') {
                messageElement.classList.add('level-up');
            } else if (logEntry.category === '隨機事件') {
                messageElement.classList.add('random-event');
            } else if (['金錢', '兵力', '資源變化'].includes(logEntry.category)) {
                messageElement.classList.add('resource-change');
            }
        });

        // 滾動到頂部顯示最新消息
        this.eventLogContainer.scrollTop = 0;
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
            '佔領': 'positive',
            '資源產出': 'positive',
            '維護成本': 'neutral',
            '起始獎勵': 'positive',
            '起始事件': 'special',
            '季節效果': 'neutral',
            '時間異象': 'special'
        };
        return classMap[category] || 'neutral';
    }

    /**
     * 獲取動畫樣式類別
     */
    getAnimationClass(category) {
        const animationMap = {
            '戰鬥': 'bounce-in-left',
            '升級': 'zoom-in',
            '隨機事件': 'slide-in-left',
            '資源變化': 'slide-in-fade',
            '資源產出': 'slide-in-fade',
            '佔領': 'bounce-in-left',
            '招降': 'slide-in-fade',
            '起始事件': 'zoom-in',
            '時間異象': 'typewriter-effect'
        };
        return animationMap[category] || 'slide-in-left';
    }

    /**
     * 清除事件日誌
     */
    clearEventLog() {
        if (this.eventLogContainer) {
            this.eventLogContainer.innerHTML = '';
        }
    }
}

// 導出類別
window.EventLogUI = EventLogUI;