import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import PageWrapper from "../components/PageWrapper";
import { StatCard, Card, Button } from "../components/ui";
import api from "../api/api";
import { useResponsive } from "../hooks/useResponsive";
import "../styles/design-system.css";

function Dashboard() {
  const navigate = useNavigate();
  const role = sessionStorage.getItem("role");
  const [auditLogs, setAuditLogs] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [stats, setStats] = useState({
    totalStock: 0,
    totalTransfers: 0,
    totalStaff: 0,
    totalLogs: 0,
    lowStock: 0,
    totalQuantity: 0,
  });
  const [loading, setLoading] = useState(true);
  const [billingMenuOpen, setBillingMenuOpen] = useState(false);
  const { isMobile } = useResponsive(); // Use responsive hook

  // Removed manual resize handler - useResponsive hook handles it

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Check if user is logged in
        const token = sessionStorage.getItem("token");
        if (!token) {
          console.warn("No authentication token found. Please log in.");
          setLoading(false);
          return;
        }

        setLoading(true);

        const stockPromise = api.get("/api/stock/all")
          .then(res => res.data)
          .catch((error) => {
            console.error("Error fetching stock:", error.response?.status, error.response?.data);
            return [];
          });

        const staffPromise = role === "ROLE_ADMIN"
          ? api.get("/api/auth/staff")
            .then(res => res.data)
            .catch((error) => {
              console.error("Error fetching staff:", error.response?.status, error.response?.data);
              return [];
            })
          : Promise.resolve([]);

        const auditPromise = role === "ROLE_ADMIN"
          ? api.get("/api/audit/recent")
            .then(res => res.data)
            .catch((error) => {
              console.error("Error fetching audit logs:", error.response?.status, error.response?.data);
              return [];
            })
          : Promise.resolve([]);

        const transferCountPromise = api.get("/api/audit/transfer-count")
          .then(res => {
            // Backend returns { count: number }
            const data = res.data;
            if (typeof data === 'object' && data !== null && 'count' in data) {
              return typeof data.count === 'number' ? data.count : parseInt(data.count, 10) || 0;
            }
            return typeof data === 'number' ? data : (typeof data === 'string' ? parseInt(data, 10) : 0);
          })
          .catch((error) => {
            console.error('Error fetching transfer count:', error);
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
        
        // Calculate stock statistics
        const lowStockItems = stockWithQuantity.filter(item => 
          item.quantity < (item.minQuantity || 10)
        );
        const lowStock = lowStockItems.length;
        
        const totalQuantity = stockWithQuantity.reduce((sum, item) => 
          sum + (parseInt(item.quantity) || 0), 0
        );
        
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

        setStockData(stockWithQuantity);
        setStats({
          totalStock,
          totalTransfers,
          totalStaff,
          totalLogs,
          lowStock,
          totalQuantity,
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
        <div style={headerSection}>
          <div>
            <h1 style={getMainTitleStyle(isMobile)}>
              Welcome Back! 👋
            </h1>
            <p style={subtitle}>
              Here's what's happening with your inventory today
            </p>
          </div>
          
          {role === "ROLE_ADMIN" && (
            <div style={quickActions}>
              <Button
                variant="primary"
                icon="➕"
                onClick={() => navigate("/manage-stock")}
                fullWidth={isMobile} // Full width on mobile
              >
                Add Stock
              </Button>
              <Button
                variant="outline"
                icon="📊"
                onClick={() => navigate("/view-stock")}
                fullWidth={isMobile} // Full width on mobile
              >
                View Stock
              </Button>
            </div>
          )}
        </div>

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
                icon="⚠️"
                label="Low Stock"
                value={stats.lowStock}
                color={stats.lowStock > 0 ? "#ef4444" : "#22c55e"}
                loading={loading}
              />
              <StatCard
                icon="🔢"
                label="Total Quantity"
                value={stats.totalQuantity}
                color="#3b82f6"
                loading={loading}
              />
              <StatCard
                icon="🔄"
                label="Stock Transfers"
                value={stats.totalTransfers}
                color="#8b5cf6"
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
            <>
              <StatCard
                icon="📦"
                label="Total Stock Items"
                value={stats.totalStock}
                color="#6366f1"
                loading={loading}
              />
              <StatCard
                icon="⚠️"
                label="Low Stock"
                value={stats.lowStock}
                color={stats.lowStock > 0 ? "#ef4444" : "#22c55e"}
                loading={loading}
              />
              <StatCard
                icon="🔢"
                label="Total Quantity"
                value={stats.totalQuantity}
                color="#3b82f6"
                loading={loading}
              />
            </>
          )}
        </div>

        {/* Stock Overview Section */}
        <Card style={{ marginTop: isMobile ? "24px" : "32px" }}>
          <div style={activityHeader}>
            <div>
              <h3 style={activityTitle}>📊 Stock Overview</h3>
              <p style={activitySubtitle}>Current inventory status and low stock alerts</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/view-stock")}
            >
              View All →
            </Button>
          </div>

          {loading ? (
            <div style={loadingState}>
              <div style={skeletonItem}></div>
              <div style={skeletonItem}></div>
            </div>
          ) : stockData.length === 0 ? (
            <div style={emptyState}>
              <div style={emptyIcon}>📦</div>
              <p style={emptyText}>No stock available</p>
              <p style={emptySubtext}>Add stock to get started</p>
            </div>
          ) : (
            <>
              {/* Stock Overview - Simple Visual */}
              <div style={stockOverviewContainer}>
                {/* Stock by Glass Type - Pie Chart */}
                <div style={chartSection}>
                  <h4 style={chartTitle}>📊 Stock by Glass Type</h4>
                  {(() => {
                    const typeData = Object.entries(
                      stockData.reduce((acc, item) => {
                        const type = item.glass?.type || "Unknown";
                        if (!acc[type]) {
                          acc[type] = { count: 0, quantity: 0 };
                        }
                        acc[type].count += 1;
                        acc[type].quantity += parseInt(item.quantity) || 0;
                        return acc;
                      }, {})
                    )
                      .sort((a, b) => b[1].quantity - a[1].quantity)
                      .slice(0, 8)
                      .map(([type, data]) => ({
                        name: type,
                        value: data.quantity,
                        count: data.count
                      }));
                    
                    const colors = ["#6366f1", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
                    
                    const CustomTooltip = ({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{
                            backgroundColor: "white",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                          }}>
                            <p style={{ margin: 0, fontWeight: "600", color: "#0f172a" }}>
                              {payload[0].name}
                            </p>
                            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#64748b" }}>
                              Quantity: {payload[0].value.toLocaleString()}
                            </p>
                            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>
                              Items: {payload[0].payload.count}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    };
                    
                    return (
                      <div style={pieChartWrapper}>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={typeData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={isMobile ? 80 : 100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {typeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}
                </div>

                {/* Low Stock Items - Simple List */}
                {stats.lowStock > 0 && (
                  <div style={lowStockSection}>
                    <h4 style={lowStockTitle}>⚠️ Low Stock Items ({stats.lowStock})</h4>
                    <div style={lowStockList}>
                      {stockData
                        .filter(item => item.quantity < (item.minQuantity || 10))
                        .slice(0, 5)
                        .map((item, i) => (
                          <div key={i} style={lowStockItem}>
                            <div style={lowStockItemContent}>
                              <div style={lowStockItemName}>
                                {item.glass?.type || "N/A"} - {item.glass?.thickness || "N/A"}{item.glass?.unit || "MM"}
                              </div>
                              <div style={lowStockItemDetails}>
                                Stand #{item.standNo} • {item.height} × {item.width} {item.glass?.unit || "MM"}
                              </div>
                            </div>
                            <div style={lowStockQuantity}>
                              {item.quantity} / {item.minQuantity || 10}
                            </div>
                          </div>
                        ))}
                    </div>
                    {stats.lowStock > 5 && (
                      <p style={lowStockMore}>
                        +{stats.lowStock - 5} more. <a href="/view-stock" style={{color: "#6366f1", textDecoration: "none"}}>View all →</a>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </Card>

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

// Mobile-first container with responsive padding
const getContainerStyle = (isMobile) => ({
  maxWidth: "1400px",
  margin: "0 auto",
  padding: isMobile ? "16px 12px" : "40px 24px", // Tighter padding on mobile
  width: "100%",
  boxSizing: "border-box",
  overflowX: "hidden", // Prevent horizontal scroll
});

// Responsive header - stacks on mobile
const headerSection = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "32px", // Reduced on mobile
  flexWrap: "wrap",
  gap: "16px", // Smaller gap on mobile
  flexDirection: "column", // Stack on mobile by default
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

// Responsive subtitle
const subtitle = {
  fontSize: "clamp(14px, 4vw, 18px)", // Fluid typography
  color: "#64748b",
  margin: "0",
  fontWeight: "400",
  lineHeight: "1.5",
};

// Full-width buttons on mobile for better touch targets
const quickActions = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  width: "100%", // Full width on mobile
};

// Mobile-first responsive grid
const getStatsGridStyle = (isMobile, role) => ({
  display: "grid",
  gridTemplateColumns: isMobile 
    ? "1fr" // Single column on mobile
    : role === "ROLE_ADMIN" 
      ? "repeat(auto-fit, minmax(200px, 1fr))" // Auto-fit on larger screens for 6 cards
      : "repeat(auto-fit, minmax(200px, 1fr))", // 3 cards for staff
  gap: isMobile ? "16px" : "20px", // Smaller gap on mobile
  marginBottom: isMobile ? "24px" : "32px",
});

const billingSection = {
  marginBottom: "32px",
};

// Responsive billing card - stacks on mobile
const billingCardContent = {
  display: "flex",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap", // Allow wrapping on small screens
};

const billingIconWrapper = {
  flexShrink: 0,
};

// Responsive billing icon
const billingIcon = {
  width: "clamp(48px, 12vw, 64px)", // Scales with viewport
  height: "clamp(48px, 12vw, 64px)",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "clamp(24px, 6vw, 32px)", // Responsive font size
  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
  flexShrink: 0, // Prevent shrinking
};

const billingInfo = {
  flex: 1,
};

// Responsive billing title
const billingTitle = {
  fontSize: "clamp(18px, 5vw, 24px)", // Fluid typography
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

// Stock Overview Styles
const stockOverviewContainer = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
};

const chartSection = {
  padding: "20px",
  borderRadius: "12px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const chartTitle = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 20px 0",
};

const pieChartWrapper = {
  width: "100%",
  marginTop: "16px",
};

const lowStockSection = {
  marginTop: "24px",
  padding: "20px",
  borderRadius: "12px",
  background: "#fef2f2",
  border: "1px solid #fecaca",
};

const lowStockTitle = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#991b1b",
  margin: "0 0 16px 0",
};

const lowStockList = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const lowStockItem = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  borderRadius: "8px",
  background: "white",
  border: "1px solid #fecaca",
};

const lowStockItemContent = {
  flex: 1,
};

const lowStockItemName = {
  fontSize: "15px",
  fontWeight: "600",
  color: "#0f172a",
  marginBottom: "4px",
};

const lowStockItemDetails = {
  fontSize: "13px",
  color: "#64748b",
};

const lowStockQuantity = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#ef4444",
  textAlign: "right",
};

const lowStockMore = {
  marginTop: "12px",
  fontSize: "14px",
  color: "#64748b",
  textAlign: "center",
};

