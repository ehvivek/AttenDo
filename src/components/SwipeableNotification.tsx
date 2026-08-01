import React, { useState, useEffect } from 'react';
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import styles from './SwipeableNotification.module.css';

interface SwipeableNotificationProps {
  onDelete: () => void;
  onClick: () => void;
  children: React.ReactNode;
}

const SWIPE_THRESHOLD = -80; // Distance required to delete

export const SwipeableNotification: React.FC<SwipeableNotificationProps> = ({ onDelete, onClick, children }) => {
  const controls = useAnimation();
  const x = useMotionValue(0);
  const backgroundOpacity = useTransform(x, [0, -30], [0, 1]);
  const [showUndo, setShowUndo] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (showUndo) {
      setTimeLeft(5);
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            onDelete();
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showUndo, onDelete]);

  const handleDragEnd = async (_event: any, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < SWIPE_THRESHOLD || velocity < -500) {
      // Swiped far enough left or fast enough left
      await controls.start({ x: '-100%', opacity: 0, transition: { duration: 0.2 } });
      setShowUndo(true);
    } else {
      // Bounce back
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 25 } });
    }
  };

  const handleUndo = async () => {
    x.set(0);
    controls.set({ x: 0, opacity: 1 });
    setShowUndo(false);
  };



  if (showUndo) {
    return (
      <motion.div 
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className={styles.undoContainer}
      >
        <span className={styles.undoText}>Notification deleted ({timeLeft}s)</span>
        <button className={styles.undoBtn} onClick={handleUndo}>Undo</button>
      </motion.div>
    );
  }

  return (
    <div className={styles.container}>
      <motion.div className={styles.background} style={{ opacity: backgroundOpacity }}>
        <Trash2 size={24} color="white" />
      </motion.div>
      <motion.div
        drag="x"
        style={{ x, width: '100%', touchAction: 'pan-y' }}
        dragConstraints={{ left: -1000, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        whileTap={{ cursor: 'grabbing' }}
        onClick={onClick}
      >
        {children}
      </motion.div>
    </div>
  );
};
