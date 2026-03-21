import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import Login from "./Login.jsx";

function Root() {
  const [authed, setAuthed] = useState(
    sessionStorage.getItem("kk_auth") === "1"
  );
  if (!authed) return <Login onUnlock={() => setAuthed(true)} />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
