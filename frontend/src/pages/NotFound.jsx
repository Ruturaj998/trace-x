import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import tracexLogo from "../assets/tracex-logo.png";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="login-page">
      <div className="login-card" style={{ textAlign: "center", maxWidth: "440px" }}>
        <img
          src={tracexLogo}
          alt="TRACE-X logo"
          className="brand-logo login-logo"
          style={{ margin: "0 auto 16px" }}
        />

        <span className="login-label">PAGE NOT FOUND / 404</span>

        <h1>Signal Lost</h1>

        <p>
          The requested coordinate or security route does not exist in TRACE-X Command Center.
        </p>

        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginTop: "16px",
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={16} />
          RETURN TO COMMAND CENTER
        </button>
      </div>
    </div>
  );
}
