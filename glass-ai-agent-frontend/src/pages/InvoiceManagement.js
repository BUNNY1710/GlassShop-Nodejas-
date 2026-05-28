import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import PageWrapper from "../components/PageWrapper";
import useResponsive from "../hooks/useResponsive";
import { Badge, Button, cn, DataTable, EmptyState, PageHeader } from "../components/ui";
import { FileText, Plus } from "lucide-react";
import {
  getQuotations,
  getInvoices,
  createInvoiceFromQuotation,
  addPayment,
  getInvoiceById,
  getQuotationById,
  downloadTransportChallan,
  printDeliveryChallan,
  downloadInvoice,
  downloadBasicInvoice,
  printInvoice,
  printBasicInvoice,
  getQuotationsByStatus,
} from "../api/quotationApi";

function InvoiceManagement() {
  const [invoices, setInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedQuotationDetails, setSelectedQuotationDetails] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null);
  const { isMobile } = useResponsive();

  const [convertForm, setConvertForm] = useState({
    invoiceType: "FINAL",
    invoiceDate: new Date().toISOString().split("T")[0],
  });

  const [paymentForm, setPaymentForm] = useState({
    paymentType: "MANUAL", // FULL, HALF, MANUAL
    paymentMode: "CASH",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    referenceNumber: "",
    bankName: "",
    chequeNumber: "",
    transactionId: "",
    notes: "",
  });
  const [currentInvoiceForPayment, setCurrentInvoiceForPayment] = useState(null);

  useEffect(() => {
    loadInvoices();
    loadConfirmedQuotations();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await getInvoices();
      setInvoices(response.data);
    } catch (error) {
      setMessage("❌ Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const loadConfirmedQuotations = async () => {
    try {
      // Try using the status endpoint first for better filtering
      try {
        const statusResponse = await getQuotationsByStatus("CONFIRMED");
        console.log("Confirmed quotations from status endpoint:", statusResponse.data?.length || 0);
        setQuotations(statusResponse.data || []);
        if (!statusResponse.data || statusResponse.data.length === 0) {
          setMessage("ℹ️ No confirmed quotations available. Please confirm a quotation first.");
        } else {
          setMessage(""); // Clear message if quotations found
        }
        return;
      } catch (statusError) {
        console.log("Status endpoint failed, falling back to filter:", statusError);
      }
      
      // Fallback: Get all and filter
      const response = await getQuotations();
      console.log("All quotations received:", response.data?.map(q => ({ 
        id: q.id, 
        number: q.quotationNumber, 
        status: q.status 
      })) || []);
      
      // Filter for confirmed quotations - handle case variations
      const confirmed = (response.data || []).filter((q) => {
        const status = String(q.status || '').toUpperCase().trim();
        const isConfirmed = status === 'CONFIRMED';
        console.log(`Quotation ${q.id} (${q.quotationNumber}): status="${q.status}" -> normalized="${status}" -> isConfirmed=${isConfirmed}`);
        return isConfirmed;
      });
      
      console.log("Filtered confirmed quotations:", confirmed.map(q => ({ 
        id: q.id, 
        number: q.quotationNumber, 
        status: q.status 
      })));
      
      setQuotations(confirmed);
      if (confirmed.length === 0) {
        setMessage("ℹ️ No confirmed quotations available. Please confirm a quotation first.");
      } else {
        setMessage(""); // Clear message if quotations found
      }
    } catch (error) {
      console.error("Failed to load quotations", error);
      setMessage("❌ Failed to load quotations");
    }
  };

  const handleConvertToInvoice = async () => {
    if (!selectedQuotation) {
      setMessage("❌ Please select a quotation");
      return;
    }

    try {
      await createInvoiceFromQuotation({
        quotationId: selectedQuotation.id,
        invoiceType: convertForm.invoiceType,
        invoiceDate: convertForm.invoiceDate,
      });
      setMessage("✅ Invoice created successfully");
      setShowConvertModal(false);
      setSelectedQuotation(null);
      setConvertForm({
        invoiceType: "FINAL",
        invoiceDate: new Date().toISOString().split("T")[0],
      });
      loadInvoices();
      loadConfirmedQuotations();
    } catch (error) {
      console.error("Invoice creation error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to create invoice";
      setMessage(`❌ ${errorMessage}`);
    }
  };

  const handleAddPayment = async () => {
    if (!currentInvoiceId) return;

    try {
      await addPayment(currentInvoiceId, {
        ...paymentForm,
        amount: parseFloat(paymentForm.amount),
        paymentDate: new Date(paymentForm.paymentDate).toISOString(),
      });
      setMessage("✅ Payment added successfully");
      setShowPaymentModal(false);
      setCurrentInvoiceId(null);
      resetPaymentForm();
      loadInvoices();
    } catch (error) {
      setMessage("❌ Failed to add payment");
    }
  };

  const handleViewInvoice = async (id) => {
    try {
      const response = await getInvoiceById(id);
      setSelectedInvoice(response.data);
      // Load quotation details if available
      if (response.data.quotationId) {
        try {
          const quotationResponse = await getQuotationById(response.data.quotationId);
          setSelectedQuotationDetails(quotationResponse.data);
        } catch (err) {
          console.error("Failed to load quotation details", err);
        }
      }
    } catch (error) {
      setMessage("❌ Failed to load invoice details");
    }
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      paymentType: "MANUAL",
      paymentMode: "CASH",
      amount: "",
      paymentDate: new Date().toISOString().split("T")[0],
      referenceNumber: "",
      bankName: "",
      chequeNumber: "",
      transactionId: "",
      notes: "",
    });
    setCurrentInvoiceForPayment(null);
  };

  const handlePaymentTypeChange = (paymentType) => {
    if (!currentInvoiceForPayment) return;
    
    let amount = "";
    if (paymentType === "FULL") {
      amount = currentInvoiceForPayment.dueAmount || currentInvoiceForPayment.grandTotal || 0;
    } else if (paymentType === "HALF") {
      amount = (currentInvoiceForPayment.dueAmount || currentInvoiceForPayment.grandTotal || 0) / 2;
    }
    
    setPaymentForm({
      ...paymentForm,
      paymentType,
      amount: amount.toString(),
    });
  };

  const getPaymentStatusBadge = (status) => {
    const normalized = String(status || "").toUpperCase();
    const variant =
      normalized === "PAID"
        ? "success"
        : normalized === "PARTIAL"
          ? "warning"
          : normalized === "DUE"
            ? "danger"
            : "default";

    return (
      <Badge variant={variant} dot>
        {normalized || "UNKNOWN"}
      </Badge>
    );
  };

  const invoiceColumns = [
    {
        key: "invoiceNumber",
        header: "Invoice #",
        className: "font-semibold text-slate-800 dark:text-slate-200",
        render: (invoice) => invoice.invoiceNumber,
    },
    {
        key: "customerName",
        header: "Customer",
        render: (invoice) => (
          <div className="min-w-0">
            <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
              {invoice.customerName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 md:hidden">
              {invoice.invoiceDate}
            </p>
          </div>
        ),
    },
    { key: "invoiceType", header: "Type", hideBelow: "md" },
    { key: "billingType", header: "Billing", hideBelow: "md" },
    {
        key: "paymentStatus",
        header: "Payment",
        hideBelow: "md",
        render: (invoice) => getPaymentStatusBadge(invoice.paymentStatus),
    },
    {
        key: "grandTotal",
        header: "Total",
        hideBelow: "md",
        className: "font-semibold tabular-nums",
        render: (invoice) =>
          `₹${(parseFloat(invoice.grandTotal) || 0).toFixed(2)}`,
    },
    {
        key: "paidAmount",
        header: "Paid",
        hideBelow: "md",
        className: "tabular-nums",
        render: (invoice) =>
          `₹${(parseFloat(invoice.paidAmount) || 0).toFixed(2)}`,
    },
    {
        key: "dueAmount",
        header: "Due",
        hideBelow: "md",
        className: "font-semibold tabular-nums",
        render: (invoice) => (
          <span
            className={
              (parseFloat(invoice.dueAmount) || 0) > 0
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-600 dark:text-emerald-400"
            }
          >
            ₹{(parseFloat(invoice.dueAmount) || 0).toFixed(2)}
          </span>
        ),
    },
    { key: "invoiceDate", header: "Date", hideBelow: "md" },
    {
        key: "actions",
        header: "Actions",
        className: "w-[1%] whitespace-nowrap",
        render: (invoice) => (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleViewInvoice(invoice.id)}
            >
              View
            </Button>
            {invoice.paymentStatus !== "PAID" && (
              <Button
                variant="success"
                size="sm"
                onClick={async () => {
                  setCurrentInvoiceId(invoice.id);
                  setCurrentInvoiceForPayment(invoice);
                  try {
                    const response = await getInvoiceById(invoice.id);
                    setCurrentInvoiceForPayment(response.data);
                  } catch (error) {
                    console.error("Failed to load invoice details", error);
                  }
                  setShowPaymentModal(true);
                }}
              >
                Add payment
              </Button>
            )}
          </div>
        ),
    },
  ];

  return (
    <PageWrapper>
      <div className="space-y-5">
        <PageHeader
          title="Invoices"
          description="Manage invoices, payments, and convert confirmed quotations to invoices."
          icon={<FileText size={18} />}
          actions={
            <Button
              variant="success"
              size={isMobile ? "lg" : "md"}
              fullWidth={isMobile}
              icon={<Plus size={16} />}
              onClick={() => {
                setShowConvertModal(true);
                loadConfirmedQuotations();
              }}
            >
              Convert quotation
            </Button>
          }
        />

        {message && (
          <div
            className={cn(
              "rounded-xl border px-4 py-3 text-sm font-medium",
              message.includes("✅")
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
            )}
            role="status"
          >
            {message}
          </div>
        )}

        <DataTable
          stickyHeader
          loading={loading}
          rows={invoices}
          rowKey="id"
          columns={invoiceColumns}
          empty={
            <EmptyState
              icon={<FileText size={18} />}
              title="No invoices yet"
              description="Convert a confirmed quotation to create your first invoice."
              actionLabel="Convert quotation"
              onAction={() => {
                setShowConvertModal(true);
                loadConfirmedQuotations();
              }}
            />
          }
          renderMobileCard={(invoice) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    Invoice #{invoice.invoiceNumber}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                    {invoice.customerName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                    {invoice.invoiceDate}
                  </p>
                </div>
                {getPaymentStatusBadge(invoice.paymentStatus)}
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 p-3 border border-slate-200/70 dark:border-slate-700/50">
                <div>
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-500">
                    Total
                  </p>
                  <p className="mt-0.5 font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                    ₹{(parseFloat(invoice.grandTotal) || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-500">
                    Due
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 font-semibold tabular-nums",
                      (parseFloat(invoice.dueAmount) || 0) > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    ₹{(parseFloat(invoice.dueAmount) || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button variant="secondary" size="lg" fullWidth onClick={() => handleViewInvoice(invoice.id)}>
                  View details
                </Button>
                {invoice.paymentStatus !== "PAID" && (
                  <Button
                    variant="success"
                    size="lg"
                    fullWidth
                    onClick={async () => {
                      setCurrentInvoiceId(invoice.id);
                      setCurrentInvoiceForPayment(invoice);
                      try {
                        const response = await getInvoiceById(invoice.id);
                        setCurrentInvoiceForPayment(response.data);
                      } catch (error) {
                        console.error("Failed to load invoice details", error);
                      }
                      setShowPaymentModal(true);
                    }}
                  >
                    Add payment
                  </Button>
                )}
              </div>
            </div>
          )}
        />

        {/* Convert Quotation Modal */}
        {showConvertModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10004,
              padding: isMobile ? "20px 12px" : "80px 20px 20px 20px",
              overflowY: "auto",
            }}
            onClick={() => {
              setShowConvertModal(false);
              setSelectedQuotation(null);
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: isMobile ? "16px" : "30px",
                borderRadius: isMobile ? "12px" : "16px",
                maxWidth: isMobile ? "100%" : "700px",
                width: "100%",
                maxHeight: isMobile ? "calc(100vh - 40px)" : "90vh",
                overflowY: "auto",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                position: "relative",
                zIndex: 10005,
                boxSizing: "border-box",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ 
                marginBottom: isMobile ? "16px" : "25px", 
                borderBottom: "2px solid #e5e7eb", 
                paddingBottom: isMobile ? "12px" : "15px" 
              }}>
                <h2 style={{ 
                  margin: 0, 
                  color: "#1f2937", 
                  fontSize: isMobile ? "18px" : "24px", 
                  fontWeight: "600" 
                }}>🔄 Convert Quotation to Invoice</h2>
                <p style={{ 
                  margin: "5px 0 0 0", 
                  color: "#6b7280", 
                  fontSize: isMobile ? "13px" : "14px" 
                }}>Select a confirmed quotation to create an invoice</p>
              </div>
              <div style={{ marginBottom: isMobile ? "16px" : "20px" }}>
                <label style={{ 
                  display: "block", 
                  marginBottom: "8px", 
                  color: "#374151", 
                  fontWeight: "500", 
                  fontSize: isMobile ? "13px" : "14px" 
                }}>
                  Select Quotation * <span style={{ color: "#ef4444" }}>●</span>
                </label>
                <select
                  value={selectedQuotation?.id?.toString() || ""}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    console.log("Selected quotation ID:", selectedId, "Type:", typeof selectedId);
                    console.log("Available quotations:", quotations.map(q => ({ id: q.id, type: typeof q.id })));
                    
                    if (!selectedId) {
                      setSelectedQuotation(null);
                      return;
                    }
                    
                    // Find quotation by matching id (handle both string and number)
                    const quotation = quotations.find((q) => {
                      const qId = String(q.id);
                      const match = qId === selectedId || q.id === parseInt(selectedId);
                      console.log(`Comparing: q.id=${q.id} (${typeof q.id}) with selectedId=${selectedId} (${typeof selectedId}) -> match=${match}`);
                      return match;
                    });
                    
                    console.log("Found quotation:", quotation);
                    setSelectedQuotation(quotation || null);
                  }}
                  style={{
                    width: "100%",
                    padding: isMobile ? "14px 12px" : "12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "16px", // Prevent iOS zoom
                    backgroundColor: "#fff",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxSizing: "border-box",
                    minHeight: "44px", // Touch target
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                  onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                >
                  <option value="">🔍 Select a confirmed quotation...</option>
                  {quotations.length === 0 ? (
                    <option value="" disabled>No confirmed quotations available</option>
                  ) : (
                    quotations.map((q) => {
                      // Ensure id is converted to string for option value
                      const quotationId = q.id?.toString() || String(q.id);
                      return (
                        <option key={quotationId} value={quotationId}>
                          {q.quotationNumber} - {q.customerName} - ₹{parseFloat(q.grandTotal || 0).toFixed(2)}
                        </option>
                      );
                    })
                  )}
                </select>
                {quotations.length === 0 && (
                  <p style={{ marginTop: "8px", color: "#f59e0b", fontSize: "12px" }}>
                    ⚠️ No confirmed quotations found. Please confirm a quotation first in the Quotations page.
                  </p>
                )}
              </div>
              {selectedQuotation && (
                <>
                  <div style={{ marginBottom: isMobile ? "16px" : "20px" }}>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "8px", 
                      color: "#374151", 
                      fontWeight: "500", 
                      fontSize: isMobile ? "13px" : "14px" 
                    }}>
                      Invoice Type * <span style={{ color: "#ef4444" }}>●</span>
                    </label>
                    <select
                      value={convertForm.invoiceType}
                      onChange={(e) => setConvertForm({ ...convertForm, invoiceType: e.target.value })}
                      style={{
                        width: "100%",
                        padding: isMobile ? "14px 12px" : "12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "16px", // Prevent iOS zoom
                        backgroundColor: "#fff",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                        minHeight: "44px", // Touch target
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                      onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                    >
                      <option value="ADVANCE">Advance Bill</option>
                      <option value="FINAL">Final Bill</option>
                    </select>
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: isMobile ? "11px" : "12px" }}>💡 Select invoice type</p>
                  </div>
                  <div style={{ marginBottom: isMobile ? "16px" : "20px" }}>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "8px", 
                      color: "#374151", 
                      fontWeight: "500", 
                      fontSize: isMobile ? "13px" : "14px" 
                    }}>
                      Invoice Date * <span style={{ color: "#ef4444" }}>●</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={convertForm.invoiceDate}
                      onChange={(e) => setConvertForm({ ...convertForm, invoiceDate: e.target.value })}
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
                    <p style={{ marginTop: "5px", color: "#6b7280", fontSize: isMobile ? "11px" : "12px" }}>📅 Date for the invoice</p>
                  </div>
                  <div
                    style={{
                      marginBottom: isMobile ? "16px" : "20px",
                      padding: isMobile ? "12px" : "20px",
                      backgroundColor: "#f0f9ff",
                      borderRadius: isMobile ? "8px" : "10px",
                      border: "2px solid #bae6fd",
                    }}
                  >
                    <h4 style={{ 
                      margin: "0 0 12px 0", 
                      color: "#1e40af", 
                      fontSize: isMobile ? "14px" : "16px", 
                      fontWeight: "600" 
                    }}>📄 Selected Quotation</h4>
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
                      gap: isMobile ? "10px" : "12px" 
                    }}>
                      <div>
                        <div style={{ 
                          fontSize: isMobile ? "11px" : "12px", 
                          color: "#6b7280", 
                          marginBottom: "4px" 
                        }}>Quotation Number</div>
                        <div style={{ 
                          fontSize: isMobile ? "14px" : "15px", 
                          color: "#1f2937", 
                          fontWeight: "600" 
                        }}>{selectedQuotation.quotationNumber}</div>
                      </div>
                      <div>
                        <div style={{ 
                          fontSize: isMobile ? "11px" : "12px", 
                          color: "#6b7280", 
                          marginBottom: "4px" 
                        }}>Customer</div>
                        <div style={{ 
                          fontSize: isMobile ? "14px" : "15px", 
                          color: "#1f2937", 
                          fontWeight: "600" 
                        }}>{selectedQuotation.customerName}</div>
                      </div>
                      <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                        <div style={{ 
                          fontSize: isMobile ? "11px" : "12px", 
                          color: "#6b7280", 
                          marginBottom: "4px" 
                        }}>Grand Total</div>
                        <div style={{ 
                          fontSize: isMobile ? "18px" : "20px", 
                          color: "#1e40af", 
                          fontWeight: "700" 
                        }}>₹{(parseFloat(selectedQuotation.grandTotal) || 0).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              <div style={{ 
                display: "flex", 
                flexDirection: isMobile ? "column" : "row", 
                gap: isMobile ? "10px" : "12px", 
                paddingTop: isMobile ? "16px" : "20px", 
                borderTop: "2px solid #e5e7eb" 
              }}>
                <button
                  onClick={handleConvertToInvoice}
                  disabled={!selectedQuotation}
                  style={{
                    flex: 1,
                    padding: isMobile ? "14px 20px" : "12px 24px",
                    backgroundColor: selectedQuotation ? "#22c55e" : "#9ca3af",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: selectedQuotation ? "pointer" : "not-allowed",
                    fontSize: isMobile ? "16px" : "14px",
                    fontWeight: "600",
                    transition: "all 0.2s",
                    boxShadow: selectedQuotation ? "0 4px 6px -1px rgba(34, 197, 94, 0.3)" : "none",
                    minHeight: "44px", // Touch target
                    width: isMobile ? "100%" : "auto",
                  }}
                  onMouseOver={(e) => {
                    if (selectedQuotation) {
                      e.target.style.backgroundColor = "#16a34a";
                      e.target.style.boxShadow = "0 6px 8px -1px rgba(34, 197, 94, 0.4)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedQuotation) {
                      e.target.style.backgroundColor = "#22c55e";
                      e.target.style.boxShadow = "0 4px 6px -1px rgba(34, 197, 94, 0.3)";
                    }
                  }}
                >
                  ✅ Convert to Invoice
                </button>
                <button
                  onClick={() => {
                    setShowConvertModal(false);
                    setSelectedQuotation(null);
                  }}
                  style={{
                    flex: 1,
                    padding: isMobile ? "14px 20px" : "12px 24px",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: isMobile ? "16px" : "14px",
                    fontWeight: "500",
                    transition: "all 0.2s",
                    minHeight: "44px", // Touch target
                    width: isMobile ? "100%" : "auto",
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

        {/* Payment Modal */}
        {showPaymentModal && currentInvoiceForPayment && (
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
              zIndex: 10004,
              paddingTop: "80px",
              padding: isMobile ? "80px 15px 15px 15px" : "80px 20px 20px 20px",
            }}
            onClick={() => {
              setShowPaymentModal(false);
              setCurrentInvoiceId(null);
              resetPaymentForm();
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: isMobile ? "20px" : "35px",
                borderRadius: "16px",
                maxWidth: "700px",
                width: "100%",
                maxHeight: "calc(100vh - 100px)",
                overflow: "auto",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                position: "relative",
                zIndex: 10005,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: "25px", borderBottom: "3px solid #e5e7eb", paddingBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div>
                    <h2 style={{ margin: 0, color: "#1f2937", fontSize: isMobile ? "22px" : "28px", fontWeight: "700" }}>
                      💳 Add Payment
                    </h2>
                    <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: "14px" }}>
                      Record payment for Invoice #{currentInvoiceForPayment.invoiceNumber}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setCurrentInvoiceId(null);
                      resetPaymentForm();
                    }}
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

              {/* Invoice Summary */}
              <div
                style={{
                  marginBottom: "25px",
                  padding: "20px",
                  backgroundColor: "#f0f9ff",
                  borderRadius: "12px",
                  border: "2px solid #bae6fd",
                }}
              >
                <h3 style={{ margin: "0 0 15px 0", color: "#1e40af", fontSize: "18px", fontWeight: "600" }}>📄 Invoice Summary</h3>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "15px" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px", fontWeight: "500" }}>Grand Total</div>
                    <div style={{ fontSize: "20px", color: "#1e40af", fontWeight: "700" }}>₹{(parseFloat(currentInvoiceForPayment.grandTotal) || 0).toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px", fontWeight: "500" }}>Already Paid</div>
                    <div style={{ fontSize: "18px", color: "#22c55e", fontWeight: "600" }}>₹{(parseFloat(currentInvoiceForPayment.paidAmount) || 0).toFixed(2)}</div>
                  </div>
                  <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px", fontWeight: "500" }}>Due Amount</div>
                    <div
                      style={{
                        fontSize: "24px",
                        color: currentInvoiceForPayment.dueAmount > 0 ? "#ef4444" : "#22c55e",
                        fontWeight: "800",
                      }}
                    >
                      ₹{(parseFloat(currentInvoiceForPayment.dueAmount) || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Type Selection */}
              <div style={{ marginBottom: "25px" }}>
                <label style={{ display: "block", marginBottom: "12px", color: "#374151", fontWeight: "600", fontSize: "15px" }}>
                  Payment Type * <span style={{ color: "#ef4444" }}>●</span>
                </label>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={() => handlePaymentTypeChange("FULL")}
                    style={{
                      padding: "15px",
                      borderRadius: "10px",
                      border: paymentForm.paymentType === "FULL" ? "3px solid #22c55e" : "2px solid #d1d5db",
                      backgroundColor: paymentForm.paymentType === "FULL" ? "#dcfce7" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "center",
                    }}
                    onMouseOver={(e) => {
                      if (paymentForm.paymentType !== "FULL") {
                        e.currentTarget.style.borderColor = "#22c55e";
                        e.currentTarget.style.backgroundColor = "#f0fdf4";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (paymentForm.paymentType !== "FULL") {
                        e.currentTarget.style.borderColor = "#d1d5db";
                        e.currentTarget.style.backgroundColor = "#ffffff";
                      }
                    }}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>💯</div>
                    <div style={{ fontWeight: "600", color: "#1f2937", fontSize: "14px" }}>Full Payment</div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                      ₹{(parseFloat(currentInvoiceForPayment.dueAmount) || 0).toFixed(2)}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentTypeChange("HALF")}
                    style={{
                      padding: "15px",
                      borderRadius: "10px",
                      border: paymentForm.paymentType === "HALF" ? "3px solid #f59e0b" : "2px solid #d1d5db",
                      backgroundColor: paymentForm.paymentType === "HALF" ? "#fef3c7" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "center",
                    }}
                    onMouseOver={(e) => {
                      if (paymentForm.paymentType !== "HALF") {
                        e.currentTarget.style.borderColor = "#f59e0b";
                        e.currentTarget.style.backgroundColor = "#fffbeb";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (paymentForm.paymentType !== "HALF") {
                        e.currentTarget.style.borderColor = "#d1d5db";
                        e.currentTarget.style.backgroundColor = "#ffffff";
                      }
                    }}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>➗</div>
                    <div style={{ fontWeight: "600", color: "#1f2937", fontSize: "14px" }}>Half Payment</div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                      ₹{((parseFloat(currentInvoiceForPayment.dueAmount) || 0) / 2).toFixed(2)}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentTypeChange("MANUAL")}
                    style={{
                      padding: "15px",
                      borderRadius: "10px",
                      border: paymentForm.paymentType === "MANUAL" ? "3px solid #6366f1" : "2px solid #d1d5db",
                      backgroundColor: paymentForm.paymentType === "MANUAL" ? "#eef2ff" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "center",
                    }}
                    onMouseOver={(e) => {
                      if (paymentForm.paymentType !== "MANUAL") {
                        e.currentTarget.style.borderColor = "#6366f1";
                        e.currentTarget.style.backgroundColor = "#f5f7ff";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (paymentForm.paymentType !== "MANUAL") {
                        e.currentTarget.style.borderColor = "#d1d5db";
                        e.currentTarget.style.backgroundColor = "#ffffff";
                      }
                    }}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>✏️</div>
                    <div style={{ fontWeight: "600", color: "#1f2937", fontSize: "14px" }}>Manual Amount</div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>Enter custom</div>
                  </button>
                </div>
              </div>

              {/* Payment Details Form */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                    Payment Amount (₹) * <span style={{ color: "#ef4444" }}>●</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    max={currentInvoiceForPayment.dueAmount || currentInvoiceForPayment.grandTotal}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value, paymentType: "MANUAL" })}
                    placeholder="0.00"
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "16px",
                      fontWeight: "600",
                      transition: "all 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                  />
                  <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>
                    💰 Maximum: ₹{(parseFloat(currentInvoiceForPayment.dueAmount) || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                    Payment Date * <span style={{ color: "#ef4444" }}>●</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
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
                  <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>📅 Date of payment</p>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                    Payment Mode * <span style={{ color: "#ef4444" }}>●</span>
                  </label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
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
                    <option value="CASH">💵 Cash</option>
                    <option value="UPI">📱 UPI</option>
                    <option value="BANK">🏦 Bank Transfer</option>
                    <option value="SPLIT">💳 Split Payment</option>
                  </select>
                  <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>💳 Payment method</p>
                </div>
              </div>

              {/* Conditional Fields */}
              {paymentForm.paymentMode === "BANK" && (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={paymentForm.bankName}
                      onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                      placeholder="e.g., State Bank of India"
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
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                      Cheque Number
                    </label>
                    <input
                      type="text"
                      value={paymentForm.chequeNumber}
                      onChange={(e) => setPaymentForm({ ...paymentForm, chequeNumber: e.target.value })}
                      placeholder="e.g., 123456"
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
                  </div>
                </div>
              )}
              {(paymentForm.paymentMode === "UPI" || paymentForm.paymentMode === "BANK") && (
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                    Transaction ID / Reference Number
                  </label>
                  <input
                    type="text"
                    value={paymentForm.transactionId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                    placeholder="Enter transaction or reference number"
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
                  <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>🔗 UPI transaction ID or bank reference number</p>
                </div>
              )}
              <div style={{ marginBottom: "25px" }}>
                <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "14px" }}>
                  Notes (Optional)
                </label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Add any additional notes about this payment..."
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
                <p style={{ marginTop: "5px", color: "#6b7280", fontSize: "12px" }}>📝 Additional payment notes or remarks</p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "12px", paddingTop: "20px", borderTop: "2px solid #e5e7eb" }}>
                <button
                  onClick={handleAddPayment}
                  disabled={!paymentForm.amount || parseFloat(paymentForm.amount) <= 0}
                  style={{
                    flex: 1,
                    padding: "14px 24px",
                    backgroundColor: paymentForm.amount && parseFloat(paymentForm.amount) > 0 ? "#22c55e" : "#9ca3af",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: paymentForm.amount && parseFloat(paymentForm.amount) > 0 ? "pointer" : "not-allowed",
                    fontSize: "15px",
                    fontWeight: "600",
                    transition: "all 0.2s",
                    boxShadow: paymentForm.amount && parseFloat(paymentForm.amount) > 0 ? "0 4px 6px -1px rgba(34, 197, 94, 0.3)" : "none",
                  }}
                  onMouseOver={(e) => {
                    if (paymentForm.amount && parseFloat(paymentForm.amount) > 0) {
                      e.target.style.backgroundColor = "#16a34a";
                      e.target.style.boxShadow = "0 6px 8px -1px rgba(34, 197, 94, 0.4)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (paymentForm.amount && parseFloat(paymentForm.amount) > 0) {
                      e.target.style.backgroundColor = "#22c55e";
                      e.target.style.boxShadow = "0 4px 6px -1px rgba(34, 197, 94, 0.3)";
                    }
                  }}
                >
                  ✅ Add Payment
                </button>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setCurrentInvoiceId(null);
                    resetPaymentForm();
                  }}
                  style={{
                    flex: 1,
                    padding: "14px 24px",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "15px",
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

        {/* Invoice Details Modal */}
        {selectedInvoice && (
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
              padding: isMobile ? "80px 15px 15px 15px" : "80px 20px 20px 20px",
            }}
            onClick={() => setSelectedInvoice(null)}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: isMobile ? "20px" : "30px",
                borderRadius: "16px",
                maxWidth: "900px",
                width: "100%",
                maxHeight: "calc(100vh - 100px)",
                overflow: "auto",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                position: "relative",
                zIndex: 10005,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: "25px", borderBottom: "2px solid #e5e7eb", paddingBottom: "15px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div>
                    <h2 style={{ margin: 0, color: "#1f2937", fontSize: "24px", fontWeight: "600" }}>🧾 Invoice Details</h2>
                    <p style={{ margin: "5px 0 0 0", color: "#6b7280", fontSize: "14px" }}>Complete invoice information and related quotation</p>
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      onClick={async () => {
                        try {
                          const response = await downloadInvoice(selectedInvoice.id);
                          const url = window.URL.createObjectURL(new Blob([response.data]));
                          const link = document.createElement('a');
                          link.href = url;
                          link.setAttribute('download', `invoice-${selectedInvoice.invoiceNumber}.pdf`);
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          console.error("Failed to download invoice", error);
                          toast.error("Failed to download invoice PDF");
                        }
                      }}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#6366f1",
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
                      onMouseOver={(e) => (e.target.style.backgroundColor = "#4f46e5")}
                      onMouseOut={(e) => (e.target.style.backgroundColor = "#6366f1")}
                    >
                      📄 Download Final Bill
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const response = await printInvoice(selectedInvoice.id);
                          const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                          const printWindow = window.open(url, '_blank');
                          if (printWindow) {
                            printWindow.onload = () => {
                              printWindow.print();
                            };
                          }
                        } catch (error) {
                          console.error("Failed to print invoice", error);
                          toast.error("Failed to print invoice PDF");
                        }
                      }}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#f59e0b",
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
                      onMouseOver={(e) => (e.target.style.backgroundColor = "#d97706")}
                      onMouseOut={(e) => (e.target.style.backgroundColor = "#f59e0b")}
                    >
                      🖨️ Print Final Bill
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const response = await downloadBasicInvoice(selectedInvoice.id);
                          const url = window.URL.createObjectURL(new Blob([response.data]));
                          const link = document.createElement('a');
                          link.href = url;
                          link.setAttribute('download', `basic-invoice-${selectedInvoice.invoiceNumber}.pdf`);
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          console.error("Failed to download basic invoice", error);
                          toast.error("Failed to download basic invoice PDF");
                        }
                      }}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#8b5cf6",
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
                      onMouseOver={(e) => (e.target.style.backgroundColor = "#7c3aed")}
                      onMouseOut={(e) => (e.target.style.backgroundColor = "#8b5cf6")}
                    >
                      📋 Download Estimate
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const response = await printBasicInvoice(selectedInvoice.id);
                          const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                          const printWindow = window.open(url, '_blank');
                          if (printWindow) {
                            printWindow.onload = () => {
                              printWindow.print();
                            };
                          }
                        } catch (error) {
                          console.error("Failed to print basic invoice", error);
                          toast.error("Failed to print basic invoice PDF");
                        }
                      }}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#a855f7",
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
                      onMouseOver={(e) => (e.target.style.backgroundColor = "#9333ea")}
                      onMouseOut={(e) => (e.target.style.backgroundColor = "#a855f7")}
                    >
                      🖨️ Print Estimate
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const response = await printDeliveryChallan(selectedInvoice.id);
                          const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                          const printWindow = window.open(url, '_blank');
                          if (printWindow) {
                            printWindow.onload = () => {
                              printWindow.print();
                            };
                          }
                        } catch (error) {
                          console.error("Failed to print delivery challan", error);
                          toast.error("Failed to print delivery challan PDF");
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
                      🖨️ Print Challan (No Prices)
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const response = await downloadTransportChallan(selectedInvoice.id);
                          const url = window.URL.createObjectURL(new Blob([response.data]));
                          const link = document.createElement('a');
                          link.href = url;
                          link.setAttribute('download', `delivery-challan-${selectedInvoice.invoiceNumber}.pdf`);
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          console.error("Failed to download transport challan", error);
                          toast.error("Failed to download delivery challan PDF");
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
                      📥 Download Challan
                    </button>
                    <button
                      onClick={() => setSelectedInvoice(null)}
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

              {/* Quotation Details Section */}
              {(selectedQuotationDetails || selectedInvoice.quotationId) && (
                <div
                  style={{
                    marginBottom: "30px",
                    padding: "20px",
                    backgroundColor: "#f0f9ff",
                    borderRadius: "8px",
                    border: "2px solid #bae6fd",
                  }}
                >
                  <h3 style={{ margin: "0 0 15px 0", color: "#1e40af", fontSize: "18px", fontWeight: "600" }}>
                    📄 Related Quotation
                  </h3>
                  {selectedQuotationDetails ? (
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "20px" }}>
                      <div>
                        <strong style={{ color: "#374151", fontSize: "13px" }}>Quotation #:</strong>
                        <p style={{ margin: "4px 0", color: "#1f2937", fontSize: "14px", fontWeight: "500" }}>
                          {selectedQuotationDetails.quotationNumber}
                        </p>
                      </div>
                      <div>
                        <strong style={{ color: "#374151", fontSize: "13px" }}>Quotation Date:</strong>
                        <p style={{ margin: "4px 0", color: "#1f2937", fontSize: "14px" }}>{selectedQuotationDetails.quotationDate}</p>
                      </div>
                      <div>
                        <strong style={{ color: "#374151", fontSize: "13px" }}>Status:</strong>
                        <p style={{ margin: "4px 0", color: "#1f2937", fontSize: "14px" }}>{selectedQuotationDetails.status}</p>
                      </div>
                      <div>
                        <strong style={{ color: "#374151", fontSize: "13px" }}>Quotation Total:</strong>
                        <p style={{ margin: "4px 0", color: "#1f2937", fontSize: "14px", fontWeight: "600" }}>
                          ₹{(parseFloat(selectedQuotationDetails.grandTotal) || 0).toFixed(2)}
                        </p>
                      </div>
                      {selectedQuotationDetails.billingType && (
                        <div>
                          <strong style={{ color: "#374151", fontSize: "13px" }}>Billing Type:</strong>
                          <p style={{ margin: "4px 0", color: "#1f2937", fontSize: "14px" }}>{selectedQuotationDetails.billingType}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: "15px", textAlign: "center", color: "#6b7280" }}>
                      <p style={{ margin: 0 }}>Loading quotation details...</p>
                      <p style={{ margin: "8px 0 0 0", fontSize: "12px" }}>Quotation ID: {selectedInvoice.quotationId}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Invoice Information */}
              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ margin: "0 0 15px 0", color: "#374151", fontSize: "18px", fontWeight: "600" }}>📋 Invoice Information</h3>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "15px" }}>
                  <div>
                    <strong style={{ color: "#374151", fontSize: "13px" }}>Invoice #:</strong>
                    <p style={{ margin: "4px 0", color: "#1f2937", fontSize: "14px", fontWeight: "500" }}>{selectedInvoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <strong style={{ color: "#374151", fontSize: "13px" }}>Customer:</strong>
                    <p style={{ margin: "4px 0", color: "#1f2937", fontSize: "14px" }}>{selectedInvoice.customerName}</p>
                  </div>
                  <div>
                    <strong style={{ color: "#374151", fontSize: "13px" }}>Billing Type:</strong>
                    <p style={{ margin: "4px 0", color: "#1f2937", fontSize: "14px" }}>{selectedInvoice.billingType}</p>
                  </div>
                  <div>
                    <strong style={{ color: "#374151", fontSize: "13px" }}>Payment Status:</strong>
                    <p style={{ margin: "4px 0" }}>{getPaymentStatusBadge(selectedInvoice.paymentStatus)}</p>
                  </div>
                  <div>
                    <strong style={{ color: "#374151", fontSize: "13px" }}>Invoice Date:</strong>
                    <p style={{ margin: "4px 0", color: "#1f2937", fontSize: "14px" }}>{selectedInvoice.invoiceDate}</p>
                  </div>
                  <div>
                    <strong style={{ color: "#374151", fontSize: "13px" }}>Invoice Type:</strong>
                    <p style={{ margin: "4px 0", color: "#1f2937", fontSize: "14px" }}>{selectedInvoice.invoiceType}</p>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div style={{ marginBottom: "30px", padding: "20px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                <h3 style={{ margin: "0 0 15px 0", color: "#374151", fontSize: "18px", fontWeight: "600" }}>💰 Financial Summary</h3>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "15px" }}>
                  <div>
                    <strong style={{ color: "#374151", fontSize: "13px" }}>Subtotal:</strong>
                    <p style={{ margin: "4px 0", color: "#1f2937", fontSize: "16px", fontWeight: "500" }}>₹{(parseFloat(selectedInvoice.subtotal) || 0).toFixed(2)}</p>
                  </div>
                  {selectedInvoice.billingType === "GST" && (
                    <>
                      <div>
                        <strong style={{ color: "#374151", fontSize: "13px" }}>GST ({selectedInvoice.gstPercentage}%):</strong>
                        <p style={{ margin: "4px 0", color: "#1f2937", fontSize: "16px", fontWeight: "500" }}>
                          ₹{(parseFloat(selectedInvoice.gstAmount) || 0).toFixed(2)}
                        </p>
                      </div>
                      {selectedInvoice.cgst && (
                        <div>
                          <strong style={{ color: "#374151", fontSize: "13px" }}>CGST:</strong>
                          <p style={{ margin: "4px 0", color: "#1f2937", fontSize: "14px" }}>₹{(parseFloat(selectedInvoice.cgst) || 0).toFixed(2)}</p>
                        </div>
                      )}
                      {selectedInvoice.sgst && (
                        <div>
                          <strong style={{ color: "#374151", fontSize: "13px" }}>SGST:</strong>
                          <p style={{ margin: "4px 0", color: "#1f2937", fontSize: "14px" }}>₹{(parseFloat(selectedInvoice.sgst) || 0).toFixed(2)}</p>
                        </div>
                      )}
                      {selectedInvoice.igst && (
                        <div>
                          <strong style={{ color: "#374151", fontSize: "13px" }}>IGST:</strong>
                          <p style={{ margin: "4px 0", color: "#1f2937", fontSize: "14px" }}>₹{(parseFloat(selectedInvoice.igst) || 0).toFixed(2)}</p>
                        </div>
                      )}
                    </>
                  )}
                  <div>
                    <strong style={{ color: "#374151", fontSize: "13px" }}>Grand Total:</strong>
                    <p style={{ margin: "4px 0", color: "#1f2937", fontSize: "18px", fontWeight: "700" }}>
                      ₹{(parseFloat(selectedInvoice.grandTotal) || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <strong style={{ color: "#374151", fontSize: "13px" }}>Paid Amount:</strong>
                    <p style={{ margin: "4px 0", color: "#22c55e", fontSize: "16px", fontWeight: "600" }}>
                      ₹{(parseFloat(selectedInvoice.paidAmount) || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <strong style={{ color: "#374151", fontSize: "13px" }}>Due Amount:</strong>
                    <p
                      style={{
                        margin: "4px 0",
                        color: selectedInvoice.dueAmount > 0 ? "#ef4444" : "#22c55e",
                        fontSize: "16px",
                        fontWeight: "600",
                      }}
                    >
                      ₹{(parseFloat(selectedInvoice.dueAmount) || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ margin: "0 0 15px 0", color: "#374151", fontSize: "18px", fontWeight: "600" }}>📦 Invoice Items</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f3f4f6" }}>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Glass Type</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Thickness</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Size</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Qty</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Rate</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items?.map((item, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderTop: "1px solid #e5e7eb",
                            backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                          }}
                        >
                          <td style={{ padding: "12px" }}>{item.glassType || "N/A"}</td>
                          <td style={{ padding: "12px" }}>{item.thickness || "N/A"}</td>
                          <td style={{ padding: "12px" }}>
                            {item.height} x {item.width} ft
                          </td>
                          <td style={{ padding: "12px" }}>{item.quantity}</td>
                          <td style={{ padding: "12px" }}>₹{item.ratePerSqft}</td>
                          <td style={{ padding: "12px", fontWeight: "600" }}>₹{(parseFloat(item.subtotal) || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments Section */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div style={{ marginBottom: "30px" }}>
                  <h3 style={{ margin: "0 0 15px 0", color: "#374151", fontSize: "18px", fontWeight: "600" }}>💳 Payment History</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f3f4f6" }}>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Date</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Mode</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Amount</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>Reference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.payments.map((payment, idx) => (
                          <tr
                            key={idx}
                            style={{
                              borderTop: "1px solid #e5e7eb",
                              backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                            }}
                          >
                            <td style={{ padding: "12px" }}>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                            <td style={{ padding: "12px" }}>{payment.paymentMode}</td>
                            <td style={{ padding: "12px", fontWeight: "600", color: "#22c55e" }}>₹{(parseFloat(payment.amount) || 0).toFixed(2)}</td>
                            <td style={{ padding: "12px", color: "#6b7280" }}>{payment.transactionId || payment.referenceNumber || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "20px", borderTop: "2px solid #e5e7eb" }}>
                <button
                  onClick={() => {
                    setSelectedInvoice(null);
                    setSelectedQuotationDetails(null);
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
                  ❌ Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

export default InvoiceManagement;

