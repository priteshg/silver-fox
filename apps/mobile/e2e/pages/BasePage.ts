import type { Page, Locator } from "@playwright/test";
import { logger } from "../utils/logger";

type TabName = "Home" | "Workouts" | "Programmes" | "Exercises" | "Progress";

/**
 * Base class for all Page Objects.
 *
 * This app navigates via a bottom tab bar (role="tab" inside a tablist —
 * confirmed via accessibility snapshot in e2e/support/nav.ts), not a header
 * nav, so the shared surface here is the tab bar rather than header links.
 *
 * Locator priority used throughout this file and subclasses:
 *   1. getByRole  — most resilient, semantics-driven
 *   2. getByLabel — this app's accessibility labels (used heavily in
 *      e2e/journeys/*.spec.ts already, e.g. "Your profile", "Age (optional)")
 *   3. getByText  — visible text
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path: string): Promise<void> {
    logger.info("goto", { path });
    await this.page.goto(path);
    await this.waitForReady();
  }

  /** Subclasses assert their own screen's landmark is visible. */
  abstract waitForReady(): Promise<void>;

  async goToTab(name: TabName): Promise<void> {
    logger.info("goToTab", { name });
    await this.page.getByRole("tab", { name: new RegExp(name, "i") }).click();
  }

  /**
   * A fresh BDD scenario's page starts at `about:blank` — the tab bar this
   * class's `goToTab` clicks doesn't exist until the app has actually
   * booted at "/". Every non-Home Page Object's `open()` should go through
   * this (not call `goToTab` directly), confirmed necessary after every one
   * of this suite's other Page Objects hit an identical `goToTab` timeout
   * without it.
   */
  protected async openFromHome(tabName: TabName): Promise<void> {
    await this.page.goto("/");
    await this.page.getByText("Your Training Week").waitFor({ timeout: 10_000 });
    await this.goToTab(tabName);
    await this.waitForReady();
  }

  tab(name: TabName): Locator {
    return this.page.getByRole("tab", { name: new RegExp(name, "i") });
  }
}
