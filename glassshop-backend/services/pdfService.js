const PDFDocument = require('pdfkit');
const { Quotation, QuotationItem, Invoice, InvoiceItem, Shop, User } = require('../models');

/**
 * Helper function to parse polish data from description
 */
const parsePolishData = (description) => {
  if (!description) return null;
  const match = description.match(/POLISH_DATA:(.+)/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      return null;
    }
  }
  return null;
};

/**
 * Helper function to format glass type with MM suffix
 */
const formatGlassType = (glassType) => {
  if (!glassType) return '';
  const trimmed = glassType.trim();
  // If it's just a number, add MM
  if (/^\d+$/.test(trimmed)) {
    return trimmed + 'MM';
  }
  // If it's a number followed by "mm" (case insensitive), convert to "MM"
  const numberMmMatch = trimmed.match(/^(\d+)\s*mm$/i);
  if (numberMmMatch) {
    return numberMmMatch[1] + 'MM';
  }
  // If it already has "MM", return as is
  if (trimmed.toUpperCase().endsWith('MM')) {
    return trimmed;
  }
  // Otherwise, if it starts with a number, add MM
  const numberStartMatch = trimmed.match(/^(\d+)/);
  if (numberStartMatch && !trimmed.toUpperCase().includes('MM')) {
    return trimmed + 'MM';
  }
  return trimmed;
};

/**
 * Helper function to convert value to feet based on unit
 */
const convertToFeet = (value, unit) => {
  if (!value || value === 0) return 0;
  const numValue = parseFloat(value) || 0;
  if (unit === 'FEET') return numValue;
  if (unit === 'INCH') return numValue / 12;
  if (unit === 'MM') return numValue / 304.8;
  return numValue; // Default assume feet
};

/**
 * Helper function to get Running Ft from item
 * Formula: 
 * 1. Group sides by polish type (P, H, B)
 * 2. For each group, sum the side lengths, convert to feet, multiply by polish rate
 * 3. Sum all groups
 * 4. Multiply by quantity
 */
