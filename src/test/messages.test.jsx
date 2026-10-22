import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { currentPath, findPageHeading, renderApp } from "./renderApp";

describe("messages", () => {
  it("shows unread messages on the patient dashboard and links to the inbox", async () => {
    const { user } = renderApp("/patient/dashboard", { role: "patient" });

    const link = await screen.findByRole("link", { name: /open messages/i });

    expect(await screen.findByText(/you have 2 unread messages/i)).toBeInTheDocument();

    await user.click(link);
    await findPageHeading("Messages");
    expect(currentPath()).toBe("/patient/messages");
    expect(await screen.findByText("Preparing for your appointment")).toBeInTheDocument();
  });

  it("reads a message, which clears its unread state", async () => {
    const { user } = renderApp("/patient/messages", { role: "patient" });

    await user.click(await screen.findByText("Your recent results"));

    // The text shows in the list preview and in the reading pane.
    expect(
      (await screen.findAllByText(/test results are available in your medical records/i)).length
    ).toBe(2);
    expect(screen.getByRole("tab", { name: /inbox/i })).toHaveTextContent("1");
  });

  it("validates and sends a new message to a doctor", async () => {
    const { user } = renderApp("/patient/messages", { role: "patient" });

    await user.click(await screen.findByRole("button", { name: /new message/i }));

    const dialog = await screen.findByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /^send$/i }));
    expect(within(dialog).getByText("Choose who to write to.")).toBeInTheDocument();
    expect(within(dialog).getByText(/subject must be at least 3/i)).toBeInTheDocument();

    await user.selectOptions(within(dialog).getByLabelText(/^to/i), "doctor@test.com");
    await user.type(within(dialog).getByLabelText(/subject/i), "Follow-up question");
    await user.type(within(dialog).getByLabelText(/^message/i), "Can I move my appointment?");
    await user.click(within(dialog).getByRole("button", { name: /^send$/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect((await screen.findAllByText("Follow-up question")).length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: /sent/i })).toHaveAttribute("aria-selected", "true");
  });

  it("lets a doctor see the patient's reply and answer it", async () => {
    const patient = renderApp("/patient/messages", { role: "patient" });

    await patient.user.click(await screen.findByRole("button", { name: /new message/i }));
    const dialog = await screen.findByRole("dialog");
    await patient.user.selectOptions(within(dialog).getByLabelText(/^to/i), "doctor@test.com");
    await patient.user.type(within(dialog).getByLabelText(/subject/i), "Need advice");
    await patient.user.type(within(dialog).getByLabelText(/^message/i), "Is this dose correct?");
    await patient.user.click(within(dialog).getByRole("button", { name: /^send$/i }));
    await screen.findAllByText("Need advice");
    patient.unmount();

    const doctor = renderApp("/doctor/messages", { role: "doctor" });

    await doctor.user.click(await screen.findByText("Need advice"));
    await doctor.user.click(await screen.findByRole("button", { name: /^reply$/i }));

    const reply = await screen.findByRole("dialog");
    expect(within(reply).getByLabelText(/subject/i)).toHaveValue("Re: Need advice");
  });
});
