import PDFDocument from 'pdfkit';

export interface InvoiceData {
  invoiceNumber: string;
  gymName: string;
  gymAddress?: string;
  gymPhone?: string;
  gymEmail?: string;
  gymLogoUrl?: string;
  memberName: string;
  memberEmail: string;
  memberPhone?: string;
  memberAddress?: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date | null;
  status: string;
  createdAt: Date;
  description?: string;
}

const COLORS = {
  primary: '#f97316',
  text: '#1f2937',
  muted: '#6b7280',
  border: '#e5e7eb',
  lightBg: '#f9fafb',
  success: '#22c55e',
  successBg: '#dcfce7',
  warning: '#f97316',
  error: '#ef4444',
};

const LAYOUT = {
  pageWidth: 595.28,
  pageHeight: 841.89,
  margin: 50,
  contentWidth: 495.28,
  leftCol: 50,
  rightCol: 350,
  lineSpacing: 4,
  sectionGap: 25,
  footerZone: 120,
  leftColWidth: 250,
  rightColWidth: 195,
};

export function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: LAYOUT.margin, 
        size: 'A4',
        bufferPages: true,
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let currentY = LAYOUT.margin;
      const maxContentY = LAYOUT.pageHeight - LAYOUT.footerZone;

      currentY = drawHeader(doc, data, currentY);
      currentY = checkPageOverflow(doc, currentY, 50, maxContentY);
      
      currentY = drawDivider(doc, currentY + 15);
      currentY = checkPageOverflow(doc, currentY, 100, maxContentY);
      
      currentY = drawBillToSection(doc, data, currentY + 20);
      currentY = checkPageOverflow(doc, currentY, 100, maxContentY);
      
      currentY = drawInvoiceTable(doc, data, currentY + LAYOUT.sectionGap);
      currentY = checkPageOverflow(doc, currentY, 100, maxContentY);
      
      currentY = drawTotalsSection(doc, data, currentY);
      
      if (data.status === 'paid' && data.paidDate) {
        currentY = checkPageOverflow(doc, currentY, 60, maxContentY);
        currentY = drawPaidBadge(doc, data, currentY + 20);
      }

      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        drawFooter(doc, data, i + 1, pageCount);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function checkPageOverflow(doc: PDFKit.PDFDocument, currentY: number, requiredSpace: number, maxY: number): number {
  if (currentY + requiredSpace > maxY) {
    doc.addPage();
    return LAYOUT.margin;
  }
  return currentY;
}

function getTextHeight(doc: PDFKit.PDFDocument, text: string, width: number, fontSize: number): number {
  doc.fontSize(fontSize);
  return doc.heightOfString(text, { width });
}

function drawHeader(doc: PDFKit.PDFDocument, data: InvoiceData, startY: number): number {
  let leftY = startY;
  let rightY = startY;

  doc.fontSize(22).fillColor(COLORS.primary);
  const gymNameHeight = getTextHeight(doc, data.gymName, LAYOUT.leftColWidth, 22);
  doc.text(data.gymName, LAYOUT.leftCol, leftY, { width: LAYOUT.leftColWidth });
  leftY += gymNameHeight + 8;

  doc.fontSize(9).fillColor(COLORS.muted);
  
  if (data.gymAddress) {
    const addressHeight = getTextHeight(doc, data.gymAddress, LAYOUT.leftColWidth, 9);
    doc.text(data.gymAddress, LAYOUT.leftCol, leftY, { width: LAYOUT.leftColWidth });
    leftY += addressHeight + LAYOUT.lineSpacing;
  }
  
  if (data.gymPhone) {
    const phoneText = `Phone: ${data.gymPhone}`;
    const phoneHeight = getTextHeight(doc, phoneText, LAYOUT.leftColWidth, 9);
    doc.text(phoneText, LAYOUT.leftCol, leftY, { width: LAYOUT.leftColWidth });
    leftY += phoneHeight + LAYOUT.lineSpacing;
  }
  
  if (data.gymEmail) {
    const emailText = `Email: ${data.gymEmail}`;
    const emailHeight = getTextHeight(doc, emailText, LAYOUT.leftColWidth, 9);
    doc.text(emailText, LAYOUT.leftCol, leftY, { width: LAYOUT.leftColWidth });
    leftY += emailHeight + LAYOUT.lineSpacing;
  }

  doc.fontSize(32).fillColor(COLORS.text);
  doc.text('INVOICE', LAYOUT.rightCol, rightY, { 
    width: LAYOUT.rightColWidth,
    align: 'right' 
  });
  rightY += 40;

  doc.fontSize(9).fillColor(COLORS.muted);
  
  const invoiceDetails = [
    { label: 'Invoice #:', value: data.invoiceNumber },
    { label: 'Date:', value: formatDate(data.createdAt) },
    { label: 'Due Date:', value: formatDate(data.dueDate) },
  ];

  invoiceDetails.forEach((detail) => {
    const detailText = `${detail.label} ${detail.value}`;
    const detailHeight = getTextHeight(doc, detailText, LAYOUT.rightColWidth, 9);
    doc.text(detailText, LAYOUT.rightCol, rightY, { 
      width: LAYOUT.rightColWidth,
      align: 'right' 
    });
    rightY += detailHeight + LAYOUT.lineSpacing;
  });

  rightY += 5;
  const statusColor = getStatusColor(data.status);
  doc.fontSize(11).fillColor(statusColor);
  doc.text(data.status.toUpperCase(), LAYOUT.rightCol, rightY, { 
    width: LAYOUT.rightColWidth,
    align: 'right' 
  });
  rightY += 20;

  return Math.max(leftY, rightY);
}

