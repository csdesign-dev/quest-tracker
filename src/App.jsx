import React, { useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import {
  LayoutDashboard, CalendarCheck, BarChart3, ListTodo, Zap, Menu, X,
  Download, Upload, LogOut, User, HelpCircle
} from 'lucide-react';
import {
  loadTasks, saveTasks, exportTasksJSON, importTasksJSON,
  loadProfiles, saveProfiles, getActiveProfileId, setActiveProfileId,
  createProfile, deleteProfile, migrateOldData
} from './utils/storage';
import { getAllPeriodScores } from './utils/scoring';
import { defaultTasks } from './data/defaultTasks';
import TodayView from './components/TodayView';
import StatsView from './components/StatsView';
import TaskManager from './components/TaskManager';
import ProfileSelector from './components/ProfileSelector';
import SupportView from './components/SupportView';
import AuthScreen from './components/AuthScreen';
import { supabase } from './utils/supabase';

const NAV_ITEMS = [
  { id: 'today', label: 'Сьогодні', icon: CalendarCheck },
  { id: 'stats', label: 'Статистика', icon: BarChart3 },
  { id: 'tasks', label: 'Задачі', icon: ListTodo },
  { id: 'support', label: 'Підтримка', icon: HelpCircle },
];

export default function App() {
  const [profiles, setProfiles] = useState(() => loadProfiles());
  const [activeProfileId, setActiveProfile] = useState(() => getActiveProfileId());
  const [activePage, setActivePage] = useState('today');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Supabase Auth State
  const [session, setSession] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);

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

  // Reload tasks when profile or session changes
  useEffect(() => {
    if (currentProfileId) {
      const saved = loadTasks(currentProfileId);
      setTasks(saved || defaultTasks);
    }
  }, [currentProfileId]);

  // Save on change
  useEffect(() => {
    if (currentProfileId) {
      saveTasks(tasks, currentProfileId);
    }
  }, [tasks, currentProfileId]);

  const scores = getAllPeriodScores(tasks);
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

  const logCompletion = useCallback((taskId, dateStr, delta) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const current = t.completions?.[dateStr] || 0;
      const newVal = Math.max(0, current + delta);
      return {
        ...t,
        completions: { ...t.completions, [dateStr]: newVal },
      };
    }));
  }, []);

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
    if (supabase) {
      return (
        <AuthScreen onLocalLogin={(email) => {
          // Fallback to local profile creation if they requested local login
          const name = email ? email.split('@')[0] : 'Профіль';
          handleCreateProfile(name, '#7c3aed');
        }} />
      );
    }
    return (
      <ProfileSelector
        profiles={profiles}
        onSelect={handleSelectProfile}
        onCreate={handleCreateProfile}
        onDelete={handleDeleteProfile}
      />
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'today':
        return <TodayView tasks={tasks} logCompletion={logCompletion} />;
      case 'stats':
        return <StatsView tasks={tasks} scores={scores} />;
      case 'tasks':
        return <TaskManager tasks={tasks} addTask={addTask} updateTask={updateTask} deleteTask={deleteTask} />;
      case 'support':
        return <SupportView />;
      default:
        return <TodayView tasks={tasks} logCompletion={logCompletion} />;
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
        <div className="sidebar-profile" onClick={handleLogout} title="Змінити профіль">
          <div className="sidebar-profile-avatar" style={{ background: activeProfile.color }}>
            <User size={16} color="white" />
          </div>
          <div className="sidebar-profile-info">
            <span className="sidebar-profile-name">{activeProfile.name}</span>
            <span className="sidebar-profile-action">
              <LogOut size={12} /> Змінити
            </span>
          </div>
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
        {renderPage()}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="mobile-nav">
        <div className="mobile-nav-items">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`mobile-nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
