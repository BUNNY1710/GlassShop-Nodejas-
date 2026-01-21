const PDFDocument = require('pdfkit');
const { Quotation, QuotationItem, Invoice, InvoiceItem, Shop, User } = require('../models');

/**
 * Generate PDF for Quotation/Cutting-Pad
 */
const generateQuotationPdf = async (quotationId, userId) => {
  const quotation = await Quotation.findByPk(quotationId, {
    include: [
      { 
        model: QuotationItem, 
        as: 'items',
        separate: true,
        order: [['itemOrder', 'ASC']]
      },
      { model: Shop, as: 'shop' }
    ]
  });

  if (!quotation) {
    throw new Error('Quotation not found');
  }

  // Get user's shop for security check
  const user = await User.findOne({
    where: { userName: userId },
    include: [{ model: Shop, as: 'shop' }]
  });

  if (!user || !user.shopId) {
    throw new Error('User not found or not linked to a shop');
  }

  if (quotation.shopId !== user.shopId) {
    throw new Error('Unauthorized access to quotation');
  }

  const doc = new PDFDocument({ margin: 50 });
  const chunks = [];

  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {});

  // Title
  doc.fontSize(20).font('Helvetica-Bold').text('QUOTATION / CUTTING-PAD', { align: 'center' });
  doc.moveDown(2);

  // Shop Details
  doc.fontSize(12).font('Helvetica-Bold').text('From:');
  doc.fontSize(10).font('Helvetica');
  if (quotation.shop && quotation.shop.shopName) {
    doc.text(quotation.shop.shopName);
  }
  if (quotation.shop && quotation.shop.ownerName) {
    doc.text(quotation.shop.ownerName);
  }
  if (quotation.shop && quotation.shop.email) {
    doc.text(quotation.shop.email);
  }
  doc.moveDown();

  // Quotation Details
  doc.fontSize(12).font('Helvetica-Bold').text('Quotation Number: ' + quotation.quotationNumber);
  doc.fontSize(10).font('Helvetica');
  doc.text('Date: ' + formatDate(quotation.quotationDate));
  if (quotation.validUntil) {
    doc.text('Valid Until: ' + formatDate(quotation.validUntil));
  }
  doc.moveDown();

  // Customer Details
  doc.fontSize(12).font('Helvetica-Bold').text('To:');
  doc.fontSize(10).font('Helvetica');
  doc.text(quotation.customerName || '');
  if (quotation.customerMobile) {
    doc.text('Mobile: ' + quotation.customerMobile);
  }
  if (quotation.customerAddress) {
    doc.text(quotation.customerAddress);
  }
  if (quotation.customerGstin) {
    doc.text('GSTIN: ' + quotation.customerGstin);
  }
  doc.moveDown();

  // Items Table Header
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Items:', { underline: true });
  doc.moveDown(0.5);

  // Table Headers
  const tableTop = doc.y;
  doc.fontSize(9);
  doc.text('Sr.', 50, tableTop);
  doc.text('Glass Type', 80, tableTop);
  doc.text('Dimensions', 180, tableTop);
  doc.text('Qty', 280, tableTop);
  doc.text('Rate/Sqft', 320, tableTop);
  doc.text('Area', 400, tableTop);
  doc.text('Amount', 460, tableTop);

  let currentY = tableTop + 20;

  // Items
  if (quotation.items && quotation.items.length > 0) {
    quotation.items.forEach((item, index) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      doc.fontSize(9).font('Helvetica');
      doc.text((index + 1).toString(), 50, currentY);
      doc.text(item.glassType || '', 80, currentY);
      doc.text(`${item.height} x ${item.width}`, 180, currentY);
      doc.text(item.quantity.toString(), 280, currentY);
      doc.text('₹' + parseFloat(item.ratePerSqft || 0).toFixed(2), 320, currentY);
      doc.text(parseFloat(item.area || 0).toFixed(2) + ' sqft', 400, currentY);
      doc.text('₹' + parseFloat(item.subtotal || 0).toFixed(2), 460, currentY);
      currentY += 15;
    });
  }

  doc.moveDown(2);

  // Summary
  doc.fontSize(10).font('Helvetica-Bold').text('Summary:', { underline: true });
  doc.fontSize(10).font('Helvetica');
  doc.moveDown(0.5);
  doc.text('Subtotal: ₹' + parseFloat(quotation.subtotal || 0).toFixed(2), { align: 'right' });
  
  if (quotation.installationCharge && quotation.installationCharge > 0) {
    doc.text('Installation Charge: ₹' + parseFloat(quotation.installationCharge).toFixed(2), { align: 'right' });
  }
  
  if (quotation.transportCharge && quotation.transportCharge > 0) {
    doc.text('Transport Charge: ₹' + parseFloat(quotation.transportCharge).toFixed(2), { align: 'right' });
  }
  
  if (quotation.discount && quotation.discount > 0) {
    doc.text('Discount: ₹' + parseFloat(quotation.discount).toFixed(2), { align: 'right' });
  }

  if (quotation.billingType === 'GST' && quotation.gstAmount && quotation.gstAmount > 0) {
    doc.text('GST (' + (quotation.gstPercentage || 0) + '%): ₹' + parseFloat(quotation.gstAmount).toFixed(2), { align: 'right' });
  }

  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('Grand Total: ₹' + parseFloat(quotation.grandTotal || 0).toFixed(2), { align: 'right' });

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);
  });
};

