import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  MyDepositedFilesResponse,
  FileDepositSubmissionRequest,
  GradeDepositRequest,
  GradeDepositResponse,
  TeacherDepositsResponse,
  DeleteDepositResponse,
} from '@/core/models/deposited-files.models';
import { ApiResponse } from '@/core/models/_shared.models';

@Injectable({
  providedIn: 'root'
})
export class DepositedFilesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/course-activities`;

  // Student methods

  getMyDeposit(activityId: string): Observable<MyDepositedFilesResponse> {
    return this.http.get<ApiResponse<MyDepositedFilesResponse>>(`${this.apiUrl}/${activityId}/deposits/my`)
      .pipe(
        map(response => response.data)
      );
  }

  submitDeposit(activityId: string, data: FileDepositSubmissionRequest): Observable<any> {
    const formData = new FormData();
    data.files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post(`${this.apiUrl}/${activityId}/deposits`, formData);
  }

  updateDeposit(activityId: string, data: FileDepositSubmissionRequest): Observable<any> {
    const formData = new FormData();
    data.files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.put(`${this.apiUrl}/${activityId}/deposits`, formData);
  }

  deleteDeposit(activityId: string): Observable<DeleteDepositResponse> {
    return this.http.delete<DeleteDepositResponse>(`${this.apiUrl}/${activityId}/deposits`);
  }

  // Teacher methods

  getTeacherView(activityId: string): Observable<ApiResponse<TeacherDepositsResponse>> {
    return this.http.get<ApiResponse<TeacherDepositsResponse>>(`${this.apiUrl}/${activityId}/deposits/teacher-view`);
  }

  gradeDeposit(activityId: string, depositId: string, gradeData: GradeDepositRequest): Observable<GradeDepositResponse> {
    return this.http.put<GradeDepositResponse>(`${this.apiUrl}/${activityId}/deposits/${depositId}/grade`, gradeData);
  }

  // Download methods

  downloadDeposit(activityId: string, depositId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${activityId}/deposits/${depositId}/download`, {
      responseType: 'blob'
    });
  }

  downloadAllDeposits(activityId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${activityId}/deposits/download-all`, {
      responseType: 'blob'
    });
  }
}
