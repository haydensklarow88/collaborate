import { useAuth } from "../auth/useAuth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("pharmacy");
  const navigate = useNavigate();

  const doLogin = () => {
    if (!email) return;
    login(email, role);
    navigate("/");
  };

  return (
    <div style={{ maxWidth: 420, margin: "6rem auto", padding: 24, border: "1px solid #eee", borderRadius: 12 }}>
      <h2>Sign in</h2>
      <input
        placeholder="you@pharmacy.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 10, margin: "12px 0" }}
      />
      <div style={{ margin: "8px 0" }}>
        <label style={{ marginRight: 8 }}>Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="pharmacy">Pharmacy</option>
          <option value="prescriber">Prescriber</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <button onClick={doLogin} style={{ padding: "10px 16px" }}>Continue</button>
    </div>
  );
}
