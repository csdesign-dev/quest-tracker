import React, { useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import {
  LayoutDashboard, CalendarCheck, BarChart3, ListTodo, Zap, Menu, X,
  Download, Upload, LogOut, User, HelpCircle, RefreshCw, Users, Plus
} from 'lucide-react';
import {
  loadTasks, saveTasks, exportTasksJSON, importTasksJSON,
  loadProfiles, saveProfiles, getActiveProfileId, setActiveProfileId,
  createProfile, deleteProfile, migrateOldData,
  createDailyBackup, restoreFromBackup
} from './utils/storage';
import { pushData, pullData } from './utils/sync';
import { getFamilyTasks, getFamilyApprovals, submitTaskCompletion } from './utils/family';
import { getAllPeriodScores } from './utils/scoring';
import { defaultTasks } from './data/defaultTasks';
import TodayView from './components/TodayView';
import StatsView from './components/StatsView';
import TaskManager from './components/TaskManager';
import ProfileSelector from './components/ProfileSelector';
import SupportView from './components/SupportView';
import AuthScreen from './components/AuthScreen';
import FamilyView from './components/FamilyView';
import { supabase } from './utils/supabase';

const NAV_ITEMS = [
  { id: 'today', label: 'Сьогодні', icon: CalendarCheck },
  { id: 'stats', label: 'Статистика', icon: BarChart3 },
  { id: 'tasks', label: 'Задачі', icon: ListTodo },
  { id: 'family', label: "Сім'я", icon: Users },
  { id: 'support', label: 'Підтримка', icon: HelpCircle },
];

export default function App() {
  const [profiles, setProfiles] = useState(() => loadProfiles());
  const [activeProfileId, setActiveProfile] = useState(() => getActiveProfileId());
  
  // Parse URL for join code
  const urlParams = new URLSearchParams(window.location.search);
  const urlJoinCode = urlParams.get('joinCode');
  
  const [activePage, setActivePage] = useState(urlJoinCode ? 'family' : 'today');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Supabase Auth State
  const [session, setSession] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [showAuthScreen, setShowAuthScreen] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setAuthInitialized(true);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthInitialized(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-migrate old data on first load
  useEffect(() => {
    if (profiles.length === 0) {
      const migrated = migrateOldData();
      if (migrated) {
        setProfiles(loadProfiles());
        setActiveProfile(migrated.id);
      }
    }
  }, []);

  const activeProfile = session 
    ? { id: session.user.id, name: session.user.email, color: '#7c3aed' }
    : profiles.find(p => p.id === activeProfileId);
    
  const isLoggedIn = !!activeProfile;

  // Determine the effective profile ID for storage
  const currentProfileId = session ? session.user.id : activeProfileId;

  const [tasks, setTasks] = useState(() => {
    if (activeProfileId) {
      const saved = loadTasks(activeProfileId);
      return saved || defaultTasks;
    }
    return defaultTasks;
  });
  
  const [familyTasksData, setFamilyTasksData] = useState([]);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  // Force restore from cloud (bypasses profile_id matching)
  const forceRestoreFromCloud = async () => {
    if (!supabase || !session) return;
    setIsRecovering(true);
    try {
      const { data, error } = await supabase
        .from('cloud_sync')
        .select('tasks_data')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!error && data?.tasks_data && Array.isArray(data.tasks_data) && data.tasks_data.length > 0) {
        setTasks(data.tasks_data);
        saveTasks(data.tasks_data, currentProfileId);
        createDailyBackup(data.tasks_data, currentProfileId);
        setShowRecoveryBanner(false);
        alert(`\u2705 \u0412\u0456\u0434\u043d\u043e\u0432\u043b\u0435\u043d\u043e ${data.tasks_data.length} \u0437\u0430\u0434\u0430\u0447!`);
      } else {
        alert('\u274c \u0414\u0430\u043d\u0456 \u0432 \u0445\u043c\u0430\u0440\u0456 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e.');
      }
    } catch (err) {
      console.error('Recovery failed:', err);
      alert('\u274c \u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0432\u0456\u0434\u043d\u043e\u0432\u043b\u0435\u043d\u043d\u044f: ' + err.message);
    }
    setIsRecovering(false);
  };

  // Reload tasks when profile or session changes
  useEffect(() => {
    if (currentProfileId) {
      let saved = loadTasks(currentProfileId);
      // Захист: якщо дані порожні або пошкоджені — відновити з бекапу
      if (!saved || !Array.isArray(saved) || saved.length === 0) {
        const backup = restoreFromBackup(currentProfileId);
        if (backup && backup.length > 0) {
          console.log('[Quest Tracker] Дані відновлено з резервної копії!');
          saved = backup;
          saveTasks(saved, currentProfileId);
        }
      }
      setTasks(saved || defaultTasks);

      // Cloud Sync Pull (Local-First)
      const syncPull = async () => {
        setIsSyncing(true);
        try {
          const cloudTasks = await pullData(currentProfileId);
          if (cloudTasks && Array.isArray(cloudTasks) && cloudTasks.length > 0) {
            setTasks(cloudTasks);
            setShowRecoveryBanner(false);
          } else if (session) {
            // pullData failed with profile_id, try without it
            const { data } = await supabase
              .from('cloud_sync')
              .select('tasks_data')
              .eq('user_id', session.user.id)
              .order('updated_at', { ascending: false })
              .limit(1)
              .single();
            if (data?.tasks_data && Array.isArray(data.tasks_data) && data.tasks_data.length > 0) {
              setTasks(data.tasks_data);
              saveTasks(data.tasks_data, currentProfileId);
              setShowRecoveryBanner(false);
            } else {
              // Check if current tasks are defaults — show recovery banner
              const localTasks = loadTasks(currentProfileId);
              const isDefault = !localTasks || localTasks.length === defaultTasks.length;
              if (isDefault && session) setShowRecoveryBanner(true);
            }
          }
        } catch(err) {
          console.error('SyncPull error:', err);
          if (session) setShowRecoveryBanner(true);
        }
        
        // Fetch family tasks and their approvals
        if (session) {
          try {
            const { data: ft } = await getFamilyTasks();
            if (ft && ft.length > 0) {
              const taskIds = ft.map(t => t.id);
              const { data: approvals } = await getFamilyApprovals(taskIds);
              
              const transformed = ft.map(t => {
                const taskObj = { ...t.task_data, id: t.id, isFamilyTask: true, parentalControl: t.parental_control, completions: {}, approvalStatus: {} };
                
                (approvals || []).forEach(a => {
                  if (a.family_task_id === t.id) {
                    if (a.status === 'approved' || !t.parental_control) {
                      taskObj.completions[a.date] = a.completion_count;
                    }
                    taskObj.approvalStatus[a.date] = a.status;
                  }
                });
                
                return taskObj;
              });
              
              setFamilyTasksData(transformed);
            } else {
              setFamilyTasksData([]);
            }
          } catch(err) {
            console.error('Family tasks error:', err);
          }
        }
        
        setIsSyncing(false);
      };
      syncPull();
    }
  }, [currentProfileId, session]);

  // Автоматичний щоденний бекап
  useEffect(() => {
    if (currentProfileId && tasks && tasks.length > 0) {
      // Не бекапити defaultTasks (тільки реальні дані)
      const isDefault = tasks.length === defaultTasks.length && tasks.every((t, i) => t.name === defaultTasks[i]?.name && Object.keys(t.completions || {}).length === 0);
      if (!isDefault) {
        createDailyBackup(tasks, currentProfileId);
      }
    }
  }, [currentProfileId, tasks]);

  // Save on change and Push to Cloud
  useEffect(() => {
    if (currentProfileId) {
      saveTasks(tasks, currentProfileId);

      // Не відправляти на сервер дефолтні задачі (тільки реальні дані)
      const isDefault = tasks.length === defaultTasks.length && tasks.every((t, i) => t.name === defaultTasks[i]?.name && Object.keys(t.completions || {}).length === 0);
      if (!isDefault) {
        pushData(currentProfileId, tasks);
      }
    }
  }, [tasks, currentProfileId]);

  // Combine local tasks and family tasks for rendering
  const allTasks = [...tasks, ...familyTasksData];

  const scores = getAllPeriodScores(allTasks);
  const totalScore = scores.all?.score || 0;

  // Profile actions
  const handleSelectProfile = (id) => {
    setActiveProfileId(id);
    setActiveProfile(id);
    setActivePage('today');
  };

  const handleCreateProfile = (name, color) => {
    const profile = createProfile(name, color);
    setProfiles(loadProfiles());
    handleSelectProfile(profile.id);
  };

  const handleDeleteProfile = (id) => {
    deleteProfile(id);
    setProfiles(loadProfiles());
    if (activeProfileId === id) {
      setActiveProfile(null);
      localStorage.removeItem('quest-tracker-active-profile');
    }
  };

  const handleLogout = async () => {
    if (session && supabase) {
      await supabase.auth.signOut();
    }
    setActiveProfile(null);
    localStorage.removeItem('quest-tracker-active-profile');
  };

  // Task actions
  const updateTask = useCallback((id, updates) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const addTask = useCallback((task) => {
    const newTask = {
      ...task,
      id: uuidv4(),
      createdAt: format(new Date(), 'yyyy-MM-dd'),
      completions: {},
    };
    setTasks(prev => [...prev, newTask]);
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const reorderTasks = useCallback((sourceIndex, destinationIndex) => {
    setTasks(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(sourceIndex, 1);
      result.splice(destinationIndex, 0, removed);
      return result;
    });
  }, []);

  const logCompletion = useCallback(async (taskId, dateStr, delta) => {
    // Check if it's a family task
    const familyTask = familyTasksData.find(t => t.id === taskId);
    if (familyTask) {
      if (delta > 0) {
        // Submit for approval (or auto-approve if no parental control)
        const { data, error } = await submitTaskCompletion(taskId, dateStr);
        if (!error && data) {
          // Optimistically update familyTasksData
          setFamilyTasksData(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            const updated = { ...t };
            updated.approvalStatus = { ...updated.approvalStatus, [dateStr]: data.status };
            if (data.status === 'approved' || !t.parentalControl) {
              updated.completions = { ...updated.completions, [dateStr]: data.completion_count };
            }
            return updated;
          }));
        }
      }
      return; // Family tasks handle decrements differently (or not at all if pending)
    }

    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const current = t.completions?.[dateStr] || 0;
      const newVal = Math.max(0, current + delta);
      return {
        ...t,
        completions: { ...t.completions, [dateStr]: newVal },
      };
    }));
  }, [familyTasksData]);

  const handleExport = () => exportTasksJSON(tasks);

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const imported = await importTasksJSON(file);
          setTasks(imported);
        } catch (err) {
          alert('Помилка імпорту: ' + err.message);
        }
      }
    };
    input.click();
  };

  const navigate = (page) => {
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  // Show auth selector if not logged in
  if (!authInitialized) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Завантаження...</div>;
  }

  if (!isLoggedIn) {
    if (supabase && showAuthScreen) {
      return (
        <AuthScreen onLocalLogin={(email) => {
          if (email) {
            const name = email.split('@')[0];
            handleCreateProfile(name, '#7c3aed');
          } else {
            setShowAuthScreen(false);
          }
        }} />
      );
    }
    return (
      <div style={{ position: 'relative' }}>
        {supabase && (
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ position: 'absolute', top: 16, right: 16, zIndex: 100 }}
            onClick={() => setShowAuthScreen(true)}
          >
            ← Вхід через Email
          </button>
        )}
        <ProfileSelector
          profiles={profiles}
          onSelect={id => {
            handleSelectProfile(id);
            setShowAuthScreen(true);
          }}
          onCreate={(name, color) => {
            handleCreateProfile(name, color);
            setShowAuthScreen(true);
          }}
          onDelete={handleDeleteProfile}
        />
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'today':
        return <TodayView tasks={allTasks} logCompletion={logCompletion} profile={activeProfile} />;
      case 'stats':
        return <StatsView tasks={allTasks} scores={scores} />;
      case 'tasks':
        return <TaskManager tasks={tasks} addTask={addTask} updateTask={updateTask} deleteTask={deleteTask} reorderTasks={reorderTasks} />;
      case 'family':
        return <FamilyView session={session} initialJoinCode={urlJoinCode} />;
      case 'support':
        return <SupportView />;
      default:
        return <TodayView tasks={allTasks} logCompletion={logCompletion} profile={activeProfile} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Mobile menu button */}
      <button className="btn-icon mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Zap size={22} color="white" />
          </div>
          <h1>Quest Tracker</h1>
        </div>

        {/* Active profile indicator */}
        <div className="sidebar-profile" onClick={handleLogout} title="Змінити профіль" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sidebar-profile-avatar" style={{ background: activeProfile.color }}>
            <User size={16} color="white" />
          </div>
          <div className="sidebar-profile-info" style={{ flex: 1 }}>
            <span className="sidebar-profile-name">{activeProfile.name}</span>
            <span className="sidebar-profile-action">
              <LogOut size={12} /> Змінити
            </span>
          </div>
          {isSyncing && <RefreshCw size={14} className="spin" style={{ color: 'var(--text-muted)' }} title="Синхронізація..." />}
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}

          <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '12px 0' }} />

          <button className="sidebar-nav-item" onClick={handleExport}>
            <Download size={20} />
            Експорт
          </button>
          <button className="sidebar-nav-item" onClick={handleImport}>
            <Upload size={20} />
            Імпорт
          </button>
        </nav>

        <div className="sidebar-score">
          <div className="sidebar-score-label">Загальний рахунок</div>
          <div className="sidebar-score-value">{totalScore >= 0 ? '+' : ''}{totalScore}</div>
          {(scores.all?.projected || 0) !== totalScore && (
            <div style={{
              fontSize: 'var(--font-xs)',
              color: (scores.all?.projected || 0) < 0 ? 'var(--color-danger-light)' : 'var(--text-muted)',
              marginTop: 4,
            }}>
              прогноз: {(scores.all?.projected || 0) >= 0 ? '+' : ''}{scores.all?.projected || 0}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {showRecoveryBanner && (
          <div style={{
            padding: '16px 20px', marginBottom: 16, borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))',
            border: '1px solid rgba(245,158,11,0.3)',
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#fbbf24', marginBottom: 4 }}>
                ⚠️ Задачі могли бути втрачені
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Ваші дані є в хмарі. Натисніть кнопку для відновлення.
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={forceRestoreFromCloud}
              disabled={isRecovering}
              style={{ whiteSpace: 'nowrap' }}
            >
              {isRecovering ? '⏳ Відновлення...' : '☁️ Відновити з хмари'}
            </button>
            <button
              className="btn-icon"
              onClick={() => setShowRecoveryBanner(false)}
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {renderPage()}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="mobile-nav">
        <div className="mobile-nav-items">
          {NAV_ITEMS.map((item, index) => (
            <React.Fragment key={item.id}>
              <button
                className={`mobile-nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => navigate(item.id)}
              >
                <item.icon size={20} />
                {item.label}
              </button>
              {index === 1 && <div className="mobile-nav-spacer" />}
            </React.Fragment>
          ))}
          
          <button className="mobile-fab" onClick={() => navigate('tasks')}>
            <Plus size={32} />
          </button>
        </div>
      </div>
    </div>
  );
}
