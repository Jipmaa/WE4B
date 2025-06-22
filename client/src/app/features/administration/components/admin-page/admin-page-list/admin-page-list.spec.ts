import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPageList } from './admin-page-list';

describe('AdminPageList', () => {
  let component: AdminPageList;
  let fixture: ComponentFixture<AdminPageList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPageList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminPageList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
