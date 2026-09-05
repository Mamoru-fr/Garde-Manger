export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-card-border py-md">
        <div className="container flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary-dark">Garde-Manger</h1>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center py-lg">
        {children}
      </main>
      <footer className="text-center py-md text-sm text-muted">
        © {new Date().getFullYear()} Garde-Manger
      </footer>
    </div>
  );
}
