/**
 * A minimal, renderer-free jest harness. The app's screens are proven on a
 * simulator (this repo's E2E convention; see 17-polish/README.md), and none of
 * the earlier steps shipped a jest setup. Step 15 adds one scoped to the pure
 * logic it introduced: the admin api client's request wiring and the role gate.
 * testEnvironment 'node' plus ts-jest in transpile-only mode (isolatedModules)
 * keep it independent of the React Native runtime, so no jest-expo or
 * react-native testing renderer is pulled in. watchman is off per the step's
 * tooling note.
 */
module.exports = {
  testEnvironment: 'node',
  watchman: false,
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
