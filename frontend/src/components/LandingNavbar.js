import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../routes';

const navLinks = [
  { to: ROUTES.USER_LOGIN, label: 'Shop', type: 'primary' },
  { to: ROUTES.SELLER_LOGIN, label: 'Sell', type: 'secondary' },
  { to: '/delivery/login', label: 'Deliver', type: 'secondary' },
  { to: '/about', label: 'About', type: 'link' },
  { to: ROUTES.POLICY_CONTACT, label: 'Contact', type: 'link' },
];

const LandingNavbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-slate-900/95 backdrop-blur-md shadow-2xl border-b border-orange-300/20' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link 
            to={ROUTES.LANDING} 
            className="flex items-center space-x-3 group"
          >
            <img 
              src="/logo512.png" 
              alt="ZAMMER Logo" 
              className="w-12 h-12 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300"
            />
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight group-hover:text-orange-300 transition-colors duration-300">
                ZAMMER
              </h1>
              <p className="text-orange-200 text-xs font-medium">Fashion Revolution</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 hover:scale-105 transform ${
                  link.type === 'primary' 
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg hover:shadow-orange-500/25'
                    : link.type === 'secondary'
                    ? 'border-2 border-orange-300 text-orange-200 hover:bg-orange-300 hover:text-orange-900'
                    : 'text-orange-200 hover:text-white hover:bg-white/10 px-4 py-2 rounded-lg'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden flex items-center justify-center w-12 h-12 bg-white/10 hover:bg-orange-500/20 rounded-xl transition-all duration-300"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
          >
            <svg 
              className={`w-6 h-6 text-white transition-transform duration-300 ${open ? 'rotate-90' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className={`lg:hidden transition-all duration-300 overflow-hidden ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl mt-4 p-6 space-y-4 border border-orange-300/20">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`block w-full text-center py-4 rounded-xl font-bold transition-all duration-300 ${
                  link.type === 'primary' 
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700'
                    : link.type === 'secondary'
                    ? 'border-2 border-orange-300 text-orange-200 hover:bg-orange-300 hover:text-orange-900'
                    : 'text-orange-200 hover:text-white hover:bg-white/10'
                }`}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default LandingNavbar; 