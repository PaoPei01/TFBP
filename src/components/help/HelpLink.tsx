import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { getGuideTopicById, getGuideTopicPath } from '../../lib/guideRegistry';

type HelpLinkProps = {
  topicId: string;
  children: ReactNode;
  className?: string;
};

export function HelpLink({ topicId, children, className = '' }: HelpLinkProps) {
  const topic = getGuideTopicById(topicId);
  return (
    <Link className={className} to={topic ? getGuideTopicPath(topic.topicId) : '/guide'}>
      {children}
    </Link>
  );
}
