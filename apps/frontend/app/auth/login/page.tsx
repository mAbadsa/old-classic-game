import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="dark-grid-bg flex flex-1 items-center justify-center p-4">
      {/* useSearchParams (for the post-login redirect target) requires a Suspense boundary. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
