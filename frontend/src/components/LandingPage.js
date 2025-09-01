import React from 'react';
import LandingNavbar from './LandingNavbar';

const buyerSteps = [
  { icon: '🔍', title: 'Explore', desc: 'A wide range of latest fashion nearby' },
  { icon: '🛒', title: 'Select', desc: 'Add to your cart, pay/pay later' },
  { icon: '🛍️', title: 'Pick', desc: 'Reach the shop, try the outfit & Bring it Home' },
];

const sellerSteps = [
  { icon: '📝', title: 'Register', desc: 'Enter your seller account details' },
  { icon: '📦', title: 'Inventory Upload', desc: 'List your collection & details' },
  { icon: '💰', title: 'Enjoy Earning', desc: 'Your nearby customers can see your collection' },
];

const aiFeatures = [
  { icon: '📈', title: 'Trend Forecasting', desc: 'AI analyzes global fashion trends to predict what will be popular next season', badge: 'Oversized blazers trending +45%' },
  { icon: '🟢', title: 'Better Fit & Sizing', desc: 'More accurate sizing recommendations using body measurement AI', badge: 'Size M recommended for 89% accuracy' },
  { icon: '🛡️', title: 'Authentication', desc: 'Authenticating items to prevent knockoffs using advanced image recognition', badge: '100% authentic verified' },
  { icon: '⚙️', title: 'Manufacturing', desc: 'Streamlining manufacturing processes with AI-driven demand prediction', badge: 'Optimize production by 35%' },
  { icon: '🔄', title: 'Reducing Returns', desc: 'AI helps reduce returns by better matching customer preferences', badge: 'Returns reduced by 60%' },
];

const sellerFeatureCards = [
  { icon: '📢', title: 'Real-time Product Suggestions', desc: `AI-powered insights on what's trending right now.` },
  { icon: '🧠', title: 'AI-Powered Trend Detection', desc: `We TELL you what to sell with instant market insights.` },
  { icon: '🎯', title: `Sell What's Hot`, desc: `Get instant insights on what buyers are searching for most.` },
  { icon: '⏱️', title: '30-Second Listing', desc: 'List your products in just 30 seconds with our streamlined process.' },
  { icon: '💼', title: 'Scale With You', desc: `Whether you're a homegrown brand or a fashion powerhouse — we scale with you.` },
  { icon: '💵', title: 'Zero Investment, Maximum Profit', desc: 'Zero upfront investment. Maximum profit potential with hassle-free tools.' },
  { icon: '📦', title: 'Complete Business Tools', desc: 'Order tracking, payouts, and inventory management tools.' },
  { icon: '⚡', title: 'Start in Minutes', desc: `Join thousands of smart sellers growing their business. We'll guide you all the way.` },
];

const buyerFeatureCards = [
  { icon: '📷', title: 'Virtual Try-On', desc: `Upload your photo — our smart AI shows how you'll look in any outfit!` },
  { icon: '🧠', title: 'Smart AI Technology', desc: `No more second-guessing sizes or styles with our intelligent fitting system.` },
  { icon: '🧚‍♀️', title: 'Realistic Experience', desc: `Realistic virtual try-on experience from the comfort of your home.` },
  { icon: '💖', title: 'Perfect Confidence', desc: `Choose the perfect outfit with confidence every time.` },
  { icon: '🚚', title: 'Fast Delivery', desc: `Fast delivery, smooth returns, and styles you'll fall in love with.` },
  { icon: '❤️', title: 'Wishlist & Alerts', desc: `Add to wishlist, get restock alerts, and earn shopping rewards.` },
  { icon: '🔔', title: 'Restock Notifications', desc: `Never miss out on your favorite items with smart notifications.` },
  { icon: '🎁', title: 'Shopping Rewards', desc: `Earn rewards with every purchase and unlock exclusive benefits.` },
];

