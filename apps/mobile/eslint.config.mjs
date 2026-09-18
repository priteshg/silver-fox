import expoConfig from "eslint-config-expo/flat.js";

export default [
  ...expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // This app's data hooks intentionally load from AsyncStorage on mount
      // (no query/cache library is in use). That's exactly the "fetch on
      // mount" pattern this rule flags; disabled rather than adding a data
      // library solely to satisfy it.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
