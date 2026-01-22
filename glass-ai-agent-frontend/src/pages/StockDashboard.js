import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import api from "../api/api";
import PageWrapper from "../components/PageWrapper";
import { Card, Button, Input, Select, StatCard } from "../components/ui";
import ConfirmModal from "../components/ConfirmModal";
import "../styles/design-system.css";

// Helper functions for dimension parsing and conversion
const parseDimension = (value) => {
  if (!value || value.trim() === "") return null;
  
  const trimmed = value.trim();
  
  // Handle fraction format (e.g., "5 1/4")
  const fractionMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const whole = parseFloat(fractionMatch[1]);
    const numerator = parseFloat(fractionMatch[2]);
    const denominator = parseFloat(fractionMatch[3]);
    return whole + (numerator / denominator);
  }
  
  // Handle decimal format (e.g., "5.5")
  const decimal = parseFloat(trimmed);
  if (!isNaN(decimal)) {
    return decimal;
  }
  
  return null;
};

const convertToMM = (value, unit) => {
  if (value === null || value === undefined) return null;
  
  switch (unit?.toUpperCase()) {
    case "MM":
      return value;
    case "INCH":
      return value * 25.4;
    case "FEET":
      return value * 304.8;
    default:
      return value;
  }
};

const convertFromMM = (valueInMM, targetUnit) => {
  if (valueInMM === null || valueInMM === undefined) return null;
  
  switch (targetUnit?.toUpperCase()) {
    case "MM":
      return valueInMM;
    case "INCH":
      return valueInMM / 25.4;
    case "FEET":
      return valueInMM / 304.8;
    default:
      return valueInMM;
  }
};

