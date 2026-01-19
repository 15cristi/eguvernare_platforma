import "./Announcements.css";
import { useContext, useEffect, useRef, useState } from "react";
import {
  addAnnouncementComment,
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementsFeed,
  toggleAnnouncementLike,
  type PostDto
} from "../api/announcements";
import { uploadAvatarToCloudinary } from "../api/cloudinary";
import { getProfileByUserId } from "../api/profile";
import { AuthContext } from "../context/AuthContext";
import { getOrCreateDirectConversation } from "../api/messages";
import { useNavigate } from "react-router-dom";

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
      setPosts((p) => [created, ...p]);

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
    if (busyPostId || deletingPostId) return;
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

    if (busyPostId || deletingPostId) return;
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

  const totalPosts = posts.length;
  const totalLikes = posts.reduce((sum, p) => sum + (p.likeCount || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.commentCount || 0), 0);

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
              busy={busyPostId === p.id || deletingPostId === p.id}
              isAdmin={isAdmin}
              deleting={deletingPostId === p.id}
              onLike={() => onToggleLike(p.id)}
              onComment={(text) => onAddComment(p.id, text)}
              onDelete={() => requestDelete(p.id)}
              onOpenProfile={(u) => openProfile(u.id, `${u.firstName} ${u.lastName}`, u.role)}
            />
          ))}

          <div className="annMore">
            <button
              className="btn-outline"
              type="button"
              onClick={() => loadPage(page + 1, "append")}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        </div>
      </div>

      <aside className="annRight">
        <div className="card annSideCard">
          <div className="annSideTitle">
            <strong>Quick stats</strong>
            <span className="muted">Your current feed</span>
          </div>

          <div className="annSideGrid">
            <div className="annSideStat">
              <div className="muted">Posts loaded</div>
              <strong>{totalPosts}</strong>
            </div>
            <div className="annSideStat">
              <div className="muted">Likes</div>
              <strong>{totalLikes}</strong>
            </div>
            <div className="annSideStat">
              <div className="muted">Comments</div>
              <strong>{totalComments}</strong>
            </div>
          </div>

          <div className="annSideHint muted">Tip: photo posts look better if the image is at least 1200px wide.</div>
        </div>
      </aside>

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
  busy,
  isAdmin,
  deleting,
  onLike,
  onComment,
  onDelete,
  onOpenProfile
}: {
  post: PostDto;
  busy: boolean;
  isAdmin: boolean;
  deleting: boolean;
  onLike: () => void;
  onComment: (text: string) => void;
  onDelete: () => void;
  onOpenProfile: (u: PostDto["author"]) => void;
}) {
  const [c, setC] = useState("");

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
          <div className="avatarSmall" />
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
              .map((cm) => (
                <div className="annComment" key={cm.id}>
                  <div className="avatarSmall" />
                  <div className="annCommentBody">
                    <button className="annInlineLink" type="button" onClick={() => onOpenProfile(cm.author)} title="View profile">
                      <strong>
                        {cm.author.firstName} {cm.author.lastName}
                      </strong>
                    </button>
                    <div className="muted">{new Date(cm.createdAt).toLocaleString()}</div>
                    <p>{cm.content}</p>
                  </div>
                </div>
              ))}
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

  const loc = [p?.city, p?.country].filter(Boolean).join(", ");
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

  const showLink = (label: string, url?: string) => {
    const v = (url || "").trim();
    if (!v) return null;
    const href = v.startsWith("http") ? v : `https://${v}`;
    return (
      <a className="annPill" href={href} target="_blank" rel="noreferrer">
        {label}
      </a>
    );
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

          <div style={{ display: "flex", gap: 10 }}>
            {canMessage ? (
              <button className="btn-primary" type="button" onClick={() => onMessage(user!.id)}>
                Message
              </button>
            ) : null}

            <button className="btn-outline" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {loading && <div className="muted">Loading…</div>}
        {error && <div className="annError">{error}</div>}

        {!loading && !error && p && (
          <div className="annModalBody">
            {p.headline?.trim() ? <div className="annHeadline">{p.headline}</div> : null}
            {loc ? <div className="muted">{loc}</div> : null}

            {p.bio?.trim() ? <div className="annBio">{p.bio}</div> : null}

            <div className="annGrid">
              {p.affiliation?.trim() ? (
                <div>
                  <div className="muted">Affiliation</div>
                  <div>{p.affiliation}</div>
                </div>
              ) : null}

              {p.profession?.trim() ? (
                <div>
                  <div className="muted">Profession</div>
                  <div>{p.profession}</div>
                </div>
              ) : null}

              {p.faculty?.trim() ? (
                <div>
                  <div className="muted">Faculty</div>
                  <div>{p.faculty}</div>
                </div>
              ) : null}

              {p.university?.trim() ? (
                <div>
                  <div className="muted">University</div>
                  <div>{p.university}</div>
                </div>
              ) : null}
            </div>

            {(p.openToProjects || p.openToMentoring || p.availability?.trim() || p.experienceLevel?.trim()) && (
              <div className="annSection">
                <div className="annSectionTitle">Collaborations</div>
                <div className="annPills">
                  {p.openToProjects ? <span className="annPill">Open to projects</span> : null}
                  {p.openToMentoring ? <span className="annPill">Open to mentoring</span> : null}
                  {p.availability?.trim() ? <span className="annPill">{prettyEnum(p.availability)}</span> : null}
                  {p.experienceLevel?.trim() ? <span className="annPill">{prettyEnum(p.experienceLevel)}</span> : null}
                </div>
              </div>
            )}

            {finalExpertise?.length ? (
              <div className="annSection">
                <div className="annSectionTitle">Expertise</div>
                <div className="annList">
                  {finalExpertise.map((x, idx) => (
                    <div className="annListItem" key={`${x.area}-${idx}`}>
                      <div className="annListTop">
                        <strong>{x.area}</strong>
                      </div>
                      {x.description?.trim() ? <div className="muted">{x.description}</div> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {p.resources?.length ? (
              <div className="annSection">
                <div className="annSectionTitle">Resources</div>
                <div className="annList">
                  {p.resources.map((r, idx) => (
                    <div className="annListItem" key={`${r.title}-${idx}`}>
                      <div className="annListTop">
                        <strong>{r.title}</strong>
                        {r.url?.trim() ? (
                          <a
                            className="annInlineLink"
                            href={r.url.startsWith("http") ? r.url : `https://${r.url}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open
                          </a>
                        ) : null}
                      </div>
                      {r.description?.trim() ? <div className="muted">{r.description}</div> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {(p.companyName?.trim() || p.companyDescription?.trim() || p.companyDomains?.length) && (
              <div className="annSection">
                <div className="annSectionTitle">Company</div>
                {p.companyName?.trim() ? (
                  <div>
                    <strong>{p.companyName}</strong>
                  </div>
                ) : null}
                {p.companyDescription?.trim() ? (
                  <div className="muted" style={{ marginTop: 6 }}>
                    {p.companyDescription}
                  </div>
                ) : null}
                {p.companyDomains?.length ? (
                  <div className="annPills">
                    {p.companyDomains.slice(0, 12).map((d) => (
                      <span className="annPill" key={d}>
                        {d}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {(p.linkedinUrl?.trim() || p.githubUrl?.trim() || p.website?.trim()) && (
              <div className="annSection">
                <div className="annSectionTitle">Links</div>
                <div className="annPills">
                  {showLink("LinkedIn", p.linkedinUrl)}
                  {showLink("GitHub", p.githubUrl)}
                  {showLink("Website", p.website)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
