import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Collapsible } from './collapsible';

describe('Collapsible', () => {
  let component: Collapsible;
  let fixture: ComponentFixture<Collapsible>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Collapsible]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Collapsible);
    component = fixture.componentInstance;
    component.label = 'Test Label';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default closed state', () => {
    expect(component.isOpen()).toBeFalse();
  });

  it('should initialize with open state when defaultOpen is true', () => {
    const newFixture = TestBed.createComponent(Collapsible);
    const newComponent = newFixture.componentInstance;
    newComponent.label = 'Test Label';
    newComponent.defaultOpen = true;
    newFixture.detectChanges();
    expect(newComponent.isOpen()).toBeTrue();
  });

  it('should toggle state when toggle() is called', () => {
    expect(component.isOpen()).toBeFalse();
    component.toggle();
    expect(component.isOpen()).toBeTrue();
    component.toggle();
    expect(component.isOpen()).toBeFalse();
  });

  it('should generate correct action icon based on state', () => {
    expect(component.actionIcon()).toBe('chevrons-up-down');
    component.toggle();
    expect(component.actionIcon()).toBe('chevrons-down-up');
  });

  it('should have proper accessibility attributes', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const header = compiled.querySelector('.collapsible-header');
    const content = compiled.querySelector('[role="region"]');
    
    expect(header?.getAttribute('role')).toBe('button');
    expect(header?.getAttribute('aria-expanded')).toBe('false');
    expect(header?.getAttribute('tabindex')).toBe('0');
    expect(content?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should handle keyboard events', () => {
    spyOn(component, 'toggle');
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    component.onKeydown(event);
    expect(component.toggle).toHaveBeenCalled();
  });
});
