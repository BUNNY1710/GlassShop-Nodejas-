import { useEffect, useState } from "react";
import api from "../api/api";
import PageWrapper from "../components/PageWrapper";
import { PageHeader, Card, Badge, actionBadgeVariant, EmptyState } from "../components/ui";
import { audit as copy } from "../design/copy";
import { formatRole, formatAuditAction } from "../design/format";
import { type } from "../design/typography";
import { cn } from "../lib/utils";
import { ScrollText } from "lucide-react";
import { useResponsive } from "../hooks/useResponsive";

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const { isMobile } = useResponsive();

  const formatIST = (timestamp) => {
    if (!timestamp) return '—';
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      if (isNaN(date.getTime())) return '—';
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return '—';
    }
  };

  const formatSize = (log) => {
    if (!log.height || !log.width) return '—';
    const unit = (log.unit || 'mm').toLowerCase();
    return `${log.height} × ${log.width} ${unit}`;
  };

  const formatStand = (log) => {
    if (log.action === "TRANSFER") {
      return `Rack ${log.fromStand} → ${log.toStand}`;
    }
    return log.standNo != null ? `Rack ${log.standNo}` : '—';
  };

  useEffect(() => {
    api.get("/api/audit/recent")
      .then(res => setLogs(res.data))
      .catch(err => {
        if (err.response?.status === 403) {
          setError(copy.unauthorized);
        } else {
          setError(copy.loadFailed);
        }
      });
  }, []);

  return (
    <PageWrapper>
      <div className="page-container page-section">
        <PageHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
          icon={<ScrollText size={26} />}
        />

        {error && (
          <Card glass padding="md" className="border-rose-500/20">
            <p className={cn(type.bodySm, 'text-rose-600 dark:text-rose-400')}>{error}</p>
          </Card>
        )}

        {!error && logs.length === 0 && (
          <EmptyState
            icon={<ScrollText size={28} />}
            title={copy.empty}
            description={copy.description}
          />
        )}

        {!error && !isMobile && logs.length > 0 && (
          <Card padding="none" glass className="overflow-hidden">
            <div className="table-wrapper overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th className={type.tableHead}>{copy.columns.user}</th>
                    <th className={type.tableHead}>{copy.columns.role}</th>
                    <th className={type.tableHead}>{copy.columns.action}</th>
                    <th className={type.tableHead}>{copy.columns.glass}</th>
                    <th className={type.tableHead}>{copy.columns.size}</th>
                    <th className={type.tableHead}>{copy.columns.qty}</th>
                    <th className={type.tableHead}>{copy.columns.stand}</th>
                    <th className={type.tableHead}>{copy.columns.time}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={i}>
                      <td className={type.tableCellStrong}>{log.username || '—'}</td>
                      <td className={type.tableCell}>{formatRole(log.role)}</td>
                      <td>
                        <Badge variant={actionBadgeVariant(log.action)}>{formatAuditAction(log.action)}</Badge>
                      </td>
                      <td className={type.tableCell}>{log.glassType || '—'}</td>
                      <td className={type.tableCell}>{formatSize(log)}</td>
                      <td className={cn(type.tableCell, 'tabular-nums')}>{log.quantity ?? '—'}</td>
                      <td className={type.tableCell}>{formatStand(log)}</td>
                      <td className={cn(type.caption, 'tabular-nums whitespace-nowrap')}>{formatIST(log.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {!error && isMobile && logs.length > 0 && (
          <div className="space-y-4">
            {logs.map((log, i) => (
              <Card key={i} glass padding="md" className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10 text-sky-700 dark:text-sky-300 flex items-center justify-center font-display font-semibold border border-violet-500/20 shrink-0">
                    {log.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={type.bodyStrong}>{log.username || '—'}</p>
                    <p className={type.caption}>{formatRole(log.role)}</p>
                  </div>
                  <Badge variant={actionBadgeVariant(log.action)}>{formatAuditAction(log.action)}</Badge>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div><dt className={type.caption}>{copy.columns.glass}</dt><dd className={type.tableCell}>{log.glassType || '—'}</dd></div>
                  <div><dt className={type.caption}>{copy.columns.size}</dt><dd className={type.tableCell}>{formatSize(log)}</dd></div>
                  <div><dt className={type.caption}>{copy.columns.qty}</dt><dd className={cn(type.tableCell, 'tabular-nums')}>{log.quantity ?? '—'}</dd></div>
                  <div><dt className={type.caption}>{copy.columns.stand}</dt><dd className={type.tableCell}>{formatStand(log)}</dd></div>
                </dl>
                <p className={cn(type.caption, 'text-right tabular-nums')}>{formatIST(log.timestamp)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

export default AuditLogs;
