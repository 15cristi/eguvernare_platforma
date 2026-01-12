import "./Announcements.css";
import { useEffect, useRef, useState } from "react";
import {
  addAnnouncementComment,
  createAnnouncement,
  getAnnouncementsFeed,
  toggleAnnouncementLike,
  type PostDto
} from "../api/announcements";
import { uploadAvatarToCloudinary } from "../api/cloudinary";

export default function Announcements() {
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

  const fileRef = useRef<HTMLInputElement | null>(null);
  const loadingRef = useRef(false);

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
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPage(0, "replace");
    // cleanup preview URL
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      alert("Please choose an image file.");
      return clearImage();
    }

    if (file.size > 8 * 1024 * 1024) {
      alert("Image is too large (max 8MB).");
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
    } catch (e) {
      console.error(e);
      alert("Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const onToggleLike = async (postId: number) => {
    if (busyPostId) return;
    setBusyPostId(postId);

    // optimistic
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

    if (busyPostId) return;
    setBusyPostId(postId);

    try {
      await addAnnouncementComment(postId, c);
      await refresh();
    } catch (e) {
      console.error(e);
      alert("Failed to comment");
    } finally {
      setBusyPostId(null);
    }
  };

  // right sidebar stats (cheap + useful)
  const totalPosts = posts.length;
  const totalLikes = posts.reduce((sum, p) => sum + (p.likeCount || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.commentCount || 0), 0);

  return (
    <div className="annShell">
      {/* FEED COLUMN */}
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

        {/* COMPOSER */}
        <div className="annComposer card">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share an update..."
            rows={4}
          />

          {imagePreview && (
            <div className="annImagePreview">
              {/* preview: cover + safe background */}
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

        {/* FEED */}
        <div className="annFeed">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              busy={busyPostId === p.id}
              onLike={() => onToggleLike(p.id)}
              onComment={(text) => onAddComment(p.id, text)}
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

      {/* RIGHT SIDEBAR */}
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

          <div className="annSideHint muted">
            Tip: photo posts look better if the image is at least 1200px wide.
          </div>
        </div>

       
      </aside>
    </div>
  );
}

function PostCard({
  post,
  busy,
  onLike,
  onComment
}: {
  post: PostDto;
  busy: boolean;
  onLike: () => void;
  onComment: (text: string) => void;
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
        <div className="annAuthor">
          <div className="avatarSmall" />
          <div>
            <strong>
              {post.author.firstName} {post.author.lastName}
            </strong>
            <div className="muted">{post.author.role}</div>
          </div>
        </div>

        <div className="muted">{new Date(post.createdAt).toLocaleString()}</div>
      </div>

      {post.content?.trim() ? <div className="annContent">{post.content}</div> : null}

      {post.imageUrl ? (
        <div className="annPostImage">
          {/* object-fit cover is handled in CSS.
              If your image is small or PNG with transparency, background helps. */}
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
                    <strong>
                      {cm.author.firstName} {cm.author.lastName}
                    </strong>
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
