import { StationFrame } from "@/app/components/StationFrame";

export default function TailwindStationPage() {
  return (
    <StationFrame
      stationNumber="02"
      stationName="TAILWIND UTILITIES"
      testsBox="Tailwind. Mass utility classes; the panel must show value->utility hints. Force-preview must work against real Tailwind hover/focus rules. styling-detect -> tailwind."
    >
      <section className="bg-zinc-900 text-zinc-50 ring-1 ring-zinc-800/60 px-6 py-4 rounded-md">
        <h2 className="text-2xl font-semibold tracking-tight">
          Ship CSS edits without leaving the page
        </h2>
        <p className="text-sm text-zinc-400 mt-2 max-w-prose">
          Pick any element, drag a slider, copy the patch. Your agent applies it on the first try
          because the diff is structured, not screenshot-shaped.
        </p>
      </section>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <article className="bg-zinc-950 ring-1 ring-zinc-800 rounded-lg p-6 hover:ring-zinc-700 transition">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Solo</p>
          <p className="text-3xl font-semibold text-zinc-50 mt-2">$0</p>
          <p className="text-sm text-zinc-400 mt-1">forever, no card</p>
          <ul className="mt-4 space-y-2 text-sm text-zinc-300">
            <li>One active session</li>
            <li>Local-only patches</li>
            <li>No telemetry, no account</li>
          </ul>
        </article>

        <article className="bg-zinc-900 ring-1 ring-zinc-700 rounded-lg p-6 hover:ring-zinc-600 transition shadow-lg shadow-zinc-950/50">
          <p className="text-xs uppercase tracking-widest text-amber-400">Studio</p>
          <p className="text-4xl font-bold text-zinc-50 mt-2">$12</p>
          <p className="text-sm text-zinc-400 mt-1">per seat, per month</p>
          <ul className="mt-4 space-y-2 text-sm text-zinc-200">
            <li>Multi-cursor sessions</li>
            <li>Patch history with diff</li>
            <li>Shared component palette</li>
          </ul>
        </article>

        <article className="bg-zinc-950 ring-1 ring-zinc-800 rounded-lg p-6 hover:ring-zinc-700 transition">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Team</p>
          <p className="text-3xl font-semibold text-zinc-50 mt-2">$48</p>
          <p className="text-sm text-zinc-400 mt-1">per seat, per month</p>
          <ul className="mt-4 space-y-2 text-sm text-zinc-300">
            <li>SSO and audit log</li>
            <li>Org-wide design tokens</li>
            <li>Priority bug triage</li>
          </ul>
        </article>
      </div>

      <div className="mt-8">
        <button
          type="button"
          className="bg-zinc-100 text-zinc-900 hover:bg-zinc-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-50 px-4 py-2 rounded-md font-medium transition"
        >
          Subscribe
        </button>
      </div>
    </StationFrame>
  );
}
