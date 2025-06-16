const debugImages = (req, res, next) => {
  // Only run in development
  if (process.env.NODE_ENV !== 'development') {
    return next();
  }
  
  console.log(`
🔍 ===============================
   IMAGE REQUEST DEBUGGING
===============================
📡 Method: ${req.method}
🌐 URL: ${req.originalUrl}
🔑 Has Auth: ${!!req.headers.authorization}
📦 Body Keys: ${req.body ? Object.keys(req.body).join(', ') : 'None'}
===============================`);
  
  // Log response after it's sent
  const originalSend = res.send;
  res.send = function(data) {
    try {
      if (typeof data === 'string') {
        const parsedData = JSON.parse(data);
        
        if (parsedData.data && Array.isArray(parsedData.data)) {
          console.log(`
📤 ===============================
   RESPONSE IMAGE DEBUGGING
===============================
📊 Products in response: ${parsedData.data.length}
🖼️  Image summary:`);
          
          parsedData.data.forEach((item, index) => {
            if (item.images) {
              console.log(`   Product ${index + 1}: ${item.images.length} images`);
              item.images.forEach((img, imgIdx) => {
                console.log(`     📷 ${imgIdx + 1}: ${img.substring(0, 60)}...`);
              });
            }
          });
          
          console.log(`===============================`);
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

module.exports = { debugImages }; 