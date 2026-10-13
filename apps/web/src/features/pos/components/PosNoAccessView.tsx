import { Button } from '@app/ui';
import { Link } from 'react-router-dom';

export type PosNoAccessContent = {
  title: string;
  description: string;
  backLabel: string;
  backTo: string;
};

export function PosNoAccessView({ noAccess }: { noAccess: PosNoAccessContent }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">{noAccess.title}</h1>
      <p className="text-muted-foreground text-sm">{noAccess.description}</p>
      <Button type="button" size="touch" asChild>
        <Link to={noAccess.backTo}>{noAccess.backLabel}</Link>
      </Button>
    </div>
  );
}
