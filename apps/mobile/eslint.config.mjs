import expoConfig from "eslint-config-expo/flat.js";

export default [
  ...expoConfig,
  {
    // playwright-report/ and test-results/ are generated Playwright output
    // (HTML report, trace viewer assets, failure screenshots) — build
    // artifacts, not source, and playwright-report's bundled trace-viewer
    // JS is large enough to blow past ESLint's own defaults if it's ever
    // linted by accident. e2e-dist/ is the static web export the e2e suite's
    // webServer builds and serves (playwright.config.ts) — a minified
    // production JS bundle, same problem.
    ignores: ["dist/*", "e2e-dist/**", "playwright-report/**", "test-results/**", "e2e/.features-gen/**"],
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
