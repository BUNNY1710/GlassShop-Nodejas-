import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/PageWrapper";
import { Card, Button, Input, PageHeader, Alert, parseMessageType, Modal, ModalActions } from "../components/ui";
import { nav } from "../design/copy";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, searchCustomers } from "../api/quotationApi";
import { useResponsive } from "../hooks/useResponsive";
import { 
  Users, Search, PlusCircle, Edit2, Trash2, 
  MapPin, Phone, Mail, Receipt, ArrowRight
} from "lucide-react";

function CustomerManagement() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { isMobile } = useResponsive();

  const [formData, setFormData] = useState({
    name: "", mobile: "", email: "", address: "",
    gstin: "", state: "", city: "", pincode: "",
  });
  const [mobileError, setMobileError] = useState("");

  useEffect(() => { loadCustomers(); }, []);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim() === "") {
        loadCustomers();
      } else {
        try {
          setLoading(true);
          const response = await searchCustomers(searchQuery.trim());
          setCustomers(response.data);
        } catch (error) {
          loadCustomers();
        } finally {
          setLoading(false);
        }
      }
    }, 500);
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

  const validateMobile = (mobile) => {
    if (!mobile || mobile.trim() === "") return "";
    const cleaned = mobile.replace(/[\s\-\(\)]/g, "");
    if (cleaned.startsWith("+91")) {
      const digits = cleaned.substring(3);
      if (digits.length === 10 && /^\d+$/.test(digits)) return "";
      return "Mobile number with +91 must have 10 digits after country code";
    }
    if (/^\d+$/.test(cleaned)) {
      if (cleaned.length === 10) return "";
      return "Mobile number must be exactly 10 digits";
    }
    return "Mobile number must contain only digits (or +91 followed by 10 digits)";
  };

  const handleMobileChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, mobile: value });
    setMobileError(validateMobile(value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const mobileValidationError = validateMobile(formData.mobile);
    if (mobileValidationError) {
      setMobileError(mobileValidationError);
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
      loadCustomers();
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || "Failed to save customer"}`);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || "", mobile: customer.mobile || "", email: customer.email || "",
      address: customer.address || "", gstin: customer.gstin || "", state: customer.state || "",
      city: customer.city || "", pincode: customer.pincode || "",
    });
    setMobileError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setFormData({ name: "", mobile: "", email: "", address: "", gstin: "", state: "", city: "", pincode: "" });
    setMobileError("");
  };

  const handleDelete = async (customerId) => {
    try {
      await deleteCustomer(customerId);
      setMessage("✅ Customer deleted successfully");
      setConfirmDelete(null);
      loadCustomers();
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("❌ Failed to delete customer");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <PageWrapper maxWidth="lg">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={itemVariants}>
          <PageHeader
            eyebrow={nav.sections.revenue}
            title={nav.customers}
            description="Manage your customer database — add, edit, and search with enterprise precision."
            icon={<Users size={24} />}
          />
        </motion.div>

        <AnimatePresence>
          {message && (() => {
            const parsed = parseMessageType(message);
            return parsed ? (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Alert type={parsed.type}>{parsed.text}</Alert>
              </motion.div>
            ) : null;
          })()}
        </AnimatePresence>

        {/* Action Bar */}
        <motion.div variants={itemVariants}>
          <Card padding="sm" className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <Button
              variant="primary"
              icon={<PlusCircle size={18} />}
              onClick={() => { setShowForm(true); setEditingCustomer(null); resetForm(); }}
              fullWidth={isMobile}
            >
              Add Customer
            </Button>
          </Card>
        </motion.div>

        {/* Form Area */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card padding="lg">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    {editingCustomer ? <Edit2 className="text-primary-500" /> : <PlusCircle className="text-primary-500" />}
                    {editingCustomer ? "Edit Customer" : "Add New Customer"}
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <Input
                        label="Customer Name *"
                        placeholder="e.g., John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                      <Input
                        label="Mobile Number"
                        placeholder="e.g., 9876543210"
                        value={formData.mobile}
                        onChange={handleMobileChange}
                        error={mobileError}
                        icon={<Phone size={16} />}
                      />
                      <Input
                        label="Email Address"
                        type="email"
                        placeholder="customer@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        icon={<Mail size={16} />}
                      />
                      <Input
                        label="GSTIN"
                        placeholder="15-character GST number"
                        value={formData.gstin}
                        onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                        maxLength={15}
                        icon={<Receipt size={16} />}
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <MapPin size={18} /> Address Information
                    </h3>
                    <div className="space-y-4 md:space-y-6">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700">Full Address</label>
                        <textarea
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Complete address..."
                          className="input-field min-h-[100px] resize-y"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                        <Input label="State" placeholder="State" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                        <Input label="City" placeholder="City" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                        <Input label="Pincode" placeholder="Pincode" maxLength={6} value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100 justify-end">
                    <Button variant="secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                      Cancel
                    </Button>
                    <Button variant="primary" type="submit">
                      {editingCustomer ? "Update Customer" : "Create Customer"}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Customer List */}
        <motion.div variants={itemVariants}>
          <Card padding="none" className="overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 p-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">
                Customer List <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs ml-2">{customers.length}</span>
              </h3>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-slate-500 animate-pulse">Loading customers...</div>
            ) : customers.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Users size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-medium text-slate-700">No customers found</p>
                <p className="text-sm">Try adding a new customer</p>
              </div>
            ) : isMobile ? (
              <div className="divide-y divide-slate-100">
                {customers.map((customer) => (
                  <div key={customer.id} className="p-4 space-y-3">
                    <div className="font-bold text-slate-900">{customer.name}</div>
                    <div className="text-sm text-slate-600 space-y-1">
                      {customer.mobile && <div className="flex items-center gap-2"><Phone size={14} /> {customer.mobile}</div>}
                      {customer.email && <div className="flex items-center gap-2"><Mail size={14} /> {customer.email}</div>}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="secondary" size="sm" icon={<Edit2 size={14} />} onClick={() => handleEdit(customer)} className="flex-1">Edit</Button>
                      <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setConfirmDelete(customer)} className="flex-1">Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Contact</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">GSTIN</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer.id}>
                        <td className="font-medium text-slate-900 dark:text-white">{customer.name}</td>
                        <td>{customer.mobile || "-"}</td>
                        <td>{customer.email || "-"}</td>
                        <td>{customer.gstin || "-"}</td>
                        <td>
                          <div className="flex gap-2">
                            <Button variant="secondary" size="sm" icon={<Edit2 size={14} />} onClick={() => handleEdit(customer)}>Edit</Button>
                            <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setConfirmDelete(customer)}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Next Step */}
        <motion.div variants={itemVariants} className="flex justify-end pt-4">
          <Button 
            variant="primary" 
            size="lg" 
            icon={<ArrowRight size={18} />} 
            iconPosition="right"
            onClick={() => navigate("/quotations")}
            className="shadow-premium"
          >
            Next: Quotations
          </Button>
        </motion.div>
      </motion.div>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete customer?"
        description={
          confirmDelete
            ? `Permanently delete ${confirmDelete.name}? This cannot be undone.`
            : ''
        }
        size="sm"
        footer={
          confirmDelete ? (
            <ModalActions
              onCancel={() => setConfirmDelete(null)}
              onConfirm={() => handleDelete(confirmDelete.id)}
              cancelLabel="Cancel"
              confirmLabel="Delete"
              confirmVariant="danger"
            />
          ) : null
        }
      >
        <div className="flex justify-center py-2">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-950 text-red-500 rounded-full flex items-center justify-center">
            <Trash2 size={28} aria-hidden />
          </div>
        </div>
      </Modal>

    </PageWrapper>
  );
}

export default CustomerManagement;