const getRunningFt = (item) => {
  // First check if runningFt is directly on the item
  if (item.runningFt !== undefined && item.runningFt !== null) {
    return parseFloat(item.runningFt) || 0;
  }
  
  // Otherwise, calculate from polish data
  const polishData = parsePolishData(item.description);
  if (polishData && polishData.runningFt !== undefined) {
    return parseFloat(polishData.runningFt) || 0;
  }
  
  // Calculate from polish selection if available - use table values instead of input height/width
  if (polishData && polishData.polishSelection && polishData.selectedHeightTableValue && polishData.selectedWidthTableValue) {
    // Get height and width units (default to FEET if not available)
    const heightUnit = item.heightUnit || 'FEET';
    const widthUnit = item.widthUnit || 'FEET';
    
    // Use table values instead of input height/width
    const heightTableValue = parseFloat(polishData.selectedHeightTableValue) || 0;
    const widthTableValue = parseFloat(polishData.selectedWidthTableValue) || 0;
    
    // Convert table values to feet
    const heightInFeet = convertToFeet(heightTableValue, heightUnit);
    const widthInFeet = convertToFeet(widthTableValue, widthUnit);
    
    // Group sides by polish type
    const polishGroups = {
      'P': { sides: [], rate: polishData.polishRates?.P || 15 },
      'H': { sides: [], rate: polishData.polishRates?.H || 75 },
      'B': { sides: [], rate: polishData.polishRates?.B || 75 }
    };
    
    // Process each polish selection row and group by type
    if (polishData.polishSelection && polishData.polishSelection.length >= 4) {
      // Height 1 (index 0)
      if (polishData.polishSelection[0].checked && polishData.polishSelection[0].type) {
        const type = polishData.polishSelection[0].type;
        if (polishGroups[type]) {
          polishGroups[type].sides.push(heightInFeet);
        }
      }
      
      // Width 1 (index 1)
      if (polishData.polishSelection[1].checked && polishData.polishSelection[1].type) {
        const type = polishData.polishSelection[1].type;
        if (polishGroups[type]) {
          polishGroups[type].sides.push(widthInFeet);
        }
      }
      
      // Height 2 (index 2)
      if (polishData.polishSelection[2].checked && polishData.polishSelection[2].type) {
        const type = polishData.polishSelection[2].type;
        if (polishGroups[type]) {
          polishGroups[type].sides.push(heightInFeet);
        }
      }
      
      // Width 2 (index 3)
      if (polishData.polishSelection[3].checked && polishData.polishSelection[3].type) {
        const type = polishData.polishSelection[3].type;
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
    return totalRunningFt * quantity;
  }
  
  return 0;
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
      doc.text(formatGlassType(item.glassType || ''), 80, currentY);
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
    const discountLabel = quotation.discountType === 'PERCENTAGE' && quotation.discountValue
      ? `Discount (${quotation.discountValue}%): ₹${parseFloat(quotation.discount).toFixed(2)}`
      : `Discount: ₹${parseFloat(quotation.discount).toFixed(2)}`;
    doc.text(discountLabel, { align: 'right' });
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

  // Single copy, half A4 page - Professional format
  const doc = new PDFDocument({ 
    margin: 30,
    size: [595, 842], // A4 size
  });
  const chunks = [];

  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {});

  // Top border line
  doc.moveTo(30, 30).lineTo(565, 30).stroke();
  
  // Header with shop details - more prominent
  if (quotation.shop && quotation.shop.shopName) {
    doc.fontSize(14).font('Helvetica-Bold').text(quotation.shop.shopName, 30, 40);
  }
  if (quotation.shop && quotation.shop.email) {
    doc.fontSize(10).font('Helvetica').text(`Email: ${quotation.shop.email}`, 30, 58);
  }
  doc.y = 75;

  // Title box with gray background - more prominent
  const titleY = doc.y;
  doc.rect(30, titleY, 535, 30)
     .fillColor('#e5e7eb')
     .fill()
     .fillColor('black');
  doc.fontSize(18).font('Helvetica-Bold').fillColor('black')
     .text('CUTTING-PAD', 30, titleY + 8, { align: 'center', width: 535 });
  doc.y = titleY + 35;

  // Quotation Details in bordered box
  const detailsY = doc.y;
  doc.rect(30, detailsY, 535, 50)
     .fillColor('#f9fafb')
     .fill()
     .fillColor('black')
     .stroke();
  
  doc.fontSize(10).font('Helvetica');
  doc.text(`Quotation Number: ${quotation.quotationNumber}`, 40, detailsY + 10);
  doc.text(`Date: ${formatDate(quotation.quotationDate)}`, 300, detailsY + 10);
  doc.text(`Customer: ${quotation.customerName || ''}`, 40, detailsY + 28);
  
  doc.y = detailsY + 60;

  // Items Table Header with dark background
  doc.fontSize(10).font('Helvetica-Bold');
  const tableTop = doc.y;
  doc.rect(30, tableTop, 535, 20)
     .fillColor('#374151')
     .fill()
     .fillColor('white');
  
  doc.fontSize(9).font('Helvetica-Bold').fillColor('white');
  doc.text('Sr.', 40, tableTop + 6);
  doc.text('Glass Type', 70, tableTop + 6);
  doc.text('Height', 220, tableTop + 6);
  doc.text('Width', 320, tableTop + 6);
  doc.text('Qty', 470, tableTop + 6);
  
  doc.fillColor('black');
  let currentY = tableTop + 25;

  // Items (dimensions only) with alternating row colors
  if (quotation.items && quotation.items.length > 0) {
    quotation.items.forEach((item, index) => {
      if (currentY > 380) { // Half page limit
        doc.addPage();
        currentY = 50;
      }

      // Alternating row background
      if (index % 2 === 0) {
        doc.rect(30, currentY - 3, 535, 20)
           .fillColor('#f9fafb')
           .fill()
           .fillColor('black');
      }

      doc.fontSize(9).font('Helvetica');
      doc.text((index + 1).toString(), 40, currentY);
      doc.text(formatGlassType(item.glassType || ''), 70, currentY, { width: 140 });
      
      // Use original fraction string if available and not in MM mode
      const polishData = parsePolishData(item.description);
      let heightDisplay = item.height.toString();
      let widthDisplay = item.width.toString();
      const unit = item.heightUnit || 'FEET';
      
      if (polishData && !polishData.sizeInMM && polishData.heightOriginal) {
        heightDisplay = polishData.heightOriginal;
      }
      if (polishData && !polishData.sizeInMM && polishData.widthOriginal) {
        widthDisplay = polishData.widthOriginal;
      }
      
      doc.text(heightDisplay + ' ' + unit, 220, currentY);
      doc.text(widthDisplay + ' ' + unit, 320, currentY);
      doc.text(item.quantity.toString(), 470, currentY);
      currentY += 22;

      // Add polish details below item in a subtle box
      if (polishData) {
        const polishY = currentY;
        doc.rect(70, polishY, 465, 30)
           .fillColor('#f3f4f6')
           .fill()
           .fillColor('black')
           .strokeColor('#e5e7eb')
           .lineWidth(0.5)
           .stroke();
        
        doc.fontSize(8).font('Helvetica');
        if (polishData.itemPolish) {
          doc.font('Helvetica-Bold').text(`Polish Type: ${polishData.itemPolish}`, 75, polishY + 5);
        }
        
        // Polish Selection details - format like "Sides: Height 1=B Width 1=H Height 2=H Width 2=P"
        if (polishData.polishSelection) {
          const selectedPolishes = polishData.polishSelection.filter(p => p.checked && p.type);
          if (selectedPolishes.length > 0) {
            doc.font('Helvetica');
            const polishDetails = selectedPolishes.map(p => {
              const typeLabel = p.type === 'P' ? 'P' : p.type === 'H' ? 'H' : 'B';
              // Extract side name without number (e.g., "Height 1 (12)" -> "Height 1")
              const sideName = p.side.split('(')[0].trim();
              return `${sideName}=${typeLabel}`;
            });
            doc.text('Sides: ' + polishDetails.join(' '), 75, polishY + 18);
          }
        }
        
        currentY += 35;
      } else {
        currentY += 5; // Add spacing even if no polish data
      }
    });
  }

  // Footer with border line
  doc.moveTo(30, 375).lineTo(565, 375).stroke();
  doc.fontSize(9).font('Helvetica');
  doc.text(`Generated on: ${formatDate(new Date())}`, 30, 385);
  
  // Signature boxes - more professional
  doc.rect(30, 400, 250, 45)
     .fillColor('#f9fafb')
     .fill()
     .fillColor('black')
     .stroke();
  doc.fontSize(9).font('Helvetica-Bold').text('Prepared By:', 35, 405);
  doc.fontSize(8).font('Helvetica').text('_________________', 35, 422);
  doc.text('(Signature)', 35, 432);
  
  doc.rect(300, 400, 250, 45)
     .fillColor('#f9fafb')
     .fill()
     .fillColor('black')
     .stroke();
  doc.fontSize(9).font('Helvetica-Bold').text('Authorized By:', 305, 405);
  doc.fontSize(8).font('Helvetica').text('_________________', 305, 422);
  doc.text('(Signature)', 305, 432);
  
  // Bottom border line
  doc.moveTo(30, 450).lineTo(565, 450).stroke();

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

  const doc = new PDFDocument({ margin: 40, size: [595, 842] });
  const chunks = [];

  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {});

  // Header with shop name and email
  if (invoice.shop && invoice.shop.shopName) {
    doc.fontSize(14).font('Helvetica-Bold').text(invoice.shop.shopName, { align: 'center' });
  }
  if (invoice.shop && invoice.shop.email) {
    doc.fontSize(10).font('Helvetica').text(`Email: ${invoice.shop.email}`, { align: 'center' });
  }
  doc.moveDown(1);

  // Title box with gray background
  const titleY = doc.y;
  const title = invoice.billingType === 'GST' ? 'TAX INVOICE' : 'BILL / CASH MEMO';
  doc.rect(40, titleY, 515, 30)
     .fillColor('#e5e7eb')
     .fill()
     .fillColor('black');
  doc.fontSize(18).font('Helvetica-Bold').fillColor('black')
     .text(title, 40, titleY + 8, { align: 'center', width: 515 });
  doc.y = titleY + 35;

  // Details section with bordered box
  const detailsY = doc.y;
  doc.rect(40, detailsY, 515, 80)
     .stroke();
  
  // Left column - Invoice Details
  doc.fontSize(10).font('Helvetica-Bold').text('Invoice Details', 50, detailsY + 10);
  doc.fontSize(9).font('Helvetica');
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 50, detailsY + 25);
  doc.text(`Date: ${formatDate(invoice.invoiceDate)}`, 50, detailsY + 38);
  doc.text(`Type: ${invoice.invoiceType || 'FINAL'}`, 50, detailsY + 51);
  
  // Right column - Customer Details
  doc.fontSize(10).font('Helvetica-Bold').text('Customer Details', 300, detailsY + 10);
  doc.fontSize(9).font('Helvetica');
  doc.text(`Customer: ${invoice.customerName || ''}`, 300, detailsY + 25);
  if (invoice.customerMobile) {
    doc.text(`Mobile: ${invoice.customerMobile}`, 300, detailsY + 38);
  }
  if (invoice.customerAddress) {
    doc.text(invoice.customerAddress, 300, detailsY + 51, { width: 240 });
  }

  doc.y = detailsY + 90;

  // Items Table Header with dark background
  const tableTop = doc.y;
  doc.rect(40, tableTop, 515, 20)
     .fillColor('#374151')
     .fill()
     .fillColor('white');
  
  doc.fontSize(9).font('Helvetica-Bold').fillColor('white');
  doc.text('Sr.', 50, tableTop + 6);
  doc.text('Item', 80, tableTop + 6);
  doc.text('Size', 200, tableTop + 6);
  doc.text('Qty', 320, tableTop + 6);
  doc.text('Rate', 360, tableTop + 6);
  doc.text('Running Ft', 420, tableTop + 6);
  doc.text('Amount', 500, tableTop + 6);
  
  doc.fillColor('black');
  let currentY = tableTop + 25;

  // Items with alternating row colors
  if (invoice.items && invoice.items.length > 0) {
    invoice.items.forEach((item, index) => {
      if (currentY > 750) {
        doc.addPage();
        currentY = 50;
      }

      // Alternating row background
      if (index % 2 === 0) {
        doc.rect(40, currentY - 3, 515, 18)
           .fillColor('#f9fafb')
           .fill()
           .fillColor('black');
      }

      doc.fontSize(9).font('Helvetica');
      doc.text((index + 1).toString(), 50, currentY);
      doc.text(formatGlassType(item.glassType || ''), 80, currentY, { width: 110 });
      doc.text(`${item.height} x ${item.width} ft`, 200, currentY, { width: 110 });
      doc.text(item.quantity.toString(), 320, currentY);
      doc.text('₹' + parseFloat(item.ratePerSqft || 0).toFixed(2), 360, currentY);
      doc.text('₹' + getRunningFt(item).toFixed(2), 420, currentY);
      doc.text('₹' + parseFloat(item.subtotal || 0).toFixed(2), 500, currentY);
      currentY += 20; // Increased spacing
    });
  }

  doc.y = currentY + 10;

  // Totals section
  doc.fontSize(10).font('Helvetica-Bold').text('Summary:', 40, doc.y);
  doc.y += 15;
  
  const totalsStartY = doc.y;
  doc.fontSize(9).font('Helvetica');
  
  // Calculate total Running Ft from all items
  let totalRunningFt = 0;
  if (invoice.items && invoice.items.length > 0) {
    totalRunningFt = invoice.items.reduce((sum, item) => {
      return sum + getRunningFt(item);
    }, 0);
  }
  
  if (totalRunningFt > 0) {
    doc.text('Total Running Ft:', 400, totalsStartY, { width: 100, align: 'right' });
    doc.text('₹' + totalRunningFt.toFixed(2), 510, totalsStartY);
    totalsY = totalsStartY + 15;
  } else {
    totalsY = totalsStartY;
  }
  
  doc.text('Subtotal:', 400, totalsY, { width: 100, align: 'right' });
  doc.text('₹' + parseFloat(invoice.subtotal || 0).toFixed(2), 510, totalsY);
  totalsY += 15;
  
  if (invoice.installationCharge && invoice.installationCharge > 0) {
    doc.text('Installation:', 400, totalsY, { width: 100, align: 'right' });
    doc.text('₹' + parseFloat(invoice.installationCharge).toFixed(2), 510, totalsY);
    totalsY += 15;
  }
  
  if (invoice.transportCharge && invoice.transportCharge > 0) {
    doc.text('Transport:', 400, totalsY, { width: 100, align: 'right' });
    doc.text('₹' + parseFloat(invoice.transportCharge).toFixed(2), 510, totalsY);
    totalsY += 15;
  }
  
  if (invoice.discount && invoice.discount > 0) {
    doc.text('Discount:', 400, totalsY, { width: 100, align: 'right' });
    doc.text('₹' + parseFloat(invoice.discount).toFixed(2), 510, totalsY);
    totalsY += 15;
  }

  if (invoice.billingType === 'GST' && invoice.gstAmount && invoice.gstAmount > 0) {
    doc.text(`GST (${invoice.gstPercentage || 0}%):`, 400, totalsY, { width: 100, align: 'right' });
    doc.text('₹' + parseFloat(invoice.gstAmount).toFixed(2), 510, totalsY);
    totalsY += 15;
  }

  totalsY += 5;
  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('Grand Total:', 400, totalsY, { width: 100, align: 'right' });
  doc.text('Rs. ' + parseFloat(invoice.grandTotal || 0).toFixed(2), 510, totalsY);
  doc.y = totalsY + 25;

  // Payment Status box
  const statusY = doc.y;
  doc.rect(40, statusY, 515, 50)
     .fillColor('#f3f4f6')
     .fill()
     .fillColor('black')
     .stroke();
  
  doc.fontSize(9).font('Helvetica');
  doc.text(`Payment Status: ${invoice.paymentStatus || 'DUE'}`, 50, statusY + 10);
  doc.text(`Paid: Rs. ${parseFloat(invoice.paidAmount || 0).toFixed(2)}`, 50, statusY + 25);
  doc.text(`Due: Rs. ${parseFloat(invoice.dueAmount || 0).toFixed(2)}`, 50, statusY + 40);

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

  const doc = new PDFDocument({ margin: 40, size: [595, 842] });
  const chunks = [];

  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {});

  // Top border line
  doc.moveTo(40, 40).lineTo(555, 40).stroke();
  doc.moveDown(1);

  // Title box with gray background - ESTIMATE BILL
  const titleY = doc.y;
  doc.rect(40, titleY, 515, 30)
     .fillColor('#e5e7eb')
     .fill()
     .fillColor('black');
  doc.fontSize(18).font('Helvetica-Bold').fillColor('black')
     .text('ESTIMATE BILL', 40, titleY + 8, { align: 'center', width: 515 });
  doc.y = titleY + 35;

  // Details section with bordered box
  const detailsY = doc.y;
  doc.rect(40, detailsY, 515, 80)
     .stroke();
  
  // Left column - Invoice Details
  doc.fontSize(10).font('Helvetica-Bold').text('Invoice Details', 50, detailsY + 10);
  doc.fontSize(9).font('Helvetica');
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 50, detailsY + 25);
  doc.text(`Date: ${formatDate(invoice.invoiceDate)}`, 50, detailsY + 38);
  doc.text(`Type: ${invoice.invoiceType || 'FINAL'}`, 50, detailsY + 51);
  
  // Right column - Customer Details
  doc.fontSize(10).font('Helvetica-Bold').text('Customer Details', 300, detailsY + 10);
  doc.fontSize(9).font('Helvetica');
  doc.text(`Customer: ${invoice.customerName || ''}`, 300, detailsY + 25);
  if (invoice.customerMobile) {
    doc.text(`Mobile: ${invoice.customerMobile}`, 300, detailsY + 38);
  }
  if (invoice.customerAddress) {
    doc.text(invoice.customerAddress, 300, detailsY + 51, { width: 240 });
  }

  doc.y = detailsY + 90;

  // Items Table Header with dark background
  const tableTop = doc.y;
  doc.rect(40, tableTop, 515, 20)
     .fillColor('#374151')
     .fill()
     .fillColor('white');
  
  doc.fontSize(9).font('Helvetica-Bold').fillColor('white');
  doc.text('Sr.', 50, tableTop + 6);
  doc.text('Item', 80, tableTop + 6);
  doc.text('Size', 200, tableTop + 6);
  doc.text('Qty', 320, tableTop + 6);
  doc.text('Rate', 360, tableTop + 6);
  doc.text('Running Ft', 420, tableTop + 6);
  doc.text('Amount', 500, tableTop + 6);
  
  doc.fillColor('black');
  let currentY = tableTop + 25;

  // Items with alternating row colors
  if (invoice.items && invoice.items.length > 0) {
    invoice.items.forEach((item, index) => {
      if (currentY > 750) {
        doc.addPage();
        currentY = 50;
      }

      // Alternating row background
      if (index % 2 === 0) {
        doc.rect(40, currentY - 3, 515, 18)
           .fillColor('#f9fafb')
           .fill()
           .fillColor('black');
      }

      doc.fontSize(9).font('Helvetica');
      doc.text((index + 1).toString(), 50, currentY);
      doc.text(formatGlassType(item.glassType || ''), 80, currentY, { width: 110 });
      doc.text(`${item.height} x ${item.width} ft`, 200, currentY, { width: 110 });
      doc.text(item.quantity.toString(), 320, currentY);
      doc.text('₹' + parseFloat(item.ratePerSqft || 0).toFixed(2), 360, currentY);
      doc.text('₹' + getRunningFt(item).toFixed(2), 420, currentY);
      doc.text('₹' + parseFloat(item.subtotal || 0).toFixed(2), 500, currentY);
      currentY += 20; // Increased spacing to prevent overlap
    });
  }

  doc.y = currentY + 10;

  // Totals section
  doc.fontSize(10).font('Helvetica-Bold').text('Summary:', 40, doc.y);
  doc.y += 15;
  
  const totalsStartY = doc.y;
  doc.fontSize(9).font('Helvetica');
  
  // Calculate total Running Ft from all items
  let totalRunningFt = 0;
  if (invoice.items && invoice.items.length > 0) {
    totalRunningFt = invoice.items.reduce((sum, item) => {
      return sum + getRunningFt(item);
    }, 0);
  }
  
  if (totalRunningFt > 0) {
    doc.text('Total Running Ft:', 400, totalsStartY, { width: 100, align: 'right' });
    doc.text('₹' + totalRunningFt.toFixed(2), 510, totalsStartY);
    totalsY = totalsStartY + 15;
  } else {
    totalsY = totalsStartY;
  }
  
  doc.text('Subtotal:', 400, totalsY, { width: 100, align: 'right' });
  doc.text('₹' + parseFloat(invoice.subtotal || 0).toFixed(2), 510, totalsY);
  totalsY += 15;
  
  if (invoice.installationCharge && invoice.installationCharge > 0) {
    doc.text('Installation:', 400, totalsY, { width: 100, align: 'right' });
    doc.text('₹' + parseFloat(invoice.installationCharge).toFixed(2), 510, totalsY);
    totalsY += 15;
  }
  
  if (invoice.transportCharge && invoice.transportCharge > 0) {
    doc.text('Transport:', 400, totalsY, { width: 100, align: 'right' });
    doc.text('₹' + parseFloat(invoice.transportCharge).toFixed(2), 510, totalsY);
    totalsY += 15;
  }
  
  if (invoice.discount && invoice.discount > 0) {
    doc.text('Discount:', 400, totalsY, { width: 100, align: 'right' });
    doc.text('₹' + parseFloat(invoice.discount).toFixed(2), 510, totalsY);
    totalsY += 15;
  }

  // NO GST for Estimate Bill
  totalsY += 5;
  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('Grand Total:', 400, totalsY, { width: 100, align: 'right' });
  doc.text('Rs. ' + parseFloat(invoice.grandTotal || 0).toFixed(2), 510, totalsY);
  doc.y = totalsY + 25;

  // Payment Status box
  const statusY = doc.y;
  doc.rect(40, statusY, 515, 50)
     .fillColor('#f3f4f6')
     .fill()
     .fillColor('black')
     .stroke();
  
  doc.fontSize(9).font('Helvetica');
  doc.text(`Payment Status: ${invoice.paymentStatus || 'DUE'}`, 50, statusY + 10);
  doc.text(`Paid: Rs. ${parseFloat(invoice.paidAmount || 0).toFixed(2)}`, 50, statusY + 25);
  doc.text(`Due: Rs. ${parseFloat(invoice.dueAmount || 0).toFixed(2)}`, 50, statusY + 40);

  // Bottom border line
  doc.moveTo(40, doc.y + 60).lineTo(555, doc.y + 60).stroke();

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
 * Generate PDF for Delivery Challan (single copy, half A4 page, no prices)
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

  const doc = new PDFDocument({ margin: 30, size: [595, 842] }); // A4
  const chunks = [];

  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {});

  let y = 30;

  // Header with shop details
  if (invoice.shop && invoice.shop.shopName) {
    doc.fontSize(12).font('Helvetica-Bold').text(invoice.shop.shopName, 30, y);
    y += 15;
  }
  if (invoice.shop && invoice.shop.email) {
    doc.fontSize(10).font('Helvetica').text(invoice.shop.email, 30, y);
    y += 18; // Increased spacing
  }

  // Title box with gray background - increased spacing from email
  const titleY = y + 5; // Add extra space
  doc.rect(30, titleY, 535, 25)
     .fillColor('#e5e7eb')
     .fill()
     .fillColor('black');
  doc.fontSize(16).font('Helvetica-Bold').fillColor('black')
     .text('DELIVERY CHALLAN', 30, titleY + 6, { align: 'center', width: 535 });
  y = titleY + 35; // Increased spacing after title

  // Challan and Date
  doc.fontSize(10).font('Helvetica');
  doc.text(`Challan No: ${invoice.invoiceNumber}`, 30, y);
  doc.text(`Date: ${formatDate(invoice.invoiceDate)}`, 300, y);
  y += 20; // Increased spacing

  // From/To section
  doc.fontSize(10).font('Helvetica-Bold').text('From:', 30, y);
  doc.fontSize(9).font('Helvetica').text(invoice.shop?.shopName || 'mayurShop', 30, y + 12);
  y += 28; // Increased spacing

  doc.fontSize(10).font('Helvetica-Bold').text('To:', 30, y);
  doc.fontSize(9).font('Helvetica');
  doc.text(invoice.customerName || '', 30, y + 12);
  if (invoice.customerMobile) {
    doc.text(`Mobile: ${invoice.customerMobile}`, 30, y + 24);
  }
  if (invoice.customerAddress) {
    doc.text(invoice.customerAddress, 30, y + 36, { width: 250 });
    y += 15; // Extra space for address
  }
  y += 55; // Increased spacing before table

  // Items Table Header
  doc.fontSize(9).font('Helvetica-Bold');
  const tableTop = y;
  doc.text('Sr.', 30, tableTop);
  doc.text('Description', 60, tableTop);
  doc.text('Size', 200, tableTop);
  doc.text('Qty', 350, tableTop);
  doc.text('Remarks', 400, tableTop);

  y = tableTop + 15;
  doc.moveTo(30, y).lineTo(565, y).stroke();
  y += 8;

  // Items
  if (invoice.items && invoice.items.length > 0) {
    invoice.items.forEach((item, index) => {
      if (y > 380) return; // Half page limit

      doc.fontSize(8).font('Helvetica');
      doc.text((index + 1).toString(), 30, y);
      
      // Description (glass type and thickness)
      const glassTypeFormatted = formatGlassType(item.glassType || '');
      const desc = item.thickness ? `${item.thickness} (${item.thickness}mm)` : glassTypeFormatted;
      doc.text(desc, 60, y, { width: 130 });
      
      // Size - use original fraction if available
      const polishData = parsePolishData(item.description);
      let sizeDisplay = '';
      if (polishData && !polishData.sizeInMM && polishData.heightOriginal && polishData.widthOriginal) {
        sizeDisplay = `${polishData.heightOriginal} × ${polishData.widthOriginal}`;
      } else {
        sizeDisplay = `${item.height} × ${item.width}`;
      }
      doc.text(sizeDisplay, 200, y, { width: 140 });
      
      doc.text(item.quantity.toString(), 350, y);
      
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
        if (polishData.polishSelection) {
          const selectedPolishes = polishData.polishSelection.filter(p => p.checked && p.type);
          if (selectedPolishes.length > 0) {
            if (remarksText) remarksText += ' | ';
            const polishDetails = selectedPolishes.map(p => {
              const typeLabel = p.type === 'P' ? 'P' : p.type === 'H' ? 'H' : 'B';
              // Extract side name without number
              const sideName = p.side.split('(')[0].trim();
              return `${sideName}=${typeLabel}`;
            });
            remarksText += 'Polish: ' + polishDetails.join(' ');
          }
        }
      }
      
      // Calculate height needed for wrapped remarks text
      const remarksWidth = 150;
      const remarksHeight = doc.heightOfString(remarksText || '-', { 
        width: remarksWidth, 
        fontSize: 8 
      });
      
      // Draw remarks text with proper wrapping
      doc.fontSize(8).font('Helvetica');
      doc.text(remarksText || '-', 400, y, { 
        width: remarksWidth, 
        align: 'left',
        lineGap: 2
      });
      
      // Move to next row based on the tallest element (remarks or default row height)
      // Add extra spacing between items
      y += Math.max(25, remarksHeight + 10);
      
      // Add a small separator line between items (except for the last item)
      if (index < invoice.items.length - 1) {
        doc.moveTo(30, y - 5).lineTo(565, y - 5).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
        y += 5; // Extra space after separator
      }
    });
  }

  // Footer
  doc.fontSize(9).font('Helvetica');
  doc.text(`Generated on: ${formatDate(new Date())}`, 30, 375);
  
  // Received By and Delivered By boxes - increased height and spacing to prevent overlap
  const footerY = 395; // Moved up slightly to ensure proper spacing
  const boxHeight = 75; // Increased height
  doc.rect(30, footerY, 250, boxHeight).stroke();
  doc.fontSize(9).font('Helvetica-Bold').text('Received By:', 35, footerY + 5);
  doc.fontSize(8).font('Helvetica');
  doc.text('Name: _________________', 35, footerY + 18);
  doc.text('Contact: _______________', 35, footerY + 32);
  doc.text('Date: _______', 35, footerY + 46);
  doc.fontSize(7).font('Helvetica').text('(Signature & Stamp)', 35, footerY + 62);
  
  doc.rect(300, footerY, 250, boxHeight).stroke();
  doc.fontSize(9).font('Helvetica-Bold').text('Delivered By:', 305, footerY + 5);
  doc.fontSize(8).font('Helvetica').text('(Signature & Stamp)', 305, footerY + 32);

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
