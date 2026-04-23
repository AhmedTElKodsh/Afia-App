import { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard,
  Database,
  QrCode,
  Download,
  TrendingUp,
  X,
  Shield,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useScanHistory } from "../hooks/useScanHistory.ts";
import { BottleManager } from "./BottleManager.tsx";
import { QrMockGenerator } from "./QrMockGenerator.tsx";
import { ScanDetail } from "./admin/ScanDetail.tsx";
import { AdminUpload } from "./AdminUpload.tsx";
import type { AdminTabItem } from "./AdminTabNav.tsx";
import { ModelVersionManager } from "./admin/ModelVersionManager.tsx";
import { AdminLogin } from "./admin/AdminLogin.tsx";
import { OverviewTab } from "./admin/tabs/OverviewTab.tsx";
import { ExportTab } from "./admin/tabs/ExportTab.tsx";
import { FailuresTab } from "./admin/tabs/FailuresTab.tsx";
import "./AdminDashboard.css";

const WORKER_URL = import.meta.env.VITE_PROXY_URL || "";
const SESSION_KEY = "afia_admin_session";
const SESSION_EXPIRES_KEY = "afia_admin_session_expires";

type AdminTab = "overview" | "bottles" | "qrmock" | "export" | "upload" | "failures" | "models";

interface AdminDashboardProps {
  onAuthSuccess?: () => void;
  onLogout?: () => void;
}

export function AdminDashboard({ onAuthSuccess, onLogout }: AdminDashboardProps = {}) {
  const { t, i18n } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState<any | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isMobileNavOpen && navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsMobileNavOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobileNavOpen]);

  const { scans, getStats } = useScanHistory();
  const stats = getStats();

  const currentLang = i18n.language || 'en';
  const isRTL = currentLang === 'ar';

  const validateSession = useCallback(() => {
    const token = sessionStorage.getItem(SESSION_KEY);
    const expiresAt = Number(sessionStorage.getItem(SESSION_EXPIRES_KEY) || "0");
    
    if (token && expiresAt > Date.now()) {
      return true;
    }
    
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_EXPIRES_KEY);
    return false;
  }, []);

  const TABS: AdminTabItem<AdminTab>[] = [
    { id: "overview", label: t('admin.tabs.overview'), icon: <LayoutDashboard size={18} /> },
    { id: "bottles", label: t('admin.tabs.bottles'), icon: <Database size={18} /> },
    { id: "qrmock", label: t('admin.tabs.qrmock'), icon: <QrCode size={18} /> },
    { id: "failures", label: t('admin.tabs.failures', 'Scan Failures'), icon: <AlertTriangle size={18} /> },
    { id: "models", label: t('admin.tabs.models', 'Model Versions'), icon: <TrendingUp size={18} /> },
    { id: "upload", label: t('admin.upload.tab', 'Training Upload'), icon: <Upload size={18} /> },
    { id: "export", label: t('admin.tabs.export'), icon: <Download size={18} /> },
  ];

  useEffect(() => {
    let mounted = true;

    const checkSession = () => {
      if (validateSession()) {
        if (mounted) {
          setIsAuthenticated(true);
          onAuthSuccess?.();
        }
      } else {
        if (mounted) setIsAuthenticated(false);
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 60_000);
    const timer = setTimeout(() => { if (mounted) setIsLoading(false); }, 200);

    return () => {
      mounted = false;
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [validateSession, onAuthSuccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!WORKER_URL) {
      setError(t('errors.generic'));
      return;
    }

    try {
      const res = await fetch(`${WORKER_URL}/admin/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      
      if (res.ok) {
        const data = await res.json() as { token: string; expiresAt: number };
        const { token, expiresAt } = data;
        sessionStorage.setItem(SESSION_KEY, token);
        sessionStorage.setItem(SESSION_EXPIRES_KEY, String(expiresAt));
        setIsAuthenticated(true);
        onAuthSuccess?.();
      } else if (res.status === 401) {
        setError(t('admin.login.errorInvalid'));
      } else {
        setError(t('errors.generic'));
      }
    } catch {
      setError(t('errors.network'));
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_EXPIRES_KEY);
    setIsAuthenticated(false);
    onLogout?.();
  };

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };

  if (!isAuthenticated) {
    return (
      <AdminLogin 
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        error={error}
        handleLogin={handleLogin}
        isRTL={isRTL}
      />
    );
  }

  return (
    <div className="admin-dashboard layout" dir={isRTL ? 'rtl' : 'ltr'}>
      <header ref={navRef as any} className="top-navbar">
        <div className="brand">
          <div className="brand-logo"><Shield size={18} strokeWidth={2.5} /></div>
          <div className="brand-text">
            <div className="brand-name">{t('app.name')}</div>
            <div className="brand-sub">{t('admin.header.brandSub', 'Admin Console')}</div>
          </div>
        </div>

        <button 
          className="mobile-menu-toggle" 
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
        >
          {isMobileNavOpen ? <X size={24} /> : <AlertTriangle size={24} />}
        </button>

        <nav className={`nav-items-container ${isMobileNavOpen ? 'open' : ''}`}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id as AdminTab); setIsMobileNavOpen(false); }}
            >
              <span className="nav-icon">{tab.icon}</span> 
              <span className="nav-label">{tab.label}</span>
            </button>
          ))}
          <div className="nav-divider"></div>
          <button className="nav-item" onClick={toggleLanguage}>
             <span className="nav-label">{isRTL ? 'EN' : 'عربي'}</span>
          </button>
          <button className="nav-item text-danger" onClick={handleLogout}>
            <span className="nav-label">{t('admin.login.logoutButton')}</span>
          </button>
        </nav>
      </header>

      <main className="main">
        {selectedScan ? (
          <ScanDetail 
            scan={selectedScan} 
            onBack={() => setSelectedScan(null)} 
            onCorrectionSaved={() => setSelectedScan(null)} 
          />
        ) : (
          <>
            <header className="page-header">
              <h1 className="page-title">
                {TABS.find(t => t.id === activeTab)?.label}
              </h1>
            </header>
            <div className="tab-panel-content">
              {activeTab === "overview" && (
                <OverviewTab 
                  stats={stats} 
                  scans={scans} 
                  onReview={(scan) => setSelectedScan(scan)}
                  t={t} 
                  isRTL={isRTL} 
                  isLoading={isLoading} 
                />
              )}
              {activeTab === "bottles" && <BottleManager />}
              {activeTab === "qrmock" && <QrMockGenerator />}
              {activeTab === "failures" && <FailuresTab t={t} isRTL={isRTL} />}
              {activeTab === "models" && <ModelVersionManager t={t} />}
              {activeTab === "export" && <ExportTab scans={scans} t={t} />}
              {activeTab === "upload" && <AdminUpload />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
