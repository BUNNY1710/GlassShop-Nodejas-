import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../components/PageWrapper";
import dashboardBg from "../assets/dashboard-bg.jpg";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, searchCustomers } from "../api/quotationApi";
import { useResponsive } from "../hooks/useResponsive";
import "../styles/design-system.css";

function CustomerManagement() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { isMobile, isTablet, isSmallMobile } = useResponsive(); // Use responsive hook

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    address: "",
    gstin: "",
    state: "",
    city: "",
    pincode: "",
  });
  const [mobileError, setMobileError] = useState("");

  useEffect(() => {
    loadCustomers();
    // Removed manual resize handler - useResponsive hook handles it
  }, []);

  // Live search with debouncing
  useEffect(() => {
    // Clear any existing timeout
    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim() === "") {
        // If search is empty, load all customers
        try {
          setLoading(true);
          setMessage("");
          const response = await getCustomers();
          setCustomers(response.data);
        } catch (error) {
          setMessage("❌ Failed to load customers");
        } finally {
          setLoading(false);
        }
      } else {
        // Perform search
        try {
          setLoading(true);
          setMessage("");
          const response = await searchCustomers(searchQuery.trim());
          setCustomers(response.data);
          if (response.data.length === 0) {
            setMessage("No customers found matching your search");
          } else {
            setMessage("");
          }
        } catch (error) {
          console.error("Search error:", error);
          setMessage("❌ Failed to search customers");
          // On error, reload all customers
          try {
            const response = await getCustomers();
            setCustomers(response.data);
          } catch (loadError) {
            console.error("Load error:", loadError);
          }
        } finally {
          setLoading(false);
        }
      }
    }, 500); // 500ms debounce delay

    // Cleanup timeout on unmount or when searchQuery changes
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await getCustomers();
      setCustomers(response.data);
    } catch (error) {
      setMessage("❌ Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadCustomers();
      setMessage("");
      return;
    }
    try {
      setLoading(true);
      setMessage(""); // Clear any previous messages
      const response = await searchCustomers(searchQuery);
      setCustomers(response.data);
      if (response.data.length === 0) {
        setMessage("No customers found matching your search");
      } else {
        setMessage(""); // Clear message if results found
      }
    } catch (error) {
      console.error("Search error:", error);
      setMessage("❌ Failed to search customers");
      // On error, reload all customers
      loadCustomers();
    } finally {
      setLoading(false);
    }
  };

  // Validate mobile number
  const validateMobile = (mobile) => {
    if (!mobile || mobile.trim() === "") {
      return ""; // Mobile is optional, so empty is valid
    }
    
    // Remove spaces, dashes, and parentheses
    const cleaned = mobile.replace(/[\s\-\(\)]/g, "");
    
    // Check if it starts with +91 (India country code)
    if (cleaned.startsWith("+91")) {
      const digits = cleaned.substring(3);
      if (digits.length === 10 && /^\d+$/.test(digits)) {
        return "";
      }
      return "Mobile number with +91 must have 10 digits after country code";
    }
    
    // Check if it's just digits (10 digits for Indian numbers)
    if (/^\d+$/.test(cleaned)) {
      if (cleaned.length === 10) {
        return "";
      }
      return "Mobile number must be exactly 10 digits";
    }
    
    return "Mobile number must contain only digits (or +91 followed by 10 digits)";
  };

  // Handle mobile number input change
  const handleMobileChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, mobile: value });
    
    // Validate on change
    const error = validateMobile(value);
    setMobileError(error);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setMobileError("");

    // Validate mobile number before submission
    const mobileValidationError = validateMobile(formData.mobile);
    if (mobileValidationError) {
      setMobileError(mobileValidationError);
      setMessage(`❌ ${mobileValidationError}`);
      return;
    }

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, formData);
        setMessage("✅ Customer updated successfully");
      } else {
        await createCustomer(formData);
        setMessage("✅ Customer created successfully");
      }
      setShowForm(false);
      setEditingCustomer(null);
      resetForm();
      setMobileError("");
      loadCustomers();
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Failed to save customer";
      setMessage(`❌ ${errorMessage}`);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || "",
      mobile: customer.mobile || "",
      email: customer.email || "",
      address: customer.address || "",
      gstin: customer.gstin || "",
      state: customer.state || "",
      city: customer.city || "",
      pincode: customer.pincode || "",
    });
    setMobileError(""); // Reset error when editing
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      mobile: "",
      email: "",
      address: "",
      gstin: "",
      state: "",
      city: "",
      pincode: "",
    });
    setMobileError("");
  };

  const handleDelete = async (customerId) => {
    try {
      await deleteCustomer(customerId);
      setMessage("✅ Customer deleted successfully");
      setConfirmDelete(null);
      loadCustomers();
    } catch (error) {
      setMessage("❌ Failed to delete customer");
      setConfirmDelete(null);
    }
  };

  return (
    <PageWrapper backgroundImage={dashboardBg}>
      <div style={{ padding: isMobile ? "15px" : "20px", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "25px", padding: "20px", backgroundColor: "rgba(0,0,0,0.5)", borderRadius: "12px", backdropFilter: "blur(10px)" }}>
          <h1 style={{ color: "#fff", marginBottom: "8px", fontSize: isMobile ? "26px" : "32px", fontWeight: "800", textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}>
            👥 Customer Management
          </h1>
          <p style={{ color: "#fff", fontSize: "15px", margin: 0, fontWeight: "500", textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}>
            Manage your customer database - add, edit, and search customers
          </p>
        </div>

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
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            marginBottom: "20px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: "8px",
            backgroundColor: "white",
            padding: "10px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1, position: "relative", maxWidth: isMobile ? "100%" : "300px" }}>
            <input
              type="text"
              placeholder="🔍 Search customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              style={{
                width: "100%",
                padding: "6px 10px",
                paddingLeft: "32px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontSize: "13px",
                transition: "all 0.2s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#6366f1";
                e.target.style.boxShadow = "0 0 0 2px rgba(99, 102, 241, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#d1d5db";
                e.target.style.boxShadow = "none";
              }}
            />
            <span
              style={{
                position: "absolute",
                left: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "14px",
              }}
            >
              🔍
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px", width: isMobile ? "100%" : "auto" }}>
            <button
              onClick={handleSearch}
              style={{
                padding: "6px 16px",
                backgroundColor: "#6366f1",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "500",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#4f46e5";
                e.target.style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "#6366f1";
                e.target.style.transform = "translateY(0)";
              }}
            >
              Search
            </button>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingCustomer(null);
                resetForm();
              }}
              style={{
                padding: "12px 24px",
                backgroundColor: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                whiteSpace: "nowrap",
                boxShadow: "0 4px 6px -1px rgba(34, 197, 94, 0.3)",
                transition: "all 0.2s",
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
              ➕ Add Customer
            </button>
          </div>
        </div>

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
              <h2 style={{ margin: 0, color: "#1f2937", fontSize: isMobile ? "20px" : "24px", fontWeight: "600" }}>
                {editingCustomer ? "✏️ Edit Customer" : "➕ Add New Customer"}
              </h2>
              <p style={{ margin: "5px 0 0 0", color: "#6b7280", fontSize: "14px" }}>
                {editingCustomer
                  ? "Update customer information below"
                  : "Fill in the customer details to add them to your database"}
              </p>
            </div>
            <form onSubmit={handleSubmit}>
              {/* Basic Information */}
              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ color: "#374151", fontSize: "18px", fontWeight: "600", marginBottom: "15px" }}>
                  👤 Basic Information
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: "20px",
                  }}
                >
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      Customer Name * <span style={{ color: "#ef4444" }}>●</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., John Doe, ABC Enterprises"
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
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>📝 Full name or company name</p>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      Mobile Number {formData.mobile && <span style={{ color: "#ef4444" }}>*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.mobile}
                      onChange={handleMobileChange}
                      onBlur={(e) => {
                        e.target.style.borderColor = mobileError ? "#ef4444" : "#d1d5db";
                        // Validate on blur as well
                        const error = validateMobile(formData.mobile);
                        setMobileError(error);
                      }}
                      placeholder="e.g., 9876543210 or +91 9876543210"
                      maxLength={15}
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        border: mobileError ? "2px solid #ef4444" : "1px solid #d1d5db",
                        fontSize: "14px",
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                        backgroundColor: mobileError ? "#fef2f2" : "white",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = mobileError ? "#ef4444" : "#6366f1";
                        e.target.style.backgroundColor = mobileError ? "#fef2f2" : "white";
                      }}
                    />
                    {mobileError ? (
                      <p style={{ marginTop: "5px", color: "#ef4444", fontSize: "12px", fontWeight: "500" }}>
                        ⚠️ {mobileError}
                      </p>
                    ) : (
                      <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>
                        📱 10 digits (e.g., 9876543210) or with country code (e.g., +91 9876543210)
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g., customer@example.com"
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
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>📧 Customer email (optional)</p>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      GSTIN (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                      placeholder="e.g., 27ABCDE1234F1Z5"
                      maxLength="15"
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
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>🧾 15-character GST identification number</p>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ color: "#374151", fontSize: "18px", fontWeight: "600", marginBottom: "15px" }}>
                  📍 Address Information
                </h3>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                    Full Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g., 123 Main Street, Building Name, Area Name"
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      minHeight: "100px",
                      resize: "vertical",
                      fontFamily: "inherit",
                      transition: "all 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                  />
                  <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>🏠 Complete address with street, building, area</p>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
                    gap: "20px",
                  }}
                >
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="e.g., Maharashtra, Karnataka"
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
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>📍 State name</p>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g., Mumbai, Bangalore"
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
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>🏙️ City name</p>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      placeholder="e.g., 400001, 560001"
                      maxLength="6"
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
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>📮 6-digit postal code</p>
                  </div>
                </div>
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
                    setEditingCustomer(null);
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
                    width: isMobile ? "100%" : "auto",
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
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 6px -1px rgba(34, 197, 94, 0.3)",
                    width: isMobile ? "100%" : "auto",
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
                  {editingCustomer ? "✅ Update Customer" : "✅ Create Customer"}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div
            style={{
              textAlign: "center",
              color: "#fff",
              padding: "40px",
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: "12px",
              fontSize: "16px",
            }}
          >
            ⏳ Loading customers...
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            }}
          >
            <div style={{ padding: "20px", borderBottom: "2px solid #e5e7eb", backgroundColor: "#f9fafb" }}>
              <h3 style={{ margin: 0, color: "#1f2937", fontSize: "18px", fontWeight: "600" }}>
                📋 Customer List ({customers.length} {customers.length === 1 ? "customer" : "customers"})
              </h3>
            </div>
            {/* Mobile Card View */}
            {isMobile && customers.length > 0 && (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                width: "100%",
              }}>
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      padding: "16px",
                      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    {/* Customer Name - Header */}
                    <div style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      color: "#1f2937",
                      marginBottom: "12px",
                      paddingBottom: "12px",
                      borderBottom: "1px solid #e5e7eb",
                    }}>
                      {customer.name}
                    </div>

                    {/* Contact Info */}
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      marginBottom: "12px",
                    }}>
                      {customer.mobile && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4b5563" }}>
                          <span>📱</span>
                          <span>{customer.mobile}</span>
                        </div>
                      )}
                      {customer.email && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4b5563" }}>
                          <span>📧</span>
                          <span style={{ fontSize: "14px", wordBreak: "break-word" }}>{customer.email}</span>
                        </div>
                      )}
                      {customer.gstin && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4b5563" }}>
                          <span>🧾</span>
                          <span>{customer.gstin}</span>
                        </div>
                      )}
                      {(customer.state || customer.city) && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4b5563" }}>
                          <span>📍</span>
                          <span>
                            {customer.city && customer.state ? `${customer.city}, ${customer.state}` : customer.city || customer.state}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{
                      display: "flex",
                      gap: "8px",
                      flexDirection: isSmallMobile ? "column" : "row",
                      marginTop: "12px",
                      paddingTop: "12px",
                      borderTop: "1px solid #e5e7eb",
                    }}>
                      <button
                        onClick={() => handleEdit(customer)}
                        style={{
                          padding: "12px 16px",
                          backgroundColor: "#6366f1",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          transition: "all 0.2s",
                          minHeight: "44px",
                          flex: isSmallMobile ? "1" : "none",
                          width: isSmallMobile ? "100%" : "auto",
                          touchAction: "manipulation",
                        }}
                        onMouseOver={(e) => {
                          e.target.style.backgroundColor = "#4f46e5";
                        }}
                        onMouseOut={(e) => {
                          e.target.style.backgroundColor = "#6366f1";
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ id: customer.id, name: customer.name })}
                        style={{
                          padding: "12px 16px",
                          backgroundColor: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          transition: "all 0.2s",
                          minHeight: "44px",
                          flex: isSmallMobile ? "1" : "none",
                          width: isSmallMobile ? "100%" : "auto",
                          touchAction: "manipulation",
                        }}
                        onMouseOver={(e) => {
                          e.target.style.backgroundColor = "#dc2626";
                        }}
                        onMouseOut={(e) => {
                          e.target.style.backgroundColor = "#ef4444";
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {customers.length === 0 && (
              <div
                style={{
                  padding: "60px 20px",
                  textAlign: "center",
                  color: "#6b7280",
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.5 }}>👥</div>
                <p style={{ fontSize: "16px", fontWeight: "500", marginBottom: "8px" }}>No customers found</p>
                <p style={{ fontSize: "14px", color: "#9ca3af" }}>
                  {searchQuery
                    ? "Try a different search term or clear the search"
                    : "Click 'Add Customer' to create your first customer"}
                </p>
              </div>
            )}

            {/* Desktop Table View */}
            {!isMobile && customers.length > 0 && (
              <div
                style={{
                  overflowX: "auto",
                  WebkitOverflowScrolling: "touch",
                  width: "100%",
                }}
                className="table-wrapper"
              >
                <table style={{ 
                  width: "100%", 
                  borderCollapse: "collapse", 
                  fontSize: "14px",
                }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f3f4f6" }}>
                      <th
                        style={{
                          padding: isMobile ? "10px 8px" : "16px",
                          textAlign: "left",
                          color: "#374151",
                          fontWeight: "600",
                          fontSize: isMobile ? "12px" : "13px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Name
                      </th>
                      <th
                        style={{
                          padding: isMobile ? "10px 8px" : "16px",
                          textAlign: "left",
                          color: "#374151",
                          fontWeight: "600",
                          fontSize: isMobile ? "12px" : "13px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Contact
                      </th>
                      {!isMobile && (
                        <>
                          <th
                            style={{
                              padding: isMobile ? "10px 8px" : "16px",
                              textAlign: "left",
                              color: "#374151",
                              fontWeight: "600",
                              fontSize: isMobile ? "12px" : "13px",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Email
                          </th>
                          <th
                            style={{
                              padding: isMobile ? "10px 8px" : "16px",
                              textAlign: "left",
                              color: "#374151",
                              fontWeight: "600",
                              fontSize: isMobile ? "12px" : "13px",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            GSTIN
                          </th>
                          <th
                            style={{
                              padding: isMobile ? "10px 8px" : "16px",
                              textAlign: "left",
                              color: "#374151",
                              fontWeight: "600",
                              fontSize: isMobile ? "12px" : "13px",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Location
                          </th>
                        </>
                      )}
                      <th
                        style={{
                          padding: isMobile ? "10px 8px" : "16px",
                          textAlign: "left",
                          color: "#374151",
                          fontWeight: "600",
                          fontSize: isMobile ? "12px" : "13px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer, index) => (
                      <tr
                        key={customer.id}
                        style={{
                          borderTop: "1px solid #e5e7eb",
                          transition: "background-color 0.2s",
                          backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = index % 2 === 0 ? "#ffffff" : "#f9fafb")}
                      >
                        <td style={{ padding: isMobile ? "10px 8px" : "16px", color: "#1f2937", fontWeight: "500" }}>{customer.name}</td>
                        <td style={{ padding: isMobile ? "10px 8px" : "16px", color: "#4b5563" }}>
                          {customer.mobile ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              📱 {customer.mobile}
                            </span>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>-</span>
                          )}
                        </td>
                        {/* Desktop-only columns */}
                        {(
                          <>
                            <td style={{ padding: isMobile ? "10px 8px" : "16px", color: "#4b5563" }}>
                              {customer.email ? (
                                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  📧 {customer.email}
                                </span>
                              ) : (
                                <span style={{ color: "#9ca3af" }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: isMobile ? "10px 8px" : "16px", color: "#4b5563" }}>
                              {customer.gstin ? (
                                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  🧾 {customer.gstin}
                                </span>
                              ) : (
                                <span style={{ color: "#9ca3af" }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: isMobile ? "10px 8px" : "16px", color: "#4b5563" }}>
                              {customer.state || customer.city ? (
                                <span>
                                  {customer.city && customer.state ? `${customer.city}, ${customer.state}` : customer.city || customer.state}
                                </span>
                              ) : (
                                <span style={{ color: "#9ca3af" }}>-</span>
                              )}
                            </td>
                          </>
                        )}
                        <td style={{ padding: isMobile ? "10px 8px" : "16px" }}>
                          <div style={{ 
                            display: "flex", 
                            gap: isMobile ? "6px" : "8px", 
                            flexWrap: "wrap",
                            flexDirection: isSmallMobile ? "column" : "row",
                          }}>
                            <button
                              onClick={() => handleEdit(customer)}
                              style={{
                                padding: isMobile ? "10px 14px" : "8px 16px",
                                backgroundColor: "#6366f1",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: isMobile ? "12px" : "13px",
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                transition: "all 0.2s",
                                minHeight: "44px",
                                minWidth: isSmallMobile ? "100%" : "auto",
                                flex: isSmallMobile ? "1" : "none",
                                touchAction: "manipulation",
                              }}
                              onMouseOver={(e) => {
                                e.target.style.backgroundColor = "#4f46e5";
                                e.target.style.transform = "translateY(-1px)";
                              }}
                              onMouseOut={(e) => {
                                e.target.style.backgroundColor = "#6366f1";
                                e.target.style.transform = "translateY(0)";
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ id: customer.id, name: customer.name })}
                              style={{
                                padding: isMobile ? "10px 14px" : "8px 16px",
                                backgroundColor: "#ef4444",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: isMobile ? "12px" : "13px",
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                transition: "all 0.2s",
                                minHeight: "44px",
                                minWidth: isSmallMobile ? "100%" : "auto",
                                flex: isSmallMobile ? "1" : "none",
                                touchAction: "manipulation",
                              }}
                              onMouseOver={(e) => {
                                e.target.style.backgroundColor = "#dc2626";
                                e.target.style.transform = "translateY(-1px)";
                              }}
                              onMouseOut={(e) => {
                                e.target.style.backgroundColor = "#ef4444";
                                e.target.style.transform = "translateY(0)";
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmDelete && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: isMobile ? "flex-end" : "center",
              justifyContent: "center",
              zIndex: 10004,
              padding: isMobile ? "0" : "20px",
              paddingTop: "80px",
            }}
            onClick={() => setConfirmDelete(null)}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: isMobile ? "20px 16px" : "35px",
                borderRadius: isMobile ? "20px 20px 0 0" : "16px",
                maxWidth: isMobile ? "100%" : isTablet ? "600px" : "500px",
                width: "100%",
                maxHeight: isMobile ? "90vh" : "85vh",
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                position: "relative",
                zIndex: 10005,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: "20px", textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "48px",
                    marginBottom: "15px",
                    color: "#ef4444",
                  }}
                >
                  🗑️
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
                  Delete Customer?
                </h2>
                <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: "14px", lineHeight: "1.6" }}>
                  Are you sure you want to permanently delete customer <strong>"{confirmDelete.name}"</strong>? This action cannot be undone.
                </p>
                <div
                  style={{
                    marginTop: "15px",
                    padding: "12px",
                    backgroundColor: "#fef2f2",
                    borderRadius: "8px",
                    textAlign: "left",
                    border: "1px solid #fecaca",
                  }}
                >
                  <div style={{ fontSize: "13px", color: "#991b1b", marginBottom: "4px", fontWeight: "600" }}>⚠️ Warning:</div>
                  <div style={{ fontSize: "13px", color: "#7f1d1d" }}>
                    If this customer has associated quotations or invoices, they may be affected.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "12px" }}>
                <button
                  onClick={() => handleDelete(confirmDelete.id)}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)",
                  }}
                  onMouseOver={(e) => (e.target.style.backgroundColor = "#dc2626")}
                  onMouseOut={(e) => (e.target.style.backgroundColor = "#ef4444")}
                >
                  🗑️ Yes, Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
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

        {/* Next Button to Quotation Page */}
        <div style={{ 
          display: "flex", 
          justifyContent: "flex-end", 
          marginTop: "30px",
          paddingTop: "20px",
          borderTop: "2px solid rgba(255, 255, 255, 0.2)"
        }}>
          <button
            onClick={() => navigate("/quotations")}
            style={{
              padding: "12px 32px",
              backgroundColor: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              transition: "all 0.2s",
              boxShadow: "0 4px 6px -1px rgba(99, 102, 241, 0.3)",
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#4f46e5";
              e.target.style.boxShadow = "0 6px 8px -1px rgba(99, 102, 241, 0.4)";
              e.target.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "#6366f1";
              e.target.style.boxShadow = "0 4px 6px -1px rgba(99, 102, 241, 0.3)";
              e.target.style.transform = "translateY(0)";
            }}
          >
            Next: Quotations
            <span style={{ fontSize: "18px" }}>→</span>
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}

export default CustomerManagement;
