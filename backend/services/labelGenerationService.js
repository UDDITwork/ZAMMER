// backend/services/labelGenerationService.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { uploadToCloudinary } = require('../utils/cloudinary');

class LabelGenerationService {
  constructor() {
    this.labelWidth = 595; // A4 width in points
    this.labelHeight = 842; // A4 height in points
    this.margin = 20;
  }

  /**
   * Generate shipping label PDF
   * @param {Object} order - Order object with populated data
   * @param {Object} seller - Seller object
   * @returns {Promise<Object>} - Label generation result
   */
  async generateShippingLabel(order, seller) {
    try {
      console.log('🏷️ [LabelGeneration] Starting label generation for order:', order.orderNumber);

      // Create PDF document
      const doc = new PDFDocument({
        size: [this.labelWidth, this.labelHeight],
        margin: this.margin
      });

      // Generate tracking number and codes
      const trackingNumber = order.shippingLabel.trackingNumber;
      const destinationCode = order.shippingLabel.destinationCode;
      const returnCode = order.shippingLabel.returnCode;

      // Set up the PDF content
      this.setupPDFHeader(doc, trackingNumber, destinationCode, returnCode);
      this.setupCustomerAddress(doc, order);
      this.setupSellerAddress(doc, seller);
      this.setupProductDetails(doc, order);
      this.setupTaxInvoice(doc, order, seller);
      this.setupFooter(doc);

      // Generate PDF buffer
      const pdfBuffer = await this.generatePDFBuffer(doc);

      // Upload to Cloudinary
      const labelUrl = await this.uploadLabelToCloudinary(pdfBuffer, order.orderNumber);

      console.log('✅ [LabelGeneration] Label generated successfully:', {
        orderNumber: order.orderNumber,
        trackingNumber,
        labelUrl
      });

      return {
        success: true,
        labelUrl,
        trackingNumber,
        destinationCode,
        returnCode,
        pdfBuffer
      };

    } catch (error) {
      console.error('❌ [LabelGeneration] Error generating label:', error);
      throw new Error(`Failed to generate shipping label: ${error.message}`);
    }
  }

  /**
   * Setup PDF header with ZAMMER branding and shipping info
   */
  setupPDFHeader(doc, trackingNumber, destinationCode, returnCode) {
    // Main header background with gradient effect
    doc.rect(0, 0, this.labelWidth, 100)
       .fill('#fff5f0'); // Light orange background

    // ZAMMER branding section
    doc.rect(0, 0, this.labelWidth, 50)
       .fill('#ff6b35'); // Orange brand color

    // ZAMMER logo text
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text('ZAMMER', 20, 15);

    // Tagline
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#ffffff')
       .text('Marketplace Delivery', 20, 40);

    // Shipping label header
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('SHIPPING LABEL', 20, 60);

    // Prepaid notice with styling
    doc.rect(this.labelWidth - 180, 5, 175, 25)
       .fill('#dc3545');
    
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text('PREPAID', this.labelWidth - 90, 12, {
         align: 'center'
       });

    doc.fontSize(8)
       .font('Helvetica')
       .text('Do not collect cash', this.labelWidth - 90, 22, {
         align: 'center'
       });

    // Carrier info section
    doc.rect(this.labelWidth - 180, 35, 175, 30)
       .fill('#f8f9fa')
       .stroke('#dee2e6');

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('Shadowfax', this.labelWidth - 90, 42, {
         align: 'center'
       });

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#6c757d')
       .text('Service: Pickup', this.labelWidth - 90, 52, {
         align: 'center'
       });

    // Tracking number section with better styling
    doc.rect(this.labelWidth - 180, 70, 175, 25)
       .fill('#e9ecef')
       .stroke('#dee2e6');

    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('TRACKING NUMBER', this.labelWidth - 90, 75, {
         align: 'center'
       });

    doc.fontSize(12)
       .font('Courier-Bold')
       .fillColor('#ff6b35')
       .text(trackingNumber, this.labelWidth - 90, 85, {
         align: 'center'
       });

    // Enhanced barcode representation
    doc.fontSize(6)
       .font('Courier')
       .fillColor('#000000')
       .text('▌▌▌▌▌ ▌▌▌▌▌ ▌▌▌▌▌ ▌▌▌▌▌ ▌▌▌▌▌ ▌▌▌▌▌', this.labelWidth - 90, 95, {
         align: 'center'
       });

    // Shipping codes section
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#6c757d')
       .text(`Dest: ${destinationCode}`, 20, 80);

    doc.text(`Return: ${returnCode}`, 20, 90);
  }

