import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Building2, LogOut, Pencil } from "lucide-react";

const USERS = [
  { username: "shinyh7", password: "ss1004**", name: "신용호 과장", role: "admin", approved: true },
  { username: "ksh", password: "1234", name: "김수환 소장", role: "staff", approved: true },
  { username: "kma", password: "1234", name: "김미애 실장", role: "staff", approved: true },
  { username: "cjy", password: "1234", name: "천진영 이사", role: "staff", approved: true },
  { username: "ljm", password: "1234", name: "이정민 팀장", role: "staff", approved: true },
  { username: "kha", password: "1234", name: "강현아 팀장", role: "staff", approved: true },
  { username: "rey", password: "1234", name: "류은영 팀장", role: "staff", approved: true },
] as const;

const TEAM_MEMBERS = [
  "신용호 과장",
  "김수환 소장",
  "김미애 실장",
  "천진영 이사",
  "이정민 팀장",
  "강현아 팀장",
  "류은영 팀장",
] as const;

const STATUSES = ["상담", "서류준비", "접수완료", "심사진행", "승인", "부결", "종결"] as const;
const CONTRACT_STATUSES = ["미계약", "전자계약 완료", "서면계약 완료", "보류"] as const;
const INFLOW_SOURCES = ["메타광고", "블로그", "전화영업", "소개", "문자", "홈페이지", "지인추천", "기존고객", "기타"] as const;

type User = (typeof USERS)[number];
type Company = {
  id: string;
  company_name: string;
  business_type: "개인" | "법인";
  ceo_name: string;
  business_number: string;
  phone: string;
  business_address: string;
  open_date: string;
  industry: string;
  revenue: string;
  nice_score: string;
  kcb_score: string;
  inflow_source: string;
  fund_types: string[];
  status: (typeof STATUSES)[number];
  contract_status: (typeof CONTRACT_STATUSES)[number];
  contract_terms: string;
  manager: string;
  next_action_date: string;
  next_action_text: string;
  remarks: string;
  history: string[];
  delete_requested: boolean;
};

function BrandMark({ size = 96 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="rounded-3xl bg-white shadow-sm border flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div className="text-center leading-none">
          <div className="text-2xl font-black text-slate-800">MRC</div>
          <div className="text-[10px] text-slate-500 mt-1">Mi Rae</div>
        </div>
      </div>
      <div className="text-sm font-semibold text-slate-800">미래정책자금연구소</div>
    </div>
  );
}

function formatRevenue(v: string | number) {
  const n = Number(v || 0);
  if (!n) return "-";
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 10000) return `${Math.round(n / 10000)}만`;
  return n.toLocaleString();
}

