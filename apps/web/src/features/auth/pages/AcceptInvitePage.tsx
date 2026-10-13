import { AcceptInvitePageView } from '../components/AcceptInvitePageView.js';
import { useAcceptInvitePage } from '../hooks/use-accept-invite-page.js';

export default function AcceptInvitePage() {
  const vm = useAcceptInvitePage();
  return <AcceptInvitePageView {...vm} />;
}
