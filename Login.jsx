import { useState } from "react";

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || "koviloor2024";

export default function Login({ onUnlock }) {
  const [pwd, setPwd]   = useState("");
  const [err, setErr]   = useState(false);

  const attempt = () => {
    if (pwd === APP_PASSWORD) {
      sessionStorage.setItem("kk_auth", "1");
      onUnlock();
    } else {
      setErr(true);
      setPwd("");
    }
  };

  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"center",
      height:"100vh", background:"#FEF6E8", fontFamily:"'DM Sans',sans-serif"
    }}>
      <div style={{
        background:"white", borderRadius:16, padding:40, width:320,
        boxShadow:"0 8px 32px rgba(92,42,10,0.12)", textAlign:"center"
      }}>
        <div style={{fontSize:40, marginBottom:8}}>🍛</div>
        <div style={{
          fontFamily:"'Playfair Display',serif", fontSize:22,
          color:"#5C2A0A", fontWeight:700, marginBottom:4
        }}>Koviloor Kitchen</div>
        <div style={{fontSize:12, color:"#9B7355", marginBottom:28}}>
          கோவிலூர் அன்னதானம்
        </div>
        <input
          type="password"
          placeholder="Enter password"
          value={pwd}
          onChange={e => { setPwd(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === "Enter" && attempt()}
          style={{
            width:"100%", padding:"10px 14px", borderRadius:8,
            border: err ? "2px solid #C0392B" : "1.5px solid #DCC88A",
            fontSize:14, color:"#5C2A0A", background:"#FFFBF3",
            outline:"none", boxSizing:"border-box", marginBottom:8
          }}
          autoFocus
        />
        {err && (
          <div style={{color:"#C0392B", fontSize:12, marginBottom:8}}>
            Incorrect password. Try again.
          </div>
        )}
        <button
          onClick={attempt}
          style={{
            width:"100%", padding:"10px 0", borderRadius:8,
            background:"#E8821A", color:"white", border:"none",
            fontSize:14, fontWeight:600, cursor:"pointer"
          }}
        >
          Enter
        </button>
      </div>
    </div>
  );
}
