import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar-item',
  templateUrl: './navbar-item.component.html',
  styleUrls: []
})
export class NavbarItemComponent implements OnInit, OnDestroy {
  @Input() label!: string;
  @Input() link?: string;
  @Input() disabled?: boolean;

  public isDisabled: boolean = this.disabled || false;
  private routerSubscription?: Subscription;

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.computeDisabledState();

    // Subscribe to router events to update disabled state when route changes
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.computeDisabledState();
      });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private computeDisabledState(): void {
    if (!this.link) {
      this.isDisabled = this.disabled ?? true;
      return;
    }

    // Check if current route matches the link
    const currentUrl = this.router.url;
    const linkPath = this.link.startsWith('/') ? this.link : '/' + this.link;

    // Disable if current route matches the link (user is already on this page)
    this.isDisabled = currentUrl === linkPath;
  }
}
