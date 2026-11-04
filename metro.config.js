// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// react-native-maps is native-only and cannot be bundled for web.
// On web, resolve it to a lightweight placeholder so the web export succeeds;
// Android and iOS keep using the real native map.
const webShims = {
  'react-native-maps': path.resolve(__dirname, 'shims/react-native-maps.web.js'),
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webShims[moduleName]) {
    return { type: 'sourceFile', filePath: webShims[moduleName] };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
