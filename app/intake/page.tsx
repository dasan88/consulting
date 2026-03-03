"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { defaultInput, EXCEL_HEADERS } from "@/lib/constants";
import { CounselingInput, CounselingRecord } from "@/lib/types";
import { createRecord, normalizePhone, requiredCheck, rowToInput, toDisplayPhone } from "@/lib/record-utils";
import { useRecords } from "@/lib/use-records";

const GENDER_OPTIONS: CounselingInput["gender"][] = ["남", "여"];
const AGE_OPTIONS: CounselingInput["age_group"][] = ["20~24", "25~29", "30~34", "35~39", "40~45"];
const STATUS_OPTIONS: CounselingInput["status"][] = ["대학", "졸업", "직장", "기타"];
const VISIT_SOURCE_OPTIONS: CounselingInput["visit_source"][] = ["홈페이지", "인스타그램", "블로그", "유튜브", "지인추천", "기타"];
const MAJOR_OPTIONS = ["전자/전기", "화학", "바이오", "기계", "건축", "문과", "기타"] as const;
const GRADE_OPTIONS = ["1학년", "2학년", "3학년", "4학년"] as const;
const ENGLISH_OPTIONS = ["TOEIC", "TOEFL", "TEPS", "G-TELP", "FLEX", "IELTS"] as const;
const PREP_PERIOD_OPTIONS = ["12개월", "18개월", "24개월", "30개월", "36개월"] as const;
const QUESTION_OPTIONS = [
  "PRICE(수강료/가격/할인/환불)",
  "CURRICULUM(커리큘럼/강의/종합반/단과/로드맵)",
  "PASS_POSSIBILITY(합격/가능성/전략/기간)",
  "ENGLISH(영어/토익/텝스/토플/점수)",
  "WORKING(직장/병행/시간)",
  "EXAM_INFO(1차/2차/과목/일정/응시)",
] as const;
const QUESTION_DELIMITER = " | ";
const COUNSEL_MINUTE_PRESETS = [30, 40, 50, 60];
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const SAMPLE_NAMES = ["김민수", "이서연", "박지훈", "최유진", "정하늘", "오지수", "한도윤", "윤가은"];
const SAMPLE_UNIVERSITIES = ["서울대", "연세대", "고려대", "한양대", "성균관대", "중앙대", "경희대", ""];
const SAMPLE_MAJORS = [...MAJOR_OPTIONS, ""];
const SAMPLE_QUESTIONS = [...QUESTION_OPTIONS];
const SAMPLE_PREP = [...PREP_PERIOD_OPTIONS];
const DRAFT_STORAGE_KEY = "counseling-form-draft-v1";
type SortKey = "date" | "name" | "academy_id" | "status" | "counsel_minutes";
const AGE_WEIGHT_MAP: Array<{ value: CounselingInput["age_group"]; weight: number }> = [
  { value: "20~24", weight: 30 },
  { value: "25~29", weight: 30 },
  { value: "30~34", weight: 20 },
  { value: "35~39", weight: 15 },
  { value: "40~45", weight: 5 },
];
const VISIT_SOURCE_WEIGHT_MAP: Array<{ value: CounselingInput["visit_source"]; weight: number }> = [
  { value: "인스타그램", weight: 30 },
  { value: "홈페이지", weight: 25 },
  { value: "블로그", weight: 18 },
  { value: "유튜브", weight: 12 },
  { value: "지인추천", weight: 10 },
  { value: "기타", weight: 5 },
];
const STATUS_WEIGHT_MAP: Array<{ value: CounselingInput["status"]; weight: number }> = [
  { value: "대학", weight: 70 },
  { value: "졸업", weight: 15 },
  { value: "직장", weight: 10 },
  { value: "기타", weight: 5 },
];
const MINUTES_WEIGHT_MAP: Array<{ value: number; weight: number }> = [
  { value: 30, weight: 25 },
  { value: 40, weight: 35 },
  { value: 50, weight: 25 },
  { value: 60, weight: 15 },
];
const ADDRESS_WEIGHT_MAP: Array<{ value: string; weight: number }> = [
  { value: "서울시", weight: 45 },
  { value: "경기도", weight: 30 },
  { value: "인천시", weight: 15 },
  { value: "부산시", weight: 10 },
];

