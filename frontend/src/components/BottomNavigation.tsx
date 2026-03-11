import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Home,
  Plus,
  List,
  Bell,
  Wallet,
} from 'lucide-react';

interface BottomNavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  notificationCount?: number;
  messageCount?: number;
}

export function BottomNavigation({ 
  currentTab, 
  onTabChange, 
  notificationCount = 0,
  messageCount = 0 
}: BottomNavigationProps) {
  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      count: 0
    },
    {
      id: 'post',
      label: 'Post',
      icon: Plus,
      count: 0
    },
    {
      id: 'listings',
      label: 'My Listings',
      icon: List,
      count: 0
    },
    {
      id: 'notifications',
      label: 'Alerts',
      icon: Bell,
      count: notificationCount
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: Wallet,
      count: 0
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t">
      <div className="grid grid-cols-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant="ghost"
              className={`h-16 flex flex-col gap-1 rounded-none relative ${
                isActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => onTabChange(tab.id)}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-2' : 'stroke-1.5'}`} />
                {tab.count > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 w-5 h-5 text-xs p-0 flex items-center justify-center"
                  >
                    {tab.count > 99 ? '99+' : tab.count}
                  </Badge>
                )}
              </div>
              <span className={`text-xs ${isActive ? 'font-medium' : 'font-normal'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
