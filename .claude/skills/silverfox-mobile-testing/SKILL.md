---
name: silverfox-mobile-testing
description: >-
  Silverfox-specific Android/mobile device testing approach — why browser
  viewport emulation is not sufficient proof, what real-device concerns
  matter (safe-area/system-nav overlap, touch targets, keyboard behaviour),
  and how to triage a mobile-only failure. Use this whenever testing or
  debugging something on a real phone or emulator, investigating a
  mobile-only bug that doesn't reproduce in the browser/web preview,
  deciding whether a UI issue needs device testing at all, or setting up
  Android testing infrastructure for Silverfox. Trigger on phrases like
  "test this on my phone", "the nav bar is cut off", "set up an emulator",
  "this looks fine in the browser but not on my device", "mobile smoke
  test", even without the word "Android".
---

# Silverfox Mobile Testing

Silverfox's real product is the Expo/React Native app in `apps/mobile`
(`apps/web` is a separate design-system showcase with no product screens —
`CURRENT_STATE.md` §1). The app also runs as an Expo web build, which is
what this project's Playwright suite and the Claude Browser tool's mobile
viewport presets drive — useful and fast, but **not sufficient proof of real
device behaviour**. This is a documented, standing gap, not a new concern:
`CURRENT_STATE.md` §11 and `TEST_AUTOMATION_STRATEGY.md` layer 8 both name
"whether the bottom navigation stays clear of a real device's own system
navigation area" as something no browser-based tool in this project can
verify. `BDD_SPECIFICATION.md`'s own exclusions confirm this is deliberate —
mobile-viewport/visual-layout concerns are explicitly kept out of Gherkin
because they aren't business behaviour a browser check can honestly claim to
prove.

**Concrete precedent worth knowing**: a "bottom nav icons cut off" report
was investigated via the Claude Browser tool's mobile-emulated viewport
first — it measured a *correctly*-sized tab bar (68px, matching the code's
own height formula, nothing clipped) at that emulated viewport. That
non-reproduction is itself useful information (it narrows the bug to
something real-device-specific — most likely Android edge-to-edge mode
interacting with `useSafeAreaInsets()`, since `app.json` has
`edgeToEdgeEnabled: true`) but it is not a clean bill of health. Don't
conclude "not a bug" from a browser-viewport check alone on anything
safe-area/system-nav-related — escalate to a real device or emulator.

## When browser viewport testing is enough

- Business-logic-driven UI behaviour (does the right screen render, does a
  save show an error, does a form validate) — the existing Playwright suite
  (`apps/mobile/e2e/journeys/`) and the Claude Browser tool's mobile preset
  cover this well; see the `silverfox-quality-engineering` skill for layer
  selection generally.
- Layout math that's genuinely viewport-driven (does the tab bar's own
  bounding box fit the viewport) — `navigation.spec.ts`'s "the bottom tab
  bar stays fully within the viewport" test is this, and it's a legitimate,
  real check within its stated scope.

## When it is not enough — needs a real device or emulator

- **Safe-area / system-navigation overlap.** A browser has no real Android
  gesture bar or iOS home indicator; `useSafeAreaInsets()` behaves
  differently (typically returns 0) than on a real device. Any bug report
  or change touching the bottom tab bar (`app/(tabs)/_layout.tsx`), safe
  area insets, or `edgeToEdgeEnabled`/`predictiveBackGestureEnabled` in
  `app.json` needs real-device or emulator confirmation, not just a browser
  viewport check.
- **Touch targets.** "Technically clickable" in a browser (Playwright's
  `.click()` succeeds) is not the same as usable with a real finger.
  `packages/config/src/tokens/touchTarget.ts` defines the project's own
  targets (`min: 44`, `comfortable: 48`, `large: 56`) — a control sized
  below `min` for a primary action is worth flagging even if every
  automated test passes.
- **Small controls under real touch/timing.** `edit-cycle.spec.ts`'s "rapid
  taps on a Stepper's Increase button can silently under-count" is a real,
  already-found bug of exactly this kind (a stale-closure race, also logged
  in `CURRENT_STATE.md` §11) — steppers and other small tap targets deserve
  real-usability attention beyond "does clicking it work once."
- **Keyboard behaviour**: does the keyboard cover the active input, does
  `tabBarHideOnKeyboard` (set in `app/(tabs)/_layout.tsx`) actually behave
  correctly on-device, does dismissing the keyboard leave scroll position
  sane. None of this is meaningfully observable through a headless/browser
  Playwright run.
- **Real portrait dimensions and OS chrome** across actual device sizes, not
  just the `android-pixel-7`/`desktop-chromium` Playwright projects
  (`apps/mobile/playwright.config.ts`), which emulate viewport + touch +
  UA but not real OS-level system bars.

## Setting up device testing

No Android SDK/emulator was present on this project's dev machine as of this
writing, and there is no `eas.json`/dev-client set up — this is a fully
managed Expo project (`apps/mobile/app.json`, no `ios`/`android` native
folders). The fastest real-device path needs no build step at all:

1. Install **Expo Go** on the phone.
2. `pnpm --filter @silver-fox/mobile dev` (or the `mobile-web` launch config
   for the web preview specifically).
3. Scan the printed QR code.

An Android emulator (Android Studio + an AVD) is a heavier, multi-GB
one-time setup and needs virtualization enabled in Windows — worth it for
repeated device testing, not just to chase one bug. Prefer a real device
first when one is available; it's the ground truth this whole skill exists
because a browser can't substitute for.

## Smoke journeys, not a full mirror of Playwright

Do not duplicate the entire Playwright suite on a device — per
`silverfox-quality-engineering`, that's the wrong layer for anything not
specifically device-dependent. A small, high-value device smoke pass
covers: launch → logged-out welcome screen renders correctly → start
today's workout → the bottom tab bar and every icon/label are fully visible
and tappable with the OS's own system nav bar showing → log a set (real
keyboard, real touch on the weight stepper) → finish → history shows it.
That's enough to catch what only a real device can catch; everything else
stays in the layers that already cover it faster.

## Interaction style

Prefer the same accessible, role-based interaction Playwright already uses
(`getByRole`, `accessibilityLabel`) where the testing tool supports it, for
the same reason the project's own Playwright suite does — see
`packages/ui` and `apps/mobile/components/` for the `accessibilityLabel`/
`accessibilityRole` props already wired throughout. Don't invent a
device-specific selector strategy.

## Failure triage

Same discipline as `silverfox-quality-engineering`, with one more category:
**device/emulator issue** (a real device quirk, an emulator rendering
artifact, a stale Metro bundle on the phone) distinct from an application
defect. Before concluding a mobile-only difference is a real bug, rule out:
a stale bundle (reload the app), a genuinely different OS version/behaviour
worth naming explicitly, or an emulator-specific rendering limitation. When
it is a real layout bug, fix it systematically in the component/theme
tokens (as `SetRow.tsx`'s weight-stepper width fix did — decoupling button
width from `inputHeight` so it fits three flex columns, not a one-off pixel
nudge for one device) — never patch around it with an arbitrary
device-specific padding constant. Capture a screenshot and, where relevant,
the exact measured layout (bounding boxes, computed styles) rather than a
description alone — that level of evidence is what turned "icons look cut
off" into an actionable, provably-fixed change in this project's own
history.
