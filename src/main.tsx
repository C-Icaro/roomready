import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import "./styles.css";

const url = import.meta.env.VITE_CONVEX_URL;
const root = ReactDOM.createRoot(document.getElementById("root")!);
if (!url) {
  root.render(
    <main className="connection-screen">
      <h1>RoomReady</h1>
      <p>The home service is not connected yet.</p>
      <p>Configure VITE_CONVEX_URL to open your move planner.</p>
    </main>,
  );
} else {
  const convex = new ConvexReactClient(url);
  root.render(
    <React.StrictMode>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </React.StrictMode>,
  );
}
