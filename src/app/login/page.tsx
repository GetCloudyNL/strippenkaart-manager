import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        <Image
          src="/logo-vector-light-bg-green.svg"
          alt="LemonCap"
          width={168}
          height={45}
          priority
        />
        <p className="mt-4 text-sm text-muted">Log in om verder te gaan.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
