import "./Messages.css";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  listConversations,
  getLatestMessages,
  sendMessageMultipart,
  downloadAttachment,
  type ConversationListItem,
  type MessageDto,
  type AttachmentDto
} from "../api/messages";
import { getProfileByUserId } from "../api/profile";
import { getWsClient,onWsConnect  } from "../realtime/wsClient";

import { deleteConversationForMe } from "../api/messages";

type PublicProfile = {
  headline?: string;
  bio?: string;
  country?: string;
  city?: string;

  affiliation?: string;
  profession?: string;
  university?: string;
  faculty?: string;

  expertAreas?: string[];
  expertise?: { area: string; description: string }[];
  resources?: { title: string; description: string; url: string }[];

  companyName?: string;
  companyDescription?: string;
  companyDomains?: string[];

  openToProjects?: boolean;
  openToMentoring?: boolean;
  availability?: string;
  experienceLevel?: string;

  linkedinUrl?: string;
  githubUrl?: string;
  website?: string;
  avatarUrl?: string;
};

type Toast = { id: number; type: "success" | "error" | "info"; message: string };

export default function MessagesPage() {
  const { user } = useContext(AuthContext);
  const meId = (user as any)?.id as number | undefined;

  const nav = useNavigate();
  const { search } = useLocation();
  const q = useMemo(() => new URLSearchParams(search), [search]);

  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);

  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string>("");

  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string>("");

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string>("");
  const profileCache = useRef(new Map<number, PublicProfile>());

  const [text, setText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const [filter, setFilter] = useState("");

  const [confirmHide, setConfirmHide] = useState<{ open: boolean; id: number | null; name: string }>({
    open: false,
    id: null,
    name: ""
  });

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(1);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const pushToast = (type: Toast["type"], message: string) => {
    const id = toastSeq.current++;
    setToasts((t) => [...t, { id, type, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  };

  const active = useMemo(
    () => items.find((x) => x.conversationId === activeId) || null,
    [items, activeId]
  );

  const filteredItems = useMemo(() => {
    const s = filter.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => (x.otherName || "").toLowerCase().includes(s));
  }, [items, filter]);

  const loadConversations = async () => {
    setListLoading(true);
    setListError("");
    try {
      const data = await listConversations();
      setItems(data);

      const fromUrl = q.get("c");
      if (fromUrl) {
        const id = Number(fromUrl);
        if (!Number.isNaN(id)) {
          setActiveId(id);
          return;
        }
      }

      setActiveId((prev) => prev ?? (data.length ? data[0].conversationId : null));
    } catch (e) {
      console.error(e);
      setItems([]);
      setListError("Could not load conversations.");
    } finally {
      setListLoading(false);
    }
  };

  const loadMessages = async (conversationId: number) => {
    setChatLoading(true);
    setChatError("");
    try {
      const data = await getLatestMessages(conversationId, 60);
      setMessages([...data].reverse());
    } catch (e) {
      console.error(e);
      setMessages([]);
      setChatError("Could not load messages.");
    } finally {
      setChatLoading(false);
    }
  };

  const loadProfile = async (otherUserId: number | null) => {
    if (!otherUserId) {
      setProfile(null);
      setProfileLoading(false);
      setProfileError("");
      return;
    }

    const cached = profileCache.current.get(otherUserId) || null;
    setProfile(cached);

    setProfileLoading(true);
    setProfileError("");
    try {
      const data = (await getProfileByUserId(otherUserId)) as PublicProfile;
      profileCache.current.set(otherUserId, data);
      setProfile(data);
    } catch (e) {
      console.error(e);
      setProfile(null);
      setProfileError("Could not load profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadConversations().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId).catch(() => {});
  }, [activeId]);

useEffect(() => {
  if (!activeId) return;

  let sub: any = null;

  const subscribeNow = () => {
    const c = getWsClient();
    if (!c || !c.connected) return;
    if (sub) return;

    sub = c.subscribe(`/topic/conversations.${activeId}`, (msg) => {


      const incoming = JSON.parse(msg.body) as MessageDto;

      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });

      // update preview în listă
      setItems((prev) =>
        prev.map((it) =>
          it.conversationId === activeId
            ? { ...it, lastMessagePreview: incoming.content ?? "" }
            : it
        )
      );
    });
  };

  // încearcă imediat (dacă e deja conectat)
  subscribeNow();

  // și mai important: reîncearcă la fiecare reconnect
  const off = onWsConnect(() => {
      if (sub) sub.unsubscribe();
      sub = null;
      subscribeNow();
    });


  return () => {
    off();
    if (sub) sub.unsubscribe();
  };
}, [activeId]);



  useEffect(() => {
    if (!active?.otherUserId) {
      loadProfile(null).catch(() => {});
      return;
    }
    loadProfile(active.otherUserId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.otherUserId]);

  useEffect(() => {
    if (!activeId) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [activeId, messages.length]);

  useEffect(() => {
    if (!confirmHide.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmHide({ open: false, id: null, name: "" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmHide.open]);

  
  const closeChat = () => {
    setActiveId(null);
    setMessages([]);
    setChatError("");
    setText("");
    setPdfFile(null);
    nav("/messages", { replace: true });
  };

  const clearPdf = () => {
    setPdfFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onPickPdf = (file: File | null) => {
    if (!file) return clearPdf();

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      clearPdf();
      pushToast("error", "Only PDF files are allowed.");
      return;
    }

    // tine asta in sync cu backend (spring.servlet.multipart.max-file-size / max-request-size)
    const max = 25 * 1024 * 1024;
    if (file.size > max) {
      clearPdf();
      pushToast("error", "PDF too large (max 25MB).");
      return;
    }

    setPdfFile(file);
  };

  const onSend = async () => {
    if (!activeId) return;

    const t = text.trim();
    if (!t && !pdfFile) return;

    setSending(true);
    setChatError("");

    try {
      setText("");
      const msg = await sendMessageMultipart(activeId, t, pdfFile);
      //setMessages((m) => [...m, msg]);

      clearPdf();

      loadConversations().catch(() => {});
      nav(`/messages?c=${activeId}`, { replace: true });
    } catch (e: any) {
      console.error(e);
      setChatError(e?.response?.data?.message ?? "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const openPdf = async (att: AttachmentDto) => {
    try {
      const blob = await downloadAttachment(att.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      console.error(e);
      pushToast("error", "Failed to download attachment.");
    }
  };

  const requestHideConversation = () => {
    if (!activeId || !active) return;
    setConfirmHide({ open: true, id: activeId, name: active.otherName });
  };

  const doHideConversation = async () => {
  const id = confirmHide.id;
  if (!id) return;

  setConfirmHide({ open: false, id: null, name: "" });

  try {
    await deleteConversationForMe(id);

    setItems((prev) => prev.filter((x) => x.conversationId !== id));

    if (activeId === id) closeChat();

    pushToast("info", `Conversation with ${confirmHide.name} removed from your list.`);

  } catch (e: any) {
    console.error(e);
    pushToast("error", e?.response?.data?.message ?? "Could not remove conversation.");
  }
};


  const fmtTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="msgLayout">
      <ToastStack toasts={toasts} onClose={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />

      {/* left: conversation list */}
      <aside className="msgCol card msgColLeft">
        <div className="msgHeader">
          <div>
            <h2>Messaging</h2>
            <div className="msgSub">Your conversations</div>
          </div>
          <button className="btn-outline" type="button" onClick={() => loadConversations()} disabled={listLoading}>
            {listLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="msgSearch">
          <input
            className="msgSearchInput"
            placeholder="Search…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {listError ? <div className="msgError">{listError}</div> : null}

        <div className="msgList">
          {filteredItems.map((x) => (
            <button
              key={x.conversationId}
              type="button"
              onClick={() => {
                setActiveId(x.conversationId);
                nav(`/messages?c=${x.conversationId}`, { replace: true });
              }}
              className={`msgItem ${activeId === x.conversationId ? "active" : ""}`}
              title={x.otherName}
            >
              <div
                className="msgAvatar"
                style={x.otherAvatarUrl ? { backgroundImage: `url(${x.otherAvatarUrl})` } : undefined}
              />
              <div className="msgItemBody">
                <div className="msgItemTop">
                  <div className="msgName">{x.otherName}</div>
                  <div className="msgRole">{x.otherRole}</div>
                </div>
                <div className="msgPreview">{x.lastMessagePreview}</div>
              </div>
            </button>
          ))}

          {!listLoading && !filteredItems.length ? (
            <div className="msgEmpty">{filter.trim() ? "No results." : "No conversations yet."}</div>
          ) : null}
        </div>
      </aside>

      {/* middle: chat */}
      <main className="msgCol card msgColMid">
        <div className="msgChatHead">
          <div>
            <h2>{active ? active.otherName : "Select a conversation"}</h2>
            <div className="msgSub">{active?.otherRole || ""}</div>
          </div>

          <div className="msgChatActions">
            <button className="btn-outline" type="button" onClick={closeChat} disabled={!activeId}>
              Close
            </button>

            <button className="btn-outline" type="button" onClick={requestHideConversation} disabled={!activeId}>
              Remove
            </button>
          </div>
        </div>

        <div className="msgChatBody">
          {chatError ? (
            <div className="msgError" style={{ marginBottom: 10 }}>
              {chatError}
            </div>
          ) : null}

          {!activeId ? <div className="msgEmpty">Pick someone on the left.</div> : null}
          {activeId && chatLoading ? <div className="msgEmpty">Loading messages…</div> : null}

          {activeId && !chatLoading ? (
            <>
              {messages.map((m) => {
                const mine = !!meId && m.senderId === meId;
                return (
                  <div key={m.id} className={`msgRow ${mine ? "me" : "them"}`}>
                    <div className={`msgRowAvatar ${mine ? "hidden" : ""}`} />
                    <div className={`msgBubble ${mine ? "me" : "them"}`}>
                    <div className="msgMetaLine">
                        <span className="msgMetaName">{mine ? "You" : active?.otherName || "User"}</span>
                        <span className="msgMetaDot">•</span>
                        <span className="msgMetaTime">{fmtTime(m.createdAt)}</span>
                    </div>

                    {m.content?.trim() ? <div className="msgBubbleText">{m.content}</div> : null}

                    {m.attachments?.length ? (
                        <div className="msgAttachments">
                        {m.attachments.map((a) => (
                            <button
                            key={a.id}
                            type="button"
                            onClick={() => openPdf(a)}
                            className="msgAttachment"
                            title="Open PDF"
                            >
                            <div className="msgAttachmentTop">PDF</div>
                            <div className="msgAttachmentName">{a.originalName}</div>
                            <div className="msgAttachmentMeta">{Math.round((a.sizeBytes || 0) / 1024)} KB</div>
                            </button>
                        ))}
                        </div>
                    ) : null}
                    </div>

                  </div>
                );
              })}
              <div ref={bottomRef} />
            </>
          ) : null}
        </div>

        <div className="msgComposer">
          <div className="msgComposerTop">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="msgHidden"
              onChange={(e) => onPickPdf(e.target.files?.[0] ?? null)}
              disabled={sending || !activeId}
            />

            <button className="btn-outline" type="button" onClick={() => fileRef.current?.click()} disabled={sending || !activeId}>
              Attach PDF
            </button>

            {pdfFile ? (
              <div className="msgFilePill" title={pdfFile.name}>
                <span className="msgFileName">{pdfFile.name}</span>
                <span className="msgFileMeta">({Math.round(pdfFile.size / 1024)} KB)</span>
                <button
                  className="msgFileRemove"
                  type="button"
                  onClick={clearPdf}
                  disabled={sending || !activeId}
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="msgHint">PDF optional</div>
            )}
          </div>

          <div className="msgComposerBottom">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={activeId ? "Write a message…" : "Select a conversation first"}
              className="msgInput"
              onKeyDown={(e) => {
                if (e.key === "Enter") onSend();
              }}
              disabled={sending || !activeId}
            />
            <button className="btn-primary" type="button" onClick={onSend} disabled={sending || !activeId || (!text.trim() && !pdfFile)}>
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </main>

      {/* right: profile panel */}
      <aside className="msgCol card msgColRight">
        <div className="msgHeader">
          <div>
            <h2>Details</h2>
            <div className="msgSub">About this person</div>
          </div>
        </div>

        {!active ? <div className="msgEmpty">No conversation selected.</div> : null}

        {active ? (
          <div className="msgDetails">
            <div className="msgDetailsTop">
              <div
                className="msgDetailsAvatar"
                style={
                  profile?.avatarUrl || active.otherAvatarUrl
                    ? { backgroundImage: `url(${profile?.avatarUrl || active.otherAvatarUrl})` }
                    : undefined
                }
              />
              <div>
                <div className="msgDetailsName">{active.otherName}</div>
                <div className="msgSub">{active.otherRole}</div>
              </div>
            </div>

            {profileLoading ? <div className="msgHint">Loading profile…</div> : null}
            {profileError ? <div className="msgError">{profileError}</div> : null}

            {!profileLoading && !profileError && profile ? (
              <div className="msgDetailsBody">
                {profile.headline?.trim() ? <div className="msgHeadline">{profile.headline}</div> : null}

                {[profile.city, profile.country].filter(Boolean).join(", ") ? (
                  <div className="msgHint">{[profile.city, profile.country].filter(Boolean).join(", ")}</div>
                ) : null}

                {profile.bio?.trim() ? <div className="msgBio">{profile.bio}</div> : null}

                {profile.affiliation?.trim() || profile.profession?.trim() || profile.university?.trim() || profile.faculty?.trim() ? (
                  <div className="msgKv">
                    {profile.affiliation?.trim() ? (
                      <div className="msgKvRow">
                        <div className="msgKvKey">Affiliation</div>
                        <div className="msgKvVal">{profile.affiliation}</div>
                      </div>
                    ) : null}
                    {profile.profession?.trim() ? (
                      <div className="msgKvRow">
                        <div className="msgKvKey">Profession</div>
                        <div className="msgKvVal">{profile.profession}</div>
                      </div>
                    ) : null}
                    {profile.university?.trim() ? (
                      <div className="msgKvRow">
                        <div className="msgKvKey">University</div>
                        <div className="msgKvVal">{profile.university}</div>
                      </div>
                    ) : null}
                    {profile.faculty?.trim() ? (
                      <div className="msgKvRow">
                        <div className="msgKvKey">Faculty</div>
                        <div className="msgKvVal">{profile.faculty}</div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {profile.linkedinUrl?.trim() || profile.githubUrl?.trim() || profile.website?.trim() ? (
                  <div className="msgLinks">
                    {profile.linkedinUrl?.trim() ? (
                      <a
                        className="msgLink"
                        href={profile.linkedinUrl.startsWith("http") ? profile.linkedinUrl : `https://${profile.linkedinUrl}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        LinkedIn
                      </a>
                    ) : null}
                    {profile.githubUrl?.trim() ? (
                      <a
                        className="msgLink"
                        href={profile.githubUrl.startsWith("http") ? profile.githubUrl : `https://${profile.githubUrl}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        GitHub
                      </a>
                    ) : null}
                    {profile.website?.trim() ? (
                      <a
                        className="msgLink"
                        href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Website
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </aside>

                <ConfirmModal
            open={confirmHide.open}
            title="Remove conversation"
            message={`Remove conversation with "${confirmHide.name}" from your list?`}
            confirmText="Remove"
            cancelText="Cancel"
            danger
            onCancel={() => setConfirmHide({ open: false, id: null, name: "" })}
            onConfirm={doHideConversation}
            />

    </div>
  );
}

function ToastStack({ toasts, onClose }: { toasts: Toast[]; onClose: (id: number) => void }) {
  if (!toasts.length) return null;

  return (
    <div className="annToastStack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`annToast annToast-${t.type}`} role="status">
          <div className="annToastMsg">{t.message}</div>
          <button className="annToastClose" type="button" onClick={() => onClose(t.id)} aria-label="Close">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  confirmText,
  cancelText,
  danger,
  onCancel,
  onConfirm
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="annConfirmOverlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="annConfirmModal card" role="dialog" aria-modal="true">
        <div className="annConfirmHead">
          <h3 className="annConfirmTitle">{title}</h3>
          <button className="btn-outline annConfirmClose" type="button" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="annConfirmMsg">{message}</div>

        <div className="annConfirmActions">
          <button className="btn-outline" type="button" onClick={onCancel}>
            {cancelText}
          </button>

          <button type="button" onClick={onConfirm} className={danger ? "annDangerBtn" : "annPrimaryBtn"}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
