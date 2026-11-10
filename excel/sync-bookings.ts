/**
 * =============================================================================
 * MICROSOFT OFFICE SCRIPTS (TYPESCRIPT)
 * Sinkronisasi 21 Kolom Data Peminjaman Ruangan ke Vercel Web API
 * Dilengkapi dengan Diagnostik Error Lengkap & Error Handling Transparan
 * =============================================================================
 */

type ColType = "text" | "int" | "date" | "datetime";

interface ColumnSpec {
    key: string;        // nama kolom yang akan dikirim ke API
    headers: string[];  // header Excel yang diterima; akhiran * = cocokkan awalan
    type: ColType;
}

interface BookingRecord {
    [key: string]: string | number | null;
}

const SHEET_NAME = "Sheet1";
const MAX_ROWS = 50;

// ==========================================
// KONFIGURASI WEB API (VERCEL APP)
// ==========================================
const WEB_API_URL = "https://calendar-phi-hazel.vercel.app/api/bookings";
const API_SECRET_KEY = "GANTI_DENGAN_API_SECRET_KEY_DARI_VERCEL_ENV";

const COLUMNS: ColumnSpec[] = [
    { key: "form_id", headers: ["Id"], type: "int" },
    { key: "waktu_mulai", headers: ["Waktu mulai"], type: "datetime" },
    { key: "waktu_selesai", headers: ["Waktu selesai"], type: "datetime" },
    { key: "email_pengisi", headers: ["Email"], type: "text" },
    { key: "nama_pengisi", headers: ["Nama"], type: "text" },
    { key: "pic", headers: ["Nama Peminjam*"], type: "text" },
    { key: "status_binusian", headers: ["Status BINUSIAN"], type: "text" },
    { key: "binusian_id", headers: ["BINUSIAN ID"], type: "text" },
    { key: "email_konfirmasi", headers: ["Email untuk konfirmasi*"], type: "text" },
    { key: "telepon", headers: ["Masukkan Nomor Telepon*"], type: "text" },
    { key: "kebutuhan_ruangan", headers: ["Kebutuhan Ruangan"], type: "text" },
    { key: "jumlah_peserta", headers: ["Tuliskan jumlah orang*"], type: "int" },
    { key: "jenis_ruangan", headers: ["Jenis ruangan yang akan dipinjam*"], type: "text" },
    { key: "nama_kegiatan", headers: ["Nama Kegiatan"], type: "text" },
    { key: "ruangan", headers: ["Nama Kegiatan2", "Ruangan booking*"], type: "text" },
    { key: "tanggal_mulai", headers: ["Nama Kegiatan3", "Tanggal Pelaksanaan*"], type: "date" },
    { key: "tanggal_selesai", headers: ["Nama Kegiatan4", "Tanggal Berakhir*"], type: "date" },
    { key: "jam", headers: ["Nama Kegiatan5", "Jam Penggunaan*"], type: "text" },
    { key: "peralatan", headers: ["Nama Kegiatan6"], type: "text" },
    { key: "jenis_kegiatan", headers: ["Nama Kegiatan7"], type: "text" },
    { key: "status_booking", headers: ["Nama Kegiatan8"], type: "text" },
];

