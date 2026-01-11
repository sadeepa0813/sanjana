# Deployment Guide for LankaShop Elite

## 1. Prerequisites
- A [Vercel](https://vercel.com) or [Netlify](https://netlify.com) account (Free Tier is sufficient).
- A [Supabase](https://supabase.com) project.
- GitHub repository with this code pushed.

## 2. Database Setup (Supabase)
1.  Go to your Supabase Project -> **SQL Editor**.
2.  Open `supabase/schema.sql` (if available) to create initial tables.
3.  **CRITICAL:** Open `supabase/updates.sql` and run the entire script. This adds the `role`, `is_banned` columns and sets up security policies.
4.  **Create Admin:** Go to **Table Editor** -> `profiles` table. Find your user row and change `role` from `customer` to `admin`.

## 3. Deployment to Vercel
1.  **Dashboard:** Go to Vercel Dashboard -> **Add New...** -> **Project**.
2.  **Import:** Select your GitHub repository.
3.  **Configure:**
    -   **Framework Preset:** Vite
    -   **Root Directory:** `./` (default)
    -   **Build Command:** `npm run build`
    -   **Output Directory:** `dist`
4.  **Environment Variables:**
    Expand the "Environment Variables" section and add the contents of your `.env` file (do NOT upload `.env` to GitHub).
    
    ```
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```
5.  **Deploy:** Click **Deploy**.

## 4. Environment Variables Checklist
Make sure these are present in your Vercel Project Settings:

| Variable Name | Description |
|ion |
|---|---|
| `VITE_SUPABASE_URL` | Found in Supabase -> Settings -> API |
| `VITE_SUPABASE_ANON_KEY` | Found in Supabase -> Settings -> API |

## 5. Post-Deployment
-   Visit your live URL (e.g., `https://lankashop-elite.vercel.app`).
-   Login with Google.
-   If you haven't set yourself as Admin in step 2, you will be redirected to the home page.
-   Update your role in the Database to access `/admin.html`.

## 6. Project Structure Notes for Cleanup
You can safely ignore or remove these folders/files from production build (Vite handles this):
-   `legacy/` (Old scripts)
-   `.env.example`
-   `README.md`
-   `supabase/` (SQL files are for setup only)

**Keep:** `src/`, `public/` (if any), `*.html`, `vite.config.js`, `package.json`.
