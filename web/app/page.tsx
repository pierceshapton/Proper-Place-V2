import Image from 'next/image';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Proper Place — The UK's answer to Europe's Aires",
  description: 'Simple, legal overnight stops for motorhomes. Hosted by pubs, farms and small businesses across the South West.',
};

export default async function Home() {
  const faqs = [
    { q: 'What is Proper Place?', a: "The UK's answer to Europe's Aires. We connect campers with pubs, farms and small businesses who host them overnight on land they already own." },
    { q: 'Where is it live?', a: "Cornwall, Devon, Somerset and Dorset to start — growing region by region." },
    { q: 'How much does it cost to list?', a: 'Free for founding hosts. We take a small fee on each confirmed booking.' },
    { q: 'Who decides the nightly rate?', a: 'You do. Minimum £5, most hosts charge £10–£25.' },
    { q: 'Do you vet guests?', a: 'Yes. Every camper creates a verified account before they can book.' },
    { q: 'How and when do I get paid?', a: 'Guests pay at booking. After the stay, money goes to your bank.' },
  ];

  return (
    <main>
      <section className="relative min-h-screen flex items-center bg-dark-bg pt-16">
        <Image src="/images/hero-motorhome-farmland.jpg" alt="Motorhome on farmland" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-dark-bg/60" />
        <div className="relative z-10 container-md py-20">
          <p className="text-xs tracking-[0.2em] uppercase text-white/70">Starting in the South West</p>
          <h1 className="mt-6 max-w-4xl text-5xl md:text-7xl font-bold leading-[0.95] text-white">
            The UK&apos;s answer to <span className="text-light-blue">Europe&apos;s Aires.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg text-white/80">
            Simple, legal overnight stops for motorhomes — hosted by pubs, farms and small businesses earning from space they already have.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/auth/signup?type=host" className="bg-white text-dark-bg hover:bg-white/90 px-8 py-4 rounded-xl font-semibold">Become a host →</Link>
            <Link href="/auth/signup?type=camper" className="border-2 border-white/30 text-white hover:border-white px-8 py-4 rounded-xl font-semibold">Find a place to stay</Link>
          </div>
          <p className="mt-6 text-sm text-white/60">Already with us? <Link href="/auth/login" className="underline">Sign in</Link></p>
          <div className="mt-8 flex gap-4 border-t border-white/20 pt-8">
            <a href="https://apps.apple.com/gb/app/proper-place/id6759215166" target="_blank" rel="noreferrer" className="text-sm text-white/80 hover:text-white">Download iOS app</a>
            <span className="text-sm text-white/50">Android coming soon</span>
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="container-md">
          <p className="text-xs tracking-[0.2em] uppercase text-light-blue">What is Proper Place?</p>
          <h2 className="mt-6 text-4xl md:text-5xl font-bold text-gray-900 max-w-3xl">Drive across France and you&apos;ll find a quiet pitch in almost every village.</h2>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl">They call them Aires. We&apos;re bringing the same idea to Britain — simple, legal overnight stops hosted by pubs, farms and small businesses.</p>
        </div>
      </section>

      <section id="hosts" className="bg-gray-50 py-24">
        <div className="container-md text-center">
          <p className="text-xs tracking-[0.2em] uppercase text-light-blue">For pubs, farms and small businesses</p>
          <h2 className="mt-6 text-4xl md:text-5xl font-bold text-gray-900">Earn from space you already have.</h2>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">A pub car park after closing, a quiet paddock, a corner of the yard. Set your nightly rate from £5 upwards.</p>
          <div className="mt-12">
            <Link href="/auth/signup?type=host" className="bg-light-blue text-white hover:bg-accent-blue px-8 py-4 rounded-xl font-semibold">Create your host account →</Link>
            <p className="mt-4 text-sm text-gray-500">Free for founding hosts · No monthly fees</p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-dark-bg text-white py-24">
        <div className="container-md">
          <p className="text-xs tracking-[0.2em] uppercase text-white/60">How hosting works</p>
          <h2 className="mt-6 text-4xl md:text-5xl font-bold">Four small steps, and the kettle&apos;s on.</h2>
          <ol className="mt-12 space-y-6 max-w-xl">
            <li className="flex gap-4"><span className="text-light-blue">01</span><div><strong>List in ten minutes</strong> — Add photos, set your rate.</div></li>
            <li className="flex gap-4"><span className="text-light-blue">02</span><div><strong>Receive bookings</strong> — Approve or decline.</div></li>
            <li className="flex gap-4"><span className="text-light-blue">03</span><div><strong>Welcome and wave off</strong> — You stay in charge.</div></li>
            <li className="flex gap-4"><span className="text-light-blue">04</span><div><strong>Get paid directly</strong> — No chasing.</div></li>
          </ol>
        </div>
      </section>

      <section id="motorhomers" className="bg-white py-24">
        <div className="container-md">
          <p className="text-xs tracking-[0.2em] uppercase text-light-blue">For campers</p>
          <h2 className="mt-6 text-4xl md:text-5xl font-bold text-gray-900">Find a proper place to park up tonight.</h2>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl">Skip the lay-by lottery. Browse verified stopovers across the South West from £5 a night.</p>
          <div className="mt-10">
            <Link href="/auth/signup?type=camper" className="bg-light-blue text-white hover:bg-accent-blue px-8 py-4 rounded-xl font-semibold">Sign up to browse →</Link>
          </div>
        </div>
      </section>

      <section id="faq" className="bg-gray-50 py-24">
        <div className="container-md max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 text-center">Questions</h2>
          <div className="mt-12 space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-gray-200 pb-6">
                <h3 className="font-semibold text-gray-900">{faq.q}</h3>
                <p className="mt-2 text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-dark-bg text-white py-24">
        <div className="container-md text-center">
          <h2 className="text-4xl md:text-5xl font-bold">Your land has a quiet, useful job to do.</h2>
          <p className="mt-6 text-lg text-white/70 max-w-xl mx-auto">Listing takes ten minutes. You stay in charge.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/auth/signup?type=host" className="bg-white text-dark-bg px-8 py-4 rounded-xl font-semibold">Create your host account →</Link>
            <Link href="/auth/login" className="border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold">Sign in</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
