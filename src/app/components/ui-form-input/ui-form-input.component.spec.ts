import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UiFormInputComponent } from './ui-form-input.component';

describe('UiFormInputComponent', () => {
  let component: UiFormInputComponent;
  let fixture: ComponentFixture<UiFormInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UiFormInputComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UiFormInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
