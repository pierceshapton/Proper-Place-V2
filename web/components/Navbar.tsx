'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="bg-dark-bg text-white shadow-lg sticky top-0 z-50 w-full">
      <div className="px-4 sm:px-6 lg:px-8 flex justify-between items-center py-4">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold flex items-center gap-3">
          <Image
            src="/logo-192.png"
            alt="Proper Place Van"
            width={80}
            height={80}
            className="object-contain"
          />
          <span className="text-light-blue">Proper</span> Place
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-8">
          <Link href="/" className={`transition ${pathname === '/' ? 'text-white' : 'text-gray-400 hover:text-light-blue'}`}>
            Home
          </Link>
          <Link href="/browse" className={`transition ${pathname === '/browse' ? 'text-white' : 'text-gray-400 hover:text-light-blue'}`}>
            Proper Place Map
          </Link>
          <Link href="/become-host" className={`transition ${pathname === '/become-host' ? 'text-white' : 'text-gray-400 hover:text-light-blue'}`}>
            Become a Host
          </Link>
          <Link href="/contact-host" className={`transition ${pathname === '/contact-host' ? 'text-white' : 'text-gray-400 hover:text-light-blue'}`}>
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
        <div className="md:hidden bg-gray-800 px-4 sm:px-6 lg:px-8 py-4 space-y-3">
          <Link href="/" className={`block transition ${pathname === '/' ? 'text-white' : 'text-gray-400 hover:text-light-blue'}`}>
            Home
          </Link>
          <Link href="/browse" className={`block transition ${pathname === '/browse' ? 'text-white' : 'text-gray-400 hover:text-light-blue'}`}>
            Proper Place Map
          </Link>
          <Link href="/become-host" className={`block transition ${pathname === '/become-host' ? 'text-white' : 'text-gray-400 hover:text-light-blue'}`}>
            Become a Host
          </Link>
          <Link href="/contact-host" className={`block transition ${pathname === '/contact-host' ? 'text-white' : 'text-gray-400 hover:text-light-blue'}`}>
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
