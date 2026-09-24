import { useEffect, useState } from "react";
import "./App.css";

// Vite proxies /api to the local backend in development. Keeping requests
// same-origin also avoids localhost/127.0.0.1 and browser CORS mismatches.
const API_URL = import.meta.env.VITE_API_URL || "/api";

function currentUserId() {
  try {
    const payload = JSON.parse(atob(localStorage.getItem("token").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.user_id;
  } catch {
    return null;
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.detail || data.message || data.error;
    const error = new Error(Array.isArray(detail) ? detail.map((item) => item.msg).join(", ") : detail || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem("token")));
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const login = async () => {
    setMessage("");

    if (!username.trim() || !password) {
      setMessage("Enter your username and password to continue.");
      return;
    }

    setBusy(true);
    try {
      const response = await apiRequest("/login", {
        method: "POST",
        body: JSON.stringify({
        username,
        password,
        }),
      });

      const token = response.access_token;
      if (!token) {
        setMessage(response.message || "We couldn't sign you in. Check your details and try again.");
        return;
      }

      localStorage.setItem("token", token);
      setIsLoggedIn(true);
      setMessage("");
    } catch (error) {
      setMessage(error.message || "Unable to sign in. Check that the server is running.");
    } finally {
      setBusy(false);
    }
  };

  const register = async () => {
    setMessage("");

    if (!username.trim() || !password) {
      setMessage("Enter a username and password to create your account.");
      return;
    }
    if (password.length < 6) {
      setMessage("Choose a password with at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      const response = await apiRequest("/register", {
        method: "POST",
        body: JSON.stringify({
        username,
        password,
        }),
      });

      if (!response.username && !response.message?.toLowerCase().includes("registered successfully")) {
        setMessage(response.message || "We couldn't create your account. Please try again.");
        return;
      }
      setMessage("Account created. You can sign in now.");
      setPassword("");
      setIsRegistering(false);
    } catch (error) {
      setMessage(error.message || "Unable to create your account. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem("token");
      const userId = currentUserId();
      if (!userId) throw new Error("Your session has expired. Please sign in again.");
      const response = await apiRequest(`/notes?user_id=${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes(Array.isArray(response) ? response : response.notes || []);
    } catch (error) {
      if (error.status === 401 || error.message.includes("session has expired")) {
        localStorage.removeItem("token");
        setIsLoggedIn(false);
      }
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchNotes();
    }
  }, [isLoggedIn]);

  const addNote = async () => {
    if (!title.trim() || !content.trim()) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const nextSNo =
        notes.length === 0 ? 1 : Math.max(...notes.map((note) => note.s_no)) + 1;

      await apiRequest("/notes", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          s_no: nextSNo,
          title,
          content,
          user_id: currentUserId(),
        }),
      });

      setTitle("");
      setContent("");
      fetchNotes();
    } catch (error) {
      console.error("Error creating note:", error);
    }
  };

  const deleteNote = async (s_no) => {
    try {
      const token = localStorage.getItem("token");
      await apiRequest(`/notes/${s_no}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
    setNotes([]);
  };

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(search.toLowerCase()) ||
      note.content.toLowerCase().includes(search.toLowerCase())
  );

  if (!isLoggedIn) {
    return (
      <div className="login-page">
        <div className="auth-visual">
          <div className="auth-brand"><span className="brand-mark">✳</span> NoteFlow</div>
          <div className="visual-copy"><span className="eyebrow">A calmer space for your ideas</span><h1>Make room<br />for great thoughts.</h1><p>Keep notes close, find them fast, and give every good idea somewhere to land.</p></div>
          <div className="visual-note"><span>✦ &nbsp; A little reminder</span><p>“Small ideas become big things when you write them down.”</p></div>
          <span className="visual-orb orb-one" /><span className="visual-orb orb-two" />
        </div>
        <div className="auth-panel">
          <div className="auth-form-wrap">
            <div className="mobile-brand"><span className="brand-mark">✳</span> NoteFlow</div>
            <span className="eyebrow">YOUR PERSONAL NOTEBOOK</span>
            <h2>{isRegistering ? "Create your account" : "Welcome back"}</h2>
            <p className="auth-subtitle">{isRegistering ? "Start collecting your thoughts in one place." : "Sign in to pick up where your ideas left off."}</p>
            <form className="auth-form" onSubmit={(event) => { event.preventDefault(); if (isRegistering) register(); else login(); }}>
              <label htmlFor="username">Username</label>
              <input id="username" type="text" autoComplete="username" placeholder="e.g. alexmorgan" value={username} onChange={(e) => setUsername(e.target.value)} required />
              <label htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete={isRegistering ? "new-password" : "current-password"} placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={isRegistering ? 6 : undefined} />
              {message && <p className="auth-message" role="alert">{message}</p>}
              <button className="auth-primary" type="submit" disabled={busy}>{busy ? "Please wait…" : isRegistering ? "Create account" : "Sign in"}<span aria-hidden="true">→</span></button>
            </form>
            <p className="auth-switch">{isRegistering ? "Already have an account?" : "New to NoteFlow?"} <button onClick={() => { setIsRegistering(!isRegistering); setMessage(""); }} type="button">{isRegistering ? "Sign in" : "Create an account"}</button></p>
            <p className="auth-footnote">Your notes, thoughtfully organized.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <span>✦</span> NoteFlow
        </div>

        <nav>
          <button className="nav-item active">📝 All Notes</button>
          <button className="nav-item">📌 Pinned</button>
          <button className="nav-item">🗂️ Subjects</button>
        </nav>

        <div className="sidebar-bottom">
          <p>Personal Notes</p>
          <small>Keep your ideas organized.</small>
          <button onClick={logout}>Logout</button>
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <h1>My Notes</h1>
            <p>Capture your thoughts and ideas.</p>
          </div>

          <div className="search-box">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        <section className="create-note">
          <input
            type="text"
            placeholder="Note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Write something..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button onClick={addNote}> + Add Note </button>
        </section>

        <section className="notes-section">
          <div className="section-header">
            <h2>Your Notes</h2>
            <span>{filteredNotes.length} notes</span>
          </div>

          <div className="notes-grid">
            {filteredNotes.length === 0 ? (
              <div className="empty">
                <div>📝</div>
                <h3>No notes found</h3>
                <p>Create your first note above.</p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div className="note-card" key={note.s_no}>
                  <div className="note-top">
                    <span className="note-number">#{note.s_no}</span>
                    <button
                      className="delete-btn"
                      onClick={() => deleteNote(note.s_no)}
                    >
                      🗑️
                    </button>
                  </div>
                  <h3>{note.title}</h3>
                  <p>{note.content}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
