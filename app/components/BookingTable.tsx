"use client";

import { useState, useMemo } from "react";

export interface BookingItem {
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

interface BookingTableProps {
  initialBookings: BookingItem[];
}

export default function BookingTable({ initialBookings }: BookingTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Dapatkan daftar ruangan unik untuk opsi filter dropdown
  const roomList = useMemo(() => {
    const rooms = new Set<string>();
    initialBookings.forEach((b) => {
      const r = b.ruangan || b.jenis_ruangan;
      if (r) rooms.add(r);
    });
    return Array.from(rooms).sort();
  }, [initialBookings]);

  // Filter dinamis berdasarkan kata kunci pencarian, ruangan, dan status
  const filteredBookings = useMemo(() => {
    return initialBookings.filter((item) => {
      // Filter Ruangan
      const itemRoom = item.ruangan || item.jenis_ruangan || "";
      if (selectedRoom !== "ALL" && itemRoom !== selectedRoom) {
        return false;
      }

      // Filter Status
      if (selectedStatus !== "ALL" && (item.status_booking || "") !== selectedStatus) {
        return false;
      }

      // Filter Pencarian Teks
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchId = String(item.form_id).includes(q);
      const matchKegiatan = (item.nama_kegiatan || "").toLowerCase().includes(q);
      const matchPic = (item.pic || "").toLowerCase().includes(q);
      const matchPengisi = (item.nama_pengisi || "").toLowerCase().includes(q);
      const matchRuangan = itemRoom.toLowerCase().includes(q);
      const matchBinusian = (item.binusian_id || "").toLowerCase().includes(q);

      return matchId || matchKegiatan || matchPic || matchPengisi || matchRuangan || matchBinusian;
    });
  }, [initialBookings, searchQuery, selectedRoom, selectedStatus]);

  return (
    <section style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
      {/* Bilah Pencarian & Filter */}
      <div style={{ padding: "18px 24px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#fafbfc" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          {/* Input Pencarian */}
          <div style={{ flex: "1 1 280px", minWidth: "240px" }}>
            <input
              type="text"
              placeholder="🔍 Cari kegiatan, ruangan, PIC, BINUSIAN ID, atau ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 14px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Filter Ruangan & Status */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontSize: "13px",
                backgroundColor: "#ffffff",
                color: "#374151",
              }}
            >
              <option value="ALL">Semua Ruangan ({roomList.length})</option>
              {roomList.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>

            {searchQuery || selectedRoom !== "ALL" || selectedStatus !== "ALL" ? (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedRoom("ALL");
                  setSelectedStatus("ALL");
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#fee2e2",
                  color: "#991b1b",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Reset Filter
              </button>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: "10px", fontSize: "12px", color: "#6b7280", display: "flex", justifyContent: "space-between" }}>
          <span>Menampilkan <strong>{filteredBookings.length}</strong> dari {initialBookings.length} peminjaman</span>
          {searchQuery && <span>Hasil untuk: &quot;{searchQuery}&quot;</span>}
        </div>
      </div>

      {/* Tabel Data */}
      {filteredBookings.length === 0 ? (
        <div style={{ padding: "50px 24px", textAlign: "center", color: "#6b7280" }}>
          <p style={{ margin: 0, fontSize: "15px" }}>Tidak ada peminjaman yang cocok dengan filter pencarian.</p>
          <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "#9ca3af" }}>
            Coba ubah kata kunci atau reset filter pencarian di atas.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f9fafb", color: "#4b5563", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>
                <th style={{ padding: "12px 14px" }}>ID</th>
                <th style={{ padding: "12px 14px" }}>Nama Kegiatan</th>
                <th style={{ padding: "12px 14px" }}>Ruangan</th>
                <th style={{ padding: "12px 14px" }}>Pelaksanaan</th>
                <th style={{ padding: "12px 14px" }}>Jam</th>
                <th style={{ padding: "12px 14px" }}>Peminjam / PIC</th>
                <th style={{ padding: "12px 14px" }}>BINUSIAN ID</th>
                <th style={{ padding: "12px 14px", textAlign: "center" }}>Peserta</th>
                <th style={{ padding: "12px 14px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((item) => (
                <tr key={item.form_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px 14px", fontWeight: "700", color: "#2563eb" }}>#{item.form_id}</td>
                  <td style={{ padding: "12px 14px", fontWeight: "600", color: "#111827", maxWidth: "250px" }}>
                    {item.nama_kegiatan || "-"}
                    {item.jenis_kegiatan && (
                      <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>{item.jenis_kegiatan}</div>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                    <span style={{ backgroundColor: "#eff6ff", color: "#1e40af", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>
                      {item.ruangan || item.jenis_ruangan || "-"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", color: "#374151", whiteSpace: "nowrap" }}>
                    {item.tanggal_mulai || (item.waktu_mulai ? new Date(item.waktu_mulai).toLocaleDateString("id-ID") : "-")}
                  </td>
                  <td style={{ padding: "12px 14px", color: "#374151", whiteSpace: "nowrap" }}>
                    {item.jam || "-"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: "500", color: "#111827" }}>{item.pic || item.nama_pengisi || "-"}</div>
                    <div style={{ fontSize: "11px", color: "#9ca3af" }}>{item.email_konfirmasi || item.email_pengisi || "-"}</div>
                  </td>
                  <td style={{ padding: "12px 14px", color: "#4b5563" }}>
                    {item.binusian_id || "-"}
                    {item.status_binusian && (
                      <div style={{ fontSize: "11px", color: "#6b7280" }}>{item.status_binusian}</div>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px", color: "#374151", textAlign: "center" }}>
                    {item.jumlah_peserta ?? "-"}
                  </td>
                  <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                    <span style={{
                      backgroundColor: "#ecfdf5",
                      color: "#065f46",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: "600"
                    }}>
                      {item.status_booking || "Tersimpan"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

