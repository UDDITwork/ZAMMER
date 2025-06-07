// Backend Invoice Generation Service
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const https = require('https');
const http = require('http');

// Enhanced logging for invoice generation
const logInvoiceOperation = (operation, data, type = 'info') => {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'     // Reset
  };
  
  const timestamp = new Date().toISOString();
  console.log(`${colors[type]}📄 [Invoice${operation}] ${timestamp} - ${JSON.stringify(data)}${colors.reset}`);
};

class InvoiceGenerator {
  constructor() {
    this.invoicesDir = path.join(__dirname, '../public/invoices');
    this.ensureInvoicesDirectory();
  }

  // Ensure invoices directory exists
  ensureInvoicesDirectory() {
    if (!fs.existsSync(this.invoicesDir)) {
      fs.mkdirSync(this.invoicesDir, { recursive: true });
      logInvoiceOperation('DirectoryCreated', { path: this.invoicesDir }, 'success');
    }
  }

  // Generate invoice PDF for an order
  async generateInvoice(orderData) {
    try {
      logInvoiceOperation('GenerationStart', {
        orderNumber: orderData.orderNumber,
        totalPrice: orderData.totalPrice,
        customerName: orderData.user?.name
      }, 'info');

      // Create a new PDF document
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4'
      });

      // Generate unique filename
      const filename = `invoice-${orderData.orderNumber}-${Date.now()}.pdf`;
      const filepath = path.join(this.invoicesDir, filename);
      
      // Pipe the PDF to a file
      doc.pipe(fs.createWriteStream(filepath));

      // Generate invoice content
      await this.generateInvoiceContent(doc, orderData);

      // Finalize the PDF
      doc.end();

      // Wait for the file to be written
      await new Promise((resolve, reject) => {
        doc.on('end', resolve);
        doc.on('error', reject);
      });

      const invoiceUrl = `/invoices/${filename}`;
      
      logInvoiceOperation('GenerationSuccess', {
        orderNumber: orderData.orderNumber,
        filename,
        filepath,
        invoiceUrl
      }, 'success');

      console.log(`
📄 ===============================
   INVOICE GENERATED SUCCESSFULLY!
===============================
📦 Order Number: ${orderData.orderNumber}
👤 Customer: ${orderData.user?.name}
💰 Total: ₹${orderData.totalPrice}
📁 File: ${filename}
🔗 URL: ${invoiceUrl}
📅 Generated: ${new Date().toLocaleString()}
===============================`);

