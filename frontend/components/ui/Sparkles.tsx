'use client';
import { motion } from 'framer-motion';

export function Sparkles({ count = 20 }: { count?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full"
          initial={{
            x: '50%',
            y: '50%',
            opacity: 1,
            scale: 0
          }}
          animate={{
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
            opacity: [1, 0],
            scale: [0, 1, 0]
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.05,
            ease: 'easeOut'
          }}
        />
      ))}
    </div>
  );
}
