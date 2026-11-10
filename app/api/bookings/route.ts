import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getCorsHeaders(request: Request) {
  // Ambil origin asli (misal 'null' dari Office Scripts sandbox) atau default ke '*'
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization, X-Requested-With",
  };
}

// 1. Wajib: Tangani Preflight Request (OPTIONS) dari browser Excel Online / Office Scripts
export async function OPTIONS(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

// 2. Tangani Request POST dari Office Scripts Excel
export async function POST(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  const startTime = Date.now();

  try {
    // -------------------------------------------------------------------------
    // Verifikasi x-api-key
    // -------------------------------------------------------------------------
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.API_SECRET_KEY) {
      return NextResponse.json(
        { success: false, message: "Kunci API tidak valid atau tidak disertakan." },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();

    // Mendukung Array langsung, Object { data: [...] }, atau Single Object { form_id: ... }
    const rawData = Array.isArray(body)
      ? body
      : Array.isArray(body?.data)
      ? body.data
      : (body && typeof body === "object" && !Array.isArray(body) ? [body] : []);

    if (!Array.isArray(rawData) || rawData.length === 0) {
      return NextResponse.json(
        { success: false, message: "Payload harus berupa data booking yang valid." },
        { status: 400, headers: corsHeaders }
      );
    }

    // -------------------------------------------------------------------------
    // Sanitasi 21 Kolom untuk mencegah error tipe data di PostgreSQL
    // -------------------------------------------------------------------------
    const sanitizedData = rawData
      .filter((item: any) => {
        const id = Number(item?.form_id);
        return !isNaN(id) && id > 0;
      })
      .map((item: any) => ({
        form_id: Math.round(Number(item.form_id)),
        waktu_mulai: item.waktu_mulai || null,
        waktu_selesai: item.waktu_selesai || null,
        tanggal_mulai: item.tanggal_mulai || null,
        tanggal_selesai: item.tanggal_selesai || null,
        jam: item.jam || null,
        email_pengisi: item.email_pengisi || null,
        nama_pengisi: item.nama_pengisi || null,
        pic: item.pic || null,
        status_binusian: item.status_binusian || null,
        binusian_id: item.binusian_id ? String(item.binusian_id) : null,
        email_konfirmasi: item.email_konfirmasi || null,
        telepon: item.telepon ? String(item.telepon) : null,
        kebutuhan_ruangan: item.kebutuhan_ruangan || null,
        jumlah_peserta: item.jumlah_peserta ? Math.round(Number(item.jumlah_peserta)) : null,
        jenis_ruangan: item.jenis_ruangan || null,
        nama_kegiatan: item.nama_kegiatan || null,
        ruangan: item.ruangan || null,
        peralatan: item.peralatan || null,
        jenis_kegiatan: item.jenis_kegiatan || null,
        status_booking: item.status_booking || null,
      }));

    if (sanitizedData.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada baris data dengan form_id valid untuk disimpan." },
        { status: 400, headers: corsHeaders }
      );
    }

    // -------------------------------------------------------------------------
    // Inisialisasi Supabase Client dengan Service Role Key (bypass RLS)
    // -------------------------------------------------------------------------
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // -------------------------------------------------------------------------
    // Upsert data ke tabel room_bookings berdasarkan Primary Key form_id
    // -------------------------------------------------------------------------
    const { data: upsertResult, error } = await supabase
      .from("room_bookings")
      .upsert(sanitizedData, {
        onConflict: "form_id",
        ignoreDuplicates: false,
      })
      .select("form_id");

    if (error) {
      console.error("[Supabase Error]:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    const processedCount = upsertResult?.length ?? sanitizedData.length;
    const executionTimeMs = Date.now() - startTime;

    // Catat log sukses ke sync_logs (opsional, abaikan jika tabel belum ada)
    try {
      await supabase.from("sync_logs").insert({
        total_received: rawData.length,
        total_upserted: processedCount,
        status: "success",
        message: `Berhasil memproses ${processedCount} baris.`,
        execution_time_ms: executionTimeMs,
        source: "office_scripts",
      });
    } catch { /* tabel sync_logs belum dibuat, abaikan */ }

    return NextResponse.json(
      {
        success: true,
        message: `Berhasil menyimpan ${processedCount} data ke Supabase.`,
        processedCount,
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error("[Unhandled Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan pada server." },
      { status: 500, headers: corsHeaders }
    );
  }
}
