import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UeformComponent } from './ueform.component';

describe('UeformComponent', () => {
  let component: UeformComponent;
  let fixture: ComponentFixture<UeformComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UeformComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UeformComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