/**
 * Generate PDF for Cutting-Pad Print (Dimensions only, no prices)
 */
const generateCuttingPadPrintPdf = async (quotationId, userId) => {
  const quotation = await Quotation.findByPk(quotationId, {
    include: [
      { 
        model: QuotationItem, 
        as: 'items',
        separate: true,
        order: [['itemOrder', 'ASC']]
      },
      { model: Shop, as: 'shop' }
    ]
  });

  if (!quotation) {
    throw new Error('Quotation not found');
  }

  // Get user's shop for security check
  const user = await User.findOne({
    where: { userName: userId },
    include: [{ model: Shop, as: 'shop' }]
  });

  if (!user || !user.shopId) {
    throw new Error('User not found or not linked to a shop');
  }

  if (quotation.shopId !== user.shopId) {
    throw new Error('Unauthorized access to quotation');
  }

  const doc = new PDFDocument({ margin: 50 });
  const chunks = [];

  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {});

  // Title
  doc.fontSize(20).font('Helvetica-Bold').text('CUTTING-PAD', { align: 'center' });
  doc.moveDown(2);

  // Quotation Details
  doc.fontSize(12).font('Helvetica-Bold').text('Quotation Number: ' + quotation.quotationNumber);
  doc.fontSize(10).font('Helvetica');
  doc.text('Date: ' + formatDate(quotation.quotationDate));
  doc.moveDown();

  // Customer
  doc.fontSize(12).font('Helvetica-Bold').text('Customer: ' + (quotation.customerName || ''));
  doc.moveDown();

  // Items Table Header
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Cutting Dimensions:', { underline: true });
  doc.moveDown(0.5);

  // Table Headers
  const tableTop = doc.y;
  doc.fontSize(9);
  doc.text('Sr.', 50, tableTop);
  doc.text('Glass Type', 80, tableTop);
  doc.text('Thickness', 180, tableTop);
  doc.text('Height', 250, tableTop);
  doc.text('Width', 320, tableTop);
  doc.text('Quantity', 390, tableTop);
  doc.text('Design', 450, tableTop);

  let currentY = tableTop + 20;

  // Items (dimensions only)
  if (quotation.items && quotation.items.length > 0) {
    quotation.items.forEach((item, index) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      doc.fontSize(9).font('Helvetica');
      doc.text((index + 1).toString(), 50, currentY);
      doc.text(item.glassType || '', 80, currentY);
      doc.text(item.thickness || '', 180, currentY);
      doc.text(item.height + ' ' + (item.heightUnit || 'FEET'), 250, currentY);
      doc.text(item.width + ' ' + (item.widthUnit || 'FEET'), 320, currentY);
      doc.text(item.quantity.toString(), 390, currentY);
      doc.text(item.design || '-', 450, currentY);
      currentY += 15;
    });
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);
  });
};

/**
 * Helper function to format dates
 */
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Generate PDF for Invoice (Full with shop details)
 */
