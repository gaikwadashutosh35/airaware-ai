import { CircleUser, House, Leaf, MessageCircle, Sun } from 'lucide-react';
import { follow, type AppPage } from '../lib/navigation.ts';

const ITEMS = [
  { page: 'today', href: '/app', name: 'Today', short: 'Today', Icon: Sun },
  {
    page: 'ask',
    href: '/app/ask',
    name: 'Ask AirAware',
    short: 'Ask',
    Icon: MessageCircle,
  },
  {
    page: 'home',
    href: '/app/home',
    name: 'My Home',
    short: 'Home',
    Icon: House,
  },
  {
    page: 'habits',
    href: '/app/habits',
    name: 'Better Habits',
    short: 'Habits',
    Icon: Leaf,
  },
  {
    page: 'profile',
    href: '/app/profile',
    name: 'My Profile',
    short: 'Profile',
    Icon: CircleUser,
  },
] as const;

// One navigation landmark: a bottom bar on phones, inline in the top bar from
// md. Each link is named by its full label; phones show the short one.
export function AppNav({ page }: { page: AppPage }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-rule-dark bg-bg pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] md:static md:ml-auto md:border-0 md:bg-transparent md:p-0"
    >
      <ul className="grid grid-cols-5 md:flex md:flex-wrap md:justify-end md:gap-1">
        {ITEMS.map(({ page: target, href, name, short, Icon }) => (
          <li key={target}>
            <a
              href={href}
              aria-label={name}
              aria-current={target === page ? 'page' : undefined}
              onClick={(event) => {
                if (follow(event, href)) {
                  document
                    .getElementById('main')
                    ?.focus({ preventScroll: true });
                }
              }}
              className="press group flex min-h-14 whitespace-nowrap flex-col items-center justify-center gap-0.5 text-xs text-text-muted aria-[current=page]:font-semibold aria-[current=page]:text-text md:min-h-11 md:flex-row md:gap-2 md:rounded-full md:px-3 md:text-sm md:aria-[current=page]:bg-elevated md:aria-[current=page]:shadow-[inset_0_0_0_1px_var(--color-text-muted)] forced-colors:aria-[current=page]:underline"
            >
              <span className="flex h-7 w-12 max-w-full items-center justify-center rounded-full group-aria-[current=page]:bg-elevated md:h-auto md:w-auto md:group-aria-[current=page]:bg-transparent">
                <Icon
                  aria-hidden="true"
                  className="size-5 group-aria-[current=page]:text-primary"
                />
              </span>
              <span className="max-w-full truncate lg:hidden">{short}</span>
              <span className="hidden max-w-full truncate lg:inline">
                {name}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
