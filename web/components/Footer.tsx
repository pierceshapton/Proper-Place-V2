import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark-bg text-white pt-12 pb-6">
      <div className="container-md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="font-bold text-lg mb-4">
              <span className="text-light-blue">Proper</span> Place
            </h3>
            <p className="text-gray-400 text-sm">
              Discover unique venues and create unforgettable moments with friends and colleagues.
            </p>
          </div>

          {/* For Guests */}
          <div>
            <h4 className="font-semibold mb-4">For Guests</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/browse" className="hover:text-light-blue">Browse Venues</Link></li>
              <li><Link href="#" className="hover:text-light-blue">How It Works</Link></li>
              <li><Link href="#" className="hover:text-light-blue">My Bookings</Link></li>
              <li><Link href="#" className="hover:text-light-blue">Reviews</Link></li>
            </ul>
          </div>

          {/* For Hosts */}
          <div>
            <h4 className="font-semibold mb-4">For Hosts</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/become-host" className="hover:text-light-blue">List Your Space</Link></li>
              <li><Link href="/contact-host" className="hover:text-light-blue">Host Inquiry</Link></li>
              <li><Link href="#" className="hover:text-light-blue">Hosting Guide</Link></li>
              <li><Link href="#" className="hover:text-light-blue">Earnings</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="#" className="hover:text-light-blue">Contact Us</Link></li>
              <li><Link href="#" className="hover:text-light-blue">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-light-blue">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-light-blue">Help Center</Link></li>
            </ul>
          </div>
        </div>

        <hr className="border-gray-700 my-8" />

        <div className="flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm">
          <p>&copy; {currentYear} Proper Place. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-light-blue">Facebook</a>
            <a href="#" className="hover:text-light-blue">Twitter</a>
            <a href="#" className="hover:text-light-blue">Instagram</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
