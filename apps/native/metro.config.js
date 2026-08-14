const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const {
	wrapWithReanimatedMetroConfig,
} = require("react-native-reanimated/metro-config");

// This file has to stay CommonJS: `expo/metro-config` ships no ESM export, so a
// real `import` of it fails to resolve. That rules out `import.meta.dirname`,
// which is only valid in a module — mixing the two is what made `expo export`
// fail with "require is not defined in ES module scope".
/** @type {import('expo/metro-config').MetroConfig} */
// biome-ignore lint/correctness/noGlobalDirnameFilename: CommonJS config, see above
const config = getDefaultConfig(__dirname);
// Alchemy writes runtime state here; block it to avoid Metro refresh loops.
const blockList = config.resolver.blockList ?? [];
const blockListPatterns = Array.isArray(blockList) ? blockList : [blockList];

config.resolver.blockList = [
	...blockListPatterns,
	/[/\\]packages[/\\]infra[/\\]\.alchemy(?:[/\\]|$)/,
];

const uniwindConfig = withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
	cssEntryFile: "./global.css",
	dtsFile: "./uniwind-types.d.ts",
});

module.exports = uniwindConfig;
