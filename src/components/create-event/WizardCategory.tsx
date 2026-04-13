import { memo } from 'react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '@/constants/categories';
import {
  Dumbbell, Music, Palette, Cpu, UtensilsCrossed, Plane,
  Camera, BookOpen, Film, Sparkles as Dance, Trees, HeartPulse,
  GraduationCap, Users, Briefcase, Gamepad2, HelpCircle,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Esportes': <Dumbbell className="w-7 h-7" />,
  'Música': <Music className="w-7 h-7" />,
  'Arte': <Palette className="w-7 h-7" />,
  'Tecnologia': <Cpu className="w-7 h-7" />,
  'Culinária': <UtensilsCrossed className="w-7 h-7" />,
  'Viagem': <Plane className="w-7 h-7" />,
  'Fotografia': <Camera className="w-7 h-7" />,
  'Leitura': <BookOpen className="w-7 h-7" />,
  'Cinema': <Film className="w-7 h-7" />,
  'Dança': <Dance className="w-7 h-7" />,
  'Natureza': <Trees className="w-7 h-7" />,
  'Fitness': <HeartPulse className="w-7 h-7" />,
  'Educação': <GraduationCap className="w-7 h-7" />,
  'Social': <Users className="w-7 h-7" />,
  'Negócios': <Briefcase className="w-7 h-7" />,
  'Jogos': <Gamepad2 className="w-7 h-7" />,
  'Outro': <HelpCircle className="w-7 h-7" />,
};

interface WizardCategoryProps {
  selected: string;
  onSelect: (category: string) => void;
}

const item = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1 },
};

export const WizardCategory = memo(({ selected, onSelect }: WizardCategoryProps) => {
  return (
    <div className="flex flex-col items-center px-2">
      <h2 className="text-xl font-heading font-bold text-foreground text-center mb-2">
        Que tipo de atividade você quer organizar?
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Escolha uma categoria para começar
      </p>

      <motion.div
        className="grid grid-cols-3 gap-3 w-full"
        variants={{ show: { transition: { staggerChildren: 0.03 } } }}
        initial="hidden"
        animate="show"
      >
        {CATEGORIES.map((cat) => (
          <motion.button
            key={cat}
            type="button"
            variants={item}
            onClick={() => onSelect(cat)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 active:scale-95 ${
              selected === cat
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:border-primary/30'
            }`}
          >
            {CATEGORY_ICONS[cat] || <HelpCircle className="w-7 h-7" />}
            <span className="text-xs font-semibold leading-tight text-center">{cat}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
});
WizardCategory.displayName = 'WizardCategory';
