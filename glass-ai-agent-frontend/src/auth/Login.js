import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { Button, Input, Card } from "../components/ui";
import "../styles/design-system.css";

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) {
      setError("");
    }
  };

  const handleLogin = async e => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const res = await api.post("/auth/login", form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      navigate("/dashboard");
    } catch (err) {
      let errorMessage = "Invalid username or password";
      
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.error && typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.message && typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        }
      } else if (err.message && typeof err.message === 'string') {
        errorMessage = err.message;
      }
      
      if (typeof errorMessage !== 'string') {
        errorMessage = "Invalid username or password";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={authContainer}>
      {/* Animated Background Elements */}
      <div style={bgCircle1}></div>
      <div style={bgCircle2}></div>
      <div style={bgCircle3}></div>
      
      {/* Main Content */}
      <div style={contentWrapper}>
        {/* Left Side - Branding (Desktop Only) */}
        {!isMobile && (
          <div style={brandingSection}>
            <div style={brandingContent}>
              <div style={logoLarge}>🧱</div>
              <h1 style={brandTitle}>Glass Shop</h1>
              <p style={brandSubtitle}>
                Smart Inventory Management System
              </p>
              <div style={featuresList}>
                <div style={featureItem}>
                  <span style={featureIcon}>✓</span>
                  <span>Real-time Stock Tracking</span>
                </div>
                <div style={featureItem}>
                  <span style={featureIcon}>✓</span>
                  <span>AI-Powered Insights</span>
                </div>
                <div style={featureItem}>
                  <span style={featureIcon}>✓</span>
                  <span>Easy Billing Management</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Side - Login Form */}
        <div style={formSection}>
          <Card style={loginCard} glass>
            {/* Mobile Logo */}
            {isMobile && (
              <div style={mobileLogoSection}>
                <div style={mobileLogo}>🧱</div>
                <h1 style={mobileTitle}>Glass Shop</h1>
              </div>
            )}

            <div style={formHeader}>
              <h2 style={formTitle}>Welcome Back</h2>
              <p style={formSubtitle}>Sign in to continue to your dashboard</p>
            </div>

            <form onSubmit={handleLogin} style={form}>
              <Input
                name="username"
                label="Username"
                placeholder="Enter your username"
                value={form.username}
                onChange={handleChange}
                required
                icon="👤"
                iconPosition="left"
                autoComplete="username"
              />

              <Input
                type="password"
                name="password"
                label="Password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
                icon="🔒"
                iconPosition="left"
                autoComplete="current-password"
              />

              {error && (
                <div style={errorCard} role="alert">
                  <span style={errorIcon}>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
                style={{ marginTop: '8px' }}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div style={footerSection}>
              <p style={footerText}>
                Don't have an account?{" "}
                <span 
                  style={footerLink} 
                  onClick={() => navigate("/register")}
                >
                  Create one now
                </span>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Login;

/* ================= STYLES ================= */

const authContainer = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  padding: "20px",
  position: "relative",
  overflow: "hidden",
};

const bgCircle1 = {
  position: "absolute",
  top: "-10%",
  right: "-10%",
  width: "600px",
  height: "600px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
  animation: "pulse 8s ease-in-out infinite",
};

const bgCircle2 = {
  position: "absolute",
  bottom: "-15%",
  left: "-15%",
  width: "500px",
  height: "500px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
  animation: "pulse 10s ease-in-out infinite",
};

const bgCircle3 = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "400px",
  height: "400px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
  animation: "pulse 12s ease-in-out infinite",
};

const contentWrapper = {
  display: "flex",
  width: "100%",
  maxWidth: "1200px",
  gap: "40px",
  alignItems: "center",
  position: "relative",
  zIndex: 1,
  flexWrap: "wrap",
};

const brandingSection = {
  flex: 1,
  minWidth: "400px",
  color: "white",
  padding: "40px",
};

const brandingContent = {
  maxWidth: "500px",
};

const logoLarge = {
  fontSize: "80px",
  marginBottom: "24px",
  display: "block",
  animation: "bounce 2s ease-in-out infinite",
};

const brandTitle = {
  fontSize: "56px",
  fontWeight: "800",
  margin: "0 0 16px 0",
  lineHeight: "1.2",
  textShadow: "0 2px 10px rgba(0,0,0,0.2)",
};

const brandSubtitle = {
  fontSize: "20px",
  margin: "0 0 40px 0",
  opacity: 0.95,
  fontWeight: "400",
};

const featuresList = {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const featureItem = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  fontSize: "18px",
  fontWeight: "500",
};

const featureIcon = {
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  background: "rgba(255,255,255,0.2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  fontWeight: "700",
  flexShrink: 0,
};

const formSection = {
  flex: 1,
  minWidth: "400px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const loginCard = {
  width: "100%",
  maxWidth: "480px",
  padding: "48px",
  animation: "fadeIn 0.5s ease-out",
};

const mobileLogoSection = {
  textAlign: "center",
  marginBottom: "32px",
  paddingBottom: "32px",
  borderBottom: "1px solid #e2e8f0",
};

const mobileLogo = {
  fontSize: "64px",
  marginBottom: "16px",
  display: "block",
};

const mobileTitle = {
  fontSize: "32px",
  fontWeight: "800",
  margin: "0",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

const formHeader = {
  marginBottom: "32px",
  textAlign: "center",
};

const formTitle = {
  fontSize: "32px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 8px 0",
};

const formSubtitle = {
  fontSize: "16px",
  color: "#64748b",
  margin: "0",
  fontWeight: "400",
};

const form = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
};

const errorCard = {
  padding: "16px",
  borderRadius: "12px",
  background: "rgba(239, 68, 68, 0.1)",
  border: "1.5px solid rgba(239, 68, 68, 0.2)",
  color: "#dc2626",
  fontSize: "14px",
  fontWeight: "500",
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const errorIcon = {
  fontSize: "20px",
  flexShrink: 0,
};

const footerSection = {
  marginTop: "32px",
  paddingTop: "24px",
  borderTop: "1px solid #e2e8f0",
  textAlign: "center",
};

const footerText = {
  margin: "0",
  fontSize: "14px",
  color: "#64748b",
  fontWeight: "400",
};

const footerLink = {
  color: "#667eea",
  cursor: "pointer",
  fontWeight: "600",
  textDecoration: "none",
  transition: "color 0.2s ease",
};
