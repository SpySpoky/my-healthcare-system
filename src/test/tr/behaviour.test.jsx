import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { validateFeedbackForm } from "../../utils/validation/feedbackValidation";
import { getLanguage, getLocale, lower, t } from "../../i18n";
import { translateActivity } from "../../i18n/activity";
import { translateServerMessage } from "../../i18n/serverMessages";
import { formatDate, formatShortDate, localDate } from "../../utils/date";
import { findPageHeading, renderApp } from "../renderApp";

const TURKISH_MONTHS = /(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)/;

describe("Turkish language", () => {
  it("is active for this run", () => {
    expect(getLanguage()).toBe("tr");
    expect(getLocale()).toBe("tr-TR");
    expect(document.documentElement.lang).toBe("tr");
  });

  it("translates text, fills placeholders and falls back to English", () => {
    expect(t("Sign In")).toBe("Giriş Yap");
    expect(t("Password must be at least {PASSWORD_MIN_LENGTH} characters.", { PASSWORD_MIN_LENGTH: 8 })).toBe(
      "Şifre en az 8 karakter olmalıdır."
    );
    expect(t("A sentence nobody translated")).toBe("A sentence nobody translated");
    expect(t(undefined)).toBeUndefined();
  });

  it("lowercases with Turkish rules", () => {
    expect(lower("IŞIK")).toBe("ışık");
    expect(lower("İZMİR")).toBe("izmir");
  });

  it("formats dates and numbers in Turkish", () => {
    expect(formatDate("2026-09-20")).toBe("20 Eylül 2026");
    expect(formatShortDate("2026-09-20")).toMatch(/^20 Eyl 2026$/);
    expect(localDate("20 Sep 2026")).toBe("20 Eyl 2026");
    expect(localDate("Never")).toBe("Hiç");
  });

  it("translates the API's messages, including ones with variable parts", () => {
    expect(translateServerMessage("Incorrect email or password.")).toBe("E-posta veya şifre hatalı.");
    expect(translateServerMessage("Subject is required.")).toBe("Konu gereklidir.");
    expect(translateServerMessage("Subject must be at most 150 characters.")).toBe("Konu en fazla 150 karakter olabilir.");
    expect(translateServerMessage("Status must be one of: Open, In Review.")).toBe("Durum şunlardan biri olmalıdır: Açık, İnceleniyor.");
    expect(translateServerMessage("This account is suspended. Please contact the administrator.")).toBe(
      "Bu hesap askıya alındı. Lütfen yönetici ile iletişime geçin."
    );
    expect(translateServerMessage("This account is not registered as a Doctor. Select the correct account type and try again.")).toBe(
      "Bu hesap Doktor olarak kayıtlı değil. Doğru hesap türünü seçip tekrar deneyin."
    );
    expect(translateServerMessage("Something the server invented")).toBe("Something the server invented");
  });

  it("translates activity log sentences", () => {
    expect(translateActivity("Logged in")).toBe("Giriş yaptı");
    expect(translateActivity("Booked appointment with Dr. Emily Brown")).toBe("Dr. Emily Brown ile randevu aldı");
    expect(translateActivity("Confirmed appointment with John Smith")).toBe("John Smith ile randevuyu onayladı");
    expect(translateActivity("Approved application APP-1006 (Dr. Victor Novak)")).toBe(
      "APP-1006 (Dr. Victor Novak) başvurusunu onayladı"
    );
    expect(translateActivity("Added diagnosis for patient #4")).toBe("#4 numaralı hasta için tanı ekledi");
    expect(translateActivity("Something unknown happened")).toBe("Something unknown happened");
  });

  it("blocks Turkish profanity written with or without special letters", () => {
    const form = { type: "Feedback", subject: "Sorun var", message: "Bu hastane tam bir ŞEREFSİZLİK örneği", rating: "3" };

    expect(validateFeedbackForm(form).message).toBe("Lütfen uygunsuz ifadeleri kaldırın.");
    expect(validateFeedbackForm({ ...form, message: "serefsiz bir uygulama" }).message).toBe("Lütfen uygunsuz ifadeleri kaldırın.");
    expect(validateFeedbackForm({ ...form, message: "Doktor çok ilgiliydi, teşekkürler." })).toEqual({});
  });
});

