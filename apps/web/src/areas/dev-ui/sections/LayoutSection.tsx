import {
  BanknoteIcon,
  ClipboardListIcon,
  InfoIcon,
  LayoutDashboardIcon,
  PlusIcon,
  ReceiptIcon,
  SettingsIcon,
  TriangleAlertIcon,
  UsersIcon,
  UtensilsIcon,
  CircleCheckIcon,
  CircleXIcon,
  ArmchairIcon,
  BanIcon,
} from 'lucide-react';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarTrigger,
  Skeleton,
  Spinner,
  StatCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@app/ui';

import type { DevUiCopy } from '../dev-ui.copy.js';
import type { LayoutDemo } from '../layout-demo.js';
import { ShowcaseRow, ShowcaseSection } from './ShowcaseSection.js';

export interface LayoutSectionProps {
  copy: DevUiCopy;
  layout: LayoutDemo;
}

export function LayoutSection({ copy, layout }: LayoutSectionProps) {
  const l = copy.layout;
  const mainNav = [
    { id: 'dashboard', icon: <LayoutDashboardIcon />, label: l.nav.dashboard },
    { id: 'orders', icon: <ReceiptIcon />, label: l.nav.orders, badge: <Badge>12</Badge> },
    { id: 'menu', icon: <UtensilsIcon />, label: l.nav.menu },
    { id: 'tables', icon: <ArmchairIcon />, label: l.nav.tables },
  ];
  const adminNav = [
    { id: 'staff', icon: <UsersIcon />, label: l.nav.staff },
    { id: 'settings', icon: <SettingsIcon />, label: l.nav.settings },
  ];
  const navItem = (item: (typeof mainNav)[number]) => (
    <SidebarItem
      key={item.id}
      icon={item.icon}
      label={item.label}
      badge={item.badge}
      active={layout.activeItem === item.id}
      onClick={() => {
        layout.onActiveItemChange(item.id);
      }}
    />
  );

  return (
    <ShowcaseSection title={copy.sections.layout}>
      <div className="flex h-[36rem] overflow-hidden rounded-xl border">
        <Sidebar
          label={l.sidebarLabel}
          closeLabel={l.close}
          collapsed={layout.collapsed}
          mobileOpen={layout.mobileOpen}
          onMobileOpenChange={layout.onMobileOpenChange}
        >
          <SidebarHeader>
            <span className="truncate font-semibold">{layout.collapsed ? '🍽' : l.brand}</span>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup label={l.groupMain}>{mainNav.map(navItem)}</SidebarGroup>
            <SidebarGroup label={l.groupSettings}>{adminNav.map(navItem)}</SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarItem icon={<SettingsIcon />} label={l.nav.settings} />
          </SidebarFooter>
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger
              label={l.collapse}
              variant="ghost"
              className="hidden md:inline-flex"
              onClick={layout.onToggleCollapsed}
            />
            <SidebarTrigger
              label={l.openMenu}
              variant="ghost"
              className="md:hidden"
              onClick={layout.onOpenMobile}
            />
          </div>
          <PageHeader
            title={l.pageTitle}
            description={l.pageDescription}
            breadcrumbs={l.breadcrumbs}
            breadcrumbLabel={l.breadcrumbLabel}
            actions={
              <Button>
                <PlusIcon aria-hidden />
                {l.newOrder}
              </Button>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label={l.stats.sales}
              value={l.stats.salesValue}
              delta={l.stats.salesDelta}
              trend="up"
              deltaHint={l.stats.vsYesterday}
              icon={<BanknoteIcon />}
            />
            <StatCard
              label={l.stats.orders}
              value={l.stats.ordersValue}
              delta={l.stats.ordersDelta}
              trend="down"
              deltaHint={l.stats.vsYesterday}
              icon={<ClipboardListIcon />}
            />
            <StatCard
              label={l.stats.cancelled}
              value={l.stats.cancelledValue}
              delta={l.stats.cancelledDelta}
              trend="down"
              invertTrendColor
              deltaHint={l.stats.vsYesterday}
              icon={<BanIcon />}
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{l.tabs.overview}</TabsTrigger>
          <TabsTrigger value="orders">{l.tabs.orders}</TabsTrigger>
          <TabsTrigger value="reports" disabled>
            {l.tabs.reports}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">{l.tabs.overviewText}</TabsContent>
        <TabsContent value="orders">{l.tabs.ordersText}</TabsContent>
        <TabsContent value="reports">{l.tabs.reportsText}</TabsContent>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{l.cardTitle}</CardTitle>
            <CardDescription>{l.cardDescription}</CardDescription>
          </CardHeader>
          <CardContent>{l.cardBody}</CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline">{l.cancel}</Button>
            <Button>{l.save}</Button>
          </CardFooter>
        </Card>
        <Card>
          <CardContent>
            <EmptyState
              icon={<ReceiptIcon />}
              title={l.emptyTitle}
              description={l.emptyDescription}
              action={<Button variant="outline">{l.emptyAction}</Button>}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Alert variant="info" role="status">
          <InfoIcon />
          <AlertTitle>{l.alerts.info}</AlertTitle>
          <AlertDescription>{l.alerts.infoText}</AlertDescription>
        </Alert>
        <Alert variant="success" role="status">
          <CircleCheckIcon />
          <AlertTitle>{l.alerts.success}</AlertTitle>
          <AlertDescription>{l.alerts.successText}</AlertDescription>
        </Alert>
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>{l.alerts.warning}</AlertTitle>
          <AlertDescription>{l.alerts.warningText}</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <CircleXIcon />
          <AlertTitle>{l.alerts.error}</AlertTitle>
          <AlertDescription>{l.alerts.errorText}</AlertDescription>
        </Alert>
      </div>

      <ShowcaseRow label={l.toasts.show}>
        {(['success', 'error', 'info', 'warning'] as const).map((kind) => (
          <Button
            key={kind}
            variant="outline"
            onClick={() => {
              layout.onToast(kind);
            }}
          >
            {kind}
          </Button>
        ))}
      </ShowcaseRow>

      <ShowcaseRow label="Spinner">
        <Spinner size="sm" label={l.loading} />
        <Spinner label={l.loading} />
        <Spinner size="lg" label={l.loading} />
      </ShowcaseRow>

      <ShowcaseRow label={l.skeleton}>
        <div className="flex w-full max-w-md items-center gap-4">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </ShowcaseRow>
    </ShowcaseSection>
  );
}
