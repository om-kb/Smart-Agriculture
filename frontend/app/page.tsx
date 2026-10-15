export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f4e9] px-5 py-12 text-stone-900 sm:px-8">
      <section className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-white shadow-[0_24px_80px_-36px_rgba(15,71,48,0.35)]">
        <div className="grid md:grid-cols-[1.1fr_0.9fr]">
          <div className="px-7 py-12 sm:px-12 sm:py-16">
            <p className="mb-5 inline-flex rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
              Built for Indian agriculture
            </p>
            <h1 className="max-w-xl text-4xl font-bold tracking-tight text-emerald-950 sm:text-6xl">
              Smart Agriculture Advisor
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-stone-600">
              Practical farming information, clearly explained and honest about
              what it does not know.
            </p>
            <a
              href="/assistant"
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-800 px-6 py-3 font-bold text-white transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Ask the farming assistant
              <span className="ml-2" aria-hidden="true">→</span>
            </a>
            <p className="mt-4 text-sm text-stone-500">
              Rule-based guidance · No AI API · No sign-in
            </p>
          </div>
          <div className="flex flex-col justify-center bg-emerald-900 px-7 py-10 text-emerald-50 sm:px-10 md:py-14">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">
              A careful starting point
            </p>
            <ul className="mt-5 space-y-4 text-sm leading-6 sm:text-base">
              <li className="flex gap-3">
                <span aria-hidden="true">✓</span>
                Common crop, soil, irrigation, and farm-practice topics
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true">✓</span>
                Follow-up questions instead of guessing missing details
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true">✓</span>
                Conversation stored locally in this browser
              </li>
            </ul>
            <p className="mt-8 border-t border-emerald-700 pt-5 text-sm leading-6 text-emerald-100">
              General information only. For crop diagnosis, chemical use, or
              important field decisions, contact your local agricultural
              extension expert.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
