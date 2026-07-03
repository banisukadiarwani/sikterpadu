export type Role = 'Administrator' | 'Bendahara' | 'Anggota' | 'Guest';

export interface User {
  id: string;
  nama: string;
  email: string;
  passwordHash?: string;
  role: Role;
  status: 'Aktif' | 'Nonaktif';
}

export interface AnggotaKeluarga {
  id: string; // e.g. "A_1"
  nama: string;
  gender: 'Laki-laki' | 'Perempuan';
  tempatLahir: string;
  tanggalLahir: string; // YYYY-MM-DD
  ayahId: string; // id of father, or ""
  ibuId: string; // id of mother, or ""
  pasanganId: string; // id of spouse, or ""
  alamat: string;
  telepon: string;
  pekerjaan: string;
  foto: string; // image URL or base64
  statusHidup: 'Hidup' | 'Wafat';
  tanggalWafat?: string; // YYYY-MM-DD if wafat
}

export interface KasMasuk {
  id: string;
  tanggal: string; // YYYY-MM-DD
  kategori: string; // e.g., "Iuran Bulanan", "Sumbangan", "Sponsorship", "Lain-lain"
  sumber: string; // nama penyumbang / keluarga
  nominal: number;
  keterangan: string;
  bukti: string; // image URL or base64 or placeholder
}

export interface KasKeluar {
  id: string;
  tanggal: string; // YYYY-MM-DD
  kategori: string; // e.g., "Santunan", "Arisan", "Konsumsi", "Sewa Tempat", "Lain-lain"
  nominal: number;
  keterangan: string;
  bukti: string; // image URL or base64 or placeholder
}

export interface Agenda {
  id: string;
  namaAcara: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string; // HH:MM
  lokasi: string;
  deskripsi: string;
  penanggungJawab: string; // nama anggota
}

export interface PesertaAcara {
  id: string;
  agendaId: string;
  anggotaId: string;
  anggotaNama: string;
  statusHadir: 'Hadir' | 'Absen' | 'Ragu-ragu' | 'Belum RSVP';
}

export interface Galeri {
  id: string;
  agendaId: string;
  agendaNama: string;
  judul: string;
  fileUrl: string;
  fileType: 'image' | 'video';
  uploader: string;
  tanggalUpload: string; // YYYY-MM-DD
}

export interface DocumentRecord {
  id: string;
  namaDokumen: string;
  kategori: 'Laporan Keuangan' | 'Notulen Semenjak' | 'Undangan' | 'Surat Keputusan' | 'Buku Silsilah' | 'Lainnya';
  fileUrl: string;
  uploader: string;
  tanggalUpload: string; // YYYY-MM-DD
}

export interface CustomMilestone {
  id: string;
  tanggal: string; // YYYY-MM-DD
  tipe: 'Pernikahan' | 'Pindah Rumah' | 'Beli Rumah' | 'Milestone' | 'Lainnya';
  judul: string;
  deskripsi: string;
}

export interface SIKTState {
  users: User[];
  anggota: AnggotaKeluarga[];
  kasMasuk: KasMasuk[];
  kasKeluar: KasKeluar[];
  agenda: Agenda[];
  pesertaAcara: PesertaAcara[];
  galeri: Galeri[];
  dokumen: DocumentRecord[];
  customMilestones?: CustomMilestone[];
  deletedMilestoneIds?: string[];
  customAlbums?: { id: string; nama: string; tipe: 'acara' | 'tahun' | 'lainnya' }[];
  
  // App Config
  currentUser: User | null;
  appsScriptUrl: string;
  googleDriveFolderId: string;
}