function getActionState(date: string) {
  if (!date) return "none" as const;
  const today = new Date();
  const target = new Date(`${date}T00:00:00`);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.floor((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "overdue" as const;
  if (diff === 0) return "today" as const;
  return "upcoming" as const;
}

function Dot({ state }: { state: ReturnType<typeof getActionState> }) {
  const cls =
    state === "overdue"
      ? "bg-red-500"
      : state === "today"
        ? "bg-yellow-500"
        : state === "upcoming"
          ? "bg-green-500"
          : "bg-slate-300";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} />;
}

function emptyCompany(): Company {
  return {
    id: "",
    company_name: "",
    business_type: "개인",
    ceo_name: "",
    business_number: "",
    phone: "",
    business_address: "",
    open_date: "",
    industry: "",
    revenue: "",
    nice_score: "",
    kcb_score: "",
    inflow_source: "",
    fund_types: [],
    status: "상담",
    contract_status: "미계약",
    contract_terms: "",
    manager: "",
    next_action_date: "",
    next_action_text: "",
    remarks: "",
    history: [],
    delete_requested: false,
  };
}

export default function PolicyFundingCRM() {
  const [user, setUser] = useState<User | null>(null);
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Company>(emptyCompany());
  const [historyText, setHistoryText] = useState("");
  const [fundInput, setFundInput] = useState("");
  const [page, setPage] = useState<"mine" | "dashboard">("mine");
  const [dashboardManager, setDashboardManager] = useState<string>("all");

  const myCompanies = useMemo(() => companies.filter((c) => c.manager === user?.name), [companies, user]);

  const sharedCompanies = useMemo(() => companies, [companies]);

  const filtered = useMemo(() => {
    return sharedCompanies.filter((c) => {
      const text = `${c.company_name} ${c.ceo_name} ${c.industry} ${c.inflow_source} ${c.manager}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [sharedCompanies, search]);

  const selected = companies.find((c) => c.id === selectedId) || null;

  const inflowStats = useMemo(() => {
    const stats: Record<string, number> = {};
    companies.forEach((c) => {
      if (!c.inflow_source) return;
      stats[c.inflow_source] = (stats[c.inflow_source] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [companies]);

  const dashboardCompanies = useMemo(() => {
    if (dashboardManager === "all") return companies;
    return companies.filter((c) => c.manager === dashboardManager);
  }, [companies, dashboardManager]);

  const dashboardStatusStats = useMemo(() => {
    const stats: Record<string, number> = {};
    STATUSES.forEach((s) => {
      stats[s] = 0;
    });
    dashboardCompanies.forEach((c) => {
      stats[c.status] = (stats[c.status] || 0) + 1;
    });
    return stats;
  }, [dashboardCompanies]);

  const dashboardActionItems = useMemo(() => {
    return [...dashboardCompanies]
      .filter((c) => c.next_action_date)
      .sort((a, b) => a.next_action_date.localeCompare(b.next_action_date));
  }, [dashboardCompanies]);

  function login() {
    const found = USERS.find((u) => u.username === loginId && u.password === loginPw);
    if (!found) {
      alert("아이디 또는 비밀번호 오류");
      return;
    }
    if (!found.approved) {
      alert("관리자 승인 대기 계정");
      return;
    }
    setUser(found);
  }

  function logout() {
    setUser(null);
    setLoginId("");
    setLoginPw("");
    setSelectedId("");
    setPage("mine");
  }

  function addFundType() {
    const value = fundInput.trim();
    if (!value) return;
    if (form.fund_types.includes(value)) {
      setFundInput("");
      return;
    }
    setForm((prev) => ({ ...prev, fund_types: [...prev.fund_types, value] }));
    setFundInput("");
  }

  function removeFundType(target: string) {
    setForm((prev) => ({ ...prev, fund_types: prev.fund_types.filter((v) => v !== target) }));
  }

  function saveCompany() {
    if (!form.company_name.trim()) return;

    if (form.id) {
      setCompanies((prev) => prev.map((c) => (c.id === form.id ? form : c)));
      setSelectedId(form.id);
    } else {
      const newCompany = { ...form, id: crypto.randomUUID() };
      setCompanies((prev) => [newCompany, ...prev]);
      setSelectedId(newCompany.id);
    }

    setForm(emptyCompany());
    setFundInput("");
    setDialogOpen(false);
  }

  function startEdit(company: Company) {
    setForm({ ...company });
    setFundInput("");
    setDialogOpen(true);
  }

  function addHistory() {
    if (!selected || !historyText.trim()) return;
    const entry = `${new Date().toLocaleDateString("ko-KR")} ${user?.name}: ${historyText.trim()}`;
    setCompanies((prev) => prev.map((c) => (c.id === selected.id ? { ...c, history: [entry, ...c.history] } : c)));
    setHistoryText("");
  }

  function requestDelete(id: string) {
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, delete_requested: true } : c)));
  }

  function approveDelete(id: string) {
    if (user?.role !== "admin") {
      alert("관리자만 삭제 승인 가능");
      return;
    }
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId("");
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm rounded-2xl text-center shadow-sm">
          <CardHeader className="flex flex-col items-center gap-3 pt-8">
            <BrandMark size={112} />
            <CardTitle className="text-lg">미래정책자금 고객관리</CardTitle>
            <div className="text-xs text-slate-500">MRC (Mi Rae Client)</div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="아이디" value={loginId} onChange={(e) => setLoginId(e.target.value)} />
            <Input type="password" placeholder="비밀번호" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} />
            <Button className="w-full" onClick={login}>로그인</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <BrandMark size={56} />
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5" /> 미래정책자금 고객관리
            </h1>
            <div className="text-xs text-slate-500">MRC (Mi Rae Client)</div>
            <div className="text-sm text-slate-500">로그인 사용자: {user.name}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setForm(emptyCompany()); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />업체 등록
          </Button>
          <Button variant="outline" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />로그아웃
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-2">
          <Button variant={page === "mine" ? "default" : "outline"} onClick={() => setPage("mine")}>공유 업체 현황</Button>
          <Button variant={page === "dashboard" ? "default" : "outline"} onClick={() => setPage("dashboard")}>대시보드(전체현황)</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5"><Dot state="overdue" /><span>기한 지남</span></div>
          <div className="flex items-center gap-1.5"><Dot state="today" /><span>오늘</span></div>
          <div className="flex items-center gap-1.5"><Dot state="upcoming" /><span>예정</span></div>
        </div>
      </div>

      {page === "dashboard" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
            <Card>
              <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm text-slate-500">조회 범위</div>
                  <div className="text-lg font-semibold">{dashboardManager === "all" ? "전체 현황" : `${dashboardManager} 담당 현황`}</div>
                </div>
                <div className="w-full md:w-72">
                  <Select value={dashboardManager} onValueChange={setDashboardManager}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {TEAM_MEMBERS.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-slate-500">총 업체 수</div>
                <div className="text-3xl font-bold mt-1">{dashboardCompanies.length}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            {STATUSES.map((status) => (
              <Card key={status}>
                <CardContent className="p-4">
                  <div className="text-sm text-slate-500">{status}</div>
                  <div className="text-2xl font-bold mt-1">{dashboardStatusStats[status] || 0}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
            <Card>
              <CardHeader>
                <CardTitle>다음 액션 예정</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[420px] pr-3">
                  {dashboardActionItems.length ? dashboardActionItems.map((c) => (
                    <div key={c.id} className="border rounded-xl p-3 mb-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold">{c.company_name}{c.ceo_name ? ` (${c.ceo_name})` : ""}</div>
                        <div className="text-xs text-slate-600 flex items-center gap-2">
                          <Dot state={getActionState(c.next_action_date)} />
                          <span>{c.next_action_date}</span>
                        </div>
                      </div>
                      <div className="text-sm text-slate-500 mt-1">담당자: {c.manager || "-"}</div>
                      <div className="text-sm mt-1">{(c.fund_types || []).join(" + ") || "자금 미입력"} · N {c.nice_score || "-"} / K {c.kcb_score || "-"}</div>
                    </div>
                  )) : <div className="text-slate-400">다음 액션 일정이 있는 업체가 없음</div>}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="font-semibold mb-2">유입경로 통계</div>
                <div className="space-y-1 text-sm">
                  {inflowStats.length ? inflowStats.map(([name, count]) => (
                    <div key={name} className="flex justify-between"><span>{name}</span><span>{count}</span></div>
                  )) : <div className="text-slate-400">데이터 없음</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
            <Input placeholder="업체명 / 대표자 / 업종 / 유입경로 / 담당자 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Card>
              <CardContent className="p-3">
                <div className="font-semibold mb-2">전체 공유 업체 수</div>
                <div className="text-3xl font-bold">{sharedCompanies.length}</div>
                <div className="text-xs text-slate-500 mt-1">내 담당 업체 수: {myCompanies.length}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>공유 업체 리스트 ({filtered.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[520px] pr-3">
                  {filtered.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`border rounded-xl p-3 mb-2 cursor-pointer transition ${selectedId === c.id ? "border-slate-900 bg-slate-50" : "hover:bg-white"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold">{c.company_name}{c.ceo_name ? ` (${c.ceo_name})` : ""}</div>
                        <Badge>{c.status}</Badge>
                      </div>
                      <div className="text-sm text-slate-500 mt-1">{c.industry || "업종 미입력"} · 유입: {c.inflow_source || "-"}</div>
                      <div className="text-sm mt-1">{(c.fund_types || []).join(" + ") || "자금 미입력"} · N {c.nice_score || "-"} / K {c.kcb_score || "-"}</div>
                      <div className="text-sm mt-1">담당자: {c.manager || "-"}</div>
                      <div className="text-xs mt-2 flex items-center gap-2 text-slate-600">
                        <Dot state={getActionState(c.next_action_date)} />
                        <span>다음 액션: {c.next_action_date || "미정"}{c.next_action_text ? ` · ${c.next_action_text}` : ""}</span>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>업체 상세</CardTitle>
                  {selected ? (
                    <Button variant="outline" size="sm" onClick={() => startEdit(selected)}>
                      <Pencil className="mr-2 h-4 w-4" />수정
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                {selected ? (
                  <div className="space-y-3 text-sm">
                    <div><b>업체명</b> {selected.company_name}</div>
                    <div><b>사업자번호</b> {selected.business_number || "-"} ({selected.business_type})</div>
                    <div><b>고객 전화번호</b> {selected.phone || "-"}</div>
                    <div><b>사업장 주소</b> {selected.business_address || "-"}</div>
                    <div><b>업종</b> {selected.industry || "-"}</div>
                    <div><b>개업일</b> {selected.open_date || "-"}</div>
                    <div><b>연매출</b> {formatRevenue(selected.revenue)}</div>
                    <div><b>NICE</b> {selected.nice_score || "-"}</div>
                    <div><b>KCB</b> {selected.kcb_score || "-"}</div>
                    <div><b>담당자</b> {selected.manager || "-"}</div>
                    <div><b>진행 자금</b> {(selected.fund_types || []).join(" + ") || "-"}</div>
                    <div><b>유입경로</b> {selected.inflow_source || "-"}</div>
                    <div><b>계약상태</b> {selected.contract_status}</div>
                    <div><b>계약조건</b> {selected.contract_terms || "-"}</div>
                    <div className="flex items-center gap-2"><b>다음 액션</b> <Dot state={getActionState(selected.next_action_date)} /><span>{selected.next_action_date || "미정"}</span></div>
                    <div><b>다음 액션 내용</b> {selected.next_action_text || "-"}</div>
                    <div><b>특이사항</b> {selected.remarks || "-"}</div>

                    <div className="pt-2 space-y-2">
                      <div className="font-semibold">진행 내역</div>
                      <Textarea placeholder="예: 3/12 김수환 소장 상담 진행, 3/18 접수 완료" value={historyText} onChange={(e) => setHistoryText(e.target.value)} />
                      <Button onClick={addHistory}>기록 추가</Button>
                      <div className="space-y-1">
                        {selected.history.length ? selected.history.map((h, i) => (
                          <div key={i} className="text-xs border rounded p-2 bg-slate-50">{h}</div>
                        )) : <div className="text-slate-400 text-xs">히스토리 없음</div>}
                      </div>
                    </div>

                    <div className="pt-3 flex flex-wrap gap-2">
                      {!selected.delete_requested ? (
                        <Button variant="destructive" onClick={() => requestDelete(selected.id)}>삭제 요청</Button>
                      ) : (
                        <>
                          <Badge>삭제 요청됨</Badge>
                          <Button onClick={() => approveDelete(selected.id)}>관리자 승인 삭제</Button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400">업체 선택</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "업체 수정" : "업체 등록"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="업체명"><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></Field>
            <Field label="대표자"><Input value={form.ceo_name} onChange={(e) => setForm({ ...form, ceo_name: e.target.value })} /></Field>
            <Field label="업종"><Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></Field>
            <Field label="사업자 유형">
              <Select value={form.business_type} onValueChange={(v) => setForm({ ...form, business_type: v as "개인" | "법인" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="개인">개인</SelectItem>
                  <SelectItem value="법인">법인</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="사업자번호"><Input value={form.business_number} onChange={(e) => setForm({ ...form, business_number: e.target.value })} /></Field>
            <Field label="고객 전화번호"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="사업장 주소"><Input value={form.business_address} onChange={(e) => setForm({ ...form, business_address: e.target.value })} /></Field>
            <Field label="개업일"><Input type="date" value={form.open_date} onChange={(e) => setForm({ ...form, open_date: e.target.value })} /></Field>
            <Field label="연매출"><Input value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} /></Field>
            <Field label="NICE"><Input value={form.nice_score} onChange={(e) => setForm({ ...form, nice_score: e.target.value })} /></Field>
            <Field label="KCB"><Input value={form.kcb_score} onChange={(e) => setForm({ ...form, kcb_score: e.target.value })} /></Field>
            <Field label="유입경로">
              <Select value={form.inflow_source} onValueChange={(v) => setForm({ ...form, inflow_source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INFLOW_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="진행상태">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Company["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="담당자">
              <Select value={form.manager} onValueChange={(v) => setForm({ ...form, manager: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEAM_MEMBERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="다음 액션일"><Input type="date" value={form.next_action_date} onChange={(e) => setForm({ ...form, next_action_date: e.target.value })} /></Field>
            <Field label="다음 액션 내용"><Input value={form.next_action_text} onChange={(e) => setForm({ ...form, next_action_text: e.target.value })} /></Field>
            <Field label="계약여부">
              <Select value={form.contract_status} onValueChange={(v) => setForm({ ...form, contract_status: v as Company["contract_status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTRACT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="진행 자금">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input value={fundInput} onChange={(e) => setFundInput(e.target.value)} placeholder="예: 혁신성장-스마트" />
                  <Button type="button" onClick={addFundType}>추가</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(form.fund_types || []).length ? form.fund_types.map((fund) => (
                    <Badge key={fund} variant="secondary" className="cursor-pointer" onClick={() => removeFundType(fund)}>
                      {fund} ×
                    </Badge>
                  )) : <span className="text-xs text-slate-400">추가된 진행 자금 없음</span>}
                </div>
                <div className="text-xs text-slate-500">여러 자금이 있으면 추가 버튼으로 각각 넣어주세요. 표시될 때는 + 로 연결됩니다.</div>
              </div>
            </Field>
          </div>
          <Field label="계약조건">
            <Input value={form.contract_terms} onChange={(e) => setForm({ ...form, contract_terms: e.target.value })} placeholder="예: 계약금 100만원(선불) / 5%" />
          </Field>
          <Field label="특이사항 / 기대출 메모">
            <Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={saveCompany}>{form.id ? "수정 저장" : "저장"}</Button>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setForm(emptyCompany()); setFundInput(""); }}>취소</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
