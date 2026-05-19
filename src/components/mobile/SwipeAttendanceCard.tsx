import { CheckCircle2, XCircle } from 'lucide-react';
import { useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../ui/Button';

type SwipeAttendanceCardProps = {
  title: string;
  subtitle: string;
  meta?: string;
  status?: string | null;
  statusLabel: string;
  presentLabel: string;
  absentLabel: string;
  onPresent: () => void;
  onAbsent: () => void;
  children?: ReactNode;
};

export function SwipeAttendanceCard({ title, subtitle, meta, status, statusLabel, presentLabel, absentLabel, onPresent, onAbsent, children }: SwipeAttendanceCardProps) {
  const startX = useRef<number | null>(null);

  function finish(endX: number) {
    if (startX.current === null) return;
    const delta = endX - startX.current;
    startX.current = null;
    if (delta > 64) onPresent();
    if (delta < -64) onAbsent();
  }

  return (
    <div
      className={`swipe-attendance-card ${status ? `attendance-${status}` : ''}`}
      onTouchStart={(event) => { startX.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => finish(event.changedTouches[0]?.clientX ?? 0)}
      onPointerDown={(event) => { if (event.pointerType !== 'mouse') startX.current = event.clientX; }}
      onPointerUp={(event) => { if (event.pointerType !== 'mouse') finish(event.clientX); }}
    >
      <div className="swipe-hints" aria-hidden="true">
        <span>{presentLabel}</span>
        <span>{absentLabel}</span>
      </div>
      <div className="mobile-card-head">
        <div>
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
        {meta ? <em>{meta}</em> : null}
      </div>
      <div className="attendance-status-line">
        <strong>{statusLabel}</strong>
        {children}
      </div>
      <div className="mobile-card-actions two-fast-actions">
        <Button variant={status === 'present' ? 'primary' : 'secondary'} icon={<CheckCircle2 size={17} />} onClick={onPresent}>{presentLabel}</Button>
        <Button variant={status === 'absent' ? 'danger' : 'secondary'} icon={<XCircle size={17} />} onClick={onAbsent}>{absentLabel}</Button>
      </div>
    </div>
  );
}
