const PDFDocument = require('pdfkit');
const { Quotation, QuotationItem, Invoice, InvoiceItem, Shop, User } = require('../models');

// Helper function to parse JSON from description field
const parsePolishData = (description) => {
  if (!description) return null;
  try {
    return JSON.parse(description);
  } catch (e) {
    return null;
  }
};

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

  // Scale to half A4 page
  const doc = new PDFDocument({ 
    margin: 30,
    size: [595.28, 842], // A4 size
  });
  const chunks = [];

  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {});

  // Scale factor for half page
  doc.scale(0.5, 0.5);
  doc.translate(0, 0);

  // Shop Details Header
  if (quotation.shop && quotation.shop.shopName) {
    doc.fontSize(10).font('Helvetica-Bold').text(quotation.shop.shopName, { align: 'center' });
  }
  if (quotation.shop && quotation.shop.email) {
    doc.fontSize(8).font('Helvetica').text(quotation.shop.email, { align: 'center' });
  }
  if (quotation.shop && quotation.shop.whatsappNumber) {
    doc.fontSize(8).font('Helvetica').text('Mobile: ' + quotation.shop.whatsappNumber, { align: 'center' });
  }
  doc.moveDown(1);

  // Title Box with gray background
  doc.rect(50, doc.y, 495, 30).fillAndStroke('#e5e7eb', '#000000');
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text('CUTTING-PAD', { align: 'center', y: doc.y - 20 });
  doc.y += 30;
  doc.moveDown(1);

  // Quotation Details on one line
  doc.fontSize(9).font('Helvetica');
  doc.text(`Quotation Number: ${quotation.quotationNumber} | Date: ${formatDate(quotation.quotationDate)}`, { align: 'left' });
  doc.moveDown(0.5);

  // Items Table Header
  doc.fontSize(8).font('Helvetica-Bold');
  const tableTop = doc.y;
  doc.text('Sr.', 50, tableTop);
  doc.text('Glass Type', 80, tableTop);
  doc.text('Thickness', 180, tableTop);
  doc.text('Height', 250, tableTop);
  doc.text('Width', 320, tableTop);
  doc.text('Quantity', 390, tableTop);

  let currentY = tableTop + 15;

  // Items (dimensions only, no Design column)
  if (quotation.items && quotation.items.length > 0) {
    quotation.items.forEach((item, index) => {
      if (currentY > 1400) {
        doc.addPage();
        currentY = 50;
      }

      const polishData = parsePolishData(item.description);
      
      // Get original fraction strings or use decimal
      let heightDisplay = item.height?.toString() || '';
      let widthDisplay = item.width?.toString() || '';
      const unit = polishData?.sizeInMM ? 'MM' : (item.heightUnit || 'INCH');
      
      if (polishData && !polishData.sizeInMM) {
        if (polishData.heightOriginal) {
          heightDisplay = polishData.heightOriginal;
        }
        if (polishData.widthOriginal) {
          widthDisplay = polishData.widthOriginal;
        }
      }

      doc.fontSize(8).font('Helvetica');
      doc.text((index + 1).toString(), 50, currentY);
      doc.text(item.glassType || '', 80, currentY);
      doc.text(item.thickness || '', 180, currentY);
      doc.text(heightDisplay + ' ' + unit, 250, currentY);
      doc.text(widthDisplay + ' ' + unit, 320, currentY);
      doc.text(item.quantity.toString(), 390, currentY);
      
      currentY += 15;
      
      // Polish Details Box below item row
      if (polishData && (polishData.itemPolish || (polishData.polishSelection && polishData.polishSelection.length > 0))) {
        const boxY = currentY;
        const boxHeight = 25;
        
        // Draw bordered box
        doc.rect(50, boxY, 495, boxHeight).stroke();
        
        let polishText = '';
        if (polishData.itemPolish) {
          polishText += `Polish Type: ${polishData.itemPolish}`;
        }
        
        if (polishData.polishSelection && polishData.polishSelection.length > 0) {
          const selectedPolishes = polishData.polishSelection.filter(p => p.checked && p.type);
          if (selectedPolishes.length > 0) {
            if (polishText) polishText += ' | ';
            polishText += 'Polish: ';
            polishText += selectedPolishes.map(p => `${p.side}${p.sideNumber}(${p.type})`).join(', ');
          }
        }
        
        doc.fontSize(8).font('Helvetica-Bold').text(polishText || 'No polish selected', 55, boxY + 5, { width: 485 });
        currentY += boxHeight + 5;
      } else {
        currentY += 5;
      }
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

  // Top border line
  doc.moveTo(50, 50).lineTo(545, 50).stroke();
  doc.moveDown(1);

  // Title Box with gray background - ESTIMATE BILL
  doc.rect(50, doc.y, 495, 35).fillAndStroke('#e5e7eb', '#000000');
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#000000').text('ESTIMATE BILL', { align: 'center', y: doc.y + 8 });
  doc.y += 35;
  doc.moveDown(1.5);

  // Details section with bordered box
  const detailsBoxY = doc.y;
  doc.rect(50, detailsBoxY, 495, 80).stroke();
  
  // Invoice Details (left)
  doc.fontSize(10).font('Helvetica-Bold').text('Invoice Details', 55, detailsBoxY + 10);
  doc.fontSize(9).font('Helvetica');
  doc.text('Invoice Number: ' + invoice.invoiceNumber, 55, detailsBoxY + 25);
  doc.text('Date: ' + formatDate(invoice.invoiceDate), 55, detailsBoxY + 40);
  if (invoice.invoiceType) {
    doc.text('Invoice Type: ' + invoice.invoiceType, 55, detailsBoxY + 55);
  }

  // Customer Details (right)
  doc.fontSize(10).font('Helvetica-Bold').text('Customer Details', 300, detailsBoxY + 10);
  doc.fontSize(9).font('Helvetica');
  doc.text(invoice.customerName || '', 300, detailsBoxY + 25);
  if (invoice.customerMobile) {
    doc.text('Mobile: ' + invoice.customerMobile, 300, detailsBoxY + 40);
  }
  if (invoice.customerAddress) {
    doc.text(invoice.customerAddress, 300, detailsBoxY + 55, { width: 240 });
  }
  if (invoice.customerGstin) {
    doc.text('GSTIN: ' + invoice.customerGstin, 300, detailsBoxY + 70);
  }

  doc.y = detailsBoxY + 90;
  doc.moveDown(1);

  // Items Table Header with dark background
  const tableTop = doc.y;
  doc.rect(50, tableTop, 495, 20).fill('#374151');
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
  doc.text('Sr.', 55, tableTop + 6);
  doc.text('Glass Type', 80, tableTop + 6);
  doc.text('Dimensions', 180, tableTop + 6);
  doc.text('Qty', 280, tableTop + 6);
  doc.text('Rate/Sqft', 320, tableTop + 6);
  doc.text('Area', 400, tableTop + 6);
  doc.text('Amount', 460, tableTop + 6);
  doc.fillColor('#000000');

  let currentY = tableTop + 25;

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
 * Helper function to generate one copy of delivery challan
 */
const generateChallanCopy = (doc, invoice, copyNumber) => {
  const startY = copyNumber === 0 ? 0 : 560;
  doc.y = startY;

  // Shop Details Header
  if (invoice.shop && invoice.shop.shopName) {
    doc.fontSize(10).font('Helvetica-Bold').text(invoice.shop.shopName, { align: 'center' });
  }
  if (invoice.shop && invoice.shop.email) {
    doc.fontSize(8).font('Helvetica').text(invoice.shop.email, { align: 'center' });
  }
  if (invoice.shop && invoice.shop.whatsappNumber) {
    doc.fontSize(8).font('Helvetica').text('Mobile: ' + invoice.shop.whatsappNumber, { align: 'center' });
  }
  doc.moveDown(1);

  // Title Box with gray background
  doc.rect(50, doc.y, 695, 30).fillAndStroke('#e5e7eb', '#000000');
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text('DELIVERY CHALLAN', { align: 'center', y: doc.y - 20 });
  doc.y += 30;
  doc.moveDown(1);

  // Invoice Details
  doc.fontSize(9).font('Helvetica');
  doc.text('Invoice Number: ' + invoice.invoiceNumber);
  doc.text('Date: ' + formatDate(invoice.invoiceDate));
  doc.moveDown(0.5);

  // Customer
  doc.fontSize(9).font('Helvetica-Bold').text('Customer: ' + (invoice.customerName || ''));
  if (invoice.customerMobile) {
    doc.fontSize(8).font('Helvetica').text('Mobile: ' + invoice.customerMobile);
  }
  if (invoice.customerAddress) {
    doc.fontSize(8).font('Helvetica').text(invoice.customerAddress);
  }
  doc.moveDown(0.5);

  // Items Table Header
  doc.fontSize(8).font('Helvetica-Bold');
  const tableTop = doc.y;
  doc.text('Sr.', 50, tableTop);
  doc.text('Description', 80, tableTop);
  doc.text('Size', 250, tableTop);
  doc.text('Qty', 400, tableTop);
  doc.text('Remarks', 450, tableTop);

  let currentY = tableTop + 15;

  // Items
  if (invoice.items && invoice.items.length > 0) {
    invoice.items.forEach((item, index) => {
      if (currentY > (startY + 500)) {
        return; // Don't overflow the half page
      }

      const polishData = parsePolishData(item.description);
      
      // Get original fraction strings or use decimal
      let heightDisplay = item.height?.toString() || '';
      let widthDisplay = item.width?.toString() || '';
      const unit = polishData?.sizeInMM ? 'MM' : (item.heightUnit || 'INCH');
      
      if (polishData && !polishData.sizeInMM) {
        if (polishData.heightOriginal) {
          heightDisplay = polishData.heightOriginal;
        }
        if (polishData.widthOriginal) {
          widthDisplay = polishData.widthOriginal;
        }
      }

      doc.fontSize(7).font('Helvetica');
      doc.text((index + 1).toString(), 50, currentY);
      doc.text(item.glassType || '', 80, currentY, { width: 160 });
      doc.text(`${heightDisplay} × ${widthDisplay} ${unit}`, 250, currentY, { width: 140 });
      doc.text(item.quantity.toString(), 400, currentY);
      
      // Remarks with full polish details
      let remarksText = '';
      if (polishData) {
        if (polishData.itemPolish) {
          remarksText += `Polish Type: ${polishData.itemPolish}`;
        }
        if (polishData.selectedHeightTableValue && polishData.selectedWidthTableValue) {
          if (remarksText) remarksText += ' | ';
          remarksText += `Table: H=${polishData.heightTableNumber || 6}(${polishData.selectedHeightTableValue}), W=${polishData.widthTableNumber || 6}(${polishData.selectedWidthTableValue})`;
        }
        if (polishData.polishSelection && polishData.polishSelection.length > 0) {
          const selectedPolishes = polishData.polishSelection.filter(p => p.checked && p.type);
          if (selectedPolishes.length > 0) {
            if (remarksText) remarksText += ' | ';
            remarksText += 'Polish: ' + selectedPolishes.map(p => `${p.side}${p.sideNumber}(${p.type})`).join(', ');
          }
        }
      }
      
      // Wrap text in remarks column
      doc.text(remarksText || '-', 450, currentY, { width: 245, align: 'left' });
      currentY += Math.max(15, Math.ceil(remarksText.length / 35) * 8); // Adjust height based on text length
    });
  }

  // Footer
  const footerY = startY + 480;
  doc.fontSize(7).font('Helvetica');
  
  // Received By box
  doc.rect(50, footerY, 320, 60).stroke();
  doc.fontSize(8).font('Helvetica-Bold').text('Received By', 55, footerY + 5);
  doc.fontSize(7).font('Helvetica').text('Name: _________________', 55, footerY + 20);
  doc.text('Contact: _________________', 55, footerY + 35);
  doc.text('Date: _________________', 55, footerY + 50);
  
  // Delivered By box
  doc.rect(380, footerY, 320, 60).stroke();
  doc.fontSize(8).font('Helvetica-Bold').text('Delivered By', 385, footerY + 5);
  doc.fontSize(7).font('Helvetica').text('Name: _________________', 385, footerY + 20);
  doc.text('Contact: _________________', 385, footerY + 35);
  doc.text('Date: _________________', 385, footerY + 50);
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

  // Scale for 2 copies per A4 page (half page each)
  const doc = new PDFDocument({ 
    margin: 30,
    size: [595.28, 842], // A4 size
  });
  const chunks = [];

  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {});

  // Scale factor 0.75 for readability
  doc.scale(0.75, 0.75);
  doc.translate(0, 0);

  // First Copy
  generateChallanCopy(doc, invoice, 0);
  
  // Second Copy (below first)
  doc.y = 560; // Position for second copy
  generateChallanCopy(doc, invoice, 1);

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
