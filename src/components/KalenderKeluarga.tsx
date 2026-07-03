import React, { useState, useMemo } from 'react';
import { SIKTState, Agenda, PesertaAcara } from '../types';
import { Calendar as CalendarIcon, MapPin, User, Clock, Users, Plus, CheckCircle2, AlertCircle, X, ChevronLeft, ChevronRight, Mail, Sparkles, Edit2, Trash2, Bell } from 'lucide-react';

const getDaysRemainingText = (dateStr: string) => {
  if (!dateStr) return '';
  const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim();
  const today = new Date('2026-06-23T00:00:00');
  const eventDate = new Date(`${cleanDateStr}T00:00:00`);
  
  if (isNaN(eventDate.getTime())) return '';
  
  const diffTime = eventDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return `${Math.abs(diffDays)} HARI YANG LALU`;
  } else if (diffDays === 0) {
    return 'HARI INI';
  } else {
    return `${diffDays} HARI LAGI`;
  }
};

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

const formatWaktu = (waktuStr: string) => {
  if (!waktuStr) return '';
  const trimmed = waktuStr.trim();
  if (trimmed.toUpperCase().endsWith('WIB')) {
    return trimmed;
  }
  return `${trimmed} WIB`;
};

interface KalenderKeluargaProps {
  state: SIKTState;
  onUpdateState: (newState: SIKTState) => void;
}

