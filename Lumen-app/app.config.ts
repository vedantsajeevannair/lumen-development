import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  // Shown under the icon when the web build is installed to a home screen,
  // and on the Android app itself. "Lumen-app" was the scaffold's directory
  // name, not a product name.
  name: "LUMEN",
  slug: "Lumen-app",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "lumen",
  userInterfaceStyle: "automatic",
  android: {
    package: "com.lumen.app",
    predictiveBackGestureEnabled: false,
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
  },
  web: {
    output: "static",
    // Installability. Without a manifest a phone treats "Add to Home Screen"
    // as a bookmark: browser chrome stays, the icon is a screenshot, and the
    // label is the URL. These are what turn it into something that opens like
    // an app.
    name: "LUMEN",
    shortName: "LUMEN",
    display: "standalone",
    themeColor: "#1e2a78",
    backgroundColor: "#0f172a",
    orientation: "portrait",
    description:
      "Report road damage from a photograph. Computer-vision detection, " +
      "severity scoring and tracked repair.",
    lang: "en",
    startUrl: "/",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#208AEF",
      },
    ],
    "expo-secure-store",
  ],
  // EAS project this builds under. `eas init` creates it but cannot write to a
  // dynamic config (this file is TypeScript, not app.json), so it is set here
  // by hand — without it a non-interactive build has nothing to upload to.
  owner: "vedantsajeevannair",
  extra: {
    eas: {
      projectId: "bd1d720c-e9b5-4d44-8e98-b202ec78918c",
    },
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
    onDemandFilesystem: true,
  },
});
