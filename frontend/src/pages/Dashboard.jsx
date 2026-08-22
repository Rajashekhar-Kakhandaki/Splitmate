import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import AppHeader from "../components/AppHeader.jsx";
import Avatar from "../components/Avatar.jsx";

export default function Dashboard() {
  const [rooms, setRooms] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [roomName, setRoomName] = useState("");
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  async function refreshRooms() {
    const res = await api.get("/rooms");
    const userRooms = res.data.rooms;
    setRooms(userRooms);
    if (userRooms.length > 0) {
      navigate(`/rooms/${userRooms[0].id}`);
    }
  }

  useEffect(() => {
    refreshRooms().catch(() => setError("Couldn't load your rooms."));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      await api.post("/rooms", { roomName });
      setRoomName("");
      await refreshRooms();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't create the room.");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    setError("");
    setJoining(true);
    try {
      await api.post("/rooms/join", { roomCode: joinCode });
      setJoinCode("");
      await refreshRooms();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't join that room.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-dark-bg">
      <AppHeader crumb="Your rooms" />

      <main className="px-6 sm:px-12 py-12 max-w-4xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-ink/50 dark:text-dark-ink-muted">
          Phase 2
        </p>
        <h1 className="font-display text-3xl mt-2 text-ink dark:text-dark-ink">Your rooms</h1>
        <p className="text-ink/60 dark:text-dark-ink-muted mt-2 leading-relaxed">
          Create a room to get a shareable code, or join one a roommate
          already started.
        </p>

        {error && (
          <p className="text-sm text-owe bg-owe/10 border border-owe/30 rounded-lg px-3 py-2 mt-6">
            {error}
          </p>
        )}

        {/* Create + join */}
        <div className="grid sm:grid-cols-2 gap-5 mt-8">
          <form
            onSubmit={handleCreate}
            className="stitched rounded-2xl bg-white/60 dark:bg-dark-card p-5"
          >
            <p className="font-mono text-xs uppercase tracking-wide text-ink/50 dark:text-dark-ink-muted">
              Start a room
            </p>
            <div className="flex gap-2 mt-3">
              <input
                id="create-room-name"
                type="text"
                required
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="DSATM Boys Room"
                className="flex-1 min-w-0 rounded-lg border border-ink/15 dark:border-dark-border bg-white dark:bg-dark-surface text-ink dark:text-dark-ink px-3 py-2 text-sm outline-none focus:border-cover focus:ring-2 focus:ring-cover/20"
              />
              <button
                type="submit"
                disabled={creating}
                className="bg-cover text-paper rounded-lg px-4 py-2 text-sm font-medium hover:bg-cover-light transition-colors disabled:opacity-60"
              >
                {creating ? "…" : "Create"}
              </button>
            </div>
          </form>

          <form
            onSubmit={handleJoin}
            className="stitched rounded-2xl bg-white/60 dark:bg-dark-card p-5"
          >
            <p className="font-mono text-xs uppercase tracking-wide text-ink/50 dark:text-dark-ink-muted">
              Join with a code
            </p>
            <div className="flex gap-2 mt-3">
              <input
                id="join-room-code"
                type="text"
                required
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="A72KD9"
                maxLength={6}
                className="flex-1 min-w-0 rounded-lg border border-ink/15 dark:border-dark-border bg-white dark:bg-dark-surface text-ink dark:text-dark-ink px-3 py-2 text-sm font-mono tracking-widest outline-none focus:border-cover focus:ring-2 focus:ring-cover/20"
              />
              <button
                type="submit"
                disabled={joining}
                className="bg-cover text-paper rounded-lg px-4 py-2 text-sm font-medium hover:bg-cover-light transition-colors disabled:opacity-60"
              >
                {joining ? "…" : "Join"}
              </button>
            </div>
          </form>
        </div>

        {/* Room list */}
        <div className="mt-10">
          {rooms === null && (
            <p className="font-mono text-xs text-ink/40 dark:text-dark-ink-muted">loading rooms…</p>
          )}

          {rooms?.length === 0 && (
            <div className="stitched rounded-2xl p-8 text-center text-ink/50 dark:text-dark-ink-muted dark:bg-dark-card">
              No rooms yet. Create one above, or join with a code a roommate
              shared.
            </div>
          )}

          <div className="space-y-3">
            {rooms?.map((room) => (
              <Link
                key={room.id}
                to={`/rooms/${room.id}`}
                className="flex items-center justify-between rounded-2xl bg-white/60 dark:bg-dark-card hover:bg-white dark:hover:bg-dark-surface transition-colors p-5 border border-ink/10 dark:border-dark-border"
              >
                <div>
                  <p className="font-display text-lg text-ink dark:text-dark-ink">{room.roomName}</p>
                  <p className="font-mono text-xs tracking-widest text-ink/40 dark:text-dark-ink-muted mt-1">
                    {room.roomCode}
                  </p>
                </div>
                <div className="flex -space-x-2">
                  {room.members.slice(0, 5).map((m) => (
                    <Avatar key={m.id} name={m.name} size="sm" />
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
