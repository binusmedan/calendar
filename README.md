# Excel to Supabase Sync via Next.js Web API

Proyek integrasi otomatis untuk menyinkronkan data peminjaman ruangan dari Microsoft Excel Online (Office Scripts) ke database PostgreSQL Supabase melalui Next.js App Router yang di-deploy di Vercel.

## 📁 Struktur Folder
```
.
├── app/
│   ├── api/
│   │   └── bookings/
│   │       └── route.ts          # Endpoint Web API (POST) dengan validasi x-api-key & upsert
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Halaman landing info API
├── excel/
│   └── sync-bookings.ts          # Script TypeScript untuk Microsoft Office Scripts
├── supabase/
│   └── schema.sql                # Skema DDL tabel room_bookings & trigger RLS
├── .env.local.example            # Template Environment Variables
├── .env.local                    # File konfigurasi lokal
├── package.json
└── tsconfig.json
```

---

## 🚀 Panduan Setup Singkat

### 1. Setup Database Supabase
1. Buka dashboard proyek Supabase Anda.
2. Masuk ke menu **SQL Editor** ➔ **New Query**.
3. Buka file `supabase/schema.sql`, salin seluruh isinya, dan klik **Run**.

### 2. Install Dependency & Jalankan Lokal
```bash
# Install paket npm
npm install

# Jalankan server development
npm run dev
```
Buka browser di `http://localhost:3000`.

### 3. Deploy ke Vercel & Konfigurasi Environment Variables
Saat men-deploy ke Vercel, tambahkan variabel berikut di menu **Project Settings > Environment Variables**:
- `SUPABASE_URL`: URL project Supabase Anda.
- `SUPABASE_SERVICE_ROLE_KEY`: Service role secret key Supabase (bukan anon key).
- `API_SECRET_KEY`: String acak buatan Anda sendiri (misal: token rahasia untuk autentikasi).

### 4. Pasang Office Script di Excel Online
1. Buka file Excel Anda di **Excel Online (for the Web)**.
2. Pastikan data peminjaman berada di sheet bernama `Sheet1` dan telah diubah menjadi **Format Tabel** (Pilih data ➔ tekan `Ctrl + T`).
3. Masuk ke tab **Automate** ➔ klik **New Script**.
4. Buka file `excel/sync-bookings.ts`, salin isinya, lalu sesuaikan nilai `VERCEL_ENDPOINT_URL` dan `API_SECRET_KEY`.
5. Klik **Save Script**, lalu tekan tombol **Run** untuk sinkronisasi.

