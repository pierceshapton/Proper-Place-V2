-- Migration 017: CMS content table for editable website sections

CREATE TABLE IF NOT EXISTS cms_content (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT         NOT NULL,
  label       VARCHAR(200) NOT NULL,
  type        VARCHAR(20)  NOT NULL DEFAULT 'text',   -- 'text' | 'textarea'
  page        VARCHAR(50)  NOT NULL DEFAULT 'homepage',
  section     VARCHAR(50),
  sort_order  INT          NOT NULL DEFAULT 0,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed homepage content (idempotent via ON CONFLICT DO NOTHING)
INSERT INTO cms_content (key, value, label, type, page, section, sort_order) VALUES

  -- Hero
  ('homepage.hero.title',
   'Connecting the motorhome community with a Proper Place to stay the night',
   'Hero Headline', 'textarea', 'homepage', 'hero', 1),

  ('homepage.hero.subtitle',
   'Discover unique, budget-friendly Proper Places across the UK. From scenic farmland to coastal retreats — find your perfect stay.',
   'Hero Subheadline', 'textarea', 'homepage', 'hero', 2),

  ('homepage.hero.note',
   'Free to use · No hidden fees · Also available on iOS and Android',
   'Hero Note Text', 'text', 'homepage', 'hero', 3),

  -- About
  ('homepage.about.eyebrow',
   'About Proper Place',
   'About Eyebrow Label', 'text', 'homepage', 'about', 10),

  ('homepage.about.title',
   'The motorhome community''s trusted companion',
   'About Heading', 'text', 'homepage', 'about', 11),

  ('homepage.about.body1',
   'Proper Place connects motorhome owners with landowners offering affordable overnight stays. Whether you''re seeking a peaceful farm setting, a coastal view, or a convenient stopover, our community makes finding your next adventure simple.',
   'About Paragraph 1', 'textarea', 'homepage', 'about', 12),

  ('homepage.about.body2',
   'No more expensive campsites or uncertain wild camping. Our verified hosts offer safe, legal, and welcoming places for motorhome owners at prices that won''t break the bank.',
   'About Paragraph 2', 'textarea', 'homepage', 'about', 13),

  -- How It Works
  ('homepage.how.eyebrow',
   'Simple Process',
   'How It Works Eyebrow', 'text', 'homepage', 'how', 20),

  ('homepage.how.title',
   'How Proper Place works',
   'How It Works Heading', 'text', 'homepage', 'how', 21),

  ('homepage.how.step1.title',
   'Create an Account',
   'Step 1 Title', 'text', 'homepage', 'how', 22),

  ('homepage.how.step1.body',
   'Sign up for free on our website or app. Create your account in under a minute.',
   'Step 1 Description', 'textarea', 'homepage', 'how', 23),

  ('homepage.how.step2.title',
   'Find a Proper Place',
   'Step 2 Title', 'text', 'homepage', 'how', 24),

  ('homepage.how.step2.body',
   'Explore our map of verified hosts across the UK. Filter by price, amenities, and type to find your ideal stay.',
   'Step 2 Description', 'textarea', 'homepage', 'how', 25),

  ('homepage.how.step3.title',
   'Book & Stay',
   'Step 3 Title', 'text', 'homepage', 'how', 26),

  ('homepage.how.step3.body',
   'Request to book directly online or in the app. Communicate with hosts, pay securely, and enjoy your stay.',
   'Step 3 Description', 'textarea', 'homepage', 'how', 27),

  -- For Motorhomers
  ('homepage.motorhomers.eyebrow',
   'For Motorhomers',
   'Motorhomers Eyebrow', 'text', 'homepage', 'motorhomers', 30),

  ('homepage.motorhomers.title',
   'Adventure without the premium price',
   'Motorhomers Heading', 'text', 'homepage', 'motorhomers', 31),

  ('homepage.motorhomers.item1.title',
   'Affordable Nightly Rates',
   'Feature 1 Title', 'text', 'homepage', 'motorhomers', 32),

  ('homepage.motorhomers.item1.body',
   'Stays from just £10-15 per night — a fraction of traditional campsite fees',
   'Feature 1 Description', 'text', 'homepage', 'motorhomers', 33),

  ('homepage.motorhomers.item2.title',
   'Unique Proper Places',
   'Feature 2 Title', 'text', 'homepage', 'motorhomers', 34),

  ('homepage.motorhomers.item2.body',
   'Discover hidden gems: farms, vineyards, coastal spots, and countryside retreats',
   'Feature 2 Description', 'text', 'homepage', 'motorhomers', 35),

  ('homepage.motorhomers.item3.title',
   'Verified & Safe',
   'Feature 3 Title', 'text', 'homepage', 'motorhomers', 36),

  ('homepage.motorhomers.item3.body',
   'All Proper Places are reviewed by our admin teams and rated by the people who have stayed',
   'Feature 3 Description', 'text', 'homepage', 'motorhomers', 37),

  ('homepage.motorhomers.item4.title',
   'Route Planning',
   'Feature 4 Title', 'text', 'homepage', 'motorhomers', 38),

  ('homepage.motorhomers.item4.body',
   'Plan your journey with stopovers perfectly spaced along your route',
   'Feature 4 Description', 'text', 'homepage', 'motorhomers', 39),

  -- For Hosts
  ('homepage.hosts.eyebrow',
   'For Landowners',
   'Hosts Eyebrow', 'text', 'homepage', 'hosts', 40),

  ('homepage.hosts.title',
   'Turn your land into extra income',
   'Hosts Heading', 'text', 'homepage', 'hosts', 41),

  ('homepage.hosts.body',
   'Have unused land, a large garden, or farm space? Join hundreds of hosts earning extra income by welcoming respectful motorhome guests.',
   'Hosts Description', 'textarea', 'homepage', 'hosts', 42),

  ('homepage.hosts.item1',
   'Free to list your space',
   'Hosts Point 1', 'text', 'homepage', 'hosts', 43),

  ('homepage.hosts.item2',
   'You set your own prices and availability',
   'Hosts Point 2', 'text', 'homepage', 'hosts', 44),

  ('homepage.hosts.item3',
   'Secure payments directly to your account',
   'Hosts Point 3', 'text', 'homepage', 'hosts', 45),

  ('homepage.hosts.item4',
   'Meet interesting people from around the country',
   'Hosts Point 4', 'text', 'homepage', 'hosts', 46),

  -- Bottom CTA
  ('homepage.cta.title',
   'Start your next adventure today',
   'CTA Heading', 'text', 'homepage', 'cta', 50),

  ('homepage.cta.subtitle',
   'Join thousands of motorhome owners discovering affordable, unique places to stay across the UK.',
   'CTA Subheadline', 'textarea', 'homepage', 'cta', 51)

ON CONFLICT (key) DO NOTHING;
