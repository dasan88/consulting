import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>상담 관리 시스템</h1>
      <p className="subtle">입력과 분석을 분리해 운영하는 메인 화면</p>

      <section>
        <h2>빠른 이동</h2>
        <div className="home-links">
          <Link href="/intake" className="home-link-card">
            <h3>상담 입력 페이지</h3>
            <p>상담 등록, 엑셀 업로드/다운로드, 기록 수정/삭제</p>
          </Link>
          <Link href="/analysis" className="home-link-card">
            <h3>상담 분석 페이지</h3>
            <p>추이, 분포, 히트맵, TOP 항목, 자동 인사이트 분석</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
