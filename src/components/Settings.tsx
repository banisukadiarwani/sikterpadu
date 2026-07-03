import React, { useState } from 'react';
import { SIKTState } from '../types';
import { testAppsScriptConnection, getGoogleAppsScriptCode } from '../services/api';
import { Settings as SettingsIcon, ShieldCheck, Database, FileCode, CheckCircle, AlertTriangle, Play, HelpCircle, Copy, FolderGit } from 'lucide-react';

interface SettingsProps {
  state: SIKTState;
  onUpdateState: (newState: SIKTState) => void;
  triggerManualSyncPull: () => void;
  triggerManualSyncPush: () => void;
  isSyncing: boolean;
  syncStatus: string | null;
}

export default function Settings({ 
  state, 
  onUpdateState, 
  triggerManualSyncPull, 
  triggerManualSyncPush, 
  isSyncing, 
  syncStatus 
}: SettingsProps) {
  
  const { appsScriptUrl } = state;
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Test GAS connection
  const handleTestConnection = async () => {
    if (!appsScriptUrl) {
      setTestResult({ success: false, message: 'Google Apps Script URL tidak terkonfigurasi pada .env (VITE_APPS_SCRIPT_URL).' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    const res = await testAppsScriptConnection(appsScriptUrl);
    setTestResult(res);
    setIsTesting(false);
  };

  // Copier trigger for GAS code block
  const handleCopyCode = () => {
    navigator.clipboard.writeText(getGoogleAppsScriptCode());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. KETENTUAN HAK AKSES DAN PERAN SIKT */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs space-y-4">
        <h2 className="font-extrabold text-slate-850 flex items-center gap-2 text-sm uppercase tracking-wider text-slate-700">
          <ShieldCheck className="h-5 w-5 text-indigo-600" /> Hak Akses & Peran Pengguna SIKT
        </h2>
        <p className="text-xs text-slate-500 leading-normal">
          Aplikasi Sistem Informasi Silsilah Keluarga Terpadu (SIKT) mengimplementasikan Role-Based Access Control (RBAC) untuk mengamankan data silsilah keluarga, pencatatan kas, dan arsip dokumen resmi. Berikut rincian wewenang masing-masing peran:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 border border-indigo-100 bg-indigo-50/10 rounded-xl flex flex-col justify-between">
            <div>
              <p className="font-extrabold text-indigo-950 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                🛡️ Administrator
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Memiliki kendali penuh (CRUD) terhadap silsilah anggota keluarga, agenda kegiatan, mutasi buku kas masuk/keluar, berkas digital, galeri audio/visual, serta pengaturan sinkronisasi database cloud.
              </p>
            </div>
          </div>

          <div className="p-4 border border-emerald-100 bg-emerald-50/10 rounded-xl flex flex-col justify-between">
            <div>
              <p className="font-extrabold text-emerald-950 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                💼 Bendahara
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Wewenang penuh untuk mencatat keuangan (buku kas masuk & kas keluar), mengunggah bukti transaksi, dan mencetak laporan keuangan. Memiliki akses baca silsilah & dokumen, serta melihat agenda acara.
              </p>
            </div>
          </div>

          <div className="p-4 border border-amber-100 bg-amber-50/10 rounded-xl flex flex-col justify-between">
            <div>
              <p className="font-extrabold text-amber-950 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                👤 Anggota Keluarga
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Akses penelusuran silsilah keluarga, melihat rangkuman saldo kas, mengunggah dokumentasi foto/video kenangan ke album galeri, serta melihat jadwal agenda acara keluarga.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. GOOGLE APPS SCRIPT WEB APP INTEGRATION PORT & SYNC */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs space-y-4">
        <h2 className="font-extrabold text-slate-850 flex items-center gap-2 text-sm uppercase tracking-wider text-slate-700">
          <Database className="h-5 w-5 text-emerald-600" /> Integrasi & Sinkronisasi Google Sheets
        </h2>
        <p className="text-xs text-slate-500 leading-normal">
          SIKT dikonfigurasi menggunakan Google Sheets sebagai basis data awan real-time. URL Apps Script Web App sekarang dimuat secara otomatis dari environment variable sistem (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-600">VITE_APPS_SCRIPT_URL</code>) untuk memastikan sinkronisasi instan bagi seluruh pengguna (single source of truth).
        </p>

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-600">Google Apps Script Web App URL (Environment Variable)</label>
          <div className="flex gap-2">
            <input 
              type="text"
              readOnly
              placeholder="Tidak terkonfigurasi di .env (VITE_APPS_SCRIPT_URL)"
              value={appsScriptUrl}
              className="flex-1 px-3 py-1.5 border rounded-xl text-xs font-mono bg-slate-100 text-slate-500 cursor-not-allowed"
            />
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {isTesting ? 'Sedang Tes...' : 'Uji Koneksi'}
            </button>
          </div>

          {/* Test results check */}
          {testResult && (
            <div className={`p-4 rounded-xl text-xs border flex items-start gap-2.5 ${testResult.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
              {testResult.success ? <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />}
              <div>
                <p className="font-bold">{testResult.success ? 'Koneksi Berhasil!' : 'Koneksi Gagal/Error'}</p>
                <p className="mt-1 leading-normal whitespace-pre-line text-[11px] opacity-90">{testResult.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sync panel operations */}
        <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-800">Menarik Data Baru (PULL)</p>
            <p className="text-[11px] text-slate-400 leading-normal">Timpa data localSorage SIKT dengan data riil dari Spreadsheet Google Sheets Anda.</p>
            <button
              onClick={triggerManualSyncPull}
              disabled={isSyncing || !appsScriptUrl}
              className="py-1.5 px-4 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-xl transition w-full disabled:opacity-50"
            >
              Tarik Dari Sheets &rarr;
            </button>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-800">Kirim Data Lokal (PUSH)</p>
            <p className="text-[11px] text-slate-400 leading-normal">Kirim/sinkronkan data lokal Anda termasuk perubahan terbaru ke Google Sheets.</p>
            <button
              onClick={triggerManualSyncPush}
              disabled={isSyncing || !appsScriptUrl}
              className="py-1.5 px-4 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition w-full disabled:opacity-50"
            >
              Kirim Ke Sheets &larr;
            </button>
          </div>

          {/* Sync statuses messages */}
          {syncStatus && (
            <div className="col-span-1 sm:col-span-2 p-3 bg-slate-900 border text-slate-300 rounded-xl text-[10px] font-mono leading-normal">
              {syncStatus}
            </div>
          )}
        </div>
      </div>

      {/* 3. STEP-BY-STEP INTEGRATION SETUPS GUIDE (Sheets, Apps Script, Drive) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs space-y-5">
        <h2 className="font-extrabold text-slate-850 flex items-center gap-2 text-sm uppercase tracking-wider text-slate-700">
          <HelpCircle className="h-5 w-5 text-indigo-600" /> Panduan Lengkap Konfigurasi & Setup
        </h2>

        {/* Accordions explanations */}
        <div className="space-y-4 text-xs text-slate-600">
          
          {/* Step 1: Sheets */}
          <div className="space-y-2 border-b pb-4">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="p-1 bg-indigo-50 text-indigo-700 rounded font-mono text-[10px] px-1.5">Kunci 1</span> Setup Basis Data Google Sheets
            </p>
            <p className="leading-relaxed text-slate-600">
              Buatkan satu dokumen spreadsheet baru di akun Google Drive Anda dan berikan nama bebas (misalnya <em>Database SIKT</em>). 
              <strong className="text-emerald-700 block mt-1">✨ Kabar Baik: Anda TIDAK perlu lagi membuat sheets/tabs secara manual!</strong>
              Kode Google Apps Script di langkah berikutnya akan secara otomatis mendeteksi, membuat seluruh lembar tab, dan mengatur nama kolom di bawah ini saat pertama kali terkoneksi:
            </p>
            
            <div className="bg-slate-50 p-3 rounded-lg font-mono text-[10px] space-y-2 overflow-x-auto text-slate-700 leading-relaxed border select-all">
              <p><strong>Sheet: users</strong><br />id | nama | email | password_hash | role | status</p>
              <p><strong>Sheet: anggota_keluarga</strong><br />id | nama | gender | tempat_lahir | tanggal_lahir | ayah_id | ibu_id | pasangan_id | alamat | telepon | pekerjaan | foto | statusHidup | tanggalWafat</p>
              <p><strong>Sheet: kas_masuk</strong><br />id | tanggal | kategori | sumber | nominal | keterangan | bukti</p>
              <p><strong>Sheet: kas_keluar</strong><br />id | tanggal | kategori | nominal | keterangan | bukti</p>
              <p><strong>Sheet: agenda</strong><br />id | nama_acara | tanggal | lokasi | deskripsi | penanggung_jawab</p>
              <p><strong>Sheet: peserta_acara</strong><br />id | agenda_id | anggota_id | status_hadir</p>
              <p><strong>Sheet: galeri</strong><br />id | agenda_id | judul | file_url | file_type | uploader | tanggal_upload</p>
              <p><strong>Sheet: dokumen</strong><br />id | nama_dokumen | kategori | file_url | uploader | tanggal_upload</p>
            </div>
          </div>

          {/* Step 2: Apps Script code copy-paster */}
          <div className="space-y-2 border-b pb-4">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="p-1 bg-indigo-50 text-indigo-700 rounded font-mono text-[10px] px-1.5">Kunci 2</span> Google Apps Script Deployment
            </p>
            <p className="leading-relaxed">
              Di dokumen spreadsheet anda, klik menu <strong>Extensions (Ekstensi) &rarr; Apps Script</strong>. Hapus isi file kode <code>Code.gs</code> bawaan, lalu salin dan tempelkan naskah kode di bawah ini:
            </p>

            <div className="relative">
              <button
                onClick={handleCopyCode}
                className="absolute right-3 top-3 p-1.5 bg-slate-900 hover:bg-slate-800 text-white border border-slate-750 rounded-lg text-[10px] flex items-center gap-1 select-none transition"
              >
                <Copy className="h-3 w-3" /> {isCopied ? 'Tersalin' : 'Salin Kode'}
              </button>
              <pre className="p-3 bg-slate-950 text-slate-300 font-mono text-[10px] max-h-52 overflow-y-auto rounded-lg select-all border">
                {getGoogleAppsScriptCode()}
              </pre>
            </div>

            <p className="leading-relaxed mt-2 text-slate-500">
              Sesuaikan nilai <code>SPREADSHEET_ID</code> pada baris ke-7 dengan ID spreadsheet Anda. Lalu klik tombol <strong>Deploy &rarr; New Deployment</strong>. Pilih tipe <strong>Web App</strong>, atur konfigurasi <strong>Execute as: "Me"</strong> dan <strong>Who has access: "Anyone"</strong>. Salin URL Web App yang dihasilkan guna dimasukkan ke form uji koneksi di atas!
            </p>
          </div>

          {/* Step 3: Google Drive Folders setup */}
          <div className="space-y-2 border-b pb-4">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="p-1 bg-indigo-50 text-indigo-700 rounded font-mono text-[10px] px-1.5">Kunci 3</span> Struktur Folder Google Drive
            </p>
            <p className="leading-relaxed text-slate-600">
              Arsipkan foto profil silsilah, unggahan bukti kuitansi kas, album foto kenangan, dan berkas PDF berharga kedalam folder Google Drive terpusat. 
              <strong className="text-emerald-700 block mt-1">✨ Kabar Baik: Pembuatan folder ini sepenuhnya OTOMATIS!</strong>
              Ketika Anda mengklik tombol **"Uji Koneksi"** setelah memasukkan URL Apps Script Anda di atas, skrip akan secara cerdas memeriksa dan mempopulasikan paket struktur folder di bawah ini di dalam Google Drive Anda:
            </p>

            <pre className="p-3 bg-slate-50 font-mono text-[10px] rounded-lg border leading-relaxed">
{`KELUARGA/
├── FOTO/
│   ├── 2026_BERKAS/
│   └── PROFIL_SILSILAH/
├── KAS_BUKTI/
├── VIDEO/
└── DOKUMEN/`}
            </pre>
            <p className="text-slate-500">
              Data digital biner dikonversi ke format internal yang disimpan ke dalam folder Google Drive target di atas, melahirkan URL tautan global yang tersinkron otomatis ke lembaran spreadsheet Anda.
            </p>
          </div>

          {/* Step 4: Vercel deploy checklist */}
          <div className="space-y-2">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="p-1 bg-indigo-50 text-indigo-700 rounded font-mono text-[10px] px-1.5">Kunci 4</span> Langkah Deploy ke Vercel (Production)
            </p>
            <p className="leading-relaxed">
              Untuk melakukan penyebaran (deploy) aplikasi SIKT ke awan Vercel:
            </p>
            <ol className="list-decimal pl-4 space-y-1.5 text-slate-500 leading-relaxed">
              <li>Lakukan ekspor ZIP/GitHub repository murni melalui pengaturan menu sebelah kanan AI Studio Workspace.</li>
              <li>Masuk ke akun dasbor <strong>Vercel (vercel.com)</strong> dan klik tombol <em>Import Project</em> rujukan repo GitHub atau zip Anda.</li>
              <li>Vercel akan mendeteksi bundel project React/Vite.</li>
              <li>Tambahkan variabel rahasia pada panel Environment Variables: <code>VITE_GAS_API_URL</code> berisikan Google Apps Script Web App URL Anda sebagai preset server di awan!</li>
              <li>Klik <strong>Deploy</strong>. SIKT telah siap melayani keluarga besar di seluruh penjuru tanah air!</li>
            </ol>
          </div>

        </div>
      </div>

    </div>
  );
}
