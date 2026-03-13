import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Building2, LogOut, Pencil, Plus, Search } from "lucide-react";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

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
const STATUS_CLASS_MAP: Record<(typeof STATUSES)[number], string> = {
  상담: "status-consult",
  서류준비: "status-docs",
  접수완료: "status-submitted",
  심사진행: "status-review",
  승인: "status-approved",
  부결: "status-rejected",
  종결: "status-closed",
};
const STORAGE_USER_KEY = "mrc_logged_in_user";

type Profile = {
  id: string;
  username: string;
  password: string;
  name: string;
  role: "admin" | "staff";
  approved: boolean;
};

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

type AccountForm = {
  id: string;
  username: string;
  password: string;
  name: string;
  role: "admin" | "staff";
  approved: boolean;
};

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

function emptyAccountForm(): AccountForm {
  return {
    id: "",
    username: "",
    password: "",
    name: "",
    role: "staff",
    approved: true,
  };
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
  return <span className={`dot ${state}`} />;
}

function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand-wrap ${small ? "small" : ""}`}>
      <div className="brand-box">
        <div className="brand-main">MRC</div>
        <div className="brand-sub">Mi Rae</div>
      </div>
      <div className="brand-text">미래정책자금연구소</div>
    </div>
  );
}

function Modal({
  open,
  children,
  onClose,
}: {
  open: boolean;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export default function App() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [form, setForm] = useState<Company>(emptyCompany());
  const [accountForm, setAccountForm] = useState<AccountForm>(emptyAccountForm());
  const [historyText, setHistoryText] = useState("");
  const [fundInput, setFundInput] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const [page, setPage] = useState<"mine" | "dashboard" | "accounts">("mine");
  const [dashboardManager, setDashboardManager] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  async function loadCompanies() {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("업체 데이터 불러오기 실패");
      return;
    }

    const rows = (data || []).map((row: any) => ({
      ...emptyCompany(),
      ...row,
      open_date: row.open_date || "",
      next_action_date: row.next_action_date || "",
      fund_types: row.fund_types || [],
      history: row.history || [],
    })) as Company[];

    setCompanies(rows);
  }

  async function loadProfiles() {
    if (!user || user.role !== "admin") return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      alert("계정 데이터 불러오기 실패");
      return;
    }

    setProfiles((data || []) as Profile[]);
  }

  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_USER_KEY);

    if (!savedUser) {
      setLoading(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser) as Profile;
      setUser(parsedUser);
      loadCompanies().finally(() => setLoading(false));
    } catch {
      localStorage.removeItem(STORAGE_USER_KEY);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      loadProfiles();
    }
  }, [user]);

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

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const text = `${p.username} ${p.name} ${p.role}`.toLowerCase();
      return text.includes(accountSearch.toLowerCase());
    });
  }, [profiles, accountSearch]);

  async function login() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", loginId)
      .eq("password", loginPw)
      .single();

    if (error || !data) {
      alert("아이디 또는 비밀번호 오류");
      return;
    }

    if (!data.approved) {
      alert("관리자 승인 대기 계정");
      return;
    }

    setUser(data as Profile);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data));
    await loadCompanies();
  }

  function logout() {
    localStorage.removeItem(STORAGE_USER_KEY);
    setUser(null);
    setLoginId("");
    setLoginPw("");
    setSelectedId("");
    setPage("mine");
    setCompanies([]);
    setProfiles([]);
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

  async function saveCompany() {
    if (!form.company_name.trim()) return;

    const payload = {
      company_name: form.company_name,
      business_type: form.business_type,
      ceo_name: form.ceo_name,
      business_number: form.business_number,
      phone: form.phone,
      business_address: form.business_address,
      open_date: form.open_date || null,
      industry: form.industry,
      revenue: form.revenue,
      nice_score: form.nice_score,
      kcb_score: form.kcb_score,
      inflow_source: form.inflow_source,
      fund_types: form.fund_types,
      status: form.status,
      contract_status: form.contract_status,
      contract_terms: form.contract_terms,
      manager: form.manager,
      next_action_date: form.next_action_date || null,
      next_action_text: form.next_action_text,
      remarks: form.remarks,
      history: form.history,
      delete_requested: form.delete_requested,
    };

    if (form.id) {
      const { error } = await supabase.from("companies").update(payload).eq("id", form.id);
      if (error) {
        alert("업체 수정 실패");
        return;
      }
    } else {
      const { error } = await supabase.from("companies").insert(payload);
      if (error) {
        alert("업체 등록 실패");
        return;
      }
    }

    setForm(emptyCompany());
    setFundInput("");
    setDialogOpen(false);
    await loadCompanies();
  }

  function startEdit(company: Company) {
    setForm({ ...company });
    setFundInput("");
    setDialogOpen(true);
  }

  async function addHistory() {
    if (!selected || !historyText.trim()) return;
    const nextHistory = [
      `${new Date().toLocaleDateString("ko-KR")} ${user?.name}: ${historyText.trim()}`,
      ...(selected.history || []),
    ];

    const { error } = await supabase
      .from("companies")
      .update({ history: nextHistory })
      .eq("id", selected.id);

    if (error) {
      alert("진행 내역 저장 실패");
      return;
    }

    setHistoryText("");
    await loadCompanies();
  }

  async function requestDelete(id: string) {
    const { error } = await supabase
      .from("companies")
      .update({ delete_requested: true })
      .eq("id", id);

    if (error) {
      alert("삭제 요청 실패");
      return;
    }

    await loadCompanies();
  }

  async function approveDelete(id: string) {
    if (user?.role !== "admin") {
      alert("관리자만 삭제 승인 가능");
      return;
    }

    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) {
      alert("삭제 실패");
      return;
    }

    if (selectedId === id) setSelectedId("");
    await loadCompanies();
  }

  async function saveAccount() {
    if (!accountForm.username.trim() || !accountForm.password.trim() || !accountForm.name.trim()) {
      alert("이름 / 아이디 / 비밀번호를 입력해주세요.");
      return;
    }

    const payload = {
      username: accountForm.username.trim(),
      password: accountForm.password.trim(),
      name: accountForm.name.trim(),
      role: accountForm.role,
      approved: accountForm.approved,
    };

    if (accountForm.id) {
      const { error } = await supabase.from("profiles").update(payload).eq("id", accountForm.id);
      if (error) {
        alert("계정 수정 실패");
        return;
      }
    } else {
      const { error } = await supabase.from("profiles").insert(payload);
      if (error) {
        alert("계정 등록 실패");
        return;
      }
    }

    setAccountDialogOpen(false);
    setAccountForm(emptyAccountForm());
    await loadProfiles();
  }

  function startEditAccount(profile: Profile) {
    setAccountForm({
      id: profile.id,
      username: profile.username,
      password: profile.password,
      name: profile.name,
      role: profile.role,
      approved: profile.approved,
    });
    setAccountDialogOpen(true);
  }

  async function toggleApproved(profile: Profile) {
    const { error } = await supabase
      .from("profiles")
      .update({ approved: !profile.approved })
      .eq("id", profile.id);

    if (error) {
      alert("승인 상태 변경 실패");
      return;
    }

    await loadProfiles();
  }

  async function deleteAccount(id: string) {
    const ok = window.confirm("해당 계정을 삭제할까요?");
    if (!ok) return;

    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) {
      alert("계정 삭제 실패");
      return;
    }

    await loadProfiles();
  }

  if (loading) {
    return <div className="auth-page"><div className="muted">로딩중...</div></div>;
  }

  if (!user) {
    return (
      <div className="auth-page">
        <div className="card auth-card">
          <div className="card-body center">
            <BrandMark />
            <h1 className="auth-title">미래정책자금 고객관리</h1>
            <div className="auth-sub">MRC (Mi Rae Client)</div>
            <input className="input" placeholder="아이디" value={loginId} onChange={(e) => setLoginId(e.target.value)} />
            <input className="input" type="password" placeholder="비밀번호" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} />
            <button className="btn primary full" onClick={login}>로그인</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-left">
          <BrandMark small />
          <div>
            <div className="topbar-title">
              <Building2 size={18} />
              <span>미래정책자금 고객관리</span>
            </div>
            <div className="muted tiny">MRC (Mi Rae Client)</div>
            <div className="muted">로그인 사용자: {user.name}</div>
          </div>
        </div>
        <div className="topbar-right">
          <button
            className="btn primary"
            onClick={() => {
              setForm(emptyCompany());
              setDialogOpen(true);
            }}
          >
            <Plus size={16} />
            업체 등록
          </button>
          <button className="btn ghost" onClick={logout}>
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </header>

      <div className="toolbar">
        <div className="toolbar-tabs">
          <button className={`btn ${page === "mine" ? "primary" : "ghost"}`} onClick={() => setPage("mine")}>
            공유 업체 현황
          </button>
          <button className={`btn ${page === "dashboard" ? "primary" : "ghost"}`} onClick={() => setPage("dashboard")}>
            대시보드(전체현황)
          </button>
          {user.role === "admin" && (
            <button className={`btn ${page === "accounts" ? "primary" : "ghost"}`} onClick={() => setPage("accounts")}>
              계정관리
            </button>
          )}
        </div>
        <div className="legend">
          <span><Dot state="overdue" /> 기한 지남</span>
          <span><Dot state="today" /> 오늘</span>
          <span><Dot state="upcoming" /> 예정</span>
        </div>
      </div>

      {page === "dashboard" ? (
        <div className="stack">
          <div className="grid two">
            <div className="card">
              <div className="card-body row-between wrap">
                <div>
                  <div className="muted tiny">조회 범위</div>
                  <div className="section-title">
                    {dashboardManager === "all" ? "전체 현황" : `${dashboardManager} 담당 현황`}
                  </div>
                </div>
                <select className="input select" value={dashboardManager} onChange={(e) => setDashboardManager(e.target.value)}>
                  <option value="all">전체</option>
                  {TEAM_MEMBERS.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="muted tiny">총 업체 수</div>
                <div className="big-number">{dashboardCompanies.length}</div>
              </div>
            </div>
          </div>

          <div className="status-grid">
            {STATUSES.map((status) => (
              <div className="card" key={status}>
                <div className="card-body">
                  <div className="muted tiny">{status}</div>
                  <div className="big-number small">{dashboardStatusStats[status] || 0}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid main-side">
            <div className="card">
              <div className="card-header">다음 액션 예정</div>
              <div className="card-body scroll">
                {dashboardActionItems.length ? dashboardActionItems.map((c) => (
                  <div key={c.id} className="list-card">
                    <div className="row-between">
                      <div className="strong">
                        {c.company_name}{c.ceo_name ? ` (${c.ceo_name})` : ""}
                      </div>
                      <div className="muted tiny row">
                        <Dot state={getActionState(c.next_action_date)} />
                        <span>{c.next_action_date}</span>
                      </div>
                    </div>
                    <div className="muted">담당자: {c.manager || "-"}</div>
                    <div>{(c.fund_types || []).join(" + ") || "자금 미입력"} · N {c.nice_score || "-"} / K {c.kcb_score || "-"}</div>
                  </div>
                )) : <div className="muted">다음 액션 일정이 있는 업체가 없음</div>}
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="section-title">유입경로 통계</div>
                <div className="stack-sm">
                  {inflowStats.length ? inflowStats.map(([name, count]) => (
                    <div key={name} className="row-between">
                      <span>{name}</span>
                      <span>{count}</span>
                    </div>
                  )) : <div className="muted">데이터 없음</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : page === "accounts" ? (
        <div className="stack">
          <div className="grid two">
            <div className="search-wrap">
              <Search size={16} />
              <input
                className="input search-input"
                placeholder="이름 / 아이디 / 권한 검색"
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
              />
            </div>

            <div className="row end">
              <button
                className="btn primary"
                onClick={() => {
                  setAccountForm(emptyAccountForm());
                  setAccountDialogOpen(true);
                }}
              >
                <Plus size={16} />
                계정 등록
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">계정 리스트 ({filteredProfiles.length})</div>
            <div className="card-body scroll">
              <div className="stack-sm">
                {filteredProfiles.length ? filteredProfiles.map((profile) => (
                  <div key={profile.id} className="account-card">
                    <div className="row-between">
                      <div>
                        <div className="strong">{profile.name}</div>
                        <div className="muted tiny">@{profile.username}</div>
                      </div>
                      <div className="row">
                        <span className={`status-badge ${profile.role === "admin" ? "status-consult" : "status-closed"}`}>
                          {profile.role}
                        </span>
                        <span className={`status-badge ${profile.approved ? "status-approved" : "status-docs"}`}>
                          {profile.approved ? "승인" : "대기"}
                        </span>
                      </div>
                    </div>

                    <div className="row wrap">
                      <button className="btn ghost sm" onClick={() => startEditAccount(profile)}>수정</button>
                      <button className="btn ghost sm" onClick={() => toggleApproved(profile)}>
                        {profile.approved ? "승인 해제" : "승인 처리"}
                      </button>
                      {profile.username !== "shinyh7" ? (
                        <button className="btn danger sm" onClick={() => deleteAccount(profile.id)}>삭제</button>
                      ) : null}
                    </div>
                  </div>
                )) : <div className="muted">계정 데이터 없음</div>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="stack">
          <div className="grid two">
            <div className="search-wrap">
              <Search size={16} />
              <input
                className="input search-input"
                placeholder="업체명 / 대표자 / 업종 / 유입경로 / 담당자 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="card">
              <div className="card-body">
                <div className="section-title">전체 공유 업체 수</div>
                <div className="big-number">{sharedCompanies.length}</div>
                <div className="muted tiny">내 담당 업체 수: {myCompanies.length}</div>
              </div>
            </div>
          </div>

          <div className="grid main-side">
            <div className="card">
              <div className="card-header">공유 업체 리스트 ({filtered.length})</div>
              <div className="card-body scroll">
                {filtered.map((c) => (
                  <div
                    key={c.id}
                    className={`list-card clickable ${selectedId === c.id ? "active" : ""}`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <div className="row-between">
                      <div className="strong">
                        {c.company_name}{c.ceo_name ? ` (${c.ceo_name})` : ""}
                      </div>
                      <span className={`status-badge ${STATUS_CLASS_MAP[c.status]}`}>{c.status}</span>
                    </div>
                    <div className="muted">{c.industry || "업종 미입력"} · 유입: {c.inflow_source || "-"}</div>
                    <div>{(c.fund_types || []).join(" + ") || "자금 미입력"} · N {c.nice_score || "-"} / K {c.kcb_score || "-"}</div>
                    <div className="muted">담당자: {c.manager || "-"}</div>
                    <div className="muted tiny row">
                      <Dot state={getActionState(c.next_action_date)} />
                      <span>다음 액션: {c.next_action_date || "미정"}{c.next_action_text ? ` · ${c.next_action_text}` : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header row-between">
                <span>업체 상세</span>
                {selected ? (
                  <button className="btn ghost sm" onClick={() => startEdit(selected)}>
                    <Pencil size={14} />
                    수정
                  </button>
                ) : null}
              </div>
              <div className="card-body scroll">
                {selected ? (
                  <div className="stack-sm">
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
                    <div className="row">
                      <b>다음 액션</b>
                      <Dot state={getActionState(selected.next_action_date)} />
                      <span>{selected.next_action_date || "미정"}</span>
                    </div>
                    <div><b>다음 액션 내용</b> {selected.next_action_text || "-"}</div>
                    <div><b>특이사항</b> {selected.remarks || "-"}</div>

                    <div className="stack-sm">
                      <div className="section-title">진행 내역</div>
                      <textarea
                        className="textarea"
                        placeholder="예: 3/12 김수환 소장 상담 진행, 3/18 접수 완료"
                        value={historyText}
                        onChange={(e) => setHistoryText(e.target.value)}
                      />
                      <button className="btn primary" onClick={addHistory}>기록 추가</button>
                      <div className="stack-sm">
                        {selected.history.length ? selected.history.map((h, i) => (
                          <div key={i} className="timeline-item">
                            <div className="timeline-dot"></div>
                            <div className="timeline-content">{h}</div>
                          </div>
                        )) : <div className="muted tiny">히스토리 없음</div>}
                      </div>
                    </div>

                    <div className="row">
                      {!selected.delete_requested ? (
                        <button className="btn danger" onClick={() => requestDelete(selected.id)}>삭제 요청</button>
                      ) : (
                        <>
                          <span className="status-badge">삭제 요청됨</span>
                          <button className="btn primary" onClick={() => approveDelete(selected.id)}>관리자 승인 삭제</button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="muted">업체 선택</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal open={dialogOpen} onClose={() => { setDialogOpen(false); setForm(emptyCompany()); setFundInput(""); }}>
        <div className="modal-header">{form.id ? "업체 수정" : "업체 등록"}</div>

        <div className="form-grid">
          <Field label="업체명"><input className="input" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></Field>
          <Field label="대표자"><input className="input" value={form.ceo_name} onChange={(e) => setForm({ ...form, ceo_name: e.target.value })} /></Field>
          <Field label="업종"><input className="input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></Field>

          <Field label="사업자 유형">
            <select className="input select" value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value as "개인" | "법인" })}>
              <option value="개인">개인</option>
              <option value="법인">법인</option>
            </select>
          </Field>

          <Field label="사업자번호"><input className="input" value={form.business_number} onChange={(e) => setForm({ ...form, business_number: e.target.value })} /></Field>
          <Field label="고객 전화번호"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="사업장 주소"><input className="input" value={form.business_address} onChange={(e) => setForm({ ...form, business_address: e.target.value })} /></Field>
          <Field label="개업일"><input className="input" type="date" value={form.open_date} onChange={(e) => setForm({ ...form, open_date: e.target.value })} /></Field>
          <Field label="연매출"><input className="input" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} /></Field>
          <Field label="NICE"><input className="input" value={form.nice_score} onChange={(e) => setForm({ ...form, nice_score: e.target.value })} /></Field>
          <Field label="KCB"><input className="input" value={form.kcb_score} onChange={(e) => setForm({ ...form, kcb_score: e.target.value })} /></Field>

          <Field label="유입경로">
            <select className="input select" value={form.inflow_source} onChange={(e) => setForm({ ...form, inflow_source: e.target.value })}>
              <option value="">선택</option>
              {INFLOW_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="진행상태">
            <select className="input select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Company["status"] })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="담당자">
            <select className="input select" value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })}>
              <option value="">선택</option>
              {TEAM_MEMBERS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="다음 액션일"><input className="input" type="date" value={form.next_action_date} onChange={(e) => setForm({ ...form, next_action_date: e.target.value })} /></Field>
          <Field label="다음 액션 내용"><input className="input" value={form.next_action_text} onChange={(e) => setForm({ ...form, next_action_text: e.target.value })} /></Field>

          <Field label="계약여부">
            <select className="input select" value={form.contract_status} onChange={(e) => setForm({ ...form, contract_status: e.target.value as Company["contract_status"] })}>
              {CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="진행 자금">
            <div className="stack-sm">
              <div className="row">
                <input className="input" value={fundInput} onChange={(e) => setFundInput(e.target.value)} placeholder="예: 혁신성장-스마트" />
                <button type="button" className="btn primary" onClick={addFundType}>추가</button>
              </div>
              <div className="tag-wrap">
                {form.fund_types.length ? form.fund_types.map((fund) => (
                  <button key={fund} type="button" className="tag" onClick={() => removeFundType(fund)}>
                    {fund} ×
                  </button>
                )) : <span className="muted tiny">추가된 진행 자금 없음</span>}
              </div>
              <div className="muted tiny">여러 자금이 있으면 추가 버튼으로 각각 넣어주세요. 표시될 때는 + 로 연결됩니다.</div>
            </div>
          </Field>
        </div>

        <Field label="계약조건">
          <input className="input" value={form.contract_terms} onChange={(e) => setForm({ ...form, contract_terms: e.target.value })} placeholder="예: 계약금 100만원(선불) / 5%" />
        </Field>

        <Field label="특이사항 / 기대출 메모">
          <textarea className="textarea" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
        </Field>

        <div className="row end">
          <button className="btn primary" onClick={saveCompany}>{form.id ? "수정 저장" : "저장"}</button>
          <button className="btn ghost" onClick={() => { setDialogOpen(false); setForm(emptyCompany()); setFundInput(""); }}>취소</button>
        </div>
      </Modal>

      <Modal open={accountDialogOpen} onClose={() => { setAccountDialogOpen(false); setAccountForm(emptyAccountForm()); }}>
        <div className="modal-header">{accountForm.id ? "계정 수정" : "계정 등록"}</div>

        <div className="form-grid">
          <Field label="이름"><input className="input" value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} /></Field>
          <Field label="아이디"><input className="input" value={accountForm.username} onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })} /></Field>
          <Field label="비밀번호"><input className="input" value={accountForm.password} onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })} /></Field>

          <Field label="권한">
            <select className="input select" value={accountForm.role} onChange={(e) => setAccountForm({ ...accountForm, role: e.target.value as "admin" | "staff" })}>
              <option value="staff">staff</option>
              <option value="admin">admin</option>
            </select>
          </Field>

          <Field label="승인 여부">
            <select className="input select" value={accountForm.approved ? "approved" : "pending"} onChange={(e) => setAccountForm({ ...accountForm, approved: e.target.value === "approved" })}>
              <option value="approved">승인</option>
              <option value="pending">대기</option>
            </select>
          </Field>
        </div>

        <div className="row end">
          <button className="btn primary" onClick={saveAccount}>{accountForm.id ? "수정 저장" : "계정 저장"}</button>
          <button className="btn ghost" onClick={() => { setAccountDialogOpen(false); setAccountForm(emptyAccountForm()); }}>취소</button>
        </div>
      </Modal>
    </div>
  );
}
