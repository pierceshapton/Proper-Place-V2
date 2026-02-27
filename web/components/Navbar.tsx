'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="bg-dark-bg text-white shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8 flex justify-between items-center py-4 relative">
        {/* Logo */}
        <Link href="/" className="text-xl lg:text-2xl font-bold flex items-center gap-2 lg:gap-3 flex-shrink-0">
          <Image
            src="/logo-192.png"
            alt="Proper Place Van"
            width={80}
            height={80}
            className="object-contain w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20"
          />
          <span className="whitespace-nowrap"><span className="text-light-blue">Proper</span> Place</span>
        </Link>

        {/* Desktop Menu - Only show on lg screens and up (1024px+) */}
        <div className="hidden lg:flex gap-6 xl:gap-8 absolute left-1/2 transform -translate-x-1/2">
          <Link href="/" className={`transition whitespace-nowrap ${pathname === '/' ? 'text-white' : 'text-gray-400 hover:text-light-blue'}`}>
            Home
          </Link>
          <Link href="/download" className={`transition whitespace-nowrap ${pathname === '/download' ? 'text-white' : 'text-gray-400 hover:text-light-blue'}`}>
            Download App
          </Link>
          <Link href="/browse" className={`transition whitespace-nowrap ${pathname === '/browse' ? 'text-white' : 'text-gray-400 hover:text-light-blue'}`}>
            Proper Place Map
          </Link>
          <Link href="/become-host" className={`transition whitespace-nowrap ${pathname === '/become-host' ? 'text-white' : 'text-gray-400 hover:text-light-blue'}`}>
            Become a Host
          </Link>
        </div>

        {/* Auth Buttons - Only show on lg screens and up */}
        <div className="hidden lg:flex gap-3 xl:gap-4 flex-shrink-0">
          <Link href="/auth/login" className="btn-secondary py-2 px-3 xl:px-4 text-sm">
            Login
          </Link>
          <Link href="/auth/signup" className="btn-primary py-2 px-3 xl:px-4 text-sm">
            Sign Up
          </Link>
        </div>

        {/* Mobile/Tablet Menu Button - Show on screens below lg (1024px) */}
        <button 
          className="lg:hidden text-light-blue text-2xl p-2"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      {/* Mobile/Tablet Menu - Show on screens below lg (1024px) */}
      {isOpen && (
        <div className="lg:hidden bg-gray-800 px-4 sm:px-6 py-4 space-y-3">
          <Link 
            href="/" 
            className={`block py-2 transition ${pathname === '/' ? 'text-white' : 'text-gray-400 hover:text-light-blue'}`}
            onClick={() => setIsOpen(false)}
          >
            Home
          </Link>
          <Link 
            href="/download" 
            className={`block py-2 transition ${pathname === '/download' ? 'text-white' : 'text-gray-400 hover:text-light-blue'}`}
            onClick={() => setIsOpen(false)}
          >
            Download App
          </Link>
          <Link 
            href="/browse" 
            className={`block py-2 transition ${pathname === '/browse' ? 'text-white' : 'text-gray-400 hover:text-light-blue'}`}
            onClick={() => setIsOpen(false)}
          >
            Proper Place Map
          </Link>
          <Link 
            href="/become-host" 
            className={`block py-2 transition ${pathname === '/become-host' ? 'text-white' : 'text-gray-400 hover:text-light-blue'}`}
            onClick={() => setIsOpen(false)}
          >
            Become a Host
          </Link>
          <hr className="my-3 border-gray-600" />
          <Link 
            href="/auth/login" 
            className="block py-2 hover:text-light-blue transition"
            onClick={() => setIsOpen(false)}
          >
            Login
          </Link>
          <Link 
            href="/auth/signup" 
            className="block py-2 hover:text-light-blue transition"
            onClick={() => setIsOpen(false)}
          >
            Sign Up
          </Link>
        </div>
      )}
    </nav>
  );
}
