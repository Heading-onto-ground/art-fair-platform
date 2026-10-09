const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;

// Zustand's ESM build reads import.meta.env. The web export is a classic
// script, so that throws before the app renders. Use the CommonJS build.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "zustand" || moduleName.startsWith("zustand/")) {
    return context.resolveRequest(
      {
        ...context,
        unstable_conditionNames: ["react-native", "require", "default"],
      },
      moduleName,
      platform
    );
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
