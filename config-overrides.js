module.exports = function override(config, env) {
  // Add fallbacks for node core modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "path": require.resolve("path-browserify"),
    "fs": false,
    "crypto": false
  };

  // Add externals for electron
  config.externals = {
    ...config.externals,
    electron: 'require("electron")'
  };

  return config;
} 