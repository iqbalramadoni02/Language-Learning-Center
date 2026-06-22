export interface Siswa {
  nis: string;
  nama: string;
  kelas: string;
  email: string;
  mapelPilihan: string[];
  password?: string;
}

export interface Guru {
  nama: string;
  email: string;
  mapelList: string[];
  password?: string;
}

export interface Materi {
  id?: string;
  kelas: string;
  mapel: string;
  semester: string;
  judul: string;
  tipe: string;
  desc: string;
  link?: string;
}

export interface Tugas {
  id: string;
  kelas: string;
  mapel: string;
  semester: string;
  unitSilabus?: string;
  judul: string;
  deadline: string;
  isQuiz: boolean | string;
  tipe: string;
  desc: string;
  link?: string;
  gform?: string;
  soalList?: string | QuizQuestion[];
}

export interface QuizQuestion {
  pertanyaan: string;
  pilihan: string[];
  jawabanBenarIndex: number;
  poin: number;
}

export interface Nilai {
  nisn: string;
  nama: string;
  kelas: string;
  mapel: string;
  semester: string;
  tugasId: string;
  link?: string;
  nilai: string | number; // sometimes API returns as 'nilai' or 'nilaiFinal'
  nilaiFinal?: string | number;
  nilaiAI?: string | number;
  reviewAI?: string;
  starWaktu: string | number;
  starKualitas: string | number;
  tuntas?: boolean;
}

export interface Presensi {
  nisn: string;
  nama: string;
  kelas: string;
  mapel: string;
  semester: string;
  tanggal: string;
  status: "Hadir" | "Sakit" | "Izin" | "Alpa" | string;
  starKehadiran: string | number;
  jarakMeter?: string | number;
}

export interface PresensiUmum {
  nisn: string;
  nama: string;
  kelas: string;
  status: string;
}

export interface SilabusUnit {
  nomorUnit: number | string;
  judulUnit: string;
  pokokBahasan: string;
  kelompokUH?: "1" | "2" | "3" | string;
  jenisPenilaian?: "latihan" | "quiz" | "tugas" | "proyek" | "UH/daily test" | string;
}

export interface RaportSiswa {
  nisn: string;
  nama: string;
  uh1: string | number;
  uh2: string | number;
  uh3: string | number;
  pts: string | number;
  pat: string | number;
  remedialPts?: string | number;
  remedialPat?: string | number;
  persenKehadiran: number;
  nilaiRaport: string | number;
  tuntas: boolean;
  capaianPembelajaran?: string;
  deskripsi?: string;
}

export interface Jadwal {
  id: string;
  hari: string;
  jamMulai: string;
  jamSelesai: string;
  kelas: string;
  mapel: string;
  guru: string;
}
