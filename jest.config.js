module.exports = {
  modulePathIgnorePatterns: ['generators/.*', 'fixtures/.*', 'types/.*'],
  testPathIgnorePatterns: ['/node_modules/', '/fixtures/'],
  testTimeout: 300000,
  transform: {
    '\\.js$': 'ts-jest',
    '\\.ts$': 'ts-jest',
  },
};