export default function KalenderKeluarga({ state, onUpdateState }: KalenderKeluargaProps) {
  const { agenda, pesertaAcara, anggota } = state;
  const isWritable = state.currentUser?.role === 'Administrator';
  
  // Tab states
  const [selectedAgendaId, setSelectedAgendaId] = useState<string | null>(agenda[0]?.id || null);

  // Month-view navigation state (kept for safety if used elsewhere, although we only render list)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(6); // July (0-indexed 6)

  // Dialog state
  const [isAddingAgenda, setIsAddingAgenda] = useState(false);
  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form State
  const [formAgenda, setFormAgenda] = useState({
    namaAcara: '',
    tanggal: '2026-07-12',
    waktu: '10:00',
    lokasi: '',
    deskripsi: '',
    penanggungJawab: anggota[0]?.nama || '',
  });

  // Highlighted event
  const selectedEvent = useMemo(() => {
    return agenda.find(a => a.id === selectedAgendaId) || null;
  }, [agenda, selectedAgendaId]);



  // Calendar grid date helpers
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Calendar calculations
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const firstDayOffset = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay(); // Sunday=0, Monday=1...
  }, [currentYear, currentMonth]);

  const calendarDays = useMemo(() => {
    const cells = [];
    // Pad previous month days blanked
    for (let i = 0; i < firstDayOffset; i++) {
      cells.push({ day: null, dateStr: null });
    }
    // Fill current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dayPad = d.toString().padStart(2, '0');
      const monthPad = (currentMonth + 1).toString().padStart(2, '0');
      const dateStr = `${currentYear}-${monthPad}-${dayPad}`;
      cells.push({ day: d, dateStr });
    }
    return cells;
  }, [daysInMonth, firstDayOffset, currentYear, currentMonth]);

  // Map events to dates
  const eventsByDate = useMemo(() => {
    const map: Record<string, Agenda[]> = {};
    agenda.forEach(a => {
      if (!map[a.tanggal]) {
        map[a.tanggal] = [];
      }
      map[a.tanggal].push(a);
    });
    return map;
  }, [agenda]);

  const handleStartAdd = () => {
    setEditingAgendaId(null);
    setFormAgenda({
      namaAcara: '',
      tanggal: '2026-07-12',
      waktu: '10:00',
      lokasi: '',
      deskripsi: '',
      penanggungJawab: anggota[0]?.nama || '',
    });
    setIsAddingAgenda(true);
  };

  const handleStartEdit = (item: Agenda) => {
    setEditingAgendaId(item.id);
    setFormAgenda({
      namaAcara: item.namaAcara,
      tanggal: item.tanggal,
      waktu: item.waktu,
      lokasi: item.lokasi,
      deskripsi: item.deskripsi,
      penanggungJawab: item.penanggungJawab,
    });
    setIsAddingAgenda(true);
  };

  const handleDeleteAgenda = (id: string) => {
    const filteredAgenda = agenda.filter(a => a.id !== id);
    const filteredRSVPs = pesertaAcara.filter(p => p.agendaId !== id);

    onUpdateState({
      ...state,
      agenda: filteredAgenda,
      pesertaAcara: filteredRSVPs,
    });

    if (selectedAgendaId === id) {
      setSelectedAgendaId(filteredAgenda[0]?.id || null);
    }
  };

  // Save new or update current agenda event
  const handleSaveAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAgendaId) {
      // Edit mode
      const updatedAgenda = agenda.map(a => {
        if (a.id === editingAgendaId) {
          return {
            ...a,
            namaAcara: formAgenda.namaAcara,
            tanggal: formAgenda.tanggal,
            waktu: formAgenda.waktu,
            lokasi: formAgenda.lokasi,
            deskripsi: formAgenda.deskripsi,
            penanggungJawab: formAgenda.penanggungJawab,
          };
        }
        return a;
      });

      onUpdateState({
        ...state,
        agenda: updatedAgenda,
      });

      setIsAddingAgenda(false);
      setEditingAgendaId(null);
    } else {
      // Add mode
      const newId = `AG_${Date.now()}`;
      const newEvent: Agenda = {
        id: newId,
        namaAcara: formAgenda.namaAcara,
        tanggal: formAgenda.tanggal,
        waktu: formAgenda.waktu,
        lokasi: formAgenda.lokasi,
        deskripsi: formAgenda.deskripsi,
        penanggungJawab: formAgenda.penanggungJawab,
      };

      // Auto-populate RSVPs for all current family members
      const newRSVPs: PesertaAcara[] = anggota.map((m, idx) => ({
        id: `P_${Date.now()}_${idx}`,
        agendaId: newId,
        anggotaId: m.id,
        anggotaNama: m.nama,
        statusHadir: m.nama === state.currentUser?.nama ? 'Hadir' : 'Belum RSVP',
      }));

      onUpdateState({
        ...state,
        agenda: [...state.agenda, newEvent],
        pesertaAcara: [...state.pesertaAcara, ...newRSVPs],
      });

      setIsAddingAgenda(false);
      setSelectedAgendaId(newId);
    }

    setFormAgenda({
      namaAcara: '',
      tanggal: '2026-07-12',
      waktu: '10:00',
      lokasi: '',
      deskripsi: '',
      penanggungJawab: anggota[0]?.nama || '',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Header Toolbar */}
      <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-slate-100 shadow-3xs">
        <div className="flex items-center gap-3">
          <span className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CalendarIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-extrabold text-slate-800 text-base tracking-tight">Daftar Agenda & Kegiatan</h2>
            <p className="text-xs text-slate-400 font-medium font-sans">Jadwal acara serta pertemuan keluarga besar</p>
          </div>
        </div>

        {isWritable && (
          <button
            onClick={handleStartAdd}
            className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-xs shrink-0"
          >
            <Plus className="h-4 w-4" /> Tambah Agenda
          </button>
        )}
      </div>

      {/* LIST SCHEDULE AGENDA VIEW */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold text-slate-400 tracking-[0.15em] uppercase px-1">
          DAFTAR AGENDA
        </h3>
        
        <div className="space-y-5">
          {agenda.map(item => {
            const isSelected = selectedAgendaId === item.id;
            const daysText = getDaysRemainingText(item.tanggal);
            
            return (
              <div
                key={item.id}
                onClick={() => setSelectedAgendaId(item.id)}
                className={`p-6 rounded-[22px] border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                  isSelected 
                    ? 'border-rose-100 bg-[#fff5f5]/30 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.06)]' 
                    : 'border-slate-100 bg-white hover:border-slate-300 shadow-3xs'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center">
                    <span className="bg-[#fef08a] text-[#854d0e] text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-[6px] uppercase h-fit inline-block">
                      {daysText}
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-medium">
                      {item.tanggal}
                    </span>
                  </div>
                  
                  <h3 className={`font-bold mt-4 leading-snug text-lg ${
                    isSelected ? 'text-[#7f1d1d]' : 'text-[#0f172a]'
                  }`}>
                    {item.namaAcara}
                  </h3>
                  
                  <p className={`text-sm mt-2.5 leading-relaxed font-normal line-clamp-2 ${
                    isSelected ? 'text-slate-500/95' : 'text-slate-400'
                  }`}>
                    {item.deskripsi}
                  </p>
                </div>
                
                <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <span className="text-rose-500 text-sm">📍</span>
                  <span className="text-slate-600 truncate">{item.lokasi}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAIL VIEW: RINCIAN ACARA SELENGKAPNYA */}
      {selectedEvent ? (
        <div className="bg-white p-7 rounded-[28px] border border-slate-100 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <span className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase">
              RINCIAN ACARA SELENGKAPNYA
            </span>
            
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#b91c1c] bg-[#fff2f2] px-3.5 py-1.5 rounded-full select-none shadow-3xs">
                <Bell className="h-3.5 w-3.5 shrink-0 text-[#b91c1c] animate-swing" />
                {getDaysRemainingText(selectedEvent.tanggal).toLowerCase()}
              </span>
              
              {isWritable && (
                <div className="flex gap-1.5 items-center bg-slate-50 border p-1 rounded-xl shadow-3xs">
                  <button
                    onClick={() => handleStartEdit(selectedEvent)}
                    className="p-1 px-2.5 hover:bg-white rounded-lg text-[10.5px] font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition"
                  >
                    <Edit2 className="h-3 w-3" /> Edit
                  </button>
                  <span className="text-slate-200 text-xs">|</span>
                  {confirmDeleteId === selectedEvent.id ? (
                    <div className="flex gap-1 items-center">
                      <button
                        onClick={() => {
                          handleDeleteAgenda(selectedEvent.id);
                          setConfirmDeleteId(null);
                        }}
                        className="p-1 px-2 text-[10.5px] font-black text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-2xs transition"
                      >
                        Ya
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-1 px-2 text-[10.5px] font-bold text-slate-400 hover:text-slate-600"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(selectedEvent.id)}
                      className="p-1 px-2.5 hover:bg-rose-50 rounded-lg text-[10.5px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition"
                    >
                      <Trash2 className="h-3 w-3" /> Hapus
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h2 className="font-extrabold text-[#0f172a] text-2xl tracking-tight leading-tight">{selectedEvent.namaAcara}</h2>
            <p className="text-slate-500 text-sm sm:text-base mt-4 leading-relaxed font-normal">{selectedEvent.deskripsi}</p>
          </div>

          {/* Quick specifications / 3 column gray box */}
          <div className="bg-[#f8fafc] border border-slate-100/50 rounded-2xl p-5 mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase block">
                TANGGAL ACARA:
              </span>
              <div className="flex items-center text-slate-700">
                <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
                <span className="text-[13px] font-semibold font-mono">{formatDate(selectedEvent.tanggal)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase block">
                WAKTU MULAI:
              </span>
              <div className="flex items-center text-slate-700">
                <Clock className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
                <span className="text-[13px] font-semibold font-mono">
                  {formatWaktu(selectedEvent.waktu)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase block">
                LOKASI PERTEMUAN:
              </span>
              <div className="flex items-start text-slate-700">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0 mr-2 mt-0.5" />
                <span className="text-[13px] font-semibold leading-normal">{selectedEvent.lokasi}</span>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center text-slate-400 italic shadow-3xs">
          Pilih salah satu jadwal agenda untuk memuat detail lengkap.
        </div>
      )}

      {/* DIALOG ADD AGENDA ACARA */}
      {isAddingAgenda && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="border-b px-5 py-4 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-emerald-600" /> {editingAgendaId ? 'Edit Agenda / Acara' : 'Atur Acara / Agenda Baru'}
              </h3>
              <button 
                onClick={() => {
                  setIsAddingAgenda(false);
                  setEditingAgendaId(null);
                }} 
                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAgenda} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Agenda Acara</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Pertemuan Arisan Semester 1"
                  value={formAgenda.namaAcara}
                  onChange={(e) => setFormAgenda({...formAgenda, namaAcara: e.target.value})}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal</label>
                <input 
                  type="date" 
                  required
                  value={formAgenda.tanggal}
                  onChange={(e) => setFormAgenda({...formAgenda, tanggal: e.target.value})}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Waktu Acara</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: 10:00 - 16:30"
                  value={formAgenda.waktu}
                  onChange={(e) => setFormAgenda({...formAgenda, waktu: e.target.value})}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tempat / Lokasi</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Rumah Makan Lesehan, Jaksel"
                  value={formAgenda.lokasi}
                  onChange={(e) => setFormAgenda({...formAgenda, lokasi: e.target.value})}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Deskripsi Acara</label>
                <textarea 
                  rows={3}
                  required
                  placeholder="Isi rincian kegiatan acara silsilah..."
                  value={formAgenda.deskripsi}
                  onChange={(e) => setFormAgenda({...formAgenda, deskripsi: e.target.value})}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Penanggungjawab</label>
                <select
                  value={formAgenda.penanggungJawab}
                  onChange={(e) => setFormAgenda({...formAgenda, penanggungJawab: e.target.value})}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500 bg-white"
                >
                  {anggota.map(m => (
                    <option key={m.id} value={m.nama}>{m.nama}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3 border-t">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsAddingAgenda(false);
                    setEditingAgendaId(null);
                  }} 
                  className="flex-1 py-2 text-xs font-bold text-slate-500 border rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl"
                >
                  {editingAgendaId ? 'Simpan Perubahan' : 'Simpan Agenda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
