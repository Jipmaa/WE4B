import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Messages {
  onLoading: string;
  onAllLoaded: string;
  onError: string;
}

export interface Column {
  label: string;
  mapToKey: string;
  showOnSmall?: boolean;
}

export interface RowAction<T = any> {
  label: string;
  onTriggered: (item: T) => void;
}

export type Columns = Column[];
export type RowActions<T = any> = RowAction<T>[];

export interface LoadingState {
  isLoading: boolean;
  hasError: boolean;
  allLoaded: boolean;
}

@Component({
  selector: 'app-array',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './array.html'
})
export class ArrayComponent<T = any> implements OnInit, OnDestroy {
  @Input() data: T[] = [];
  @Input() columns: Columns = [];
  @Input() rowActions?: RowActions<T>;
  @Input() messages: Messages = {
    onLoading: 'Chargement...',
    onAllLoaded: 'Tous les éléments ont été chargés',
    onError: 'Erreur lors du chargement'
  };
  @Input() loadingState: LoadingState = {
    isLoading: false,
    hasError: false,
    allLoaded: false
  };

  @Output() loadMore = new EventEmitter<void>();

  @ViewChild('scrollTrigger', { static: true }) scrollTrigger!: ElementRef;

  activeMenuIndex: number | null = null;
  private observer!: IntersectionObserver;

  ngOnInit() {
    this.setupInfiniteScroll();
    this.setupClickOutside();
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    document.removeEventListener('click', this.handleClickOutside);
  }

  private setupInfiniteScroll() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.loadingState.isLoading && !this.loadingState.allLoaded && !this.loadingState.hasError) {
            this.loadMore.emit();
          }
        });
      },
      {
        rootMargin: '100px'
      }
    );

    this.observer.observe(this.scrollTrigger.nativeElement);
  }

  private setupClickOutside() {
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  private handleClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.activeMenuIndex = null;
    }
  }

  getHeaderCellClasses(column: Column): string {
    const baseClasses = 'h-12 px-4 text-left text-muted-foreground text-sm font-semibold leading-tight';

    // Définir des largeurs fixes pour les colonnes
    if (column.mapToKey === 'fullName' || column.label.toLowerCase().includes('fullName')) {
      return `w-48 ${baseClasses}`;
    }
    if (column.mapToKey === 'email' || column.label.toLowerCase().includes('email')) {
      return `w-72 ${baseClasses}`;
    }

    return `${baseClasses}`;
  }

  getBodyCellClasses(column: Column): string {
    const baseClasses = 'p-4 text-left text-foreground text-sm font-normal leading-normal';

    // Définir des largeurs fixes pour les colonnes
    if (column.mapToKey === 'nom' || column.label.toLowerCase().includes('nom')) {
      return `w-48 ${baseClasses}`;
    }
    if (column.mapToKey === 'email' || column.label.toLowerCase().includes('email')) {
      return `w-72 ${baseClasses}`;
    }

    return `${baseClasses}`;
  }

  getRowClasses(index: number): string {
    const baseClasses = 'border-b border-gray-200';
    const isEven = index % 2 === 1; // Les lignes paires (0, 2, 4...) n'ont pas de background

    return isEven ? `${baseClasses} bg-sky-500/5` : baseClasses;
  }

  shouldShowMenuUp(index: number): boolean {
    // Solution simple : vérifier si on est dans la moitié basse de l'écran
    const table = document.querySelector('table');
    if (!table) return false;

    const tableRect = table.getBoundingClientRect();
    const rowHeight = 60; // hauteur approximative d'une ligne
    const rowTop = tableRect.top + 60 + (index * rowHeight); // 60 pour le header

    const windowHeight = window.innerHeight;
    const spaceBelow = windowHeight - rowTop;

    // Si moins de 200px d'espace en bas, afficher vers le haut
    return spaceBelow < 200;
  }

  getItemValue(item: T, key: string): string {
    const value = (item as any)[key];
    return value != null ? String(value) : '';
  }

  toggleActionMenu(index: number) {
    this.activeMenuIndex = this.activeMenuIndex === index ? null : index;
  }

  executeAction(action: RowAction<T>, item: T, index: number) {
    action.onTriggered(item);
    this.activeMenuIndex = null;
  }

  getCurrentMessage(): string {
    if (this.loadingState.hasError) {
      return this.messages.onError;
    }
    if (this.loadingState.isLoading) {
      return this.messages.onLoading;
    }
    if (this.loadingState.allLoaded) {
      return this.messages.onAllLoaded;
    }
    return '';
  }
}
