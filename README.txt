3D STORE - COMPLETE E-COMMERCE SYSTEM
======================================

Advanced 3D E-Commerce Platform with Supabase Backend

FILES INCLUDED
--------------

Customer-Facing:
- index.html          Main store page with products
- track.html          Order tracking page
- app.js              Customer-side JavaScript
- styles.css          Complete styling with 3D effects
- background.js       Particle animation system
- config.js           Configuration file

Admin Panel:
- admin-login.html    Admin login page (TO BE CREATED)
- admin.html          Admin dashboard (TO BE CREATED)
- admin.js            Admin functionality (TO BE CREATED)

SETUP INSTRUCTIONS
------------------

STEP 1: SUPABASE SETUP
1. Create Supabase project at https://supabase.com
2. Run the SQL from SUPABASE-SETUP-CLI.txt to create tables
3. Enable Authentication > Email provider
4. Create Storage bucket named "product-images" (public)
5. Copy your project URL and anon key

STEP 2: CONFIGURE APPLICATION
1. Open config.js
2. Replace YOUR_SUPABASE_URL with your Supabase project URL
3. Replace YOUR_SUPABASE_ANON_KEY with your anon key
4. Save the file

STEP 3: CREATE ADMIN USER
Run this SQL in Supabase SQL Editor:

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@3dstore.com',
  crypt('Admin@123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

STEP 4: TEST THE APPLICATION
1. Open index.html in your browser
2. Products should load from Supabase
3. Try placing an order
4. Track the order using tracking ID
5. Login to admin panel at admin-login.html

FEATURES
--------

Customer Features:
- 3D particle animated background
- Product browsing with images
- Order placement with tracking ID
- WhatsApp integration
- Order tracking
- Responsive mobile design
- Toast notifications

Admin Features:
- Secure login system
- Image upload to Supabase Storage
- Add/Delete products
- View all orders
- Update order status (Pending/Confirmed/Cancelled)
- Real-time notifications when new products added
- Manage products with images

TECHNOLOGY STACK
----------------
- Frontend: HTML5, CSS3, JavaScript (Vanilla)
- Backend: Supabase (PostgreSQL)
- Storage: Supabase Storage
- Authentication: Supabase Auth
- Animations: Canvas API

BROWSER SUPPORT
---------------
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

TROUBLESHOOTING
---------------

Issue: Products not loading
Solution: Check Supabase URL and key in config.js

Issue: Can't login to admin
Solution: Verify admin user exists in Supabase Authentication

Issue: Images not uploading
Solution: Check Storage bucket is public and named "product-images"

Issue: Background animation not showing
Solution: Ensure background.js is loaded after config.js

SECURITY NOTES
--------------
- Change admin password after first login
- Never commit config.js with real keys to public repos
- Use environment variables in production
- Enable Row Level Security in Supabase
- Set up proper CORS policies

CUSTOMIZATION
-------------

Colors:
Edit CSS variables in styles.css:
--primary: #FF6B35
--secondary: #004E89
--accent: #F77F00

Particle Count:
Edit background.js line 13:
particleCount: this.isMobile() ? 25 : 80

WhatsApp Number:
Edit config.js:
phoneNumber: '94771234567'

DEPLOYMENT
----------

Option 1: Static Hosting (Netlify, Vercel)
1. Upload all files
2. Set environment variables for Supabase keys
3. Deploy

Option 2: GitHub Pages
1. Push to GitHub repository
2. Enable GitHub Pages
3. Access at username.github.io/repo-name

Option 3: Traditional Hosting
1. Upload files to web server
2. Ensure HTTPS is enabled
3. Configure domain

SUPPORT
-------
For issues or questions:
- Check Supabase documentation
- Review browser console for errors
- Ensure all files are in same directory
- Verify Supabase tables are created correctly

VERSION
-------
Version: 1.0.0
Last Updated: January 2024
