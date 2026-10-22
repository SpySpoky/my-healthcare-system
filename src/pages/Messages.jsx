import { useEffect, useState } from "react";
import Badge from "../components/common/Badge";
import ConfirmDialog from "../components/common/ConfirmDialog";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import Modal from "../components/common/Modal";
import Button from "../components/forms/Button";
import Input from "../components/forms/Input";
import Select from "../components/forms/Select";
import Textarea from "../components/forms/Textarea";
import PageHeader from "../components/layout/PageHeader";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import { getRoleLabel } from "../data/adminData";
import {
  deleteMessage,
  getContacts,
  getMessages,
  markMessageRead,
  notifyMessagesChanged,
  sendMessage,
} from "../data/messagesData";

import { getLocale, t } from "../i18n";
const MAX_SUBJECT = 150;
const MAX_BODY = 4000;

const formatSent = (value) =>
  new Date(value).toLocaleString(getLocale(), {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const EMPTY_COMPOSER = { recipientId: "", subject: "", body: "" };

// Shared by every portal that can send messages (patient, doctor, medical staff).
function Messages() {
  const { user } = useAuth();
  const showToast = useToast();

  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [tab, setTab] = useState("in");
  const [selectedId, setSelectedId] = useState(null);

  const [composer, setComposer] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSending, setIsSending] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getMessages(user), getContacts(user)])
      .then(([loadedMessages, loadedContacts]) => {
        if (cancelled) return;

        setMessages(loadedMessages);
        setContacts(loadedContacts);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  const unreadCount = messages.filter((m) => m.direction === "in" && !m.read).length;
  const visible = messages.filter((m) => m.direction === tab);
  const selected = messages.find((m) => m.id === selectedId) || null;

  const openMessage = (message) => {
    setSelectedId(message.id);

    if (message.direction === "in" && !message.read) {
      setMessages((previous) => previous.map((m) => (m.id === message.id ? { ...m, read: true } : m)));
      markMessageRead(user, message.id)
        .then(notifyMessagesChanged)
        .catch(() => {
          // It will show as unread again after the next refresh.
        });
    }
  };

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setSelectedId(null);
  };

  /* ---------- compose ---------- */

  const openComposer = (initial = EMPTY_COMPOSER) => {
    setErrors({});
    setComposer(initial);
  };

  const handleReply = (message) =>
    openComposer({
      recipientId: String(message.otherId),
      subject: message.subject.startsWith("Re: ") ? message.subject : `Re: ${message.subject}`,
      body: "",
    });

  const handleComposerChange = (event) => {
    const { name, value } = event.target;

    setComposer((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    const subject = composer.subject.trim();
    const body = composer.body.trim();

    if (!composer.recipientId) next.recipientId = "Choose who to write to.";

    if (subject.length < 3) next.subject = t("Subject must be at least 3 characters.");
    else if (subject.length > MAX_SUBJECT) next.subject = `Subject must be at most ${MAX_SUBJECT} characters.`;

    if (body.length < 5) next.body = t("Write a message of at least 5 characters.");
    else if (body.length > MAX_BODY) next.body = `Message must be at most ${MAX_BODY} characters.`;

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const handleSend = async (event) => {
    event.preventDefault();

    if (!validate()) return;

    setIsSending(true);

    try {
      const recipient = contacts.find((c) => String(c.id) === composer.recipientId);
      const sent = await sendMessage(user, {
        recipientId: recipient.id,
        subject: composer.subject.trim(),
        body: composer.body.trim(),
      });

      setMessages((previous) => [sent, ...previous]);
      setTab("out");
      setSelectedId(sent.id);
      setComposer(null);
      showToast(t("Message sent to {otherName}.", { otherName: sent.otherName }));
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setIsSending(false);
    }
  };

  /* ---------- delete ---------- */

  const confirmDelete = async () => {
    const message = deleting;

    setDeleting(null);

    try {
      await deleteMessage(user, message.id);
      setMessages((previous) => previous.filter((m) => m.id !== message.id));
      setSelectedId((current) => (current === message.id ? null : current));
      notifyMessagesChanged();
      showToast(t("Message deleted."), "info");
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  /* ---------- render ---------- */

  const recipientOptions = contacts.map((contact) => ({
    value: String(contact.id),
    label: `${contact.name} (${[getRoleLabel(contact.role), contact.department && t(contact.department)]
      .filter(Boolean)
      .join(" · ")})`,
  }));

  if (loadState === "error") {
    return (
      <ErrorState
        title={t("Could not load messages")}
        message={t("Your messages could not be loaded. Please try again.")}
        onRetry={() => {
          setLoadState("loading");
          setReloadKey((key) => key + 1);
        }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8">
      <PageHeader
        eyebrow={t("Communication")}
        title={t("Messages")}
        description={
          user.role === "patient"
            ? t("Write to your doctors and the care team, and read their replies.")
            : t("Message patients and colleagues, and answer their questions.")
        }
        actions={<Button onClick={() => openComposer()}>{t("New message")}</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* LIST */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div role="tablist" aria-label={t("Mailbox")} className="flex gap-2 border-b border-slate-100 p-3">
            {[
              ["in", "Inbox"],
              ["out", "Sent"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => changeTab(value)}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                  tab === value ? "bg-accent-50 text-accent-700" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {t(label)}
                {value === "in" && unreadCount > 0 && (
                  <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loadState === "loading" ? (
            <p role="status" className="p-6 text-sm text-slate-500">{t("Loading messages…")}</p>
          ) : visible.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon="✉️"
                title={tab === "in" ? t("Your inbox is empty") : t("No sent messages")}
                message={
                  tab === "in"
                    ? t("Messages sent to you will appear here.")
                    : t("Messages you send will appear here.")
                }
              />
            </div>
          ) : (
            <ul className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
              {visible.map((message) => {
                const isUnread = message.direction === "in" && !message.read;

                return (
                  <li key={message.id}>
                    <button
                      type="button"
                      onClick={() => openMessage(message)}
                      aria-current={message.id === selectedId}
                      className={`block w-full px-5 py-4 text-left transition-colors hover:bg-slate-50 ${
                        message.id === selectedId ? "bg-accent-50/60" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={`truncate text-sm ${isUnread ? "font-extrabold text-slate-900" : "font-semibold text-slate-700"}`}>
                          {message.direction === "in" ? "" : t("To: ")}
                          {message.otherName}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">{formatSent(message.sentAt)}</span>
                      </div>

                      <p className={`mt-1 truncate text-sm ${isUnread ? "font-bold text-slate-800" : "text-slate-600"}`}>
                        {isUnread && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-amber-500" aria-label={t("Unread")} />}
                        {message.subject}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-slate-400">{message.body}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* READING PANE */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {selected ? (
            <article>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-extrabold text-slate-900">{selected.subject}</h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {selected.direction === "in" ? t("From") : t("To")}{" "}
                    <strong className="text-slate-800">{selected.otherName}</strong>{" "}
                    <Badge variant="primary">{getRoleLabel(selected.otherRole)}</Badge>
                  </p>

                  <p className="mt-1 text-xs text-slate-400">{formatSent(selected.sentAt)}</p>
                </div>

                <div className="flex gap-3">
                  <Button onClick={() => handleReply(selected)}>{t("Reply")}</Button>
                  <Button variant="secondary" onClick={() => setDeleting(selected)}>{t("Delete")}</Button>
                </div>
              </div>

              <p className="mt-6 whitespace-pre-wrap border-t border-slate-100 pt-6 text-sm leading-7 text-slate-700">
                {selected.body}
              </p>
            </article>
          ) : (
            <EmptyState
              icon="💬"
              title={t("Select a message")}
              message={t("Choose a message from the list to read it, or write a new one.")}
            />
          )}
        </section>
      </div>

      {/* COMPOSER */}

      <Modal title={composer?.subject.startsWith("Re: ") ? t("Reply") : t("New message")} isOpen={Boolean(composer)} onClose={() => setComposer(null)}>
        {composer && (
          <form onSubmit={handleSend} noValidate>
            {errors.form && (
              <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {errors.form}
              </p>
            )}

            <Select
              label={t("To")}
              name="recipientId"
              options={recipientOptions}
              value={composer.recipientId}
              onChange={handleComposerChange}
              placeholder={t("Choose a recipient")}
              error={errors.recipientId}
              required
            />

            <Input
              label={t("Subject")}
              name="subject"
              value={composer.subject}
              onChange={handleComposerChange}
              error={errors.subject}
              required
            />

            <Textarea
              label={t("Message")}
              name="body"
              value={composer.body}
              onChange={handleComposerChange}
              error={errors.body}
              hint={`${composer.body.length}/${MAX_BODY}`}
              required
            />

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setComposer(null)}>{t("Cancel")}</Button>
              <Button type="submit" disabled={isSending}>
                {isSending ? t("Sending…") : t("Send")}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title={t("Delete this message?")}
        message={t("It is removed from your mailbox only. The other person keeps their copy.")}
        confirmText={t("Delete")}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

export default Messages;
