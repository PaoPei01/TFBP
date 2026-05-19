import type { CSSProperties } from 'react';
import { groupMeta, mainGroups, subgroups } from '../../lib/groups';
import type { MainGroup, Subgroup } from '../../lib/types';

type MobileGroupTabsProps = {
  activeMainGroup: MainGroup | '';
  activeSubgroup: Subgroup | '';
  counts?: Record<string, number>;
  language: 'th' | 'en';
  onChange: (mainGroup: MainGroup, subgroup: Subgroup) => void;
};

export function MobileGroupTabs({ activeMainGroup, activeSubgroup, counts = {}, language, onChange }: MobileGroupTabsProps) {
  return (
    <div className="mobile-group-tabs" role="tablist" aria-label={language === 'th' ? 'เลือกกลุ่ม' : 'Select group'}>
      {mainGroups.flatMap((mainGroup) =>
        subgroups.map((subgroup) => {
          const active = activeMainGroup === mainGroup && activeSubgroup === subgroup;
          const key = `${mainGroup}-${subgroup}`;
          return (
            <button
              type="button"
              role="tab"
              aria-selected={active}
              className={active ? 'active' : ''}
              key={key}
              style={{ '--group-color': groupMeta[mainGroup].color, '--group-soft': groupMeta[mainGroup].soft } as CSSProperties}
              onClick={() => onChange(mainGroup, subgroup)}
            >
              <span>{language === 'th' ? groupMeta[mainGroup].th : groupMeta[mainGroup].en} {subgroup}</span>
              <strong>{counts[key] ?? 0}</strong>
            </button>
          );
        }),
      )}
    </div>
  );
}
