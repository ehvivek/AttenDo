import React, { useState, useEffect, useRef } from 'react';
import { Folder, FileText, Download, Loader2, ArrowLeft, Plus, FolderPlus, Trash2, Search, Pin, Image as ImageIcon, Video, File as FileIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';
import styles from './DashboardViews.module.css';
import { Skeleton } from '../components/Skeleton';

interface Asset {
  id: string;
  title: string;
  type: string;
  file_url: string;
  folder: string;
  created_at: string;
  color?: string;
  is_pinned_admin?: boolean;
}

interface FolderNode {
  id: string;
  title: string;
}

const Assets: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [history, setHistory] = useState<FolderNode[]>([{ id: 'root', title: 'Home' }]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'svg':
        return <ImageIcon size={20} />;
      case 'mp4':
      case 'webm':
      case 'mov':
      case 'avi':
        return <Video size={20} />;
      case 'pdf':
      case 'txt':
      case 'csv':
        return <FileText size={20} />;
      default:
        return <FileIcon size={20} />;
    }
  };
  const [newFolderName, setNewFolderName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  
  const [readAssets, setReadAssets] = useState<Set<string>>(() => {
    // We will initialize this properly inside useEffect when user is available
    return new Set();
  });
  
  const [studentPins, setStudentPins] = useState<Set<string>>(() => {
    return new Set();
  });

  useEffect(() => {
    if (user) {
      // First load from local storage
      const savedReads = localStorage.getItem(`attendo_read_assets_${user.id}`);
      if (savedReads) setReadAssets(new Set(JSON.parse(savedReads)));
      
      const savedPins = localStorage.getItem(`attendo_pinned_assets_${user.id}`);
      if (savedPins) setStudentPins(new Set(JSON.parse(savedPins)));

      // Then sync from Supabase user metadata
      supabase.auth.getUser().then(({ data: { user: authUser } }) => {
        if (authUser && authUser.user_metadata) {
          if (authUser.user_metadata.read_assets) {
            setReadAssets(prev => {
              const merged = new Set([...prev, ...authUser.user_metadata.read_assets]);
              localStorage.setItem(`attendo_read_assets_${user.id}`, JSON.stringify([...merged]));
              return merged;
            });
          }
          if (authUser.user_metadata.pinned_assets) {
            setStudentPins(prev => {
              const merged = new Set([...prev, ...authUser.user_metadata.pinned_assets]);
              localStorage.setItem(`attendo_pinned_assets_${user.id}`, JSON.stringify([...merged]));
              return merged;
            });
          }
        }
      });
    }
  }, [user]);

  const toggleStudentPin = async (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation();
    if (!user) return;
    const newSet = new Set(studentPins);
    if (newSet.has(assetId)) {
      newSet.delete(assetId);
    } else {
      newSet.add(assetId);
    }
    setStudentPins(newSet);
    const arr = [...newSet];
    localStorage.setItem(`attendo_pinned_assets_${user.id}`, JSON.stringify(arr));
    
    await supabase.auth.updateUser({
      data: { pinned_assets: arr }
    });
  };

  const toggleAdminPin = async (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    if (!isAdmin) return;
    
    // Optimistic update
    setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, is_pinned_admin: !a.is_pinned_admin } : a));
    
    try {
      const { error } = await supabase.from('assets').update({ is_pinned_admin: !asset.is_pinned_admin }).eq('id', asset.id);
      if (error) throw error;
    } catch (error: any) {
      console.error('Failed to toggle admin pin', error);
      alert('Failed to pin: ' + error.message);
    }
  };

  const markAsRead = async (assetId: string) => {
    if (!user) return;
    const newSet = new Set(readAssets).add(assetId);
    setReadAssets(newSet);
    const arr = [...newSet].slice(-200); // limit to 200 to prevent metadata bloat
    localStorage.setItem(`attendo_read_assets_${user.id}`, JSON.stringify(arr));
    
    await supabase.auth.updateUser({
      data: { read_assets: arr }
    });
  };

  const isNew = (created_at: string) => {
    const ageInMs = Date.now() - new Date(created_at).getTime();
    return ageInMs < 48 * 60 * 60 * 1000; // 48 hours
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFolder = history[history.length - 1];

  useEffect(() => {
    fetchAssets(currentFolder.id);

    // Subscribe to real-time changes so student's view updates instantly when admin deletes or uploads
    const subscription = supabase
      .channel(`public:assets:${currentFolder.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assets' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setAssets(prev => prev.filter(a => a.id !== payload.old.id));
          } else if (payload.eventType === 'INSERT') {
            if (payload.new.folder === currentFolder.id) {
              setAssets(prev => {
                if (prev.find(a => a.id === payload.new.id)) return prev;
                // Files are ordered with folders first, then by created_at. 
                // We'll just fetch again silently to maintain perfect ordering without flashing the loader.
                fetchAssetsSilently(currentFolder.id);
                return prev;
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            setAssets(prev => prev.map(a => a.id === payload.new.id ? payload.new as Asset : a));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [currentFolder.id]);

  const fetchAssetsSilently = async (folderId: string) => {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('folder', folderId)
      .order('type', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAssets(data);
    }
  };

  const fetchAssets = async (folderId: string = 'root') => {
    setLoading(true);
    
    // Simulate slight network delay to allow skeleton to be visible
    await new Promise(resolve => setTimeout(resolve, 600));

    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('folder', folderId)
      .order('type', { ascending: false }) // 'folder' > 'file'
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assets:', error);
    } else {
      setAssets(data || []);
    }
    setLoading(false);
  };

  const handleUploadClick = () => {
    if (!isAdmin) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      const cloudinaryRes = await uploadToCloudinary(file, (progress) => {
        setUploadProgress(progress);
      });
      
      const { data, error } = await supabase
        .from('assets')
        .insert({
          title: file.name,
          type: 'file',
          file_url: cloudinaryRes.secure_url,
          folder: currentFolder.id,
          uploaded_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      // Emit real-time notification for the uploaded asset
      const { error: notifError } = await supabase.from('notifications').insert({
        title: 'New Resource Uploaded',
        message: `Admin uploaded a new file: ${file.name}`,
        link: 'assets',
        target_batch: 'All', // We can broadcast to everyone for now
        type: 'asset'
      });
      
      if (notifError) {
        console.error('Failed to insert notification:', notifError);
        alert('Asset uploaded, but notification failed: ' + notifError.message);
      }
      
      setAssets(prev => [...prev, data]);
    } catch (error: any) {
      console.error(error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !user || !isAdmin) return;

    try {
      const { data, error } = await supabase
        .from('assets')
        .insert({
          title: newFolderName.trim(),
          type: 'folder',
          folder: currentFolder.id,
          uploaded_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setAssets(prev => [data, ...prev]);
      setNewFolderName('');
      setIsCreatingFolder(false);
    } catch (error: any) {
      console.error(error);
      alert('Failed to create folder: ' + error.message);
    }
  };

  const handleDeleteAsset = (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    if (!isAdmin) return;
    setAssetToDelete(asset);
  };

  const confirmDelete = async () => {
    if (!assetToDelete) return;
    const asset = assetToDelete;

    try {
      setDeletingId(asset.id);
      
      // If it's a file, delete from Cloudinary first
      if (asset.type === 'file' && asset.file_url) {
        try {
          await deleteFromCloudinary(asset.file_url);
        } catch (cloudinaryError) {
          console.warn('Failed to delete from Cloudinary (might already be deleted):', cloudinaryError);
        }
      }

      // Delete from Supabase
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', asset.id);

      if (error) throw error;

      setAssets(prev => prev.filter(a => a.id !== asset.id));
    } catch (error: any) {
      console.error(error);
      alert('Failed to delete: ' + error.message);
    } finally {
      setDeletingId(null);
      setAssetToDelete(null);
    }
  };

  const handleColorChange = async (assetId: string, newColor: string) => {
    // Optimistic update
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, color: newColor } : a));
    
    try {
      const { error } = await supabase.from('assets').update({ color: newColor }).eq('id', assetId);
      if (error) throw error;
    } catch (error: any) {
      console.error('Failed to update color', error);
      alert('Failed to update color: ' + error.message);
    }
  };

  const openFolder = (folderId: string, folderTitle: string) => {
    setHistory(prev => [...prev, { id: folderId, title: folderTitle }]);
  };

  const goBack = () => {
    if (history.length > 1) {
      setHistory(prev => prev.slice(0, -1));
    }
  };

  const handleView = (e: React.MouseEvent | null, asset: Asset) => {
    if (e) e.stopPropagation();
    markAsRead(asset.id);
    window.open(asset.file_url, '_blank');
  };

  const handleDownload = (e: React.MouseEvent | null, asset: Asset) => {
    if (e) e.stopPropagation();
    markAsRead(asset.id);
    // Add fl_attachment to force download
    let downloadUrl = asset.file_url;
    if (downloadUrl.includes('res.cloudinary.com') && downloadUrl.includes('/upload/')) {
      downloadUrl = downloadUrl.replace('/upload/', '/upload/fl_attachment/');
    }
    window.open(downloadUrl, '_blank');
  };

  const filteredAssets = assets.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const sortAssets = (a: Asset, b: Asset) => {
    if (a.is_pinned_admin && !b.is_pinned_admin) return -1;
    if (!a.is_pinned_admin && b.is_pinned_admin) return 1;
    
    const aStudentPinned = studentPins.has(a.id);
    const bStudentPinned = studentPins.has(b.id);
    if (aStudentPinned && !bStudentPinned) return -1;
    if (!aStudentPinned && bStudentPinned) return 1;
    
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  };

  const folders = filteredAssets.filter(a => a.type === 'folder').sort(sortAssets);
  const files = filteredAssets.filter(a => a.type === 'file').sort(sortAssets);

  return (
    <div className={styles.container} style={{ overflowX: 'hidden', maxWidth: '100%' }}>
      {/* Header and Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {history.length > 1 && (
              <button 
                onClick={goBack} 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
                className="hover-bg"
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <h2 className={styles.title} style={{ margin: 0 }}>
              {history.length > 1 ? currentFolder.title : 'Assets & Resources'}
            </h2>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Bar for everyone */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={18} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '0.5rem 1rem 0.5rem 2.25rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', outline: 'none', background: 'var(--card-bg)', color: 'var(--text-color)', width: '200px' }}
              />
            </div>

            {isAdmin && (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                  accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                />
                <button 
                  className="btn-secondary"
                  onClick={() => setIsCreatingFolder(true)}
                  style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--text-color)', border: '1.5px solid var(--border-color)', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <FolderPlus size={16} /> Create Folder
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleUploadClick}
                  disabled={uploading}
                  style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-color)', color: 'var(--accent-text)', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {uploading ? <Loader2 size={16} className={styles.spin} /> : <Plus size={16} />}
                  {uploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            )}
          </div>
        </div>

        {uploading && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            className={styles.uploadProgressContainer}
            style={{ marginTop: '1.5rem', background: 'var(--glass-bg)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-color)' }}>Uploading {fileInputRef.current?.files?.[0]?.name}...</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-color)' }}>{uploadProgress}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
              <motion.div 
                style={{ height: '100%', background: 'var(--accent-color)', borderRadius: '4px' }}
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Create Folder Form */}
      {isCreatingFolder && (
        <form onSubmit={handleCreateFolder} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'var(--card-bg)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border-color)' }}>
          <input 
            type="text" 
            placeholder="Folder Name" 
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', outline: 'none' }}
            autoFocus
          />
          <button type="submit" style={{ padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-color)', color: 'var(--accent-text)', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            Create
          </button>
          <button type="button" onClick={() => setIsCreatingFolder(false)} style={{ padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--text-secondary)', border: '1.5px solid var(--border-color)', cursor: 'pointer', fontWeight: 500 }}>
            Cancel
          </button>
        </form>
      )}

      {/* Content Area */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0, width: '100%' }}>
          <section>
            <h3 className={styles.sectionTitle} style={{ fontSize: '1rem', marginBottom: '1rem', opacity: 0.8 }}>Folders</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className={styles.statCard} style={{ display: 'flex', alignItems: 'center', padding: '1rem' }}>
                  <Skeleton width="24px" height="24px" borderRadius="var(--radius-sm)" style={{ marginRight: '1rem' }} />
                  <Skeleton width="60%" height="1.2rem" />
                </div>
              ))}
            </div>
          </section>
          
          <section>
            <h3 className={styles.sectionTitle} style={{ fontSize: '1rem', marginBottom: '1rem', opacity: 0.8 }}>Files</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className={styles.statCard} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Skeleton width="40px" height="40px" borderRadius="var(--radius-md)" />
                    <Skeleton width="24px" height="24px" borderRadius="var(--radius-full)" />
                  </div>
                  <Skeleton width="80%" height="1.2rem" style={{ marginTop: '0.5rem' }} />
                  <Skeleton width="40%" height="0.8rem" />
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : assets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
          <Folder size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
          <p>This folder is empty.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0, width: '100%' }}>
          
          {/* Folders List */}
          {folders.length > 0 && (
            <section>
              <h3 className={styles.sectionTitle} style={{ fontSize: '1rem', marginBottom: '1rem', opacity: 0.8 }}>Folders</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                {folders.map(folder => (
                  <div 
                    key={folder.id} 
                    onClick={() => openFolder(folder.id, folder.title)}
                    className={styles.statCard} 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '1rem', border: '1.5px solid var(--border-color)', position: 'relative', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0, flex: 1 }}>
                      <div className={styles.iconWrapper} style={{ backgroundColor: `${folder.color || '#3b82f6'}1A`, color: folder.color || '#3b82f6', padding: '0.5rem', borderRadius: '8px', flexShrink: 0 }}>
                        <Folder size={24} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1, paddingRight: '0.5rem' }}>
                        <h4 style={{ margin: '0', fontWeight: 600, fontSize: '1rem', color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.title}</h4>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 10, flexShrink: 0 }}>
                      <button 
                        onClick={(e) => isAdmin ? toggleAdminPin(e, folder) : toggleStudentPin(e, folder.id)}
                        style={{ background: 'transparent', padding: '0.5rem', borderRadius: '50%', border: 'none', color: folder.is_pinned_admin ? '#eab308' : studentPins.has(folder.id) ? '#3b82f6' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', transition: 'all 0.2s' }}
                        title={folder.is_pinned_admin ? "Pinned by Admin" : studentPins.has(folder.id) ? "Unpin Folder" : "Pin Folder"}
                        className="hover-bg"
                      >
                        <Pin size={18} fill={(folder.is_pinned_admin || studentPins.has(folder.id)) ? 'currentColor' : 'none'} />
                      </button>
                      {isAdmin && (
                        <>
                          <input 
                            type="color" 
                            value={folder.color || '#3b82f6'} 
                            onChange={(e) => handleColorChange(folder.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '28px', height: '28px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                            title="Change Folder Color"
                          />
                          <button 
                            onClick={(e) => handleDeleteAsset(e, folder)}
                            disabled={deletingId === folder.id}
                            style={{ background: 'transparent', padding: '0.5rem', borderRadius: '50%', border: 'none', color: '#ef4444', cursor: deletingId === folder.id ? 'not-allowed' : 'pointer', display: 'flex' }}
                            title="Delete Folder"
                          >
                            {deletingId === folder.id ? <Loader2 size={18} className={styles.spin} /> : <Trash2 size={18} />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Files List */}
          {files.length > 0 && (
            <section>
              <h3 className={styles.sectionTitle} style={{ fontSize: '1rem', marginBottom: '1rem', opacity: 0.8 }}>Files</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', boxSizing: 'border-box' }}>
                {files.map((file) => (
                  <div 
                    key={file.id} 
                    className={styles.statCard} 
                    onClick={(e) => handleView(e, file)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1.5px solid var(--border-color)', cursor: 'pointer', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0, flex: 1 }}>
                      <div className={styles.iconWrapper} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.5rem', borderRadius: '8px', flexShrink: 0 }}>
                        {getFileIcon(file.title)}
                      </div>
                      <div style={{ minWidth: 0, flex: 1, paddingRight: '0.5rem' }}>
                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, width: '100%' }}>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{file.title}</span>
                          {isNew(file.created_at) && !readAssets.has(file.id) && (
                            <span style={{ 
                              background: 'var(--accent-color)', 
                              color: 'var(--accent-text)', 
                              fontSize: '0.6rem', 
                              fontWeight: 800, 
                              padding: '0.125rem 0.375rem', 
                              borderRadius: '1rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}>
                              New
                            </span>
                          )}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Uploaded {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button 
                        onClick={(e) => isAdmin ? toggleAdminPin(e, file) : toggleStudentPin(e, file.id)}
                        style={{ background: 'rgba(0,0,0,0.02)', padding: '0.5rem', borderRadius: '50%', border: 'none', color: file.is_pinned_admin ? '#eab308' : studentPins.has(file.id) ? '#3b82f6' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', transition: 'all 0.2s' }}
                        title={file.is_pinned_admin ? "Pinned by Admin" : studentPins.has(file.id) ? "Unpin File" : "Pin File"}
                        className="hover-bg"
                      >
                        <Pin size={18} fill={(file.is_pinned_admin || studentPins.has(file.id)) ? 'currentColor' : 'none'} />
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={(e) => handleDeleteAsset(e, file)}
                          disabled={deletingId === file.id}
                          style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '50%', border: 'none', color: '#ef4444', cursor: deletingId === file.id ? 'not-allowed' : 'pointer', display: 'flex' }}
                          title="Delete File"
                        >
                          {deletingId === file.id ? <Loader2 size={18} className={styles.spin} /> : <Trash2 size={18} />}
                        </button>
                      )}
                      <button 
                        onClick={(e) => handleDownload(e, file)}
                        style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem', borderRadius: '50%', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex' }}
                        title="Download File"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {assetToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(2px)' }}
            onClick={() => setAssetToDelete(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', maxWidth: '360px', width: '100%', boxShadow: 'var(--shadow-lg)', border: '1.5px solid var(--border-color)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem' }}>
                <Trash2 size={18} color="var(--danger-color)" />
                Confirm Deletion
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Are you sure you want to delete <strong>"{assetToDelete.title}"</strong>?
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button 
                  onClick={() => setAssetToDelete(null)}
                  style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--text-color)', border: '1.5px solid var(--border-color)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={deletingId === assetToDelete.id}
                  style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-color)', color: 'white', border: 'none', cursor: deletingId === assetToDelete.id ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {deletingId === assetToDelete.id ? <Loader2 size={16} className={styles.spin} /> : <Trash2 size={16} />}
                  {deletingId === assetToDelete.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Assets;
