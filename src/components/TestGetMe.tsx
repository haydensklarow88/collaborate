// src/components/TestGetMe.tsx
import { useState } from "react";
import { getUserProfile } from "../lib/api";

export default function TestGetMe() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState("");

  const handleGet = async () => {
    const data = await getUserProfile(token);
    setResult(JSON.stringify(data, null, 2));
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>GET /user (get profile)</h2>
      <input
        placeholder="Paste your Cognito ID token here"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />
      <button onClick={handleGet}>Get Profile</button>
      <pre>{result}</pre>
    </div>
  );
}
