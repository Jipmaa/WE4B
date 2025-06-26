import {Component, Input, signal, computed, HostListener, inject, OnInit} from '@angular/core';
import {IconButtonComponent} from '@/shared/components/ui/icon-button/icon-button';
import {IdGeneratorService} from '@/core/services/id-generator.service';

@Component({
  selector: 'app-collapsible',
  imports: [
    IconButtonComponent
  ],
  templateUrl: './collapsible.html',
  host: {
    'role': 'region',
    '[attr.aria-expanded]': 'isOpen()',
    '[attr.aria-labelledby]': 'headerId',
    'tabindex': '0'
  }
})
export class Collapsible implements OnInit {
  private idGenerator = inject(IdGeneratorService);

  @Input() defaultOpen: boolean = false;
  @Input() notifications: number | null = null;
  @Input({required: true}) label!: string;
  headerId: string = this.idGenerator.generateId('collapsible-header');
  contentId: string = this.idGenerator.generateId('collapsible-content');

  private _isOpen = signal(false);

  isOpen = computed(() => this._isOpen());
  actionIcon = computed(() => this.isOpen() ? 'chevrons-down-up' : 'chevrons-up-down');


  ngOnInit(): void {
    this._isOpen.set(this.defaultOpen);
  }

  toggle(): void {
    this._isOpen.update(open => !open);
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggle();
    }
  }

}
