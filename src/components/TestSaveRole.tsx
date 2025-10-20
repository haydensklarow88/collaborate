// src/components/TestSaveRole.tsx
import { useState } from "react";
import { saveUserRole } from "../lib/api";

export default function TestSaveRole() {
  const [token, setToken] = useState("");
  const [role, setRole] = useState("pharmacist");
  const [result, setResult] = useState("");

  const handleSave = async () => {
    const data = await saveUserRole(token, role);
    setResult(JSON.stringify(data, null, 2));
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>POST /user (save role)</h2>
      <input
        placeholder="Paste your Cognito ID token here"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />
      <input
        placeholder="Role"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />
      <button onClick={handleSave}>Save Role</button>
      <pre>{result}</pre>
    </div>
  );
}
