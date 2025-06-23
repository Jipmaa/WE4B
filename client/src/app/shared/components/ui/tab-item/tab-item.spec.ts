import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabItemComponent } from './tab-item';

describe('TabItemComponent', () => {
  let component: TabItemComponent;
  let fixture: ComponentFixture<TabItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabItemComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TabItemComponent);
    component = fixture.componentInstance;
    component.value = 'test-tab';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should throw error without value input', () => {
    expect(() => {
      const tabItem = new TabItemComponent(null as any);
      tabItem.value = '';
      tabItem.ngOnInit();
    }).toThrow();
  });

  it('should emit tabClick when clicked', () => {
    spyOn(component.tabClick, 'emit');
    component.onClick();
    expect(component.tabClick.emit).toHaveBeenCalledWith('test-tab');
  });

  it('should not emit tabClick when disabled', () => {
    component.disabled = true;
    spyOn(component.tabClick, 'emit');
    component.onClick();
    expect(component.tabClick.emit).not.toHaveBeenCalled();
  });

  it('should handle keyboard events', () => {
    spyOn(component.keyboardEvent, 'emit');
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    component.onKeydown(event);
    expect(component.keyboardEvent.emit).toHaveBeenCalledWith(event);
  });

  it('should handle Enter and Space keys', () => {
    spyOn(component.tabClick, 'emit');
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
    
    component.onKeydown(enterEvent);
    component.onKeydown(spaceEvent);
    
    expect(component.tabClick.emit).toHaveBeenCalledTimes(2);
  });
});