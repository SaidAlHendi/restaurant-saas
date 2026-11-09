import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@app/ui';

import { DevicePinLoginView } from '../../features/devices/components/DevicePinLoginView.js';
import { PairDeviceView } from '../../features/devices/components/PairDeviceView.js';
import { useDevicePinLogin } from '../../features/devices/hooks/use-device-pin-login.js';
import { useLoginMode } from '../../features/devices/hooks/use-login-mode.js';
import { usePairDevice } from '../../features/devices/hooks/use-pair-device.js';
import type { StoredDevice } from '../../features/devices/device-key-storage.js';
import { GuestOnly } from '../../features/session/GuestOnly.js';
import { useLoginPage } from './use-login-page.js';

function DevicePinLogin(props: {
  device: StoredDevice;
  onDeviceInvalid: () => void;
  onUseEmail: () => void;
}) {
  const vm = useDevicePinLogin(props);
  return <DevicePinLoginView {...vm} />;
}

function PairDevice(props: { onPaired: (device: StoredDevice) => void; onCancel: () => void }) {
  const vm = usePairDevice(props);
  return <PairDeviceView {...vm} />;
}

export default function LoginPage() {
  const { form, onSubmit, isLoading, errorMessage, t } = useLoginPage();
  const loginMode = useLoginMode();
  const { device, mode } = loginMode;

  if (mode === 'pin' && device) {
    return (
      <GuestOnly>
        <Card className="mx-auto max-w-lg p-6">
          <DevicePinLogin
            device={device}
            onDeviceInvalid={loginMode.unlink}
            onUseEmail={loginMode.showEmail}
          />
        </Card>
      </GuestOnly>
    );
  }

  if (mode === 'pair') {
    return (
      <GuestOnly>
        <Card className="mx-auto max-w-md p-6">
          <PairDevice onPaired={loginMode.onPaired} onCancel={loginMode.showEmail} />
        </Card>
      </GuestOnly>
    );
  }

  return (
    <GuestOnly>
      <Card className="mx-auto max-w-md p-6">
        <h2 className="mb-4 text-xl font-semibold">{t('auth.login.title')}</h2>
        <Form {...form}>
          <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.fields.email')}</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.fields.password')}</FormLabel>
                  <FormControl>
                    {/* TODO: PasswordInput from @app/ui when exported on main */}
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {errorMessage ? (
              <p className="text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            ) : null}
            <Button type="submit" disabled={isLoading}>
              {t('auth.login.submit')}
            </Button>
          </form>
        </Form>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {device ? (
            <>
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={loginMode.showPin}
              >
                {t('devices.login.backToPin')}
              </button>
              <button
                type="button"
                className="text-muted-foreground underline-offset-4 hover:underline"
                onClick={loginMode.unlink}
              >
                {t('devices.login.unlink')}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline"
              onClick={loginMode.showPair}
            >
              {t('devices.login.linkDevice')}
            </button>
          )}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {t('auth.login.noAccount')}{' '}
          <Link to="/signup" className="text-primary underline-offset-4 hover:underline">
            {t('auth.login.signUpLink')}
          </Link>
        </p>
      </Card>
    </GuestOnly>
  );
}
