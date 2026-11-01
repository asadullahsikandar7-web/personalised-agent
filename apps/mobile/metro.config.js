const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo support: watch the workspace root (so changes to packages/shared trigger a rebuild)
// and let Metro follow pnpm's symlinks into its content-addressable store - this is the minimal,
// officially-documented setup and, unlike a custom nodeModulesPaths override, doesn't risk
// Metro resolving a different (and possibly incomplete) copy of a package than the one Babel's
// import actually points at.
config.watchFolders = [workspaceRoot];
config.resolver.unstable_enableSymlinks = true;
config.resolver.disableHierarchicalLookup = false;

module.exports = withNativeWind(config, { input: './src/theme/global.css' });
