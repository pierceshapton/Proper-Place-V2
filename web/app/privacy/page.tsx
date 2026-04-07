import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Learn how Proper Place collects, uses, and protects your personal information when using our motorhome stays platform. GDPR compliant.',
  alternates: {
    canonical: 'https://proper-place.co.uk/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="bg-dark-bg text-white py-16">
        <div className="container-md">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-gray-400">Last updated: March 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-white">
        <div className="container-md">
          <div className="max-w-4xl mx-auto prose prose-lg">
            
            {/* Data Controller Information */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-8">
              <h3 className="text-lg font-semibold mb-2">Data Controller</h3>
              <p className="text-gray-600 text-sm mb-1">
                <strong>Proper Place Ltd</strong><br />
                Registered in England and Wales<br />
                Email: <a href="mailto:privacy@properplace.co.uk" className="text-light-blue">privacy@properplace.co.uk</a>
              </p>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-6">
              At Proper Place, we are committed to protecting your privacy and ensuring the security of your personal data. 
              This Privacy Policy explains how we collect, use, store, and protect your information in compliance with the 
              UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">2. Information We Collect</h2>
            <p className="text-gray-600 mb-4">We collect the following categories of personal data:</p>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">Account Information</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Full name</li>
              <li>Email address</li>
              <li>Phone number (optional)</li>
              <li>Password (encrypted)</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">Profile Information</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Profile photo (optional)</li>
              <li>Bio/description (optional)</li>
              <li>Vehicle details (registration, dimensions)</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">Booking &amp; Transaction Data</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Booking history and preferences</li>
              <li>Payment information (processed by Stripe &mdash; we do not store card details)</li>
              <li>Payment authorisation and capture status (pending, confirmed, refunded)</li>
              <li>Fund holding records associated with completed stays</li>
              <li>Reviews and ratings</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">Technical Data</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>IP address</li>
              <li>Device type and operating system</li>
              <li>Browser type</li>
              <li>Location data (when using map features, with your consent)</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">We process your data based on the following legal bases:</p>
            
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Purpose</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Legal Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-600">Creating and managing your account</td>
                    <td className="px-4 py-3 text-sm text-gray-600">Contract performance</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-600">Processing bookings and payments</td>
                    <td className="px-4 py-3 text-sm text-gray-600">Contract performance</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-600">Facilitating payment authorisation and fund holding via Stripe (our third-party payment processor) pending Host approval and stay completion. All funds are held by Stripe, not Proper Place.</td>
                    <td className="px-4 py-3 text-sm text-gray-600">Contract performance / Legitimate interest</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-600">Sending booking confirmations and updates</td>
                    <td className="px-4 py-3 text-sm text-gray-600">Contract performance</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-600">Facilitating communication between hosts and guests</td>
                    <td className="px-4 py-3 text-sm text-gray-600">Contract performance</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-600">Preventing fraud and ensuring platform security</td>
                    <td className="px-4 py-3 text-sm text-gray-600">Legitimate interest</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-600">Sending marketing communications</td>
                    <td className="px-4 py-3 text-sm text-gray-600">Consent (you can opt out anytime)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-600">Analytics to improve our services</td>
                    <td className="px-4 py-3 text-sm text-gray-600">Consent / Legitimate interest</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-600">Legal compliance (tax records, disputes)</td>
                    <td className="px-4 py-3 text-sm text-gray-600">Legal obligation</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">4. Data Retention</h2>
            <p className="text-gray-600 mb-4">We retain your personal data for the following periods:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li><strong>Account data:</strong> Until you delete your account, plus 30 days for backup purposes</li>
              <li><strong>Booking records:</strong> 7 years (required for tax and legal purposes)</li>
              <li><strong>Payment records:</strong> 7 years (legal requirement)</li>
              <li><strong>Messages:</strong> 2 years after the related booking</li>
              <li><strong>Technical logs:</strong> 90 days</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">5. Data Sharing</h2>
            <p className="text-gray-600 mb-4">We share your data with the following third parties:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li><strong>Stripe:</strong> Payment processing, fund holding, and host payouts (PCI-DSS compliant). All customer funds are held by Stripe — Proper Place never holds or has custody of user funds.</li>
              <li><strong>DigitalOcean:</strong> Cloud hosting and database services (EU/UK data centres)</li>
              <li><strong>Google Maps:</strong> Location and mapping services</li>
              <li><strong>Email service providers:</strong> For transactional emails</li>
            </ul>
            <p className="text-gray-600 mb-6">
              We do not sell your personal data to third parties. All our service providers are bound by data processing 
              agreements and are required to protect your data in accordance with UK GDPR.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">6. International Transfers</h2>
            <p className="text-gray-600 mb-6">
              Your data is primarily stored within the UK and European Economic Area. Where we use service providers 
              outside these regions, we ensure appropriate safeguards are in place, such as Standard Contractual Clauses 
              approved by the UK Information Commissioner&apos;s Office (ICO).
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">7. Your Rights Under UK GDPR</h2>
            <p className="text-gray-600 mb-4">You have the following rights regarding your personal data:</p>
            
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Right of Access</h4>
                <p className="text-sm text-gray-600">Request a copy of all data we hold about you.</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Right to Rectification</h4>
                <p className="text-sm text-gray-600">Request correction of inaccurate personal data.</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Right to Erasure</h4>
                <p className="text-sm text-gray-600">Request deletion of your personal data (&quot;right to be forgotten&quot;).</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Right to Data Portability</h4>
                <p className="text-sm text-gray-600">Receive your data in a machine-readable format.</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Right to Restrict Processing</h4>
                <p className="text-sm text-gray-600">Request we limit how we use your data.</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Right to Object</h4>
                <p className="text-sm text-gray-600">Object to processing based on legitimate interests.</p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              To exercise any of these rights, please contact us at{' '}
              <a href="mailto:privacy@properplace.co.uk" className="text-light-blue hover:underline">privacy@properplace.co.uk</a>. 
              We will respond within one month as required by UK GDPR.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Export Your Data:</strong> You can download a copy of all your personal data directly from your 
                account settings in the app, or by contacting us.
              </p>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">8. Data Security</h2>
            <p className="text-gray-600 mb-4">We implement appropriate security measures including:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Encryption of data in transit (HTTPS/TLS)</li>
              <li>Encryption of sensitive data at rest</li>
              <li>Secure password hashing (bcrypt)</li>
              <li>Regular security audits</li>
              <li>Access controls and authentication</li>
              <li>Rate limiting to prevent abuse</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">9. Cookies</h2>
            <p className="text-gray-600 mb-6">
              We use cookies and similar technologies to improve your experience. For detailed information about the 
              cookies we use and how to manage them, please see our{' '}
              <Link href="/cookies" className="text-light-blue hover:underline">Cookie Policy</Link>.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">10. Children&apos;s Privacy</h2>
            <p className="text-gray-600 mb-6">
              Our services are not directed at children under 18 years of age. We do not knowingly collect personal 
              data from children. If you believe a child has provided us with personal data, please contact us 
              immediately.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">11. Changes to This Policy</h2>
            <p className="text-gray-600 mb-6">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by 
              email or through the app. The &quot;Last updated&quot; date at the top shows when this policy was last revised.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">12. Complaints</h2>
            <p className="text-gray-600 mb-6">
              If you are not satisfied with how we handle your personal data, you have the right to lodge a complaint 
              with the Information Commissioner&apos;s Office (ICO):
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">
                <strong>Information Commissioner&apos;s Office</strong><br />
                Website: <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-light-blue hover:underline">ico.org.uk</a><br />
                Helpline: 0303 123 1113
              </p>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">13. Contact Us</h2>
            <p className="text-gray-600 mb-6">
              For any questions about this Privacy Policy or to exercise your data rights:
            </p>
            <div className="bg-light-blue/10 rounded-2xl p-6">
              <p className="text-gray-600 text-center">
                Email: <strong><a href="mailto:privacy@properplace.co.uk" className="text-light-blue hover:underline">privacy@properplace.co.uk</a></strong><br />
                <span className="text-sm text-gray-500 mt-2 block">We aim to respond within 48 hours</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
