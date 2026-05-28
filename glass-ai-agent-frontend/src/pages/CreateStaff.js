import api from "../api/api";
import { useState } from "react";
import PageWrapper from "../components/PageWrapper";
import { Card, Button, Input, Alert, parseMessageType, PageHeader } from "../components/ui";
import { UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { fadeUp } from "../design/motion";

function CreateStaff() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg]           = useState("");
  const [loading, setLoading]   = useState(false);

  const createStaff = async () => {
    if (!username || !password) {
      setMsg("❌ Username and password are required");
      return;
    }

    try {
      setLoading(true);
      setMsg("");
      await api.post("/api/auth/create-staff", {
        username: username.trim(),
        password: password.trim(),
      });
      setMsg("✅ Staff created successfully");
      setUsername("");
      setPassword("");
    } catch (err) {
      console.error("Error creating staff:", err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to create staff";
      setMsg(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const parsed = parseMessageType(msg);

  return (
    <PageWrapper>
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex justify-center"
      >
        <div className="w-full max-w-md">
          <PageHeader
            eyebrow="Team access"
            title="Add team member"
            description="Create a staff account for your workspace."
            icon={<UserPlus size={22} />}
            className="mb-6"
          />

          <Card glass padding="lg" className="space-y-5">
            <Input
              label="Username"
              placeholder="Enter staff username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="off"
            />

            <Input
              type="password"
              label="Password"
              placeholder="Enter secure password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
            />

            {parsed && (
              <Alert type={parsed.type}>{parsed.text}</Alert>
            )}

            <Button
              variant="primary"
              fullWidth
              loading={loading}
              onClick={createStaff}
              icon={<UserPlus size={16} />}
              className="mt-1"
            >
              Create team member
            </Button>
          </Card>
        </div>
      </motion.div>
    </PageWrapper>
  );
}

export default CreateStaff;
