import { MotionPage } from "./motion-page";

export function RouteLoading() {
  return (
    <main className="app-screen grid place-items-center px-6">
      <MotionPage
        profile="utility"
        navigationReady={false}
        className="text-center"
      >
        <div role="status" aria-label="Memuat halaman" className="text-muted">
          <span className="motion-spinner mx-auto block h-7 w-7 rounded-full" />
          <p className="mt-3 text-sm font-medium">Memuat…</p>
        </div>
      </MotionPage>
    </main>
  );
}
