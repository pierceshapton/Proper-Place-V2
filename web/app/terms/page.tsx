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
          <p className="text-gray-400">Last updated: April 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-white">
        <div className="container-md">
          <div className="max-w-4xl mx-auto">

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

            <h2 className="text-2xl font-bold mt-8 mb-4">6. Payments, Authorisation &amp; Fund Holding</h2>
            <p className="text-gray-600 mb-4">
              All payments are processed securely through our platform via Stripe. Hosts set their own prices and 
              Proper Place may charge a service fee to facilitate bookings.
            </p>
            <p className="text-gray-600 mb-4">
              <strong>6.1 Payment Authorisation.</strong> When a Guest submits a booking request, their chosen payment method is 
              authorised for the full booking amount. This authorisation places a temporary hold on the funds but does not 
              constitute a charge. No funds are transferred at this stage.
            </p>
            <p className="text-gray-600 mb-4">
              <strong>6.2 Host Approval &amp; Payment Capture.</strong> Payment is captured by Stripe once the Host has 
              approved the Guest&apos;s stay. If the Host does not approve the booking, the authorisation hold is released by Stripe and 
              no charge is made to the Guest&apos;s payment method. Proper Place does not capture or process any payments directly.
            </p>
            <p className="text-gray-600 mb-4">
              <strong>6.3 Fund Holding.</strong> All captured funds are held securely by Stripe - not by Proper Place - until the 
              stay has been completed. Proper Place never holds, controls, or has custody of Guest funds at any stage. 
              Funds are disbursed to the Host by Stripe following the successful completion of the Guest&apos;s stay. 
              This holding period serves as protection for both Hosts and Guests in the event of a dispute, cancellation, or damage claim.
            </p>
            <p className="text-gray-600 mb-4">
              <strong>6.4 Release of Funds.</strong> Upon completion of the stay (defined as the check-out date and time having 
              passed without an active dispute), Stripe will release funds to the Host in accordance with the applicable 
              disbursement schedule. Proper Place may instruct Stripe to delay disbursement where a dispute has been raised 
              or where there is a reasonable suspicion of fraud or breach of these Terms.
            </p>
            <p className="text-gray-600 mb-6">
              <strong>6.5 Refunds.</strong> Where a booking is cancelled in accordance with the applicable cancellation policy, 
              or where a Host rejects a booking request, the Guest shall receive a full refund of the authorised amount. 
              Refund processing times may vary depending on the Guest&apos;s payment provider.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">7. Cancellation Policy</h2>
            <p className="text-gray-600 mb-4">
              <strong>7.1</strong> Guests may cancel a pending booking (prior to Host approval) at any time. The payment 
              authorisation hold will be released and no charge will be made.
            </p>
            <p className="text-gray-600 mb-4">
              <strong>7.2</strong> Guests may cancel a confirmed booking (after Host approval) up to 24 hours before the 
              scheduled check-in time for a full refund. Cancellations made within 24 hours of check-in may be subject to 
              a cancellation fee as determined by the Host&apos;s cancellation policy.
            </p>
            <p className="text-gray-600 mb-4">
              <strong>7.3</strong> Hosts may reject a pending booking request at their discretion. The Guest&apos;s payment 
              authorisation hold will be released immediately upon rejection.
            </p>
            <p className="text-gray-600 mb-6">
              <strong>7.4</strong> Hosts may cancel a confirmed booking. In such cases, the Guest will receive a full 
              refund and Proper Place may, at its discretion, assist the Guest in finding alternative accommodation.
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
