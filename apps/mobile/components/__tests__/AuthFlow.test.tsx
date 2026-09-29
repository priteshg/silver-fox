import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestPasswordResetDebug } from "../../lib/supabase/auth";
import { AuthProvider } from "../../providers/AuthProvider";
import { AuthFlow } from "../AuthFlow";

function renderAuthFlow() {
  return render(
    <AuthProvider>
      <AuthFlow />
    </AuthProvider>,
  );
}

/** From the welcome screen, taps through to the sign-in screen where "Forgot password?" lives. */
async function goToSignIn() {
  renderAuthFlow();
  fireEvent.click(await screen.findByRole("button", { name: "Sign in" }));
  await screen.findByRole("button", { name: "Forgot password?" });
}

describe("AuthFlow — forgot password", () => {
  beforeEach(() => {
    vi.mocked(requestPasswordResetDebug).mockReset();
    vi.mocked(requestPasswordResetDebug).mockResolvedValue({ redirectTo: "primeform://reset-password", capturedRequestUrl: "(mocked)" });
  });

  it("navigates from the sign-in screen to the reset-request screen", async () => {
    await goToSignIn();
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    expect(await screen.findByText("Reset your password")).toBeInTheDocument();
  });

  it("rejects an invalid email format without calling requestPasswordResetDebug", async () => {
    await goToSignIn();
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    await screen.findByText("Reset your password");

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(requestPasswordResetDebug).not.toHaveBeenCalled();
  });

  it("submits a valid email and shows the same confirmation whether or not the account exists", async () => {
    await goToSignIn();
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    await screen.findByText("Reset your password");

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByText("Check your email")).toBeInTheDocument();
    // Deliberately generic — never echoes the submitted address back, so this
    // can't be used to distinguish a registered account from an unregistered one.
    expect(
      screen.getByText("If an account exists for this email, we'll send you a password reset link."),
    ).toBeInTheDocument();
    await waitFor(() => expect(requestPasswordResetDebug).toHaveBeenCalledWith("person@example.com"));
  });

  it("shows a generic error (not an email-enumeration signal) when the request itself fails", async () => {
    vi.mocked(requestPasswordResetDebug).mockRejectedValueOnce(new Error("Network request failed"));
    await goToSignIn();
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    await screen.findByText("Reset your password");

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByText("Network request failed")).toBeInTheDocument();
    expect(screen.queryByText("Check your email")).not.toBeInTheDocument();
  });

  it("returns to the sign-in screen from the forgot-password screen", async () => {
    await goToSignIn();
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    await screen.findByText("Reset your password");

    fireEvent.click(screen.getByRole("button", { name: "Back to sign in" }));
    expect(await screen.findByRole("button", { name: "Forgot password?" })).toBeInTheDocument();
  });
});

describe("AuthFlow — creating an account from the demo", () => {
  it("reaches the real signup form, not the demo screen again", async () => {
    // Regression test: viewMode ("demo") is checked ahead of screen
    // ("sign_up") in AuthFlow's render order — setting screen alone had no
    // visible effect while viewMode was still "demo", so this button was a
    // complete no-op (confirmed directly, not a timing issue: reproduced
    // 100% of the time, serialized or parallel). Fixed by also calling
    // exitDemo() in the same handler.
    renderAuthFlow();
    fireEvent.click(await screen.findByRole("button", { name: "See a demo" }));
    fireEvent.click(await screen.findByRole("button", { name: "Create your own PrimeForm account" }));

    expect(await screen.findByLabelText("Email")).toBeInTheDocument();
    expect(screen.queryByText("DEMO — example data, not saved")).not.toBeInTheDocument();
  });
});
