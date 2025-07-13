import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../routes';

const navLinks = [
  { to: ROUTES.USER_LOGIN, label: 'User Login', className: 'text-blue-700' },
  { to: ROUTES.USER_REGISTER, label: 'User Register', className: 'text-blue-700' },
  { to: ROUTES.SELLER_LOGIN, label: 'Seller Login', className: 'text-purple-700' },
  { to: ROUTES.SELLER_REGISTER, label: 'Seller Register', className: 'text-purple-700' },
  { to: '/about', label: 'About', className: 'text-gray-700' },
  { to: ROUTES.POLICY_CONTACT, label: 'Contact', className: 'text-gray-700' },
  { to: ROUTES.POLICY_SHIPPING, label: 'Shipping', className: 'text-gray-700' },
  { to: ROUTES.POLICY_TERMS, label: 'Terms', className: 'text-gray-700' },
  { to: ROUTES.POLICY_REFUND, label: 'Refund', className: 'text-gray-700' },
  { to: ROUTES.POLICY_PRIVACY, label: 'Privacy', className: 'text-gray-700' },
];

const LandingNavbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md py-4 px-4 md:px-8 flex flex-wrap justify-between items-center relative z-20">
      <div className="text-2xl font-bold text-blue-700 tracking-wide">
        <Link to={ROUTES.LANDING}>ZAMMER</Link>
      </div>
      {/* Hamburger for mobile */}
      <button
        className="md:hidden flex items-center px-3 py-2 border rounded text-blue-700 border-blue-700 ml-auto"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle navigation"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {/* Desktop nav */}
      <div className="hidden md:flex flex-wrap gap-4 items-center">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition ${link.className}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      {/* Mobile nav dropdown */}
      {open && (
        <div className="absolute top-full left-0 w-full bg-white shadow-lg rounded-b-lg flex flex-col items-center py-4 md:hidden animate-fade-in z-30">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`w-full text-center px-4 py-3 font-semibold hover:bg-blue-50 transition ${link.className}`}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default LandingNavbar; 