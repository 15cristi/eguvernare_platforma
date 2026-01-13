import { useEffect, useState } from "react";
import "./ExploreLists.css";

import {
  createProject,
  deleteProject,
  getMyProjects,
  updateProject,
  getAllProjects,
  type ProjectDto
} from "../api/projects";

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

export default function Projects() {
  // My
  const [myProjects, setMyProjects] = useState<ProjectDto[]>([]);
  const [myLoading, setMyLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "", url: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editing, setEditing] = useState({ title: "", description: "", url: "" });

  // Explore global
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [global, setGlobal] = useState<ProjectDto[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  const refreshMine = async () => {
    setMyLoading(true);
    try {
      const items = await getMyProjects();
      setMyProjects(items || []);
    } catch (e) {
      console.error(e);
      setMyProjects([]);
    } finally {
      setMyLoading(false);
    }
  };

  const loadGlobal = async (nextPage: number, replace: boolean) => {
    setGlobalLoading(true);
    try {
      const res = await getAllProjects(q.trim(), nextPage, 20);
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

  // When q changes, reload first page (debounced)
  useEffect(() => {
    const t = window.setTimeout(() => {
      loadGlobal(0, true);
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const add = async () => {
    const title = norm(draft.title);
    if (!title) return;

    try {
      const created = await createProject({
        title,
        description: norm(draft.description) || undefined,
        url: norm(draft.url) || undefined
      });
      setMyProjects((p) => [created, ...p]);
      setDraft({ title: "", description: "", url: "" });
      setShowAdd(false);

      // refresh global so it appears there too
      loadGlobal(0, true);
    } catch (e) {
      console.error(e);
      alert("Project save failed");
    }
  };

  const startEdit = (p: ProjectDto) => {
    setEditingId(p.id);
    setEditing({ title: p.title || "", description: p.description || "", url: p.url || "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditing({ title: "", description: "", url: "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const title = norm(editing.title);
    if (!title) return;

    try {
      const updated = await updateProject(editingId, {
        title,
        description: norm(editing.description) || undefined,
        url: norm(editing.url) || undefined
      });
      setMyProjects((list) => list.map((x) => (x.id === updated.id ? updated : x)));
      cancelEdit();
      loadGlobal(0, true);
    } catch (e) {
      console.error(e);
      alert("Project update failed");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this project?")) return;
    try {
      await deleteProject(id);
      setMyProjects((list) => list.filter((x) => x.id !== id));
      if (editingId === id) cancelEdit();
      loadGlobal(0, true);
    } catch (e) {
      console.error(e);
      alert("Project delete failed");
    }
  };

  const canLoadMore = page + 1 < totalPages;

  return (
    <div className="annShell" style={{ gridTemplateColumns: "1fr" }}>
      <div className="annPage">
        <div className="annHeader">
          <div>
            <h2>Projects</h2>
            <span className="annSub">All projects in the platform + your own.</span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-outline" type="button" onClick={refreshMine} disabled={myLoading}>
              {myLoading ? "Refreshing..." : "Refresh My"}
            </button>
            <button className="btn-primary" type="button" onClick={() => setShowAdd((s) => !s)}>
              {showAdd ? "Close" : "Add Project"}
            </button>
          </div>
        </div>

        {/* MY PROJECTS */}
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <strong>My Projects</strong>
            <span className="muted">{myProjects.length} items</span>
          </div>

          {showAdd && (
            <div className="annList" style={{ marginTop: 12 }}>
              <div className="annListItem">
                <div className="muted" style={{ marginBottom: 8 }}>Add project</div>
                <input style={inputStyle} value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Title" />
                <textarea
                  style={{ ...inputStyle, height: 90, paddingTop: 10, marginTop: 10 }}
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="Description"
                />
                <input style={{ ...inputStyle, marginTop: 10 }} value={draft.url} onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))} placeholder="Link" />
                <button className="btn-primary" type="button" onClick={add} disabled={!draft.title.trim()} style={{ width: "100%", marginTop: 10 }}>
                  Save
                </button>
              </div>
            </div>
          )}

          <div className="annList" style={{ marginTop: 12 }}>
            {myProjects.length ? (
              myProjects.map((p) => (
                <div className="annListItem" key={p.id}>
                  {editingId === p.id ? (
                    <>
                      <input style={inputStyle} value={editing.title} onChange={(e) => setEditing((d) => ({ ...d, title: e.target.value }))} />
                      <textarea
                        style={{ ...inputStyle, height: 90, paddingTop: 10, marginTop: 10 }}
                        value={editing.description}
                        onChange={(e) => setEditing((d) => ({ ...d, description: e.target.value }))}
                      />
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
                      {p.description?.trim() ? <div className="muted">{p.description}</div> : null}
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
              <div className="muted">No projects yet.</div>
            )}
          </div>
        </div>

        {/* EXPLORE GLOBAL */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <strong>Explore (All Projects)</strong>
            <span className="muted">Search by user name or project title</span>
          </div>

          <input
            style={{ ...inputStyle, marginTop: 12 }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search: user name, title, description..."
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
                </div>

                {p.description?.trim() ? <div className="muted" style={{ marginTop: 6 }}>{p.description}</div> : null}
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