  /**
   * Setup customer address section with beautiful styling
   */
  setupCustomerAddress(doc, order) {
    const startY = 110;

    // Customer address header with styling
    doc.rect(15, startY - 5, this.labelWidth - 30, 25)
       .fill('#f8f9fa')
       .stroke('#dee2e6');

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#ff6b35')
       .text('DELIVERY ADDRESS', 20, startY + 5);

    // Customer details with better formatting
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text(order.shippingLabel.labelData.customerName, 20, startY + 30);

    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#495057')
       .text(order.shippingLabel.labelData.customerAddress, 20, startY + 45)
       .text(`${order.shippingLabel.labelData.customerCity}, ${order.shippingLabel.labelData.customerPincode}`, 20, startY + 60)
       .text(`Phone: ${order.shippingLabel.labelData.customerPhone}`, 20, startY + 75);

    // Return address section with styling
    doc.rect(15, startY + 90, this.labelWidth - 30, 20)
       .fill('#fff3cd')
       .stroke('#ffeaa7');

    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor('#856404')
       .text('If undelivered, return to:', 20, startY + 100);

    // This will be filled with seller address in setupSellerAddress
  }

  /**
   * Setup seller address section with beautiful styling
   */
  setupSellerAddress(doc, seller) {
    const startY = 220;

    // Seller address box
    doc.rect(15, startY - 5, this.labelWidth - 30, 50)
       .fill('#e8f5e8')
       .stroke('#c3e6c3');

    // Seller name
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#155724')
       .text(seller.shop?.name || 'Seller Shop', 20, startY + 5);

    // Seller address
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#495057')
       .text(seller.shop?.address || 'Address not provided', 20, startY + 20)
       .text(`${seller.shop?.address || 'City'}, ${seller.shop?.address || 'State'}`, 20, startY + 35)
       .text(`PINCODE: ${seller.shop?.address || '000000'}`, 20, startY + 50);
  }

  /**
   * Setup product details section with beautiful styling
   */
  setupProductDetails(doc, order) {
    const startY = 290;

    // Product details header with styling
    doc.rect(15, startY - 5, this.labelWidth - 30, 25)
       .fill('#e3f2fd')
       .stroke('#bbdefb');

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#1565c0')
       .text('PRODUCT DETAILS', 20, startY + 5);

    // Product table with better styling
    const tableY = startY + 30;
    
    // Table header background
    doc.rect(15, tableY - 5, this.labelWidth - 30, 20)
       .fill('#f5f5f5')
       .stroke('#dee2e6');

    doc.fontSize(8)
       .font('Helvetica-Bold')
       .fillColor('#495057')
       .text('SKU', 20, tableY + 5)
       .text('Size', 120, tableY + 5)
       .text('Qty', 160, tableY + 5)
       .text('Color', 190, tableY + 5)
       .text('Order No.', 250, tableY + 5);

    // Product details row
    const item = order.shippingLabel.labelData.items[0]; // Assuming single item for now
    if (item) {
      // Row background
      doc.rect(15, tableY + 15, this.labelWidth - 30, 20)
         .fill('#ffffff')
         .stroke('#dee2e6');

      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#000000')
         .text(item.sku, 20, tableY + 25)
         .text(item.size, 120, tableY + 25)
         .text(item.quantity.toString(), 160, tableY + 25)
         .text(item.color, 190, tableY + 25)
         .text(order.orderNumber, 250, tableY + 25);
    }
  }

