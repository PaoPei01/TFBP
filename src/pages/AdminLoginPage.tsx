import { LogIn, LogOut, UserCheck } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { fetchStaffAccessContext } from '../services/staff';

type AccessTarget = 'admin' | 'staff' | 'none';

export function AdminLoginPage() {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [accessTarget, setAccessTarget] = useState<AccessTarget | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const navigate = useNavigate();

  const resolveAccess = useCallback(async (userId: string): Promise<AccessTarget> => {
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin', { uid: userId });
    if (adminError) throw adminError;
    if (isAdmin) return 'admin';
    const access = await fetchStaffAccessContext();
    if (access.can_view_staff || access.can_mark_attendance || access.can_view_emergency || access.roles?.length) return 'staff';
    return 'none';
  }, []);

  function authErrorMessage(err: unknown) {
    const message = err instanceof Error ? err.message.toLowerCase() : '';
    if (message.includes('invalid login') || message.includes('invalid credentials')) {
      return language === 'th' ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : 'Invalid email or password.';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return language === 'th' ? 'เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่' : 'Could not connect. Please try again.';
    }
    return language === 'th' ? 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่' : 'Sign in failed. Please try again.';
  }

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

  useEffect(() => {
    let active = true;
    setAccessTarget(null);
    setCheckingAccess(false);
    if (!user) return () => {
      active = false;
    };
    setCheckingAccess(true);
    resolveAccess(user.id)
      .then((target) => {
        if (active) setAccessTarget(target);
      })
      .catch(() => {
        if (active) setAccessTarget('none');
      })
      .finally(() => {
        if (active) setCheckingAccess(false);
      });
    return () => {
      active = false;
    };
  }, [resolveAccess, user]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setToast(null);
    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const signedInUser = signInData.user;
      const target = await resolveAccess(signedInUser.id);
      setAccessTarget(target);
      if (target === 'admin') {
        setUser(signedInUser);
        setToast({ type: 'success', message: language === 'th' ? 'เข้าสู่ระบบผู้ดูแลสำเร็จ' : 'Admin sign in successful' });
        navigate('/admin/dashboard');
        return;
      }
      if (target === 'staff') {
        setUser(signedInUser);
        setToast({ type: 'success', message: language === 'th' ? 'เข้าสู่ระบบทีมงานสำเร็จ' : 'Staff sign in successful' });
        navigate('/staff');
        return;
      }
      await supabase.auth.signOut();
      setUser(null);
      setAccessTarget(null);
      setToast({ type: 'error', message: language === 'th' ? 'บัญชีนี้ยังไม่มีสิทธิ์เข้าใช้งานระบบทีมงาน' : 'This account does not have staff access.' });
    } catch (err) {
      await supabase.auth.signOut();
      setUser(null);
      setAccessTarget(null);
      setToast({ type: 'error', message: authErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    setUser(null);
    setAccessTarget(null);
    setToast({ type: 'success', message: language === 'th' ? 'ออกจากระบบแล้ว' : 'Signed out' });
    navigate('/');
  }

  return (
    <section className="narrow-page page-stack">
      <Toast toast={toast} />
      <div className="section-heading">
        <p className="eyebrow">Staff Sign In</p>
        <h1>{language === 'th' ? 'เข้าสู่ระบบทีมงาน' : 'Staff Sign In'}</h1>
        <p>{language === 'th' ? 'ใช้บัญชีที่ได้รับสิทธิ์ทีมงานหรือผู้ดูแลระบบ' : 'Use an account with staff or admin access.'}</p>
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
            {checkingAccess ? <Button disabled>{language === 'th' ? 'กำลังตรวจสอบสิทธิ์...' : 'Checking access...'}</Button> : null}
            {!checkingAccess && accessTarget === 'admin' ? (
              <Button onClick={() => navigate('/admin/dashboard')}>{language === 'th' ? 'ไปหน้าแดชบอร์ดผู้ดูแล' : 'Go to Admin Dashboard'}</Button>
            ) : null}
            {!checkingAccess && accessTarget === 'staff' ? (
              <Button onClick={() => navigate('/staff')}>{language === 'th' ? 'ไปหน้า Staff Mode' : 'Go to Staff Mode'}</Button>
            ) : null}
            {!checkingAccess && accessTarget === 'none' ? (
              <span className="form-hint">{language === 'th' ? 'บัญชีนี้ยังไม่มีสิทธิ์เข้าใช้งานระบบทีมงาน' : 'This account does not have staff access.'}</span>
            ) : null}
            <Button variant="danger" icon={<LogOut size={18} />} onClick={handleSignOut} disabled={signingOut}>
              {language === 'th' ? 'ออกจากระบบ' : 'Sign out'}
            </Button>
          </div>
        </Card>
      ) : null}
      <Card>
        <form className="form-grid" onSubmit={handleLogin}>
          <Input label={language === 'th' ? 'อีเมล' : 'Email'} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input label={language === 'th' ? 'รหัสผ่าน' : 'Password'} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <Button type="submit" loading={loading} icon={<LogIn size={18} />}>
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
