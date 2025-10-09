'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ReactionType } from '@/lib/types';

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

interface FloatingEmojisProps {
  reactions: Record<ReactionType, number>;
}

const EMOJI_MAP: Record<ReactionType, string> = {
  fire: '🔥',
  laugh: '😂',
  think: '🤔',
  shock: '😱',
  cool: '😎',
};

export default function FloatingEmojis({ reactions }: FloatingEmojisProps) {
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);

  useEffect(() => {
    // Detect new reactions by comparing counts
    const reactionTypes = Object.keys(reactions) as ReactionType[];

    reactionTypes.forEach((type) => {
      const count = reactions[type];

      // Check how many of this emoji type we currently have
      const currentCount = emojis.filter(e => e.emoji === EMOJI_MAP[type]).length;

      // If count increased, add new emoji
      if (count > currentCount) {
        const newEmojis: FloatingEmoji[] = [];
        for (let i = currentCount; i < count; i++) {
          newEmojis.push({
            id: `${type}-${Date.now()}-${Math.random()}`,
            emoji: EMOJI_MAP[type],
            x: Math.random() * 80 + 10, // 10-90% of screen width
            y: Math.random() * 80 + 10, // 10-90% of screen height
          });
        }

        setEmojis(prev => [...prev, ...newEmojis]);

        // Remove emojis after animation completes
        setTimeout(() => {
          setEmojis(prev => prev.filter(e => !newEmojis.find(ne => ne.id === e.id)));
        }, 3000);
      }
    });
  }, [reactions, emojis]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {emojis.map((emoji) => (
          <motion.div
            key={emoji.id}
            initial={{
              opacity: 0,
              scale: 0,
              x: `${emoji.x}vw`,
              y: `${emoji.y}vh`,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0, 2, 2, 0],
              y: [`${emoji.y}vh`, `${emoji.y - 20}vh`],
            }}
            exit={{
              opacity: 0,
              scale: 0,
            }}
            transition={{
              duration: 3,
              ease: 'easeOut',
            }}
            className="absolute text-6xl"
            style={{
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {emoji.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
