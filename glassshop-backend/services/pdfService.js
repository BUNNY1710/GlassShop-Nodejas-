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
 * Helper function to convert number to words (Indian numbering system)
 */
const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const convertHundreds = (n) => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const one = n % 10;
      return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
    }
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    return ones[hundred] + ' Hundred' + (remainder > 0 ? ' ' + convertHundreds(remainder) : '');
  };
  
  if (num === 0) return 'Zero';
  
  const numStr = num.toFixed(2);
  const parts = numStr.split('.');
  let rupees = parseInt(parts[0]);
  const paise = parseInt(parts[1] || '0');
  
  let result = '';
  
  if (rupees >= 10000000) {
    const crores = Math.floor(rupees / 10000000);
    result += convertHundreds(crores) + ' Crore ';
    rupees %= 10000000;
  }
  
  if (rupees >= 100000) {
    const lakhs = Math.floor(rupees / 100000);
    result += convertHundreds(lakhs) + ' Lakh ';
    rupees %= 100000;
  }
  
  if (rupees >= 1000) {
    const thousands = Math.floor(rupees / 1000);
    result += convertHundreds(thousands) + ' Thousand ';
    rupees %= 1000;
  }
  
  if (rupees > 0) {
    result += convertHundreds(rupees);
  }
  
  result = result.trim() || 'Zero';
  result += ' Rupees';
  
  if (paise > 0) {
    result += ' and ' + convertHundreds(paise) + ' Paisa';
  }
  
  return result + ' only';
};

/**
 * Helper function to format date
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
 * Helper function to build comprehensive item description for PDF
 */