async function main(workbook: ExcelScript.Workbook): Promise<string> {
    console.log("=== [LANGKAH 1] Memeriksa Worksheet dan Tabel ===");
    const sheet = workbook.getWorksheet(SHEET_NAME);
    if (!sheet) {
        throw new Error(`[KESALAHAN TABEL] Sheet dengan nama "${SHEET_NAME}" tidak ditemukan. Pastikan nama tab sheet adalah "${SHEET_NAME}".`);
    }

    const tables = sheet.getTables();
    if (tables.length === 0) {
        throw new Error(`[KESALAHAN TABEL] Tidak ditemukan Tabel Excel di sheet "${SHEET_NAME}". Blok data Anda lalu tekan Ctrl+T untuk membuat tabel.`);
    }

    const table = tables[0];
    const headers = table.getHeaderRowRange().getTexts()[0].map(h => normalize(h));
    const colIndex = COLUMNS.map(spec => findColumn(headers, spec.headers));
    const missing = COLUMNS
        .filter((spec, i) => colIndex[i] < 0)
        .map(spec => spec.headers.join(" / "));
        
    if (missing.length > 0) {
        throw new Error(`[KESALAHAN HEADER KOLOM] Kolom berikut tidak ditemukan di tabel Excel:\n-> ${missing.join("\n-> ")}`);
    }

    console.log("=== [LANGKAH 2] Membaca dan Memfilter Data ===");
    const body: ExcelScript.Range = table.getRangeBetweenHeaderAndTotal();
    const values = body.getValues();
    const texts = body.getTexts();

    const records: BookingRecord[] = [];
    for (let r = 0; r < values.length; r++) {
        const rec: BookingRecord = {};
        COLUMNS.forEach((spec, i) => {
            const c = colIndex[i];
            rec[spec.key] = convert(spec.type, values[r][c], texts[r][c]);
        });
        
        // Lewati baris tanpa Id atau tanpa nama kegiatan
        if (rec["form_id"] === null || rec["nama_kegiatan"] === null) continue;
        records.push(rec);
    }

    // Urutkan Id terbesar dan buang duplikat Id
    records.sort((a, b) => (b["form_id"] as number) - (a["form_id"] as number));
    const unique = records.filter(
        (rec, i) => i === 0 || rec["form_id"] !== records[i - 1]["form_id"]
    );
    const latest = unique.slice(0, MAX_ROWS);

    if (latest.length === 0) {
        return "Tidak ada baris data peminjaman yang valid untuk dikirim ke API.";
    }

    console.log(`[INFO DATA] Ditemukan ${records.length} baris total. Siap mengirim ${latest.length} baris unik terbaru.`);
    console.log(`[INFO DATA] Rentang ID: ${latest[latest.length - 1]["form_id"]} s/d ${latest[0]["form_id"]}`);

    // ==========================================
    // [LANGKAH 3] PENGIRIMAN DATA KE WEB API VERCEL
    // ==========================================
    console.log(`=== [LANGKAH 3] Mengirim Data ke Web API: ${WEB_API_URL} ===`);
    const startTime = Date.now();

    try {
        const response = await fetch(WEB_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_SECRET_KEY
            },
            body: JSON.stringify(latest)
        });

        const duration = Date.now() - startTime;
        console.log(`[RESPON SERVER] Status HTTP: ${response.status} ${response.statusText} (${duration} ms)`);

        // Jika server mengembalikan status HTTP selain 2xx
        if (!response.ok) {
            let errorBody = "";
            try {
                const jsonErr = await response.json();
                errorBody = jsonErr.message || JSON.stringify(jsonErr);
            } catch {
                errorBody = await response.text();
            }

            if (response.status === 401) {
                throw new Error(`[ERROR 401: Akses Ditolak] Kunci API tidak cocok!\nDetail Server: ${errorBody}\nPeriksa apakah API_SECRET_KEY di script ini persis sama dengan yang diisi di Environment Variables Vercel.`);
            } else if (response.status === 400) {
                throw new Error(`[ERROR 400: Format Salah] Data ditolak oleh server.\nDetail Server: ${errorBody}`);
            } else if (response.status === 500) {
                throw new Error(`[ERROR 500: Server Vercel/Supabase Gagal]\nDetail Server: ${errorBody}\nCek koneksi database atau Service Role Key Supabase Anda.`);
            } else {
                throw new Error(`[ERROR ${response.status}] ${response.statusText}\nDetail Server: ${errorBody}`);
            }
        }

        const resultJson = await response.json();
        console.log("=== [SELESAI] Data Berhasil Disimpan ke Supabase! ===");
        console.log("Pesan Server:", resultJson.message || "Sukses");
        return `Sukses: ${latest.length} baris data berhasil disinkronkan ke Supabase.`;

    } catch (error: any) {
        const rawMsg = error instanceof Error ? error.message : String(error);
        console.error("Gagal melakukan panggilan API:", rawMsg);

        // Penanganan Khusus untuk error 'Failed to fetch' (CORS / Browser Network Blocker)
        if (rawMsg.includes("Failed to fetch") || rawMsg.includes("TypeError")) {
            const petunjuk = [
                "----------------------------------------------------------------",
                "[DIAGNOSA KESALAHAN: Failed to fetch]",
                "Request tidak sampai ke server karena diblokir oleh browser sebelum terkirim.",
                "",
                "3 KEMUNGKINAN PENYEBAB & SOLUSINYA:",
                "1. [CORS / Preflight Vercel]: Server Vercel belum memperbolehkan request dari domain Excel (officeapps.live.com).",
                "   -> Solusi: Buka Vercel Dashboard -> Deployments -> Klik 'Redeploy' pada versi terbaru.",
                "2. [Ekstensi Browser Pemblokir / AdBlocker]:",
                "   -> Solusi: Jika menggunakan Brave, matikan 'Brave Shields'. Jika ada AdBlock/uBlock Origin, matikan sementara di tab Excel ini.",
                "3. [Jaringan Kampus / Zscaler / Proxy]:",
                "   -> Jaringan membatasi fetch() ke domain luar dari dalam tab Office 365.",
                "",
                "CARA MELIHAT DETAIL ASLI BROWSER:",
                "Tekan F12 pada keyboard -> Buka tab 'Console' -> Cari baris teks berwarna MERAH.",
                "----------------------------------------------------------------"
            ].join("\n");

            console.error(petunjuk);
            throw new Error(`[GAGAL KONEKSI: Failed to fetch]\nBrowser Anda memblokir koneksi ke ${WEB_API_URL}.\nBuka Console browser (tekan F12) untuk melihat error spesifiknya.`);
        }

        throw error;
    }
}

