import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, Subject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Discussion } from '../models/discussion.models';
import { ApiResponse } from '../models/_shared.models';

@Injectable({
  providedIn: 'root'
})
export class ForumService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/discussions`;

  private discussionUpdatedSource = new Subject<void>();
  discussionUpdated$ = this.discussionUpdatedSource.asObservable();

  getAllDiscussions(): Observable<Discussion[]> {
    return this.http.get<ApiResponse<Discussion[]>>(this.baseUrl).pipe(
      map(response => response.data)
    );
  }

  getDiscussionById(id: string): Observable<Discussion> {
    return this.http.get<ApiResponse<Discussion>>(`${this.baseUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  addMessageToDiscussion(discussionId: string, content: string): Observable<Discussion> {
    return this.http.post<ApiResponse<Discussion>>(`${this.baseUrl}/${discussionId}/messages`, { content }).pipe(
      map(response => {
        this.discussionUpdatedSource.next(); // Notify that discussions have been updated
        return response.data;
      })
    );
  }

  createDiscussion(data: { title: string, message: string }): Observable<ApiResponse<Discussion>> {
    return this.http.post<ApiResponse<Discussion>>(this.baseUrl, data).pipe(
      map(response => {
        this.discussionUpdatedSource.next(); // Notify that discussions have been updated
        return response;
      })
    );
  }

  deleteDiscussion(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.discussionUpdatedSource.next()) // Notify that discussions have been updated
    );
  }
}
