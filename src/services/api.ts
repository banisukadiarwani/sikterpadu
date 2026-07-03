import { SIKTState, User, AnggotaKeluarga, KasMasuk, KasKeluar, Agenda, PesertaAcara, Galeri, DocumentRecord } from '../types';
import {
  SEED_USERS,
  SEED_ANGGOTA,
  SEED_KAS_MASUK,
  SEED_KAS_KELUAR,
  SEED_AGENDA,
  SEED_PESERTA,
  SEED_GALERI,
  SEED_DOKUMEN
} from './mockData';

const LOCAL_STORAGE_KEY = 'sikt_app_state';

export const GUEST_USER: User = {
  id: 'guest',
  nama: 'Tamu (Guest)',
  email: 'guest@keluarga.com',
  role: 'Guest',
  status: 'Aktif'
};

// Initial default state
const initialDefaultState: SIKTState = {
  users: SEED_USERS,
  anggota: SEED_ANGGOTA,
  kasMasuk: SEED_KAS_MASUK,
  kasKeluar: SEED_KAS_KELUAR,
  agenda: SEED_AGENDA,
  pesertaAcara: SEED_PESERTA,
  galeri: SEED_GALERI,
  dokumen: SEED_DOKUMEN,
  currentUser: GUEST_USER, // Guest is default
  appsScriptUrl: ((import.meta as any).env.VITE_APPS_SCRIPT_URL || '').trim(),
  googleDriveFolderId: '',
};

export function getLocalState(): SIKTState {
  const envUrl = ((import.meta as any).env.VITE_APPS_SCRIPT_URL || '').trim();
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Remove appsScriptUrl so we never use or rely on the one from localStorage
      delete parsed.appsScriptUrl;
      return {
        ...initialDefaultState,
        ...parsed,
        appsScriptUrl: envUrl,
        currentUser: parsed.currentUser !== undefined ? parsed.currentUser : initialDefaultState.currentUser,
      };
    }
  } catch (e) {
    console.error('Failed to parse state from localStorage, falling back to seed.', e);
  }
  return {
    ...initialDefaultState,
    appsScriptUrl: envUrl,
  };
}

export function saveLocalState(state: SIKTState) {
  try {
    const stateToSave = { ...state };
    delete stateToSave.appsScriptUrl;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (e) {
    console.error('Failed to save state to localStorage', e);
  }
}

/**
 * Fetch and upload client utilities for Google Apps Script Web App
 */
export async function testAppsScriptConnection(url: string): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      return { success: false, message: 'URL tidak boleh kosong.' };
    }
    
    // Call Apps Script with action=test
    const endpoint = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}action=test`;
    
    // We do a brief fetch using a timeout or standard params
    const response = await fetch(endpoint, {
      method: 'GET',
      mode: 'cors',
    });
    
    if (!response.ok) {
      return { success: false, message: `Server mengembalikan status HTTP ${response.status}` };
    }
    
    const result = await response.json();
    if (result && result.success) {
      return { success: true, message: result.message || 'Koneksi Berhasil!' };
    }
    
    return { success: false, message: result.message || 'Gagal memverifikasi response format.' };
  } catch (error: any) {
    console.error('Apps Script Test connection failed:', error);
    
    const isFailedToFetch = error.message && (
      error.message.toLowerCase().includes('failed to fetch') || 
      error.message.toLowerCase().includes('networkerror') ||
      error.message.toLowerCase().includes('fetch')
    );

    let verboseMessage = error.message || 'Error tidak dikenal.';
    
    if (isFailedToFetch) {
      verboseMessage = `Gagal melakukan koneksi (CORS / Failed to Fetch). Hal ini biasanya terjadi karena beberapa penyebab berikut:

