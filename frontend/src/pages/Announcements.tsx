import "./Announcements.css";
import { useContext, useEffect, useRef, useState } from "react";
import {
  addAnnouncementComment,
  createAnnouncement,
  deleteAnnouncement,
  deleteAnnouncementComment,
  getAnnouncementsFeed,
  toggleAnnouncementLike,
  type PostDto
} from "../api/announcements";
import { uploadAvatarToCloudinary } from "../api/cloudinary";
import { getProfileByUserId, openCv } from "../api/profile";
import { AuthContext } from "../context/AuthContext";
import { getOrCreateDirectConversation } from "../api/messages";
import { useNavigate } from "react-router-dom";
import { getWsClient } from "../realtime/wsClient";

type CompanyDto = {
  name?: string;
  description?: string;
  domains?: string[];
};

type PublicProfile = {
  headline?: string;
  bio?: string;
  country?: string;
  city?: string;

  affiliation?: string;
  profession?: string;
  university?: string;
  faculty?: string;

  cvUrl?: string;
  expertAreas?: string[];
  expertise?: { area: string; description: string }[];
  resources?: { title: string; description: string; url: string }[];

  companyName?: string;
  companyDescription?: string;
  companyDomains?: string[];
  companies?: CompanyDto[];

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
function getCompaniesForDisplay(p: {
  companies?: CompanyDto[];
  companyName?: string;
  companyDescription?: string;
  companyDomains?: string[];
}): CompanyDto[] {
  const fromNew: CompanyDto[] = (p.companies || [])
    .map((c: CompanyDto): CompanyDto => ({
      name: (c?.name || "").trim(),
      description: (c?.description || "").trim(),
      domains: c?.domains || []
    }))
    .filter((c: CompanyDto) => !!(c.name || c.description || (c.domains && c.domains.length > 0)));

  if (fromNew.length > 0) return fromNew;

  const legacyOk =
    (p.companyName && p.companyName.trim().length > 0) ||
    (p.companyDescription && p.companyDescription.trim().length > 0) ||
    (p.companyDomains && p.companyDomains.length > 0);

  return legacyOk
    ? [
        {
          name: p.companyName || "",
          description: p.companyDescription || "",
          domains: p.companyDomains || []
        }
      ]
    : [];
}


export default function Announcements() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  const [posts, setPosts] = useState<PostDto[]>([]);
  const [page, setPage] = useState(0);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [posting, setPosting] = useState(false);
  const [draft, setDraft] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);

  const [busyPostId, setBusyPostId] = useState<number | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [busyCommentId, setBusyCommentId] = useState<number | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    postId: number | null;
    title: string;
  }>({ open: false, postId: null, title: "" });

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(1);

  const pushToast = (type: Toast["type"], message: string) => {
    const id = toastSeq.current++;
    setToasts((t) => [...t, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2800);
  };

  const [profileUser, setProfileUser] = useState<{ id: number; name: string; role: string } | null>(null);
  const [profileData, setProfileData] = useState<PublicProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string>("");
  const profileCache = useRef(new Map<number, PublicProfile>());

  // Avatar cache for feed (AuthorDto doesn't have avatarUrl)
  const avatarsRef = useRef<Record<number, string | null>>({});
  const [avatars, setAvatars] = useState<Record<number, string | null>>({});

  const fetchAvatar = async (userId: number) => {
    if (!userId) return;
    if (userId in avatarsRef.current) return;

    avatarsRef.current[userId] = null;
    try {
      const p = (await getProfileByUserId(userId)) as PublicProfile;
      avatarsRef.current[userId] = p?.avatarUrl ?? null;
      setAvatars({ ...avatarsRef.current });
    } catch {
      avatarsRef.current[userId] = null;
      setAvatars({ ...avatarsRef.current });
    }
  };

  const fileRef = useRef<HTMLInputElement | null>(null);
  const loadingRef = useRef(false);

  const openProfile = async (userId: number, name: string, role: string) => {
    setProfileUser({ id: userId, name, role });

    const cached = profileCache.current.get(userId) || null;
    setProfileData(cached);

    setProfileError("");
    setProfileLoading(true);

    try {
      const data = (await getProfileByUserId(userId)) as PublicProfile;
      profileCache.current.set(userId, data);
      setProfileData(data);

      // sync feed avatar cache too
      avatarsRef.current[userId] = data?.avatarUrl ?? null;
      setAvatars({ ...avatarsRef.current });
    } catch (e) {
      console.error(e);
      setProfileData(null);
      setProfileError("Could not load profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfile = () => {
    setProfileUser(null);
    setProfileData(null);
    setProfileLoading(false);
    setProfileError("");
  };


  const loadPage = async (nextPage: number, mode: "replace" | "append") => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    if (mode === "replace") setLoading(true);
    else setLoadingMore(true);

    try {
      const data = await getAnnouncementsFeed(nextPage, 10);

      // Prefetch avatars for authors + latest comments authors
      for (const p of data) {
        const authorId = (p as any)?.author?.id ?? 0;
        if (authorId) fetchAvatar(authorId);

        const comments = (p as any)?.latestComments ?? [];
        for (const c of comments) {
          const cid = (c as any)?.author?.id ?? 0;
          if (cid) fetchAvatar(cid);
        }
      }

      setPosts((prev) => {
        if (mode === "replace") return data;

        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        for (const p of data) if (!seen.has(p.id)) merged.push(p);
        return merged;
      });

      setPage(nextPage);
    } catch (e) {
      console.error(e);
      pushToast("error", "Failed to load announcements.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPage(0, "replace");
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

useEffect(() => {
  const c = getWsClient();
  if (!c) return;

  let sub: any = null;

  const trySub = () => {
    if (!c.connected) return;
    if (sub) return;

    sub = c.subscribe("/topic/announcements", (msg) => {
      const evt = JSON.parse(msg.body) as { type: string; data: any };

      setPosts((prev) => {
        switch (evt.type) {
          case "announcement:created":
            return [evt.data, ...prev];

          case "announcement:deleted":
            return prev.filter((p) => p.id !== evt.data.postId);

          case "announcement:like:updated":
            return prev.map((p) => (p.id === evt.data.id ? evt.data : p));

          case "announcement:comment:created": {
            const { postId, comment } = evt.data;
            return prev.map((p) => {
              if (p.id !== postId) return p;
              return {
                ...p,
                commentCount: (p.commentCount ?? 0) + 1,
              latestComments: [comment, ...(p.latestComments ?? [])].slice(0, 20)
              };
            });
          }

          case "announcement:comment:deleted": {
            const { postId, commentId } = evt.data;
            return prev.map((p) => {
              if (p.id !== postId) return p;
              return {
                ...p,
                commentCount: Math.max(0, (p.commentCount ?? 0) - 1),
                latestComments: (p.latestComments ?? []).filter((c: any) => c.id !== commentId)
              };
            });
          }

          default:
            return prev;
        }
      });
    });
  };

  trySub();
  const t = window.setInterval(trySub, 400);

  return () => {
    window.clearInterval(t);
    if (sub) sub.unsubscribe();
  };
}, []);

  
  useEffect(() => {
    if (!profileUser) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeProfile();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profileUser]);

  useEffect(() => {
    if (!confirmDelete.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmDelete({ open: false, postId: null, title: "" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmDelete.open]);

  const refresh = async () => {
    await loadPage(0, "replace");
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const onPickImage = (file: File | null) => {
    if (!file) return clearImage();

    if (!file.type.startsWith("image/")) {
      pushToast("error", "Please choose an image file.");
      return clearImage();
    }

    if (file.size > 8 * 1024 * 1024) {
      pushToast("error", "Image is too large (max 8MB).");
      return clearImage();
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);

    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const onPost = async () => {
    const text = draft.trim();
    if (!text && !imageFile) return;

    setPosting(true);
    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        setImageUploading(true);
        try {
          imageUrl = await uploadAvatarToCloudinary(imageFile);
        } finally {
          setImageUploading(false);
        }
      }

      const created = await createAnnouncement(text, imageUrl);

      const newAuthorId = (created as any)?.author?.id ?? 0;
      if (newAuthorId) fetchAvatar(newAuthorId);

      setDraft("");
      clearImage();

      pushToast("success", "Posted.");
    } catch (e) {
      console.error(e);
      pushToast("error", "Failed to post.");
    } finally {
      setPosting(false);
    }
  };

  const onToggleLike = async (postId: number) => {
    if (busyPostId || deletingPostId || busyCommentId) return;
    setBusyPostId(postId);

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const liked = !p.likedByMe;
        return { ...p, likedByMe: liked, likeCount: Math.max(0, p.likeCount + (liked ? 1 : -1)) };
      })
    );

    try {
      const updated = await toggleAnnouncementLike(postId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    } catch (e) {
      console.error(e);
      await refresh();
    } finally {
      setBusyPostId(null);
    }
  };

  const onAddComment = async (postId: number, content: string) => {
    const c = content.trim();
    if (!c) return;

    if (busyPostId || deletingPostId || busyCommentId) return;
    setBusyPostId(postId);

    try {
      await addAnnouncementComment(postId, c);
      await refresh();
      pushToast("success", "Comment added.");
    } catch (e) {
      console.error(e);
      pushToast("error", "Failed to comment.");
    } finally {
      setBusyPostId(null);
    }
  };

  const onDeleteComment = async (commentId: number) => {
    if (!isAdmin) return;
    if (busyPostId || deletingPostId || busyCommentId) return;

    setBusyCommentId(commentId);
    try {
      await deleteAnnouncementComment(commentId);
      pushToast("success", "Comment deleted.");
      await refresh();
    } catch (e) {
      console.error(e);
      pushToast("error", "Failed to delete comment.");
    } finally {
      setBusyCommentId(null);
    }
  };

  const requestDelete = (postId: number) => {
    if (!isAdmin) return;
    const post = posts.find((p) => p.id === postId);
    const title = post?.content?.trim()
      ? post.content.trim().slice(0, 60) + (post.content.trim().length > 60 ? "…" : "")
      : "this post";

    setConfirmDelete({ open: true, postId, title });
  };

  const confirmDeleteNow = async () => {
    if (!isAdmin) return;
    const postId = confirmDelete.postId;
    if (!postId) return;

    if (deletingPostId) return;

    setConfirmDelete({ open: false, postId: null, title: "" });
    setDeletingPostId(postId);

    try {
      await deleteAnnouncement(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      pushToast("success", "Post deleted.");
    } catch (e: any) {
      console.error(e);
      pushToast("error", e?.response?.data?.message ?? "Failed to delete post.");
    } finally {
      setDeletingPostId(null);
    }
  };

  const onMessageFromProfile = async (otherUserId: number) => {
    try {
      const { conversationId } = await getOrCreateDirectConversation(otherUserId);
      closeProfile();
      navigate(`/messages?c=${conversationId}`);
    } catch (e) {
      console.error(e);
      pushToast("error", "Could not start conversation.");
    }
  };


  return (
    <div className="annShell">
      <ToastStack toasts={toasts} onClose={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />

      <div className="annPage">
        <div className="annHeader">
          <div>
            <h2>Announcements</h2>
            <span className="annSub">Updates from people and projects, newest first.</span>
          </div>

          <button className="btn-outline" type="button" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="annComposer card">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Share an update..." rows={4} />

          {imagePreview && (
            <div className="annImagePreview">
              <img src={imagePreview} alt="preview" />
              <button className="annRemoveImage" type="button" onClick={clearImage} title="Remove image">
                Remove
              </button>
            </div>
          )}

          <div className="annComposerBar">
            <div className="annComposerLeft">
              <input
                ref={fileRef}
                className="annFile"
                type="file"
                accept="image/*"
                onChange={(e) => onPickImage(e.target.files?.[0] || null)}
                disabled={posting || imageUploading}
              />

              <button
                className="btn-outline"
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={posting || imageUploading}
                title="Attach a photo"
              >
                🖼️ Photo
              </button>
            </div>

            <button
              className="btn-primary"
              type="button"
              onClick={onPost}
              disabled={posting || imageUploading || (!draft.trim() && !imageFile)}
              title="Post update"
            >
              {imageUploading ? "Uploading..." : posting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>

        <div className="annFeed">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              avatars={avatars}
              busy={busyPostId === p.id || deletingPostId === p.id || !!busyCommentId}
              busyCommentId={busyCommentId}
              isAdmin={isAdmin}
              deleting={deletingPostId === p.id}
              onLike={() => onToggleLike(p.id)}
              onComment={(text) => onAddComment(p.id, text)}
              onDelete={() => requestDelete(p.id)}
              onDeleteComment={onDeleteComment}
              onOpenProfile={(u) => openProfile(u.id, `${u.firstName} ${u.lastName}`, u.role)}
            />
          ))}

          <div className="annMore">
            <button className="btn-outline" type="button" onClick={() => loadPage(page + 1, "append")} disabled={loadingMore}>
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        </div>
      </div>



      {profileUser && (
        <ProfileModal
          user={profileUser}
          loading={profileLoading}
          error={profileError}
          profile={profileData}
          onClose={closeProfile}
          currentUserId={(user as any)?.id}
          onMessage={onMessageFromProfile}
        />
      )}

      <ConfirmModal
        open={confirmDelete.open}
        title="Delete post"
        message={`Delete "${confirmDelete.title}"? This can't be undone.`}
        confirmText={deletingPostId ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        danger
        busy={!!deletingPostId}
        onCancel={() => setConfirmDelete({ open: false, postId: null, title: "" })}
        onConfirm={confirmDeleteNow}
      />
    </div>
  );
}

function PostCard({
  post,
  avatars,
  busy,
  busyCommentId,
  isAdmin,
  deleting,
  onLike,
  onComment,
  onDelete,
  onDeleteComment,
  onOpenProfile
}: {
  post: PostDto;
  avatars: Record<number, string | null>;
  busy: boolean;
  busyCommentId: number | null;
  isAdmin: boolean;
  deleting: boolean;
  onLike: () => void;
  onComment: (text: string) => void;
  onDelete: () => void;
  onDeleteComment: (commentId: number) => void;
  onOpenProfile: (u: PostDto["author"]) => void;
}) {
  const [c, setC] = useState("");

  const authorId = post.author?.id ?? 0;
  const avatarUrl = authorId ? avatars[authorId] ?? null : null;

  const send = () => {
    const text = c.trim();
    if (!text) return;
    onComment(text);
    setC("");
  };

  return (
    <div className="card annPost">
      <div className="annPostHead">
        <button className="annAuthor annAuthorBtn" type="button" onClick={() => onOpenProfile(post.author)}>
          <div
            className="avatarSmall"
            style={
              avatarUrl
                ? {
                    backgroundImage: `url(${avatarUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat"
                  }
                : undefined
            }
          />
          <div>
            <strong>
              {post.author.firstName} {post.author.lastName}
            </strong>
            <div className="muted">{post.author.role}</div>
          </div>
        </button>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="muted">{new Date(post.createdAt).toLocaleString()}</div>

          {isAdmin ? (
            <button className="btn-outline" type="button" onClick={onDelete} disabled={busy || deleting} title="Delete post">
              {deleting ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>
      </div>

      {post.content?.trim() ? <div className="annContent">{post.content}</div> : null}

      {post.imageUrl ? (
        <div className="annPostImage">
          <img src={post.imageUrl} alt="post" loading="lazy" />
        </div>
      ) : null}

      <div className="annMeta">
        <span>{post.likeCount} likes</span>
        <span>{post.commentCount} comments</span>
      </div>

      <div className="annActions">
        <button className={`annBtn ${post.likedByMe ? "active" : ""}`} type="button" onClick={onLike} disabled={busy}>
          👍 Like
        </button>

        <button
          className="annBtn"
          type="button"
          onClick={() => {
            const el = document.getElementById(`c-${post.id}`) as HTMLInputElement | null;
            el?.focus();
          }}
          disabled={busy}
        >
          💬 Comment
        </button>
      </div>

      <div className="annComments">
        <div className="annCommentBox">
          <input
            id={`c-${post.id}`}
            value={c}
            onChange={(e) => setC(e.target.value)}
            placeholder="Write a comment..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                send();
              }
            }}
            disabled={busy}
          />
          <button className="btn-outline" type="button" onClick={send} disabled={busy || !c.trim()}>
            Send
          </button>
        </div>

        {post.latestComments?.length > 0 && (
          <div className="annCommentList">
            {post.latestComments
              .slice(0, 3)
              .reverse()
              .map((cm) => {
                const cmAuthorId = cm.author?.id ?? 0;
                const cmAvatar = cmAuthorId ? avatars[cmAuthorId] ?? null : null;

                return (
                  <div className="annComment" key={cm.id}>
                    <div
                      className="avatarSmall"
                      style={
                        cmAvatar
                          ? {
                              backgroundImage: `url(${cmAvatar})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              backgroundRepeat: "no-repeat"
                            }
                          : undefined
                      }
                    />

                    <div className="annCommentBody">
                      <button className="annInlineLink" type="button" onClick={() => onOpenProfile(cm.author)} title="View profile">
                        <strong>
                          {cm.author.firstName} {cm.author.lastName}
                        </strong>
                      </button>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 2 }}>
                        <div className="muted">{new Date(cm.createdAt).toLocaleString()}</div>

                        {isAdmin ? (
                          <button
                            className="btn-outline"
                            type="button"
                            onClick={() => onDeleteComment(cm.id)}
                            disabled={busy || busyCommentId === cm.id}
                            title="Delete comment"
                            style={{ padding: "6px 10px", borderRadius: 12, height: "auto" }}
                          >
                            {busyCommentId === cm.id ? "Deleting..." : "Delete"}
                          </button>
                        ) : null}
                      </div>

                      <p>{cm.content}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
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
  busy,
  onCancel,
  onConfirm
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger?: boolean;
  busy?: boolean;
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
          <button className="btn-outline annConfirmClose" type="button" onClick={onCancel} disabled={busy}>
            ×
          </button>
        </div>

        <div className="annConfirmMsg">{message}</div>

        <div className="annConfirmActions">
          <button className="btn-outline" type="button" onClick={onCancel} disabled={busy}>
            {cancelText}
          </button>

          <button type="button" onClick={onConfirm} disabled={busy} className={danger ? "annDangerBtn" : "annPrimaryBtn"}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileModal({
  user,
  loading,
  error,
  profile,
  onClose,
  currentUserId,
  onMessage
}: {
  user: { id: number; name: string; role: string } | null;
  loading: boolean;
  error: string;
  profile: PublicProfile | null;
  onClose: () => void;
  currentUserId?: number;
  onMessage: (otherUserId: number) => void;
}) {
  const p = profile;
  const title = user?.name || "Profile";

  const expertise = (p?.expertise && p.expertise.length > 0 ? p.expertise : null) || null;
  const fallbackAreas = !expertise && p?.expertAreas?.length ? p.expertAreas.map((a) => ({ area: a, description: "" })) : [];
  const finalExpertise = expertise || fallbackAreas;

  const prettyEnum = (v?: string) => {
    const s = (v || "").trim();
    if (!s) return "";
    return s
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/(^|\s)\S/g, (t) => t.toUpperCase());
  };

  const canMessage = !!user?.id && !!currentUserId && user.id !== currentUserId;

  return (
    <div
      className="annModalOverlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="annModal card" role="dialog" aria-modal="true">
        <div className="annModalHead">
          <div className="annModalTitle">
            <div className="annModalAvatar" style={p?.avatarUrl ? { backgroundImage: `url(${p.avatarUrl})` } : undefined} />
            <div>
              <h3>{title}</h3>
              <div className="muted">{user?.role}</div>
            </div>
          </div>

          <button className="btn-outline" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {loading ? <div className="muted">Loading…</div> : null}
        {!loading && error ? <div className="annError">{error}</div> : null}

        {!loading && !error && p ? (
          <>
            <div className="annModalBody">
              <div className="annRow2">
                <div className="annInfoBox">
                  <div className="annInfoLabel">Profession</div>
                  <div className="annInfoValue">{p.profession || "-"}</div>
                </div>

                <div className="annInfoBox">
                  <div className="annInfoLabel">Faculty</div>
                  <div className="annInfoValue">{p.faculty || "-"}</div>
                </div>
              </div>

              <div className="annInfoBox">
                <div className="annInfoLabel">University</div>
                <div className="annInfoValue">{p.university || p.affiliation || "-"}</div>
              </div>

              {p.bio?.trim() ? (
                <div className="annInfoBox">
                  <div className="annInfoLabel">Bio</div>
                  <div className="annInfoValue">{p.bio}</div>
                </div>
              ) : null}

              {(p.openToProjects || p.openToMentoring || p.availability?.trim() || p.experienceLevel?.trim()) ? (
                <div className="annInfoBox">
                  <div className="annInfoLabel">Collaborations</div>
                  <div className="annInfoValue">
                    <div className="annChips">
                      {p.openToProjects ? <span className="annChip">Open to projects</span> : null}
                      {p.openToMentoring ? <span className="annChip">Open to mentoring</span> : null}
                      {p.availability?.trim() ? <span className="annChip">{prettyEnum(p.availability)}</span> : null}
                      {p.experienceLevel?.trim() ? <span className="annChip">{prettyEnum(p.experienceLevel)}</span> : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {finalExpertise?.length ? (
                <div className="annInfoBox">
                  <div className="annInfoLabel">Expertise</div>
                  <div className="annInfoValue">
                    <div className="annList">
                      {finalExpertise.map((x, idx) => (
                        <div className="annListRow" key={`${x.area}-${idx}`}>
                          <div className="annListTitle">{x.area}</div>
                          {x.description?.trim() ? <div className="annListSub">{x.description}</div> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {p.resources?.length ? (
                <div className="annInfoBox">
                  <div className="annInfoLabel">Resources</div>
                  <div className="annInfoValue">
                    <div className="annList">
                      {p.resources.map((r, idx) => (
                        <div className="annResourceRow" key={`${r.title}-${idx}`}>
                          <div style={{ minWidth: 0 }}>
                            <div className="annListTitle">{r.title}</div>
                            {r.description?.trim() ? <div className="annListSub">{r.description}</div> : null}
                          </div>
                          {r.url?.trim() ? (
                            <button type="button" className="annLinkBtn" onClick={() => openCv(r.url)}>
                              Open
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {(() => {
                const companies = getCompaniesForDisplay(p);
                if (companies.length === 0) return null;

                return (
                  <div className="annInfoBox">
                    <div className="annInfoLabel">Companies</div>
                    <div className="annInfoValue">
                      <div className="annList">
                        {companies.map((c, idx) => (
                          <div className="annResourceRow" key={`${c.name || "company"}-${idx}`}>
                            <div style={{ minWidth: 0 }}>
                              {c.name?.trim() ? <div className="annListTitle">{c.name}</div> : null}
                              {c.description?.trim() ? <div className="annListSub">{c.description}</div> : null}

                              {c.domains?.length ? (
                                <div className="annChips" style={{ marginTop: 8 }}>
                                  {c.domains.slice(0, 12).map((d, i) => (
                                    <span className="annChip" key={`${d}-${i}`}>
                                      {d}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}


              {p.cvUrl?.trim() ? (
                <div className="annInfoBox">
                  <div className="annInfoLabel">CV</div>
                  <div className="annInfoValue">
                    <button type="button" className="annLinkBtn" onClick={() => openCv(p.cvUrl!)}>
                      Open CV
                    </button>
                  </div>
                </div>
              ) : null}

              {(p.linkedinUrl?.trim() || p.githubUrl?.trim() || p.website?.trim()) ? (
                <div className="annInfoBox">
                  <div className="annInfoLabel">Links</div>
                  <div className="annInfoValue">
                    <div className="annChips">
                      {p.linkedinUrl?.trim() ? (
                        <a
                          className="annChip"
                          href={p.linkedinUrl.startsWith("http") ? p.linkedinUrl : `https://${p.linkedinUrl}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          LinkedIn
                        </a>
                      ) : null}
                      {p.githubUrl?.trim() ? (
                        <a
                          className="annChip"
                          href={p.githubUrl.startsWith("http") ? p.githubUrl : `https://${p.githubUrl}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          GitHub
                        </a>
                      ) : null}
                      {p.website?.trim() ? (
                        <a
                          className="annChip"
                          href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Website
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="annModalFoot">
              {canMessage ? (
                <button className="btn-primary" type="button" onClick={() => onMessage(user!.id)} disabled={loading}>
                  Message
                </button>
              ) : null}

              <button className="btn-outline" type="button" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
