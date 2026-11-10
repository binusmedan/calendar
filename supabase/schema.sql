-- =============================================================================
-- SUPABASE POSTGRESQL SCHEMA: room_bookings (21 Kolom Lengkap)
-- =============================================================================
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run

-- 1. Buat Tabel room_bookings dengan 21 Kolom sesuai spesifikasi Office Scripts
CREATE TABLE IF NOT EXISTS public.room_bookings (
    -- Primary Key
    form_id BIGINT PRIMARY KEY,

    -- Kolom Tanggal & Waktu
    waktu_mulai TIMESTAMPTZ,
    waktu_selesai TIMESTAMPTZ,
    tanggal_mulai DATE,
    tanggal_selesai DATE,
    jam TEXT,

    -- Data Pengisi & PIC
    email_pengisi TEXT,
    nama_pengisi TEXT,
    pic TEXT,
    status_binusian TEXT,
    binusian_id TEXT,
    email_konfirmasi TEXT,
    telepon TEXT,

    -- Detail Ruangan & Peserta
    kebutuhan_ruangan TEXT,
    jumlah_peserta INT,
    jenis_ruangan TEXT,
    ruangan TEXT,

    -- Detail Kegiatan
    nama_kegiatan TEXT,
    peralatan TEXT,
    jenis_kegiatan TEXT,
    status_booking TEXT,

    -- Audit Timestamps sistem database
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Index untuk Pencarian Cepat
CREATE INDEX IF NOT EXISTS idx_room_bookings_schedule 
ON public.room_bookings (ruangan, waktu_mulai, waktu_selesai);

CREATE INDEX IF NOT EXISTS idx_room_bookings_tanggal 
ON public.room_bookings (tanggal_mulai, ruangan);

CREATE INDEX IF NOT EXISTS idx_room_bookings_binusian 
ON public.room_bookings (binusian_id, pic);

-- 3. Trigger Otomatis untuk memperbarui kolom 'updated_at' saat data di-update
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_updated_at ON public.room_bookings;
CREATE TRIGGER trigger_set_updated_at
BEFORE UPDATE ON public.room_bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 4. Konfigurasi Row Level Security (RLS)
ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;

-- Service Role Key (Vercel) otomatis mem-bypass RLS untuk INSERT/UPDATE/UPSERT
-- Kebijakan di bawah mengizinkan akses SELECT (baca)
CREATE POLICY "Allow public read-only access"
ON public.room_bookings
FOR SELECT
TO anon, authenticated
USING (true);

-- =============================================================================
-- 5. Tabel Audit Log Sinkronisasi (sync_logs)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id BIGSERIAL PRIMARY KEY,
    synced_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    total_received INT NOT NULL DEFAULT 0,
    total_upserted INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    message TEXT,
    execution_time_ms INT,
    source TEXT DEFAULT 'office_scripts'
);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-only sync_logs"
ON public.sync_logs
FOR SELECT
TO anon, authenticated
USING (true);
