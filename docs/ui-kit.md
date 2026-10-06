# UI kit (`packages/ui`)

All UI is built from shadcn/ui components (Radix primitives + Tailwind v4), copied into `packages/ui`
with the shadcn CLI (monorepo mode, `components.json` in `packages/ui`), then adapted to our rules.
Apps import from `@app/ui`. No other component library. No daisyUI components: daisyUI is used only
as the source of the two color themes.

## Themes
- `cupcake` (light, default) and `forest` (dark), values from daisyUI v5, defined in
  `packages/ui/src/styles/themes.css` and mapped to shadcn tokens (`--background`, `--primary`, ...)
  plus extra tokens `success`, `warning`, `info`.
- Applied with `<html data-theme="cupcake|forest">`. First visit follows `prefers-color-scheme`;
  the user's choice is saved (localStorage for guests, user profile when logged in).
- Theme logic in `packages/ui/src/hooks/use-theme.ts`; `<ThemeToggle>` is UI only.
- Components use token classes only (`bg-background`, `text-foreground`, `bg-primary text-primary-foreground`,
  `border-border`, `text-muted-foreground`, `bg-success`). Never raw colors like `bg-green-500` or hex values.
- Both themes must be checked for every component (contrast, focus ring, disabled state).

## RTL
- Wrap apps in Radix `DirectionProvider` with `dir` from the locale.
- After adding a shadcn component, replace physical classes with logical ones
  (`ml-`→`ms-`, `mr-`→`me-`, `pl-`→`ps-`, `pr-`→`pe-`, `left-`→`start-`, `right-`→`end-`, `text-left`→`text-start`)
  and flip directional icons (chevrons, arrows) in RTL with `rtl:rotate-180`.

## Folder structure
```
packages/ui/src/
  components/            # one folder per component: button/button.tsx, button/index.ts, button/button.stories.tsx (later)
  hooks/                 # non-visual reusable logic: use-theme.ts, use-debounced-value.ts, use-pagination.ts, use-data-table.ts, use-disclosure.ts
  lib/cn.ts              # clsx + tailwind-merge
  styles/themes.css      # themes + tokens
  styles/globals.css     # @import "tailwindcss"; @import "./themes.css"; base layer
  index.ts               # public exports
```

## Components — first batch
| Group | Components |
|---|---|
| Actions | Button (variants: default, secondary, outline, ghost, destructive, link; sizes sm/md/lg/touch), IconButton, ButtonGroup |
| Form inputs | Input, Textarea, NumberInput, MoneyInput (minor units in/out), PasswordInput, Checkbox, Switch, RadioGroup, Select, Combobox (searchable select), MultiSelect, DatePicker, DateRangePicker, FileUpload/ImageUpload |
| Form wiring | Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription (shadcn Form on react-hook-form) |
| Search & lists | SearchInput (debounced, clear button), FilterBar, Pagination (cursor: prev/next; and page numbers), DataTable (sorting, column visibility, empty/loading/error states, row actions, sticky header) |
| Overlays | Popover, Dialog, ConfirmDialog, Sheet (side panel), DropdownMenu, Tooltip, Command (command palette) |
| Display | Card, Badge (incl. status variants: new, preparing, ready, completed, cancelled), Avatar, Separator, Tabs, Accordion, Skeleton, Spinner, EmptyState, Alert, KPI/StatCard, Money, DateTime |
| Feedback | Toast (sonner), Progress |
| Layout | PageHeader, Sidebar (dashboard), Topbar, Container, Stack/Grid helpers, ThemeToggle, LanguageSwitcher |

## Status after step 1b
Built: Button, IconButton, Input, Textarea, Label, Checkbox, Switch, RadioGroup, Select, Combobox, Command,
Popover, DropdownMenu, Tooltip, Dialog, ConfirmDialog, Sheet, Form parts, MoneyInput, NumberInput, SearchInput,
CursorPagination, NumberedPagination, Table, DataTable (own implementation, no TanStack), Badge + OrderStatusBadge,
Skeleton, Card, Tabs, Spinner, EmptyState, Alert, StatCard, Toaster/toast, PageHeader, Sidebar, ThemeToggle.

Not built yet (add when a feature needs them): ButtonGroup, PasswordInput, MultiSelect, DatePicker,
DateRangePicker, FileUpload/ImageUpload, FilterBar, Avatar, Separator, Accordion, Money, DateTime, Progress,
Topbar, Container, Stack/Grid helpers, LanguageSwitcher.

## Component API conventions
- Controlled and uncontrolled support where shadcn supports it (`value`/`onValueChange`, `defaultValue`).
- Every component accepts `className` and forwards `ref`; merge classes with `cn()`.
- Text comes from props (already translated by the caller); `packages/ui` never imports i18n or app code.
- Accessible by default: labels, `aria-*`, keyboard navigation, visible focus ring (`ring-ring`).
- Touch size variant (`size="touch"`, min 48px) for POS/KDS.
- DataTable is presentational: it receives `columns`, `data`, `isLoading`, `sorting`, `onSortingChange`,
  `pagination` props. Server-side sorting/paging state lives in the feature's view-model hook.

## Showcase
A `/dev/ui` route in `apps/web` (dev builds only) renders every component in both themes and both
directions, used for review.
