import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Helper format tanggal ke format ICS UTC: YYYYMMDDTHHMMSSZ
 */
function toIcsDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Escape teks sesuai spesifikasi RFC 5545 (iCalendar)
 */
function escapeIcsText(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return new NextResponse("Supabase client belum terkonfigurasi.", { status: 500 });
  }

  try {
    // Ambil data peminjaman ruangan yang valid (memiliki waktu mulai & selesai)
    const { data: bookings, error } = await supabase
      .from("room_bookings")
      .select("*")
      .not("waktu_mulai", "is", null)
      .not("waktu_selesai", "is", null)
      .order("waktu_mulai", { ascending: true })
      .limit(500);

    if (error) {
      console.error("[iCalendar Export Error]:", error);
      return new NextResponse("Gagal mengambil data dari database.", { status: 500 });
    }

    // Bangun dokumen iCalendar (RFC 5545)
    const nowIcs = toIcsDate(new Date().toISOString());
    const events: string[] = [];

    for (const b of bookings || []) {
      const startIcs = toIcsDate(b.waktu_mulai);
      const endIcs = toIcsDate(b.waktu_selesai);

      if (!startIcs || !endIcs) continue;

      const summary = escapeIcsText(`${b.nama_kegiatan || "Peminjaman Ruangan"} - ${b.ruangan || "Ruangan"}`);
      const location = escapeIcsText(b.ruangan || "");
      const description = escapeIcsText(
        `PIC: ${b.pic || b.nama_pengisi || "-"}\n` +
        `BINUSIAN ID: ${b.binusian_id || "-"}\n` +
        `Kontak: ${b.telepon || b.email_konfirmasi || "-"}\n` +
        `Peserta: ${b.jumlah_peserta || 0} orang\n` +
        `Peralatan: ${b.peralatan || "-"}\n` +
        `Status: ${b.status_booking || "Confirmed"}`
      );

      events.push(
        [
          "BEGIN:VEVENT",
          `UID:booking-${b.form_id}@calendar-sync`,
          `DTSTAMP:${nowIcs}`,
          `DTSTART:${startIcs}`,
          `DTEND:${endIcs}`,
          `SUMMARY:${summary}`,
          `LOCATION:${location}`,
          `DESCRIPTION:${description}`,
          `STATUS:${b.status_booking?.toLowerCase().includes("batal") ? "CANCELLED" : "CONFIRMED"}`,
          "END:VEVENT",
        ].join("\r\n")
      );
    }

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Calendar Room Booking System//ID",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Jadwal Peminjaman Ruangan",
      "X-WR-TIMEZONE:Asia/Jakarta",
      ...events,
      "END:VCALENDAR",
    ].join("\r\n");

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="room-bookings.ics"',
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return new NextResponse(msg, { status: 500 });
  }
}

