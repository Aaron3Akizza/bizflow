import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { AdminProvider } from "./context/AdminContext";

// ── Error boundary — shows the real crash message instead of blank page ───────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "40px", fontFamily: "monospace", background: "#fff1f2", minHeight: "100vh" }}>
          <h2 style={{ color: "#dc2626" }}>BizRise startup error</h2>
          <p style={{ color: "#7f1d1d", marginBottom: "16px" }}>
            Something crashed while loading. Please share this with the developer.
          </p>
          <pre style={{ background: "#fee2e2", padding: "16px", borderRadius: "8px", overflow: "auto", fontSize: "13px", color: "#991b1b" }}>
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: "16px", padding: "8px 16px", background: "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AdminProvider>
          <App />
        </AdminProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
