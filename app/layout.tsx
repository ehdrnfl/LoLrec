import "./globals.css";

export const metadata = {
  title: "LoL 밴픽 현황",
  description: "실시간 챔피언 선택 현황",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
