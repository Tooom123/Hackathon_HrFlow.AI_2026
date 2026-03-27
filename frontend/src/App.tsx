function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-24">
        <div className="space-y-6">
          <span className="inline-flex rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-sm text-slate-300">
            Base frontend prete
          </span>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              React, Vite et Tailwind sont configures.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Cette page est seulement un point de depart technique pour verifier
              que le frontend demarre correctement.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
