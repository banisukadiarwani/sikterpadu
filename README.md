# Sistem Informasi Keluarga Terpadu (SIKT)

SIKT adalah aplikasi web modern, responsif, dan terintegrasi untuk mengelola seluruh data silsilah, administrasi pembukuan kas, agenda kegiatan, galeri foto, serta arsip dokumen digital keluarga besar.

Aplikasi ini menggunakan **React (Vite + TypeScript) + Tailwind CSS** di sisi frontend, dan dirancang untuk terhubung secara dinamis dengan **Google Sheets** sebagai database awan murah meriah, **Google Apps Script** sebagai REST API, dan **Google Drive** sebagai media storage.

---

## 🎨 FITUR UTAMA & MODUL SISTEM

1. **Dasbor Statistik Interaktif (Modul 1)**:
   - Pantau indikator vital: Total jiwa silsilah (hidup/wafat), saldo keuangan berjalan, hitung mundur agenda terdekat, & jumlah kenangan.
   - Grafik interaktif Recharts: Arus pemasukan vs pengeluaran kas bulanan dan demografi gender.
   - **Timeline Linimasa**: Rekaman peristiwa bersejarah keluarga (Kelahiran, pernikahan, wafat, silsilah).
2. **Silsilah Keluarga Visual (Modul 2)**:
   - Diagram silsilah visual dynamic SVG (Tree Chart) dengan fitur **Zoom, Pan (Drag Canvas)**, dan pencarian anggota silsilah dengan auto-suggestion.
   - Profil terstruktur: Data tanggal/tempat lahir, wafat, telepon, domisili alamat, dan pekerjaan.
   - Kelola hubungan (Ayah, Ibu, Pasangan, Anak) bersertifikasi pengaman relasi.
3. **Pembukuan Buku Kas Bersama (Modul 3)**:
   - Kelompokan audit arus masuk & arus keluar keuangan keluarga (iuran rampung, sumbangan, santunan, dsb).
   - Filter mutasi tanggal/bulan/kategori, unggah lampiran kuitansi/bukti transfer dengan Base64.
   - **Laporan LPJ Otomatis**: Rekap bulanan & format siap cetak fisik (Print-Friendly CSS / PDF Export).
4. **Kalender Pertemuan & RSVP (Modul 4)**:
   - Visualisasi tanggal kalender bulanan interaktif & mode daftar jadwal terdekat.
   - RSVP Konfirmasi Kehadiran Anggota (Hadir, Absen, Ragu) terkoordinasi real-time.
   - Panduan pengiriman notifikasi pengingat via email otomatis (H-30 s/d H-1) via Apps Script.
5. **Galeri Dokumentasi & Slideshow (Modul 5)**:
   - Unggah dokumentasi foto/video kenangan, terorganisasi berdasarkan album kegiatan / acara keluarga.
   - Slideshow lightbox interaktif dengan navigasi kiri/kanan, preview detil, dan tautan download langsung.
6. **Arsip PDF Berharga (Modul 6)**:
   - Manajemen berkas legal (Notulen rapat, undangan resmi, SK pengurus, Buku silsilah cetak).
   - Filter kategori cepat, search bar, preview format PDF simulasi, dan unduh berkas.
7. **RBAC Simulation & Integrator (Modul 7)**:
   - Ganti peran simulator (Administrator, Bendahara, Anggota) secara instan di menu untuk menguji pembatasan privasi CRUD.
   - Setup Google Apps Script API sync wizard dengan salinan kode gas siap tempel dan uji koneksi satu kali klik.

---

## 🛠️ STACK TEKNOLOGI

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Framer Motion
- **Database Cloud (Awan)**: Google Sheets & Google Drive
- **REST API Backend**: Google Apps Script Web App Engine
- **Deployment**: Vercel / Cloud Run (Port 3000)

---

## ⚙️ PANDUAN SETUP BASIS DATA GOOGLE SHEETS

1. Buat spreadsheet baru di akun Google Drive Anda.
2. Buat lembaran sheet (tabs) persis dengan headers (baris pertama) di bawah ini:

### Sheet: `users`
`id` | `nama` | `email` | `password_hash` | `role` | `status`

### Sheet: `anggota_keluarga`
`id` | `nama` | `gender` | `tempat_lahir` | `tanggal_lahir` | `ayah_id` | `ibu_id` | `pasangan_id` | `alamat` | `telepon` | `pekerjaan` | `foto` | `statusHidup` | `tanggalWafat`

### Sheet: `kas_masuk`
`id` | `tanggal` | `kategori` | `sumber` | `nominal` | `keterangan` | `bukti`

### Sheet: `kas_keluar`
`id` | `tanggal` | `kategori` | `nominal` | `keterangan` | `bukti`

### Sheet: `agenda`
`id` | `nama_acara` | `tanggal` | `lokasi` | `deskripsi` | `penanggung_jawab`

### Sheet: `peserta_acara`
`id` | `agenda_id` | `anggota_id` | `status_hadir`

### Sheet: `galeri`
`id` | `agenda_id` | `judul` | `file_url` | `file_type` | `uploader` | `tanggal_upload`

### Sheet: `dokumen`
`id` | `nama_dokumen` | `kategori` | `file_url` | `uploader` | `tanggal_upload`

---

## ☁️ DEPLOYMENT GOOGLE APPS SCRIPT (GAS API)

1. Di draf spreadsheet Anda, buka menu **Extensions (Ekstensi)** &rArr; **Apps Script**.
2. Buka berkas default `Code.gs` dan salin kode Apps Script penuh yang telah disediakan di dalam panel **Integrasi & Setup &rarr; Kunci 2** dari dasbor SIKT.
3. Ganti ID spreadsheet pada baris ke-7 dengan ID spreadsheet Anda saat ini.
4. Klik **Deploy** &rArr; **New Deployment**.
5. Pilih tipear: **Web App**. Setel:
   - **Execute as**: `Me (Email Anda)`
   - **Who has access**: `Anyone`
6. Salin **Web App URL** hasil deployment (biasanya diakhiri dengan `/exec`).
7. Buka panel Integrasi SIKT, tempelkan URL tersebut ke kolom input, lalu klik **Uji Koneksi**!

---

## 📁 STRUKTUR GOOGLE DRIVE

Jika ingin menyimpan media foto dan file PDF secara fisik di Google Drive, buatlah folder dengan hierarki folder berikut di akun Drive Anda:

```text
KELUARGA/
├── FOTO/
│   ├── 24_BERKAS/
│   └── PROFIL_SILSILAH/
├── KAS_BUKTI/
├── VIDEO/
└── DOKUMEN/
```

Setiap fungsionalitas unggah berkas lokal akan dikonversikan menjadi file Base64 biner, ditransfer ke Google Apps Script, disimpan di folder Drive di atas sesuai kategorinya, dan melahirkan URL publik permanen yang disalin ke database spreadsheet.

---

## 🚀 LANGKAH DEPLOYMENT VERCEL

1. Lakukan export repositori GitHub atau ZIP melalui settings menu kanan atas di Google AI Studio.
2. Impor project tersebut di website **Vercel (vercel.com)**.
3. Tambahkan environment variable pada dasbor konfigurasi Vercel:
   - `VITE_GAS_API_URL` = *(Isi dengan Google Apps Script Web App URL Anda)*
4. Klik tombol **Deploy** dan SIKT Anda kini aktif mendunia secara gratis!
