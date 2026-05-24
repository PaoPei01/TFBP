type DemoMetricCardProps = {
  label: string;
  value: string;
  helper?: string;
};

export function DemoMetricCard({ label, value, helper }: DemoMetricCardProps) {
  return (
    <div className="demo-story-metric">
      <strong>{value}</strong>
      <span>{label}</span>
      {helper ? <small>{helper}</small> : null}
    </div>
  );
}