const generateInvoicePdf = async (invoiceId, userId) => {
  const invoice = await Invoice.findByPk(invoiceId, {
    include: [
      { 
        model: InvoiceItem, 
        as: 'items',
        separate: true,
        order: [['itemOrder', 'ASC']]
      },
      { model: Shop, as: 'shop' }
    ]
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Get user's shop for security check
  const user = await User.findOne({
    where: { userName: userId },
    include: [{ model: Shop, as: 'shop' }]
  });

  if (!user || !user.shopId) {
    throw new Error('User not found or not linked to a shop');
  }

  if (invoice.shopId !== user.shopId) {
    throw new Error('Unauthorized access to invoice');
  }

  const doc = new PDFDocument({ margin: 50 });
  const chunks = [];

  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {});

  // Title
  const title = invoice.billingType === 'GST' ? 'TAX INVOICE' : 'BILL / CASH MEMO';
  doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(2);

  // Shop Details (From)
  doc.fontSize(12).font('Helvetica-Bold').text('From:');
  doc.fontSize(10).font('Helvetica');
  if (invoice.shop && invoice.shop.shopName) {
    doc.text(invoice.shop.shopName);
  }
  if (invoice.shop && invoice.shop.ownerName) {
    doc.text(invoice.shop.ownerName);
  }
  if (invoice.shop && invoice.shop.email) {
    doc.text(invoice.shop.email);
  }
  if (invoice.shop && invoice.shop.whatsappNumber) {
    doc.text('WhatsApp: ' + invoice.shop.whatsappNumber);
  }
  doc.moveDown();

  // Invoice Details
  doc.fontSize(12).font('Helvetica-Bold').text('Invoice Number: ' + invoice.invoiceNumber);
  doc.fontSize(10).font('Helvetica');
  doc.text('Date: ' + formatDate(invoice.invoiceDate));
  if (invoice.invoiceType) {
    doc.text('Invoice Type: ' + invoice.invoiceType);
  }
  doc.moveDown();

  // Customer Details (To)
  doc.fontSize(12).font('Helvetica-Bold').text('To:');
  doc.fontSize(10).font('Helvetica');
  doc.text(invoice.customerName || '');
  if (invoice.customerMobile) {
    doc.text('Mobile: ' + invoice.customerMobile);
  }
  if (invoice.customerAddress) {
    doc.text(invoice.customerAddress);
  }
  if (invoice.customerGstin) {
    doc.text('GSTIN: ' + invoice.customerGstin);
  }
  if (invoice.customerState) {
    doc.text('State: ' + invoice.customerState);
  }
  doc.moveDown();

  // Items Table Header
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Items:', { underline: true });
  doc.moveDown(0.5);

  // Table Headers
  const tableTop = doc.y;
  doc.fontSize(9);
  doc.text('Sr.', 50, tableTop);
  doc.text('Glass Type', 80, tableTop);
  doc.text('Dimensions', 180, tableTop);
  doc.text('Qty', 280, tableTop);
  doc.text('Rate/Sqft', 320, tableTop);
  doc.text('Area', 400, tableTop);
  doc.text('Amount', 460, tableTop);

  let currentY = tableTop + 20;

  // Items
  if (invoice.items && invoice.items.length > 0) {
    invoice.items.forEach((item, index) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      doc.fontSize(9).font('Helvetica');
      doc.text((index + 1).toString(), 50, currentY);
      doc.text(item.glassType || '', 80, currentY);
      doc.text(`${item.height} x ${item.width}`, 180, currentY);
      doc.text(item.quantity.toString(), 280, currentY);
      doc.text('₹' + parseFloat(item.ratePerSqft || 0).toFixed(2), 320, currentY);
      doc.text(parseFloat(item.area || 0).toFixed(2) + ' sqft', 400, currentY);
      doc.text('₹' + parseFloat(item.subtotal || 0).toFixed(2), 460, currentY);
      currentY += 15;
    });
  }

  doc.moveDown(2);

  // Summary
  doc.fontSize(10).font('Helvetica-Bold').text('Summary:', { underline: true });
  doc.fontSize(10).font('Helvetica');
  doc.moveDown(0.5);
  doc.text('Subtotal: ₹' + parseFloat(invoice.subtotal || 0).toFixed(2), { align: 'right' });
  
  if (invoice.installationCharge && invoice.installationCharge > 0) {
    doc.text('Installation Charge: ₹' + parseFloat(invoice.installationCharge).toFixed(2), { align: 'right' });
  }
  
  if (invoice.transportCharge && invoice.transportCharge > 0) {
    doc.text('Transport Charge: ₹' + parseFloat(invoice.transportCharge).toFixed(2), { align: 'right' });
  }
  
  if (invoice.discount && invoice.discount > 0) {
    doc.text('Discount: ₹' + parseFloat(invoice.discount).toFixed(2), { align: 'right' });
  }

  if (invoice.billingType === 'GST' && invoice.gstAmount && invoice.gstAmount > 0) {
    doc.text('GST (' + (invoice.gstPercentage || 0) + '%): ₹' + parseFloat(invoice.gstAmount).toFixed(2), { align: 'right' });
  }

  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('Grand Total: ₹' + parseFloat(invoice.grandTotal || 0).toFixed(2), { align: 'right' });
  doc.moveDown();

  // Payment Status
  doc.fontSize(10).font('Helvetica');
  doc.text('Payment Status: ' + (invoice.paymentStatus || 'DUE'));
  doc.text('Paid: ₹' + parseFloat(invoice.paidAmount || 0).toFixed(2));
  doc.text('Due: ₹' + parseFloat(invoice.dueAmount || 0).toFixed(2));

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);
  });
};

