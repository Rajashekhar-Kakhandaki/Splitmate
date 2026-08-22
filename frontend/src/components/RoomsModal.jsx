import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import Avatar from "./Avatar.jsx";

export default function RoomsModal({ onClose }) {
  const [rooms, setRooms] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [roomName, setRoomName] = useState("");
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  async function refreshRooms() {
    const res = await api.get("/rooms");
    setRooms(res.data.rooms);
  }

  useEffect(() => {
    refreshRooms().catch(() => setError("Couldn't load your rooms."));
    document.body.style.overflow = "hidden";
    
    // Close on escape key
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const res = await api.post("/rooms", { roomName });
      onClose();
      navigate(`/rooms/${res.data.room.id}`);
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
      const res = await api.post("/rooms/join", { roomCode: joinCode });
      onClose();
      navigate(`/rooms/${res.data.room.id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't join that room.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:p-12">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-ink/20 dark:bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      <style>{`
        @keyframes modalEnter {
          from { opacity: 0; transform: scale(0.96) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-enter {
          animation: modalEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        /* Custom scrollbar for webkit to match premium look */
        .premium-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .premium-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .premium-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(150, 150, 150, 0.2);
          border-radius: 20px;
        }
        .premium-scroll:hover::-webkit-scrollbar-thumb {
          background-color: rgba(150, 150, 150, 0.4);
        }
      `}</style>

      {/* Modal Container */}
      <div className="relative w-full max-w-5xl h-[85vh] max-h-[800px] min-h-[500px] flex flex-col md:flex-row bg-paper/95 dark:bg-[#121212]/95 backdrop-blur-3xl rounded-[2rem] shadow-2xl border border-white/40 dark:border-white/10 overflow-hidden animate-modal-enter">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-ink/5 dark:bg-white/10 text-ink/60 dark:text-white/60 hover:bg-ink/10 dark:hover:bg-white/20 hover:text-ink dark:hover:text-white transition-all backdrop-blur-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        {/* Left Column: Room List */}
        <div className="flex-1 flex flex-col p-8 sm:p-14 overflow-y-auto premium-scroll">
          <h2 className="font-display text-4xl sm:text-5xl text-ink dark:text-dark-ink mb-2">Workspaces</h2>
          <p className="text-ink/50 dark:text-dark-ink-muted mb-10 text-sm sm:text-base">Select a room to switch context.</p>

          {error && (
            <p className="text-sm text-owe bg-owe/10 border border-owe/30 rounded-xl px-4 py-3 mb-8">
              {error}
            </p>
          )}

          {rooms === null ? (
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="w-full h-28 bg-ink/5 dark:bg-white/5 rounded-2xl"></div>
              <div className="w-full h-28 bg-ink/5 dark:bg-white/5 rounded-2xl"></div>
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12 px-6 rounded-2xl border-2 border-dashed border-ink/10 dark:border-white/10">
              <p className="text-ink/50 dark:text-dark-ink-muted">No workspaces found. Create or join one to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {rooms.map((room) => (
                <Link
                  key={room.id}
                  to={`/rooms/${room.id}`}
                  onClick={onClose}
                  className="group relative flex items-center justify-between p-6 sm:p-7 rounded-2xl bg-white/40 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-transparent hover:border-ink/10 dark:hover:border-white/10 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <div>
                    <h3 className="font-display text-2xl sm:text-3xl text-ink dark:text-white group-hover:text-cover transition-colors">{room.roomName}</h3>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-md bg-ink/5 dark:bg-black/30 text-ink/60 dark:text-white/50">
                        {room.roomCode}
                      </span>
                      <span className="text-xs text-ink/40 dark:text-white/30">
                        {room.members.length} member{room.members.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex -space-x-3">
                    {room.members.slice(0, 5).map((m) => (
                      <div key={m.id} className="ring-4 ring-paper dark:ring-[#121212] rounded-full transition-all group-hover:ring-white dark:group-hover:ring-[#1a1a1a]">
                        <Avatar name={m.name} size="md" />
                      </div>
                    ))}
                    {room.members.length > 5 && (
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-ink/10 dark:bg-white/10 ring-4 ring-paper dark:ring-[#121212] text-xs font-medium text-ink dark:text-white transition-all group-hover:ring-white dark:group-hover:ring-[#1a1a1a]">
                        +{room.members.length - 5}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Forms */}
        <div className="w-full md:w-[420px] bg-ink/5 dark:bg-black/20 p-8 sm:p-12 border-t md:border-t-0 md:border-l border-ink/10 dark:border-white/10 flex flex-col justify-center overflow-y-auto premium-scroll relative">
          
          <div className="space-y-12">
            {/* Create Room */}
            <div>
              <h3 className="font-display text-2xl text-ink dark:text-white mb-5">Start a new room</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <input
                  type="text"
                  required
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Goa Trip 2026"
                  className="w-full bg-white/50 dark:bg-white/5 border border-ink/10 dark:border-white/10 rounded-xl px-5 py-4 text-ink dark:text-white placeholder:text-ink/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cover/50 transition-all shadow-sm"
                />
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-cover hover:bg-cover-light text-paper font-medium py-4 rounded-xl transition-colors shadow-lg shadow-cover/20 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Workspace"}
                </button>
              </form>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-ink/10 dark:border-white/10"></div></div>
              <div className="relative flex justify-center text-xs uppercase font-mono tracking-widest">
                <span className="bg-[#e8e6df] dark:bg-[#1a1a1a] px-4 text-ink/40 dark:text-white/40 mix-blend-multiply dark:mix-blend-normal">Or</span>
              </div>
            </div>

            {/* Join Room */}
            <div>
              <h3 className="font-display text-2xl text-ink dark:text-white mb-5">Join with a code</h3>
              <form onSubmit={handleJoin} className="space-y-4">
                <input
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="A72KD9"
                  maxLength={6}
                  className="w-full bg-white/50 dark:bg-white/5 border border-ink/10 dark:border-white/10 rounded-xl px-5 py-4 text-ink dark:text-white font-mono tracking-[0.25em] text-lg uppercase placeholder:text-ink/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cover/50 transition-all text-center shadow-sm"
                />
                <button
                  type="submit"
                  disabled={joining}
                  className="w-full bg-ink dark:bg-white hover:bg-ink/80 dark:hover:bg-white/90 text-paper dark:text-ink font-medium py-4 rounded-xl transition-colors shadow-lg shadow-ink/20 dark:shadow-white/10 disabled:opacity-50"
                >
                  {joining ? "Joining..." : "Join Workspace"}
                </button>
              </form>
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}