1. 🔑 **ID SPREADSHEET BELUM DIGANTI**: Pada kode Apps Script Anda di baris ke-17, pastikan Anda telah mengganti text "MASUKKAN_ID_SPREADSHEET_ANDA_DISINI" dengan ID Google Sheet Anda yang sebenarnya.
2. 🔄 **BELUM MENDEPLOY VERSI BARU**: Setiap kali Anda mengedit kode di Google Apps Script editor, Anda harus membuat versi baru: Klik tombol **Deploy** di kanan atas -> Pilih **Manage Deployments** -> Klik ikon **pencil/edit** -> Pada bagian "Version", pilih **New Version** -> Klik **Deploy**. (Jika hanya menekan tombol Save, Web App yang diakses tetap menggunakan versi lama).
3. 🔓 **AKSES DEPLOYMENT SALAH**: Pastikan setelan **"Who has access"** diatur ke **"Anyone"** (Siapa saja, termasuk anonim). Jika diatur ke "Myself" atau "Anyone with Google Account", browser akan memblokir karena membutuhkan otentikasi.
4. 📂 **BELUM MEMBERIKAN IZIN (AUTHORIZE)**: Di Google Apps Script editor, klik tombol **Run** sekali (misalnya menjalankan fungsi doGet secara manual sekali). Ini akan memicu pop-up **Review Permissions**. Izinkan akun Google Anda untuk mengakses Spreadsheet & Drive.
5. 🔗 **URL SALAH**: Pastikan URL diakhiri dengan \`/exec\` (URL Web App hasil Deploy), bukan \`/edit\` (URL halaman editor skrip).`;
    }

    return {
      success: false,
      message: verboseMessage
    };
  }
}

export async function pullFromGoogleSheets(url: string): Promise<{ success: boolean; data?: any; message: string }> {
  try {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      return { success: false, message: 'URL Apps Script kosong.' };
    }

    const endpoint = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}action=readAll`;
    const response = await fetch(endpoint, {
      method: 'GET',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const result = await response.json();
    if (result && result.success && result.data) {
      return { success: true, data: result.data, message: 'Data berhasil ditarik dari Google Sheets!' };
    }
    
    return { success: false, message: result.message || 'Sinkronisasi gagal, format data tidak sesuai.' };
  } catch (error: any) {
    console.error('Failed pulling from sheets:', error);
    return { success: false, message: error.message || 'Koneksi gagal.' };
  }
}

export function getCleanDriveUrl(url: string | undefined): string {
  if (!url) return '';
  const cleanUrl = url.trim();
  if (cleanUrl.includes('drive.google.com')) {
    let fileId = '';
    
    // Pattern 1: uc?export=view&id=FILE_ID or uc?id=FILE_ID
    const idParam = cleanUrl.match(/[?&]id=([^&]+)/);
    if (idParam && idParam[1]) {
      fileId = idParam[1];
    } else {
      // Pattern 2: /file/d/FILE_ID/view or /file/d/FILE_ID
      const fileDMatch = cleanUrl.match(/\/file\/d\/([^/]+)/);
      if (fileDMatch && fileDMatch[1]) {
        fileId = fileDMatch[1];
      }
    }
    
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }
  return cleanUrl;
}

export async function pushToGoogleSheets(url: string, state: SIKTState): Promise<{ success: boolean; data?: any; message: string }> {
  try {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      return { success: false, message: 'URL Apps Script kosong.' };
    }

    const endpoint = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}action=writeAll`;
    
    // Post current state using CORS but text/plain Content-Type to avoid OPTIONS preflight
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain', // Simple content type, avoids CORS preflight OPTIONS request
      },
      body: JSON.stringify({
        users: state.users,
        anggota: state.anggota,
        kasMasuk: state.kasMasuk,
        kasKeluar: state.kasKeluar,
        agenda: state.agenda,
        pesertaAcara: state.pesertaAcara,
        galeri: state.galeri,
        dokumen: state.dokumen
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const result = await response.json();
    if (result && result.success) {
      return { 
        success: true, 
        data: result.data, 
        message: result.message || 'Data berhasil disinkronkan ke Google Sheets!' 
      };
    }
    
    return { 
      success: false, 
      message: result.message || 'Sinkronisasi gagal, format data tidak sesuai.' 
    };
  } catch (error: any) {
    console.error('Failed pushing to sheets:', error);
    return { success: false, message: error.message || 'Pengiriman gagal.' };
  }
}

