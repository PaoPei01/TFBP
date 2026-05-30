import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, Database, FileText, HeartPulse, Home, Languages, LogOut, Menu, Pencil, Search, Shield, ShieldCheck, UserCheck, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminShell } from './admin/AdminShell';
import { Gear13Icon } from './brand/Gear13Icon';
import { MobileMoreMenu } from './mobile/MobileMoreMenu';
import { RoleAwareBottomNav } from './mobile/RoleAwareBottomNav';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useLanguage } from '../context/LanguageContext';
import { copy } from '../lib/copy';
import { supabase } from '../lib/supabase';
import type { StaffAccessContext } from '../lib/types';
import { fetchStaffAccessContext } from '../services/staff';

type SessionUser = {
  id: string;
  email?: string;
};

export function Layout() {
  const { language, toggleLanguage, t } = useLanguage();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [access, setAccess] = useState<StaffAccessContext | null>(null);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
  const isStaff = Boolean(access?.can_view_staff || access?.can_mark_attendance || access?.can_view_emergency || access?.roles?.length);
  const canAttend = Boolean(isStaff || access?.can_mark_attendance);
  const canEmergency = Boolean(access?.can_view_emergency || access?.is_admin);
  const isAdminRoute = location.pathname.startsWith('/admin');
  const loginCopy = language === 'th' ? copy.th : copy.en;
  const uiCopy = language === 'th' ? copy.th : copy.en;
  const langButtonLabel = language === 'th' ? 'ไทย' : 'EN';
  const switchLanguageLabel = language === 'th' ? 'EN' : 'ไทย';
  const mobileCopy = {
    publicHome: language === 'th' ? 'หน้าแรก' : 'Home',
    publicSearch: language === 'th' ? 'ค้นหา' : 'Search',
    publicAnnouncements: language === 'th' ? 'ประกาศ' : 'Info',
    publicMe: language === 'th' ? 'ของฉัน' : 'Me',
    publicStaff: language === 'th' ? 'ทีมงาน' : 'Staff',
    staffHome: language === 'th' ? 'ทีมงาน' : 'Staff',
    staffCheckIn: language === 'th' ? 'เช็กชื่อ' : 'Check-in',
    staffGroup: language === 'th' ? 'กลุ่ม' : 'Group',
    emergency: language === 'th' ? 'ฉุกเฉิน' : 'Emergency',
    more: language === 'th' ? 'เพิ่มเติม' : 'More',
    adminHome: language === 'th' ? 'แอดมิน' : 'Admin',
    adminPeople: language === 'th' ? 'รายชื่อ' : 'People',
    adminStaff: language === 'th' ? 'ทีมงาน' : 'Staff',
  };

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setAccess(null);
    navigate('/');
  }

  function openPublicSearch() {
    if (location.pathname !== '/') {
      navigate('/');
      window.setTimeout(() => window.dispatchEvent(new Event('tfbp:focus-public-search')), 80);
      return;
    }
    window.dispatchEvent(new Event('tfbp:focus-public-search'));
  }

  return (
    <div>
      <nav className="top-nav">
        <Link className="brand" to="/" aria-label={language === 'th' ? 'กลับหน้าแรก Entaneer Gear 56' : 'Entaneer Gear 56 home'}>
          <Gear13Icon size={22} className="brand-gear-icon" />
          <span>Entaneer Gear 56</span>
        </Link>
        <div className="nav-links">
          <NavLink to="/">{t.participants}</NavLink>
          <NavLink to="/events">{t('navigation.events')}</NavLink>
          <NavLink to="/announcements">{t('navigation.announcements')}</NavLink>
          <NavLink to="/guide">{t('navigation.guide')}</NavLink>
          <NavLink to="/me">{t('navigation.editInfo')}</NavLink>
          {!user ? <NavLink to="/staff/start">{t('navigation.staff')}</NavLink> : null}
          {user || isStaff || isAdmin ? (
            <details className={`nav-menu ${isAdmin ? 'nav-menu-wide' : ''}`}>
              <summary>
                <Menu size={16} />
                {language === 'th' ? 'เครื่องมือ' : 'Tools'}
              </summary>
              <div>
              {isAdmin ? (
                <>
                  <span className="nav-menu-label">{language === 'th' ? 'ศูนย์แอดมิน' : 'Admin'}</span>
                  <NavLink to="/admin">{language === 'th' ? 'ศูนย์ควบคุมระบบ' : 'Command Center'}</NavLink>
                  <NavLink to="/admin/events">{t('navigation.events')}</NavLink>
                  <NavLink to="/admin/staff-ops">{language === 'th' ? 'ใบสมัคร/ทีมงาน' : 'Applications / Staff'}</NavLink>
                  <NavLink to="/admin/people-groups">{language === 'th' ? 'รายชื่อและกลุ่ม' : 'People & Groups'}</NavLink>
                  <NavLink to="/admin/staff/attendance">{uiCopy.staffCheckIn}</NavLink>
                  <NavLink to="/admin/documents">{uiCopy.documentCenter}</NavLink>
                  <NavLink to="/admin/emergency">{uiCopy.emergency}</NavLink>
                  <NavLink to="/admin/system-readiness">{language === 'th' ? 'ระบบ' : 'System'}</NavLink>
                </>
              ) : null}
              {!isAdmin && isStaff ? (
                <>
                  <span className="nav-menu-label">{language === 'th' ? 'สตาฟ' : 'Staff'}</span>
                  <NavLink to="/staff">{language === 'th' ? 'หน้าทีมงาน' : 'Staff home'}</NavLink>
                  <NavLink to="/staff/directory">{language === 'th' ? 'ไดเรกทอรีทีมงาน' : 'Staff Directory'}</NavLink>
                  {access?.can_view_staff ? <NavLink to="/staff/my-group">{language === 'th' ? 'รายชื่อกลุ่มของฉัน' : 'My group list'}</NavLink> : null}
                  {canAttend ? <NavLink to="/staff/attendance">{language === 'th' ? 'เช็กชื่อ' : 'Attendance'}</NavLink> : null}
                  {canEmergency ? <NavLink to="/staff/emergency">{language === 'th' ? 'เหตุฉุกเฉิน' : 'Emergency'}</NavLink> : null}
                </>
              ) : null}
              </div>
            </details>
          ) : null}
          {user ? (
            <details className="account-menu">
              <summary className="staff-login-link staff-login-link-active"><UserCheck size={17} /><span>{language === 'th' ? 'บัญชี' : 'Account'}</span></summary>
              <div>
                <strong>{user.email ?? user.id}</strong>
                {isStaff ? <NavLink to="/staff">{loginCopy.staffHome}</NavLink> : null}
                {isStaff ? <NavLink to="/staff/profile">{language === 'th' ? 'โปรไฟล์ของฉัน' : 'My Profile'}</NavLink> : null}
                {isAdmin ? <NavLink to="/admin">{uiCopy.adminCommandCenter}</NavLink> : null}
                <button type="button" onClick={signOut}><LogOut size={16} />{language === 'th' ? 'ออกจากระบบ' : 'Sign out'}</button>
              </div>
            </details>
          ) : null}
          <button className="language-toggle" type="button" aria-label="เปลี่ยนภาษา / Change language" title={`${language === 'th' ? 'เปลี่ยนภาษาเป็น' : 'Change language to'} ${switchLanguageLabel}`} onClick={toggleLanguage}>
            {langButtonLabel}
          </button>
          <ThemeSwitcher compact />
        </div>
        <button className="mobile-top-menu-button" type="button" aria-label={language === 'th' ? 'เปิดเมนู' : 'Open menu'} onClick={() => setMobileMoreOpen(true)}>
          <Menu size={22} />
        </button>
      </nav>
      <main className="page-shell">
        <RouteErrorBoundary resetKey={location.pathname}>
          {isAdminRoute ? (
            <AdminShell>
              <Outlet />
            </AdminShell>
          ) : (
            <Outlet />
          )}
        </RouteErrorBoundary>
      </main>
      <RoleAwareBottomNav label={language === 'th' ? 'เมนูหลักมือถือ' : 'Mobile primary navigation'}>
        {!isAdmin && !isStaff ? (
          <>
            <NavLink to="/">
              <Home size={19} />
              <span>{mobileCopy.publicHome}</span>
            </NavLink>
            <button type="button" onClick={openPublicSearch}>
              <Search size={19} />
              <span>{mobileCopy.publicSearch}</span>
            </button>
            <NavLink to="/announcements">
              <Bell size={19} />
              <span>{mobileCopy.publicAnnouncements}</span>
            </NavLink>
          </>
        ) : null}
        {!isAdmin && !isStaff ? (
          <NavLink to="/me">
            <Pencil size={19} />
            <span>{mobileCopy.publicMe}</span>
          </NavLink>
        ) : null}
        {!user && !isAdmin && !isStaff ? (
          <NavLink to="/staff/start">
            <Shield size={19} />
            <span>{mobileCopy.publicStaff}</span>
          </NavLink>
        ) : null}
        {isAdmin ? (
          <>
            <NavLink to="/admin">
              <Shield size={19} />
              <span>{mobileCopy.adminHome}</span>
            </NavLink>
            <NavLink to="/admin/people-groups">
              <UsersRound size={19} />
              <span>{mobileCopy.adminPeople}</span>
            </NavLink>
            <NavLink to="/admin/staff-ops">
              <UserCheck size={19} />
              <span>{mobileCopy.adminStaff}</span>
            </NavLink>
            <NavLink to="/admin/emergency">
              <HeartPulse size={19} />
              <span>{mobileCopy.emergency}</span>
            </NavLink>
            <button type="button" aria-label={language === 'th' ? 'เปิดเมนูเพิ่มเติม' : 'Open more menu'} onClick={() => setMobileMoreOpen(true)}>
              <Menu size={19} />
              <span>{mobileCopy.more}</span>
            </button>
          </>
        ) : null}
        {!isAdmin && isStaff ? (
          <>
            <NavLink to="/staff">
              <Shield size={19} />
              <span>{mobileCopy.staffHome}</span>
            </NavLink>
            {canAttend ? (
              <NavLink to="/staff/attendance">
                <UserCheck size={19} />
                <span>{mobileCopy.staffCheckIn}</span>
              </NavLink>
            ) : null}
            {access?.can_view_staff ? (
              <NavLink to="/staff/my-group">
                <UsersRound size={19} />
                <span>{mobileCopy.staffGroup}</span>
              </NavLink>
            ) : null}
            {canEmergency ? (
              <NavLink to="/staff/emergency">
                <HeartPulse size={19} />
                <span>{mobileCopy.emergency}</span>
              </NavLink>
            ) : (
              <NavLink to="/announcements">
                <Bell size={19} />
                <span>{mobileCopy.publicAnnouncements}</span>
              </NavLink>
            )}
            <button type="button" aria-label={language === 'th' ? 'เปิดเมนูเพิ่มเติม' : 'Open more menu'} onClick={() => setMobileMoreOpen(true)}>
              <Menu size={19} />
              <span>{mobileCopy.more}</span>
            </button>
          </>
        ) : null}
      </RoleAwareBottomNav>
      <MobileMoreMenu open={mobileMoreOpen} title={language === 'th' ? 'เมนูเพิ่มเติม' : 'More'} onClose={() => setMobileMoreOpen(false)}>
        {isAdmin ? (
          <>
            <details className="mobile-more-accordion" open>
              <summary>{language === 'th' ? 'ศูนย์ควบคุมระบบ' : 'Command Center'}</summary>
              <div className="mobile-more-section">
                <NavLink to="/admin"><Shield size={18} />{language === 'th' ? 'ศูนย์ควบคุมระบบ' : 'Command Center'}</NavLink>
                <NavLink to="/admin/dashboard"><Shield size={18} />{language === 'th' ? 'แดชบอร์ดเดิม' : 'Legacy dashboard'}</NavLink>
                <NavLink to="/admin/system-readiness"><ShieldCheck size={18} />{language === 'th' ? 'ตรวจความพร้อมระบบ' : 'System readiness'}</NavLink>
                <NavLink to="/admin/data-health"><ShieldCheck size={18} />{language === 'th' ? 'ตรวจสุขภาพข้อมูล' : 'Data health'}</NavLink>
              </div>
            </details>
            <details className="mobile-more-accordion">
              <summary>{language === 'th' ? 'งานหน้างาน' : 'Live operations'}</summary>
              <div className="mobile-more-section">
                <NavLink to="/admin/staff/attendance"><UserCheck size={18} />{uiCopy.staffCheckIn}</NavLink>
                <NavLink to="/admin/emergency"><HeartPulse size={18} />{uiCopy.emergency}</NavLink>
                <NavLink to="/admin/announcements"><Bell size={18} />{language === 'th' ? 'ประกาศ' : 'Announcements'}</NavLink>
                <NavLink to="/guide"><FileText size={18} />{language === 'th' ? 'คู่มือ' : 'Guide'}</NavLink>
              </div>
            </details>
            <details className="mobile-more-accordion">
              <summary>{language === 'th' ? 'ศูนย์จัดการหลัก' : 'Main hubs'}</summary>
              <div className="mobile-more-section">
                <NavLink to="/admin/events"><CalendarDays size={18} />{language === 'th' ? 'กิจกรรม' : 'Events'}</NavLink>
                <NavLink to="/admin/staff-ops"><UserCheck size={18} />{language === 'th' ? 'ใบสมัคร/ทีมงาน' : 'Applications / Staff'}</NavLink>
                <NavLink to="/admin/people-groups"><UsersRound size={18} />{language === 'th' ? 'รายชื่อและกลุ่ม' : 'People & Groups'}</NavLink>
                <NavLink to="/admin/documents"><FileText size={18} />{uiCopy.documentCenter}</NavLink>
              </div>
            </details>
            <details className="mobile-more-accordion">
              <summary>{language === 'th' ? 'เส้นทางลึก' : 'Deep tools'}</summary>
              <div className="mobile-more-section">
                <NavLink to="/admin/staff"><UserCheck size={18} />{language === 'th' ? 'รายชื่อทีมงาน' : 'Staff roster'}</NavLink>
                <NavLink to="/admin/staff/operations"><UsersRound size={18} />{language === 'th' ? 'โควตา/งานทีมงาน' : 'Staff operations'}</NavLink>
                <NavLink to="/admin/staff/import"><Database size={18} />{language === 'th' ? 'นำเข้าสตาฟ' : 'Import staff'}</NavLink>
                <NavLink to="/admin/staff/requests"><Pencil size={18} />{language === 'th' ? 'คำขอทีมงาน' : 'Staff requests'}</NavLink>
                <NavLink to="/admin/people"><Database size={18} />{language === 'th' ? 'ฐานข้อมูลบุคคล' : 'People database'}</NavLink>
                <NavLink to="/admin/groups"><UsersRound size={18} />{language === 'th' ? 'จัดกลุ่ม' : 'Groups'}</NavLink>
                <NavLink to="/admin/requests"><Pencil size={18} />{uiCopy.editRequests}</NavLink>
                <NavLink to="/admin/people/update-requests"><Database size={18} />{uiCopy.updateRequests}</NavLink>
                <NavLink to="/admin/people/dedupe"><Database size={18} />{uiCopy.duplicateCheck}</NavLink>
                <NavLink to="/admin/people/import-year2"><Database size={18} />{language === 'th' ? 'นำเข้าฐานปี 2' : 'Import Year 2'}</NavLink>
                <NavLink to="/admin/documents/settings"><FileText size={18} />{language === 'th' ? 'ตั้งค่าเอกสาร' : 'Document settings'}</NavLink>
                <NavLink to="/admin/documents/templates"><FileText size={18} />{language === 'th' ? 'เทมเพลตเอกสาร' : 'Document templates'}</NavLink>
                <NavLink to="/admin/documents/generate"><FileText size={18} />{language === 'th' ? 'สร้างเอกสาร' : 'Generate documents'}</NavLink>
                <NavLink to="/admin/documents/history"><FileText size={18} />{language === 'th' ? 'ประวัติเอกสาร' : 'Document history'}</NavLink>
                <NavLink to="/admin/logs"><Search size={18} />{language === 'th' ? 'ประวัติระบบ' : 'System logs'}</NavLink>
              </div>
            </details>
            <div className="mobile-more-section">
              <span className="mobile-more-section-title">{language === 'th' ? 'ตั้งค่า' : 'Settings'}</span>
              <div className="mobile-more-control"><ThemeSwitcher /></div>
              <button type="button" aria-label="เปลี่ยนภาษา / Change language" onClick={toggleLanguage}><Languages size={18} />{language === 'th' ? 'เปลี่ยนภาษาเป็น EN' : 'Change language to ไทย'}</button>
              {user ? <button type="button" onClick={() => void signOut()}><LogOut size={18} />{language === 'th' ? 'ออกจากระบบ' : 'Sign out'}</button> : null}
            </div>
          </>
        ) : isStaff ? (
          <>
            <div className="mobile-more-section">
              <span className="mobile-more-section-title">{language === 'th' ? 'งานวันนี้' : 'Today'}</span>
              <NavLink to="/staff"><Shield size={18} />{language === 'th' ? 'หน้าทีมงาน' : 'Staff home'}</NavLink>
              {access?.can_view_staff ? <NavLink to="/staff/my-group"><UsersRound size={18} />{language === 'th' ? 'รายชื่อกลุ่มของฉัน' : 'My group list'}</NavLink> : null}
              {canAttend ? <NavLink to="/staff/attendance"><UserCheck size={18} />{uiCopy.staffCheckIn}</NavLink> : null}
              {canEmergency ? <NavLink to="/staff/emergency"><HeartPulse size={18} />{language === 'th' ? 'เหตุฉุกเฉิน' : 'Emergency'}</NavLink> : null}
            </div>
            <div className="mobile-more-section">
              <span className="mobile-more-section-title">{language === 'th' ? 'เครื่องมือเพิ่มเติม' : 'More tools'}</span>
              <NavLink to="/staff/profile"><UserCheck size={18} />{language === 'th' ? 'โปรไฟล์ของฉัน' : 'My profile'}</NavLink>
              <NavLink to="/staff/directory"><UsersRound size={18} />{language === 'th' ? 'ไดเรกทอรีทีมงาน' : 'Staff directory'}</NavLink>
              <NavLink to="/staff/profile/qr"><UserCheck size={18} />{language === 'th' ? 'QR ส่วนตัว' : 'Personal QR'}</NavLink>
              <NavLink to="/announcements"><Bell size={18} />{language === 'th' ? 'ประกาศ' : 'Announcements'}</NavLink>
              <NavLink to="/guide"><FileText size={18} />{language === 'th' ? 'คู่มือ' : 'Guide'}</NavLink>
              <div className="mobile-more-control"><ThemeSwitcher /></div>
              <button type="button" aria-label="เปลี่ยนภาษา / Change language" onClick={toggleLanguage}><Languages size={18} />{language === 'th' ? 'เปลี่ยนภาษาเป็น EN' : 'Change language to ไทย'}</button>
              {user ? <button type="button" onClick={() => void signOut()}><LogOut size={18} />{language === 'th' ? 'ออกจากระบบ' : 'Sign out'}</button> : null}
            </div>
          </>
        ) : (
          <>
            <div className="mobile-more-section">
              <span className="mobile-more-section-title">{language === 'th' ? 'เมนูหลัก' : 'Main'}</span>
              <NavLink to="/"><Home size={18} />{t.participants}</NavLink>
              <NavLink to="/events"><CalendarDays size={18} />{t('navigation.events')}</NavLink>
              <NavLink to="/announcements"><Bell size={18} />{t('navigation.announcements')}</NavLink>
              <NavLink to="/guide"><FileText size={18} />{t('navigation.guide')}</NavLink>
              <NavLink to="/me"><Pencil size={18} />{t('navigation.editInfo')}</NavLink>
            </div>
            <div className="mobile-more-section">
              <span className="mobile-more-section-title">{t('navigation.staff')}</span>
              <NavLink to="/staff/start"><UserCheck size={18} />{language === 'th' ? 'เริ่มต้นสำหรับทีมงาน' : 'Staff start'}</NavLink>
              <div className="mobile-more-control"><ThemeSwitcher /></div>
              <button type="button" aria-label="เปลี่ยนภาษา / Change language" onClick={toggleLanguage}><Languages size={18} />{language === 'th' ? 'เปลี่ยนภาษาเป็น EN' : 'Change language to ไทย'}</button>
            </div>
          </>
        )}
      </MobileMoreMenu>
    </div>
  );
}
