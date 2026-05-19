import { Flame, Phone } from 'lucide-react';

type EmergencyQuickDockProps = {
  language: 'th' | 'en';
};

export function EmergencyQuickDock({ language }: EmergencyQuickDockProps) {
  return (
    <div className="emergency-dock" aria-label={language === 'th' ? 'ปุ่มลัดฉุกเฉิน' : 'Emergency quick actions'}>
      <a className="dock-critical" href="tel:1669"><Flame size={18} /> EMS 1669</a>
      <a href="tel:0636510902"><Phone size={18} /> Head Medic</a>
      <a href="tel:191">Police 191</a>
    </div>
  );
}
