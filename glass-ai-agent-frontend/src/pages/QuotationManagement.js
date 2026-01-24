import { useState, useEffect } from "react";
import PageWrapper from "../components/PageWrapper";
import { PageHeader, Button } from "../components/ui";
import dashboardBg from "../assets/dashboard-bg.jpg";
import {
  getCustomers,
  createCustomer,
  getQuotations,
  createQuotation,
  confirmQuotation,
  getQuotationById,
  getAllStock,
  deleteQuotation,
  downloadQuotationPdf,
  printCuttingPad,
} from "../api/quotationApi";
import "../styles/design-system.css";

function QuotationManagement() {
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [allStock, setAllStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showStockDropdown, setShowStockDropdown] = useState({});
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'CONFIRM'|'REJECT'|'DELETE', quotationId: number, quotationNumber: string }
  const [rejectionReason, setRejectionReason] = useState("");

  const getDefaultValidUntil = (quotationDate) => {
    if (!quotationDate) return "";
    const date = new Date(quotationDate);
    date.setDate(date.getDate() + 15);
    return date.toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState({
    customerSelectionMode: "SELECT_FROM_LIST", // "SELECT_FROM_LIST" or "MANUAL"
    customerId: "",
    manualCustomerName: "",
    manualCustomerMobile: "",
    manualCustomerEmail: "",
    manualCustomerAddress: "",
    billingType: "GST",
    quotationDate: new Date().toISOString().split("T")[0],
    validUntil: getDefaultValidUntil(new Date().toISOString().split("T")[0]),
    gstPercentage: 18,
    customerState: "",
    installationCharge: 0,
    transportCharge: 0,
    transportationRequired: false,
    discount: 0,
    items: [
      {
        glassType: "",
        thickness: "",
        height: "",
        width: "",
        heightUnit: "FEET",
        widthUnit: "FEET",
        quantity: 1,
        ratePerSqft: "",
        design: "",
        hsnCode: "",
        description: "",
        // New fields for quotation features
        sizeInMM: false, // Toggle for MM/INCH mode
        heightUnit: "INCH", // Default to INCH
        widthUnit: "INCH", // Default to INCH
        heightTableNumber: 6, // Default table number for height
        widthTableNumber: 6, // Default table number for width
        selectedHeightTableValue: null, // Selected value from height table
        selectedWidthTableValue: null, // Selected value from width table
        polishSelection: [
          { side: "Height 1", checked: false, type: null, rate: 0 },
          { side: "Width 1", checked: false, type: null, rate: 0 },
          { side: "Height 2", checked: false, type: null, rate: 0 },
          { side: "Width 2", checked: false, type: null, rate: 0 },
        ],
        polishRates: { P: 15, H: 75, B: 75 }, // Default rates
        polish: "", // Hash-Polish or CNC Polish (per item)
        heightOriginal: "", // Store original fraction string
        widthOriginal: "", // Store original fraction string
      },
    ],
  });

  useEffect(() => {
    loadCustomers();
    loadQuotations();
    loadStock();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadStock = async () => {
    try {
      const response = await getAllStock();
      setAllStock(response.data);
    } catch (error) {
      console.error("Failed to load stock", error);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await getCustomers();
      setCustomers(response.data);
    } catch (error) {
      console.error("Failed to load customers", error);
    }
  };

  const loadQuotations = async () => {
    try {
      setLoading(true);
      const response = await getQuotations();
      setQuotations(response.data);
    } catch (error) {
      setMessage("❌ Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          glassType: "",
          thickness: "",
          height: "",
          width: "",
          heightUnit: "FEET",
          widthUnit: "FEET",
          quantity: 1,
          ratePerSqft: "",
          design: "",
          hsnCode: "",
          description: "",
          // New fields for quotation features
          sizeInMM: false,
          heightTableNumber: 6,
          widthTableNumber: 6,
          selectedHeightTableValue: null,
          selectedWidthTableValue: null,
          polishSelection: [
            { side: "Height 1", checked: false, type: null, rate: 0 },
            { side: "Width 1", checked: false, type: null, rate: 0 },
            { side: "Height 2", checked: false, type: null, rate: 0 },
            { side: "Width 2", checked: false, type: null, rate: 0 },
          ],
          polishRates: { P: 15, H: 75, B: 75 },
          polish: "",
          heightOriginal: "",
          widthOriginal: "",
        },
      ],
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const convertToFeet = (value, unit) => {
    if (!value) return 0;
    const numValue = parseFloat(value);
    switch (unit) {
      case "MM":
        return numValue / 304.8; // 1 foot = 304.8 mm
      case "INCH":
        return numValue / 12; // 1 foot = 12 inches
      case "FEET":
        return numValue;
      default:
        return numValue;
    }
  };

  const calculateAreaInUnit = (height, width, heightUnit, widthUnit) => {
    if (!height || !width) return 0;
    const h = parseFloat(height) || 0;
    const w = parseFloat(width) || 0;
    if (h === 0 || w === 0) return 0;
    
    const hUnit = heightUnit || "FEET";
    const wUnit = widthUnit || "FEET";
    
    // If both units are the same, calculate directly
    if (hUnit === wUnit) {
      return h * w;
    }
    
    // If different units, convert both to MM for consistency, then convert back to height unit
    let hInMM = h;
    let wInMM = w;
    
    if (hUnit === "FEET") hInMM = h * 304.8;
    else if (hUnit === "INCH") hInMM = h * 25.4;
    // else MM, no conversion needed
    
    if (wUnit === "FEET") wInMM = w * 304.8;
    else if (wUnit === "INCH") wInMM = w * 25.4;
    // else MM, no conversion needed
    
    const areaInMM = hInMM * wInMM;
    
    // Convert back to the primary unit (height unit) for display
    if (hUnit === "FEET") return areaInMM / (304.8 * 304.8);
    else if (hUnit === "INCH") return areaInMM / (25.4 * 25.4);
    else return areaInMM; // MM
  };

  const getAreaUnitLabel = (heightUnit, widthUnit) => {
    const unit = heightUnit || widthUnit || "FEET";
    switch (unit) {
      case "MM":
        return "SqMM";
      case "INCH":
        return "SqInch";
      case "FEET":
        return "SqFt";
      default:
        return "SqFt";
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    // Auto-calculate area and subtotal
    if (field === "height" || field === "width" || field === "heightUnit" || field === "widthUnit") {
      // Calculate area in the input unit for display
      const heightValue = parseFraction(item.height || 0);
      const widthValue = parseFraction(item.width || 0);
      const areaInUnit = calculateAreaInUnit(
        newItems[index].height,
        newItems[index].width,
        newItems[index].heightUnit || "FEET",
        newItems[index].widthUnit || "FEET"
      );
      item.area = areaInUnit;
      
      // For subtotal calculation, we need area in feet (since rate is per SqFt)
      const heightInFeet = convertToFeet(newItems[index].height || 0, newItems[index].heightUnit || "FEET");
      const widthInFeet = convertToFeet(newItems[index].width || 0, newItems[index].widthUnit || "FEET");
      const areaInFeet = heightInFeet * widthInFeet;
      const rate = parseFloat(item.ratePerSqft) || 0;
      const qty = parseInt(item.quantity) || 0;
      item.subtotal = areaInFeet * rate * qty;
    }

    if (field === "ratePerSqft" || field === "quantity") {
      // Recalculate subtotal when rate or quantity changes
      const heightInFeet = convertToFeet(newItems[index].height || 0, newItems[index].heightUnit || "FEET");
      const widthInFeet = convertToFeet(newItems[index].width || 0, newItems[index].widthUnit || "FEET");
      const areaInFeet = heightInFeet * widthInFeet;
      const rate = parseFloat(newItems[index].ratePerSqft) || 0;
      const qty = parseInt(newItems[index].quantity) || 0;
      newItems[index].subtotal = areaInFeet * rate * qty;
    }
    
    setFormData({ ...formData, items: newItems });
  };

  // Handle polish selection checkbox toggle
  const handlePolishCheckboxChange = (itemIndex, polishIndex, checked) => {
    const newItems = [...formData.items];
    if (newItems[itemIndex].polishSelection && newItems[itemIndex].polishSelection[polishIndex]) {
      newItems[itemIndex].polishSelection[polishIndex].checked = checked;
      // If unchecking, also clear the type
      if (!checked) {
        newItems[itemIndex].polishSelection[polishIndex].type = null;
      }
    }
    setFormData({ ...formData, items: newItems });
  };

  // Handle polish type radio button selection
  const handlePolishTypeChange = (itemIndex, polishIndex, type) => {
    const newItems = [...formData.items];
    if (newItems[itemIndex].polishSelection && newItems[itemIndex].polishSelection[polishIndex]) {
      newItems[itemIndex].polishSelection[polishIndex].type = type;
      newItems[itemIndex].polishSelection[polishIndex].checked = true;
    }
    setFormData({ ...formData, items: newItems });
  };

  // Handle "Select All" for polish types
  const handlePolishSelectAll = (itemIndex, type) => {
    const newItems = [...formData.items];
    if (newItems[itemIndex].polishSelection) {
      newItems[itemIndex].polishSelection = newItems[itemIndex].polishSelection.map(p => ({
        ...p,
        checked: true,
        type: type,
      }));
    }
    setFormData({ ...formData, items: newItems });
  };

  // Handle table value click selection
  const handleTableValueClick = (itemIndex, dimension, value) => {
    const newItems = [...formData.items];
    if (dimension === "height") {
      newItems[itemIndex].selectedHeightTableValue = value;
      newItems[itemIndex].height = value.toString();
      newItems[itemIndex].heightOriginal = value.toString();
    } else if (dimension === "width") {
      newItems[itemIndex].selectedWidthTableValue = value;
      newItems[itemIndex].width = value.toString();
      newItems[itemIndex].widthOriginal = value.toString();
    }
    
    // Update polish selection if both values are set
    if (newItems[itemIndex].selectedHeightTableValue && newItems[itemIndex].selectedWidthTableValue) {
      newItems[itemIndex].polishSelection = initializePolishSelection(
        newItems[itemIndex].selectedHeightTableValue,
        newItems[itemIndex].selectedWidthTableValue
      );
    }
    
    // Recalculate area and subtotal
    const item = newItems[itemIndex];
    const heightInFeet = convertToFeet(item.height || 0, item.heightUnit || "INCH");
    const widthInFeet = convertToFeet(item.width || 0, item.widthUnit || "INCH");
    const areaInFeet = heightInFeet * widthInFeet;
    const rate = parseFloat(item.ratePerSqft) || 0;
    const qty = parseInt(item.quantity) || 0;
    item.subtotal = areaInFeet * rate * qty;
    item.area = calculateAreaInUnit(item.height, item.width, item.heightUnit || "INCH", item.widthUnit || "INCH");

    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    let finalCustomerId = formData.customerId;

    // If manual mode, create customer first
    if (formData.customerSelectionMode === "MANUAL") {
      if (!formData.manualCustomerName || !formData.manualCustomerMobile) {
        setMessage("❌ Please provide customer name and mobile number");
        return;
      }
      try {
        const customerResponse = await createCustomer({
          name: formData.manualCustomerName,
          mobile: formData.manualCustomerMobile,
          email: formData.manualCustomerEmail || null,
          address: formData.manualCustomerAddress || null,
        });
        finalCustomerId = customerResponse.data.id;
        // Reload customers list
        await loadCustomers();
      } catch (error) {
        setMessage("❌ Failed to create customer. Please try again.");
        return;
      }
    } else {
      if (!formData.customerId) {
        setMessage("❌ Please select a customer");
        return;
      }
    }

    if (formData.items.length === 0) {
      setMessage("❌ Please add at least one item");
      return;
    }

    if (formData.billingType === "GST" && !formData.gstPercentage) {
      setMessage("❌ GST percentage is required for GST billing");
      return;
    }

    try {
      const payload = {
        ...formData,
        customerId: finalCustomerId,
        transportationRequired: formData.transportationRequired || false,
        items: formData.items.map((item) => {
          // Parse height/width (handle fractions)
          const heightValue = parseFraction(item.height || 0);
          const widthValue = parseFraction(item.width || 0);
          
          // Calculate area in the input unit for storage
          const areaInUnit = calculateAreaInUnit(
            item.height,
            item.width,
            item.heightUnit || "FEET",
            item.widthUnit || "FEET"
          );
          
          // Convert to feet for rate calculation (rate is per SqFt)
          const heightInFeet = convertToFeet(item.height, item.heightUnit || "FEET");
          const widthInFeet = convertToFeet(item.width, item.widthUnit || "FEET");
          const areaInFeet = heightInFeet * widthInFeet;
          const subtotal = areaInFeet * parseFloat(item.ratePerSqft || 0) * parseInt(item.quantity || 1);

          return {
            ...item,
            height: parseFloat(item.height),
            width: parseFloat(item.width),
            quantity: parseInt(item.quantity),
            ratePerSqft: parseFloat(item.ratePerSqft),
            area: areaInFeet, // Store area in feet for backend (since rate is per SqFt)
            subtotal: subtotal,
            heightUnit: item.heightUnit || "FEET",
            widthUnit: item.widthUnit || "FEET",
          };
        }),
      };

      await createQuotation(payload);
      setMessage("✅ Quotation created successfully");
      setShowForm(false);
      resetForm();
      loadQuotations();
    } catch (error) {
      setMessage("❌ Failed to create quotation");
    }
  };

  const handleConfirm = async (quotationId, action) => {
    try {
      if (action === "REJECTED" && !rejectionReason.trim()) {
        setMessage("❌ Please provide a rejection reason");
        return;
      }
      await confirmQuotation(quotationId, {
        action: action,
        rejectionReason: action === "REJECTED" ? rejectionReason : null,
      });
      setMessage("✅ Quotation " + (action === "CONFIRMED" ? "confirmed" : "rejected"));
      setConfirmAction(null);
      setRejectionReason("");
      loadQuotations();
    } catch (error) {
      setMessage("❌ Failed to update quotation");
      setConfirmAction(null);
      setRejectionReason("");
    }
  };

  const handleDelete = async (quotationId) => {
    try {
      await deleteQuotation(quotationId);
      setMessage("✅ Quotation deleted successfully");
      setConfirmAction(null);
      loadQuotations();
    } catch (error) {
      setMessage("❌ Failed to delete quotation");
      setConfirmAction(null);
    }
  };

  const showConfirmDialog = (type, quotation) => {
    setConfirmAction({
      type,
      quotationId: quotation.id,
      quotationNumber: quotation.quotationNumber,
      customerName: quotation.customerName,
    });
    setRejectionReason(""); // Reset rejection reason when opening modal
  };

  const handleView = async (id) => {
    try {
      const response = await getQuotationById(id);
      setSelectedQuotation(response.data);
    } catch (error) {
      setMessage("❌ Failed to load quotation details");
    }
  };

  const resetForm = () => {
    const today = new Date().toISOString().split("T")[0];
    setFormData({
      customerSelectionMode: "SELECT_FROM_LIST",
      customerId: "",
      manualCustomerName: "",
      manualCustomerMobile: "",
      manualCustomerEmail: "",
      manualCustomerAddress: "",
      billingType: "GST",
      quotationDate: today,
      validUntil: getDefaultValidUntil(today),
      gstPercentage: 18,
      customerState: "",
      installationCharge: 0,
      transportCharge: 0,
      transportationRequired: false,
      discount: 0,
      items: [
        {
          glassType: "",
          thickness: "",
          height: "",
          width: "",
          heightUnit: "INCH",
          widthUnit: "INCH",
          quantity: 1,
          ratePerSqft: "",
          design: "",
          hsnCode: "",
          description: "",
          // New fields for quotation features
          sizeInMM: false,
          heightTableNumber: 6,
          widthTableNumber: 6,
          selectedHeightTableValue: null,
          selectedWidthTableValue: null,
          polishSelection: [
            { side: "Height 1", checked: false, type: null, rate: 0 },
            { side: "Width 1", checked: false, type: null, rate: 0 },
            { side: "Height 2", checked: false, type: null, rate: 0 },
            { side: "Width 2", checked: false, type: null, rate: 0 },
          ],
          polishRates: { P: 15, H: 75, B: 75 },
          polish: "",
          heightOriginal: "",
          widthOriginal: "",
        },
      ],
    });
  };

  const getStatusBadge = (status) => {
    const colors = {
      DRAFT: "#757575",
      SENT: "#2196f3",
      CONFIRMED: "#4caf50",
      REJECTED: "#f44336",
      EXPIRED: "#ff9800",
    };
    return (
      <span
        style={{
          padding: "4px 8px",
          borderRadius: "4px",
          backgroundColor: colors[status] || "#757575",
          color: "white",
          fontSize: "12px",
        }}
      >
        {status}
      </span>
    );
  };

  const getAvailableGlassTypes = () => {
    const glassTypes = new Set();
    allStock.forEach((stock) => {
      if (stock.glass?.type) {
        glassTypes.add(stock.glass.type);
      }
    });
    return Array.from(glassTypes).sort();
  };

  const getStockForGlassType = (glassType) => {
    return allStock.filter((stock) => stock.glass?.type === glassType);
  };

  const handleGlassTypeSelect = (index, glassType, stockItem) => {
    const newItems = [...formData.items];
    newItems[index].glassType = glassType;
    if (stockItem?.glass?.thickness) {
      newItems[index].thickness = `${stockItem.glass.thickness}${stockItem.glass.unit || "MM"}`;
    }
    setFormData({ ...formData, items: newItems });
    setShowStockDropdown({ ...showStockDropdown, [index]: false });
  };

  return (
    <PageWrapper backgroundImage={dashboardBg}>
      <div style={{ padding: isMobile ? "15px" : "20px", maxWidth: "1400px", margin: "0 auto" }}>
        <PageHeader
          icon="📄"
          title="Quotation Management"
          subtitle="Create and manage quotations for your customers"
          breadcrumbs={["Dashboard", "Billing", "Quotations"]}
          isMobile={isMobile}
          gradient={false}
          actions={
            <Button
              variant="primary"
              icon="➕"
              onClick={() => {
                setShowForm(true);
                resetForm();
              }}
            >
              Create Quotation
            </Button>
          }
        />

        {message && (
          <div
            style={{
              padding: "12px 16px",
              marginBottom: "20px",
              backgroundColor: message.includes("✅") ? "#22c55e" : "#ef4444",
              color: "white",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              boxShadow: "0 2px 4px -1px rgba(0, 0, 0, 0.1)",
            }}
          >
            {message}
          </div>
        )}

        {showForm && (
          <div
            style={{
              backgroundColor: "white",
              padding: isMobile ? "20px" : "30px",
              borderRadius: "12px",
              marginBottom: "20px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            }}
          >
            <div style={{ marginBottom: "25px", borderBottom: "2px solid #e5e7eb", paddingBottom: "15px" }}>
              <h2 style={{ margin: 0, color: "#1f2937", fontSize: "24px", fontWeight: "600" }}>
                📄 Create New Quotation
              </h2>
              <p style={{ margin: "5px 0 0 0", color: "#6b7280", fontSize: "14px" }}>
                Fill in the details below to create a quotation for your customer
              </p>
            </div>
            <form onSubmit={handleSubmit}>
              {/* Customer & Billing Section */}
              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ color: "#374151", fontSize: "18px", fontWeight: "600", marginBottom: "15px" }}>
                  👤 Customer & Billing Information
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "25px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      Customer Selection * <span style={{ color: "#ef4444" }}>●</span>
                    </label>
                    <select
                      value={formData.customerSelectionMode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customerSelectionMode: e.target.value,
                          customerId: "",
                          manualCustomerName: "",
                          manualCustomerMobile: "",
                          manualCustomerEmail: "",
                          manualCustomerAddress: "",
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        backgroundColor: "#fff",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        marginBottom: "15px",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                    >
                      <option value="SELECT_FROM_LIST">📋 Select from List</option>
                      <option value="MANUAL">✏️ Manual Entry</option>
                    </select>

                    {formData.customerSelectionMode === "SELECT_FROM_LIST" ? (
                      <>
                        <select
                          required={formData.customerSelectionMode === "SELECT_FROM_LIST"}
                          value={formData.customerId}
                          onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            fontSize: "14px",
                            backgroundColor: "#fff",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                          onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                        >
                          <option value="">🔍 Select a customer...</option>
                          {customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name} {customer.mobile ? `(${customer.mobile})` : ""}
                            </option>
                          ))}
                        </select>
                        {customers.length === 0 && (
                          <p style={{ marginTop: "5px", color: "#f59e0b", fontSize: "12px" }}>
                            ⚠️ No customers found. Switch to "Manual Entry" to add a new customer.
                          </p>
                        )}
                      </>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "15px" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                            Name * <span style={{ color: "#ef4444" }}>●</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.manualCustomerName}
                            onChange={(e) => setFormData({ ...formData, manualCustomerName: e.target.value })}
                            placeholder="Enter customer name"
                            style={{
                              width: "100%",
                              padding: "12px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              transition: "all 0.2s",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                            Mobile * <span style={{ color: "#ef4444" }}>●</span>
                          </label>
                          <input
                            type="tel"
                            required
                            value={formData.manualCustomerMobile}
                            onChange={(e) => setFormData({ ...formData, manualCustomerMobile: e.target.value })}
                            placeholder="Enter mobile number"
                            style={{
                              width: "100%",
                              padding: "12px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              transition: "all 0.2s",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                            Email (Optional)
                          </label>
                          <input
                            type="email"
                            value={formData.manualCustomerEmail}
                            onChange={(e) => setFormData({ ...formData, manualCustomerEmail: e.target.value })}
                            placeholder="Enter email address"
                            style={{
                              width: "100%",
                              padding: "12px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              transition: "all 0.2s",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                            Address (Optional)
                          </label>
                          <input
                            type="text"
                            value={formData.manualCustomerAddress}
                            onChange={(e) => setFormData({ ...formData, manualCustomerAddress: e.target.value })}
                            placeholder="Enter address"
                            style={{
                              width: "100%",
                              padding: "12px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              transition: "all 0.2s",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      Billing Type * <span style={{ color: "#ef4444" }}>●</span>
                    </label>
                    <div
                      style={{
                        display: "flex",
                        gap: "15px",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        backgroundColor: "#f9fafb",
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          backgroundColor: formData.billingType === "GST" ? "#eef2ff" : "transparent",
                          border: formData.billingType === "GST" ? "2px solid #6366f1" : "2px solid transparent",
                          transition: "all 0.2s",
                          flex: 1,
                        }}
                      >
                        <input
                          type="radio"
                          value="GST"
                          checked={formData.billingType === "GST"}
                          onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
                          style={{ cursor: "pointer" }}
                        />
                        <span style={{ fontWeight: formData.billingType === "GST" ? "600" : "400" }}>💰 GST</span>
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          backgroundColor: formData.billingType === "NON_GST" ? "#eef2ff" : "transparent",
                          border: formData.billingType === "NON_GST" ? "2px solid #6366f1" : "2px solid transparent",
                          transition: "all 0.2s",
                          flex: 1,
                        }}
                      >
                        <input
                          type="radio"
                          value="NON_GST"
                          checked={formData.billingType === "NON_GST"}
                          onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
                          style={{ cursor: "pointer" }}
                        />
                        <span style={{ fontWeight: formData.billingType === "NON_GST" ? "600" : "400" }}>💵 Non-GST</span>
                      </label>
                    </div>
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>
                      {formData.billingType === "GST"
                        ? "ℹ️ GST billing includes tax calculations (CGST/SGST or IGST)"
                        : "ℹ️ Non-GST billing - no tax calculations"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dates Section */}
              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ color: "#374151", fontSize: "18px", fontWeight: "600", marginBottom: "15px" }}>
                  📅 Quotation Dates
                </h3>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "25px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                        Quotation Date * <span style={{ color: "#ef4444" }}>●</span>
                      </label>
                    <input
                      type="date"
                      required
                      value={formData.quotationDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setFormData({
                          ...formData,
                          quotationDate: newDate,
                          validUntil: getDefaultValidUntil(newDate),
                        });
                      }}
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        transition: "all 0.2s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                    />
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>📌 Date when quotation is created</p>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      Valid Until (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                      placeholder="Select expiry date"
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        transition: "all 0.2s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                    />
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>📌 Quotation expiry date (optional)</p>
                  </div>
                </div>
              </div>

              {/* GST Fields (Conditional) */}
              {formData.billingType === "GST" && (
                <div style={{ marginBottom: "30px", padding: "20px", backgroundColor: "#f0f9ff", borderRadius: "8px", border: "1px solid #bae6fd" }}>
                  <h3 style={{ color: "#374151", fontSize: "18px", fontWeight: "600", marginBottom: "15px" }}>
                    🧾 GST Information
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "25px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                        GST Percentage (%) * <span style={{ color: "#ef4444" }}>●</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.gstPercentage}
                        onChange={(e) => setFormData({ ...formData, gstPercentage: parseFloat(e.target.value) })}
                        placeholder="e.g., 18 for 18%"
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                          fontSize: "14px",
                          transition: "all 0.2s",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                        onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                      />
                      <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>💡 Common: 5%, 12%, 18%, 28%</p>
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                        Customer State (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.customerState}
                        onChange={(e) => setFormData({ ...formData, customerState: e.target.value })}
                        placeholder="e.g., Maharashtra, Karnataka"
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                          fontSize: "14px",
                          transition: "all 0.2s",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                        onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                      />
                      <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>📍 For inter-state vs intra-state calculation</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Charges */}
              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ color: "#374151", fontSize: "18px", fontWeight: "600", marginBottom: "15px" }}>
                  💰 Additional Charges (Optional)
                </h3>
                <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f0f9ff", borderRadius: "8px", border: "1px solid #bae6fd" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                    <input
                      type="checkbox"
                      checked={formData.transportationRequired}
                      onChange={(e) => setFormData({ ...formData, transportationRequired: e.target.checked })}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <span>🚚 Customer Requires Transportation</span>
                  </label>
                  <p style={{ margin: "5px 0 0 28px", color: "#6b7280", fontSize: "12px" }}>
                    Check if customer needs transportation/delivery service
                  </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: "25px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      Installation Charge (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.installationCharge === 0 ? "" : formData.installationCharge}
                      onChange={(e) => setFormData({ ...formData, installationCharge: parseFloat(e.target.value) || 0 })}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#6366f1";
                        if (e.target.value === "0" || e.target.value === "") {
                          e.target.value = "";
                        }
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#d1d5db";
                        if (e.target.value === "" || e.target.value === "0") {
                          setFormData({ ...formData, installationCharge: 0 });
                        }
                      }}
                      placeholder="0.00"
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                      }}
                    />
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>💰 Installation service charge</p>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      Transport Charge (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.transportCharge === 0 ? "" : formData.transportCharge}
                      onChange={(e) => setFormData({ ...formData, transportCharge: parseFloat(e.target.value) || 0 })}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#6366f1";
                        if (e.target.value === "0" || e.target.value === "") {
                          e.target.value = "";
                        }
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#d1d5db";
                        if (e.target.value === "" || e.target.value === "0") {
                          setFormData({ ...formData, transportCharge: 0 });
                        }
                      }}
                      placeholder="0.00"
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                      }}
                    />
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>🚚 Transportation/delivery charge</p>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      Discount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discount === 0 ? "" : formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#6366f1";
                        if (e.target.value === "0" || e.target.value === "") {
                          e.target.value = "";
                        }
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#d1d5db";
                        if (e.target.value === "" || e.target.value === "0") {
                          setFormData({ ...formData, discount: 0 });
                        }
                      }}
                      placeholder="0.00"
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                      }}
                    />
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>🎁 Discount amount (if any)</p>
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div style={{ marginBottom: "30px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h3 style={{ color: "#374151", fontSize: "18px", fontWeight: "600", margin: 0 }}>
                    📦 Quotation Items
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#6366f1",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.target.style.backgroundColor = "#4f46e5")}
                    onMouseOut={(e) => (e.target.style.backgroundColor = "#6366f1")}
                  >
                    ➕ Add Item
                  </button>
                </div>
                <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>
                  Add glass items to your quotation. Area and subtotal are calculated automatically.
                </p>

                {formData.items.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      border: "2px solid #e5e7eb",
                      padding: "25px",
                      marginBottom: "20px",
                      borderRadius: "12px",
                      backgroundColor: "#fafafa",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#6366f1";
                      e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            backgroundColor: "#6366f1",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "600",
                            fontSize: "14px",
                          }}
                        >
                          {index + 1}
                        </div>
                        <strong style={{ color: "#1f2937", fontSize: "16px" }}>Item {index + 1}</strong>
                      </div>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          style={{
                            padding: "8px 16px",
                            backgroundColor: "#ef4444",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "500",
                            transition: "all 0.2s",
                          }}
                          onMouseOver={(e) => (e.target.style.backgroundColor = "#dc2626")}
                          onMouseOut={(e) => (e.target.style.backgroundColor = "#ef4444")}
                        >
                          🗑️ Remove
                        </button>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                      <div style={{ position: "relative" }}>
                        <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                          Glass Type * <span style={{ color: "#ef4444" }}>●</span>
                        </label>
                        <div style={{ position: "relative" }}>
                          <input
                            type="text"
                            required
                            value={item.glassType}
                            onChange={(e) => handleItemChange(index, "glassType", e.target.value)}
                            onFocus={() => setShowStockDropdown({ ...showStockDropdown, [index]: true })}
                            placeholder="Click to select from available stock..."
                            style={{
                              width: "100%",
                              padding: "12px",
                              paddingRight: "40px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              transition: "all 0.2s",
                              boxSizing: "border-box",
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = "#6366f1";
                              setShowStockDropdown({ ...showStockDropdown, [index]: true });
                            }}
                            onBlur={(e) => {
                              setTimeout(() => {
                                e.target.style.borderColor = "#d1d5db";
                                setShowStockDropdown({ ...showStockDropdown, [index]: false });
                              }, 200);
                            }}
                          />
                          <span
                            style={{
                              position: "absolute",
                              right: "12px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              fontSize: "18px",
                              cursor: "pointer",
                            }}
                            onClick={() => setShowStockDropdown({ ...showStockDropdown, [index]: !showStockDropdown[index] })}
                          >
                            📦
                          </span>
                        </div>
                        {showStockDropdown[index] && (
                          <div
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              right: 0,
                              zIndex: 1000,
                              backgroundColor: "white",
                              border: "2px solid #6366f1",
                              borderRadius: "8px",
                              marginTop: "4px",
                              maxHeight: "300px",
                              overflowY: "auto",
                              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                            }}
                          >
                            <div style={{ padding: "8px 12px", backgroundColor: "#f3f4f6", borderBottom: "1px solid #e5e7eb", fontWeight: "600", fontSize: "12px", color: "#6b7280" }}>
                              Available Stock ({getAvailableGlassTypes().length} types)
                            </div>
                            {getAvailableGlassTypes().length === 0 ? (
                              <div style={{ padding: "16px", textAlign: "center", color: "#9ca3af", fontSize: "14px" }}>
                                No stock available
                              </div>
                            ) : (
                              getAvailableGlassTypes().map((glassType) => {
                                const stockItems = getStockForGlassType(glassType);
                                const totalQty = stockItems.reduce((sum, s) => sum + (s.quantity || 0), 0);
                                return (
                                  <div
                                    key={glassType}
                                    style={{
                                      padding: "12px",
                                      borderBottom: "1px solid #e5e7eb",
                                      cursor: "pointer",
                                      transition: "background-color 0.2s",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                                    onClick={() => handleGlassTypeSelect(index, glassType, stockItems[0])}
                                  >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <div>
                                        <div style={{ fontWeight: "600", color: "#1f2937", fontSize: "14px" }}>{glassType}</div>
                                        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                                          {stockItems.length} {stockItems.length === 1 ? "entry" : "entries"} • Total Qty: {totalQty}
                                        </div>
                                      </div>
                                      <span style={{ fontSize: "20px" }}>✓</span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                        <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>📦 Click to select from available stock</p>
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                          Thickness (Optional)
                        </label>
                        <input
                          type="text"
                          value={item.thickness}
                          onChange={(e) => handleItemChange(index, "thickness", e.target.value)}
                          placeholder="e.g., 5MM, 8MM"
                          style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            fontSize: "14px",
                            transition: "all 0.2s",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                          onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                          Height * <span style={{ color: "#ef4444" }}>●</span>
                        </label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={item.height}
                            onChange={(e) => handleItemChange(index, "height", e.target.value)}
                            placeholder="e.g., 6.5"
                            style={{
                            width: "100%",
                              padding: "12px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              transition: "all 0.2s",
                              boxSizing: "border-box",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                          />
                          <select
                            value={item.heightUnit || "FEET"}
                            onChange={(e) => handleItemChange(index, "heightUnit", e.target.value)}
                            style={{
                              padding: "12px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              backgroundColor: "#fff",
                              cursor: "pointer",
                              transition: "all 0.2s",
                              minWidth: "100px",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                          >
                            <option value="MM">MM</option>
                            <option value="INCH">Inch</option>
                            <option value="FEET">Feet</option>
                          </select>
                        </div>
                        <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "11px" }}>📏 Height measurement</p>
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                          Width * <span style={{ color: "#ef4444" }}>●</span>
                        </label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={item.width}
                            onChange={(e) => handleItemChange(index, "width", e.target.value)}
                            placeholder="e.g., 4.0"
                            style={{
                            width: "100%",
                              padding: "12px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              transition: "all 0.2s",
                              boxSizing: "border-box",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                          />
                          <select
                            value={item.widthUnit || "FEET"}
                            onChange={(e) => handleItemChange(index, "widthUnit", e.target.value)}
                            style={{
                              padding: "12px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              backgroundColor: "#fff",
                              cursor: "pointer",
                              transition: "all 0.2s",
                              minWidth: "100px",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                          >
                            <option value="MM">MM</option>
                            <option value="INCH">Inch</option>
                            <option value="FEET">Feet</option>
                          </select>
                        </div>
                        <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "11px" }}>📏 Width measurement</p>
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                          Quantity * <span style={{ color: "#ef4444" }}>●</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                          placeholder="e.g., 2"
                          style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            fontSize: "14px",
                            transition: "all 0.2s",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                          onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                        />
                        <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "11px" }}>🔢 Number of pieces</p>
                      </div>
                      <div style={{ gridColumn: isMobile ? "1" : "2 / 3", marginTop: "20px" }}>
                        <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                          Rate per SqFt (₹) * <span style={{ color: "#ef4444" }}>●</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={item.ratePerSqft}
                          onChange={(e) => handleItemChange(index, "ratePerSqft", e.target.value)}
                          placeholder="e.g., 50.00"
                          style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            fontSize: "14px",
                            transition: "all 0.2s",
                            boxSizing: "border-box",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                          onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                        />
                        <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "11px" }}>💰 Price per square foot</p>
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                          Design (Optional)
                        </label>
                        <select
                          value={item.design || ""}
                          onChange={(e) => handleItemChange(index, "design", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            fontSize: "14px",
                            backgroundColor: "#fff",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            boxSizing: "border-box",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                          onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                        >
                          <option value="">Select Design</option>
                          <option value="POLISH">1. Polish</option>
                          <option value="BEVELING">2. Beveling</option>
                          <option value="HALF_ROUND">3. Half Round</option>
                        </select>
                        <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "11px" }}>✨ Select glass edge design type</p>
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                          Area ({getAreaUnitLabel(item.heightUnit, item.widthUnit)}) 🔒
                        </label>
                        <input
                          type="number"
                          readOnly
                          value={
                            calculateAreaInUnit(
                              item.height || 0,
                              item.width || 0,
                              item.heightUnit || "INCH",
                              item.widthUnit || "INCH"
                            ).toFixed(2) || "0.00"
                          }
                          style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            fontSize: "14px",
                            backgroundColor: "#f3f4f6",
                            color: "#6b7280",
                            cursor: "not-allowed",
                            boxSizing: "border-box",
                          }}
                        />
                        <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "11px" }}>
                          ✨ Auto-calculated in {getAreaUnitLabel(item.heightUnit || "INCH", item.widthUnit || "INCH")} (rate calculation uses SqFt)
                        </p>
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                          Subtotal (₹) 🔒
                        </label>
                        <input
                          type="number"
                          readOnly
                          value={
                            (
                              convertToFeet(item.height || 0, item.heightUnit || "INCH") *
                              convertToFeet(item.width || 0, item.widthUnit || "INCH") *
                              (parseFloat(item.ratePerSqft) || 0) *
                              (parseInt(item.quantity) || 0)
                            ).toFixed(2)
                          }
                          style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            fontSize: "14px",
                            backgroundColor: "#fef3c7",
                            color: "#92400e",
                            fontWeight: "600",
                            cursor: "not-allowed",
                            boxSizing: "border-box",
                          }}
                        />
                        <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "11px" }}>✨ Auto-calculated</p>
                      </div>
                    </div>

                    {formData.billingType === "GST" && (
                      <div style={{ marginBottom: "15px" }}>
                        <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                          HSN Code (Optional)
                        </label>
                        <input
                          type="text"
                          value={item.hsnCode}
                          onChange={(e) => handleItemChange(index, "hsnCode", e.target.value)}
                          placeholder="e.g., 7003, 7004"
                          style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            fontSize: "14px",
                            transition: "all 0.2s",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                          onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                        />
                        <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "11px" }}>📋 HSN code for GST (optional)</p>
                      </div>
                    )}

                    <div>
                      <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                        Description (Optional)
                      </label>
                      <textarea
                        value={item.description}
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        placeholder="Add any additional notes or specifications for this item..."
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                          fontSize: "14px",
                          minHeight: "80px",
                          resize: "vertical",
                          fontFamily: "inherit",
                          transition: "all 0.2s",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                        onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: "15px",
                  paddingTop: "20px",
                  borderTop: "2px solid #e5e7eb",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  style={{
                    padding: "12px 24px",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => (e.target.style.backgroundColor = "#4b5563")}
                  onMouseOut={(e) => (e.target.style.backgroundColor = "#6b7280")}
                >
                  ❌ Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "12px 24px",
                    backgroundColor: "#22c55e",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 6px -1px rgba(34, 197, 94, 0.3)",
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = "#16a34a";
                    e.target.style.boxShadow = "0 6px 8px -1px rgba(34, 197, 94, 0.4)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = "#22c55e";
                    e.target.style.boxShadow = "0 4px 6px -1px rgba(34, 197, 94, 0.3)";
                  }}
                >
                  ✅ Create Quotation
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", color: "#fff", padding: "20px" }}>Loading...</div>
        ) : (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5" }}>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Quotation #</th>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Customer</th>
                    {!isMobile && (
                      <>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Billing Type</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Status</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Grand Total</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Date</th>
                      </>
                    )}
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Actions</th>
                  </tr>
                </thead>
              <tbody>
                {quotations.map((quotation, idx) => (
                  <tr
                    key={quotation.id}
                    style={{
                      borderTop: "1px solid #ddd",
                      backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "#ffffff" : "#f9fafb")}
                  >
                    <td style={{ padding: "12px", fontWeight: "500" }}>{quotation.quotationNumber}</td>
                    <td style={{ padding: "12px" }}>{quotation.customerName}</td>
                    {!isMobile && (
                      <>
                        <td style={{ padding: "12px" }}>{quotation.billingType}</td>
                        <td style={{ padding: "12px" }}>{getStatusBadge(quotation.status)}</td>
                        <td style={{ padding: "12px", fontWeight: "600" }}>₹{quotation.grandTotal?.toFixed(2)}</td>
                        <td style={{ padding: "12px" }}>{quotation.quotationDate}</td>
                      </>
                    )}
                    <td style={{ padding: "12px" }}>
                      <button
                        onClick={() => handleView(quotation.id)}
                        style={{
                          padding: "5px 10px",
                          backgroundColor: "#2196f3",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          marginRight: "5px",
                          fontSize: "12px",
                        }}
                      >
                        👁️ View
                      </button>
                      {(quotation.status === "DRAFT" || quotation.status === "SENT") && (
                        <>
                          <button
                            onClick={() => showConfirmDialog("CONFIRM", quotation)}
                            style={{
                              padding: "5px 10px",
                              backgroundColor: "#4caf50",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              marginRight: "5px",
                              fontSize: "12px",
                            }}
                          >
                            ✅ Confirm
                          </button>
                          <button
                            onClick={() => showConfirmDialog("REJECT", quotation)}
                            style={{
                              padding: "5px 10px",
                              backgroundColor: "#f44336",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              marginRight: "5px",
                              fontSize: "12px",
                            }}
                          >
                            ❌ Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => showConfirmDialog("DELETE", quotation)}
                        style={{
                          padding: "5px 10px",
                          backgroundColor: "#dc2626",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {quotations.length === 0 && (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "#6b7280" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.5 }}>📄</div>
                <p style={{ fontSize: "16px", fontWeight: "500", marginBottom: "8px" }}>No quotations found</p>
                <p style={{ fontSize: "14px", color: "#9ca3af" }}>Click 'Create New Quotation' to get started</p>
              </div>
            )}
          </div>
        )}

        {selectedQuotation && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10002,
              paddingTop: "80px",
              paddingBottom: "20px",
              paddingLeft: isMobile ? "15px" : "20px",
              paddingRight: isMobile ? "15px" : "20px",
            }}
            onClick={() => setSelectedQuotation(null)}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: isMobile ? "20px" : "35px",
                borderRadius: "16px",
                maxWidth: "900px",
                width: "100%",
                maxHeight: "calc(100vh - 100px)",
                overflow: "auto",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                position: "relative",
                zIndex: 10003,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: "25px", borderBottom: "3px solid #e5e7eb", paddingBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div>
                    <h2 style={{ margin: 0, color: "#1f2937", fontSize: isMobile ? "22px" : "28px", fontWeight: "700" }}>
                      📄 Quotation Details
                    </h2>
                    <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: "14px" }}>
                      Complete quotation information and item breakdown
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      onClick={async () => {
                        try {
                          const response = await printCuttingPad(selectedQuotation.id);
                          const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                          const printWindow = window.open(url, '_blank');
                          if (printWindow) {
                            printWindow.onload = () => {
                              printWindow.print();
                            };
                          }
                        } catch (error) {
                          console.error("Failed to print cutting-pad", error);
                          alert("Failed to print cutting-pad PDF");
                        }
                      }}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s",
                      }}
                      onMouseOver={(e) => (e.target.style.backgroundColor = "#059669")}
                      onMouseOut={(e) => (e.target.style.backgroundColor = "#10b981")}
                    >
                      🖨️ Print Cutting-Pad
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const response = await downloadQuotationPdf(selectedQuotation.id);
                          const url = window.URL.createObjectURL(new Blob([response.data]));
                          const link = document.createElement('a');
                          link.href = url;
                          link.setAttribute('download', `quotation-${selectedQuotation.quotationNumber}.pdf`);
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          console.error("Failed to download PDF", error);
                          alert("Failed to download quotation PDF");
                        }
                      }}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s",
                      }}
                      onMouseOver={(e) => (e.target.style.backgroundColor = "#2563eb")}
                      onMouseOut={(e) => (e.target.style.backgroundColor = "#3b82f6")}
                    >
                      📥 Download PDF
                    </button>
                    <button
                      onClick={() => setSelectedQuotation(null)}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s",
                      }}
                      onMouseOver={(e) => (e.target.style.backgroundColor = "#dc2626")}
                      onMouseOut={(e) => (e.target.style.backgroundColor = "#ef4444")}
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>
              </div>

              {/* Quotation Header Info */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "20px", marginBottom: "25px" }}>
                <div style={{ padding: "15px", backgroundColor: "#f9fafb", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "5px", fontWeight: "500" }}>Quotation Number</div>
                  <div style={{ fontSize: "18px", color: "#1f2937", fontWeight: "700" }}>{selectedQuotation.quotationNumber}</div>
                </div>
                <div style={{ padding: "15px", backgroundColor: "#f9fafb", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "5px", fontWeight: "500" }}>Status</div>
                  <div>{getStatusBadge(selectedQuotation.status)}</div>
                </div>
                <div style={{ padding: "15px", backgroundColor: "#f9fafb", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "5px", fontWeight: "500" }}>Customer</div>
                  <div style={{ fontSize: "16px", color: "#1f2937", fontWeight: "600" }}>{selectedQuotation.customerName}</div>
                  {selectedQuotation.customerMobile && (
                    <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>📱 {selectedQuotation.customerMobile}</div>
                  )}
                </div>
                <div style={{ padding: "15px", backgroundColor: "#f9fafb", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "5px", fontWeight: "500" }}>Billing Type</div>
                  <div style={{ fontSize: "16px", color: "#1f2937", fontWeight: "600" }}>{selectedQuotation.billingType}</div>
                </div>
              </div>

              {/* Financial Summary */}
              <div style={{ marginBottom: "25px", padding: "20px", backgroundColor: "#fef3c7", borderRadius: "12px", border: "2px solid #fbbf24" }}>
                <h3 style={{ margin: "0 0 15px 0", color: "#92400e", fontSize: "18px", fontWeight: "600" }}>💰 Financial Summary</h3>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "15px" }}>
                  <div>
                    <div style={{ fontSize: "13px", color: "#92400e", marginBottom: "5px" }}>Subtotal</div>
                    <div style={{ fontSize: "20px", color: "#78350f", fontWeight: "700" }}>₹{selectedQuotation.subtotal?.toFixed(2)}</div>
                  </div>
                  {selectedQuotation.installationCharge > 0 && (
                    <div>
                      <div style={{ fontSize: "13px", color: "#92400e", marginBottom: "5px" }}>Installation Charge</div>
                      <div style={{ fontSize: "16px", color: "#78350f", fontWeight: "600" }}>₹{selectedQuotation.installationCharge?.toFixed(2)}</div>
                    </div>
                  )}
                  {selectedQuotation.transportCharge > 0 && (
                    <div>
                      <div style={{ fontSize: "13px", color: "#92400e", marginBottom: "5px" }}>
                        Transport Charge {selectedQuotation.transportationRequired && "🚚"}
                      </div>
                      <div style={{ fontSize: "16px", color: "#78350f", fontWeight: "600" }}>₹{selectedQuotation.transportCharge?.toFixed(2)}</div>
                    </div>
                  )}
                  {selectedQuotation.discount > 0 && (
                    <div>
                      <div style={{ fontSize: "13px", color: "#92400e", marginBottom: "5px" }}>Discount</div>
                      <div style={{ fontSize: "16px", color: "#78350f", fontWeight: "600" }}>₹{selectedQuotation.discount?.toFixed(2)}</div>
                    </div>
                  )}
                  {selectedQuotation.billingType === "GST" && selectedQuotation.gstAmount > 0 && (
                    <>
                      <div>
                        <div style={{ fontSize: "13px", color: "#92400e", marginBottom: "5px" }}>GST ({selectedQuotation.gstPercentage}%)</div>
                        <div style={{ fontSize: "16px", color: "#78350f", fontWeight: "600" }}>₹{selectedQuotation.gstAmount?.toFixed(2)}</div>
                      </div>
                      {selectedQuotation.cgst > 0 && (
                        <div>
                          <div style={{ fontSize: "13px", color: "#92400e", marginBottom: "5px" }}>CGST / SGST</div>
                          <div style={{ fontSize: "14px", color: "#78350f" }}>
                            ₹{selectedQuotation.cgst?.toFixed(2)} / ₹{selectedQuotation.sgst?.toFixed(2)}
                          </div>
                        </div>
                      )}
                      {selectedQuotation.igst > 0 && (
                        <div>
                          <div style={{ fontSize: "13px", color: "#92400e", marginBottom: "5px" }}>IGST</div>
                          <div style={{ fontSize: "16px", color: "#78350f", fontWeight: "600" }}>₹{selectedQuotation.igst?.toFixed(2)}</div>
                        </div>
                      )}
                    </>
                  )}
                  <div style={{ gridColumn: isMobile ? "1" : "1 / -1", paddingTop: "15px", borderTop: "2px solid #fbbf24" }}>
                    <div style={{ fontSize: "14px", color: "#92400e", marginBottom: "8px", fontWeight: "500" }}>Grand Total</div>
                    <div style={{ fontSize: "28px", color: "#78350f", fontWeight: "800" }}>₹{selectedQuotation.grandTotal?.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div style={{ marginBottom: "25px" }}>
                <h3 style={{ margin: "0 0 15px 0", color: "#374151", fontSize: "18px", fontWeight: "600" }}>📦 Quotation Items</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f3f4f6" }}>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#374151" }}>#</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#374151" }}>Glass Type</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#374151" }}>Size</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#374151" }}>Design</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#374151" }}>Qty</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#374151" }}>Rate</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#374151" }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedQuotation.items?.map((item, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderTop: "1px solid #e5e7eb",
                            backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                            transition: "background-color 0.2s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "#ffffff" : "#f9fafb")}
                        >
                          <td style={{ padding: "12px", fontWeight: "600", color: "#6366f1" }}>{idx + 1}</td>
                          <td style={{ padding: "12px", fontWeight: "500" }}>{item.glassType}</td>
                          <td style={{ padding: "12px" }}>
                            {item.height} {item.heightUnit || "FEET"} × {item.width} {item.widthUnit || "FEET"}
                          </td>
                          <td style={{ padding: "12px", color: "#6b7280" }}>
                            {item.design
                              ? item.design === "POLISH"
                                ? "Polish"
                                : item.design === "BEVELING"
                                ? "Beveling"
                                : item.design === "HALF_ROUND"
                                ? "Half Round"
                                : item.design
                              : "-"}
                          </td>
                          <td style={{ padding: "12px" }}>{item.quantity}</td>
                          <td style={{ padding: "12px" }}>₹{item.ratePerSqft?.toFixed(2)}</td>
                          <td style={{ padding: "12px", fontWeight: "600", color: "#1f2937" }}>₹{item.subtotal?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmAction && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10004,
              padding: isMobile ? "15px" : "20px",
            }}
            onClick={() => setConfirmAction(null)}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: isMobile ? "25px" : "35px",
                borderRadius: "16px",
                maxWidth: "500px",
                width: "100%",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: "20px", textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "48px",
                    marginBottom: "15px",
                    color:
                      confirmAction.type === "CONFIRM"
                        ? "#22c55e"
                        : confirmAction.type === "REJECT"
                        ? "#f59e0b"
                        : "#ef4444",
                  }}
                >
                  {confirmAction.type === "CONFIRM"
                    ? "⚠️"
                    : confirmAction.type === "REJECT"
                    ? "⚠️"
                    : "🗑️"}
                </div>
                <h2
                  style={{
                    margin: 0,
                    color: "#1f2937",
                    fontSize: isMobile ? "20px" : "24px",
                    fontWeight: "700",
                    marginBottom: "10px",
                  }}
                >
                  {confirmAction.type === "CONFIRM"
                    ? "Confirm Quotation?"
                    : confirmAction.type === "REJECT"
                    ? "Reject Quotation?"
                    : "Delete Quotation?"}
                </h2>
                <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: "14px", lineHeight: "1.6" }}>
                  {confirmAction.type === "CONFIRM"
                    ? `Are you sure you want to confirm quotation "${confirmAction.quotationNumber}"? This action will lock the quotation and enable invoice conversion.`
                    : confirmAction.type === "REJECT"
                    ? `Are you sure you want to reject quotation "${confirmAction.quotationNumber}"? You will be asked to provide a rejection reason.`
                    : `Are you sure you want to permanently delete quotation "${confirmAction.quotationNumber}"? This action cannot be undone.`}
                </p>
                <div
                  style={{
                    marginTop: "15px",
                    padding: "12px",
                    backgroundColor: "#f3f4f6",
                    borderRadius: "8px",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>Quotation Details:</div>
                  <div style={{ fontSize: "14px", color: "#1f2937", fontWeight: "600" }}>
                    #{confirmAction.quotationNumber}
                  </div>
                  <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
                    Customer: {confirmAction.customerName}
                  </div>
                </div>
              </div>

              {/* Rejection Reason Input */}
              {confirmAction.type === "REJECT" && (
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                    Rejection Reason * <span style={{ color: "#ef4444" }}>●</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejecting this quotation..."
                    required
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      minHeight: "100px",
                      resize: "vertical",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                  />
                </div>
              )}

              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "12px" }}>
                <button
                  onClick={() => {
                    if (confirmAction.type === "DELETE") {
                      handleDelete(confirmAction.quotationId);
                    } else {
                      handleConfirm(
                        confirmAction.quotationId,
                        confirmAction.type === "CONFIRM" ? "CONFIRMED" : "REJECTED"
                      );
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    backgroundColor:
                      confirmAction.type === "CONFIRM"
                        ? "#22c55e"
                        : confirmAction.type === "REJECT"
                        ? "#f59e0b"
                        : "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)",
                  }}
                  onMouseOver={(e) => {
                    if (confirmAction.type === "CONFIRM") {
                      e.target.style.backgroundColor = "#16a34a";
                    } else if (confirmAction.type === "REJECT") {
                      e.target.style.backgroundColor = "#d97706";
                    } else {
                      e.target.style.backgroundColor = "#dc2626";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (confirmAction.type === "CONFIRM") {
                      e.target.style.backgroundColor = "#22c55e";
                    } else if (confirmAction.type === "REJECT") {
                      e.target.style.backgroundColor = "#f59e0b";
                    } else {
                      e.target.style.backgroundColor = "#ef4444";
                    }
                  }}
                >
                  {confirmAction.type === "CONFIRM"
                    ? "✅ Yes, Confirm"
                    : confirmAction.type === "REJECT"
                    ? "⚠️ Yes, Reject"
                    : "🗑️ Yes, Delete"}
                </button>
                <button
                  onClick={() => {
                    setConfirmAction(null);
                    setRejectionReason("");
                  }}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => (e.target.style.backgroundColor = "#4b5563")}
                  onMouseOut={(e) => (e.target.style.backgroundColor = "#6b7280")}
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

export default QuotationManagement;

