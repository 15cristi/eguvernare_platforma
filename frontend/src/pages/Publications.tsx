import { useEffect, useState } from "react";
import "./ExploreLists.css";

import {
  createPublication,
  deletePublication,
  getMyPublications,
  updatePublication,
  getAllPublications,
  type PublicationDto
} from "../api/publications";

const norm = (s?: string | null) => (s || "").trim();

const toUrl = (raw?: string | null) => {
  const v = norm(raw);
  if (!v) return "";
  return v.startsWith("http") ? v : `https://${v}`;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(2,44,34,0.55)",
  color: "#eaf7f1",
  outline: "none",
  padding: "10px 12px",
  height: 44
};

export default function Publications() {
  // My
  const [myPubs, setMyPubs] = useState<PublicationDto[]>([]);
  const [myLoading, setMyLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ title: "", venue: "", year: "", url: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editing, setEditing] = useState({ title: "", venue: "", year: "", url: "" });

  // Explore global
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [global, setGlobal] = useState<PublicationDto[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  const refreshMine = async () => {
    setMyLoading(true);
    try {
      const items = await getMyPublications();
      setMyPubs(items || []);
    } catch (e) {
      console.error(e);
      setMyPubs([]);
    } finally {
      setMyLoading(false);
    }
  };

  const loadGlobal = async (nextPage: number, replace: boolean) => {
    setGlobalLoading(true);
    try {
      const res = await getAllPublications(q.trim(), nextPage, 20);
      setTotalPages(res.totalPages || 1);
      setPage(res.page || 0);
      setGlobal((prev) => (replace ? res.items : [...prev, ...res.items]));
    } catch (e) {
      console.error(e);
      if (replace) setGlobal([]);
    } finally {
      setGlobalLoading(false);
    }
  };

  useEffect(() => {
    refreshMine();
    loadGlobal(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => loadGlobal(0, true), 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const add = async () => {
    const title = norm(draft.title);
    if (!title) return;

    const y = draft.year.trim();
    const yearNum = y ? Number(y) : undefined;
    if (yearNum !== undefined && (!Number.isFinite(yearNum) || yearNum < 1900 || yearNum > 2100)) {
      alert("Year must be between 1900 and 2100");
      return;
    }

    try {
      const created = await createPublication({
        title,
        venue: norm(draft.venue) || undefined,
        year: yearNum,
        url: norm(draft.url) || undefined
      });
      setMyPubs((p) => [created, ...p]);
      setDraft({ title: "", venue: "", year: "", url: "" });
      setShowAdd(false);
      loadGlobal(0, true);
    } catch (e) {
      console.error(e);
      alert("Publication save failed");
    }
  };

  const startEdit = (p: PublicationDto) => {
    setEditingId(p.id);
    setEditing({
      title: p.title || "",
      venue: p.venue || "",
      year: p.year ? String(p.year) : "",
      url: p.url || ""
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditing({ title: "", venue: "", year: "", url: "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const title = norm(editing.title);
    if (!title) return;

    const y = editing.year.trim();
    const yearNum = y ? Number(y) : undefined;
    if (yearNum !== undefined && (!Number.isFinite(yearNum) || yearNum < 1900 || yearNum > 2100)) {
      alert("Year must be between 1900 and 2100");
      return;
    }

    try {
      const updated = await updatePublication(editingId, {
        title,
        venue: norm(editing.venue) || undefined,
        year: yearNum,
        url: norm(editing.url) || undefined
      });
      setMyPubs((list) => list.map((x) => (x.id === updated.id ? updated : x)));
      cancelEdit();
      loadGlobal(0, true);
    } catch (e) {
      console.error(e);
      alert("Publication update failed");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this publication?")) return;
    try {
      await deletePublication(id);
      setMyPubs((list) => list.filter((x) => x.id !== id));
      if (editingId === id) cancelEdit();
      loadGlobal(0, true);
    } catch (e) {
      console.error(e);
      alert("Publication delete failed");
    }
  };

  const canLoadMore = page + 1 < totalPages;

  return (
    <div className="annShell" style={{ gridTemplateColumns: "1fr" }}>
      <div className="annPage">
        <div className="annHeader">
          <div>
            <h2>Publications</h2>
            <span className="annSub">All publications in the platform + your own.</span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-outline" type="button" onClick={refreshMine} disabled={myLoading}>
              {myLoading ? "Refreshing..." : "Refresh My"}
            </button>
            <button className="btn-primary" type="button" onClick={() => setShowAdd((s) => !s)}>
              {showAdd ? "Close" : "Add Publication"}
            </button>
          </div>
        </div>

        {/* MY PUBLICATIONS */}
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <strong>My Publications</strong>
            <span className="muted">{myPubs.length} items</span>
          </div>

          {showAdd && (
            <div className="annList" style={{ marginTop: 12 }}>
              <div className="annListItem">
                <div className="muted" style={{ marginBottom: 8 }}>Add publication</div>

                <input style={inputStyle} value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Title" />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10, marginTop: 10 }}>
                  <input style={inputStyle} value={draft.venue} onChange={(e) => setDraft((d) => ({ ...d, venue: e.target.value }))} placeholder="Venue" />
                  <input style={inputStyle} value={draft.year} onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value }))} placeholder="Year" />
                </div>

                <input style={{ ...inputStyle, marginTop: 10 }} value={draft.url} onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))} placeholder="Link" />

                <button className="btn-primary" type="button" onClick={add} disabled={!draft.title.trim()} style={{ width: "100%", marginTop: 10 }}>
                  Save
                </button>
              </div>
            </div>
          )}

          <div className="annList" style={{ marginTop: 12 }}>
            {myPubs.length ? (
              myPubs.map((p) => (
                <div className="annListItem" key={p.id}>
                  {editingId === p.id ? (
                    <>
                      <input style={inputStyle} value={editing.title} onChange={(e) => setEditing((d) => ({ ...d, title: e.target.value }))} />

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10, marginTop: 10 }}>
                        <input style={inputStyle} value={editing.venue} onChange={(e) => setEditing((d) => ({ ...d, venue: e.target.value }))} />
                        <input style={inputStyle} value={editing.year} onChange={(e) => setEditing((d) => ({ ...d, year: e.target.value }))} />
                      </div>

                      <input style={{ ...inputStyle, marginTop: 10 }} value={editing.url} onChange={(e) => setEditing((d) => ({ ...d, url: e.target.value }))} />

                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button className="btn-primary" type="button" onClick={saveEdit} disabled={!editing.title.trim()} style={{ flex: 1 }}>
                          Save
                        </button>
                        <button className="btn-outline" type="button" onClick={cancelEdit} style={{ flex: 1 }}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="annListTop">
                        <strong>{p.title}</strong>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn-outline" type="button" onClick={() => startEdit(p)}>
                            Edit
                          </button>
                          <button className="btn-outline" type="button" onClick={() => remove(p.id)}>
                            Delete
                          </button>
                        </div>
                      </div>

                      {(p.venue || p.year) ? (
                        <div className="muted">{[p.venue, p.year ? String(p.year) : ""].filter(Boolean).join(" · ")}</div>
                      ) : null}

                      {p.url?.trim() ? (
                        <a className="annPill" href={toUrl(p.url)} target="_blank" rel="noreferrer" style={{ marginTop: 10 }}>
                          Open
                        </a>
                      ) : null}
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="muted">No publications yet.</div>
            )}
          </div>
        </div>

        {/* EXPLORE GLOBAL */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <strong>Explore (All Publications)</strong>
            <span className="muted">Search by user name or publication title</span>
          </div>

          <input
            style={{ ...inputStyle, marginTop: 12 }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search: user name, title, venue, year..."
          />

          <div className="annList" style={{ marginTop: 12 }}>
            {globalLoading && global.length === 0 ? <div className="muted">Loading...</div> : null}

            {global.map((p) => (
              <div className="annListItem" key={`g-${p.id}`}>
                <div className="annListTop">
                  <strong>{p.title}</strong>
                  {p.url?.trim() ? (
                    <a className="annInlineLink" href={toUrl(p.url)} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  ) : null}
                </div>

                <div className="muted">
                  {(p.userFirstName || p.userLastName) ? `${p.userFirstName || ""} ${p.userLastName || ""}`.trim() : "Unknown user"}
                  {p.userRole ? ` · ${p.userRole}` : ""}
                  {(p.venue || p.year) ? ` · ${[p.venue, p.year ? String(p.year) : ""].filter(Boolean).join(" · ")}` : ""}
                </div>
              </div>
            ))}

            {!globalLoading && global.length === 0 ? <div className="muted">No results.</div> : null}
          </div>

          <div className="annMore" style={{ marginTop: 12 }}>
            <button className="btn-outline" type="button" onClick={() => loadGlobal(page + 1, false)} disabled={!canLoadMore || globalLoading}>
              {globalLoading ? "Loading..." : canLoadMore ? "Load more" : "No more"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
