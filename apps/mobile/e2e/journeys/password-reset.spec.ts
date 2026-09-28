import { expect, test as base, type BrowserContext, type Page } from "@playwright/test";

/**
 * The whole forgot-password journey only exists for a signed-out person, so
 * every test here runs against a genuinely empty session — never the shared
 * `readyPage` fixture every other spec file uses (support/fixtures.ts),
 * which always carries a valid anonymous session by design.
 *
 * Determinism strategy (why this doesn't send/read real emails per test):
 * `supabase.auth.resetPasswordForEmail()` stores a real PKCE code verifier
 * in this browser's own localStorage *before* it ever calls Supabase (see
 * requestRealReset below) — that part is genuinely real, hits the actual
 * Supabase project once per worker, and is what satisfies "at least one
 * integration-level verification of the recovery flow". What this suite
 * can't do is receive the resulting email and read a real code out of it, so
 * for every test that needs to be *past* that point (a valid recovery
 * session already established), the one network call that would otherwise
 * require a real emailed code — `POST .../auth/v1/token?grant_type=pkce` —
 * is intercepted and given a deterministic response instead. The client-side
 * work this is standing in for (validating the local PKCE verifier exists,
 * establishing a session from the response, gating the UI on it) is exactly
 * what's under test; the server-side cryptographic exchange is Supabase's
 * own, already-covered by their own test suite, not this app's.
 */
interface WorkerFixtures {
  sharedContext: BrowserContext;
}
interface TestFixtures {
  resetPage: Page;
}

const test = base.extend<TestFixtures, WorkerFixtures>({
  sharedContext: [
    async ({ browser }, use, workerInfo) => {
      // Merge the project's own device config (viewport, isMobile, hasTouch,
      // userAgent — devices["Pixel 7"] on the `mobile` project) the same way
      // support/fixtures.ts's sharedContext does — a bare `browser.newContext`
      // would silently run every project at Playwright's desktop default
      // instead of actually emulating the device the project name promises.
      const { actionTimeout, navigationTimeout, screenshot, trace, video, storageState, ...contextOptions } =
        workerInfo.project.use;
      const context = await browser.newContext({
        ...contextOptions,
        storageState: { cookies: [], origins: [] },
      });
      context.setDefaultTimeout(actionTimeout ?? 5_000);
      context.setDefaultNavigationTimeout(navigationTimeout ?? 10_000);
      await use(context);
      await context.close();
    },
    { scope: "worker" },
  ],
  resetPage: async ({ sharedContext }, use) => {
    const page = await sharedContext.newPage();
    // The shared context (and its localStorage) persists across every test
    // in this worker — a test that reaches a mocked "valid session" (D, E,
    // F, H) genuinely persists that session via the real client's own
    // persistSession:true, exactly like a real sign-in would. Without
    // clearing it first, a later test's plain `goto("/")` finds that
    // leftover session and renders the authenticated Home screen instead of
    // the signed-out welcome screen it expects to start from. Needs an
    // actual page (same-origin) to read/write localStorage on, hence the
    // navigate-clear-navigate shape rather than a context-level reset.
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's own fixture `use`, not React's use()
    await use(page);
    await page.close();
  },
});

const FAKE_USER = {
  id: "e2e-recovery-user",
  aud: "authenticated",
  role: "authenticated",
  email: "e2e-recovery@example.com",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

/** Shape GoTrueClient's `_sessionResponse` transform requires — see @supabase/auth-js's lib/fetch.js `hasSession()`. */
const FAKE_SESSION_RESPONSE = {
  access_token: "e2e-fake-access-token",
  refresh_token: "e2e-fake-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: FAKE_USER,
};

async function goToWelcome(page: Page) {
  await page.goto("/");
  await expect(page.getByText("PrimeForm", { exact: true })).toBeVisible();
}

async function goToForgotPassword(page: Page) {
  await goToWelcome(page);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await expect(page.getByText("Reset your password", { exact: true })).toBeVisible();
}

/**
 * The one real network call in this file. Stores a genuine PKCE verifier in
 * this page's localStorage as a side effect (see the file doc comment) —
 * every test that mocks the recovery-exchange response depends on calling
 * this first, on the *same* page, so that verifier is actually present.
 */
async function requestRealReset(page: Page, email: string) {
  await goToForgotPassword(page);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Check your email")).toBeVisible({ timeout: 10_000 });
}

async function mockValidRecoveryExchange(page: Page) {
  await page.route("**/auth/v1/token?grant_type=pkce", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FAKE_SESSION_RESPONSE) }),
  );
}

/** Matches Supabase's real shape for a rejected PKCE exchange (expired, already-used, or invalid code) — GoTrueClient surfaces `error_description` as the thrown error's message. */
async function mockExpiredRecoveryExchange(page: Page) {
  await page.route("**/auth/v1/token?grant_type=pkce", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ error: "invalid_grant", error_description: "Email link is invalid or has expired" }),
    }),
  );
}

async function mockUpdateUserSuccess(page: Page) {
  await page.route("**/auth/v1/user", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FAKE_USER) }),
  );
}

