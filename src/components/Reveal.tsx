"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";

/** Entrada suave ao rolar. Com "reduzir movimento" ligado no sistema, aparece direto. */
export function Reveal({ children, delay = 0, className, y = 22 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  if (mounted && reduce) return <div className={className}>{children}</div>;
  
  return (
    <motion.div
      className={className}
      initial={mounted ? { opacity: 0, y } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function PageIn({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  if (mounted && reduce) return <>{children}</>;
  
  return (
    <motion.div 
      initial={mounted ? { opacity: 0, y: 12 } : false} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
