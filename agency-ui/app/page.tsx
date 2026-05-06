import Link from 'next/link';
import { Bot, FileText, ShieldCheck, Sparkles, Workflow } from 'lucide-react';

export default function LandingPage() {
	return (
		<div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />
				<div className="absolute top-1/3 -right-20 h-[28rem] w-[28rem] rounded-full bg-amber-400/10 blur-3xl" />
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(125,211,252,0.1),transparent_42%),radial-gradient(circle_at_50%_80%,rgba(251,191,36,0.08),transparent_45%)]" />
			</div>

			<header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 lg:px-10">
				<div className="flex items-center gap-3">
					<div className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-2">
						<Sparkles className="h-5 w-5 text-cyan-300" />
					</div>
					<span className="text-lg font-semibold tracking-tight">Zamunda AI</span>
				</div>
				<nav className="flex items-center gap-3">
					<Link
						href="/login"
						className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white"
					>
						Sign In
					</Link>
					<Link
						href="/register"
						className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-300"
					>
						Start Free
					</Link>
				</nav>
			</header>

			<main className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 px-6 pb-14 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:px-10 lg:pt-16">
				<section>
					<p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-cyan-200">
						<Bot className="h-3.5 w-3.5" />
						Autonomous Procurement Copilot
					</p>
					<h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
						Move from tender chaos to decision-ready output in minutes.
					</h1>
					<p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
						Zamunda AI orchestrates OpenClaw agents to analyze tender documents,
						produce structured summaries, and generate bid checklists with a clear
						audit trail for every run.
					</p>

					<div className="mt-8 flex flex-wrap items-center gap-3">
						<Link
							href="/register"
							className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-200"
						>
							Create Account
						</Link>
						<Link
							href="/dashboard"
							className="rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-500"
						>
							Open Dashboard
						</Link>
					</div>
				</section>

				<section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/30 backdrop-blur">
					<h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
						Workflow Snapshot
					</h2>
					<div className="mt-5 space-y-4">
						<FeatureCard
							icon={<FileText className="h-4 w-4 text-cyan-300" />}
							title="Document Extraction"
							description="Upload PDF/DOCX and extract structured text with source context."
						/>
						<FeatureCard
							icon={<Workflow className="h-4 w-4 text-amber-300" />}
							title="Async Agent Runs"
							description="Submit tasks once, then receive the final result when completion is confirmed."
						/>
						<FeatureCard
							icon={<ShieldCheck className="h-4 w-4 text-emerald-300" />}
							title="Scoped Session Isolation"
							description="Per-user OpenClaw sessions with tracked usage and credit accounting."
						/>
					</div>
				</section>
			</main>
		</div>
	);
}

function FeatureCard({
	icon,
	title,
	description,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
}) {
	return (
		<div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
			<div className="flex items-center gap-2 text-sm font-semibold text-white">
				{icon}
				{title}
			</div>
			<p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
		</div>
	);
}
