import { Link, NavLink, Outlet } from 'react-router-dom';
import { HeartPulse, Home, Menu, Search, Shield, ShieldCheck, UsersRound } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function Layout() {
  const { language, setLanguage, t } = useLanguage();

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
