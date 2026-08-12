import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { APP_VERSION_CODE } from '../config/version';
import styles from './UpdateChecker.module.css';

interface UpdateData {
  version_code: number;
  version_name: string;
  release_notes: string;
  download_url: string;
  is_mandatory: boolean;
}

const UpdateChecker: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateData | null>(null);
  const [ignored, setIgnored] = useState(false);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // Fetch the latest version from Supabase
        const { data, error } = await supabase
          .from('app_versions')
          .select('*')
          .order('version_code', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') { // Ignore "no rows returned" error
            console.error('Error checking for updates:', error);
          }
          return;
        }

        if (data && data.version_code > APP_VERSION_CODE) {
          setUpdateAvailable(data);
        }
      } catch (err) {
        console.error('Failed to check for updates:', err);
      }
    };

    checkForUpdates();
  }, []);

  if (!updateAvailable || ignored) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.iconContainer}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </div>
        
        <h2 className={styles.title}>Update Available</h2>
        <p className={styles.subtitle}>
          A new version of AttenDo is ready to install!
        </p>

        <div className={styles.versionBadge}>
          {updateAvailable.version_name}
        </div>

        {updateAvailable.release_notes && (
          <div className={styles.releaseNotes}>
            <h4>What's New</h4>
            <p>{updateAvailable.release_notes}</p>
          </div>
        )}

        <button 
          className={styles.updateButton}
          onClick={() => window.location.href = updateAvailable.download_url}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Update Now
        </button>

        {!updateAvailable.is_mandatory && (
          <button 
            className={styles.laterButton}
            onClick={() => setIgnored(true)}
          >
            Maybe Later
          </button>
        )}
      </div>
    </div>
  );
};

export default UpdateChecker;
