import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCheckProps {
  size?: number;
  className?: string;
}

export const AnimatedCheck = ({ size = 20, className }: AnimatedCheckProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={cn("text-primary-foreground", className)}
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.1 }}
  >
    <motion.circle
      cx="12"
      cy="12"
      r="10"
      fill="currentColor"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.2 }}
      className="text-success"
    />
    <motion.path
      d="M8 12.5l2.5 2.5 5.5-5.5"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    />
  </motion.svg>
);