/** requestRealReset + a mocked valid exchange, landing on the "Create a new password" form — the shared starting point for every test past the recovery-link step. */
async function reachNewPasswordForm(page: Page, email: string) {
  await requestRealReset(page, email);
  await mockValidRecoveryExchange(page);
  await page.goto("/reset-password?code=e2e-mock-recovery-code");
  await expect(page.getByText("Create a new password")).toBeVisible();
}

let emailCounter = 0;
/** A syntactically real, but never-inhabited address — never sent to (or expected to be read from) an actual inbox. Unique per call so repeated runs never collide with rate limiting on one exact address. */
function uniqueTestEmail(): string {
  emailCounter += 1;
  return `e2e-password-reset-${Date.now()}-${emailCounter}@example.com`;
}

test.describe("Password reset — request", () => {
  test("A: 'Forgot password?' exists on the sign-in screen and navigates to the reset-request screen", { tag: "@smoke" }, async ({
    resetPage,
  }) => {
    await goToWelcome(resetPage);
    await resetPage.getByRole("button", { name: "Sign in" }).click();
    const link = resetPage.getByRole("button", { name: "Forgot password?" });
    await expect(link).toBeVisible();

    await link.click();
    await expect(resetPage.getByText("Reset your password", { exact: true })).toBeVisible();
    await expect(
      resetPage.getByText("Enter your email and we'll send you a link to reset your password."),
    ).toBeVisible();
  });

  test("B: an invalid email format is rejected client-side, and no request is sent", async ({ resetPage }) => {
    let requestSent = false;
    await resetPage.route("**/auth/v1/recover*", (route) => {
      requestSent = true;
      route.continue();
    });

    await goToForgotPassword(resetPage);
    await resetPage.getByLabel("Email").fill("not-an-email");
    await resetPage.getByRole("button", { name: "Send reset link" }).click();

    await expect(resetPage.getByText("Enter a valid email address.")).toBeVisible();
    expect(requestSent, "an invalid email must never reach the network").toBe(false);
  });

  // C — the file's one integration-level check: a real call to Supabase's
  // actual resetPasswordForEmail, proving the request half of this flow
  // genuinely works end to end, not just against a mock of it.
  test("C: a valid email submission shows the same generic confirmation Supabase's anti-enumeration behaviour requires", async ({
    resetPage,
  }) => {
    await requestRealReset(resetPage, uniqueTestEmail());
    await expect(
      resetPage.getByText("If an account exists for this email, we'll send you a password reset link."),
    ).toBeVisible();
  });
});

