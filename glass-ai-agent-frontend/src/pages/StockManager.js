import { useState, useEffect } from "react";
import PageWrapper from "../components/PageWrapper";
import { Card, Button, Input, Select } from "../components/ui";
import api from "../api/api";
import ConfirmModal from "../components/ConfirmModal";
import "../styles/design-system.css";

function StockManager() {
  const [glassTypeStock, setGlassTypeStock] = useState("");
  const [standNo, setStandNo] = useState("");
  const [quantity, setQuantity] = useState("");
  const [stockMessage, setStockMessage] = useState("");
  const [glassMode, setGlassMode] = useState("SELECT");
  const [manualThickness, setManualThickness] = useState("");
  const [height, setHeight] = useState("");
  const [width, setWidth] = useState("");
  const [unit, setUnit] = useState("MM");
  const [hsnNo, setHsnNo] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [showUndo, setShowUndo] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const updateStock = (action) => {
    setStockMessage("");

    if (!standNo || !quantity || !height || !width) {
      setStockMessage("❌ Please fill all required fields");
      return;
    }

    if (glassMode === "SELECT" && !glassTypeStock) {
      setStockMessage("❌ Please select glass type");
      return;
    }

    if (glassMode === "MANUAL" && !manualThickness) {
      setStockMessage("❌ Please enter manual thickness");
      return;
    }

    const payload = {
      standNo: Number(standNo),
      quantity: Number(quantity),
      action,
      glassType: glassMode === "SELECT" ? glassTypeStock : `${manualThickness}MM`,
      thickness: glassMode === "SELECT" 
        ? Number(glassTypeStock.replace("MM", "")) 
        : Number(manualThickness),
      height,
      width,
      unit,
      hsnNo: hsnNo || null
    };

    setPendingPayload(payload);
    setShowConfirm(true);
  };

  const confirmSaveStock = async () => {
    try {
      await api.post("/stock/update", pendingPayload);
      setStockMessage("✅ Stock updated successfully");
      setShowUndo(true);

      // Reset form
      setStandNo("");
      setQuantity("");
      setHeight("");
      setWidth("");
      setManualThickness("");
      setGlassTypeStock("");
      setHsnNo("");
    } catch (error) {
      const errorData = error.response?.data;
      const errorMessage = typeof errorData === 'string' 
        ? errorData 
        : (errorData?.error || errorData?.message || error.message || "❌ Failed to update stock");
      setStockMessage(errorMessage);
    } finally {
      setShowConfirm(false);
      setPendingPayload(null);
    }
  };

  const undoLastAction = async () => {
    try {
      const res = await api.post("/stock/undo");
      const responseMessage = typeof res.data === 'string' 
        ? res.data 
        : (res.data?.message || "✅ Stock updated successfully");
      setStockMessage(responseMessage);
      setShowUndo(false);
    } catch {
      setStockMessage("❌ Failed to undo last action");
    }
  };

  const getPlaceholder = (dimension, currentUnit) => {
    if (currentUnit === "MM") {
      return dimension === "height" ? "e.g. 26 1/4" : "e.g. 18 3/8";
    } else if (currentUnit === "INCH") {
      return "e.g. 10, 20, 30";
    } else {
      return "e.g. 5, 10, 15";
    }
  };

  return (
    <PageWrapper>
      <div style={getContainerStyle(isMobile)}>
        {/* Header Section */}
        <div style={headerSection}>
          <div>
            <h1 style={pageTitle}>Manage Stock</h1>
            <p style={pageSubtitle}>Add or remove stock from your inventory</p>
          </div>
        </div>

        {/* Main Form Card */}
        <Card style={getFormCardStyle(isMobile)}>
          {/* Glass Type Section */}
          <div style={section}>
            <div style={sectionHeader}>
              <div style={sectionIcon}>🔷</div>
              <div>
                <h3 style={sectionTitle}>Glass Type</h3>
                <p style={sectionSubtitle}>Select or enter glass thickness</p>
              </div>
            </div>

            <div style={getFormGridStyle(isMobile)}>
              <div style={formGroup}>
                <Select
                  label="Selection Mode"
                  value={glassMode} 
                  onChange={e => setGlassMode(e.target.value)}
                  icon="🔷"
                >
                  <option value="SELECT">Select from list</option>
                  <option value="MANUAL">Manual entry</option>
                </Select>
              </div>

              {glassMode === "SELECT" ? (
                <div style={formGroup}>
                  <Select
                    label="Glass Type"
                    value={glassTypeStock}
                    onChange={e => setGlassTypeStock(e.target.value)}
                    icon="🔷"
                    required
                  >
                    <option value="">Select glass type</option>
                    <option value="5MM">5 MM</option>
                    <option value="8MM">8 MM</option>
                    <option value="10MM">10 MM</option>
                    <option value="12MM">12 MM</option>
                    <option value="15MM">15 MM</option>
                    <option value="20MM">20 MM</option>
                  </Select>
                </div>
              ) : (
                <div style={formGroup}>
                  <Input
                    label="Manual Thickness (MM)"
                    type="number"
                    placeholder="Enter thickness in MM"
                    value={manualThickness}
                    onChange={e => setManualThickness(e.target.value)}
                    icon="📏"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Dimensions Section */}
          <div style={section}>
            <div style={sectionHeader}>
              <div style={sectionIcon}>📐</div>
              <div>
                <h3 style={sectionTitle}>Dimensions</h3>
                <p style={sectionSubtitle}>Enter glass dimensions</p>
              </div>
            </div>

            <div style={getFormGridStyle(isMobile)}>
              <div style={formGroup}>
                <Select
                  label="Unit"
                  value={unit} 
                  onChange={e => setUnit(e.target.value)}
                  icon="📐"
                >
                  <option value="MM">MM (Millimeters)</option>
                  <option value="INCH">INCH (Inches)</option>
                  <option value="FEET">FEET (Feet)</option>
                </Select>
              </div>

              <div style={formGroup}>
                <Input
                  label="Height"
                  type="text"
                  placeholder={getPlaceholder("height", unit)}
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  icon="📏"
                  required
                />
              </div>

              <div style={formGroup}>
                <Input
                  label="Width"
                  type="text"
                  placeholder={getPlaceholder("width", unit)}
                  value={width}
                  onChange={e => setWidth(e.target.value)}
                  icon="📏"
                  required
                />
              </div>
            </div>
          </div>

          {/* Stock Details Section */}
          <div style={section}>
            <div style={sectionHeader}>
              <div style={sectionIcon}>📦</div>
              <div>
                <h3 style={sectionTitle}>Stock Details</h3>
                <p style={sectionSubtitle}>Stand number and quantity</p>
              </div>
            </div>

            <div style={getFormGridStyle(isMobile)}>
              <div style={formGroup}>
                <Input
                  label="Stand Number"
                  type="number"
                  placeholder="Enter stand number"
                  value={standNo}
                  onChange={e => setStandNo(e.target.value)}
                  icon="🏷️"
                  required
                />
              </div>

              <div style={formGroup}>
                <Input
                  label="Quantity"
                  type="number"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  icon="🔢"
                  required
                />
              </div>
            </div>
          </div>

          {/* Additional Information Section */}
          <div style={section}>
            <div style={sectionHeader}>
              <div style={sectionIcon}>📋</div>
              <div>
                <h3 style={sectionTitle}>Additional Information</h3>
                <p style={sectionSubtitle}>Optional details for GST</p>
              </div>
            </div>

            <div style={formGroup}>
              <Input
                label="HSN Code (Optional)"
                type="text"
                placeholder="e.g., 7003, 7004"
                value={hsnNo}
                onChange={e => setHsnNo(e.target.value)}
                icon="🏷️"
                helperText="HSN code for GST billing (optional)"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={actionsSection}>
            <div style={buttonGroup}>
              <Button
                variant="success"
                size="lg"
                icon="➕"
                fullWidth={isMobile}
                onClick={() => updateStock("ADD")}
                style={{ flex: isMobile ? "1" : "none" }}
              >
                Add Stock
              </Button>

              <Button
                variant="danger"
                size="lg"
                icon="➖"
                fullWidth={isMobile}
                onClick={() => updateStock("REMOVE")}
                style={{ flex: isMobile ? "1" : "none" }}
              >
                Remove Stock
              </Button>
            </div>

            {showUndo && (
              <Button
                variant="outline"
                size="md"
                icon="↩"
                fullWidth
                onClick={undoLastAction}
                style={{ marginTop: "12px" }}
              >
                Undo Last Action
              </Button>
            )}
          </div>

          {/* Message Display */}
          {stockMessage && (
            <div style={getMessageStyle(stockMessage && typeof stockMessage === 'string' && stockMessage.includes("✅"))}>
              <span style={messageIcon}>
                {stockMessage.includes("✅") ? "✅" : "❌"}
              </span>
              <span>{stockMessage.replace("✅", "").replace("❌", "").trim()}</span>
            </div>
          )}
        </Card>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        show={showConfirm}
        payload={pendingPayload || {}}
        onCancel={() => setShowConfirm(false)}
        onConfirm={confirmSaveStock}
      />
    </PageWrapper>
  );
}

export default StockManager;

/* ================= STYLES ================= */

const getContainerStyle = (isMobile) => ({
  maxWidth: "1000px",
  margin: "0 auto",
  padding: isMobile ? "24px 16px" : "40px 24px",
  width: "100%",
});

const headerSection = {
  marginBottom: "32px",
};

const pageTitle = {
  fontSize: "36px",
  fontWeight: "800",
  color: "#0f172a",
  margin: "0 0 8px 0",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

const pageSubtitle = {
  fontSize: "16px",
  color: "#64748b",
  margin: "0",
  fontWeight: "400",
};

const getFormCardStyle = (isMobile) => ({
  padding: isMobile ? "24px" : "40px",
});

const section = {
  marginBottom: "40px",
  paddingBottom: "32px",
  borderBottom: "1px solid #e2e8f0",
};

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  marginBottom: "24px",
};

const sectionIcon = {
  width: "48px",
  height: "48px",
  borderRadius: "12px",
  background: "linear-gradient(135deg, #667eea15, #764ba225)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  flexShrink: 0,
};

const sectionTitle = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 4px 0",
};

const sectionSubtitle = {
  fontSize: "14px",
  color: "#64748b",
  margin: "0",
  fontWeight: "400",
};

const getFormGridStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "20px",
});

const formGroup = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const label = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#475569",
  marginBottom: "4px",
};

const required = {
  color: "#ef4444",
  marginLeft: "2px",
};


const actionsSection = {
  marginTop: "32px",
  paddingTop: "32px",
  borderTop: "2px solid #e2e8f0",
};

const buttonGroup = {
  display: "flex",
  gap: "16px",
  flexWrap: "wrap",
};

const getMessageStyle = (isSuccess) => ({
  marginTop: "24px",
  padding: "16px 20px",
  borderRadius: "12px",
  background: isSuccess 
    ? "rgba(34, 197, 94, 0.1)" 
    : "rgba(239, 68, 68, 0.1)",
  border: `1.5px solid ${isSuccess ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
  color: isSuccess ? "#16a34a" : "#dc2626",
  fontSize: "14px",
  fontWeight: "500",
  display: "flex",
  alignItems: "center",
  gap: "12px",
});

const messageIcon = {
  fontSize: "20px",
  flexShrink: 0,
};
