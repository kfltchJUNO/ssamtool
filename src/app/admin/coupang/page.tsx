"use client";

import { useEffect, useState } from "react";
import {
  getCoupangLinks, addCoupangLink, updateCoupangLink,
  deleteCoupangLink, seedCoupangLinks, type CoupangLink,
} from "@/lib/adLinks";

export default function AdminCoupangPage() {
  const [links,   setLinks]   = useState<CoupangLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ url: "", label: "", type: "regular" as "regular"|"event", expiresAt: "" });
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState("");

  const load = async () => {
    setLoading(true);
    try {
      await seedCoupangLinks(); // 최초 1회 기본값 시드
      setLinks(await getCoupangLinks());
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.url.trim() || !form.label.trim()) { setError("URL과 라벨을 입력해 주세요."); return; }
    if (form.type === "event" && !form.expiresAt) { setError("이벤트 종료일을 선택해 주세요."); return; }
    setBusy(true); setError("");
    try {
      await addCoupangLink({
        url:       form.url.trim(),
        label:     form.label.trim(),
        type:      form.type,
        expiresAt: form.type === "event" ? new Date(form.expiresAt).toISOString() : null,
        active:    true,
      });
      setForm({ url: "", label: "", type: "regular", expiresAt: "" });
      await load();
    } catch { setError("저장 중 오류가 발생했어요."); }
    finally { setBusy(false); }
  };

  const toggleActive = async (link: CoupangLink) => {
    await updateCoupangLink(link.id, { active: !link.active });
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("삭제할까요?")) return;
    await deleteCoupangLink(id);
    await load();
  };

  const regular = links.filter(l => l.type === "regular");
  const events  = links.filter(l => l.type === "event");

  const inputCls = "border border-[#E8E0D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332]";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-[#1B4332]">쿠팡 파트너스 관리</h1>
        <p className="text-sm text-[#9A9A9A] mt-1">링크 추가/삭제/활성화 관리</p>
      </div>

      {/* 추가 폼 */}
      <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm space-y-3">
        <h2 className="font-bold text-[#1B4332]">링크 추가</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-[#4A4A4A] block mb-1">URL</label>
            <input value={form.url} onChange={e => setForm(p => ({...p, url: e.target.value}))}
              placeholder="https://link.coupang.com/a/..." className={`w-full ${inputCls}`} />
          </div>
          <div>
            <label className="text-xs font-medium text-[#4A4A4A] block mb-1">라벨 (관리용)</label>
            <input value={form.label} onChange={e => setForm(p => ({...p, label: e.target.value}))}
              placeholder="예: 이름표 목걸이" className={`w-full ${inputCls}`} />
          </div>
        </div>
        <div className="flex gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-[#4A4A4A] block mb-1">유형</label>
            <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value as "regular"|"event"}))}
              className={inputCls}>
              <option value="regular">상시</option>
              <option value="event">이벤트</option>
            </select>
          </div>
          {form.type === "event" && (
            <div>
              <label className="text-xs font-medium text-[#4A4A4A] block mb-1">종료일</label>
              <input type="datetime-local" value={form.expiresAt}
                onChange={e => setForm(p => ({...p, expiresAt: e.target.value}))}
                className={inputCls} />
            </div>
          )}
          <button onClick={handleAdd} disabled={busy}
            className="px-5 py-2 bg-[#1B4332] text-white text-sm font-bold rounded-lg hover:bg-[#2D6A4F] disabled:opacity-40">
            + 추가
          </button>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      </div>

      {/* 상시 링크 */}
      <div className="bg-white rounded-xl border border-[#E8E0D0] shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E8E0D0] bg-[#F9F9F9]">
          <h2 className="font-bold text-[#1B4332]">상시 링크 ({regular.length}개)</h2>
        </div>
        <div className="divide-y divide-[#F0F0F0]">
          {loading ? (
            <div className="p-4 text-center text-[#9A9A9A] text-sm">불러오는 중...</div>
          ) : regular.map(link => (
            <div key={link.id} className="flex items-center gap-3 px-5 py-3">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${link.active ? "bg-green-500" : "bg-gray-300"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#2D2D2D]">{link.label}</p>
                <p className="text-[11px] text-[#9A9A9A] truncate">{link.url}</p>
              </div>
              <button onClick={() => toggleActive(link)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                  link.active ? "bg-[#F0FFF4] text-[#1B4332] hover:bg-[#D4EDDA]" : "bg-[#F0F0F0] text-[#9A9A9A] hover:bg-[#E0E0E0]"
                }`}>
                {link.active ? "활성" : "비활성"}
              </button>
              <button onClick={() => handleDelete(link.id)}
                className="text-[#CCC] hover:text-red-500 transition-colors text-sm px-1">🗑</button>
            </div>
          ))}
        </div>
      </div>

      {/* 이벤트 링크 */}
      <div className="bg-white rounded-xl border border-[#E8E0D0] shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E8E0D0] bg-[#FFF8E1]">
          <h2 className="font-bold text-[#F9A825]">이벤트 링크 ({events.length}개)</h2>
          <p className="text-xs text-[#9A9A9A] mt-0.5">종료일이 지나면 자동으로 앱에서 숨겨져요</p>
        </div>
        <div className="divide-y divide-[#F0F0F0]">
          {loading ? (
            <div className="p-4 text-center text-[#9A9A9A] text-sm">불러오는 중...</div>
          ) : events.map(link => {
            const expired = link.expiresAt ? new Date(link.expiresAt) < new Date() : false;
            return (
              <div key={link.id} className={`flex items-center gap-3 px-5 py-3 ${expired ? "opacity-50" : ""}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${expired ? "bg-gray-300" : link.active ? "bg-[#F9A825]" : "bg-gray-300"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#2D2D2D]">{link.label}</p>
                    {expired && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">만료</span>}
                  </div>
                  <p className="text-[11px] text-[#9A9A9A] truncate">{link.url}</p>
                  {link.expiresAt && (
                    <p className="text-[11px] text-[#F9A825]">
                      ~{new Date(link.expiresAt).toLocaleDateString("ko-KR")}
                    </p>
                  )}
                </div>
                <button onClick={() => toggleActive(link)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                    link.active && !expired ? "bg-[#FFF8E1] text-[#F9A825] hover:bg-[#FFF0C0]" : "bg-[#F0F0F0] text-[#9A9A9A]"
                  }`}>
                  {link.active && !expired ? "활성" : "비활성"}
                </button>
                <button onClick={() => handleDelete(link.id)}
                  className="text-[#CCC] hover:text-red-500 transition-colors text-sm px-1">🗑</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}