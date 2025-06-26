import { Component } from '@angular/core';
import { TabsComponent } from './tabs';
import { TabItemComponent } from '../tab-item/tab-item';
import { TabContentComponent } from '../tab-content/tab-content';

/**
 * Example component showing how to use the tabs system
 * This can be used as reference for implementation
 */
@Component({
  selector: 'app-tabs-example',
  standalone: true,
  imports: [TabsComponent, TabItemComponent, TabContentComponent],
  template: `
    <div class="p-6 space-y-8">
      <h2 class="text-2xl font-bold">Tabs Example</h2>

      <!-- Basic Tabs -->
      <div>
        <h3 class="text-lg font-semibold mb-4">Basic Tabs</h3>
        <app-tabs id="basic-tabs" ariaLabel="Basic navigation tabs">
          <app-tab-item value="overview">Overview</app-tab-item>
          <app-tab-item value="details">Details</app-tab-item>
          <app-tab-item value="settings">Settings</app-tab-item>

          <app-tab-content value="overview">
            <div class="p-4 border rounded-md">
              <h4 class="font-medium mb-2">Overview Content</h4>
              <p>This is the overview tab content. You can navigate between tabs using arrow keys or by clicking.</p>
            </div>
          </app-tab-content>

          <app-tab-content value="details">
            <div class="p-4 border rounded-md">
              <h4 class="font-medium mb-2">Details Content</h4>
              <p>This tab contains detailed information. The active tab is preserved in the URL query parameters.</p>
            </div>
          </app-tab-content>

          <app-tab-content value="settings">
            <div class="p-4 border rounded-md">
              <h4 class="font-medium mb-2">Settings Content</h4>
              <p>Configuration and settings would go here. Try refreshing the page to see URL persistence in action.</p>
            </div>
          </app-tab-content>
        </app-tabs>
      </div>

      <!-- Tabs with Default -->
      <div>
        <h3 class="text-lg font-semibold mb-4">Tabs with Default Tab</h3>
        <app-tabs id="default-tabs" defaultTab="second" ariaLabel="Tabs with default selection">
          <app-tab-item value="first">First</app-tab-item>
          <app-tab-item value="second">Second (Default)</app-tab-item>
          <app-tab-item value="third">Third</app-tab-item>

          <app-tab-content value="first">
            <div class="p-4 border rounded-md">
              <p>First tab content</p>
            </div>
          </app-tab-content>

          <app-tab-content value="second">
            <div class="p-4 border rounded-md">
              <p>Second tab content (this is the default tab)</p>
            </div>
          </app-tab-content>

          <app-tab-content value="third">
            <div class="p-4 border rounded-md">
              <p>Third tab content</p>
            </div>
          </app-tab-content>
        </app-tabs>
      </div>

      <!-- Tabs with Disabled Tab -->
      <div>
        <h3 class="text-lg font-semibold mb-4">Tabs with Disabled Tab</h3>
        <app-tabs id="disabled-tabs" ariaLabel="Tabs with disabled option">
          <app-tab-item value="enabled1">Enabled 1</app-tab-item>
          <app-tab-item value="disabled" [disabled]="true">Disabled</app-tab-item>
          <app-tab-item value="enabled2">Enabled 2</app-tab-item>

          <app-tab-content value="enabled1">
            <div class="p-4 border rounded-md">
              <p>First enabled tab content</p>
            </div>
          </app-tab-content>

          <app-tab-content value="disabled">
            <div class="p-4 border rounded-md">
              <p>This content won't be accessible because the tab is disabled</p>
            </div>
          </app-tab-content>

          <app-tab-content value="enabled2">
            <div class="p-4 border rounded-md">
              <p>Second enabled tab content</p>
            </div>
          </app-tab-content>
        </app-tabs>
      </div>

      <!-- Usage Instructions -->
      <div class="bg-muted p-4 rounded-md">
        <h3 class="text-lg font-semibold mb-2">Accessibility Features</h3>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li><strong>Keyboard Navigation:</strong> Use arrow keys, Home, and End to navigate between tabs</li>
          <li><strong>Focus Management:</strong> Tab content is focusable when active</li>
          <li><strong>Screen Readers:</strong> Full ARIA support with proper roles and attributes</li>
          <li><strong>URL Persistence:</strong> Active tab is saved in query parameters for each tabs component</li>
          <li><strong>Default Behavior:</strong> First tab is active by default unless specified otherwise</li>
        </ul>
      </div>
    </div>
  `
})
export class TabsExampleComponent {}
