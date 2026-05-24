import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, Database, FileText, HeartPulse, Home, Languages, LogOut, Menu, Pencil, Search, Shield, ShieldCheck, UserCheck, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MobileMoreMenu } from './mobile/MobileMoreMenu';
import { RoleAwareBottomNav } from './mobile/RoleAwareBottomNav';
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
  const loginCopy = language === 'th' ? copy.th : copy.en;
  const uiCopy = language === 'th' ? copy.th : copy.en;
  const langButtonLabel = language === 'th' ? 'ไทย' : 'EN';
  const switchLanguageLabel = language === 'th' ? 'EN' : 'ไทย';

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
        <Link className="brand" to="/">
          <ShieldCheck size={22} />
          <span>สานสัมพันธ์ 69</span>
          <small>Entaneer Bonding 69</small>
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
                  <span className="nav-menu-label">{language === 'th' ? 'ภาพรวม' : 'Overview'}</span>
                  <NavLink to="/admin">{uiCopy.adminCommandCenter}</NavLink>
                  <NavLink to="/admin/dashboard">{t.dashboard}</NavLink>
                  <NavLink to="/admin/events">{t('navigation.events')}</NavLink>
                  <NavLink to="/admin/announcements">{t('navigation.announcements')}</NavLink>
                  <NavLink to="/guide">{t('navigation.guide')}</NavLink>

                  <span className="nav-menu-label">{language === 'th' ? 'รายชื่อและกลุ่ม' : 'People & Groups'}</span>
                  <NavLink to="/admin/people-groups">{language === 'th' ? 'รายชื่อและกลุ่ม' : 'People & Groups'}</NavLink>
                  <NavLink to="/admin/people">{language === 'th' ? 'ฐานข้อมูลบุคคล' : 'People database'}</NavLink>
                  <NavLink to="/admin/groups">{t.groups}</NavLink>
                  <NavLink to="/admin/requests">{uiCopy.editRequests}</NavLink>
                  <NavLink to="/admin/people/update-requests">{uiCopy.updateRequests}</NavLink>
                  <NavLink to="/admin/people/dedupe">{uiCopy.duplicateCheck}</NavLink>
                  <NavLink to="/admin/people/import-year2">{language === 'th' ? 'นำเข้าฐานปี 2' : 'Import Year 2'}</NavLink>

                  <span className="nav-menu-label">{language === 'th' ? 'งานทีมงาน' : 'Staff Operations'}</span>
                  <NavLink to="/admin/staff-ops">{language === 'th' ? 'งานทีมงาน' : 'Staff Operations'}</NavLink>
                  <NavLink to="/admin/staff">{t('navigation.staff')}</NavLink>
                  <NavLink to="/admin/staff/attendance">{uiCopy.staffCheckIn}</NavLink>
                  <NavLink to="/admin/staff/operations">{language === 'th' ? 'โควตา/งานทีมงาน' : 'Staff Quota / Operations'}</NavLink>
                  <NavLink to="/admin/staff/import">{language === 'th' ? 'นำเข้าสตาฟ' : 'Import Staff'}</NavLink>
                  <NavLink to="/admin/staff/requests">{language === 'th' ? 'คำขอแก้ไขทีมงาน' : 'Staff Requests'}</NavLink>
                  <NavLink to="/admin/emergency">{uiCopy.emergency}</NavLink>

                  <span className="nav-menu-label">{language === 'th' ? 'เอกสารและระบบ' : 'Documents & System'}</span>
                  <NavLink to="/admin/documents">{uiCopy.documentCenter}</NavLink>
                  <NavLink to="/admin/data-health">{uiCopy.dataHealth}</NavLink>
                  <NavLink to="/admin/system-readiness">{uiCopy.systemReadiness}</NavLink>
                  <NavLink to="/admin/logs">{t.logs}</NavLink>
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
        <Outlet />
      </main>
      <RoleAwareBottomNav label={language === 'th' ? 'เมนูหลักมือถือ' : 'Mobile primary navigation'}>
        {!isAdmin && !isStaff ? (
          <>
            <NavLink to="/">
              <Home size={19} />
              <span>{t('navigation.home')}</span>
            </NavLink>
            <button type="button" onClick={openPublicSearch}>
              <Search size={19} />
              <span>{t('common.search')}</span>
            </button>
            <NavLink to="/announcements">
              <Bell size={19} />
              <span>{t('navigation.announcements')}</span>
            </NavLink>
          </>
        ) : null}
        {!isAdmin && !isStaff ? (
          <NavLink to="/me">
            <Pencil size={19} />
            <span>{t('navigation.editInfo')}</span>
          </NavLink>
        ) : null}
        {!user && !isAdmin && !isStaff ? (
          <NavLink to="/staff/start">
            <Shield size={19} />
            <span>{t('navigation.staff')}</span>
          </NavLink>
        ) : null}
        {isAdmin ? (
          <>
            <NavLink to="/admin">
              <Shield size={19} />
              <span>{language === 'th' ? 'ศูนย์ควบคุม' : 'Dashboard'}</span>
            </NavLink>
            <NavLink to="/admin/people-groups">
              <UsersRound size={19} />
              <span>{language === 'th' ? 'รายชื่อ/กลุ่ม' : 'People'}</span>
            </NavLink>
            <NavLink to="/admin/staff-ops">
              <UserCheck size={19} />
              <span>{t('navigation.staff')}</span>
            </NavLink>
            <NavLink to="/admin/emergency">
              <HeartPulse size={19} />
              <span>{language === 'th' ? 'ฉุกเฉิน' : 'Emergency'}</span>
            </NavLink>
            <button type="button" aria-label={language === 'th' ? 'เปิดเมนูเพิ่มเติม' : 'Open more menu'} onClick={() => setMobileMoreOpen(true)}>
              <Menu size={19} />
              <span>{t('navigation.more')}</span>
            </button>
          </>
        ) : null}
        {!isAdmin && isStaff ? (
          <>
            <NavLink to="/staff">
              <Shield size={19} />
              <span>{language === 'th' ? 'หน้าทีมงาน' : 'Staff'}</span>
            </NavLink>
            {canAttend ? (
              <NavLink to="/staff/attendance">
                <UserCheck size={19} />
                <span>{language === 'th' ? 'เช็กชื่อทีมงาน' : 'Staff check-in'}</span>
              </NavLink>
            ) : null}
            {access?.can_view_staff ? (
              <NavLink to="/staff/my-group">
                <UsersRound size={19} />
                <span>{language === 'th' ? 'กลุ่มของฉัน' : 'My group'}</span>
              </NavLink>
            ) : null}
            {canEmergency ? (
              <NavLink to="/staff/emergency">
                <HeartPulse size={19} />
                <span>{language === 'th' ? 'ฉุกเฉิน' : 'Emergency'}</span>
              </NavLink>
            ) : (
              <NavLink to="/announcements">
                <Bell size={19} />
                <span>{language === 'th' ? 'ประกาศ' : 'Announcements'}</span>
              </NavLink>
            )}
            <button type="button" aria-label={language === 'th' ? 'เปิดเมนูเพิ่มเติม' : 'Open more menu'} onClick={() => setMobileMoreOpen(true)}>
              <Menu size={19} />
              <span>{t('navigation.more')}</span>
            </button>
          </>
        ) : null}
      </RoleAwareBottomNav>
      <MobileMoreMenu open={mobileMoreOpen} title={language === 'th' ? 'เมนูเพิ่มเติม' : 'More'} onClose={() => setMobileMoreOpen(false)}>
        {isAdmin ? (
          <>
            <div className="mobile-more-section">
              <span className="mobile-more-section-title">{language === 'th' ? 'ภาพรวม' : 'Overview'}</span>
              <NavLink to="/admin"><Shield size={18} />{uiCopy.adminCommandCenter}</NavLink>
              <NavLink to="/admin/dashboard"><Shield size={18} />{language === 'th' ? 'แดชบอร์ด' : 'Dashboard'}</NavLink>
              <NavLink to="/admin/events"><CalendarDays size={18} />{language === 'th' ? 'กิจกรรม' : 'Events'}</NavLink>
              <NavLink to="/admin/announcements"><Bell size={18} />{language === 'th' ? 'ประกาศ' : 'Announcements'}</NavLink>
              <NavLink to="/guide"><FileText size={18} />{language === 'th' ? 'คู่มือ' : 'Guide'}</NavLink>
            </div>
            <div className="mobile-more-section">
              <span className="mobile-more-section-title">{language === 'th' ? 'รายชื่อและกลุ่ม' : 'People & Groups'}</span>
              <NavLink to="/admin/people-groups"><UsersRound size={18} />{language === 'th' ? 'รายชื่อและกลุ่ม' : 'People & Groups'}</NavLink>
              <NavLink to="/admin/groups"><UsersRound size={18} />{language === 'th' ? 'จัดกลุ่ม' : 'Groups'}</NavLink>
              <NavLink to="/admin/people"><Database size={18} />{language === 'th' ? 'ฐานข้อมูลบุคคล' : 'People database'}</NavLink>
              <NavLink to="/admin/people/update-requests"><Database size={18} />{uiCopy.updateRequests}</NavLink>
              <NavLink to="/admin/people/dedupe"><Database size={18} />{uiCopy.duplicateCheck}</NavLink>
              <NavLink to="/admin/people/import-year2"><Database size={18} />{language === 'th' ? 'นำเข้าฐานปี 2' : 'Import Year 2'}</NavLink>
            </div>
            <div className="mobile-more-section">
              <span className="mobile-more-section-title">{language === 'th' ? 'งานสตาฟ' : 'Staff Operations'}</span>
              <NavLink to="/admin/staff-ops"><UserCheck size={18} />{language === 'th' ? 'งานทีมงาน' : 'Staff Operations'}</NavLink>
              <NavLink to="/admin/staff"><UserCheck size={18} />{language === 'th' ? 'ทีมงาน' : 'Staff'}</NavLink>
              <NavLink to="/admin/staff/attendance"><UserCheck size={18} />{uiCopy.staffCheckIn}</NavLink>
              <NavLink to="/admin/staff/operations"><UsersRound size={18} />{language === 'th' ? 'โควตาทีมงาน' : 'Staff Ops'}</NavLink>
              <NavLink to="/admin/staff/requests"><Pencil size={18} />{language === 'th' ? 'คำขอทีมงาน' : 'Staff Requests'}</NavLink>
              <NavLink to="/admin/emergency"><HeartPulse size={18} />{uiCopy.emergency}</NavLink>
            </div>
            <div className="mobile-more-section">
              <span className="mobile-more-section-title">{language === 'th' ? 'เอกสารและระบบ' : 'Documents & System'}</span>
              <NavLink to="/admin/documents"><FileText size={18} />{uiCopy.documentCenter}</NavLink>
              <NavLink to="/admin/data-health"><ShieldCheck size={18} />{uiCopy.dataHealth}</NavLink>
              <NavLink to="/admin/system-readiness"><ShieldCheck size={18} />{uiCopy.systemReadiness}</NavLink>
              <NavLink to="/admin/logs"><Search size={18} />{language === 'th' ? 'ประวัติ' : 'Logs'}</NavLink>
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
