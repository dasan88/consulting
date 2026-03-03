import { CounselingInput } from "@/lib/types";

export const STORAGE_KEY = "counseling-records-v1";

export const defaultInput: CounselingInput = {
  date: "",
  name: "",
  academy_id: "",
  phone: "",
  visit_source: "기타",
  gender: "남",
  age_group: "20~24",
  address: "",
  status: "대학",
  university: "",
  major: "",
  grade: "",
  english_level: "",
  questions: "",
  prep_period: "",
  counsel_minutes: 30,
  note: "",
};

export const EXCEL_HEADERS = [
  "날짜",
  "이름",
  "학원아이디",
  "연락처",
  "방문경로",
  "성별",
  "연령",
  "주소",
  "상황",
  "대학교",
  "전공",
  "학년",
  "영어",
  "궁금한점",
  "준비기간",
  "상담시간",
  "비고",
] as const;
