import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ROUTES } from '../routes';

const LandingPage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Auto-cycling image animation with dramatic timing
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % 3);
    }, 5000); // Change image every 5 seconds for more dramatic effect

    return () => clearInterval(interval);
  }, []);

  const stats = [
    { number: '5K+', label: 'Happy Customers' },
    { number: '1K+', label: 'Active Sellers' },
    { number: '10K+', label: 'Products Listed' },
    { number: '5+', label: 'Cities Covered' },
  ];

  const features = [
    { title: 'Virtual Try-On', desc: 'See how you look before you buy with our AI-powered virtual fitting room' },
    { title: 'Lightning Fast Delivery', desc: 'Get your fashion delivered in record time by our professional delivery team' },
    { title: 'AI Recommendations', desc: 'Smart suggestions based on your style preferences and trending fashion' },
    { title: 'Local Discovery', desc: 'Find the best fashion stores right in your neighborhood' },
  ];

  const testimonials = [
    { name: 'Priya Sharma', role: 'Fashion Blogger', content: 'ZAMMER revolutionized how I shop for fashion. The virtual try-on feature is absolutely incredible!' },
    { name: 'Rajesh Kumar', role: 'Store Owner', content: 'My sales increased by 300% since joining ZAMMER. The platform is a game-changer for local businesses.' },
    { name: 'Ananya Patel', role: 'Fashion Enthusiast', content: 'Finally, a platform that understands fashion lovers. The delivery is super fast and the quality is amazing!' },
  ];

  const storyIllustrations = [
    { 
      image: 'https://pbs.twimg.com/media/G0YAA5QWMAA5sd0?format=jpg&name=4096x4096',
      title: 'The Shopping Revolution',
      description: 'Meet our fashion-forward customers who discovered the joy of hyperlocal delivery and instant gratification'
    },
    { 
      image: 'https://pbs.twimg.com/media/G0YA63KWMAA_Yvg?format=jpg&name=4096x4096',
      title: 'The Business Transformation',
      description: 'Local store owners embracing the future of retail with ZAMMER\'s quick commerce platform'
    }
  ];

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center space-x-3 group">
                <motion.div 
                  className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg"
                  whileHover={{ scale: 1.05, rotate: 3 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="text-xl font-bold text-white font-[Poppins]">Z</span>
                </motion.div>
                <div className="flex items-center space-x-1">
                  {/* ZAMMER with luxury gradient branding */}
                  <motion.span 
                    className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 bg-clip-text text-transparent font-[Poppins] drop-shadow-lg uppercase text-2xl font-black tracking-wider"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                  >
                    ZAMMER
                  </motion.span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <Link to="/" className="text-gray-700 hover:text-orange-600 px-3 py-2 text-sm font-medium transition-colors duration-200">
                  Home
                </Link>
                <Link to="/about" className="text-gray-700 hover:text-orange-600 px-3 py-2 text-sm font-medium transition-colors duration-200">
                  About
                </Link>
                <Link to="/features" className="text-gray-700 hover:text-orange-600 px-3 py-2 text-sm font-medium transition-colors duration-200">
                  Features
                </Link>
                <Link to="/contact" className="text-gray-700 hover:text-orange-600 px-3 py-2 text-sm font-medium transition-colors duration-200">
                  Contact
                </Link>
              </div>
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Link 
                to={ROUTES.USER_LOGIN}
                className="text-gray-700 hover:text-orange-600 px-4 py-2 text-sm font-medium transition-colors duration-200"
              >
                User Login
              </Link>
              <Link 
                to={ROUTES.USER_REGISTER}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                User Sign Up
              </Link>
              <Link 
                to={ROUTES.SELLER_LOGIN}
                className="text-gray-700 hover:text-orange-600 px-4 py-2 text-sm font-medium transition-colors duration-200"
              >
                Seller Login
              </Link>
              <Link 
                to={ROUTES.SELLER_REGISTER}
                className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Seller Sign Up
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <motion.button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-orange-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500 transition-all duration-200"
                aria-expanded={isMobileMenuOpen}
                whileTap={{ scale: 0.95 }}
              >
                <span className="sr-only">Open main menu</span>
                {/* Hamburger icon */}
                <motion.svg 
                  className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`} 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: isMobileMenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </motion.svg>
                {/* Close icon */}
                <motion.svg 
                  className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`} 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  initial={{ rotate: -180 }}
                  animate={{ rotate: isMobileMenuOpen ? 0 : -180 }}
                  transition={{ duration: 0.3 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </motion.svg>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <motion.div 
          className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden`}
          initial={{ opacity: 0, height: 0 }}
          animate={{ 
            opacity: isMobileMenuOpen ? 1 : 0, 
            height: isMobileMenuOpen ? 'auto' : 0 
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <motion.div 
            className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200 shadow-lg"
            initial={{ y: -20 }}
            animate={{ y: isMobileMenuOpen ? 0 : -20 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: isMobileMenuOpen ? 1 : 0, x: isMobileMenuOpen ? 0 : -20 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <Link 
                to="/" 
                className="text-gray-700 hover:text-orange-600 block px-3 py-2 text-base font-medium transition-colors duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: isMobileMenuOpen ? 1 : 0, x: isMobileMenuOpen ? 0 : -20 }}
              transition={{ delay: 0.15, duration: 0.3 }}
            >
              <Link 
                to="/about" 
                className="text-gray-700 hover:text-orange-600 block px-3 py-2 text-base font-medium transition-colors duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: isMobileMenuOpen ? 1 : 0, x: isMobileMenuOpen ? 0 : -20 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <Link 
                to="/features" 
                className="text-gray-700 hover:text-orange-600 block px-3 py-2 text-base font-medium transition-colors duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: isMobileMenuOpen ? 1 : 0, x: isMobileMenuOpen ? 0 : -20 }}
              transition={{ delay: 0.25, duration: 0.3 }}
            >
              <Link 
                to="/contact" 
                className="text-gray-700 hover:text-orange-600 block px-3 py-2 text-base font-medium transition-colors duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact
              </Link>
            </motion.div>
            <motion.div 
              className="border-t border-gray-200 pt-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: isMobileMenuOpen ? 1 : 0, x: isMobileMenuOpen ? 0 : -20 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: isMobileMenuOpen ? 1 : 0, y: isMobileMenuOpen ? 0 : 10 }}
                transition={{ delay: 0.35, duration: 0.3 }}
              >
                <Link 
                  to={ROUTES.USER_LOGIN}
                  className="text-gray-700 hover:text-orange-600 block px-3 py-2 text-base font-medium transition-colors duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  User Login
                </Link>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: isMobileMenuOpen ? 1 : 0, y: isMobileMenuOpen ? 0 : 10 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <Link 
                  to={ROUTES.USER_REGISTER}
                  className="bg-orange-500 hover:bg-orange-600 text-white block px-3 py-2 rounded-lg text-base font-medium mx-3 my-2 transition-colors duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  User Sign Up
                </Link>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: isMobileMenuOpen ? 1 : 0, y: isMobileMenuOpen ? 0 : 10 }}
                transition={{ delay: 0.45, duration: 0.3 }}
              >
                <Link 
                  to={ROUTES.SELLER_LOGIN}
                  className="text-gray-700 hover:text-orange-600 block px-3 py-2 text-base font-medium transition-colors duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Seller Login
                </Link>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: isMobileMenuOpen ? 1 : 0, y: isMobileMenuOpen ? 0 : 10 }}
                transition={{ delay: 0.5, duration: 0.3 }}
              >
                <Link 
                  to={ROUTES.SELLER_REGISTER}
                  className="bg-gray-800 hover:bg-gray-900 text-white block px-3 py-2 rounded-lg text-base font-medium mx-3 my-2 transition-colors duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Seller Sign Up
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </nav>

      {/* Hero Section - The Story Begins */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white pt-16">
        
        {/* Main Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile: Image First, Desktop: Side by Side */}
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            
            {/* Mobile: Image First (Order 1), Desktop: Right Side (Order 2) */}
            <div className={`relative transform transition-all duration-1000 delay-500 order-1 lg:order-2 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'}`}>
              <div className="relative">
                {/* Main Image Container - Magnified and 3D */}
                <div className="relative z-10">
                  <img 
                    src="https://pbs.twimg.com/media/G0bMKGNXkAAiImA?format=jpg&name=large"
                    alt="ZAMMER Delivery Agent"
                    className="w-full max-w-3xl sm:max-w-4xl lg:max-w-5xl mx-auto transform hover:scale-110 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>

            {/* Mobile: Content Second (Order 2), Desktop: Left Side (Order 1) */}
            <div className={`space-y-8 transform transition-all duration-1000 order-2 lg:order-1 ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'}`}>

              {/* Story Headline */}
              <div className="space-y-6">
                {/* Professional ZAMMER Banner */}
                <motion.div 
                  className="mb-8"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <div className="inline-block bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 px-8 py-4 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
                    <motion.h1 
                      className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, duration: 0.6 }}
                    >
                      {/* ZAMMER with luxury gradient branding */}
                      <span className="bg-gradient-to-r from-white via-orange-100 to-orange-200 bg-clip-text text-transparent font-[Poppins] drop-shadow-2xl uppercase tracking-wider">
                        ZAMMER
                      </span>
                    </motion.h1>
                  </div>
                </motion.div>
                
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 leading-tight">
                  The Fashion
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-700">
                    {' '}Revolution
                  </span>
                  <br />Starts Here
                </h2>
                <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-lg">
                  Once upon a time, fashion shopping meant long queues, limited choices, and endless waiting. 
                  <span className="font-semibold text-orange-600"> ZAMMER changed everything.</span>
                </p>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed max-w-lg">
                  Today, we're revolutionizing how India shops for fashion with hyperlocal delivery, 
                  AI-powered virtual try-ons, and lightning-fast quick commerce that brings the store to your doorstep.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  to={ROUTES.USER_REGISTER}
                  className="group relative px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-base sm:text-lg rounded-2xl shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 hover:scale-105 transform text-center"
                >
                  <span className="relative z-10">Start Your Fashion Journey</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
                <Link 
                  to={ROUTES.SELLER_REGISTER}
                  className="group px-6 sm:px-8 py-3 sm:py-4 border-2 border-orange-500 text-orange-600 font-bold text-base sm:text-lg rounded-2xl hover:bg-orange-500 hover:text-white transition-all duration-300 hover:scale-105 transform text-center"
                >
                  Join the Revolution
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-8">
                {stats.map((stat, index) => (
                  <div 
                    key={index}
                    className={`text-center transform transition-all duration-1000 delay-${index * 200} ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                  >
                    <div className="text-xl sm:text-2xl font-bold text-gray-800">{stat.number}</div>
                    <div className="text-orange-600 text-xs sm:text-sm font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-gray-300 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-gray-300 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* The Revolution Story - Features Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-orange-50 to-white relative overflow-hidden">
        {/* Professional Background Watermark */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
          <motion.h1 
            className="text-9xl font-black text-gray-400"
            style={{ 
              fontFamily: 'Poppins, sans-serif',
              fontWeight: '900',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              writingMode: 'vertical-rl',
              textOrientation: 'mixed'
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.05 }}
            transition={{ delay: 1, duration: 2 }}
          >
            {/* ZAMMER with luxury gradient branding */}
            <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
              ZAMMER
            </span>
          </motion.h1>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">How We're Changing the Game</h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              The story of fashion shopping is being rewritten, one innovation at a time
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group bg-white/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 text-center hover:bg-white hover:shadow-2xl transition-all duration-300 hover:scale-105 transform"
              >
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3">{feature.title}</h3>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Story Illustrations */}
      <section className="py-20 bg-gradient-to-r from-orange-100/50 to-orange-200/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-800 mb-4">The Story of Transformation</h2>
            <p className="text-xl text-gray-600">Visual tales of how ZAMMER is rewriting the fashion narrative</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
            {storyIllustrations.map((illustration, index) => (
              <div key={index} className={`${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div className="relative">
                  <img 
                    src={illustration.image} 
                    alt={illustration.title}
                    className="w-full max-w-lg mx-auto rounded-3xl transform hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-orange-600/20 rounded-3xl blur-2xl scale-110 -z-10"></div>
                </div>
                <div className={`mt-8 ${index % 2 === 1 ? 'lg:text-right' : ''}`}>
                  <h3 className="text-3xl font-bold text-gray-800 mb-4">{illustration.title}</h3>
                  <p className="text-lg text-gray-600 leading-relaxed">{illustration.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Stories - Testimonials Section */}
      <section className="py-20 bg-gradient-to-r from-orange-200/50 to-orange-300/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-800 mb-4">Voices from the Revolution</h2>
            <p className="text-xl text-gray-600">Real people, real stories, real transformation</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="bg-white/90 backdrop-blur-md rounded-2xl p-8 hover:bg-white hover:shadow-2xl transition-all duration-300 hover:scale-105 transform border border-orange-100"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                </div>
                <p className="text-gray-700 mb-6 italic text-center">"{testimonial.content}"</p>
                <div className="text-center">
                  <div className="font-bold text-gray-800 text-lg">{testimonial.name}</div>
                  <div className="text-orange-600 text-sm font-medium">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Delivery Revolution Story */}
      <section className="py-20 bg-gradient-to-br from-orange-50 to-orange-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-5xl font-bold text-gray-800">The Delivery Revolution</h2>
                <h3 className="text-3xl font-bold text-orange-600">From Store to Door in Minutes</h3>
                <p className="text-xl text-gray-600 leading-relaxed">
                  The story of fashion delivery was rewritten when ZAMMER introduced hyperlocal quick commerce. 
                  Our delivery heroes on scooters bring fashion to your doorstep faster than you can say "I need that outfit!"
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4 bg-white/80 backdrop-blur-md rounded-2xl p-6">
                  <p className="text-gray-700">Lightning-fast delivery in under 30 minutes from local stores</p>
                </div>
                <div className="flex items-center space-x-4 bg-white/80 backdrop-blur-md rounded-2xl p-6">
                  <p className="text-gray-700">Hyperlocal network connecting you with nearby fashion stores</p>
                </div>
                <div className="flex items-center space-x-4 bg-white/80 backdrop-blur-md rounded-2xl p-6">
                  <p className="text-gray-700">Real-time tracking and instant updates on your order</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <img 
                src="https://pbs.twimg.com/media/G0WyEKwX0AAcHgK?format=png&name=900x900"
                alt="ZAMMER Delivery Hero" 
                className="w-full max-w-6xl mx-auto transform hover:scale-110 transition-transform duration-500"
                style={{
                  filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.3)) drop-shadow(0 15px 30px rgba(0,0,0,0.2))',
                  transform: 'perspective(1200px) rotateY(-5deg) rotateX(3deg) translateZ(30px)',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Customer Love Showcase - Standalone Characters */}
      <section className="py-16 relative overflow-hidden">
        
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-3">
              See How People Are
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-700">
                {' '}Loving ZAMMER
              </span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Experience the joy and excitement of our customers as they discover the magic of quick fashion delivery.
            </p>
          </div>

          {/* Standalone Character Images */}
          <div className="relative max-w-5xl mx-auto h-[700px]">
            {/* Character 1 - Joy & Excitement */}
            <div className={`absolute inset-0 transition-all duration-4000 ease-in-out transform-gpu ${
              currentImageIndex === 0 
                ? 'opacity-100 scale-100 translate-z-0 rotate-y-0' 
                : 'opacity-0 scale-110 translate-z-50 rotate-y-12'
            }`}>
              <img 
                src="https://pbs.twimg.com/media/G0avBhoWMAUHkxC?format=jpg&name=large"
                alt="Young customer expressing joy with ZAMMER delivery - full body character"
                className="w-full h-full object-contain transform-gpu"
              />
            </div>

            {/* Character 2 - Delivery Experience */}
            <div className={`absolute inset-0 transition-all duration-4000 ease-in-out transform-gpu ${
              currentImageIndex === 1 
                ? 'opacity-100 scale-100 translate-z-0 rotate-y-0' 
                : 'opacity-0 scale-110 translate-z-50 rotate-y-12'
            }`}>
              <img 
                src="https://pbs.twimg.com/media/G0a0WhKacAAw_pS?format=jpg&name=large"
                alt="Young man receiving ZAMMER delivery with excitement - full body character"
                className="w-full h-full object-contain transform-gpu"
              />
            </div>

            {/* Character 3 - Fashion Satisfaction */}
            <div className={`absolute inset-0 transition-all duration-4000 ease-in-out transform-gpu ${
              currentImageIndex === 2 
                ? 'opacity-100 scale-100 translate-z-0 rotate-y-0' 
                : 'opacity-0 scale-110 translate-z-50 rotate-y-12'
            }`}>
              <img 
                src="https://pbs.twimg.com/media/G0a3mz2bgAge0zc?format=jpg&name=large"
                alt="Young woman satisfied with ZAMMER fashion delivery - full body character"
                className="w-full h-full object-contain transform-gpu"
              />
            </div>
          </div>
        </div>
      </section>

      {/* The Magic of Virtual Try-On */}
      <section className="py-20 bg-gradient-to-br from-pink-50 to-orange-50 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-pink-200/30 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-orange-200/30 rounded-full blur-2xl animate-pulse delay-1000"></div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-3 bg-white/80 backdrop-blur-md rounded-full px-6 py-3 mb-6">
              <span className="text-orange-600 font-semibold">AI-Powered Technology</span>
            </div>
            <h2 className="text-5xl lg:text-6xl font-bold text-gray-800 mb-4">
              The Magic of
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500">
                {' '}Virtual Try-On
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Experience the future of fashion shopping with our revolutionary AI technology that lets you try on clothes virtually before you buy.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side - Enhanced Content */}
            <div className="space-y-8">
              {/* Main CTA */}
              <div className="bg-gradient-to-r from-pink-500 to-orange-500 rounded-3xl p-8 text-white">
                <h3 className="text-3xl font-bold mb-4">Try Before You Buy</h3>
                <p className="text-lg opacity-90 mb-6">
                  Upload your photo and see how any outfit looks on you instantly with 95% accuracy
                </p>
                <div className="flex items-center space-x-4">
                  <div className="bg-white/20 rounded-full px-4 py-2">
                    <span className="text-sm font-semibold">95% Accuracy</span>
                  </div>
                  <div className="bg-white/20 rounded-full px-4 py-2">
                    <span className="text-sm font-semibold">Real-time Results</span>
                  </div>
                </div>
              </div>
              
              {/* Feature Cards - Redesigned */}
              <div className="space-y-4">
                <div className="group bg-white/90 backdrop-blur-md rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start space-x-4">
                    <div>
                      <h4 className="text-lg font-bold text-gray-800 mb-2">Instant Photo Upload</h4>
                      <p className="text-gray-600">Upload your photo and see how any outfit looks on you instantly with our advanced AI technology</p>
                    </div>
                  </div>
                </div>
                
                <div className="group bg-white/90 backdrop-blur-md rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start space-x-4">
                    <div>
                      <h4 className="text-lg font-bold text-gray-800 mb-2">Perfect Fit Guarantee</h4>
                      <p className="text-gray-600">AI-powered sizing recommendations ensure perfect fit every time, reducing returns by 80%</p>
                    </div>
                  </div>
                </div>
                
                <div className="group bg-white/90 backdrop-blur-md rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start space-x-4">
                    <div>
                      <h4 className="text-lg font-bold text-gray-800 mb-2">Home Comfort</h4>
                      <p className="text-gray-600">Realistic virtual fitting experience from the comfort of your home, anytime, anywhere</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Side - Enhanced Video Display */}
            <div className="relative">
              <div className="relative z-10">
                <video 
                  src="/TRY.mp4" 
                  alt="Virtual Try-On Demo" 
                  className="w-full max-w-2xl mx-auto transform hover:scale-110 transition-transform duration-500"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
                
                {/* Floating Stats */}
                <div className="absolute -top-4 -right-4 bg-white/90 backdrop-blur-md rounded-2xl p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">95%</div>
                    <div className="text-xs text-gray-600 font-medium">Accuracy</div>
                  </div>
                </div>
                
                <div className="absolute -bottom-4 -left-4 bg-white/90 backdrop-blur-md rounded-2xl p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-pink-600">2M+</div>
                    <div className="text-xs text-gray-600 font-medium">Users</div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </section>

      {/* The Seller's Success Story */}
      <section className="py-20 bg-gradient-to-r from-orange-100/50 to-orange-200/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-gray-800 mb-4">The Seller's Success Story</h2>
              <h3 className="text-3xl font-bold text-orange-600 mb-4">Make More, Worry Less</h3>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Every great fashion revolution needs great sellers. Join thousands of smart entrepreneurs 
                who are growing their business with ZAMMER's hyperlocal delivery and quick commerce platform.
              </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: '300% Sales Increase', desc: 'Average seller sees 300% increase in sales within first month' },
              { title: '30-Second Setup', desc: 'List your products in just 30 seconds with our streamlined process' },
              { title: 'AI Trend Insights', desc: 'Get real-time insights on what customers are searching for most' },
              { title: 'Zero Investment', desc: 'Start with zero upfront costs and scale as you grow' },
            ].map((feature, index) => (
              <div 
                key={index}
                className="bg-white/80 backdrop-blur-md rounded-2xl p-8 text-center hover:bg-white hover:shadow-2xl transition-all duration-300 hover:scale-105 transform"
              >
                <h4 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h4>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Mobile Revolution */}
      <section className="py-20 bg-gradient-to-br from-orange-100 to-orange-200 relative overflow-hidden">
        {/* Professional Badge Background */}
        <div className="absolute top-10 right-10 opacity-10">
          <motion.div 
            className="bg-white/20 backdrop-blur-sm rounded-full p-8 transform rotate-12"
            initial={{ scale: 0, rotate: 0 }}
            animate={{ scale: 1, rotate: 12 }}
            transition={{ delay: 1.5, duration: 1.5 }}
          >
            <h1 
              className="text-6xl font-black text-orange-600"
              style={{ 
                fontFamily: 'Poppins, sans-serif',
                fontWeight: '900',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                textShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              {/* ZAMMER with luxury gradient branding */}
              <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
                ZAMMER
              </span>
            </h1>
          </motion.div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center px-4 relative z-10">
          <h2 className="text-5xl font-bold text-gray-800 mb-4">The Mobile Revolution</h2>
          <h3 className="text-3xl font-bold text-orange-600 mb-4">Fashion at Your Fingertips</h3>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            The story continues on your mobile device. Get the complete ZAMMER experience 
            and be part of the fashion revolution wherever you go.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-6 mb-12">
            <a href="#" className="group hover:scale-105 transition-transform duration-300">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                alt="Google Play" 
                className="h-16 rounded-2xl"
              />
            </a>
            <a href="#" className="group hover:scale-105 transition-transform duration-300">
              <img 
                src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" 
                alt="App Store" 
                className="h-16 rounded-2xl"
              />
            </a>
          </div>

        </div>
      </section>

      {/* ═══════ Trust Badges Strip ═══════ */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-y-4">
            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 flex-1">
              {[
                { icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                ), label: 'Secure Payments' },
                { icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                ), label: 'Genuine Products' },
                { icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                ), label: 'Try & Buy' },
                { icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.015 4.356v4.992" /></svg>
                ), label: '7 Day Return' }
              ].map((badge, i) => (
                <div key={i} className="flex flex-col items-center text-center gap-1.5">
                  <span className="text-gray-700">{badge.icon}</span>
                  <span className="text-xs font-semibold text-gray-600 tracking-wide">{badge.label}</span>
                </div>
              ))}
            </div>

            {/* Social + tagline */}
            <div className="flex items-center gap-4 mx-auto sm:mx-0">
              <a href="#" aria-label="Instagram" className="text-gray-600 hover:text-orange-500 transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="#" aria-label="Facebook" className="text-gray-600 hover:text-orange-500 transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <span className="text-sm text-gray-500 font-medium hidden sm:block">Show us some <span className="text-red-500">&#10084;</span> on social media</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ Main Footer ═══════ */}
      <footer className="bg-[#1a1a1a] text-gray-300">

        {/* Footer Columns */}
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-10">

            {/* Brand Column */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-2 space-y-5">
              <div className="flex items-center gap-3">
                <img src="/images/zammer-official-logo.png" alt="ZAMMER" className="w-12 h-12 rounded-xl object-contain" />
                <span className="text-2xl font-black text-white tracking-wider uppercase" style={{ fontFamily: 'Poppins, sans-serif' }}>ZAMMER</span>
              </div>
              <p className="text-sm leading-relaxed text-gray-400 max-w-xs">
                Experience the ZAMMER app on your mobile. Shop from nearby sellers, try virtually, and get delivered fast.
              </p>

              {/* App Store Badges */}
              <div className="flex items-center gap-3">
                <a href="#" className="flex items-center gap-2 border border-gray-600 rounded-lg px-3.5 py-2 hover:border-gray-400 transition-colors">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.707l2.108 1.22a1 1 0 010 1.56l-2.108 1.22-2.537-2.5 2.537-2.5zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/></svg>
                  <div className="text-left">
                    <div className="text-[9px] text-gray-400 uppercase leading-none">Get it on</div>
                    <div className="text-xs font-semibold text-white leading-tight">Google Play</div>
                  </div>
                </a>
                <a href="#" className="flex items-center gap-2 border border-gray-600 rounded-lg px-3.5 py-2 hover:border-gray-400 transition-colors">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  <div className="text-left">
                    <div className="text-[9px] text-gray-400 uppercase leading-none">Download on the</div>
                    <div className="text-xs font-semibold text-white leading-tight">App Store</div>
                  </div>
                </a>
              </div>

              {/* Newsletter */}
              <div className="pt-2">
                <p className="text-sm font-semibold text-white mb-2.5">Subscribe To Our Newsletter</p>
                <div className="flex">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 bg-transparent border border-gray-600 rounded-l-lg px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors max-w-[200px]"
                  />
                  <button className="bg-white text-[#1a1a1a] px-5 py-2.5 rounded-r-lg text-sm font-bold uppercase tracking-wider hover:bg-orange-500 hover:text-white transition-colors">
                    Subscribe
                  </button>
                </div>
              </div>
            </div>

            {/* Help */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5">Help</h4>
              <ul className="space-y-2.5">
                {[
                  { to: ROUTES.POLICY_CONTACT, label: 'Contact Us' },
                  { to: ROUTES.POLICY_TERMS, label: "FAQ's" },
                  { to: ROUTES.USER_LOGIN, label: 'Track Order' },
                  { to: ROUTES.SELLER_LOGIN, label: 'Sell on ZAMMER' }
                ].map((item, i) => (
                  <li key={i}>
                    <Link to={item.to} className="text-gray-400 hover:text-white text-sm transition-colors duration-200">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5">Quick Links</h4>
              <ul className="space-y-2.5">
                {[
                  { to: ROUTES.USER_LOGIN, label: 'Shop Men' },
                  { to: ROUTES.USER_LOGIN, label: 'Shop Women' },
                  { to: ROUTES.USER_LOGIN, label: 'Shop Kids' },
                  { to: ROUTES.USER_LOGIN, label: 'Brands' },
                  { to: ROUTES.USER_LOGIN, label: 'Offers' }
                ].map((item, i) => (
                  <li key={i}>
                    <Link to={item.to} className="text-gray-400 hover:text-white text-sm transition-colors duration-200">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* About Us */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5">About Us</h4>
              <ul className="space-y-2.5">
                {[
                  { to: '/about', label: 'Who Are We' },
                  { to: '/about', label: 'Our Story' },
                  { to: ROUTES.POLICY_CONTACT, label: 'Careers' },
                  { to: '/about', label: 'Sitemap' }
                ].map((item, i) => (
                  <li key={i}>
                    <Link to={item.to} className="text-gray-400 hover:text-white text-sm transition-colors duration-200">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Policies */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5">Policies</h4>
              <ul className="space-y-2.5">
                {[
                  { to: ROUTES.POLICY_TERMS, label: 'Terms & Conditions' },
                  { to: ROUTES.POLICY_PRIVACY, label: 'Privacy Policy' },
                  { to: ROUTES.POLICY_REFUND, label: 'Refund Policy' },
                  { to: ROUTES.POLICY_REFUND, label: 'Return & Exchange' },
                  { to: ROUTES.POLICY_SHIPPING, label: 'Shipping Policy' }
                ].map((item, i) => (
                  <li key={i}>
                    <Link to={item.to} className="text-gray-400 hover:text-white text-sm transition-colors duration-200">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-gray-500 text-xs tracking-wide text-center sm:text-left">
              &copy; {new Date().getFullYear()} ZAMMER RETAIL PRIVATE LIMITED. ALL RIGHTS RESERVED.
            </p>
            {/* Scroll to top */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-10 h-10 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
              aria-label="Back to top"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;