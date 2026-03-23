import ThemeToggle from "@/components/ThemeToggle";

export default async function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div>
          <p className="text-lg font-semibold tracking-tight">Mini CRM</p>
          <p className="text-xs text-slate-400">Real estate pipeline + follow-up</p>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <a
            href="/login"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500 transition-all active:scale-95"
          >
            Sign in
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
              Built for agents
            </div>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Close more deals with a CRM designed for real estate pros.
            </h1>
            <p className="text-base text-slate-300 sm:text-lg">
              Track every lead, follow-up, and transaction in one place. Simple
              enough to use daily. Powerful enough to scale your brokerage.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row pt-4">
              <a
                href="/login"
                className="rounded-xl bg-blue-600 px-8 py-4 text-center text-base font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                Try Mini CRM Free
              </a>
              <a
                href="#features"
                className="rounded-xl border border-slate-700 bg-slate-900/50 px-8 py-4 text-center text-base font-semibold text-slate-200 hover:border-slate-400 hover:bg-slate-900 transition-all"
              >
                See features
              </a>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs text-slate-400">Avg. follow-up time</p>
                <p className="mt-2 text-lg font-semibold">Under 3 min</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs text-slate-400">Leads organized</p>
                <p className="mt-2 text-lg font-semibold">Pipeline view</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs text-slate-400">Team ready</p>
                <p className="mt-2 text-lg font-semibold">Roles + invites</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-slate-800/40 to-slate-950/40 blur-2xl" />
            <div className="relative rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Pipeline Snapshot</span>
                  <span>Today</span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { name: "Alex Morgan", stage: "New Lead", note: "Needs condo in Arlington" },
                    { name: "Lena Park", stage: "Tour Scheduled", note: "3-bed buyer, preapproved" },
                    { name: "James Young", stage: "Listing", note: "Seller ready this month" },
                  ].map((lead) => (
                    <div
                      key={lead.name}
                      className="rounded-xl border border-slate-800 bg-slate-900/70 p-3"
                    >
                      <p className="text-sm font-medium text-white">{lead.name}</p>
                      <p className="text-xs text-slate-400">{lead.stage}</p>
                      <p className="mt-1 text-xs text-slate-500">{lead.note}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-400">Next action</p>
                  <p className="mt-2 text-sm font-semibold">Call seller at 2 PM</p>
                  <p className="text-xs text-slate-500">Listing paperwork check-in</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-400">Team insight</p>
                  <p className="mt-2 text-sm font-semibold">4 active listings</p>
                  <p className="text-xs text-slate-500">2 agents, 1 assistant</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mt-20 space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Features</p>
            <h2 className="text-3xl font-semibold">Everything you need to stay deal-ready.</h2>
            <p className="text-sm text-slate-400">
              Built for mobile, teams, and the daily rhythm of real estate.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                title: "Pipeline board",
                body: "Drag-and-drop stages, reminders, and next actions at a glance.",
              },
              {
                title: "Lead profiles",
                body: "Capture buyer, seller, and rental details with clean sections.",
              },
              {
                title: "Team-ready",
                body: "Invite agents and assistants with org-based permissions.",
              },
              {
                title: "Follow-up generator",
                body: "Send consistent outreach with templates or AI.",
              },
              {
                title: "Transaction tracking",
                body: "Monitor commissions, status, and closing dates.",
              },
              {
                title: "Mobile friendly",
                body: "Everything fits on a phone so you can update between showings.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
              >
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-2xl font-semibold">Ready to see it in action?</h3>
              <p className="mt-2 text-sm text-slate-400">
                Log in to start organizing your pipeline in minutes.
              </p>
            </div>
            <a
              href="/login"
              className="rounded-md bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-950"
            >
              Try Mini CRM
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