function drawDivider(doc: PDFKit.PDFDocument, y: number): number {
  doc.moveTo(LAYOUT.leftCol, y)
     .lineTo(LAYOUT.leftCol + LAYOUT.contentWidth, y)
     .strokeColor(COLORS.border)
     .lineWidth(1)
     .stroke();
  return y;
}

function drawBillToSection(doc: PDFKit.PDFDocument, data: InvoiceData, startY: number): number {
  let y = startY;

  doc.fillColor(COLORS.primary).fontSize(10).text('BILL TO', LAYOUT.leftCol, y);
  y += 18;

  doc.fontSize(12).fillColor(COLORS.text);
  const nameHeight = getTextHeight(doc, data.memberName, LAYOUT.leftColWidth, 12);
  doc.text(data.memberName, LAYOUT.leftCol, y, { width: LAYOUT.leftColWidth });
  y += nameHeight + LAYOUT.lineSpacing;

  doc.fontSize(9).fillColor(COLORS.muted);

  if (data.memberEmail) {
    const emailHeight = getTextHeight(doc, data.memberEmail, LAYOUT.leftColWidth, 9);
    doc.text(data.memberEmail, LAYOUT.leftCol, y, { width: LAYOUT.leftColWidth });
    y += emailHeight + LAYOUT.lineSpacing;
  }

  if (data.memberPhone) {
    const phoneHeight = getTextHeight(doc, data.memberPhone, LAYOUT.leftColWidth, 9);
    doc.text(data.memberPhone, LAYOUT.leftCol, y, { width: LAYOUT.leftColWidth });
    y += phoneHeight + LAYOUT.lineSpacing;
  }

  if (data.memberAddress) {
    const addressHeight = getTextHeight(doc, data.memberAddress, LAYOUT.leftColWidth, 9);
    doc.text(data.memberAddress, LAYOUT.leftCol, y, { width: LAYOUT.leftColWidth });
    y += addressHeight + LAYOUT.lineSpacing;
  }

  return y;
}

