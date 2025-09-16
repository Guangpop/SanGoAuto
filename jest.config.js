module.exports = {
  testEnvironment: 'node', // 改為node環境，避免jsdom依賴問題
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/**/*.min.js',
    '!**/node_modules/**'
  ],
  transform: {
    '^.+\\.js$': 'babel-jest'
  }
};