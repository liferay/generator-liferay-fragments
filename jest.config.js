module.exports = {
  modulePathIgnorePatterns: ['generators/.*', 'fixtures/.*', 'types/.*'],
  testPathIgnorePatterns: ['/node_modules/', '/fixtures/'],
  transform: {
    '\\.js$': 'ts-jest',
    '\\.ts$': 'ts-jest',
  },
};
