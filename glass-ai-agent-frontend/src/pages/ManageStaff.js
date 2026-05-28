import { useEffect, useState } from "react";
import PageWrapper from "../components/PageWrapper";
import api from "../api/api";
import {
  PageHeader, Card, Button, Modal, ModalActions, EmptyState, Alert, parseMessageType,
} from "../components/ui";
import { Users, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { fadeUp } from "../design/motion";
import { type } from "../design/typography";
import { cn } from "../lib/utils";

function ManageStaff() {
  const [staff, setStaff]           = useState([]);
  const [confirmUser, setConfirmUser] = useState(null);
  const [removing, setRemoving]     = useState(false);
  const [msg, setMsg]               = useState("");

  useEffect(() => {
    api.get("/api/auth/staff")
      .then(res => setStaff(res.data))
      .catch(() => setMsg("❌ Failed to load staff members"));
  }, []);

  const removeStaff = async () => {
    if (!confirmUser) return;
    try {
      setRemoving(true);
      await api.delete(`/api/auth/staff/${confirmUser.id}`);
      setStaff(prev => prev.filter(s => s.id !== confirmUser.id));
      setConfirmUser(null);
      setMsg("✅ Staff member removed successfully");
    } catch {
      setMsg("❌ Failed to remove staff member");
      setConfirmUser(null);
    } finally {
      setRemoving(false);
    }
  };

  const parsed = parseMessageType(msg);

  return (
    <PageWrapper>
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="page-container page-section"
      >
        <PageHeader
          eyebrow="Team management"
          title="Staff members"
          description="View and manage staff accounts for your workspace."
          icon={<Users size={22} />}
          className="mb-6"
        />

        {parsed && (
          <Alert type={parsed.type} onDismiss={() => setMsg("")} className="mb-4">
            {parsed.text}
          </Alert>
        )}

        {staff.length === 0 && !msg && (
          <EmptyState
            icon={<Users size={28} />}
            title="No staff members yet"
            description="Create a staff account to get started."
          />
        )}

        {staff.length > 0 && (
          <Card glass padding="none" className="overflow-hidden">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {staff.map(s => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500/15 to-sky-500/8 border border-sky-500/20 text-sky-700 dark:text-sky-300 flex items-center justify-center font-display font-semibold text-sm shrink-0">
                      {s.userName?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                    <span className={cn(type.bodyStrong, "truncate")}>{s.userName}</span>
                  </div>

                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 size={14} />}
                    onClick={() => setConfirmUser(s)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </motion.div>

      <Modal
        open={!!confirmUser}
        onClose={() => setConfirmUser(null)}
        title="Remove staff member"
        description={
          confirmUser
            ? `Are you sure you want to remove ${confirmUser.userName}? This cannot be undone.`
            : undefined
        }
        size="sm"
        footer={
          <ModalActions
            onCancel={() => setConfirmUser(null)}
            onConfirm={removeStaff}
            cancelLabel="Cancel"
            confirmLabel="Remove"
            confirmVariant="danger"
            loading={removing}
          />
        }
      />
    </PageWrapper>
  );
}

export default ManageStaff;
