"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { normalizePhone, parseDate } from "@/lib/record-utils";
import { CounselingInput, CounselingRecord } from "@/lib/types";
import { useRecords } from "@/lib/use-records";

const SOURCES: CounselingInput["visit_source"][] = ["홈페이지", "인스타그램", "블로그", "유튜브", "지인추천", "기타"];
const STATUSES: CounselingInput["status"][] = ["대학", "졸업", "직장", "기타"];
const GENDERS: CounselingInput["gender"][] = ["남", "여"];
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const AGE_BUCKETS: CounselingInput["age_group"][] = ["20~24", "25~29", "30~34", "35~39", "40~45"];

const PREP_BUCKETS = ["1년 이하", "2년 내외", "3년 이상", "미입력"] as const;
type PrepBucket = (typeof PREP_BUCKETS)[number];

const MAJOR_FAMILIES = ["공대", "자연대", "비이공계", "기타"] as const;
type MajorFamily = (typeof MAJOR_FAMILIES)[number];
const STEM_MAJOR_LABELS = {
  engineering: ["전자/전기", "기계", "건축", "컴퓨터/소프트웨어", "데이터/AI", "산업공학", "토목/환경", "신소재/재료", "반도체", "항공/조선"],
  science: ["화학", "바이오", "수학/통계", "물리", "지구/환경과학"],
} as const;

const QUESTION_CATEGORIES = ["시험 난이도", "합격 가능성", "비용", "준비기간", "병행 가능 여부", "커리큘럼", "기타"] as const;
type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

const UNIVERSITY_TYPES = ["서/연/고", "서/성/한", "중/경/외/시", "건/동/홍/이/숙", "국/숭/세/단", "경기도권", "지방권"] as const;
type UniversityType = (typeof UNIVERSITY_TYPES)[number];
const IDEAL_CANDIDATE_RULE = "20~29세, 공대, 영어 보유, 준비 2년 이상, 서/연/고/카이스트";

const SOG_KEYWORDS = ["서울대", "설대", "snu", "연세대", "연대", "yonsei", "고려대", "고대", "korea", "서연고", "카이스트", "kaist", "한국과학기술원"];
const SSH_KEYWORDS = [
  "서강대",
  "서강",
  "한양대",
  "한양",
  "성균관대",
  "성대",
];
const CGHS_KEYWORDS = [
  "중앙대",
  "중대",
  "경희대",
  "경희",
  "한국외대",
  "외대",
  "서울시립대",
  "시립대",
  "시립",
];
const KDHIS_KEYWORDS = [
  "건국대",
  "건대",
  "동국대",
  "동국",
  "홍익대",
  "홍대",
  "이화여대",
  "이대",
  "숙명여대",
  "숙명",
  "숙대",
];
const KSSD_KEYWORDS = [
  "국민대",
  "국민",
  "숭실대",
  "숭실",
  "세종대",
  "세종",
  "단국대",
  "단국",
];
const GYEONGGI_KEYWORDS = [
  "가천대",
  "가천",
  "아주대",
  "아주",
  "경기대",
  "경기",
  "단국대",
  "한국항공대",
  "항공대",
  "성균관대자연",
  "한양대에리카",
  "에리카",
  "erica",
  "한국외대글로벌",
  "외대글로벌",
  "글로벌캠퍼스",
  "명지대자연",
  "용인대",
  "수원대",
  "협성대",
  "한신대",
  "신한대",
  "대진대",
  "차의과학대",
  "안양대",
  "평택대",
  "한경국립대",
  "칼빈대",
  "루터대",
  "강남대",
  "경동대양주",
  "중앙대안성",
  "중앙안성",
  "단국대죽전",
  "단국죽전",
  "가톨릭대성심",
  "용인",
  "수원",
  "성남",
  "안양",
  "부천",
  "고양",
  "안산",
  "평택",
  "의정부",
];
const LOCAL_CAMPUS_KEYWORDS = ["세종캠퍼스", "고려세종", "미래캠퍼스", "연세미래", "원주", "천안", "아산"];
const CHART_COLORS = ["#0d63d6", "#4f93e0", "#14a392", "#f08a24", "#8b5cf6", "#ec4899", "#64748b"];
const motionUp = {
  hidden: { opacity: 0, y: 18 },
  show: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, delay: index * 0.05 },
  }),
};

function InfoTooltip({ text }: { text: string }) {
  return (
    <RadixTooltip.Provider delayDuration={120}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>
          <button type="button" className="analysis-info-dot" aria-label="설명 보기">
            i
          </button>
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content side="top" sideOffset={8} className="analysis-tooltip-content">
            {text}
            <RadixTooltip.Arrow className="analysis-tooltip-arrow" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; payload?: Record<string, unknown> }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label ? <p className="chart-tooltip-label">{label}</p> : null}
      {payload.map((item, index) => (
        <div key={`${item.name ?? "value"}-${index}`} className="chart-tooltip-row">
          <span className="chart-tooltip-key">
            <i style={{ background: item.color ?? CHART_COLORS[index % CHART_COLORS.length] }} />
            {item.name ?? "값"}
          </span>
          <strong>{item.value ?? 0}</strong>
        </div>
      ))}
    </div>
  );
}

function toPercent(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function isPhoneValid(phone: string): boolean {
  const digits = normalizePhone(phone);
  return digits.length === 10 || digits.length === 11;
}

function monthKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  return `${year.slice(2)}.${month}`;
}

function prepMonths(period: string): number | null {
  const num = Number(period.replace(/[^0-9]/g, ""));
  return Number.isFinite(num) && num > 0 ? num : null;
}

function prepBucket(period: string): PrepBucket {
  const months = prepMonths(period);
  if (!months) return "미입력";
  if (months <= 12) return "1년 이하";
  if (months <= 30) return "2년 내외";
  return "3년 이상";
}

function ageMidpoint(ageGroup: CounselingInput["age_group"]): number {
  const map: Record<CounselingInput["age_group"], number> = {
    "20~24": 22,
    "25~29": 27,
    "30~34": 32,
    "35~39": 37,
    "40~45": 42.5,
  };
  return map[ageGroup];
}

function majorFamily(major: string): MajorFamily {
  const v = major.trim();
  if (!v || v === "기타") return "기타";
  if (
    [
      "전자/전기",
      "기계",
      "건축",
      "컴퓨터/소프트웨어",
      "데이터/AI",
      "산업공학",
      "토목/환경",
      "신소재/재료",
      "반도체",
      "항공/조선",
    ].includes(v) ||
    /(공학|전기|전자|기계|건축|토목|건설|산업|재료|신소재|금속|자동차|로봇|항공|우주|선박|조선|반도체|에너지|화공|컴퓨터|소프트웨어|데이터|ai|인공지능|ict|정보통신|통신|네트워크|전산|시스템)/i.test(v)
  ) {
    return "공대";
  }
  if (
    ["화학", "바이오", "수학/통계", "물리", "지구/환경과학"].includes(v) ||
    /(화학|생명|바이오|자연|물리|수학|통계|지구|천문|환경과학)/.test(v)
  ) {
    return "자연대";
  }
  if (["문과"].includes(v) || /(문과|인문|사회|상경|경영|법)/.test(v)) return "비이공계";
  return "기타";
}

function normalizeText(v: string): string {
  return v.toLowerCase().replace(/\s+/g, "");
}

function universityType(university: string): UniversityType | null {
  const v = university.trim();
  if (!v) return null;
  const n = normalizeText(v);

  // 본캠 분류보다 분캠/지역캠퍼스 예외를 먼저 처리
  if ((n.includes("고려") || n.includes("korea")) && (n.includes("세종") || n.includes("sejong"))) return "지방권";
  if ((n.includes("연세") || n.includes("yonsei")) && (n.includes("미래") || n.includes("원주") || n.includes("mirai"))) return "지방권";
  if ((n.includes("한양") || n.includes("hanyang")) && (n.includes("에리카") || n.includes("erica"))) return "경기도권";
  if ((n.includes("외대") || n.includes("hufs")) && (n.includes("글로벌") || n.includes("global"))) return "경기도권";
  if ((n.includes("중앙") || n.includes("chungang")) && n.includes("안성")) return "경기도권";
  if ((n.includes("단국") || n.includes("dankook")) && n.includes("죽전")) return "경기도권";
  if ((n.includes("단국") || n.includes("dankook")) && (n.includes("천안") || n.includes("cheonan"))) return "지방권";
  if ((n.includes("성균관") || n.includes("sungkyunkwan")) && (n.includes("자연") || n.includes("수원"))) return "경기도권";

  if (LOCAL_CAMPUS_KEYWORDS.some((k) => n.includes(normalizeText(k)))) return "지방권";
  if (SOG_KEYWORDS.some((k) => n.includes(normalizeText(k)))) return "서/연/고";
  if (SSH_KEYWORDS.some((k) => n.includes(normalizeText(k)))) return "서/성/한";
  if (CGHS_KEYWORDS.some((k) => n.includes(normalizeText(k)))) return "중/경/외/시";
  if (KDHIS_KEYWORDS.some((k) => n.includes(normalizeText(k)))) return "건/동/홍/이/숙";
  if (KSSD_KEYWORDS.some((k) => n.includes(normalizeText(k)))) return "국/숭/세/단";
  if (GYEONGGI_KEYWORDS.some((k) => n.includes(normalizeText(k)))) return "경기도권";
  return "지방권";
}

function questionCategory(question: string): QuestionCategory {
  const q = question.toLowerCase();

  if (/난이도|어렵|difficulty|examinfo/.test(q)) return "시험 난이도";
  if (/합격|가능성|pass/.test(q)) return "합격 가능성";
  if (/비용|수강료|가격|할인|환불|price/.test(q)) return "비용";
  if (/준비기간|기간|prep/.test(q)) return "준비기간";
  if (/병행|직장|시간|working/.test(q)) return "병행 가능 여부";
  if (/커리|강의|로드맵|curriculum/.test(q)) return "커리큘럼";

  return "기타";
}

