import { EXTERNAL_LINKS_NOTE, RESOURCE_CATEGORIES } from '../data/resources';
import { motion } from 'framer-motion';
import { ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';
import * as icons from 'lucide-react';
import { Reveal, SectionHead } from '../components/ui';
import { Stagger, StaggerItem } from '../components/motion';

function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = (icons as any)[name] ?? icons.Link;
  return <Cmp className={className} />;
}

export default function Resources() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <SectionHead kicker="Resource hub" title={<>Everything official, <span className="grad-text">nothing sketchy</span></>}
        sub="Curated links to the real sources — where to download models, get API keys, run local AI, and keep learning. Bookmark this page; the ecosystem moves fast and only official sources keep up." />

      <div className="mb-10 flex gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-4 text-sm leading-relaxed text-emerald-100/75">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        <span><b className="text-emerald-300">{EXTERNAL_LINKS_NOTE.title}</b> {EXTERNAL_LINKS_NOTE.body}</span>
      </div>

      <div className="space-y-14">
        {RESOURCE_CATEGORIES.map((cat, ci) => (
          <Reveal key={cat.id} delay={ci * 0.03}>
            <section>
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-violet-400/25 bg-violet-500/10">
                  <Icon name={cat.icon} className="h-5 w-5 text-violet-300" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold text-white">{cat.title}</h2>
                  <p className="text-xs text-slate-500">{cat.blurb}</p>
                </div>
              </div>
              <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" amount={0.15}>
                {cat.items.map((item) => (
                  <StaggerItem key={item.name}>
                    <motion.a href={item.url} target="_blank" rel="noreferrer"
                      whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="panel panel-hover group relative block h-full p-5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-semibold text-white group-hover:text-violet-200">{item.name}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:text-violet-300" />
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{item.desc}</p>
                      {item.badge && (
                        <span className="mt-3 chip border border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-300"><Sparkles className="h-3 w-3" />{item.badge}</span>
                      )}
                    </motion.a>
                  </StaggerItem>
                ))}
              </Stagger>
            </section>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
