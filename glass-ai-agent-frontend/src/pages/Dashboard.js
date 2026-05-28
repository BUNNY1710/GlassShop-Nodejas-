import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import PageWrapper from "../components/PageWrapper";
import { StatCard, Card, Button, PageHeader, Badge, actionBadgeVariant, EmptyState } from "../components/ui";
import { dashboard as copy } from "../design/copy";
import { displayName, formatAuditAction } from "../design/format";
import { type } from "../design/typography";
import { cn } from "../lib/utils";
import api from "../api/api";
import { useResponsive } from "../hooks/useResponsive";
import { motion } from "framer-motion";
import { fadeUp } from "../design/motion";
import {
  Package, AlertTriangle, Layers, ArrowRightLeft,
  Users, ScrollText, Plus, Eye, Receipt, FileText, ChevronRight,
  TrendingUp, BarChart3, Activity
} from "lucide-react";

const CHART_COLORS = [
  "#0ea5e9", "#0284c7", "#14b8a6", "#22c55e",
  "#f59e0b", "#f43f5e", "#8b5cf6", "#6366f1"
];

function QuickActionCard({ icon: Icon, label, description, onClick, accent = "sky" }) {
  const colors = {
    sky:     "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 border-sky-100 dark:border-sky-800/40",
    green:   "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40",
    orange:  "bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400 border-orange-100 dark:border-orange-800/40",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-xl text-left",
        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800",
        "shadow-card hover:shadow-card-hover hover:-translate-y-0.5",
        "transition-all duration-200 focus-ring group"
      )}
    >
      <div className={cn("h-10 w-10 rounded-lg border flex items-center justify-center shrink-0", colors[accent])}>
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(type.h4, "text-sm truncate")}>{label}</p>
        <p className={cn(type.caption, "truncate mt-0.5")}>{description}</p>
      </div>
      <ChevronRight size={16} className="text-slate-400 dark:text-slate-600 shrink-0 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors" />
    </button>
  );
}

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-dropdown">
        <p className={cn(type.h4, "text-sm mb-1")}>{payload[0].name}</p>
        <p className={type.bodySm}>
          <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
            {payload[0].value.toLocaleString()}
          </span>{" "}
          units
        </p>
        <p className={cn(type.caption, "mt-0.5")}>
          {payload[0].payload.count} line items
        </p>
      </div>
    );
  }
  return null;
}

