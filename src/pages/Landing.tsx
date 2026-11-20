import { motion, useReducedMotion } from 'motion/react';
import {
  Activity,
  Archive,
  ArrowRight,
  Clock,
  FileText,
  QrCode,
  ScanText,
  Search,
  Settings2,
  Share2,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { FeatureCard } from '@/components/ui/grid-feature-cards';
import MeadowRiseFooter from '@/components/ui/meadow-rise-footer';
import { ThemeToggle } from '@/components/layout/Navbar';
import type { Theme } from '@/types';

const FEATURES = [
  {
    title: 'Smart Document Storage',
    icon: Archive,
    description: 'Securely organize prescriptions, medical reports and consultation records.',
  },
  {
    title: 'Intelligent OCR',
    icon: ScanText,
    description: 'Extract readable information from prescriptions and laboratory reports.',
  },
  {
    title: 'Medical Timeline',
    icon: Clock,
    description: 'View your medical history in chronological order.',
  },
  {
    title: 'Secure Sharing',
    icon: Share2,
    description: 'Share selected medical documents with doctors.',
  },
  {
    title: 'Smart Search',
    icon: Search,
    description: 'Find previous medical documents using dates and categories.',
  },
  {
    title: 'Complete Control',
    icon: Settings2,
    description: 'Manage your personal medical records from one dashboard.',
  },
];

const STEPS = [
  { icon: Upload, title: 'Upload Document', text: 'Drop in a prescription or report — PDF, JPG or PNG.' },
  { icon: ScanText, title: 'AI Extraction', text: 'OCR reads the doctor, date, medicines and dosage.' },
  { icon: FileText, title: 'Organized Records', text: 'Everything is filed chronologically in your vault.' },
  { icon: Share2, title: 'Secure Sharing', text: 'Share a link or QR code with your doctor, then revoke it.' },
];

function AnimatedContainer({
  className,
  delay = 0.1,
  children,
}: {
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) return <>{children}</>;
  return (
    <motion.div
      initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
      whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface LandingProps {
  theme: Theme;
  onToggleTheme: () => void;
  onNavigate: (route: 'login' | 'signup' | 'dashboard') => void;
  onSubscribe: (email: string) => void;
}

export default function Landing({ theme, onToggleTheme, onNavigate, onSubscribe }: LandingProps) {
  const dark = theme === 'dark';
  const footerPalette = dark
    ? {
        sky: ['#22374e', '#2e4a66'] as [string, string],
        haze: '#2a415a',
        glow: '#2aa5a5',
        hills: [
          ['#33506a', '#243a4e'],
          ['#2c4a5e', '#1f3646'],
          ['#27453f', '#1b332f'],
          ['#22403a', '#172e29'],
          ['#1d3a33', '#122620'],
          ['#18322c', '#0e201b'],
        ] as [string, string][],
        ground: '#16283a',
        ink: '#f2efe8',
        sub: '#b8c4d0',
        pill: '#2aa5a5',
        pillInk: '#0b1d2a',
        text: '#f2efe8',
        muted: '#b8c4d0',
        line: 'rgba(242, 239, 232, 0.14)',
        night: true,
      }
    : {
        sky: ['#d3d3d3', '#e6f2f2'] as [string, string],
        haze: '#cfd8d8',
        glow: '#e6f2f2',
        hills: [
          ['#8fb5b0', '#6b938d'],
          ['#7ba8a0', '#5c8a82'],
          ['#6b9a90', '#4e7a72'],
          ['#5a8a80', '#40655e'],
          ['#4a7a70', '#33564f'],
          ['#3a6a60', '#234640'],
        ] as [string, string][],
        ground: '#1a2e2e',
        ink: '#1a2e2e',
        sub: '#5a6b6b',
        pill: '#008080',
        pillInk: '#ffffff',
        text: '#f2efe8',
        muted: '#b8c4d0',
        line: 'rgba(242, 239, 232, 0.16)',
      };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--primary)] text-white">
            <Activity className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <span className="font-display text-lg font-bold">MediVault</span>
          <nav className="ml-6 hidden items-center gap-5 text-sm text-[var(--muted)] md:flex">
            <a href="#features" className="hover:text-[var(--text)]">Features</a>
            <a href="#how" className="hover:text-[var(--text)]">How it works</a>
            <a href="#security" className="hover:text-[var(--text)]">Security</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <button
              onClick={() => onNavigate('login')}
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] sm:block"
            >
              Sign in
            </button>
            <button
              onClick={() => onNavigate('signup')}
              className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-medium text-[var(--primary)]">
            Your Health. Your History. Your Control.
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight text-[var(--text)] md:text-5xl">
            Your Entire Medical History. <span className="text-[var(--primary)]">One Intelligent Space.</span>
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--muted)]">
            Prescriptions, laboratory reports and medical consultations. Everything organized, accessible and securely
            stored.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('signup')}
              className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[var(--primary-hover)]"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="rounded-full border border-[var(--border)] bg-[var(--card)] px-6 py-3 text-sm font-semibold text-[var(--text)] hover:bg-[var(--tint)]"
            >
              Explore Platform
            </button>
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">Demo login: odhage3@gmail.com · Demo1234</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Demo preview — uploads, OCR and sharing are simulated. Nothing is stored on a server.
          </p>
        </motion.div>

        {/* Floating document composition */}
        <div className="relative mx-auto h-80 w-full max-w-md">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute left-4 top-6 w-56 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xl"
          >
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--tint)] text-[var(--primary)]">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">General Prescription</p>
                <p className="text-xs text-[var(--muted)]">Dr. Meera Kulkarni</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="h-2 w-full rounded bg-[var(--tint)]" />
              <div className="h-2 w-4/5 rounded bg-[var(--tint)]" />
              <div className="h-2 w-3/5 rounded bg-[var(--tint)]" />
            </div>
          </motion.div>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
            className="absolute bottom-6 right-2 w-48 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xl"
          >
            <p className="text-xs font-semibold text-[var(--primary)]">LAB REPORT · CBC</p>
            <p className="mt-1 text-sm font-semibold">Haemoglobin 12.4 g/dL</p>
            <p className="text-xs text-[var(--muted)]">Metropolis Healthcare · 10 Nov 2026</p>
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-2 right-10 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--primary)] text-white shadow-xl"
          >
            <span className="font-display text-2xl font-bold">+</span>
          </motion.div>
          <div className="absolute bottom-0 left-10 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs shadow-lg">
            <QrCode className="h-4 w-4 text-[var(--primary)]" /> Shared securely with your doctor
          </div>
        </div>
      </section>

      {/* Features — supplied Grid Feature Cards */}
      <section id="features" className="py-16 md:py-24">
        <div className="mx-auto w-full max-w-5xl space-y-8 px-4">
          <AnimatedContainer className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-wide md:text-4xl">
              Trusted Medical Document Management
            </h2>
            <p className="mt-4 text-sm text-[var(--muted)] md:text-base">
              Everything you need to keep your health records organised, searchable and shareable.
            </p>
          </AnimatedContainer>
          <AnimatedContainer
            delay={0.4}
            className="grid grid-cols-1 divide-x divide-y divide-dashed border border-dashed border-[var(--border)] bg-[var(--card)] sm:grid-cols-2 md:grid-cols-3"
          >
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </AnimatedContainer>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center font-display text-3xl font-bold">How MediVault Works</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--tint)] text-[var(--primary)]">
                <s.icon className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <p className="mt-3 text-xs font-semibold text-[var(--primary)]">STEP {i + 1}</p>
              <h3 className="font-display text-base font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section id="security" className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col items-center gap-8 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-[var(--shadow)] md:flex-row">
          <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-[var(--tint)] text-[var(--primary)]">
            <ShieldCheck className="h-12 w-12" strokeWidth={1.4} />
          </span>
          <div>
            <h2 className="font-display text-2xl font-bold">Privacy and Security, by Design</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
              Your documents will live in a private vault. Only you will be able to open them — sharing will happen
              through expiring links and QR codes that you can revoke at any time. This demo does not store documents
              yet; uploads and sharing are simulated.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-4 pt-8 text-center">
        <h2 className="font-display text-3xl font-bold md:text-4xl">Take Control of Your Medical History.</h2>
        <button
          onClick={() => onNavigate('signup')}
          className="mt-6 rounded-full bg-[var(--primary)] px-8 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-[var(--primary-hover)]"
        >
          Get Started — it&apos;s free
        </button>
      </section>

      <MeadowRiseFooter
        name="MediVault"
        heading="Take *control* of your medical history."
        subheading="Prescriptions, lab reports and consultations — organised, searchable and shareable, whenever you need them."
        cta={{ label: 'Get Started', href: '#/signup' }}
        tagline="Your Health. Your History. Your Control."
        newsletter
        placeholder="Enter your email"
        onSubscribe={onSubscribe}
        successMessage="Demo only — your email was not sent or stored."
        columns={[
          {
            title: 'Product',
            links: [
              { label: 'Dashboard', href: '#/dashboard' },
              { label: 'Medical Records', href: '#/records' },
              { label: 'Upload Documents', href: '#/upload' },
              { label: 'Shared Records', href: '#/shared' },
            ],
          },
          { title: 'Company', links: [{ label: 'About' }, { label: 'Careers' }, { label: 'Press' }] },
          { title: 'Support', links: [{ label: 'Help Centre' }, { label: 'Contact' }, { label: 'FAQs' }] },
        ]}
        socials={[{ icon: 'linkedin' }, { icon: 'instagram' }, { icon: 'x' }, { icon: 'youtube' }]}
        palette={footerPalette}
      />
    </div>
  );
}