function drawInvoiceTable(doc: PDFKit.PDFDocument, data: InvoiceData, startY: number): number {
  let y = startY;
  const tableLeft = LAYOUT.leftCol;
  const tableWidth = LAYOUT.contentWidth;
  const descColWidth = 380;
  const amountColWidth = 115;
  const rowPadding = 12;

  doc.fillColor(COLORS.lightBg).rect(tableLeft, y, tableWidth, 30).fill();
  
  doc.fontSize(9).fillColor(COLORS.muted);
  doc.text('DESCRIPTION', tableLeft + 15, y + 10, { width: descColWidth });
  doc.text('AMOUNT', tableLeft + descColWidth, y + 10, { 
    width: amountColWidth - 15, 
    align: 'right' 
  });
  y += 30;

  doc.moveTo(tableLeft, y).lineTo(tableLeft + tableWidth, y).strokeColor(COLORS.border).stroke();

  const description = data.description || 'Gym Membership / Services';
  
  const descHeight = getTextHeight(doc, description, descColWidth - 30, 10);
  const rowHeight = Math.max(descHeight + (rowPadding * 2), 40);
  
  doc.fontSize(10).fillColor(COLORS.text);
  doc.text(description, tableLeft + 15, y + rowPadding, { width: descColWidth - 30 });
  doc.text(formatCurrency(data.amount), tableLeft + descColWidth, y + rowPadding, { 
    width: amountColWidth - 15, 
    align: 'right' 
  });
  
  y += rowHeight;

  doc.moveTo(tableLeft, y).lineTo(tableLeft + tableWidth, y).strokeColor(COLORS.border).stroke();

  return y;
}

function drawTotalsSection(doc: PDFKit.PDFDocument, data: InvoiceData, startY: number): number {
  let y = startY + 15;
  const labelX = LAYOUT.rightCol;
  const valueX = LAYOUT.leftCol + LAYOUT.contentWidth;
  const rowHeight = 22;

  doc.fontSize(10).fillColor(COLORS.muted);
  doc.text('Subtotal:', labelX, y);
  doc.fillColor(COLORS.text).text(formatCurrency(data.amount), labelX, y, { 
    width: valueX - labelX, 
    align: 'right' 
  });
  y += rowHeight;

  doc.fillColor(COLORS.muted).text('Tax (0%):', labelX, y);
  doc.fillColor(COLORS.text).text(formatCurrency(0), labelX, y, { 
    width: valueX - labelX, 
    align: 'right' 
  });
  y += rowHeight;

  doc.moveTo(labelX, y).lineTo(valueX, y).strokeColor(COLORS.border).stroke();
  y += 10;

  doc.fontSize(12).fillColor(COLORS.text).text('Total:', labelX, y);
  doc.fontSize(16).fillColor(COLORS.primary).text(formatCurrency(data.amount), labelX, y - 2, { 
    width: valueX - labelX, 
    align: 'right' 
  });
  y += 25;

  return y;
}

function drawPaidBadge(doc: PDFKit.PDFDocument, data: InvoiceData, y: number): number {
  const badgeWidth = 180;
  const badgeHeight = 35;
  const badgeX = LAYOUT.leftCol + LAYOUT.contentWidth - badgeWidth;

  doc.fillColor(COLORS.successBg)
     .roundedRect(badgeX, y, badgeWidth, badgeHeight, 5)
     .fill();

  doc.fontSize(11).fillColor(COLORS.success);
  doc.text(`PAID on ${formatDate(data.paidDate!)}`, badgeX, y + 11, { 
    width: badgeWidth, 
    align: 'center' 
  });

  return y + badgeHeight;
}

function drawFooter(doc: PDFKit.PDFDocument, data: InvoiceData, pageNum: number, totalPages: number): void {
  const footerY = LAYOUT.pageHeight - 80;

  doc.moveTo(LAYOUT.leftCol, footerY)
     .lineTo(LAYOUT.leftCol + LAYOUT.contentWidth, footerY)
     .strokeColor(COLORS.border)
     .stroke();

  doc.fontSize(10).fillColor(COLORS.muted);
  doc.text('Thank you for your business!', LAYOUT.leftCol, footerY + 15, { 
    width: LAYOUT.contentWidth, 
    align: 'center' 
  });
  
  doc.fontSize(8).fillColor(COLORS.border);
  const footerText = totalPages > 1 
    ? `Generated by GYMSAATHI - ${data.gymName} | Page ${pageNum} of ${totalPages}`
    : `Generated by GYMSAATHI - ${data.gymName}`;
  doc.text(footerText, LAYOUT.leftCol, footerY + 35, { 
    width: LAYOUT.contentWidth, 
    align: 'center' 
  });
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'paid':
      return COLORS.success;
    case 'pending':
      return COLORS.warning;
    case 'overdue':
      return COLORS.error;
    default:
      return COLORS.muted;
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}
