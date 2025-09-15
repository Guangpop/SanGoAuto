// 三國天命放置小遊戲 - 核心數據結構定義
// SanGoAuto - Core Data Structures

// ===== 基礎枚舉類型 =====

export enum Faction {
  WEI = 'wei',      // 魏
  SHU = 'shu',      // 蜀
  WU = 'wu',        // 吳
  OTHER = 'other',  // 其他勢力
  PLAYER = 'player' // 玩家
}

export enum EquipmentRarity {
  COMMON = 'common',       // 普通
  RARE = 'rare',          // 稀有
  LEGENDARY = 'legendary'  // 傳說
}

export enum EquipmentType {
  WEAPON = 'weapon',   // 武器
  ARMOR = 'armor',     // 護甲
  ACCESSORY = 'accessory', // 配飾
  MOUNT = 'mount'      // 坐騎
}

export enum EventType {
  POSITIVE = 'positive',   // 正面事件
  NEGATIVE = 'negative',   // 負面事件
  NEUTRAL = 'neutral',     // 中性事件
  CHOICE = 'choice'        // 選擇事件
}

export enum SkillType {
  COMBAT = 'combat',       // 戰鬥技能
  PASSIVE = 'passive',     // 被動技能
  ECONOMIC = 'economic',   // 經濟技能
  SPECIAL = 'special'      // 特殊技能
}

// ===== 核心能力值結構 =====

export interface Attributes {
  // 武力：攻擊傷害基礎值 (0-100)
  strength: number;

  // 智力：技能成功率與技能傷害 (0-100)
  intelligence: number;

  // 統治：帶兵數量與承受傷害上限 (0-100)
  leadership: number;

  // 政治：城池產資源量、守城成功率 (0-100)
  politics: number;

  // 魅力：俘虜將領的投降率 & 將領自動投奔的機率 (0-100)
  charisma: number;

  // 天命：隱藏數值，影響隨機事件機率 (0-100)
  destiny?: number;
}

// ===== 技能系統 =====

export interface Skill {
  id: string;
  name: string;
  description: string;
  type: SkillType;

  // 技能消耗星星數量 (1-3)
  starCost: number;

  // 技能效果定義
  effects: SkillEffect[];

  // 觸發條件
  trigger?: SkillTrigger;

  // 技能圖標/圖片
  icon?: string;
}

export interface SkillEffect {
  type: 'attribute_bonus' | 'combat_bonus' | 'event_modifier' | 'special';
  target?: keyof Attributes | 'all_attributes';
  value: number;
  duration?: 'permanent' | 'battle' | 'turn';
  description: string;
}

export interface SkillTrigger {
  condition: 'always' | 'battle' | 'defense' | 'event';
  probability?: number; // 0-100, 受智力影響
}

// ===== 將領系統 =====

export interface General {
  id: string;
  name: string;
  faction: Faction;

  // 基礎屬性
  attributes: Attributes;
  level: number; // 1-10

  // 裝備
  equipment: {
    weapon?: Equipment;
    armor?: Equipment;
    accessory?: Equipment;
    mount?: Equipment;
  };

  // 兵力
  troops: number;
  maxTroops: number;

  // 狀態
  status: 'enemy' | 'neutral' | 'ally' | 'player';

  // 歷史背景（可選，用於UI顯示）
  biography?: string;
  portrait?: string;
}

// ===== 城池系統 =====

export interface City {
  id: string;
  name: string;

  // 所屬勢力
  faction: Faction;

  // 駐守將領 (1-3名)
  garrison: General[];

  // 城池連接（圖結構）
  connections: string[]; // 連接的城池ID數組

  // 資源產出
  goldProduction: number;
  troopProduction: number;

  // 防禦值
  defenseValue: number;

  // 地理位置（用於地圖顯示）
  position?: {
    x: number;
    y: number;
  };

  // 城池描述
  description?: string;
}

// ===== 裝備系統 =====

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  rarity: EquipmentRarity;

  // 屬性加成
  attributeBonus: Partial<Attributes>;

  // 特殊效果
  specialEffects?: EquipmentEffect[];

  // 描述
  description: string;

  // 獲得條件
  requirements?: {
    minCityCount?: number;
    eventOnly?: boolean;
  };
}

