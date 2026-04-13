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
              Connecting the UK's motorhome community with a Proper Place to stay the night.
            </p>
          </div>

          {/* For Motorhomers */}
          <div>
            <h4 className="font-semibold mb-4">For Motorhomers</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/auth/signup" className="hover:text-light-blue">Create Account</Link></li>
              <li><Link href="/browse" className="hover:text-light-blue">Find a Proper Place</Link></li>
              <li><Link href="/how-it-works" className="hover:text-light-blue">How It Works</Link></li>
              <li><Link href="/about" className="hover:text-light-blue">About Proper Place</Link></li>
            </ul>
          </div>

          {/* For Hosts */}
          <div>
            <h4 className="font-semibold mb-4">For Hosts</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/become-host" className="hover:text-light-blue">List Your Space</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/contact" className="hover:text-light-blue">Contact Us</Link></li>
              <li><Link href="/privacy" className="hover:text-light-blue">Privacy Policy</Link></li>
              <li><Link href="/cookies" className="hover:text-light-blue">Cookie Policy</Link></li>
              <li><Link href="/terms" className="hover:text-light-blue">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <hr className="border-gray-700 my-8" />

        <div className="flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm">
          <p>&copy; {currentYear} Proper Place. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
