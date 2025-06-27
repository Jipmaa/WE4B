import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseMembersPage } from './course-members-page';

describe('CourseMembersPage', () => {
  let component: CourseMembersPage;
  let fixture: ComponentFixture<CourseMembersPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseMembersPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CourseMembersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
