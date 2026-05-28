import { useState, useEffect } from "react";
import PageWrapper from "../components/PageWrapper";
import { Card, Button, Input, Select } from "../components/ui";
import api from "../api/api";
import ConfirmModal from "../components/ConfirmModal";
import { motion } from "framer-motion";
import { 
  PackageSearch, Ruler, Maximize2, Hash, Layers, 
  Settings2, PlusCircle, MinusCircle, RotateCcw, 
  CheckCircle2, XCircle, Info
} from "lucide-react";

function StockManager() {
  const [glassType, setGlassType] = useState("");
  const [thickness, setThickness] = useState("");
  const [standNo, setStandNo] = useState("");
  const [quantity, setQuantity] = useState("");
  const [stockMessage, setStockMessage] = useState("");
  const [glassTypeMode, setGlassTypeMode] = useState("SELECT");
  const [manualGlassType, setManualGlassType] = useState("");
  const [thicknessMode, setThicknessMode] = useState("SELECT");
  const [manualThickness, setManualThickness] = useState("");
  const [thicknessFocused, setThicknessFocused] = useState(false);
  const [height, setHeight] = useState("");
  const [width, setWidth] = useState("");
  const [unit, setUnit] = useState("MM");
  const [hsnNo, setHsnNo] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [showUndo, setShowUndo] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const defaultGlassTypeOptions = [
    "Plan", "Extra Clear", "Grey Tinted", "Brown Tinted", "One Way", 
    "Star", "Karakachi", "Bajari", "Diomand", "Mirror"
  ];

  const [customGlassTypes, setCustomGlassTypes] = useState(() => {
    try {
      const saved = localStorage.getItem("customGlassTypes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allGlassTypeOptions = [...defaultGlassTypeOptions, ...customGlassTypes];

  useEffect(() => {
    try {
      localStorage.setItem("customGlassTypes", JSON.stringify(customGlassTypes));
    } catch (error) {
      console.error("Failed to save custom glass types:", error);
    }
  }, [customGlassTypes]);

  const addCustomGlassType = (type) => {
    if (type && type.trim() && !allGlassTypeOptions.includes(type.trim())) {
      setCustomGlassTypes([...customGlassTypes, type.trim()]);
    }
  };

  const removeCustomGlassType = (typeToRemove) => {
    setCustomGlassTypes(customGlassTypes.filter(type => type !== typeToRemove));
    if (glassType === typeToRemove) {
      setGlassType("");
    }
  };

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

    const finalGlassType = glassTypeMode === "SELECT" ? glassType : (manualGlassType || "").trim();
    if (!finalGlassType) {
      setStockMessage("❌ Please select or enter glass type");
      return;
    }

    if (thicknessMode === "SELECT" && !thickness) {
      setStockMessage("❌ Please select thickness");
      return;
    }

    if (thicknessMode === "MANUAL" && !manualThickness) {
      setStockMessage("❌ Please enter manual thickness");
      return;
    }

    const thicknessValue = thicknessMode === "SELECT" 
      ? parseFloat(thickness) 
      : parseFloat(manualThickness);
    
    if (glassTypeMode === "MANUAL" && finalGlassType) {
      addCustomGlassType(finalGlassType);
    }

    const payload = {
      standNo: Number(standNo),
      quantity: Number(quantity),
      action,
      glassType: finalGlassType,
      thickness: thicknessValue,
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
      await api.post("/api/stock/update", pendingPayload);
      setStockMessage("✅ Stock updated successfully");
      setShowUndo(true);

      setStandNo("");
      setQuantity("");
      setHeight("");
      setWidth("");
      setManualThickness("");
      setThicknessFocused(false);
      setThickness("");
      setGlassType("");
      setManualGlassType("");
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
      const res = await api.post("/api/stock/undo");
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

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <PageWrapper>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto space-y-6 md:space-y-8"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Manage Stock</h1>
          <p className="text-slate-500 mt-1">Add or remove stock from your inventory</p>
        </div>

        <Card padding="lg" className="space-y-10">
          
          {/* Glass Type & Thickness Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Layers size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Glass Type & Thickness</h3>
                <p className="text-sm text-slate-500">Configure the material properties</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Select
                label="Type Input Mode"
                value={glassTypeMode}
                onChange={e => {
                  setGlassTypeMode(e.target.value);
                  setGlassType("");
                  setManualGlassType("");
                }}
                icon={<Settings2 size={18} />}
              >
                <option value="SELECT">Select from list</option>
                <option value="MANUAL">Manual entry</option>
              </Select>

              {glassTypeMode === "SELECT" ? (
                <div className="space-y-2">
                  <Select
                    label="Glass Type"
                    value={glassType}
                    onChange={e => setGlassType(e.target.value)}
                    icon={<Layers size={18} />}
                    required
                  >
                    <option value="">Select glass type</option>
                    {defaultGlassTypeOptions.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    {customGlassTypes.length > 0 && (
                      <optgroup label="--- Custom Types ---">
                        {customGlassTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </optgroup>
                    )}
                  </Select>
                  
                  {customGlassTypes.length > 0 && (
                    <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 mb-2">Custom Types:</p>
                      <div className="flex flex-wrap gap-2">
                        {customGlassTypes.map((type) => (
                          <span key={type} className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700">
                            {type}
                            <button
                              onClick={(e) => { e.preventDefault(); removeCustomGlassType(type); }}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <XCircle size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    label="Custom Glass Type"
                    placeholder="Enter new glass type"
                    value={manualGlassType}
                    onChange={e => setManualGlassType(e.target.value)}
                    icon={<PlusCircle size={18} />}
                    required
                  />
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Info size={12} /> Saves automatically for future use
                  </p>
                </div>
              )}

              <Select
                label="Thickness Mode"
                value={thicknessMode} 
                onChange={e => {
                  setThicknessMode(e.target.value);
                  setThicknessFocused(false);
                }}
                icon={<Settings2 size={18} />}
              >
                <option value="SELECT">Select from list</option>
                <option value="MANUAL">Manual entry</option>
              </Select>

              {thicknessMode === "SELECT" ? (
                <Select
                  label="Thickness"
                  value={thickness}
                  onChange={e => setThickness(e.target.value)}
                  icon={<Ruler size={18} />}
                  required
                >
                  <option value="">Select thickness</option>
                  {[3.5, 4, 5, 6, 8, 10, 12, 15, 19].map(t => (
                    <option key={t} value={t}>{t} MM</option>
                  ))}
                </Select>
              ) : (
                <Input
                  label="Manual Thickness (MM)"
                  placeholder="e.g., 2"
                  value={thicknessFocused ? manualThickness : (manualThickness ? `${manualThickness} MM` : "")}
                  onChange={e => {
                    let inputVal = e.target.value.replace(/mm/gi, '').trim().replace(/[^\d.]/g, '');
                    setManualThickness(inputVal);
                  }}
                  onFocus={(e) => {
                    setThicknessFocused(true);
                    let inputVal = e.target.value.replace(/mm/gi, '').trim().replace(/[^\d.]/g, '');
                    setManualThickness(inputVal);
                  }}
                  onBlur={(e) => {
                    setThicknessFocused(false);
                    let inputVal = e.target.value.replace(/mm/gi, '').trim().replace(/[^\d.]/g, '');
                    setManualThickness(inputVal && !isNaN(parseFloat(inputVal)) ? inputVal : "");
                  }}
                  icon={<Ruler size={18} />}
                  required
                />
              )}
            </div>
          </section>

          {/* Dimensions Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Maximize2 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Dimensions</h3>
                <p className="text-sm text-slate-500">Enter glass measurements</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Select label="Unit" value={unit} onChange={e => setUnit(e.target.value)} icon={<Ruler size={18} />}>
                <option value="MM">MM (Millimeters)</option>
                <option value="INCH">INCH (Inches)</option>
                <option value="FEET">FEET (Feet)</option>
              </Select>
              
              <Input
                label={`Height (${unit})`}
                placeholder={getPlaceholder("height", unit)}
                value={height}
                onChange={e => setHeight(e.target.value)}
                icon={<Maximize2 size={18} className="rotate-90" />}
                required
              />
              
              <Input
                label={`Width (${unit})`}
                placeholder={getPlaceholder("width", unit)}
                value={width}
                onChange={e => setWidth(e.target.value)}
                icon={<Maximize2 size={18} />}
                required
              />
            </div>
          </section>

          {/* Stock Details Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <PackageSearch size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Stock Location & Quantity</h3>
                <p className="text-sm text-slate-500">Where is it and how many?</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Stand Number"
                type="number"
                placeholder="Enter stand number"
                value={standNo}
                onChange={e => setStandNo(e.target.value)}
                icon={<Hash size={18} />}
                required
              />
              <Input
                label="Quantity"
                type="number"
                placeholder="Enter quantity"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                icon={<Layers size={18} />}
                required
              />
            </div>
          </section>

          {/* Additional Info */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Info size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Additional Information</h3>
                <p className="text-sm text-slate-500">Optional details for billing</p>
              </div>
            </div>

            <div className="md:w-1/2">
              <Input
                label="HSN Code"
                placeholder="e.g., 7003, 7004"
                value={hsnNo}
                onChange={e => setHsnNo(e.target.value)}
                icon={<Hash size={18} />}
                helperText="HSN code for GST billing (optional)"
              />
            </div>
          </section>

          {/* Actions */}
          <div className="pt-8 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="success"
                size="lg"
                icon={<PlusCircle size={20} />}
                fullWidth={isMobile}
                onClick={() => updateStock("ADD")}
                className="flex-1"
              >
                Add Stock
              </Button>
              <Button
                variant="danger"
                size="lg"
                icon={<MinusCircle size={20} />}
                fullWidth={isMobile}
                onClick={() => updateStock("REMOVE")}
                className="flex-1"
              >
                Remove Stock
              </Button>
            </div>

            {showUndo && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                <Button variant="outline" size="md" icon={<RotateCcw size={18} />} fullWidth onClick={undoLastAction}>
                  Undo Last Action
                </Button>
              </motion.div>
            )}

            {/* Message Alert */}
            {stockMessage && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                className={`mt-6 p-4 rounded-xl border flex items-center gap-3 ${
                  stockMessage.includes("✅") 
                    ? "bg-green-50 border-green-200 text-green-700" 
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                {stockMessage.includes("✅") ? <CheckCircle2 className="shrink-0" /> : <XCircle className="shrink-0" />}
                <p className="font-medium">{stockMessage.replace(/[✅❌]/g, "").trim()}</p>
              </motion.div>
            )}
          </div>
        </Card>
      </motion.div>

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
