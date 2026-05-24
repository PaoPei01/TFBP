import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';

type DemoStepControlsProps = {
  current: number;
  total: number;
  onNext: () => void;
  onPrevious: () => void;
};

export function DemoStepControls({ current, total, onNext, onPrevious }: DemoStepControlsProps) {
  return (
    <div className="demo-story-controls" aria-label="Demo story controls">
      <Link className="btn btn-secondary" to="/demo">Back to Demo</Link>
      <Button variant="secondary" icon={<ArrowLeft size={18} />} onClick={onPrevious} disabled={current === 0}>
        Previous section
      </Button>
      <div className="demo-story-progress" aria-label={`Section ${current + 1} of ${total}`}>
        <span style={{ width: `${((current + 1) / total) * 100}%` }} />
      </div>
      <Button icon={<ArrowRight size={18} />} onClick={onNext} disabled={current === total - 1}>
        Next section
      </Button>
    </div>
  );
}
