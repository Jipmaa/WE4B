import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderItem } from './header-item';

describe('HeaderItem', () => {
  let component: HeaderItem;
  let fixture: ComponentFixture<HeaderItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderItem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderItem);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
