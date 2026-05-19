import { Link, NavLink, Outlet } from 'react-router-dom';
import { HeartPulse, Home, LogOut, Menu, Search, Shield, ShieldCheck, UserCheck, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';

type SessionUser = {
  id: string;
  email?: string;
};

export function Layout() {
  const { language, setLanguage, t } = useLanguage();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setUser(data.user ? { id: data.user.id, email: data.user.email } : null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    setUser(null);
  }

  return (
    <div>
      <nav className="top-nav">
        <Link className="brand" to="/">
          <ShieldCheck size={22} />
          <span>สานสัมพันธ์ 69</span>
          <small>Entaneer Bonding 69</small>
        </Link>
        <div className="nav-links">
          <NavLink to="/">{t.participants}</NavLink>
          <NavLink to="/edit">{t.edit}</NavLink>
          <details className="nav-menu">
            <summary>
              <Menu size={16} />
              {language === 'th' ? 'เครื่องมือ' : 'Tools'}
            </summary>
            <div>
              <span className="nav-menu-label">{language === 'th' ? 'แอดมิน' : 'Admin'}</span>
              <NavLink to="/admin">{t.admin}</NavLink>
              <NavLink to="/admin/dashboard">{t.dashboard}</NavLink>
              <NavLink to="/admin/groups">{t.groups}</NavLink>
              <NavLink to="/admin/staff">{language === 'th' ? 'ทีมงาน' : 'Staff'}</NavLink>
              <NavLink to="/admin/staff/import">{language === 'th' ? 'นำเข้าสตาฟ' : 'Import Staff'}</NavLink>
              <NavLink to="/admin/requests">{t.requests}</NavLink>
              <NavLink to="/admin/logs">{t.logs}</NavLink>
              <NavLink to="/admin/emergency">{language === 'th' ? 'ฉุกเฉิน' : 'Emergency'}</NavLink>
              <span className="nav-menu-label">{language === 'th' ? 'สตาฟ' : 'Staff'}</span>
              <NavLink to="/staff">{language === 'th' ? 'หน้าสตาฟ' : 'Staff Home'}</NavLink>
              <NavLink to="/staff/my-group">{language === 'th' ? 'กลุ่มของฉัน' : 'My Group'}</NavLink>
              <NavLink to="/staff/attendance">{language === 'th' ? 'เช็กชื่อ' : 'Attendance'}</NavLink>
              <NavLink to="/staff/emergency">{language === 'th' ? 'สุขภาพฉุกเฉิน' : 'Staff Emergency'}</NavLink>
            </div>
          </details>
          <button className="language-toggle" type="button" onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}>
            {language === 'th' ? 'EN' : 'TH'}
          </button>
          {user ? (
            <div className="auth-status" title={user.email ?? user.id}>
              <span>
                <UserCheck size={15} />
                {language === 'th' ? 'เข้าสู่ระบบแล้ว' : 'Signed in'}
              </span>
              <small>{user.email ?? user.id}</small>
              <button type="button" onClick={signOut} disabled={signingOut}>
                <LogOut size={15} />
                {language === 'th' ? 'ออก' : 'Logout'}
              </button>
            </div>
          ) : (
            <NavLink className="auth-login-link" to="/admin">
              <Shield size={15} />
              {language === 'th' ? 'เข้าสู่ระบบ' : 'Login'}
            </NavLink>
          )}
        </div>
      </nav>
      <main className="page-shell">
        <Outlet />
      </main>
      <nav className="mobile-bottom-nav" aria-label={language === 'th' ? 'เมนูหลักมือถือ' : 'Mobile primary navigation'}>
        <NavLink to="/">
          <Home size={19} />
          <span>{language === 'th' ? 'หน้าหลัก' : 'Home'}</span>
        </NavLink>
        <Link to="/">
          <Search size={19} />
          <span>{language === 'th' ? 'ค้นหา' : 'Search'}</span>
        </Link>
        <NavLink to="/admin/groups">
          <UsersRound size={19} />
          <span>{language === 'th' ? 'กลุ่ม' : 'Groups'}</span>
        </NavLink>
        <NavLink to="/staff/emergency">
          <HeartPulse size={19} />
          <span>{language === 'th' ? 'ฉุกเฉิน' : 'Emergency'}</span>
        </NavLink>
        <NavLink to="/staff">
          <Shield size={19} />
          <span>{language === 'th' ? 'สตาฟ' : 'Staff'}</span>
        </NavLink>
      </nav>
    </div>
  );
}
