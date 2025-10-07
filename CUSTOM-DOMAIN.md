# Custom Domain Setup Guide

This guide walks you through connecting a custom domain to your Vercel-deployed game.

## Overview

You'll need to:
1. Purchase a domain name (if you don't have one)
2. Add the domain to your Vercel project
3. Configure DNS records with your domain registrar
4. Wait for DNS propagation and SSL setup

---

## Step 1: Purchase a Domain Name

If you don't already own a domain, you'll need to buy one from a domain registrar.

### Recommended Registrars
- **Namecheap** (namecheap.com) - Affordable, beginner-friendly
- **Google Domains** (domains.google) - Clean interface, Google integration
- **Cloudflare** (cloudflare.com) - Great pricing, includes free DNS/CDN
- **GoDaddy** (godaddy.com) - Popular but can be pricey

### Tips for Choosing a Domain
- Keep it short and memorable
- `.com` domains are most recognizable, but `.io`, `.games`, or `.fun` work too
- Typical cost: $10-15/year for `.com` domains

**Action:** Purchase your domain and note down your registrar login credentials.

---

## Step 2: Add Custom Domain to Vercel

### 2.1. Navigate to Your Vercel Project
1. Go to [vercel.com](https://vercel.com) and log in
2. Select your lying-game project from the dashboard

### 2.2. Open Domain Settings
1. Click on the **Settings** tab
2. Select **Domains** from the left sidebar

### 2.3. Add Your Domain
1. In the "Add Domain" field, enter your domain name:
   - For root domain: `yourdomain.com`
   - For subdomain: `game.yourdomain.com` or `www.yourdomain.com`
2. Click **Add**

### 2.4. Note the DNS Records
Vercel will show you which DNS records to configure. You'll see something like:

**Option A: Using A Record (for root domain like `yourdomain.com`)**
```
Type: A
Name: @ (or leave blank)
Value: 76.76.21.21
```

**Option B: Using CNAME Record (for subdomains like `www.yourdomain.com`)**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**For www redirect:**
If you want both `yourdomain.com` AND `www.yourdomain.com` to work, you'll need to add both records.

---

## Step 3: Configure DNS Records at Your Registrar

Now you need to add the DNS records Vercel provided to your domain registrar.

### 3.1. Log into Your Domain Registrar
Go to your registrar's website and log in to your account.

### 3.2. Find DNS Management Section
The location varies by registrar:
- **Namecheap**: Domain List → Manage → Advanced DNS
- **Google Domains**: My domains → [Your domain] → DNS
- **Cloudflare**: Select your domain → DNS → Records
- **GoDaddy**: My Products → Domains → [Your domain] → DNS

### 3.3. Add the DNS Records

#### For Root Domain (`yourdomain.com`):
1. Click **Add New Record** or **Add Record**
2. Set:
   - **Type:** A
   - **Host/Name:** @ (or leave blank, or enter `yourdomain.com`)
   - **Value/Points to:** `76.76.21.21`
   - **TTL:** Auto or 3600 (1 hour)
3. Click **Save** or **Add Record**

#### For www Subdomain (`www.yourdomain.com`):
1. Click **Add New Record** or **Add Record**
2. Set:
   - **Type:** CNAME
   - **Host/Name:** www
   - **Value/Points to:** `cname.vercel-dns.com`
   - **TTL:** Auto or 3600
3. Click **Save** or **Add Record**

### 3.4. Remove Conflicting Records (if needed)
- If you see existing A or CNAME records for `@` or `www`, delete them first
- Some registrars pre-create parking page records - remove these

---

## Step 4: Wait for DNS Propagation

### 4.1. Propagation Time
- **Typical wait:** 5 minutes to 48 hours (usually within 1-2 hours)
- DNS changes need to propagate across the internet

### 4.2. Check Propagation Status
Visit [whatsmydns.net](https://whatsmydns.net) and enter your domain to see if DNS has propagated globally.

### 4.3. Verify in Vercel
1. Go back to Vercel → Settings → Domains
2. You should see your domain with a checkmark ✓ when it's configured correctly
3. Vercel automatically provisions an SSL certificate (HTTPS)

---

## Step 5: Set Primary Domain (Optional)

If you added multiple domains (e.g., both `yourdomain.com` and `www.yourdomain.com`):

1. In Vercel Domains settings, you'll see all your domains
2. Click the **⋮** (three dots) next to your preferred domain
3. Select **Set as Primary Domain**
4. This ensures the other domain redirects to your primary one

**Recommendation:** Use `yourdomain.com` (without www) as primary for shorter URLs.

---

## Step 6: Update Backend CORS (if needed)

If you're using a custom domain, you may need to update your backend CORS configuration on Render.

### 6.1. Update Environment Variable
1. Go to [render.com](https://render.com) and open your backend service
2. Navigate to **Environment** tab
3. Find the `FRONTEND_URL` variable
4. Update it to your new domain: `https://yourdomain.com`
5. Click **Save Changes**
6. Render will automatically redeploy with the new configuration

---

## Troubleshooting

### Domain Not Working After 48 Hours
- Double-check DNS records match exactly what Vercel shows
- Ensure no conflicting records exist
- Try using `8.8.8.8` (Google DNS) or flush your DNS cache:
  - **Windows:** `ipconfig /flushdns`
  - **Mac:** `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`
  - **Linux:** `sudo systemd-resolve --flush-caches`

### SSL Certificate Not Provisioning
- Vercel automatically provisions SSL certificates
- If it's stuck, try removing and re-adding the domain
- Ensure DNS is fully propagated first

### "Invalid Configuration" Error in Vercel
- Verify you're using the exact DNS values Vercel provides
- For A records, use `76.76.21.21` (Vercel's IP)
- For CNAME records, use `cname.vercel-dns.com`

### Both www and non-www Not Working
- You need separate records for each:
  - A record for `@` (root domain)
  - CNAME record for `www`
- Make sure both are added in Vercel Domains settings

---

## Example: Complete Setup

Let's say you bought `guesswholying.com` from Namecheap:

### In Vercel:
1. Add `guesswholying.com`
2. Add `www.guesswholying.com`
3. Set `guesswholying.com` as primary

### In Namecheap DNS:
```
Type: A
Host: @
Value: 76.76.21.21

Type: CNAME
Host: www
Value: cname.vercel-dns.com
```

### In Render (Backend):
```
FRONTEND_URL=https://guesswholying.com
```

Wait 1-2 hours, then visit `guesswholying.com` - it should work with HTTPS! 🎉

---

## Next Steps

Once your custom domain is live:
- ✅ Share the new URL with friends
- ✅ Test the game end-to-end on the custom domain
- ✅ Consider setting up email forwarding (e.g., `contact@yourdomain.com`)
- ✅ Add domain to your social media/portfolio

---

## Resources

- [Vercel Custom Domains Documentation](https://vercel.com/docs/concepts/projects/domains)
- [DNS Propagation Checker](https://whatsmydns.net)
- [Render Environment Variables](https://render.com/docs/configure-environment-variables)

---

**Questions?** Check Vercel's documentation or your domain registrar's support articles for registrar-specific instructions.
