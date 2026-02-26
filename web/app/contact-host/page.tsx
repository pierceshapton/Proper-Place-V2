'use client';

import { useState } from 'react';

export default function ContactHostPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    propertyType: '',
    propertySize: '',
    availability: '',
    message: '',
    terms: false,
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Send to backend API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          message: `Host Inquiry\n\nLocation: ${formData.location}\nProperty Type: ${formData.propertyType}\nProperty Size: ${formData.propertySize}\nAvailability: ${formData.availability}\n\nMessage: ${formData.message}`,
          type: 'host_inquiry',
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          location: '',
          propertyType: '',
          propertySize: '',
          availability: '',
          message: '',
          terms: false,
        });

        // Reset success message after 5 seconds
        setTimeout(() => setSubmitted(false), 5000);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      {/* Hero Section */}
      <section className="bg-light-gray text-gray-800 py-10 md:py-14">
        <div className="container-md">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              Interested in Hosting?
            </h1>
            <p className="text-xl text-gray-600">
              Join our community of hosts and start earning by sharing your unique space with guests
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="section-padding">
        <div className="container-md max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Info Column */}
            <div>
              <h2 className="text-3xl font-bold mb-6">Why Host with Us?</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-light-blue mb-2">Earn Money</h3>
                  <p className="text-gray-600">Set your own prices and earn competitive rates for your space</p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-light-blue mb-2">Safety First</h3>
                  <p className="text-gray-600">Verified guests and secure payment processing for peace of mind</p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-light-blue mb-2">Full Control</h3>
                  <p className="text-gray-600">Manage your own availability and accept or decline bookings</p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-light-blue mb-2">Community</h3>
                  <p className="text-gray-600">Connect with fellow hosts and share experiences and tips</p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-light-blue mb-2">Dashboard</h3>
                  <p className="text-gray-600">Track bookings, earnings, and guest reviews in real-time</p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-light-blue mb-2">Marketing</h3>
                  <p className="text-gray-600">We promote your space to thousands of potential guests</p>
                </div>
              </div>
            </div>

            {/* Form Column */}
            <div>
              {submitted ? (
                <div className="bg-green-100 border-2 border-green-500 text-green-700 px-6 py-8 rounded-lg text-center">
                  <h3 className="text-2xl font-bold mb-2">Thank You!</h3>
                  <p className="mb-2">Your inquiry has been received successfully.</p>
                  <p>Our team will contact you within 24-48 hours to discuss your hosting opportunity.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="card p-8">
                  <h2 className="text-2xl font-bold mb-6">Tell Us About Your Space</h2>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <input
                      type="text"
                      name="firstName"
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                    />
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="mb-4"
                  />

                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="mb-4"
                  />

                  <input
                    type="text"
                    name="location"
                    placeholder="Property Location (City, State)"
                    value={formData.location}
                    onChange={handleChange}
                    required
                    className="mb-4"
                  />

                  <select
                    name="propertyType"
                    value={formData.propertyType}
                    onChange={handleChange}
                    required
                    className="mb-4"
                  >
                    <option value="">Select Property Type</option>
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                    <option value="loft">Loft</option>
                    <option value="garden">Garden/Outdoor</option>
                    <option value="studio">Studio</option>
                    <option value="unique">Unique Space</option>
                    <option value="other">Other</option>
                  </select>

                  <select
                    name="propertySize"
                    value={formData.propertySize}
                    onChange={handleChange}
                    required
                    className="mb-4"
                  >
                    <option value="">Property Size</option>
                    <option value="small">Small (up to 20 people)</option>
                    <option value="medium">Medium (20-50 people)</option>
                    <option value="large">Large (50+ people)</option>
                  </select>

                  <select
                    name="availability"
                    value={formData.availability}
                    onChange={handleChange}
                    required
                    className="mb-4"
                  >
                    <option value="">When Can You Host?</option>
                    <option value="weekends">Weekends</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="anytime">Anytime</option>
                  </select>

                  <textarea
                    name="message"
                    placeholder="Tell us more about your space and why you want to host"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="mb-4"
                  />

                  <div className="flex items-start gap-3 mb-6">
                    <input
                      type="checkbox"
                      name="terms"
                      id="terms"
                      checked={formData.terms}
                      onChange={handleChange}
                      required
                      className="mt-1"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-600">
                      I agree to the Terms of Service and understand that I'll be contacted regarding potential hosting opportunities
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !formData.terms}
                    className="btn-primary w-full py-3 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Submitting...' : 'Submit Hosting Inquiry'}
                  </button>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    No commitment required. We'll review your inquiry and follow up with next steps.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="section-padding bg-light-gray">
        <div className="container-md max-w-3xl">
          <h2 className="text-4xl font-bold mb-12 text-center">Frequently Asked Questions</h2>

          <div className="space-y-6">
            {[
              {
                q: 'How much can I earn as a host?',
                a: 'Earnings depend on your location, space type, and demand. Hosts typically earn $500-$2000+ per month. We recommend competitive pricing based on similar venues in your area.'
              },
              {
                q: 'What are your hosting requirements?',
                a: 'We require hosts to be at least 18 years old, have a verified identity, and allow background checks. Your space must be safe, clean, and accessible to guests.'
              },
              {
                q: 'How do I get paid?',
                a: 'Payments are processed securely after each booking. Most hosts receive funds within 3-5 business days through their preferred payment method.'
              },
              {
                q: 'Can I refuse a booking?',
                a: 'Yes! You have full control over which bookings to accept. However, maintaining a good cancellation rate helps build your reputation.'
              },
              {
                q: 'What if there\'s damage to my space?',
                a: 'We have property damage protection insurance for all bookings. Additionally, guests provide security info, and hosts can file damage claims.'
              },
              {
                q: 'How do I manage my calendar?',
                a: 'Our intuitive dashboard lets you set availability, blocked dates, and pricing. You can update this anytime to match your needs.'
              },
            ].map((faq, i) => (
              <div key={i} className="bg-white p-6 rounded-lg border border-border-gray">
                <h3 className="font-semibold text-lg mb-2 text-dark-bg">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