export interface EquipmentEffect {
  type: 'first_strike' | 'damage_bonus' | 'defense_bonus' | 'special';
  value: number;
  description: string;
}

// ===== 事件系統 =====

export interface GameEvent {
  id: string;
  name: string;
  type: EventType;
  description: string;

  // 觸發機率 (0-100)
  baseProbability: number;

  // 天命修正值 (-50 到 +50)
  destinyModifier: number;

  // 觸發條件
  requirements?: EventRequirement[];

  // 事件結果
  outcomes: EventOutcome[];

  // 是否為選擇事件
  isChoice: boolean;
}

export interface EventRequirement {
  type: 'level' | 'city_count' | 'attribute' | 'equipment' | 'faction_status';
  target?: string;
  operator: '>=' | '<=' | '==' | '!=' | '>';
  value: number | string;
}

export interface EventOutcome {
  id: string;
  name: string;
  description: string;
  probability: number; // 0-100，如果是選擇事件則為100

  // 事件效果
  effects: EventEffect[];
}

export interface EventEffect {
  type: 'attribute_change' | 'gain_equipment' | 'lose_city' | 'gain_general' |
        'lose_troops' | 'gain_gold' | 'special';
  target?: string;
  value?: number;
  item?: Equipment | General;
  description: string;
}

// ===== 玩家與遊戲狀態 =====

export interface Player {
  // 基礎信息
  name: string;
  level: number; // 1-10

  // 能力值
  attributes: Attributes;

  // 技能
  skills: Skill[];

  // 裝備
  equipment: {
    weapon?: Equipment;
    armor?: Equipment;
    accessory?: Equipment;
    mount?: Equipment;
  };

  // 資源
  gold: number;
  troops: number;

  // 統計
  citiesControlled: number;
  battlesWon: number;
  battlesLost: number;
  generalsRecruited: number;
}

export interface GameState {
  // 玩家狀態
  player: Player;

  // 世界狀態
  cities: Map<string, City>;
  availableGenerals: General[];

  // 遊戲進度
  currentTurn: number;
  gameStartTime: number;
  gameEndTime?: number;

  // 遊戲設置
  settings: GameSettings;

  // 隨機數種子（用於可重現的隨機性）
  randomSeed: number;

  // 事件歷史
  eventHistory: GameEventRecord[];

  // 遊戲狀態
  status: 'initializing' | 'skill_selection' | 'playing' | 'paused' | 'game_over' | 'victory';
}

export interface GameSettings {
  // 遊戲速度 (1x, 2x, 4x)
  gameSpeed: number;

  // 語言設置
  language: 'zh' | 'en';

  // 音效設置
  soundEnabled: boolean;
  musicEnabled: boolean;

  // 自動存檔間隔（秒）
  autoSaveInterval: number;
}

export interface GameEventRecord {
  eventId: string;
  outcomeId: string;
  timestamp: number;
  description: string;
}

// ===== 遊戲初始化 =====

export interface SkillSelection {
  availableSkills: Skill[];
  selectedSkills: Skill[];
  remainingStars: number;
  round: number; // 1-3
}

export interface GameInitData {
  skills: Skill[];
  cities: City[];
  generals: General[];
  equipment: Equipment[];
  events: GameEvent[];
}

// ===== New Game+ 系統 =====

export interface NewGamePlusData {
  // 完成次數
  completionCount: number;

  // 遺產獎勵
  legacyBonuses: LegacyBonus[];

  // 解鎖內容
  unlockedSkills: string[];
  unlockedEquipment: string[];
  unlockedGenerals: string[];

  // 成就
  achievements: Achievement[];

  // 聲望點數
  prestigePoints: number;
}

export interface LegacyBonus {
  type: 'attribute_bonus' | 'starting_equipment' | 'extra_stars';
  target?: keyof Attributes;
  value: number;
  description: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  type: 'combat' | 'collection' | 'progression' | 'hidden';
  unlocked: boolean;
  unlockedAt?: number;
  reward?: LegacyBonus;
}

// ===== 存檔系統 =====

export interface SaveData {
  version: string;
  saveDate: number;
  gameState: GameState;
  newGamePlusData: NewGamePlusData;
  playerId: string;
}

export interface SaveSlot {
  id: number;
  name: string;
  saveData?: SaveData;
  lastModified?: number;
}