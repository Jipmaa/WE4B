import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextareaComponent } from './textarea';

describe('TextareaComponent', () => {
  let component: TextareaComponent;
  let fixture: ComponentFixture<TextareaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextareaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TextareaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit value changes', () => {
    const mockEvent = {
      target: { value: 'test value' }
    } as any;

    spyOn(component, 'onChange');
    component.onInput(mockEvent);

    expect(component.value()).toBe('test value');
  });

  it('should handle focus and blur events', () => {
    component.onFocus();
    expect(component.isFocused()).toBe(true);

    component.onBlur();
    expect(component.isFocused()).toBe(false);
  });
});