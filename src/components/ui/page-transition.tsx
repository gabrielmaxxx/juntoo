import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  /** Unique key for AnimatePresence (e.g. route path) */
  pageKey?: string;
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const PageTransition = ({ children, className, pageKey }: PageTransitionProps) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={pageKey}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);

/** Wrapper for staggered list items */
interface AnimatedListProps {
  children: ReactNode;
  className?: string;
}

const listVariants = {
  animate: {
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

export const AnimatedList = ({ children, className }: AnimatedListProps) => (
  <motion.div
    variants={listVariants}
    initial="initial"
    animate="animate"
    className={className}
  >
    {children}
  </motion.div>
);

export const AnimatedItem = ({ children, className }: { children: ReactNode; className?: string }) => (
  <motion.div variants={itemVariants} className={className}>
    {children}
  </motion.div>
);