      return {
        success: true,
        filename,
        filepath,
        invoiceUrl,
        message: 'Invoice generated successfully'
      };

    } catch (error) {
      logInvoiceOperation('GenerationError', {
        orderNumber: orderData.orderNumber,
        error: error.message,
        stack: error.stack
      }, 'error');
      
      throw new Error(`Invoice generation failed: ${error.message}`);
    }
  }

  // Generate the actual invoice content
  async generateInvoiceContent(doc, orderData) {
    const pageWidth = doc.page.width - 100; // Accounting for margins
    let yPosition = 50;

    // Helper function to add spacing
    const addSpacing = (space = 20) => {
      yPosition += space;
      return yPosition;
    };

    // Helper function to draw a line
    const drawLine = (startX = 50, endX = pageWidth + 50, y = yPosition) => {
      doc.moveTo(startX, y).lineTo(endX, y).stroke();
      return y;
    };

    // 1. HEADER - Company Logo and Title
    try {
      // Add logo image
      const logoBuffer = await this.downloadImage('https://zammernow.com/assets/logo.svg');
      if (logoBuffer) {
        doc.image(logoBuffer, 50, yPosition, { width: 60, height: 60 });
        
        // Company name next to logo
        doc.fillColor('#f97316')
           .fontSize(28)
           .font('Helvetica-Bold')
           .text('ZAMMER', 120, yPosition + 10);
        
        doc.fillColor('#666666')
           .fontSize(12)
           .font('Helvetica')
           .text('Marketplace', 120, yPosition + 45);
      } else {
        // Fallback if logo fails to load
        doc.fillColor('#f97316')
           .fontSize(28)
           .font('Helvetica-Bold')
           .text('ZAMMER', 50, yPosition);
        
        doc.fillColor('#666666')
           .fontSize(12)
           .font('Helvetica')
           .text('Marketplace', 50, yPosition + 35);
      }
    } catch (error) {
      console.log('Logo loading failed, using text fallback');
      // Fallback to text only
      doc.fillColor('#f97316')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text('ZAMMER', 50, yPosition);
      
      doc.fillColor('#666666')
         .fontSize(12)
         .font('Helvetica')
         .text('Marketplace', 50, yPosition + 35);
    }

    // Invoice title on the right
    doc.fillColor('#000000')
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('INVOICE', pageWidth - 50, yPosition, { align: 'right' });

    addSpacing(60);

    // 2. INVOICE DETAILS (Right side)
    const invoiceNumber = await this.generateInvoiceNumber();
    const currentDate = new Date();
    const dueDate = new Date(currentDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days from now

    const invoiceDetailsY = yPosition;
    doc.fillColor('#000000')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('Invoice Number:', pageWidth - 150, invoiceDetailsY)
       .font('Helvetica')
       .text(invoiceNumber, pageWidth - 60, invoiceDetailsY, { align: 'right' });

    doc.font('Helvetica-Bold')
       .text('Date:', pageWidth - 150, invoiceDetailsY + 15)
       .font('Helvetica')
       .text(this.formatDate(currentDate), pageWidth - 60, invoiceDetailsY + 15, { align: 'right' });

    doc.font('Helvetica-Bold')
       .text('Payment Due:', pageWidth - 150, invoiceDetailsY + 30)
       .font('Helvetica')
       .text(this.formatDate(dueDate), pageWidth - 60, invoiceDetailsY + 30, { align: 'right' });

    // 3. BILL TO SECTION
    addSpacing(40);
    doc.fillColor('#f97316')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('BILL TO:', 50, yPosition);

    addSpacing(20);
    doc.fillColor('#000000')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text(orderData.user?.name || 'Customer Name', 50, yPosition);

    addSpacing(15);
    doc.font('Helvetica')
       .fontSize(10)
       .text(orderData.shippingAddress?.address || 'Address not provided', 50, yPosition);

    addSpacing(12);
    doc.text(`${orderData.shippingAddress?.city || 'City'}, ${orderData.shippingAddress?.postalCode || 'PIN'}`, 50, yPosition);

    addSpacing(12);
    doc.text(`Phone: ${orderData.shippingAddress?.phone || orderData.user?.mobileNumber || 'N/A'}`, 50, yPosition);

    addSpacing(12);
    doc.text(`Email: ${orderData.user?.email || 'N/A'}`, 50, yPosition);

    addSpacing(40);

    // 4. ORDER DETAILS SECTION
    doc.fillColor('#f97316')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('ORDER DETAILS:', 50, yPosition);

    addSpacing(20);
    doc.fillColor('#000000')
       .fontSize(10)
       .font('Helvetica')
       .text(`Order Number: ${orderData.orderNumber}`, 50, yPosition);

    addSpacing(12);
    doc.text(`Order Date: ${this.formatDate(new Date(orderData.createdAt))}`, 50, yPosition);

    addSpacing(12);
    doc.text(`Payment Method: ${orderData.paymentMethod}`, 50, yPosition);

    addSpacing(30);

    // 5. ITEMS TABLE
    const tableTop = yPosition;
    const tableHeaders = ['SL.NO', 'DESCRIPTION', 'QTY', 'DISCOUNT', 'TOTAL PRICE'];
    const columnWidths = [50, 250, 60, 80, 100];
    const columnPositions = [50, 100, 350, 410, 490];

    // Table header background
    doc.rect(50, tableTop, pageWidth, 25)
       .fillColor('#f3f4f6')
       .fill();

    // Table headers
    doc.fillColor('#000000')
       .fontSize(10)
       .font('Helvetica-Bold');

    tableHeaders.forEach((header, index) => {
      doc.text(header, columnPositions[index], tableTop + 8);
    });

    addSpacing(25);
    drawLine();
    addSpacing(10);

    // Table rows
    doc.font('Helvetica').fontSize(9);
    
    let totalDiscount = 0;
    orderData.orderItems?.forEach((item, index) => {
      const itemTotal = item.price * item.quantity;
      const itemDiscount = 0; // You can calculate actual discount if needed
      totalDiscount += itemDiscount;

      // Alternate row background
      if (index % 2 === 0) {
        doc.rect(50, yPosition - 5, pageWidth, 20)
           .fillColor('#fafafa')
           .fill();
      }

      doc.fillColor('#000000');
      
      // Row data
      doc.text((index + 1).toString(), columnPositions[0], yPosition);
      doc.text(item.name || 'Product', columnPositions[1], yPosition, { 
        width: columnWidths[1] - 10, 
        ellipsis: true 
      });
      doc.text(item.quantity.toString(), columnPositions[2], yPosition);
      doc.text(`₹${itemDiscount.toFixed(2)}`, columnPositions[3], yPosition);
      doc.text(`₹${itemTotal.toFixed(2)}`, columnPositions[4], yPosition);

      addSpacing(20);
    });

    drawLine();
    addSpacing(20);

    // 6. TOTALS SECTION
    const totalsX = pageWidth - 200;
    const subtotal = orderData.totalPrice - (orderData.taxPrice || 0) - (orderData.shippingPrice || 0);

    doc.fontSize(10);
    
    // Subtotal
    doc.font('Helvetica')
       .text('Subtotal:', totalsX, yPosition)
       .text(`₹${subtotal.toFixed(2)}`, totalsX + 100, yPosition, { align: 'right' });

    addSpacing(15);

    // Tax
    if (orderData.taxPrice > 0) {
      doc.text('Tax (18% GST):', totalsX, yPosition)
         .text(`₹${orderData.taxPrice.toFixed(2)}`, totalsX + 100, yPosition, { align: 'right' });
      addSpacing(15);
    }

    // Shipping
    if (orderData.shippingPrice > 0) {
      doc.text('Shipping:', totalsX, yPosition)
         .text(`₹${orderData.shippingPrice.toFixed(2)}`, totalsX + 100, yPosition, { align: 'right' });
      addSpacing(15);
    }

    // Total line
    drawLine(totalsX, pageWidth + 50);
    addSpacing(10);

    // Final total
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('TOTAL:', totalsX, yPosition)
       .fillColor('#f97316')
       .text(`₹${orderData.totalPrice.toFixed(2)}`, totalsX + 100, yPosition, { align: 'right' });

    addSpacing(40);

    // 7. TERMS & CONDITIONS
    doc.fillColor('#666666')
       .fontSize(8)
       .font('Helvetica')
       .text('Terms & Conditions:', 50, yPosition);

    addSpacing(15);
    
    const terms = [
      '• Payment is due within 30 days of invoice date.',
      '• All sales are final unless otherwise specified.',
      '• Returns must be initiated within 7 days of delivery.',
      '• For support, contact us at support@zammer.com',
      '• Thank you for shopping with Zammer Marketplace!'
    ];

    terms.forEach(term => {
      doc.text(term, 50, yPosition);
      addSpacing(10);
    });

    // 8. FOOTER
    addSpacing(30);
    doc.fillColor('#f97316')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('Thank you for your business!', 50, yPosition);

    addSpacing(10);
    doc.fillColor('#666666')
       .fontSize(8)
       .font('Helvetica')
       .text('This is a computer-generated invoice. No signature required.', 50, yPosition);
  }

  // Download image from URL
  async downloadImage(url) {
    return new Promise((resolve) => {
      const protocol = url.startsWith('https:') ? https : http;
      
      protocol.get(url, (response) => {
        if (response.statusCode === 200) {
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => {
            const buffer = Buffer.concat(chunks);
            resolve(buffer);
          });
        } else {
          console.log(`Failed to download logo: ${response.statusCode}`);
          resolve(null);
        }
      }).on('error', (error) => {
        console.log(`Error downloading logo: ${error.message}`);
        resolve(null);
      });
    });
  }

  // Generate unique invoice number
  async generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `INV${year}${month}${day}${random}`;
  }

  // Format date for display
  formatDate(date) {
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Get invoice by filename
  getInvoicePath(filename) {
    return path.join(this.invoicesDir, filename);
  }

  // Check if invoice exists
  invoiceExists(filename) {
    const filepath = this.getInvoicePath(filename);
    return fs.existsSync(filepath);
  }

  // Delete invoice (for cleanup)
  deleteInvoice(filename) {
    try {
      const filepath = this.getInvoicePath(filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        logInvoiceOperation('Deleted', { filename }, 'success');
        return true;
      }
      return false;
    } catch (error) {
      logInvoiceOperation('DeleteError', { filename, error: error.message }, 'error');
      return false;
    }
  }

  // Clean up old invoices (older than 30 days)
  cleanupOldInvoices() {
    try {
      const files = fs.readdirSync(this.invoicesDir);
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      let deletedCount = 0;

      files.forEach(file => {
        const filepath = path.join(this.invoicesDir, file);
        const stats = fs.statSync(filepath);
        
        if (stats.mtime.getTime() < thirtyDaysAgo) {
          fs.unlinkSync(filepath);
          deletedCount++;
        }
      });

      logInvoiceOperation('Cleanup', { deletedCount }, 'success');
      return deletedCount;
    } catch (error) {
      logInvoiceOperation('CleanupError', { error: error.message }, 'error');
      return 0;
    }
  }
}

// Create singleton instance
const invoiceGenerator = new InvoiceGenerator();

module.exports = invoiceGenerator;