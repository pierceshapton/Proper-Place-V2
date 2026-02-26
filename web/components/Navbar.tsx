'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-dark-bg text-white shadow-lg">
      <div className="container-md flex justify-between items-center py-4">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold">
          <span className="text-light-blue">Proper</span> Place
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-8">
          <Link href="/" className="hover:text-light-blue transition">
            Home
          </Link>
          <Link href="/browse" className="hover:text-light-blue transition">
            Browse Venues
          </Link>
          <Link href="/become-host" className="hover:text-light-blue transition">
            Become a Host
          </Link>
          <Link href="/contact-host" className="hover:text-light-blue transition">
            Host Inquiry
          </Link>
        </div>

        {/* Auth Buttons */}
        <div className="hidden md:flex gap-4">
          <Link href="/login" className="btn-secondary py-2 px-4 text-sm">
            Login
          </Link>
          <Link href="/signup" className="btn-primary py-2 px-4 text-sm">
            Sign Up
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-light-blue text-2xl"
          onClick={() => setIsOpen(!isOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-gray-800 px-6 py-4 space-y-3">
          <Link href="/" className="block hover:text-light-blue transition">
            Home
          </Link>
          <Link href="/browse" className="block hover:text-light-blue transition">
            Browse Venues
          </Link>
          <Link href="/become-host" className="block hover:text-light-blue transition">
            Become a Host
          </Link>
          <Link href="/contact-host" className="block hover:text-light-blue transition">
            Host Inquiry
          </Link>
          <hr className="my-3 border-gray-600" />
          <Link href="/login" className="block hover:text-light-blue transition">
            Login
          </Link>
          <Link href="/signup" className="block hover:text-light-blue transition">
            Sign Up
          </Link>
        </div>
      )}
    </nav>
  );
}
