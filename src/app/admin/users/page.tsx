"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getAllUsers, grantEventChalk, grantEventChalkBulk,
  calcEffectiveChalk, fmtDate, fmtDateTime,
  type UserRow,
} from "@/lib/admin";

// ── 이벤트 분필 지급 모달 ────────────────────────────────────────
function GrantModal({
  targets,
  onClose,
  onDone,
  adminEmail,
}: {
  targets: UserRow[];
  onClose: () => void;
  onDone: () => void;
  adminEmail: string;
}) {
  const [amount,  setAmount]  = useState(10);
  const [reason,  setReason]  = useState("");
  const [days,    setDays]    = useState(90);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState("");

  const isBulk = targets.length > 1;

  const expiresAt = () => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  const handleGrant = async () => {
    if (!reason.trim()) { setError("지급 사유를 입력해 주세요."); return; }
    if (amount < 1)     { setError("1개 이상 입력해 주세요."); return; }
    setBusy(true); setError("");
    try {
      if (isBulk) {
        await grantEventChalkBulk(adminEmail, targets.map(u => u.uid), amount, reason, expiresAt());
      } else {
        const u = targets[0];
        await grantEventChalk(adminEmail, u.uid, u.email, u.displayName, amount, reason, expiresAt());
      }
      onDone();
    } catch (e: unknown) {
      setError((e as Error).message ?? "오류가 발생했어요.");
    } finally { setBusy(false); }
  };

  const REASONS = ["출시 기념", "이벤트 당첨", "오류 보상", "베타 테스터", "직접 입력"];
  const [customReason, setCustomReason] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* 헤더 */}
        <div className="chalk-header px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="chalk-text font-bold text-lg">이벤트 분필 지급</h2>
            <p className="text-[#A8D5B7] text-xs mt-0.5">
              {isBulk ? `${targets.length}명 일괄 지급` : targets[0].displayName || targets[0].email}
            </p>
          </div>
          <button onClick={onClose} className="text-[#A8D5B7] hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* 수량 */}
          <div>
            <label className="text-xs font-semibold text-[#4A4A4A] block mb-1.5">지급 수량</label>
            <div className="flex items-center gap-2">
              {[5, 10, 20, 30, 50].map(n => (
                <button key={n} onClick={() => setAmount(n)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-all ${
                    amount === n ? "border-[#1B4332] bg-[#F0FFF4] text-[#1B4332]" : "border-[#E8E0D0] text-[#4A4A4A] hover:border-[#1B4332]"
                  }`}>{n}</button>
              ))}
              <input type="number" min={1} value={amount} onChange={e => setAmount(Number(e.target.value))}
                className="w-20 border border-[#E8E0D0] rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:border-[#1B4332]" />
              <span className="text-sm text-[#4A4A4A] font-medium">분필</span>
            </div>
          </div>

          {/* 만료일 */}
          <div>
            <label className="text-xs font-semibold text-[#4A4A4A] block mb-1.5">만료 기간</label>
            <div className="flex items-center gap-2 flex-wrap">
              {[30, 60, 90, 180, 365].map(d => (
                <button key={d} onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm border-2 transition-all ${
                    days === d ? "border-[#1B4332] bg-[#F0FFF4] text-[#1B4332] font-bold" : "border-[#E8E0D0] text-[#4A4A4A] hover:border-[#1B4332]"
                  }`}>{d}일</button>
              ))}
            </div>
            <p className="text-xs text-[#9A9A9A] mt-1">
              만료일: {expiresAt().toLocaleDateString("ko-KR")}
            </p>
          </div>

          {/* 사유 */}
          <div>
            <label className="text-xs font-semibold text-[#4A4A4A] block mb-1.5">지급 사유</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {REASONS.map(r => (
                <button key={r} onClick={() => {
                  if (r === "직접 입력") { setCustomReason(true); setReason(""); }
                  else { setCustomReason(false); setReason(r); }
                }}
                  className={`px-3 py-1.5 rounded-lg text-xs border-2 transition-all ${
                    reason === r || (r === "직접 입력" && customReason)
                      ? "border-[#1B4332] bg-[#F0FFF4] text-[#1B4332] font-bold"
                      : "border-[#E8E0D0] text-[#4A4A4A] hover:border-[#1B4332]"
                  }`}>{r}</button>
              ))}
            </div>
            {customReason && (
              <input value={reason} onChange={e => setReason(e.target.value)}
                placeholder="사유를 입력하세요"
                className="w-full border border-[#E8E0D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332]" />
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          {/* 요약 */}
          <div className="bg-[#F9F9F9] rounded-xl p-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-[#4A4A4A]">대상</span>
              <span className="font-semibold">{isBulk ? `${targets.length}명` : (targets[0].displayName || targets[0].email)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4A4A4A]">지급량</span>
              <span className="font-bold text-[#1B4332]">✏️ {amount}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4A4A4A]">만료일</span>
              <span className="font-semibold">{expiresAt().toLocaleDateString("ko-KR")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4A4A4A]">사유</span>
              <span className="font-semibold">{reason || "—"}</span>
            </div>
          </div>

          <button onClick={handleGrant} disabled={busy || !reason.trim()}
            className="w-full py-3 bg-[#1B4332] text-white font-bold rounded-xl hover:bg-[#2D6A4F] disabled:opacity-40 transition-colors">
            {busy ? "지급 중..." : `✏️ 분필 ${amount}개 지급`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────
export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users,      setUsers]      = useState<UserRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [grantTarget,setGrantTarget]= useState<UserRow[] | null>(null);

  const load = async () => {
    setLoading(true);
    try { setUsers(await getAllUsers()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    !search || u.email?.includes(search) || u.displayName?.includes(search)
  );

  const toggleSelect = (uid: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(uid)) { n.delete(uid); } else { n.add(uid); }
      return n;
    });
  };

  const selectedUsers = users.filter(u => selected.has(u.uid));

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#1B4332]">유저 관리</h1>
          <p className="text-sm text-[#9A9A9A] mt-1">총 {users.length}명</p>
        </div>
        {selected.size > 0 && (
          <button
            onClick={() => setGrantTarget(selectedUsers)}
            className="px-4 py-2 bg-[#1B4332] text-white text-sm font-bold rounded-xl hover:bg-[#2D6A4F] transition-colors">
            ✏️ {selected.size}명 일괄 지급
          </button>
        )}
      </div>

      {/* 검색 */}
      <div className="flex gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="이메일 또는 이름으로 검색"
          className="flex-1 border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B4332] bg-white shadow-sm" />
        <button onClick={load} className="px-4 py-2.5 border border-[#E8E0D0] rounded-xl text-sm text-[#4A4A4A] bg-white hover:border-[#1B4332] transition-colors shadow-sm">
          ↺ 새로고침
        </button>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-[#E8E0D0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E0D0] bg-[#F9F9F9]">
                <th className="px-4 py-3 text-left">
                  <input type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={e => setSelected(e.target.checked ? new Set(filtered.map(u => u.uid)) : new Set())}
                    className="accent-[#1B4332]" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#4A4A4A]">이름 / 이메일</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#4A4A4A]">분필</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#4A4A4A]">가입일</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#4A4A4A]">최근 로그인</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#4A4A4A]">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {loading ? (
                Array.from({length: 5}).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-4">
                      <div className="h-4 bg-[#F0F0F0] rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[#9A9A9A]">검색 결과가 없어요</td></tr>
              ) : filtered.map(u => {
                const chalk = calcEffectiveChalk(u);
                const eventChalk = (u.chalkEvents ?? [])
                  .filter(e => e.expiresAt?.toDate() > new Date())
                  .reduce((s, e) => s + e.amount, 0);
                return (
                  <tr key={u.uid} className={`hover:bg-[#F9F9F9] transition-colors ${selected.has(u.uid) ? "bg-[#F0FFF4]" : ""}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(u.uid)} onChange={() => toggleSelect(u.uid)} className="accent-[#1B4332]" />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#1B4332]">{u.displayName || "—"}</p>
                      <p className="text-xs text-[#9A9A9A]">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-[#1B4332]">{chalk}</span>
                      {eventChalk > 0 && (
                        <span className="ml-1 text-[10px] text-[#F9A825]">(이벤트 {eventChalk})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-[#9A9A9A]">{fmtDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-center text-xs text-[#9A9A9A]">{fmtDateTime(u.lastLoginAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setGrantTarget([u])}
                        className="px-3 py-1.5 bg-[#F0FFF4] border border-[#9AE6B4] text-[#1B4332] text-xs font-bold rounded-lg hover:bg-[#D4EDDA] transition-colors">
                        ✏️ 지급
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 지급 모달 */}
      {grantTarget && user && (
        <GrantModal
          targets={grantTarget}
          adminEmail={user.email!}
          onClose={() => setGrantTarget(null)}
          onDone={() => { setGrantTarget(null); setSelected(new Set()); load(); }}
        />
      )}
    </div>
  );
}