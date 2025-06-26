import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseBox } from './course-box';

describe('CourseBox', () => {
  let component: CourseBox;
  let fixture: ComponentFixture<CourseBox>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseBox]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CourseBox);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
