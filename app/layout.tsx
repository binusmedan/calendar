import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar Sync API",
  description: "Web API sync for Microsoft Excel to Supabase",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}

