module.exports = {
  name: 'Offsides+',
  slug: 'offsides',
  version: '1.3.2',
  platforms: ['android'],
  githubUrl: 'https://github.com/darek225/offsides-improved',
  description: 'Offsides+ - an improved Android client for Sidechat/YikYak: working DMs, group chats, poll results, and a YikYak-style dark design. Fork of Offsides, maintained by Darek Anderson.',
  icon: './src/assets/icon.png',
  newArchEnabled: true,
  android: {
    package: 'com.darekanderson.offsides',
    versionCode: 66,
    adaptiveIcon: {
      foregroundImage: './src/assets/adaptive-icon.png',
      monochromeImage: './src/assets/adaptive-icon-mono.png',
      backgroundColor: '#3DDC84',
    },
    ...(process.env.EXPO_PUBLIC_FOSS === '1'
      ? {}
      : { googleServicesFile: './google-services.json' }),
    splash: {
      backgroundColor: '#3DDC84',
      image: './src/assets/Offsides.png',
    },
    predictiveBackGestureEnabled: true,
  },
  // FOSS build (EXPO_PUBLIC_FOSS=1): no Firebase plugins, no google-services.
  plugins:
    process.env.EXPO_PUBLIC_FOSS === '1'
      ? ['expo-font', 'expo-asset']
      : [
          'expo-font',
          'expo-asset',
          '@react-native-firebase/app',
          '@react-native-firebase/crashlytics',
        ],
  assetBundlePatterns: [
    '**/*',
    './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/*.ttf',
  ],
};
