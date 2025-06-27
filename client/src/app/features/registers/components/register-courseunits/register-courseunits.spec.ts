import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterCourseunits } from './register-courseunits';

describe('RegisterCourseunits', () => {
  let component: RegisterCourseunits;
  let fixture: ComponentFixture<RegisterCourseunits>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterCourseunits]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterCourseunits);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