function questionCategoriesFromInput(question: string): QuestionCategory[] {
  const normalized = question.trim();
  if (!normalized) return [];

  const entries = normalized.includes("|")
    ? normalized.split("|").map((item) => item.trim()).filter(Boolean)
    : [normalized];

  const unique = new Set<QuestionCategory>();
  entries.forEach((entry) => unique.add(questionCategory(entry)));
  return [...unique];
}

function regionLabel(address: string): string {
  if (address.includes("서울")) return "서울";
  if (address.includes("경기")) return "경기";
  if (address.includes("인천")) return "인천";
  if (address.includes("부산")) return "부산";
  if (!address.trim()) return "미입력";
  return "기타";
}

function dateRangeLabel(records: CounselingRecord[]): string {
  const parsed = records.map((r) => parseDate(r.date)).filter((d): d is Date => Boolean(d));
  if (parsed.length === 0) return "데이터 없음";
  const sorted = [...parsed].sort((a, b) => a.getTime() - b.getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const fmt = (d: Date) => `${d.getFullYear()}.${`${d.getMonth() + 1}`.padStart(2, "0")}.${`${d.getDate()}`.padStart(2, "0")}`;
  return `${fmt(first)} ~ ${fmt(last)}`;
}

function parseInputDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseRecordDate(value: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return parseInputDate(value);
  const parsed = parseDate(value);
  if (!parsed) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function quarterOptionsFromRecords(rows: CounselingRecord[]): Array<{ key: string; label: string; start: string; end: string; count: number }> {
  const bucket = new Map<string, { year: number; quarter: number; start: Date; end: Date; count: number }>();
  rows.forEach((r) => {
    const d = parseRecordDate(r.date);
    if (!d) return;
    const year = d.getFullYear();
    const quarter = Math.floor(d.getMonth() / 3) + 1;
    const key = `${year}-Q${quarter}`;
    const start = new Date(year, (quarter - 1) * 3, 1);
    const end = new Date(year, (quarter - 1) * 3 + 3, 0);
    const item = bucket.get(key) ?? { year, quarter, start, end, count: 0 };
    item.count += 1;
    bucket.set(key, item);
  });

  return [...bucket.entries()]
    .sort((a, b) => b[1].start.getTime() - a[1].start.getTime())
    .map(([key, v]) => ({
      key,
      label: `${v.year}년 ${v.quarter}분기 (${v.count}건)`,
      start: formatDateInput(v.start),
      end: formatDateInput(v.end),
      count: v.count,
    }));
}

function metricSnapshot(rows: CounselingRecord[]) {
  const total = rows.length;
  const age20to25Rate = toPercent(rows.filter((r) => r.age_group === "20~24").length, total);
  const age25to29Rate = toPercent(rows.filter((r) => r.age_group === "25~29").length, total);
  const prep2yRate = toPercent(
    rows.filter((r) => {
      const months = prepMonths(r.prep_period) ?? 0;
      return months >= 24;
    }).length,
    total
  );
  const stemRate = toPercent(
    rows.filter((r) => {
      const f = majorFamily(r.major);
      return f === "공대" || f === "자연대";
    }).length,
    total
  );
  const engineeringRate = toPercent(rows.filter((r) => majorFamily(r.major) === "공대").length, total);
  const scienceRate = toPercent(rows.filter((r) => majorFamily(r.major) === "자연대").length, total);

  return { total, age20to25Rate, age25to29Rate, prep2yRate, stemRate, engineeringRate, scienceRate };
}

export default function AnalysisPage() {
  const { records } = useRecords();
  const quarterOptions = useMemo(() => quarterOptionsFromRecords(records), [records]);
  const [periodPreset, setPeriodPreset] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [compareMode, setCompareMode] = useState<"previous" | "quarter" | "date">("previous");
  const [compareQuarterKey, setCompareQuarterKey] = useState<string>("");
  const [compareEndDate, setCompareEndDate] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<"all" | CounselingInput["visit_source"]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CounselingInput["status"]>("all");
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    setChartsReady(true);
  }, []);

  useEffect(() => {
    if (!quarterOptions.length) {
      if (compareQuarterKey) setCompareQuarterKey("");
      return;
    }
    if (!quarterOptions.some((q) => q.key === compareQuarterKey)) {
      setCompareQuarterKey(quarterOptions[0].key);
    }
  }, [quarterOptions, compareQuarterKey]);

  useEffect(() => {
    if (periodPreset === "all" || periodPreset === "custom") return;
    if (!quarterOptions.some((q) => q.key === periodPreset)) {
      setPeriodPreset("all");
      setStartDate("");
      setEndDate("");
    }
  }, [periodPreset, quarterOptions]);

  const dateWindow = useMemo(() => {
    if (periodPreset === "all") return { start: null as Date | null, end: null as Date | null, days: null as number | null };
    let start = parseInputDate(startDate);
    let end = parseInputDate(endDate);
    if (start && end && start.getTime() > end.getTime()) {
      [start, end] = [end, start];
    }
    const days = start && end ? Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1 : null;
    return { start, end, days };
  }, [periodPreset, startDate, endDate]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (sourceFilter !== "all" && r.visit_source !== sourceFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!dateWindow.start && !dateWindow.end) return true;
      const d = parseRecordDate(r.date);
      if (!d) return false;
      if (dateWindow.start && d.getTime() < dateWindow.start.getTime()) return false;
      if (dateWindow.end && d.getTime() > dateWindow.end.getTime()) return false;
      return true;
    });
  }, [records, dateWindow.start, dateWindow.end, sourceFilter, statusFilter]);

  const comparisonWindow = useMemo(() => {
    if (periodPreset === "all") return null;
    if (!dateWindow.start || !dateWindow.days) return null;

    if (compareMode === "quarter") {
      const selected = quarterOptions.find((q) => q.key === compareQuarterKey);
      if (!selected) return null;
      const start = parseInputDate(selected.start);
      const end = parseInputDate(selected.end);
      if (!start || !end) return null;
      return { start, end };
    }

    if (compareMode === "date") {
      const end = parseInputDate(compareEndDate);
      if (!end) return null;
      const start = new Date(end);
      start.setDate(start.getDate() - (dateWindow.days - 1));
      return { start, end };
    }

    const end = new Date(dateWindow.start);
    end.setDate(end.getDate() - 1);

    const start = new Date(end);
    start.setDate(start.getDate() - (dateWindow.days - 1));

    return { start, end };
  }, [periodPreset, dateWindow.start, dateWindow.days, compareMode, compareQuarterKey, compareEndDate, quarterOptions]);

  const previousFilteredRecords = useMemo(() => {
    if (!comparisonWindow) return [] as CounselingRecord[];

    return records.filter((r) => {
      if (sourceFilter !== "all" && r.visit_source !== sourceFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      const d = parseRecordDate(r.date);
      if (!d) return false;
      return d.getTime() >= comparisonWindow.start.getTime() && d.getTime() <= comparisonWindow.end.getTime();
    });
  }, [records, comparisonWindow, sourceFilter, statusFilter]);

  const data = useMemo(() => {
    const total = filteredRecords.length;
    const englishCount = filteredRecords.filter((r) => Boolean(r.english_level)).length;
    const validPhoneCount = filteredRecords.filter((r) => isPhoneValid(r.phone)).length;
    const missingUniversityCount = filteredRecords.filter((r) => !r.university.trim()).length;
    const missingAddressCount = filteredRecords.filter((r) => !r.address.trim()).length;
    const missingPrepCount = filteredRecords.filter((r) => !prepMonths(r.prep_period)).length;
    const missingQuestionCount = filteredRecords.filter((r) => !r.questions.trim()).length;
    const invalidPhoneCount = total - validPhoneCount;

    const avgAge = total ? filteredRecords.reduce((acc, r) => acc + ageMidpoint(r.age_group), 0) / total : 0;
    const prepValues = filteredRecords.map((r) => prepMonths(r.prep_period)).filter((n): n is number => n !== null);
    const avgPrepMonths = prepValues.length ? prepValues.reduce((a, b) => a + b, 0) / prepValues.length : 0;

    const sourceCounts = SOURCES.map((source) => ({ source, value: filteredRecords.filter((r) => r.visit_source === source).length }));

    const sourceAge = SOURCES.map((source) => ({ source, row: AGE_BUCKETS.map(() => 0) }));
    const sourcePrep = SOURCES.map((source) => ({ source, row: PREP_BUCKETS.map(() => 0) }));

    filteredRecords.forEach((r) => {
      const sIdx = SOURCES.indexOf(r.visit_source);
      if (sIdx >= 0) {
        const bIdx = AGE_BUCKETS.indexOf(r.age_group);
        if (bIdx >= 0) sourceAge[sIdx].row[bIdx] += 1;

        const pIdx = PREP_BUCKETS.indexOf(prepBucket(r.prep_period));
        sourcePrep[sIdx].row[pIdx] += 1;
      }
    });

    const regionMap = new Map<string, number>();
    filteredRecords.forEach((r) => {
      const region = regionLabel(r.address);
      regionMap.set(region, (regionMap.get(region) ?? 0) + 1);
    });
    const regionRows = [...regionMap.entries()].map(([region, value]) => ({ region, value })).sort((a, b) => b.value - a.value);

    const metroCount = filteredRecords.filter((r) => {
      const region = regionLabel(r.address);
      return region === "서울" || region === "경기" || region === "인천";
    }).length;
    const localCount = total - metroCount;

    const ageDist = AGE_BUCKETS.map((bucket) => ({ bucket, value: 0 }));
    filteredRecords.forEach((r) => {
      const idx = AGE_BUCKETS.indexOf(r.age_group);
      if (idx >= 0) ageDist[idx].value += 1;
    });

    const agePrep = AGE_BUCKETS.map((bucket) => ({ bucket, row: PREP_BUCKETS.map(() => 0) }));
    filteredRecords.forEach((r) => {
      const pIdx = PREP_BUCKETS.indexOf(prepBucket(r.prep_period));
      const aIdx = AGE_BUCKETS.indexOf(r.age_group);
      if (aIdx >= 0) agePrep[aIdx].row[pIdx] += 1;
    });

    const genderCounts = GENDERS.map((g) => ({ gender: g, value: filteredRecords.filter((r) => r.gender === g).length }));

    const genderAge = GENDERS.map((g) => ({
      gender: g,
      row: AGE_BUCKETS.map((age) => filteredRecords.filter((r) => r.gender === g && r.age_group === age).length),
    }));

    const genderAgeDetailRows = GENDERS.flatMap((g, gIdx) =>
      AGE_BUCKETS.map((age, aIdx) => {
        const count = genderAge[gIdx].row[aIdx];
        const genderTotal = genderCounts[gIdx].value;
        return {
          gender: g,
          age,
          count,
          overallShare: toPercent(count, total),
          withinGenderShare: toPercent(count, genderTotal),
        };
      })
    ).sort((a, b) => b.count - a.count);

    const genderMajor = GENDERS.map((g) => ({
      gender: g,
      row: MAJOR_FAMILIES.map((m) => filteredRecords.filter((r) => r.gender === g && majorFamily(r.major) === m).length),
    }));

    const genderEnglish = GENDERS.map((g) => {
      const group = filteredRecords.filter((r) => r.gender === g);
      const hasEnglish = group.filter((r) => Boolean(r.english_level)).length;
      return { gender: g, total: group.length, rate: toPercent(hasEnglish, group.length) };
    });

    const univTyped = filteredRecords
      .map((r) => universityType(r.university))
      .filter((v): v is UniversityType => v !== null);
    const univTypedTotal = univTyped.length;
    const univTypeRows = UNIVERSITY_TYPES.map((type) => ({
      type,
      value: univTyped.filter((v) => v === type).length,
    }));

    const univMap = new Map<string, CounselingRecord[]>();
    filteredRecords.forEach((r) => {
      const key = r.university.trim() || "미입력";
      const list = univMap.get(key) ?? [];
      list.push(r);
      univMap.set(key, list);
    });

    const universityRows = [...univMap.entries()]
      .map(([university, list]) => ({ university, total: list.length }))
      .sort((a, b) => b.total - a.total);

    const majorMap = new Map<string, CounselingRecord[]>();
    filteredRecords.forEach((r) => {
      const key = r.major.trim() || "미입력";
      const list = majorMap.get(key) ?? [];
      list.push(r);
      majorMap.set(key, list);
    });

    const topMajorRows = [...majorMap.entries()]
      .map(([major, list]) => ({ major, total: list.length }))
      .sort((a, b) => b.total - a.total);

    const top3Concentration = toPercent(
      universityRows.slice(0, 3).reduce((acc, row) => acc + row.total, 0),
      total
    );

    const gradeCategories = ["1학년", "2학년", "3학년", "4학년", "졸업생", "기타"] as const;
    const gradeRows = gradeCategories.map((label) => {
      const count = filteredRecords.filter((r) => {
        if (label === "졸업생") return r.status === "졸업";
        if (label === "기타") return r.status !== "졸업" && !["1학년", "2학년", "3학년", "4학년"].includes(r.grade);
        return r.grade === label;
      }).length;
      return { label, value: count };
    });

    const majorFamilyRows = MAJOR_FAMILIES.map((family) => ({
      family,
      value: filteredRecords.filter((r) => majorFamily(r.major) === family).length,
    }));

    const stemCount = filteredRecords.filter((r) => {
      const f = majorFamily(r.major);
      return f === "공대" || f === "자연대";
    }).length;

    const majorPrep = MAJOR_FAMILIES.map((family) => ({
      family,
      row: PREP_BUCKETS.map((b) => filteredRecords.filter((r) => majorFamily(r.major) === family && prepBucket(r.prep_period) === b).length),
    }));

    const majorGenderPrepMap = new Map<string, { major: string; gender: CounselingInput["gender"]; prep: PrepBucket; count: number }>();
    filteredRecords.forEach((r) => {
      const major = r.major.trim() || "미입력";
      const prep = prepBucket(r.prep_period);
      const key = `${major}__${r.gender}__${prep}`;
      const item = majorGenderPrepMap.get(key) ?? { major, gender: r.gender, prep, count: 0 };
      item.count += 1;
      majorGenderPrepMap.set(key, item);
    });
    const majorGenderPrepRows = [...majorGenderPrepMap.values()]
      .sort((a, b) => b.count - a.count)
      .map((row) => ({ ...row, share: toPercent(row.count, total) }));

    const prepRows = PREP_BUCKETS.map((bucket) => ({ value: bucket, count: filteredRecords.filter((r) => prepBucket(r.prep_period) === bucket).length }));

    const minuteRows = [30, 40, 50, 60].map((minute) => ({ minute, value: filteredRecords.filter((r) => r.counsel_minutes === minute).length }));

    const weekdayRows = WEEKDAY_LABELS.map((day, i) => ({
      day,
      value: filteredRecords.filter((r) => {
        const d = parseDate(r.date);
        return d ? d.getDay() === i : false;
      }).length,
    }));

    const questionCountMap = new Map<QuestionCategory, number>(QUESTION_CATEGORIES.map((category) => [category, 0]));
    filteredRecords.forEach((r) => {
      const categories = questionCategoriesFromInput(r.questions);
      categories.forEach((category) => {
        questionCountMap.set(category, (questionCountMap.get(category) ?? 0) + 1);
      });
    });
    const questionCategoryRows = QUESTION_CATEGORIES.map((category) => ({
      category,
      value: questionCountMap.get(category) ?? 0,
    })).sort((a, b) => b.value - a.value);

    const byMonth = new Map<string, number>();
    filteredRecords.forEach((r) => {
      const d = parseDate(r.date);
      if (!d) return;
      const key = monthKey(d);
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    });
    const monthRows = [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => ({ label: monthLabel(key), value }));

    const idealCandidates = filteredRecords.filter((r) => {
      const family = majorFamily(r.major);
      const months = prepMonths(r.prep_period) ?? 0;
      const ageOk = r.age_group === "20~24" || r.age_group === "25~29";
      const schoolOk = universityType(r.university) === "서/연/고";
      return ageOk && family === "공대" && Boolean(r.english_level) && months >= 24 && schoolOk;
    });

    return {
      total,
      validPhoneCount,
      englishCount,
      missingUniversityCount,
      missingAddressCount,
      missingPrepCount,
      missingQuestionCount,
      invalidPhoneCount,
      avgAge,
      avgPrepMonths,
      sourceCounts,
      sourceAge,
      sourcePrep,
      regionRows,
      metroCount,
      localCount,
      ageDist,
      agePrep,
      genderCounts,
      genderAge,
      genderAgeDetailRows,
      genderMajor,
      genderEnglish,
      univTypeRows,
      univTypedTotal,
      top3Concentration,
      universityRows,
      topMajorRows,
      gradeRows,
      majorFamilyRows,
      stemCount,
      majorPrep,
      majorGenderPrepRows,
      prepRows,
      minuteRows,
      weekdayRows,
      questionCategoryRows,
      monthRows,
      idealCandidates,
    };
  }, [filteredRecords]);

  const currentSnapshot = useMemo(() => metricSnapshot(filteredRecords), [filteredRecords]);
  const previousSnapshot = useMemo(() => metricSnapshot(previousFilteredRecords), [previousFilteredRecords]);
  const hasPreviousWindow = Boolean(comparisonWindow);

  const comparisonLabel = useMemo(() => {
    if (!comparisonWindow) return "비교 기준 없음";
    const fmt = (d: Date) => `${d.getFullYear()}.${`${d.getMonth() + 1}`.padStart(2, "0")}.${`${d.getDate()}`.padStart(2, "0")}`;
    if (compareMode === "quarter") {
      const selected = quarterOptions.find((q) => q.key === compareQuarterKey);
      return selected ? `비교: ${selected.label}` : `비교: ${fmt(comparisonWindow.start)} ~ ${fmt(comparisonWindow.end)}`;
    }
    if (compareMode === "date") {
      return `비교: 기준 종료일 ${fmt(comparisonWindow.end)} (동일 기간)`;
    }
    return `비교: 직전 동일 기간 (${fmt(comparisonWindow.start)} ~ ${fmt(comparisonWindow.end)})`;
  }, [comparisonWindow, compareMode, compareQuarterKey, quarterOptions]);

  const changeSignals = useMemo(() => {
    if (!hasPreviousWindow) {
      return {
        totalDelta: null as number | null,
        age20to25Delta: null as number | null,
        age25to29Delta: null as number | null,
        prep2yDelta: null as number | null,
        stemDelta: null as number | null,
        engineeringDelta: null as number | null,
        scienceDelta: null as number | null,
      };
    }

    return {
      totalDelta: currentSnapshot.total - previousSnapshot.total,
      age20to25Delta: currentSnapshot.age20to25Rate - previousSnapshot.age20to25Rate,
      age25to29Delta: currentSnapshot.age25to29Rate - previousSnapshot.age25to29Rate,
      prep2yDelta: currentSnapshot.prep2yRate - previousSnapshot.prep2yRate,
      stemDelta: currentSnapshot.stemRate - previousSnapshot.stemRate,
      engineeringDelta: currentSnapshot.engineeringRate - previousSnapshot.engineeringRate,
      scienceDelta: currentSnapshot.scienceRate - previousSnapshot.scienceRate,
    };
  }, [currentSnapshot, previousSnapshot, hasPreviousWindow]);

  const advanced = useMemo(() => {
    const isIdeal = (r: CounselingRecord) => {
      const family = majorFamily(r.major);
      const months = prepMonths(r.prep_period) ?? 0;
      const ageOk = r.age_group === "20~24" || r.age_group === "25~29";
      const schoolOk = universityType(r.university) === "서/연/고";
      return ageOk && family === "공대" && Boolean(r.english_level) && months >= 24 && schoolOk;
    };
    const channelComposite = SOURCES.map((source) => {
      const group = filteredRecords.filter((r) => r.visit_source === source);
      const total = group.length;
      const share = toPercent(total, filteredRecords.length);
      const englishRate = toPercent(group.filter((r) => Boolean(r.english_level)).length, total);
      const prep2yRate = toPercent(group.filter((r) => (prepMonths(r.prep_period) ?? 0) >= 24).length, total);
      const stemRate = toPercent(
        group.filter((r) => {
          const f = majorFamily(r.major);
          return f === "공대" || f === "자연대";
        }).length,
        total
      );
      return { source, total, share, englishRate, prep2yRate, stemRate };
    }).sort((a, b) => b.total - a.total);

    const overlapMap = new Map<string, { source: string; age: CounselingInput["age_group"]; prep: PrepBucket; count: number }>();
    filteredRecords.forEach((r) => {
      const prep = prepBucket(r.prep_period);
      const key = `${r.visit_source}__${r.age_group}__${prep}`;
      const item = overlapMap.get(key) ?? { source: r.visit_source, age: r.age_group, prep, count: 0 };
      item.count += 1;
      overlapMap.set(key, item);
    });
    const overlapTop = [...overlapMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((x) => ({ ...x, share: toPercent(x.count, filteredRecords.length) }));

    const weekdayEfficiency = WEEKDAY_LABELS.map((day, i) => {
      const group = filteredRecords.filter((r) => {
        const d = parseDate(r.date);
        return d ? d.getDay() === i : false;
      });
      const total = group.length;
      return { day, total };
    });

    const univActionRows = UNIVERSITY_TYPES.map((type) => {
      const group = filteredRecords.filter((r) => universityType(r.university) === type);
      const total = group.length;
      const share = toPercent(total, filteredRecords.length);
      const englishRate = toPercent(group.filter((r) => Boolean(r.english_level)).length, total);
      const prep2yRate = toPercent(group.filter((r) => (prepMonths(r.prep_period) ?? 0) >= 24).length, total);
      const idealRate = toPercent(group.filter(isIdeal).length, total);
      return { type, total, share, englishRate, prep2yRate, idealRate };
    })
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total);

    const idealBySource = SOURCES.map((source) => {
      const group = filteredRecords.filter((r) => r.visit_source === source);
      const total = group.length;
      const idealCount = group.filter(isIdeal).length;
      return { source, total, idealCount, idealRate: toPercent(idealCount, total) };
    }).sort((a, b) => b.idealCount - a.idealCount);

    const topChannel = channelComposite[0] ?? null;
    const topWeekday = [...weekdayEfficiency].sort((a, b) => b.total - a.total)[0] ?? null;
    const focusUnivType =
      [...univActionRows].filter((x) => x.total >= 3).sort((a, b) => b.idealRate - a.idealRate)[0] ??
      univActionRows[0] ??
      null;

    return {
      channelComposite,
      overlapTop,
      weekdayEfficiency,
      univActionRows,
      idealBySource,
      topChannel,
      topWeekday,
      focusUnivType,
    };
  }, [filteredRecords]);

  const maxMajor = Math.max(1, ...data.majorFamilyRows.map((x) => x.value));
  const maxPrep = Math.max(1, ...data.prepRows.map((x) => x.count));
  const maxIdealBySource = Math.max(1, ...advanced.idealBySource.map((x) => x.idealCount));
  const totalWeekdayCount = advanced.weekdayEfficiency.reduce((sum, item) => sum + item.total, 0);
  const maxWeekdayCount = Math.max(1, ...advanced.weekdayEfficiency.map((item) => item.total));
  const maxGenderAgeCombo = Math.max(1, ...data.genderAgeDetailRows.map((x) => x.count));
  const maxUnivType = Math.max(1, ...data.univTypeRows.map((x) => x.value));
  const maxGrade = Math.max(1, ...data.gradeRows.map((x) => x.value));
  const maxTopMajor = Math.max(1, ...data.topMajorRows.map((x) => x.total));
  const maxMinute = Math.max(1, ...data.minuteRows.map((x) => x.value));
  const maxWeekdayRows = Math.max(1, ...data.weekdayRows.map((x) => x.value));

  const englishRate = toPercent(data.englishCount, data.total);
  const maleCount = data.genderCounts.find((g) => g.gender === "남")?.value ?? 0;
  const femaleCount = data.genderCounts.find((g) => g.gender === "여")?.value ?? 0;
  const maleRate = toPercent(maleCount, data.total);
  const femaleRate = toPercent(femaleCount, data.total);
  const prep2yRate = toPercent(
    data.prepRows.filter((r) => r.value === "2년 내외" || r.value === "3년 이상").reduce((acc, r) => acc + r.count, 0),
    data.total
  );
  const stemRate = toPercent(data.stemCount, data.total);
  const idealCandidateRate = toPercent(data.idealCandidates.length, data.total);

  const deltaLabel = (delta: number | null, suffix: string) => {
    if (delta === null) return "전체 기간은 비교 없음";
    if (delta === 0) return `이전 대비 변동 없음`;
    const prefix = delta > 0 ? "+" : "";
    return `이전 대비 ${prefix}${delta}${suffix}`;
  };

  const deltaTone = (delta: number | null): "up" | "down" | "flat" | "none" => {
    if (delta === null) return "none";
    if (delta > 0) return "up";
    if (delta < 0) return "down";
    return "flat";
  };

  const deltaBadgeText = (delta: number | null, suffix: string) => {
    if (delta === null) return "비교 없음";
    if (delta === 0) return "변동 없음";
    const prefix = delta > 0 ? "+" : "";
    return `${prefix}${delta}${suffix}`;
  };

  const isTopMetric = (value: number, maxValue: number) => value > 0 && value === maxValue;
  const topAgeGroup = [...data.ageDist].sort((a, b) => b.value - a.value)[0] ?? null;
  const topQuestion = data.questionCategoryRows[0] ?? null;
  const topPrepBucket = [...data.prepRows].sort((a, b) => b.count - a.count)[0] ?? null;
  const sourceChartData = data.sourceCounts.map((row, index) => ({
    name: row.source,
    상담건수: row.value,
    비중: toPercent(row.value, data.total),
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));
  const regionChartData = data.regionRows.map((row, index) => ({
    name: row.region,
    value: row.value,
    share: toPercent(row.value, data.total),
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));
  const ageChartData = data.ageDist.map((row, index) => ({
    name: row.bucket,
    인원: row.value,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));
  const questionChartData = data.questionCategoryRows.slice(0, 5).map((row, index) => ({
    name: row.category,
    건수: row.value,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));
  const monthChartData = data.monthRows.map((row) => ({
    name: row.label,
    상담건수: row.value,
  }));
  const activeFilterBadges = [
    periodPreset === "all"
      ? "전체 기간"
      : periodPreset === "custom"
        ? `직접 지정 ${startDate || "-"} ~ ${endDate || "-"}`
        : quarterOptions.find((q) => q.key === periodPreset)?.label ?? "기간 선택",
    sourceFilter === "all" ? "방문경로 전체" : `방문경로 ${sourceFilter}`,
    statusFilter === "all" ? "상황 전체" : `상황 ${statusFilter}`,
  ];

  function exportPdf() {
    const currentTitle = document.title;
    const dateTag = new Date().toISOString().slice(0, 10);
    document.title = `상담분석_${dateTag}`;
    window.print();
    window.setTimeout(() => {
      document.title = currentTitle;
    }, 400);
  }

  return (
    <main className="analysis-page">
      <motion.section
        className="analysis-hero-board no-print"
        initial="hidden"
        animate="show"
        variants={motionUp}
      >
        <div className="analysis-hero-copy">
          <p className="analysis-eyebrow">Consulting Intelligence Board</p>
          <h1>입문 상담 분석 리포트</h1>
          <p className="subtle">데이터 기간: {dateRangeLabel(filteredRecords)}</p>
          <div className="analysis-hero-badges">
            {activeFilterBadges.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className="page-switch page-switch-row">
            <Link href="/intake" className="switch-btn">입력 페이지로 이동</Link>
            <button type="button" className="switch-btn switch-btn-secondary" onClick={exportPdf}>PDF 저장</button>
          </div>
        </div>
        <div className="analysis-hero-brief">
          <motion.article className="analysis-brief-card emphasis" variants={motionUp} custom={1} initial="hidden" animate="show">
            <div className="hero-card-head">
              <span>핵심 채널</span>
              <InfoTooltip text="현재 필터 기준에서 가장 많은 상담을 만든 유입 경로입니다." />
            </div>
            <strong>{advanced.topChannel ? advanced.topChannel.source : "-"}</strong>
            <p>{advanced.topChannel ? `${advanced.topChannel.total}건 · ${advanced.topChannel.share}%` : "데이터 없음"}</p>
          </motion.article>
          <motion.article className="analysis-brief-card" variants={motionUp} custom={2} initial="hidden" animate="show">
            <div className="hero-card-head">
              <span>가장 많은 연령대</span>
              <InfoTooltip text="현재 조회 조건에서 가장 많이 분포한 연령대입니다." />
            </div>
            <strong>{topAgeGroup ? topAgeGroup.bucket : "-"}</strong>
            <p>{topAgeGroup ? `${topAgeGroup.value}건` : "데이터 없음"}</p>
          </motion.article>
          <motion.article className="analysis-brief-card" variants={motionUp} custom={3} initial="hidden" animate="show">
            <div className="hero-card-head">
              <span>대표 관심사</span>
              <InfoTooltip text="상담 내용에서 가장 자주 언급된 문의 카테고리입니다." />
            </div>
            <strong>{topQuestion ? topQuestion.category : "-"}</strong>
            <p>{topQuestion ? `${topQuestion.value}건` : "데이터 없음"}</p>
          </motion.article>
          <motion.article className="analysis-brief-card" variants={motionUp} custom={4} initial="hidden" animate="show">
            <div className="hero-card-head">
              <span>준비기간 집중</span>
              <InfoTooltip text="현재 필터 내에서 가장 많이 잡힌 준비가능기간 구간입니다." />
            </div>
            <strong>{topPrepBucket ? topPrepBucket.value : "-"}</strong>
            <p>{topPrepBucket ? `${topPrepBucket.count}건` : "데이터 없음"}</p>
          </motion.article>
        </div>
      </motion.section>

      <section className="analysis-section no-print">
        <h2>필터</h2>
        <div className="analytics-filters">
          <div>
            <label htmlFor="periodPreset">기간/분기</label>
            <select
              id="periodPreset"
              value={periodPreset}
              onChange={(e) => {
                const value = e.target.value;
                setPeriodPreset(value);

                if (value === "all") {
                  setStartDate("");
                  setEndDate("");
                  return;
                }

                if (value === "custom") {
                  if (!startDate && !endDate && quarterOptions[0]) {
                    setStartDate(quarterOptions[0].start);
                    setEndDate(quarterOptions[0].end);
                  }
                  return;
                }

                const selected = quarterOptions.find((q) => q.key === value);
                if (selected) {
                  setStartDate(selected.start);
                  setEndDate(selected.end);
                }
              }}
            >
              <option value="all">전체</option>
              <option value="custom">직접 지정</option>
              {quarterOptions.map((q) => (
                <option key={q.key} value={q.key}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="startDate">시작일</label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              disabled={periodPreset === "all"}
              onChange={(e) => {
                setPeriodPreset("custom");
                setStartDate(e.target.value);
              }}
            />
          </div>
          <div>
            <label htmlFor="endDate">종료일</label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              disabled={periodPreset === "all"}
              onChange={(e) => {
                setPeriodPreset("custom");
                setEndDate(e.target.value);
              }}
            />
          </div>
          <div>
            <label htmlFor="source">방문경로</label>
            <select id="source" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as "all" | CounselingInput["visit_source"])}>
              <option value="all">전체</option>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="status">상황</label>
            <select id="status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | CounselingInput["status"])}>
              <option value="all">전체</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="analysis-section summary-section">
        <div className="summary-head">
          <h2>상단 요약</h2>
          <p className="subtle">핵심 지표를 한 화면에서 빠르게 확인합니다.</p>
        </div>

        <div className="summary-stage">
          <article className="summary-hero">
            <div className="summary-hero-split">
              <div className="summary-hero-stat summary-hero-stat-total">
                <span className="summary-hero-label">총 상담 건수</span>
                <strong className="summary-hero-value">{data.total}</strong>
              </div>
              <div className="summary-hero-stat summary-hero-stat-candidate">
                <span className="summary-hero-label">최상위 합격 후보군 비율</span>
                <strong className="summary-hero-value">{idealCandidateRate}%</strong>
                <p className="summary-hero-mini">{data.idealCandidates.length}건</p>
              </div>
            </div>
            <p className="summary-hero-sub">데이터 기간 {dateRangeLabel(filteredRecords)}</p>
            <div className="summary-hero-tags">
              <span>남 {maleRate}%</span>
              <span>여 {femaleRate}%</span>
              <span>영어 {englishRate}%</span>
            </div>
          </article>

          <article className="summary-side-card">
            <h4>평균 연령</h4>
            <p className="summary-side-value">{data.avgAge.toFixed(1)}세</p>
          </article>

          <article className="summary-side-card">
            <h4>평균 준비기간</h4>
            <p className="summary-side-value">{data.avgPrepMonths.toFixed(1)}개월</p>
          </article>

          <article className="summary-side-card summary-ratio-card">
            <h4>남여 비율</h4>
            <div className="summary-gender-visual" aria-label={`남 ${maleRate}%, 여 ${femaleRate}%`}>
              <div className="summary-gender-track">
                <span className="male" style={{ width: `${maleRate}%` }} />
                <span className="female" style={{ width: `${femaleRate}%` }} />
              </div>
              <div className="summary-gender-legend">
                <span className="male"><i />남 {maleRate}%</span>
                <span className="female"><i />여 {femaleRate}%</span>
              </div>
            </div>
          </article>
        </div>

        <div className="summary-focus-row">
          <article className="summary-focus-item">
            <div className="summary-focus-top">
              <h4>준비기간 2년 이상 비율</h4>
              <strong>{prep2yRate}%</strong>
            </div>
            <div className="summary-focus-track"><span style={{ width: `${prep2yRate}%` }} /></div>
          </article>
          <article className="summary-focus-item">
            <div className="summary-focus-top">
              <h4>영어성적 보유 비율</h4>
              <strong>{englishRate}%</strong>
            </div>
            <div className="summary-focus-track"><span className="alt" style={{ width: `${englishRate}%` }} /></div>
          </article>
          <article className="summary-focus-item">
            <div className="summary-focus-top">
              <h4>이공계 전공 비율</h4>
              <strong>{stemRate}%</strong>
            </div>
            <div className="summary-focus-track"><span className="warm" style={{ width: `${stemRate}%` }} /></div>
          </article>
        </div>
      </section>

      <section className="analysis-section">
        <h2>기간별 지표 비교</h2>
        <div className="analytics-filters" style={{ marginBottom: 10 }}>
          <div>
            <label htmlFor="compareMode">비교 기준 설정</label>
            <select
              id="compareMode"
              value={compareMode}
              disabled={periodPreset === "all"}
              onChange={(e) => setCompareMode(e.target.value as "previous" | "quarter" | "date")}
            >
              <option value="previous">직전 동일기간</option>
              <option value="quarter">기준 분기 선택</option>
              <option value="date">기준 날짜 지정</option>
            </select>
          </div>
          <div>
            <label htmlFor="compareQuarter">비교 분기</label>
            <select
              id="compareQuarter"
              value={compareQuarterKey}
              disabled={periodPreset === "all" || compareMode !== "quarter"}
              onChange={(e) => setCompareQuarterKey(e.target.value)}
            >
              {quarterOptions.length === 0 && <option value="">데이터 분기 없음</option>}
              {quarterOptions.map((q) => (
                <option key={q.key} value={q.key}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="compareEndDate">비교 기준일(종료일)</label>
            <input
              id="compareEndDate"
              type="date"
              value={compareEndDate}
              disabled={periodPreset === "all" || compareMode !== "date"}
              onChange={(e) => setCompareEndDate(e.target.value)}
            />
          </div>
        </div>
        <p className="subtle" style={{ marginBottom: 10 }}>{comparisonLabel}</p>
        <div className="grid grid-5">
          <div className="mini-block">
            <h4>상담 건수 변화</h4>
            <p className="insight-value">{currentSnapshot.total}</p>
            <span className={`delta-pill ${deltaTone(changeSignals.totalDelta)}`}>{deltaBadgeText(changeSignals.totalDelta, "건")}</span>
            <p className="subtle">{deltaLabel(changeSignals.totalDelta, "건")}</p>
          </div>
          <div className="mini-block">
            <h4>20~24세 비율 변화</h4>
            <p className="insight-value">{currentSnapshot.age20to25Rate}%</p>
            <span className={`delta-pill ${deltaTone(changeSignals.age20to25Delta)}`}>{deltaBadgeText(changeSignals.age20to25Delta, "%p")}</span>
            <p className="subtle">{deltaLabel(changeSignals.age20to25Delta, "%p")}</p>
          </div>
          <div className="mini-block">
            <h4>25~29세 비율 변화</h4>
            <p className="insight-value">{currentSnapshot.age25to29Rate}%</p>
            <span className={`delta-pill ${deltaTone(changeSignals.age25to29Delta)}`}>{deltaBadgeText(changeSignals.age25to29Delta, "%p")}</span>
            <p className="subtle">{deltaLabel(changeSignals.age25to29Delta, "%p")}</p>
          </div>
          <div className="mini-block">
            <h4>공대 비율 변화</h4>
            <p className="insight-value">{currentSnapshot.engineeringRate}%</p>
            <span className={`delta-pill ${deltaTone(changeSignals.engineeringDelta)}`}>{deltaBadgeText(changeSignals.engineeringDelta, "%p")}</span>
            <p className="subtle">{deltaLabel(changeSignals.engineeringDelta, "%p")}</p>
            <div className="stem-major-note">
              <p>{STEM_MAJOR_LABELS.engineering.join(", ")}</p>
            </div>
          </div>
          <div className="mini-block">
            <h4>자연대 비율 변화</h4>
            <p className="insight-value">{currentSnapshot.scienceRate}%</p>
            <span className={`delta-pill ${deltaTone(changeSignals.scienceDelta)}`}>{deltaBadgeText(changeSignals.scienceDelta, "%p")}</span>
            <p className="subtle">{deltaLabel(changeSignals.scienceDelta, "%p")}</p>
            <div className="stem-major-note">
              <p>{STEM_MAJOR_LABELS.science.join(", ")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="analysis-section">
        <h2>채널 복합 인사이트</h2>
        <div className="analytics-grid">
          <article className="chart-card">
            <h3>채널 핵심지표 요약</h3>
            <div className="metric-strip">
              {advanced.channelComposite.slice(0, 3).map((row, index) => (
                <div key={row.source} className={`metric-strip-card ${index === 0 ? "primary" : ""}`}>
                  <span>{index === 0 ? "주력 채널" : `상위 ${index + 1}위`}</span>
                  <strong>{row.source}</strong>
                  <p>{row.total}건 · 비중 {row.share}%</p>
                </div>
              ))}
            </div>
            <div className="table-wrap equal-height-insight-table">
              <table>
                <thead><tr><th>채널</th><th>상담 건</th><th>비중</th><th>영어</th><th>2년+</th><th>이공계</th></tr></thead>
                <tbody>
                  {advanced.channelComposite.map((row) => (
                    <tr key={row.source}>
                      <td>{row.source}</td>
                      <td>{row.total}</td>
                      <td>{row.share}%</td>
                      <td>{row.englishRate}%</td>
                      <td>{row.prep2yRate}%</td>
                      <td>{row.stemRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="chart-card">
            <h3>3항목 교차 TOP 조합</h3>
            <div className="table-wrap equal-height-insight-table">
              <table>
                <thead><tr><th>방문경로</th><th>연령대</th><th>준비가능기간</th><th>건수</th><th>비율</th></tr></thead>
                <tbody>
                  {advanced.overlapTop.map((row) => (
                    <tr key={`${row.source}-${row.age}-${row.prep}`}>
                      <td>{row.source}</td>
                      <td>{row.age}</td>
                      <td>{row.prep}</td>
                      <td>{row.count}</td>
                      <td>{row.share}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="subtle" style={{ marginTop: 8 }}>
              기준: 방문경로 + 연령대 + 준비가능기간 조합
            </p>
          </article>

          <article className="chart-card">
            <h3>대학 클래스별 복합 지표</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>대학유형</th><th>상담 건</th><th>비중</th><th>영어</th><th>2년+</th><th>이상적후보</th></tr></thead>
                <tbody>
                  {advanced.univActionRows.map((row) => (
                    <tr key={row.type}>
                      <td>{row.type}</td>
                      <td>{row.total}</td>
                      <td>{row.share}%</td>
                      <td>{row.englishRate}%</td>
                      <td>{row.prep2yRate}%</td>
                      <td><strong>{row.idealRate}%</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="subtle" style={{ marginTop: 8 }}>
              우선 집중 유형: {advanced.focusUnivType ? `${advanced.focusUnivType.type} (이상적후보 ${advanced.focusUnivType.idealRate}%)` : "데이터 부족"}
            </p>
            <p className="subtle" style={{ marginTop: 6 }}>
              이상적후보 기준: {IDEAL_CANDIDATE_RULE}
            </p>
          </article>

          <article className="chart-card">
            <h3>최상위 후보 유입 경로</h3>
            <div className="bar-list">
              {advanced.idealBySource.map((row) => {
                const isTop = isTopMetric(row.idealCount, maxIdealBySource);
                return (
                <div key={row.source} className={`bar-item ${isTop ? "is-top" : ""}`}>
                  <div className="bar-head"><span>{row.source}</span><strong>{row.idealCount}건 ({row.idealRate}%)</strong></div>
                  <div className="bar-track"><div className={`bar-fill alt ${isTop ? "top" : ""}`} style={{ width: `${(row.idealCount / maxIdealBySource) * 100}%` }} /></div>
                </div>
              )})}
            </div>
            <p className="subtle" style={{ marginTop: 8 }}>
              상담 최다 채널: {advanced.topChannel ? `${advanced.topChannel.source} (${advanced.topChannel.share}%)` : "-"}
            </p>
          </article>
        </div>
      </section>

      <section className="analysis-section">
        <h2>방문경로 분석</h2>
        <div className="analytics-grid">
          <motion.article className="chart-card source-efficiency-card" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={motionUp}>
            <div className="weekday-card-head">
              <h3>방문경로별 상담 건수</h3>
            </div>
            <div className="chart-frame chart-frame-tall">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sourceChartData} layout="vertical" margin={{ top: 6, right: 8, left: 10, bottom: 6 }}>
                    <CartesianGrid stroke="#e5eef9" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={76} tick={{ fill: "#36567e", fontSize: 13, fontWeight: 800 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: "rgba(13, 99, 214, 0.06)" }} content={<ChartTooltipContent />} />
                    <Bar dataKey="상담건수" radius={[0, 10, 10, 0]}>
                      {sourceChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="chart-placeholder">차트 로딩 중</div>}
            </div>
          </motion.article>
          <article className="chart-card weekday-efficiency-card">
            <div className="weekday-card-head">
              <h3>요일별 방문자 통계</h3>
            </div>
            <div className="weekday-efficiency-bars">
              {advanced.weekdayEfficiency.map((row) => {
                const share = toPercent(row.total, totalWeekdayCount);
                const width = row.total === 0 ? 0 : Math.max(14, Math.round((row.total / maxWeekdayCount) * 100));
                const isPeak = row.total > 0 && row.total === maxWeekdayCount;

                return (
                  <div key={row.day} className={`weekday-efficiency-row ${isPeak ? "is-peak" : ""}`}>
                    <div className="weekday-efficiency-label">{row.day}요일</div>
                    <div className="weekday-efficiency-track">
                      <div className={`weekday-efficiency-fill ${isPeak ? "peak" : ""}`} style={{ width: `${width}%` }} />
                    </div>
                    <div className="weekday-efficiency-meta">
                      <strong>{row.total}건</strong>
                      <span>{share}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
          <article className="chart-card">
            <h3>방문경로 × 연령대</h3>
            <div className="table-wrap source-cross-table">
              <table>
                <thead><tr><th>방문경로</th>{AGE_BUCKETS.map((b) => <th key={b}>{b}</th>)}</tr></thead>
                <tbody>
                  {data.sourceAge.map((line) => (
                    <tr key={line.source}><td>{line.source}</td>{line.row.map((v, i) => <td key={`${line.source}-${AGE_BUCKETS[i]}`}>{v}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
          <article className="chart-card">
            <h3>방문경로 × 준비가능기간</h3>
            <div className="table-wrap source-cross-table">
              <table>
                <thead><tr><th>방문경로</th>{PREP_BUCKETS.map((b) => <th key={b}>{b}</th>)}</tr></thead>
                <tbody>
                  {data.sourcePrep.map((line) => (
                    <tr key={line.source}><td>{line.source}</td>{line.row.map((v, i) => <td key={`${line.source}-${PREP_BUCKETS[i]}`}>{Math.round(v)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>

      <section className="analysis-section">
        <h2>지역 분석</h2>
        <div className="analytics-grid">
          <motion.article className="chart-card" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={motionUp}>
            <h3>지역별 상담 비율</h3>
            <div className="chart-frame chart-frame-donut">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={regionChartData} dataKey="value" nameKey="name" innerRadius={72} outerRadius={108} paddingAngle={3}>
                      {regionChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="chart-placeholder">차트 로딩 중</div>}
            </div>
            <div className="chart-legend-grid">
              {regionChartData.map((row) => (
                <div key={row.name} className="chart-legend-item">
                  <span><i style={{ background: row.fill }} />{row.name}</span>
                  <strong>{row.share}%</strong>
                </div>
              ))}
            </div>
          </motion.article>
          <article className="chart-card region-split-section">
            <h3>수도권 vs 지방</h3>
            <div className="region-split-grid">
              <div className="mini-block region-split-card metro">
                <h4>수도권</h4>
                <p className="insight-value">{toPercent(data.metroCount, data.total)}%</p>
                <p className="subtle">{data.metroCount}건</p>
              </div>
              <div className="mini-block region-split-card local">
                <h4>지방</h4>
                <p className="insight-value">{toPercent(data.localCount, data.total)}%</p>
                <p className="subtle">{data.localCount}건</p>
              </div>
            </div>
            <div className="region-balance-track" aria-label="수도권과 지방 비율">
              <span className="metro" style={{ width: `${toPercent(data.metroCount, data.total)}%` }} />
              <span className="local" style={{ width: `${toPercent(data.localCount, data.total)}%` }} />
            </div>
            <p className="subtle region-balance-caption">
              수도권 {toPercent(data.metroCount, data.total)}% · 지방 {toPercent(data.localCount, data.total)}%
            </p>
          </article>
        </div>
      </section>

      <section className="analysis-section demographic-section">
        <h2>연령 / 성별 구조별 분포</h2>
        <div className="analytics-grid">
          <motion.article className="chart-card" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={motionUp}>
            <h3>연령대 분포</h3>
            <div className="chart-frame chart-frame-mid">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageChartData} margin={{ top: 10, right: 8, left: 4, bottom: 4 }}>
                    <CartesianGrid stroke="#e5eef9" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#36567e", fontSize: 13, fontWeight: 800 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: "#6a83a5", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="인원" radius={[10, 10, 0, 0]}>
                      {ageChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="chart-placeholder">차트 로딩 중</div>}
            </div>
          </motion.article>
          <article className="chart-card">
            <h3>연령대 × 준비가능기간</h3>
            <div className="table-wrap demographic-table">
              <table>
                <thead><tr><th>연령대</th>{PREP_BUCKETS.map((b) => <th key={b}>{b}</th>)}</tr></thead>
                <tbody>
                  {data.agePrep.map((row) => (
                    <tr key={row.bucket}><td>{row.bucket}</td>{row.row.map((v, i) => <td key={`${row.bucket}-${PREP_BUCKETS[i]}`}>{v}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
          <article className="chart-card">
            <h3>성비 / 성별 × 영어성적 보유율</h3>
            <div className="demographic-gender-grid">
              {data.genderCounts.map((g) => (
                <div key={g.gender} className={`mini-block demographic-gender-card ${g.gender === "남" ? "male" : "female"}`}>
                  <h4>{g.gender}</h4>
                  <p className="insight-value">{toPercent(g.value, data.total)}%</p>
                  <p className="subtle">{g.value}건</p>
                </div>
              ))}
            </div>
            <div className="table-wrap demographic-table demographic-gap">
              <table>
                <thead><tr><th>성별</th><th>상담 건</th><th>영어 보유율</th></tr></thead>
                <tbody>
                  {data.genderEnglish.map((g) => (
                    <tr key={g.gender}><td>{g.gender}</td><td>{g.total}</td><td>{g.rate}%</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
          <article className="chart-card">
            <h3>성별 × 전공 계열</h3>
            <div className="table-wrap demographic-table">
              <table>
                <thead><tr><th>성별</th>{MAJOR_FAMILIES.map((m) => <th key={m}>{m}</th>)}</tr></thead>
                <tbody>
                  {data.genderMajor.map((g) => (
                    <tr key={g.gender}><td>{g.gender}</td>{g.row.map((v, i) => <td key={`${g.gender}-${MAJOR_FAMILIES[i]}`}>{v}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
          <article className="chart-card">
            <h3>성별 × 연령대 분포</h3>
            <div className="table-wrap demographic-table">
              <table>
                <thead><tr><th>성별</th>{AGE_BUCKETS.map((age) => <th key={age}>{age}</th>)}</tr></thead>
                <tbody>
                  {data.genderAge.map((g) => (
                    <tr key={g.gender}><td>{g.gender}</td>{g.row.map((v, i) => <td key={`${g.gender}-${AGE_BUCKETS[i]}`}>{v}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
          <article className="chart-card">
            <h3>성별 × 연령대분포 TOP</h3>
            <div className="bar-list">
              {data.genderAgeDetailRows.slice(0, 8).map((row) => {
                const isTop = isTopMetric(row.count, maxGenderAgeCombo);
                return (
                <div key={`${row.gender}-${row.age}`} className={`bar-item ${isTop ? "is-top" : ""}`}>
                  <div className="bar-head">
                    <span>{row.gender} · {row.age}</span>
                    <strong>{row.count}건 ({row.overallShare}%)</strong>
                  </div>
                  <div className="bar-track">
                    <div className={`bar-fill alt ${isTop ? "top" : ""}`} style={{ width: `${(row.count / maxGenderAgeCombo) * 100}%` }} />
                  </div>
                  <p className="subtle">성별 내 비중 {row.withinGenderShare}%</p>
                </div>
              )})}
            </div>
          </article>
        </div>
      </section>

      <section className="analysis-section aligned-section">
        <h2>학력 / 대학 분석</h2>
        <div className="analytics-grid">
          <article className="chart-card">
            <h3>대학 유형 비율</h3>
            <div className="bar-list">
              {data.univTypeRows.map((row) => {
                const isTop = isTopMetric(row.value, maxUnivType);
                return (
                <div key={row.type} className={`bar-item ${isTop ? "is-top" : ""}`}>
                  <div className="bar-head"><span>{row.type}</span><strong>{toPercent(row.value, data.univTypedTotal)}% ({row.value}건)</strong></div>
                  <div className="bar-track"><div className={`bar-fill ${isTop ? "top" : ""}`} style={{ width: `${toPercent(row.value, data.univTypedTotal)}%` }} /></div>
                </div>
              )})}
            </div>
            <p className="subtle">상위 대학 집중도(Top 3): {data.top3Concentration}% · 대학 미입력은 비율 계산에서 제외</p>
          </article>
          <article className="chart-card">
            <h3>대학별 상담 건수</h3>
            <div className="metric-strip">
              {data.universityRows.slice(0, 3).map((row, index) => (
                <div key={row.university} className={`metric-strip-card ${index === 0 ? "primary" : ""}`}>
                  <span>{index === 0 ? "상위 대학" : `상위 ${index + 1}위`}</span>
                  <strong>{row.university}</strong>
                  <p>{row.total}건</p>
                </div>
              ))}
            </div>
            <div className="table-wrap tall-table">
              <table>
                <thead><tr><th>대학교</th><th>상담 건</th></tr></thead>
                <tbody>
                  {data.universityRows.slice(0, 20).map((row) => (
                    <tr key={row.university}><td>{row.university}</td><td>{row.total}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="subtle" style={{ marginTop: 8 }}>상위 20개 대학교 기준</p>
          </article>
          <article className="chart-card">
            <h3>학년별 상담 비율</h3>
            <div className="bar-list">
              {data.gradeRows.map((row) => {
                const isTop = isTopMetric(row.value, maxGrade);
                return (
                <div key={row.label} className={`bar-item ${isTop ? "is-top" : ""}`}>
                  <div className="bar-head"><span>{row.label}</span><strong>{toPercent(row.value, data.total)}% ({row.value}건)</strong></div>
                  <div className="bar-track"><div className={`bar-fill alt ${isTop ? "top" : ""}`} style={{ width: `${toPercent(row.value, data.total)}%` }} /></div>
                </div>
              )})}
            </div>
          </article>
          <article className="chart-card">
            <h3>상위 전공별 상담 건수</h3>
            <div className="bar-list">
              {data.topMajorRows.slice(0, 10).map((row) => {
                const isTop = isTopMetric(row.total, maxTopMajor);
                return (
                <div key={row.major} className={`bar-item ${isTop ? "is-top" : ""}`}>
                  <div className="bar-head"><span>{row.major}</span><strong>{toPercent(row.total, data.total)}% ({row.total}건)</strong></div>
                  <div className="bar-track"><div className={`bar-fill ${isTop ? "top" : ""}`} style={{ width: `${(row.total / maxTopMajor) * 100}%` }} /></div>
                </div>
              )})}
            </div>
            <p className="subtle" style={{ marginTop: 8 }}>상위 10개 전공 기준</p>
          </article>
        </div>
      </section>

      <section className="analysis-section aligned-section">
        <h2>전공 / 준비기간 분석</h2>
        <div className="analytics-grid">
          <article className="chart-card">
            <h3>전공 계열 비율</h3>
            <div className="bar-list">
              {data.majorFamilyRows.map((row) => {
                const isTop = isTopMetric(row.value, maxMajor);
                return (
                <div key={row.family} className={`bar-item ${isTop ? "is-top" : ""}`}>
                  <div className="bar-head"><span>{row.family}</span><strong>{toPercent(row.value, data.total)}% ({row.value}건)</strong></div>
                  <div className="bar-track"><div className={`bar-fill ${isTop ? "top" : ""}`} style={{ width: `${(row.value / maxMajor) * 100}%` }} /></div>
                </div>
              )})}
            </div>
          </article>
          <article className="chart-card">
            <h3>전공 × 준비가능기간</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>전공 계열</th>{PREP_BUCKETS.map((b) => <th key={b}>{b}</th>)}</tr></thead>
                <tbody>
                  {data.majorPrep.map((row) => (
                    <tr key={row.family}><td>{row.family}</td>{row.row.map((v, i) => <td key={`${row.family}-${PREP_BUCKETS[i]}`}>{v}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
          <article className="chart-card">
            <h3>전공 × 성별 × 준비가능기간</h3>
            <div className="combo-card-grid">
              {data.majorGenderPrepRows.slice(0, 8).map((row, index) => (
                <article key={`${row.major}-${row.gender}-${row.prep}`} className={`combo-card ${index === 0 ? "featured" : ""}`}>
                  <div className="combo-card-rank">#{index + 1}</div>
                  <div className="combo-card-top">
                    <h4>{row.major}</h4>
                    <div className="combo-card-meta">
                      <span className="combo-chip combo-chip-gender">{row.gender}</span>
                      <span className="combo-chip combo-chip-prep">{row.prep}</span>
                    </div>
                  </div>
                  <div className="combo-card-value">
                    <strong>{row.count}건</strong>
                    <span>{row.share}%</span>
                  </div>
                  <div className="combo-card-track">
                    <span style={{ width: `${Math.max(row.share, 8)}%` }} />
                  </div>
                </article>
              ))}
            </div>
            <p className="subtle" style={{ marginTop: 10 }}>상위 8개 조합 기준</p>
          </article>
          <article className="chart-card">
            <h3>준비가능기간 분포</h3>
            <div className="bar-list">
              {data.prepRows.map((row) => {
                const isTop = isTopMetric(row.count, maxPrep);
                return (
                <div key={row.value} className={`bar-item ${isTop ? "is-top" : ""}`}>
                  <div className="bar-head"><span>{row.value}</span><strong>{toPercent(row.count, data.total)}% ({row.count}건)</strong></div>
                  <div className="bar-track"><div className={`bar-fill warm ${isTop ? "top" : ""}`} style={{ width: `${(row.count / maxPrep) * 100}%` }} /></div>
                </div>
              )})}
            </div>
          </article>
        </div>
      </section>

      <section className="analysis-section aligned-section">
        <h2>상담시간 / 궁금한 점 분석</h2>
        <div className="analytics-grid">
          <article className="chart-card">
            <h3>상담 소요 시간</h3>
            <div className="bar-list">
              {data.minuteRows.map((row) => {
                const isTop = isTopMetric(row.value, maxMinute);
                return (
                <div key={row.minute} className={`bar-item ${isTop ? "is-top" : ""}`}>
                  <div className="bar-head"><span>{row.minute}분</span><strong>{row.value}건</strong></div>
                  <div className="bar-track"><div className={`bar-fill ${isTop ? "top" : ""}`} style={{ width: `${toPercent(row.value, data.total)}%` }} /></div>
                </div>
              )})}
            </div>
          </article>
          <article className="chart-card">
            <h3>요일별 상담 건수</h3>
            <div className="bar-list">
              {data.weekdayRows.map((row) => {
                const isTop = isTopMetric(row.value, maxWeekdayRows);
                return (
                <div key={row.day} className={`bar-item ${isTop ? "is-top" : ""}`}>
                  <div className="bar-head"><span>{row.day}</span><strong>{row.value}건</strong></div>
                  <div className="bar-track"><div className={`bar-fill alt ${isTop ? "top" : ""}`} style={{ width: `${toPercent(row.value, data.total)}%` }} /></div>
                </div>
              )})}
            </div>
          </article>
          <motion.article className="chart-card" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={motionUp}>
            <h3>상담 관심사 Top 5</h3>
            <div className="chart-frame chart-frame-tall">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={questionChartData} layout="vertical" margin={{ top: 6, right: 8, left: 18, bottom: 6 }}>
                    <CartesianGrid stroke="#e5eef9" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={108} tick={{ fill: "#36567e", fontSize: 12, fontWeight: 800 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="건수" radius={[0, 10, 10, 0]}>
                      {questionChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="chart-placeholder">차트 로딩 중</div>}
            </div>
          </motion.article>
          <motion.article className="chart-card" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={motionUp}>
            <h3>월별 상담 건수 추이</h3>
            <div className="chart-frame chart-frame-mid">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthChartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="monthAreaFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#0d63d6" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#0d63d6" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e5eef9" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#36567e", fontSize: 12, fontWeight: 800 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: "#6a83a5", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="상담건수" stroke="#0d63d6" strokeWidth={3} fill="url(#monthAreaFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div className="chart-placeholder">차트 로딩 중</div>}
            </div>
          </motion.article>
        </div>
      </section>

      <div className="only-print print-report">
        <section className="print-sheet print-sheet-1">
          <div className="print-sheet-head">
            <h2>상담 분석 리포트 (1/3) - 요약/채널</h2>
            <p>데이터 기간: {dateRangeLabel(filteredRecords)}</p>
          </div>
          <div className="print-kpi-grid">
            <div className="print-kpi"><span>총 상담 건수</span><strong>{data.total}</strong></div>
            <div className="print-kpi"><span>평균 연령</span><strong>{data.avgAge.toFixed(1)}세</strong></div>
            <div className="print-kpi"><span>평균 준비기간</span><strong>{data.avgPrepMonths.toFixed(1)}개월</strong></div>
            <div className="print-kpi"><span>영어 보유율</span><strong>{englishRate}%</strong></div>
            <div className="print-kpi"><span>2년 이상 비율</span><strong>{prep2yRate}%</strong></div>
            <div className="print-kpi"><span>이공계 비율</span><strong>{stemRate}%</strong></div>
          </div>
          <div className="print-grid-2">
            <article className="print-card">
              <h3>채널 핵심지표</h3>
              <table className="print-table">
                <thead><tr><th>채널</th><th>상담</th><th>비중</th><th>영어</th><th>2년+</th><th>이공계</th></tr></thead>
                <tbody>
                  {advanced.channelComposite.slice(0, 5).map((row) => (
                    <tr key={`print-channel-${row.source}`}>
                      <td>{row.source}</td><td>{row.total}</td><td>{row.share}%</td><td>{row.englishRate}%</td><td>{row.prep2yRate}%</td><td>{row.stemRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3 className="print-subhead">방문경로 분포</h3>
              <table className="print-table">
                <thead><tr><th>방문경로</th><th>건수</th><th>비중</th></tr></thead>
                <tbody>
                  {data.sourceCounts.slice(0, 5).map((row) => (
                    <tr key={`print-source-${row.source}`}>
                      <td>{row.source}</td><td>{row.value}</td><td>{toPercent(row.value, data.total)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
            <article className="print-card">
              <h3>최근 변화 요약</h3>
              <table className="print-table">
                <thead><tr><th>지표</th><th>현재</th><th>변화</th></tr></thead>
                <tbody>
                  <tr><td>상담 건수</td><td>{currentSnapshot.total}</td><td>{deltaBadgeText(changeSignals.totalDelta, "건")}</td></tr>
                  <tr><td>20~24세 비율 변화</td><td>{currentSnapshot.age20to25Rate}%</td><td>{deltaBadgeText(changeSignals.age20to25Delta, "%p")}</td></tr>
                  <tr><td>2년 이상 비율</td><td>{currentSnapshot.prep2yRate}%</td><td>{deltaBadgeText(changeSignals.prep2yDelta, "%p")}</td></tr>
                  <tr><td>이공계 비율</td><td>{currentSnapshot.stemRate}%</td><td>{deltaBadgeText(changeSignals.stemDelta, "%p")}</td></tr>
                </tbody>
              </table>
              <h3 className="print-subhead">3항목 교차 TOP 조합</h3>
              <table className="print-table">
                <thead><tr><th>방문경로</th><th>연령대</th><th>준비기간</th><th>건수</th><th>비율</th></tr></thead>
                <tbody>
                  {advanced.overlapTop.slice(0, 5).map((row) => (
                    <tr key={`print-overlap-page1-${row.source}-${row.age}-${row.prep}`}>
                      <td>{row.source}</td><td>{row.age}</td><td>{row.prep}</td><td>{row.count}</td><td>{row.share}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </div>
        </section>

        <section className="print-sheet print-sheet-2">
          <div className="print-sheet-head">
            <h2>상담 분석 리포트 (2/3) - 페르소나/학력</h2>
            <p>인구통계 및 대학/전공 구조</p>
          </div>
          <div className="print-grid-2">
            <article className="print-card">
              <h3>연령/성별 구조</h3>
              <table className="print-table">
                <thead><tr><th>연령대</th><th>건수</th><th>비중</th></tr></thead>
                <tbody>
                  {data.ageDist.map((row) => (
                    <tr key={`print-age-${row.bucket}`}>
                      <td>{row.bucket}</td><td>{row.value}</td><td>{toPercent(row.value, data.total)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="print-table print-mt">
                <thead><tr><th>성별</th><th>건수</th><th>영어 보유율</th></tr></thead>
                <tbody>
                  {data.genderEnglish.map((row) => (
                    <tr key={`print-gender-${row.gender}`}>
                      <td>{row.gender}</td><td>{row.total}</td><td>{row.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3 className="print-subhead">성별 × 연령대 TOP</h3>
              <table className="print-table">
                <thead><tr><th>조합</th><th>건수</th><th>전체비중</th></tr></thead>
                <tbody>
                  {data.genderAgeDetailRows.slice(0, 6).map((row) => (
                    <tr key={`print-gender-age-${row.gender}-${row.age}`}>
                      <td>{row.gender} · {row.age}</td><td>{row.count}</td><td>{row.overallShare}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
            <article className="print-card">
              <h3>대학/전공 구조</h3>
              <table className="print-table">
                <thead><tr><th>대학유형</th><th>건수</th><th>비중</th></tr></thead>
                <tbody>
                  {data.univTypeRows.map((row) => (
                    <tr key={`print-univ-type-${row.type}`}>
                      <td>{row.type}</td><td>{row.value}</td><td>{toPercent(row.value, data.univTypedTotal)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="print-table print-mt">
                <thead><tr><th>전공계열</th><th>건수</th><th>비중</th></tr></thead>
                <tbody>
                  {data.majorFamilyRows.map((row) => (
                    <tr key={`print-major-${row.family}`}>
                      <td>{row.family}</td><td>{row.value}</td><td>{toPercent(row.value, data.total)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="print-table print-mt">
                <thead><tr><th>학년/구분</th><th>건수</th><th>비중</th></tr></thead>
                <tbody>
                  {data.gradeRows.map((row) => (
                    <tr key={`print-grade-${row.label}`}>
                      <td>{row.label}</td><td>{row.value}</td><td>{toPercent(row.value, data.total)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </div>
        </section>

        <section className="print-sheet print-sheet-3">
          <div className="print-sheet-head">
            <h2>상담 분석 리포트 (3/3) - 운영/관심사/후보군</h2>
            <p>운영 효율, 상담 관심사, 최상위 후보군</p>
          </div>
          <div className="print-grid-3">
            <article className="print-card">
              <h3>준비기간 분포</h3>
              <table className="print-table">
                <thead><tr><th>구간</th><th>건수</th><th>비중</th></tr></thead>
                <tbody>
                  {data.prepRows.map((row) => (
                    <tr key={`print-prep-${row.value}`}>
                      <td>{row.value}</td><td>{row.count}</td><td>{toPercent(row.count, data.total)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3 className="print-subhead">상담시간 분포</h3>
              <table className="print-table">
                <thead><tr><th>상담시간</th><th>건수</th></tr></thead>
                <tbody>
                  {data.minuteRows.map((row) => (
                    <tr key={`print-minute-${row.minute}`}>
                      <td>{row.minute}분</td><td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
            <article className="print-card">
              <h3>요일별 상담/관심사 Top 5</h3>
              <table className="print-table">
                <thead><tr><th>요일</th><th>건수</th></tr></thead>
                <tbody>
                  {data.weekdayRows.map((row) => (
                    <tr key={`print-weekday-${row.day}`}>
                      <td>{row.day}</td><td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="print-table print-mt">
                <thead><tr><th>상담 관심사</th><th>건수</th></tr></thead>
                <tbody>
                  {data.questionCategoryRows.slice(0, 5).map((row) => (
                    <tr key={`print-question-${row.category}`}>
                      <td>{row.category}</td><td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
            <article className="print-card">
              <h3>최상위 후보군</h3>
              <table className="print-table">
                <tbody>
                  <tr><td>기준</td><td>{IDEAL_CANDIDATE_RULE}</td></tr>
                  <tr><td>비율</td><td>{toPercent(data.idealCandidates.length, data.total)}%</td></tr>
                  <tr><td>건수</td><td>{data.idealCandidates.length}건</td></tr>
                  <tr><td>연락처 유효율</td><td>{toPercent(data.validPhoneCount, data.total)}%</td></tr>
                </tbody>
              </table>
              <h3 className="print-subhead">후보군 유입원 TOP</h3>
              <table className="print-table">
                <thead><tr><th>유입원</th><th>후보군 건수</th><th>후보군 비율</th></tr></thead>
                <tbody>
                  {advanced.idealBySource.slice(0, 5).map((row) => (
                    <tr key={`print-ideal-source-${row.source}`}>
                      <td>{row.source}</td><td>{row.idealCount}</td><td>{row.idealRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </div>
          <article className="print-card print-mt">
            <h3>3항목 교차 TOP 조합</h3>
            <table className="print-table">
              <thead><tr><th>방문경로</th><th>연령대</th><th>준비가능기간</th><th>건수</th><th>비율</th></tr></thead>
              <tbody>
                {advanced.overlapTop.slice(0, 6).map((row) => (
                  <tr key={`print-overlap-${row.source}-${row.age}-${row.prep}`}>
                    <td>{row.source}</td><td>{row.age}</td><td>{row.prep}</td><td>{row.count}</td><td>{row.share}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </section>
      </div>
    </main>
  );
}
