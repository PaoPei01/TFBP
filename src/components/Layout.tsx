import { Link, NavLink, Outlet } from 'react-router-dom';
import { HeartPulse, Home, Menu, Pencil, Search, Shield, ShieldCheck, UserCheck, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import type { StaffAccessContext } from '../lib/types';
import { fetchStaffAccessContext } from '../services/staff';

type SessionUser = {
  id: string;
  email?: string;
};

export function Layout() {
  const { language, setLanguage, t } = useLanguage();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [access, setAccess] = useState<StaffAccessContext | null>(null);

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

  useEffect(() => {
    let active = true;
    setAccess(null);
    if (!user) return () => {
      active = false;
    };
    fetchStaffAccessContext()
      .then((context) => {
        if (active) setAccess(context);
      })
      .catch(() => {
        if (active) setAccess(null);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const isAdmin = Boolean(access?.is_admin);
  const isStaff = Boolean(access?.can_view_staff || access?.can_mark_attendance || access?.can_view_emergency);
  const canAttend = Boolean(access?.can_mark_attendance);
  const canEmergency = Boolean(access?.can_view_emergency || access?.is_admin);

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
              {isAdmin ? (
                <>
                  <span className="nav-menu-label">{language === 'th' ? 'แอดมิน' : 'Admin'}</span>
                  <NavLink to="/admin">{t.admin}</NavLink>
                  <NavLink to="/admin/dashboard">{t.dashboard}</NavLink>
                  <NavLink to="/admin/groups">{t.groups}</NavLink>
                  <NavLink to="/admin/staff">{language === 'th' ? 'ทีมงาน' : 'Staff'}</NavLink>
                  <NavLink to="/admin/staff/operations">{language === 'th' ? 'โควตาทีมงาน' : 'Staff Ops'}</NavLink>
                  <NavLink to="/admin/staff/import">{language === 'th' ? 'นำเข้าสตาฟ' : 'Import Staff'}</NavLink>
                  <NavLink to="/admin/requests">{t.requests}</NavLink>
                  <NavLink to="/admin/logs">{t.logs}</NavLink>
                  <NavLink to="/admin/emergency">{language === 'th' ? 'ฉุกเฉิน' : 'Emergency'}</NavLink>
                </>
              ) : null}
              {isStaff ? (
                <>
                  <span className="nav-menu-label">{language === 'th' ? 'สตาฟ' : 'Staff'}</span>
                  <NavLink to="/staff">{language === 'th' ? 'หน้าสตาฟ' : 'Staff Home'}</NavLink>
                  {access?.can_view_staff ? <NavLink to="/staff/my-group">{language === 'th' ? 'กลุ่มของฉัน' : 'My Group'}</NavLink> : null}
                  {canAttend ? <NavLink to="/staff/attendance">{language === 'th' ? 'เช็กชื่อ' : 'Attendance'}</NavLink> : null}
                  {canEmergency ? <NavLink to="/staff/emergency">{language === 'th' ? 'สุขภาพฉุกเฉิน' : 'Staff Emergency'}</NavLink> : null}
                </>
              ) : null}
            </div>
          </details>
          <button className="language-toggle" type="button" onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}>
            {language === 'th' ? 'EN' : 'TH'}
          </button>
          {user ? (
            <NavLink className="auth-icon-link auth-signed-in" to="/admin" title={language === 'th' ? `เข้าสู่ระบบแล้ว: ${user.email ?? user.id}` : `Signed in: ${user.email ?? user.id}`} aria-label={language === 'th' ? 'เข้าสู่ระบบแล้ว ดูรายละเอียดบัญชี' : 'Signed in, view account details'}>
              <UserCheck size={17} />
            </NavLink>
          ) : (
            <NavLink className="auth-icon-link" to="/admin" title={language === 'th' ? 'เข้าสู่ระบบ' : 'Login'} aria-label={language === 'th' ? 'เข้าสู่ระบบ' : 'Login'}>
              <Shield size={15} />
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
        {!isAdmin && !isStaff ? (
          <NavLink to="/edit">
            <Pencil size={19} />
            <span>{language === 'th' ? 'แก้ไข' : 'Edit'}</span>
          </NavLink>
        ) : null}
        {isAdmin ? (
          <>
            <NavLink to="/admin/dashboard">
              <Shield size={19} />
              <span>{language === 'th' ? 'แอดมิน' : 'Admin'}</span>
            </NavLink>
            <NavLink to="/admin/groups">
              <UsersRound size={19} />
              <span>{language === 'th' ? 'กลุ่ม' : 'Groups'}</span>
            </NavLink>
            <NavLink to="/admin/staff">
              <UserCheck size={19} />
              <span>{language === 'th' ? 'ทีมงาน' : 'Staff'}</span>
            </NavLink>
            <NavLink to="/admin/emergency">
              <HeartPulse size={19} />
              <span>{language === 'th' ? 'ฉุกเฉิน' : 'Emergency'}</span>
            </NavLink>
          </>
        ) : null}
        {!isAdmin && isStaff ? (
          <>
            <NavLink to="/staff">
              <Shield size={19} />
              <span>{language === 'th' ? 'สตาฟ' : 'Staff'}</span>
            </NavLink>
            {access?.can_view_staff ? (
              <NavLink to="/staff/my-group">
                <UsersRound size={19} />
                <span>{language === 'th' ? 'กลุ่ม' : 'Group'}</span>
              </NavLink>
            ) : null}
            {canAttend ? (
              <NavLink to="/staff/attendance">
                <UserCheck size={19} />
                <span>{language === 'th' ? 'เช็กชื่อ' : 'Attend'}</span>
              </NavLink>
            ) : null}
            {canEmergency ? (
              <NavLink to="/staff/emergency">
                <HeartPulse size={19} />
                <span>{language === 'th' ? 'ฉุกเฉิน' : 'Emergency'}</span>
              </NavLink>
            ) : null}
          </>
        ) : null}
      </nav>
    </div>
  );
}
