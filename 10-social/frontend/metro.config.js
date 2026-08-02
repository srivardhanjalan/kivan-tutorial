const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Use Metro's built-in Node file watcher instead of the watchman daemon.
// On a project this size watchman adds no speed — only a failure mode (a
// stale daemon hangs Metro at "Waiting for Watchman"). Delete these two
// lines if you prefer watchman.
config.resolver.useWatchman = false;

module.exports = config;
