'use client';

import { motion } from 'framer-motion';

interface BlueScreenOfDeathProps {
  /** Witty message variant */
  variant?: 'admin' | 'player' | 'voter';
}

const MESSAGES = {
  admin: {
    title: 'ADMIN CONSOLE FATAL ERROR',
    subtitle: 'The server has left the building',
    details: [
      '> Critical failure detected in reality.exe',
      '> All your participants are now Schrödinger\'s coders',
      '> Game state has been promoted to "theoretically existing"',
      '> Server decided to touch grass (connection lost)',
    ],
    footer: 'The chaos was too much. Even the server needed a lie down.',
  },
  player: {
    title: 'CATASTROPHIC VIBE FAILURE',
    subtitle: 'Your masterpiece is now lost to the void',
    details: [
      '> Server.exe has stopped vibing',
      '> Your prompts were too powerful for this dimension',
      '> Claude left to contemplate existence',
      '> Connection status: Gone, reduced to atoms',
    ],
    footer: 'Your code was either too beautiful or too cursed. We\'ll never know which.',
  },
  voter: {
    title: 'DEMOCRATIC PROCESS TERMINATED',
    subtitle: 'The election has been cancelled',
    details: [
      '> Voting booth.exe encountered an existential crisis',
      '> Server connection has been yeeted into the sun',
      '> All votes have quantum-tunnelled out of existence',
      '> Reality check failed: server not responding',
    ],
    footer: 'Everyone\'s a winner when nobody can connect! (Nobody\'s a winner.)',
  },
};

export default function BlueScreenOfDeath({ variant = 'player' }: BlueScreenOfDeathProps) {
  const message = MESSAGES[variant];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[9999] bg-neo-blue flex items-center justify-center p-8"
    >
      <div className="max-w-3xl w-full text-white font-mono">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          {/* Sad face */}
          <div className="text-center">
            <motion.div
              animate={{ rotate: [0, -5, 5, -5, 5, 0] }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-9xl mb-4"
            >
              :(
            </motion.div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-black tracking-tight">
              {message.title}
            </h1>
            <p className="text-2xl opacity-90">{message.subtitle}</p>
          </div>

          {/* Error details */}
          <div className="bg-white/10 border-4 border-white p-6 space-y-2">
            <p className="text-lg font-bold mb-4">TECHNICAL GIBBERISH:</p>
            {message.details.map((detail, index) => (
              <motion.p
                key={index}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="text-sm font-light"
              >
                {detail}
              </motion.p>
            ))}
          </div>

          {/* Footer message */}
          <div className="text-center space-y-4">
            <p className="text-lg opacity-90">{message.footer}</p>
            <div className="space-y-2">
              <p className="text-sm opacity-75">
                What you can do:
              </p>
              <ul className="text-sm opacity-75 space-y-1">
                <li>• Refresh the page (won&apos;t help, but it&apos;s worth a shot)</li>
                <li>• Check if the server is actually running</li>
                <li>• Question your life choices that led to this moment</li>
                <li>• Make a cup of tea and try again later</li>
              </ul>
            </div>
          </div>

          {/* Progress bar that goes nowhere */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs opacity-75">
              <span>Attempting to restore connection...</span>
              <span>0%</span>
            </div>
            <div className="w-full h-2 bg-white/20 border-2 border-white">
              <motion.div
                className="h-full bg-white"
                initial={{ width: '0%' }}
                animate={{ width: '5%' }}
                transition={{ duration: 10, ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs opacity-50 text-center">
              (Just kidding, this won&apos;t do anything. The server is gone.)
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
