import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SIKTState, AnggotaKeluarga } from '../types';
import { getCleanDriveUrl } from '../services/api';
import { 
  Plus, Search, ZoomIn, ZoomOut, RotateCcw, 
  MapPin, Phone, Briefcase, Calendar, Heart, 
  User as UserIcon, Settings, Trash2, Edit3, X, Sparkles,
  Maximize, RefreshCw, Printer, Download
} from 'lucide-react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  NodeProps,
  Edge,
  Node,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

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

// Helper to compute age accurately (at death or present age)
const computeAge = (birthStr: string, deathStr?: string) => {
  if (!birthStr) return 0;
  const birthDate = new Date(birthStr);
  const endDate = deathStr ? new Date(deathStr) : new Date();
  
  let age = endDate.getFullYear() - birthDate.getFullYear();
  const m = endDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && endDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const getInitials = (nama: string) => {
  if (!nama) return '?';
  const cleanName = nama.replace(/\(alm\)/gi, '').replace(/[^a-zA-Z\s]/g, '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const areSpousesOrParents = (m1: AnggotaKeluarga, m2: AnggotaKeluarga, allAnggota: AnggotaKeluarga[]) => {
  if (m1.pasanganId === m2.id || m2.pasanganId === m1.id) return true;
  // If they are both listed as parents of any child in the family tree
  return allAnggota.some(c => 
    (c.ayahId === m1.id && c.ibuId === m2.id) || 
    (c.ayahId === m2.id && c.ibuId === m1.id)
  );
};

const renderAvatar = (m: AnggotaKeluarga, sizeClass = "w-12 h-12 text-[13px]", borderOverride?: string) => {
  const isMale = m.gender === 'Laki-laki';
  const hasPhoto = !!(m.foto && m.foto.trim() !== '' && !m.foto.toLowerCase().includes('placeholder') && !m.foto.startsWith('/'));
  const borderColor = borderOverride || (isMale ? 'border-sky-500' : 'border-pink-500');
  const initials = getInitials(m.nama);

  if (hasPhoto) {
    const cleanPhotoUrl = getCleanDriveUrl(m.foto);
    return (
      <div className="relative shrink-0 flex items-center justify-center">
        <img 
          src={cleanPhotoUrl} 
          className={`${sizeClass} rounded-full object-cover shrink-0 border-2 ${borderColor}`} 
          alt={m.nama} 
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) {
              fallback.style.display = 'flex';
              fallback.className = fallback.className.replace('hidden', 'flex');
            }
          }}
        />
        <div 
          style={{ display: 'none' }}
          className={`${sizeClass} rounded-full shrink-0 flex items-center justify-center text-white font-black tracking-wider border-2 ${borderColor} shadow-xs ${
            isMale 
              ? 'bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 border-sky-400' 
              : 'bg-gradient-to-tr from-pink-500 via-rose-500 to-fuchsia-600 border-pink-400'
          }`}
        >
          {initials}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${sizeClass} rounded-full shrink-0 flex items-center justify-center text-white font-black tracking-wider border-2 ${borderColor} shadow-xs ${
        isMale 
          ? 'bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 border-sky-400' 
          : 'bg-gradient-to-tr from-pink-500 via-rose-500 to-fuchsia-600 border-pink-400'
      }`}
    >
      {initials}
    </div>
  );
};

// 1. Define Custom Family Member Node component
const FamilyMemberNode = React.memo(({ data }: NodeProps<any>) => {
  const m = data.member as AnggotaKeluarga;
  const isSelected = data.isSelected;
  const age = m.tanggalLahir ? computeAge(m.tanggalLahir, m.tanggalWafat) : 0;

  return (
    <div
      className={`p-2.5 rounded-2xl border transition-all duration-300 transform hover:scale-[1.03] flex items-center gap-3 text-left relative shadow-xs ${
        isSelected 
          ? 'border-emerald-500 bg-emerald-50/90 shadow-emerald-100 shadow-md ring-2 ring-emerald-500/20 text-slate-800' 
          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:shadow-md'
      }`}
      style={{ 
        width: '195px', 
        height: '96px',
        cursor: 'pointer'
      }}
    >
      {/* Gold badge for oldest master ancestor */}
      {data.isLeluhur && (
        <span className="absolute -top-3.5 -right-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-900 border border-amber-300 text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5 z-30">
          👑 Leluhur
        </span>
      )}

      {/* Target handle for parent lines (Emerald, on Top) */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top" 
        style={{ background: '#10b981', width: 7, height: 7, border: '1px solid #047857' }} 
      />
      {/* Source handle for child lines (Emerald, on Bottom) */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom" 
        style={{ background: '#10b981', width: 7, height: 7, border: '1px solid #047857' }} 
      />
      {/* Left/Right handles for horizontal husband/wife connections */}
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left" 
        style={{ background: 'transparent', border: 'none', width: 6, height: 6 }} 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        style={{ background: 'transparent', border: 'none', width: 6, height: 6 }} 
      />

      {renderAvatar(m, "w-12 h-12 text-[12px]")}
      
      <div className="truncate text-left flex-1 min-w-0">
        <p className={`text-[12px] font-extrabold truncate leading-tight ${m.statusHidup === 'Wafat' ? 'text-slate-500' : 'text-slate-800'}`}>
          {m.nama}
        </p>
        <p className="text-[10px] text-slate-600 font-bold truncate mt-0.5 flex items-center gap-1">
          <Calendar className="h-3 w-3 text-indigo-500 shrink-0" />
          <span>{m.statusHidup === 'Wafat' ? `Wafat (usia ${age}th)` : `Usia: ${age} Th`}</span>
        </p>
        <p className="text-[9px] text-slate-500 font-normal truncate mt-0.5 flex items-center gap-1" title={m.alamat}>
          <MapPin className="h-3 w-3 text-indigo-500 shrink-0" />
          <span className="truncate">{m.alamat || '-'}</span>
        </p>
        <span className={`inline-block text-[8px] px-1.5 py-0.1 rounded font-semibold border ${m.gender === 'Laki-laki' ? 'bg-sky-50 text-sky-600 border-sky-200/50' : 'bg-pink-50 text-pink-600 border-pink-200/50'} mt-1`}>
          {m.gender === 'Laki-laki' ? 'Laki-laki' : 'Perempuan'}
        </span>
      </div>
    </div>
  );
});

FamilyMemberNode.displayName = 'FamilyMemberNode';

// 2. Define Marriage Junction Node component
const MarriageJunctionNode = React.memo(() => {
  return (
    <div className="w-3.5 h-3.5 bg-sky-500 rounded-full border-2 border-white flex items-center justify-center relative shadow-md">
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left"
        style={{ background: 'transparent', border: 'none', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '130%', height: '130%' }} 
      />
      <Handle 
        type="target" 
        position={Position.Right} 
        id="right"
        style={{ background: 'transparent', border: 'none', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '130%', height: '130%' }} 
      />
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top"
        style={{ background: 'transparent', border: 'none', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '130%', height: '130%' }} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom"
        style={{ background: 'transparent', border: 'none', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '130%', height: '130%' }} 
      />
    </div>
  );
});

MarriageJunctionNode.displayName = 'MarriageJunctionNode';

const nodeTypes = {
  familyMember: FamilyMemberNode,
  marriageJunction: MarriageJunctionNode,
};


interface FamilyTreeProps {
  state: SIKTState;
  onUpdateState: (newState: SIKTState) => void;
}

export default function FamilyTree({ state, onUpdateState }: FamilyTreeProps) {
  const { anggota } = state;
  const isWritable = state.currentUser?.role === 'Administrator';

  // State Management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('A2'); // Default to grandmother Siti Aminah
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [activeView, setActiveView] = useState<'tree' | 'list'>('tree');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [memberToDeleteId, setMemberToDeleteId] = useState<string | null>(null);
  
  // React Flow state Setup
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const reactFlowInstance = useRef<any>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [layoutResetCount, setLayoutResetCount] = useState(0);

  const handleFitView = () => {
    reactFlowInstance.current?.fitView({ padding: 0.15, duration: 800 });
  };

  const handlePrint = (isPdf = false) => {
    // Zoom/fit view to encompass everything on print canvas
    reactFlowInstance.current?.fitView({ padding: 0.08 });
    
    if (isPdf) {
      alert("TIPS UNDUH PDF:\n\nSaat layar cetak browser muncul, ganti pilihan Tujuan / Printer (Destination) menjadi \"Simpan sebagai PDF\" (Save as PDF) untuk mengunduh bagan silsilah dalam dokumen berkas PDF resolusi tinggi.");
    }
    
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const handleRecalculateLayout = () => {
    setIsRecalculating(true);
    setLayoutResetCount(prev => prev + 1);
    setTimeout(() => {
      reactFlowInstance.current?.fitView({ padding: 0.15, duration: 1000 });
      setIsRecalculating(false);
    }, 600);
  };
  
  // SVG Pan & Zoom State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 100, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  // Form State for Adding / Editing
  const defaultFormFields = {
    nama: '',
    gender: 'Laki-laki' as 'Laki-laki' | 'Perempuan',
    tempatLahir: '',
    tanggalLahir: '',
    ayahId: '',
    ibuId: '',
    pasanganId: '',
    alamat: '',
    telepon: '',
    pekerjaan: '',
    fotoTarget: '', // base64 or URL
    statusHidup: 'Hidup' as 'Hidup' | 'Wafat',
    tanggalWafat: '',
  };

  const [formFields, setFormFields] = useState(defaultFormFields);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Active Selected Member Profile Details
  const activeMember = useMemo(() => {
    return anggota.find(m => m.id === selectedMemberId) || anggota[0];
  }, [anggota, selectedMemberId]);

  // Compute Generations strictly
  const membersByGeneration = useMemo(() => {
    const genMap: Record<string, number> = {};
    
    // Step 1: Initialize everyone to Gen 1
    anggota.forEach(m => {
      genMap[m.id] = 1;
    });

    // Step 2: Multi-pass propagation to handle parent hierarchies and spouses
    // 6 passes is structurally sufficient to settle any family tree up to 6 generations deep.
    for (let pass = 0; pass < 6; pass++) {
      anggota.forEach(m => {
        // Direct parent hierarchy
        if (m.ayahId || m.ibuId) {
          const fatherGen = m.ayahId ? (genMap[m.ayahId] || 1) : 1;
          const motherGen = m.ibuId ? (genMap[m.ibuId] || 1) : 1;
          genMap[m.id] = Math.max(fatherGen, motherGen) + 1;
        }
        
        // Spouse alignment (spouses should belong to the same generation level)
        if (m.pasanganId) {
          const mGen = genMap[m.id] || 1;
          const spouseGen = genMap[m.pasanganId] || 1;
          const unifiedGen = Math.max(mGen, spouseGen);
          genMap[m.id] = unifiedGen;
          genMap[m.pasanganId] = unifiedGen;
        }

        // Parent alignment (co-parents of the same child should belong to the same generation level)
        if (m.ayahId && m.ibuId) {
          const fatherGen = genMap[m.ayahId] || 1;
          const motherGen = genMap[m.ibuId] || 1;
          const unifiedParentGen = Math.max(fatherGen, motherGen);
          genMap[m.ayahId] = unifiedParentGen;
          genMap[m.ibuId] = unifiedParentGen;
        }
      });
    }

    // Group members by generations (1, 2, 3, 4)
    const grouped: Record<number, AnggotaKeluarga[]> = {};
    Object.entries(genMap).forEach(([id, gen]) => {
      if (!grouped[gen]) grouped[gen] = [];
      const m = anggota.find(x => x.id === id);
      if (m) grouped[gen].push(m);
    });

    return grouped;
  }, [anggota]);

  // Quick lookup dictionary for member generations consistent with list groupings
  const memberGenLookup = useMemo(() => {
    const lookup: Record<string, number> = {};
    Object.entries(membersByGeneration).forEach(([genStr, members]) => {
      const gen = parseInt(genStr, 10);
      (members as AnggotaKeluarga[]).forEach((m: AnggotaKeluarga) => {
        lookup[m.id] = gen;
      });
    });
    return lookup;
  }, [membersByGeneration]);

  // Find oldest ancestor at generation 1 (most senior founder) with no parents
  const leluhurId = useMemo(() => {
    const genOne = membersByGeneration[1] || [];
    const roots = genOne.filter(m => !m.ayahId && !m.ibuId);
    if (roots.length === 0) return null;
    
    // Sort by birth date ascending (oldest first)
    return [...roots].sort((a, b) => {
      const dateA = new Date(a.tanggalLahir).getTime();
      const dateB = new Date(b.tanggalLahir).getTime();
      return dateA - dateB;
    })[0]?.id;
  }, [membersByGeneration]);

  const leluhurMember = useMemo(() => {
    return anggota.find(m => m.id === leluhurId);
  }, [anggota, leluhurId]);

  // Handle Search and select nodes
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return anggota.filter(m => 
      m.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.pekerjaan.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, anggota]);

  // Pan and Zoom viewport events
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.member-card-node')) return; // ignore clicks on nodes
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile pan zoom dragging support
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.member-card-node')) return; // ignore touch on nodes
    const touch = e.touches[0];
    setIsDragging(true);
    dragStart.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.current.x,
      y: touch.clientY - dragStart.current.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleZoom = (factor: number) => {
    setZoom(prev => Math.max(0.4, Math.min(2.5, prev * factor)));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 100, y: 50 });
  };

  // Image Upload handler (Base64 conversion)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setUploadError("Ukuran file foto profil maksimal adalah 2MB!");
        e.target.value = ""; // Clear file choice
        return;
      }
      setUploadError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormFields(prev => ({ ...prev, fotoTarget: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger Edit Form
  const openEditForm = () => {
    if (!activeMember) return;
    setUploadError(null);
    setFormFields({
      nama: activeMember.nama,
      gender: activeMember.gender,
      tempatLahir: activeMember.tempatLahir,
      tanggalLahir: activeMember.tanggalLahir,
      ayahId: activeMember.ayahId,
      ibuId: activeMember.ibuId,
      pasanganId: activeMember.pasanganId,
      alamat: activeMember.alamat,
      telepon: activeMember.telepon,
      pekerjaan: activeMember.pekerjaan,
      fotoTarget: activeMember.foto || '',
      statusHidup: activeMember.statusHidup,
      tanggalWafat: activeMember.tanggalWafat || '',
    });
    setIsEditingMember(true);
  };

  // Save changes to active member
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMember) return;

    const updated = anggota.map(m => {
      if (m.id === activeMember.id) {
        return {
          ...m,
          nama: formFields.nama,
          gender: formFields.gender,
          tempatLahir: formFields.tempatLahir,
          tanggalLahir: formFields.tanggalLahir,
          ayahId: formFields.ayahId,
          ibuId: formFields.ibuId,
          pasanganId: formFields.pasanganId,
          alamat: formFields.alamat,
          telepon: formFields.telepon,
          pekerjaan: formFields.pekerjaan,
          foto: formFields.fotoTarget || m.foto,
          statusHidup: formFields.statusHidup,
          tanggalWafat: formFields.statusHidup === 'Wafat' ? formFields.tanggalWafat : undefined,
        };
      }
      return m;
    });

    onUpdateState({ ...state, anggota: updated });
    setIsEditingMember(false);
  };

  // Trigger Add Form with relationships preset
  const openAddForm = (relationType?: 'spouse' | 'child' | 'parent') => {
    const fields = { ...defaultFormFields };
    setUploadError(null);
    if (relationType === 'spouse' && activeMember) {
      fields.pasanganId = activeMember.id;
      fields.gender = activeMember.gender === 'Laki-laki' ? 'Perempuan' : 'Laki-laki';
    } else if (relationType === 'child' && activeMember) {
      if (activeMember.gender === 'Laki-laki') {
        fields.ayahId = activeMember.id;
        fields.ibuId = activeMember.pasanganId;
      } else {
        fields.ibuId = activeMember.id;
        fields.ayahId = activeMember.pasanganId;
      }
    } else if (relationType === 'parent' && activeMember) {
      // setting parent relationships to activeMember
    }
    setFormFields(fields);
    setIsAddingMember(true);
  };

  // Create new member
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `A_${Date.now()}`;
    const newMember: AnggotaKeluarga = {
      id: newId,
      nama: formFields.nama,
      gender: formFields.gender,
      tempatLahir: formFields.tempatLahir,
      tanggalLahir: formFields.tanggalLahir,
      ayahId: formFields.ayahId,
      ibuId: formFields.ibuId,
      pasanganId: formFields.pasanganId,
      alamat: formFields.alamat,
      telepon: formFields.telepon,
      pekerjaan: formFields.pekerjaan,
      foto: formFields.fotoTarget || '',
      statusHidup: formFields.statusHidup,
      tanggalWafat: formFields.statusHidup === 'Wafat' ? formFields.tanggalWafat : undefined,
    };

    // If new member has a spouse, bind bidirectionally
    let updated = [...anggota, newMember];
    if (formFields.pasanganId) {
      updated = updated.map(m => {
        if (m.id === formFields.pasanganId) {
          return { ...m, pasanganId: newId };
        }
        return m;
      });
    }

    onUpdateState({ ...state, anggota: updated });
    setIsAddingMember(false);
    setSelectedMemberId(newId);
  };

  // Actually perform member deletion after custom modal confirmation
  const executeDeleteMember = (memberId: string) => {
    const updated = anggota.filter(m => m.id !== memberId).map(m => {
      // Clear references
      let spouse = m.pasanganId === memberId ? '' : m.pasanganId;
      let father = m.ayahId === memberId ? '' : m.ayahId;
      let mother = m.ibuId === memberId ? '' : m.ibuId;
      return {
        ...m,
        pasanganId: spouse,
        ayahId: father,
        ibuId: mother,
      };
    });

    // Clear event RSVPs for this member to prevent app crashes
    const updatedPeserta = state.pesertaAcara.filter(p => p.anggotaId !== memberId);

    onUpdateState({ 
      ...state, 
      anggota: updated,
      pesertaAcara: updatedPeserta
    });

    if (selectedMemberId === memberId) {
      setSelectedMemberId(updated[0]?.id || '');
    }

    // Reset modals
    setIsProfileModalOpen(false);
    setMemberToDeleteId(null);
  };

  // Delete Member By ID
  const handleDeleteMemberById = (memberId: string) => {
    const memberToDelete = anggota.find(m => m.id === memberId);
    if (!memberToDelete) return;
    setMemberToDeleteId(memberId);
  };

  const handleDeleteMember = () => {
    if (!activeMember) return;
    handleDeleteMemberById(activeMember.id);
  };

  // Relatives selectors
  const findMemberName = (id: string) => {
    return anggota.find(x => x.id === id)?.nama || 'Tidak diketahui';
  };

  // Quick relation navigation helpers
  const parentOfActive = useMemo(() => {
    const father = activeMember?.ayahId ? anggota.find(x => x.id === activeMember.ayahId) : null;
    const mother = activeMember?.ibuId ? anggota.find(x => x.id === activeMember.ibuId) : null;
    return { father, mother };
  }, [activeMember, anggota]);

  const spouseOfActive = useMemo(() => {
    return activeMember?.pasanganId ? anggota.find(x => x.id === activeMember.pasanganId) : null;
  }, [activeMember, anggota]);

  const childrenOfActive = useMemo(() => {
    if (!activeMember) return [];
    return anggota.filter(x => x.ayahId === activeMember.id || x.ibuId === activeMember.id);
  }, [activeMember, anggota]);

  const siblingsOfActive = useMemo(() => {
    if (!activeMember || (!activeMember.ayahId && !activeMember.ibuId)) return [];
    return anggota.filter(x => 
      x.id !== activeMember.id && 
      ((activeMember.ayahId && x.ayahId === activeMember.ayahId) || 
       (activeMember.ibuId && x.ibuId === activeMember.ibuId))
    );
  }, [activeMember, anggota]);

  // Spacing configurations
  const nodeWidth = 195;
  const nodeHeight = 96;
  const genHeightSpacing = 220; // vertical distance between generations
  const coupleGap = 35;         // Spouse items are mepet (35px gap)
  const childGap = 50;          // Gap between children of the same parent (user requested around 50px)

  const familyTreeLayout = useMemo(() => {
    const memberCoords: Record<string, { x: number; y: number }> = {};
    const marriageCoords: Record<string, { x: number; y: number }> = {};
    const marriageNodes: any[] = [];
    const formattedEdges: any[] = [];

    // Let's determine coordinates generation by generation
    const genKeys = Object.keys(membersByGeneration).map(Number).sort((a,b) => a - b);

    genKeys.forEach((gen) => {
      const membersList = membersByGeneration[gen] || [];
      const yPos = gen * genHeightSpacing;

      if (gen === 1) {
        // Generation 1 is placed centered around X = 0
        // Group them into blocks (should normally be 1 couple or a few founders)
        const blocks: any[] = [];
        const placed = new Set<string>();

        // Sort Gen 1 members by birth date so oldest is on the left
        const sortedMembersList = [...membersList].sort((a, b) => {
          if (!a.tanggalLahir) return 1;
          if (!b.tanggalLahir) return -1;
          return a.tanggalLahir.localeCompare(b.tanggalLahir);
        });

        sortedMembersList.forEach(m => {
          if (placed.has(m.id)) return;
          
          // Look for any spouse or co-parent in membersList
          const spouse = membersList.find(x => x.id !== m.id && areSpousesOrParents(m, x, anggota));
          if (spouse) {
            const male = m.gender === 'Laki-laki' ? m : spouse;
            const female = m.gender === 'Laki-laki' ? spouse : m;
            blocks.push({ type: 'couple', m1: male, m2: female });
            placed.add(male.id); placed.add(female.id);
            return;
          }
          blocks.push({ type: 'single', m });
          placed.add(m.id);
        });

        // Compute total width of Gen 1 blocks
        let totalWidth = 0;
        blocks.forEach((b, idx) => {
          totalWidth += b.type === 'couple' ? (nodeWidth * 2 + coupleGap) : nodeWidth;
          if (idx < blocks.length - 1) totalWidth += childGap;
        });

        let currentX = -totalWidth / 2;
        blocks.forEach(b => {
          if (b.type === 'couple' && b.m1 && b.m2) {
            memberCoords[b.m1.id] = { x: currentX, y: yPos };
            memberCoords[b.m2.id] = { x: currentX + nodeWidth + coupleGap, y: yPos };
            
            // Marriage junction at horizontal midpoint & vertical center level
            const jX = currentX + nodeWidth + (coupleGap / 2);
            const jY = yPos + (nodeHeight / 2);
            // Save the junction coordinate with parent IDs sorted
            const pIds = [b.m1.id, b.m2.id].sort().join('-');
            const mId = `marriage-${pIds}`;
            marriageCoords[mId] = { x: jX, y: jY };

            marriageNodes.push({
              id: mId,
              type: 'marriageJunction',
              position: { x: jX - 7, y: jY - 7 },
              data: {},
              draggable: false,
            });

            // Husband & Wife edges to junction (straight horizontal lines)
            formattedEdges.push({
              id: `edge-${b.m1.id}-to-${mId}`,
              source: b.m1.id,
              target: mId,
              sourceHandle: 'right',
              targetHandle: 'left',
              type: 'straight',
              style: { stroke: '#0ea5e9', strokeWidth: 3 },
            }, {
              id: `edge-${b.m2.id}-to-${mId}`,
              source: b.m2.id,
              target: mId,
              sourceHandle: 'left',
              targetHandle: 'right',
              type: 'straight',
              style: { stroke: '#0ea5e9', strokeWidth: 3 },
            });

            currentX += (nodeWidth * 2 + coupleGap) + childGap;
          } else if (b.type === 'single' && b.m) {
            memberCoords[b.m.id] = { x: currentX, y: yPos };
            currentX += nodeWidth + childGap;
          }
        });

      } else {
        // subsequent generations are grouped by their parents to center under parent's marriage junction!
        const parentGroups: Record<string, AnggotaKeluarga[]> = {};
        const childSpouses: Record<string, AnggotaKeluarga> = {};
        const independentMembers: AnggotaKeluarga[] = [];

        membersList.forEach(m => {
          if (m.pasanganId) {
            const spouse = membersList.find(x => x.id === m.pasanganId);
            const spouseHasParents = spouse && (spouse.ayahId || spouse.ibuId);
            const selfHasParents = m.ayahId || m.ibuId;
            if (spouseHasParents && !selfHasParents) {
              childSpouses[m.id] = m;
              return;
            }
          }

          if (m.ayahId || m.ibuId) {
            const pIds = [m.ayahId, m.ibuId].filter(Boolean).sort().join('-');
            if (!parentGroups[pIds]) parentGroups[pIds] = [];
            parentGroups[pIds].push(m);
          } else {
            independentMembers.push(m);
          }
        });

        // Helper: Resolve horizontal overlaps of clusters
        const resolveOverlaps = (
          blocks: Array<{ id: string; targetX: number; width: number; blocks: any[] }>,
          minGap = 110
        ) => {
          if (blocks.length === 0) return [];
          const sorted = [...blocks].sort((a, b) => a.targetX - b.targetX);
          const result = sorted.map(b => ({ ...b, x: b.targetX }));

          const maxIterations = 50;
          for (let iter = 0; iter < maxIterations; iter++) {
            let changed = false;

            // Left-to-right push
            for (let i = 0; i < result.length - 1; i++) {
              const b1 = result[i];
              const b2 = result[i+1];
              const minDistance = (b1.width / 2) + (b2.width / 2) + minGap;
              const currentDistance = b2.x - b1.x;
              if (currentDistance < minDistance) {
                const overlap = minDistance - currentDistance;
                b2.x += overlap;
                changed = true;
              }
            }

            // Right-to-left push
            for (let i = result.length - 1; i > 0; i--) {
              const b1 = result[i-1];
              const b2 = result[i];
              const minDistance = (b1.width / 2) + (b2.width / 2) + minGap;
              const currentDistance = b2.x - b1.x;
              if (currentDistance < minDistance) {
                const overlap = minDistance - currentDistance;
                b1.x -= overlap;
                changed = true;
              }
            }

            if (!changed) break;
          }
          return result;
        };

        const metaBlocks: Array<{ id: string; targetX: number; width: number; blocks: any[] }> = [];

        // Build metaBlocks for parent groups
        Object.entries(parentGroups).forEach(([parentKey, children]) => {
          // Sort children by birthdate ascending (oldest first = left, youngest last = right)
          children.sort((a, b) => {
            if (!a.tanggalLahir) return 1;
            if (!b.tanggalLahir) return -1;
            return a.tanggalLahir.localeCompare(b.tanggalLahir);
          });

          let centerRef = 0;
          const parentMarriageId = `marriage-${parentKey}`;
          if (marriageCoords[parentMarriageId]) {
            centerRef = marriageCoords[parentMarriageId].x;
          } else {
            const pIds = parentKey.split('-');
            const parentCoords = pIds.map(pid => memberCoords[pid]).filter(Boolean);
            if (parentCoords.length > 0) {
              const sumX = parentCoords.reduce((acc, c) => acc + c.x, 0);
              centerRef = (sumX / parentCoords.length) + (nodeWidth / 2);
            }
          }

          // Generate blocks for children and their spouses inside this cluster
          const blocks: any[] = [];
          const placed = new Set<string>();

          children.forEach(c => {
            if (placed.has(c.id)) return;
            const spouse = childSpouses[c.pasanganId] || membersList.find(x => x.id !== c.id && areSpousesOrParents(c, x, anggota));
            if (spouse) {
              const male = c.gender === 'Laki-laki' ? c : spouse;
              const female = c.gender === 'Laki-laki' ? spouse : c;
              blocks.push({ type: 'couple', m1: male, m2: female });
              placed.add(male.id); placed.add(female.id);
              return;
            }
            blocks.push({ type: 'single', m: c });
            placed.add(c.id);
          });

          // Compute cluster width
          let clusterWidth = 0;
          blocks.forEach((b, idx) => {
            clusterWidth += b.type === 'couple' ? (nodeWidth * 2 + coupleGap) : nodeWidth;
            if (idx < blocks.length - 1) clusterWidth += childGap;
          });

          metaBlocks.push({
            id: `family-${parentKey}`,
            targetX: centerRef,
            width: clusterWidth,
            blocks
          });
        });

        // Build metaBlock for independent members
        if (independentMembers.length > 0) {
          // Sort independent members by birthdate ascending (oldest first = left, youngest last = right)
          independentMembers.sort((a, b) => {
            if (!a.tanggalLahir) return 1;
            if (!b.tanggalLahir) return -1;
            return a.tanggalLahir.localeCompare(b.tanggalLahir);
          });

          const blocks: any[] = [];
          const placed = new Set<string>();

          independentMembers.forEach(m => {
            if (placed.has(m.id)) return;
            const spouse = membersList.find(x => x.id !== m.id && areSpousesOrParents(m, x, anggota));
            if (spouse) {
              const male = m.gender === 'Laki-laki' ? m : spouse;
              const female = m.gender === 'Laki-laki' ? spouse : m;
              blocks.push({ type: 'couple', m1: male, m2: female });
              placed.add(male.id); placed.add(female.id);
              return;
            }
            blocks.push({ type: 'single', m: m });
            placed.add(m.id);
          });

          let clusterWidth = 0;
          blocks.forEach((b, idx) => {
            clusterWidth += b.type === 'couple' ? (nodeWidth * 2 + coupleGap) : nodeWidth;
            if (idx < blocks.length - 1) clusterWidth += childGap;
          });

          metaBlocks.push({
            id: 'independent',
            targetX: 450, // Slightly offset so they are nicely spaced alongside families
            width: clusterWidth,
            blocks
          });
        }

        // Resolves overlaps
        const resolvedMetaBlocks = resolveOverlaps(metaBlocks, 120);

        // Apply coordinates from resolved blocks
        resolvedMetaBlocks.forEach(meta => {
          let currentX = meta.x - (meta.width / 2);

          meta.blocks.forEach(b => {
            if (b.type === 'couple' && b.m1 && b.m2) {
              memberCoords[b.m1.id] = { x: currentX, y: yPos };
              memberCoords[b.m2.id] = { x: currentX + nodeWidth + coupleGap, y: yPos };

              // Marriage junction at horizontal midpoint & vertical center level
              const jX = currentX + nodeWidth + (coupleGap / 2);
              const jY = yPos + (nodeHeight / 2);
              const pIds = [b.m1.id, b.m2.id].sort().join('-');
              const mId = `marriage-${pIds}`;
              marriageCoords[mId] = { x: jX, y: jY };

              marriageNodes.push({
                id: mId,
                type: 'marriageJunction',
                position: { x: jX - 7, y: jY - 7 },
                data: {},
                draggable: false,
              });

              // Husband & Wife edges to junction (straight horizontal lines)
              formattedEdges.push({
                id: `edge-${b.m1.id}-to-${mId}`,
                source: b.m1.id,
                target: mId,
                sourceHandle: 'right',
                targetHandle: 'left',
                type: 'straight',
                style: { stroke: '#0ea5e9', strokeWidth: 3 },
              }, {
                id: `edge-${b.m2.id}-to-${mId}`,
                source: b.m2.id,
                target: mId,
                sourceHandle: 'left',
                targetHandle: 'right',
                type: 'straight',
                style: { stroke: '#0ea5e9', strokeWidth: 3 },
              });

              currentX += (nodeWidth * 2 + coupleGap) + childGap;
            } else if (b.type === 'single' && b.m) {
              memberCoords[b.m.id] = { x: currentX, y: yPos };
              currentX += nodeWidth + childGap;
            }
          });
        });
      }
    });

    // Step 3: Create child edges with smoothstep routing to mimic traditional family trees perfectly
    anggota.forEach(m => {
      if (m.ayahId && m.ibuId) {
        const pIds = [m.ayahId, m.ibuId].sort().join('-');
        const mId = `marriage-${pIds}`;

        if (marriageCoords[mId]) {
          formattedEdges.push({
            id: `child-edge-${pIds}-${m.id}`,
            source: mId,
            target: m.id,
            sourceHandle: 'bottom',
            targetHandle: 'top',
            type: 'smoothstep',
            style: { stroke: '#0ea5e9', strokeWidth: 3 },
            pathOptions: { borderRadius: 16 },
          });
        } else {
          formattedEdges.push({
            id: `direct-edge-father-${m.ayahId}-${m.id}`,
            source: m.ayahId,
            target: m.id,
            sourceHandle: 'bottom',
            targetHandle: 'top',
            type: 'smoothstep',
            style: { stroke: '#0ea5e9', strokeWidth: 3 },
            pathOptions: { borderRadius: 16 },
          });
        }
      } else if (m.ayahId || m.ibuId) {
        const parentId = m.ayahId || m.ibuId;
        formattedEdges.push({
          id: `single-parent-edge-${parentId}-${m.id}`,
          source: parentId,
          target: m.id,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          type: 'smoothstep',
          style: { stroke: '#0ea5e9', strokeWidth: 3 },
          pathOptions: { borderRadius: 16 },
        });
      }
    });

    return { memberCoords, marriageCoords, marriageNodes, formattedEdges };
  }, [anggota, membersByGeneration]);

  // Synchronize state.anggota with React Flow Nodes & Edges
  useEffect(() => {
    const formattedNodes = anggota.map(m => {
      const coord = familyTreeLayout.memberCoords[m.id];
      return {
        id: m.id,
        type: 'familyMember',
        position: { x: coord ? coord.x : 0, y: coord ? coord.y : 0 },
        data: { 
          member: m, 
          isSelected: selectedMemberId === m.id,
          isLeluhur: m.id === leluhurId,
        },
      };
    });

    // Concatenate physical family members with their marriage dots
    const finalNodes = [...formattedNodes, ...familyTreeLayout.marriageNodes];

    setNodes(finalNodes);
    setEdges(familyTreeLayout.formattedEdges);
  }, [anggota, familyTreeLayout, selectedMemberId, layoutResetCount, setNodes, setEdges]);

  return (
    <div className="space-y-4">
      {/* Print-specific style layout overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: landscape;
            margin: 15mm 15mm;
          }
          body {
            background: white !important;
            color: black !important;
            font-family: system-ui, sans-serif;
          }
          /* Hide all surrounding panels, lists, overlays, buttons, search wrappers */
          .no-print, 
          header, 
          aside, 
          nav, 
          footer, 
          button, 
          input,
          .absolute.top-4.right-4, 
          .react-flow__controls, 
          .react-flow__minimap {
            display: none !important;
          }
          /* Make the main silsilah container occupy the full layout */
          #print-tree-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: calc(100vh - 40px) !important;
            border: none !important;
            background: white !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }
          .react-flow {
            background: white !important;
          }
        }
      ` }} />
      
      {/* Top Utility Bar with View Switcher and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs mb-1">
        {/* View Switcher */}
        <div className="flex bg-slate-100 p-0.5 rounded-xl max-w-sm text-xs font-semibold border border-slate-200/40 shrink-0 w-full md:w-auto">
          <button
            onClick={() => setActiveView('tree')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 py-1.5 px-4.5 rounded-lg transition-all cursor-pointer ${activeView === 'tree' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
          >
            🌐 Bagan Silsilah (Grafik)
          </button>
          <button
            onClick={() => setActiveView('list')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 py-1.5 px-4.5 rounded-lg transition-all cursor-pointer ${activeView === 'list' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
          >
            📋 Daftar Direktori (List)
          </button>
        </div>

        {/* Search Input Widget */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama anggota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-all font-medium text-slate-700"
          />

          {/* Inline search suggestions */}
          {/* Inline search suggestions */}
          {filteredSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl max-h-52 overflow-y-auto z-50 p-1.5 space-y-1">
              {filteredSuggestions.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedMemberId(item.id);
                    setSearchQuery('');
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 p-2 hover:bg-emerald-50 rounded-lg text-left transition cursor-pointer"
                >
                  {renderAvatar(item, "w-8 h-8 text-[10px]", "border-slate-200")}
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{item.nama}</p>
                    <p className="text-[10px] text-slate-400">{item.pekerjaan || 'Keluarga'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full">
        {activeView === 'tree' ? (
          <div id="print-tree-container" className="w-full bg-gradient-to-br from-slate-50 via-zinc-100 to-indigo-50/40 rounded-3xl overflow-hidden relative border border-slate-200/80 shadow-xl h-[580px]">
            {/* Print-only Header (renders beautifully at the top when printed) */}
            <div className="hidden print:block text-center pt-5 pb-3">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
                Bagan Silsilah Keluarga Besar
              </h1>
              {leluhurMember && (
                <p className="text-sm font-semibold text-slate-500 mt-1">
                  Garis Keturunan dari Leluhur: <span className="text-emerald-600 font-extrabold">{leluhurMember.nama}</span>
                </p>
              )}
              <div className="w-16 h-1 bg-emerald-500 mx-auto mt-2 rounded"></div>
            </div>

            {/* Quick Actions overlay */}
            <div className="absolute top-4 right-4 z-20 flex flex-wrap items-center gap-2 no-print">
              <button 
                onClick={handleRecalculateLayout}
                title="Kalkulasi Ulang Letak Silsilah"
                className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl shadow-sm transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isRecalculating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Kalkulasi Tata Letak</span>
              </button>

              <button 
                onClick={() => handlePrint(true)}
                title="Download PDF Silsilah"
                className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl shadow-sm transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-sky-500" />
                <span className="hidden sm:inline">Unduh PDF</span>
              </button>

              {isWritable && (
                <button 
                  onClick={() => openAddForm()} 
                  className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition flex items-center gap-1 text-xs font-semibold shadow-sm cursor-pointer hover:shadow-emerald-950/20"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Anggota
                </button>
              )}
            </div>

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              onInit={(instance) => { reactFlowInstance.current = instance; }}
              fitView
              minZoom={0.2}
              maxZoom={2.5}
              onNodeClick={(e, n) => {
                if (n.type === 'marriageJunction' || n.id.startsWith('marriage-')) {
                  return;
                }
                setSelectedMemberId(n.id);
                setIsProfileModalOpen(true);
              }}
              className="w-full h-full"
            >
              <Background 
                color="#6366f1" 
                gap={24} 
                size={1.2} 
                opacity={0.12}
                variant={BackgroundVariant.Dots} 
              />
              <Controls position="top-left" className="!bg-white !border-slate-200 !text-slate-700 !shadow-sm no-print" />
              <MiniMap 
                style={{ 
                  background: '#ffffff', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '12px' 
                }} 
                nodeColor={(n: any) => {
                  const m = n.data?.member as AnggotaKeluarga;
                  if (!m) return '#10b981';
                  return m.gender === 'Laki-laki' ? '#3b82f6' : '#ec4899';
                }}
              />
            </ReactFlow>

            {/* Legend overlays */}
            <div className="absolute bottom-4 left-4 z-25 flex flex-wrap gap-4 text-[10px] text-slate-600 bg-white/90 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-slate-200 pointer-events-none shadow-md">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500"></span> Laki-laki
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-pink-500"></span> Perempuan
              </div>
            </div>
          </div>
        ) : (
          /* Elegant Card-based Family Directory for clean Mobile and Web usability */
          <div className="w-full space-y-4 animate-in fade-in duration-300">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-3xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Direktori Daftar Anggota Silsilah</h3>
                  <p className="text-xs text-slate-500 mt-1">Grup silsilah terperinci yang digolongkan berdasarkan generasi keluarga besar.</p>
                </div>
                {isWritable && (
                  <button 
                    onClick={() => openAddForm()} 
                    className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition text-xs font-bold flex items-center justify-center gap-1 shrink-0 self-start sm:self-center"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Anggota
                  </button>
                )}
              </div>
              
              <div className="space-y-6">
                {Object.entries(membersByGeneration).map(([genStr, members]) => {
                  const gen = parseInt(genStr, 10);
                  const membersList = members as AnggotaKeluarga[];
                  
                  return (
                    <div key={gen} className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100/70 inline-block">
                        🛡️ Generasi {gen} ({membersList.length} Jiwa)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {membersList.map(item => {
                          const isSelected = selectedMemberId === item.id;
                          return (
                            <div 
                              key={item.id}
                              onClick={() => {
                                setSelectedMemberId(item.id);
                                setIsProfileModalOpen(true);
                              }}
                              className={`p-3.5 bg-white rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between group ${isSelected ? 'border-emerald-500 bg-emerald-50/20 shadow-xs shadow-emerald-50 ring-1 ring-emerald-500/10 scale-[1.01]' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50/50'}`}
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                {renderAvatar(item, "w-12 h-12 text-[12px]", "border-white")}
                                <div className="min-w-0">
                                  <h5 className="text-sm font-bold text-slate-850 truncate flex items-center gap-1.5">
                                    {item.nama}
                                    {item.statusHidup === 'Wafat' && (
                                      <span className="text-[9px] bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded font-mono uppercase tracking-wider font-extrabold shrink-0">Alm</span>
                                    )}
                                  </h5>
                                  <p className="text-xs text-slate-500 truncate">{item.pekerjaan || 'Keluarga'}</p>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-semibold border ${item.gender === 'Laki-laki' ? 'bg-sky-50 text-sky-600 border-sky-100' : 'bg-pink-50 text-pink-600 border-pink-100'}`}>
                                      {item.gender === 'Laki-laki' ? 'Laki-laki' : 'Perempuan'}
                                    </span>
                                    {item.telepon && item.telepon !== '-' && (
                                      <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">{item.telepon}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end justify-between h-12 gap-1 shrink-0">
                                <span className="text-[10px] text-slate-400 font-mono font-semibold">{item.tempatLahir}</span>
                                <div className="flex items-center gap-2">
                                  {isWritable && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMemberById(item.id);
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition duration-150"
                                      title="Hapus Anggota"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  <span className="text-[10px] text-emerald-600 font-bold group-hover:translate-x-0.5 transition-transform duration-150">Pilih &rarr;</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DIALOG ADD MEMBER DRAWER POPUP */}
      {isAddingMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="border-b px-5 py-4 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-600" /> Tambah Anggota Silsilah
              </h3>
              <button onClick={() => setIsAddingMember(false)} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAdd} className="p-5 space-y-4 max-h-[480px] overflow-y-auto">
              
              {/* Profile Image Drag-and-file */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Foto Anggota (Unggah JPG/PNG)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 cursor-pointer"
                />
                {uploadError && (
                  <p className="mt-1 text-xs text-rose-500 font-medium animate-pulse">{uploadError}</p>
                )}
                {formFields.fotoTarget && !uploadError && (
                  <img src={formFields.fotoTarget} className="mt-2 w-16 h-16 rounded-full border object-cover" alt="Review" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: Andi Sukadi Arwani"
                    value={formFields.nama}
                    onChange={(e) => setFormFields({...formFields, nama: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Jenis Kelamin</label>
                  <select 
                    value={formFields.gender}
                    onChange={(e) => setFormFields({...formFields, gender: e.target.value as 'Laki-laki' | 'Perempuan'})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500 bg-white"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Pekerjaan</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: PNS, Pelajar"
                    value={formFields.pekerjaan}
                    onChange={(e) => setFormFields({...formFields, pekerjaan: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tempat Lahir</label>
                  <input 
                    type="text" 
                    placeholder="Yogyakarta"
                    value={formFields.tempatLahir}
                    onChange={(e) => setFormFields({...formFields, tempatLahir: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Lahir</label>
                  <input 
                    type="date" 
                    required
                    value={formFields.tanggalLahir}
                    onChange={(e) => setFormFields({...formFields, tanggalLahir: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                  />
                </div>

                {/* Relatives Binding dropdown picks */}
                <div className="col-span-2 grid grid-cols-2 gap-3 border-t pt-3">
                  <div className="col-span-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Silsilah Hubungan</div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Rujukan Istri / Suami</label>
                    <select 
                      value={formFields.pasanganId}
                      onChange={(e) => setFormFields({...formFields, pasanganId: e.target.value})}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500 bg-white text-slate-600"
                    >
                      <option value="">(Tidak ada)</option>
                      {anggota.map(m => (
                        <option key={m.id} value={m.id}>{m.nama}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Rujukan Ayah</label>
                    <select 
                      value={formFields.ayahId}
                      onChange={(e) => setFormFields({...formFields, ayahId: e.target.value})}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500 bg-white text-slate-600"
                    >
                      <option value="">(Tidak ada)</option>
                      {anggota.filter(m => m.gender === 'Laki-laki').map(m => (
                        <option key={m.id} value={m.id}>{m.nama}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Rujukan Ibu</label>
                    <select 
                      value={formFields.ibuId}
                      onChange={(e) => setFormFields({...formFields, ibuId: e.target.value})}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500 bg-white text-slate-600"
                    >
                      <option value="">(Tidak ada)</option>
                      {anggota.filter(m => m.gender === 'Perempuan').map(m => (
                        <option key={m.id} value={m.id}>{m.nama}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Domisili / Alamat</label>
                  <textarea 
                    rows={2}
                    value={formFields.alamat}
                    onChange={(e) => setFormFields({...formFields, alamat: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                    placeholder="Alamat jalan lengkap..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Telepon</label>
                  <input 
                    type="text" 
                    value={formFields.telepon}
                    onChange={(e) => setFormFields({...formFields, telepon: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Status Kehidupan</label>
                  <select 
                    value={formFields.statusHidup}
                    onChange={(e) => setFormFields({...formFields, statusHidup: e.target.value as 'Hidup' | 'Wafat'})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500 bg-white"
                  >
                    <option value="Hidup">Masih Hidup</option>
                    <option value="Wafat">Meninggal Dunia</option>
                  </select>
                </div>

                {formFields.statusHidup === 'Wafat' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Meninggal Dunia</label>
                    <input 
                      type="date" 
                      value={formFields.tanggalWafat}
                      onChange={(e) => setFormFields({...formFields, tanggalWafat: e.target.value})}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsAddingMember(false)} 
                  className="flex-1 py-2 text-xs font-bold text-slate-500 border rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG EDIT MEMBER DRAWER POPUP */}
      {isEditingMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="border-b px-5 py-4 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-emerald-600" /> Edit Hubungan & Profil
              </h3>
              <button onClick={() => setIsEditingMember(false)} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 max-h-[480px] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ganti Foto Profil</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 cursor-pointer"
                />
                {uploadError && (
                  <p className="mt-1 text-xs text-rose-500 font-medium animate-pulse">{uploadError}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap</label>
                  <input 
                    type="text" 
                    required
                    value={formFields.nama}
                    onChange={(e) => setFormFields({...formFields, nama: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Jenis Kelamin</label>
                  <select 
                    value={formFields.gender}
                    onChange={(e) => setFormFields({...formFields, gender: e.target.value as 'Laki-laki' | 'Perempuan'})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500 bg-white"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Pekerjaan</label>
                  <input 
                    type="text" 
                    value={formFields.pekerjaan}
                    onChange={(e) => setFormFields({...formFields, pekerjaan: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tempat Lahir</label>
                  <input 
                    type="text" 
                    value={formFields.tempatLahir}
                    onChange={(e) => setFormFields({...formFields, tempatLahir: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Lahir</label>
                  <input 
                    type="date" 
                    value={formFields.tanggalLahir}
                    onChange={(e) => setFormFields({...formFields, tanggalLahir: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                  />
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-3 border-t pt-3">
                  <div className="col-span-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Silsilah Hubungan</div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Rujukan Istri / Suami</label>
                    <select 
                      value={formFields.pasanganId}
                      onChange={(e) => setFormFields({...formFields, pasanganId: e.target.value})}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500 bg-white text-slate-600"
                    >
                      <option value="">(Tidak ada)</option>
                      {anggota.filter(m => m.id !== activeMember.id).map(m => (
                        <option key={m.id} value={m.id}>{m.nama}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Rujukan Ayah</label>
                    <select 
                      value={formFields.ayahId}
                      onChange={(e) => setFormFields({...formFields, ayahId: e.target.value})}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500 bg-white text-slate-600"
                    >
                      <option value="">(Tidak ada)</option>
                      {anggota.filter(m => m.gender === 'Laki-laki' && m.id !== activeMember.id).map(m => (
                        <option key={m.id} value={m.id}>{m.nama}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Rujukan Ibu</label>
                    <select 
                      value={formFields.ibuId}
                      onChange={(e) => setFormFields({...formFields, ibuId: e.target.value})}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500 bg-white text-slate-600"
                    >
                      <option value="">(Tidak ada)</option>
                      {anggota.filter(m => m.gender === 'Perempuan' && m.id !== activeMember.id).map(m => (
                        <option key={m.id} value={m.id}>{m.nama}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Domisili / Alamat</label>
                  <textarea 
                    rows={2}
                    value={formFields.alamat}
                    onChange={(e) => setFormFields({...formFields, alamat: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Telepon</label>
                  <input 
                    type="text" 
                    value={formFields.telepon}
                    onChange={(e) => setFormFields({...formFields, telepon: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Status Kehidupan</label>
                  <select 
                    value={formFields.statusHidup}
                    onChange={(e) => setFormFields({...formFields, statusHidup: e.target.value as 'Hidup' | 'Wafat'})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500 bg-white"
                  >
                    <option value="Hidup">Masih Hidup</option>
                    <option value="Wafat">Meninggal Dunia</option>
                  </select>
                </div>

                {formFields.statusHidup === 'Wafat' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Meninggal Dunia</label>
                    <input 
                      type="date" 
                      value={formFields.tanggalWafat}
                      onChange={(e) => setFormFields({...formFields, tanggalWafat: e.target.value})}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsEditingMember(false)} 
                  className="flex-1 py-2 text-xs font-bold text-slate-500 border rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG PROFILE DETAILS POPUP MODAL */}
      {isProfileModalOpen && activeMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Header portion with elegant pattern or colored banner */}
            <div className="border-b px-6 py-5 flex justify-between items-center bg-slate-50 relative">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <UserIcon className="h-5 w-5" />
                </span>
                <h3 className="font-bold text-slate-800 text-base">
                  Detail Profil Anggota
                </h3>
              </div>
              <button 
                onClick={() => setIsProfileModalOpen(false)} 
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[520px] overflow-y-auto">
              {/* Profile Card Summary Banner */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-2">
                <div className="relative shrink-0 flex items-center justify-center">
                  {renderAvatar(activeMember, "w-20 h-20 text-[20px]", activeMember.gender === 'Laki-laki' ? 'border-sky-500' : 'border-pink-500')}
                  <span className={`absolute bottom-0 right-0 px-2 py-0.5 rounded-full text-white text-[9px] uppercase font-black tracking-wider shadow-sm ${activeMember.statusHidup === 'Hidup' ? 'bg-emerald-500' : 'bg-slate-500'}`}>
                    {activeMember.statusHidup === 'Hidup' ? 'Hidup' : 'Wafat'}
                  </span>
                </div>
                <div className="text-center sm:text-left min-w-0 flex-1">
                  <h2 className="font-extrabold text-slate-850 text-xl leading-tight truncate">{activeMember.nama}</h2>
                  <div className="text-xs text-slate-500 mt-1 font-semibold flex items-center justify-center sm:justify-start gap-1 flex-wrap">
                    <span>{activeMember.pekerjaan || 'Keluarga'}</span>
                    <span className="text-slate-300">&bull;</span>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${activeMember.gender === 'Laki-laki' ? 'bg-sky-50 text-sky-600' : 'bg-pink-50 text-pink-600'}`}>
                      {activeMember.gender}
                    </span>
                  </div>
                  <p className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full mt-2 inline-block">
                    Generasi {memberGenLookup[activeMember.id] || '-'}
                  </p>
                </div>
              </div>

              {/* Bio Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-705">
                <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                  <Calendar className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Kelahiran</span>
                    <strong className="text-slate-800">{activeMember.tempatLahir}</strong>
                    <span className="block text-slate-500">{formatDate(activeMember.tanggalLahir)}</span>
                  </div>
                </div>

                {activeMember.statusHidup === 'Wafat' && activeMember.tanggalWafat && (
                  <div className="flex items-start gap-2 bg-red-50/30 p-2.5 rounded-xl border border-red-100/50">
                    <Calendar className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] text-red-400 block font-semibold uppercase tracking-wider">Meninggal Dunia</span>
                      <strong className="text-red-800">Wafat pada</strong>
                      <span className="block text-red-700">{formatDate(activeMember.tanggalWafat)}</span>
                    </div>
                  </div>
                )}

                {activeMember.telepon && activeMember.telepon !== '-' && (
                  <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                    <Phone className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Telepon</span>
                      <span className="font-mono font-bold text-slate-800">{activeMember.telepon}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50 sm:col-span-2">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Alamat Domisili</span>
                    <span className="text-slate-800 font-medium">{activeMember.alamat || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Family Connections Section */}
              <div className="space-y-3 pt-3 border-t border-dashed">
                <p className="font-bold text-slate-800 text-xs uppercase tracking-wider">Hubungan & Silsilah</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Orang Tua */}
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-150">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">Orang Tua</span>
                    <div className="flex flex-col gap-1.5">
                      {parentOfActive.father ? (
                        <button 
                          onClick={() => setSelectedMemberId(parentOfActive.father!.id)} 
                          className="text-left py-1 text-emerald-800 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          👨 Ayah: {parentOfActive.father.nama}
                        </button>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Data Ayah belum terhubung</span>
                      )}
                      {parentOfActive.mother ? (
                        <button 
                          onClick={() => setSelectedMemberId(parentOfActive.mother!.id)} 
                          className="text-left py-1 text-emerald-800 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          👩 Ibu: {parentOfActive.mother.nama}
                        </button>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Data Ibu belum terhubung</span>
                      )}
                    </div>
                  </div>

                  {/* Pasangan */}
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-150">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">Pasangan (Suami / Istri)</span>
                    {spouseOfActive ? (
                      <button 
                        onClick={() => setSelectedMemberId(spouseOfActive.id)} 
                        className="text-left py-1 text-rose-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        ❤️ {spouseOfActive.nama}
                      </button>
                    ) : (
                      <span className="text-slate-400 italic block py-1">Belum ada rujukan pasangan</span>
                    )}
                  </div>

                  {/* Saudara Kandung */}
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-150 sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">Saudara Kandung ({siblingsOfActive.length})</span>
                    {siblingsOfActive.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {siblingsOfActive.map(sib => (
                          <button 
                            key={sib.id}
                            onClick={() => setSelectedMemberId(sib.id)}
                            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold hover:border-emerald-500 transition cursor-pointer"
                          >
                            {sib.nama}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Tidak ada saudara kandung terdaftar</span>
                    )}
                  </div>

                  {/* Anak-Anak */}
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-150 sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">Anak / Keturunan ({childrenOfActive.length})</span>
                    {childrenOfActive.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {childrenOfActive.map(child => (
                          <button 
                            key={child.id}
                            onClick={() => setSelectedMemberId(child.id)}
                            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold hover:border-emerald-500 transition cursor-pointer"
                          >
                            👶 {child.nama}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Belum ada data keturunan langsung</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Administrator Controls Panel inside Detail Drawer popup */}
              {isWritable && (
                <div className="pt-4 border-t border-slate-150 space-y-2.5">
                  <p className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Aksi Administrasi Silsilah</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => {
                        setIsProfileModalOpen(false);
                        openEditForm();
                      }}
                      className="flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-705 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      <Edit3 className="h-4 w-4 text-slate-500" /> Edit Profil
                    </button>
                    <button 
                      onClick={() => {
                        setIsProfileModalOpen(false);
                        handleDeleteMember();
                      }}
                      className="flex items-center justify-center gap-1.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" /> Hapus Anggota
                    </button>
                    <button 
                      onClick={() => {
                        setIsProfileModalOpen(false);
                        openAddForm('spouse');
                      }}
                      className="flex items-center justify-center gap-1.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200/55 cursor-pointer"
                    >
                      + Pasangan
                    </button>
                    <button 
                      onClick={() => {
                        setIsProfileModalOpen(false);
                        openAddForm('child');
                      }}
                      className="flex items-center justify-center gap-1.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-semibold rounded-xl border border-indigo-200/55 cursor-pointer"
                    >
                      + Anak/Cucu
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tutup footer buttion */}
            <div className="border-t px-6 py-4 bg-slate-50 flex justify-end">
              <button 
                type="button" 
                onClick={() => setIsProfileModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs cursor-pointer transition shadow-sm"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {memberToDeleteId !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full border shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-full">
                <Trash2 className="h-8 w-8" />
              </div>
              <h3 className="font-display font-extrabold text-slate-800 text-lg">
                Konfirmasi Hapus Anggota
              </h3>
              <p className="text-xs text-slate-505 leading-relaxed font-sans">
                Apakah Anda yakin ingin menghapus{" "}
                <span className="font-bold text-slate-900">
                  "{anggota.find(m => m.id === memberToDeleteId)?.nama}"
                </span>{" "}
                dari silsilah keluarga? Hubungan pasangan dan anak-anak akan otomatis terputus.
              </p>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setMemberToDeleteId(null)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Tidak, Batal
              </button>
              <button
                onClick={() => executeDeleteMember(memberToDeleteId)}
                className="flex-1 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition shadow-sm shadow-rose-100 cursor-pointer"
              >
                Ya, Hapus Anggota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
