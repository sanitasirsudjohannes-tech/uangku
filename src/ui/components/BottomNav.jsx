import { useApp, useAppState } from '../context.jsx';
import { TABS } from '../../app/actions.js';
import { ListIcon, PlusIcon, SettingsIcon, WalletIcon } from './Icons.jsx';

const ITEMS = [
  { tab: TABS.SUMMARY, label: 'Ringkasan', Icon: WalletIcon },
  { tab: TABS.HISTORY, label: 'Riwayat', Icon: ListIcon },
  { tab: TABS.SETTINGS, label: 'Pengaturan', Icon: SettingsIcon },
];

export default function BottomNav() {
  const { actions } = useApp();
  const state = useAppState();
  const { openForm } = useApp();

  return (
    <nav
      aria-label="Navigasi utama"
      className="nav-height fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-safe backdrop-blur-lg"
    >
      <div className="mx-auto flex h-full max-w-md items-stretch px-2">
        <div className="flex flex-1 items-stretch">
          {ITEMS.slice(0, 2).map(({ tab, label, Icon }) => (
            <NavButton
              key={tab}
              active={state.tab === tab}
              label={label}
              Icon={Icon}
              onClick={() => actions.setTab(tab)}
            />
          ))}
        </div>

        <div className="flex w-16 items-start justify-center pt-1.5">
          <button
            type="button"
            onClick={() => openForm({ type: 'expense' })}
            aria-label="Catat transaksi baru"
            className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-ink shadow-card transition active:scale-95"
          >
            <PlusIcon size={26} />
          </button>
        </div>

        <div className="flex flex-1 items-stretch">
          {ITEMS.slice(2).map(({ tab, label, Icon }) => (
            <NavButton
              key={tab}
              active={state.tab === tab}
              label={label}
              Icon={Icon}
              onClick={() => actions.setTab(tab)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavButton({ active, label, Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`nav-item ${active ? 'nav-item-active' : ''}`}
    >
      <Icon size={22} />
      <span>{label}</span>
    </button>
  );
}
