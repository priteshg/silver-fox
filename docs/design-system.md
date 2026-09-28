# Design System

## Visual direction

PrimeForm should feel like a premium, professional instrument:

- **Dark-first.** The dark palette is the primary (and currently only)
  theme. A light theme can be added later as a second palette behind the
  same token names.
- **Clean typography, large readable numbers.** Workout numbers (weight,
  reps, timers) use a distinct `statLarge` type style with tabular figures
  so they line up and stay legible at a glance, including mid-set in a gym.
- **Rounded cards, subtle elevation.** Content sits in cards with generous
  radius and restrained shadow — enough to imply depth, never decorative.
- **Strong photography, minimal clutter.** Imagery (exercise library, recipe
  photos) is the visual interest; UI chrome stays quiet around it.
- **Fast, accessible interactions.** Short animation durations, touch
  targets that meet platform minimums, and text contrast that holds up in a
  bright gym or outdoors.
- **Professional, not gimmicky.** No badges, confetti, or novelty
  illustration. Confidence comes from clarity and precision.

## Tokens (`packages/config`)

All visual constants live in `packages/config` as plain TypeScript, with
zero framework dependency, so both apps read the same values. Categories:

| Token category | File                    | Examples                                                 |
| -------------- | ----------------------- | -------------------------------------------------------- |
| Color          | `tokens/color.ts`       | `background`, `surface`, `accent`, `textPrimary`         |
| Spacing        | `tokens/spacing.ts`     | 4px-based scale, `xs` (4) → `xxxl` (64)                  |
| Radius         | `tokens/radius.ts`      | `sm` (8) → `pill` (999)                                  |
| Typography     | `tokens/typography.ts`  | Type scale from `caption` to `display`, plus `statLarge` |
| Elevation      | `tokens/elevation.ts`   | `none`, `raised`, `overlay`                              |
| Icon sizing    | `tokens/iconSize.ts`    | `sm` (16) → `xl` (32)                                    |
| Touch targets  | `tokens/touchTarget.ts` | `min` (44, iOS HIG), `comfortable` (48, Material)        |
| Motion         | `tokens/motion.ts`      | Durations (120/200/320ms), standard easing curves        |

`theme.ts` combines these into a single `theme` object, which is what
components and screens actually import:

```ts
import { theme } from "@silver-fox/config";

theme.color.background;
theme.spacing.lg;
theme.typography.typeScale.statLarge;
```

## Colour palette

- `background` #0A0A0B, `surface` #17181C, `surfaceElevated` #1F2126,
  `border` #2A2C31 — the dark neutral scale everything sits on.
- `textPrimary` #F5F5F7, `textSecondary` #A0A3AB, `textTertiary` #6B6E76.
- `silver` #C8CDD6 — secondary brand accent.
- `accent` #FF7A45 (`accentPressed` #E0672F) — primary actions, the "fox"
  color, reserved for the interactions that matter (log a set, save, etc.).
- `success` / `warning` / `danger` for future status and progress states.

## Components (`packages/ui`)

Only the components needed to prove the system works exist so far:

- **`Button`** — primary (filled, `accent`) and secondary (outlined)
  variants. Meets `touchTarget.comfortable` (48) minimum height.
- **`Card`** — the base surface for grouped content, optionally `elevated`.
- **`StatNumber`** — a large tabular-figure value with a small uppercase
  label underneath; the pattern for every prominent number in the app.

Each component that needs different rendering per platform ships as
`Component.tsx` (web) and `Component.native.tsx` (React Native), sharing one
prop type from `types.ts`. See
[architecture.md](./architecture.md#package-responsibilities-and-dependency-direction)
for why this pattern was chosen over `react-native-web`.

## Extending the system

- Add a token before you add a one-off value. If a screen needs a color or
  spacing value that isn't in `packages/config`, decide whether it's a new
  token (reusable) or truly one-off (rare) before hardcoding it.
- Add a component to `packages/ui` only once at least two places need it, or
  it's foundational enough that every screen will need it soon (e.g. a
  `Button`). Screen-specific composition stays in the app.
- Keep the palette dark-first; if/when a light theme is added, it should be
  a second value behind the same token keys, not a parallel system.
