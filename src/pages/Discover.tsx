import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Poll, PollVote } from '../components/PollCard';
import PollCard from '../components/PollCard';
import styles from './Discover.module.css';
import { Plus, X, BarChart2 } from 'lucide-react';

const BATCHES = ['D', 'D1', 'D2', 'D3'];

const Discover: React.FC = () => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Create Poll State
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [targetBatch, setTargetBatch] = useState(user?.batch || 'A1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      
      // If student, only fetch polls for their batch (and 'All')
      let query = supabase.from('polls').select('*').order('created_at', { ascending: false });
      
      if (user?.role !== 'admin') {
         const targetBatches = ['All'];
         if (user?.batch) {
           targetBatches.push(user.batch);
           targetBatches.push(user.batch.replace(/[0-9]/g, '')); // Also include parent batch (e.g., 'D' if student is 'D1')
         }
         query = query.in('target_batch', targetBatches);
      }
      
      const { data: pollsData, error: pollsError } = await query;
      
      if (pollsError) throw pollsError;
      
      if (!pollsData || pollsData.length === 0) {
        setPolls([]);
        return;
      }

      // Fetch options for these polls
      const pollIds = pollsData.map(p => p.id);
      
      const { data: optionsData, error: optionsError } = await supabase
        .from('poll_options')
        .select('*')
        .in('poll_id', pollIds);
        
      if (optionsError) throw optionsError;

      // Fetch votes for these polls
      const { data: votesData, error: votesError } = await supabase
        .from('poll_votes')
        .select('*')
        .in('poll_id', pollIds);
        
      if (votesError) throw votesError;

      // Combine
      const completePolls: Poll[] = pollsData.map(poll => ({
        ...poll,
        options: optionsData?.filter(o => o.poll_id === poll.id) || [],
        votes: votesData?.filter(v => v.poll_id === poll.id) || []
      }));

      setPolls(completePolls);
    } catch (err) {
      console.error('Error fetching polls:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
    
    // Subscribe to new votes
    const votesSubscription = supabase
      .channel('public:poll_votes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'poll_votes' }, payload => {
        const newVote = payload.new as PollVote;
        setPolls(currentPolls => 
          currentPolls.map(poll => 
            poll.id === newVote.poll_id 
              ? { ...poll, votes: [...(poll.votes || []), newVote] }
              : poll
          )
        );
      })
      .subscribe();

    // Subscribe to new polls
    const pollsSubscription = supabase
      .channel('public:polls')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'polls' }, () => {
        // Just refetch everything if a new poll is added to ensure options are loaded too
        fetchPolls();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(votesSubscription);
      supabase.removeChannel(pollsSubscription);
    };
  }, [user?.batch, user?.role]);

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = [...options];
      newOptions.splice(index, 1);
      setOptions(newOptions);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || options.some(opt => !opt.trim())) return;
    
    setIsSubmitting(true);
    try {
      // 1. Create Poll
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .insert({
          question,
          target_batch: targetBatch,
          created_by: user?.id
        })
        .select()
        .single();
        
      if (pollError) throw pollError;
      
      // 2. Create Options
      const pollOptions = options.map(opt => ({
        poll_id: pollData.id,
        text: opt.trim()
      }));
      
      const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(pollOptions);
        
      if (optionsError) throw optionsError;
      
      // 3. Create Notification
      await supabase.from('notifications').insert({
        title: 'New Poll',
        message: question,
        target_batch: targetBatch,
        type: 'announcement',
        link: '/discover' // Or leave null since it's just a general notification
      });
      
      setShowModal(false);
      setQuestion('');
      setOptions(['', '']);
      
      // The realtime subscription will trigger a refetch, but let's do it manually just in case
      fetchPolls();
      
    } catch (err) {
      console.error('Error creating poll:', err);
      alert('Failed to create poll. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>
          <BarChart2 className="text-accent" />
          Discover
        </h1>
        {user?.role === 'admin' && (
          <button className={styles.createButton} onClick={() => setShowModal(true)}>
            <Plus size={18} />
            Create Poll
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-secondary)' }}>Loading polls...</div>
      ) : polls.length > 0 ? (
        <div className={styles.pollList}>
          {polls.map(poll => (
            <PollCard key={poll.id} poll={poll} onVote={fetchPolls} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <BarChart2 size={48} color="var(--text-secondary)" opacity={0.5} />
          <h3>No Polls Yet</h3>
          <p>There are no active polls for your batch at the moment.</p>
        </div>
      )}

      {/* Create Poll Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Create New Poll</h2>
              <button className={styles.closeButton} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreatePoll}>
              <div className={styles.formGroup}>
                <label>Question</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  placeholder="What time should we hold the extra class?" 
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Target Batch</label>
                <select 
                  className={styles.input}
                  value={targetBatch}
                  onChange={(e) => setTargetBatch(e.target.value)}
                >
                  <option value="All">All Batches</option>
                  {BATCHES.map((b: string) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label>Options</label>
                {options.map((opt, index) => (
                  <div key={index} className={styles.optionInputGroup}>
                    <input 
                      type="text" 
                      className={styles.input} 
                      placeholder={`Option ${index + 1}`} 
                      value={opt}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      required
                    />
                    {options.length > 2 && (
                      <button 
                        type="button" 
                        className={styles.removeOptionButton}
                        onClick={() => handleRemoveOption(index)}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                
                {options.length < 5 && (
                  <button 
                    type="button" 
                    className={styles.addOptionButton}
                    onClick={handleAddOption}
                  >
                    <Plus size={16} />
                    Add Option
                  </button>
                )}
              </div>
              
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={isSubmitting || !question || options.some(opt => !opt.trim())}
              >
                {isSubmitting ? 'Creating...' : 'Create Poll'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Discover;
