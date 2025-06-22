// Tabs Components Export
export { TabsComponent } from './tabs';
export { TabItemComponent } from '../tab-item/tab-item';
export { TabContentComponent } from '../tab-content/tab-content';
export { TabsExampleComponent } from './tabs-example';

// Type definitions for tabs system
export interface TabItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface TabsConfig {
  id: string;
  defaultTab?: string;
  ariaLabel?: string;
  items: TabItem[];
}