describe("Turkish pages", () => {
  it("shows Turkish validation messages on the registration form", async () => {
    const { user } = renderApp("/register");

    await user.click(await screen.findByRole("button", { name: /hesap oluştur/i }));

    expect(await screen.findByText("Ad soyad gereklidir.")).toBeInTheDocument();
    expect(screen.getByText("Telefon numarası gereklidir.")).toBeInTheDocument();
    expect(screen.getByText("Şartlar ve koşulları kabul etmelisiniz.")).toBeInTheDocument();
  });

  it("offers the account types in Turkish on the login page", async () => {
    renderApp("/login");

    expect(await screen.findByText("Hasta")).toBeInTheDocument();
    expect(screen.getByText("Doktor")).toBeInTheDocument();
    expect(screen.getByText("Sağlık Personeli")).toBeInTheDocument();
    expect(screen.getByText("Yönetici")).toBeInTheDocument();
  });

  it("switches language with the EN / TR toggle", async () => {
    const { user } = renderApp("/login");

    const group = await screen.findByRole("group", { name: "Dil" });

    expect(within(group).getByRole("button", { name: "TR" })).toHaveAttribute("aria-pressed", "true");
    expect(within(group).getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "false");

    // Choosing English saves the choice and reloads the page (jsdom cannot reload).
    await user.click(within(group).getByRole("button", { name: "EN" }));
    expect(localStorage.getItem("healthcare_language")).toBe("en");
  });

  it("shows appointment statuses, dates and times in Turkish", async () => {
    renderApp("/patient/appointments", { role: "patient" });

    await findPageHeading("Randevularım");

    // Statuses are translated and dates use Turkish month names.
    expect((await screen.findAllByText(/Beklemede|Onaylandı/)).length).toBeGreaterThan(0);
    expect(document.body.textContent).toMatch(TURKISH_MONTHS);
    expect(document.body.textContent).not.toMatch(/\b(AM|PM)\b/);
  });

  it("offers appointment times on a 24-hour clock", async () => {
    const { user } = renderApp("/patient/appointments/book", { role: "patient" });

    await findPageHeading("Randevu Al");
    await user.selectOptions(await screen.findByLabelText(/^Bölüm/), "Cardiology");
    await user.click(await screen.findByRole("radio", { name: /Sarah Johnson/ }));

    // A Monday at least a week ahead, when the demo doctor works.
    const date = new Date();
    date.setDate(date.getDate() + 14);
    while (date.getDay() !== 1) date.setDate(date.getDate() + 1);

    const input = await screen.findByLabelText(/Randevu Tarihi/);
    await user.type(input, date.toISOString().slice(0, 10));

    await waitFor(() => expect(screen.getAllByRole("button", { name: /^\d{2}:\d{2}$/ }).length).toBeGreaterThan(0));
    expect(screen.getByRole("button", { name: "14:00" })).toBeInTheDocument();
    expect(screen.queryByText(/PM/)).toBeNull();
  });

  it.each([
    ["patient", "/patient/dashboard", 6],
    ["doctor", "/doctor/dashboard", 5],
    ["admin", "/admin/dashboard", 6],
  ])("gives every %s sidebar link its icon", async (role, path, count) => {
    renderApp(path, { role });

    const nav = await screen.findByRole("navigation", { name: "Ana menü" });
    const links = within(nav).getAllByRole("link");

    expect(links).toHaveLength(count);
    // A link with no icon falls back to a plain bullet.
    links.forEach((link) => expect(link.textContent).not.toContain("•"));
  });

  it("still shows the unread badge on the Messages link", async () => {
    renderApp("/patient/dashboard", { role: "patient" });

    const nav = await screen.findByRole("navigation", { name: "Ana menü" });

    expect(await within(nav).findByLabelText("2 okunmamış")).toBeInTheDocument();
  });

  it("shows feedback statuses and types in Turkish for the administrator", async () => {
    renderApp("/admin/feedback", { role: "admin" });

    await findPageHeading("Geri Bildirim Yönetimi");

    expect((await screen.findAllByText("Şikayet")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Açık|İnceleniyor|Çözüldü|Kapatıldı/).length).toBeGreaterThan(0);
  });
});
