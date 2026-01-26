import "./Announcements.css";
import { useEffect, useState } from "react";
import { getConnections, type ConnectedProfileDto } from "../api/connections";
import ProfileModal, { AvatarBubble } from "../components/ProfileModal";
import { useNavigate } from "react-router-dom";
import { getOrCreateDirectConversation } from "../api/messages";
import { getProfileByUserId } from "../api/profile";

const joinName = (p: { firstName?: string; lastName?: string }) =>
  `${p.firstName || ""} ${p.lastName || ""}`.trim();

type ModalUser = { id: number; name: string; role: string };

export default function Connections() {
  const nav = useNavigate();

  const [items, setItems] = useState<ConnectedProfileDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Profile modal state (după semnătura ta de ProfileModal)
  const [modalUser, setModalUser] = useState<ModalUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profile, setProfile] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await getConnections();
      setItems(data || []);
    } catch (e) {
      console.error(e);
      setErr("Could not load connections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onMessage = async (userId: number) => {
    try {
      const { conversationId } = await getOrCreateDirectConversation(userId);
      nav(`/messages?c=${conversationId}`);
    } catch (e) {
      console.error(e);
      alert("Could not start conversation.");
    }
  };

  const openProfile = async (userId: number, name: string, role?: string) => {
    setModalUser({ id: userId, name, role: role || "" });

    setProfile(null);
    setProfileError("");
    setProfileLoading(true);

    try {
      const data = await getProfileByUserId(userId);
      setProfile(data);
    } catch (e) {
      console.error(e);
      setProfileError("Could not load profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfile = () => {
    setModalUser(null);
    setProfile(null);
    setProfileError("");
    setProfileLoading(false);
  };

  return (
    <div className="annShell">
      <div className="annPage">
        <div className="annHeader">
          <div>
            <h2>Connections</h2>
            <span className="annSub">People you are connected with.</span>
          </div>

          <button type="button" className="btn-outline" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {loading ? <div className="muted">Loading…</div> : null}
        {err ? <div className="muted">{err}</div> : null}

        {!loading && !err && items.length === 0 ? <div className="muted">No connections yet.</div> : null}

        {!loading && items.length > 0 ? (
          <div className="matchGrid" style={{ marginTop: 10 }}>
            {items.map((p) => {
              const name = joinName(p) || "User";
              return (
                <div key={p.userId} className="card matchCard">
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <AvatarBubble name={name} avatarUrl={p.avatarUrl || null} size={44} />
                    <div style={{ minWidth: 0 }}>
                      <div className="matchName">{name}</div>
                      <div className="muted matchSub">{p.role || " "}</div>
                    </div>
                  </div>

                  <div className="matchHeadline" style={{ marginTop: 10 }}>
                    {p.headline?.trim() ? p.headline : " "}
                  </div>

                  <div className="matchFooter" style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => openProfile(p.userId, name, p.role)}
                    >
                      View profile
                    </button>

                    <button type="button" className="btn-primary" onClick={() => onMessage(p.userId)}>
                      Message
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Modalul: îl redăm mereu, iar el decide afișarea pe baza user != null */}
        <ProfileModal
          user={modalUser}
          loading={profileLoading}
          error={profileError}
          profile={profile}
          onClose={closeProfile}
          onMessage={onMessage}
        />
      </div>
    </div>
  );
}