const buildItemDescription = (item) => {
  const parts = [];
  
  // Glass type and thickness - format like "Plan 12MM Plain Toughened"
  // glassType is now the actual glass type (Plan, Extra Clear, etc.)
  // thickness is separate
  const glassType = item.glassType || '';
  let glassTypeStr = '';
  
  if (glassType && item.thickness) {
    // Extract thickness number if it includes unit (e.g., "5MM" -> "5")
    let thicknessValue = item.thickness;
    if (typeof thicknessValue === 'string') {
      thicknessValue = thicknessValue.replace(/MM|mm/g, '').trim();
    }
    glassTypeStr = `${glassType} ${thicknessValue}MM`;
  } else if (glassType) {
    glassTypeStr = glassType;
  } else if (item.thickness) {
    let thicknessValue = item.thickness;
    if (typeof thicknessValue === 'string') {
      thicknessValue = thicknessValue.replace(/MM|mm/g, '').trim();
    }
    glassTypeStr = `${thicknessValue}MM`;
  }
  
  if (glassTypeStr) {
    parts.push(`${glassTypeStr} Plain Toughened`);
  }
  
  // Remove size from description - it will be shown in separate Length and Height columns
  
  // Design - only if exists
  if (item.design) {
    parts.push(`Design:${item.design}`);
  }
  
  // Polish details - make it more concise
  const polishData = parsePolishData(item.description);
  if (polishData && polishData.polishSelection) {
    const polishDetails = [];
    const polishMap = { 'P': 'P', 'H': 'H', 'B': 'B' };
    if (polishData.polishSelection[0]?.checked && polishData.polishSelection[0]?.type) {
      polishDetails.push(`H1:${polishMap[polishData.polishSelection[0].type] || polishData.polishSelection[0].type}`);
    }
    if (polishData.polishSelection[1]?.checked && polishData.polishSelection[1]?.type) {
      polishDetails.push(`W1:${polishMap[polishData.polishSelection[1].type] || polishData.polishSelection[1].type}`);
    }
    if (polishData.polishSelection[2]?.checked && polishData.polishSelection[2]?.type) {
      polishDetails.push(`H2:${polishMap[polishData.polishSelection[2].type] || polishData.polishSelection[2].type}`);
    }
    if (polishData.polishSelection[3]?.checked && polishData.polishSelection[3]?.type) {
      polishDetails.push(`W2:${polishMap[polishData.polishSelection[3].type] || polishData.polishSelection[3].type}`);
    }
    if (polishDetails.length > 0) {
      parts.push(`P:${polishDetails.join(',')}`);
    }
  }
  
  // Return concise description
  return parts.join(' ');
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
 * Generate PDF for Quotation - Matching Reference Format
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
      { 
        model: Shop, 
        as: 'shop',
        attributes: { exclude: [] } // Include all attributes, even if some don't exist in DB
      }
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

  const doc = new PDFDocument({ margin: 40, size: [595, 842] });
  const chunks = [];

  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {});

  let currentY = 50;

  // Title - Centered
  doc.fontSize(20).font('Helvetica-Bold').text('QUOTATION', { align: 'center' });
  currentY = 80;

  // Shop Details
  if (quotation.shop) {
    doc.fontSize(12).font('Helvetica-Bold').text(quotation.shop.shopName || '', 40, currentY);
    currentY += 15;
    // Address and phone - only show if fields exist (columns may not exist in database yet)
    if (quotation.shop && quotation.shop.address) {
      doc.fontSize(10).font('Helvetica').text(quotation.shop.address, 40, currentY);
      currentY += 12;
    }
    if (quotation.shop && quotation.shop.phone) {
      doc.fontSize(10).font('Helvetica').text(`Phone no.: ${quotation.shop.phone}`, 40, currentY);
      currentY += 12;
    }
    if (quotation.shop.email) {
      doc.fontSize(10).font('Helvetica').text(`Email: ${quotation.shop.email}`, 40, currentY);
      currentY += 12;
    }
    // GST number - only show if field exists (column may not exist in database yet)
    if (quotation.shop && (quotation.shop.gstNumber || quotation.shop.gst_number)) {
      const gstNo = quotation.shop.gstNumber || quotation.shop.gst_number;
      doc.fontSize(10).font('Helvetica').text(`GST No.: ${gstNo}`, 40, currentY);
      currentY += 12;
    }
  }
  currentY += 10;

  // Document Details Box (bordered)
  const detailsBoxY = currentY;
  doc.rect(40, detailsBoxY, 515, 60).stroke();
  doc.fontSize(10).font('Helvetica-Bold').text('Quotation No.:', 50, detailsBoxY + 10);
  doc.fontSize(10).font('Helvetica').text(quotation.quotationNumber || '', 150, detailsBoxY + 10);
  doc.fontSize(10).font('Helvetica-Bold').text('Date:', 50, detailsBoxY + 25);
  doc.fontSize(10).font('Helvetica').text(formatDate(quotation.quotationDate), 150, detailsBoxY + 25);
  doc.fontSize(10).font('Helvetica-Bold').text('Place of Supply:', 50, detailsBoxY + 40);
  doc.fontSize(10).font('Helvetica').text(quotation.customerState || 'N/A', 150, detailsBoxY + 40);
  currentY = detailsBoxY + 70;

  // Customer Section
  doc.fontSize(12).font('Helvetica-Bold').text('Quotation For:', 40, currentY);
  currentY += 15;
  doc.fontSize(10).font('Helvetica').text(quotation.customerName || '', 40, currentY);
  currentY += 12;
  if (quotation.customerMobile) {
    doc.fontSize(10).font('Helvetica').text(`Contact No.: ${quotation.customerMobile}`, 40, currentY);
    currentY += 12;
  }
  if (quotation.customerAddress) {
    doc.fontSize(10).font('Helvetica').text(quotation.customerAddress, 40, currentY, { width: 250 });
    currentY += 20;
  }
  // Shipping Address
  if (quotation.shippingAddress) {
    currentY += 5;
    doc.fontSize(10).font('Helvetica-Bold').text('Shipping Address:', 40, currentY);
    currentY += 12;
    doc.fontSize(10).font('Helvetica').text(quotation.shippingAddress, 40, currentY, { width: 250 });
    currentY += 20;
  }
  currentY += 10;

  // Items Table Header - Adjusted column positions to fit within page
  const tableTop = currentY;
  doc.rect(40, tableTop, 515, 20)
     .fillColor('#374151')
     .fill()
     .fillColor('white');
  
  doc.fontSize(8).font('Helvetica-Bold').fillColor('white');
  doc.text('#', 40, tableTop + 6);
  doc.text('Item Name', 50, tableTop + 6);
  doc.text('Length', 140, tableTop + 6);
  doc.text('Height', 180, tableTop + 6);
  doc.text('HSN/SAC', 220, tableTop + 6);
  doc.text('Qty', 280, tableTop + 6);
  doc.text('Unit', 310, tableTop + 6);
  doc.text('Price', 350, tableTop + 6);
  doc.text('GST', 400, tableTop + 6);
  doc.text('Amount', 470, tableTop + 6);
  
  doc.fillColor('black');
  currentY = tableTop + 25;

  // Calculate totals
  let totalRunningFt = 0;
  let totalQuantity = 0;
  let totalGST = 0;
  let totalAmount = 0;
  let polishRunningFt = 0;
  let halfRoundRunningFt = 0;
  let bevelingRunningFt = 0;

  // Items
  if (quotation.items && quotation.items.length > 0) {
    quotation.items.forEach((item, index) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
        // Redraw headers on new page
        doc.rect(40, currentY, 515, 20)
           .fillColor('#374151')
           .fill()
           .fillColor('white');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('white');
        doc.text('#', 40, currentY + 6);
        doc.text('Item Name', 50, currentY + 6);
        doc.text('Length', 140, currentY + 6);
        doc.text('Height', 180, currentY + 6);
        doc.text('HSN/SAC', 220, currentY + 6);
        doc.text('Qty', 280, currentY + 6);
        doc.text('Unit', 310, currentY + 6);
        doc.text('Price', 350, currentY + 6);
        doc.text('GST', 400, currentY + 6);
        doc.text('Amount', 470, currentY + 6);
        doc.fillColor('black');
        currentY += 25;
      }

      const itemRunningFt = getRunningFt(item);
      totalRunningFt += itemRunningFt;
      const itemSubtotal = parseFloat(item.subtotal || 0);
      const itemAmount = itemSubtotal + itemRunningFt;
      const itemGSTAmount = quotation.billingType === 'GST' ? (itemAmount * (quotation.gstPercentage || 0) / 100) : 0;
      totalGST += itemGSTAmount;
      totalAmount += itemAmount;
      totalQuantity += parseFloat(item.quantity || 0);

      // Parse polish data
      const polishData = parsePolishData(item.description);
      
      // Calculate running ft breakdown
      if (polishData && polishData.polishSelection && polishData.selectedHeightTableValue && polishData.selectedWidthTableValue) {
        const heightUnit = item.heightUnit || 'FEET';
        const widthUnit = item.widthUnit || 'FEET';
        const heightInFeet = convertToFeet(parseFloat(polishData.selectedHeightTableValue) || 0, heightUnit);
        const widthInFeet = convertToFeet(parseFloat(polishData.selectedWidthTableValue) || 0, widthUnit);
        const quantity = parseFloat(item.quantity) || 1;

        const polishGroups = {
          'P': { sides: [], rate: polishData.polishRates?.P || 15 },
          'H': { sides: [], rate: polishData.polishRates?.H || 75 },
          'B': { sides: [], rate: polishData.polishRates?.B || 75 }
        };

        if (polishData.polishSelection && polishData.polishSelection.length >= 4) {
          if (polishData.polishSelection[0].checked && polishData.polishSelection[0].type) {
            const type = polishData.polishSelection[0].type;
            if (polishGroups[type]) polishGroups[type].sides.push(heightInFeet);
          }
          if (polishData.polishSelection[1].checked && polishData.polishSelection[1].type) {
            const type = polishData.polishSelection[1].type;
            if (polishGroups[type]) polishGroups[type].sides.push(widthInFeet);
          }
          if (polishData.polishSelection[2].checked && polishData.polishSelection[2].type) {
            const type = polishData.polishSelection[2].type;
            if (polishGroups[type]) polishGroups[type].sides.push(heightInFeet);
          }
          if (polishData.polishSelection[3].checked && polishData.polishSelection[3].type) {
            const type = polishData.polishSelection[3].type;
            if (polishGroups[type]) polishGroups[type].sides.push(widthInFeet);
          }
        }

        Object.keys(polishGroups).forEach(type => {
          const group = polishGroups[type];
          if (group.sides.length > 0) {
            const totalLengthInFeet = group.sides.reduce((sum, side) => sum + side, 0);
            const runningFtForType = totalLengthInFeet * group.rate * quantity;
            if (type === 'P') polishRunningFt += runningFtForType;
            else if (type === 'H') halfRoundRunningFt += runningFtForType;
            else if (type === 'B') bevelingRunningFt += runningFtForType;
          }
        });
      }

      // Build item description - make it more concise
      const itemDescription = buildItemDescription(item);
      
      // Determine unit (Sqf for area-based, Nos for others)
      const unit = 'Sqf'; // Default to square feet
      
      // Set font once for all columns
      doc.fontSize(8).font('Helvetica').fillColor('black');
      
      // Calculate item name height first
      const itemNameWidth = 85;
      const wrappedText = doc.heightOfString(itemDescription, { width: itemNameWidth, align: 'left' });
      const itemNameHeight = wrappedText > 12 ? wrappedText : 12;
      const rowHeight = Math.max(12, itemNameHeight + 2);
      
      // Calculate precise Y position
      const baseY = currentY + 8;
      
      // Define explicit column boundaries to prevent ANY text overflow
      // Each column has a fixed X position and maximum width
      const columns = {
        num: { x: 40, w: 10 },
        itemName: { x: 50, w: 85 },
        length: { x: 140, w: 35 },
        height: { x: 180, w: 35 },
        hsn: { x: 220, w: 55 },
        qty: { x: 280, w: 25 },
        unit: { x: 310, w: 35 },
        price: { x: 350, w: 45 },
        gst: { x: 400, w: 65 },
        amount: { x: 470, w: 85 }
      };
      
      // Format length and height with units
      // Safely access heightUnit and widthUnit with fallbacks
      const heightUnit = (item.heightUnit === 'INCH' ? '"' : item.heightUnit === 'MM' ? 'mm' : "'") || "'";
      const widthUnit = (item.widthUnit === 'INCH' ? '"' : item.widthUnit === 'MM' ? 'mm' : "'") || "'";
      const lengthText = item.width ? `${item.width}${widthUnit}` : '-';
      const heightText = item.height ? `${item.height}${heightUnit}` : '-';
      
      // FINAL FIX: Render item number in completely isolated graphics state
      // Save state, render item number, restore - this ensures complete isolation
      doc.save();
      doc.fontSize(8).font('Helvetica').fillColor('black');
      const itemNumText = String(index + 1);
      // Render with explicit coordinates and no options
      doc.text(itemNumText, columns.num.x, baseY);
      doc.restore();
      
      // Render item description (only column that needs width for wrapping)
      doc.text(itemDescription, columns.itemName.x, baseY, { width: columns.itemName.w, align: 'left' });
      
      // Render length and height columns
      doc.save();
      doc.text(lengthText, columns.length.x, baseY);
      doc.restore();
      
      doc.save();
      doc.text(heightText, columns.height.x, baseY);
      doc.restore();
      
      // Render all other columns - each in its own save/restore block for isolation
      doc.save();
      doc.text(item.hsnCode || '-', columns.hsn.x, baseY);
      doc.restore();
      
      doc.save();
      doc.text(String(item.quantity), columns.qty.x, baseY);
      doc.restore();
      
      doc.save();
      doc.text(unit, columns.unit.x, baseY);
      doc.restore();
      
      // Price columns - each in completely isolated save/restore blocks
      // This ensures the item number cannot interfere with price rendering
      doc.save();
      doc.text('₹' + parseFloat(item.ratePerSqft || 0).toFixed(2), columns.price.x, baseY);
      doc.restore();
      
      doc.save();
      doc.text('₹' + itemGSTAmount.toFixed(2), columns.gst.x, baseY);
      doc.restore();
      
      doc.save();
      doc.text('₹' + itemAmount.toFixed(2), columns.amount.x, baseY);
      doc.restore();
      
      // Move to next row
      currentY += rowHeight;
    });
  }

  // Total Row
  currentY += 5;
  doc.rect(40, currentY, 515, 20)
     .fillColor('#f3f4f6')
     .fill()
     .fillColor('black');
  
  doc.fontSize(8).font('Helvetica-Bold');
  const totalTextY = currentY + 14; // Match item row baseline
  doc.text('Total', 60, totalTextY);
  doc.text(totalQuantity.toFixed(1), 260, totalTextY);
  doc.text('₹' + totalGST.toFixed(2), 380, totalTextY);
  doc.text('₹' + totalAmount.toFixed(2), 450, totalTextY);
  currentY += 30;

  // Amount in Words
  let calculatedGrandTotal = parseFloat(quotation.subtotal || 0);
  calculatedGrandTotal += totalRunningFt;
  calculatedGrandTotal += parseFloat(quotation.installationCharge || 0);
  calculatedGrandTotal += parseFloat(quotation.transportCharge || 0);
  calculatedGrandTotal -= parseFloat(quotation.discount || 0);
  calculatedGrandTotal += parseFloat(quotation.gstAmount || 0);

  currentY += 10;
  doc.fontSize(10).font('Helvetica-Bold').text('Quotation Order Amount In Words:', 40, currentY);
  currentY += 12;
  doc.fontSize(10).font('Helvetica').text(numberToWords(calculatedGrandTotal), 40, currentY);
  currentY += 20;

  // Amounts Summary
  doc.fontSize(10).font('Helvetica');
  const subtotalAmount = parseFloat(quotation.subtotal || 0) + totalRunningFt + 
                         parseFloat(quotation.installationCharge || 0) + 
                         parseFloat(quotation.transportCharge || 0) - 
                         parseFloat(quotation.discount || 0);
  doc.text(`Sub Total: ₹${subtotalAmount.toFixed(2)}`, 350, currentY, { align: 'right' });
  currentY += 15;
  doc.text(`Total: ₹${calculatedGrandTotal.toFixed(2)}`, 350, currentY, { align: 'right' });
  currentY += 25;

  // Tax Breakdown Table (if GST)
  if (quotation.billingType === 'GST' && quotation.gstAmount && quotation.gstAmount > 0) {
    const taxTableY = currentY;
    doc.rect(40, taxTableY, 515, 60).stroke();
    
    // Header
    doc.rect(40, taxTableY, 515, 20)
       .fillColor('#374151')
       .fill()
       .fillColor('white');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('white');
    doc.text('Tax type', 50, taxTableY + 6);
    doc.text('Taxable amount', 200, taxTableY + 6);
    doc.text('Rate', 380, taxTableY + 6);
    doc.text('Tax amount', 450, taxTableY + 6);
    
    doc.fillColor('black');
    const taxTableContentY = taxTableY + 25;
    
    if (quotation.cgst && quotation.sgst) {
      const taxableAmount = subtotalAmount;
      doc.fontSize(9).font('Helvetica');
      doc.text('SGST', 50, taxTableContentY);
      doc.text('₹' + taxableAmount.toFixed(2), 200, taxTableContentY);
      doc.text(`${(quotation.gstPercentage || 0) / 2}%`, 380, taxTableContentY);
      doc.text('₹' + parseFloat(quotation.sgst || 0).toFixed(2), 450, taxTableContentY);
      
      doc.text('CGST', 50, taxTableContentY + 15);
      doc.text('₹' + taxableAmount.toFixed(2), 200, taxTableContentY + 15);
      doc.text(`${(quotation.gstPercentage || 0) / 2}%`, 380, taxTableContentY + 15);
      doc.text('₹' + parseFloat(quotation.cgst || 0).toFixed(2), 450, taxTableContentY + 15);
    } else if (quotation.igst) {
      const taxableAmount = subtotalAmount;
      doc.fontSize(9).font('Helvetica');
      doc.text('IGST', 50, taxTableContentY);
      doc.text('₹' + taxableAmount.toFixed(2), 200, taxTableContentY);
      doc.text(`${quotation.gstPercentage || 0}%`, 380, taxTableContentY);
      doc.text('₹' + parseFloat(quotation.igst || 0).toFixed(2), 450, taxTableContentY);
    }
    
    currentY = taxTableY + 70;
  }

  // Terms and Conditions
  currentY += 10;
  doc.fontSize(10).font('Helvetica-Bold').text('Terms and conditions:', 40, currentY);
  currentY += 15;
  doc.fontSize(9).font('Helvetica');
  const terms = [
    '*18% GST Extra.',
    '*85% Advance after approval of quotation.',
    '*Work will be get started after receiving of advance.',
    '*Immediate or within 8 days balance payment should be released as per discussion if not 24% per annum interest will be charged on balance amount.',
    '*For any extra work extra charges will applied.',
    '*Side should be free from all obstacles.',
    '*Electricity, ladder, stool, scaffolding, water etc will be provided by client side.',
    '*Chargeable size will consider in 12" or 6" or subject to optimisation of material.',
    '*Extra charges for old material work.',
    '*No retention amount, debit charges, or return/exchange policy.',
    '*Accommodation and transportation charges for labor are extra.',
    '*Commitment to best services, customer satisfaction, and improvement.',
    '*Thank you for doing business with us. Visit again!'
  ];
  
  terms.forEach(term => {
    if (currentY > 750) {
      doc.addPage();
      currentY = 50;
    }
    // Calculate actual height of wrapped text
    const textHeight = doc.heightOfString(term, { width: 515 });
    doc.text(term, 40, currentY, { width: 515 });
    // Move to next line with proper spacing (text height + 3px gap)
    currentY += textHeight + 3;
  });

  // Signature
  currentY += 20;
  doc.fontSize(10).font('Helvetica');
  doc.text('For: ' + (quotation.shop?.shopName || ''), 40, currentY);
  currentY += 30;
  doc.text('Authorized Signatory', 450, currentY);

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

  let currentY = 50;

  // Title - Centered
  const title = invoice.billingType === 'GST' ? 'TAX INVOICE' : 'BILL / CASH MEMO';
  doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
  currentY = 80;

  // Shop Details
  if (invoice.shop) {
    doc.fontSize(12).font('Helvetica-Bold').text(invoice.shop.shopName || '', 40, currentY);
    currentY += 15;
    // Address and phone - only show if fields exist (columns may not exist in database yet)
    if (invoice.shop && invoice.shop.address) {
      doc.fontSize(10).font('Helvetica').text(invoice.shop.address, 40, currentY);
      currentY += 12;
    }
    if (invoice.shop && invoice.shop.phone) {
      doc.fontSize(10).font('Helvetica').text(`Phone no.: ${invoice.shop.phone}`, 40, currentY);
      currentY += 12;
    }
    if (invoice.shop.email) {
      doc.fontSize(10).font('Helvetica').text(`Email: ${invoice.shop.email}`, 40, currentY);
      currentY += 12;
    }
    // GST number - check if field exists
    if (invoice.shop && invoice.shop.gstNumber) {
      doc.fontSize(10).font('Helvetica').text(`GST No.: ${invoice.shop.gstNumber}`, 40, currentY);
      currentY += 12;
    } else if (invoice.shop && invoice.shop.gst_number) {
      // Fallback for snake_case
      doc.fontSize(10).font('Helvetica').text(`GST No.: ${invoice.shop.gst_number}`, 40, currentY);
      currentY += 12;
    }
  }
  currentY += 10;

  // Document Details Box (bordered)
  const detailsBoxY = currentY;
  doc.rect(40, detailsBoxY, 515, 60).stroke();
  doc.fontSize(10).font('Helvetica-Bold').text('Invoice No.:', 50, detailsBoxY + 10);
  doc.fontSize(10).font('Helvetica').text(invoice.invoiceNumber || '', 150, detailsBoxY + 10);
  doc.fontSize(10).font('Helvetica-Bold').text('Date:', 50, detailsBoxY + 25);
  doc.fontSize(10).font('Helvetica').text(formatDate(invoice.invoiceDate), 150, detailsBoxY + 25);
  doc.fontSize(10).font('Helvetica-Bold').text('Place of Supply:', 50, detailsBoxY + 40);
  doc.fontSize(10).font('Helvetica').text(invoice.customerState || 'N/A', 150, detailsBoxY + 40);
  currentY = detailsBoxY + 70;

  // Customer Section
  doc.fontSize(12).font('Helvetica-Bold').text('Invoice For:', 40, currentY);
  currentY += 15;
  doc.fontSize(10).font('Helvetica').text(invoice.customerName || '', 40, currentY);
  currentY += 12;
  if (invoice.customerMobile) {
    doc.fontSize(10).font('Helvetica').text(`Contact No.: ${invoice.customerMobile}`, 40, currentY);
    currentY += 12;
  }
  if (invoice.customerAddress) {
    doc.fontSize(10).font('Helvetica').text(invoice.customerAddress, 40, currentY, { width: 250 });
    currentY += 20;
  }
  // Shipping Address
  if (invoice.shippingAddress) {
    currentY += 5;
    doc.fontSize(10).font('Helvetica-Bold').text('Shipping Address:', 40, currentY);
    currentY += 12;
    doc.fontSize(10).font('Helvetica').text(invoice.shippingAddress, 40, currentY, { width: 250 });
    currentY += 20;
  }
  currentY += 10;

  // Items Table Header - Adjusted column positions to fit within page
  const tableTop = currentY;
  doc.rect(40, tableTop, 515, 20)
     .fillColor('#374151')
     .fill()
     .fillColor('white');
  
  doc.fontSize(8).font('Helvetica-Bold').fillColor('white');
  doc.text('#', 40, tableTop + 6);
  doc.text('Item Name', 50, tableTop + 6);
  doc.text('Length', 140, tableTop + 6);
  doc.text('Height', 180, tableTop + 6);
  doc.text('HSN/SAC', 220, tableTop + 6);
  doc.text('Qty', 280, tableTop + 6);
  doc.text('Unit', 310, tableTop + 6);
  doc.text('Price', 350, tableTop + 6);
  doc.text('GST', 400, tableTop + 6);
  doc.text('Amount', 470, tableTop + 6);
  
  doc.fillColor('black');
  currentY = tableTop + 25;

  // Calculate totals
  let totalRunningFt = 0;
  let totalQuantity = 0;
  let totalGST = 0;
  let totalAmount = 0;

  // Items
  if (invoice.items && invoice.items.length > 0) {
    invoice.items.forEach((item, index) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
        // Redraw headers
        doc.rect(40, currentY, 515, 20)
           .fillColor('#374151')
           .fill()
           .fillColor('white');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('white');
        doc.text('#', 40, currentY + 6);
        doc.text('Item Name', 50, currentY + 6);
        doc.text('Length', 140, currentY + 6);
        doc.text('Height', 180, currentY + 6);
        doc.text('HSN/SAC', 220, currentY + 6);
        doc.text('Qty', 280, currentY + 6);
        doc.text('Unit', 310, currentY + 6);
        doc.text('Price', 350, currentY + 6);
        doc.text('GST', 400, currentY + 6);
        doc.text('Amount', 470, currentY + 6);
        doc.fillColor('black');
        currentY += 25;
      }

      const itemRunningFt = getRunningFt(item);
      totalRunningFt += itemRunningFt;
      const itemSubtotal = parseFloat(item.subtotal || 0);
      const itemAmount = itemSubtotal + itemRunningFt;
      const itemGSTAmount = invoice.billingType === 'GST' ? (itemAmount * (invoice.gstPercentage || 0) / 100) : 0;
      totalGST += itemGSTAmount;
      totalAmount += itemAmount;
      totalQuantity += parseFloat(item.quantity || 0);

      // Build item description
      const itemDescription = buildItemDescription(item);
      const unit = 'Sqf';
      
      // Set font once for all columns
      doc.fontSize(8).font('Helvetica').fillColor('black');
      
      // Calculate item name height first
      const itemNameWidth = 85;
      const wrappedText = doc.heightOfString(itemDescription, { width: itemNameWidth, align: 'left' });
      const itemNameHeight = wrappedText > 12 ? wrappedText : 12;
      const rowHeight = Math.max(12, itemNameHeight + 2);
      
      // Calculate precise Y position
      const baseY = currentY + 8;
      
      // Define explicit column boundaries to prevent ANY text overflow
      // Each column has a fixed X position and maximum width
      const columns = {
        num: { x: 40, w: 10 },
        itemName: { x: 50, w: 85 },
        length: { x: 140, w: 35 },
        height: { x: 180, w: 35 },
        hsn: { x: 220, w: 55 },
        qty: { x: 280, w: 25 },
        unit: { x: 310, w: 35 },
        price: { x: 350, w: 45 },
        gst: { x: 400, w: 65 },
        amount: { x: 470, w: 85 }
      };
      
      // Format length and height with units
      // Safely access heightUnit and widthUnit with fallbacks
      const heightUnit = (item.heightUnit === 'INCH' ? '"' : item.heightUnit === 'MM' ? 'mm' : "'") || "'";
      const widthUnit = (item.widthUnit === 'INCH' ? '"' : item.widthUnit === 'MM' ? 'mm' : "'") || "'";
      const lengthText = item.width ? `${item.width}${widthUnit}` : '-';
      const heightText = item.height ? `${item.height}${heightUnit}` : '-';
      
      // FINAL FIX: Render item number in completely isolated graphics state
      // Save state, render item number, restore - this ensures complete isolation
      doc.save();
      doc.fontSize(8).font('Helvetica').fillColor('black');
      const itemNumText = String(index + 1);
      // Render with explicit coordinates and no options
      doc.text(itemNumText, columns.num.x, baseY);
      doc.restore();
      
      // Render item description (only column that needs width for wrapping)
      doc.text(itemDescription, columns.itemName.x, baseY, { width: columns.itemName.w, align: 'left' });
      
      // Render length and height columns
      doc.save();
      doc.text(lengthText, columns.length.x, baseY);
      doc.restore();
      
      doc.save();
      doc.text(heightText, columns.height.x, baseY);
      doc.restore();
      
      // Render all other columns - each in its own save/restore block for isolation
      doc.save();
      doc.text(item.hsnCode || '-', columns.hsn.x, baseY);
      doc.restore();
      
      doc.save();
      doc.text(String(item.quantity), columns.qty.x, baseY);
      doc.restore();
      
      doc.save();
      doc.text(unit, columns.unit.x, baseY);
      doc.restore();
      
      // Price columns - each in completely isolated save/restore blocks
      // This ensures the item number cannot interfere with price rendering
      doc.save();
      doc.text('₹' + parseFloat(item.ratePerSqft || 0).toFixed(2), columns.price.x, baseY);
      doc.restore();
      
      doc.save();
      doc.text('₹' + itemGSTAmount.toFixed(2), columns.gst.x, baseY);
      doc.restore();
      
      doc.save();
      doc.text('₹' + itemAmount.toFixed(2), columns.amount.x, baseY);
      doc.restore();
      
      // Move to next row
      currentY += rowHeight;
    });
  }

  // Total Row
  currentY += 5;
  doc.rect(40, currentY, 515, 20)
     .fillColor('#f3f4f6')
     .fill()
     .fillColor('black');
  
  doc.fontSize(8).font('Helvetica-Bold');
  const totalTextY = currentY + 14; // Match item row baseline
  doc.text('Total', 60, totalTextY);
  doc.text(totalQuantity.toFixed(1), 260, totalTextY);
  doc.text('₹' + totalGST.toFixed(2), 380, totalTextY);
  doc.text('₹' + totalAmount.toFixed(2), 450, totalTextY);
  currentY += 30;

  // Amount in Words
  let calculatedGrandTotal = parseFloat(invoice.subtotal || 0) + totalRunningFt + 
                             parseFloat(invoice.installationCharge || 0) + 
                             parseFloat(invoice.transportCharge || 0) - 
                             parseFloat(invoice.discount || 0) + 
                             parseFloat(invoice.gstAmount || 0);

  doc.fontSize(10).font('Helvetica-Bold').text('Invoice Order Amount In Words:', 40, currentY);
  currentY += 12;
  doc.fontSize(10).font('Helvetica').text(numberToWords(calculatedGrandTotal), 40, currentY);
  currentY += 20;

  // Amounts Summary
  doc.fontSize(10).font('Helvetica');
  const subtotalAmount = parseFloat(invoice.subtotal || 0) + totalRunningFt + 
                         parseFloat(invoice.installationCharge || 0) + 
                         parseFloat(invoice.transportCharge || 0) - 
                         parseFloat(invoice.discount || 0);
  doc.text(`Sub Total: ₹${subtotalAmount.toFixed(2)}`, 350, currentY, { align: 'right' });
  currentY += 15;
  doc.text(`Total: ₹${calculatedGrandTotal.toFixed(2)}`, 350, currentY, { align: 'right' });
  currentY += 25;

  // Tax Breakdown Table (if GST)
  if (invoice.billingType === 'GST' && invoice.gstAmount && invoice.gstAmount > 0) {
    const taxTableY = currentY;
    doc.rect(40, taxTableY, 515, 60).stroke();
    
    // Header
    doc.rect(40, taxTableY, 515, 20)
       .fillColor('#374151')
       .fill()
       .fillColor('white');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('white');
    doc.text('Tax type', 50, taxTableY + 6);
    doc.text('Taxable amount', 200, taxTableY + 6);
    doc.text('Rate', 380, taxTableY + 6);
    doc.text('Tax amount', 450, taxTableY + 6);
    
    doc.fillColor('black');
    const taxTableContentY = taxTableY + 25;
    
    if (invoice.cgst && invoice.sgst) {
      const taxableAmount = subtotalAmount;
      doc.fontSize(9).font('Helvetica');
      doc.text('SGST', 50, taxTableContentY);
      doc.text('₹' + taxableAmount.toFixed(2), 200, taxTableContentY);
      doc.text(`${(invoice.gstPercentage || 0) / 2}%`, 380, taxTableContentY);
      doc.text('₹' + parseFloat(invoice.sgst || 0).toFixed(2), 450, taxTableContentY);
      
      doc.text('CGST', 50, taxTableContentY + 15);
      doc.text('₹' + taxableAmount.toFixed(2), 200, taxTableContentY + 15);
      doc.text(`${(invoice.gstPercentage || 0) / 2}%`, 380, taxTableContentY + 15);
      doc.text('₹' + parseFloat(invoice.cgst || 0).toFixed(2), 450, taxTableContentY + 15);
    } else if (invoice.igst) {
      const taxableAmount = subtotalAmount;
      doc.fontSize(9).font('Helvetica');
      doc.text('IGST', 50, taxTableContentY);
      doc.text('₹' + taxableAmount.toFixed(2), 200, taxTableContentY);
      doc.text(`${invoice.gstPercentage || 0}%`, 380, taxTableContentY);
      doc.text('₹' + parseFloat(invoice.igst || 0).toFixed(2), 450, taxTableContentY);
    }
    
    currentY = taxTableY + 70;
  }

  // Terms and Conditions
  currentY += 10;
  doc.fontSize(10).font('Helvetica-Bold').text('Terms and conditions:', 40, currentY);
  currentY += 15;
  doc.fontSize(9).font('Helvetica');
  const terms = [
    '*18% GST Extra.',
    '*85% Advance after approval of quotation.',
    '*Work will be get started after receiving of advance.',
    '*Immediate or within 8 days balance payment should be released as per discussion if not 24% per annum interest will be charged on balance amount.',
    '*For any extra work extra charges will applied.',
    '*Side should be free from all obstacles.',
    '*Electricity, ladder, stool, scaffolding, water etc will be provided by client side.',
    '*Chargeable size will consider in 12" or 6" or subject to optimisation of material.',
    '*Extra charges for old material work.',
    '*No retention amount, debit charges, or return/exchange policy.',
    '*Accommodation and transportation charges for labor are extra.',
    '*Commitment to best services, customer satisfaction, and improvement.',
    '*Thank you for doing business with us. Visit again!'
  ];
  
  terms.forEach(term => {
    if (currentY > 750) {
      doc.addPage();
      currentY = 50;
    }
    // Calculate actual height of wrapped text
    const textHeight = doc.heightOfString(term, { width: 515 });
    doc.text(term, 40, currentY, { width: 515 });
    // Move to next line with proper spacing (text height + 3px gap)
    currentY += textHeight + 3;
  });

  // Signature
  currentY += 20;
  doc.fontSize(10).font('Helvetica');
  doc.text('For: ' + (invoice.shop?.shopName || ''), 40, currentY);
  currentY += 30;
  doc.text('Authorized Signatory', 450, currentY);

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
 * Generate PDF for Estimate (without shop details)
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

  let currentY = 50;

  // Title - Centered (NO SHOP DETAILS)
  doc.fontSize(20).font('Helvetica-Bold').text('ESTIMATE', { align: 'center' });
  currentY = 80;

  // Document Details Box (bordered) - NO SHOP DETAILS
  const detailsBoxY = currentY;
  doc.rect(40, detailsBoxY, 515, 60).stroke();
  doc.fontSize(10).font('Helvetica-Bold').text('Estimate No.:', 50, detailsBoxY + 10);
  doc.fontSize(10).font('Helvetica').text(invoice.invoiceNumber || '', 150, detailsBoxY + 10);
  doc.fontSize(10).font('Helvetica-Bold').text('Date:', 50, detailsBoxY + 25);
  doc.fontSize(10).font('Helvetica').text(formatDate(invoice.invoiceDate), 150, detailsBoxY + 25);
  doc.fontSize(10).font('Helvetica-Bold').text('Place of Supply:', 50, detailsBoxY + 40);
  doc.fontSize(10).font('Helvetica').text(invoice.customerState || 'N/A', 150, detailsBoxY + 40);
  currentY = detailsBoxY + 70;

  // Customer Section
  doc.fontSize(12).font('Helvetica-Bold').text('Estimate For:', 40, currentY);
  currentY += 15;
  doc.fontSize(10).font('Helvetica').text(invoice.customerName || '', 40, currentY);
  currentY += 12;
  if (invoice.customerMobile) {
    doc.fontSize(10).font('Helvetica').text(`Contact No.: ${invoice.customerMobile}`, 40, currentY);
    currentY += 12;
  }
  if (invoice.customerAddress) {
    doc.fontSize(10).font('Helvetica').text(invoice.customerAddress, 40, currentY, { width: 250 });
    currentY += 20;
  }
  // Shipping Address
  if (invoice.shippingAddress) {
    currentY += 5;
    doc.fontSize(10).font('Helvetica-Bold').text('Shipping Address:', 40, currentY);
    currentY += 12;
    doc.fontSize(10).font('Helvetica').text(invoice.shippingAddress, 40, currentY, { width: 250 });
    currentY += 20;
  }
  currentY += 10;

  // Items Table Header - Adjusted column positions to fit within page
  const tableTop = currentY;
  doc.rect(40, tableTop, 515, 20)
     .fillColor('#374151')
     .fill()
     .fillColor('white');
  
  doc.fontSize(8).font('Helvetica-Bold').fillColor('white');
  doc.text('#', 40, tableTop + 6);
  doc.text('Item Name', 50, tableTop + 6);
  doc.text('Length', 140, tableTop + 6);
  doc.text('Height', 180, tableTop + 6);
  doc.text('HSN/SAC', 220, tableTop + 6);
  doc.text('Qty', 280, tableTop + 6);
  doc.text('Unit', 310, tableTop + 6);
  doc.text('Price', 350, tableTop + 6);
  doc.text('GST', 400, tableTop + 6);
  doc.text('Amount', 470, tableTop + 6);
  
  doc.fillColor('black');
  currentY = tableTop + 25;

  // Calculate totals
  let totalRunningFt = 0;
  let totalQuantity = 0;
  let totalGST = 0;
  let totalAmount = 0;

  // Items
  if (invoice.items && invoice.items.length > 0) {
    invoice.items.forEach((item, index) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
        // Redraw headers
        doc.rect(40, currentY, 515, 20)
           .fillColor('#374151')
           .fill()
           .fillColor('white');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('white');
        doc.text('#', 40, currentY + 6);
        doc.text('Item Name', 50, currentY + 6);
        doc.text('Length', 140, currentY + 6);
        doc.text('Height', 180, currentY + 6);
        doc.text('HSN/SAC', 220, currentY + 6);
        doc.text('Qty', 280, currentY + 6);
        doc.text('Unit', 310, currentY + 6);
        doc.text('Price', 350, currentY + 6);
        doc.text('GST', 400, currentY + 6);
        doc.text('Amount', 470, currentY + 6);
        doc.fillColor('black');
        currentY += 25;
      }

      const itemRunningFt = getRunningFt(item);
      totalRunningFt += itemRunningFt;
      const itemSubtotal = parseFloat(item.subtotal || 0);
      const itemAmount = itemSubtotal + itemRunningFt;
      const itemGSTAmount = invoice.billingType === 'GST' ? (itemAmount * (invoice.gstPercentage || 0) / 100) : 0;
      totalGST += itemGSTAmount;
      totalAmount += itemAmount;
      totalQuantity += parseFloat(item.quantity || 0);

      // Build item description
      const itemDescription = buildItemDescription(item);
      const unit = 'Sqf';
      
      // Set font once for all columns
      doc.fontSize(8).font('Helvetica').fillColor('black');
      
      // Calculate item name height first
      const itemNameWidth = 85;
      const wrappedText = doc.heightOfString(itemDescription, { width: itemNameWidth, align: 'left' });
      const itemNameHeight = wrappedText > 12 ? wrappedText : 12;
      const rowHeight = Math.max(12, itemNameHeight + 2);
      
      // Calculate precise Y position
      const baseY = currentY + 8;
      
      // Define explicit column boundaries to prevent ANY text overflow
      // Each column has a fixed X position and maximum width
      const columns = {
        num: { x: 40, w: 10 },
        itemName: { x: 50, w: 85 },
        length: { x: 140, w: 35 },
        height: { x: 180, w: 35 },
        hsn: { x: 220, w: 55 },
        qty: { x: 280, w: 25 },
        unit: { x: 310, w: 35 },
        price: { x: 350, w: 45 },
        gst: { x: 400, w: 65 },
        amount: { x: 470, w: 85 }
      };
      
      // Format length and height with units
      // Safely access heightUnit and widthUnit with fallbacks
      const heightUnit = (item.heightUnit === 'INCH' ? '"' : item.heightUnit === 'MM' ? 'mm' : "'") || "'";
      const widthUnit = (item.widthUnit === 'INCH' ? '"' : item.widthUnit === 'MM' ? 'mm' : "'") || "'";
      const lengthText = item.width ? `${item.width}${widthUnit}` : '-';
      const heightText = item.height ? `${item.height}${heightUnit}` : '-';
      
      // FINAL FIX: Render item number in completely isolated graphics state
      // Save state, render item number, restore - this ensures complete isolation
      doc.save();
      doc.fontSize(8).font('Helvetica').fillColor('black');
      const itemNumText = String(index + 1);
      // Render with explicit coordinates and no options
      doc.text(itemNumText, columns.num.x, baseY);
      doc.restore();
      
      // Render item description (only column that needs width for wrapping)
      doc.text(itemDescription, columns.itemName.x, baseY, { width: columns.itemName.w, align: 'left' });
      
      // Render length and height columns
      doc.save();
      doc.text(lengthText, columns.length.x, baseY);
      doc.restore();
      
      doc.save();
      doc.text(heightText, columns.height.x, baseY);
      doc.restore();
      
      // Render all other columns - each in its own save/restore block for isolation
      doc.save();
      doc.text(item.hsnCode || '-', columns.hsn.x, baseY);
      doc.restore();
      
      doc.save();
      doc.text(String(item.quantity), columns.qty.x, baseY);
      doc.restore();
      
      doc.save();
      doc.text(unit, columns.unit.x, baseY);
      doc.restore();
      
      // Price columns - each in completely isolated save/restore blocks
      // This ensures the item number cannot interfere with price rendering
      doc.save();
      doc.text('₹' + parseFloat(item.ratePerSqft || 0).toFixed(2), columns.price.x, baseY);
      doc.restore();
      
      doc.save();
      doc.text('₹' + itemGSTAmount.toFixed(2), columns.gst.x, baseY);
      doc.restore();
      
      doc.save();
      doc.text('₹' + itemAmount.toFixed(2), columns.amount.x, baseY);
      doc.restore();
      
      // Move to next row
      currentY += rowHeight;
    });
  }

  // Total Row
  currentY += 5;
  doc.rect(40, currentY, 515, 20)
     .fillColor('#f3f4f6')
     .fill()
     .fillColor('black');
  
  doc.fontSize(8).font('Helvetica-Bold');
  const totalTextY = currentY + 14; // Match item row baseline
  doc.text('Total', 60, totalTextY);
  doc.text(totalQuantity.toFixed(1), 260, totalTextY);
  doc.text('₹' + totalGST.toFixed(2), 380, totalTextY);
  doc.text('₹' + totalAmount.toFixed(2), 450, totalTextY);
  currentY += 30;

  // Amount in Words
  let calculatedGrandTotal = parseFloat(invoice.subtotal || 0) + totalRunningFt + 
                             parseFloat(invoice.installationCharge || 0) + 
                             parseFloat(invoice.transportCharge || 0) - 
                             parseFloat(invoice.discount || 0) + 
                             parseFloat(invoice.gstAmount || 0);

  doc.fontSize(10).font('Helvetica-Bold').text('Estimate Order Amount In Words:', 40, currentY);
  currentY += 12;
  doc.fontSize(10).font('Helvetica').text(numberToWords(calculatedGrandTotal), 40, currentY);
  currentY += 20;

  // Amounts Summary
  doc.fontSize(10).font('Helvetica');
  const subtotalAmount = parseFloat(invoice.subtotal || 0) + totalRunningFt + 
                         parseFloat(invoice.installationCharge || 0) + 
                         parseFloat(invoice.transportCharge || 0) - 
                         parseFloat(invoice.discount || 0);
  doc.text(`Sub Total: ₹${subtotalAmount.toFixed(2)}`, 350, currentY, { align: 'right' });
  currentY += 15;
  doc.text(`Total: ₹${calculatedGrandTotal.toFixed(2)}`, 350, currentY, { align: 'right' });
  currentY += 25;

  // Tax Breakdown Table (if GST)
  if (invoice.billingType === 'GST' && invoice.gstAmount && invoice.gstAmount > 0) {
    const taxTableY = currentY;
    doc.rect(40, taxTableY, 515, 60).stroke();
    
    // Header
    doc.rect(40, taxTableY, 515, 20)
       .fillColor('#374151')
       .fill()
       .fillColor('white');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('white');
    doc.text('Tax type', 50, taxTableY + 6);
    doc.text('Taxable amount', 200, taxTableY + 6);
    doc.text('Rate', 380, taxTableY + 6);
    doc.text('Tax amount', 450, taxTableY + 6);
    
    doc.fillColor('black');
    const taxTableContentY = taxTableY + 25;
    
    if (invoice.cgst && invoice.sgst) {
      const taxableAmount = subtotalAmount;
      doc.fontSize(9).font('Helvetica');
      doc.text('SGST', 50, taxTableContentY);
      doc.text('₹' + taxableAmount.toFixed(2), 200, taxTableContentY);
      doc.text(`${(invoice.gstPercentage || 0) / 2}%`, 380, taxTableContentY);
      doc.text('₹' + parseFloat(invoice.sgst || 0).toFixed(2), 450, taxTableContentY);
      
      doc.text('CGST', 50, taxTableContentY + 15);
      doc.text('₹' + taxableAmount.toFixed(2), 200, taxTableContentY + 15);
      doc.text(`${(invoice.gstPercentage || 0) / 2}%`, 380, taxTableContentY + 15);
      doc.text('₹' + parseFloat(invoice.cgst || 0).toFixed(2), 450, taxTableContentY + 15);
    } else if (invoice.igst) {
      const taxableAmount = subtotalAmount;
      doc.fontSize(9).font('Helvetica');
      doc.text('IGST', 50, taxTableContentY);
      doc.text('₹' + taxableAmount.toFixed(2), 200, taxTableContentY);
      doc.text(`${invoice.gstPercentage || 0}%`, 380, taxTableContentY);
      doc.text('₹' + parseFloat(invoice.igst || 0).toFixed(2), 450, taxTableContentY);
    }
    
    currentY = taxTableY + 70;
  }

  // Terms and Conditions
  currentY += 10;
  doc.fontSize(10).font('Helvetica-Bold').text('Terms and conditions:', 40, currentY);
  currentY += 15;
  doc.fontSize(9).font('Helvetica');
  const terms = [
    '*18% GST Extra.',
    '*85% Advance after approval of quotation.',
    '*Work will be get started after receiving of advance.',
    '*Immediate or within 8 days balance payment should be released as per discussion if not 24% per annum interest will be charged on balance amount.',
    '*For any extra work extra charges will applied.',
    '*Side should be free from all obstacles.',
    '*Electricity, ladder, stool, scaffolding, water etc will be provided by client side.',
    '*Chargeable size will consider in 12" or 6" or subject to optimisation of material.',
    '*Extra charges for old material work.',
    '*No retention amount, debit charges, or return/exchange policy.',
    '*Accommodation and transportation charges for labor are extra.',
    '*Commitment to best services, customer satisfaction, and improvement.',
    '*Thank you for doing business with us. Visit again!'
  ];
  
  terms.forEach(term => {
    if (currentY > 750) {
      doc.addPage();
      currentY = 50;
    }
    // Calculate actual height of wrapped text
    const textHeight = doc.heightOfString(term, { width: 515 });
    doc.text(term, 40, currentY, { width: 515 });
    // Move to next line with proper spacing (text height + 3px gap)
    currentY += textHeight + 3;
  });

  // Signature (NO SHOP NAME)
  currentY += 20;
  doc.fontSize(10).font('Helvetica');
  doc.text('For: [Company Name]', 40, currentY);
  currentY += 30;
  doc.text('Authorized Signatory', 450, currentY);

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
  // Shipping Address
  if (invoice.shippingAddress) {
    y += 5;
    doc.fontSize(9).font('Helvetica-Bold').text('Shipping Address:', 30, y + 36);
    y += 12;
    doc.fontSize(9).font('Helvetica').text(invoice.shippingAddress, 30, y + 36, { width: 250 });
    y += 20;
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
