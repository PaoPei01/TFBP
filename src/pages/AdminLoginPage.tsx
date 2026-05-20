import { LogIn, LogOut, UserCheck } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';

export function AdminLoginPage() {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setUser(data.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setToast(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setToast({ type: 'error', message: error.message });
      return;
    }
    const { data } = await supabase.auth.getUser();
    setUser(data.user ?? null);
    navigate('/admin/dashboard');
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    setUser(null);
    setToast({ type: 'success', message: language === 'th' ? 'ออกจากระบบแล้ว' : 'Signed out' });
    navigate('/');
  }

  return (
    <section className="narrow-page page-stack">
      <Toast toast={toast} />
      <div className="section-heading">
        <p className="eyebrow">Admin</p>
        <h1>{language === 'th' ? 'เข้าสู่ระบบผู้ดูแล' : 'Admin sign in'}</h1>
        <p>{language === 'th' ? 'ใช้บัญชี Supabase Auth ที่ถูกเพิ่มในตาราง admins เท่านั้น' : 'Use a Supabase Auth account that has been added to the admins table.'}</p>
      </div>
      {user ? (
        <Card className="auth-account-card">
          <div>
            <UserCheck size={20} />
            <div>
              <strong>{language === 'th' ? 'กำลังเข้าสู่ระบบอยู่' : 'Currently signed in'}</strong>
              <span>{user.email ?? user.id}</span>
            </div>
          </div>
          <div className="form-actions">
            <Button onClick={() => navigate('/admin/dashboard')}>{language === 'th' ? 'ไปหน้าแดชบอร์ด' : 'Go to dashboard'}</Button>
            <Button variant="danger" icon={<LogOut size={18} />} onClick={handleSignOut} disabled={signingOut}>
              {language === 'th' ? 'ออกจากระบบ' : 'Sign out'}
            </Button>
          </div>
        </Card>
      ) : null}
      <Card>
        <form className="form-grid" onSubmit={handleLogin}>
          <Input label={language === 'th' ? 'อีเมลผู้ดูแล' : 'Admin email'} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input label={language === 'th' ? 'รหัสผ่าน' : 'Password'} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <Button type="submit" disabled={loading} icon={<LogIn size={18} />}>
            {language === 'th' ? 'เข้าสู่ระบบ' : 'Sign in'}
          </Button>
        </form>
      </Card>
      <Card className="privacy-notice">
        <strong>{language === 'th' ? 'แก้ไขโปรไฟล์ทีมงานรายบุคคล' : 'Individual staff profile update'}</strong>
        <span>{language === 'th' ? 'สำหรับทีมงานรายบุคคลที่ต้องการแก้ไขโปรไฟล์ ไม่จำเป็นต้องมีบัญชีเข้าสู่ระบบ' : 'For individual staff who need to update their profile. No login account required.'}</span>
        <Link className="btn btn-secondary" to="/staff/profile/verify">{language === 'th' ? 'แก้ไขโปรไฟล์ทีมงาน' : 'Edit Staff Profile'}</Link>
      </Card>
    </section>
  );
}
