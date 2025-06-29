import {Component, inject, Input, Output, EventEmitter, signal} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Router, ActivatedRoute } from '@angular/router';
import {CourseActivity, FileActivity, MessageActivity, FileDepositoryActivity} from "@/core/models/course-activity.models";
import {ButtonComponent} from "@/shared/components/ui/button/button";
import {IconButtonComponent} from "@/shared/components/ui/icon-button/icon-button";
import {CourseActivitiesService} from "@/core/services/course-activities.service";
import {AuthService} from '@/core/services/auth.service';


interface ActivityIcon {
  bg: string;
  color: string;
  name: string;
}

@Component({
  selector: 'app-activity',
  imports: [
    LucideAngularModule,
    ButtonComponent,
    IconButtonComponent
  ],
  templateUrl: './activity.html',
})
export class Activity {
  private readonly activityService = inject(CourseActivitiesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly authService = inject(AuthService);

  private _pinLoading = signal<boolean>(false);
  private _deleteLoading = signal<boolean>(false);

  @Input({required: true}) activity!: CourseActivity;
  @Input() variant: 'display' | 'quick' = 'quick';
  @Input() showActions: boolean = true;
  @Input() courseSlug?: string = undefined;

  @Output() editActivity = new EventEmitter<CourseActivity>();

  togglePin() {
    if (this._pinLoading()) {
      return;
    }
    this._pinLoading.set(true);
    this.activityService.togglePin(this.activity._id, !this.activity.isPinned)
      .subscribe(res => {
        this.activity.isPinned = res.data.isPinned;
        this._pinLoading.set(false);
      })
  }

  handleDelete() {
    if (this._deleteLoading()) {
      return;
    }

    const confirmed = confirm(`Êtes-vous sûr de vouloir supprimer l'activité "${this.activity.title}" ? Cette action est irréversible.`);

    if (!confirmed) {
      return;
    }

    this._deleteLoading.set(true);
    this.activityService.deleteActivity(this.activity._id)
      .subscribe({
        next: () => {
          this._deleteLoading.set(false);
        },
        error: (error) => {
          this._deleteLoading.set(false);
          console.error('Error deleting activity:', error);
        }
      });
  }

  get pinLoading(): boolean {
    return this._pinLoading();
  }

  get deleteLoading(): boolean {
    return this._deleteLoading();
  }

  get descriptionText(): string {
    if (this.activity.activityType === 'file-depository') {
      const fileDepositoryActivity = this.activity as FileDepositoryActivity;
      if (fileDepositoryActivity.dueAt) {
        const now = new Date();
        const dueDate = new Date(fileDepositoryActivity.dueAt);
        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto', style: "short" });
        return `À rendre ${rtf.format(diffDays, 'day')}`;
      }
      return 'Pas de date limite';
    }
    const createdAt = new Date(this.activity.createdAt);
    const updatedAt = new Date(this.activity.updatedAt);
    const now = new Date();

    const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto', style: 'short' });

    if (createdAt.getTime() === updatedAt.getTime()) {
      const diffTime = createdAt.getTime() - now.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 1) {
        const diffHours = Math.round(diffTime / (1000 * 60 * 60));
        if (diffHours < 1) {
          const diffMinutes = Math.round(diffTime / (1000 * 60));
          return `Créé ${rtf.format(diffMinutes, 'minutes')}`;
        }
        return `Créé ${rtf.format(diffHours, 'hour')}`;
      }
      return `Créé ${rtf.format(diffDays, 'day')}`;
    }
    const diffTime = updatedAt.getTime() - now.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 1) {
      const diffHours = Math.round(diffTime / (1000 * 60 * 60));
      if (diffHours < 1) {
        const diffMinutes = Math.round(diffTime / (1000 * 60));
        return `Mis à jour ${rtf.format(diffMinutes, 'minutes')}`;
      }
      return `Mis à jour ${rtf.format(diffHours, 'hour')}`;
    }
    return `Mis à jour ${rtf.format(diffDays, 'day')}`;
  }

  get icon(): ActivityIcon {
    switch (this.activity.activityType) {
      case 'message': return this.getMessageActivityIcon()
      case 'file': return {
        bg: 'bg-green-100',
        color: 'text-green-500',
        name: this.getFileActivityIcon()
      }
      case 'file-depository': return {
        bg: 'bg-blue-100',
        color: 'text-blue-500',
        name: 'file-up'
      }
    }
  }

  get pinButtonClasses(): string {
    const baseClass = 'group w-10 h-[4.5rem] rounded-2xl';

    const pinnedClass = 'bg-red-100 hover:bg-red-200';
    const unpinnedClass = 'bg-primary/10 hover:bg-primary/20';

    return `${baseClass} ${this.activity.isPinned ? pinnedClass : unpinnedClass}`;
  }

  private getMessageActivityIcon(): ActivityIcon {
    const act = this.activity as MessageActivity
    switch (act.level) {
      case 'normal':
        return {
          bg: 'bg-primary/10',
          color: 'text-primary',
          name: 'message-square'
        }
      case 'important':
        return {
          bg: 'bg-yellow-100',
          color: 'text-yellow-500',
          name: 'message-square-warning'
        }
      case 'urgent':
        return {
          bg: 'bg-red-100',
          color: 'text-red-500',
          name: 'message-square-x'
        }
      default:
        throw new Error("Unknown message level: " + act.level);
    }
  }

  private getFileActivityIcon(): string {
    const act = this.activity as FileActivity
    switch (act.fileType) {
      case 'text-file': return 'file-text'
      case 'image': return 'file-image'
      case 'video': return 'file-video'
      case 'audio': return 'file-audio'
      case 'spreadsheet': return 'file-spreadsheet'
      case 'archive': return 'file-archive'
      default: return 'file'
    }
  }

  handleEdit(): void {
    this.editActivity.emit(this.activity);
  }

  handleQuickAction(): void {
    if (this.authService.isTeacher()) {
      return this.togglePin();
    }
    // Navigate to activity display page for students
    this.navigateToActivity();
  }

  navigateToActivity(): void {
    // Get the current course slug from the route
    const courseSlug = this.courseSlug || this.route.snapshot.params['slug'] || this.getCourseSlugFromUrl();
    if (courseSlug) {
      this.router.navigate(['/courses', courseSlug, 'activity', this.activity._id]);
    } else {
      console.error('Could not determine course slug for navigation');
    }
  }

  onCardClick(): void {
      this.navigateToActivity();
  }

  private getCourseSlugFromUrl(): string | null {
    // Fallback: extract course slug from current URL path
    const urlSegments = this.router.url.split('/');
    const courseIndex = urlSegments.indexOf('course');
    if (courseIndex !== -1 && courseIndex + 1 < urlSegments.length) {
      return urlSegments[courseIndex + 1];
    }
    return null;
  }
}
