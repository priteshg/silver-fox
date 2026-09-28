import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { exchangeRecoveryCode, signOut, updatePassword } from "../../lib/supabase/auth";
import ResetPasswordScreen from "../reset-password";

const replaceMock = vi.fn();
const useLocalSearchParamsMock = vi.fn();

vi.mock("expo-router", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useLocalSearchParams: () => useLocalSearchParamsMock(),
}));

/** Renders the screen with a valid, exchangeable code and waits past the "Verifying your link…" step onto the new-password form. */
async function renderReadyForm() {
  useLocalSearchParamsMock.mockReturnValue({ code: "valid-code" });
  render(<ResetPasswordScreen />);
  await screen.findByText("Create a new password");
}

describe("ResetPasswordScreen", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useLocalSearchParamsMock.mockReset();
    vi.mocked(exchangeRecoveryCode).mockReset();
    vi.mocked(exchangeRecoveryCode).mockResolvedValue(undefined);
    vi.mocked(updatePassword).mockReset();
    vi.mocked(updatePassword).mockResolvedValue(undefined);
    vi.mocked(signOut).mockReset();
    vi.mocked(signOut).mockResolvedValue(undefined);
  });

  describe("deep-link handling", () => {
    it("exchanges the code from the deep link's query params on mount", async () => {
      useLocalSearchParamsMock.mockReturnValue({ code: "abc123" });
      render(<ResetPasswordScreen />);

      await waitFor(() => expect(exchangeRecoveryCode).toHaveBeenCalledWith("abc123"));
      expect(await screen.findByText("Create a new password")).toBeInTheDocument();
    });

    it("treats a missing code (malformed/incomplete link) as invalid without attempting an exchange", async () => {
      useLocalSearchParamsMock.mockReturnValue({});
      render(<ResetPasswordScreen />);

      expect(await screen.findByText("Reset link expired")).toBeInTheDocument();
      expect(exchangeRecoveryCode).not.toHaveBeenCalled();
    });
  });

  describe("expired/invalid reset link", () => {
    it("shows an invalid-link state when the exchange is rejected", async () => {
      vi.mocked(exchangeRecoveryCode).mockRejectedValueOnce(new Error("Email link is invalid or has expired"));
      useLocalSearchParamsMock.mockReturnValue({ code: "expired-code" });
      render(<ResetPasswordScreen />);

      expect(await screen.findByText("Reset link expired")).toBeInTheDocument();
      expect(screen.getByText("Email link is invalid or has expired")).toBeInTheDocument();
      expect(screen.queryByText("Create a new password")).not.toBeInTheDocument();
    });

    it("returns to the login flow from an invalid link", async () => {
      vi.mocked(exchangeRecoveryCode).mockRejectedValueOnce(new Error("Email link is invalid or has expired"));
      useLocalSearchParamsMock.mockReturnValue({ code: "expired-code" });
      render(<ResetPasswordScreen />);

      fireEvent.click(await screen.findByRole("button", { name: "Request a new reset link" }));
      expect(replaceMock).toHaveBeenCalledWith("/");
    });
  });

  describe("set new password", () => {
    it("shows a validation message for a password below the minimum length", async () => {
      await renderReadyForm();
      fireEvent.change(screen.getByLabelText("New password"), { target: { value: "short1" } });
      expect(await screen.findByText("Password must be at least 8 characters.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Update password" })).toBeDisabled();
    });

    it("shows a validation message when the two password fields don't match", async () => {
      await renderReadyForm();
      fireEvent.change(screen.getByLabelText("New password"), { target: { value: "correcthorse" } });
      fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "correcthorseBATTERY" } });

      expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Update password" })).toBeDisabled();
      expect(updatePassword).not.toHaveBeenCalled();
    });

    it("submits successfully when both passwords meet the length requirement and match", async () => {
      await renderReadyForm();
      fireEvent.change(screen.getByLabelText("New password"), { target: { value: "correcthorse" } });
      fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "correcthorse" } });
      expect(screen.getByRole("button", { name: "Update password" })).toBeEnabled();

      fireEvent.click(screen.getByRole("button", { name: "Update password" }));

      expect(await screen.findByText("Password updated")).toBeInTheDocument();
      expect(updatePassword).toHaveBeenCalledWith("correcthorse");
    });

    it("shows an error and stays on the form when updatePassword itself fails", async () => {
      vi.mocked(updatePassword).mockRejectedValueOnce(new Error("Network request failed"));
      await renderReadyForm();
      fireEvent.change(screen.getByLabelText("New password"), { target: { value: "correcthorse" } });
      fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "correcthorse" } });
      fireEvent.click(screen.getByRole("button", { name: "Update password" }));

      expect(await screen.findByText("Network request failed")).toBeInTheDocument();
      expect(screen.queryByText("Password updated")).not.toBeInTheDocument();
    });
  });

  describe("returning to the app after a successful reset", () => {
    it("ends the recovery session and routes back to login when Back to login is tapped", async () => {
      await renderReadyForm();
      fireEvent.change(screen.getByLabelText("New password"), { target: { value: "correcthorse" } });
      fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "correcthorse" } });
      fireEvent.click(screen.getByRole("button", { name: "Update password" }));
      await screen.findByText("Password updated");

      // The recovery session (established by exchangeRecoveryCode) must not
      // linger as if it were a normal signed-in session — see reset-password.tsx's
      // onSuccess comment for why this must happen before showing the
      // confirmation, not only when the person taps through it.
      expect(signOut).toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Back to login" }));
      expect(replaceMock).toHaveBeenCalledWith("/");
    });
  });
});
