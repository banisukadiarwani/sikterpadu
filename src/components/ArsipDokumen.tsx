import React, { useState, useMemo } from 'react';
import { SIKTState, DocumentRecord } from '../types';
import { FileText, Plus, Search, Filter, Download, User, Calendar, Trash2, X, AlertCircle } from 'lucide-react';

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim();
  const parts = cleanDateStr.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return cleanDateStr;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  } catch (e) {}
  return dateStr;
};

interface ArsipDokumenProps {
  state: SIKTState;
  onUpdateState: (newState: SIKTState) => void;
}

export default function ArsipDokumen({ state, onUpdateState }: ArsipDokumenProps) {
  const { dokumen } = state;
  const isWritable = state.currentUser?.role === 'Administrator';

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog State
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<{ id: string; nama: string } | null>(null);

  // Form State
  const [formDoc, setFormDoc] = useState({
    namaDokumen: '',
    kategori: 'Laporan Keuangan' as DocumentRecord['kategori'],
    fileUrl: '',
  });

  const categories: DocumentRecord['kategori'][] = [
    'Laporan Keuangan',
    'Notulen Semenjak',
    'Undangan',
    'Surat Keputusan',
    'Buku Silsilah',
    'Lainnya',
  ];

  // Map icons to categories
  const getCategoryColor = (kategori: DocumentRecord['kategori']) => {
    switch (kategori) {
      case 'Laporan Keuangan': return 'bg-emerald-50 text-emerald-800 border-emerald-100';
      case 'Notulen Semenjak': return 'bg-amber-50 text-amber-800 border-amber-100';
      case 'Undangan': return 'bg-pink-50 text-pink-800 border-pink-100';
      case 'Surat Keputusan': return 'bg-indigo-50 text-indigo-800 border-indigo-100';
      case 'Buku Silsilah': return 'bg-teal-50 text-teal-800 border-teal-100';
      default: return 'bg-slate-50 text-slate-800 border-slate-100';
    }
  };

  // Filtered list
  const filteredDokumen = useMemo(() => {
    return dokumen.filter(item => {
      const matchCat = selectedCategory ? item.kategori === selectedCategory : true;
      const matchSearch = searchQuery ? (
        item.namaDokumen.toLowerCase().includes(searchQuery.toLowerCase())
      ) : true;
      return matchCat && matchSearch;
    });
  }, [dokumen, selectedCategory, searchQuery]);

  // Handle local file selection converter (converts to simulated PDF view object)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormDoc(prev => ({
          ...prev,
          namaDokumen: file.name,
          fileUrl: reader.result as string // Real Base64 url
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    const newDoc: DocumentRecord = {
      id: `D_${Date.now()}`,
      namaDokumen: formDoc.namaDokumen || 'Dokumen_Baru_Keluarga.pdf',
      kategori: formDoc.kategori,
      fileUrl: formDoc.fileUrl || '#',
      uploader: state.currentUser?.nama || 'Administrator SIKT',
      tanggalUpload: new Date().toISOString().split('T')[0],
    };

    onUpdateState({
      ...state,
      dokumen: [newDoc, ...state.dokumen]
    });

    setIsAddingDoc(false);
    setFormDoc({
      namaDokumen: '',
      kategori: 'Laporan Keuangan',
      fileUrl: '',
    });
  };

  const handleDeleteDoc = (id: string, name: string) => {
    setDocToDelete({ id, nama: name });
  };

  const confirmDeleteDoc = () => {
    if (docToDelete) {
      onUpdateState({
        ...state,
        dokumen: dokumen.filter(d => d.id !== docToDelete.id)
      });
      setDocToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Header bar */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-slate-50 border rounded-2xl items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {/* Category Selector */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-emerald-500"
          >
            <option value="">Semua Kategori Dokumen</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Search bar input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari nama arsip..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-500 text-slate-700 w-full sm:w-48"
            />
          </div>
        </div>

        {/* Action Add Trigger */}
        {isWritable && (
          <button
            onClick={() => setIsAddingDoc(true)}
            className="w-full md:w-auto py-1.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Unggah Berkas PDF
          </button>
        )}
      </div>

      {/* Grid of documented files */}
      {filteredDokumen.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDokumen.map(doc => (
            <div
              key={doc.id}
              className="p-5 bg-white rounded-2xl border border-slate-100 hover:border-slate-300 shadow-3xs transition hover:shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start gap-3">
                <span className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 self-start">
                  <FileText className="h-6 w-6" />
                </span>
                <div className="space-y-1.5 select-all overflow-hidden flex-1">
                  <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${getCategoryColor(doc.kategori)}`}>
                    {doc.kategori}
                  </span>
                  <h4 className="font-bold text-slate-800 text-[14px] leading-tight break-all" title={doc.namaDokumen}>
                    {doc.namaDokumen}
                  </h4>
                </div>
              </div>

              {/* Specs Footer */}
              <div className="pt-3 border-t border-dashed border-slate-100 flex flex-col space-y-2.5 text-[11px] text-slate-400">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1 font-medium"><User className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {doc.uploader}</span>
                  <span className="font-mono flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {formatDate(doc.tanggalUpload)}</span>
                </div>

                {/* Downloads trigger button */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setPdfPreviewUrl(doc.namaDokumen)}
                    className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-lg border text-center transition py-1 text-[10px]"
                  >
                    Buka Preview PDF
                  </button>
                  <a
                    href={doc.fileUrl}
                    download={doc.namaDokumen}
                    className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-100 text-center transition flex items-center justify-center gap-1 text-[10px]"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                  {isWritable && (
                    <button
                      onClick={() => handleDeleteDoc(doc.id, doc.namaDokumen)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 transition"
                      title="Hapus dokumen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 italic">
          Tidak ditemukan dokumen dalam kategori ini.
        </div>
      )}

      {/* SIMULATED PDF VIEW OVERLAY LIGHTBOX CONTAINER */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center p-4 border-b bg-slate-50">
              <div>
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest bg-red-50 border border-red-100 px-2 py-0.5 rounded">PDF PREVIEW</span>
                <h3 className="font-bold text-slate-800 text-sm mt-1.5">{pdfPreviewUrl}</h3>
              </div>
              <button 
                onClick={() => setPdfPreviewUrl(null)} 
                className="p-1 px-2.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition border"
              >
                Tutup Preview
              </button>
            </div>

            {/* Document sheet mockup */}
            <div className="p-8 bg-slate-100 max-h-[420px] overflow-y-auto space-y-6 font-serif text-slate-800 text-xs shadow-inner">
              <center className="space-y-1">
                <h2 className="text-sm font-bold uppercase tracking-widest leading-normal">Keluarga Besar Rustam Sukadi Arwani</h2>
                <p className="text-[10px] font-sans text-slate-400 uppercase font-semibold">Sekretariat Bersama: Jl. Malioboro No. 45, D.I. Yogyakarta</p>
                <hr className="border-t-2 border-double border-slate-800 my-2" />
              </center>
              
              <div className="space-y-2 leading-relaxed">
                <p className="font-sans text-[10px] text-right font-medium">Yogyakarta, 10 Maret 2026</p>
                <p className="font-sans text-[10px]">No: 042/SIKT-EXT/III/2026</p>
                <p className="font-sans text-[10px]">Perihal: <strong>Undangan Musyawarah Semesteran &amp; Pembukuan Arisan</strong></p>
                <div className="pt-4">
                  <p>Kepada Yth,</p>
                  <p className="font-bold">Segenap Anggota Keluarga Besar Rustam Sukadi Arwani</p>
                  <p>di Tempat / Kediaman Masing-masing</p>
                </div>
                <p className="pt-4">Dengan hormat,</p>
                <p>
                  Melalui surat ini kami selaku pengurus mengundang segenap bapak, ibu, kakak dan adik dari keluarga besar Rustam Sukadi Arwani untuk dapat menghadiri pertemuan berkala yang akan dilangsungkan dalam rangka mempererat silaturahmi, pertaruhan berkah arisan bersama, serta pelaporan keuangan kas semesteran berjalan.
                </p>
                <p>
                  Rincian acara, rujukan map lokasi, serta anggaran belanja dapat dikoordinasikan secara penuh dan transparan melalui Portal Utama <strong>Sistem Informasi Keluarga Terpadu (SIKT)</strong>.
                </p>
                <p className="pt-4">Demikian undangan ini kami sampaikan, atas kehadiran dan dukungan gotong royong segenap keluarga kami ucapkan terima kasih.</p>
              </div>

              <div className="pt-8 grid grid-cols-2 text-center text-[10px] font-sans">
                <div></div>
                <div className="space-y-10">
                  <p>Hormat kami,</p>
                  <p className="font-bold underline">Budi Sukadi Arwani</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 text-center text-slate-400 text-[10px]">
              Simulasi Viewer PDF Terintegrasi SIKT &copy; 2026. File sesungguhnya berada di google drive folder KELUARGA/DOKUMEN/
            </div>
          </div>
        </div>
      )}

      {/* DIALOG ADD DOCUMENT FILE */}
      {isAddingDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="border-b px-5 py-4 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="h-5 w-5 text-emerald-600" /> Unggah Arsip Berkas PDF
              </h3>
              <button onClick={() => setIsAddingDoc(false)} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveDoc} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Berkas File PDF (Maks 10MB)</label>
                <input 
                  type="file" 
                  accept=".pdf" 
                  required
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Kelompok Kategori Arsip</label>
                <select
                  value={formDoc.kategori}
                  onChange={(e) => setFormDoc({...formDoc, kategori: e.target.value as DocumentRecord['kategori']})}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500 bg-white"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Informative storage guidelines */}
              <div className="p-3 bg-red-50 text-red-900 rounded-xl text-[10px] leading-relaxed border border-red-100/30">
                ⭐ <strong>Arsip Google Drive:</strong> Dokumen PDF akan disimpan secara permanen di foder awan Google Drive yang terintegrasi, menghasilkan URL tautan dinamis yang tersinkronisasi di spreadsheet Anda.
              </div>

              <div className="pt-4 flex gap-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsAddingDoc(false)} 
                  className="flex-1 py-1.5 text-xs font-bold text-slate-500 border rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl"
                >
                  Unggah Berkas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL FOR DELETING DOCUMENT */}
      {docToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="border-b px-5 py-4 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                <AlertCircle className="h-5 w-5 text-rose-500" /> Konfirmasi Hapus Arsip
              </h3>
              <button onClick={() => setDocToDelete(null)} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus dokumen <strong className="text-slate-800 font-bold">"{docToDelete.nama}"</strong> dari arsip keluarga besar? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="pt-4 flex gap-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setDocToDelete(null)} 
                  className="flex-1 py-1.5 text-xs font-bold text-slate-500 border rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button 
                  type="button"
                  onClick={confirmDeleteDoc}
                  className="flex-1 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