/**
 * Generate PDF for Basic Invoice (without shop details)
 */
const generateBasicInvoicePdf = async (invoiceId, userId) => {
  const invoice = await Invoice.findByPk(invoiceId, {
    include: [
      { 
        model: InvoiceItem, 
        as: 'items',
        separate: true,
        order: [['itemOrder', 'ASC']]
      },
      { model: Shop, as: 'shop' }
    ]
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Get user's shop for security check
  const user = await User.findOne({
    where: { userName: userId },
    include: [{ model: Shop, as: 'shop' }]
  });

  if (!user || !user.shopId) {
    throw new Error('User not found or not linked to a shop');
  }

  if (invoice.shopId !== user.shopId) {
    throw new Error('Unauthorized access to invoice');
  }

  const doc = new PDFDocument({ margin: 50 });
  const chunks = [];

  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {});

  // Title (NO SHOP NAME)
  const title = invoice.billingType === 'GST' ? 'TAX INVOICE' : 'BILL / CASH MEMO';
  doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(2);

  // Invoice Details
  doc.fontSize(12).font('Helvetica-Bold').text('Invoice Number: ' + invoice.invoiceNumber);
  doc.fontSize(10).font('Helvetica');
  doc.text('Date: ' + formatDate(invoice.invoiceDate));
  doc.moveDown();

  // Customer Details (To) - NO "From" section
  doc.fontSize(12).font('Helvetica-Bold').text('To:');
  doc.fontSize(10).font('Helvetica');
  doc.text(invoice.customerName || '');
  if (invoice.customerMobile) {
    doc.text('Mobile: ' + invoice.customerMobile);
  }
  if (invoice.customerAddress) {
    doc.text(invoice.customerAddress);
  }
  if (invoice.customerGstin) {
    doc.text('GSTIN: ' + invoice.customerGstin);
  }
  doc.moveDown();

  // Items Table Header
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Items:', { underline: true });
  doc.moveDown(0.5);

  // Table Headers
  const tableTop = doc.y;
  doc.fontSize(9);
  doc.text('Sr.', 50, tableTop);
  doc.text('Glass Type', 80, tableTop);
  doc.text('Dimensions', 180, tableTop);
  doc.text('Qty', 280, tableTop);
  doc.text('Rate/Sqft', 320, tableTop);
  doc.text('Area', 400, tableTop);
  doc.text('Amount', 460, tableTop);

  let currentY = tableTop + 20;

  // Items
  if (invoice.items && invoice.items.length > 0) {
    invoice.items.forEach((item, index) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      doc.fontSize(9).font('Helvetica');
      doc.text((index + 1).toString(), 50, currentY);
      doc.text(item.glassType || '', 80, currentY);
      doc.text(`${item.height} x ${item.width}`, 180, currentY);
      doc.text(item.quantity.toString(), 280, currentY);
      doc.text('₹' + parseFloat(item.ratePerSqft || 0).toFixed(2), 320, currentY);
      doc.text(parseFloat(item.area || 0).toFixed(2) + ' sqft', 400, currentY);
      doc.text('₹' + parseFloat(item.subtotal || 0).toFixed(2), 460, currentY);
      currentY += 15;
    });
  }

  doc.moveDown(2);

  // Summary
  doc.fontSize(10).font('Helvetica-Bold').text('Summary:', { underline: true });
  doc.fontSize(10).font('Helvetica');
  doc.moveDown(0.5);
  doc.text('Subtotal: ₹' + parseFloat(invoice.subtotal || 0).toFixed(2), { align: 'right' });
  
  if (invoice.installationCharge && invoice.installationCharge > 0) {
    doc.text('Installation Charge: ₹' + parseFloat(invoice.installationCharge).toFixed(2), { align: 'right' });
  }
  
  if (invoice.transportCharge && invoice.transportCharge > 0) {
    doc.text('Transport Charge: ₹' + parseFloat(invoice.transportCharge).toFixed(2), { align: 'right' });
  }
  
  if (invoice.discount && invoice.discount > 0) {
    doc.text('Discount: ₹' + parseFloat(invoice.discount).toFixed(2), { align: 'right' });
  }

  if (invoice.billingType === 'GST' && invoice.gstAmount && invoice.gstAmount > 0) {
    doc.text('GST (' + (invoice.gstPercentage || 0) + '%): ₹' + parseFloat(invoice.gstAmount).toFixed(2), { align: 'right' });
  }

  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('Grand Total: ₹' + parseFloat(invoice.grandTotal || 0).toFixed(2), { align: 'right' });
  doc.moveDown();

  // Payment Status
  doc.fontSize(10).font('Helvetica');
  doc.text('Payment Status: ' + (invoice.paymentStatus || 'DUE'));
  doc.text('Paid: ₹' + parseFloat(invoice.paidAmount || 0).toFixed(2));
  doc.text('Due: ₹' + parseFloat(invoice.dueAmount || 0).toFixed(2));

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);
  });
};