  /**
   * Setup tax invoice section with beautiful styling
   */
  setupTaxInvoice(doc, order, seller) {
    const startY = 370;

    // Tax invoice header with ZAMMER branding
    doc.rect(15, startY - 5, this.labelWidth - 30, 30)
       .fill('#ff6b35')
       .stroke('#e55a2b');

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text('ZAMMER TAX INVOICE', 20, startY + 8);

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#ffffff')
       .text('Original For Recipient', this.labelWidth - 120, startY + 8, {
         align: 'right'
       });

    // Bill to / Ship to section with styling
    doc.rect(15, startY + 35, this.labelWidth - 30, 60)
       .fill('#f8f9fa')
       .stroke('#dee2e6');

    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#ff6b35')
       .text('BILL TO / SHIP TO:', 20, startY + 50);

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#495057')
       .text(order.shippingLabel.labelData.customerName, 20, startY + 65)
       .text(order.shippingLabel.labelData.customerAddress, 20, startY + 77)
       .text(`${order.shippingLabel.labelData.customerCity}, ${order.shippingLabel.labelData.customerPincode}`, 20, startY + 89)
       .text(`Place of Supply: ${order.shippingLabel.labelData.customerCity}`, 20, startY + 101);

    // Sold by section with styling
    doc.rect(15, startY + 105, this.labelWidth - 30, 50)
       .fill('#e8f5e8')
       .stroke('#c3e6c3');

    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#155724')
       .text('SOLD BY:', 20, startY + 120);

    const sellerName = seller.firstName + (seller.shop?.name ? ` (${seller.shop.name})` : '');
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#495057')
       .text(sellerName, 20, startY + 135)
       .text(seller.shop?.address || 'Address not provided', 20, startY + 147)
       .text(`GSTIN: ${seller.shop?.gstNumber || 'Not provided'}`, 20, startY + 159);

    // Invoice details with styling
    doc.rect(15, startY + 165, this.labelWidth - 30, 40)
       .fill('#fff3cd')
       .stroke('#ffeaa7');

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#856404')
       .text(`Purchase Order No.: ${order.orderNumber}`, 20, startY + 180)
       .text(`Invoice No.: ${order.orderNumber.toLowerCase().replace(/-/g, '')}`, 20, startY + 192)
       .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 20, startY + 204)
       .text(`Invoice Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 20, startY + 216);

    // Product table
    this.setupProductTable(doc, order, startY + 225);
  }

  /**
   * Setup product table for tax invoice with beautiful styling
   */
  setupProductTable(doc, order, startY) {
    // Table header background
    doc.rect(15, startY - 5, this.labelWidth - 30, 20)
       .fill('#f5f5f5')
       .stroke('#dee2e6');

    // Table headers
    doc.fontSize(7)
       .font('Helvetica-Bold')
       .fillColor('#495057')
       .text('Description', 20, startY + 5)
       .text('HSN', 200, startY + 5)
       .text('Qty', 240, startY + 5)
       .text('Gross Amount', 260, startY + 5)
       .text('Discount', 320, startY + 5)
       .text('Taxable Value', 360, startY + 5)
       .text('Taxes', 420, startY + 5)
       .text('Total', 460, startY + 5);

    // Product row background
    doc.rect(15, startY + 15, this.labelWidth - 30, 20)
       .fill('#ffffff')
       .stroke('#dee2e6');

    // Product row
    const item = order.shippingLabel.labelData.items[0];
    if (item) {
      const grossAmount = item.price * item.quantity;
      const discount = Math.round(grossAmount * 0.05); // 5% discount
      const taxableValue = grossAmount - discount;
      const tax = Math.round(taxableValue * 0.05); // 5% GST
      const total = taxableValue + tax;

      doc.fontSize(6)
         .font('Helvetica')
         .fillColor('#000000')
         .text(item.name.substring(0, 30) + '...', 20, startY + 25)
         .text('621149', 200, startY + 25)
         .text(item.quantity.toString(), 240, startY + 25)
         .text(`Rs.${grossAmount.toFixed(2)}`, 260, startY + 25)
         .text(`Rs.${discount.toFixed(2)}`, 320, startY + 25)
         .text(`Rs.${taxableValue.toFixed(2)}`, 360, startY + 25)
         .text(`IGST @5.0% Rs.${tax.toFixed(2)}`, 420, startY + 25)
         .text(`Rs.${total.toFixed(2)}`, 460, startY + 25);
    }

    // Totals section with styling
    doc.rect(15, startY + 45, this.labelWidth - 30, 30)
       .fill('#e3f2fd')
       .stroke('#bbdefb');

    const totalTax = Math.round((order.totalPrice - Math.round(order.totalPrice * 0.05)) * 0.05);
    doc.fontSize(8)
       .font('Helvetica-Bold')
       .fillColor('#1565c0')
       .text(`Total Taxes: Rs.${totalTax.toFixed(2)}`, 420, startY + 60)
       .text(`Overall Total: Rs.${order.totalPrice.toFixed(2)}`, 420, startY + 75);
  }

  /**
   * Setup footer with ZAMMER branding and disclaimer
   */
  setupFooter(doc) {
    const startY = this.labelHeight - 80;

    // ZAMMER footer branding
    doc.rect(15, startY - 10, this.labelWidth - 30, 20)
       .fill('#ff6b35')
       .stroke('#e55a2b');

    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text('ZAMMER MARKETPLACE', 20, startY - 2, {
         align: 'center'
       });

    doc.fontSize(6)
       .font('Helvetica')
       .fillColor('#ffffff')
       .text('Your Trusted Online Shopping Partner', 20, startY + 8, {
         align: 'center'
       });

    // Disclaimer section
    doc.rect(15, startY + 15, this.labelWidth - 30, 50)
       .fill('#f8f9fa')
       .stroke('#dee2e6');

    doc.fontSize(6)
       .font('Helvetica')
       .fillColor('#6c757d')
       .text('Tax is not payable on reverse charge basis. This is a computer generated invoice and does not require signature.', 20, startY + 25, {
         width: this.labelWidth - 40,
         align: 'justify'
       });

    doc.text('Other charges are charges that are applicable to your order and include charges for logistics fee (where applicable).', 20, startY + 40, {
      width: this.labelWidth - 40,
      align: 'justify'
    });

    doc.text('Includes discounts for your city and/or for online payments (as applicable).', 20, startY + 55, {
      width: this.labelWidth - 40,
      align: 'justify'
    });
  }

  /**
   * Generate PDF buffer from document
   */
  async generatePDFBuffer(doc) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      doc.end();
    });
  }

  /**
   * Upload label to Cloudinary
   */
  async uploadLabelToCloudinary(pdfBuffer, orderNumber) {
    try {
      const base64 = pdfBuffer.toString('base64');
      const dataURI = `data:application/pdf;base64,${base64}`;
      
      const result = await uploadToCloudinary(dataURI, 'shipping_labels', {
        public_id: `label_${orderNumber}_${Date.now()}`,
        resource_type: 'raw',
        format: 'pdf'
      });

      return result.url;
    } catch (error) {
      console.error('❌ [LabelGeneration] Error uploading to Cloudinary:', error);
      throw new Error('Failed to upload label to cloud storage');
    }
  }

  /**
   * Generate simple barcode (text-based representation)
   */
  generateBarcode(trackingNumber) {
    // Simple text-based barcode representation
    const barcode = trackingNumber.split('').map(char => {
      const code = char.charCodeAt(0);
      return '|'.repeat(Math.floor(code / 10) + 1);
    }).join(' ');
    
    return barcode;
  }

  /**
   * Generate QR code data (placeholder)
   */
  generateQRCodeData(trackingNumber, orderNumber) {
    return {
      trackingNumber,
      orderNumber,
      url: `https://track.zammer.com/${trackingNumber}`,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new LabelGenerationService();

