import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex flex-col items-center gap-2">
          <span className="relative mb-1 flex h-16 w-16 items-center justify-center text-4xl">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full blur-2xl"
              style={{ background: "var(--glow)" }}
            />
            <span className="relative">🐣</span>
          </span>
          <span className="font-display text-3xl font-semibold tracking-tight">
            Nestling
          </span>
          <span className="text-sm text-muted-foreground">
            A nightlight for the night feeds
          </span>
        </Link>
        {children}
      </div>
    </main>
  );
}
