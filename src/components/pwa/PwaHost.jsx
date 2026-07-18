import PwaUpdateBanner from './PwaUpdateBanner';
import usePwaUpdate from '../../hooks/usePwaUpdate';

export default function PwaHost() {
  const { updateReady } = usePwaUpdate();

  if (!updateReady) return null;
  return <PwaUpdateBanner />;
}
