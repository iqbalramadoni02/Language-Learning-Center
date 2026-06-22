import React, { useState, useEffect } from "react";
import { fetchFromProxy, runAiCheck, formatDate } from "../utils";

interface MassGradingModalProps {
  tugasId: string;
  onClose: () => void;
  onSavedSuccess: () => void;
}

export default function MassGradingModal({ tugasId, onClose, onSavedSuccess }: MassGradingModalProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [tugasInfo, setTugasInfo] = useState<any>(null);
  const [pengumpulList, setPengumpulList] = useState<any[]>([]);
  const [aiRowsLoading, setAiRowsLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadSubmissions();
  }, [tugasId]);

  const loadSubmissions = () => {
    setLoading(true);
    fetchFromProxy({ action: "getDaftarPengumpulTugas", tugasId: tugasId })
      .then((res) => {
        if (res.status === "success") {
          setTugasInfo(res.tugas);
          setPengumpulList(
            (res.pengumpul || []).map((p: any) => ({
              ...p,
              nilaiFinal: p.nilaiFinal || "",
              nilaiAI: p.nilaiAI || "",
              reviewAI: p.reviewAI || "",
              starKualitas: p.starKualitas !== undefined && p.starKualitas !== "" ? p.starKualitas : "",
              starWaktu: p.starWaktuRekomendasi !== undefined ? p.starWaktuRekomendasi : "5",
              sudahDinilai: !!p.sudahDinilai,
            }))
          );
        }
      })
      .catch((e) => console.error("Error loaded submission lists:", e))
      .finally(() => setLoading(false));
  };

  const handleRowFieldChange = (idx: number, field: string, val: any) => {
    setPengumpulList((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  // Row AI checker triggering express server google genai API
  const handleRowAiAutoCheck = (idx: number) => {
    const s = pengumpulList[idx];
    if (!s || !s.link) {
      alert("Ananda ini belum menyertakan berkas lampiran tautan Drive yang sah.");
      return;
    }

    setAiRowsLoading((prev) => ({ ...prev, [idx]: true }));
    runAiCheck(s.link, tIdMapelLabel(), tIdJudulLabel())
      .then((res) => {
        if (res.status === "success") {
          setPengumpulList((prev) => {
            const copy = [...prev];
            copy[idx] = {
              ...copy[idx],
              nilaiFinal: res.skorAI,
              nilaiAI: res.skorAI,
              reviewAI: res.catatanAI || "",
              starKualitas: res.skorAI >= 90 ? 10 : (res.skorAI >= 80 ? 8 : 6),
            };
            return copy;
          });
        } else {
          alert("Layanan AI mendeteksi kegagalan: " + res.message);
        }
      })
      .catch((e) => alert("Koneksi ke AI Gemini bermasalah: " + e.message))
      .finally(() => {
        setAiRowsLoading((prev) => ({ ...prev, [idx]: false }));
      });
  };

  const tIdMapelLabel = () => tugasInfo?.mapel || "Umum";
  const tIdJudulLabel = () => tugasInfo?.judul || "Tugas";

  // Commit individual student's row
  const handleSaveIndividualBaris = (idx: number) => {
    const s = pengumpulList[idx];
    if (s.nilaiFinal === "" || s.starKualitas === "") {
      alert("Mohon lengkapi Nilai Final dan Bintang Kualitas siswa terlebih dahulu.");
      return;
    }

    setLoading(true);
    fetchFromProxy({
      action: "inputNilai",
      nisn: s.nisn,
      nama: s.nama,
      kelas: tugasInfo.kelas,
      mapel: tugasInfo.mapel,
      semester: tugasInfo.semester,
      tugasId: tugasInfo.id,
      link: s.link,
      nilaiFinal: s.nilaiFinal,
      nilaiAI: s.nilaiAI,
      reviewAI: s.reviewAI,
      starWaktu: s.starWaktu,
      starKualitas: s.starKualitas,
    })
      .then((res) => {
        alert(res.message || "Bismillah, nilai baris ini tersimpan!");
        if (res.status === "success") {
          setPengumpulList((prev) => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], sudahDinilai: true };
            return copy;
          });
          onSavedSuccess();
        }
      })
      .catch((e) => alert("Koneksi gagal: " + e.message))
      .finally(() => setLoading(false));
  };

  // Commit the entire class in one packet
  const handleSaveAllBatch = () => {
    const entries = pengumpulList
      .filter((s) => s.nilaiFinal !== "" && s.nilaiFinal !== undefined)
      .map((s) => ({
        nisn: s.nisn,
        nama: s.nama,
        kelas: tugasInfo.kelas,
        mapel: tugasInfo.mapel,
        semester: tugasInfo.semester,
        tugasId: tugasInfo.id,
        link: s.link,
        nilaiFinal: s.nilaiFinal,
        nilaiAI: s.nilaiAI,
        reviewAI: s.reviewAI,
        starWaktu: s.starWaktu,
        starKualitas: s.starKualitas || 0,
      }));

    if (entries.length === 0) {
      alert("Belum ada baris nilai yang diinputkan. Silakan isi minimal satu siswa.");
      return;
    }

    setLoading(true);
    fetchFromProxy({
      action: "inputNilaiBatch",
      entries: entries,
    })
      .then((res) => {
        alert(res.message || "Bismillah, rekap massal nilai sekelas berhasil terekam!");
        onClose();
        onSavedSuccess();
      })
      .catch((e) => alert("Koneksi gagal: " + e.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-xl border border-slate-200 max-w-5xl w-full p-4 shadow-2xl flex flex-col max-h-[92vh]">
        
        <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-sans">👥 Nilai Sekelas (Mass Grading)</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tugas: <span className="font-bold text-slate-700">{tugasInfo ? `${tugasInfo.judul} (${tugasInfo.kelas} - ${tugasInfo.mapel})` : "Memuat..."}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-rose-500 font-bold p-1 text-lg leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1 space-y-3">
          <p className="text-[10px] text-slate-500 leading-normal bg-slate-50 border border-slate-200 p-2 rounded">
            💡 Panduan Harian: Isi nilai final dan parameter kualitas siswa satu per satu, atau trigger tombol "🤖 AI" untuk asisten koreksi otomatis dari Gemini. Klik tombol biru "Simpan Semua Nilai" di pojok kiri bawah modal untuk menyimpan seluruh kelas sekaligus.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold text-center border-b border-slate-200">
                  <th className="p-2 border border-slate-200">Siswa</th>
                  <th className="p-2 border border-slate-200 w-[140px]">Submit Waktu</th>
                  <th className="p-2 border border-slate-200 w-[100px]">Status</th>
                  <th className="p-2 border border-slate-200 w-[70px]">⭐ Waktu</th>
                  <th className="p-2 border border-slate-200 w-[70px]">⭐ Kualitas</th>
                  <th className="p-2 border border-slate-200 w-[80px]">Nilai Final</th>
                  <th className="p-2 border border-slate-200 w-[70px]">Koreksi AI</th>
                  <th className="p-2 border border-slate-200 w-[80px]">Masing-Masing</th>
                </tr>
              </thead>
              <tbody>
                {loading && pengumpulList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400 font-mono">⏳ Membaca daftar pengumpul kuis harian...</td>
                  </tr>
                ) : pengumpulList.length > 0 ? (
                  pengumpulList.map((p, idx) => {
                    const lateCls = p.statusWaktu === "Tepat Waktu"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : (p.statusWaktu === "Terlambat < 24 Jam" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200");
                    return (
                      <tr key={idx} className="hover:bg-slate-50 text-center border-b border-slate-100">
                        <td className="p-2 border border-slate-200 text-left">
                          <p className="font-bold text-slate-800 leading-tight">{p.nama}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{p.nisn}</span>
                          {p.sudahDinilai && (
                            <span className="ml-2 inline-block px-1 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold rounded">
                              Graded
                            </span>
                          )}
                        </td>
                        <td className="p-2 border border-slate-200 text-left font-mono text-[11px] text-slate-600">
                          {p.waktuSubmit ? formatDate(p.waktuSubmit) : "-"}
                          {p.link && (
                            <p className="mt-1">
                              <a 
                                href={p.link} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[10px] text-indigo-600 font-bold hover:underline"
                              >
                                📎 Lihat Berkas
                              </a>
                            </p>
                          )}
                        </td>
                        <td className="p-1 border border-slate-200">
                          <span className={`${lateCls} border px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap`}>
                            {p.statusWaktu}
                          </span>
                        </td>
                        <td className="p-1 border border-slate-200">
                          <input 
                            type="number"
                            min={0}
                            max={5}
                            className="w-full p-1 border border-slate-200 rounded text-center text-xs font-bold text-slate-800"
                            value={p.starWaktu}
                            onChange={(e) => handleRowFieldChange(idx, "starWaktu", e.target.value)}
                          />
                        </td>
                        <td className="p-1 border border-slate-200">
                          <input 
                            type="number"
                            min={0}
                            max={100}
                            className="w-full p-1 border border-slate-200 rounded text-center text-xs font-bold text-slate-800"
                            value={p.starKualitas}
                            placeholder="0-10"
                            onChange={(e) => handleRowFieldChange(idx, "starKualitas", e.target.value)}
                          />
                        </td>
                        <td className="p-1 border border-slate-200">
                          <input 
                            type="number"
                            min={0}
                            max={100}
                            className="w-full p-1 border border-slate-200 rounded text-center text-xs font-bold text-indigo-600 bg-slate-50/50"
                            value={p.nilaiFinal}
                            placeholder="0-100"
                            onChange={(e) => handleRowFieldChange(idx, "nilaiFinal", e.target.value)}
                          />
                        </td>
                        <td className="p-1.5 border border-slate-200">
                          <button 
                            className="w-full py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-[10px] cursor-pointer transition-colors shadow-sm"
                            onClick={() => handleRowAiAutoCheck(idx)}
                            disabled={aiRowsLoading[idx]}
                          >
                            {aiRowsLoading[idx] ? "⏳" : "🤖 AI"}
                          </button>
                        </td>
                        <td className="p-1.5 border border-slate-200">
                          <button 
                            className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] cursor-pointer transition-colors shadow-sm"
                            onClick={() => handleSaveIndividualBaris(idx)}
                          >
                            Simpan
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">Belum ada Ananda yang mengumpulkan tagihan tugas ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-2 pt-3 border-t border-slate-100 mt-2">
          <button 
            className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs transition duration-200 cursor-pointer shadow-sm"
            onClick={handleSaveAllBatch}
            disabled={loading}
          >
            💾 Simpan Semua Rekap Nilai Sekelas
          </button>
          <button 
            className="px-4 py-1.5 bg-slate-500 hover:bg-slate-600 text-white font-bold rounded text-xs transition duration-200 cursor-pointer"
            onClick={onClose}
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
