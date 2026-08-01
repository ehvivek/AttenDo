import React, { useState } from 'react';
import styles from './PollCard.module.css';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
}

export interface Poll {
  id: string;
  question: string;
  target_batch: string;
  created_at: string;
  created_by: string;
  options?: PollOption[];
  votes?: PollVote[];
}

interface PollCardProps {
  poll: Poll;
  onVote: () => void;
}

const PollCard: React.FC<PollCardProps> = ({ poll, onVote }) => {
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const totalVotes = poll.votes?.length || 0;
  
  // Find if current user voted
  const userVote = poll.votes?.find(v => v.user_id === user?.id);
  const hasVoted = !!userVote;
  
  // Admins can see results without voting
  const showResults = hasVoted || user?.role === 'admin';

  const handleVote = async (optionId: string) => {
    if (user?.role === 'admin') return;
    
    if (hasVoted && userVote?.option_id === optionId) return;
    
    try {
      if (hasVoted) {
        const { error } = await supabase
          .from('poll_votes')
          .update({ option_id: optionId })
          .eq('poll_id', poll.id)
          .eq('user_id', user?.id);
          
        if (error) console.error('Error updating vote:', error);
        else onVote();
      } else {
        const { error } = await supabase
          .from('poll_votes')
          .insert({
            poll_id: poll.id,
            option_id: optionId,
            user_id: user?.id
          });
          
        if (error) console.error('Error voting:', error);
        else onVote();
      }
    } catch (err) {
      console.error('Failed to cast vote:', err);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('polls').delete().eq('id', poll.id);
      if (error) {
        console.error('Error deleting poll:', error);
      } else {
        setShowDeleteConfirm(false);
        onVote(); // Refreshes the list
      }
    } catch (err) {
      console.error('Failed to delete poll:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getOptionStats = (optionId: string) => {
    const votesForOption = poll.votes?.filter(v => v.option_id === optionId).length || 0;
    const percentage = totalVotes > 0 ? Math.round((votesForOption / totalVotes) * 100) : 0;
    return { votesForOption, percentage };
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.question}>{poll.question}</h3>
        <div className={styles.meta}>
          <span className={styles.batchBadge}>{poll.target_batch}</span>
          {user?.role === 'admin' && (
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '0.25rem' }}
              title="Delete Poll"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      
      <div className={styles.options}>
        {poll.options?.map((option) => {
          const { percentage } = getOptionStats(option.id);
          const isSelected = userVote?.option_id === option.id;
          
          return (
            <div 
              key={option.id}
              className={`${styles.option} ${showResults ? styles.voted : ''} ${isSelected ? styles.selected : ''} ${user?.role !== 'admin' ? styles.interactive : ''}`}
              onClick={() => handleVote(option.id)}
              style={{ cursor: user?.role === 'admin' ? 'default' : 'pointer' }}
            >
              <span className={styles.optionText}>{option.text}</span>
              {showResults && (
                <>
                  <span className={styles.optionPercentage}>{percentage}%</span>
                  <div 
                    className={styles.progressBar} 
                    style={{ width: `${percentage}%` }}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
      
      {showResults && (
        <div className={styles.totalVotes}>
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        </div>
      )}

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          >
            <motion.div 
              className={styles.modalContent}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>
                <AlertCircle size={48} />
              </div>
              <h3>Delete Poll</h3>
              <p>Are you sure you want to delete this poll? This action cannot be undone and all votes will be lost.</p>
              
              <div className={styles.modalActions}>
                <button 
                  className={styles.cancelButton}
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button 
                  className={styles.confirmButton}
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Poll'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PollCard;
