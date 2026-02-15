import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import VirtualTryOnService from '../../services/virtualTryOnService';

const VirtualTryOnModal = ({ isOpen, onClose, product, onTryOnComplete }) => {
  const [step, setStep] = useState('upload'); // upload, processing, result
  const [userPhoto, setUserPhoto] = useState(null);
  const [userPhotoUrl, setUserPhotoUrl] = useState('');
  const [tryOnResult, setTryOnResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Camera and photo capture states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      resetModal();
    }
  }, [isOpen]);

  // Connect camera stream to video element when camera UI is shown
  useEffect(() => {
    if (showCamera && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      console.log('✅ Camera stream connected to video element');
    }
  }, [showCamera]);

  const resetModal = () => {
    setStep('upload');
    setUserPhoto(null);
    setUserPhotoUrl('');
    setTryOnResult(null);
    setProcessing(false);
    setProgress(0);
    setError('');
    setShowCamera(false);
    setCameraError('');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    console.log(`🔍 [${uploadId}] ===== FILE UPLOAD HANDLER =====`);
    console.log(`🔍 [${uploadId}] Event details:`, {
      type: event.type,
      target: event.target?.tagName,
      filesCount: event.target?.files?.length || 0
    });

    const file = event.target.files[0];
    if (!file) {
      console.warn(`⚠️ [${uploadId}] No file selected in upload event`);
      return;
    }

    console.log(`🔍 [${uploadId}] File selected:`, {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
    });

    // Validate file
    console.log(`🔍 [${uploadId}] Validating file...`);
    
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      console.error(`❌ [${uploadId}] File size validation failed:`, {
        actualSize: file.size,
        maxSize: 2 * 1024 * 1024,
        actualSizeMB: (file.size / (1024 * 1024)).toFixed(2)
      });
      toast.error('Image size must be less than 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      console.error(`❌ [${uploadId}] File type validation failed:`, {
        actualType: file.type,
        expectedType: 'image/*'
      });
      toast.error('Please select a valid image file');
      return;
    }

    console.log(`✅ [${uploadId}] File validation passed, creating FileReader...`);

    const reader = new FileReader();
    reader.onload = (e) => {
      console.log(`✅ [${uploadId}] FileReader completed successfully:`, {
        resultLength: e.target.result?.length || 0,
        resultType: typeof e.target.result
      });
      
      setUserPhoto(file);
      setUserPhotoUrl(e.target.result);
      setStep('preview');
      
      console.log(`✅ [${uploadId}] File uploaded successfully, step changed to 'preview'`);
    };
    
    reader.onerror = (error) => {
      console.error(`❌ [${uploadId}] FileReader failed:`, error);
      toast.error('Failed to read image file');
    };
    
    reader.readAsDataURL(file);
  };

  // Start camera
  const startCamera = async () => {
    const cameraId = `camera_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    console.log(`🔍 [${cameraId}] ===== CAMERA START REQUESTED =====`);
    console.log(`🔍 [${cameraId}] Camera configuration:`, {
      facingMode: 'user',
      idealWidth: 1280,
      idealHeight: 720,
      hasMediaDevices: !!navigator.mediaDevices,
      hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia
    });

    try {
      console.log(`🔍 [${cameraId}] Requesting camera access...`);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      console.log(`✅ [${cameraId}] Camera access granted:`, {
        streamId: stream.id,
        tracks: stream.getTracks().map(track => ({
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState
        }))
      });
      
      streamRef.current = stream;
      // Stream will be connected to video element via useEffect when showCamera becomes true

      setShowCamera(true);
      setCameraError('');
      console.log(`✅ [${cameraId}] Camera started successfully, showCamera=true`);
      
    } catch (err) {
      console.error(`❌ [${cameraId}] Camera access failed:`, {
        error: err.message,
        name: err.name,
        stack: err.stack,
        type: err.constructor.name
      });
      setCameraError('Unable to access camera. Please upload a photo instead.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // Capture photo from camera
  const capturePhoto = () => {
    const captureId = `capture_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    console.log(`🔍 [${captureId}] ===== PHOTO CAPTURE REQUESTED =====`);
    console.log(`🔍 [${captureId}] Ref availability:`, {
      hasVideoRef: !!videoRef.current,
      hasCanvasRef: !!canvasRef.current
    });

    if (!videoRef.current || !canvasRef.current) {
      console.error(`❌ [${captureId}] Required refs not available`);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    console.log(`🔍 [${captureId}] Video element details:`, {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState,
      paused: video.paused,
      currentTime: video.currentTime
    });

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    console.log(`🔍 [${captureId}] Canvas configured:`, {
      width: canvas.width,
      height: canvas.height,
      aspectRatio: (canvas.width / canvas.height).toFixed(2)
    });

    // Draw video frame to canvas
    console.log(`🔍 [${captureId}] Drawing video frame to canvas...`);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    console.log(`✅ [${captureId}] Video frame drawn to canvas`);

    // Convert to blob
    console.log(`🔍 [${captureId}] Converting canvas to blob...`);
    canvas.toBlob((blob) => {
      if (blob) {
        console.log(`✅ [${captureId}] Blob created successfully:`, {
          size: blob.size,
          type: blob.type,
          sizeInKB: (blob.size / 1024).toFixed(2)
        });
        
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        console.log(`✅ [${captureId}] File created from blob:`, {
          name: file.name,
          size: file.size,
          type: file.type,
          sizeInKB: (file.size / 1024).toFixed(2)
        });
        
        setUserPhoto(file);
        setUserPhotoUrl(canvas.toDataURL('image/jpeg'));
        setStep('preview');
        stopCamera();
        
        console.log(`✅ [${captureId}] Photo captured successfully, step changed to 'preview'`);
        console.log(`🏁 [${captureId}] ===== PHOTO CAPTURE COMPLETED =====`);
      } else {
        console.error(`❌ [${captureId}] Failed to create blob from canvas`);
      }
    }, 'image/jpeg', 0.8);
  };

  // Process virtual try-on
  const processVirtualTryOn = async () => {
    const modalId = `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    console.log(`🔍 [${modalId}] ===== MODAL TRY-ON PROCESS STARTED =====`);
    console.log(`🔍 [${modalId}] Timestamp: ${new Date().toISOString()}`);
    console.log(`🔍 [${modalId}] Modal state:`, {
      step,
      hasUserPhoto: !!userPhoto,
      hasProduct: !!product,
      processing,
      error: error || 'none'
    });

    if (!userPhoto || !product) {
      console.error(`❌ [${modalId}] Missing required data:`, {
        hasUserPhoto: !!userPhoto,
        hasProduct: !!product
      });
      return;
    }

    console.log(`🔍 [${modalId}] Input validation passed:`, {
      productName: product.name,
      productId: product._id,
      productCategory: product.category,
      productImage: product.images?.[0],
      photoSize: userPhoto.size,
      photoType: userPhoto.type,
      photoName: userPhoto.name
    });

    setProcessing(true);
    setStep('processing');
    setProgress(0);
    setError('');

    try {
      // Step 1: Validate and optimize image
      console.log(`🔍 [${modalId}] Step 1: Validating and optimizing image...`);
      const validation = VirtualTryOnService.validateImageFile(userPhoto);
      console.log(`🔍 [${modalId}] Validation result:`, validation);
      
      if (!validation.isValid) {
        console.error(`❌ [${modalId}] Image validation failed:`, validation.errors);
        throw new Error(validation.errors.join(', '));
      }
      console.log(`✅ [${modalId}] Image validation passed`);

      // Step 2: Resize image if needed
      console.log(`🔍 [${modalId}] Step 2: Resizing image if needed...`);
      const resizeStartTime = Date.now();
      const optimizedPhoto = await VirtualTryOnService.resizeImageIfNeeded(userPhoto);
      const resizeTime = Date.now() - resizeStartTime;
      console.log(`✅ [${modalId}] Image optimization completed in ${resizeTime}ms:`, {
        originalSize: userPhoto.size,
        optimizedSize: optimizedPhoto.size,
        sizeReduction: `${((1 - optimizedPhoto.size / userPhoto.size) * 100).toFixed(1)}%`
      });
      
      // Step 3: Get processing estimates
      console.log(`🔍 [${modalId}] Step 3: Getting processing estimates...`);
      const processingTime = VirtualTryOnService.getEstimatedProcessingTime('fast');
      const cost = VirtualTryOnService.getTryOnCost('fast');
      console.log(`🔍 [${modalId}] Processing estimates:`, {
        processingTime,
        cost,
        mode: 'fast'
      });

      console.log(`🚀 [${modalId}] Starting virtual try-on process...`);

      // Step 4: Start progress updates
      console.log(`🔍 [${modalId}] Step 4: Starting progress updates...`);
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 10;
        });
      }, 2000);

      // Step 5: Process try-on using service
      console.log(`🔍 [${modalId}] Step 5: Calling VirtualTryOnService.processTryOn...`);
      const serviceStartTime = Date.now();
      
      const result = await VirtualTryOnService.processTryOn(
        optimizedPhoto,
        product._id,
        product.images?.[0] || '',
        product.category
      );
      
      const serviceTime = Date.now() - serviceStartTime;
      console.log(`🔍 [${modalId}] Service call completed in ${serviceTime}ms:`, {
        result,
        serviceTime: `${serviceTime}ms`
      });

      clearInterval(progressInterval);

      if (result.success) {
        const totalTime = Date.now() - startTime;
        console.log(`✅ [${modalId}] Try-on completed successfully in ${totalTime}ms:`, {
          result: result.data,
          totalTime: `${totalTime}ms`
        });
        
        setTryOnResult(result.data);
        setProgress(100);
        setStep('result');
        onTryOnComplete?.(result.data);
        
        console.log(`🏁 [${modalId}] ===== MODAL TRY-ON PROCESS COMPLETED =====`);
      } else {
        console.error(`❌ [${modalId}] Try-on service returned failure:`, {
          success: result.success,
          message: result.message,
          data: result.data
        });
        throw new Error(result.message || 'Try-on processing failed');
      }

    } catch (err) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ [${modalId}] ===== MODAL TRY-ON PROCESS FAILED =====`);
      console.error(`❌ [${modalId}] Error occurred after ${totalTime}ms:`, {
        error: err.message,
        name: err.name,
        stack: err.stack,
        type: err.constructor.name
      });
      
      setError(err.message || 'Something went wrong during try-on processing');
      setStep('upload');
    } finally {
      setProcessing(false);
      console.log(`🔍 [${modalId}] Modal state reset: processing=false`);
    }
  };

  // Retry try-on
  const retryTryOn = () => {
    setStep('upload');
    setError('');
  };

  // Download result
  const downloadResult = () => {
    if (!tryOnResult?.imageUrl) return;
    
    const link = document.createElement('a');
    link.href = tryOnResult.imageUrl;
    link.download = `tryon-${product.name}-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Virtual Try-On</h2>
              <p className="text-gray-600 mt-1">
                See how {product?.name} looks on you!
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-colors border border-gray-200"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-orange-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Your Photo</h3>
                <p className="text-gray-600 mb-6">
                  Take a photo or upload an image to see how this product looks on you
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Camera Option */}
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:border-orange-400 transition-colors cursor-pointer">
                  <button
                    onClick={startCamera}
                    className="w-full h-full flex flex-col items-center justify-center"
                  >
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Take Photo</h4>
                    <p className="text-gray-600 text-sm">Use your camera to take a new photo</p>
                  </button>
                </div>

                {/* Upload Option */}
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:border-orange-400 transition-colors cursor-pointer">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center"
                  >
                    <div className="w-16 h-16 bg-gradient-to-r from-green-100 to-green-200 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Upload Photo</h4>
                    <p className="text-gray-600 text-sm">Choose an existing photo from your device</p>
                  </button>
                </div>
              </div>

              {/* Camera Interface */}
              {showCamera && (
                <div className="fixed inset-0 z-60 bg-black flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl p-6 max-w-2xl w-full">
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">Take Your Photo</h3>
                      <p className="text-gray-600">Position yourself in the frame and click capture</p>
                    </div>
                    
                    <div className="relative mb-6">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full rounded-2xl"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                    </div>

                    {cameraError && (
                      <div className="text-red-600 text-center mb-4">{cameraError}</div>
                    )}

                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={stopCamera}
                        className="px-6 py-3 bg-gray-500 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={capturePhoto}
                        className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-pink-600 transition-all duration-300"
                      >
                        Capture Photo
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Requirements */}
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">Photo Requirements:</h4>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• Maximum file size: 2MB</li>
                  <li>• Maximum resolution: 2048x2048 pixels</li>
                  <li>• Supported formats: JPG, PNG</li>
                  <li>• Full body shot recommended for best results</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Review Your Photo</h3>
                <p className="text-gray-600">Make sure your photo is clear and shows your full body</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* User Photo */}
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 mb-3">Your Photo</h4>
                  <div className="relative">
                    <img
                      src={userPhotoUrl}
                      alt="Your photo"
                      className="w-full h-80 object-cover rounded-2xl border-2 border-gray-200"
                    />
                    <button
                      onClick={() => setStep('upload')}
                      className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Product */}
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 mb-3">Product</h4>
                  <div className="relative">
                    <img
                      src={product?.images?.[0]}
                      alt={product?.name}
                      className="w-full h-80 object-cover rounded-2xl border-2 border-gray-200"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{product?.name}</p>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={processVirtualTryOn}
                  className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:from-orange-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Start Virtual Try-On
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Processing typically takes 10-180 seconds
                </p>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-gradient-to-r from-orange-100 to-pink-100 rounded-full flex items-center justify-center mx-auto">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-500"></div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Processing Your Try-On</h3>
                <p className="text-gray-600 mb-4">
                  Our AI is creating a realistic image of you wearing this product
                </p>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-pink-500 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">{Math.round(progress)}% complete</p>
              </div>

              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 max-w-md mx-auto">
                <h4 className="font-semibold text-blue-900 mb-2">What's happening?</h4>
                <ul className="text-blue-800 text-sm space-y-1 text-left">
                  <li>• Analyzing your body proportions</li>
                  <li>• Mapping the garment to your figure</li>
                  <li>• Generating realistic lighting and shadows</li>
                  <li>• Finalizing the try-on image</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'result' && tryOnResult && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Your Virtual Try-On Result</h3>
                <p className="text-gray-600">See how {product?.name} looks on you!</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Original Photo */}
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 mb-3">Original Photo</h4>
                  <img
                    src={userPhotoUrl}
                    alt="Original photo"
                    className="w-full h-80 object-cover rounded-2xl border-2 border-gray-200"
                  />
                </div>

                {/* Try-On Result */}
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 mb-3">Try-On Result</h4>
                  <img
                    src={tryOnResult.imageUrl}
                    alt="Virtual try-on result"
                    className="w-full h-80 object-cover rounded-2xl border-2 border-orange-200 shadow-lg"
                  />
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={downloadResult}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-300"
                >
                  Download Result
                </button>
                <button
                  onClick={retryTryOn}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all duration-300"
                >
                  Try Another Photo
                </button>
              </div>

              <div className="bg-green-50 rounded-2xl p-4 border border-green-200 text-center">
                <h4 className="font-semibold text-green-900 mb-2">How does it look?</h4>
                <p className="text-green-800 text-sm">
                  Love the fit? Add this item to your cart and make it yours!
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 rounded-2xl p-4 border border-red-200 text-center">
              <h4 className="font-semibold text-red-900 mb-2">Something went wrong</h4>
              <p className="text-red-800 text-sm mb-4">{error}</p>
              
              {/* Enhanced Debug Information */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-red-100 rounded-xl p-3 mb-4 text-left text-xs">
                  <div className="font-semibold text-red-800 mb-2">Debug Information:</div>
                  <div className="space-y-1 text-red-700">
                    <div>• Error: {error}</div>
                    <div>• Step: {step}</div>
                    <div>• Has Photo: {userPhoto ? 'Yes' : 'No'}</div>
                    <div>• Has Product: {product ? 'Yes' : 'No'}</div>
                    {product && (
                      <>
                        <div>• Product ID: {product._id}</div>
                        <div>• Product Name: {product.name}</div>
                        <div>• Product Category: {product.category}</div>
                        <div>• Has Images: {product.images?.length > 0 ? 'Yes' : 'No'}</div>
                        <div>• First Image: {product.images?.[0] || 'None'}</div>
                      </>
                    )}
                    {userPhoto && (
                      <>
                        <div>• Photo Size: {(userPhoto.size / 1024 / 1024).toFixed(2)}MB</div>
                        <div>• Photo Type: {userPhoto.type}</div>
                        <div>• Photo Name: {userPhoto.name}</div>
                      </>
                    )}
                  </div>
                  
                  {/* Debug Actions */}
                  <div className="mt-3 space-y-2">
                    <button
                      onClick={() => {
                        console.log('🔍 [VIRTUAL_TRYON_DEBUG] ===== ERROR DEBUG INFO =====');
                        console.log('🔍 [VIRTUAL_TRYON_DEBUG] Current Error:', error);
                        console.log('🔍 [VIRTUAL_TRYON_DEBUG] Modal State:', {
                          step,
                          userPhoto: userPhoto ? {
                            name: userPhoto.name,
                            size: userPhoto.size,
                            type: userPhoto.type
                          } : null,
                          product: product ? {
                            id: product._id,
                            name: product.name,
                            category: product.category,
                            images: product.images
                          } : null
                        });
                        console.log('🔍 [VIRTUAL_TRYON_DEBUG] ===== END DEBUG =====');
                        toast.info('Debug info logged to console');
                      }}
                      className="w-full bg-red-200 text-red-800 px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-300 transition-colors"
                    >
                      📋 Log Debug Info
                    </button>
                    
                    <button
                      onClick={async () => {
                        try {
                          console.log('🔍 [VIRTUAL_TRYON_DEBUG] Testing API health...');
                          const response = await fetch('http://localhost:5001/api/virtual-tryon/health');
                          const data = await response.json();
                          console.log('🔍 [VIRTUAL_TRYON_DEBUG] Health check result:', {
                            status: response.status,
                            ok: response.ok,
                            data
                          });
                          toast.success('Health check completed - see console');
                        } catch (healthError) {
                          console.error('🔍 [VIRTUAL_TRYON_DEBUG] Health check failed:', healthError);
                          toast.error('Health check failed - see console');
                        }
                      }}
                      className="w-full bg-blue-200 text-blue-800 px-3 py-1 rounded-lg text-xs font-medium hover:bg-blue-300 transition-colors"
                    >
                      🏥 Test API Health
                    </button>
                  </div>
                </div>
              )}
              
              <button
                onClick={retryTryOn}
                className="bg-red-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VirtualTryOnModal;
