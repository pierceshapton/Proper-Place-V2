import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of service for using the Proper Place motorhome stays platform. Rules and guidelines for guests and hosts.',
  alternates: {
    canonical: 'https://proper-place.co.uk/terms',
  },
};

export default function TermsPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="bg-dark-bg text-white py-16">
        <div className="container-md">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
          <p className="text-gray-400">Last updated: February 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-white">
        <div className="container-md">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-50 rounded-2xl p-8 mb-8">
              <p className="text-gray-600 italic text-center">
                Full terms of service details coming soon.
              </p>
              <p className="text-gray-500 text-center mt-4">
                We are finalising our terms of service and will publish the complete document shortly.
              </p>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 mb-6">
              By accessing or using Proper Place, you agree to be bound by these Terms of Service. If you do not 
              agree to these terms, please do not use our services.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">2. Description of Service</h2>
            <p className="text-gray-600 mb-6">
              Proper Place is a platform that connects motorhome owners with landowners offering overnight 
              parking spaces. We facilitate the connection between hosts and guests but are not a party to 
              any agreement between them.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">3. User Accounts</h2>
            <p className="text-gray-600 mb-4">When creating an account, you agree to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">4. Host Responsibilities</h2>
            <p className="text-gray-600 mb-4">As a host, you are responsible for:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Ensuring your listing is accurate and up-to-date</li>
              <li>Having appropriate permissions to host motorhomes</li>
              <li>Complying with all local regulations and laws</li>
              <li>Providing a safe environment for guests</li>
              <li>Maintaining appropriate insurance coverage</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">5. Guest Responsibilities</h2>
            <p className="text-gray-600 mb-4">As a guest, you are responsible for:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Respecting the host's property and rules</li>
              <li>Leaving the site as you found it</li>
              <li>Complying with all host requirements</li>
              <li>Maintaining valid vehicle insurance</li>
              <li>Arriving and departing at agreed times</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">6. Payments</h2>
            <p className="text-gray-600 mb-6">
              All payments are processed securely through our platform. Hosts set their own prices and 
              Proper Place may charge a service fee to facilitate bookings.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">7. Cancellation Policy</h2>
            <p className="text-gray-600 mb-6">
              Cancellation policies vary by listing. Please review the specific policy for each booking 
              before confirming your reservation.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">8. Prohibited Activities</h2>
            <p className="text-gray-600 mb-4">Users are prohibited from:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Creating fraudulent or misleading listings</li>
              <li>Harassing other users</li>
              <li>Violating any laws or regulations</li>
              <li>Circumventing our payment system</li>
              <li>Using the platform for any illegal purpose</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-600 mb-6">
              Proper Place acts as a platform connecting hosts and guests. We are not responsible for 
              the actions of users or the condition of listed properties. Users engage with each other at 
              their own risk.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">10. Changes to Terms</h2>
            <p className="text-gray-600 mb-6">
              We reserve the right to modify these terms at any time. Continued use of the platform after 
              changes constitutes acceptance of the modified terms.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">11. Contact</h2>
            <p className="text-gray-600 mb-6">
              For questions about these Terms of Service, please contact us through our contact page.
            </p>

            <div className="bg-light-blue/10 rounded-2xl p-6 mt-8">
              <p className="text-gray-600 text-center">
                For legal inquiries, please email: <strong>legal@properplace.co.uk</strong>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
