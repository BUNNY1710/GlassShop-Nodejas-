import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../components/PageWrapper";
import { Card, Button, Input, Select, Alert, parseMessageType, Badge, Modal, ModalActions } from "../components/ui";
import { Pencil, Trash2 } from "lucide-react";
import api from "../api/api";
import { useResponsive } from "../hooks/useResponsive";
import { getUserRole } from "../utils/auth";
import "../styles/design-system.css";

function GlassPriceMaster() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [priceMaster, setPriceMaster] = useState([]);
  const [allPriceMaster, setAllPriceMaster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPending, setShowPending] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [glassTypeMode, setGlassTypeMode] = useState("SELECT");
  const [thicknessMode, setThicknessMode] = useState("SELECT");
  const [manualGlassType, setManualGlassType] = useState("");
  const [manualThickness, setManualThickness] = useState("");
  const [thicknessFocused, setThicknessFocused] = useState(false);
  const [formData, setFormData] = useState({
    glassType: "",
    thickness: "",
    purchasePrice: "",
    sellingPrice: ""
  });
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, glassType, thickness }

  // Default glass type options
  const defaultGlassTypeOptions = [
    "Plan",
    "Extra Clear",
    "Grey Tinted",
    "Brown Tinted",
    "One Way",
    "Star",
    "Karakachi",
    "Bajari",
    "Diomand",
    "Mirror"
  ];

  // Load custom glass types from localStorage (same as Manage Stock)
  const [customGlassTypes, setCustomGlassTypes] = useState(() => {
    try {
      const saved = localStorage.getItem("customGlassTypes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Combine default and custom glass types (reactive to customGlassTypes changes)
  const glassTypeOptions = [...defaultGlassTypeOptions, ...customGlassTypes];

  // Thickness options
  const thicknessOptions = [3.5, 4, 5, 6, 8, 10, 12, 15, 19];

  // Reload custom glass types from localStorage when component mounts
  useEffect(() => {
    try {
      const saved = localStorage.getItem("customGlassTypes");
      if (saved) {
        const parsed = JSON.parse(saved);
        setCustomGlassTypes(parsed);
      }
    } catch (error) {
      console.error("Failed to load custom glass types:", error);
    }
  }, []);

  useEffect(() => {
    // Check if user is admin
    const role = getUserRole();
    if (role !== "ROLE_ADMIN") {
      navigate("/dashboard");
      return;
    }
    loadPriceMaster();
  }, [showPending]);

  const loadPriceMaster = async () => {
    try {
      setLoading(true);
      const params = showPending ? { pending: "true" } : {};
      const res = await api.get("/api/glass-price-master", { params });
      // Sort: pending entries first, then approved entries
      const sortedData = [...res.data].sort((a, b) => {
        if (a.isPending && !b.isPending) return -1;
        if (!a.isPending && b.isPending) return 1;
        return 0;
      });
      setPriceMaster(sortedData);
      
      // Also load all data for counts
      if (!showPending) {
        const allRes = await api.get("/api/glass-price-master");
        setAllPriceMaster(allRes.data);
      }
    } catch (error) {
      console.error("Error loading price master:", error);
      setMessage("❌ Failed to load price master data");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setShowForm(true);
    setGlassTypeMode("SELECT");
    setThicknessMode("SELECT");
    setManualGlassType("");
    setManualThickness("");
    setThicknessFocused(false);
    setFormData({
      glassType: "",
      thickness: "",
      purchasePrice: "",
      sellingPrice: ""
    });
    setMessage("");
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setShowForm(true);
    // Check if glass type is in the combined list (default + custom from localStorage)
    // Reload custom types first to ensure we have the latest
    const savedCustomTypes = (() => {
      try {
        const saved = localStorage.getItem("customGlassTypes");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    })();
    const allGlassTypes = [...defaultGlassTypeOptions, ...savedCustomTypes];
    const isPredefinedGlassType = allGlassTypes.includes(entry.glassType);
    setGlassTypeMode(isPredefinedGlassType ? "SELECT" : "MANUAL");
    setManualGlassType(isPredefinedGlassType ? "" : entry.glassType);
    
    // Check if thickness is in the predefined list
    // Compare with tolerance for floating point numbers
    const entryThicknessValue = parseFloat(entry.thickness);
    const matchingThicknessOption = thicknessOptions.find(opt => 
      Math.abs(parseFloat(opt) - entryThicknessValue) < 0.01
    );
    const isPredefinedThickness = matchingThicknessOption !== undefined;
    setThicknessMode(isPredefinedThickness ? "SELECT" : "MANUAL");
    setManualThickness(isPredefinedThickness ? "" : entryThicknessValue.toString());
    
    // For SELECT mode, use the matching option value (as string to match option value)
    // For MANUAL mode, leave empty (manualThickness will be used)
    const thicknessFormValue = isPredefinedThickness 
      ? matchingThicknessOption.toString() 
      : "";
    
    setFormData({
      glassType: isPredefinedGlassType ? entry.glassType : "",
      thickness: thicknessFormValue,
      purchasePrice: entry.purchasePrice ? entry.purchasePrice.toString() : "",
      sellingPrice: entry.sellingPrice ? entry.sellingPrice.toString() : ""
    });
    setMessage("");
  };

  const handleSave = async () => {
    try {
      setMessage("");
      
      // Get final glass type and thickness values
      const finalGlassType = glassTypeMode === "SELECT" 
        ? formData.glassType 
        : manualGlassType;
      const finalThickness = thicknessMode === "SELECT" 
        ? parseFloat(formData.thickness) 
        : parseFloat(manualThickness);
      
      if (!finalGlassType || !finalThickness || isNaN(finalThickness)) {
        setMessage("❌ Glass type and thickness are required");
        return;
      }

      const payload = {
        glassType: finalGlassType,
        thickness: finalThickness,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
        sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : null
      };

      if (editingId) {
        await api.put(`/api/glass-price-master/${editingId}`, payload);
        setMessage("✅ Price master updated successfully");
      } else {
        await api.post("/api/glass-price-master", payload);
        setMessage("✅ Price master added successfully");
      }

      await loadPriceMaster();
      setEditingId(null);
      setShowForm(false);
      setFormData({
        glassType: "",
        thickness: "",
        purchasePrice: "",
        sellingPrice: ""
      });
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || "Failed to save";
      setMessage(`❌ ${errorMsg}`);
    }
  };

  const handleDelete = async (id) => {
    const entry = priceMaster.find(p => p.id === id);
    if (entry) {
      setConfirmDelete({
        id: id,
        glassType: entry.glassType,
        thickness: entry.thickness
      });
    }
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;

    try {
      await api.delete(`/api/glass-price-master/${confirmDelete.id}`);
      setMessage("✅ Entry deleted successfully");
      setConfirmDelete(null);
      await loadPriceMaster();
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || "Failed to delete";
      setMessage(`❌ ${errorMsg}`);
      setConfirmDelete(null);
    }
  };

  const pendingCount = allPriceMaster.filter(p => p.isPending).length;
  const approvedCount = allPriceMaster.filter(p => !p.isPending).length;

  return (
    <PageWrapper>
      <div style={getContainerStyle(isMobile)}>
        {/* Header */}
        <div style={getHeaderSectionStyle(isMobile)}>
          <div>
            <h1 style={getPageTitleStyle(isMobile)}>Glass Price Master</h1>
            <p style={getPageSubtitleStyle(isMobile)}>Manage glass type pricing (Admin only)</p>
          </div>
          <div style={getHeaderActionsStyle(isMobile)}>
            <Button
              variant={!showPending ? "primary" : "outline"}
              onClick={() => {
                setShowPending(false);
                loadPriceMaster();
              }}
            >
              All ({priceMaster.length})
            </Button>
            <Button
              variant={showPending ? "primary" : "outline"}
              onClick={() => {
                setShowPending(true);
                loadPriceMaster();
              }}
            >
              Pending ({pendingCount})
            </Button>
            <Button
              variant="success"
              icon="➕"
              onClick={handleAdd}
            >
              Add New
            </Button>
          </div>
        </div>

        {/* Form Card */}
        {showForm && (
          <Card style={getFormCardStyle(isMobile)}>
            <h3 style={formTitle}>
              {editingId ? "Edit Price Entry" : "Add New Price Entry"}
            </h3>
            <div style={getFormGridStyle(isMobile)}>
              {/* Glass Type Selection Mode */}
              <Select
                label="Glass Type Mode"
                value={glassTypeMode}
                onChange={e => {
                  setGlassTypeMode(e.target.value);
                  if (e.target.value === "SELECT") {
                    setManualGlassType("");
                  } else {
                    setFormData({ ...formData, glassType: "" });
                  }
                }}
                icon="🔷"
              >
                <option value="SELECT">Select from list</option>
                <option value="MANUAL">Manual entry</option>
              </Select>

              {/* Glass Type - Select or Manual */}
              {glassTypeMode === "SELECT" ? (
                <Select
                  label="Glass Type"
                  value={formData.glassType}
                  onChange={e => setFormData({ ...formData, glassType: e.target.value })}
                  icon="🔷"
                  required
                >
                  <option value="">Select glass type</option>
                  {glassTypeOptions.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
              ) : (
                <Input
                  label="Manual Glass Type"
                  type="text"
                  placeholder="Enter custom glass type"
                  value={manualGlassType}
                  onChange={e => setManualGlassType(e.target.value)}
                  icon="🔷"
                  required
                />
              )}

              {/* Thickness Selection Mode */}
              <Select
                label="Thickness Mode"
                value={thicknessMode}
                onChange={e => {
                  setThicknessMode(e.target.value);
                  setThicknessFocused(false);
                  if (e.target.value === "SELECT") {
                    setManualThickness("");
                  } else {
                    setFormData({ ...formData, thickness: "" });
                  }
                }}
                icon="📏"
              >
                <option value="SELECT">Select from list</option>
                <option value="MANUAL">Manual entry</option>
              </Select>

              {/* Thickness - Select or Manual */}
              {thicknessMode === "SELECT" ? (
                <Select
                  label="Thickness (MM)"
                  value={formData.thickness}
                  onChange={e => setFormData({ ...formData, thickness: e.target.value })}
                  icon="📏"
                  required
                >
                  <option value="">Select thickness</option>
                  {thicknessOptions.map(th => (
                    <option key={th} value={th}>{th} MM</option>
                  ))}
                </Select>
              ) : (
                <Input
                  label="Manual Thickness (MM)"
                  type="text"
                  placeholder="Enter thickness (e.g., 2)"
                  value={thicknessFocused ? manualThickness : (manualThickness ? `${manualThickness} MM` : "")}
                  onChange={e => {
                    let inputVal = e.target.value;
                    // Remove "MM" if user types it, keep only the number
                    inputVal = inputVal.replace(/mm/gi, '').trim();
                    // Extract only numbers and decimal point
                    inputVal = inputVal.replace(/[^\d.]/g, '');
                    setManualThickness(inputVal);
                  }}
                  onFocus={(e) => {
                    // On focus, show just the number (remove MM) so user can edit
                    setThicknessFocused(true);
                    let inputVal = e.target.value.replace(/mm/gi, '').trim();
                    inputVal = inputVal.replace(/[^\d.]/g, '');
                    setManualThickness(inputVal);
                  }}
                  onBlur={(e) => {
                    // On blur (when moving to next field), format with MM if valid number
                    setThicknessFocused(false);
                    let inputVal = e.target.value.replace(/mm/gi, '').trim();
                    inputVal = inputVal.replace(/[^\d.]/g, '');
                    if (inputVal && !isNaN(parseFloat(inputVal))) {
                      setManualThickness(inputVal);
                    } else if (!inputVal) {
                      setManualThickness("");
                    }
                  }}
                  icon="📏"
                  required
                />
              )}

              <Input
                label="Purchase Price (₹)"
                type="number"
                placeholder="Enter purchase price"
                value={formData.purchasePrice}
                onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })}
                icon="💰"
                min="0"
                step="0.01"
              />

              <Input
                label="Selling Price (₹)"
                type="number"
                placeholder="Enter selling price"
                value={formData.sellingPrice}
                onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })}
                icon="💵"
                min="0"
                step="0.01"
              />
            </div>

            <div style={getFormActionsStyle(isMobile)}>
              <Button variant="primary" onClick={handleSave}>
                {editingId ? "Update" : "Add"} Entry
              </Button>
              <Button variant="outline" onClick={() => {
                setEditingId(null);
                setShowForm(false);
                setGlassTypeMode("SELECT");
                setThicknessMode("SELECT");
                setManualGlassType("");
                setManualThickness("");
                setThicknessFocused(false);
                setFormData({ glassType: "", thickness: "", purchasePrice: "", sellingPrice: "" });
              }}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Message */}
        {message && (() => {
          const p = parseMessageType(message);
          return p ? <Alert type={p.type} onDismiss={() => setMessage("")} className="mb-4">{p.text}</Alert> : null;
        })()}

        {/* Price Master Table */}
        <Card style={getTableCardStyle(isMobile)}>
          {loading ? (
            <div style={loadingState}>Loading...</div>
          ) : priceMaster.length === 0 ? (
            <div style={emptyState}>
              <div style={emptyIcon}>💰</div>
              <p style={emptyText}>
                {showPending ? "No pending entries" : "No price entries found"}
              </p>
              <p style={emptySubtext}>
                {showPending 
                  ? "All entries have been approved" 
                  : "Add new entries to get started"}
              </p>
            </div>
          ) : isMobile ? (
            // Mobile: Card-based layout
            <div style={getMobileCardContainerStyle()}>
              {priceMaster.map((entry) => (
                <div key={entry.id} style={getMobileCardStyle()}>
                  <div style={getMobileCardHeaderStyle()}>
                    <div>
                      <h3 style={getMobileCardTitleStyle()}>{entry.glassType}</h3>
                      <p style={getMobileCardSubtitleStyle()}>
                        {entry.thickness ? `${parseFloat(entry.thickness).toFixed(2)} MM` : "—"}
                      </p>
                    </div>
                    <Badge variant={entry.isPending ? "warning" : "success"}>
                      {entry.isPending ? "Pending" : "Approved"}
                    </Badge>
                  </div>
                  <div style={getMobileCardContentStyle()}>
                    <div style={getMobileCardRowStyle()}>
                      <span style={getMobileCardLabelStyle()}>Purchase Price:</span>
                      <span style={getMobileCardValueStyle()}>
                        {entry.purchasePrice 
                          ? `₹${parseFloat(entry.purchasePrice).toFixed(2)}` 
                          : <span style={{color: "#94a3b8"}}>—</span>}
                      </span>
                    </div>
                    <div style={getMobileCardRowStyle()}>
                      <span style={getMobileCardLabelStyle()}>Selling Price:</span>
                      <span style={getMobileCardValueStyle()}>
                        {entry.sellingPrice 
                          ? `₹${parseFloat(entry.sellingPrice).toFixed(2)}` 
                          : <span style={{color: "#94a3b8"}}>—</span>}
                      </span>
                    </div>
                  </div>
                  <div style={getMobileCardActionsStyle()}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon="✏️"
                      onClick={() => handleEdit(entry)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon="🗑️"
                      onClick={() => handleDelete(entry.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Desktop: Table layout
            <div style={tableContainer}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={tableHeaderCell}>Glass Type</th>
                    <th style={tableHeaderCell}>Thickness</th>
                    <th style={tableHeaderCell}>Purchase Price</th>
                    <th style={tableHeaderCell}>Selling Price</th>
                    <th style={tableHeaderCell}>Status</th>
                    <th style={tableHeaderCell}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {priceMaster.map((entry) => (
                    <tr key={entry.id} style={tableRow}>
                      <td style={tableCell}>{entry.glassType}</td>
                      <td style={tableCell}>
                        {entry.thickness ? `${parseFloat(entry.thickness).toFixed(2)} MM` : "—"}
                      </td>
                      <td style={tableCell}>
                        {entry.purchasePrice 
                          ? `₹${parseFloat(entry.purchasePrice).toFixed(2)}` 
                          : <span style={{color: "#94a3b8"}}>—</span>}
                      </td>
                      <td style={tableCell}>
                        {entry.sellingPrice 
                          ? `₹${parseFloat(entry.sellingPrice).toFixed(2)}` 
                          : <span style={{color: "#94a3b8"}}>—</span>}
                      </td>
                      <td style={tableCell}>
                        <Badge variant={entry.isPending ? "warning" : "success"}>
                          {entry.isPending ? "Pending" : "Approved"}
                        </Badge>
                      </td>
                      <td style={tableCell}>
                        <div style={actionButtons}>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<Pencil size={13} />}
                            onClick={() => handleEdit(entry)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            icon={<Trash2 size={13} />}
                            onClick={() => handleDelete(entry.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
        {/* Delete Confirmation Modal */}
        <Modal
          open={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          title="Delete entry?"
          description={
            confirmDelete
              ? `Permanently delete ${confirmDelete.glassType} — ${confirmDelete.thickness} MM? This cannot be undone.`
              : undefined
          }
          size="sm"
          footer={
            <ModalActions
              onCancel={() => setConfirmDelete(null)}
              onConfirm={confirmDeleteAction}
              cancelLabel="Cancel"
              confirmLabel="Delete"
              confirmVariant="danger"
            />
          }
        />
    </PageWrapper>
  );
}

export default GlassPriceMaster;

/* ================= STYLES ================= */

const getContainerStyle = (isMobile) => ({
  maxWidth: "1400px",
  margin: "0 auto",
  padding: isMobile ? "24px 16px" : "40px 24px",
  width: "100%",
});

const getHeaderSectionStyle = (isMobile) => ({
  display: "flex",
  flexDirection: isMobile ? "column" : "row",
  justifyContent: "space-between",
  alignItems: isMobile ? "flex-start" : "flex-start",
  marginBottom: isMobile ? "24px" : "32px",
  gap: isMobile ? "16px" : "16px",
});

const getPageTitleStyle = (isMobile) => ({
  fontSize: isMobile ? "24px" : "36px",
  fontWeight: "800",
  color: "#0f172a",
  margin: "0 0 8px 0",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
});

const getPageSubtitleStyle = (isMobile) => ({
  fontSize: isMobile ? "14px" : "16px",
  color: "#64748b",
  margin: "0",
  fontWeight: "400",
});

const getHeaderActionsStyle = (isMobile) => ({
  display: "flex",
  flexDirection: isMobile ? "column" : "row",
  gap: isMobile ? "8px" : "12px",
  width: isMobile ? "100%" : "auto",
});

const getFormCardStyle = (isMobile) => ({
  padding: isMobile ? "24px" : "32px",
  marginBottom: "24px",
});

const formTitle = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 24px 0",
};

const getFormGridStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
  gap: isMobile ? "16px" : "20px",
  marginBottom: "24px",
});

// Make form actions responsive
const getFormActionsStyle = (isMobile) => ({
  display: "flex",
  flexDirection: isMobile ? "column" : "row",
  gap: "12px",
  width: "100%",
});

const getTableCardStyle = (isMobile) => ({
  padding: isMobile ? "16px" : "24px",
  overflow: "hidden",
});

// Mobile card styles
const getMobileCardContainerStyle = () => ({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
});

const getMobileCardStyle = () => ({
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "16px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
});

const getMobileCardHeaderStyle = () => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "12px",
  gap: "12px",
});

const getMobileCardTitleStyle = () => ({
  fontSize: "16px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 4px 0",
});

const getMobileCardSubtitleStyle = () => ({
  fontSize: "14px",
  color: "#64748b",
  margin: "0",
});

const getMobileCardContentStyle = () => ({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  marginBottom: "16px",
  paddingTop: "12px",
  borderTop: "1px solid #e2e8f0",
});

const getMobileCardRowStyle = () => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
});

const getMobileCardLabelStyle = () => ({
  fontSize: "13px",
  color: "#64748b",
  fontWeight: "500",
});

const getMobileCardValueStyle = () => ({
  fontSize: "14px",
  color: "#0f172a",
  fontWeight: "600",
  textAlign: "right",
});

const getMobileCardActionsStyle = () => ({
  display: "flex",
  gap: "8px",
  paddingTop: "12px",
  borderTop: "1px solid #e2e8f0",
});

const tableContainer = {
  overflowX: "auto",
  width: "100%",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
};

const tableHeaderCell = {
  padding: "16px 12px",
  textAlign: "left",
  fontSize: "13px",
  fontWeight: "600",
  color: "#475569",
  backgroundColor: "#f8fafc",
  borderBottom: "2px solid #e2e8f0",
  whiteSpace: "nowrap",
};

const tableRow = {
  borderBottom: "1px solid #e2e8f0",
};

const tableCell = {
  padding: "16px 12px",
  textAlign: "left",
  fontSize: "14px",
  color: "#0f172a",
};

const actionButtons = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};


const loadingState = {
  padding: "60px 20px",
  textAlign: "center",
  color: "#64748b",
  fontSize: "16px",
};

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