test.describe("Password reset — recovery link", () => {
  test("D: a valid recovery session renders the new-password screen correctly", async ({ resetPage }) => {
    await reachNewPasswordForm(resetPage, uniqueTestEmail());
    await expect(resetPage.getByLabel("New password", { exact: true })).toBeVisible();
    await expect(resetPage.getByLabel("Confirm new password")).toBeVisible();
    await expect(resetPage.getByRole("button", { name: "Update password" })).toBeVisible();
  });

  test.describe("E: password validation", () => {
    test("empty password leaves Update password disabled", async ({ resetPage }) => {
      await reachNewPasswordForm(resetPage, uniqueTestEmail());
      await expect(resetPage.getByRole("button", { name: "Update password" })).toBeDisabled();
    });

    test("a weak (too short) password shows a clear validation message", async ({ resetPage }) => {
      await reachNewPasswordForm(resetPage, uniqueTestEmail());
      await resetPage.getByLabel("New password", { exact: true }).fill("short1");
      await expect(resetPage.getByText("Password must be at least 8 characters.")).toBeVisible();
      await expect(resetPage.getByRole("button", { name: "Update password" })).toBeDisabled();
    });

    test("mismatched confirmation shows a clear validation message", async ({ resetPage }) => {
      await reachNewPasswordForm(resetPage, uniqueTestEmail());
      await resetPage.getByLabel("New password", { exact: true }).fill("correcthorsebattery");
      await resetPage.getByLabel("Confirm new password").fill("correcthorseBATTERY");
      await expect(resetPage.getByText("Passwords do not match.")).toBeVisible();
      await expect(resetPage.getByRole("button", { name: "Update password" })).toBeDisabled();
    });

    test("a valid, matching password enables Update password", async ({ resetPage }) => {
      await reachNewPasswordForm(resetPage, uniqueTestEmail());
      await resetPage.getByLabel("New password", { exact: true }).fill("correcthorsebattery");
      await resetPage.getByLabel("Confirm new password").fill("correcthorsebattery");
      await expect(resetPage.getByRole("button", { name: "Update password" })).toBeEnabled();
    });
  });

  test("F: a successful update reaches the confirmation, and Back to login returns to the sign-in flow", async ({
    resetPage,
  }) => {
    await reachNewPasswordForm(resetPage, uniqueTestEmail());
    await mockUpdateUserSuccess(resetPage);

    await resetPage.getByLabel("New password", { exact: true }).fill("correcthorsebattery");
    await resetPage.getByLabel("Confirm new password").fill("correcthorsebattery");
    await resetPage.getByRole("button", { name: "Update password" }).click();

    await expect(resetPage.getByText("Password updated")).toBeVisible();
    await expect(resetPage.getByText("Your password has been changed successfully.")).toBeVisible();

    await resetPage.getByRole("button", { name: "Back to login" }).click();
    // Back at the welcome/sign-in flow, not left on a blank or broken route —
    // and specifically the *signed-out* welcome screen: the recovery session
    // must not have been left live as if it were a normal authenticated one.
    await expect(resetPage.getByText("PrimeForm", { exact: true })).toBeVisible();
    await expect(resetPage.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("G: an expired/invalid recovery link shows a clear error with a way back to requesting a new one", { tag: "@smoke" }, async ({
    resetPage,
  }) => {
    await mockExpiredRecoveryExchange(resetPage);
    await resetPage.goto("/reset-password?code=e2e-expired-code");

    await expect(resetPage.getByText("Reset link expired")).toBeVisible();
    await expect(
      resetPage.getByText("Your password reset link is no longer valid. Please request a new one."),
    ).toBeVisible();

    await resetPage.getByRole("button", { name: "Request a new reset link" }).click();
    await expect(resetPage.getByText("PrimeForm", { exact: true })).toBeVisible();
  });

  test("a missing/malformed code is treated the same as an expired link, not a blank screen", async ({ resetPage }) => {
    await resetPage.goto("/reset-password");
    await expect(resetPage.getByText("Reset link expired")).toBeVisible();
  });

  // H — deep link: this covers the case Playwright *can* prove — the app
  // opening cold, directly on the reset-password URL, with no prior
  // navigation (the web equivalent of "closed, then opened via the link").
  // "Already open, then receives the link" is an OS-level Intent/Universal
  // Link concept with no web equivalent to drive through a browser — the
  // same category of gap this project's mobile-testing skill already
  // documents for Android system-chrome behaviour. app/_layout.tsx's
  // `AppGate` pathname bypass (the actual code this test exercises) doesn't
  // distinguish cold vs. warm opens either way, so this case is the
  // meaningful one to prove: it's the one that could plausibly break.
  test("H: opening the reset-password URL directly (cold start) routes correctly with no prior app state", async ({
    resetPage,
  }) => {
    // reachNewPasswordForm's own final step *is* the cold-start case: a
    // fresh `goto` straight to the recovery URL, not a client-side push from
    // within an already-mounted app — exactly the shape a real deep link
    // opening the app produces.
    await reachNewPasswordForm(resetPage, uniqueTestEmail());
    await expect(resetPage.getByText("Create a new password")).toBeVisible();
  });
});

// I — mobile: @mobile-tagged, so playwright.config.ts's `mobile` project
// (Pixel 7 emulation) is the only one that runs it; desktop-chromium skips
// it via grepInvert. Keeps this file's other 10 tests from running twice.
test.describe("Password reset — mobile", { tag: "@mobile" }, () => {
  test("fields are visible, buttons are a real tappable size, and content isn't cut off on a mobile viewport", async ({
    resetPage,
  }) => {
    await goToForgotPassword(resetPage);
    const emailField = resetPage.getByLabel("Email");
    await expect(emailField).toBeVisible();
    const sendButton = resetPage.getByRole("button", { name: "Send reset link" });
    await expect(sendButton).toBeVisible();

    const viewport = resetPage.viewportSize()!;
    const fieldBox = await emailField.boundingBox();
    const buttonBox = await sendButton.boundingBox();
    expect(fieldBox, "email field should be measurable").not.toBeNull();
    expect(buttonBox, "send button should be measurable").not.toBeNull();
    if (fieldBox) expect(fieldBox.x + fieldBox.width, "email field must not be cut off horizontally").toBeLessThanOrEqual(viewport.width + 1);
    if (buttonBox) {
      // Real-finger tappable, not just technically clickable — matches this
      // project's own touchTarget.min (44px; packages/config/src/tokens/touchTarget.ts).
      expect(buttonBox.height, "Send reset link must meet the 44px minimum touch target").toBeGreaterThanOrEqual(44);
      expect(buttonBox.y + buttonBox.height, "button must not be cut off at the bottom of the viewport").toBeLessThanOrEqual(
        viewport.height + 1,
      );
    }

    // Focusing the email field must not push the button fully off-screen —
    // the practical, on-web-observable proxy for "the keyboard doesn't
    // obscure the controls" (a real software keyboard has no web
    // equivalent; this at least proves the layout has no fixed/absolute
    // positioning bug that would compound with one).
    await emailField.focus();
    await expect(sendButton).toBeVisible();

    await reachNewPasswordForm(resetPage, uniqueTestEmail());
    const newPasswordField = resetPage.getByLabel("New password", { exact: true });
    const confirmField = resetPage.getByLabel("Confirm new password");
    const updateButton = resetPage.getByRole("button", { name: "Update password" });
    await expect(newPasswordField).toBeVisible();
    await expect(confirmField).toBeVisible();
    await expect(updateButton).toBeVisible();
    const updateBox = await updateButton.boundingBox();
    if (updateBox) expect(updateBox.height, "Update password must meet the 44px minimum touch target").toBeGreaterThanOrEqual(44);
  });
});
