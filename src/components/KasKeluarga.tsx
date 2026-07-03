import React, { useState, useMemo } from 'react';
import { SIKTState, KasMasuk, KasKeluar } from '../types';
import { Plus, TrendingUp, TrendingDown, Receipt, Calendar, Filter, FileText, Printer, Check, Search, X } from 'lucide-react';
import { getCleanDriveUrl } from '../services/api';

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = cleanDateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

interface KasKeluargaProps {
  state: SIKTState;
  onUpdateState: (newState: SIKTState) => void;
}

export default function KasKeluarga({ state, onUpdateState }: KasKeluargaProps) {
  const { kasMasuk, kasKeluar, anggota } = state;
  const isWritable = state.currentUser?.role === 'Administrator';

  // UI state
  const [activeSubTab, setActiveSubTab] = useState<'masuk' | 'keluar' | 'laporan'>('masuk');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog state
  const [isAddingMasuk, setIsAddingMasuk] = useState(false);
  const [isAddingKeluar, setIsAddingKeluar] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  // Form states
  const [formMasuk, setFormMasuk] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    kategori: 'Iuran Bulanan',
    sumber: anggota[0]?.nama || '',
    nominal: '',
    keterangan: '',
    bukti: '',
  });

  const [formKeluar, setFormKeluar] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    kategori: 'Santunan',
    nominal: '',
    keterangan: '',
    bukti: '',
  });

  // Calculate totals
  const totalMasuk = useMemo(() => kasMasuk.reduce((sum, item) => sum + item.nominal, 0), [kasMasuk]);
  const totalKeluar = useMemo(() => kasKeluar.reduce((sum, item) => sum + item.nominal, 0), [kasKeluar]);
  const saldoBaru = totalMasuk - totalKeluar;

  // Categories helper
  const kategoriMasukOptions = ['Iuran Bulanan', 'Sumbangan', 'Sponsorship', 'Usaha Keluarga', 'Lain-lain'];
  const kategoriKeluarOptions = ['Santunan', 'Arisan Keluarga', 'Konsumsi', 'Sewa Tempat/Operasional', 'Lain-lain'];

  // Handle receipt image files base64
  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'masuk' | 'keluar') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'masuk') {
          setFormMasuk(prev => ({ ...prev, bukti: reader.result as string }));
        } else {
          setFormKeluar(prev => ({ ...prev, bukti: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Filtered lists
  const filteredMasuk = useMemo(() => {
    return [...kasMasuk].filter(item => {
      const matchMonth = filterMonth ? item.tanggal.startsWith(filterMonth) : true;
      const matchKat = filterKategori ? item.kategori === filterKategori : true;
      const matchQuery = searchQuery ? (
        item.sumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.keterangan.toLowerCase().includes(searchQuery.toLowerCase())
      ) : true;
      return matchMonth && matchKat && matchQuery;
    }).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [kasMasuk, filterMonth, filterKategori, searchQuery]);

  const filteredKeluar = useMemo(() => {
    return [...kasKeluar].filter(item => {
      const matchMonth = filterMonth ? item.tanggal.startsWith(filterMonth) : true;
      const matchKat = filterKategori ? item.kategori === filterKategori : true;
      const matchQuery = searchQuery ? (
        item.keterangan.toLowerCase().includes(searchQuery.toLowerCase())
      ) : true;
      return matchMonth && matchKat && matchQuery;
    }).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [kasKeluar, filterMonth, filterKategori, searchQuery]);

  // Form triggers
  const handleSaveMasuk = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: KasMasuk = {
      id: `KM_${Date.now()}`,
      tanggal: formMasuk.tanggal,
      kategori: formMasuk.kategori,
      sumber: formMasuk.sumber,
      nominal: parseFloat(formMasuk.nominal) || 0,
      keterangan: formMasuk.keterangan,
      bukti: formMasuk.bukti || '',
    };

    onUpdateState({
      ...state,
      kasMasuk: [newEntry, ...state.kasMasuk],
    });
    setIsAddingMasuk(false);
    setFormMasuk({
      tanggal: new Date().toISOString().split('T')[0],
      kategori: 'Iuran Bulanan',
      sumber: anggota[0]?.nama || '',
      nominal: '',
      keterangan: '',
      bukti: '',
    });
  };

  const handleSaveKeluar = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: KasKeluar = {
      id: `KK_${Date.now()}`,
      tanggal: formKeluar.tanggal,
      kategori: formKeluar.kategori,
      nominal: parseFloat(formKeluar.nominal) || 0,
      keterangan: formKeluar.keterangan,
      bukti: formKeluar.bukti || '',
    };

    onUpdateState({
      ...state,
      kasKeluar: [newEntry, ...state.kasKeluar],
    });
    setIsAddingKeluar(false);
    setFormKeluar({
      tanggal: new Date().toISOString().split('T')[0],
      kategori: 'Santunan',
      nominal: '',
      keterangan: '',
      bukti: '',
    });
  };

  // Printing report trigger
  const handlePrintReport = () => {
    window.print();
  };

  // Generate monthly aggregation calculations for Report view
  const reportsByMonth = useMemo(() => {
    const monthlyStats: Record<string, { masuk: number; keluar: number }> = {};
    const sortedAll = [...kasMasuk].map(k => ({ ...k, type: 'masuk' }))
      .concat(kasKeluar.map(k => ({ ...k, type: 'keluar' } as any)));
      
    sortedAll.forEach(item => {
      const monthKey = item.tanggal.substring(0, 7); // YYYY-MM
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { masuk: 0, keluar: 0 };
      }
      if (item.type === 'masuk') {
        monthlyStats[monthKey].masuk += item.nominal;
      } else {
        monthlyStats[monthKey].keluar += item.nominal;
      }
    });

    return Object.entries(monthlyStats).map(([bulan, stats]) => ({
      bulan,
      masuk: stats.masuk,
      keluar: stats.keluar,
      net: stats.masuk - stats.keluar,
    })).sort((a, b) => b.bulan.localeCompare(a.bulan));
  }, [kasMasuk, kasKeluar]);

  return (
    <div className="space-y-6">
      
      {/* Treasury Top Banner widget (Saldo, Total Masuk, Total Keluar) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        
        {/* Card 1: Balance */}
        <div className="p-5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white shadow-sm border border-emerald-400">
          <div className="flex justify-between items-center opacity-90 text-xs font-semibold uppercase tracking-wider">
            <span>Saldo Berjalan Kas</span>
            <Receipt className="h-4 w-4" />
          </div>
          <p className="text-3xl font-extrabold mt-2 font-mono">
            Rp {saldoBaru.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] mt-2 text-emerald-100 font-medium">Buku keuangan dikelola terdesentralisasi</p>
        </div>

        {/* Card 2: Income */}
        <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-4">
          <span className="p-3.5 rounded-full bg-emerald-50 text-emerald-600">
            <TrendingUp className="h-6 w-6" />
          </span>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Kas Masuk</span>
            <p className="text-xl font-bold font-mono text-slate-800 mt-0.5">
              Rp {totalMasuk.toLocaleString('id-ID')}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{kasMasuk.length} Transaksi</p>
          </div>
        </div>

        {/* Card 3: Outflow */}
        <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-4">
          <span className="p-3.5 rounded-full bg-rose-50 text-rose-600">
            <TrendingDown className="h-6 w-6" />
          </span>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Kas Keluar</span>
            <p className="text-xl font-bold font-mono text-slate-800 mt-0.5">
              Rp {totalKeluar.toLocaleString('id-ID')}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{kasKeluar.length} Alokasi</p>
          </div>
        </div>
      </div>

      {/* Navigation SubTabs (Masuk, Keluar, Laporan/Report) */}
      <div className="flex border-b border-slate-100 pb-px gap-6 no-print">
        <button
          onClick={() => { setActiveSubTab('masuk'); setFilterKategori(''); }}
          className={`pb-3 text-sm font-semibold border-b-2 transition relative ${activeSubTab === 'masuk' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Pemasukan / Uang Masuk
        </button>
        <button
          onClick={() => { setActiveSubTab('keluar'); setFilterKategori(''); }}
          className={`pb-3 text-sm font-semibold border-b-2 transition relative ${activeSubTab === 'keluar' ? 'border-rose-600 text-rose-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Pengeluaran / Uang Keluar
        </button>
        <button
          onClick={() => { setActiveSubTab('laporan'); setFilterKategori(''); }}
          className={`pb-3 text-sm font-semibold border-b-2 transition relative ${activeSubTab === 'laporan' ? 'border-indigo-600 text-indigo-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <span className="flex items-center gap-1"><FileText className="h-4 w-4" /> Laporan Buku Kas</span>
        </button>
      </div>

      {/* FILTER CONTROL RAILS (Not shown when viewing laporan/reports) */}
      {activeSubTab !== 'laporan' && (
        <div className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-50 border rounded-2xl no-print sm:items-center">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold grow">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <span>Saring Buku</span>
          </div>

          <div className="grid grid-cols-2 sm:flex gap-2">
            {/* Month selector */}
            <input 
              type="month" 
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:outline-emerald-500" 
            />

            {/* Category selection */}
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:outline-emerald-500"
            >
              <option value="">Semua Kategori</option>
              {activeSubTab === 'masuk' ? 
                kategoriMasukOptions.map(k => <option key={k} value={k}>{k}</option>) :
                kategoriKeluarOptions.map(k => <option key={k} value={k}>{k}</option>)
              }
            </select>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari keterangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-48 pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-500 text-slate-700"
            />
          </div>

          {/* Add triggers */}
          {isWritable && (
            <button
              onClick={() => activeSubTab === 'masuk' ? setIsAddingMasuk(true) : setIsAddingKeluar(true)}
              className={`py-1.5 px-4 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-1 sm:ml-auto ${activeSubTab === 'masuk' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'}`}
            >
              <Plus className="h-4 w-4" /> Tambah Transaksi
            </button>
          )}
        </div>
      )}

      {/* LEDGER CONTENT SWITCHES */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden no-print">
        
        {/* TAB 1: KAS MASUK LIST */}
        {activeSubTab === 'masuk' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Sila Kategori</th>
                  <th className="py-3 px-4">Sumber / Penyumbang</th>
                  <th className="py-3 px-4">Keterangan Catatan</th>
                  <th className="py-3 px-4 text-right">Nominal Jumlah</th>
                  <th className="py-3 px-4 text-center">Bukti Rekaman</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMasuk.length > 0 ? (
                  filteredMasuk.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-mono text-xs">{formatDate(item.tanggal)}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100">
                          {item.kategori}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{item.sumber}</td>
                      <td className="py-3.5 px-4">{item.keterangan}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                        +Rp {item.nominal.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {item.bukti ? (
                          <button 
                            onClick={() => setSelectedReceipt(item.bukti)}
                            className="p-1 px-2.5 bg-slate-50 hover:bg-emerald-50 text-[11px] font-semibold text-emerald-700 border hover:border-emerald-200 rounded-lg transition"
                          >
                            Lihat Bukti
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs italic">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 italic">Tidak ditemukan riwayat kas masuk.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: KAS KELUAR LIST */}
        {activeSubTab === 'keluar' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Sila Kategori</th>
                  <th className="py-3 px-4">Keterangan Catatan</th>
                  <th className="py-3 px-4 text-right">Nominal Jumlah</th>
                  <th className="py-3 px-4 text-center">Bukti Rekaman</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredKeluar.length > 0 ? (
                  filteredKeluar.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-mono text-xs">{formatDate(item.tanggal)}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-100">
                          {item.kategori}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{item.keterangan}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-700">
                        -Rp {item.nominal.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {item.bukti ? (
                          <button 
                            onClick={() => setSelectedReceipt(item.bukti)}
                            className="p-1 px-2.5 bg-slate-50 hover:bg-rose-50 text-[11px] font-semibold text-rose-700 border hover:border-rose-200 rounded-lg transition"
                          >
                            Lihat Bukti
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs italic">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 italic">Tidak ditemukan riwayat kas keluar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: MONTHLY & ANNUAL AGGREGATION REPORT VIEW */}
        {activeSubTab === 'laporan' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-4 gap-3">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" /> Ringkasan Pembukuan Kas Bulanan
                </h3>
                <p className="text-xs text-slate-400 mt-1">Laporan rekapitulasi performa saldo mengalir per bulan kalender</p>
              </div>
              <button
                onClick={handlePrintReport}
                className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer className="h-4 w-4" /> Cetak Laporan (PDF)
              </button>
            </div>

            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left border-collapse text-sm text-slate-600">
                <thead>
                  <tr className="bg-slate-50 border-b text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <th className="py-3 px-4">Bulan Periode</th>
                    <th className="py-3 px-4 text-right">Pemasukan (+)</th>
                    <th className="py-3 px-4 text-right">Pengeluaran (-)</th>
                    <th className="py-3 px-4 text-right">Selisih Bersih (Net)</th>
                    <th className="py-3 px-4 text-center">Status Neraca</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportsByMonth.map(rep => (
                    <tr key={rep.bulan} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-bold text-slate-800 font-mono">
                        {new Date(rep.bulan + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">+Rp {rep.masuk.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">-Rp {rep.keluar.toLocaleString('id-ID')}</td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${rep.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        Rp {rep.net.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rep.net >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {rep.net >= 0 ? 'SURPLUS' : 'DEFISIT'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Print Signature Block (designed for physical paper sign-off checks!) */}
            <div className="pt-12 grid grid-cols-2 gap-6 text-center text-xs text-slate-600 hidden print-only">
              <div className="space-y-12">
                <p>Dilaporkan Oleh,</p>
                <div>
                  <p className="font-bold underline">Dewi Sukadi Arwani</p>
                  <p className="text-slate-400">Bendahara Keluarga</p>
                </div>
              </div>
              <div className="space-y-12">
                <p>Mengetahui,</p>
                <div>
                  <p className="font-bold underline">Budi Sukadi Arwani</p>
                  <p className="text-slate-400">Administrator Utama SIKT</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PRINT-ONLY CSS CONTAINER (Rendered secretly only on browser printing events!) */}
      <div className="hidden print-only p-8 bg-white text-black space-y-6">
        <center className="space-y-1 border-b-2 pb-4">
          <h1 className="text-2xl font-black tracking-widest">SISTEM INFORMASI KELUARGA TERPADU (SIKT)</h1>
          <p className="text-sm font-bold uppercase tracking-wider">Laporan Pertanggungjawaban Buku Keuangan Kas Keluarga</p>
          <p className="text-xs text-slate-500">Dicetak pada tanggal: {formatDate(new Date().toISOString())}</p>
        </center>

        <div className="grid grid-cols-3 gap-4 border p-4 bg-slate-50 rounded">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-500">Total Pemasukan</p>
            <p className="text-base font-bold font-mono">Rp {totalMasuk.toLocaleString('id-ID')}</p>
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-slate-500">Total Pengeluaran</p>
            <p className="text-base font-bold font-mono">Rp {totalKeluar.toLocaleString('id-ID')}</p>
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-slate-500">Saldo Akhir Berjalan</p>
            <p className="text-base font-bold font-mono underline text-emerald-800">Rp {saldoBaru.toLocaleString('id-ID')}</p>
          </div>
        </div>

        <h3 className="text-sm font-bold uppercase tracking-wider border-b pb-1">Tinjauan Mutasi Kas Terakhir</h3>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b bg-slate-100 font-bold">
              <th className="p-2">Tanggal</th>
              <th className="p-2">Kelompok</th>
              <th className="p-2">Uraian Transaksi</th>
              <th className="p-2 text-right">Jumlah Nominal</th>
            </tr>
          </thead>
          <tbody>
            {/* We map a combined sorted ledger for printing */}
            {[...kasMasuk].map(k => ({ ...k, type: 'masuk', sign: '+' }))
              .concat(kasKeluar.map(k => ({ ...k, type: 'keluar', sign: '-' } as any)))
              .sort((a,b) => b.tanggal.localeCompare(a.tanggal))
              .map(item => (
                <tr key={item.id} className="border-b hover:bg-slate-50/50">
                  <td className="p-2 font-mono">{formatDate(item.tanggal)}</td>
                  <td className="p-2 uppercase font-medium">{item.kategori}</td>
                  <td className="p-2">{item.keterangan} ({item.sumber || 'Operasional'})</td>
                  <td className={`p-2 text-right font-mono font-bold ${item.type === 'masuk' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {item.sign}Rp {item.nominal.toLocaleString('id-ID')}
                  </td>
                </tr>
            ))}
          </tbody>
        </table>

        {/* Print Signatures block repeats */}
        <div className="pt-20 grid grid-cols-2 gap-6 text-center text-xs">
          <div className="space-y-14">
            <p>Dilaporkan Oleh,</p>
            <div>
              <p className="font-bold underline">Dewi Sukadi Arwani</p>
              <p className="text-slate-400">Bendahara Keluarga</p>
            </div>
          </div>
          <div className="space-y-14">
            <p>Mengetahui,</p>
            <div>
              <p className="font-bold underline">Budi Sukadi Arwani</p>
              <p className="text-slate-400">Administrator Utama SIKT</p>
            </div>
          </div>
        </div>
      </div>

      {/* DIALOG ADD KAS MASUK POPUP */}
      {isAddingMasuk && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="border-b px-5 py-4 flex justify-between items-center bg-emerald-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="h-5 w-5 text-emerald-600" /> Catat Kas Masuk baru
              </h3>
              <button onClick={() => setIsAddingMasuk(false)} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveMasuk} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal</label>
                <input 
                  type="date" 
                  required
                  value={formMasuk.tanggal}
                  onChange={(e) => setFormMasuk({...formMasuk, tanggal: e.target.value})}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nominal Setoran (Rupiah)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="Contoh: 500000"
                    value={formMasuk.nominal}
                    onChange={(e) => setFormMasuk({...formMasuk, nominal: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm font-mono focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Kategori</label>
                  <select 
                    value={formMasuk.kategori}
                    onChange={(e) => setFormMasuk({...formMasuk, kategori: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white focus:outline-emerald-500"
                  >
                    {kategoriMasukOptions.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Penyetor (Sumber)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Nama keluarga"
                    value={formMasuk.sumber}
                    onChange={(e) => setFormMasuk({...formMasuk, sumber: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Keterangan Catatan</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Pembayaran arisan iuran bulanan"
                  value={formMasuk.keterangan}
                  onChange={(e) => setFormMasuk({...formMasuk, keterangan: e.target.value})}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                />
              </div>

              {/* Receipt upload drag file */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Unggah Bukti Transfer / Nota (JPG/PNG)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleReceiptChange(e, 'masuk')}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              <div className="pt-4 flex gap-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsAddingMasuk(false)} 
                  className="flex-1 py-2 text-xs font-bold text-slate-500 border rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG ADD KAS KELUAR POPUP */}
      {isAddingKeluar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="border-b px-5 py-4 flex justify-between items-center bg-rose-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <TrendingDown className="h-5 w-5 text-rose-600" /> Catat Kas Keluar baru
              </h3>
              <button onClick={() => setIsAddingKeluar(false)} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveKeluar} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal</label>
                <input 
                  type="date" 
                  required
                  value={formKeluar.tanggal}
                  onChange={(e) => setFormKeluar({...formKeluar, tanggal: e.target.value})}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nominal Jumlah Pengeluaran (Rupiah)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="Contoh: 150000"
                    value={formKeluar.nominal}
                    onChange={(e) => setFormKeluar({...formKeluar, nominal: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm font-mono focus:outline-emerald-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Kategori Alokasi</label>
                  <select 
                    value={formKeluar.kategori}
                    onChange={(e) => setFormKeluar({...formKeluar, kategori: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white focus:outline-emerald-500"
                  >
                    {kategoriKeluarOptions.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Keterangan Catatan Keperluan</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Konsumsi rapat pertemuan maret"
                  value={formKeluar.keterangan}
                  onChange={(e) => setFormKeluar({...formKeluar, keterangan: e.target.value})}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Unggah Bukti Transaksi / Nota (JPG/PNG)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleReceiptChange(e, 'keluar')}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-rose-50 file:text-rose-800 hover:file:bg-rose-100 cursor-pointer"
                />
              </div>

              <div className="pt-4 flex gap-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsAddingKeluar(false)} 
                  className="flex-1 py-2 text-xs font-bold text-slate-500 border rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW LIGHTBOX DIALOG */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden p-3 relative">
            <button 
              onClick={() => setSelectedReceipt(null)} 
              className="absolute top-4 right-4 p-2 bg-slate-950 hover:bg-slate-800 text-white rounded-full z-10 transition border border-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
            <img src={getCleanDriveUrl(selectedReceipt)} className="w-full max-h-[500px] object-contain rounded-xl" alt="Bukti Transfer SIKT" />
            <div className="p-3 text-center text-slate-400 text-xs">
              Membuka preview bukti transaksi kas silsilah keluarga terpadu
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
