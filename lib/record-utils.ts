import { CounselingInput, CounselingRecord } from "@/lib/types";

export function normalizePhone(input: string): string {
  return input.replace(/[^0-9]/g, "");
}

export function toDisplayPhone(input: string): string {
  const digits = normalizePhone(input);
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return input;
}

export function requiredCheck(data: CounselingInput): string | null {
  if (!data.date) return "날짜는 필수입니다.";
  if (!data.name.trim()) return "이름은 필수입니다.";
  if (!normalizePhone(data.phone)) return "연락처는 필수입니다.";
  if (!["홈페이지", "인스타그램", "블로그", "유튜브", "지인추천", "기타"].includes(data.visit_source)) {
    return "방문경로 값이 올바르지 않습니다.";
  }
  if (!["남", "여"].includes(data.gender)) return "성별은 남/여만 가능합니다.";
  if (!["20~24", "25~29", "30~34", "35~39", "40~45"].includes(data.age_group)) {
    return "연령은 20~24, 25~29, 30~34, 35~39, 40~45만 가능합니다.";
  }
  if (!["대학", "졸업", "직장", "기타"].includes(data.status)) return "상황 값이 올바르지 않습니다.";
  if (!Number.isFinite(data.counsel_minutes) || data.counsel_minutes < 1) return "상담시간은 1분 이상이어야 합니다.";
  return null;
}

export function rowToInput(row: Record<string, unknown>): CounselingInput {
  return {
    date: String(row["날짜"] ?? "").trim(),
    name: String(row["이름"] ?? "").trim(),
    academy_id: String(row["학원아이디"] ?? "").trim(),
    phone: toDisplayPhone(String(row["연락처"] ?? "").trim()),
    visit_source: String(row["방문경로"] ?? "기타").trim() as CounselingInput["visit_source"],
    gender: String(row["성별"] ?? "남").trim() as CounselingInput["gender"],
    age_group: String(row["연령"] ?? "20~24").trim() as CounselingInput["age_group"],
    address: String(row["주소"] ?? "").trim(),
    status: String(row["상황"] ?? "대학").trim() as CounselingInput["status"],
    university: String(row["대학교"] ?? "").trim(),
    major: String(row["전공"] ?? "").trim(),
    grade: String(row["학년"] ?? "").trim(),
    english_level: String(row["영어"] ?? "").trim(),
    questions: String(row["궁금한점"] ?? "").trim(),
    prep_period: String(row["준비기간"] ?? "").trim(),
    counsel_minutes: Number(String(row["상담시간"] ?? "0").trim() || 0),
    note: String(row["비고"] ?? "").trim(),
  };
}

export function createRecord(input: CounselingInput): CounselingRecord {
  return {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...input,
    phone: toDisplayPhone(input.phone),
    name: input.name.trim(),
  };
}

export function mapCount(records: CounselingRecord[], key: keyof CounselingRecord): Array<{ label: string; value: number }> {
  const map = new Map<string, number>();
  records.forEach((item) => {
    const label = String(item[key] || "미입력");
    map.set(label, (map.get(label) || 0) + 1);
  });
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function parseDate(dateString: string): Date | null {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}
