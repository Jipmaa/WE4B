import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabContentComponent } from './tab-content';

describe('TabContentComponent', () => {
  let component: TabContentComponent;
  let fixture: ComponentFixture<TabContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabContentComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TabContentComponent);
    component = fixture.componentInstance;
    component.value = 'test-content';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should throw error without value input', () => {
    expect(() => {
      const tabContent = new TabContentComponent(null as any);
      tabContent.value = '';
      tabContent.ngOnInit();
    }).toThrow();
  });

  it('should set active state correctly', () => {
    component.setActive(true);
    expect(component.isActive).toBe(true);
  });

  it('should set ID and aria-labelledby correctly', () => {
    component.setId('test-id');
    component.setAriaLabelledBy('test-label');
    
    expect(component.contentId).toBe('test-id');
    expect(component.ariaLabelledBy).toBe('test-label');
  });

  it('should determine render state correctly', () => {
    component.setActive(false);
    expect(component.shouldRender).toBe(false);
    
    component.forceMount = true;
    expect(component.shouldRender).toBe(true);
    
    component.forceMount = false;
    component.setActive(true);
    expect(component.shouldRender).toBe(true);
  });
});