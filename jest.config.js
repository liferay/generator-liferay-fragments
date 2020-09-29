module.exports = {
  modulePathIgnorePatterns: ['generators/.*', 'fixtures/.*', 'types/.*'],
  testPathIgnorePatterns: ['/node_modules/', '/fixtures/'],
  testTimeout: 30000,
  transform: {
    '\\.js$': 'ts-jest',
    '\\.ts$': 'ts-jest',
  },
};
