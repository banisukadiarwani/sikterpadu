import React, { useState, useMemo } from 'react';
import { SIKTState, Galeri } from '../types';
import { Image, Video, Plus, Search, Calendar, User, Download, ChevronLeft, ChevronRight, X, FolderOpen, Trash2, AlertCircle } from 'lucide-react';
import { getCleanDriveUrl } from '../services/api';

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

interface GaleriKeluargaProps {
  state: SIKTState;
  onUpdateState: (newState: SIKTState) => void;
}

export default function GaleriKeluarga({ state, onUpdateState }: GaleriKeluargaProps) {
  const { galeri, agenda } = state;
  const isWritable = state.currentUser?.role === 'Administrator';

  // Filters
  const [selectedAlbumId, setSelectedAlbumId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Album/Category creation state
  const [isAddingAlbum, setIsAddingAlbum] = useState(false);
  const [formAlbum, setFormAlbum] = useState({
    nama: '',
    tipe: 'acara' as 'acara' | 'tahun' | 'lainnya'
  });

  // Slideshow state
  const [activeSlideIndex, setActiveSlideIndex] = useState<number | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<{ id: string; judul: string } | null>(null);

  const handleDeleteMedia = (id: string, judul: string) => {
    setMediaToDelete({ id, judul });
  };

  const confirmDeleteMedia = () => {
    if (mediaToDelete) {
      onUpdateState({
        ...state,
        galeri: galeri.filter(item => item.id !== mediaToDelete.id)
      });
      setMediaToDelete(null);
      setActiveSlideIndex(null);
    }
  };

  // Extract agenda categories
  const agendaAlbums = useMemo(() => {
    return agenda.map(a => ({
      id: a.id,
      nama: a.namaAcara,
      tipe: 'acara' as const
    }));
  }, [agenda]);

  // Extract custom categories
  const customAlbums = useMemo(() => {
    return state.customAlbums || [];
  }, [state.customAlbums]);

  // Dynamically extract unique years from all uploaded gallery items + custom albums of type 'tahun'
  const galleryYears = useMemo(() => {
    const yearsSet = new Set<string>();
    galeri.forEach(item => {
      if (item.tanggalUpload) {
        const year = item.tanggalUpload.split('-')[0];
        if (year && year.length === 4 && !isNaN(Number(year))) {
          yearsSet.add(year);
        }
      }
    });
    customAlbums.forEach(album => {
      if (album.tipe === 'tahun') {
        const year = album.nama.replace(/\D/g, '');
        if (year && year.length === 4) {
          yearsSet.add(year);
        }
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [galeri, customAlbums]);

  // Map dynamic years to album format
  const yearAlbums = useMemo(() => {
    return galleryYears.map(year => ({
      id: `year-${year}`,
      nama: `Tahun ${year}`,
      tipe: 'tahun' as const
    }));
  }, [galleryYears]);

  // Create full album dropdown/pills option list
  const allAlbumsList = useMemo(() => {
    const albums = [
      ...agendaAlbums,
      ...yearAlbums,
      ...customAlbums.map(album => ({
        id: album.id,
        nama: album.nama,
        tipe: album.tipe
      }))
    ];
    const seenIds = new Set<string>();
    return albums.filter(album => {
      if (seenIds.has(album.id)) return false;
      seenIds.add(album.id);
      return true;
    });
  }, [agendaAlbums, yearAlbums, customAlbums]);

  // Create options list for media upload attachment
  const uploadableAlbums = useMemo(() => {
    const list = [
      ...agenda.map(a => ({ id: a.id, nama: `📅 Acara: ${a.namaAcara}` })),
      ...customAlbums.map(album => {
        const prefix = album.tipe === 'tahun' ? '📆 Tahun: ' : album.tipe === 'acara' ? '🎉 Acara: ' : '📁 Album: ';
        return { id: album.id, nama: `${prefix}${album.nama}` };
      })
    ];
    yearAlbums.forEach(ya => {
      list.push({ id: ya.id, nama: `📆 ${ya.nama}` });
    });
    const seen = new Set<string>();
    return list.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [agenda, customAlbums, yearAlbums]);

  // Form upload state
  const [isAddingMedia, setIsAddingMedia] = useState(false);
  const [formMedia, setFormMedia] = useState({
    agendaId: uploadableAlbums[0]?.id || agenda[0]?.id || '',
    judul: '',
    fileUrl: '',
    fileType: 'image' as 'image' | 'video',
  });

  // Filtered gallery items
  const filteredGaleri = useMemo(() => {
    return galeri.filter(item => {
      const matchSearch = searchQuery ? item.judul.toLowerCase().includes(searchQuery.toLowerCase()) : true;
      if (!matchSearch) return false;

      if (!selectedAlbumId) return true;

      if (selectedAlbumId.startsWith('year-')) {
        const year = selectedAlbumId.replace('year-', '');
        return item.agendaId === selectedAlbumId || (item.tanggalUpload && item.tanggalUpload.startsWith(year));
      }

      return item.agendaId === selectedAlbumId;
    });
  }, [galeri, selectedAlbumId, searchQuery]);

  // Handle local image file upload (converts to base64)
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormMedia(prev => ({ 
          ...prev, 
          fileUrl: reader.result as string,
          fileType: file.type.startsWith('video/') ? 'video' : 'image'
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveMedia = (e: React.FormEvent) => {
    e.preventDefault();
    const activeAgenda = agenda.find(a => a.id === formMedia.agendaId);
    const activeCustomAlbum = customAlbums.find(album => album.id === formMedia.agendaId);
    
    let agendaNama = 'Pertemuan Umum';
    if (activeAgenda) {
      agendaNama = activeAgenda.namaAcara;
    } else if (activeCustomAlbum) {
      agendaNama = activeCustomAlbum.nama;
    } else if (formMedia.agendaId.startsWith('year-')) {
      agendaNama = `Tahun ${formMedia.agendaId.replace('year-', '')}`;
    }

    const newMedia: Galeri = {
      id: `G_${Date.now()}`,
      agendaId: formMedia.agendaId,
      agendaNama: agendaNama,
      judul: formMedia.judul,
      fileUrl: formMedia.fileUrl || 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=600&q=80',
      fileType: formMedia.fileType,
      uploader: state.currentUser?.nama || 'Anggota Keluarga',
      tanggalUpload: new Date().toISOString().split('T')[0],
    };

    onUpdateState({
      ...state,
      galeri: [newMedia, ...state.galeri]
    });

    setIsAddingMedia(false);
    setFormMedia({
      agendaId: uploadableAlbums[0]?.id || agenda[0]?.id || '',
      judul: '',
      fileUrl: '',
      fileType: 'image',
    });
  };

  const handleSaveAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAlbum.nama.trim()) return;

    const newAlbumId = `album-${formAlbum.tipe}-${Date.now()}`;
    const newAlbum = {
      id: newAlbumId,
      nama: formAlbum.nama.trim(),
      tipe: formAlbum.tipe
    };

    onUpdateState({
      ...state,
      customAlbums: [...(state.customAlbums || []), newAlbum]
    });

    setIsAddingAlbum(false);
    setFormAlbum({
      nama: '',
      tipe: 'acara'
    });

    // Auto filter to show the newly created album
    setSelectedAlbumId(newAlbumId);
  };

  // Slideshow Navigation
  const handlePrevSlide = () => {
    if (activeSlideIndex === null) return;
    setActiveSlideIndex(prev => (prev === 0 ? filteredGaleri.length - 1 : prev! - 1));
  };

  const handleNextSlide = () => {
    if (activeSlideIndex === null) return;
    setActiveSlideIndex(prev => (prev === filteredGaleri.length - 1 ? 0 : prev! + 1));
  };

  const openAddMediaModal = () => {
    setFormMedia({
      agendaId: uploadableAlbums[0]?.id || agenda[0]?.id || '',
      judul: '',
      fileUrl: '',
      fileType: 'image',
    });
    setIsAddingMedia(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Album Filters Headers */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-slate-50 border rounded-2xl items-center justify-between shadow-3xs">
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-center">
          {/* Album selection */}
          <select
            value={selectedAlbumId}
            onChange={(e) => setSelectedAlbumId(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-emerald-500 w-full sm:w-56"
          >
            <option value="">📁 Semua Album & Kategori</option>
            
            {yearAlbums.length > 0 && (
              <optgroup label="Berdasarkan Tahun">
                {yearAlbums.map(item => (
                  <option key={item.id} value={item.id}>{item.nama}</option>
                ))}
              </optgroup>
            )}

            <optgroup label="Berdasarkan Agenda Acara">
              {agendaAlbums.map(item => (
                <option key={item.id} value={item.id}>{item.nama}</option>
              ))}
            </optgroup>

            {customAlbums.filter(a => a.tipe === 'acara').length > 0 && (
              <optgroup label="Acara Tambahan">
                {customAlbums.filter(a => a.tipe === 'acara').map(item => (
                  <option key={item.id} value={item.id}>{item.nama}</option>
                ))}
              </optgroup>
            )}

            {customAlbums.filter(a => a.tipe === 'lainnya').length > 0 && (
              <optgroup label="Album Kustom">
                {customAlbums.filter(a => a.tipe === 'lainnya').map(item => (
                  <option key={item.id} value={item.id}>{item.nama}</option>
                ))}
              </optgroup>
            )}
          </select>

          {/* Search text */}
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari dokumentasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-500 text-slate-700 w-full sm:w-48"
            />
          </div>
        </div>

        {/* Action additions */}
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {isWritable && (
            <button
              onClick={() => setIsAddingAlbum(true)}
              className="w-full sm:w-auto py-1.5 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-3xs"
            >
              <FolderOpen className="h-4 w-4 text-slate-500" /> Kategori Album Baru
            </button>
          )}
          {isWritable && (
            <button
              onClick={openAddMediaModal}
              className="w-full sm:w-auto py-1.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Unggah Foto & Video
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Scrolling Pills Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none scroll-smooth">
        <button
          onClick={() => setSelectedAlbumId('')}
          className={`px-3 py-1 text-xs font-bold rounded-full border transition shrink-0 ${
            selectedAlbumId === ''
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          ✨ Semua Kenangan
        </button>

        {/* Year dynamic pills */}
        {yearAlbums.map(item => (
          <button
            key={item.id}
            onClick={() => setSelectedAlbumId(item.id)}
            className={`px-3 py-1 text-xs font-bold rounded-full border transition shrink-0 ${
              selectedAlbumId === item.id
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            📆 {item.nama}
          </button>
        ))}

        {/* Agenda album pills */}
        {agendaAlbums.map(item => (
          <button
            key={item.id}
            onClick={() => setSelectedAlbumId(item.id)}
            className={`px-3 py-1 text-xs font-bold rounded-full border transition shrink-0 max-w-[200px] truncate ${
              selectedAlbumId === item.id
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title={item.nama}
          >
            🎉 {item.nama}
          </button>
        ))}

        {/* Custom album pills */}
        {customAlbums.map(item => (
          <button
            key={item.id}
            onClick={() => setSelectedAlbumId(item.id)}
            className={`px-3 py-1 text-xs font-bold rounded-full border transition shrink-0 max-w-[200px] truncate ${
              selectedAlbumId === item.id
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title={item.nama}
          >
            {item.tipe === 'tahun' ? '📆' : item.tipe === 'acara' ? '🎉' : '📁'} {item.nama}
          </button>
        ))}
      </div>

      {/* Grid kenangan album */}
      {filteredGaleri.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredGaleri.map((item, index) => (
            <div
              key={item.id}
              onClick={() => setActiveSlideIndex(index)}
              className="bg-white rounded-2xl border border-slate-100 shadow-3xs overflow-hidden cursor-pointer hover:shadow-md transition duration-250 group relative flex flex-col justify-between"
            >
              <div className="aspect-video bg-slate-950 overflow-hidden relative">
                {isWritable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMedia(item.id, item.judul);
                    }}
                    className="absolute top-3 left-3 p-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-500 hover:scale-105 transition duration-150 z-10"
                    title="Hapus Media"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                {item.fileType === 'video' ? (
                  <div className="w-full h-full flex items-center justify-center bg-stone-900 text-slate-300">
                    <Video className="h-10 w-10 opacity-75" />
                  </div>
                ) : (
                  <img 
                    src={getCleanDriveUrl(item.fileUrl)} 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                    alt={item.judul} 
                  />
                )}
                
                {/* Media Icon watermark overlay */}
                <span className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-950/70 text-white border border-slate-800">
                  {item.fileType === 'video' ? <Video className="h-3.5 w-3.5" /> : <Image className="h-3.5 w-3.5" />}
                </span>
              </div>

              {/* Specifications Footer */}
              <div className="p-4 space-y-2">
                <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full block w-fit truncate max-w-full">
                  📂 {item.agendaNama}
                </span>
                <h4 className="font-bold text-slate-800 text-[14px] leading-tight truncate">{item.judul}</h4>
                
                <div className="pt-2 border-t border-dashed border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {item.uploader}</span>
                  <span className="font-mono">{formatDate(item.tanggalUpload)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 italic">
          <FolderOpen className="h-12 w-12 mx-auto text-slate-300 mb-2 stroke-1" />
          Belum ada foto atau video dalam album ini.
        </div>
      )}

      {/* LIGHTBOX SLIDESHOW GALLERY MODAL CONTAINER */}
      {activeSlideIndex !== null && filteredGaleri[activeSlideIndex] && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xs z-50 flex flex-col justify-between p-4">
          
          {/* Header toolbar */}
          <div className="flex justify-between items-center text-white p-2">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-widest">{filteredGaleri[activeSlideIndex].agendaNama}</p>
              <h3 className="font-bold text-sm text-slate-100 mt-1">{filteredGaleri[activeSlideIndex].judul}</h3>
            </div>

            <div className="flex items-center gap-3">
              {isWritable && (
                <button
                  onClick={() => handleDeleteMedia(filteredGaleri[activeSlideIndex].id, filteredGaleri[activeSlideIndex].judul)}
                  className="p-2 bg-rose-950/60 border border-rose-900/50 hover:bg-rose-900 rounded-xl text-white transition flex items-center gap-1.5 text-xs font-bold"
                  title="Hapus Media"
                >
                  <Trash2 className="h-4 w-4 text-rose-400" /> Hapus
                </button>
              )}
              <a 
                href={filteredGaleri[activeSlideIndex].fileUrl} 
                download={filteredGaleri[activeSlideIndex].judul}
                className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-white transition flex items-center gap-1.5 text-xs font-bold"
              >
                <Download className="h-4 w-4" /> Download
              </a>
              <button 
                onClick={() => setActiveSlideIndex(null)} 
                className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Core active media showcase (and navigator toggles) */}
          <div className="flex-1 flex items-center justify-between gap-4 py-4 relative">
            <button 
              onClick={handlePrevSlide} 
              className="p-3 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-full text-white transition z-10"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <div className="max-w-4xl max-h-[70vh] mx-auto rounded-xl overflow-hidden flex items-center justify-center">
              {filteredGaleri[activeSlideIndex].fileType === 'video' ? (
                <div className="text-center text-slate-400 p-10 bg-slate-900 border rounded-xl">
                  <Video className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                  <p className="text-sm font-semibold text-slate-200">Video Player Simulation</p>
                  <p className="text-xs text-slate-500 mt-1">Sistem Google Drive video streaming membutuhkan perpanjangan izin API</p>
                </div>
              ) : (
                <img 
                  src={getCleanDriveUrl(filteredGaleri[activeSlideIndex].fileUrl)} 
                  className="max-w-[85vw] max-h-[65vh] object-contain rounded-xl shadow-lg border border-slate-800" 
                  alt={filteredGaleri[activeSlideIndex].judul} 
                />
              )}
            </div>

            <button 
              onClick={handleNextSlide} 
              className="p-3 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-full text-white transition z-10"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Footer informational specs */}
          <div className="text-center p-2 text-xs text-slate-400">
            Unggahan oleh: <strong className="text-slate-100">{filteredGaleri[activeSlideIndex].uploader}</strong> pada {formatDate(filteredGaleri[activeSlideIndex].tanggalUpload)} | Kenangan {activeSlideIndex + 1} dari {filteredGaleri.length}
          </div>
        </div>
      )}

      {/* DIALOG ADD MEDIA DOCUMENT */}
      {isAddingMedia && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="border-b px-5 py-4 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Image className="h-5 w-5 text-emerald-600" /> Unggah Kenangan Foto & Video
              </h3>
              <button onClick={() => setIsAddingMedia(false)} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveMedia} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih File Foto atau Video (JPG/PNG/MP4)</label>
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  required
                  onChange={handleMediaUpload}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Judul / Caption Foto</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Keseruan makan siang bersama"
                  value={formMedia.judul}
                  onChange={(e) => setFormMedia({...formMedia, judul: e.target.value})}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Album / Kategori Pengelompokan</label>
                <select
                  value={formMedia.agendaId}
                  onChange={(e) => setFormMedia({...formMedia, agendaId: e.target.value})}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500 bg-white font-medium"
                >
                  {uploadableAlbums.map(item => (
                    <option key={item.id} value={item.id}>{item.nama}</option>
                  ))}
                </select>
              </div>

              {/* Informative message on real Google Drive integration storage! */}
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-[11px] leading-relaxed border border-emerald-100/50">
                ⚠️ <strong>Penyimpanan Google Drive:</strong> Seluruh unggahan media akan disimpan otomatis ke folder id Google Drive terkonfigurasi: <code>KELUARGA/FOTO/</code> dan data rekamannya akan disalin ke spreadsheet database!
              </div>

              <div className="pt-4 flex gap-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsAddingMedia(false)} 
                  className="flex-1 py-1.5 text-xs font-bold text-slate-500 border rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl"
                >
                  Mulai Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL FOR DELETING MEDIA */}
      {mediaToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="border-b px-5 py-4 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                <AlertCircle className="h-5 w-5 text-rose-500" /> Konfirmasi Hapus Media
              </h3>
              <button onClick={() => setMediaToDelete(null)} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus kenangan <strong className="text-slate-800 font-bold">"{mediaToDelete.judul}"</strong> dari album galeri keluarga besar? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="pt-4 flex gap-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setMediaToDelete(null)} 
                  className="flex-1 py-1.5 text-xs font-bold text-slate-500 border rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button 
                  type="button"
                  onClick={confirmDeleteMedia}
                  className="flex-1 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG ADD NEW ALBUM CATEGORY */}
      {isAddingAlbum && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="border-b px-5 py-4 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                <FolderOpen className="h-5 w-5 text-emerald-600" /> Buat Kategori Album Baru
              </h3>
              <button onClick={() => setIsAddingAlbum(false)} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAlbum} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Kategori / Album</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Tahun 2024 atau Lebaran Keluarga"
                  value={formAlbum.nama}
                  onChange={(e) => setFormAlbum({...formAlbum, nama: e.target.value})}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipe Pengelompokkan</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormAlbum({...formAlbum, tipe: 'acara'})}
                    className={`py-1.5 px-2 text-xs font-bold rounded-xl border transition ${
                      formAlbum.tipe === 'acara'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🎉 Acara
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormAlbum({...formAlbum, tipe: 'tahun'})}
                    className={`py-1.5 px-2 text-xs font-bold rounded-xl border transition ${
                      formAlbum.tipe === 'tahun'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    📆 Tahun
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormAlbum({...formAlbum, tipe: 'lainnya'})}
                    className={`py-1.5 px-2 text-xs font-bold rounded-xl border transition ${
                      formAlbum.tipe === 'lainnya'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    📁 Kustom
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsAddingAlbum(false)} 
                  className="flex-1 py-1.5 text-xs font-bold text-slate-500 border rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl"
                >
                  Buat Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