function StockDashboard() {
  const [allStock, setAllStock] = useState([]);
  const [filterGlassType, setFilterGlassType] = useState("");
  const [filterHeight, setFilterHeight] = useState("");
  const [filterWidth, setFilterWidth] = useState("");
  const [searchUnit, setSearchUnit] = useState("MM");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(true);

  // Add/Remove Modal State
  const [showAddRemoveModal, setShowAddRemoveModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [stockMessage, setStockMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [showUndo, setShowUndo] = useState(false);

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferStock, setTransferStock] = useState(null);
  const [toStand, setToStand] = useState("");
  const [transferQuantity, setTransferQuantity] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadStock = async () => {
    try {
      setLoading(true);
      const res = await api.get("/stock/all");
      const stockWithQuantity = res.data.filter(item => 
        item.quantity != null && item.quantity > 0
      );
      setAllStock(stockWithQuantity);

      stockWithQuantity.forEach(item => {
        if (item.quantity < item.minQuantity) {
          toast.error(
            `🚨 LOW STOCK: ${item.glass?.type} (Stand ${item.standNo})`,
            { toastId: `${item.standNo}-${item.glass?.type}` }
          );
        }
      });
    } catch (err) {
      console.error(err);
      if (err.response?.status !== 401) {
        toast.error("Failed to load stock. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, []);

  const openAddRemoveModal = (stock) => {
    setSelectedStock(stock);
    setQuantity("");
    setStockMessage("");
    setShowAddRemoveModal(true);
  };

  const closeAddRemoveModal = () => {
    setShowAddRemoveModal(false);
    setSelectedStock(null);
    setQuantity("");
    setStockMessage("");
  };

  const updateStock = (action) => {
    setStockMessage("");

    if (!quantity || Number(quantity) <= 0) {
      setStockMessage("❌ Please enter a valid quantity");
      return;
    }

    if (!selectedStock) {
      setStockMessage("❌ No stock item selected");
      return;
    }

    const payload = {
      standNo: selectedStock.standNo,
      quantity: Number(quantity),
      action,
      glassType: selectedStock.glass?.type,
      thickness: selectedStock.glass?.thickness,
      height: selectedStock.height,
      width: selectedStock.width,
      unit: selectedStock.glass?.unit || "MM"
    };

    setPendingPayload(payload);
    setShowConfirm(true);
    setShowAddRemoveModal(false);
  };

  const confirmSaveStock = async () => {
    try {
      await api.post("/stock/update", pendingPayload);
      setShowConfirm(false);
      setPendingPayload(null);
      toast.success("✅ Stock updated successfully");
      setShowUndo(true);
      await loadStock();
      closeAddRemoveModal();
      setShowUndo(false);
    } catch (error) {
      setShowConfirm(false);
      setPendingPayload(null);
      setShowAddRemoveModal(true);
      setStockMessage(error.response?.data || "❌ Failed to update stock");
    }
  };

  const undoLastAction = async () => {
    try {
      const res = await api.post("/stock/undo");
      setStockMessage(res.data);
      setShowUndo(false);
      await loadStock();
    } catch {
      setStockMessage("❌ Failed to undo last action");
    }
  };

  const openTransferModal = (stock) => {
    setTransferStock(stock);
    setToStand("");
    setTransferQuantity("");
    setTransferMessage("");
    setShowTransferModal(true);
  };

  const closeTransferModal = () => {
    setShowTransferModal(false);
    setTransferStock(null);
    setToStand("");
    setTransferQuantity("");
    setTransferMessage("");
  };

  const handleTransfer = () => {
    setTransferMessage("");

    if (!toStand || Number(toStand) <= 0) {
      setTransferMessage("❌ Please enter a valid destination stand number");
      return;
    }

    if (!transferQuantity || Number(transferQuantity) <= 0) {
      setTransferMessage("❌ Please enter a valid quantity");
      return;
    }

    if (!transferStock) {
      setTransferMessage("❌ No stock item selected");
      return;
    }

    if (Number(toStand) === transferStock.standNo) {
      setTransferMessage("❌ From stand and to stand cannot be the same");
      return;
    }

    let formattedGlassType = transferStock.glass?.type || "";
    if (formattedGlassType && /^\d+$/.test(formattedGlassType.trim())) {
      formattedGlassType = formattedGlassType.trim() + "MM";
    }

    setShowTransferConfirm(true);
    setShowTransferModal(false);
  };

  const confirmTransfer = async () => {
    try {
      let formattedGlassType = transferStock.glass?.type || "";
      if (formattedGlassType && /^\d+$/.test(formattedGlassType.trim())) {
        formattedGlassType = formattedGlassType.trim() + "MM";
      }

      const res = await api.post("/stock/transfer", {
        glassType: formattedGlassType,
        unit: transferStock.glass?.unit || "MM",
        height: transferStock.height,
        width: transferStock.width,
        fromStand: Number(transferStock.standNo),
        toStand: Number(toStand),
        quantity: Number(transferQuantity)
      });

      const responseMessage = typeof res.data === 'string' 
        ? res.data 
        : (res.data?.message || "✅ Transfer completed successfully");
      setTransferMessage(responseMessage);
      setShowTransferConfirm(false);
      await loadStock();
      setTimeout(() => {
        closeTransferModal();
        setTransferMessage("");
      }, 2000);
    } catch (error) {
      const errorData = error.response?.data;
      const errorMessage = typeof errorData === 'string' 
        ? errorData 
        : (errorData?.error || error.message || "❌ Transfer failed");
      setTransferMessage(errorMessage);
      setShowTransferConfirm(false);
      setShowTransferModal(true);
    }
  };

  const filteredStock = useMemo(() => {
    const stockWithQuantity = allStock.filter(s => 
      s.quantity != null && s.quantity > 0
    );
    
    const searchHeightValue = parseDimension(filterHeight);
    const searchWidthValue = parseDimension(filterWidth);
    
    const searchHeightMM = searchHeightValue !== null 
      ? convertToMM(searchHeightValue, searchUnit) 
      : null;
    const searchWidthMM = searchWidthValue !== null 
      ? convertToMM(searchWidthValue, searchUnit) 
      : null;

    const filtered = stockWithQuantity.filter(s => {
      const matchGlass =
        !filterGlassType ||
        s.glass?.type?.toLowerCase().includes(filterGlassType.toLowerCase());

      let matchHeight = true;
      if (searchHeightMM !== null) {
        const stockHeightValue = parseDimension(s.height);
        if (stockHeightValue !== null) {
          const stockHeightMM = convertToMM(stockHeightValue, s.glass?.unit);
          if (stockHeightMM !== null) {
            matchHeight = stockHeightMM >= searchHeightMM;
          } else {
            matchHeight = false;
          }
        } else {
          matchHeight = false;
        }
      }

      let matchWidth = true;
      if (searchWidthMM !== null) {
        const stockWidthValue = parseDimension(s.width);
        if (stockWidthValue !== null) {
          const stockWidthMM = convertToMM(stockWidthValue, s.glass?.unit);
          if (stockWidthMM !== null) {
            matchWidth = stockWidthMM >= searchWidthMM;
          } else {
            matchWidth = false;
          }
        } else {
          matchWidth = false;
        }
      }

      return matchGlass && matchHeight && matchWidth;
    });

    return filtered.sort((a, b) => {
      const aHeightValue = parseDimension(a.height);
      const bHeightValue = parseDimension(b.height);
      const aWidthValue = parseDimension(a.width);
      const bWidthValue = parseDimension(b.width);
      
      const aHeightMM = aHeightValue !== null ? convertToMM(aHeightValue, a.glass?.unit) : 0;
      const bHeightMM = bHeightValue !== null ? convertToMM(bHeightValue, b.glass?.unit) : 0;
      const aWidthMM = aWidthValue !== null ? convertToMM(aWidthValue, a.glass?.unit) : 0;
      const bWidthMM = bWidthValue !== null ? convertToMM(bWidthValue, b.glass?.unit) : 0;

      if (aHeightMM !== bHeightMM) {
        return aHeightMM - bHeightMM;
      }
      return aWidthMM - bWidthMM;
    });
  }, [allStock, filterGlassType, filterHeight, filterWidth, searchUnit]);

  // Calculate stats
  const totalStock = filteredStock.length;
  const lowStockCount = filteredStock.filter(s => s.quantity < s.minQuantity).length;
  const totalQuantity = filteredStock.reduce((sum, s) => sum + (s.quantity || 0), 0);

  return (
    <PageWrapper>
      <div style={getContainerStyle(isMobile)}>
        {/* Header Section */}
        <div style={headerSection}>
          <div>
            <h1 style={getPageTitleStyle(isMobile)}>View Stock</h1>
            <p style={pageSubtitle}>Browse and manage your inventory</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={getStatsGridStyle(isMobile)}>
          <StatCard
            icon="📦"
            label="Total Items"
            value={totalStock}
            color="#6366f1"
            loading={loading}
          />
          <StatCard
            icon="⚠️"
            label="Low Stock"
            value={lowStockCount}
            color="#ef4444"
            loading={loading}
            subtitle={lowStockCount > 0 ? "Needs attention" : "All good"}
          />
          <StatCard
            icon="🔢"
            label="Total Quantity"
            value={totalQuantity.toLocaleString()}
            color="#22c55e"
            loading={loading}
          />
        </div>

        {/* Filters Card */}
        <Card style={getFilterCardStyle(isMobile)}>
          <div style={filterHeader}>
            <div style={filterIcon}>🔍</div>
            <div>
              <h3 style={filterTitle}>Search & Filter</h3>
              <p style={filterSubtitle}>Filter stock by type, dimensions, or unit</p>
            </div>
          </div>

          <div style={getFilterGridStyle(isMobile)}>
            <Input
              placeholder="Glass Type (e.g., 5MM)"
              value={filterGlassType}
              onChange={e => setFilterGlassType(e.target.value)}
              icon="🔷"
            />
            <Input
              type="text"
              placeholder="Height (e.g. 5, 5.5, 5 1/4)"
              value={filterHeight}
              onChange={e => setFilterHeight(e.target.value)}
              icon="📏"
            />
            <Input
              type="text"
              placeholder="Width (e.g. 7, 7.5, 7 3/8)"
              value={filterWidth}
              onChange={e => setFilterWidth(e.target.value)}
              icon="📐"
            />
            <Select
              value={searchUnit}
              onChange={e => setSearchUnit(e.target.value)}
              icon="📏"
            >
              <option value="MM">MM</option>
              <option value="INCH">INCH</option>
              <option value="FEET">FEET</option>
            </Select>
            <Button
              variant="secondary"
              onClick={() => {
                setFilterGlassType("");
                setFilterHeight("");
                setFilterWidth("");
                setSearchUnit("MM");
              }}
              fullWidth={isMobile}
            >
              Clear Filters
            </Button>
          </div>
        </Card>

        {/* Stock Table Card */}
        <Card style={getTableCardStyle(isMobile)}>
          <div style={tableHeader}>
            <div>
              <h3 style={tableTitle}>Stock Inventory</h3>
              <p style={tableSubtitle}>
                {filteredStock.length} {filteredStock.length === 1 ? "item" : "items"} found
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon="🔄"
              onClick={loadStock}
            >
              Refresh
            </Button>
          </div>

          <div style={tableWrapper}>
            {loading ? (
              <div style={loadingState}>
                <div style={skeletonRow}></div>
                <div style={skeletonRow}></div>
                <div style={skeletonRow}></div>
              </div>
            ) : filteredStock.length === 0 ? (
              <div style={emptyState}>
                <div style={emptyIcon}>📦</div>
                <p style={emptyText}>No stock found</p>
                <p style={emptySubtext}>
                  {filterGlassType || filterHeight || filterWidth 
                    ? "Try adjusting your filters" 
                    : "Add stock to get started"}
                </p>
              </div>
            ) : (
              <div style={tableContainer}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th>Stand</th>
                      <th>Glass Type</th>
                      <th>Thickness</th>
                      <th>Height</th>
                      <th>Width</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.map((s, i) => {
                      const isLow = s.quantity < s.minQuantity;
                      return (
                        <tr
                          key={i}
                          className={isLow ? "low-stock" : ""}
                          style={getTableRowStyle(isLow)}
                        >
                          <td>
                            <span style={standBadge}>#{s.standNo}</span>
                          </td>
                          <td style={glassTypeCell}>
                            <strong>{s.glass?.type || "N/A"}</strong>
                          </td>
                          <td>{s.glass?.thickness || "N/A"} mm</td>
                          <td>
                            {s.height || "N/A"}{" "}
                            {s.glass?.unit === "FEET" && "ft"}
                            {s.glass?.unit === "INCH" && "in"}
                            {s.glass?.unit === "MM" && "mm"}
                          </td>
                          <td>
                            {s.width || "N/A"}{" "}
                            {s.glass?.unit === "FEET" && "ft"}
                            {s.glass?.unit === "INCH" && "in"}
                            {s.glass?.unit === "MM" && "mm"}
                          </td>
                          <td>
                            <span style={getQuantityBadgeStyle(isLow)}>
                              {s.quantity}
                            </span>
                          </td>
                          <td>
                            <span style={getStatusBadgeStyle(isLow)}>
                              {isLow ? "🔴 LOW" : "✅ OK"}
                            </span>
                          </td>
                          <td>
                            <div style={actionButtonsContainer}>
                              <Button
                                variant="primary"
                                size="sm"
                                icon="➕➖"
                                onClick={() => openAddRemoveModal(s)}
                                style={{ minWidth: "auto" }}
                              >
                                {!isMobile && "Add/Remove"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                icon="🔄"
                                onClick={() => openTransferModal(s)}
                                style={{ minWidth: "auto" }}
                              >
                                {!isMobile && "Transfer"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Add/Remove Modal */}
      {showAddRemoveModal && selectedStock && (
        <div style={modalOverlay} onClick={closeAddRemoveModal}>
          <Card style={getModalCardStyle(isMobile)} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <h3 style={modalTitle}>Add/Remove Stock</h3>
                <p style={modalSubtitle}>Update stock quantity</p>
              </div>
              <button style={closeModalBtn} onClick={closeAddRemoveModal}>✕</button>
            </div>

            <div style={modalContent}>
              <Card style={stockInfoCard}>
                <h4 style={infoTitle}>Stock Details</h4>
                <div style={infoGrid}>
                  <div style={infoItem}>
                    <span style={infoLabel}>Glass Type:</span>
                    <span style={infoValue}>{selectedStock.glass?.type}</span>
                  </div>
                  <div style={infoItem}>
                    <span style={infoLabel}>Thickness:</span>
                    <span style={infoValue}>{selectedStock.glass?.thickness} mm</span>
                  </div>
                  <div style={infoItem}>
                    <span style={infoLabel}>Size:</span>
                    <span style={infoValue}>
                      {selectedStock.height} × {selectedStock.width} {selectedStock.glass?.unit || "MM"}
                    </span>
                  </div>
                  <div style={infoItem}>
                    <span style={infoLabel}>Stand No:</span>
                    <span style={infoValue}>#{selectedStock.standNo}</span>
                  </div>
                  <div style={infoItem}>
                    <span style={infoLabel}>Current Quantity:</span>
                    <span style={infoValue}>{selectedStock.quantity} units</span>
                  </div>
                </div>
              </Card>

              <Input
                label="Quantity"
                type="number"
                placeholder="Enter quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                icon="🔢"
                required
                min="1"
              />

              <div style={buttonGroup}>
                <Button
                  variant="success"
                  icon="➕"
                  fullWidth={isMobile}
                  onClick={() => updateStock("ADD")}
                >
                  Add Stock
                </Button>
                <Button
                  variant="danger"
                  icon="➖"
                  fullWidth={isMobile}
                  onClick={() => updateStock("REMOVE")}
                >
                  Remove Stock
                </Button>
              </div>

              {showUndo && (
                <Button
                  variant="outline"
                  icon="↩"
                  fullWidth
                  onClick={undoLastAction}
                >
                  Undo Last Action
                </Button>
              )}

              {stockMessage && (
                <div style={getMessageStyle(stockMessage.includes("✅"))}>
                  <span style={messageIcon}>
                    {stockMessage.includes("✅") ? "✅" : "❌"}
                  </span>
                  <span>{stockMessage.replace("✅", "").replace("❌", "").trim()}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && transferStock && (
        <div style={modalOverlay} onClick={closeTransferModal}>
          <Card style={getModalCardStyle(isMobile)} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <h3 style={modalTitle}>Transfer Stock</h3>
                <p style={modalSubtitle}>Move stock between stands</p>
              </div>
              <button style={closeModalBtn} onClick={closeTransferModal}>✕</button>
            </div>

            <div style={modalContent}>
              <Card style={stockInfoCard}>
                <h4 style={infoTitle}>Stock Details</h4>
                <div style={infoGrid}>
                  <div style={infoItem}>
                    <span style={infoLabel}>Glass Type:</span>
                    <span style={infoValue}>{transferStock.glass?.type}</span>
                  </div>
                  <div style={infoItem}>
                    <span style={infoLabel}>Thickness:</span>
                    <span style={infoValue}>{transferStock.glass?.thickness} mm</span>
                  </div>
                  <div style={infoItem}>
                    <span style={infoLabel}>Size:</span>
                    <span style={infoValue}>
                      {transferStock.height} × {transferStock.width} {transferStock.glass?.unit || "MM"}
                    </span>
                  </div>
                  <div style={infoItem}>
                    <span style={infoLabel}>From Stand:</span>
                    <span style={infoValue}>#{transferStock.standNo}</span>
                  </div>
                  <div style={infoItem}>
                    <span style={infoLabel}>Available:</span>
                    <span style={infoValue}>{transferStock.quantity} units</span>
                  </div>
                </div>
              </Card>

              <Input
                label="To Stand Number"
                type="number"
                placeholder="Enter destination stand number"
                value={toStand}
                onChange={(e) => setToStand(e.target.value)}
                icon="🏷️"
                required
                min="1"
              />

              <Input
                label="Quantity to Transfer"
                type="number"
                placeholder="Enter quantity"
                value={transferQuantity}
                onChange={(e) => setTransferQuantity(e.target.value)}
                icon="🔢"
                required
                min="1"
                helperText={`Maximum: ${transferStock.quantity} units`}
              />

              <Button
                variant="primary"
                icon="🔄"
                fullWidth
                onClick={handleTransfer}
              >
                Transfer Stock
              </Button>

              {transferMessage && (
                <div style={getMessageStyle(transferMessage && typeof transferMessage === 'string' && transferMessage.includes("✅"))}>
                  <span style={messageIcon}>
                    {transferMessage.includes("✅") ? "✅" : "❌"}
                  </span>
                  <span>{transferMessage.replace("✅", "").replace("❌", "").trim()}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Transfer Confirm Modal */}
      {showTransferConfirm && transferStock && (
        <div style={modalOverlay} onClick={() => setShowTransferConfirm(false)}>
          <Card style={getModalCardStyle(isMobile)} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <h3 style={modalTitle}>Confirm Transfer</h3>
                <p style={modalSubtitle}>Review transfer details</p>
              </div>
              <button style={closeModalBtn} onClick={() => setShowTransferConfirm(false)}>✕</button>
            </div>

            <div style={modalContent}>
              <Card style={stockInfoCard}>
                <h4 style={infoTitle}>Transfer Summary</h4>
                <div style={infoGrid}>
                  <div style={infoItem}>
                    <span style={infoLabel}>Glass Type:</span>
                    <span style={infoValue}>{transferStock.glass?.type}</span>
                  </div>
                  <div style={infoItem}>
                    <span style={infoLabel}>Size:</span>
                    <span style={infoValue}>
                      {transferStock.height} × {transferStock.width} {transferStock.glass?.unit || "MM"}
                    </span>
                  </div>
                  <div style={infoItem}>
                    <span style={infoLabel}>From Stand:</span>
                    <span style={infoValue}>#{transferStock.standNo}</span>
                  </div>
                  <div style={infoItem}>
                    <span style={infoLabel}>To Stand:</span>
                    <span style={infoValue}>#{toStand}</span>
                  </div>
                  <div style={infoItem}>
                    <span style={infoLabel}>Quantity:</span>
                    <span style={infoValue}>{transferQuantity} units</span>
                  </div>
                </div>
              </Card>

              <div style={buttonGroup}>
                <Button
                  variant="secondary"
                  fullWidth={isMobile}
                  onClick={() => {
                    setShowTransferConfirm(false);
                    setShowTransferModal(true);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  icon="✅"
                  fullWidth={isMobile}
                  onClick={confirmTransfer}
                >
                  Confirm Transfer
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Confirm Modal for Add/Remove */}
      <ConfirmModal
        show={showConfirm}
        payload={pendingPayload || {}}
        onCancel={() => setShowConfirm(false)}
        onConfirm={confirmSaveStock}
      />
    </PageWrapper>
  );
}

export default StockDashboard;

/* ================= STYLES ================= */

const getContainerStyle = (isMobile) => ({
  maxWidth: "1400px",
  margin: "0 auto",
  padding: isMobile ? "24px 16px" : "40px 24px",
  width: "100%",
});

const headerSection = {
  marginBottom: "32px",
};

const getPageTitleStyle = (isMobile) => ({
  fontSize: isMobile ? "32px" : "48px",
  fontWeight: "800",
  color: "#0f172a",
  margin: "0 0 8px 0",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
});

const pageSubtitle = {
  fontSize: "16px",
  color: "#64748b",
  margin: "0",
  fontWeight: "400",
};

const getStatsGridStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
  gap: "24px",
  marginBottom: "32px",
});

const getFilterCardStyle = (isMobile) => ({
  padding: isMobile ? "24px" : "32px",
  marginBottom: "32px",
});

const filterHeader = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  marginBottom: "24px",
};

const filterIcon = {
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

const filterTitle = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 4px 0",
};

const filterSubtitle = {
  fontSize: "14px",
  color: "#64748b",
  margin: "0",
};

const getFilterGridStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "16px",
});

const getTableCardStyle = (isMobile) => ({
  padding: isMobile ? "24px" : "32px",
});

const tableHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "24px",
  flexWrap: "wrap",
  gap: "16px",
};

const tableTitle = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 4px 0",
};

const tableSubtitle = {
  fontSize: "14px",
  color: "#64748b",
  margin: "0",
};

const tableWrapper = {
  width: "100%",
};

const tableContainer = {
  overflowX: "auto",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
};

const table = {
  width: "100%",
  minWidth: "900px",
  borderCollapse: "collapse",
  background: "#ffffff",
};

const getTableRowStyle = (isLow) => ({
  borderBottom: "1px solid #e2e8f0",
  transition: "all 0.2s ease",
  backgroundColor: isLow ? "rgba(239, 68, 68, 0.05)" : "transparent",
});

const standBadge = {
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: "8px",
  background: "linear-gradient(135deg, #667eea15, #764ba225)",
  color: "#667eea",
  fontWeight: "600",
  fontSize: "13px",
};

const glassTypeCell = {
  fontWeight: "600",
  color: "#0f172a",
};

const getQuantityBadgeStyle = (isLow) => ({
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: "8px",
  fontWeight: "600",
  fontSize: "14px",
  background: isLow ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)",
  color: isLow ? "#dc2626" : "#16a34a",
});

const getStatusBadgeStyle = (isLow) => ({
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: "8px",
  fontWeight: "600",
  fontSize: "12px",
  background: isLow ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)",
  color: isLow ? "#dc2626" : "#16a34a",
});

const actionButtonsContainer = {
  display: "flex",
  gap: "8px",
  justifyContent: "center",
  flexWrap: "wrap",
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
  fontSize: "18px",
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
  gap: "12px",
  padding: "20px",
};

const skeletonRow = {
  height: "60px",
  borderRadius: "8px",
  background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite",
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0, 0, 0, 0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 10000,
  backdropFilter: "blur(4px)",
  padding: "20px",
};

const getModalCardStyle = (isMobile) => ({
  width: "100%",
  maxWidth: "500px",
  maxHeight: "90vh",
  overflowY: "auto",
  padding: isMobile ? "24px" : "32px",
  animation: "fadeIn 0.3s ease-out",
});

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "24px",
  paddingBottom: "20px",
  borderBottom: "1px solid #e2e8f0",
};

const modalTitle = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 4px 0",
};

const modalSubtitle = {
  fontSize: "14px",
  color: "#64748b",
  margin: "0",
};

const closeModalBtn = {
  background: "transparent",
  border: "none",
  fontSize: "24px",
  color: "#64748b",
  cursor: "pointer",
  padding: "4px 8px",
  borderRadius: "8px",
  transition: "all 0.2s ease",
  width: "32px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalContent = {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const stockInfoCard = {
  background: "#f8fafc",
  padding: "20px",
  border: "1px solid #e2e8f0",
};

const infoTitle = {
  fontSize: "16px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 16px 0",
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
};

const infoItem = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "8px 0",
  borderBottom: "1px solid #e2e8f0",
};

const infoLabel = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#475569",
};

const infoValue = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#0f172a",
};

const buttonGroup = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const getMessageStyle = (isSuccess) => ({
  padding: "16px",
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
