import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../routes';

const LandingPage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
    { number: '50K+', label: 'Happy Customers' },
    { number: '10K+', label: 'Active Sellers' },
    { number: '100K+', label: 'Products Listed' },
    { number: '500+', label: 'Cities Covered' },
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
      {/* Hero Section - The Story Begins */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
        
        {/* Main Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Story Content */}
          <div className={`space-y-8 transform transition-all duration-1000 ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'}`}>

            {/* Story Headline */}
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-5xl font-bold text-gray-800 leading-tight">
                The Fashion
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-700">
                  {' '}Revolution
                </span>
                <br />Starts Here
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                Once upon a time, fashion shopping meant long queues, limited choices, and endless waiting. 
                <span className="font-semibold text-orange-600"> ZAMMER changed everything.</span>
              </p>
              <p className="text-lg text-gray-700 leading-relaxed max-w-lg">
                Today, we're revolutionizing how India shops for fashion with hyperlocal delivery, 
                AI-powered virtual try-ons, and lightning-fast quick commerce that brings the store to your doorstep.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                to={ROUTES.USER_REGISTER}
                className="group relative px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg rounded-2xl shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 hover:scale-105 transform"
              >
                <span className="relative z-10">Start Your Fashion Journey</span>
                <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
              <Link 
                to={ROUTES.SELLER_REGISTER}
                className="group px-8 py-4 border-2 border-orange-500 text-orange-600 font-bold text-lg rounded-2xl hover:bg-orange-500 hover:text-white transition-all duration-300 hover:scale-105 transform"
              >
                Join the Revolution
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-8">
              {stats.map((stat, index) => (
                <div 
                  key={index}
                  className={`text-center transform transition-all duration-1000 delay-${index * 200} ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                >
                  <div className="text-2xl font-bold text-gray-800">{stat.number}</div>
                  <div className="text-orange-600 text-sm font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Magnified 3D Scooter Image */}
          <div className={`relative transform transition-all duration-1000 delay-500 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'}`}>
            <div className="relative">
              {/* Main Image Container - Magnified and 3D */}
              <div className="relative z-10">
                <img 
                  src="https://pbs.twimg.com/media/G0bMKGNXkAAiImA?format=jpg&name=large"
                  alt="ZAMMER Delivery Agent"
                  className="w-full max-w-5xl mx-auto transform hover:scale-110 transition-transform duration-500"
                />
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
      <section className="py-20 bg-gradient-to-br from-orange-50 to-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-800 mb-4">How We're Changing the Game</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The story of fashion shopping is being rewritten, one innovation at a time
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group bg-white/80 backdrop-blur-md rounded-2xl p-8 text-center hover:bg-white hover:shadow-2xl transition-all duration-300 hover:scale-105 transform"
              >
                <h3 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.desc}</p>
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
                className="w-full max-w-4xl mx-auto transform hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-orange-600/20 blur-2xl scale-110 -z-10"></div>
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
      <section className="py-20 bg-gradient-to-br from-orange-100 to-orange-200">
        <div className="max-w-4xl mx-auto text-center px-4">
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

      {/* Modern Footer Design */}
      <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-400/10 to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"></div>
        </div>
        
        {/* Main Footer Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            
            {/* Brand Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">Z</span>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white">ZAMMER</h3>
                  <p className="text-orange-300 text-sm font-medium">Fashion Revolution</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed max-w-md">
                Revolutionizing fashion retail with AI-powered insights, virtual try-ons, and seamless local shopping experiences. 
                Connecting buyers with nearby sellers for the ultimate fashion discovery.
              </p>
              <div className="flex space-x-3">
                <a href="#" className="w-10 h-10 bg-white/10 hover:bg-orange-500 rounded-lg flex items-center justify-center transition-all duration-300 group hover:scale-110 hover:rotate-3">
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-white/10 hover:bg-orange-500 rounded-lg flex items-center justify-center transition-all duration-300 group hover:scale-110 hover:rotate-3">
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-white/10 hover:bg-orange-500 rounded-lg flex items-center justify-center transition-all duration-300 group hover:scale-110 hover:rotate-3">
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-6">
              <h4 className="text-lg font-bold text-white relative">
                Quick Links
                <div className="absolute -bottom-2 left-0 w-8 h-0.5 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"></div>
              </h4>
              <ul className="space-y-3">
                {['About Us', 'How It Works', 'Success Stories', 'Press & Media', 'Careers', 'Contact Us'].map((link, index) => (
                  <li key={index}>
                    <a href="#" className="text-gray-300 hover:text-orange-400 transition-all duration-300 text-sm font-medium group relative">
                      <span className="relative z-10">{link}</span>
                      <div className="absolute left-0 top-1/2 w-0 h-0.5 bg-orange-400 transition-all duration-300 group-hover:w-full"></div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Features */}
            <div className="space-y-6">
              <h4 className="text-lg font-bold text-white relative">
                Features
                <div className="absolute -bottom-2 left-0 w-8 h-0.5 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"></div>
              </h4>
              <ul className="space-y-3">
                {['Virtual Try-On', 'AI Recommendations', 'Location-Based Search', 'Secure Payments', 'Fast Delivery', 'Analytics Dashboard'].map((feature, index) => (
                  <li key={index}>
                    <a href="#" className="text-gray-300 hover:text-orange-400 transition-all duration-300 text-sm font-medium group relative">
                      <span className="relative z-10">{feature}</span>
                      <div className="absolute left-0 top-1/2 w-0 h-0.5 bg-orange-400 transition-all duration-300 group-hover:w-full"></div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-16 pt-8 border-t border-white/10">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Ready to Join the Revolution?</h3>
              <p className="text-gray-300">Choose your role and start your journey with ZAMMER</p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-2xl mx-auto">
              <Link 
                to={ROUTES.USER_LOGIN} 
                className="group relative px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-center font-bold transition-all duration-300 hover:scale-105 transform shadow-lg hover:shadow-orange-500/25"
              >
                <span className="relative z-10">Shop as Buyer</span>
                <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
              <Link 
                to={ROUTES.SELLER_LOGIN} 
                className="group px-8 py-4 border-2 border-orange-500 hover:bg-orange-500 hover:text-white text-orange-400 rounded-xl text-center font-bold transition-all duration-300 hover:scale-105 transform"
              >
                Sell as Seller
              </Link>
              <Link 
                to="/delivery/login" 
                className="group px-8 py-4 border-2 border-orange-500 hover:bg-orange-500 hover:text-white text-orange-400 rounded-xl text-center font-bold transition-all duration-300 hover:scale-105 transform"
              >
                Deliver as Agent
              </Link>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-16 pt-8 border-t border-white/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { number: '50K+', label: 'Happy Customers' },
                { number: '10K+', label: 'Active Sellers' },
                { number: '100K+', label: 'Products Listed' },
                { number: '500+', label: 'Cities Covered' }
              ].map((stat, index) => (
                <div key={index} className="group">
                  <div className="text-3xl md:text-4xl font-black text-orange-400 group-hover:text-orange-300 transition-colors duration-300">
                    {stat.number}
                  </div>
                  <div className="text-gray-300 text-sm font-medium mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="bg-black/20 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-center md:text-left">
                <p className="text-gray-400 text-sm">
                  © 2025 <span className="text-orange-400 font-bold">ZAMMER RETAIL PRIVATE LIMITED</span> - All Rights Reserved
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Empowering local fashion businesses with cutting-edge technology
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-6 text-sm">
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Help Center'].map((link, index) => (
                  <a key={index} href="#" className="text-gray-400 hover:text-orange-400 transition-colors duration-300 font-medium relative group">
                    <span className="relative z-10">{link}</span>
                    <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-400 transition-all duration-300 group-hover:w-full"></div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;