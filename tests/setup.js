// Jest setup file for SanGoAuto game testing

// Mock global objects that the game expects
global.window = global.window || {};
global.document = global.document || {};
global.console = console;

// Mock fetch for JSON loading
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock setTimeout and setInterval
global.setTimeout = jest.fn((fn, delay) => {
  if (typeof fn === 'function') {
    return fn();
  }
  return 1;
});

global.setInterval = jest.fn();
global.clearTimeout = jest.fn();
global.clearInterval = jest.fn();

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => {
  setTimeout(cb, 16);
  return 1;
});

// Mock console methods for testing
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
};

// Load source files for testing
const fs = require('fs');
const path = require('path');

// Load and execute source files
const sourceFiles = [
  'js/utils/helpers.js',
  'js/core/skill-system.js',
  'js/ui/components/skill-ui.js'
];

sourceFiles.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    // Execute the code in global context
    eval(content);
  }
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();

  // Reset fetch mock
  fetch.mockReset();

  // Reset setTimeout mock
  setTimeout.mockImplementation((fn, delay) => {
    if (typeof fn === 'function') {
      return fn();
    }
    return 1;
  });
});

// Helper function to create mock game data
global.createMockGameData = () => ({
  skills: [
    {
      id: 'test_skill_1',
      name: '測試技能1',
      description: '測試用技能',
      starCost: 1,
      type: 'combat',
      effects: [
        { type: 'attribute_bonus', target: 'strength', value: 5, description: '武力+5' }
      ]
    },
    {
      id: 'test_skill_2',
      name: '測試技能2',
      description: '測試用技能2',
      starCost: 2,
      type: 'passive',
      effects: [
        { type: 'attribute_bonus', target: 'intelligence', value: 3, description: '智力+3' }
      ]
    },
    {
      id: 'test_skill_3',
      name: '測試技能3',
      description: '測試用技能3',
      starCost: 3,
      type: 'special',
      effects: [
        { type: 'special', description: '特殊效果' }
      ]
    }
  ],
  cities: [
    {
      id: 'test_city',
      name: '測試城池',
      faction: 'other',
      garrison: [],
      connections: [],
      goldProduction: 100,
      troopProduction: 50,
      defenseValue: 200
    }
  ],
  generals: [],
  equipment: [],
  events: []
});

// Helper function to create mock DOM elements
global.createMockElement = (tagName = 'div') => {
  const element = {
    tagName: tagName.toUpperCase(),
    innerHTML: '',
    textContent: '',
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn(),
      contains: jest.fn()
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    insertBefore: jest.fn(),
    style: {},
    dataset: {},
    children: [],
    firstChild: null,
    lastChild: null,
    parentNode: null
  };

  return element;
};