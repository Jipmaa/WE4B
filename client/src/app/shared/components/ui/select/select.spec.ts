import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectComponent } from './select';

describe('SelectComponent', () => {
  let component: SelectComponent;
  let fixture: ComponentFixture<SelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle dropdown', () => {
    expect(component.isOpen()).toBe(false);
    
    component.toggleDropdown();
    expect(component.isOpen()).toBe(true);
    
    component.toggleDropdown();
    expect(component.isOpen()).toBe(false);
  });

  it('should select option', () => {
    const option = { value: 'test', label: 'Test Option' };
    spyOn(component, 'onChange');
    
    component.selectOption(option);
    
    expect(component.selectedValue()).toBe('test');
    expect(component.onChange).toHaveBeenCalledWith('test');
  });
});