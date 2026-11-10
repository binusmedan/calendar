import { getSupabaseClient } from "@/lib/supabase";
import BookingTable from "@/app/components/BookingTable";

export const dynamic = "force-dynamic";

interface BookingItem {
  form_id: number;
  waktu_mulai?: string | null;
  waktu_selesai?: string | null;
  tanggal_mulai?: string | null;
  tanggal_selesai?: string | null;
  jam?: string | null;
  email_pengisi?: string | null;
  nama_pengisi?: string | null;
  pic?: string | null;
  status_binusian?: string | null;
  binusian_id?: string | null;
  email_konfirmasi?: string | null;
  telepon?: string | null;
  kebutuhan_ruangan?: string | null;
  jumlah_peserta?: number | null;
  jenis_ruangan?: string | null;
  nama_kegiatan?: string | null;
  ruangan?: string | null;
  peralatan?: string | null;
  jenis_kegiatan?: string | null;
  status_booking?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface SyncLogItem {
  id: number;
  synced_at: string;
  total_received: number;
  total_upserted: number;
  status: string;
  message: string;
  execution_time_ms: number;
}

export default async function HomePage() {
  const supabase = getSupabaseClient();
  let bookings: BookingItem[] = [];
  let latestSync: SyncLogItem | null = null;
  let connectionError: string | null = null;

  if (supabase) {
    try {
      const [bookingsRes, syncLogsRes] = await Promise.all([
        supabase
          .from("room_bookings")
          .select("*")
          .order("form_id", { ascending: false })
          .limit(100),
        supabase
          .from("sync_logs")
          .select("*")
          .order("synced_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (bookingsRes.error) {
        connectionError = bookingsRes.error.message;
      } else {
        bookings = (bookingsRes.data as BookingItem[]) || [];
      }

      if (!syncLogsRes.error && syncLogsRes.data) {
        latestSync = syncLogsRes.data as SyncLogItem;
      }
    } catch (err: unknown) {
      connectionError = err instanceof Error ? err.message : "Gagal menghubungi Supabase";
    }
  } else {
    connectionError = "Variabel SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di Environment Variables.";
  }

  const uniqueRooms = new Set(bookings.map((b) => b.ruangan).filter(Boolean)).size;
  const totalBookings = bookings.length;

  return (
    <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 24px", fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "24px", marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#111827", margin: "0 0 6px 0" }}>
              Room Booking Dashboard (Excel to Supabase)
            </h1>
            <p style={{ color: "#6b7280", margin: 0, fontSize: "15px" }}>
              Memantau data peminjaman ruangan yang disinkronkan otomatis dari Microsoft Office Scripts ke Supabase.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <a
              href="/api/calendar"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                textDecoration: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              📅 Sinkronkan ke Google / Outlook (.ics)
            </a>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: "600",
                backgroundColor: !connectionError ? "#def7ec" : "#fde8e8",
                color: !connectionError ? "#03543f" : "#9b1c1c",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: !connectionError ? "#31c48d" : "#f05252",
                }}
              />
              {!connectionError ? "Database Supabase Aktif" : "Menunggu Konfigurasi"}
            </span>
          </div>
        </div>
      </header>

      {/* Kartu Ringkasan Statistik */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div style={{ padding: "20px", borderRadius: "10px", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: "600", textTransform: "uppercase" }}>Total Booking</span>
          <div style={{ fontSize: "30px", fontWeight: "800", color: "#1f2937", marginTop: "8px" }}>{totalBookings}</div>
        </div>
        <div style={{ padding: "20px", borderRadius: "10px", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: "600", textTransform: "uppercase" }}>Ruangan Digunakan</span>
          <div style={{ fontSize: "30px", fontWeight: "800", color: "#2563eb", marginTop: "8px" }}>{uniqueRooms}</div>
        </div>
        <div style={{ padding: "20px", borderRadius: "10px", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: "600", textTransform: "uppercase" }}>Sinkronisasi Terakhir</span>
          <div style={{ fontSize: "14px", fontWeight: "600", color: latestSync?.status === "success" ? "#059669" : "#6b7280", marginTop: "12px" }}>
            {latestSync ? (
              <>
                {new Date(latestSync.synced_at).toLocaleString("id-ID")}
                <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "normal", marginTop: "4px" }}>
                  {latestSync.total_upserted} baris diproses ({latestSync.execution_time_ms} ms)
                </div>
              </>
            ) : (
              "Belum ada log sync"
            )}
          </div>
        </div>
      </section>

      {/* Info Status / Error */}
      {connectionError && (
        <div style={{ padding: "16px", borderRadius: "8px", backgroundColor: "#fff8f1", border: "1px solid #fed7aa", marginBottom: "32px", color: "#9a3412" }}>
          <h4 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: "700" }}>Pemberitahuan:</h4>
          <p style={{ margin: 0, fontSize: "14px" }}>
            {connectionError}. Pastikan <code>SUPABASE_URL</code> dan <code>SUPABASE_SERVICE_ROLE_KEY</code> sudah dimasukkan di Vercel atau <code>.env.local</code>.
          </p>
        </div>
      )}

      {/* Tabel 21 Kolom Booking Interaktif (Client Component) */}
      <BookingTable initialBookings={bookings} />
    </main>
  );
}
