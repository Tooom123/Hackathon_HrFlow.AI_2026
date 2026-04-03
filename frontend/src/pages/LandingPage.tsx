import { useNavigate } from 'react-router-dom'
import poulpeLogo from '../../poulpelogo.png'

const STEPS = [
  { num: '01', title: 'Create your job offer', desc: 'Paste the job description. The AI generates tailored interview questions in seconds.' },
  { num: '02', title: 'Share the link', desc: "Send a unique link to your candidates. They upload their CV and interview on their own time." },
  { num: '03', title: 'Analyze results', desc: 'Compare profiles, review full transcripts and scores to make the best decision.' },
]

const PLANS = [
  {
    name: 'Freemium',
    price: '$0',
    period: 'forever',
    highlight: false,
    badge: null,
    features: [
      '1 active job posting',
      'Up to 5 candidates / position',
      'AI voice interview (10 min)',
      'Automatic scoring',
      'Community support',
    ],
    cta: 'Get started for free',
    ctaStyle: 'border border-zinc-700 text-zinc-300 hover:border-brand hover:text-brand',
  },
  {
    name: 'Scale',
    price: '$89',
    period: '/ month · per recruiter',
    highlight: true,
    badge: 'Most popular',
    features: [
      '10 simultaneous job postings',
      'Up to 100 candidates / position',
      'Unlimited AI voice interviews',
      'Full transcript & detailed feedback',
      'CV analysis — strengths & weaknesses',
      'Priority email support',
    ],
    cta: 'Try free for 14 days',
    ctaStyle: 'bg-brand text-zinc-950 font-bold hover:bg-brand-dim',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'volume & integrations',
    highlight: false,
    badge: null,
    features: [
      'Unlimited jobs & candidates',
      'Multi-recruiter teams',
      'SSO / SAML & advanced GDPR',
      'Custom ATS integration',
      '99.9% SLA guaranteed',
      'Dedicated customer success manager',
    ],
    cta: 'Contact us',
    ctaStyle: 'border border-zinc-700 text-zinc-300 hover:border-brand hover:text-brand',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 antialiased relative overflow-x-hidden">

      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 50% -5%, rgba(61,210,190,0.14) 0%, transparent 70%)',
        }}
      />

      <nav className="relative z-20 flex items-center justify-between px-8 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <img src={poulpeLogo} alt="FirstRound" className="w-14 h-14 object-contain" />
          <span className="text-2xl font-extrabold tracking-tight">
            First<span className="text-brand">Round</span>
          </span>
        </div>
        <div className="hidden gap-8 text-sm text-zinc-400 sm:flex">
          <a href="#how" className="hover:text-zinc-100 transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-zinc-100 transition-colors">Pricing</a>
        </div>
        <button
          onClick={() => navigate('/app')}
          className="rounded-xl bg-brand px-5 py-2 text-sm font-bold text-zinc-950 hover:bg-brand-dim transition-all hover:scale-105 active:scale-100 shadow-lg shadow-brand/20"
        >
          Try the free demo →
        </button>
      </nav>

      <div className="relative z-10 w-full">

        <div className="hidden lg:block absolute z-20" style={{ left: '4rem', top: '7rem' }}>
          <div className="relative">
            <div aria-hidden className="absolute inset-0 rounded-2xl blur-xl" style={{ background: 'rgba(61,210,190,0.25)', transform: 'scale(1.3)' }} />
            <div className="relative rounded-2xl border border-brand/25 bg-zinc-900/85 backdrop-blur-md px-5 py-4 shadow-2xl shadow-black/50 rotate-[-3deg]">
              <p className="text-2xl font-extrabold text-brand leading-none">× 5</p>
              <p className="text-[11px] text-zinc-400 leading-tight mt-1">time saved on<br />pre-screening</p>
            </div>
          </div>
        </div>

        <div className="hidden lg:block absolute z-20" style={{ right: '7rem', top: '14rem' }}>
          <div className="relative">
            <div aria-hidden className="absolute inset-0 rounded-2xl blur-xl" style={{ background: 'rgba(61,210,190,0.25)', transform: 'scale(1.3)' }} />
            <div className="relative rounded-2xl border border-brand/25 bg-zinc-900/85 backdrop-blur-md px-5 py-4 shadow-2xl shadow-black/50 rotate-[2deg]">
              <p className="text-2xl font-extrabold text-brand leading-none">94%</p>
              <p className="text-[11px] text-zinc-400 leading-tight mt-1">of candidates complete<br />their interview</p>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-8">
        <div className="flex flex-col items-center text-center pt-12 pb-14">

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-xs font-medium text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
            Powered by HrFlow.ai &amp; generative AI
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight leading-tight mb-3 sm:text-6xl md:text-7xl max-w-3xl">
            Every candidate deserves an interview.
          </h1>
          <p className="text-5xl font-extrabold tracking-tight leading-tight mb-8 sm:text-6xl md:text-7xl">
            <span className="text-brand underline decoration-brand decoration-[3px] underline-offset-[8px]">
              Not a waiting line.
            </span>
          </p>

          <p className="text-base text-zinc-400 leading-relaxed max-w-lg mb-10">
            Automate your pre-screening with a voice AI, get instant matching scores,
            and focus your time on the candidates who matter.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate('/app')}
              className="rounded-xl bg-brand px-8 py-3.5 text-sm font-bold text-zinc-950 shadow-lg shadow-brand/25 hover:bg-brand-dim transition-all hover:scale-105 active:scale-100"
            >
              Try the free demo →
            </button>
            <a
              href="#how"
              className="rounded-xl border border-zinc-700 px-8 py-3.5 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
            >
              How does it work?
            </a>
          </div>

          <p className="mt-5 text-xs text-zinc-600">No credit card required · Available immediately</p>

        </div>

        <div id="how" className="relative grid grid-cols-1 md:grid-cols-3 gap-4 pb-14">
          <div
            aria-hidden
            className="hidden md:block absolute left-0 right-0 h-px z-0"
            style={{ top: '2.75rem', background: 'linear-gradient(to right, transparent 0%, rgba(61,210,190,0.3) 20%, rgba(61,210,190,0.3) 80%, transparent 100%)' }}
          />
          {STEPS.map((s) => (
            <div
              key={s.num}
              className="relative flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-6 hover:border-brand/40 transition-all group z-10"
            >
              <span className="text-4xl font-extrabold text-brand/15 group-hover:text-brand/25 transition-colors mb-3 leading-none select-none">
                {s.num}
              </span>
              <p className="text-sm font-semibold text-zinc-100 mb-1.5">{s.title}</p>
              <p className="text-xs text-zinc-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        <div id="pricing" className="pb-12">
          <div className="flex items-baseline gap-3 mb-5">
            <h2 className="text-xl font-bold tracking-tight">Pricing</h2>
            <span className="text-xs text-zinc-500">Start free, upgrade when you need more.</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                  plan.highlight
                    ? 'border-brand/70 bg-gradient-to-b from-brand/[0.07] to-zinc-900 shadow-2xl shadow-brand/10'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-brand px-4 py-0.5 text-xs font-bold text-zinc-950 shadow-lg shadow-brand/30">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">{plan.name}</p>
                  <p className="text-3xl font-extrabold text-zinc-50 leading-tight">
                    {plan.price}
                    <span className="ml-1.5 text-xs font-normal text-zinc-500">{plan.period}</span>
                  </p>
                </div>
                <ul className="mb-5 flex flex-col gap-2 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-xs text-zinc-300">
                      <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => plan.name !== 'Enterprise' && navigate('/app')}
                  className={`w-full rounded-xl py-2.5 text-xs font-semibold transition-all ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>

        </div>
      </div>

      <footer className="relative z-10 border-t border-zinc-800/60 py-4">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2">
            <img src={poulpeLogo} alt="FirstRound" className="w-6 h-6 object-contain" />
            <span className="text-sm font-bold">
              First<span className="text-brand">Round</span>
            </span>
          </div>
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} FirstRound · Powered by{' '}
            <span className="text-brand">HrFlow.ai</span> · All rights reserved.
          </p>
          <p className="text-xs text-zinc-600 italic">Every candidate deserves an interview.</p>
        </div>
      </footer>
    </div>
  )
}
