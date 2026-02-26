# Vercel DNS Setup in Squarespace - Step by Step

## Step 1: Get DNS Info from Vercel

After deploying to Vercel:

1. Go to your project on https://vercel.com
2. Click **Settings** → **Domains**
3. Click **Add Domain**
4. Type: `proper-place.co.uk`
5. Click **Add**

You'll see 2 options:
- **Nameservers** (easier)
- **CNAME** (if using Squarespace DNS)

## Step 2: Choose Your Method

**Option A: Use Vercel Nameservers (Recommended - Easiest)**
- Vercel will tell you 4 nameserver addresses
- Copy all 4
- Go to Squarespace DNS
- Replace all nameservers with Vercel's
- Done in 5 minutes

**Option B: Keep Squarespace DNS + Add DNS Records (Your situation)**
- This is what you need if you want to keep Squarespace managing DNS

## Step 3: For Option B - Add DNS Records in Squarespace

1. Go to **Squarespace Settings** → **Domains**
2. Click **proper-place.co.uk**
3. Click **DNS Settings**
4. Look for **"Custom Records"** or **"Advanced"** section
5. Click **"Add Record"**

You need to add these records:

### Record 1: A Record (Root Domain)
- **HOST**: `@` (leave blank or @ means root)
- **TYPE**: `A`
- **DATA**: `76.76.19.165` (Vercel's standard IP - get exact one from Vercel)
- **TTL**: `3600` or default

Click **SAVE**

### Record 2: CNAME Record (WWW)
- **HOST**: `www`
- **TYPE**: `CNAME`
- **DATA**: `cname.vercel-dns.com.` (or what Vercel shows)
- **TTL**: `3600` or default

Click **SAVE**

## Step 4: Get Exact Values from Vercel

Don't guess the IP! Get it from Vercel:

1. Go to https://vercel.com → Your Project
2. Click **Settings** → **Domains**
3. Add domain: `proper-place.co.uk`
4. You'll see the exact A record IP and CNAME
5. Copy those exact values

## Step 5: Verify

After adding records, wait 5-10 minutes, then:

```bash
nslookup proper-place.co.uk
# Should show Vercel's IP
```

Or use: https://whatsmydns.net/?domain=proper-place.co.uk

---

## Screenshot Guide

**In Squarespace:**
1. Settings → Domains → proper-place.co.uk → DNS Settings
2. Look for "Advanced DNS" or "Custom Records"
3. Click "Add Record"
4. Fill in like this:

```
HOST: @
TYPE: A
DATA: [Vercel IP from dashboard]
TTL: 3600

---

HOST: www
TYPE: CNAME
DATA: cname.vercel-dns.com.
TTL: 3600
```

---

## If You're Still Stuck

Easiest solution: **Use Vercel Nameservers**

1. Vercel tells you 4 nameserver addresses
2. In Squarespace DNS: Delete current nameservers
3. Add Vercel's 4 nameservers
4. Done - Vercel manages everything

---

**What exact error are you seeing?** Take a screenshot and I can help you through it specifically.