/**
 * Generate PDF for Delivery Challan (no prices)
 */
const generateChallanPdf = async (invoiceId, userId) => {
  const invoice = await Invoice.findByPk(invoiceId, {
    include: [
      { 
        model: InvoiceItem, 
        as: 'items',
        separate: true,
        order: [['itemOrder', 'ASC']]
      },
      { model: Shop, as: 'shop' }
    ]
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Get user's shop for security check
  const user = await User.findOne({
    where: { userName: userId },
    include: [{ model: Shop, as: 'shop' }]
  });

  if (!user || !user.shopId) {
    throw new Error('User not found or not linked to a shop');
  }

  if (invoice.shopId !== user.shopId) {
    throw new Error('Unauthorized access to invoice');
  }

  const doc = new PDFDocument({ margin: 50 });
  const chunks = [];

  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {});

  // Title
  doc.fontSize(20).font('Helvetica-Bold').text('DELIVERY CHALLAN', { align: 'center' });
  doc.moveDown(2);

  // Invoice Details
  doc.fontSize(12).font('Helvetica-Bold').text('Invoice Number: ' + invoice.invoiceNumber);
  doc.fontSize(10).font('Helvetica');
  doc.text('Date: ' + formatDate(invoice.invoiceDate));
  doc.moveDown();

  // Customer
  doc.fontSize(12).font('Helvetica-Bold').text('Customer: ' + (invoice.customerName || ''));
  if (invoice.customerMobile) {
    doc.fontSize(10).font('Helvetica').text('Mobile: ' + invoice.customerMobile);
  }
  if (invoice.customerAddress) {
    doc.fontSize(10).font('Helvetica').text(invoice.customerAddress);
  }
  doc.moveDown();

  // Items Table Header (dimensions only, no prices)
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Items:', { underline: true });
  doc.moveDown(0.5);

  // Table Headers
  const tableTop = doc.y;
  doc.fontSize(9);
  doc.text('Sr.', 50, tableTop);
  doc.text('Glass Type', 80, tableTop);
  doc.text('Thickness', 180, tableTop);
  doc.text('Height', 250, tableTop);
  doc.text('Width', 320, tableTop);
  doc.text('Quantity', 390, tableTop);
  doc.text('Description', 450, tableTop);

  let currentY = tableTop + 20;

  // Items (dimensions only, no prices)
  if (invoice.items && invoice.items.length > 0) {
    invoice.items.forEach((item, index) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      doc.fontSize(9).font('Helvetica');
      doc.text((index + 1).toString(), 50, currentY);
      doc.text(item.glassType || '', 80, currentY);
      doc.text(item.thickness || '-', 180, currentY);
      doc.text(item.height.toString(), 250, currentY);
      doc.text(item.width.toString(), 320, currentY);
      doc.text(item.quantity.toString(), 390, currentY);
      doc.text(item.description || '-', 450, currentY);
      currentY += 15;
    });
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);
  });
};

module.exports = {
  generateQuotationPdf,
  generateCuttingPadPrintPdf,
  generateInvoicePdf,
  generateBasicInvoicePdf,
  generateChallanPdf
};
