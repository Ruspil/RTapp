import { Home, LayoutGrid, User } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type TabId = "today" | "library" | "profile"

interface TabDef {
  id: TabId
  label: string
  icon: LucideIcon
}

const TABS: TabDef[] = [
  { id: "today", label: "Today", icon: Home },
  { id: "library", label: "Library", icon: LayoutGrid },
  { id: "profile", label: "Profile", icon: User },
]

export interface BottomTabBarProps {
  active: TabId
  onChange: (tab: TabId) => void
}

export function BottomTabBar({ active, onChange }: BottomTabBarProps) {
  return (
    <nav className="nk-tabbar" aria-label="Primary">
      <div className="nk-tabbar-inner">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              data-active={isActive}
              className="nk-tab"
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
            >
              <Icon className="size-5" strokeWidth={isActive ? 2.5 : 2} />
              <span>{tab.label}</span>
              <span className="nk-tab-dot" aria-hidden />
            </button>
          )
        })}
      </div>
    </nav>
  )
}
