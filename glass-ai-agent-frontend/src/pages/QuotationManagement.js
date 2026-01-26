import { useState, useEffect } from "react";
import PageWrapper from "../components/PageWrapper";
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
import { useResponsive } from "../hooks/useResponsive";
import "../styles/design-system.css";

function QuotationManagement() {
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [allStock, setAllStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const { isMobile, isTablet } = useResponsive(); // Use responsive hook
  const [showStockDropdown, setShowStockDropdown] = useState({});
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'CONFIRM'|'REJECT'|'DELETE', quotationId: number, quotationNumber: string }
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [pendingRejection, setPendingRejection] = useState(null); // { quotationId, action }

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
    discountType: "AMOUNT", // "AMOUNT" or "PERCENTAGE"
    discountValue: 0,
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
        polish: "", // Hand-Polish or CNC Polish (per item)
        heightOriginal: "", // Store original fraction string
        widthOriginal: "", // Store original fraction string
      },
    ],
  });

  useEffect(() => {
    loadCustomers();
    loadQuotations();
    loadStock();
    // Removed manual resize handler - useResponsive hook handles it
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

  // ==================== QUOTATION FEATURE HELPER FUNCTIONS ====================
  
  /**
   * Parse fraction input to decimal
   * Supports: "9 1/2", "9-1/2", "1/2", "9.5", "9"
   */
  const parseFraction = (input) => {
    if (!input || input === "") return 0;
    
    // Remove whitespace
    const cleaned = input.trim();
    
    // Handle decimal format
    if (/^\d+\.?\d*$/.test(cleaned)) {
      return parseFloat(cleaned) || 0;
    }
    
    // Handle fraction formats: "9 1/2", "9-1/2", "1/2"
    const fractionMatch = cleaned.match(/^(\d+)?[\s-]?(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const whole = fractionMatch[1] ? parseFloat(fractionMatch[1]) : 0;
      const numerator = parseFloat(fractionMatch[2]);
      const denominator = parseFloat(fractionMatch[3]);
      if (denominator === 0) return 0;
      return whole + (numerator / denominator);
    }
    
    // Try to parse as regular number
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  /**
   * Generate table values based on table number
   * Table 1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
   * Table 2: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]
   * Table 6: [6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72]
   */
  const generateTableValues = (tableNumber) => {
    const num = parseInt(tableNumber) || 6;
    const values = [];
    for (let i = 1; i <= 12; i++) {
      values.push(num * i);
    }
    return values;
  };

  /**
   * Find exact match or next value greater than input
   */
  const findNextTableValue = (input, tableNumber) => {
    if (!input || input === "") return null;
    
    const decimalValue = typeof input === 'string' ? parseFraction(input) : parseFloat(input);
    if (isNaN(decimalValue)) return null;
    
    const tableValues = generateTableValues(tableNumber);
    
    // Find exact match
    const exactMatch = tableValues.find(v => Math.abs(v - decimalValue) < 0.01);
    if (exactMatch !== undefined) return exactMatch;
    
    // Find next value greater than input
    const nextValue = tableValues.find(v => v > decimalValue);
    return nextValue !== undefined ? nextValue : tableValues[tableValues.length - 1];
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    const item = newItems[index];
    
    // Handle sizeInMM toggle - switch units
    if (field === "sizeInMM") {
      item.sizeInMM = value;
      if (value) {
        // Switch to MM mode
        item.heightUnit = "MM";
        item.widthUnit = "MM";
      } else {
        // Switch to INCH mode
        item.heightUnit = "INCH";
        item.widthUnit = "INCH";
      }
    } else {
      item[field] = value;
    }

    // Handle height/width input - parse fraction and auto-select table value
    if (field === "height" || field === "width") {
      // Store original input string (for fraction display in PDFs)
      if (field === "height") {
        item.heightOriginal = value;
      } else if (field === "width") {
        item.widthOriginal = value;
      }
      
      // Parse fraction input
      const decimalValue = parseFraction(value);
      
      // Auto-select table value
      if (field === "height" && decimalValue > 0) {
        const tableValue = findNextTableValue(decimalValue, item.heightTableNumber || 6);
        item.selectedHeightTableValue = tableValue;
        // Update polish selection row labels
        updatePolishSelectionNumbers(item);
      } else if (field === "width" && decimalValue > 0) {
        const tableValue = findNextTableValue(decimalValue, item.widthTableNumber || 6);
        item.selectedWidthTableValue = tableValue;
        // Update polish selection row labels
        updatePolishSelectionNumbers(item);
      }
    }

    // Handle table number change - recalculate selected values
    if (field === "heightTableNumber") {
      // Store the value as-is (string during typing, number on blur)
      // Only recalculate table value if we have a valid number
      const numValue = typeof value === 'string' ? parseInt(value) : value;
      if (!isNaN(numValue) && numValue > 0) {
        const tableValue = findNextTableValue(item.height || 0, numValue);
        item.selectedHeightTableValue = tableValue;
        updatePolishSelectionNumbers(item);
      }
    }
    if (field === "widthTableNumber") {
      // Store the value as-is (string during typing, number on blur)
      // Only recalculate table value if we have a valid number
      const numValue = typeof value === 'string' ? parseInt(value) : value;
      if (!isNaN(numValue) && numValue > 0) {
        const tableValue = findNextTableValue(item.width || 0, numValue);
        item.selectedWidthTableValue = tableValue;
        updatePolishSelectionNumbers(item);
      }
    }

    // Auto-calculate area and subtotal
    if (field === "height" || field === "width" || field === "heightUnit" || field === "widthUnit" || field === "sizeInMM" || field === "heightTableNumber" || field === "widthTableNumber" || field === "selectedHeightTableValue" || field === "selectedWidthTableValue") {
      // Calculate area in the input unit for display (use input values for display)
      const heightValue = parseFraction(item.height || 0);
      const widthValue = parseFraction(item.width || 0);
      const areaInUnit = calculateAreaInUnit(
        heightValue,
        widthValue,
        item.heightUnit || "FEET",
        item.widthUnit || "FEET"
      );
      item.area = areaInUnit;
      
      // For subtotal calculation, use table values (same as Running Ft)
      // Use table values if available, otherwise fallback to input values
      const heightTableValue = item.selectedHeightTableValue ? parseFloat(item.selectedHeightTableValue) : heightValue;
      const widthTableValue = item.selectedWidthTableValue ? parseFloat(item.selectedWidthTableValue) : widthValue;
      
      // Convert table values to feet
      const heightInFeet = convertToFeet(heightTableValue, item.heightUnit || "FEET");
      const widthInFeet = convertToFeet(widthTableValue, item.widthUnit || "FEET");
      const areaInFeet = heightInFeet * widthInFeet;
      const rate = parseFloat(item.ratePerSqft) || 0;
      const qty = parseInt(item.quantity) || 0;
      item.subtotal = areaInFeet * rate * qty;
      
      // Recalculate Running Ft (depends on height/width in feet)
      calculateRunningFt(item);
    }

    if (field === "ratePerSqft" || field === "quantity") {
      // Recalculate subtotal when rate or quantity changes - use table values
      const heightValue = parseFraction(item.height || 0);
      const widthValue = parseFraction(item.width || 0);
      
      // Use table values if available, otherwise fallback to input values
      const heightTableValue = item.selectedHeightTableValue ? parseFloat(item.selectedHeightTableValue) : heightValue;
      const widthTableValue = item.selectedWidthTableValue ? parseFloat(item.selectedWidthTableValue) : widthValue;
      
      // Convert table values to feet
      const heightInFeet = convertToFeet(heightTableValue, item.heightUnit || "FEET");
      const widthInFeet = convertToFeet(widthTableValue, item.widthUnit || "FEET");
      const areaInFeet = heightInFeet * widthInFeet;
      const rate = parseFloat(item.ratePerSqft) || 0;
      const qty = parseInt(item.quantity) || 0;
      item.subtotal = areaInFeet * rate * qty;
      
      // Recalculate Running Ft (quantity affects the result)
      calculateRunningFt(item);
    }
    
    // Recalculate Running Ft when polish selection changes
    if (field === "polishSelection" || field === "polishRates" || field === "polish") {
      calculateRunningFt(item);
    }

    setFormData({ ...formData, items: newItems });
  };

  /**
   * Update polish selection row numbers based on table values
   */
  const updatePolishSelectionNumbers = (item) => {
    const heightValue = item.selectedHeightTableValue || parseFraction(item.height || 0);
    const widthValue = item.selectedWidthTableValue || parseFraction(item.width || 0);
    
    if (item.polishSelection && item.polishSelection.length >= 4) {
      item.polishSelection[0].side = `Height 1 (${heightValue})`;
      item.polishSelection[1].side = `Width 1 (${widthValue})`;
      item.polishSelection[2].side = `Height 2 (${heightValue})`;
      item.polishSelection[3].side = `Width 2 (${widthValue})`;
    }
  };

  /**
   * Handle polish selection checkbox change
   */
  const handlePolishCheckboxChange = (itemIndex, rowIndex, checked) => {
    const newItems = [...formData.items];
    const item = newItems[itemIndex];
    
    if (!item.polishSelection) {
      item.polishSelection = [
        { side: "Height 1", checked: false, type: null, rate: 0 },
        { side: "Width 1", checked: false, type: null, rate: 0 },
        { side: "Height 2", checked: false, type: null, rate: 0 },
        { side: "Width 2", checked: false, type: null, rate: 0 },
      ];
    }
    
    item.polishSelection[rowIndex].checked = checked;
    if (!checked) {
      item.polishSelection[rowIndex].type = null;
      item.polishSelection[rowIndex].rate = 0;
    }
    
    // Recalculate Running Ft
    calculateRunningFt(item);
    
    setFormData({ ...formData, items: newItems });
  };

  /**
   * Handle polish type radio button change
   */
  const handlePolishTypeChange = (itemIndex, rowIndex, type) => {
    const newItems = [...formData.items];
    const item = newItems[itemIndex];
    
    if (!item.polishSelection) return;
    if (!item.polishRates) item.polishRates = { P: 15, H: 75, B: 75 };
    
    item.polishSelection[rowIndex].type = type;
    item.polishSelection[rowIndex].rate = item.polishRates[type] || 0;
    
    // Recalculate Running Ft
    calculateRunningFt(item);
    
    setFormData({ ...formData, items: newItems });
  };

  /**
   * Calculate Running Ft based on polish selection rates
   * Formula: 
   * 1. Use table values (selectedHeightTableValue and selectedWidthTableValue) instead of input height/width
   * 2. Group sides by polish type (P, H, B)
   * 3. For each group, sum the side lengths (already in correct unit from table), multiply by polish rate
   * 4. Sum all groups
   * 5. Multiply by quantity
   */
  const calculateRunningFt = (item) => {
    if (!item.polishSelection || !item.selectedHeightTableValue || !item.selectedWidthTableValue) {
      item.runningFt = 0;
      return;
    }
    
    // Use table values instead of input height/width
    // Table values are already in the correct unit (they match the input unit)
    const heightTableValue = parseFloat(item.selectedHeightTableValue) || 0;
    const widthTableValue = parseFloat(item.selectedWidthTableValue) || 0;
    
    // Convert table values to feet (table values are in the same unit as input)
    const heightInFeet = convertToFeet(heightTableValue, item.heightUnit || "FEET");
    const widthInFeet = convertToFeet(widthTableValue, item.widthUnit || "FEET");
    
    // Group sides by polish type and calculate
    const polishGroups = {
      'P': { sides: [], rate: item.polishRates?.P || 15 },
      'H': { sides: [], rate: item.polishRates?.H || 75 },
      'B': { sides: [], rate: item.polishRates?.B || 75 }
    };
    
    // Process each polish selection row and group by type
    if (item.polishSelection && item.polishSelection.length >= 4) {
      // Height 1 (index 0)
      if (item.polishSelection[0].checked && item.polishSelection[0].type) {
        const type = item.polishSelection[0].type;
        if (polishGroups[type]) {
          polishGroups[type].sides.push(heightInFeet);
        }
      }
      
      // Width 1 (index 1)
      if (item.polishSelection[1].checked && item.polishSelection[1].type) {
        const type = item.polishSelection[1].type;
        if (polishGroups[type]) {
          polishGroups[type].sides.push(widthInFeet);
        }
      }
      
      // Height 2 (index 2)
      if (item.polishSelection[2].checked && item.polishSelection[2].type) {
        const type = item.polishSelection[2].type;
        if (polishGroups[type]) {
          polishGroups[type].sides.push(heightInFeet);
        }
      }
      
      // Width 2 (index 3)
      if (item.polishSelection[3].checked && item.polishSelection[3].type) {
        const type = item.polishSelection[3].type;
        if (polishGroups[type]) {
          polishGroups[type].sides.push(widthInFeet);
        }
      }
    }
    
    // Calculate for each polish type group
    let totalRunningFt = 0;
    Object.keys(polishGroups).forEach(type => {
      const group = polishGroups[type];
      if (group.sides.length > 0) {
        // Sum all sides in this group
        const totalLengthInFeet = group.sides.reduce((sum, side) => sum + side, 0);
        // Multiply by polish rate for this type
        totalRunningFt += totalLengthInFeet * group.rate;
      }
    });
    
    // Multiply by quantity (NO Rate per SqFt multiplication)
    const quantity = parseInt(item.quantity) || 1;
    item.runningFt = totalRunningFt * quantity;
  };

  /**
   * Handle polish rate change
   */
  const handlePolishRateChange = (itemIndex, type, rate) => {
    const newItems = [...formData.items];
    const item = newItems[itemIndex];
    
    if (!item.polishRates) item.polishRates = { P: 15, H: 75, B: 75 };
    
    // Allow string values during typing, parse to number on blur
    if (typeof rate === 'string' && rate !== '') {
      item.polishRates[type] = rate; // Store as string during typing
    } else {
      item.polishRates[type] = parseFloat(rate) || 0;
    }
    
    // Update rates for all selected rows with this type (only if it's a number)
    if (item.polishSelection && typeof rate !== 'string') {
      const numRate = parseFloat(rate) || 0;
      item.polishSelection.forEach((row) => {
        if (row.type === type && row.checked) {
          row.rate = numRate;
        }
      });
    }
    
    // Recalculate Running Ft
    calculateRunningFt(item);
    
    setFormData({ ...formData, items: newItems });
  };

  /**
   * Handle "Select All" checkbox for polish type columns
   */
  const handlePolishSelectAll = (itemIndex, type, checked) => {
    const newItems = [...formData.items];
    const item = newItems[itemIndex];
    
    if (!item.polishSelection) {
      item.polishSelection = [
        { side: "Height 1", checked: false, type: null, rate: 0 },
        { side: "Width 1", checked: false, type: null, rate: 0 },
        { side: "Height 2", checked: false, type: null, rate: 0 },
        { side: "Width 2", checked: false, type: null, rate: 0 },
      ];
    }
    
    if (!item.polishRates) item.polishRates = { P: 15, H: 75, B: 75 };
    
    // If checking "Select All", check all rows and set the type
    if (checked) {
      item.polishSelection.forEach((row) => {
        row.checked = true;
        row.type = type;
        row.rate = item.polishRates[type] || 0;
      });
    } else {
      // If unchecking "Select All", uncheck all rows with this type
      item.polishSelection.forEach((row) => {
        if (row.type === type) {
          row.checked = false;
          row.type = null;
          row.rate = 0;
        }
      });
    }
    
    // Recalculate Running Ft
    calculateRunningFt(item);
    
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
        // Validate and clean mobile number before sending
        let mobile = formData.manualCustomerMobile?.trim();
        if (mobile) {
          // Remove spaces, dashes, and parentheses
          let cleaned = mobile.replace(/[\s\-\(\)]/g, "");
          
          // Remove leading zero if present (Indian mobile numbers sometimes have leading 0)
          if (cleaned.length === 11 && cleaned.startsWith("0")) {
            cleaned = cleaned.substring(1);
          }
          
          // Check if it starts with +91
          if (cleaned.startsWith("+91")) {
            const digits = cleaned.substring(3);
            if (digits.length !== 10 || !/^\d+$/.test(digits)) {
              setMessage("❌ Mobile number with +91 must have 10 digits after country code");
              return;
            }
            mobile = cleaned; // Use cleaned version with +91
          } else if (!/^\d+$/.test(cleaned)) {
            setMessage("❌ Mobile number must contain only digits (or +91 followed by 10 digits)");
            return;
          } else if (cleaned.length !== 10) {
            setMessage(`❌ Mobile number must be exactly 10 digits (you entered ${cleaned.length} digits)`);
            return;
          } else {
            mobile = cleaned; // Use cleaned version without leading zero
          }
        }

        const customerResponse = await createCustomer({
          name: formData.manualCustomerName.trim(),
          mobile: mobile,
          email: formData.manualCustomerEmail?.trim() || null,
          address: formData.manualCustomerAddress?.trim() || null,
        });
        finalCustomerId = customerResponse.data.id;
        // Reload customers list
        await loadCustomers();
      } catch (error) {
        const errorMessage = error.response?.data?.error || error.message || "Failed to create customer. Please try again.";
        setMessage(`❌ ${errorMessage}`);
        console.error("Customer creation error:", error.response?.data || error);
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
      // Calculate subtotal from items first
      let totalSubtotal = 0;
      formData.items.forEach((item) => {
        const heightValue = parseFraction(item.height || 0);
        const widthValue = parseFraction(item.width || 0);
        const heightTableValue = item.selectedHeightTableValue ? parseFloat(item.selectedHeightTableValue) : heightValue;
        const widthTableValue = item.selectedWidthTableValue ? parseFloat(item.selectedWidthTableValue) : widthValue;
        const heightInFeet = convertToFeet(heightTableValue, item.heightUnit || "FEET");
        const widthInFeet = convertToFeet(widthTableValue, item.widthUnit || "FEET");
        const areaInFeet = heightInFeet * widthInFeet;
        const itemSubtotal = areaInFeet * parseFloat(item.ratePerSqft || 0) * parseInt(item.quantity || 1);
        totalSubtotal += itemSubtotal;
      });

      // Calculate discount amount based on type
      let calculatedDiscount = 0;
      if (formData.discountValue > 0) {
        if (formData.discountType === "PERCENTAGE") {
          // Calculate percentage discount on subtotal + installation + transport
          const baseAmount = totalSubtotal + (formData.installationCharge || 0) + (formData.transportCharge || 0);
          calculatedDiscount = (baseAmount * formData.discountValue) / 100;
        } else {
          // Absolute amount
          calculatedDiscount = formData.discountValue;
        }
      }

      const payload = {
        ...formData,
        customerId: finalCustomerId,
        transportationRequired: formData.transportationRequired || false,
        discount: calculatedDiscount, // Send calculated discount amount
        discountType: formData.discountType, // Send discount type
        discountValue: formData.discountValue, // Send discount value
        items: formData.items.map((item) => {
          // Parse height/width (handle fractions)
          const heightValue = parseFraction(item.height || 0);
          const widthValue = parseFraction(item.width || 0);
          
          // Calculate area in the input unit for storage
          const areaInUnit = calculateAreaInUnit(
            heightValue,
            widthValue,
            item.heightUnit || "FEET",
            item.widthUnit || "FEET"
          );
          
          // For subtotal calculation, use table values (same as Running Ft)
          // Use table values if available, otherwise fallback to input values
          const heightTableValue = item.selectedHeightTableValue ? parseFloat(item.selectedHeightTableValue) : heightValue;
          const widthTableValue = item.selectedWidthTableValue ? parseFloat(item.selectedWidthTableValue) : widthValue;
          
          // Convert table values to feet
          const heightInFeet = convertToFeet(heightTableValue, item.heightUnit || "FEET");
          const widthInFeet = convertToFeet(widthTableValue, item.widthUnit || "FEET");
          const areaInFeet = heightInFeet * widthInFeet;
          const subtotal = areaInFeet * parseFloat(item.ratePerSqft || 0) * parseInt(item.quantity || 1);

          // Calculate Running Ft: Use table values, group by polish type, sum sides, convert to ft, multiply by polish rate, sum all, then multiply by quantity
          let runningFt = 0;
          if (item.polishSelection && item.polishSelection.length >= 4 && item.selectedHeightTableValue && item.selectedWidthTableValue) {
            // Use table values instead of input height/width
            const heightTableValue = parseFloat(item.selectedHeightTableValue) || 0;
            const widthTableValue = parseFloat(item.selectedWidthTableValue) || 0;
            
            // Convert table values to feet
            const heightInFeet = convertToFeet(heightTableValue, item.heightUnit || "FEET");
            const widthInFeet = convertToFeet(widthTableValue, item.widthUnit || "FEET");
            
            // Group sides by polish type
            const polishGroups = {
              'P': { sides: [], rate: item.polishRates?.P || 15 },
              'H': { sides: [], rate: item.polishRates?.H || 75 },
              'B': { sides: [], rate: item.polishRates?.B || 75 }
            };
            
            // Process each polish selection row and group by type
            // Height 1 (index 0)
            if (item.polishSelection[0].checked && item.polishSelection[0].type) {
              const type = item.polishSelection[0].type;
              if (polishGroups[type]) {
                polishGroups[type].sides.push(heightInFeet);
              }
            }
            
            // Width 1 (index 1)
            if (item.polishSelection[1].checked && item.polishSelection[1].type) {
              const type = item.polishSelection[1].type;
              if (polishGroups[type]) {
                polishGroups[type].sides.push(widthInFeet);
              }
            }
            
            // Height 2 (index 2)
            if (item.polishSelection[2].checked && item.polishSelection[2].type) {
              const type = item.polishSelection[2].type;
              if (polishGroups[type]) {
                polishGroups[type].sides.push(heightInFeet);
              }
            }
            
            // Width 2 (index 3)
            if (item.polishSelection[3].checked && item.polishSelection[3].type) {
              const type = item.polishSelection[3].type;
              if (polishGroups[type]) {
                polishGroups[type].sides.push(widthInFeet);
              }
            }
            
            // Calculate for each polish type group
            let totalRunningFt = 0;
            Object.keys(polishGroups).forEach(type => {
              const group = polishGroups[type];
              if (group.sides.length > 0) {
                // Sum all sides in this group
                const totalLengthInFeet = group.sides.reduce((sum, side) => sum + side, 0);
                // Multiply by polish rate for this type
                totalRunningFt += totalLengthInFeet * group.rate;
              }
            });
            
            // Multiply by quantity (NO Rate per SqFt multiplication)
            const quantity = parseInt(item.quantity) || 1;
            runningFt = totalRunningFt * quantity;
          }

          // Build polish selection JSON for description
          const polishData = {
            heightTableNumber: item.heightTableNumber || 6,
            widthTableNumber: item.widthTableNumber || 6,
            selectedHeightTableValue: item.selectedHeightTableValue,
            selectedWidthTableValue: item.selectedWidthTableValue,
            polishSelection: item.polishSelection || [],
            polishRates: item.polishRates || { P: 15, H: 75, B: 75 },
            itemPolish: item.polish || "", // Hand-Polish or CNC Polish
            heightOriginal: item.heightOriginal || item.height || "",
            widthOriginal: item.widthOriginal || item.width || "",
            sizeInMM: item.sizeInMM || false,
            runningFt: runningFt, // Store Running Ft in polish data
          };
          
          // Combine existing description with polish data JSON
          const descriptionParts = [];
          if (item.description) {
            descriptionParts.push(item.description);
          }
          descriptionParts.push(`POLISH_DATA:${JSON.stringify(polishData)}`);

          return {
            ...item,
            height: heightValue,
            width: widthValue,
            quantity: parseInt(item.quantity),
            ratePerSqft: parseFloat(item.ratePerSqft),
            area: areaInFeet, // Store area in feet for backend (since rate is per SqFt)
            subtotal: subtotal,
            runningFt: runningFt, // Store Running Ft
            heightUnit: item.heightUnit || "FEET",
            widthUnit: item.widthUnit || "FEET",
            description: descriptionParts.join('\n'),
            // Remove temporary fields before sending
            sizeInMM: undefined,
            heightTableNumber: undefined,
            widthTableNumber: undefined,
            selectedHeightTableValue: undefined,
            selectedWidthTableValue: undefined,
            polishSelection: undefined,
            polishRates: undefined,
            polish: undefined,
            heightOriginal: undefined,
            widthOriginal: undefined,
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
      // If rejecting, show rejection reason modal first
      if (action === "REJECTED") {
        setConfirmAction(null); // Close confirmation modal
        setPendingRejection({ quotationId, action });
        setShowRejectionModal(true);
        setRejectionReason("");
        return;
      }
      
      // For confirm action, proceed directly
      await confirmQuotation(quotationId, {
        action: action,
        rejectionReason: null,
      });
      setMessage("✅ Quotation confirmed");
      setConfirmAction(null);
      loadQuotations();
    } catch (error) {
      setMessage("❌ Failed to update quotation");
      setConfirmAction(null);
    }
  };

  const handleRejectionSubmit = async () => {
    if (!rejectionReason.trim()) {
      setMessage("❌ Please enter a rejection reason");
      return;
    }

    try {
      await confirmQuotation(pendingRejection.quotationId, {
        action: "REJECTED",
        rejectionReason: rejectionReason.trim(),
      });
      setMessage("✅ Quotation rejected");
      setConfirmAction(null);
      setShowRejectionModal(false);
      setRejectionReason("");
      setPendingRejection(null);
      loadQuotations();
    } catch (error) {
      setMessage("❌ Failed to reject quotation");
      setShowRejectionModal(false);
      setPendingRejection(null);
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
      discountType: "AMOUNT",
      discountValue: 0,
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
      <div style={{ 
        padding: isMobile ? "8px" : "20px", 
        maxWidth: isMobile ? "100%" : "1400px", 
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
        overflowX: "hidden", // Prevent horizontal overflow
      }}>
        <div style={{ 
          marginBottom: isMobile ? "16px" : "25px", 
          padding: isMobile ? "12px" : "20px", 
          backgroundColor: "rgba(0,0,0,0.5)", 
          borderRadius: "12px", 
          backdropFilter: "blur(10px)",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}>
          <h1 style={{ 
            color: "#fff", 
            marginBottom: "8px", 
            fontSize: isMobile ? "22px" : "32px", 
            fontWeight: "800", 
            textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
            lineHeight: "1.2",
            wordWrap: "break-word",
          }}>
            📄 Quotation Management
          </h1>
          <p style={{ 
            color: "#fff", 
            fontSize: isMobile ? "13px" : "15px", 
            margin: 0, 
            fontWeight: "500", 
            textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
            lineHeight: "1.4",
          }}>
            Create and manage quotations for your customers
          </p>
        </div>

        {message && (
          <div
            style={{
              padding: "10px",
              marginBottom: "20px",
              backgroundColor: message.includes("✅") ? "#4caf50" : "#f44336",
              color: "white",
              borderRadius: "4px",
            }}
          >
            {message}
          </div>
        )}

        <button
          onClick={() => {
            setShowForm(true);
            resetForm();
          }}
          style={{
            padding: isMobile ? "14px 20px" : "12px 24px",
            backgroundColor: "#22c55e",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "20px",
            fontSize: isMobile ? "16px" : "15px", // 16px prevents iOS zoom
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: "0 4px 6px -1px rgba(34, 197, 94, 0.3)",
            transition: "all 0.2s",
            width: isMobile ? "100%" : "auto",
            minHeight: "44px", // Touch target
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = "#16a34a";
            e.target.style.boxShadow = "0 6px 8px -1px rgba(34, 197, 94, 0.4)";
            e.target.style.transform = "translateY(-1px)";
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = "#22c55e";
            e.target.style.boxShadow = "0 4px 6px -1px rgba(34, 197, 94, 0.3)";
            e.target.style.transform = "translateY(0)";
          }}
        >
          ➕ Create New Quotation
        </button>

        {showForm && (
          <div
            style={{
              backgroundColor: "white",
              padding: isMobile ? "12px" : "30px",
              borderRadius: "12px",
              marginBottom: isMobile ? "16px" : "20px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              overflowX: "hidden", // Prevent horizontal overflow
            }}
          >
            <div style={{ 
              marginBottom: isMobile ? "16px" : "25px", 
              borderBottom: "2px solid #e5e7eb", 
              paddingBottom: isMobile ? "12px" : "15px" 
            }}>
              <h2 style={{ 
                margin: 0, 
                color: "#1f2937", 
                fontSize: isMobile ? "20px" : "24px", 
                fontWeight: "600" 
              }}>
                📄 Create New Quotation
              </h2>
              <p style={{ 
                margin: "5px 0 0 0", 
                color: "#6b7280", 
                fontSize: isMobile ? "13px" : "14px" 
              }}>
                Fill in the details below to create a quotation for your customer
              </p>
            </div>
            <form onSubmit={handleSubmit} style={{
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
            }}>
              {/* Customer & Billing Section */}
              <div style={{ 
                marginBottom: isMobile ? "20px" : "30px",
                width: "100%",
                boxSizing: "border-box",
              }}>
                <h3 style={{ 
                  color: "#374151", 
                  fontSize: isMobile ? "16px" : "18px", 
                  fontWeight: "600", 
                  marginBottom: isMobile ? "12px" : "15px" 
                }}>
                  👤 Customer & Billing Information
                </h3>
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
                  gap: isMobile ? "16px" : "25px",
                  width: "100%",
                  boxSizing: "border-box",
                }}>
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
                          padding: isMobile ? "14px 12px" : "12px", // Larger touch target
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                          fontSize: "16px", // Prevent iOS zoom
                          backgroundColor: "#fff",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          marginBottom: "15px",
                          minHeight: "44px", // Touch target
                          boxSizing: "border-box",
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
                            padding: isMobile ? "14px 12px" : "12px", // Larger touch target
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            fontSize: "16px", // Prevent iOS zoom
                            backgroundColor: "#fff",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            minHeight: "44px", // Touch target
                            boxSizing: "border-box",
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
                              padding: isMobile ? "14px 12px" : "12px", // Larger touch target
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "16px", // Prevent iOS zoom
                              transition: "all 0.2s",
                              minHeight: "44px", // Touch target
                              boxSizing: "border-box",
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
                              padding: isMobile ? "14px 12px" : "12px", // Larger touch target
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "16px", // Prevent iOS zoom
                              transition: "all 0.2s",
                              minHeight: "44px", // Touch target
                              boxSizing: "border-box",
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
                              padding: isMobile ? "14px 12px" : "12px", // Larger touch target
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "16px", // Prevent iOS zoom
                              transition: "all 0.2s",
                              minHeight: "44px", // Touch target
                              boxSizing: "border-box",
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
                              padding: isMobile ? "14px 12px" : "12px", // Larger touch target
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "16px", // Prevent iOS zoom
                              transition: "all 0.2s",
                              minHeight: "44px", // Touch target
                              boxSizing: "border-box",
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
                        gap: isMobile ? "10px" : "15px", // Smaller gap on mobile
                        padding: isMobile ? "10px" : "12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        backgroundColor: "#f9fafb",
                        flexWrap: isMobile ? "wrap" : "nowrap", // Wrap on mobile
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                          padding: isMobile ? "12px 16px" : "8px 12px", // Larger touch target
                          borderRadius: "6px",
                          backgroundColor: formData.billingType === "GST" ? "#eef2ff" : "transparent",
                          border: formData.billingType === "GST" ? "2px solid #6366f1" : "2px solid transparent",
                          transition: "all 0.2s",
                          flex: isMobile ? "1 1 100%" : "1", // Full width on mobile
                          minHeight: "44px", // Touch target
                          justifyContent: "center",
                        }}
                      >
                        <input
                          type="radio"
                          value="GST"
                          checked={formData.billingType === "GST"}
                          onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
                          style={{ cursor: "pointer" }}
                        />
                        <span style={{ 
                          fontWeight: formData.billingType === "GST" ? "600" : "400",
                          color: "#1f2937",
                          fontSize: "14px"
                        }}>💰 GST</span>
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                          padding: isMobile ? "12px 16px" : "8px 12px", // Larger touch target
                          borderRadius: "6px",
                          backgroundColor: formData.billingType === "NON_GST" ? "#eef2ff" : "transparent",
                          border: formData.billingType === "NON_GST" ? "2px solid #6366f1" : "2px solid transparent",
                          transition: "all 0.2s",
                          flex: isMobile ? "1 1 100%" : "1", // Full width on mobile
                          minHeight: "44px", // Touch target
                          justifyContent: "center",
                        }}
                      >
                        <input
                          type="radio"
                          value="NON_GST"
                          checked={formData.billingType === "NON_GST"}
                          onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
                          style={{ cursor: "pointer" }}
                        />
                        <span style={{ 
                          fontWeight: formData.billingType === "NON_GST" ? "600" : "400",
                          color: "#1f2937",
                          fontSize: "14px"
                        }}>💵 Non-GST</span>
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
              <div style={{ 
                marginBottom: isMobile ? "20px" : "30px",
                width: "100%",
                boxSizing: "border-box",
              }}>
                <h3 style={{ 
                  color: "#374151", 
                  fontSize: isMobile ? "16px" : "18px", 
                  fontWeight: "600", 
                  marginBottom: isMobile ? "12px" : "15px" 
                }}>
                  📅 Quotation Dates
                </h3>
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
                    gap: isMobile ? "16px" : "25px",
                    width: "100%",
                    boxSizing: "border-box",
                  }}>
                    <div style={{
                      width: "100%",
                      boxSizing: "border-box",
                    }}>
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
                        maxWidth: "100%",
                        padding: isMobile ? "14px 12px" : "12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "16px", // Prevent iOS zoom
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                        minHeight: "44px", // Touch target
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                    />
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>📌 Date when quotation is created</p>
                  </div>
                  <div style={{
                    width: "100%",
                    boxSizing: "border-box",
                  }}>
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
                        maxWidth: "100%",
                        padding: isMobile ? "14px 12px" : "12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "16px", // Prevent iOS zoom
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                        minHeight: "44px", // Touch target
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
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
                    gap: isMobile ? "16px" : "25px",
                    width: "100%",
                  }}>
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
                          padding: isMobile ? "14px 12px" : "12px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                          fontSize: "16px", // Prevent iOS zoom
                          transition: "all 0.2s",
                          minHeight: "44px", // Touch target
                          boxSizing: "border-box",
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
                          padding: isMobile ? "14px 12px" : "12px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                          fontSize: "16px", // Prevent iOS zoom
                          transition: "all 0.2s",
                          minHeight: "44px", // Touch target
                          boxSizing: "border-box",
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
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", 
                  gap: isMobile ? "16px" : "25px",
                  width: "100%",
                }}>
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
                        padding: isMobile ? "14px 12px" : "12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "16px", // Prevent iOS zoom
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                        minHeight: "44px", // Touch target
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
                      Discount
                    </label>
                    <div style={{ 
                      display: "flex", 
                      gap: isMobile ? "8px" : "10px", 
                      marginBottom: "8px",
                      flexDirection: isMobile ? "column" : "row",
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, discountType: "AMOUNT", discountValue: 0, discount: 0 });
                        }}
                        style={{
                          flex: 1,
                          padding: isMobile ? "12px 16px" : "10px",
                          backgroundColor: formData.discountType === "AMOUNT" ? "#6366f1" : "#e5e7eb",
                          color: formData.discountType === "AMOUNT" ? "white" : "#374151",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: isMobile ? "14px" : "13px",
                          fontWeight: "500",
                          transition: "all 0.2s",
                          minHeight: "44px", // Touch target
                          width: isMobile ? "100%" : "auto",
                        }}
                        onMouseOver={(e) => {
                          if (formData.discountType !== "AMOUNT") {
                            e.target.style.backgroundColor = "#d1d5db";
                          }
                        }}
                        onMouseOut={(e) => {
                          if (formData.discountType !== "AMOUNT") {
                            e.target.style.backgroundColor = "#e5e7eb";
                          }
                        }}
                      >
                        Amount (₹)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, discountType: "PERCENTAGE", discountValue: 0, discount: 0 });
                        }}
                        style={{
                          flex: 1,
                          padding: isMobile ? "12px 16px" : "10px",
                          backgroundColor: formData.discountType === "PERCENTAGE" ? "#6366f1" : "#e5e7eb",
                          color: formData.discountType === "PERCENTAGE" ? "white" : "#374151",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: isMobile ? "14px" : "13px",
                          fontWeight: "500",
                          transition: "all 0.2s",
                          minHeight: "44px", // Touch target
                          width: isMobile ? "100%" : "auto",
                        }}
                        onMouseOver={(e) => {
                          if (formData.discountType !== "PERCENTAGE") {
                            e.target.style.backgroundColor = "#d1d5db";
                          }
                        }}
                        onMouseOut={(e) => {
                          if (formData.discountType !== "PERCENTAGE") {
                            e.target.style.backgroundColor = "#e5e7eb";
                          }
                        }}
                      >
                        Percentage (%)
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step={formData.discountType === "PERCENTAGE" ? "0.01" : "0.01"}
                      max={formData.discountType === "PERCENTAGE" ? "100" : undefined}
                      value={formData.discountValue === 0 ? "" : formData.discountValue}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setFormData({ ...formData, discountValue: value });
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#6366f1";
                        if (e.target.value === "0" || e.target.value === "") {
                          e.target.value = "";
                        }
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#d1d5db";
                        if (e.target.value === "" || e.target.value === "0") {
                          setFormData({ ...formData, discountValue: 0, discount: 0 });
                        }
                      }}
                      placeholder={formData.discountType === "PERCENTAGE" ? "0.00" : "0.00"}
                      style={{
                        width: "100%",
                        padding: isMobile ? "14px 12px" : "12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "16px", // Prevent iOS zoom
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                        minHeight: "44px", // Touch target
                      }}
                    />
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>
                      🎁 {formData.discountType === "PERCENTAGE" 
                        ? "Discount percentage (0-100%)" 
                        : "Discount amount in ₹"}
                    </p>
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
                      padding: isMobile ? "16px" : "25px",
                      marginBottom: isMobile ? "16px" : "20px",
                      borderRadius: "12px",
                      backgroundColor: "#fafafa",
                      transition: "all 0.2s",
                      width: "100%",
                      maxWidth: "100%",
                      boxSizing: "border-box",
                      overflow: "hidden", // Prevent content from overflowing
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

                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
                      gap: isMobile ? "16px" : "20px", 
                      marginBottom: isMobile ? "16px" : "20px",
                      width: "100%",
                    }}>
                      <div style={{ position: "relative" }}>
                        <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                          Glass Type * <span style={{ color: "#ef4444" }}>●</span>
                        </label>
                        <div style={{ position: "relative" }}>
                          <input
                            type="text"
                            required
                            value={item.glassType}
                            onChange={(e) => {
                              let inputVal = e.target.value;
                              // If user types just a number, automatically append "MM"
                              const numberMatch = inputVal.match(/^(\d+)$/);
                              if (numberMatch) {
                                inputVal = numberMatch[1] + "MM";
                              }
                              // If user types number followed by "mm" (lowercase), convert to "MM"
                              const numberMmMatch = inputVal.match(/^(\d+)\s*mm$/i);
                              if (numberMmMatch) {
                                inputVal = numberMmMatch[1] + "MM";
                              }
                              handleItemChange(index, "glassType", inputVal);
                            }}
                            onBlur={(e) => {
                              let inputVal = e.target.value.trim();
                              // On blur, ensure "MM" suffix if it's just a number
                              if (inputVal && /^\d+$/.test(inputVal)) {
                                inputVal = inputVal + "MM";
                                handleItemChange(index, "glassType", inputVal);
                              }
                              // Convert lowercase "mm" to "MM"
                              if (inputVal && /^\d+\s*mm$/i.test(inputVal)) {
                                const number = inputVal.match(/^(\d+)/i)[1];
                                handleItemChange(index, "glassType", number + "MM");
                              }
                            }}
                            onFocus={() => setShowStockDropdown({ ...showStockDropdown, [index]: true })}
                            placeholder="e.g., 5MM or 5 (auto-converts to 5MM)"
                            style={{
                              width: "100%",
                              padding: isMobile ? "14px 40px 14px 12px" : "12px 40px 12px 12px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "16px", // Prevent iOS zoom
                              transition: "all 0.2s",
                              boxSizing: "border-box",
                              minHeight: "44px", // Touch target
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
                              maxHeight: "400px",
                              overflowY: "auto",
                              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                            }}
                          >
                            <div style={{ padding: "8px 12px", backgroundColor: "#f3f4f6", borderBottom: "1px solid #e5e7eb", fontWeight: "600", fontSize: "12px", color: "#6b7280" }}>
                              Available Stock ({allStock.filter(s => s.quantity > 0).length} items)
                            </div>
                            {allStock.filter(s => s.quantity > 0).length === 0 ? (
                              <div style={{ padding: "16px", textAlign: "center", color: "#9ca3af", fontSize: "14px" }}>
                                No stock available
                              </div>
                            ) : (
                              allStock
                                .filter(s => s.quantity > 0)
                                .map((stockItem, stockIndex) => {
                                  const glassType = stockItem.glass?.type || "Unknown";
                                  const thickness = stockItem.glass?.thickness || "";
                                  const unit = stockItem.glass?.unit || "MM";
                                  const size = stockItem.height && stockItem.width 
                                    ? `${stockItem.height} × ${stockItem.width}` 
                                    : "N/A";
                                  return (
                                    <div
                                      key={`${stockItem.id}-${stockIndex}`}
                                      style={{
                                        padding: "12px",
                                        borderBottom: "1px solid #e5e7eb",
                                        cursor: "pointer",
                                        transition: "background-color 0.2s",
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                                      onClick={() => handleGlassTypeSelect(index, glassType, stockItem)}
                                    >
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div style={{ flex: 1 }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                            <div style={{ fontWeight: "600", color: "#1f2937", fontSize: "14px" }}>
                                              {glassType}
                                            </div>
                                            {thickness && (
                                              <span style={{ fontSize: "12px", color: "#6b7280", backgroundColor: "#e5e7eb", padding: "2px 6px", borderRadius: "4px" }}>
                                                {thickness}{unit}
                                              </span>
                                            )}
                                          </div>
                                          <div style={{ fontSize: "12px", color: "#6b7280", display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                                            <span>📏 Size: {size}</span>
                                            <span>📍 Stand: {stockItem.standNo}</span>
                                            <span>📦 Qty: {stockItem.quantity}</span>
                                            {stockItem.hsnNo && <span>🏷️ HSN: {stockItem.hsnNo}</span>}
                                          </div>
                                        </div>
                                        <span style={{ fontSize: "20px", color: "#22c55e", marginLeft: "8px" }}>✓</span>
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
                      {/* Size Input with MM/INCH Toggle */}
                      <div style={{ gridColumn: isMobile ? "1" : "1 / -1", marginBottom: "10px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={item.sizeInMM || false}
                            onChange={(e) => handleItemChange(index, "sizeInMM", e.target.checked)}
                            style={{ cursor: "pointer", width: "18px", height: "18px" }}
                          />
                          <span style={{ color: "#374151", fontWeight: "500", fontSize: "14px" }}>Size in mm</span>
                        </label>
                      </div>
                      
                      <div style={{
                        width: "100%",
                        boxSizing: "border-box",
                      }}>
                        <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                          Height * <span style={{ color: "#ef4444" }}>●</span>
                        </label>
                        <div style={{ 
                          display: "flex", 
                          gap: isMobile ? "8px" : "10px",
                          width: "100%",
                          boxSizing: "border-box",
                        }}>
                          <input
                            type="text"
                            required
                            value={item.height || ""}
                            onChange={(e) => handleItemChange(index, "height", e.target.value)}
                            placeholder={item.sizeInMM ? "e.g., 3000 (mm)" : "e.g., 9 or 9 1/2 (inch)"}
                            style={{
                              flex: "1 1 auto",
                              padding: isMobile ? "14px 12px" : "12px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "16px", // Prevent iOS zoom
                              transition: "all 0.2s",
                              boxSizing: "border-box",
                              minHeight: "44px", // Touch target
                              minWidth: 0, // Allow flex shrinking
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                          />
                          <div style={{
                              padding: isMobile ? "14px 8px" : "12px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: isMobile ? "13px" : "14px",
                              backgroundColor: "#f3f4f6",
                              color: "#6b7280",
                              width: isMobile ? "65px" : "100px",
                              minWidth: isMobile ? "65px" : "100px",
                              maxWidth: isMobile ? "65px" : "100px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0, // Prevent shrinking
                              boxSizing: "border-box",
                              minHeight: "44px", // Touch target
                            }}>
                            {item.sizeInMM ? "MM" : "INCH"}
                          </div>
                        </div>
                        <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "11px" }}>
                          {item.sizeInMM ? "📏 Height in millimeters" : "📏 Height in inches (supports fractions: 9 1/2, 9-1/2)"}
                        </p>
                      </div>
                      <div style={{
                        width: "100%",
                        boxSizing: "border-box",
                      }}>
                        <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                          Width * <span style={{ color: "#ef4444" }}>●</span>
                        </label>
                        <div style={{ 
                          display: "flex", 
                          gap: isMobile ? "8px" : "10px",
                          width: "100%",
                          boxSizing: "border-box",
                        }}>
                          <input
                            type="text"
                            required
                            value={item.width || ""}
                            onChange={(e) => handleItemChange(index, "width", e.target.value)}
                            placeholder={item.sizeInMM ? "e.g., 2000 (mm)" : "e.g., 6 or 6 1/2 (inch)"}
                            style={{
                              flex: "1 1 auto",
                              padding: isMobile ? "14px 12px" : "12px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "16px", // Prevent iOS zoom
                              transition: "all 0.2s",
                              boxSizing: "border-box",
                              minHeight: "44px", // Touch target
                              minWidth: 0, // Allow flex shrinking
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                          />
                          <div style={{
                              padding: isMobile ? "14px 8px" : "12px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: isMobile ? "13px" : "14px",
                              backgroundColor: "#f3f4f6",
                              color: "#6b7280",
                              width: isMobile ? "65px" : "100px",
                              minWidth: isMobile ? "65px" : "100px",
                              maxWidth: isMobile ? "65px" : "100px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0, // Prevent shrinking
                              boxSizing: "border-box",
                              minHeight: "44px", // Touch target
                            }}>
                            {item.sizeInMM ? "MM" : "INCH"}
                          </div>
                        </div>
                        <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "11px" }}>
                          {item.sizeInMM ? "📏 Width in millimeters" : "📏 Width in inches (supports fractions: 6 1/2, 6-1/2)"}
                        </p>
                      </div>
                      {/* Table Selection Section */}
                      <div style={{ gridColumn: isMobile ? "1" : "1 / -1", marginTop: "20px", marginBottom: "20px" }}>
                        <h4 style={{ color: "#374151", fontSize: "16px", fontWeight: "600", marginBottom: "15px" }}>
                          📊 Table Selection
                        </h4>
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "20px" }}>
                          {/* Height Table */}
                          <div style={{
                            border: "2px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "15px",
                            backgroundColor: "#fafafa",
                          }}>
                            <label style={{ display: "block", marginBottom: "10px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                              Height Table
                            </label>
                            <div style={{ display: "flex", gap: "10px", marginBottom: "15px", alignItems: "center" }}>
                              <label style={{ fontSize: "13px", color: "#6b7280" }}>Table:</label>
                              <input
                                type="text"
                                value={item.heightTableNumber !== undefined && item.heightTableNumber !== null ? String(item.heightTableNumber) : "6"}
                                onChange={(e) => {
                                  const inputVal = e.target.value;
                                  // Allow empty string for deletion
                                  if (inputVal === "") {
                                    const newItems = [...formData.items];
                                    newItems[index].heightTableNumber = "";
                                    setFormData({ ...formData, items: newItems });
                                    return;
                                  }
                                  // Only allow digits, max 2 digits
                                  const digitsOnly = inputVal.replace(/[^0-9]/g, '');
                                  if (digitsOnly.length <= 2 && digitsOnly !== "") {
                                    const newItems = [...formData.items];
                                    newItems[index].heightTableNumber = digitsOnly;
                                    // Recalculate table value if we have height
                                    if (newItems[index].height) {
                                      const numValue = parseInt(digitsOnly);
                                      if (!isNaN(numValue) && numValue > 0) {
                                        const tableValue = findNextTableValue(parseFraction(newItems[index].height || 0), numValue);
                                        newItems[index].selectedHeightTableValue = tableValue;
                                        updatePolishSelectionNumbers(newItems[index]);
                                      }
                                    }
                                    setFormData({ ...formData, items: newItems });
                                  }
                                }}
                                onBlur={(e) => {
                                  const inputVal = e.target.value;
                                  if (!inputVal || inputVal === "") {
                                    handleItemChange(index, "heightTableNumber", 6);
                                    return;
                                  }
                                  const num = parseInt(inputVal);
                                  if (isNaN(num) || num < 1) {
                                    handleItemChange(index, "heightTableNumber", 1);
                                  } else if (num > 12) {
                                    handleItemChange(index, "heightTableNumber", 12);
                                  } else {
                                    handleItemChange(index, "heightTableNumber", num);
                                  }
                                }}
                                style={{
                                  width: "60px",
                                  padding: "8px",
                                  borderRadius: "6px",
                                  border: "1px solid #d1d5db",
                                  fontSize: "14px",
                                  textAlign: "center",
                                }}
                              />
                            </div>
                            <div style={{ 
                              display: "flex", 
                              flexWrap: "wrap", 
                              gap: isMobile ? "6px" : "8px", // Smaller gap on mobile
                            }}>
                              {generateTableValues(item.heightTableNumber || 6).map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => {
                                    const newItems = [...formData.items];
                                    newItems[index].selectedHeightTableValue = val;
                                    updatePolishSelectionNumbers(newItems[index]);
                                    setFormData({ ...formData, items: newItems });
                                  }}
                                  style={{
                                    padding: isMobile ? "10px 14px" : "8px 12px", // Larger touch target on mobile
                                    borderRadius: "6px",
                                    border: "2px solid",
                                    borderColor: item.selectedHeightTableValue === val ? "#6366f1" : "#d1d5db",
                                    backgroundColor: item.selectedHeightTableValue === val ? "#eef2ff" : "white",
                                    color: item.selectedHeightTableValue === val ? "#6366f1" : "#374151",
                                    fontWeight: item.selectedHeightTableValue === val ? "600" : "400",
                                    cursor: "pointer",
                                    fontSize: isMobile ? "14px" : "13px", // Larger font on mobile
                                    transition: "all 0.2s",
                                    minHeight: isMobile ? "44px" : "auto", // Touch target
                                    minWidth: isMobile ? "44px" : "auto",
                                    flex: isMobile ? "1 1 calc(33.333% - 4px)" : "none", // Responsive button sizing
                                    maxWidth: isMobile ? "calc(33.333% - 4px)" : "none",
                                  }}
                                  onMouseOver={(e) => {
                                    if (item.selectedHeightTableValue !== val) {
                                      e.target.style.borderColor = "#6366f1";
                                      e.target.style.backgroundColor = "#f3f4f6";
                                    }
                                  }}
                                  onMouseOut={(e) => {
                                    if (item.selectedHeightTableValue !== val) {
                                      e.target.style.borderColor = "#d1d5db";
                                      e.target.style.backgroundColor = "white";
                                    }
                                  }}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                            {item.selectedHeightTableValue && (
                              <p style={{ marginTop: "10px", fontSize: "12px", color: "#6366f1", fontWeight: "500" }}>
                                Selected: {item.selectedHeightTableValue}
                              </p>
                            )}
                          </div>

                          {/* Width Table */}
                          <div style={{
                            border: "2px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: isMobile ? "12px" : "15px",
                            backgroundColor: "#fafafa",
                            width: "100%",
                            boxSizing: "border-box",
                          }}>
                            <label style={{ display: "block", marginBottom: "10px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                              Width Table
                            </label>
                            <div style={{ display: "flex", gap: "10px", marginBottom: "15px", alignItems: "center" }}>
                              <label style={{ fontSize: "13px", color: "#6b7280" }}>Table:</label>
                              <input
                                type="text"
                                value={item.widthTableNumber !== undefined && item.widthTableNumber !== null ? String(item.widthTableNumber) : "6"}
                                onChange={(e) => {
                                  const inputVal = e.target.value;
                                  // Allow empty string for deletion
                                  if (inputVal === "") {
                                    const newItems = [...formData.items];
                                    newItems[index].widthTableNumber = "";
                                    setFormData({ ...formData, items: newItems });
                                    return;
                                  }
                                  // Only allow digits, max 2 digits
                                  const digitsOnly = inputVal.replace(/[^0-9]/g, '');
                                  if (digitsOnly.length <= 2 && digitsOnly !== "") {
                                    const newItems = [...formData.items];
                                    newItems[index].widthTableNumber = digitsOnly;
                                    // Recalculate table value if we have width
                                    if (newItems[index].width) {
                                      const numValue = parseInt(digitsOnly);
                                      if (!isNaN(numValue) && numValue > 0) {
                                        const tableValue = findNextTableValue(parseFraction(newItems[index].width || 0), numValue);
                                        newItems[index].selectedWidthTableValue = tableValue;
                                        updatePolishSelectionNumbers(newItems[index]);
                                      }
                                    }
                                    setFormData({ ...formData, items: newItems });
                                  }
                                }}
                                onBlur={(e) => {
                                  const inputVal = e.target.value;
                                  if (!inputVal || inputVal === "") {
                                    handleItemChange(index, "widthTableNumber", 6);
                                    return;
                                  }
                                  const num = parseInt(inputVal);
                                  if (isNaN(num) || num < 1) {
                                    handleItemChange(index, "widthTableNumber", 1);
                                  } else if (num > 12) {
                                    handleItemChange(index, "widthTableNumber", 12);
                                  } else {
                                    handleItemChange(index, "widthTableNumber", num);
                                  }
                                }}
                                style={{
                                  width: "60px",
                                  padding: "8px",
                                  borderRadius: "6px",
                                  border: "1px solid #d1d5db",
                                  fontSize: "14px",
                                  textAlign: "center",
                                }}
                              />
                            </div>
                            <div style={{ 
                              display: "flex", 
                              flexWrap: "wrap", 
                              gap: isMobile ? "6px" : "8px", // Smaller gap on mobile
                            }}>
                              {generateTableValues(item.widthTableNumber || 6).map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => {
                                    const newItems = [...formData.items];
                                    newItems[index].selectedWidthTableValue = val;
                                    updatePolishSelectionNumbers(newItems[index]);
                                    setFormData({ ...formData, items: newItems });
                                  }}
                                  style={{
                                    padding: isMobile ? "10px 14px" : "8px 12px", // Larger touch target on mobile
                                    borderRadius: "6px",
                                    border: "2px solid",
                                    borderColor: item.selectedWidthTableValue === val ? "#6366f1" : "#d1d5db",
                                    backgroundColor: item.selectedWidthTableValue === val ? "#eef2ff" : "white",
                                    color: item.selectedWidthTableValue === val ? "#6366f1" : "#374151",
                                    fontWeight: item.selectedWidthTableValue === val ? "600" : "400",
                                    cursor: "pointer",
                                    fontSize: isMobile ? "14px" : "13px", // Larger font on mobile
                                    transition: "all 0.2s",
                                    minHeight: isMobile ? "44px" : "auto", // Touch target
                                    minWidth: isMobile ? "44px" : "auto",
                                    flex: isMobile ? "1 1 calc(33.333% - 4px)" : "none", // Responsive button sizing
                                    maxWidth: isMobile ? "calc(33.333% - 4px)" : "none",
                                  }}
                                  onMouseOver={(e) => {
                                    if (item.selectedWidthTableValue !== val) {
                                      e.target.style.borderColor = "#6366f1";
                                      e.target.style.backgroundColor = "#f3f4f6";
                                    }
                                  }}
                                  onMouseOut={(e) => {
                                    if (item.selectedWidthTableValue !== val) {
                                      e.target.style.borderColor = "#d1d5db";
                                      e.target.style.backgroundColor = "white";
                                    }
                                  }}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                            {item.selectedWidthTableValue && (
                              <p style={{ marginTop: "10px", fontSize: "12px", color: "#6366f1", fontWeight: "500" }}>
                                Selected: {item.selectedWidthTableValue}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>


                      {/* Polish Type Section */}
                      <div style={{ gridColumn: isMobile ? "1" : "1 / -1", marginTop: "20px", marginBottom: "15px" }}>
                        <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                          Polish Type (Optional)
                        </label>
                        <div style={{
                          display: "flex",
                          gap: "20px",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                          backgroundColor: "#f9fafb",
                        }}>
                          <label style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: "pointer",
                            padding: "8px 12px",
                            borderRadius: "6px",
                            backgroundColor: item.polish === "Hand-Polish" ? "#eef2ff" : "transparent",
                            border: item.polish === "Hand-Polish" ? "2px solid #6366f1" : "2px solid transparent",
                            transition: "all 0.2s",
                            flex: 1,
                          }}>
                            <input
                              type="radio"
                              name={`polish-type-${index}`}
                              value="Hand-Polish"
                              checked={item.polish === "Hand-Polish"}
                              onChange={(e) => handleItemChange(index, "polish", e.target.value)}
                              style={{ cursor: "pointer" }}
                            />
                            <span style={{ fontWeight: item.polish === "Hand-Polish" ? "600" : "400", color: "#374151" }}>Hand-Polish</span>
                          </label>
                          <label style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: "pointer",
                            padding: "8px 12px",
                            borderRadius: "6px",
                            backgroundColor: item.polish === "CNC Polish" ? "#eef2ff" : "transparent",
                            border: item.polish === "CNC Polish" ? "2px solid #6366f1" : "2px solid transparent",
                            transition: "all 0.2s",
                            flex: 1,
                          }}>
                            <input
                              type="radio"
                              name={`polish-type-${index}`}
                              value="CNC Polish"
                              checked={item.polish === "CNC Polish"}
                              onChange={(e) => handleItemChange(index, "polish", e.target.value)}
                              style={{ cursor: "pointer" }}
                            />
                            <span style={{ fontWeight: item.polish === "CNC Polish" ? "600" : "400", color: "#374151" }}>CNC Polish</span>
                          </label>
                        </div>
                        <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "11px" }}>✨ Select the type of polish for this item</p>
                      </div>

                      {/* Polish Selection Section */}
                      <div style={{ gridColumn: isMobile ? "1" : "1 / -1", marginTop: "20px", marginBottom: "20px" }}>
                        <h4 style={{ color: "#374151", fontSize: "16px", fontWeight: "600", marginBottom: "15px" }}>
                          ✨ Polish Selection
                        </h4>
                        
                        {/* Rate Configuration */}
                        <div style={{
                          border: "2px solid #e5e7eb",
                          borderRadius: "8px",
                          padding: "15px",
                          marginBottom: "15px",
                          backgroundColor: "#fafafa",
                        }}>
                          <label style={{ display: "block", marginBottom: "10px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                            Rate/Rft Configuration
                          </label>
                          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: "15px" }}>
                            <div>
                              <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", color: "#6b7280" }}>P (Polish)</label>
                              <input
                                type="text"
                                value={item.polishRates?.P !== undefined && item.polishRates?.P !== null ? String(item.polishRates.P) : "15"}
                                onChange={(e) => {
                                  const inputVal = e.target.value;
                                  // Allow empty string for deletion
                                  if (inputVal === "") {
                                    const newItems = [...formData.items];
                                    if (!newItems[index].polishRates) newItems[index].polishRates = { P: 15, H: 75, B: 75 };
                                    newItems[index].polishRates.P = "";
                                    setFormData({ ...formData, items: newItems });
                                    return;
                                  }
                                  // Allow digits and decimal point
                                  const validInput = inputVal.replace(/[^0-9.]/g, '');
                                  // Ensure only one decimal point
                                  const parts = validInput.split('.');
                                  const finalInput = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : validInput;
                                  if (finalInput !== "") {
                                    const newItems = [...formData.items];
                                    if (!newItems[index].polishRates) newItems[index].polishRates = { P: 15, H: 75, B: 75 };
                                    newItems[index].polishRates.P = finalInput;
                                    setFormData({ ...formData, items: newItems });
                                  }
                                }}
                                onBlur={(e) => {
                                  const inputVal = e.target.value;
                                  if (!inputVal || inputVal === "") {
                                    handlePolishRateChange(index, "P", 15);
                                  } else {
                                    const num = parseFloat(inputVal);
                                    if (isNaN(num) || num < 0) {
                                      handlePolishRateChange(index, "P", 0);
                                    } else {
                                      handlePolishRateChange(index, "P", num);
                                    }
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "8px",
                                  borderRadius: "6px",
                                  border: "1px solid #d1d5db",
                                  fontSize: "14px",
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", color: "#6b7280" }}>H (Half-round)</label>
                              <input
                                type="text"
                                value={item.polishRates?.H !== undefined && item.polishRates?.H !== null ? String(item.polishRates.H) : "75"}
                                onChange={(e) => {
                                  const inputVal = e.target.value;
                                  // Allow empty string for deletion
                                  if (inputVal === "") {
                                    const newItems = [...formData.items];
                                    if (!newItems[index].polishRates) newItems[index].polishRates = { P: 15, H: 75, B: 75 };
                                    newItems[index].polishRates.H = "";
                                    setFormData({ ...formData, items: newItems });
                                    return;
                                  }
                                  // Allow digits and decimal point
                                  const validInput = inputVal.replace(/[^0-9.]/g, '');
                                  // Ensure only one decimal point
                                  const parts = validInput.split('.');
                                  const finalInput = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : validInput;
                                  if (finalInput !== "") {
                                    const newItems = [...formData.items];
                                    if (!newItems[index].polishRates) newItems[index].polishRates = { P: 15, H: 75, B: 75 };
                                    newItems[index].polishRates.H = finalInput;
                                    setFormData({ ...formData, items: newItems });
                                  }
                                }}
                                onBlur={(e) => {
                                  const inputVal = e.target.value;
                                  if (!inputVal || inputVal === "") {
                                    handlePolishRateChange(index, "H", 75);
                                  } else {
                                    const num = parseFloat(inputVal);
                                    if (isNaN(num) || num < 0) {
                                      handlePolishRateChange(index, "H", 0);
                                    } else {
                                      handlePolishRateChange(index, "H", num);
                                    }
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "8px",
                                  borderRadius: "6px",
                                  border: "1px solid #d1d5db",
                                  fontSize: "14px",
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", color: "#6b7280" }}>B (Beveling)</label>
                              <input
                                type="text"
                                value={item.polishRates?.B !== undefined && item.polishRates?.B !== null ? String(item.polishRates.B) : "75"}
                                onChange={(e) => {
                                  const inputVal = e.target.value;
                                  // Allow empty string for deletion
                                  if (inputVal === "") {
                                    const newItems = [...formData.items];
                                    if (!newItems[index].polishRates) newItems[index].polishRates = { P: 15, H: 75, B: 75 };
                                    newItems[index].polishRates.B = "";
                                    setFormData({ ...formData, items: newItems });
                                    return;
                                  }
                                  // Allow digits and decimal point
                                  const validInput = inputVal.replace(/[^0-9.]/g, '');
                                  // Ensure only one decimal point
                                  const parts = validInput.split('.');
                                  const finalInput = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : validInput;
                                  if (finalInput !== "") {
                                    const newItems = [...formData.items];
                                    if (!newItems[index].polishRates) newItems[index].polishRates = { P: 15, H: 75, B: 75 };
                                    newItems[index].polishRates.B = finalInput;
                                    setFormData({ ...formData, items: newItems });
                                  }
                                }}
                                onBlur={(e) => {
                                  const inputVal = e.target.value;
                                  if (!inputVal || inputVal === "") {
                                    handlePolishRateChange(index, "B", 75);
                                  } else {
                                    const num = parseFloat(inputVal);
                                    if (isNaN(num) || num < 0) {
                                      handlePolishRateChange(index, "B", 0);
                                    } else {
                                      handlePolishRateChange(index, "B", num);
                                    }
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "8px",
                                  borderRadius: "6px",
                                  border: "1px solid #d1d5db",
                                  fontSize: "14px",
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Polish Selection Table */}
                        <div style={{
                          border: "2px solid #e5e7eb",
                          borderRadius: "8px",
                          padding: "15px",
                          backgroundColor: "#fafafa",
                        }}>
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                                  <th style={{ padding: "10px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                                    <label style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px", cursor: "pointer" }}>
                                      <span>Side</span>
                                      <input
                                        type="checkbox"
                                        checked={item.polishSelection?.every(row => row.checked) || false}
                                        onChange={(e) => {
                                          const newItems = [...formData.items];
                                          const item = newItems[index];
                                          if (!item.polishSelection) {
                                            item.polishSelection = [
                                              { side: "Height 1", checked: false, type: null, rate: 0 },
                                              { side: "Width 1", checked: false, type: null, rate: 0 },
                                              { side: "Height 2", checked: false, type: null, rate: 0 },
                                              { side: "Width 2", checked: false, type: null, rate: 0 },
                                            ];
                                          }
                                          item.polishSelection.forEach((row) => {
                                            row.checked = e.target.checked;
                                            if (!e.target.checked) {
                                              row.type = null;
                                              row.rate = 0;
                                            }
                                          });
                                          setFormData({ ...formData, items: newItems });
                                        }}
                                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                      />
                                    </label>
                                  </th>
                                  <th style={{ padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                                    <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                                      <span>P</span>
                                      <input
                                        type="checkbox"
                                        checked={item.polishSelection?.every(row => row.checked && row.type === "P") || false}
                                        onChange={(e) => handlePolishSelectAll(index, "P", e.target.checked)}
                                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                      />
                                    </label>
                                  </th>
                                  <th style={{ padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                                    <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                                      <span>H</span>
                                      <input
                                        type="checkbox"
                                        checked={item.polishSelection?.every(row => row.checked && row.type === "H") || false}
                                        onChange={(e) => handlePolishSelectAll(index, "H", e.target.checked)}
                                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                      />
                                    </label>
                                  </th>
                                  <th style={{ padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                                    <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                                      <span>B</span>
                                      <input
                                        type="checkbox"
                                        checked={item.polishSelection?.every(row => row.checked && row.type === "B") || false}
                                        onChange={(e) => handlePolishSelectAll(index, "B", e.target.checked)}
                                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                      />
                                    </label>
                                  </th>
                                  <th style={{ padding: "10px", textAlign: "right", fontSize: "13px", fontWeight: "600", color: "#374151" }}>Rate</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(item.polishSelection || [
                                  { side: "Height 1", checked: false, type: null, rate: 0 },
                                  { side: "Width 1", checked: false, type: null, rate: 0 },
                                  { side: "Height 2", checked: false, type: null, rate: 0 },
                                  { side: "Width 2", checked: false, type: null, rate: 0 },
                                ]).map((row, rowIndex) => (
                                  <tr key={rowIndex} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                    <td style={{ padding: "10px" }}>
                                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                                        <input
                                          type="checkbox"
                                          checked={row.checked || false}
                                          onChange={(e) => handlePolishCheckboxChange(index, rowIndex, e.target.checked)}
                                          style={{ cursor: "pointer", width: "18px", height: "18px" }}
                                        />
                                        <span style={{ fontSize: "13px", color: "#374151" }}>{row.side}</span>
                                      </label>
                                    </td>
                                    <td style={{ padding: "10px", textAlign: "center" }}>
                                      <input
                                        type="radio"
                                        name={`polish-${index}-${rowIndex}`}
                                        checked={row.type === "P"}
                                        onChange={() => handlePolishTypeChange(index, rowIndex, "P")}
                                        disabled={!row.checked}
                                        style={{ cursor: row.checked ? "pointer" : "not-allowed", width: "18px", height: "18px" }}
                                      />
                                    </td>
                                    <td style={{ padding: "10px", textAlign: "center" }}>
                                      <input
                                        type="radio"
                                        name={`polish-${index}-${rowIndex}`}
                                        checked={row.type === "H"}
                                        onChange={() => handlePolishTypeChange(index, rowIndex, "H")}
                                        disabled={!row.checked}
                                        style={{ cursor: row.checked ? "pointer" : "not-allowed", width: "18px", height: "18px" }}
                                      />
                                    </td>
                                    <td style={{ padding: "10px", textAlign: "center" }}>
                                      <input
                                        type="radio"
                                        name={`polish-${index}-${rowIndex}`}
                                        checked={row.type === "B"}
                                        onChange={() => handlePolishTypeChange(index, rowIndex, "B")}
                                        disabled={!row.checked}
                                        style={{ cursor: row.checked ? "pointer" : "not-allowed", width: "18px", height: "18px" }}
                                      />
                                    </td>
                                    <td style={{ padding: "10px", textAlign: "right", fontSize: "13px", color: "#6b7280" }}>
                                      {row.checked && row.type ? `₹${row.rate || 0}` : "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Quantity and Rate per SqFt - Below Polish Section */}
                      <div style={{ gridColumn: isMobile ? "1" : "1 / 2", marginTop: "20px" }}>
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
                            padding: isMobile ? "14px 12px" : "12px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            fontSize: "16px", // Prevent iOS zoom
                            transition: "all 0.2s",
                            minHeight: "44px", // Touch target
                            boxSizing: "border-box",
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
                            padding: isMobile ? "14px 12px" : "12px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            fontSize: "16px", // Prevent iOS zoom
                            transition: "all 0.2s",
                            boxSizing: "border-box",
                            minHeight: "44px", // Touch target
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                          onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                        />
                        <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "11px" }}>💰 Price per square foot</p>
                      </div>

                      <div style={{
                        width: "100%",
                        boxSizing: "border-box",
                      }}>
                        <label style={{ 
                          display: "block", 
                          marginBottom: "8px", 
                          color: "#374151", 
                          fontWeight: "500", 
                          fontSize: isMobile ? "13px" : "14px" 
                        }}>
                          Area ({getAreaUnitLabel(item.heightUnit, item.widthUnit)}) 🔒
                        </label>
                        <input
                          type="number"
                          readOnly
                          value={
                            calculateAreaInUnit(
                              item.height || 0,
                              item.width || 0,
                              item.heightUnit || "FEET",
                              item.widthUnit || "FEET"
                            ).toFixed(2) || "0.00"
                          }
                          style={{
                            width: "100%",
                            maxWidth: "100%",
                            padding: isMobile ? "14px 12px" : "12px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            fontSize: "16px", // Prevent iOS zoom
                            backgroundColor: "#f3f4f6",
                            color: "#6b7280",
                            cursor: "not-allowed",
                            boxSizing: "border-box",
                            minHeight: "44px", // Touch target
                          }}
                        />
                        <p style={{ marginTop: "5px", color: "#6b7280", fontSize: isMobile ? "11px" : "11px" }}>
                          ✨ Auto-calculated in {getAreaUnitLabel(item.heightUnit, item.widthUnit)} (rate calculation uses SqFt)
                        </p>
                      </div>
                      <div style={{
                        width: "100%",
                        boxSizing: "border-box",
                      }}>
                        <label style={{ 
                          display: "block", 
                          marginBottom: "8px", 
                          color: "#374151", 
                          fontWeight: "500", 
                          fontSize: isMobile ? "13px" : "14px" 
                        }}>
                          Subtotal (₹) 🔒
                        </label>
                        <input
                          type="number"
                          readOnly
                          value={
                            (() => {
                              // Use table values if available, otherwise fallback to input values
                              const heightTableValue = item.selectedHeightTableValue ? parseFloat(item.selectedHeightTableValue) : parseFraction(item.height || 0);
                              const widthTableValue = item.selectedWidthTableValue ? parseFloat(item.selectedWidthTableValue) : parseFraction(item.width || 0);
                              
                              // Convert table values to feet
                              const heightInFeet = convertToFeet(heightTableValue, item.heightUnit || "FEET");
                              const widthInFeet = convertToFeet(widthTableValue, item.widthUnit || "FEET");
                              
                              // Calculate subtotal: area × rate × quantity
                              const areaInFeet = heightInFeet * widthInFeet;
                              const rate = parseFloat(item.ratePerSqft) || 0;
                              const qty = parseInt(item.quantity) || 0;
                              return (areaInFeet * rate * qty).toFixed(2);
                            })()
                          }
                          style={{
                            width: "100%",
                            maxWidth: "100%",
                            padding: isMobile ? "14px 12px" : "12px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            fontSize: "16px", // Prevent iOS zoom
                            backgroundColor: "#fef3c7",
                            color: "#92400e",
                            fontWeight: "600",
                            cursor: "not-allowed",
                            boxSizing: "border-box",
                            minHeight: "44px", // Touch target
                          }}
                        />
                        <p style={{ marginTop: "5px", color: "#6b7280", fontSize: isMobile ? "11px" : "11px" }}>✨ Auto-calculated: (Table height × Table width in ft) × Rate per SqFt × Quantity</p>
                      </div>
                      <div style={{
                        width: "100%",
                        boxSizing: "border-box",
                      }}>
                        <label style={{ 
                          display: "block", 
                          marginBottom: "8px", 
                          color: "#374151", 
                          fontWeight: "500", 
                          fontSize: isMobile ? "13px" : "14px" 
                        }}>
                          Running Ft (₹) 🔒
                        </label>
                        <input
                          type="number"
                          readOnly
                          value={
                            (() => {
                              if (!item.polishSelection || !item.selectedHeightTableValue || !item.selectedWidthTableValue) return "0.00";
                              
                              // Use table values instead of input height/width
                              const heightTableValue = parseFloat(item.selectedHeightTableValue) || 0;
                              const widthTableValue = parseFloat(item.selectedWidthTableValue) || 0;
                              
                              // Convert table values to feet
                              const heightInFeet = convertToFeet(heightTableValue, item.heightUnit || "FEET");
                              const widthInFeet = convertToFeet(widthTableValue, item.widthUnit || "FEET");
                              
                              // Group sides by polish type
                              const polishGroups = {
                                'P': { sides: [], rate: item.polishRates?.P || 15 },
                                'H': { sides: [], rate: item.polishRates?.H || 75 },
                                'B': { sides: [], rate: item.polishRates?.B || 75 }
                              };
                              
                              // Process each polish selection row and group by type
                              if (item.polishSelection && item.polishSelection.length >= 4) {
                                // Height 1 (index 0)
                                if (item.polishSelection[0].checked && item.polishSelection[0].type) {
                                  const type = item.polishSelection[0].type;
                                  if (polishGroups[type]) {
                                    polishGroups[type].sides.push(heightInFeet);
                                  }
                                }
                                
                                // Width 1 (index 1)
                                if (item.polishSelection[1].checked && item.polishSelection[1].type) {
                                  const type = item.polishSelection[1].type;
                                  if (polishGroups[type]) {
                                    polishGroups[type].sides.push(widthInFeet);
                                  }
                                }
                                
                                // Height 2 (index 2)
                                if (item.polishSelection[2].checked && item.polishSelection[2].type) {
                                  const type = item.polishSelection[2].type;
                                  if (polishGroups[type]) {
                                    polishGroups[type].sides.push(heightInFeet);
                                  }
                                }
                                
                                // Width 2 (index 3)
                                if (item.polishSelection[3].checked && item.polishSelection[3].type) {
                                  const type = item.polishSelection[3].type;
                                  if (polishGroups[type]) {
                                    polishGroups[type].sides.push(widthInFeet);
                                  }
                                }
                              }
                              
                              // Calculate for each polish type group
                              let totalRunningFt = 0;
                              Object.keys(polishGroups).forEach(type => {
                                const group = polishGroups[type];
                                if (group.sides.length > 0) {
                                  // Sum all sides in this group
                                  const totalLengthInFeet = group.sides.reduce((sum, side) => sum + side, 0);
                                  // Multiply by polish rate for this type
                                  totalRunningFt += totalLengthInFeet * group.rate;
                                }
                              });
                              
                              // Multiply by quantity (NO Rate per SqFt multiplication)
                              const quantity = parseInt(item.quantity) || 1;
                              return (totalRunningFt * quantity).toFixed(2);
                            })()
                          }
                          style={{
                            width: "100%",
                            maxWidth: "100%",
                            padding: isMobile ? "14px 12px" : "12px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            fontSize: "16px", // Prevent iOS zoom
                            backgroundColor: "#e0f2fe",
                            color: "#0c4a6e",
                            fontWeight: "600",
                            cursor: "not-allowed",
                            boxSizing: "border-box",
                            minHeight: "44px", // Touch target
                          }}
                        />
                        <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "11px" }}>✨ Auto-calculated: Group by polish type, sum sides, convert to ft, × polish rate, sum all, × Quantity</p>
                      </div>
                    </div>

                    {formData.billingType === "GST" && (
                      <div style={{ 
                        marginBottom: isMobile ? "12px" : "15px",
                        width: "100%",
                        boxSizing: "border-box",
                      }}>
                        <label style={{ 
                          display: "block", 
                          marginBottom: "8px", 
                          color: "#374151", 
                          fontWeight: "500", 
                          fontSize: isMobile ? "13px" : "14px" 
                        }}>
                          HSN Code (Optional)
                        </label>
                        <input
                          type="text"
                          value={item.hsnCode}
                          onChange={(e) => handleItemChange(index, "hsnCode", e.target.value)}
                          placeholder="e.g., 7003, 7004"
                          style={{
                            width: "100%",
                            maxWidth: "100%",
                            padding: isMobile ? "14px 12px" : "12px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            fontSize: "16px", // Prevent iOS zoom
                            transition: "all 0.2s",
                            boxSizing: "border-box",
                            minHeight: "44px", // Touch target
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                          onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                        />
                        <p style={{ marginTop: "5px", color: "#6b7280", fontSize: isMobile ? "11px" : "11px" }}>📋 HSN code for GST (optional)</p>
                      </div>
                    )}

                    <div style={{
                      width: "100%",
                      boxSizing: "border-box",
                    }}>
                      <label style={{ 
                        display: "block", 
                        marginBottom: "8px", 
                        color: "#374151", 
                        fontWeight: "500", 
                        fontSize: isMobile ? "13px" : "14px" 
                      }}>
                        Description (Optional)
                      </label>
                      <textarea
                        value={item.description}
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        placeholder="Add any additional notes or specifications for this item..."
                        style={{
                          width: "100%",
                          maxWidth: "100%",
                          padding: isMobile ? "14px 12px" : "12px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                          fontSize: "16px", // Prevent iOS zoom
                          minHeight: isMobile ? "100px" : "80px",
                          resize: "vertical",
                          fontFamily: "inherit",
                          transition: "all 0.2s",
                          boxSizing: "border-box",
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
              <table style={{ 
                width: "100%", 
                borderCollapse: "collapse", 
                minWidth: isMobile ? "auto" : "800px", // Remove fixed minWidth on mobile
              }}>
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
                        <td style={{ padding: "12px", fontWeight: "600" }}>₹{(parseFloat(quotation.grandTotal) || 0).toFixed(2)}</td>
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
            )}

            {/* Empty State */}
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
                    <div style={{ fontSize: "20px", color: "#78350f", fontWeight: "700" }}>₹{(parseFloat(selectedQuotation.subtotal) || 0).toFixed(2)}</div>
                  </div>
                  {selectedQuotation.installationCharge > 0 && (
                    <div>
                      <div style={{ fontSize: "13px", color: "#92400e", marginBottom: "5px" }}>Installation Charge</div>
                      <div style={{ fontSize: "16px", color: "#78350f", fontWeight: "600" }}>₹{(parseFloat(selectedQuotation.installationCharge) || 0).toFixed(2)}</div>
                    </div>
                  )}
                  {selectedQuotation.transportCharge > 0 && (
                    <div>
                      <div style={{ fontSize: "13px", color: "#92400e", marginBottom: "5px" }}>
                        Transport Charge {selectedQuotation.transportationRequired && "🚚"}
                      </div>
                      <div style={{ fontSize: "16px", color: "#78350f", fontWeight: "600" }}>₹{(parseFloat(selectedQuotation.transportCharge) || 0).toFixed(2)}</div>
                    </div>
                  )}
                  {selectedQuotation.discount > 0 && (
                    <div>
                      <div style={{ fontSize: "13px", color: "#92400e", marginBottom: "5px" }}>
                        Discount {selectedQuotation.discountType === "PERCENTAGE" && selectedQuotation.discountValue 
                          ? `(${selectedQuotation.discountValue}%)` 
                          : ""}
                      </div>
                      <div style={{ fontSize: "16px", color: "#78350f", fontWeight: "600" }}>₹{(parseFloat(selectedQuotation.discount) || 0).toFixed(2)}</div>
                    </div>
                  )}
                  {selectedQuotation.billingType === "GST" && selectedQuotation.gstAmount > 0 && (
                    <>
                      <div>
                        <div style={{ fontSize: "13px", color: "#92400e", marginBottom: "5px" }}>GST ({selectedQuotation.gstPercentage}%)</div>
                        <div style={{ fontSize: "16px", color: "#78350f", fontWeight: "600" }}>₹{(parseFloat(selectedQuotation.gstAmount) || 0).toFixed(2)}</div>
                      </div>
                      {selectedQuotation.cgst > 0 && (
                        <div>
                          <div style={{ fontSize: "13px", color: "#92400e", marginBottom: "5px" }}>CGST / SGST</div>
                          <div style={{ fontSize: "14px", color: "#78350f" }}>
                            ₹{(parseFloat(selectedQuotation.cgst) || 0).toFixed(2)} / ₹{(parseFloat(selectedQuotation.sgst) || 0).toFixed(2)}
                          </div>
                        </div>
                      )}
                      {selectedQuotation.igst > 0 && (
                        <div>
                          <div style={{ fontSize: "13px", color: "#92400e", marginBottom: "5px" }}>IGST</div>
                          <div style={{ fontSize: "16px", color: "#78350f", fontWeight: "600" }}>₹{(parseFloat(selectedQuotation.igst) || 0).toFixed(2)}</div>
                        </div>
                      )}
                    </>
                  )}
                  <div style={{ gridColumn: isMobile ? "1" : "1 / -1", paddingTop: "15px", borderTop: "2px solid #fbbf24" }}>
                    <div style={{ fontSize: "14px", color: "#92400e", marginBottom: "8px", fontWeight: "500" }}>Grand Total</div>
                    <div style={{ fontSize: "28px", color: "#78350f", fontWeight: "800" }}>₹{(parseFloat(selectedQuotation.grandTotal) || 0).toFixed(2)}</div>
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
                          <td style={{ padding: "12px" }}>₹{(parseFloat(item.ratePerSqft) || 0).toFixed(2)}</td>
                          <td style={{ padding: "12px", fontWeight: "600", color: "#1f2937" }}>₹{(parseFloat(item.subtotal) || 0).toFixed(2)}</td>
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
                  onClick={() => setConfirmAction(null)}
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

        {/* REJECTION REASON MODAL */}
        {showRejectionModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100000,
              animation: "fadeIn 0.2s ease-in-out",
            }}
            onClick={() => {
              setShowRejectionModal(false);
              setRejectionReason("");
              setPendingRejection(null);
            }}
          >
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "32px",
                maxWidth: "500px",
                width: "90%",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                border: "1px solid rgba(226, 232, 240, 0.8)",
                animation: "slideUp 0.3s ease-out",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    fontWeight: "bold",
                    marginRight: "16px",
                    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                  }}
                >
                  ⚠️
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#0f172a",
                      margin: 0,
                      marginBottom: "4px",
                    }}
                  >
                    Enter Rejection Reason
                  </h3>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                    Please provide a reason for rejecting this quotation
                  </p>
                </div>
              </div>

              <textarea
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "120px",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(226, 232, 240, 0.8)",
                  background: "#ffffff",
                  color: "#0f172a",
                  outline: "none",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  resize: "vertical",
                  transition: "all 0.2s ease",
                  marginBottom: "24px",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#6366f1";
                  e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(226, 232, 240, 0.8)";
                  e.target.style.boxShadow = "none";
                }}
                autoFocus
              />

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => {
                    setShowRejectionModal(false);
                    setRejectionReason("");
                    setPendingRejection(null);
                  }}
                  style={{
                    padding: "12px 24px",
                    background: "#ef4444",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    color: "white",
                    fontWeight: "600",
                    fontSize: "14px",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 4px rgba(239, 68, 68, 0.2)",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "scale(1.02)";
                    e.target.style.boxShadow = "0 4px 8px rgba(239, 68, 68, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "scale(1)";
                    e.target.style.boxShadow = "0 2px 4px rgba(239, 68, 68, 0.2)";
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectionSubmit}
                  disabled={!rejectionReason.trim()}
                  style={{
                    padding: "12px 24px",
                    background: rejectionReason.trim()
                      ? "linear-gradient(135deg, #f59e0b, #d97706)"
                      : "#d1d5db",
                    border: "none",
                    borderRadius: "8px",
                    cursor: rejectionReason.trim() ? "pointer" : "not-allowed",
                    color: "white",
                    fontWeight: "600",
                    fontSize: "14px",
                    transition: "all 0.2s ease",
                    boxShadow: rejectionReason.trim()
                      ? "0 2px 4px rgba(245, 158, 11, 0.2)"
                      : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (rejectionReason.trim()) {
                      e.target.style.transform = "scale(1.02)";
                      e.target.style.boxShadow = "0 4px 8px rgba(245, 158, 11, 0.3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (rejectionReason.trim()) {
                      e.target.style.transform = "scale(1)";
                      e.target.style.boxShadow = "0 2px 4px rgba(245, 158, 11, 0.2)";
                    }
                  }}
                >
                  Submit Rejection
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

