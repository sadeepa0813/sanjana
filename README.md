# LankaShop Elite - Cyberpunk E-commerce Platform

A futuristic, cyberpunk-themed E-commerce platform built with Vanilla HTML, CSS, and JavaScript. Premium tech products with elite customer experience.

## Features

### Shopping Experience
*   **Cyberpunk UI** with glassmorphism & neon effects
*   Product discovery with categories
*   Detailed product views
*   Shopping cart with localStorage
*   Fully responsive design

### Security
*   **XSS Protection** (DOMPurify)
*   Environment variable validation
*   Supabase RLS policies
*   Security headers (Vercel)

### User Features
*   Google OAuth & Email/Password login
*   User dashboard with order history
*   Wishlist functionality
*   Toast notifications

### Admin Features
*   Admin dashboard with analytics
*   Product management
*   User management
*   Order processing

## Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **HTML5** | Structure |
| **CSS3** | Styling (Glassmorphism) |
| **JavaScript (ES6+)** | Frontend Logic |
| **Supabase** | Backend (Auth + DB) |
| **Vite** | Build Tool |
| **Tailwind CSS** | Utility CSS |
| **DOMPurify** | XSS Protection |

*   **Export to Sheets**

## Quick Start

### Prerequisites
*   Node.js 18+
*   npm or yarn
*   Supabase account
*   Vercel account (for deployment)

### 1. Clone & Install

```bash
# Clone repository
git clone <your-repo-url>
cd e-main

# Install dependencies
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local
```

Edit `.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_WHATSAPP_NUMBER=94771234567
```

Get credentials from:
1.  Go to Supabase Dashboard
2.  Select your project
3.  Go to Settings -> API
4.  Copy URL and anon key

### 3. Database Setup

Run SQL files in Supabase SQL Editor:
1.  `supabase/schema.sql` - Creates tables
2.  `supabase/updates.sql` - Adds features
3.  `supabase/updates_2.sql` - Latest updates

### 4. Run Development Server

```bash
npm run dev
```
Open http://localhost:5173

### 5. Build for Production

```bash
npm run build
npm run preview
```

## Deployment to Vercel

### Via GitHub (Recommended)

1.  **Push to GitHub:**
    ```bash
    git add .
    git commit -m "Ready for deployment"
    git push origin main
    ```

2.  **Import to Vercel:**
    *   Go to Vercel Dashboard
    *   New Project -> Import from GitHub
    *   Select repository

3.  **Add Environment Variables in Vercel:**
    *   `VITE_SUPABASE_URL=https://xxx.supabase.co`
    *   `VITE_SUPABASE_ANON_KEY=eyJhbG...`
    *   `VITE_WHATSAPP_NUMBER=94771234567`
    *   `VITE_CONTACT_PHONE=+94 77 123 4567`
    *   `VITE_CONTACT_EMAIL=support@lankashop.lk`
    *   `VITE_CONTACT_ADDRESS=Colombo, Sri Lanka`

4.  **Deploy!**

### Via CLI

```bash
npm install -g vercel
vercel --prod
```

## Project Structure

```
e-main/
├── index.html              # Homepage
├── login.html              # Login page
├── admin.html              # Admin dashboard
├── user-dashboard.html     # User dashboard
├── feedback.html           # Reviews page
├── package.json            # Dependencies
├── vite.config.js          # Vite config
├── vercel.json             # Vercel config
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
├── src/
│   ├── components/         # Reusable components
│   │   ├── Navbar.js
│   │   ├── ProductCard.js
│   │   └── CartModal.js
│   ├── scripts/            # JavaScript modules
│   │   ├── main.js         # Main app logic
│   │   ├── AuthContext.js  # Authentication
│   │   ├── CartContext.js  # Shopping cart
│   │   ├── admin.js        # Admin panel
│   │   ├── dashboard.js    # User dashboard
│   │   └── feedback.js     # Reviews system
│   ├── services/
│   │   └── supabase.js     # Supabase client
│   ├── config/
│   │   └── config.js       # Configuration
│   └── styles/             # CSS files
│       ├── main.css
│       ├── variables.css
│       ├── components.css
│       ├── animations.css
│       └── utilities.css
└── supabase/
    ├── schema.sql          # Database schema
    ├── updates.sql         # Feature updates
    └── updates_2.sql       # Latest updates
```

## Keyboard Shortcuts

*   `Esc` - Close modals
*   `C` - View cart (when logged in)

## Testing

### Manual Testing Checklist

**Basic Functionality:**
- [ ] Products load on homepage
- [ ] Product details modal opens
- [ ] Add to cart works
- [ ] Cart displays items
- [ ] WhatsApp checkout opens
- [ ] Login/logout works

**Security:**
- [ ] XSS protection works
- [ ] Environment variables validated
- [ ] Unauthenticated users can't access admin

**Performance:**
- [ ] Images lazy load
- [ ] Offline mode works
- [ ] Mobile menu works
- [ ] Loading states show

## License

MIT License - see LICENSE file for details