function convert(type: ColType, value: string | number | boolean, text: string): string | number | null {
    const t = text.trim();
    if (t === "") return null;
    switch (type) {
        case "int": {
            if (typeof value === "number") return Math.round(value);
            const m = t.match(/\d+/);
            return m ? parseInt(m[0], 10) : null;
        }
        case "date":
            return typeof value === "number" ? serialToIso(value, false) : parseDateText(t, false);
        case "datetime":
            return typeof value === "number" ? serialToIso(value, true) : parseDateText(t, true);
        default:
            return t;
    }
}

// Nomor seri tanggal Excel -> "YYYY-MM-DD" atau "YYYY-MM-DD HH:MM:SS"
function serialToIso(serial: number, withTime: boolean): string | null {
    if (serial < 36526) return null; // sebelum tahun 2000 = hampir pasti bukan tanggal
    const d = new Date(Math.round((serial - 25569) * 86400000));
    const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    if (!withTime) return date;
    return `${date} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

// Teks "11/3/2026" atau "10/29/26 4:28 PM" (format bulan/tanggal/tahun)
function parseDateText(t: string, withTime: boolean): string | null {
    const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?)?$/i);
    if (!m) return null;
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const month = Number(m[1]);
    const day = Number(m[2]);
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
    const date = `${year}-${pad(month)}-${pad(day)}`;
    if (!withTime) return date;
    let h = m[4] ? Number(m[4]) : 0;
    const ap = m[7] ? m[7].toUpperCase() : "";
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return `${date} ${pad(h)}:${m[5] ? m[5] : "00"}:${m[6] ? m[6] : "00"}`;
}

function findColumn(headers: string[], names: string[]): number {
    for (const name of names) {
        const prefix = name.endsWith("*");
        const target = normalize(prefix ? name.slice(0, -1) : name);
        const i = headers.findIndex(h => (prefix ? h.startsWith(target) : h === target));
        if (i >= 0) return i;
    }
    return -1;
}

function normalize(s: string): string {
    return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

