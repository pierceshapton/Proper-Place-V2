import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Learn about how Proper Place uses cookies and similar technologies on our website and app.',
  alternates: {
    canonical: 'https://proper-place.co.uk/cookies',
  },
};

export default function CookiesPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="bg-dark-bg text-white py-16">
        <div className="container-md">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Cookie Policy</h1>
          <p className="text-gray-400">Last updated: March 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-white">
        <div className="container-md">
          <div className="max-w-4xl mx-auto prose prose-lg">
            
            <h2 className="text-2xl font-bold mt-8 mb-4">What Are Cookies?</h2>
            <p className="text-gray-600 mb-6">
              Cookies are small text files that are stored on your device when you visit a website. They help the 
              website remember your preferences and understand how you use the site. This is standard practice for 
              most modern websites.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">How We Use Cookies</h2>
            <p className="text-gray-600 mb-4">
              Proper Place uses cookies and similar technologies for the following purposes:
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Essential Cookies (Required)</h3>
            <p className="text-gray-600 mb-4">
              These cookies are necessary for the website to function properly. They enable core functionality such as:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Keeping you logged in during your session</li>
              <li>Remembering items in your booking process</li>
              <li>Security features to protect your account</li>
              <li>Cookie consent preferences</li>
            </ul>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">
                <strong>Legal basis:</strong> Legitimate interest - these cookies are strictly necessary for the operation of our service.
              </p>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-3">Analytics Cookies (Optional)</h3>
            <p className="text-gray-600 mb-4">
              These cookies help us understand how visitors interact with our website by collecting anonymous information:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Pages visited and time spent on each page</li>
              <li>How you found our website</li>
              <li>Browser and device information</li>
              <li>General location (country/city level)</li>
            </ul>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">
                <strong>Legal basis:</strong> Consent - we only use analytics cookies if you accept them.
              </p>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-3">Marketing Cookies (Optional)</h3>
            <p className="text-gray-600 mb-4">
              These cookies may be set by our advertising partners to build a profile of your interests:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>To show you relevant advertisements on other websites</li>
              <li>To limit the number of times you see an advert</li>
              <li>To measure the effectiveness of advertising campaigns</li>
            </ul>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">
                <strong>Legal basis:</strong> Consent - we only use marketing cookies if you accept them.
              </p>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">Cookie List</h2>
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Cookie Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Purpose</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Duration</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-600">cookie-consent</td>
                    <td className="px-4 py-3 text-sm text-gray-600">Stores your cookie preferences</td>
                    <td className="px-4 py-3 text-sm text-gray-600">1 year</td>
                    <td className="px-4 py-3 text-sm text-gray-600">Essential</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-600">session_token</td>
                    <td className="px-4 py-3 text-sm text-gray-600">Maintains your login session</td>
                    <td className="px-4 py-3 text-sm text-gray-600">Session</td>
                    <td className="px-4 py-3 text-sm text-gray-600">Essential</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">Managing Your Cookie Preferences</h2>
            <p className="text-gray-600 mb-4">
              You can manage your cookie preferences in several ways:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li><strong>Cookie Banner:</strong> When you first visit our site, you can choose which cookies to accept</li>
              <li><strong>Browser Settings:</strong> Most browsers allow you to block or delete cookies through their settings</li>
              <li><strong>Device Settings:</strong> You can manage cookies on mobile devices through your device settings</li>
            </ul>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Blocking essential cookies may prevent parts of our website from functioning correctly.
              </p>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">Third-Party Cookies</h2>
            <p className="text-gray-600 mb-6">
              Some cookies on our site are set by third-party services we use:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li><strong>Stripe:</strong> For secure payment processing</li>
              <li><strong>Google Maps:</strong> For displaying location maps</li>
            </ul>
            <p className="text-gray-600 mb-6">
              These third parties have their own privacy and cookie policies which govern how they use your data.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">Updates to This Policy</h2>
            <p className="text-gray-600 mb-6">
              We may update this Cookie Policy from time to time to reflect changes in our practices or for legal reasons. 
              We will notify you of any material changes by updating the &quot;Last updated&quot; date at the top of this page.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">Contact Us</h2>
            <p className="text-gray-600 mb-6">
              If you have questions about our use of cookies, please contact us:
            </p>
            <div className="bg-light-blue/10 rounded-2xl p-6">
              <p className="text-gray-600 text-center">
                Email: <strong>privacy@properplace.co.uk</strong>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
