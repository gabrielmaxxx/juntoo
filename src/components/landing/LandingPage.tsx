import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, MapPin, Calendar, ChevronRight, Star,
  Dumbbell, Palette, UtensilsCrossed, BookOpen, Mountain,
  Music, Gamepad2, Camera, Heart, Shield, MessageCircle,
  Sparkles, ArrowRight, Menu, X, Play, Zap, Globe, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/BrandLogo';

/* ═══════════════════════════════════════════════════════════
   Juntoo Landing Page
   Conversão-focada, mobile-first, design system tokens
   ═══════════════════════════════════════════════════════════ */

// ─── Intersection Observer hook for scroll animations ─────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// ─── Animated wrapper ─────────────────────────────────────
function FadeUp({ children, className, delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   1. NAVBAR
   ═══════════════════════════════════════════════════════════ */
function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: 'Como funciona', href: '#como-funciona' },
    { label: 'Atividades', href: '#categorias' },
    { label: 'Comunidade', href: '#diferenciais' },
  ];

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-background/85 backdrop-blur-xl shadow-subtle border-b border-border/50'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <BrandLogo
          size="sm"
          showLabel
          labelClassName={cn(
            'text-lg transition-colors duration-300',
            scrolled ? 'text-foreground' : 'text-white'
          )}
          className="pointer-events-auto"
        />

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className={cn(
                'text-sm font-medium transition-colors duration-200 hover:text-primary',
                scrolled ? 'text-foreground/70' : 'text-white/80'
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate('/auth')}
            className={cn(
              'text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200',
              scrolled
                ? 'text-foreground hover:bg-muted'
                : 'text-white/90 hover:text-white hover:bg-white/10'
            )}
          >
            Entrar
          </button>
          <button
            onClick={() => navigate('/auth')}
            className="text-sm font-semibold px-5 py-2.5 rounded-xl juntoo-gradient text-primary-foreground shadow-subtle hover:opacity-90 transition-all duration-200"
          >
            Começar grátis
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={cn(
            'md:hidden p-2 rounded-lg transition-colors',
            scrolled ? 'text-foreground' : 'text-white'
          )}
          aria-label="Menu de navegação"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-t border-border animate-fade-in">
          <div className="px-5 py-4 space-y-1">
            {links.map((l) => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href)}
                className="block w-full text-left text-base font-medium text-foreground/80 py-3 px-3 rounded-lg hover:bg-muted transition-colors"
              >
                {l.label}
              </button>
            ))}
            <div className="pt-3 border-t border-border space-y-2">
              <button
                onClick={() => navigate('/auth')}
                className="w-full text-center text-sm font-medium px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted transition-colors"
              >
                Entrar
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="w-full text-center text-sm font-semibold px-4 py-2.5 rounded-xl juntoo-gradient text-primary-foreground shadow-subtle"
              >
                Começar grátis
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════
   2. HERO SECTION
   ═══════════════════════════════════════════════════════════ */
