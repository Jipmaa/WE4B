import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListecoursComponent } from './listecours.component';

describe('ListecoursComponent', () => {
  let component: ListecoursComponent;
  let fixture: ComponentFixture<ListecoursComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ListecoursComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ListecoursComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