function Dashboard() {
  const navigate = useNavigate();
  const role = sessionStorage.getItem("role");
  const [auditLogs, setAuditLogs] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [stats, setStats] = useState({
    totalStock: 0, totalTransfers: 0, totalStaff: 0,
    totalLogs: 0, lowStock: 0, totalQuantity: 0,
  });
  const [loading, setLoading] = useState(true);
  const { isMobile } = useResponsive();

  useEffect(() => {
    const load = async () => {
      try {
        const token = sessionStorage.getItem("token");
        if (!token) { setLoading(false); return; }
        setLoading(true);

        const [stockData, staffData, auditData, transferCount] = await Promise.all([
          api.get("/api/stock/all").then(r => r.data).catch(() => []),
          role === "ROLE_ADMIN"
            ? api.get("/api/auth/staff").then(r => r.data).catch(() => [])
            : Promise.resolve([]),
          role === "ROLE_ADMIN"
            ? api.get("/api/audit/recent").then(r => r.data).catch(() => [])
            : Promise.resolve([]),
          api.get("/api/audit/transfer-count").then(r => {
            const d = r.data;
            if (typeof d === 'object' && d !== null && 'count' in d)
              return typeof d.count === 'number' ? d.count : parseInt(d.count, 10) || 0;
            return typeof d === 'number' ? d : (typeof d === 'string' ? parseInt(d, 10) : 0);
          }).catch(() => 0),
        ]);

        if (role === "ROLE_ADMIN") setAuditLogs((auditData || []).slice(0, 5));

        const valid = Array.isArray(stockData) ? stockData.filter(i => i.quantity != null && i.quantity > 0) : [];
        const lowStock = valid.filter(i => i.quantity < (i.minQuantity || 10)).length;
        const totalQuantity = valid.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0);

        setStockData(valid);
        setStats({
          totalStock: valid.length,
          totalTransfers: transferCount || 0,
          totalStaff: role === "ROLE_ADMIN" && Array.isArray(staffData) ? staffData.length : 0,
          totalLogs: role === "ROLE_ADMIN" && Array.isArray(auditData) ? auditData.length : 0,
          lowStock,
          totalQuantity,
        });
      } catch (e) {
        console.error("Dashboard load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [role]);

  const username = displayName(sessionStorage.getItem("username"));

  const pieData = stockData
    .reduce((acc, item) => {
      const key = item.glass?.type || "Unknown";
      if (!acc[key]) acc[key] = { count: 0, quantity: 0 };
      acc[key].count += 1;
      acc[key].quantity += parseInt(item.quantity) || 0;
      return acc;
    }, {});

  const chartData = Object.entries(pieData)
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 8)
    .map(([name, data]) => ({ name, value: data.quantity, count: data.count }));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } }
  };

  return (
    <PageWrapper>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

        {/* ── Page Header ── */}
        <motion.div variants={fadeUp}>
          <PageHeader
            eyebrow={copy.eyebrow}
            title={copy.greeting(username)}
            description={copy.description}
            icon={<BarChart3 size={22} />}
            badge={
              <span className="badge-premium hidden sm:inline-flex gap-1.5">
                <Activity size={11} aria-hidden /> {copy.liveBadge}
              </span>
            }
            actions={
              role === "ROLE_ADMIN" ? (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus size={15} />}
                    onClick={() => navigate("/manage-stock")}
                    fullWidth={isMobile}
                  >
                    {copy.actions.addStock}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Eye size={15} />}
                    onClick={() => navigate("/view-stock")}
                    fullWidth={isMobile}
                  >
                    {copy.actions.viewStock}
                  </Button>
                </>
              ) : null
            }
          />
        </motion.div>

        {/* ── KPI Metrics ── */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard delay={0}    icon={<Package size={18} />}       label={copy.metrics.totalStock}   value={stats.totalStock}   loading={loading} />
          <StatCard delay={0.04} icon={<AlertTriangle size={18} />} label={copy.metrics.lowStock}     value={stats.lowStock}     accent={stats.lowStock > 0 ? "danger" : "primary"} loading={loading} />
          <StatCard delay={0.08} icon={<Layers size={18} />}        label={copy.metrics.totalQuantity} value={stats.totalQuantity} accent="success" loading={loading} />
          {role === "ROLE_ADMIN" && (
            <>
              <StatCard delay={0.12} icon={<ArrowRightLeft size={18} />} label={copy.metrics.transfers} value={stats.totalTransfers} loading={loading} />
              <StatCard delay={0.16} icon={<Users size={18} />}           label={copy.metrics.staff}     value={stats.totalStaff}     loading={loading} />
              <StatCard delay={0.20} icon={<ScrollText size={18} />}      label={copy.metrics.activity}  value={stats.totalLogs}      loading={loading} />
            </>
          )}
        </motion.div>

        {/* ── Main Content Grid ── */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Stock Distribution Chart */}
          <Card padding="none" className="lg:col-span-3 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-0">
              <div>
                <h3 className={type.h3}>{copy.stockOverview.title}</h3>
                <p className={cn(type.bodySm, 'mt-0.5')}>{copy.stockOverview.description}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/view-stock")}>
                {copy.stockOverview.viewAll}
              </Button>
            </div>

            {loading ? (
              <div className="px-6 pb-6 mt-6 space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="skeleton h-12 rounded-lg" />)}
              </div>
            ) : chartData.length === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState
                  icon={<Package size={24} />}
                  title={copy.stockOverview.emptyTitle}
                  description={copy.stockOverview.emptyDescription}
                  onAction={() => navigate("/manage-stock")}
                  actionLabel={copy.actions.addStock}
                />
              </div>
            ) : (
              <div className="px-6 pb-6">
                {/* Chart */}
                <div className="mt-4 h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={isMobile ? 45 : 55}
                        outerRadius={isMobile ? 75 : 88}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            className="outline-none"
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {chartData.slice(0, 6).map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2 min-w-0">
                      <div
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className={cn(type.caption, 'truncate')}>{item.name}</span>
                      <span className={cn(type.caption, 'ml-auto tabular-nums font-medium text-slate-700 dark:text-slate-300')}>
                        {item.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Quick Actions / Low Stock */}
          <div className="lg:col-span-2 space-y-4">
            {/* Quick Actions */}
            {role === "ROLE_ADMIN" && (
              <Card padding="none">
                <div className="px-5 pt-5 pb-3">
                  <h3 className={type.h3}>Quick Actions</h3>
                </div>
                <div className="px-4 pb-4 space-y-2">
                  <QuickActionCard
                    icon={Users}
                    label={copy.billing.customers.title}
                    description={copy.billing.customers.description}
                    onClick={() => navigate("/customers")}
                    accent="sky"
                  />
                  <QuickActionCard
                    icon={FileText}
                    label={copy.billing.quotations.title}
                    description={copy.billing.quotations.description}
                    onClick={() => navigate("/quotations")}
                    accent="green"
                  />
                  <QuickActionCard
                    icon={Receipt}
                    label={copy.billing.invoices.title}
                    description={copy.billing.invoices.description}
                    onClick={() => navigate("/invoices")}
                    accent="orange"
                  />
                </div>
              </Card>
            )}

            {/* Low Stock Alert */}
            {stats.lowStock > 0 && !loading && (
              <Card padding="none" className="border-red-200 dark:border-red-900/50">
                <div className="flex items-center justify-between px-5 pt-4 pb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-500" />
                    <h3 className={cn(type.h3, 'text-sm text-red-700 dark:text-red-400')}>
                      Low Stock ({stats.lowStock})
                    </h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/view-stock")} className="text-xs">
                    View all
                  </Button>
                </div>
                <div className="px-4 pb-4 space-y-1.5">
                  {stockData
                    .filter(item => item.quantity < (item.minQuantity || 10))
                    .slice(0, 4)
                    .map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-red-50 dark:bg-red-950/25 border border-red-100 dark:border-red-900/30">
                        <div className="min-w-0">
                          <p className={cn(type.tableCellStrong, 'text-xs truncate')}>
                            {item.glass?.type || "—"} · {item.glass?.thickness || "—"} mm
                          </p>
                          <p className={cn(type.caption, 'mt-0.5')}>
                            Rack {item.standNo}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <span className="text-sm font-semibold text-red-700 dark:text-red-300 tabular-nums">
                            {item.quantity}
                          </span>
                          <span className={cn(type.caption, 'ml-1')}>/ {item.minQuantity || 10}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            )}
          </div>
        </motion.div>

        {/* ── Recent Activity (Admin Only) ── */}
        {role === "ROLE_ADMIN" && (
          <motion.div variants={fadeUp}>
            <Card padding="none">
              <div className="flex items-center justify-between px-6 pt-5 pb-0">
                <div>
                  <h3 className={type.h3}>{copy.activity.title}</h3>
                  <p className={cn(type.bodySm, 'mt-0.5')}>{copy.activity.description}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/audit")}>
                  {copy.activity.viewAll}
                </Button>
              </div>

              {loading ? (
                <div className="px-6 pb-6 mt-4 space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="px-6 pb-6">
                  <EmptyState
                    icon={<ScrollText size={22} />}
                    title={copy.activity.emptyTitle}
                    description={copy.activity.emptyDescription}
                  />
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className={type.tableHead}>User</th>
                        <th className={type.tableHead}>Action</th>
                        <th className={type.tableHead}>Glass Type</th>
                        <th className={type.tableHead}>Qty</th>
                        <th className={type.tableHead}>Rack</th>
                        <th className={type.tableHead}>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log, i) => (
                        <tr key={i}>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 flex items-center justify-center font-semibold text-xs border border-sky-100 dark:border-sky-800/40 shrink-0">
                                {log.username?.charAt(0).toUpperCase() || "U"}
                              </div>
                              <span className={type.tableCellStrong}>{log.username || "—"}</span>
                            </div>
                          </td>
                          <td>
                            <Badge variant={actionBadgeVariant(log.action)}>
                              {formatAuditAction(log.action)}
                            </Badge>
                          </td>
                          <td className={type.tableCell}>{log.glassType || "—"}</td>
                          <td className={cn(type.tableCell, 'tabular-nums font-medium')}>{log.quantity ?? "—"}</td>
                          <td className={type.tableCell}>
                            {log.action === "TRANSFER"
                              ? `${log.fromStand} → ${log.toStand}`
                              : log.standNo != null ? `Rack ${log.standNo}` : "—"}
                          </td>
                          <td className={cn(type.caption, 'tabular-nums whitespace-nowrap')}>
                            {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </motion.div>
        )}

      </motion.div>
    </PageWrapper>
  );
}

export default Dashboard;
