export const metadata = {
  title: 'Privacy Policy | Proper Place',
  description: 'Learn how Proper Place collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="bg-dark-bg text-white py-16">
        <div className="container-md">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-gray-400">Last updated: February 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-white">
        <div className="container-md">
          <div className="max-w-4xl mx-auto prose prose-lg">
            <div className="bg-gray-50 rounded-2xl p-8 mb-8">
              <p className="text-gray-600 italic text-center">
                Full privacy policy details coming soon.
              </p>
              <p className="text-gray-500 text-center mt-4">
                We are committed to protecting your privacy and will publish our complete privacy policy shortly.
              </p>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">Overview</h2>
            <p className="text-gray-600 mb-6">
              At Proper Place, we take your privacy seriously. This policy outlines how we collect, use, and protect 
              your personal information when you use our platform.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">Information We Collect</h2>
            <p className="text-gray-600 mb-4">We may collect the following types of information:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Account information (name, email address, phone number)</li>
              <li>Profile information you choose to provide</li>
              <li>Location data when using our map features</li>
              <li>Communication between hosts and travellers</li>
              <li>Payment information (processed securely by our payment provider)</li>
              <li>Device and usage information</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Provide and improve our services</li>
              <li>Facilitate bookings between hosts and travellers</li>
              <li>Process payments securely</li>
              <li>Communicate important updates</li>
              <li>Ensure the safety and security of our community</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">Data Protection</h2>
            <p className="text-gray-600 mb-6">
              We implement appropriate security measures to protect your personal information. Your data is encrypted 
              in transit and at rest, and we regularly review our security practices.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">Your Rights</h2>
            <p className="text-gray-600 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Data portability</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">Contact Us</h2>
            <p className="text-gray-600 mb-6">
              If you have any questions about this privacy policy or how we handle your data, please contact us 
              through our contact page.
            </p>

            <div className="bg-light-blue/10 rounded-2xl p-6 mt-8">
              <p className="text-gray-600 text-center">
                For privacy-related inquiries, please email: <strong>privacy@properplace.co.uk</strong>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
