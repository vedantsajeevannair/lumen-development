const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Ignore the backend folder and python virtual environments so Metro bundler doesn't scan or watch them
config.resolver.blockList = [
  ...Array.from(config.resolver.blockList ?? []),
  /backend\/.*/,
  /\.venv\/.*/,
  /\.git\/.*/,
  /coverage\/.*/,
];

// Limit the number of workers to prevent memory exhaustion crashes on Windows
config.maxWorkers = 2;

// Enable inline requires to speed up bundling and startup times
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
