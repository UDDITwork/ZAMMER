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
   * Setup PDF header with clean ZAMMER branding and shipping info
   */
  setupPDFHeader(doc, trackingNumber, destinationCode, returnCode) {
    // Clean header with single ZAMMER branding
    doc.rect(0, 0, this.labelWidth, 80)
       .fill('#ff6b35'); // Orange brand color

    // ZAMMER logo and tagline - single, clean branding
    doc.fontSize(28)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text('ZAMMER', 20, 15);

    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#ffffff')
       .text('Marketplace Delivery', 20, 45);

    // Prepaid notice - clean and prominent
    doc.rect(this.labelWidth - 160, 10, 150, 30)
       .fill('#dc3545');
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text('PREPAID', this.labelWidth - 85, 20, {
         align: 'center'
       });

    doc.fontSize(9)
       .font('Helvetica')
       .text('Do not collect cash', this.labelWidth - 85, 32, {
         align: 'center'
       });

    // Carrier and tracking section - organized layout
    doc.rect(this.labelWidth - 160, 45, 150, 30)
       .fill('#ffffff')
       .stroke('#dee2e6');

    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('Shadowfax', this.labelWidth - 85, 52, {
         align: 'center'
       });

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#6c757d')
       .text('Service: Pickup', this.labelWidth - 85, 64, {
         align: 'center'
       });

    // Tracking number - prominent and clear
    doc.rect(20, 90, this.labelWidth - 40, 35)
       .fill('#f8f9fa')
       .stroke('#dee2e6');

    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#495057')
       .text('TRACKING NUMBER', 30, 100);

    doc.fontSize(16)
       .font('Courier-Bold')
       .fillColor('#ff6b35')
       .text(trackingNumber, 30, 115);

    // Simple barcode representation
    doc.fontSize(8)
       .font('Courier')
       .fillColor('#000000')
       .text('||||| ||||| ||||| ||||| ||||| |||||', 30, 125);

    // Shipping codes - clean layout
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#6c757d')
       .text(`Destination: ${destinationCode}`, this.labelWidth - 200, 100)
       .text(`Return: ${returnCode}`, this.labelWidth - 200, 115);
  }

  /**
   * Setup customer address section with clean styling
   */
  setupCustomerAddress(doc, order) {
    const startY = 140;

    // Customer address section - clean and organized
    doc.rect(20, startY - 10, this.labelWidth - 40, 80)
       .fill('#ffffff')
       .stroke('#dee2e6');

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#ff6b35')
       .text('DELIVERY ADDRESS', 30, startY);

    // Customer details - clear hierarchy
    doc.fontSize(13)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text(order.shippingLabel.labelData.customerName, 30, startY + 20);

    doc.fontSize(11)
       .font('Helvetica')
       .fillColor('#495057')
       .text(order.shippingLabel.labelData.customerAddress, 30, startY + 40)
       .text(`${order.shippingLabel.labelData.customerCity}, ${order.shippingLabel.labelData.customerPincode}`, 30, startY + 55)
       .text(`Phone: ${order.shippingLabel.labelData.customerPhone}`, 30, startY + 70);

    // Return address section - clean and minimal
    doc.rect(20, startY + 90, this.labelWidth - 40, 25)
       .fill('#fff3cd')
       .stroke('#ffeaa7');

    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor('#856404')
       .text('If undelivered, return to seller address below', 30, startY + 100);
  }

  /**
   * Setup seller address section with clean styling
   */
  setupSellerAddress(doc, seller) {
    const startY = 250;

    // Seller address section - clean and organized
    doc.rect(20, startY - 10, this.labelWidth - 40, 60)
       .fill('#e8f5e8')
       .stroke('#c3e6c3');

    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor('#155724')
       .text('SELLER ADDRESS', 30, startY);

    // Seller details - clear and concise
    const sellerName = seller.firstName + (seller.shop?.name ? ` (${seller.shop.name})` : '');
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text(sellerName, 30, startY + 20);

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#495057')
       .text(seller.shop?.address || 'Address not provided', 30, startY + 35)
       .text(`GSTIN: ${seller.shop?.gstNumber || 'Not provided'}`, 30, startY + 50);
  }

  /**
   * Setup product details section with clean styling
   */
  setupProductDetails(doc, order) {
    const startY = 330;

    // Product details section - clean and organized
    doc.rect(20, startY - 10, this.labelWidth - 40, 50)
       .fill('#e3f2fd')
       .stroke('#bbdefb');

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#1565c0')
       .text('PRODUCT DETAILS', 30, startY);

    // Product information - clean table format
    const item = order.shippingLabel.labelData.items[0];
    if (item) {
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text(item.name, 30, startY + 20);

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#495057')
         .text(`SKU: ${item.sku} | Size: ${item.size} | Color: ${item.color} | Qty: ${item.quantity}`, 30, startY + 35)
         .text(`Order No.: ${order.orderNumber}`, 30, startY + 50);
    }
  }

  /**
   * Setup tax invoice section with clean styling - NO REPETITION
   */
  setupTaxInvoice(doc, order, seller) {
    const startY = 400;

    // Tax invoice header - clean and professional
    doc.rect(20, startY - 10, this.labelWidth - 40, 30)
       .fill('#ff6b35')
       .stroke('#e55a2b');

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text('TAX INVOICE', 30, startY + 5);

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#ffffff')
       .text('Original For Recipient', this.labelWidth - 130, startY + 5, {
         align: 'right'
       });

    // Invoice details - clean and organized
    doc.rect(20, startY + 30, this.labelWidth - 40, 80)
       .fill('#f8f9fa')
       .stroke('#dee2e6');

    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor('#495057')
       .text('Invoice Details:', 30, startY + 45);

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#495057')
       .text(`Invoice No.: ${order.orderNumber.toLowerCase().replace(/-/g, '')}`, 30, startY + 60)
       .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 30, startY + 72)
       .text(`Invoice Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 30, startY + 84)
       .text(`Total Amount: ₹${order.totalPrice.toFixed(2)}`, 30, startY + 96);

    // Seller GST information
    doc.fontSize(8)
       .font('Helvetica-Bold')
       .fillColor('#495057')
       .text('Seller GSTIN:', 30, startY + 110)
       .font('Helvetica')
       .text(seller.shop?.gstNumber || 'Not provided', 100, startY + 110);
  }

  /**
   * Setup product table for tax invoice - REMOVED to eliminate repetition
   * This was causing duplicate product information
   */
  setupProductTable(doc, order, startY) {
    // This method is now empty to prevent product information repetition
    // Product details are already shown in the main product section above
  }

  /**
   * Setup footer with clean disclaimer - NO BRANDING REPETITION
   */
  setupFooter(doc) {
    const startY = this.labelHeight - 60;

    // Clean disclaimer section
    doc.rect(20, startY - 10, this.labelWidth - 40, 50)
       .fill('#f8f9fa')
       .stroke('#dee2e6');

    doc.fontSize(7)
       .font('Helvetica')
       .fillColor('#6c757d')
       .text('This is a computer generated invoice and does not require signature.', 30, startY, {
         width: this.labelWidth - 60,
         align: 'justify'
       });

    doc.text('Tax is not payable on reverse charge basis. Other charges include logistics fees where applicable.', 30, startY + 15, {
      width: this.labelWidth - 60,
      align: 'justify'
    });

    doc.text('Includes applicable discounts for your city and/or online payments.', 30, startY + 30, {
      width: this.labelWidth - 60,
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

