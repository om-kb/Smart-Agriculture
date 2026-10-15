import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6 py-16 text-stone-900">
      <section className="w-full max-w-3xl rounded-3xl border border-emerald-100 bg-white px-8 py-16 text-center shadow-xl sm:px-14">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
          Built for Indian agriculture
        </p>
        <h1 className="text-4xl font-bold sm:text-6xl">Smart Agriculture Advisor</h1>
        <p className="mt-5 text-lg text-stone-600 sm:text-xl">
          A simple starting point for data-driven agricultural tools.
        </p>
        <Link
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-800 px-6 py-3 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          href="/setup"
        >
          Choose your location
        </Link>
      </section>
    </main>
  );
}
