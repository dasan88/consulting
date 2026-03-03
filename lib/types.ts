export type Gender = "남" | "여";
export type AgeGroup = "20~24" | "25~29" | "30~34" | "35~39" | "40~45";
export type Status = "대학" | "졸업" | "직장" | "기타";
export type VisitSource = "홈페이지" | "인스타그램" | "블로그" | "유튜브" | "지인추천" | "기타";

export interface CounselingRecord {
  id: string;
  date: string;
  name: string;
  academy_id: string;
  phone: string;
  visit_source: VisitSource;
  gender: Gender;
  age_group: AgeGroup;
  address: string;
  status: Status;
  university: string;
  major: string;
  grade: string;
  english_level: string;
  questions: string;
  prep_period: string;
  counsel_minutes: number;
  note: string;
  created_at: string;
}

export type CounselingInput = Omit<CounselingRecord, "id" | "created_at">;
