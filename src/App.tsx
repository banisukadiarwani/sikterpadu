import React, { useState, useEffect } from 'react';
import { SIKTState, User } from './types';
import { getLocalState, saveLocalState, pullFromGoogleSheets, pushToGoogleSheets, GUEST_USER } from './services/api';
import Dashboard from './components/Dashboard';
import FamilyTree from './components/FamilyTree';
import KasKeluarga from './components/KasKeluarga';
import KalenderKeluarga from './components/KalenderKeluarga';
import GaleriKeluarga from './components/GaleriKeluarga';
import ArsipDokumen from './components/ArsipDokumen';
import Settings from './components/Settings';
import Login from './components/Login';
import { 
  Home, Users, Landmark, Calendar, Image as ImageIcon, 
  Archive, Settings as SettingsIcon, CloudLightning, RefreshCw, 
  Sparkles, CheckCircle2, AlertTriangle, ShieldAlert,
  Menu, X, Shield, ShieldCheck, LogIn, LogOut
} from 'lucide-react';

export default function App() {
  const [state, setState] = useState<SIKTState>(getLocalState);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Database status indicator state: cloud | cache | dummy
  const [dbStatus, setDbStatus] = useState<'cloud' | 'cache' | 'dummy'>(() => {
    const hasCache = !!localStorage.getItem('sikt_app_state');
    return hasCache ? 'cache' : 'dummy';
  });
  
  // Route Guard: Guest cannot access admin page (settings)
  useEffect(() => {
    if (state.currentUser?.role === 'Guest' && activeTab === 'settings') {
      setActiveTab('dashboard');
    }
  }, [state.currentUser, activeTab]);

  // Sync Status helpers
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Auto-load Google Sheets data on startup (Requirement 3, 4, 7)
  useEffect(() => {
    const autoLoad = async () => {
      const envUrl = ((import.meta as any).env.VITE_APPS_SCRIPT_URL || '').trim();
      if (!envUrl) {
        const hasCache = !!localStorage.getItem('sikt_app_state');
        setDbStatus(hasCache ? 'cache' : 'dummy');
        return;
      }

      setIsSyncing(true);
      setSyncStatus('Memuat data terbaru dari Google Sheets...');
      
      const res = await pullFromGoogleSheets(envUrl);
      if (res.success && res.data) {
        const liveData = res.data;
        const updatedState: SIKTState = {
          ...state,
          users: liveData.users && liveData.users.length > 0 ? liveData.users : state.users,
          anggota: liveData.anggota && liveData.anggota.length > 0 ? liveData.anggota : state.anggota,
          kasMasuk: liveData.kasMasuk && liveData.kasMasuk.length > 0 ? liveData.kasMasuk : state.kasMasuk,
          kasKeluar: liveData.kasKeluar && liveData.kasKeluar.length > 0 ? liveData.kasKeluar : state.kasKeluar,
          agenda: liveData.agenda && liveData.agenda.length > 0 ? liveData.agenda : state.agenda,
          pesertaAcara: liveData.pesertaAcara && liveData.pesertaAcara.length > 0 ? liveData.pesertaAcara : state.pesertaAcara,
          galeri: liveData.galeri && liveData.galeri.length > 0 ? liveData.galeri : state.galeri,
          dokumen: liveData.dokumen && liveData.dokumen.length > 0 ? liveData.dokumen : state.dokumen,
          appsScriptUrl: envUrl,
        };
        
        setState(updatedState);
        saveLocalState(updatedState);
        setDbStatus('cloud');
        setSyncStatus('✓ Berhasil memuat data dari Google Sheets!');
      } else {
        const hasCache = !!localStorage.getItem('sikt_app_state');
        setDbStatus(hasCache ? 'cache' : 'dummy');
        setSyncStatus(`⚠️ Gagal memuat data Cloud. Menggunakan ${hasCache ? 'Cache Lokal' : 'Data Dummy'}.`);
      }
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 4000);
    };

    autoLoad();
  }, []);

  // Background sync handler: pushes to Sheets, then automatically pulls back to ensure alignment (Requirement 6)
  const triggerBackgroundSync = async (newState: SIKTState) => {
    if (!newState.appsScriptUrl) return;
    setIsSyncing(true);
    setSyncStatus('Sinkronisasi Cloud otomatis...');
    try {
      const res = await pushToGoogleSheets(newState.appsScriptUrl, newState);
      if (res.success) {
        setSyncStatus('✓ Data terkirim. Menyinkronkan ulang data (pull)...');
        // Automatically pull from sheets right after pushing (Requirement 6)
        const pullRes = await pullFromGoogleSheets(newState.appsScriptUrl);
        if (pullRes.success && pullRes.data) {
          const liveData = pullRes.data;
          const mergedState: SIKTState = {
            ...newState,
            users: liveData.users && liveData.users.length > 0 ? liveData.users : newState.users,
            anggota: liveData.anggota && liveData.anggota.length > 0 ? liveData.anggota : newState.anggota,
            kasMasuk: liveData.kasMasuk && liveData.kasMasuk.length > 0 ? liveData.kasMasuk : newState.kasMasuk,
            kasKeluar: liveData.kasKeluar && liveData.kasKeluar.length > 0 ? liveData.kasKeluar : newState.kasKeluar,
            agenda: liveData.agenda && liveData.agenda.length > 0 ? liveData.agenda : newState.agenda,
            pesertaAcara: liveData.pesertaAcara && liveData.pesertaAcara.length > 0 ? liveData.pesertaAcara : newState.pesertaAcara,
            galeri: liveData.galeri && liveData.galeri.length > 0 ? liveData.galeri : newState.galeri,
            dokumen: liveData.dokumen && liveData.dokumen.length > 0 ? liveData.dokumen : newState.dokumen,
          };
          setState(mergedState);
          saveLocalState(mergedState);
          setDbStatus('cloud');
          setSyncStatus('✓ Sinkronisasi cloud berhasil dilakukan secara otomatis!');
        } else {
          setDbStatus('cloud');
          setSyncStatus('✓ Data terkirim ke Google Sheets.');
        }
      } else {
        setSyncStatus(`⚠️ Auto-sync gagal: ${res.message}`);
      }
    } catch (err: any) {
      console.error('Background auto-sync failed:', err);
      setSyncStatus('⚠️ Gagal terhubung ke Cloud.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        setSyncStatus(null);
      }, 4000);
    }
  };

  // Hook to handle updating state and persisting to localStorage instantly!
  const updateState = (newState: SIKTState, skipSync = false) => {
    setState(newState);
    saveLocalState(newState);
    
    // Check if any actual record lists changed (this is what is stored on the spreadsheet)
    const hasDataChanged = 
      newState.anggota !== state.anggota ||
      newState.kasMasuk !== state.kasMasuk ||
      newState.kasKeluar !== state.kasKeluar ||
      newState.agenda !== state.agenda ||
      newState.pesertaAcara !== state.pesertaAcara ||
      newState.galeri !== state.galeri ||
      newState.dokumen !== state.dokumen ||
      newState.users !== state.users;

    // Auto-trigger sync if Apps Script URL is set and sync is not skipped, not running, and data has actually mutated
    if (newState.appsScriptUrl && !skipSync && !isSyncing && hasDataChanged) {
      triggerBackgroundSync(newState);
    }
  };

  // Sync manual loaders (PULL)
  const handleManualSyncPull = async () => {
    if (!state.appsScriptUrl) return;
    setIsSyncing(true);
    setSyncStatus('Sedang menarik seluruh data dari Google Sheets...');

    const res = await pullFromGoogleSheets(state.appsScriptUrl);
    if (res.success && res.data) {
      const liveData = res.data;
      const updatedState: SIKTState = {
        ...state,
        users: liveData.users && liveData.users.length > 0 ? liveData.users : state.users,
        anggota: liveData.anggota && liveData.anggota.length > 0 ? liveData.anggota : state.anggota,
        kasMasuk: liveData.kasMasuk && liveData.kasMasuk.length > 0 ? liveData.kasMasuk : state.kasMasuk,
        kasKeluar: liveData.kasKeluar && liveData.kasKeluar.length > 0 ? liveData.kasKeluar : state.kasKeluar,
        agenda: liveData.agenda && liveData.agenda.length > 0 ? liveData.agenda : state.agenda,
        pesertaAcara: liveData.pesertaAcara && liveData.pesertaAcara.length > 0 ? liveData.pesertaAcara : state.pesertaAcara,
        galeri: liveData.galeri && liveData.galeri.length > 0 ? liveData.galeri : state.galeri,
        dokumen: liveData.dokumen && liveData.dokumen.length > 0 ? liveData.dokumen : state.dokumen,
      };
      
      updateState(updatedState, true);
      setDbStatus('cloud');
      setSyncStatus('✓ Berhasil! SIKT tersinkron data paling mutakhir dari Google Sheets.');
    } else {
      setSyncStatus(`❌ Gagal tarik: ${res.message}`);
    }
    setIsSyncing(false);
    setTimeout(() => setSyncStatus(null), 4000);
  };

  // Sync manual loaders (PUSH)
  const handleManualSyncPush = async () => {
    if (!state.appsScriptUrl) return;
    setIsSyncing(true);
    setSyncStatus('Sedang mendorong pencatatan lokal SIKT ke Google Sheets...');

    const res = await pushToGoogleSheets(state.appsScriptUrl, state);
    if (res.success) {
      if (res.data) {
        const liveData = res.data;
        const mergedState: SIKTState = {
          ...state,
          users: liveData.users && liveData.users.length > 0 ? liveData.users : state.users,
          anggota: liveData.anggota && liveData.anggota.length > 0 ? liveData.anggota : state.anggota,
          kasMasuk: liveData.kasMasuk && liveData.kasMasuk.length > 0 ? liveData.kasMasuk : state.kasMasuk,
          kasKeluar: liveData.kasKeluar && liveData.kasKeluar.length > 0 ? liveData.kasKeluar : state.kasKeluar,
          agenda: liveData.agenda && liveData.agenda.length > 0 ? liveData.agenda : state.agenda,
          pesertaAcara: liveData.pesertaAcara && liveData.pesertaAcara.length > 0 ? liveData.pesertaAcara : state.pesertaAcara,
          galeri: liveData.galeri && liveData.galeri.length > 0 ? liveData.galeri : state.galeri,
          dokumen: liveData.dokumen && liveData.dokumen.length > 0 ? liveData.dokumen : state.dokumen,
        };
        setState(mergedState);
        saveLocalState(mergedState);
        setDbStatus('cloud');
        setSyncStatus('✓ Berhasil Mendorong! Google Sheets diperbarui dan foto/dokumen tersimpan di Google Drive.');
      } else {
        setDbStatus('cloud');
        setSyncStatus('✓ Berhasil Mendorong! Google Sheets diperbarui dengan mutasi lokal.');
      }
    } else {
      setSyncStatus(`❌ Gagal dorong: ${res.message}`);
    }
    setIsSyncing(false);
    setTimeout(() => setSyncStatus(null), 4000);
  };

  // Helper to DRY sidebar contents for both desktop and mobile layouts
  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col justify-between h-full select-none">
      <div className="flex flex-col flex-1 overflow-y-auto">
        
        {/* Logo Header Branded */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-600 rounded-xl text-white font-black tracking-widest text-base shadow-sm">SIKT</span>
            <div>
              <h1 className="font-extrabold text-slate-100 text-sm tracking-tight leading-none">SIK Terpadu</h1>
              <p className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase mt-1">Keluarga Sukadi Arwani</p>
            </div>
          </div>
          {isMobile && (
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition border border-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Database Status Indicator Overlay (Requirement 8) */}
        <div className="mx-4 mt-4 p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center gap-2 text-[11px]">
          {dbStatus === 'cloud' && (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span className="text-emerald-300 font-bold flex-1 truncate">🟢 Database Cloud Aktif</span>
              {state.currentUser?.role === 'Administrator' && (
                <button 
                  onClick={handleManualSyncPull}
                  disabled={isSyncing}
                  className="p-1 hover:bg-slate-850 rounded transition cursor-pointer shrink-0"
                  title="Sinkron ulang data dari cloud"
                >
                  <RefreshCw className={`h-3 w-3 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
              )}
            </>
          )}
          {dbStatus === 'cache' && (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0"></span>
              <span className="text-amber-400 font-bold flex-1 truncate">🟡 Cache Lokal</span>
              {state.currentUser?.role === 'Administrator' && (
                <button 
                  onClick={handleManualSyncPull}
                  disabled={isSyncing}
                  className="p-1 hover:bg-slate-850 rounded transition cursor-pointer shrink-0"
                  title="Tarik ulang data cloud"
                >
                  <RefreshCw className={`h-3 w-3 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
              )}
            </>
          )}
          {dbStatus === 'dummy' && (
            <>
              <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0"></span>
              <span className="text-rose-400 font-bold flex-1 truncate">🔴 Data Dummy</span>
            </>
          )}
        </div>

        {/* Nav groups clickable links */}
        <nav className="p-4 space-y-1">
          
          {/* Dashboard Button */}
          <button
            onClick={() => {
              setActiveTab('dashboard');
              if (isMobile) setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950' : 'hover:bg-slate-850 hover:text-slate-100 text-slate-400'}`}
          >
            <Home className="h-4.5 w-4.5" /> Beranda Dashboard
          </button>

          {/* Silsilah Button */}
          <button
            onClick={() => {
              setActiveTab('silsilah');
              if (isMobile) setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'silsilah' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950' : 'hover:bg-slate-850 hover:text-slate-100 text-slate-400'}`}
          >
            <Users className="h-4.5 w-4.5" /> Silsilah Keluarga
          </button>

          {/* Kas Button */}
          <button
            onClick={() => {
              setActiveTab('kas');
              if (isMobile) setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'kas' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950' : 'hover:bg-slate-850 hover:text-slate-100 text-slate-400'}`}
          >
            <Landmark className="h-4.5 w-4.5" /> Keuangan Buku Kas
          </button>

          {/* Agenda Button */}
          <button
            onClick={() => {
              setActiveTab('agenda');
              if (isMobile) setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'agenda' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950' : 'hover:bg-slate-850 hover:text-slate-100 text-slate-400'}`}
          >
            <Calendar className="h-4.5 w-4.5" /> Agenda Acara
          </button>

          {/* Galeri Button */}
          <button
            onClick={() => {
              setActiveTab('galeri');
              if (isMobile) setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'galeri' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950' : 'hover:bg-slate-850 hover:text-slate-100 text-slate-400'}`}
          >
            <ImageIcon className="h-4.5 w-4.5" /> Album Galeri
          </button>

          {/* Dokumen Button */}
          <button
            onClick={() => {
              setActiveTab('dokumen');
              if (isMobile) setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'dokumen' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950' : 'hover:bg-slate-850 hover:text-slate-100 text-slate-400'}`}
          >
            <Archive className="h-4.5 w-4.5" /> Arsip Dokumen
          </button>

          {/* Settings Button */}
          {state.currentUser?.role === 'Administrator' && (
            <button
              onClick={() => {
                setActiveTab('settings');
                if (isMobile) setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'settings' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950' : 'hover:bg-slate-850 hover:text-slate-100 text-slate-400'}`}
            >
              <SettingsIcon className="h-4.5 w-4.5" /> Integrasi & Setup
            </button>
          )}

        </nav>
      </div>

      {/* User context profile panel at bottom side */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-2">
        <div className="flex items-center gap-2.5">
          <span className="p-1 rounded bg-indigo-950 text-indigo-400 font-bold text-[9px] tracking-wider uppercase shrink-0">
            {state.currentUser?.role === 'Administrator' ? 'ADM' : 'GUEST'}
          </span>
          <div className="truncate">
            <p className="text-xs font-black text-slate-100 truncate">{state.currentUser?.nama || 'Tamu Keluarga'}</p>
            <p className="text-[10px] text-slate-500 font-mono truncate">{state.currentUser?.email || 'guest@keluarga.com'}</p>
          </div>
        </div>
        
        {state.currentUser?.role === 'Guest' ? (
          <button 
            onClick={() => {
              setShowLogin(true);
              if (isMobile) setMobileMenuOpen(false);
            }}
            className="w-full py-1.5 bg-emerald-900 hover:bg-emerald-800 border border-emerald-850 rounded-xl text-[10px] font-bold text-emerald-200 hover:text-emerald-100 transition text-center flex items-center justify-center gap-1.5 cursor-pointer"
            title="Masuk sebagai Administrator"
          >
            <LogIn className="h-3.5 w-3.5" /> Login Administrator
          </button>
        ) : (
          <button 
            onClick={() => {
              updateState({
                ...state,
                currentUser: GUEST_USER
              });
              if (isMobile) setMobileMenuOpen(false);
              setActiveTab('dashboard');
            }}
            className="w-full py-1.5 bg-red-950 hover:bg-red-900 border border-red-900/30 rounded-xl text-[10px] font-bold text-red-300 hover:text-red-200 transition text-center flex items-center justify-center gap-1.5 cursor-pointer"
            title="Keluar dari sesi Administrator"
          >
            <LogOut className="h-3.5 w-3.5" /> Keluar Admin (Logout)
          </button>
        )}
      </div>
    </div>
  );

  // If showLogin is true, show the login page
  if (showLogin) {
    return (
      <Login 
        state={state} 
        onLogin={(user) => {
          updateState({
            ...state,
            currentUser: user
          });
          setShowLogin(false);
          setActiveTab('dashboard');
        }} 
        onCancel={() => {
          setShowLogin(false);
        }}
      />
    );
  }

  // If no user is authenticated, force presentation of the fully loaded multi-login page
  if (!state.currentUser) {
    return (
      <Login 
        state={state} 
        onLogin={(user) => {
          updateState({
            ...state,
            currentUser: user
          });
          setActiveTab('dashboard');
        }} 
        onCancel={() => {
          updateState({
            ...state,
            currentUser: GUEST_USER
          });
        }}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans antialiased relative">
      
      {/* A. MOBILE NAVIGATION DRAWER OVERLAY */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex no-print">
          {/* Touch-to-dismiss semi-translucent background backdrop */}
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
          />
          {/* Slidout Menu Drawer */}
          <aside className="relative flex flex-col w-64 max-w-xs bg-slate-900 h-full text-slate-300 shadow-xl border-r border-slate-800 animate-in slide-in-from-left duration-250 ease-out z-10">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* B. FIXED LEFT NAVIGATION SIDEBAR RAIL (DESKTOP ONLY) */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col justify-between shrink-0 h-full text-slate-300 no-print">
        {renderSidebarContent(false)}
      </aside>

      {/* C. RIGHT MAIN BODY AND CANVAS PANEL */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Main top bar summary header */}
        <header className="h-16 border-b border-slate-100 bg-white shadow-3xs flex items-center justify-between px-4 md:px-6 shrink-0 relative z-10 no-print">
          <div className="flex items-center gap-1">
            {/* Hamburger Mobile Menu Trigger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition mr-1 border border-slate-100"
              title="Menu Navigasi"
            >
              <Menu className="h-5 w-5" />
            </button>

            <h2 className="text-xs md:text-sm font-extrabold text-slate-850 uppercase tracking-widest truncate max-w-[200px] md:max-w-none">
              {activeTab === 'dashboard' && 'Beranda SIKT'}
              {activeTab === 'silsilah' && 'Visual Silsilah Keluarga'}
              {activeTab === 'kas' && 'Pencatatan & Laporan Kas'}
              {activeTab === 'agenda' && 'Kalender & Agenda Acara'}
              {activeTab === 'galeri' && 'Kenangan & Galeri Acara'}
              {activeTab === 'dokumen' && 'Arsip Berkas Digital'}
              {activeTab === 'settings' && 'Pengaturan Setup & Hak Akses'}
            </h2>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {/* Database status badge on header */}
            {dbStatus === 'cloud' && (
              <div className="flex items-center gap-1 p-1 px-2 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] text-emerald-750 font-extrabold shrink-0" title="Koneksi Google Sheet Aktif">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>🟢 Cloud</span>
              </div>
            )}
            {dbStatus === 'cache' && (
              <div className="flex items-center gap-1 p-1 px-2 bg-amber-50 border border-amber-100 rounded-xl text-[10px] text-amber-700 font-extrabold shrink-0" title="Menggunakan data offline tersimpan">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                <span>🟡 Cache</span>
              </div>
            )}
            {dbStatus === 'dummy' && (
              <div className="flex items-center gap-1 p-1 px-2 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-700 font-extrabold shrink-0" title="Tidak terkoneksi Google Sheet atau Cache">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                <span>🔴 Dummy</span>
              </div>
            )}

            {state.currentUser?.role === 'Guest' ? (
              <div className="flex items-center gap-1.5 p-1 px-3 bg-slate-150/80 border border-slate-200 rounded-xl text-[10px] md:text-xs">
                <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                <span className="font-extrabold text-slate-700 uppercase">Mode Tamu</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 p-1 px-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] md:text-xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-extrabold text-emerald-800 uppercase">Admin</span>
                </div>
                <button
                  onClick={() => {
                    updateState({
                      ...state,
                      currentUser: GUEST_USER
                    });
                    setActiveTab('dashboard');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-750 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" /> Keluar
                </button>
              </>
            )}

            <div className="hidden md:flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-slate-500 font-mono bg-slate-50 border p-1 px-2.5 rounded-xl">
              <span>🕒 UTC:</span>
              <span className="text-slate-700 font-bold block truncate">
                2026-06-15, 08:08
              </span>
            </div>
          </div>
        </header>

        {/* Tab components display switcher container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
          {activeTab === 'dashboard' && <Dashboard state={state} onUpdateState={updateState} setActiveTab={setActiveTab} onShowLogin={() => setShowLogin(true)} />}
          {activeTab === 'silsilah' && <FamilyTree state={state} onUpdateState={updateState} />}
          {activeTab === 'kas' && <KasKeluarga state={state} onUpdateState={updateState} />}
          {activeTab === 'agenda' && <KalenderKeluarga state={state} onUpdateState={updateState} />}
          {activeTab === 'galeri' && <GaleriKeluarga state={state} onUpdateState={updateState} />}
          {activeTab === 'dokumen' && <ArsipDokumen state={state} onUpdateState={updateState} />}
          {activeTab === 'settings' && (
            <Settings 
              state={state} 
              onUpdateState={updateState} 
              triggerManualSyncPull={handleManualSyncPull}
              triggerManualSyncPush={handleManualSyncPush}
              isSyncing={isSyncing}
              syncStatus={syncStatus}
            />
          )}
        </div>
      </main>

    </div>
  );
}
