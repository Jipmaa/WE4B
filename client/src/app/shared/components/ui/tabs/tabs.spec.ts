import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { TabsComponent } from './tabs';
import { TabItemComponent } from '../tab-item/tab-item';
import { TabContentComponent } from '../tab-content/tab-content';
import { Component } from '@angular/core';
import { of } from 'rxjs';

@Component({
  template: `
    <app-tabs id="test-tabs">
      <app-tab-item value="tab1">Tab 1</app-tab-item>
      <app-tab-item value="tab2">Tab 2</app-tab-item>
      
      <app-tab-content value="tab1">Content 1</app-tab-content>
      <app-tab-content value="tab2">Content 2</app-tab-content>
    </app-tabs>
  `,
  standalone: true,
  imports: [TabsComponent, TabItemComponent, TabContentComponent]
})
class TestHostComponent {}

describe('TabsComponent', () => {
  let component: TabsComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: Partial<ActivatedRoute>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockActivatedRoute = {
      queryParams: of({}),
      snapshot: { queryParams: {} }
    };

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.debugElement.children[0].componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should throw error without id input', () => {
    expect(() => {
      const tabs = new TabsComponent(mockRouter as Router, mockActivatedRoute as ActivatedRoute, null as any);
      tabs.ngOnInit();
    }).toThrow();
  });

  it('should initialize with first tab active by default', () => {
    expect(component.getActiveTab()).toBe('tab1');
  });

  it('should activate tab programmatically', () => {
    component.setActiveTab('tab2');
    expect(component.getActiveTab()).toBe('tab2');
  });
});