function pick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function weightedPick<T>(items: Array<{ value: T; weight: number }>): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let point = Math.random() * total;
  for (const item of items) {
    point -= item.weight;
    if (point <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function parseQuestionSelections(value: string): string[] {
  if (!value.trim()) return [];
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function serializeQuestionSelections(options: string[]): string {
  return options.join(QUESTION_DELIMITER);
}

function toDateFromIso(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateLabel(iso: string): string {
  const date = toDateFromIso(iso);
  if (!date) return "";
  return `${iso} (${DAY_LABELS[date.getDay()]})`;
}

function buildCalendarDays(baseMonth: Date): Array<{ key: string; iso: string | null; day: number | null }> {
  const year = baseMonth.getFullYear();
  const month = baseMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const items: Array<{ key: string; iso: string | null; day: number | null }> = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    items.push({ key: `blank-${i}`, iso: null, day: null });
  }
  for (let d = 1; d <= totalDays; d += 1) {
    const iso = toIsoDate(new Date(year, month, d));
    items.push({ key: iso, iso, day: d });
  }
  return items;
}

export default function IntakePage() {
  const { records, setRecords } = useRecords();
  const [form, setForm] = useState<CounselingInput>(defaultInput);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [todayIso, setTodayIso] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState("");
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
  const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"전체" | CounselingInput["status"]>("전체");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);
  const [deletedStack, setDeletedStack] = useState<CounselingRecord[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const fromCalendarRef = useRef<HTMLDivElement | null>(null);
  const toCalendarRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [fromCalendarMonth, setFromCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [toCalendarMonth, setToCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const requiredFilled = useMemo(() => {
    const requiredValues = [
      form.date,
      form.name.trim(),
      form.academy_id.trim(),
      form.phone.trim(),
      form.visit_source,
      form.gender,
      form.age_group,
      form.status,
      form.counsel_minutes > 0 ? String(form.counsel_minutes) : "",
    ];
    return requiredValues.filter(Boolean).length;
  }, [form]);
  const selectedQuestionSet = useMemo(() => new Set(parseQuestionSelections(form.questions)), [form.questions]);
  const selectedQuestionCount = selectedQuestionSet.size;
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const fromCalendarDays = useMemo(() => buildCalendarDays(fromCalendarMonth), [fromCalendarMonth]);
  const toCalendarDays = useMemo(() => buildCalendarDays(toCalendarMonth), [toCalendarMonth]);
  const filteredRecords = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return records.filter((record) => {
      if (statusFilter !== "전체" && record.status !== statusFilter) return false;
      if (fromDate && record.date < fromDate) return false;
      if (toDate && record.date > toDate) return false;
      if (!q) return true;
      const target = `${record.name} ${record.academy_id} ${record.phone} ${record.visit_source} ${record.university} ${record.major} ${record.questions} ${record.note}`.toLowerCase();
      return target.includes(q);
    });
  }, [records, keyword, statusFilter, fromDate, toDate]);
  const sortedRecords = useMemo(() => {
    const list = [...filteredRecords];
    list.sort((a, b) => {
      let compare = 0;
      if (sortKey === "counsel_minutes") {
        compare = a.counsel_minutes - b.counsel_minutes;
      } else {
        compare = String(a[sortKey]).localeCompare(String(b[sortKey]), "ko");
      }
      return sortOrder === "asc" ? compare : -compare;
    });
    return list;
  }, [filteredRecords, sortKey, sortOrder]);
  const visibleRecords = useMemo(() => sortedRecords.slice(0, visibleCount), [sortedRecords, visibleCount]);
  const todayCount = useMemo(() => {
    if (!todayIso) return 0;
    return records.filter((r) => r.date === todayIso).length;
  }, [records, todayIso]);
  const totalCounselMinutes = useMemo(
    () => filteredRecords.reduce((sum, r) => sum + r.counsel_minutes, 0),
    [filteredRecords],
  );
  const newestRecord = records[0] || null;

  useEffect(() => {
    setTodayIso(toIsoDate(new Date()));
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      setIsDraftLoaded(true);
      return;
    }
    try {
      const draft = { ...defaultInput, ...(JSON.parse(raw) as CounselingInput) };
      setForm(draft);
      const base = toDateFromIso(draft.date);
      if (base) setCalendarMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    } catch {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } finally {
      setIsDraftLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isDraftLoaded) return;
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form));
      setDraftSavedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch {
      // Ignore storage errors.
    }
  }, [form, isDraftLoaded]);

  useEffect(() => {
    setVisibleCount(20);
  }, [keyword, statusFilter, fromDate, toDate]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(""), 1800);
    return () => window.clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!isCalendarOpen && !isFromCalendarOpen && !isToCalendarOpen) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const insideForm = calendarRef.current?.contains(target);
      const insideFrom = fromCalendarRef.current?.contains(target);
      const insideTo = toCalendarRef.current?.contains(target);
      if (insideForm || insideFrom || insideTo) return;
      setIsCalendarOpen(false);
      setIsFromCalendarOpen(false);
      setIsToCalendarOpen(false);
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [isCalendarOpen, isFromCalendarOpen, isToCalendarOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isSave = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
      if (isSave) {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function updateForm<K extends keyof CounselingInput>(key: K, value: CounselingInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updatePhone(value: string) {
    const formatted = toDisplayPhone(normalizePhone(value));
    updateForm("phone", formatted);
  }

  function toggleQuestionOption(option: (typeof QUESTION_OPTIONS)[number]) {
    const next = new Set(selectedQuestionSet);
    if (next.has(option)) {
      next.delete(option);
    } else {
      next.add(option);
    }
    const ordered = QUESTION_OPTIONS.filter((item) => next.has(item));
    updateForm("questions", serializeQuestionSelections(ordered));
  }

  function clearQuestionOptions() {
    updateForm("questions", "");
  }

  function resetForm(clearMessage = true) {
    setForm(defaultInput);
    setCalendarMonth(new Date());
    setIsCalendarOpen(false);
    setError("");
    setShowValidation(false);
    if (clearMessage) setSuccess("");
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const normalizedForm: CounselingInput = {
      ...form,
      phone: toDisplayPhone(normalizePhone(form.phone)),
    };
    const fail = requiredCheck(normalizedForm);
    if (fail) {
      setShowValidation(true);
      setError(fail);
      return;
    }
    setShowValidation(false);
    const isDuplicate = records.some(
      (r) =>
        r.date === normalizedForm.date &&
        r.name === normalizedForm.name &&
        r.academy_id === normalizedForm.academy_id &&
        normalizePhone(r.phone) === normalizePhone(normalizedForm.phone),
    );
    if (isDuplicate) {
      const confirmed = window.confirm("같은 날짜/이름/학원아이디/연락처 기록이 이미 있습니다. 그래도 저장할까요?");
      if (!confirmed) return;
    }
    setError("");
    const next = createRecord(normalizedForm);
    setRecords((prev) => [next, ...prev]);
    setSuccess("상담 기록이 저장되었습니다.");
    resetForm(false);
  }

  function deleteRecord(id: string) {
    const target = records.find((item) => item.id === id) || null;
    setRecords((prev) => prev.filter((item) => item.id !== id));
    if (target) {
      setDeletedStack((prev) => [target, ...prev].slice(0, 5));
    }
  }

  function clearAll() {
    if (!window.confirm("모든 상담 기록을 삭제할까요?")) return;
    setRecords([]);
  }

  function clearDraft() {
    if (!window.confirm("작성 중인 입력값을 비울까요?")) return;
    resetForm();
  }

  function clearFilters() {
    setKeyword("");
    setStatusFilter("전체");
    setFromDate("");
    setToDate("");
    setIsFromCalendarOpen(false);
    setIsToCalendarOpen(false);
  }

  function restoreLastDeleted() {
    if (deletedStack.length === 0) return;
    const [target, ...rest] = deletedStack;
    setRecords((prev) => [target, ...prev]);
    setDeletedStack(rest);
  }

  function changeSort(next: SortKey) {
    if (sortKey === next) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(next);
    setSortOrder("desc");
  }

  function applyTodayDate() {
    updateForm("date", toIsoDate(new Date()));
    setIsCalendarOpen(false);
  }

  function useLastRecordAsTemplate() {
    if (!newestRecord) return;
    const { id, created_at, ...input } = newestRecord;
    setForm({ ...input, date: toIsoDate(new Date()) });
    setSuccess("최근 기록 기반으로 입력값을 채웠습니다.");
  }

  function addSampleRecords() {
    const today = new Date();
    const samples: CounselingRecord[] = Array.from({ length: 100 }, (_, idx) => {
      const dayOffset = Math.floor(Math.random() * 183);
      const date = new Date(today);
      date.setDate(today.getDate() - dayOffset);
      const gender = pick(GENDER_OPTIONS);
      const age = weightedPick(AGE_WEIGHT_MAP);
      const status = weightedPick(STATUS_WEIGHT_MAP);
      const minutes = weightedPick(MINUTES_WEIGHT_MAP);
      const phoneMid = String(1000 + (idx * 37) % 9000);
      const phoneLast = String(1000 + (idx * 91) % 9000);
      return {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        date: toIsoDate(date),
        name: pick(SAMPLE_NAMES),
        academy_id: `A-${String(1000 + idx).padStart(4, "0")}`,
        phone: `010-${phoneMid}-${phoneLast}`,
        visit_source: weightedPick(VISIT_SOURCE_WEIGHT_MAP),
        gender,
        age_group: age,
        address: weightedPick(ADDRESS_WEIGHT_MAP),
        status,
        university: status === "대학" || Math.random() > 0.4 ? pick(SAMPLE_UNIVERSITIES) : "",
        major: Math.random() > 0.3 ? pick(SAMPLE_MAJORS) : "",
        grade: status === "대학" ? String(1 + (idx % 4)) : "",
        english_level: Math.random() > 0.15 ? pick([...ENGLISH_OPTIONS]) : "",
        questions: pick(SAMPLE_QUESTIONS),
        prep_period: pick(SAMPLE_PREP),
        counsel_minutes: minutes,
        note: `테스트 데이터 ${idx + 1}`,
      };
    });
    setRecords((prev) => [...samples, ...prev]);
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([EXCEL_HEADERS as unknown as string[]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "상담템플릿");
    XLSX.writeFile(wb, "상담기록_템플릿.xlsx");
  }

  function exportExcel() {
    const rows = records.map((r) => ({
      날짜: r.date,
      이름: r.name,
      학원아이디: r.academy_id,
      연락처: r.phone,
      방문경로: r.visit_source,
      성별: r.gender,
      연령: r.age_group,
      주소: r.address,
      상황: r.status,
      대학교: r.university,
      전공: r.major,
      학년: r.grade,
      영어: r.english_level,
      궁금한점: r.questions,
      준비기간: r.prep_period,
      상담시간: r.counsel_minutes,
      비고: r.note,
    }));

    const ws = XLSX.utils.json_to_sheet(rows, { header: EXCEL_HEADERS as unknown as string[] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "상담기록");
    XLSX.writeFile(wb, `상담기록_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportFilteredExcel() {
    const rows = filteredRecords.map((r) => ({
      날짜: r.date,
      이름: r.name,
      학원아이디: r.academy_id,
      연락처: r.phone,
      방문경로: r.visit_source,
      성별: r.gender,
      연령: r.age_group,
      주소: r.address,
      상황: r.status,
      대학교: r.university,
      전공: r.major,
      학년: r.grade,
      영어: r.english_level,
      궁금한점: r.questions,
      준비기간: r.prep_period,
      상담시간: r.counsel_minutes,
      비고: r.note,
    }));
    const ws = XLSX.utils.json_to_sheet(rows, { header: EXCEL_HEADERS as unknown as string[] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "조회결과");
    XLSX.writeFile(wb, `상담기록_조회결과_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });

    const rowErrors: string[] = [];
    const validRecords: CounselingRecord[] = [];

    rows.forEach((row, idx) => {
      const isBlank = Object.values(row).every((v) => String(v).trim() === "");
      if (isBlank) return;

      const input = rowToInput(row);
      const fail = requiredCheck(input);
      if (fail) {
        rowErrors.push(`${idx + 2}행: ${fail}`);
        return;
      }
      validRecords.push(createRecord(input));
    });

    setUploadErrors(rowErrors);
    if (validRecords.length > 0) {
      setRecords((prev) => [...validRecords, ...prev]);
    }
  }

  return (
    <main className="intake-page">
      <div className="intake-hero">
        <div className="intake-hero-copy">
          <h1>상담 정보 입력</h1>
          <p className="subtle">상담 입력, 엑셀 업로드/다운로드, 기록 관리 전용 화면</p>
        </div>
        <div className="intake-hero-actions">
          <Link href="/analysis" className="switch-btn">
            분석 페이지로 이동
          </Link>
        </div>
      </div>

      <div className="quick-nav intake-quick-nav">
        <a href="#form-section">입력</a>
        <a href="#excel-section">엑셀</a>
        <a href="#list-section">목록</a>
      </div>

      <div className="intake-summary-strip" aria-label="입력 현황 요약">
        <div className="intake-summary-card">
          <span>누적 상담</span>
          <strong>{records.length}건</strong>
        </div>
        <div className="intake-summary-card">
          <span>오늘 상담</span>
          <strong>{todayCount}건</strong>
        </div>
        <div className="intake-summary-card">
          <span>현재 필수 입력</span>
          <strong>{requiredFilled}/9</strong>
        </div>
        <div className="intake-summary-card">
          <span>관심사 선택</span>
          <strong>{selectedQuestionCount}개</strong>
        </div>
      </div>

      <section id="form-section">
        <div className="form-header">
          <div>
            <h2>상담 입력</h2>
            <p className="subtle">필수 항목을 먼저 입력한 뒤 상세 내용을 추가하세요.</p>
            <p className="shortcut-hint">단축키: Ctrl/Cmd + S 저장</p>
            <p className="shortcut-hint">임시저장: {draftSavedAt || "-"}</p>
          </div>
          <div className="progress-pill">필수 입력 {requiredFilled}/9</div>
        </div>
        <form ref={formRef} onSubmit={onSubmit} className="grid">
          <div className="form-block form-basic">
            <h3>기본 정보</h3>
            <div className="grid grid-4">
              <div>
                <label htmlFor="date">날짜*</label>
                <div className="date-picker" ref={calendarRef}>
                  <button
                    id="date"
                    type="button"
                    className={form.date ? "date-trigger" : "date-trigger placeholder"}
                    onClick={() => {
                      if (!isCalendarOpen && form.date) {
                        const selected = toDateFromIso(form.date);
                        if (selected) setCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
                      }
                      setIsCalendarOpen((prev) => !prev);
                    }}
                  >
                    {form.date ? formatDateLabel(form.date) : "날짜 선택"}
                  </button>
                  <button type="button" className="date-today-btn" onClick={applyTodayDate}>오늘</button>
                  {isCalendarOpen && (
                    <div className="calendar-popover">
                      <div className="calendar-head">
                        <button type="button" className="calendar-nav" onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
                          이전
                        </button>
                        <strong>{calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월</strong>
                        <button type="button" className="calendar-nav" onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
                          다음
                        </button>
                      </div>
                      <div className="calendar-week">
                        {DAY_LABELS.map((day) => (
                          <span key={day}>{day}</span>
                        ))}
                      </div>
                      <div className="calendar-grid">
                        {calendarDays.map((cell) => (
                          <button
                            key={cell.key}
                            type="button"
                            disabled={!cell.iso}
                            data-day={cell.day ?? ""}
                            className={cell.iso === form.date ? "calendar-day active" : "calendar-day"}
                            onClick={() => {
                              if (!cell.iso) return;
                              updateForm("date", cell.iso);
                              setIsCalendarOpen(false);
                            }}
                          >
                            <span
                              className="calendar-day-num"
                              style={{
                                color: "#314c75",
                                WebkitTextFillColor: "#314c75",
                              }}
                            >
                              {cell.day ?? ""}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="name">이름*</label>
                <input
                  id="name"
                  className={showValidation && !form.name.trim() ? "invalid-field" : ""}
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="academy_id">학원 아이디*</label>
                <input
                  id="academy_id"
                  className={showValidation && !form.academy_id.trim() ? "invalid-field" : ""}
                  value={form.academy_id}
                  onChange={(e) => updateForm("academy_id", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="phone">연락처*</label>
                <input
                  id="phone"
                  inputMode="tel"
                  className={showValidation && !form.phone.trim() ? "invalid-field" : ""}
                  value={form.phone}
                  onChange={(e) => updatePhone(e.target.value)}
                  placeholder="010-1234-5678"
                />
                <div className="field-hint">숫자만 입력해도 자동으로 하이픈이 들어갑니다.</div>
              </div>
              <div>
                <label htmlFor="visit_source">방문 경로*</label>
                <select
                  className="basic-field"
                  id="visit_source"
                  value={form.visit_source}
                  onChange={(e) => updateForm("visit_source", e.target.value as CounselingInput["visit_source"])}
                >
                  {VISIT_SOURCE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>성별*</label>
                <div className="segmented">
                  {GENDER_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={form.gender === option ? "segment active" : "segment"}
                      onClick={() => updateForm("gender", option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="form-block form-situation">
            <h3>상황 정보</h3>
            <div className="situation-layout">
              <div className="situation-top">
                <label>연령*</label>
                <div className="segmented age-segmented">
                  {AGE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={form.age_group === option ? "segment active" : "segment"}
                      onClick={() => updateForm("age_group", option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div className="situation-top">
                <label>상황*</label>
                <div className="segmented status-segmented">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={form.status === option ? "segment active" : "segment"}
                      onClick={() => updateForm("status", option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div className="situation-bottom">
                <div>
                  <label htmlFor="address">주소</label>
                  <input id="address" value={form.address} onChange={(e) => updateForm("address", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="counsel_minutes">상담시간(분)*</label>
                  <input
                    id="counsel_minutes"
                    type="number"
                    min={1}
                    value={form.counsel_minutes}
                    onChange={(e) => updateForm("counsel_minutes", Number(e.target.value || 0))}
                  />
                  <div className="quick-chips">
                    {COUNSEL_MINUTE_PRESETS.map((minutes) => (
                      <button
                        type="button"
                        key={minutes}
                        className={form.counsel_minutes === minutes ? "chip active" : "chip"}
                        onClick={() => updateForm("counsel_minutes", minutes)}
                      >
                        {minutes}분
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="form-block form-academic">
            <h3>학업 정보</h3>
            <div className="grid grid-4">
              <div>
                <label htmlFor="university">대학교</label>
                <input className="academic-field" id="university" value={form.university} onChange={(e) => updateForm("university", e.target.value)} />
              </div>
              <div>
                <label htmlFor="major">전공</label>
                <select className="academic-field" id="major" value={form.major} onChange={(e) => updateForm("major", e.target.value)}>
                  <option value="">선택 안함</option>
                  {MAJOR_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="grade">학년</label>
                <select className="academic-field" id="grade" value={form.grade} onChange={(e) => updateForm("grade", e.target.value)}>
                  <option value="">선택 안함</option>
                  {GRADE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="english_level">영어</label>
                <select className="academic-field" id="english_level" value={form.english_level} onChange={(e) => updateForm("english_level", e.target.value)}>
                  <option value="">없음</option>
                  {ENGLISH_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-block form-consult">
            <h3>상담 내용</h3>
            <div className="consult-layout">
              <div className="consult-prep">
                <label htmlFor="prep_period">준비 가능 기간</label>
                <select className="basic-field" id="prep_period" value={form.prep_period} onChange={(e) => updateForm("prep_period", e.target.value)}>
                  <option value="">선택 안함</option>
                  {PREP_PERIOD_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="consult-questions">
                <label>궁금한점 (중복선택)</label>
                <div className="questions-large questions-multi" role="group" aria-label="궁금한점 선택">
                  {QUESTION_OPTIONS.map((option) => (
                    <label key={option} className={selectedQuestionSet.has(option) ? "question-option active" : "question-option"}>
                      <input
                        type="checkbox"
                        checked={selectedQuestionSet.has(option)}
                        onChange={() => toggleQuestionOption(option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
                <div className="questions-tools">
                  <span className="field-hint">선택 {selectedQuestionCount}개</span>
                  <button
                    type="button"
                    className="chip"
                    onClick={clearQuestionOptions}
                    disabled={selectedQuestionCount === 0}
                  >
                    선택 초기화
                  </button>
                </div>
              </div>
              <div className="consult-note">
              <label htmlFor="note">비고</label>
                <textarea className="note-medium" id="note" value={form.note} onChange={(e) => updateForm("note", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="actions sticky-actions">
            <button type="submit">상담 저장</button>
            <button type="button" className="secondary" onClick={() => resetForm()}>초기화</button>
            <button type="button" className="secondary" onClick={clearDraft}>임시작성 비우기</button>
            <button type="button" className="secondary" onClick={useLastRecordAsTemplate} disabled={!newestRecord}>최근 기록 불러오기</button>
          </div>
          {success && <div className="success">{success}</div>}
          {error && <div className="error">{error}</div>}
        </form>
      </section>

      <section id="excel-section">
        <h2>엑셀</h2>
        <div className="actions">
          <button type="button" className="secondary" onClick={downloadTemplate}>템플릿 다운로드</button>
          <button type="button" className="secondary" onClick={exportExcel}>현재 데이터 다운로드</button>
          <button type="button" className="secondary" onClick={exportFilteredExcel}>조회결과 다운로드</button>
          <button type="button" className="secondary" onClick={addSampleRecords}>샘플 100건 생성</button>
          <label style={{ width: "auto" }}>
            <input type="file" accept=".xlsx,.xls" onChange={handleUpload} />
          </label>
          <button type="button" className="danger" onClick={clearAll}>전체 삭제</button>
        </div>
        {uploadErrors.length > 0 && (
          <div className="error">
            <strong>업로드 오류:</strong>
            <ul>
              {uploadErrors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section id="list-section">
        <h2>상담 기록 목록</h2>
        <div className="list-tools">
          <div className="list-kpis">
            <span>전체 {records.length}건</span>
            <span>조회 {filteredRecords.length}건</span>
            <span>오늘 {todayCount}건</span>
            <span>상담시간 합계 {totalCounselMinutes}분</span>
          </div>
          <div className="list-filters">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="이름, 학원아이디, 연락처, 방문경로, 대학, 전공, 메모 검색"
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "전체" | CounselingInput["status"])}>
              <option value="전체">상황 전체</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <div className="date-picker" ref={fromCalendarRef}>
              <button
                type="button"
                className={fromDate ? "date-trigger" : "date-trigger placeholder"}
                onClick={() => {
                  if (!isFromCalendarOpen && fromDate) {
                    const selected = toDateFromIso(fromDate);
                    if (selected) setFromCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
                  }
                  setIsFromCalendarOpen((prev) => !prev);
                  setIsToCalendarOpen(false);
                }}
              >
                {fromDate ? formatDateLabel(fromDate) : "시작일"}
              </button>
              {isFromCalendarOpen && (
                <div className="calendar-popover">
                  <div className="calendar-head">
                    <button type="button" className="calendar-nav" onClick={() => setFromCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
                      이전
                    </button>
                    <strong>{fromCalendarMonth.getFullYear()}년 {fromCalendarMonth.getMonth() + 1}월</strong>
                    <button type="button" className="calendar-nav" onClick={() => setFromCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
                      다음
                    </button>
                  </div>
                  <div className="calendar-week">
                    {DAY_LABELS.map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                  <div className="calendar-grid">
                    {fromCalendarDays.map((cell) => (
                      <button
                        key={cell.key}
                        type="button"
                        disabled={!cell.iso}
                        data-day={cell.day ?? ""}
                        className={cell.iso === fromDate ? "calendar-day active" : "calendar-day"}
                        onClick={() => {
                          if (!cell.iso) return;
                          setFromDate(cell.iso);
                          setIsFromCalendarOpen(false);
                        }}
                      >
                        <span
                          className="calendar-day-num"
                          style={{
                            color: "#314c75",
                            WebkitTextFillColor: "#314c75",
                          }}
                        >
                          {cell.day ?? ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="date-picker" ref={toCalendarRef}>
              <button
                type="button"
                className={toDate ? "date-trigger" : "date-trigger placeholder"}
                onClick={() => {
                  if (!isToCalendarOpen && toDate) {
                    const selected = toDateFromIso(toDate);
                    if (selected) setToCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
                  }
                  setIsToCalendarOpen((prev) => !prev);
                  setIsFromCalendarOpen(false);
                }}
              >
                {toDate ? formatDateLabel(toDate) : "종료일"}
              </button>
              {isToCalendarOpen && (
                <div className="calendar-popover">
                  <div className="calendar-head">
                    <button type="button" className="calendar-nav" onClick={() => setToCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
                      이전
                    </button>
                    <strong>{toCalendarMonth.getFullYear()}년 {toCalendarMonth.getMonth() + 1}월</strong>
                    <button type="button" className="calendar-nav" onClick={() => setToCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
                      다음
                    </button>
                  </div>
                  <div className="calendar-week">
                    {DAY_LABELS.map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                  <div className="calendar-grid">
                    {toCalendarDays.map((cell) => (
                      <button
                        key={cell.key}
                        type="button"
                        disabled={!cell.iso}
                        data-day={cell.day ?? ""}
                        className={cell.iso === toDate ? "calendar-day active" : "calendar-day"}
                        onClick={() => {
                          if (!cell.iso) return;
                          setToDate(cell.iso);
                          setIsToCalendarOpen(false);
                        }}
                      >
                        <span
                          className="calendar-day-num"
                          style={{
                            color: "#314c75",
                            WebkitTextFillColor: "#314c75",
                          }}
                        >
                          {cell.day ?? ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button type="button" className="secondary" onClick={clearFilters}>필터 초기화</button>
          </div>
        </div>
        {deletedStack.length > 0 && (
          <div className="undo-box">
            최근 삭제 {deletedStack.length}건
            <button type="button" className="secondary" onClick={restoreLastDeleted}>마지막 삭제 취소</button>
          </div>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th><button type="button" className="sort-btn" onClick={() => changeSort("date")}>날짜</button></th>
                <th><button type="button" className="sort-btn" onClick={() => changeSort("name")}>이름</button></th>
                <th><button type="button" className="sort-btn" onClick={() => changeSort("academy_id")}>학원아이디</button></th>
                <th>연락처</th>
                <th>방문경로</th>
                <th>성별</th>
                <th>연령</th>
                <th><button type="button" className="sort-btn" onClick={() => changeSort("status")}>상황</button></th>
                <th>대학교</th>
                <th>전공</th>
                <th><button type="button" className="sort-btn" onClick={() => changeSort("counsel_minutes")}>상담시간</button></th>
                <th>삭제</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>{r.name}</td>
                  <td>{r.academy_id}</td>
                  <td>{r.phone}</td>
                  <td>{r.visit_source}</td>
                  <td>{r.gender}</td>
                  <td>{r.age_group}</td>
                  <td>{r.status}</td>
                  <td>{r.university}</td>
                  <td>{r.major}</td>
                  <td>{r.counsel_minutes}</td>
                  <td>
                    <button type="button" className="danger" onClick={() => deleteRecord(r.id)}>삭제</button>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={12}>조건에 맞는 기록이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredRecords.length > visibleCount && (
          <div className="more-wrap">
            <button type="button" className="secondary" onClick={() => setVisibleCount((prev) => prev + 20)}>
              20건 더 보기
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