function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500" />
      {/* Decorative shapes */}
      <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute bottom-20 -right-20 w-96 h-96 rounded-full bg-coral-500/15 blur-3xl" />
      <div className="absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-primary-light/10 blur-2xl" />
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pt-24 pb-16 w-full">
        <div className="max-w-2xl">
          {/* Badge */}
          <FadeUp>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white/90 text-sm mb-6">
              <Sparkles size={14} className="text-accent" />
              <span className="font-medium">+2.000 atividades realizadas</span>
            </div>
          </FadeUp>

          {/* Headline — names the pain, not the product */}
          <FadeUp delay={100}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-white leading-[1.1] tracking-tight mb-5">
              Cansou de perder{' '}
              <span className="relative">
                <span className="relative z-10">experiências incríveis</span>
                <span className="absolute bottom-1 left-0 right-0 h-3 bg-accent/30 rounded-sm -z-0" />
              </span>{' '}
              por não ter com quem ir?
            </h1>
          </FadeUp>

          {/* Subheadline — value proposition */}
          <FadeUp delay={200}>
            <p className="text-lg sm:text-xl text-white/75 leading-relaxed mb-8 max-w-lg font-body">
              O Juntoo conecta você com pessoas reais para fazer esportes, explorar a cidade, 
              estudar e muito mais — tudo presencial, tudo perto de você.
            </p>
          </FadeUp>

          {/* CTAs */}
          <FadeUp delay={300}>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => navigate('/auth')}
                className="group inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-white text-primary-700 font-heading font-semibold text-base shadow-strong hover:shadow-elevated hover:scale-[1.02] transition-all duration-300"
              >
                Encontrar atividades
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => document.querySelector('#como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
                className="group inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white font-heading font-medium text-base hover:bg-white/15 transition-all duration-200"
              >
                <Play size={16} className="fill-current" />
                Ver como funciona
              </button>
            </div>
          </FadeUp>

          {/* Social proof mini */}
          <FadeUp delay={400}>
            <div className="flex items-center gap-3 mt-10">
              <div className="flex -space-x-2">
                {['🧑🏽', '👩🏻', '🧑🏿', '👩🏼'].map((emoji, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-sm"
                  >
                    {emoji}
                  </div>
                ))}
              </div>
              <div className="text-sm text-white/70 font-body">
                <span className="text-white font-semibold">500+</span> pessoas já se conectaram esta semana
              </div>
            </div>
          </FadeUp>
        </div>
      </div>

      {/* Bottom curve */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" className="w-full h-auto">
          <path
            d="M0 80V40C240 10 480 0 720 10C960 20 1200 50 1440 40V80H0Z"
            className="fill-background"
          />
        </svg>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   3. PROBLEM VALIDATION — impactful stats
   ═══════════════════════════════════════════════════════════ */
function ProblemSection() {
  const stats = [
    {
      value: '81%',
      label: 'já deixaram de fazer uma atividade por falta de companhia',
      icon: Heart,
      color: 'text-coral-500',
      bgColor: 'bg-coral-50',
    },
    {
      value: '63%',
      label: 'desistem quando não encontram alguém para ir junto',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary-50',
    },
    {
      value: '72%',
      label: 'têm timidez como barreira para novas conexões',
      icon: MessageCircle,
      color: 'text-info',
      bgColor: 'bg-info-light',
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-muted/30">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <FadeUp>
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3 font-heading">
              O problema é real
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-foreground leading-tight">
              Milhões de experiências perdidas.{' '}
              <span className="text-primary">Todo dia.</span>
            </h2>
          </div>
        </FadeUp>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {stats.map((stat, i) => (
            <FadeUp key={i} delay={i * 120}>
              <div className="relative bg-card rounded-2xl p-8 shadow-subtle hover:shadow-medium transition-all duration-300 border border-border/50 text-center group">
                <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5', stat.bgColor)}>
                  <stat.icon size={26} className={stat.color} />
                </div>
                <p className={cn('text-5xl sm:text-6xl font-heading font-bold mb-3', stat.color)}>
                  {stat.value}
                </p>
                <p className="text-base text-muted-foreground leading-relaxed font-body">
                  {stat.label}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   4. HOW IT WORKS — 3 visual steps
   ═══════════════════════════════════════════════════════════ */
function HowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Escolha seus interesses',
      description: 'Selecione as atividades que fazem seu coração bater mais forte — esportes, cultura, gastronomia e mais.',
      icon: Sparkles,
      color: 'from-primary-400 to-primary-600',
    },
    {
      step: '02',
      title: 'Descubra atividades perto de você',
      description: 'Encontre eventos reais na sua cidade, organizados por pessoas como você. Tudo com data, local e detalhes claros.',
      icon: MapPin,
      color: 'from-accent to-primary-light',
    },
    {
      step: '03',
      title: 'Participe e conecte-se',
      description: 'Entre na atividade, converse pelo chat do evento e viva experiências que só acontecem quando você está presente.',
      icon: Users,
      color: 'from-coral-400 to-coral-600',
    },
  ];

  return (
    <section id="como-funciona" className="py-16 sm:py-24 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <FadeUp>
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3 font-heading">
              Simples assim
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-foreground">
              3 passos para nunca mais ir sozinho
            </h2>
          </div>
        </FadeUp>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
          {steps.map((step, i) => (
            <FadeUp key={i} delay={i * 150}>
              <div className="relative text-center group">
                {/* Step number + icon */}
                <div className="relative mx-auto mb-6 w-20 h-20">
                  <div className={cn(
                    'w-20 h-20 rounded-3xl bg-gradient-to-br flex items-center justify-center shadow-medium group-hover:shadow-strong group-hover:scale-105 transition-all duration-300',
                    step.color
                  )}>
                    <step.icon size={32} className="text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-card border-2 border-border text-xs font-bold font-heading flex items-center justify-center text-foreground shadow-subtle">
                    {step.step}
                  </span>
                </div>

                {/* Connector line (desktop) */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+48px)] right-[calc(-50%+48px)] h-px bg-border" />
                )}

                <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-body max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   5. CATEGORIES — activity grid
   ═══════════════════════════════════════════════════════════ */
function CategoriesSection() {
  const categories = [
    { name: 'Esportes', icon: Dumbbell, color: 'bg-primary-50 text-primary-600 dark:bg-primary-50 dark:text-primary-400' },
    { name: 'Cultura', icon: Palette, color: 'bg-coral-50 text-coral-600 dark:bg-coral-50 dark:text-coral-400' },
    { name: 'Gastronomia', icon: UtensilsCrossed, color: 'bg-warning-light text-warning dark:bg-warning-light dark:text-warning' },
    { name: 'Estudos', icon: BookOpen, color: 'bg-info-light text-info dark:bg-info-light dark:text-info' },
    { name: 'Aventura', icon: Mountain, color: 'bg-success-light text-success dark:bg-success-light dark:text-success' },
    { name: 'Música', icon: Music, color: 'bg-primary-50 text-primary dark:bg-primary-50 dark:text-primary' },
    { name: 'Games', icon: Gamepad2, color: 'bg-coral-50 text-coral-500 dark:bg-coral-50 dark:text-coral-500' },
    { name: 'Fotografia', icon: Camera, color: 'bg-info-light text-info dark:bg-info-light dark:text-info' },
  ];

  return (
    <section id="categorias" className="py-16 sm:py-24 bg-muted/30 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <FadeUp>
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3 font-heading">
              Para todos os gostos
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-foreground">
              Encontre sua turma por atividade
            </h2>
          </div>
        </FadeUp>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
          {categories.map((cat, i) => (
            <FadeUp key={i} delay={i * 60}>
              <div className="group relative bg-card rounded-2xl p-5 sm:p-6 text-center border border-border/50 hover:border-primary/30 hover:shadow-medium cursor-pointer transition-all duration-300">
                <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-transform group-hover:scale-110', cat.color)}>
                  <cat.icon size={26} />
                </div>
                <p className="text-sm font-heading font-semibold text-foreground">{cat.name}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   6. DIFFERENTIALS — why Juntoo
   ═══════════════════════════════════════════════════════════ */
function DifferentialsSection() {
  const cards = [
    {
      icon: Globe,
      title: 'Conexões reais, não curtidas',
      description: 'Enquanto redes sociais medem engajamento em likes, o Juntoo mede encontros reais. Aqui as pessoas realmente se encontram.',
      accent: 'bg-primary-50 text-primary',
    },
    {
      icon: Shield,
      title: 'Confiança em primeiro lugar',
      description: 'Verificação de identidade, sistema de reputação e denúncias. Você sabe com quem vai se encontrar antes de sair de casa.',
      accent: 'bg-success-light text-success',
    },
    {
      icon: Zap,
      title: 'Da tela para a vida real',
      description: 'Sem algoritmos infinitos. Você abre, encontra uma atividade que ama, entra e vai. Simples, rápido, presencial.',
      accent: 'bg-coral-50 text-coral-500',
    },
  ];

  return (
    <section id="diferenciais" className="py-16 sm:py-24 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <FadeUp>
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3 font-heading">
              Por que o Juntoo?
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-foreground">
              Feito para quem vive, não para quem scrolla
            </h2>
          </div>
        </FadeUp>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {cards.map((card, i) => (
            <FadeUp key={i} delay={i * 120}>
              <div className="bg-card rounded-2xl p-7 sm:p-8 border border-border/50 hover:shadow-medium transition-all duration-300 group h-full">
                <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110', card.accent)}>
                  <card.icon size={26} />
                </div>
                <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-body">
                  {card.description}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   7. FINAL CTA
   ═══════════════════════════════════════════════════════════ */
function FinalCTA() {
  const navigate = useNavigate();

  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <FadeUp>
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-800 via-primary-600 to-accent" />
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-coral-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-primary-light/15 blur-3xl" />

            <div className="relative z-10 text-center px-6 sm:px-12 py-14 sm:py-20">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-white leading-tight mb-4">
                Sua próxima experiência{' '}
                <br className="hidden sm:block" />
                favorita está a um clique
              </h2>
              <p className="text-lg text-white/75 mb-8 max-w-md mx-auto font-body leading-relaxed">
                Pare de perder oportunidades. Crie sua conta gratuita e descubra atividades incríveis perto de você.
              </p>
              <button
                onClick={() => navigate('/auth')}
                className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-white text-primary-700 font-heading font-semibold text-base shadow-strong hover:shadow-elevated hover:scale-[1.02] transition-all duration-300"
              >
                Criar conta grátis
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
              <p className="text-xs text-white/50 mt-4 font-body">
                Sem cartão de crédito • Grátis para sempre
              </p>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   8. FOOTER
   ═══════════════════════════════════════════════════════════ */
function Footer() {
  const navigate = useNavigate();

  const linkGroups = [
    {
      title: 'Produto',
      links: [
        { label: 'Como funciona', action: () => document.querySelector('#como-funciona')?.scrollIntoView({ behavior: 'smooth' }) },
        { label: 'Categorias', action: () => document.querySelector('#categorias')?.scrollIntoView({ behavior: 'smooth' }) },
        { label: 'Criar conta', action: () => navigate('/auth') },
      ],
    },
    {
      title: 'Institucional',
      links: [
        { label: 'Termos de Uso', action: () => navigate('/termos#termos') },
        { label: 'Política de Privacidade', action: () => navigate('/termos#privacidade') },
        { label: 'Sobre nós', action: () => navigate('/termos') },
      ],
    },
    {
      title: 'Suporte',
      links: [
        { label: 'Central de Ajuda', action: () => navigate('/auth') },
        { label: 'contato@juntoo.com.br', action: () => window.open('mailto:contato@juntoo.com.br') },
      ],
    },
  ];

  return (
    <footer className="bg-neutral-900 text-neutral-300 dark:bg-neutral-950 dark:text-neutral-400">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 mb-10">
          {/* Brand column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl juntoo-gradient flex items-center justify-center">
                <Users size={18} className="text-white" />
              </div>
              <span className="text-lg font-heading font-bold text-white tracking-wide">Juntoo</span>
            </div>
            <p className="text-sm leading-relaxed font-body text-neutral-400">
              Conectando pessoas a experiências reais. Porque a vida acontece quando você sai da tela.
            </p>
          </div>

          {/* Link groups */}
          {linkGroups.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-heading font-semibold text-white mb-4">{group.title}</h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={link.action}
                      className="text-sm font-body text-neutral-400 hover:text-white transition-colors duration-200"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs font-body text-neutral-500">
            © {new Date().getFullYear()} Juntoo. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4">
            <Lock size={14} className="text-neutral-500" />
            <span className="text-xs text-neutral-500 font-body">
              Dados protegidos pela LGPD
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════════════════ */
export const LandingPage = () => {
  return (
    <div className="min-h-dvh bg-background overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <HowItWorks />
      <CategoriesSection />
      <DifferentialsSection />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default LandingPage;
