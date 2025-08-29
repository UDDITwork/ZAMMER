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

    {/* Footer */}
    <footer className="bg-gray-900 text-white py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center">
          <p className="text-sm text-gray-400">
            © 2025 ZAMMER RETAIL PRIVATE LIMITED ALL RIGHTS RESERVED
          </p>
        </div>
      </div>
    </footer>
  </div>
);

export default LandingPage; 