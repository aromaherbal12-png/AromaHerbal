import { useEffect, useRef, useState } from "react";
import { Send, Inbox, ArrowUpRight } from "lucide-react";
import messagesApi from "../services/messagesApi.js";

const ROLE_PILL_COLORS = {
  "Administrator":      "#16452d",
  "Manager":            "#1b4f8a",
  "Store-Incharge":     "#7c4a00",
  "Quality-Incharge":   "#6b1a3b",
  "Production-Incharge":"#1a4c5e",
};

function rolePillStyle(role) {
  const bg = ROLE_PILL_COLORS[role] || "#3b4a42";
  return {
    background: bg + "1a",
    color: bg,
    padding: "2px 8px",
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: ".03em",
  };
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function Messages({ user, onUnreadChange }) {
  const [tab, setTab] = useState("inbox");        // "inbox" | "outbox" | "compose"
  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // compose form state
  const [recipientId, setRecipientId] = useState("");
  const [body, setBody] = useState("");

  const textareaRef = useRef(null);

  // Load inbox + outbox + recipients on mount
  useEffect(() => {
    setLoading(true);
    Promise.all([
      messagesApi.getInbox(),
      messagesApi.getOutbox(),
      messagesApi.getRecipients(),
    ])
      .then(([inboxData, outboxData, recipientsData]) => {
        setInbox(Array.isArray(inboxData) ? inboxData : []);
        setOutbox(Array.isArray(outboxData) ? outboxData : []);
        setRecipients(Array.isArray(recipientsData) ? recipientsData : []);
      })
      .catch(() => setError("Failed to load messages. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  // Mark all unread as read when inbox tab is active
  useEffect(() => {
    if (tab !== "inbox") return;
    const unread = inbox.filter((m) => !m.isRead);
    if (unread.length === 0) return;

    messagesApi.markAllRead().then(() => {
      setInbox((prev) => prev.map((m) => ({ ...m, isRead: true })));
      // Notify the sidebar badge
      if (onUnreadChange) onUnreadChange(0);
    });
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!recipientId) { setError("Please select a recipient."); return; }
    if (!body.trim()) { setError("Message cannot be empty."); return; }

    setSending(true);
    try {
      const sent = await messagesApi.send(recipientId, body.trim());
      setOutbox((prev) => [sent, ...prev]);
      setBody("");
      setRecipientId("");
      setSuccess("Message sent successfully.");
      setTab("outbox");
    } catch (err) {
      setError(err?.data?.message || err?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  const unreadCount = inbox.filter((m) => !m.isRead).length;

  return (
    <section className="panel" style={{ maxWidth: 820 }}>
      <span className="eyebrow">INTERNAL MESSAGING</span>
      <h2 style={{ marginBottom: 4 }}>Messages</h2>
      <p className="muted" style={{ marginBottom: 20 }}>
        Send messages to other team members. No live chat — messages are delivered and visible on next login.
      </p>

      {/* ── Tabs ── */}
      <div className="store-page-tabs" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={tab === "inbox" ? "active" : ""}
          onClick={() => setTab("inbox")}
          style={{ position: "relative" }}
        >
          Inbox
          {unreadCount > 0 && (
            <span style={{
              position: "absolute",
              top: 8,
              right: 6,
              background: "#c0392b",
              color: "#fff",
              borderRadius: 99,
              fontSize: 10,
              fontWeight: 800,
              minWidth: 17,
              height: 17,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
            }}>
              {unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className={tab === "outbox" ? "active" : ""}
          onClick={() => setTab("outbox")}
        >
          Sent
        </button>
        <button
          type="button"
          className={tab === "compose" ? "active" : ""}
          onClick={() => { setTab("compose"); setError(""); setSuccess(""); setTimeout(() => textareaRef.current?.focus(), 50); }}
        >
          + New message
        </button>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <p className="muted" style={{ padding: "24px 0", textAlign: "center" }}>Loading messages…</p>
      )}

      {/* ── Error banner ── */}
      {!loading && error && tab !== "compose" && (
        <p className="inline-message" style={{ marginBottom: 12 }}>{error}</p>
      )}

      {/* ── INBOX ── */}
      {!loading && tab === "inbox" && (
        <MessageList
          messages={inbox}
          emptyText="Your inbox is empty."
          type="inbox"
        />
      )}

      {/* ── OUTBOX ── */}
      {!loading && tab === "outbox" && (
        <MessageList
          messages={outbox}
          emptyText="You haven't sent any messages yet."
          type="outbox"
        />
      )}

      {/* ── COMPOSE ── */}
      {tab === "compose" && (
        <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label className="field-label">
            To
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              required
              style={{ height: 45, border: "1px solid #cbd6cc", borderRadius: 9, padding: "0 12px", background: "#fff" }}
            >
              <option value="">— Select a recipient —</option>
              {recipients.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} · {r.role}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Message
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message here…"
              maxLength={2000}
              rows={5}
              required
              style={{
                border: "1px solid #cbd6cc",
                borderRadius: 9,
                padding: "10px 12px",
                background: "#fff",
                resize: "vertical",
                fontFamily: "inherit",
                fontSize: 14,
              }}
            />
            <span style={{ fontSize: 11, color: "#7a8a7e", alignSelf: "flex-end" }}>
              {body.length}/2000
            </span>
          </label>

          {error && <p className="inline-message" style={{ margin: 0 }}>{error}</p>}
          {success && (
            <p style={{ margin: 0, color: "#27603b", fontSize: 13, fontWeight: 700 }}>{success}</p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="secondary" onClick={() => setTab("inbox")}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={sending}>
              <Send size={15} />
              {sending ? "Sending…" : "Send message"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function MessageList({ messages, emptyText, type }) {
  if (messages.length === 0) {
    return <p className="empty-state">{emptyText}</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {messages.map((msg) => (
        <MessageCard key={msg._id} msg={msg} type={type} />
      ))}
    </div>
  );
}

function MessageCard({ msg, type }) {
  const [expanded, setExpanded] = useState(false);
  const isUnread = type === "inbox" && !msg.isRead;

  return (
    <div
      onClick={() => setExpanded((p) => !p)}
      style={{
        border: `1px solid ${isUnread ? "#b2d9b9" : "var(--line)"}`,
        borderRadius: 11,
        padding: "14px 16px",
        background: isUnread ? "#f3fbf4" : "#fff",
        cursor: "pointer",
        transition: "background .15s",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: expanded ? 10 : 0 }}>
        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "#e4efe5", color: "var(--green)",
          display: "grid", placeItems: "center",
          fontWeight: 800, fontSize: 14, flexShrink: 0,
        }}>
          {(type === "inbox" ? msg.senderName : msg.recipientName)?.[0]?.toUpperCase() || "?"}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <b style={{ fontSize: 13 }}>
              {type === "inbox" ? msg.senderName : msg.recipientName}
            </b>
            <span style={rolePillStyle(type === "inbox" ? msg.senderRole : msg.recipientRole)}>
              {type === "inbox" ? msg.senderRole : msg.recipientRole}
            </span>
            {isUnread && (
              <span style={{
                background: "#c0392b", color: "#fff",
                borderRadius: 99, fontSize: 10, fontWeight: 700,
                padding: "2px 7px",
              }}>
                New
              </span>
            )}
          </div>
          {!expanded && (
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "#59675f", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
              {msg.body}
            </p>
          )}
        </div>

        <span style={{ fontSize: 11, color: "#7a8a7e", whiteSpace: "nowrap", flexShrink: 0 }}>
          {formatDate(msg.createdAt)}
        </span>
      </div>

      {/* Expanded body */}
      {expanded && (
        <p style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.6,
          color: "#1b2b25",
          background: "#f7f9f6",
          borderRadius: 8,
          padding: "12px 14px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {msg.body}
        </p>
      )}
    </div>
  );
}