/**
 * GENERATE GOOGLE APPS SCRIPT CODE FOR USER TO COPY
 */
export function getGoogleAppsScriptCode(): string {
  return `/**
 * GOOGLE APPS SCRIPT FOR SISTEM INFORMASI KELUARGA TERPADU (SIKT)
 * Deploy as a Web App: All requests must have access "Anyone".
 * Target Spreadsheet should contain sheets: "users", "anggota_keluarga", "kas_masuk", "kas_keluar", "agenda", "peserta_acara", "galeri", "dokumen"
 */

const SPREADSHEET_ID = "MASUKKAN_ID_SPREADSHEET_ANDA_DISINI";

function doGet(e) {
  // Cegah error saat dijalankan manual dari editor Apps Script (ketika 'e' undefined)
  if (!e || !e.parameter) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Apps Script SIKT aktif! Hubungi URL Web App ini dari aplikasi Anda dengan menyertakan parameter action (seperti action=test)."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const action = e.parameter.action;
  
  // Ambil Spreadsheet dengan penanganan error yang baik
  let sheet;
  try {
    if (!SPREADSHEET_ID || SPREADSHEET_ID === "MASUKKAN_ID_SPREADSHEET_ANDA_DISINI") {
      throw new Error("ID Spreadsheet belum diganti. Silakan ganti var SPREADSHEET_ID di bagian paling atas skrip dengan ID Spreadsheet Anda.");
    }
    sheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Gagal membuka database: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "test") {
    try {
      initAll(sheet);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Koneksi SIKT dengan Google Sheets Berhasil! Seluruh lembar sheets dan struktur folder Google Drive 'KELUARGA' telah berhasil diperiksa/dibuat secara otomatis!"
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Koneksi SIKT Berhasil! Namun otomatisasi pembuatan sheets/folder gagal: " + err.toString() + ". Pastikan Anda memberikan izin DriveApp dan SpreadsheetApp saat melakukan authorize di Google Apps Script."
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  if (action === "readAll") {
    try {
      const data = {
        users: getSheetData(sheet, "users"),
        anggota: getSheetData(sheet, "anggota_keluarga"),
        kasMasuk: getSheetData(sheet, "kas_masuk"),
        kasKeluar: getSheetData(sheet, "kas_keluar"),
        agenda: getSheetData(sheet, "agenda"),
        pesertaAcara: getSheetData(sheet, "peserta_acara"),
        galeri: getSheetData(sheet, "galeri"),
        dokumen: getSheetData(sheet, "dokumen")
      };
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: data
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: err.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    message: "Aksi tidak dikenal"
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  // Cegah error saat dijalankan manual dari editor Apps Script (ketika 'e' undefined)
  if (!e || !e.parameter) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Gunakan metode POST melalui aplikasi SIKT untuk menyinkronkan data."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const action = e.parameter.action;
  
  // Ambil Spreadsheet dengan penanganan error yang baik
  let sheet;
  try {
    if (!SPREADSHEET_ID || SPREADSHEET_ID === "MASUKKAN_ID_SPREADSHEET_ANDA_DISINI") {
      throw new Error("ID Spreadsheet belum diganti. Silakan ganti var SPREADSHEET_ID di bagian paling atas skrip dengan ID Spreadsheet Anda.");
    }
    sheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Gagal membuka database untuk sinkronisasi: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "writeAll") {
    try {
      const postData = JSON.parse(e.postData.contents);
      
      if (postData.users) updateSheetData(sheet, "users", postData.users);
      if (postData.anggota) updateSheetData(sheet, "anggota_keluarga", postData.anggota);
      if (postData.kasMasuk) updateSheetData(sheet, "kas_masuk", postData.kasMasuk);
      if (postData.kasKeluar) updateSheetData(sheet, "kas_keluar", postData.kasKeluar);
      if (postData.agenda) updateSheetData(sheet, "agenda", postData.agenda);
      if (postData.pesertaAcara) updateSheetData(sheet, "peserta_acara", postData.pesertaAcara);
      if (postData.galeri) updateSheetData(sheet, "galeri", postData.galeri);
      if (postData.dokumen) updateSheetData(sheet, "dokumen", postData.dokumen);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Seluruh data berhasil disinkronkan ke Google Sheets!",
        data: postData
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: err.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    message: "Aksi posting tidak dikenal"
  })).setMimeType(ContentService.MimeType.JSON);
}

// Global Help Functions
function getSheetData(ss, name) {
  const targetSheet = ss.getSheetByName(name);
  if (!targetSheet) return [];
  const rows = targetSheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  
  const headers = rows[0];
  const data = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const ob = {};
    for (let j = 0; j < headers.length; j++) {
      ob[headers[j]] = row[j];
    }
    data.push(ob);
  }
  return data;
}

function updateSheetData(ss, name, dataArr) {
  let targetSheet = ss.getSheetByName(name);
  if (!targetSheet) {
    targetSheet = ss.insertSheet(name);
  } else {
    targetSheet.clear();
  }
  
  if (dataArr.length === 0) return;
  
  // Create Headers
  const headers = Object.keys(dataArr[0]);
  targetSheet.appendRow(headers);
  
  // Format Data Rows
  const values = [];
  for (let i = 0; i < dataArr.length; i++) {
    const row = [];
    for (let j = 0; j < headers.length; j++) {
      let val = dataArr[i][headers[j]];
      
      // Deteksi Base64 Data URL untuk disimpan ke Google Drive secara otomatis
      if (typeof val === 'string' && val.indexOf('data:') === 0 && val.indexOf(';base64,') !== -1) {
        var folderPath = "KELUARGA";
        var fileExt = "png";
        
        var mimeTypePart = val.split(';')[0];
        if (mimeTypePart) {
          var subType = mimeTypePart.split('/')[1];
          if (subType) {
            fileExt = subType.split('+')[0];
          }
        }
        
        var itemId = dataArr[i].id || "file_" + new Date().getTime();
        var preferredName = name + "_" + itemId + "_" + Math.floor(Math.random() * 1000) + "." + fileExt;
        
        if (name === "anggota_keluarga") {
          folderPath = "KELUARGA/FOTO/PROFIL_SILSILAH";
        } else if (name === "galeri") {
          var fileType = dataArr[i].file_type || "image";
          if (fileType === "video") {
            folderPath = "KELUARGA/VIDEO";
          } else {
            folderPath = "KELUARGA/FOTO";
          }
        } else if (name === "dokumen") {
          folderPath = "KELUARGA/DOKUMEN";
        } else if (name === "kas_masuk" || name === "kas_keluar") {
          folderPath = "KELUARGA/KAS_BUKTI";
        }
        
        try {
          val = uploadBase64ToDrive(val, folderPath, preferredName);
          dataArr[i][headers[j]] = val;
        } catch (e) {
          Logger.log("Error upload file: " + e.toString());
        }
      }
      
      // Convert arrays or objects to JSON string
      if (typeof val === 'object' && val !== null) {
        val = JSON.stringify(val);
      }
      row.push(val === undefined ? "" : val);
    }
    values.push(row);
  }
  
  if (values.length > 0) {
    targetSheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }
}

function uploadBase64ToDrive(base64DataUrl, folderPath, preferredFileName) {
  try {
    var parts = base64DataUrl.split(';base64,');
    if (parts.length < 2) return base64DataUrl;
    
    var contentType = parts[0].substring(5);
    var base64Data = parts[1];
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, contentType, preferredFileName);
    
    var folder = getFolderByPath(folderPath);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return "https://lh3.googleusercontent.com/d/" + file.getId();
  } catch (err) {
    Logger.log("Gagal mengunggah ke Drive: " + err.toString());
    return base64DataUrl;
  }
}

function getFolderByPath(pathStr) {
  var parts = pathStr.split("/");
  var currentFolder = null;
  
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    if (!part) continue;
    
    var foldersIter;
    if (currentFolder === null) {
      foldersIter = DriveApp.getFoldersByName(part);
    } else {
      foldersIter = currentFolder.getFoldersByName(part);
    }
    
    if (foldersIter.hasNext()) {
      currentFolder = foldersIter.next();
    } else {
      if (currentFolder === null) {
        currentFolder = DriveApp.createFolder(part);
      } else {
        currentFolder = currentFolder.createFolder(part);
      }
    }
  }
  return currentFolder;
}

function initAll(ss) {
  // Jika ss tidak disediakan (misal dijalankan manual dari editor run dropdown)
  if (!ss) {
    try {
      if (SPREADSHEET_ID && SPREADSHEET_ID !== "MASUKKAN_ID_SPREADSHEET_ANDA_DISINI") {
        ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      } else {
        ss = SpreadsheetApp.getActiveSpreadsheet();
      }
    } catch(e) {
      // Fallback
    }
  }
  
  if (!ss) {
    throw new Error("Spreadsheet tidak teridentifikasi. Pastikan SPREADSHEET_ID di baris paling atas sudah diisi dengan benar.");
  }

  // 1. Create Sheets / Tabs if not exist with headers
  const sheetsConfig = {
    "users": ["id", "nama", "email", "password_hash", "role", "status"],
    "anggota_keluarga": ["id", "nama", "gender", "tempat_lahir", "tanggal_lahir", "ayah_id", "ibu_id", "pasangan_id", "alamat", "telepon", "pekerjaan", "foto", "statusHidup", "tanggalWafat"],
    "kas_masuk": ["id", "tanggal", "kategori", "sumber", "nominal", "keterangan", "bukti"],
    "kas_keluar": ["id", "tanggal", "kategori", "nominal", "keterangan", "bukti"],
    "agenda": ["id", "nama_acara", "tanggal", "lokasi", "deskripsi", "penanggung_jawab"],
    "peserta_acara": ["id", "agenda_id", "anggota_id", "status_hadir"],
    "galeri": ["id", "agenda_id", "judul", "file_url", "file_type", "uploader", "tanggal_upload"],
    "dokumen": ["id", "nama_dokumen", "kategori", "file_url", "uploader", "tanggal_upload"]
  };
  
  for (var sheetName in sheetsConfig) {
    var targetSheet = ss.getSheetByName(sheetName);
    if (!targetSheet) {
      targetSheet = ss.insertSheet(sheetName);
      targetSheet.appendRow(sheetsConfig[sheetName]);
    }
  }
  
  // Try to remove default "Sheet1" if it is empty
  var sheet1 = ss.getSheetByName("Sheet1");
  if (sheet1 && sheet1.getLastRow() === 0) {
    try {
      ss.deleteSheet(sheet1);
    } catch(e) {}
  }
  
  // 2. Setup Google Drive Folders
  try {
    var rootName = "KELUARGA";
    var rootFolder;
    var rootFoldersIter = DriveApp.getFoldersByName(rootName);
    if (rootFoldersIter.hasNext()) {
      rootFolder = rootFoldersIter.next();
    } else {
      rootFolder = DriveApp.createFolder(rootName);
    }
    
    var subfolders = [
      { name: "FOTO", sub: ["PROFIL_SILSILAH", "2026_BERKAS"] },
      { name: "KAS_BUKTI" },
      { name: "VIDEO" },
      { name: "DOKUMEN" }
    ];
    
    subfolders.forEach(function(sf) {
      var subFolder;
      var sFoldersIter = rootFolder.getFoldersByName(sf.name);
      if (sFoldersIter.hasNext()) {
        subFolder = sFoldersIter.next();
      } else {
        subFolder = rootFolder.createFolder(sf.name);
      }
      
      if (sf.sub) {
        sf.sub.forEach(function(nestedName) {
          var nFoldersIter = subFolder.getFoldersByName(nestedName);
          if (!nFoldersIter.hasNext()) {
            subFolder.createFolder(nestedName);
          }
        });
      }
    });
  } catch (driveErr) {
    Logger.log("Drive init error: " + driveErr.toString());
  }
}
`;
}