const LandingPage = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-200 flex flex-col">
    <LandingNavbar />
    <main className="flex-1 w-full">
      {/* Benefits Section */}
      <section className="max-w-7xl mx-auto py-16 px-4">
        <h2 className="text-4xl md:text-5xl font-extrabold text-center text-gray-900 mb-12">Benefits of Zammer</h2>
        <div className="grid md:grid-cols-2 gap-12">
          {/* Buyer Benefits */}
          <div>
            <h3 className="text-2xl font-bold text-orange-600 mb-2">As Buyer :</h3>
            <p className="text-gray-700 mb-2">We understand that as a fashion freak, going from one shop to another can be a tough task plus waiting for deliveries is another big boring story!</p>
            <p className="text-gray-700 mb-2">Zammer is a space for all the shopaholic souls to discover the latest fashion trends in their nearby stores from the comfort of their homes.</p>
            <p className="text-gray-900 font-semibold mb-4">Shop from your favorite brand stores at your nearby location.</p>
            <h4 className="font-bold text-lg mb-4">How Its Work</h4>
            <div className="flex gap-8 mb-8">
              {buyerSteps.map((step, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-4xl mb-2">{step.icon}</span>
                  <span className="font-semibold">{step.title}</span>
                  <span className="text-xs text-gray-500 text-center mt-1">{step.desc}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Seller Benefits */}
          <div>
            <h3 className="text-2xl font-bold text-orange-600 mb-2">As Seller :</h3>
            <p className="text-gray-700 mb-2">The growing fashion market is only dependent on the visibility of the latest fashion available inside the store. This brings everyday challenges in the life of local shopkeepers.</p>
            <p className="text-gray-700 mb-2">Zammer provides a platform for the sellers to expand their reach and visibility to their nearby customers.</p>
            <p className="text-gray-900 font-semibold mb-4">Serving Local Shopkeepers to Rise their Sales.</p>
            <h4 className="font-bold text-lg mb-4">How Its Work</h4>
            <div className="flex gap-8 mb-8">
              {sellerSteps.map((step, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-4xl mb-2">{step.icon}</span>
                  <span className="font-semibold">{step.title}</span>
                  <span className="text-xs text-gray-500 text-center mt-1">{step.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Virtual Try-On Experience */}
      <section className="bg-pink-50 py-16">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center px-4">
          <div className="flex flex-col items-center">
            <img src="https://i.imgur.com/0y8Ftya.png" alt="Virtual Try-On" className="w-72 rounded-2xl shadow-lg mb-4" />
            <h3 className="text-2xl font-bold text-pink-600 mb-2">Virtual Try-On Experience</h3>
            <p className="text-gray-700 mb-2">"Virtually try out how you will look like in these clothes"</p>
          </div>
          <div>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">For Buyers</h2>
            <h3 className="text-2xl font-bold text-pink-500 mb-4">Try Before You Buy, Virtually</h3>
            <p className="text-gray-700 mb-6">Only on ZAMMER! Experience the future of fashion shopping.</p>
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3"><span className="text-xl">🪞</span> Ever wondered how that kurta or dress will actually look on you?</div>
              <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3"><span className="text-xl">🎉</span> ZAMMER isn't just a marketplace. It's a fashion revolution.</div>
              <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3"><span className="text-xl">✨</span> Try on. Click. Checkout. Simple as that.</div>
            </div>
          </div>
        </div>
      </section>

      {/* For Sellers Section */}
      <section className="bg-orange-50 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">For Sellers</h2>
          <h3 className="text-3xl font-bold text-orange-500 mb-4">Make More, Worry Less</h3>
          <p className="text-gray-700 mb-8">Join ZAMMER Today and revolutionize your selling experience!</p>
          <div className="space-y-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3"><span className="text-xl">💬</span> Join thousands of smart sellers growing their business with ZAMMER.</div>
            <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3"><span className="text-xl">👉</span> Start selling in minutes – we'll guide you all the way.</div>
          </div>
        </div>
      </section>

      {/* AI-Powered Recommendations */}
      <section className="bg-purple-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-extrabold text-center text-gray-900 mb-2">AI-Powered Recommendations</h2>
          <h3 className="text-2xl text-center font-bold text-purple-500 mb-6">Elevate Your Revenue with Smart Insights</h3>
          <p className="text-center text-gray-700 mb-10">ZAMMER uses advanced AI technology to revolutionize fashion retail and maximize your business potential</p>
          <div className="grid md:grid-cols-3 gap-8">
            {aiFeatures.map((f, i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center relative">
                <span className="absolute top-2 right-2 bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded-full font-semibold">{f.badge}</span>
                <span className="text-4xl mb-3">{f.icon}</span>
                <h4 className="font-bold text-lg mb-2 text-center">{f.title}</h4>
                <p className="text-gray-600 text-center text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Promotion Section */}
      <section className="bg-orange-50 py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-2">Searching for Latest Fashion?</h2>
          <h3 className="text-4xl font-extrabold text-orange-500 mb-2">Get it from your NEAREST STORE!</h3>
          <p className="text-xl text-orange-400 mb-6">Experience the fashion in a wink</p>
          <div className="flex justify-center gap-6 mb-4">
            <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" className="h-12" />
            <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="App Store" className="h-12" />
          </div>
        </div>
      </section>

      {/* Seller Feature Cards */}
      <section className="bg-orange-50 py-12">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-8">
          {sellerFeatureCards.map((f, i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
              <span className="text-4xl mb-3">{f.icon}</span>
              <h4 className="font-bold text-lg mb-2 text-center">{f.title}</h4>
              <p className="text-gray-600 text-center text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Buyer Feature Cards */}
      <section className="bg-pink-50 py-12">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-8">
          {buyerFeatureCards.map((f, i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
              <span className="text-4xl mb-3">{f.icon}</span>
              <h4 className="font-bold text-lg mb-2 text-center">{f.title}</h4>
              <p className="text-gray-600 text-center text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>

    {/* Enhanced Footer */}
    <footer className="bg-white border-t border-orange-100">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">Z</span>
              </div>
              <h3 className="text-2xl font-bold text-orange-500">
                ZAMMER
              </h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              Revolutionizing fashion retail with AI-powered insights, virtual try-ons, and seamless local shopping experiences. 
              Connecting buyers with nearby sellers for the ultimate fashion discovery.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-orange-100 hover:bg-orange-200 rounded-full flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 bg-orange-100 hover:bg-orange-200 rounded-full flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 bg-orange-100 hover:bg-orange-200 rounded-full flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z"/>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 bg-orange-100 hover:bg-orange-200 rounded-full flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-orange-500">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-orange-500 transition-colors text-sm">About Us</a></li>
              <li><a href="#" className="text-gray-600 hover:text-orange-500 transition-colors text-sm">How It Works</a></li>
              <li><a href="#" className="text-gray-600 hover:text-orange-500 transition-colors text-sm">Success Stories</a></li>
              <li><a href="#" className="text-gray-600 hover:text-orange-500 transition-colors text-sm">Press & Media</a></li>
              <li><a href="#" className="text-gray-600 hover:text-orange-500 transition-colors text-sm">Careers</a></li>
              <li><a href="#" className="text-gray-600 hover:text-orange-500 transition-colors text-sm">Contact Us</a></li>
            </ul>
          </div>

          {/* Features & Services */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-orange-500">Features</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-orange-500 transition-colors text-sm">Virtual Try-On</a></li>
              <li><a href="#" className="text-gray-600 hover:text-orange-500 transition-colors text-sm">AI Recommendations</a></li>
              <li><a href="#" className="text-gray-600 hover:text-orange-500 transition-colors text-sm">Location-Based Search</a></li>
              <li><a href="#" className="text-gray-600 hover:text-orange-500 transition-colors text-sm">Secure Payments</a></li>
              <li><a href="#" className="text-gray-600 hover:text-orange-500 transition-colors text-sm">Fast Delivery</a></li>
              <li><a href="#" className="text-gray-600 hover:text-orange-500 transition-colors text-sm">Analytics Dashboard</a></li>
            </ul>
          </div>

          {/* Login & Access */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-orange-500">Get Started</h4>
            <div className="space-y-3">
              <a href="/user/login" className="block w-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white py-2 px-4 rounded-lg text-center text-sm font-medium transition-all transform hover:scale-105">
                Shop as Buyer
              </a>
              <a href="/seller/login" className="block w-full bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white py-2 px-4 rounded-lg text-center text-sm font-medium transition-all transform hover:scale-105">
                Sell as Seller
              </a>
              <a href="/delivery/login" className="block w-full bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white py-2 px-4 rounded-lg text-center text-sm font-medium transition-all transform hover:scale-105">
                Deliver as Agent
              </a>
              <a href="/admin/login" className="block w-full bg-gradient-to-r from-purple-400 to-purple-500 hover:from-purple-500 hover:to-purple-600 text-white py-2 px-4 rounded-lg text-center text-sm font-medium transition-all transform hover:scale-105">
                Admin Panel
              </a>
            </div>
          </div>
        </div>

        {/* App Download Section */}
        <div className="mt-12 pt-8 border-t border-orange-100">
          <div className="text-center space-y-4">
            <h4 className="text-xl font-semibold text-orange-500">Download ZAMMER App</h4>
            <p className="text-gray-600 text-sm">Get the best fashion shopping experience on your mobile device</p>
            <div className="flex justify-center space-x-4">
              <a href="#" className="hover:scale-105 transition-transform">
                <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" className="h-12" />
              </a>
              <a href="#" className="hover:scale-105 transition-transform">
                <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="App Store" className="h-12" />
              </a>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-12 pt-8 border-t border-orange-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-orange-500">10K+</div>
              <div className="text-gray-600 text-sm">Active Sellers</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-orange-500">50K+</div>
              <div className="text-gray-600 text-sm">Happy Customers</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-orange-500">100K+</div>
              <div className="text-gray-600 text-sm">Products Listed</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-orange-500">500+</div>
              <div className="text-gray-600 text-sm">Cities Covered</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="bg-orange-50 border-t border-orange-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <p className="text-gray-600 text-sm">
                © 2025 <span className="text-orange-500 font-semibold">ZAMMER RETAIL PRIVATE LIMITED</span> - All Rights Reserved
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Empowering local fashion businesses with cutting-edge technology
              </p>
            </div>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="text-gray-600 hover:text-orange-500 transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-600 hover:text-orange-500 transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-600 hover:text-orange-500 transition-colors">Cookie Policy</a>
              <a href="#" className="text-gray-600 hover:text-orange-500 transition-colors">Help Center</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
);

export default LandingPage; 