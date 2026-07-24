import "./globals.css";

export const metadata = {
  title: "MedQuestões",
  description: "Seu banco inteligente de questões médicas"
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
