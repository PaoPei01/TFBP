import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, Database, FileText, HeartPulse, Home, Languages, LogOut, Menu, Pencil, Search, Shield, ShieldCheck, UserCheck, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MobileMoreMenu } from './mobile/MobileMoreMenu';
import { RoleAwareBottomNav } from './mobile/RoleAwareBottomNav';
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
  const { language, setLanguage, t } = useLanguage();
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
  const isStaff = Boolean(access?.can_view_staff || access?.can_mark_attendance || access?.can_view_emergency);
  const canAttend = Boolean(isStaff || access?.can_mark_attendance);
  const canEmergency = Boolean(access?.can_view_emergency || access?.is_admin);
  const loginCopy = language === 'th' ? copy.th : copy.en;

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
          <NavLink to="/events">{language === 'th' ? 'กิจกรรม' : 'Events'}</NavLink>
          <NavLink to="/announcements">{language === 'th' ? 'ประกาศ' : 'Info'}</NavLink>
          <NavLink to="/guide">{language === 'th' ? 'คู่มือ' : 'Guide'}</NavLink>
          <NavLink to="/edit">{t.edit}</NavLink>
          <details className={`nav-menu ${isAdmin ? 'nav-menu-wide' : ''}`}>
            <summary>
              <Menu size={16} />
              {language === 'th' ? 'เครื่องมือ' : 'Tools'}
            </summary>
            <div>
              {isAdmin ? (
                <>
                  <span className="nav-menu-label">{language === 'th' ? 'งานหลัก' : 'Core'}</span>
                  <NavLink to="/admin/events">{language === 'th' ? 'กิจกรรม' : 'Events'}</NavLink>
                  <NavLink to="/admin/dashboard">{t.dashboard}</NavLink>
                  <NavLink to="/admin/announcements">{language === 'th' ? 'ประกาศ/ข้อมูลกิจกรรม' : 'Announcements'}</NavLink>
                  <NavLink to="/admin/groups">{t.groups}</NavLink>
                  <NavLink to="/admin/emergency">{language === 'th' ? 'ฉุกเฉิน' : 'Emergency'}</NavLink>
                  <NavLink to="/admin/requests">{t.requests}</NavLink>
                  <span className="nav-menu-label">{language === 'th' ? 'ทีมงาน' : 'Staff'}</span>
                  <NavLink to="/admin/staff">{language === 'th' ? 'ทีมงาน' : 'Staff'}</NavLink>
                  <NavLink to="/admin/staff/attendance">{language === 'th' ? 'เช็กชื่อทีมงาน' : 'Staff Attendance'}</NavLink>
                  <NavLink to="/admin/staff/operations">{language === 'th' ? 'โควตาทีมงาน' : 'Staff Ops'}</NavLink>
                  <NavLink to="/admin/staff/import">{language === 'th' ? 'นำเข้าสตาฟ' : 'Import Staff'}</NavLink>
                  <NavLink to="/admin/staff/requests">{language === 'th' ? 'คำขอแก้ไขทีมงาน' : 'Staff Requests'}</NavLink>
                  <NavLink to="/admin/people">{language === 'th' ? 'ฐานข้อมูลกลาง' : 'People'}</NavLink>
                  <NavLink to="/admin/people/update-requests">{language === 'th' ? 'คำร้องแก้ข้อมูลบุคคล' : 'People Update Requests'}</NavLink>
                  <NavLink to="/admin/people/dedupe">{language === 'th' ? 'ตรวจข้อมูลซ้ำ' : 'People Dedupe'}</NavLink>
                  <NavLink to="/admin/people/import-year2">{language === 'th' ? 'นำเข้า people ปี 2' : 'Import Year 2 People'}</NavLink>
                  <span className="nav-menu-label">{language === 'th' ? 'ระบบเสริม' : 'More tools'}</span>
                  <NavLink to="/admin/documents">{language === 'th' ? 'ศูนย์เอกสาร' : 'Documents'}</NavLink>
                  <NavLink to="/admin/data-health">{language === 'th' ? 'ตรวจสุขภาพข้อมูล' : 'Data Health'}</NavLink>
                  <NavLink to="/admin/logs">{t.logs}</NavLink>
                </>
              ) : null}
              {!isAdmin && isStaff ? (
                <>
                  <span className="nav-menu-label">{language === 'th' ? 'สตาฟ' : 'Staff'}</span>
                  <NavLink to="/staff">{language === 'th' ? 'หน้าสตาฟ' : 'Staff Home'}</NavLink>
                  <NavLink to="/staff/profile">{language === 'th' ? 'โปรไฟล์ของฉัน' : 'My Profile'}</NavLink>
                  <NavLink to="/staff/directory">{language === 'th' ? 'ไดเรกทอรีทีมงาน' : 'Staff Directory'}</NavLink>
                  {access?.can_view_staff ? <NavLink to="/staff/my-group">{language === 'th' ? 'กลุ่มของฉัน' : 'My Group'}</NavLink> : null}
                  {canAttend ? <NavLink to="/staff/attendance">{language === 'th' ? 'เช็กชื่อ' : 'Attendance'}</NavLink> : null}
                  <NavLink to="/staff/profile/qr">{language === 'th' ? 'QR ส่วนตัวทีมงาน' : 'Staff Personal QR'}</NavLink>
                  {canEmergency ? <NavLink to="/staff/emergency">{language === 'th' ? 'สุขภาพฉุกเฉิน' : 'Staff Emergency'}</NavLink> : null}
                </>
              ) : null}
              {!isAdmin && !isStaff ? (
                <>
                  <NavLink to="/staff/profile/verify">{language === 'th' ? 'แก้ไขโปรไฟล์ทีมงาน' : 'Edit Staff Profile'}</NavLink>
                  <NavLink to="/staff/profile/qr">{language === 'th' ? 'QR ส่วนตัวทีมงาน' : 'Staff Personal QR'}</NavLink>
                  <span className="nav-menu-empty">{language === 'th' ? 'เข้าสู่ระบบทีมงานเพื่อดูเครื่องมือเพิ่มเติม' : 'Sign in as staff to see more tools.'}</span>
                </>
              ) : null}
            </div>
          </details>
          {user ? (
            <details className="account-menu">
              <summary className="staff-login-link staff-login-link-active"><UserCheck size={17} /><span>{language === 'th' ? 'บัญชี' : 'Account'}</span></summary>
              <div>
                <strong>{user.email ?? user.id}</strong>
                {isStaff ? <NavLink to="/staff">{loginCopy.staffHome}</NavLink> : null}
                {isStaff ? <NavLink to="/staff/profile">{language === 'th' ? 'โปรไฟล์ของฉัน' : 'My Profile'}</NavLink> : null}
                {isAdmin ? <NavLink to="/admin/dashboard">{loginCopy.adminDashboard}</NavLink> : null}
                <button type="button" onClick={signOut}><LogOut size={16} />{language === 'th' ? 'ออกจากระบบ' : 'Sign out'}</button>
              </div>
            </details>
          ) : (
            <NavLink className="staff-login-link" to="/login">
              <Shield size={17} />
              <span>{loginCopy.staffLogin}</span>
            </NavLink>
          )}
          <button className="language-toggle" type="button" aria-label={language === 'th' ? 'เปลี่ยนภาษาเป็นอังกฤษ' : 'Switch language to Thai'} onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}>
            {language === 'th' ? 'EN' : 'TH'}
          </button>
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
              <span>{language === 'th' ? 'หน้าหลัก' : 'Home'}</span>
            </NavLink>
            <button type="button" onClick={openPublicSearch}>
              <Search size={19} />
              <span>{language === 'th' ? 'ค้นหา' : 'Search'}</span>
            </button>
            <NavLink to="/announcements">
              <Bell size={19} />
              <span>{language === 'th' ? 'ประกาศ' : 'Info'}</span>
            </NavLink>
          </>
        ) : null}
        {!isAdmin && !isStaff ? (
          <NavLink to="/edit">
            <Pencil size={19} />
            <span>{language === 'th' ? 'แก้ไขข้อมูล' : 'Edit Info'}</span>
          </NavLink>
        ) : null}
        {!user && !isAdmin && !isStaff ? (
          <NavLink to="/login">
            <Shield size={19} />
            <span>{language === 'th' ? 'ทีมงาน' : 'Staff'}</span>
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
            <button type="button" aria-label={language === 'th' ? 'เปิดเมนูเพิ่มเติม' : 'Open more menu'} onClick={() => setMobileMoreOpen(true)}>
              <Menu size={19} />
              <span>{language === 'th' ? 'เพิ่มเติม' : 'More'}</span>
            </button>
          </>
        ) : null}
        {!isAdmin && isStaff ? (
          <>
            <NavLink to="/staff">
              <Shield size={19} />
              <span>{language === 'th' ? 'หน้าสตาฟ' : 'Staff'}</span>
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
            <button type="button" aria-label={language === 'th' ? 'เปิดเมนูเพิ่มเติม' : 'Open more menu'} onClick={() => setMobileMoreOpen(true)}>
              <Menu size={19} />
              <span>{language === 'th' ? 'เพิ่มเติม' : 'More'}</span>
            </button>
          </>
        ) : null}
      </RoleAwareBottomNav>
      <MobileMoreMenu open={mobileMoreOpen} title={language === 'th' ? 'เมนูเพิ่มเติม' : 'More'} onClose={() => setMobileMoreOpen(false)}>
        {isAdmin ? (
          <>
            <NavLink to="/admin/dashboard"><Shield size={18} />{language === 'th' ? 'แดชบอร์ด' : 'Dashboard'}</NavLink>
            <NavLink to="/admin/events"><CalendarDays size={18} />{language === 'th' ? 'กิจกรรม' : 'Events'}</NavLink>
            <NavLink to="/guide"><FileText size={18} />{language === 'th' ? 'คู่มือ' : 'Guide'}</NavLink>
            <NavLink to="/admin/groups"><UsersRound size={18} />{language === 'th' ? 'จัดกลุ่ม' : 'Groups'}</NavLink>
            <NavLink to="/admin/staff"><UserCheck size={18} />{language === 'th' ? 'ทีมงาน' : 'Staff'}</NavLink>
            <NavLink to="/admin/staff/attendance"><UserCheck size={18} />{language === 'th' ? 'เช็กชื่อทีมงาน' : 'Staff Attendance'}</NavLink>
            <NavLink to="/admin/staff/operations"><UsersRound size={18} />{language === 'th' ? 'โควตาทีมงาน' : 'Staff Ops'}</NavLink>
            <NavLink to="/admin/staff/requests"><Pencil size={18} />{language === 'th' ? 'คำขอทีมงาน' : 'Staff Requests'}</NavLink>
            <NavLink to="/admin/people"><Database size={18} />{language === 'th' ? 'ฐานข้อมูลกลาง' : 'People'}</NavLink>
            <NavLink to="/admin/people/update-requests"><Database size={18} />{language === 'th' ? 'คำร้องแก้ข้อมูลบุคคล' : 'People Update Requests'}</NavLink>
            <NavLink to="/admin/people/dedupe"><Database size={18} />{language === 'th' ? 'ตรวจข้อมูลซ้ำ' : 'People Dedupe'}</NavLink>
            <NavLink to="/admin/people/import-year2"><Database size={18} />{language === 'th' ? 'นำเข้า people ปี 2' : 'Import Year 2 People'}</NavLink>
            <NavLink to="/admin/announcements"><Bell size={18} />{language === 'th' ? 'ประกาศ' : 'Announcements'}</NavLink>
            <NavLink to="/admin/emergency"><HeartPulse size={18} />{language === 'th' ? 'ฉุกเฉิน' : 'Emergency'}</NavLink>
            <NavLink to="/admin/documents"><FileText size={18} />{language === 'th' ? 'ศูนย์เอกสาร' : 'Documents'}</NavLink>
            <NavLink to="/admin/data-health"><ShieldCheck size={18} />{language === 'th' ? 'ตรวจสุขภาพข้อมูล' : 'Data Health'}</NavLink>
            <NavLink to="/admin/logs"><Search size={18} />{language === 'th' ? 'ประวัติ' : 'Logs'}</NavLink>
            <button type="button" onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}><Languages size={18} />{language === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}</button>
            {user ? <button type="button" onClick={() => void signOut()}><LogOut size={18} />{language === 'th' ? 'ออกจากระบบ' : 'Sign out'}</button> : null}
          </>
        ) : isStaff ? (
          <>
            <NavLink to="/staff"><Shield size={18} />{language === 'th' ? 'หน้าสตาฟ' : 'Staff Home'}</NavLink>
            <NavLink to="/guide"><FileText size={18} />{language === 'th' ? 'คู่มือ' : 'Guide'}</NavLink>
            <NavLink to="/staff/profile"><UserCheck size={18} />{language === 'th' ? 'โปรไฟล์ของฉัน' : 'My Profile'}</NavLink>
            <NavLink to="/staff/directory"><UsersRound size={18} />{language === 'th' ? 'ไดเรกทอรีทีมงาน' : 'Staff Directory'}</NavLink>
            {access?.can_view_staff ? <NavLink to="/staff/my-group"><UsersRound size={18} />{language === 'th' ? 'กลุ่มของฉัน' : 'My Group'}</NavLink> : null}
            {canAttend ? <NavLink to="/staff/attendance"><UserCheck size={18} />{language === 'th' ? 'เช็กชื่อ' : 'Attendance'}</NavLink> : null}
            <NavLink to="/staff/profile/qr"><UserCheck size={18} />{language === 'th' ? 'QR ส่วนตัวทีมงาน' : 'Staff Personal QR'}</NavLink>
            {canEmergency ? <NavLink to="/staff/emergency"><HeartPulse size={18} />{language === 'th' ? 'ฉุกเฉิน' : 'Emergency'}</NavLink> : null}
            <button type="button" onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}><Languages size={18} />{language === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}</button>
            {user ? <button type="button" onClick={() => void signOut()}><LogOut size={18} />{language === 'th' ? 'ออกจากระบบ' : 'Sign out'}</button> : null}
          </>
        ) : (
          <>
            <NavLink to="/"><Home size={18} />{language === 'th' ? 'รายชื่อผู้เข้าร่วม' : 'Participants'}</NavLink>
            <NavLink to="/events"><CalendarDays size={18} />{language === 'th' ? 'กิจกรรม' : 'Events'}</NavLink>
            <NavLink to="/announcements"><Bell size={18} />{language === 'th' ? 'ประกาศ' : 'Announcements'}</NavLink>
            <NavLink to="/guide"><FileText size={18} />{language === 'th' ? 'คู่มือ' : 'Guide'}</NavLink>
            <NavLink to="/edit"><Pencil size={18} />{language === 'th' ? 'แก้ไขข้อมูล' : 'Edit Info'}</NavLink>
            <NavLink to="/staff/profile/verify"><UserCheck size={18} />{language === 'th' ? 'แก้โปรไฟล์ทีมงาน' : 'Staff Profile Verify'}</NavLink>
            <NavLink to="/staff/profile/qr"><UserCheck size={18} />{language === 'th' ? 'QR ส่วนตัวทีมงาน' : 'Staff Personal QR'}</NavLink>
            <NavLink to="/login"><Shield size={18} />{language === 'th' ? 'เข้าสู่ระบบทีมงาน' : 'Staff/Admin Login'}</NavLink>
            <button type="button" onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}><Languages size={18} />{language === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}</button>
          </>
        )}
      </MobileMoreMenu>
    </div>
  );
}
