// Wires the Nav's tab clicks to the router + type filter. Apps/Tools/Creative
// stay on Discover and just set the type filter; Library is its own route.

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTroveStore } from '../store/useTroveStore';
import type { NavItem } from '../components/Nav';
import type { Project, TypeFilter } from '../types';

const TYPE_FOR: Record<'Discover' | 'Apps' | 'Tools' | 'Creative', TypeFilter> = {
  Discover: 'All',
  Apps: 'App',
  Tools: 'Tool',
  Creative: 'Creative',
};

export function useNavActions() {
  const navigate = useNavigate();
  const setType = useTroveStore((s) => s.setType);

  const scrollTop = () => requestAnimationFrame(() => window.scrollTo(0, 0));

  const onHome = useCallback(() => {
    setType('All');
    navigate('/');
    scrollTop();
  }, [navigate, setType]);

  const onNav = useCallback(
    (item: NavItem) => {
      if (item === 'Library') {
        setType('All');
        navigate('/library');
      } else if (item === 'Feed') {
        navigate('/feed');
      } else {
        setType(TYPE_FOR[item]);
        navigate('/');
      }
      scrollTop();
    },
    [navigate, setType],
  );

  const onOpenDetail = useCallback(
    (p: Project) => {
      navigate(`/p/${p.owner}/${p.name}`);
      scrollTop();
    },
    [navigate],
  );

  const onOpenCreator = useCallback(
    (handle: string) => {
      navigate(`/c/${handle}`);
      scrollTop();
    },
    [navigate],
  );

  return { onHome, onNav, onOpenDetail, onOpenCreator };
}
