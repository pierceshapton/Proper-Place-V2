'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useRef } from 'react';

const SITE_URL = 'https://proper-place.co.uk';

const qrCodes = [
  {
    id: 'host-recruitment',
    title: 'Host Recruitment QR Code',
    description: 'For recruiting new hosts. Share this at events, shows, and with prospective hosts. Scans take them to a sign-up form that captures their details so you can follow up.',
    url: `${SITE_URL}/host-signup`,
    usage: [
      'Print on business cards and flyers',
      'Show on your phone to prospective hosts',
      'Include in recruitment materials',
      'Display at motorhome shows and events',
    ],
    color: '#5B8FC4',
  },
  {
    id: 'guest-download',
    title: 'Guest Download QR Code',
    description: 'For hosts to display at their site. Guests scan this to download the app and book their stay. Perfect for banners, signs, and welcome packs.',
    url: `${SITE_URL}/scan`,
    usage: [
      'Print on a banner at your hosting site',
      'Include in welcome packs for guests',
      'Display on a sign at your entrance',
      'Add to your site information board',
    ],
    color: '#2d6a30',
  },
];

function QRCard({ qr }: { qr: typeof qrCodes[0] }) {
  const svgRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (!svgRef.current) return;

    const svgElement = svgRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);

    // Create a canvas to render the SVG at high resolution for print
    const canvas = document.createElement('canvas');
    const size = 1200;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);

      const link = document.createElement('a');
      link.download = `proper-place-${qr.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    if (!svgRef.current) return;

    const svgElement = svgRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Proper Place - ${qr.title}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            h1 { font-size: 28px; margin-bottom: 8px; }
            p { font-size: 16px; color: #666; margin-bottom: 24px; }
            svg { width: 400px; height: 400px; }
            .url { font-size: 14px; color: #999; margin-top: 16px; }
          </style>
        </head>
        <body>
          <h1>Proper Place</h1>
          <p>${qr.id === 'host-recruitment' ? 'Become a Host - Scan to Register' : 'Download the App - Scan to Get Started'}</p>
          ${svgData}
          <p class="url">${qr.url}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="p-8 md:p-10">
        <div className="flex flex-col lg:flex-row gap-8 items-center">
          {/* QR Code */}
          <div className="flex-shrink-0">
            <div
              ref={svgRef}
              className="bg-white p-6 rounded-2xl border-2 border-gray-100 inline-block"
            >
              <QRCodeSVG
                value={qr.url}
                size={220}
                level="H"
                fgColor={qr.color}
                imageSettings={{
                  src: '/logo-192.png',
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            </div>
            <div className="flex gap-2 mt-4 justify-center">
              <button
                onClick={handleDownload}
                className="bg-light-blue hover:bg-accent-blue text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PNG
              </button>
              <button
                onClick={handlePrint}
                className="border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-2xl font-bold mb-3">{qr.title}</h2>
            <p className="text-gray-600 mb-4">{qr.description}</p>
            <div className="mb-4">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Links to:</span>
              <p className="text-light-blue font-mono text-sm break-all">{qr.url}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Best used for:</span>
              <ul className="mt-2 space-y-1">
                {qr.usage.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-600 text-sm">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QRCodesPage() {
  return (
    <main className="bg-cream min-h-screen">
      {/* Hero */}
      <section className="bg-dark-bg text-white py-16 md:py-20">
        <div className="container-md text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">QR Codes</h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Download and print these QR codes to grow your host network and make it easy for guests to find you.
          </p>
        </div>
      </section>

      {/* QR Cards */}
      <section className="py-12 md:py-16">
        <div className="container-md max-w-4xl space-y-8">
          {qrCodes.map((qr) => (
            <QRCard key={qr.id} qr={qr} />
          ))}
        </div>
      </section>

      {/* Printing Tips */}
      <section className="py-12 bg-white">
        <div className="container-md max-w-3xl">
          <h2 className="text-2xl font-bold mb-8 text-center">Printing Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'Banner Size',
                desc: 'For site banners, print the QR code at least 15cm x 15cm so it scans easily from a distance.',
              },
              {
                title: 'High Contrast',
                desc: 'QR codes scan best on a white background. Avoid placing over busy images or dark surfaces.',
              },
              {
                title: 'Test Before Printing',
                desc: 'Always scan the printed QR code with your phone to make sure it works before displaying it.',
              },
              {
                title: 'Weather Protection',
                desc: 'For outdoor use, laminate the QR code or use a weatherproof sign holder.',
              },
            ].map((tip, i) => (
              <div key={i} className="bg-cream p-5 rounded-xl">
                <h3 className="font-semibold mb-1">{tip.title}</h3>
                <p className="text-gray-600 text-sm">{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
