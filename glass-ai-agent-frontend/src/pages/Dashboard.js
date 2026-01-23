import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../components/PageWrapper";
import { StatCard, Card, Button, PageHeader } from "../components/ui";
import api from "../api/api";
import "../styles/design-system.css";

function Dashboard() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const [auditLogs, setAuditLogs] = useState([]);
  const [stats, setStats] = useState({
    totalStock: 0,
    totalTransfers: 0,
    totalStaff: 0,
    totalLogs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [billingMenuOpen, setBillingMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);

        const stockPromise = api.get("/stock/all")
          .then(res => res.data)
          .catch(() => []);

        const staffPromise = role === "ROLE_ADMIN"
          ? api.get("/auth/staff")
            .then(res => res.data)
            .catch(() => [])
          : Promise.resolve([]);

        const auditPromise = role === "ROLE_ADMIN"
          ? api.get("/stock/recent")
            .then(res => res.data)
            .catch(() => [])
          : Promise.resolve([]);

        const transferCountPromise = api.get("/audit/transfer-count")
          .then(res => {
            const count = res.data;
            return typeof count === 'number' ? count : (typeof count === 'string' ? parseInt(count, 10) : 0);
          })
          .catch((error) => {
            if (role === "ROLE_ADMIN") {
              return null;
            }
            return 0;
          });

        const [stockData, staffData, auditData, transferCount] = await Promise.all([
          stockPromise,
          staffPromise,
          auditPromise,
          transferCountPromise,
        ]);

        if (role === "ROLE_ADMIN") {
          setAuditLogs(auditData.slice(0, 3));
        }

        const stockWithQuantity = Array.isArray(stockData) 
          ? stockData.filter(item => item.quantity != null && item.quantity > 0)
          : [];
        const totalStock = stockWithQuantity.length;
        
        const totalStaff = role === "ROLE_ADMIN" && Array.isArray(staffData) ? staffData.length : 0;
        
        let totalTransfers = 0;
        
        if (transferCount !== null && typeof transferCount === 'number') {
          totalTransfers = transferCount;
          
          if (transferCount === 0 && role === "ROLE_ADMIN" && Array.isArray(auditData)) {
            const auditTransferCount = auditData.filter(log => log && log.action === "TRANSFER").length;
            if (auditTransferCount > 0) {
              totalTransfers = auditTransferCount;
            }
          }
        } else {
          if (role === "ROLE_ADMIN" && Array.isArray(auditData)) {
            totalTransfers = auditData.filter(log => log && log.action === "TRANSFER").length;
          }
        }
        
        const totalLogs = role === "ROLE_ADMIN" && Array.isArray(auditData) ? auditData.length : 0;

        setStats({
          totalStock,
          totalTransfers,
          totalStaff,
          totalLogs,
        });
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [role]);

  return (
    <PageWrapper>
      <div style={getContainerStyle(isMobile)}>
        {/* Header Section */}
        <PageHeader
          icon="📊"
          title="Welcome Back! 👋"
          subtitle="Here's what's happening with your inventory today"
          isMobile={isMobile}
          actions={
            role === "ROLE_ADMIN" ? (
              <>
                <Button
                  variant="primary"
                  icon="➕"
                  onClick={() => navigate("/manage-stock")}
                >
                  Add Stock
                </Button>
                <Button
                  variant="outline"
                  icon="📦"
                  onClick={() => navigate("/view-stock")}
                >
                  View Stock
                </Button>
              </>
            ) : null
          }
        />

        {/* Stats Grid */}
        <div style={getStatsGridStyle(isMobile, role)}>
          {role === "ROLE_ADMIN" ? (
            <>
              <StatCard
                icon="📦"
                label="Total Stock Items"
                value={stats.totalStock}
                color="#6366f1"
                loading={loading}
              />
              <StatCard
                icon="🔄"
                label="Stock Transfers"
                value={stats.totalTransfers}
                color="#3b82f6"
                loading={loading}
              />
              <StatCard
                icon="👥"
                label="Staff Members"
                value={stats.totalStaff}
                color="#22c55e"
                loading={loading}
              />
              <StatCard
                icon="📜"
                label="Activity Logs"
                value={stats.totalLogs}
                color="#f59e0b"
                loading={loading}
              />
            </>
          ) : (
            <StatCard
              icon="📦"
              label="Total Stock Items"
              value={stats.totalStock}
              color="#6366f1"
              loading={loading}
            />
          )}
        </div>

        {/* Billing Section - Admin Only */}
        {role === "ROLE_ADMIN" && (
          <div style={billingSection}>
            <Card
              hover
              onClick={() => setBillingMenuOpen(!billingMenuOpen)}
              style={{ cursor: 'pointer' }}
            >
              <div style={billingCardContent}>
                <div style={billingIconWrapper}>
                  <div style={billingIcon}>🧾</div>
                </div>
                <div style={billingInfo}>
                  <h3 style={billingTitle}>Billing Management</h3>
                  <p style={billingSubtitle}>Manage customers, quotations & invoices</p>
                </div>
                <div style={billingArrow}>
                  {billingMenuOpen ? "▲" : "▼"}
                </div>
              </div>
              
              {billingMenuOpen && (
                <div style={billingMenu}>
                  <div
                    style={billingMenuItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/customers");
                      setBillingMenuOpen(false);
                    }}
                  >
                    <span style={menuItemIcon}>👥</span>
                    <div>
                      <div style={menuItemTitle}>Customers</div>
                      <div style={menuItemSubtitle}>Manage customer database</div>
                    </div>
                  </div>
                  <div
                    style={billingMenuItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/quotations");
                      setBillingMenuOpen(false);
                    }}
                  >
                    <span style={menuItemIcon}>📄</span>
                    <div>
                      <div style={menuItemTitle}>Quotations</div>
                      <div style={menuItemSubtitle}>Create & manage quotations</div>
                    </div>
                  </div>
                  <div
                    style={{...billingMenuItem, borderBottom: 'none'}}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/invoices");
                      setBillingMenuOpen(false);
                    }}
                  >
                    <span style={menuItemIcon}>🧾</span>
                    <div>
                      <div style={menuItemTitle}>Invoices</div>
                      <div style={menuItemSubtitle}>Track payments & invoices</div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Recent Activity - Admin Only */}
        {role === "ROLE_ADMIN" && (
          <Card style={{ marginTop: '32px' }}>
            <div style={activityHeader}>
              <div>
                <h3 style={activityTitle}>Recent Stock Activity</h3>
                <p style={activitySubtitle}>Last 3 updates from your team</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/audit")}
              >
                View All →
              </Button>
            </div>

            {loading ? (
              <div style={loadingState}>
                <div style={skeletonItem}></div>
                <div style={skeletonItem}></div>
                <div style={skeletonItem}></div>
              </div>
            ) : auditLogs.length === 0 ? (
              <div style={emptyState}>
                <div style={emptyIcon}>📋</div>
                <p style={emptyText}>No recent activity</p>
                <p style={emptySubtext}>Activity will appear here as your team updates stock</p>
              </div>
            ) : (
              <div style={activityList}>
                {auditLogs.map((log, i) => (
                  <div key={i} style={activityItem}>
                    <div style={activityAvatar}>
                      {log.username?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div style={activityContent}>
                      <div style={activityTop}>
                        <span style={activityUsername}>{log.username || "Unknown"}</span>
                        <span style={getBadgeStyle(log.action)}>
                          {log.action}
                        </span>
                      </div>
                      <div style={activityDetails}>
                        <span style={activityQuantity}>
                          <strong>{log.quantity}</strong> × {log.glassType || "N/A"}
                        </span>
                        {log.standNo && (
                          <span style={activityStand}>Stand #{log.standNo}</span>
                        )}
                      </div>
                      {log.height && log.width && (
                        <div style={activitySize}>
                          Size: {log.height} × {log.width} {log.unit || "MM"}
                        </div>
                      )}
                      <div style={activityMeta}>
                        {log.role} • {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}

export default Dashboard;

/* ================= STYLES ================= */

const getContainerStyle = (isMobile) => ({
  maxWidth: "1400px",
  margin: "0 auto",
  padding: isMobile ? "24px 16px" : "40px 24px",
  width: "100%",
});

const headerSection = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "40px",
  flexWrap: "wrap",
  gap: "24px",
};

const getMainTitleStyle = (isMobile) => ({
  fontSize: isMobile ? "32px" : "48px",
  fontWeight: "800",
  color: "#0f172a",
  margin: "0 0 8px 0",
  lineHeight: "1.2",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
});

const subtitle = {
  fontSize: "18px",
  color: "#64748b",
  margin: "0",
  fontWeight: "400",
};

const quickActions = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const getStatsGridStyle = (isMobile, role) => ({
  display: "grid",
  gridTemplateColumns: isMobile 
    ? "1fr" 
    : role === "ROLE_ADMIN" 
      ? "repeat(auto-fit, minmax(240px, 1fr))" 
      : "1fr",
  gap: "24px",
  marginBottom: "32px",
});

const billingSection = {
  marginBottom: "32px",
};

const billingCardContent = {
  display: "flex",
  alignItems: "center",
  gap: "20px",
};

const billingIconWrapper = {
  flexShrink: 0,
};

const billingIcon = {
  width: "64px",
  height: "64px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "32px",
  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
};

const billingInfo = {
  flex: 1,
};

const billingTitle = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 4px 0",
};

const billingSubtitle = {
  fontSize: "14px",
  color: "#64748b",
  margin: "0",
  fontWeight: "500",
};

const billingArrow = {
  fontSize: "20px",
  color: "#94a3b8",
  transition: "transform 0.2s ease",
};

const billingMenu = {
  marginTop: "20px",
  paddingTop: "20px",
  borderTop: "1px solid #e2e8f0",
  display: "flex",
  flexDirection: "column",
  gap: "0",
};

const billingMenuItem = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "16px",
  borderRadius: "12px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  borderBottom: "1px solid #f1f5f9",
};

const menuItemIcon = {
  fontSize: "24px",
  width: "40px",
  height: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "10px",
  background: "#f8fafc",
  flexShrink: 0,
};

const menuItemTitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#0f172a",
  marginBottom: "2px",
};

const menuItemSubtitle = {
  fontSize: "13px",
  color: "#64748b",
};

const activityHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "24px",
  flexWrap: "wrap",
  gap: "16px",
};

const activityTitle = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 4px 0",
};

const activitySubtitle = {
  fontSize: "14px",
  color: "#64748b",
  margin: "0",
};

const activityList = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const activityItem = {
  display: "flex",
  gap: "16px",
  padding: "20px",
  borderRadius: "12px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  transition: "all 0.2s ease",
};

const activityAvatar = {
  width: "48px",
  height: "48px",
  borderRadius: "12px",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "700",
  color: "white",
  fontSize: "18px",
  flexShrink: 0,
  boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
};

const activityContent = {
  flex: 1,
  fontSize: "14px",
};

const activityTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "8px",
  flexWrap: "wrap",
  gap: "8px",
};

const activityUsername = {
  color: "#0f172a",
  fontWeight: "600",
  fontSize: "15px",
};

const activityDetails = {
  marginTop: "4px",
  color: "#475569",
  fontSize: "14px",
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const activityQuantity = {
  fontWeight: "500",
};

const activityStand = {
  color: "#64748b",
};

const activitySize = {
  fontSize: "13px",
  color: "#64748b",
  marginTop: "6px",
};

const activityMeta = {
  fontSize: "12px",
  color: "#94a3b8",
  marginTop: "8px",
};

const getBadgeStyle = (action) => ({
  padding: "4px 12px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "600",
  color: "white",
  background:
    action === "ADD"
      ? "linear-gradient(135deg, #22c55e, #16a34a)"
      : action === "TRANSFER"
      ? "linear-gradient(135deg, #3b82f6, #2563eb)"
      : "linear-gradient(135deg, #ef4444, #dc2626)",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
});

const emptyState = {
  textAlign: "center",
  padding: "60px 20px",
};

const emptyIcon = {
  fontSize: "64px",
  marginBottom: "16px",
  opacity: 0.3,
};

const emptyText = {
  color: "#475569",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 8px 0",
};

const emptySubtext = {
  color: "#94a3b8",
  fontSize: "14px",
  margin: "0",
};

const loadingState = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const skeletonItem = {
  height: "80px",
  borderRadius: "12px",
  background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite",
};
