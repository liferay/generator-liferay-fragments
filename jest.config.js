module.exports = {
  modulePathIgnorePatterns: ['generators/.*', 'fixtures/.*', 'types/.*'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/fixtures/'],
  transform: {
    '\\.js$': 'ts-jest',
    '\\.ts$': 'ts-jest',
  },
};
