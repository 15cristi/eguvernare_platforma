import "./Announcements.css";
import { useEffect, useState } from "react";
import {
  acceptConnectionRequest,
  getIncomingConnectionRequests,
  rejectConnectionRequest,
  type ConnectionRequestDto
} from "../api/connections";
import { AvatarBubble } from "../components/ProfileModal";

const joinName = (p: { fromFirstName?: string; fromLastName?: string }) =>
  `${p.fromFirstName || ""} ${p.fromLastName || ""}`.trim();

export default function ConnectionRequests() {
  const [items, setItems] = useState<ConnectionRequestDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await getIncomingConnectionRequests();
      setItems(data || []);
    } catch (e) {
      console.error(e);
      setErr("Could not load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onAccept = async (id: number) => {
    setBusyId(id);
    try {
      await acceptConnectionRequest(id);
      setItems((x) => x.filter((r) => r.id !== id));
      window.dispatchEvent(new Event("connections:requests-updated"));
    } catch (e) {
      console.error(e);
      alert("Could not accept request.");
    } finally {
      setBusyId(null);
    }
  };

  const onReject = async (id: number) => {
    setBusyId(id);
    try {
      await rejectConnectionRequest(id);
      setItems((x) => x.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
      alert("Could not reject request.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="annShell">
      <div className="annPage">
        <div className="annHeader">
          <div>
            <h2>Connection requests</h2>
            <span className="annSub">Accept or reject incoming requests.</span>
          </div>

          <button type="button" className="btn-outline" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {loading ? <div className="muted">Loading…</div> : null}
        {err ? <div className="muted">{err}</div> : null}

        {!loading && !err && items.length === 0 ? <div className="muted">No pending requests.</div> : null}

        {!loading && items.length > 0 ? (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((r) => {
              const name = joinName(r) || "User";
              return (
                <div key={r.id} className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <AvatarBubble name={name} avatarUrl={r.fromAvatarUrl || null} size={44} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{name}</div>
                    <div className="muted">{r.fromRole || " "}</div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => onAccept(r.id)}
                      disabled={busyId === r.id}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => onReject(r.id)}
                      disabled={busyId === r.id}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
